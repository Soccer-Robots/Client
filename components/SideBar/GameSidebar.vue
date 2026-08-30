<template>
  <aside class="min-w-0 space-y-5">
    <QueuePanel
      :queue-users="queue"
      :player-name="playerName"
      :is-logged-in="isLoggedIn"
      :is-in-game="isInGame"
      :queue-status="queueStatus"
      @join-queue="emit('join-queue')"
      @leave-queue="emit('leave-queue')"
      @login="emit('login')"
    />

    <LeaderBoardPanel
  :players="leaderboard"
  :loading="leaderboardLoading"
  :error-message="leaderboardError"
  @sort-change="emit('sort-leaderboard', $event)"
/>
  </aside>
</template>

<script setup lang="ts">
import QueuePanel from "~/components/SideBar/QueuePanel.vue";
import LeaderBoardPanel from "~/components/SideBar/LeaderBoardPanel.vue";

interface LeaderboardPlayer {
  username: string;
  wins: number;
  losses: number;
  goals: number;
  gamesPlayed: number;
  ratio: number;
}

type QueueStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";

type LeaderboardSort =
  | "wins"
  | "losses"
  | "goals"
  | "gamesPlayed"
  | "ratio";

defineProps<{
  queue: string[];
  playerName: string;
  isLoggedIn: boolean;
  isInGame: boolean;
  queueStatus: QueueStatus;
  leaderboard: LeaderboardPlayer[];
  leaderboardLoading: boolean;
  leaderboardError: string;
}>();

const emit = defineEmits<{
  (event: "join-queue"): void;
  (event: "leave-queue"): void;
  (event: "login"): void;

  (
    event: "sort-leaderboard",
    sort: LeaderboardSort,
  ): void;
}>();
</script>