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
import {useRobotController} from "~/composables/useRobotController";

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




interface SessionUser {
  username?: string;
  role?: string;
}



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
