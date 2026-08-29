import { PrismaClient } from "@prisma/client";
import {
  defineEventHandler,
  getCookie,
  deleteCookie,
} from "h3";

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  const sessionToken = getCookie(event, "srtoken");

  console.log("Logout API called");

  try {
    if (sessionToken) {
      // updateMany does NOT throw if no player matches.
      const result = await prisma.player.updateMany({
        where: {
          sessionToken,
        },
        data: {
          sessionToken: null,
        },
      });

      console.log(`Revoked ${result.count} session(s)`);
    }
  } catch (error) {
    console.error("Failed to revoke session:", error);

    // I would still clear the browser cookies below.
    // Logout should not trap the user in a broken session.
  }

  deleteCookie(event, "srtoken", {
    path: "/",
  });

  deleteCookie(event, "sruser", {
    path: "/",
  });

  deleteCookie(event, "magic_token", {
    path: "/",
  });

  deleteCookie(event, "accesspassword", {
    path: "/",
  });

  return {
    success: true,
  };
});