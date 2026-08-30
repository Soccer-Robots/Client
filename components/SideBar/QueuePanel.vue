<template>
  <section
    class="overflow-hidden rounded-2xl border border-white/10 bg-white/10 shadow-xl backdrop-blur-sm"
  >
    <!-- Header -->
    <div
      class="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4"
    >
      <div>
        <p
          class="text-xs font-bold uppercase tracking-[0.2em] text-orange-300"
        >
          Player Access
        </p>

        <h2 class="mt-1 text-xl font-black">
          Match Queue
        </h2>

        <p class="mt-1 text-sm text-white/60">
          {{ queueDescription }}
        </p>
      </div>

      <span
        class="shrink-0 rounded-full px-3 py-1 text-xs font-bold"
        :class="statusClass"
      >
        {{ statusLabel }}
      </span>
    </div>

    <!-- Guest state -->
    <div
      v-if="!isLoggedIn"
      class="p-5"
    >
      <p class="text-sm leading-6 text-white/70">
        Log in to join the queue and play a match.
      </p>

      <button
        type="button"
        class="mt-4 w-full rounded-xl bg-[#f96c00] px-4 py-3 font-bold transition hover:bg-orange-500"
        @click="emit('login')"
      >
        Player Login
      </button>
    </div>

    <!-- Logged-in state -->
    <div v-else>
      <!-- Queue list -->
      <div class="max-h-[360px] overflow-y-auto p-4">
        <div
          v-if="queueMatches.length === 0"
          class="rounded-xl border border-dashed border-white/15 p-6 text-center"
        >
          <p class="font-bold">
            Queue is empty
          </p>

          <p class="mt-1 text-sm text-white/50">
            Be the first player to join.
          </p>
        </div>

        <div
          v-else
          class="space-y-3"
        >
          <div
            v-for="match in queueMatches"
            :key="match.position"
            class="rounded-xl border border-white/10 bg-black/20 p-4"
          >
            <!-- Match number -->
            <p
              class="mb-3 text-xs font-bold uppercase tracking-wider text-white/40"
            >
              Match {{ match.position }}
            </p>

            <!-- Players -->
            <div
              class="grid grid-cols-[1fr_auto_1fr] items-center gap-3"
            >
              <p
                class="truncate text-center text-sm font-bold"
                :class="{
                  'text-orange-300':
                    match.player1 === playerName,
                }"
              >
                {{ match.player1 }}
              </p>

              <span
                class="text-xs font-black uppercase text-white/40"
              >
                VS
              </span>

              <p
                class="truncate text-center text-sm font-bold"
                :class="{
                  'text-orange-300':
                    match.player2 === playerName,
                }"
              >
                {{ match.player2 || "Waiting..." }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Queue controls -->
      <div
        class="border-t border-white/10 p-4"
      >
        <button
          v-if="!isInGame"
          type="button"
          class="w-full rounded-xl px-4 py-3 font-bold transition disabled:cursor-not-allowed disabled:opacity-60"
          :class="
            isQueued
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-[#f96c00] hover:bg-orange-500'
          "
          :disabled="isBusy"
          @click="handleQueueAction"
        >
          {{ buttonLabel }}
        </button>

        <div
          v-else
          class="rounded-xl bg-emerald-400/10 px-4 py-3 text-center text-sm font-bold text-emerald-200"
        >
          You are currently in a match.
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";

type QueueStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";

interface QueueMatch {
  position: number;
  player1: string;
  player2: string;
}

const props = defineProps<{
  queueUsers: string[];
  playerName: string;
  isLoggedIn: boolean;
  isInGame: boolean;
  queueStatus: QueueStatus;
}>();

const emit = defineEmits<{
  (event: "join-queue"): void;
  (event: "leave-queue"): void;
  (event: "login"): void;
}>();

/*
 * Turn:
 *
 * ["Alice", "Bob", "Charlie", "David", "Eve"]
 *
 * into:
 *
 * Match 1: Alice   vs Bob
 * Match 2: Charlie vs David
 * Match 3: Eve     vs Waiting...
 */
const queueMatches = computed<QueueMatch[]>(() => {
  const matches: QueueMatch[] = [];

  for (
    let index = 0;
    index < props.queueUsers.length;
    index += 2
  ) {
    matches.push({
      position: index / 2 + 1,
      player1: props.queueUsers[index] ?? "",
      player2: props.queueUsers[index + 1] ?? "",
    });
  }

  return matches;
});

/*
 * The queue WebSocket represents this client's queue membership.
 *
 * connecting = attempting to join
 * connected  = currently joined
 */
const isQueued = computed(() => {
  return (
    props.queueStatus === "connecting" ||
    props.queueStatus === "connected"
  );
});

const isBusy = computed(() => {
  return (
    props.queueStatus === "connecting" ||
    props.queueStatus === "reconnecting"
  );
});

const buttonLabel = computed(() => {
  if (props.queueStatus === "connecting") {
    return "Joining Queue...";
  }

  if (props.queueStatus === "reconnecting") {
    return "Reconnecting...";
  }

  if (props.queueStatus === "connected") {
    return "Leave Queue";
  }

  return "Join Queue";
});

const statusLabel = computed(() => {
  switch (props.queueStatus) {
    case "connected":
      return "In Queue";

    case "connecting":
      return "Joining";

    case "reconnecting":
      return "Reconnecting";

    case "error":
      return "Error";

    default:
      return `${props.queueUsers.length} Waiting`;
  }
});

const statusClass = computed(() => {
  switch (props.queueStatus) {
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
});

const queueDescription = computed(() => {
  if (props.isInGame) {
    return "Your match is currently in progress.";
  }

  if (!props.isLoggedIn) {
    return "Log in to enter the next available match.";
  }

  if (isQueued.value) {
    return "You are waiting for a match confirmation.";
  }

  return "Join the queue and wait for your turn.";
});

const handleQueueAction = () => {
  if (isQueued.value) {
    emit("leave-queue");
    return;
  }

  emit("join-queue");
};
</script>