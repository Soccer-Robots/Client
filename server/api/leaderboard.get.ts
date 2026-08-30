import type { PrismaClient } from "@prisma/client";
import {
  defineEventHandler,
  getQuery,
} from "h3";

type LeaderboardSort =
  | "wins"
  | "losses"
  | "goals"
  | "gamesPlayed"
  | "ratio";

export default defineEventHandler(async (event) => {
  const prisma =
    event.context.prisma as PrismaClient;

  const { sortedColumn } = getQuery(event);

  const requestedSort: LeaderboardSort =
    sortedColumn === "losses" ||
    sortedColumn === "goals" ||
    sortedColumn === "gamesPlayed" ||
    sortedColumn === "ratio"
      ? sortedColumn
      : "wins";

  /*
   * Frontend calls it "gamesPlayed".
   * Prisma calls the column "games".
   */
  const databaseSort =
    requestedSort === "gamesPlayed"
      ? "games"
      : requestedSort;

  const players = await prisma.player.findMany({
    select: {
      username: true,
      wins: true,
      losses: true,
      goals: true,
      games: true,
      ratio: true,
    },

    orderBy: [
      {
        [databaseSort]: "desc",
      },

      // Stable order when two players have same stat
      {
        username: "asc",
      },
    ],

    take: 50,
  });

  /*
   * Normalize database naming to the
   * frontend LeaderboardPlayer interface.
   */
  return players.map((player) => ({
    username: player.username,
    wins: player.wins,
    losses: player.losses,
    goals: player.goals,

    gamesPlayed: player.games,

    ratio: player.ratio ?? 0,
  }));
});