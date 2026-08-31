import {
  computed,
  ref,
} from "vue";

export interface SessionUser {
  username?: string;
  role?: string;
}

type LogoutCleanup =
  () => void | Promise<void>;

export const useAuth = () => {
  /* ------------------------------------------------------------------------ */
  /* Session                                                                  */
  /* ------------------------------------------------------------------------ */

  const sruser =
    useCookie<SessionUser | string | null>(
      "sruser",
    );

  const currentUser =
    computed<SessionUser | null>(() => {
      const value = sruser.value;

      if (!value) {
        return null;
      }

      /*
       * Middleware may already deserialize
       * the cookie into an object.
       */
      if (typeof value === "object") {
        return value;
      }

      /*
       * Support the older login format where
       * sruser may contain either JSON or a
       * plain username string.
       */
      try {
        const parsed = JSON.parse(value);

        if (
          parsed &&
          typeof parsed === "object"
        ) {
          return parsed as SessionUser;
        }
      } catch {
        /*
         * Plain strings are treated as
         * usernames.
         */
      }

      return {
        username: value,
      };
    });

  const playerName = computed(
    () =>
      currentUser.value?.username ?? "",
  );

  const isLoggedIn = computed(
    () => Boolean(playerName.value),
  );

  const isAdmin = computed(
    () =>
      currentUser.value?.role ===
      "admin",
  );

  /* ------------------------------------------------------------------------ */
  /* Login request                                                            */
  /* ------------------------------------------------------------------------ */

  const isRequestingLogin =
    ref(false);

  const loginRequestSuccess =
    ref(false);

  const loginRequestError =
    ref("");

  const resetLoginRequest = () => {
    loginRequestSuccess.value = false;
    loginRequestError.value = "";
  };

  const requestLogin = async (
    email: string,
  ) => {
    if (
      isRequestingLogin.value
    ) {
      return;
    }

    isRequestingLogin.value = true;
    loginRequestError.value = "";
    loginRequestSuccess.value = false;

    try {
      await $fetch(
        "/api/login-request",
        {
          method: "POST",

          body: {
            email,
          },
        },
      );

      loginRequestSuccess.value =
        true;
    } catch (error) {
      console.error(
        "Error requesting login link:",
        error,
      );

      loginRequestError.value =
        "Failed to send the login link. Please try again.";
    } finally {
      isRequestingLogin.value =
        false;
    }
  };

  /* ------------------------------------------------------------------------ */
  /* Logout                                                                   */
  /* ------------------------------------------------------------------------ */

  const isLoggingOut = ref(false);

  const logout = async (
    beforeLogout?: LogoutCleanup,
  ) => {
    if (isLoggingOut.value) {
      return;
    }

    isLoggingOut.value = true;

    try {
      /*
       * index.vue can use this callback to
       * leave the queue and stop an active
       * game before destroying the session.
       */
      if (beforeLogout) {
        await beforeLogout();
      }

      await $fetch(
        "/api/user-logout",
        {
          method: "POST",
        },
      );

      /*
       * Let the server own cookie cleanup.
       * A hard navigation guarantees the
       * next request sees the new session
       * state.
       */
      if (import.meta.client) {
        window.location.replace("/");
      }
    } catch (error) {
      console.error(
        "Logout failed:",
        error,
      );

      if (import.meta.client) {
        window.alert(
          "Failed to log out. Please try again.",
        );
      }
    } finally {
      isLoggingOut.value = false;
    }
  };

  return {
    // Session
    currentUser,
    playerName,
    isLoggedIn,
    isAdmin,

    // Login request
    isRequestingLogin,
    loginRequestSuccess,
    loginRequestError,
    requestLogin,
    resetLoginRequest,

    // Logout
    isLoggingOut,
    logout,
  };
};  