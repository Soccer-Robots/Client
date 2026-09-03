import { ref } from "vue";

export type LeaderboardSort =
  | "wins"
  | "losses"
  | "goals"
  | "gamesPlayed"
  | "ratio";

export interface LeaderboardPlayer {
  username: string;
  wins: number;
  losses: number;
  goals: number;
  gamesPlayed: number;
  ratio: number;
}

export const useLeaderboard = () => {
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
      leaderboard.value = await $fetch<LeaderboardPlayer[]>(
        "/api/leaderboard",
        {
          query: {
            sortedColumn: sort,
          },
        },
      );
    } catch (error) {
      console.error("Error loading leaderboard:", error);
      leaderboardError.value = "Failed to load leaderboard.";
      leaderboard.value = [];
    } finally {
      leaderboardLoading.value = false;
    }
  };

  return {
    leaderboard,
    leaderboardSort,
    leaderboardLoading,
    leaderboardError,
    loadLeaderboard,
  }
};
