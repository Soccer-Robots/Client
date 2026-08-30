<template>
  <section
    class="flex h-[290px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/10 shadow-xl backdrop-blur-sm"
  >
    <!-- Header -->
    <div
      class="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4"
    >
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.2em] text-orange-300">
          Rankings
        </p>

        <h2 class="mt-1 text-xl font-black">Leaderboard</h2>

        <p class="mt-1 text-sm text-white/60">Top Soccer Robots players.</p>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="p-5">
      <div
        class="rounded-xl border border-white/10 bg-black/20 p-6 text-center"
      >
        <p class="font-bold">Loading leaderboard...</p>

        <p class="mt-1 text-sm text-white/50">
          Fetching the latest player rankings.
        </p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="errorMessage" class="p-5">
      <div
        class="rounded-xl border border-red-400/20 bg-red-400/10 p-6 text-center"
      >
        <p class="font-bold text-red-200">Unable to load leaderboard</p>

        <p class="mt-2 text-sm text-red-200/70">
          {{ errorMessage }}
        </p>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="players.length === 0" class="p-5">
      <div
        class="rounded-xl border border-dashed border-white/15 p-6 text-center"
      >
        <p class="font-bold">No games played yet</p>

        <p class="mt-1 text-sm text-white/50">
          Player rankings will appear here.
        </p>
      </div>
    </div>

    <!-- Leaderboard -->
    <div v-else class="flex min-h-0 flex-1 flex-col p-4">
      <!-- Sort Controls -->
      <div class="mb-4 flex shrink-0 flex-wrap gap-2">
        <button
          v-for="option in sortOptions"
          :key="option.value"
          type="button"
          :disabled="loading"
          class="rounded-lg px-3 py-1.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50"
          :class="
            sortBy === option.value
              ? 'bg-[#f96c00] text-white'
              : 'bg-white/10 text-white/60 hover:bg-white/15'
          "
          @click="setSort(option.value)"
        >
          {{ option.label }}
        </button>
      </div>

      <!-- Player Rankings -->
      <div class="min-h-0 flex-1 space-y-2 overflow-y-auto pr-2">
        <div
          v-for="(player, index) in rankedPlayers"
          :key="player.username"
          class="rounded-xl border border-white/10 bg-black/20 p-3"
        >
          <!-- Main Row -->
          <div class="flex items-center gap-3">
            <!-- Rank -->
            <div
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-black"
              :class="rankClass(index)"
            >
              {{ index + 1 }}
            </div>

            <!-- Player Name -->
            <div class="min-w-0 flex-1">
              <p class="truncate font-bold">
                {{ player.username }}
              </p>

              <p class="mt-0.5 text-xs text-white/45">
                {{ player.gamesPlayed }}

                {{ player.gamesPlayed === 1 ? "game" : "games" }}
              </p>
            </div>

            <!-- Selected Stat -->
            <div class="text-right">
              <p class="text-lg font-black">
                {{ displayedStat(player) }}
              </p>

              <p
                class="text-[10px] font-bold uppercase tracking-wider text-white/40"
              >
                {{ displayedStatLabel }}
              </p>
            </div>
          </div>

          <!-- Detailed Stats -->
          <div
            class="mt-3 grid grid-cols-4 gap-2 border-t border-white/10 pt-3 text-center"
          >
            <!-- Wins -->
            <div>
              <p class="font-bold text-emerald-300">
                {{ player.wins }}
              </p>

              <p class="text-[10px] uppercase tracking-wider text-white/40">
                Wins
              </p>
            </div>

            <!-- Losses -->
            <div>
              <p class="font-bold text-red-300">
                {{ player.losses }}
              </p>

              <p class="text-[10px] uppercase tracking-wider text-white/40">
                Losses
              </p>
            </div>

            <!-- Goals -->
            <div>
              <p class="font-bold">
                {{ player.goals }}
              </p>

              <p class="text-[10px] uppercase tracking-wider text-white/40">
                Goals
              </p>
            </div>

            <!-- Win / Loss Ratio -->
            <div>
              <p class="font-bold">
                {{ formatRatio(player) }}
              </p>

              <p class="text-[10px] uppercase tracking-wider text-white/40">
                W/L
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";

export interface LeaderboardPlayer {
  username: string;
  wins: number;
  losses: number;
  goals: number;
  gamesPlayed: number;
  ratio: number;
}

type SortOption = "wins" | "losses" | "goals" | "gamesPlayed" | "ratio";

const props = withDefaults(
  defineProps<{
    players?: LeaderboardPlayer[];
    loading?: boolean;
    errorMessage?: string;
  }>(),
  {
    players: () => [],
    loading: false,
    errorMessage: "",
  },
);

const emit = defineEmits<{
  (event: "sort-change", sort: SortOption): void;
}>();

const sortBy = ref<SortOption>("wins");

const sortOptions: {
  label: string;
  value: SortOption;
}[] = [
  {
    label: "Wins",
    value: "wins",
  },
  {
    label: "Losses",
    value: "losses",
  },
  {
    label: "Goals",
    value: "goals",
  },
  {
    label: "Games",
    value: "gamesPlayed",
  },
  {
    label: "W/L",
    value: "ratio",
  },
];

const rankedPlayers = computed(() => {
  return props.players;
});

const displayedStatLabel = computed(() => {
  switch (sortBy.value) {
    case "wins":
      return "Wins";

    case "losses":
      return "Losses";

    case "goals":
      return "Goals";

    case "gamesPlayed":
      return "Games";

    case "ratio":
      return "W/L";

    default:
      return "";
  }
});

const displayedStat = (player: LeaderboardPlayer) => {
  switch (sortBy.value) {
    case "wins":
      return player.wins;

    case "losses":
      return player.losses;

    case "goals":
      return player.goals;

    case "gamesPlayed":
      return player.gamesPlayed;

    case "ratio":
      return formatRatio(player);

    default:
      return "";
  }
};

const formatRatio = (player: LeaderboardPlayer) => {
  return player.ratio.toFixed(2);
};

const setSort = (option: SortOption) => {
  if (sortBy.value === option) {
    return;
  }

  sortBy.value = option;

  emit("sort-change", option);
};

const rankClass = (index: number) => {
  switch (index) {
    case 0:
      return "bg-yellow-400/20 text-yellow-200";

    case 1:
      return "bg-white/20 text-white";

    case 2:
      return "bg-orange-700/30 text-orange-200";

    default:
      return "bg-white/10 text-white/60";
  }
};
</script>
