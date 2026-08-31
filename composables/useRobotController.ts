import {
  computed,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  shallowRef,
} from "vue";

import type {
  ComputedRef,
  Ref,
} from "vue";

export type ControllerConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";

export type ControlKey =
  | "w"
  | "a"
  | "s"
  | "d";

interface UseRobotControllerOptions {
  isLoggedIn: ComputedRef<boolean>;
  isInGame: Ref<boolean>;
  accessPassword: Ref<string | null>;
}

export const useRobotController = (
  options: UseRobotControllerOptions,
) => {
  const config = useRuntimeConfig();

  /* ------------------------------------------------------------------------ */
  /* Controller WebSocket                                                     */
  /* ------------------------------------------------------------------------ */

  const controllerSocket =
    shallowRef<WebSocket | null>(null);

  const controllerStatus =
    ref<ControllerConnectionStatus>(
      "disconnected",
    );

  /* ------------------------------------------------------------------------ */
  /* Keyboard state                                                           */
  /* ------------------------------------------------------------------------ */

  const controlKeys = [
    "w",
    "a",
    "s",
    "d",
  ] as const;

  const keyState = reactive<
    Record<ControlKey, 0 | 1>
  >({
    w: 0,
    a: 0,
    s: 0,
    d: 0,
  });

  const currentKeyPayload =
    computed(() => {
      return `${keyState.w}${keyState.a}${keyState.s}${keyState.d}`;
    });

  /* ------------------------------------------------------------------------ */
  /* Controller URL                                                           */
  /* ------------------------------------------------------------------------ */

  const createWebSocketUrl = (
    port: unknown,
  ) => {
    if (!import.meta.client) {
      return "";
    }

    const configuredHost = String(
      config.public.LOCALHOST ||
        "localhost",
    );

    const serviceHost =
      configuredHost
        .replace(
          /^https?:\/\//,
          "",
        )
        .replace(
          /^wss?:\/\//,
          "",
        )
        .replace(/\/.*$/, "");

    const protocol =
      window.location.protocol ===
      "https:"
        ? "wss"
        : "ws";

    return `${protocol}://${serviceHost}:${String(port)}`;
  };

  /* ------------------------------------------------------------------------ */
  /* Keyboard helpers                                                         */
  /* ------------------------------------------------------------------------ */

  const isControlKey = (
    key: string,
  ): key is ControlKey => {
    return controlKeys.includes(
      key as ControlKey,
    );
  };

  const isEditableElement = (
    target: EventTarget | null,
  ) => {
    if (
      !(target instanceof HTMLElement)
    ) {
      return false;
    }

    return (
      target.isContentEditable ||
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "SELECT"
    );
  };

  /* ------------------------------------------------------------------------ */
  /* Send keyboard state                                                      */
  /* ------------------------------------------------------------------------ */

  const sendKeyState = () => {
    const socket =
      controllerSocket.value;

    if (
      socket?.readyState !==
      WebSocket.OPEN
    ) {
      return;
    }

    socket.send(
      JSON.stringify({
        type: "KEY_INPUT",
        payload:
          currentKeyPayload.value,
      }),
    );
  };

  const resetKeyState = (
    sendUpdate = true,
  ) => {
    keyState.w = 0;
    keyState.a = 0;
    keyState.s = 0;
    keyState.d = 0;

    if (sendUpdate) {
      sendKeyState();
    }
  };

  /* ------------------------------------------------------------------------ */
  /* Keyboard events                                                          */
  /* ------------------------------------------------------------------------ */

  const handleKeyDown = (
    event: KeyboardEvent,
  ) => {
    if (
      !options.isInGame.value ||
      event.repeat ||
      isEditableElement(
        event.target,
      )
    ) {
      return;
    }

    const key =
      event.key.toLowerCase();

    if (!isControlKey(key)) {
      return;
    }

    event.preventDefault();

    if (keyState[key] === 1) {
      return;
    }

    keyState[key] = 1;

    sendKeyState();
  };

  const handleKeyUp = (
    event: KeyboardEvent,
  ) => {
    const key =
      event.key.toLowerCase();

    if (!isControlKey(key)) {
      return;
    }

    if (options.isInGame.value) {
      event.preventDefault();
    }

    if (keyState[key] === 0) {
      return;
    }

    keyState[key] = 0;

    sendKeyState();
  };

  const handleWindowBlur = () => {
    resetKeyState();
  };

  /* ------------------------------------------------------------------------ */
  /* Connect controller                                                       */
  /* ------------------------------------------------------------------------ */

  const connectController = () => {
    if (!import.meta.client) {
      return;
    }

    if (
      !options.isLoggedIn.value ||
      !options.accessPassword.value
    ) {
      controllerStatus.value =
        "error";

      return;
    }

    /*
     * Don't create a second controller
     * connection if one already exists.
     */
    if (
      controllerSocket.value &&
      (
        controllerSocket.value
          .readyState ===
          WebSocket.OPEN ||
        controllerSocket.value
          .readyState ===
          WebSocket.CONNECTING
      )
    ) {
      return;
    }

    try {
      controllerStatus.value =
        "connecting";

      const socket =
        new WebSocket(
          createWebSocketUrl(
            config.public
              .PORT_WSS_CONTROLLER_CLIENT,
          ),
        );

      controllerSocket.value =
        socket;

      socket.onopen = () => {
        controllerStatus.value =
          "connected";

        /*
         * Send 0000 when the controller
         * first connects.
         */
        resetKeyState();
      };

      socket.onerror = (
        event,
      ) => {
        console.error(
          "Controller WebSocket error:",
          event,
        );

        controllerStatus.value =
          "error";
      };

      socket.onclose = () => {
        if (
          controllerSocket.value ===
          socket
        ) {
          controllerSocket.value =
            null;
        }

        resetKeyState(false);

        controllerStatus.value =
          "disconnected";
      };

      /*
       * Keep this debugging code for now.
       */
      socket.onmessage = (
        event,
      ) => {
        console.log(
          "Controller message:",
          event.data,
        );
      };
    } catch (error) {
      console.error(
        "Failed to connect to controller:",
        error,
      );

      controllerStatus.value =
        "error";
    }
  };

  /* ------------------------------------------------------------------------ */
  /* Disconnect controller                                                    */
  /* ------------------------------------------------------------------------ */

  const disconnectController = () => {
    /*
     * Reset controls before closing the
     * socket so the robot receives 0000.
     */
    resetKeyState();

    controllerSocket.value?.close();

    controllerSocket.value =
      null;

    controllerStatus.value =
      "disconnected";
  };

  /* ------------------------------------------------------------------------ */
  /* Lifecycle                                                                */
  /* ------------------------------------------------------------------------ */

  onMounted(() => {
    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    window.addEventListener(
      "keyup",
      handleKeyUp,
    );

    window.addEventListener(
      "blur",
      handleWindowBlur,
    );
  });

  onBeforeUnmount(() => {
    window.removeEventListener(
      "keydown",
      handleKeyDown,
    );

    window.removeEventListener(
      "keyup",
      handleKeyUp,
    );

    window.removeEventListener(
      "blur",
      handleWindowBlur,
    );

    disconnectController();
  });

  return {
    controllerStatus,
    keyState,

    connectController,
    disconnectController,
  };
};