<template>
  <div class="flex min-h-screen flex-col bg-[#154734] text-white">
    <!-- Navigation -->
    <nav
      class="relative flex h-20 items-center border-b border-white/10 bg-[#f96c00] px-5 shadow-lg sm:h-24 sm:px-8"
    >
      <NuxtLink
        to="/"
        aria-label="Soccer Robots home"
        class="flex shrink-0 items-center"
      >
        <img
          src="/UTDLogo.svg"
          alt="UTD Logo"
          class="h-12 w-auto object-contain sm:h-16"
        />
      </NuxtLink>

      <span
        class="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-xl font-black tracking-tight sm:text-3xl lg:text-4xl"
      >
        Soccer Robots
      </span>
    </nav>

    <!-- Landing content -->
    <main
      class="relative flex flex-1 items-center justify-center overflow-hidden px-5 py-16 sm:px-8"
    >
      <!-- Decorative background -->
      <div
        class="pointer-events-none absolute -left-32 top-16 h-72 w-72 rounded-full bg-[#f96c00]/10 blur-3xl"
      />

      <div
        class="pointer-events-none absolute -right-32 bottom-12 h-80 w-80 rounded-full bg-white/5 blur-3xl"
      />

      <section class="relative z-10 mx-auto w-full max-w-5xl text-center">
        <p
          class="mb-4 text-sm font-bold uppercase tracking-[0.3em] text-orange-300"
        >
          Robot Soccer Experience
        </p>

        <h1
          class="text-4xl font-black tracking-tight sm:text-5xl lg:text-7xl"
        >
          Welcome to
          <span class="text-[#f96c00]">Soccer Robots</span>
        </h1>

        <p
          class="mx-auto mt-6 max-w-2xl text-base leading-7 text-white/75 sm:text-lg"
        >
          Watch the action as a guest or sign in as a player to take control of
          your robot.
        </p>

        <div class="mt-12">
          <h2 class="text-2xl font-bold sm:text-3xl">
            Choose your role
          </h2>

          <p class="mt-2 text-white/65">
            How would you like to join the game?
          </p>
        </div>

        <!-- Role options -->
        <div class="mx-auto mt-8 grid max-w-3xl gap-6 md:grid-cols-2">
          <!-- Guest -->
          <div
            class="group flex flex-col rounded-2xl border border-white/15 bg-white/10 p-7 text-left shadow-xl backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-white/30 hover:bg-white/15"
          >
            <div
              class="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15"
            >
              <svg
                class="h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </div>

            <h3 class="mt-5 text-2xl font-bold">
              Guest
            </h3>

            <p class="mt-2 flex-1 text-sm leading-6 text-white/65">
              Join as a spectator and watch the robots compete.
            </p>

            <NuxtLink
              to="/game"
              class="mt-7 inline-flex w-full items-center justify-center rounded-xl border border-white/25 bg-white/10 px-6 py-3.5 text-base font-bold transition duration-200 hover:bg-white hover:text-[#154734] focus:outline-none focus:ring-4 focus:ring-white/30"
            >
              Continue as Guest
            </NuxtLink>
          </div>

          <!-- Player -->
          <div
            class="group flex flex-col rounded-2xl border border-[#f96c00]/60 bg-[#f96c00]/10 p-7 text-left shadow-xl backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-[#f96c00] hover:bg-[#f96c00]/15"
          >
            <div
              class="flex h-12 w-12 items-center justify-center rounded-xl bg-[#f96c00]"
            >
              <svg
                class="h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422A12.083 12.083 0 0118.5 16c0 1.105-.895 2-2 2h-9a2 2 0 01-2-2c0-1.893.438-3.683 1.216-5.278L12 14z"
                />
              </svg>
            </div>

            <h3 class="mt-5 text-2xl font-bold">
              Player
            </h3>

            <p class="mt-2 flex-1 text-sm leading-6 text-white/65">
              Sign in, join the queue, and control a robot during a match.
            </p>

            <NuxtLink
              v-if="isLoggedIn"
              to="/game"
              class="mt-7 inline-flex w-full items-center justify-center rounded-xl bg-[#f96c00] px-6 py-3.5 text-base font-bold shadow-lg shadow-black/20 transition duration-200 hover:bg-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-300/40"
            >
              Continue as Player
            </NuxtLink>

            <button
              v-else
              type="button"
              :disabled="isRequestingLogin"
              class="mt-7 inline-flex w-full items-center justify-center rounded-xl bg-[#f96c00] px-6 py-3.5 text-base font-bold shadow-lg shadow-black/20 transition duration-200 hover:bg-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-300/40 disabled:cursor-not-allowed disabled:opacity-60"
              @click="goToLogin"
            >
              {{ isRequestingLogin ? "Sending login link..." : "Sign In as Player" }}
            </button>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
const sruser = useCookie<string | null>("sruser");

const isLoggedIn = computed(() => Boolean(sruser.value));
const isRequestingLogin = ref(false);

const goToLogin = async () => {
  const email = prompt("Please enter your email address:");

  if (!email?.trim()) {
    alert("Email is required to log in.");
    return;
  }

  isRequestingLogin.value = true;

  try {
    await $fetch("/api/login-request", {
      method: "POST",
      body: {
        email: email.trim(),
        redirectTo: "/game",
      },
    });

    alert("Login link sent! Please check your email.");
  } catch (error) {
    console.error("Error requesting login link:", error);
    alert("Failed to send login link. Please try again later.");
  } finally {
    isRequestingLogin.value = false;
  }
};
</script>
