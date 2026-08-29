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
      @login="goToLogin"
      @logout="logout"
    />

    <!-- Main game page -->
    <main class="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:py-8">

      <div
        class="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]"
      >
        <!-- Shared guest/player content -->
        <section class="min-w-0 space-y-5">
          <!-- Scoreboard -->
          <div
            class="overflow-hidden rounded-2xl border border-white/10 bg-white/10 p-3 shadow-xl backdrop-blur-sm sm:p-5"
          >
            <!--
              The current Scoreboard component reads usernames from its queue
              prop, so queue is supplied in addition to the named props.
            -->
            <Scoreboard
              class="!mx-0 !h-auto !w-full"
              :queue="scoreboardUsers"
              :timer="timer"
              :user1="player1.username"
              :user2="player2.username"
              :user1score="player1.score"
              :user2score="player2.score"
            />
          </div>

          <!-- Video -->
          <div
            class="overflow-hidden rounded-2xl border border-white/10 bg-black/30 shadow-xl"
          >
            <div
              class="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4"
            >
              <div>
                <h2 class="text-xl font-bold">
                  Live Match
                </h2>

                <p class="mt-1 text-sm text-white/60">
                  {{
                    isInGame
                      ? "Use the WASD keys to control your assigned robot."
                      : "Watch the current match in real time."
                  }}
                </p>
              </div>

              <span
                class="rounded-full bg-red-600/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-red-200"
              >
                Live
              </span>
            </div>

            <VideoStream
              class="!max-w-none !p-0"
              :stream-type="streamType"
            />
          </div>
        </section>

        <!-- Right panel -->
        <aside class="min-w-0">
          <!-- Active player controls -->
          <div
            v-if="isInGame"
            class="rounded-2xl border border-orange-400/40 bg-white/10 p-6 shadow-xl backdrop-blur-sm"
          >
            <div class="flex items-start justify-between gap-4">
              <div>
                <p
                  class="text-xs font-bold uppercase tracking-[0.2em] text-orange-300"
                >
                  Robot Control
                </p>

                <h2 class="mt-1 text-2xl font-black">
                  WASD Controls
                </h2>
              </div>

              <span
                class="rounded-full px-3 py-1 text-xs font-bold"
                :class="controllerStatusClass"
              >
                {{ controllerStatus }}
              </span>
            </div>

            <p class="mt-4 text-sm leading-6 text-white/70">
              Click anywhere on the game page, then use W, A, S, and D to
              control your robot.
            </p>

            <!-- Visual WASD keys -->
            <div class="mt-8 flex flex-col items-center gap-2">
              <button
                type="button"
                tabindex="-1"
                class="flex h-16 w-16 items-center justify-center rounded-xl border-2 text-2xl font-black transition"
                :class="controlKeyClass('w')"
              >
                W
              </button>

              <div class="flex gap-2">
                <button
                  v-for="key in ['a', 's', 'd'] as const"
                  :key="key"
                  type="button"
                  tabindex="-1"
                  class="flex h-16 w-16 items-center justify-center rounded-xl border-2 text-2xl font-black uppercase transition"
                  :class="controlKeyClass(key)"
                >
                  {{ key }}
                </button>
              </div>
            </div>

            <div
              class="mt-7 rounded-xl border border-white/10 bg-black/20 p-4"
            >
              <p class="text-xs font-bold uppercase tracking-wider text-white/50">
                Current key payload
              </p>

              <p class="mt-2 font-mono text-2xl font-black tracking-[0.3em]">
                {{ currentKeyPayload }}
              </p>
            </div>

            <button
              v-if="controllerStatus !== 'connected'"
              type="button"
              class="mt-5 w-full rounded-xl bg-[#f96c00] px-5 py-3 font-bold transition hover:bg-orange-500"
              @click="connectController"
            >
              Reconnect Controller
            </button>
          </div>

          <!-- Authenticated player queue -->
          <div
            v-else-if="isLoggedIn"
            class="rounded-2xl border border-white/10 bg-white/10 p-3 shadow-xl backdrop-blur-sm"
          >
            <div class="px-3 pb-3 pt-2">
              <p
                class="text-xs font-bold uppercase tracking-[0.2em] text-orange-300"
              >
                Player Access
              </p>

              <h2 class="mt-1 text-2xl font-black">
                Match Queue
              </h2>

              <p class="mt-2 text-sm leading-6 text-white/65">
                Join the queue and wait for a match confirmation.
              </p>
            </div>

            <QueueContainer
              class="!w-full"
              :queue-users="queue"
              :theme="theme"
              @join-queue="joinQueue"
              @leave-queue="leaveQueue"
            />
          </div>

          <!-- Guest card; queue is intentionally hidden -->
          <div
            v-else
            class="rounded-2xl border border-white/10 bg-white/10 p-6 shadow-xl backdrop-blur-sm"
          >
            <div
              class="flex h-12 w-12 items-center justify-center rounded-xl bg-[#f96c00]"
            >
              <svg
                class="h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422A12.083 12.083 0 0118.5 16c0 1.105-.895 2-2 2h-9a2 2 0 01-2-2c0-1.893.438-3.683 1.216-5.278L12 14z"
                />
              </svg>
            </div>

            <h2 class="mt-5 text-2xl font-black">
              Want to play?
            </h2>

            <p class="mt-3 text-sm leading-6 text-white/70">
              You are watching as a guest. Log in through the magic-link
              process to reveal the player queue and join a match.
            </p>

            <button
              type="button"
              :disabled="isRequestingLogin"
              class="mt-6 w-full rounded-xl bg-[#f96c00] px-5 py-3 font-bold transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-60"
              @click="goToLogin"
            >
              {{
                isRequestingLogin
                  ? "Sending login link..."
                  : "Log In to Join Queue"
              }}
            </button>
          </div>
        </aside>
      </div>
    </main>

    <!-- Existing project overlays -->
    <ConfirmMatchOverlay
      v-if="confirmationRequest && stillNeedsResponse"
      @confirm-response="confirmMatch"
    />

    <HelpOverlay
      v-if="showHelp"
      @close-help-overlay="showHelp = false"
    />

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

const goToLogin = async () => {
  if (!import.meta.client) {
    return;
  }

  const email = window.prompt("Please enter your email address:");

  if (!email?.trim()) {
    window.alert("Email is required to log in.");
    return;
  }

  isRequestingLogin.value = true;

  try {
    await $fetch("/api/login-request", {
      method: "POST",
      body: {
        email: email.trim().toLowerCase(),
      },
    });

    window.alert(
      "Login link sent! Check your email or the server terminal.",
    );
  } catch (error) {
    console.error("Error requesting login link:", error);
    window.alert("Failed to send the login link. Please try again.");
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
    // Best-effort game cleanup.
    // These should never prevent account logout.
    try {
      disconnectQueue(true);
    } catch (error) {
      console.error("Failed to disconnect from queue during logout:", error);
    }

    try {
      endGame();
    } catch (error) {
      console.error("Failed to disconnect controller during logout:", error);
    }

    // Actually revoke the authenticated session.
    await $fetch("/api/user-logout", {
      method: "POST",
    });

    // Immediately update the client UI.
    sruser.value = null;
    accessPassword.value = null;

    await navigateTo("/");
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

  document.documentElement.classList.toggle(
    "dark",
    theme.value === "dark",
  );
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

const scoreboardUsers = computed<[string, string]>(() => [
  player1.value.username || "TBD",
  player2.value.username || "TBD",
]);

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

  const protocol =
    window.location.protocol === "https:"
      ? "wss"
      : "ws";

  return `${protocol}://${serviceHost.value}:${String(port)}`;
};

const createHttpUrl = (port: unknown, path: string) => {
  if (!import.meta.client) {
    return "";
  }

  const protocol =
    window.location.protocol === "https:"
      ? "https"
      : "http";

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
      createHttpUrl(
        config.public.PORT_SSE_GM,
        "/sse-info",
      ),
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

      if (
        message.type === "UPDATE_QUEUE" &&
        Array.isArray(message.payload)
      ) {
        queue.value = message.payload.filter(
          (username): username is string =>
            typeof username === "string",
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
    (
      queueSocket.value.readyState === WebSocket.OPEN ||
      queueSocket.value.readyState === WebSocket.CONNECTING
    )
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

  if (
    notifyServer &&
    socket.readyState === WebSocket.OPEN
  ) {
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
  if (
    !isInGame.value ||
    event.repeat ||
    isEditableElement(event.target)
  ) {
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
    (
      controllerSocket.value.readyState === WebSocket.OPEN ||
      controllerSocket.value.readyState === WebSocket.CONNECTING
    )
  ) {
    return;
  }

  try {
    controllerStatus.value = "connecting";

    const socket = new WebSocket(
      createWebSocketUrl(
        config.public.PORT_WSS_CONTROLLER_CLIENT,
      ),
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

  return [
    "border-white/20",
    "bg-white/10",
    "text-white",
    "shadow-md",
  ];
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

  theme.value =
    savedTheme === "dark"
      ? "dark"
      : "light";

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