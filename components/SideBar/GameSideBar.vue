<template>
  <aside class="min-w-0 space-y-5">
    <!-- Queue -->
    <section
      class="rounded-2xl border border-white/10 bg-white/10 p-4 shadow-xl backdrop-blur-sm"
    >
      <div class="mb-4">
        <p
          class="text-xs font-bold uppercase tracking-[0.2em] text-orange-300"
        >
          Queue
        </p>

        <h2 class="mt-1 text-xl font-black">
          Match Queue
        </h2>
      </div>

      <QueueContainer
        v-if="isLoggedIn"
        :queue-users="queue"
        :theme="theme"
        @join-queue="emit('join-queue')"
        @leave-queue="emit('leave-queue')"
      />

      <div
        v-else
        class="rounded-xl border border-white/10 bg-black/20 p-4"
      >
        <p class="text-sm leading-6 text-white/70">
          Log in to join the match queue.
        </p>

        <button
          type="button"
          class="mt-4 w-full rounded-xl bg-[#f96c00] px-4 py-3 font-bold transition hover:bg-orange-500"
          @click="emit('login')"
        >
          Player Login
        </button>
      </div>
    </section>

    <!-- Leaderboard -->
    <section
      class="rounded-2xl border border-white/10 bg-white/10 p-4 shadow-xl backdrop-blur-sm"
    >
      <div class="mb-4">
        <p
          class="text-xs font-bold uppercase tracking-[0.2em] text-orange-300"
        >
          Rankings
        </p>

        <h2 class="mt-1 text-xl font-black">
          Leaderboard
        </h2>
      </div>

      <LeaderBoardHomepage />
    </section>

    <!-- Future Chat -->
    <section
      class="rounded-2xl border border-dashed border-white/15 bg-white/5 p-4"
    >
      <p
        class="text-xs font-bold uppercase tracking-[0.2em] text-white/40"
      >
        Coming Later
      </p>

      <h2 class="mt-1 text-xl font-black text-white/70">
        Chat
      </h2>

      <p class="mt-2 text-sm leading-6 text-white/45">
        Reserved for match chat or spectator messages.
      </p>
    </section>
  </aside>
</template>

<script setup lang="ts">
defineProps<{
  queue: string[];
  theme: "light" | "dark";
  isLoggedIn: boolean;
}>();

const emit = defineEmits<{
  (event: "join-queue"): void;
  (event: "leave-queue"): void;
  (event: "login"): void;
}>();
</script>