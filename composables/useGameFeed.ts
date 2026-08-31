import { computed, ref, shallowRef } from "vue";

import type { Ref } from "vue";

export type GameFeedConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";

export interface MatchPlayer {
  username: string;
  score: number;
}

interface SocketMessage {
  type?: string;
  payload?: unknown;
}

interface UseGameFeedOptions {
  isInGame: Ref<boolean>;
  onGameEnd: () => void;
}

export const useGameFeed = (options: UseGameFeedOptions) => {
  const config = useRuntimeConfig();

  // --------------------------------------------------------------------------
  // Public game state
  // --------------------------------------------------------------------------

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

  const gameFeedStatus = ref<GameFeedConnectionStatus>("disconnected");

  // Internal SSE connection
  const gameFeed = shallowRef<EventSource | null>(null);

  /*
   * Prevent timer = 0 before a match begins
   * from incorrectly ending the match.
   */
  const hasSeenPositiveTimer = ref(false);
  const resetGameState = () => {
    timer.value = 0;

    player1.value = {
      username: "",
      score: 0,
    };

    player2.value = {
      username: "",
      score: 0,
    };

    hasSeenPositiveTimer.value = false;
  };

  // --------------------------------------------------------------------------
  // Service URL
  // --------------------------------------------------------------------------

  const serviceHost = computed(() => {
    const configuredHost = String(config.public.LOCALHOST || "localhost");

    return configuredHost
      .replace(/^https?:\/\//, "")
      .replace(/^wss?:\/\//, "")
      .replace(/\/.*$/, "");
  });

  const createHttpUrl = (port: unknown, path: string) => {
    if (!import.meta.client) {
      return "";
    }

    const protocol = window.location.protocol === "https:" ? "https" : "http";

    return `${protocol}://${serviceHost.value}:${String(port)}${path}`;
  };

  // --------------------------------------------------------------------------
  // Message parsing
  // --------------------------------------------------------------------------

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
       * The servers may send plain text such
       * as "CONNECTED", which is not JSON.
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

  // --------------------------------------------------------------------------
  // SSE connection
  // --------------------------------------------------------------------------

  const connectGameFeed = () => {
    if (!import.meta.client || gameFeed.value) {
      return;
    }

    try {
      gameFeedStatus.value = "connecting";

      const source = new EventSource(
        createHttpUrl(config.public.PORT_SSE_GM, "/sse-info"),
      );

      gameFeed.value = source;

      source.onopen = () => {
        gameFeedStatus.value = "connected";
      };

      source.onerror = () => {
        /*
         * EventSource automatically attempts
         * to reconnect.
         */
        gameFeedStatus.value = "reconnecting";
      };

      source.onmessage = (event) => {
        const message = parseMessage(event.data);

        if (!message?.type) {
          return;
        }

        // --------------------------------------------------
        // Queue update
        // --------------------------------------------------

        if (message.type === "UPDATE_QUEUE" && Array.isArray(message.payload)) {
          queue.value = message.payload.filter(
            (username): username is string => typeof username === "string",
          );

          return;
        }

        // --------------------------------------------------
        // Timer update
        // --------------------------------------------------

        if (
          message.type === "UPDATE_TIMER" &&
          typeof message.payload === "number"
        ) {
          timer.value = message.payload;

          if (message.payload > 0) {
            hasSeenPositiveTimer.value = true;
          }

          if (
            options.isInGame.value &&
            hasSeenPositiveTimer.value &&
            message.payload <= 0
          ) {
            resetGameState();

            options.onGameEnd();
          }

          return;
        }

        // --------------------------------------------------
        // Score update
        // --------------------------------------------------

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

  return {
    // State
    queue,
    timer,
    player1,
    player2,
    gameFeedStatus,

    // Actions
    connectGameFeed,
    disconnectGameFeed,
    resetGameState,
  };
};
