import { PrismaClient } from "@prisma/client";
import { nanoid } from "nanoid";
import {
  createError,
  defineEventHandler,
  getRequestURL,
  readBody,
} from "h3";

const prisma = new PrismaClient();

interface LoginRequestBody {
  email?: string;
}

export default defineEventHandler(async (event) => {
  try {
    // --------------------------------------------------
    // 1. Read request body
    // --------------------------------------------------
    const body = await readBody<LoginRequestBody>(event);

    if (!body.email || typeof body.email !== "string") {
      throw createError({
        statusCode: 400,
        statusMessage: "Email is required",
      });
    }

    const email = body.email.trim().toLowerCase();

    // --------------------------------------------------
    // 2. Basic email validation
    // --------------------------------------------------
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      throw createError({
        statusCode: 400,
        statusMessage: "Please enter a valid email address",
      });
    }

    // --------------------------------------------------
    // 3. Find existing player
    // --------------------------------------------------
    let player = await prisma.player.findUnique({
      where: {
        email,
      },
    });

    // --------------------------------------------------
    // 4. Create player if they don't exist
    // --------------------------------------------------
    if (!player) {
      player = await prisma.player.create({
        data: {
          user_id: nanoid(),
          email,
          username: `user-${nanoid(6)}`,
        },
      });

      console.log(`Created new player: ${player.username}`);
    }

    // --------------------------------------------------
    // 5. Generate one-time magic login token
    // --------------------------------------------------
    const token = nanoid(32);

    // Magic link is valid for 10 minutes
    const tokenExpiry = new Date(
      Date.now() + 10 * 60 * 1000,
    );

    // --------------------------------------------------
    // 6. Store token on player
    // --------------------------------------------------
    await prisma.player.update({
      where: {
        email,
      },

      data: {
        magicToken: token,
        tokenExpiry,
      },
    });

    // --------------------------------------------------
    // 7. Generate login link
    // --------------------------------------------------

    const requestUrl = getRequestURL(event);

    const loginLink =
      `${requestUrl.origin}/login?token=${encodeURIComponent(token)}`;

    // --------------------------------------------------
    // 8. TEMPORARY: Print magic link to terminal
    // --------------------------------------------------

    console.log("");
    console.log("=============== MAGIC LOGIN LINK ===============");
    console.log(`Email:   ${email}`);
    console.log(`Player:  ${player.username}`);
    console.log(`Expires: ${tokenExpiry.toISOString()}`);
    console.log(`Link:    ${loginLink}`);
    console.log("================================================");
    console.log("");

    /*
     * Eventually this is where an email provider
     * such as Resend, SendGrid, AWS SES, etc. would
     * send loginLink to the player's email.
     */

    // --------------------------------------------------
    // 9. Return success to frontend
    // --------------------------------------------------
    return {
      success: true,
      message: "Magic login link has been sent.",
    };
  } catch (error: any) {
    // Preserve errors intentionally created above
    if (error?.statusCode) {
      throw error;
    }

    console.error("Login request failed:", error);

    throw createError({
      statusCode: 500,
      statusMessage: "Unable to create login request",
    });
  }
});