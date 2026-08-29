import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import {
  defineEventHandler,
  getCookie,
  deleteCookie,
  setCookie,
} from "h3";

const prisma = new PrismaClient();

interface SessionClaims extends jwt.JwtPayload {
  id: string;
}

export default defineEventHandler(async (event) => {
  // Make Prisma available to later server handlers
  event.context.prisma = prisma;

  const srtoken = getCookie(event, "srtoken");

  // No session cookie = not logged in
  if (!srtoken) {
    deleteCookie(event, "sruser", {
      path: "/",
    });

    return;
  }

  try {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not configured");
    }

    // --------------------------------------------------
    // 1. Verify the JWT itself
    // --------------------------------------------------
    const claims = jwt.verify(
      srtoken,
      process.env.JWT_SECRET,
      {
        algorithms: ["HS256"],
      },
    ) as SessionClaims;

    if (!claims.id) {
      throw new Error("Session token is missing player id");
    }

    // --------------------------------------------------
    // 2. Find the player
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
      throw new Error("Player does not exist");
    }

    // --------------------------------------------------
    // 3. IMPORTANT:
    // Verify that this JWT is still the active session
    // --------------------------------------------------
    if (
      !player.sessionToken ||
      player.sessionToken !== srtoken
    ) {
      throw new Error("Session has been revoked");
    }

    // --------------------------------------------------
    // 4. Session is valid
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
    console.error("Session validation failed:", error);

    // Invalid, expired, or revoked session
    deleteCookie(event, "srtoken", {
      path: "/",
    });

    deleteCookie(event, "sruser", {
      path: "/",
    });

    event.context.claims = undefined;
    event.context.user = undefined;
  }
});