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
    />

    <!-- Chat later -->
  </aside>
</template>

<script setup lang="ts">

interface LeaderboardPlayer {
  username: string;
  wins: number;
  losses: number;
  goals: number;
  gamesPlayed: number;
}

type QueueStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";

defineProps<{
  queue: string[];
  playerName: string;
  isLoggedIn: boolean;
  isInGame: boolean;
  queueStatus: QueueStatus;
  leaderboard: LeaderboardPlayer[];
}>();

const emit = defineEmits<{
  (event: "join-queue"): void;
  (event: "leave-queue"): void;
  (event: "login"): void;
}>();
</script>