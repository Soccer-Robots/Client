<template>
  <div
    class="min-h-screen bg-[#154734] text-white transition-colors dark:bg-[#222222]"
  >
    <!-- Navigation -->
    <NavBar
      :is-logged-in="isLoggedIn"
      :is-admin="isAdmin"
      :player-name="playerName"
      :theme="theme"
      :is-requesting-login="isRequestingLogin"
      :is-logging-out="isLoggingOut"
      @open-about="showAbout = true"
      @open-how-to-play="showHowToPlay = true"
      @open-help="showHelp = true"
      @open-leaderboard="showLeaderboard = true"
      @open-admin="showAdminPanel = true"
      @open-change-username="showChangeUsername = true"
      @toggle-theme="toggleTheme"
      @login="openLoginPopup"
      @logout="logout"
    />

    <!-- Main game page -->
    <main class="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:py-8">
      <div class="space-y-6">
        <!-- SECTION 1: Scoreboard -->
        <Scoreboard
          :orange-score="player1.score"
          :green-score="player2.score"
          :time-remaining="timer"
          orange-team-name="Orange Team"
          green-team-name="Green Team"
        />

        <!-- Main lower layout -->
        <div class="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_340px]">
          <GameView :stream-type="streamType" :is-in-game="isInGame" />

          <GameSidebar
            :queue="queue"
            :player-name="playerName"
            :is-logged-in="isLoggedIn"
            :is-in-game="isInGame"
            :queue-status="queueStatus"
            :leaderboard="leaderboard"
            :leaderboard-loading="leaderboardLoading"
            :leaderboard-error="leaderboardError"
            @join-queue="joinQueue"
            @leave-queue="leaveQueue"
            @login="openLoginPopup"
            @sort-leaderboard="loadLeaderboard"
          />
        </div>
      </div>
    </main>

    <!-- Existing project overlays -->
    <LoginRequestOverlay
      v-if="showLoginRequest"
      :is-submitting="isRequestingLogin"
      :success="loginRequestSuccess"
      :error-message="loginRequestError"
      @submit="requestLogin"
      @close="closeLoginPopup"
    />
    <ConfirmMatchOverlay
      v-if="confirmationRequest && stillNeedsResponse"
      @confirm-response="confirmMatch"
    />

    <HelpOverlay v-if="showHelp" @close-help-overlay="showHelp = false" />

    <AboutUsOverlay
      v-if="showAbout"
      @close-about-us-overlay="showAbout = false"
    />

    <HowToPlayOverlay
      v-if="showHowToPlay"
      @close-how-to-play-overlay="showHowToPlay = false"
    />

    <LeaderBoardOverlay
      v-if="showLeaderboard"
      @close-leader-board-overlay="showLeaderboard = false"
    />

    <LogInOverlay
      v-if="showChangeUsername && isLoggedIn"
      :is-changing-username="true"
      @close-log-in="showChangeUsername = false"
    />

    <ClientOnly>
      <AdminPanel
        v-if="showAdminPanel && isAdmin"
        @close-admin-panel="showAdminPanel = false"
      />
    </ClientOnly>
  </div>  
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  shallowRef,
  watch,
} from "vue";
import { useGameFeed } from "~/composables/useGameFeed";
import { useMatchQueue } from "~/composables/useMatchQueue";

type LeaderboardSort = "wins" | "losses" | "goals" | "gamesPlayed" | "ratio";

interface LeaderboardPlayer {
  username: string;
  wins: number;
  losses: number;
  goals: number;
  gamesPlayed: number;
  ratio: number;
}

const leaderboard = ref<LeaderboardPlayer[]>([]);

const leaderboardSort = ref<LeaderboardSort>("wins");

const leaderboardLoading = ref(false);

const leaderboardError = ref("");

const loadLeaderboard = async (
  sort: LeaderboardSort = leaderboardSort.value,
) => {
  leaderboardSort.value = sort;

  leaderboardLoading.value = true;
  leaderboardError.value = "";

  try {
    leaderboard.value = await $fetch<LeaderboardPlayer[]>("/api/leaderboard", {
      query: {
        sortedColumn: sort,
      },
    });
  } catch (error) {
    console.error("Error loading leaderboard:", error);
    leaderboardError.value = "Failed to load leaderboard.";
    leaderboard.value = [];
  } finally {
    leaderboardLoading.value = false;
  }
};

type Theme = "light" | "dark";

type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";

type ControlKey = "w" | "a" | "s" | "d";

interface SessionUser {
  username?: string;
  role?: string;
}

interface SocketMessage {
  type?: string;
  payload?: unknown;
}

const config = useRuntimeConfig();

useHead({
  title: "Game | Soccer Robots",
});

/* -------------------------------------------------------------------------- */
/* Authentication                                                             */
/* -------------------------------------------------------------------------- */

const sruser = useCookie<SessionUser | string | null>("sruser");

const accessPassword = useCookie<string | null>("accesspassword", {
  path: "/",
  sameSite: "lax",
});

const currentUser = computed<SessionUser | null>(() => {
  const value = sruser.value;

  if (!value) {
    return null;
  }

  if (typeof value === "object") {
    return value;
  }

  /*
   * login.get.ts currently writes a username string, while auth.ts writes a
   * JSON object. This supports both formats during the migration.
   */
  try {
    const parsed = JSON.parse(value);

    if (parsed && typeof parsed === "object") {
      return parsed as SessionUser;
    }
  } catch {
    // A plain string is treated as the username.
  }

  return {
    username: value,
  };
});

const playerName = computed(() => currentUser.value?.username ?? "");
const isLoggedIn = computed(() => Boolean(playerName.value));
const isAdmin = computed(() => currentUser.value?.role === "admin");

const isRequestingLogin = ref(false);
const isLoggingOut = ref(false);

const showLoginRequest = ref(false);
const loginRequestSuccess = ref(false);
const loginRequestError = ref("");

const openLoginPopup = () => {
  loginRequestSuccess.value = false;
  loginRequestError.value = "";

  showLoginRequest.value = true;
};

const closeLoginPopup = () => {
  if (isRequestingLogin.value) {
    return;
  }

  showLoginRequest.value = false;
  loginRequestSuccess.value = false;
  loginRequestError.value = "";
};

const requestLogin = async (email: string) => {
  if (isRequestingLogin.value) {
    return;
  }

  isRequestingLogin.value = true;
  loginRequestError.value = "";

  try {
    await $fetch("/api/login-request", {
      method: "POST",

      body: {
        email,
      },
    });

    loginRequestSuccess.value = true;
  } catch (error) {
    console.error("Error requesting login link:", error);

    loginRequestError.value =
      "Failed to send the login link. Please try again.";
  } finally {
    isRequestingLogin.value = false;
  }
};

const logout = async () => {
  if (isLoggingOut.value) {
    return;
  }

  isLoggingOut.value = true;

  try {
    try {
      disconnectQueue(true);
    } catch (error) {
      console.error("Failed to disconnect from queue during logout:", error);
    }

    try {
      endGame();
    } catch (error) {
      console.error("Failed to end game during logout:", error);
    }

    await $fetch("/api/user-logout", {
      method: "POST",
    });

    // Do not manually mutate sruser/accessPassword here.
    // Do not navigateTo("/") from "/".
    if (import.meta.client) {
      window.location.replace("/");
    }
  } catch (error) {
    console.error("Logout failed:", error);

    if (import.meta.client) {
      window.alert("Failed to log out. Please try again.");
    }
  } finally {
    isLoggingOut.value = false;
  }
};

/* -------------------------------------------------------------------------- */
/* Existing modal state                                                       */
/* -------------------------------------------------------------------------- */

const showHelp = ref(false);
const showAbout = ref(false);
const showHowToPlay = ref(false);
const showLeaderboard = ref(false);
const showChangeUsername = ref(false);
const showAdminPanel = ref(false);

/* -------------------------------------------------------------------------- */
/* Theme                                                                      */
/* -------------------------------------------------------------------------- */

const theme = ref<Theme>("light");

const applyTheme = () => {
  if (!import.meta.client) {
    return;
  }

  document.documentElement.classList.toggle("dark", theme.value === "dark");
};

const toggleTheme = () => {
  theme.value = theme.value === "light" ? "dark" : "light";

  if (import.meta.client) {
    localStorage.setItem("theme", theme.value);
  }

  applyTheme();
};

/* -------------------------------------------------------------------------- */
/* Shared game state                                                          */
/* -------------------------------------------------------------------------- */

const isInGame = ref(false);

const streamType = computed<"twitch" | "janus">(() => {
  return isInGame.value ? "janus" : "twitch";
});

/* -------------------------------------------------------------------------- */
/* Service URLs                                                               */
/* -------------------------------------------------------------------------- */

const serviceHost = computed(() => {
  const configuredHost = String(config.public.LOCALHOST || "localhost");

  return configuredHost
    .replace(/^https?:\/\//, "")
    .replace(/^wss?:\/\//, "")
    .replace(/\/.*$/, "");
});

const createWebSocketUrl = (port: unknown) => {
  if (!import.meta.client) {
    return "";
  }

  const protocol = window.location.protocol === "https:" ? "wss" : "ws";

  return `${protocol}://${serviceHost.value}:${String(port)}`;
};

/* -------------------------------------------------------------------------- */
/* Safe message parsing                                                       */
/* -------------------------------------------------------------------------- */

const parseMessage = (value: unknown): SocketMessage | null => {
  if (typeof value !== "string") {
    return null;
  }

  try {
    const parsed = JSON.parse(value);

    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    return parsed as SocketMessage;
  } catch {
    /*
     * Both current WebSocket servers send the plain string "CONNECTED" when a
     * connection is established. That is not JSON and can safely be ignored.
     */
    return null;
  }
};

/* -------------------------------------------------------------------------- */
/* Robot controller WebSocket                                                 */
/* -------------------------------------------------------------------------- */

const controllerSocket = shallowRef<WebSocket | null>(null);
const controllerStatus = ref<ConnectionStatus>("disconnected");

const controlKeys = ["w", "a", "s", "d"] as const;

const keyState = reactive<Record<ControlKey, 0 | 1>>({
  w: 0,
  a: 0,
  s: 0,
  d: 0,
});

const currentKeyPayload = computed(() => {
  return `${keyState.w}${keyState.a}${keyState.s}${keyState.d}`;
});

const isControlKey = (key: string): key is ControlKey => {
  return controlKeys.includes(key as ControlKey);
};

const isEditableElement = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
};

const sendKeyState = () => {
  const socket = controllerSocket.value;

  if (socket?.readyState !== WebSocket.OPEN) {
    return;
  }

  socket.send(
    JSON.stringify({
      type: "KEY_INPUT",
      payload: currentKeyPayload.value,
    }),
  );
};

const resetKeyState = (sendUpdate = true) => {
  keyState.w = 0;
  keyState.a = 0;
  keyState.s = 0;
  keyState.d = 0;

  if (sendUpdate) {
    sendKeyState();
  }
};

const handleKeyDown = (event: KeyboardEvent) => {
  if (!isInGame.value || event.repeat || isEditableElement(event.target)) {
    return;
  }

  const key = event.key.toLowerCase();

  if (!isControlKey(key)) {
    return;
  }

  event.preventDefault();

  if (keyState[key] === 1) {
    return;
  }

  keyState[key] = 1;
  sendKeyState();
};

const handleKeyUp = (event: KeyboardEvent) => {
  const key = event.key.toLowerCase();

  if (!isControlKey(key)) {
    return;
  }

  if (isInGame.value) {
    event.preventDefault();
  }

  if (keyState[key] === 0) {
    return;
  }

  keyState[key] = 0;
  sendKeyState();
};

const handleWindowBlur = () => {
  resetKeyState();
};

const connectController = () => {
  if (!import.meta.client) {
    return;
  }

  if (!isLoggedIn.value || !accessPassword.value) {
    controllerStatus.value = "error";
    return;
  }

  if (
    controllerSocket.value &&
    (controllerSocket.value.readyState === WebSocket.OPEN ||
      controllerSocket.value.readyState === WebSocket.CONNECTING)
  ) {
    return;
  }

  try {
    controllerStatus.value = "connecting";

    const socket = new WebSocket(
      createWebSocketUrl(config.public.PORT_WSS_CONTROLLER_CLIENT),
    );

    controllerSocket.value = socket;

    socket.onopen = () => {
      controllerStatus.value = "connected";
      resetKeyState();
    };

    socket.onerror = (event) => {
      console.error("Controller WebSocket error:", event);
      controllerStatus.value = "error";
    };

    socket.onclose = () => {
      if (controllerSocket.value === socket) {
        controllerSocket.value = null;
      }

      resetKeyState(false);
      controllerStatus.value = "disconnected";
    };

    socket.onmessage = (event) => {
      console.log("Controller message:", event.data);
    };
  } catch (error) {
    console.error("Failed to connect to controller:", error);
    controllerStatus.value = "error";
  }
};

const disconnectController = () => {
  resetKeyState();

  controllerSocket.value?.close();
  controllerSocket.value = null;

  controllerStatus.value =
    "disconnected";
};

const endGame = () => {
  isInGame.value = false;
  accessPassword.value = null;

  disconnectController();
};

const handleMatchStart = async (
  password: string,
) => {
  accessPassword.value = password;

  isInGame.value = true;

  await nextTick();

  connectController();
};

/* -------------------------------------------------------------------------- */
/* Match queue                                                                */
/* -------------------------------------------------------------------------- */

const {
  queueStatus,
  confirmationRequest,
  stillNeedsResponse,
  joinQueue,
  leaveQueue,
  disconnectQueue,
  confirmMatch,
} = useMatchQueue({
  isLoggedIn,
  isInGame,
  onMatchStart: handleMatchStart,
});

/* -------------------------------------------------------------------------- */
/* Public game feed                                                           */
/* -------------------------------------------------------------------------- */
const {
  queue,
  timer,
  player1,
  player2,
  gameFeedStatus,
  connectGameFeed,
  disconnectGameFeed,
} = useGameFeed({
  isInGame,
  onGameEnd: endGame,
});

const controlKeyClass = (key: ControlKey) => {
  if (keyState[key] === 1) {
    return [
      "border-orange-300",
      "bg-[#f96c00]",
      "text-white",
      "shadow-lg",
      "shadow-orange-900/30",
      "scale-95",
    ];
  }

  return ["border-white/20", "bg-white/10", "text-white", "shadow-md"];
};

/* -------------------------------------------------------------------------- */
/* Status badge classes                                                       */
/* -------------------------------------------------------------------------- */

const statusClass = (status: ConnectionStatus) => {
  switch (status) {
    case "connected":
      return "bg-emerald-400/20 text-emerald-200";

    case "connecting":
    case "reconnecting":
      return "bg-yellow-400/20 text-yellow-200";

    case "error":
      return "bg-red-400/20 text-red-200";

    default:
      return "bg-white/10 text-white/60";
  }
};

const gameFeedStatusClass = computed(() => {
  return statusClass(gameFeedStatus.value);
});

const queueStatusClass = computed(() => {
  return statusClass(queueStatus.value);
});

const controllerStatusClass = computed(() => {
  return statusClass(controllerStatus.value);
});

/* -------------------------------------------------------------------------- */
/* Lifecycle                                                                  */
/* -------------------------------------------------------------------------- */

watch(isLoggedIn, (loggedIn) => {
  if (loggedIn) {
    return;
  }

  disconnectQueue(false);
  endGame();
});

onMounted(() => {
  const savedTheme = localStorage.getItem("theme");

  theme.value = savedTheme === "dark" ? "dark" : "light";

  applyTheme();
  connectGameFeed();
  void loadLeaderboard();

  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);
  window.addEventListener("blur", handleWindowBlur);

  /*
   * Restore a controller connection when the user reloads during an active
   * match and still has the temporary access cookie.
   */
  if (isLoggedIn.value && accessPassword.value) {
    isInGame.value = true;
    connectController();
  }
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleKeyDown);
  window.removeEventListener("keyup", handleKeyUp);
  window.removeEventListener("blur", handleWindowBlur);

  disconnectGameFeed();
  disconnectQueue(false);
  disconnectController();
});
</script>
