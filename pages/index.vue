<template>
  <div class="min-h-screen bg-[#154734] text-white transition-colors dark:bg-[#222222]">
    <!-- Navigation -->
    <NavBar :is-logged-in="isLoggedIn" :is-admin="isAdmin" :player-name="playerName" :theme="theme"
      :is-requesting-login="isRequestingLogin" :is-logging-out="isLoggingOut" @open-about="showAbout = true"
      @open-how-to-play="showHowToPlay = true" @open-help="showHelp = true" @open-leaderboard="showLeaderboard = true"
      @open-admin="showAdminPanel = true" @open-change-username="showChangeUsername = true" @toggle-theme="toggleTheme"
      @login="openLoginPopup" @logout="logout" />

    <!-- Main game page -->
    <main
  class="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:py-8"
>
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
    <div
      class="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]"
    >
      <!-- SECTION 2: Game View -->
      <GameView
        :stream-type="streamType"
        :is-in-game="isInGame"
      />

      <!-- SECTION 3: Sidebar -->
      <GameSidebar
  :queue="queue"
  :player-name="playerName"
  :is-logged-in="isLoggedIn"
  :is-in-game="isInGame"
  :queue-status="queueStatus"
  :leaderboard="leaderboard"
  @join-queue="joinQueue"
  @leave-queue="leaveQueue"
  @login="openLoginPopup"
/>
    </div>
  </div>
</main>

    <!-- Existing project overlays -->
    <LoginRequestOverlay v-if="showLoginRequest" :is-submitting="isRequestingLogin" :success="loginRequestSuccess"
      :error-message="loginRequestError" @submit="requestLogin" @close="closeLoginPopup" />
    <ConfirmMatchOverlay v-if="confirmationRequest && stillNeedsResponse" @confirm-response="confirmMatch" />

    <HelpOverlay v-if="showHelp" @close-help-overlay="showHelp = false" />

    <AboutUsOverlay v-if="showAbout" @close-about-us-overlay="showAbout = false" />

    <HowToPlayOverlay v-if="showHowToPlay" @close-how-to-play-overlay="showHowToPlay = false" />

    <LeaderBoardOverlay v-if="showLeaderboard" @close-leader-board-overlay="showLeaderboard = false" />

    <LogInOverlay v-if="showChangeUsername && isLoggedIn" :is-changing-username="true"
      @close-log-in="showChangeUsername = false" />

    <ClientOnly>
      <AdminPanel v-if="showAdminPanel && isAdmin" @close-admin-panel="showAdminPanel = false" />
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

const leaderboard = ref([
  {
    username: "OrangeRobot",
    wins: 12,
    losses: 3,
    goals: 31,
    gamesPlayed: 15,
  },
  {
    username: "GreenMachine",
    wins: 9,
    losses: 5,
    goals: 24,
    gamesPlayed: 14,
  },
  {
    username: "SoccerBot",
    wins: 7,
    losses: 4,
    goals: 19,
    gamesPlayed: 11,
  },
]);

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

interface MatchPlayer {
  username: string;
  score: number;
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

const queue = ref<string[]>([]);
const timer = ref(0);

const player1 = ref<MatchPlayer>({
  username: "",
  score: 0,
});

const player2 = ref<MatchPlayer>({
  username: "",
  score: 0,
});

const isInGame = ref(false);
const hasSeenPositiveTimer = ref(false);

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

const createHttpUrl = (port: unknown, path: string) => {
  if (!import.meta.client) {
    return "";
  }

  const protocol = window.location.protocol === "https:" ? "https" : "http";

  return `${protocol}://${serviceHost.value}:${String(port)}${path}`;
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

const parseMatchPlayer = (value: unknown): MatchPlayer | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<MatchPlayer>;

  if (
    typeof candidate.username !== "string" ||
    typeof candidate.score !== "number"
  ) {
    return null;
  }

  return {
    username: candidate.username,
    score: candidate.score,
  };
};

/* -------------------------------------------------------------------------- */
/* Server-sent events: public game information                                */
/* -------------------------------------------------------------------------- */

const gameFeed = shallowRef<EventSource | null>(null);
const gameFeedStatus = ref<ConnectionStatus>("disconnected");

const connectGameFeed = () => {
  if (!import.meta.client || gameFeed.value) {
    return;
  }

  try {
    gameFeedStatus.value = "connecting";

    const source = new EventSource(
      createHttpUrl(config.public.PORT_SSE_GM, "/sse-info"),
    );

    gameFeed.value = source;

    source.onopen = () => {
      gameFeedStatus.value = "connected";
    };

    source.onerror = () => {
      /*
       * EventSource reconnects automatically. Keep the object alive and show
       * that reconnection is in progress.
       */
      gameFeedStatus.value = "reconnecting";
    };

    source.onmessage = (event) => {
      const message = parseMessage(event.data);

      if (!message?.type) {
        return;
      }

      if (message.type === "UPDATE_QUEUE" && Array.isArray(message.payload)) {
        queue.value = message.payload.filter(
          (username): username is string => typeof username === "string",
        );

        return;
      }

      if (
        message.type === "UPDATE_TIMER" &&
        typeof message.payload === "number"
      ) {
        timer.value = message.payload;

        if (message.payload > 0) {
          hasSeenPositiveTimer.value = true;
        }

        if (
          isInGame.value &&
          hasSeenPositiveTimer.value &&
          message.payload <= 0
        ) {
          endGame();
        }

        return;
      }

      if (
        message.type === "UPDATE_SCORE" &&
        message.payload &&
        typeof message.payload === "object"
      ) {
        const payload = message.payload as {
          player1?: unknown;
          player2?: unknown;
        };

        const nextPlayer1 = parseMatchPlayer(payload.player1);
        const nextPlayer2 = parseMatchPlayer(payload.player2);

        if (nextPlayer1) {
          player1.value = nextPlayer1;
        }

        if (nextPlayer2) {
          player2.value = nextPlayer2;
        }
      }
    };
  } catch (error) {
    console.error("Failed to connect to the game feed:", error);
    gameFeedStatus.value = "error";
  }
};

const disconnectGameFeed = () => {
  gameFeed.value?.close();
  gameFeed.value = null;
  gameFeedStatus.value = "disconnected";
};

/* -------------------------------------------------------------------------- */
/* Player queue WebSocket                                                     */
/* -------------------------------------------------------------------------- */

const queueSocket = shallowRef<WebSocket | null>(null);
const queueStatus = ref<ConnectionStatus>("disconnected");

const confirmationRequest = ref(false);
const stillNeedsResponse = ref(false);
const confirmationPassword = ref("");

const joinQueue = () => {
  if (!import.meta.client) {
    return;
  }

  if (!isLoggedIn.value) {
    window.alert("Log in before joining the queue.");
    return;
  }

  if (isInGame.value) {
    window.alert("You are already in a match.");
    return;
  }

  if (
    queueSocket.value &&
    (queueSocket.value.readyState === WebSocket.OPEN ||
      queueSocket.value.readyState === WebSocket.CONNECTING)
  ) {
    return;
  }

  try {
    queueStatus.value = "connecting";

    const socket = new WebSocket(
      createWebSocketUrl(config.public.PORT_CLIENT_GM),
    );

    queueSocket.value = socket;

    socket.onopen = () => {
      queueStatus.value = "connected";

      socket.send(
        JSON.stringify({
          type: "JOIN_QUEUE",
          payload: "",
        }),
      );
    };

    socket.onerror = (event) => {
      console.error("Queue WebSocket error:", event);
      queueStatus.value = "error";
    };

    socket.onclose = () => {
      if (queueSocket.value === socket) {
        queueSocket.value = null;
      }

      queueStatus.value = "disconnected";
    };

    socket.onmessage = async (event) => {
      const message = parseMessage(event.data);

      if (!message?.type) {
        return;
      }

      switch (message.type) {
        case "MATCH_CONFIRMATION": {
          if (typeof message.payload !== "string") {
            return;
          }

          confirmationPassword.value = message.payload;
          confirmationRequest.value = true;
          stillNeedsResponse.value = true;
          break;
        }

        case "MATCH_CONFIRMATION_RESET": {
          confirmationRequest.value = false;
          stillNeedsResponse.value = false;
          confirmationPassword.value = "";
          break;
        }

        case "MATCH_START": {
          if (typeof message.payload !== "string") {
            return;
          }

          confirmationRequest.value = false;
          stillNeedsResponse.value = false;
          confirmationPassword.value = "";

          accessPassword.value = message.payload;
          isInGame.value = true;

          await nextTick();
          connectController();
          break;
        }
      }
    };
  } catch (error) {
    console.error("Failed to connect to the queue:", error);
    queueStatus.value = "error";
  }
};

const leaveQueue = () => {
  const socket = queueSocket.value;

  if (!socket) {
    queueStatus.value = "disconnected";
    return;
  }

  if (socket.readyState === WebSocket.OPEN) {
    socket.send(
      JSON.stringify({
        type: "LEAVE_QUEUE",
        payload: "",
      }),
    );
  }

  /*
   * Game Manager closes the socket after LEAVE_QUEUE. Closing locally as well
   * makes the UI update immediately.
   */
  window.setTimeout(() => {
    if (
      socket.readyState === WebSocket.OPEN ||
      socket.readyState === WebSocket.CONNECTING
    ) {
      socket.close();
    }
  }, 100);
};

const disconnectQueue = (notifyServer = false) => {
  const socket = queueSocket.value;

  if (!socket) {
    queueStatus.value = "disconnected";
    return;
  }

  if (notifyServer && socket.readyState === WebSocket.OPEN) {
    socket.send(
      JSON.stringify({
        type: "LEAVE_QUEUE",
        payload: "",
      }),
    );
  }

  socket.close();
  queueSocket.value = null;
  queueStatus.value = "disconnected";

  confirmationRequest.value = false;
  stillNeedsResponse.value = false;
  confirmationPassword.value = "";
};

const confirmMatch = (accepted: boolean) => {
  stillNeedsResponse.value = false;
  confirmationRequest.value = false;

  const socket = queueSocket.value;

  if (socket?.readyState !== WebSocket.OPEN) {
    return;
  }

  socket.send(
    JSON.stringify({
      type: "CONFIRMATION",
      payload: {
        password: confirmationPassword.value,
        accepted,
      },
    }),
  );
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
  controllerStatus.value = "disconnected";
};

const endGame = () => {
  isInGame.value = false;
  hasSeenPositiveTimer.value = false;
  accessPassword.value = null;

  disconnectController();
};

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
