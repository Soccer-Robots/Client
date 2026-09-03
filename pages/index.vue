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
  ref,
  watch,
} from "vue";
import { useGameFeed } from "~/composables/useGameFeed";
import { useMatchQueue } from "~/composables/useMatchQueue";
import { useRobotController } from "~/composables/useRobotController";
import { useLeaderboard } from "~/composables/useLeaderboard";
import { useAuth } from "~/composables/useAuth";

/* -------------------------------------------------------------------------- */
/* Leaderboard                                                                */
/* -------------------------------------------------------------------------- */

const {
  leaderboard,
  leaderboardLoading,
  leaderboardError,
  loadLeaderboard,
} = useLeaderboard();

type Theme = "light" | "dark";


useHead({
  title: "Game | Soccer Robots",
});

/* -------------------------------------------------------------------------- */
/* Authentication                                                             */
/* -------------------------------------------------------------------------- */

const {
  playerName,
  isLoggedIn,
  isAdmin,
  isRequestingLogin,
  loginRequestSuccess,
  loginRequestError,
  requestLogin,
  resetLoginRequest,
  isLoggingOut,
  logout: logoutSession,
} = useAuth();


const accessPassword = useCookie<string | null>("accesspassword", {
  path: "/",
  sameSite: "lax",
});

const showLoginRequest = ref(false);

const openLoginPopup = () => {
  resetLoginRequest();
  
  showLoginRequest.value = true;
};

const closeLoginPopup = () => {
  if (isRequestingLogin.value) {
    return;
  }

  showLoginRequest.value = false;
  resetLoginRequest();
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


//for testing stream
// const isInGame = ref(true);

// const streamType = ref<"twitch" | "janus">("janus");

const isInGame = ref(false);

const streamType = computed<"twitch" | "janus">(() => {
  return isInGame.value ? "janus" : "twitch";
});
/* -------------------------------------------------------------------------- */
/* Robot controller                                                           */
/* -------------------------------------------------------------------------- */

const {
  connectController,
  disconnectController,
} = useRobotController({
  isLoggedIn,
  isInGame,
  accessPassword,
});

const endGame = () => {
  isInGame.value = false;
  accessPassword.value = null;

  disconnectController();

  window.setTimeout(() => {
    void loadLeaderboard();
  }, 1500);
};
const logout = async () => {
  await logoutSession(() => {
    try {
      disconnectQueue(true);
    } catch (error) {
      console.error(
        "Failed to disconnect from queue during logout:",
        error,
      );
    }

    try {
      endGame();
    } catch (error) {
      console.error(
        "Failed to end game during logout:",
        error,
      );
    }
  });
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
  connectGameFeed,
  disconnectGameFeed,
} = useGameFeed({
  isInGame,
  onGameEnd: endGame,
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

  disconnectGameFeed();
  disconnectQueue(false);
});
</script>
