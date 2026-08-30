<template>
  <section
    class="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-black/30 shadow-xl"
  >
    <div
      class="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4"
    >
      <div>
        <p
          class="text-xs font-bold uppercase tracking-[0.2em] text-orange-300"
        >
          Game View
        </p>

        <h2 class="mt-1 text-2xl font-black">
          Live Match
        </h2>

        <p class="mt-1 text-sm text-white/60">
          {{
            isInGame
              ? "You are currently playing."
              : "Watch the current match in real time."
          }}
        </p>
      </div>

      <span
        class="rounded-full bg-red-600/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-red-200"
      >
        Live
      </span>
    </div>

    <VideoStream
      class="!max-w-none !p-0"
      :stream-type="streamType"
    />
  </section>
</template>

<script setup lang="ts">
defineProps<{
  streamType: "twitch" | "janus";
  isInGame: boolean;
}>();
</script>