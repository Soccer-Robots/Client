import { ref, shallowRef } from "vue";

import type { Ref, ComputedRef } from "vue";

export type QueueConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";

interface SocketMessage {
  type?: string;
  payload?: unknown;
}

interface UseMatchQueueOptions {
  isLoggedIn: ComputedRef<boolean>;
  isInGame: Ref<boolean>;

  onMatchStart: (accessPassword: string) => void | Promise<void>;
}

export const useMatchQueue = (options: UseMatchQueueOptions) => {
  const config = useRuntimeConfig();

  // --------------------------------------------------------------------------
  // Queue state
  // --------------------------------------------------------------------------

  const queueSocket = shallowRef<WebSocket | null>(null);

  const queueStatus = ref<QueueConnectionStatus>("disconnected");

  // --------------------------------------------------------------------------
  // Match confirmation state
  // --------------------------------------------------------------------------

  const confirmationRequest = ref(false);

  const stillNeedsResponse = ref(false);

  const confirmationPassword = ref("");

  // --------------------------------------------------------------------------
  // Service URL
  // --------------------------------------------------------------------------

  const createWebSocketUrl = (port: unknown) => {
    if (!import.meta.client) {
      return "";
    }

    const configuredHost = String(config.public.LOCALHOST || "localhost");

    const serviceHost = configuredHost
      .replace(/^https?:\/\//, "")
      .replace(/^wss?:\/\//, "")
      .replace(/\/.*$/, "");

    const protocol = window.location.protocol === "https:" ? "wss" : "ws";

    return `${protocol}://${serviceHost}:${String(port)}`;
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
       * The Game Manager may send
       * plain-text messages such as
       * "CONNECTED".
       */
      return null;
    }
  };

  // --------------------------------------------------------------------------
  // Reset confirmation state
  // --------------------------------------------------------------------------

  const resetConfirmation = () => {
    confirmationRequest.value = false;

    stillNeedsResponse.value = false;

    confirmationPassword.value = "";
  };

  // --------------------------------------------------------------------------
  // Join queue
  // --------------------------------------------------------------------------

  const joinQueue = () => {
    if (!import.meta.client) {
      return;
    }

    if (!options.isLoggedIn.value) {
      window.alert("Log in before joining the queue.");

      return;
    }

    if (options.isInGame.value) {
      window.alert("You are already in a match.");

      return;
    }

    /*
     * Don't create another connection
     * if one is already active.
     */
    if (
      queueSocket.value &&
      (queueSocket.value.readyState === WebSocket.OPEN ||
        queueSocket.value.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    try {
      queueStatus.value = "connecting";

      const socket = new WebSocket(
        createWebSocketUrl(config.public.PORT_CLIENT_GM),
      );

      queueSocket.value = socket;

      // --------------------------------------------------
      // Connected
      // --------------------------------------------------

      socket.onopen = () => {
        queueStatus.value = "connected";

        socket.send(
          JSON.stringify({
            type: "JOIN_QUEUE",
            payload: "",
          }),
        );
      };

      // --------------------------------------------------
      // Error
      // --------------------------------------------------

      socket.onerror = (event) => {
        console.error("Queue WebSocket error:", event);

        queueStatus.value = "error";
      };

      // --------------------------------------------------
      // Closed
      // --------------------------------------------------

      socket.onclose = () => {
        /*
         * Make sure an old socket
         * doesn't clear a newer one.
         */
        if (queueSocket.value === socket) {
          queueSocket.value = null;
        }

        queueStatus.value = "disconnected";
      };

      // --------------------------------------------------
      // Messages
      // --------------------------------------------------

      socket.onmessage = async (event) => {
        console.log("[QUEUE] RAW MESSAGE:", event.data);

        const message = parseMessage(event.data);

        console.log("[QUEUE] PARSED MESSAGE:", message);

        if (!message?.type) {
          console.log("[QUEUE] Message had no JSON type");

          return;
        }

        switch (message.type) {
          // ----------------------------------------------
          // Ask player to accept match
          // ----------------------------------------------

          case "MATCH_CONFIRMATION": {
            console.log(
              "[QUEUE] MATCH_CONFIRMATION received:",
              message.payload,
            );

            if (typeof message.payload !== "string") {
              console.log("[QUEUE] Invalid confirmation payload");

              return;
            }

            confirmationPassword.value = message.payload;

            confirmationRequest.value = true;

            stillNeedsResponse.value = true;

            console.log("[QUEUE] Confirmation state:", {
              confirmationRequest: confirmationRequest.value,

              stillNeedsResponse: stillNeedsResponse.value,
            });

            break;
          }

          // ----------------------------------------------
          // Confirmation cancelled/reset
          // ----------------------------------------------

          case "MATCH_CONFIRMATION_RESET": {
            resetConfirmation();

            break;
          }

          // ----------------------------------------------
          // Match begins
          // ----------------------------------------------

          case "MATCH_START": {
            if (typeof message.payload !== "string") {
              return;
            }

            resetConfirmation();

            await options.onMatchStart(message.payload);

            break;
          }
        }
      };
    } catch (error) {
      console.error("Failed to connect to the queue:", error);

      queueStatus.value = "error";
    }
  };

  // --------------------------------------------------------------------------
  // Leave queue
  // --------------------------------------------------------------------------

  const leaveQueue = () => {
    const socket = queueSocket.value;

    if (!socket) {
      queueStatus.value = "disconnected";

      return;
    }

    if (socket.readyState === WebSocket.OPEN) {
      socket.send(
        JSON.stringify({
          type: "LEAVE_QUEUE",
          payload: "",
        }),
      );
    }

    /*
     * The Game Manager normally
     * closes the socket after
     * LEAVE_QUEUE.
     *
     * Closing it locally shortly
     * afterwards makes the UI react
     * immediately as well.
     */
    window.setTimeout(() => {
      if (
        socket.readyState === WebSocket.OPEN ||
        socket.readyState === WebSocket.CONNECTING
      ) {
        socket.close();
      }
    }, 100);
  };

  // --------------------------------------------------------------------------
  // Force disconnect
  // --------------------------------------------------------------------------

  const disconnectQueue = (notifyServer = false) => {
    const socket = queueSocket.value;

    if (!socket) {
      queueStatus.value = "disconnected";

      resetConfirmation();

      return;
    }

    if (notifyServer && socket.readyState === WebSocket.OPEN) {
      socket.send(
        JSON.stringify({
          type: "LEAVE_QUEUE",
          payload: "",
        }),
      );
    }

    socket.close();

    queueSocket.value = null;

    queueStatus.value = "disconnected";

    resetConfirmation();
  };

  // --------------------------------------------------------------------------
  // Respond to match confirmation
  // --------------------------------------------------------------------------

  const confirmMatch = (accepted: boolean) => {
    stillNeedsResponse.value = false;

    confirmationRequest.value = false;

    const socket = queueSocket.value;

    if (socket?.readyState !== WebSocket.OPEN) {
      return;
    }

    socket.send(
      JSON.stringify({
        type: "CONFIRMATION",

        payload: {
          password: confirmationPassword.value,

          accepted,
        },
      }),
    );
  };

  return {
    // State
    queueStatus,
    confirmationRequest,
    stillNeedsResponse,

    // Actions
    joinQueue,
    leaveQueue,
    disconnectQueue,
    confirmMatch,
  };
};
