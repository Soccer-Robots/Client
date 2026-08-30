<template>
  <nav
    class=" top-0 z-40 border-b border-white/10 bg-[#f96c00] px-4 py-3 text-white shadow-lg sm:px-6"
  >
    <div
      class="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-4"
    >
      <!-- Logo / Home -->
      <NuxtLink
        to="/"
        aria-label="Soccer Robots home"
        class="flex items-center gap-3"
      >
        <img
          src="/UTDLogo.svg"
          alt="UTD Logo"
          class="h-12 w-auto object-contain sm:h-14"
        />

        <span class="text-xl font-black tracking-tight sm:text-3xl">
          Soccer Robots
        </span>
      </NuxtLink>

      <!-- Navigation actions -->
      <div class="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          class="rounded-lg px-3 py-2 text-sm font-semibold transition hover:bg-white/15"
          @click="emit('open-about')"
        >
          About
        </button>

        <button
          type="button"
          class="rounded-lg px-3 py-2 text-sm font-semibold transition hover:bg-white/15"
          @click="emit('open-how-to-play')"
        >
          How to Play
        </button>

        <button
          type="button"
          class="rounded-lg px-3 py-2 text-sm font-semibold transition hover:bg-white/15"
          @click="emit('open-help')"
        >
          Help
        </button>

        <button
          type="button"
          class="rounded-lg px-3 py-2 text-sm font-semibold transition hover:bg-white/15"
          @click="emit('open-leaderboard')"
        >
          Leaderboard
        </button>

        <!-- Admin only -->
        <button
          v-if="isAdmin"
          type="button"
          class="rounded-lg px-3 py-2 text-sm font-semibold transition hover:bg-white/15"
          @click="emit('open-admin')"
        >
          Admin
        </button>

        <!-- Logged-in users only -->
        <button
          v-if="isLoggedIn"
          type="button"
          class="rounded-lg px-3 py-2 text-sm font-semibold transition hover:bg-white/15"
          @click="emit('open-change-username')"
        >
          Change Username
        </button>

        <!-- Theme -->
        <button
          type="button"
          aria-label="Toggle color theme"
          class="rounded-lg border border-white/25 px-3 py-2 text-sm font-semibold transition hover:bg-white/15"
          @click="emit('toggle-theme')"
        >
          {{ theme === "dark" ? "☀️" : "🌙" }}
        </button>

        <!-- Guest -->
        <button
          v-if="!isLoggedIn"
          type="button"
          :disabled="isRequestingLogin"
          class="rounded-lg bg-white px-4 py-2 text-sm font-bold text-[#154734] transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
          @click="emit('login')"
        >
          {{ isRequestingLogin ? "Sending..." : "Player Login" }}
        </button>

        <!-- Logged-in user -->
        <div
          v-else
          class="flex items-center gap-2 rounded-xl bg-black/15 p-1"
        >
          <span class="hidden px-2 text-sm font-semibold sm:block">
            {{ playerName }}
          </span>

          <button
            type="button"
            :disabled="isLoggingOut"
            class="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            @click="emit('logout')"
          >
            {{ isLoggingOut ? "Logging out..." : "Log Out" }}
          </button>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
type Theme = "light" | "dark";

withDefaults(
  defineProps<{
    isLoggedIn: boolean;
    isAdmin: boolean;
    playerName?: string;
    theme: Theme;
    isRequestingLogin?: boolean;
    isLoggingOut?: boolean;
  }>(),
  {
    playerName: "",
    isRequestingLogin: false,
    isLoggingOut: false,
  },
);

const emit = defineEmits<{
  (event: "open-about"): void;
  (event: "open-how-to-play"): void;
  (event: "open-help"): void;
  (event: "open-leaderboard"): void;
  (event: "open-admin"): void;
  (event: "open-change-username"): void;
  (event: "toggle-theme"): void;
  (event: "login"): void;
  (event: "logout"): void;
}>();
</script>