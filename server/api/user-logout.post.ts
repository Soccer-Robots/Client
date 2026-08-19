import { PrismaClient } from '@prisma/client'
import { defineEventHandler, getCookie, setCookie, sendRedirect } from 'h3'

const prisma = new PrismaClient()


export default defineEventHandler(async (event) => {
  const sessionToken = getCookie(event, 'srtoken')
  console.log("Logout API called")
  console.log("sessionToken:", sessionToken)
  if (sessionToken) {
    try {
      await prisma.player.update({ // or use `update` if token is unique
        where: { sessionToken },
        data: { sessionToken: null }
      })
    } catch (err) {
      console.error("Failed to revoke session:", err);
    }
  }

  deleteCookie(event, "srtoken", { path: '/' });
  deleteCookie(event, "sruser", { path: '/' });
  deleteCookie(event, "magic_token", { path: '/' });
  deleteCookie(event, "accesspassword", { path: '/' });


  return {
    success: true,
  };
})
