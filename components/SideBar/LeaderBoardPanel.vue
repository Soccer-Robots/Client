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
          Rankings
        </p>

        <h2 class="mt-1 text-xl font-black">
          Leaderboard
        </h2>

        <p class="mt-1 text-sm text-white/60">
          Top Soccer Robots players.
        </p>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-if="players.length === 0"
      class="p-5"
    >
      <div
        class="rounded-xl border border-dashed border-white/15 p-6 text-center"
      >
        <p class="font-bold">
          No games played yet
        </p>

        <p class="mt-1 text-sm text-white/50">
          Player rankings will appear here.
        </p>
      </div>
    </div>

    <!-- Leaderboard -->
    <div v-else class="p-4">
      <!-- Sort controls -->
      <div class="mb-4 flex flex-wrap gap-2">
        <button
          v-for="option in sortOptions"
          :key="option.value"
          type="button"
          class="rounded-lg px-3 py-1.5 text-xs font-bold transition"
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

      <!-- Players -->
      <div class="space-y-2">
        <div
          v-for="(player, index) in rankedPlayers"
          :key="player.username"
          class="rounded-xl border border-white/10 bg-black/20 p-3"
        >
          <div class="flex items-center gap-3">
            <!-- Rank -->
            <div
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-black"
              :class="rankClass(index)"
            >
              {{ index + 1 }}
            </div>

            <!-- Player -->
            <div class="min-w-0 flex-1">
              <p class="truncate font-bold">
                {{ player.username }}
              </p>

              <p class="mt-0.5 text-xs text-white/45">
                {{ player.gamesPlayed }}
                {{
                  player.gamesPlayed === 1
                    ? "game"
                    : "games"
                }}
              </p>
            </div>

            <!-- Main displayed stat -->
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
            <div>
              <p class="font-bold text-emerald-300">
                {{ player.wins }}
              </p>

              <p
                class="text-[10px] uppercase tracking-wider text-white/40"
              >
                Wins
              </p>
            </div>

            <div>
              <p class="font-bold text-red-300">
                {{ player.losses }}
              </p>

              <p
                class="text-[10px] uppercase tracking-wider text-white/40"
              >
                Losses
              </p>
            </div>

            <div>
              <p class="font-bold">
                {{ player.goals }}
              </p>

              <p
                class="text-[10px] uppercase tracking-wider text-white/40"
              >
                Goals
              </p>
            </div>

            <div>
              <p class="font-bold">
                {{ formatRatio(player) }}
              </p>

              <p
                class="text-[10px] uppercase tracking-wider text-white/40"
              >
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
}

type SortOption =
  | "wins"
  | "losses"
  | "goals"
  | "gamesPlayed"
  | "ratio";

const props = withDefaults(
  defineProps<{
    players?: LeaderboardPlayer[];
  }>(),
  {
    players: () => [],
  },
);

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

const winLossRatio = (
  player: LeaderboardPlayer,
) => {
  if (player.losses === 0) {
    return player.wins;
  }

  return player.wins / player.losses;
};

const rankedPlayers = computed(() => {
  return [...props.players]
    .sort((a, b) => {
      switch (sortBy.value) {
        case "wins":
          return b.wins - a.wins;

        case "losses":
          return b.losses - a.losses;

        case "goals":
          return b.goals - a.goals;

        case "gamesPlayed":
          return b.gamesPlayed - a.gamesPlayed;

        case "ratio":
          return (
            winLossRatio(b) -
            winLossRatio(a)
          );

        default:
          return 0;
      }
    })
    .slice(0, 5);
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

const displayedStat = (
  player: LeaderboardPlayer,
) => {
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

const formatRatio = (
  player: LeaderboardPlayer,
) => {
  if (player.losses === 0) {
    if (player.wins === 0) {
      return "0.00";
    }

    return `${player.wins}.00`;
  }

  return (
    player.wins / player.losses
  ).toFixed(2);
};

const setSort = (
  option: SortOption,
) => {
  sortBy.value = option;
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