import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import {
  defineEventHandler,
  getCookie,
  deleteCookie,
  setCookie,
  getHeader,
  getRequestURL,
  sendRedirect,
} from "h3";

const prisma = new PrismaClient();

interface SessionClaims extends jwt.JwtPayload {
  id: string;
}

export default defineEventHandler(async (event) => {
  event.context.prisma = prisma;

  const srtoken = getCookie(event, "srtoken");
  const sruser = getCookie(event, "sruser");

  /*
   * Only redirect actual browser page requests.
   *
   * We do NOT want API calls, JavaScript files,
   * images, etc. receiving HTML redirects.
   */
  const acceptHeader = getHeader(event, "accept") ?? "";

  const isPageRequest =
    event.method === "GET" &&
    acceptHeader.includes("text/html");

  const clearSession = () => {
    deleteCookie(event, "srtoken", {
      path: "/",
    });

    deleteCookie(event, "sruser", {
      path: "/",
    });

    deleteCookie(event, "accesspassword", {
      path: "/",
    });

    event.context.claims = undefined;
    event.context.user = undefined;
  };

  const redirectAfterClearingSession = () => {
    const url = getRequestURL(event);

    return sendRedirect(
      event,
      `${url.pathname}${url.search}`,
      302,
    );
  };

  // --------------------------------------------------
  // No authentication token
  // --------------------------------------------------

  if (!srtoken) {
    /*
     * If sruser somehow remains while srtoken is gone,
     * it is stale UI state.
     */
    if (sruser) {
      clearSession();

      /*
       * Prevent SSR from rendering using the stale
       * sruser cookie from this request.
       */
      if (isPageRequest) {
        return redirectAfterClearingSession();
      }
    }

    return;
  }

  try {
    if (!process.env.JWT_SECRET) {
      throw new Error(
        "JWT_SECRET is not configured",
      );
    }

    // --------------------------------------------------
    // 1. Verify JWT
    // --------------------------------------------------

    const claims = jwt.verify(
      srtoken,
      process.env.JWT_SECRET,
      {
        algorithms: ["HS256"],
      },
    ) as SessionClaims;

    if (!claims.id) {
      throw new Error(
        "Session token is missing player id",
      );
    }

    // --------------------------------------------------
    // 2. Find player + active session
    // --------------------------------------------------

    const player = await prisma.player.findUnique({
      where: {
        user_id: claims.id,
      },

      select: {
        user_id: true,
        username: true,
        role: true,
        sessionToken: true,
      },
    });

    if (!player) {
      throw new Error(
        "Player does not exist",
      );
    }

    // --------------------------------------------------
    // 3. Check server-side session revocation
    // --------------------------------------------------

    if (
      !player.sessionToken ||
      player.sessionToken !== srtoken
    ) {
      throw new Error(
        "Session has been revoked",
      );
    }

    // --------------------------------------------------
    // 4. Valid authenticated session
    // --------------------------------------------------

    event.context.claims = claims;

    event.context.user = {
      user_id: player.user_id,
      username: player.username,
      role: player.role,
    };

    setCookie(
      event,
      "sruser",
      JSON.stringify({
        username: player.username,
        role: player.role,
      }),
      {
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
        sameSite: "lax",
        secure: false,
      },
    );
  } catch (error) {
    console.error(
      "Session validation failed:",
      error,
    );

    clearSession();

    /*
     * IMPORTANT:
     *
     * The request still contains the old sruser cookie.
     * If Nuxt SSR renders this request, index.vue can
     * incorrectly render the authenticated UI.
     *
     * Redirect browser page requests so that the next
     * request occurs after the cookies are actually gone.
     */
    if (isPageRequest) {
      return redirectAfterClearingSession();
    }
  }
});