<template>
  <section
    class="overflow-hidden rounded-2xl border border-white/10 bg-white/10 shadow-xl backdrop-blur-sm"
  >
    <div class="grid grid-cols-[1fr_auto_1fr] items-stretch">
      <!-- Orange Team -->
      <div
        class="flex min-w-0 items-center justify-between gap-4 border-r border-white/10 px-5 py-4 sm:px-8"
      >
        <div class="min-w-0">
          <p
            class="text-xs font-bold uppercase tracking-[0.2em] text-orange-300"
          >
            Orange
          </p>

          <h2
            class="mt-1 truncate text-lg font-black sm:text-2xl"
          >
            {{ orangeTeamName }}
          </h2>
        </div>

        <div
          class="flex h-16 min-w-16 items-center justify-center rounded-xl bg-[#E87500] px-4 text-4xl font-black text-white sm:h-20 sm:min-w-20 sm:text-5xl"
        >
          {{ orangeScore }}
        </div>
      </div>

      <!-- Timer -->
      <div
        class="flex min-w-[105px] flex-col items-center justify-center bg-black/20 px-4 py-3 sm:min-w-[140px]"
      >
        <p
          class="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50 sm:text-xs"
        >
          Time
        </p>

        <p
          class="mt-1 font-mono text-2xl font-black tabular-nums sm:text-3xl"
        >
          {{ formattedTime }}
        </p>
      </div>

      <!-- Green Team -->
      <div
        class="flex min-w-0 items-center justify-between gap-4 border-l border-white/10 px-5 py-4 sm:px-8"
      >
        <div
          class="flex h-16 min-w-16 items-center justify-center rounded-xl bg-[#5FE0B7] px-4 text-4xl font-black text-[#154734] sm:h-20 sm:min-w-20 sm:text-5xl"
        >
          {{ greenScore }}
        </div>

        <div class="min-w-0 text-right">
          <p
            class="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300"
          >
            Green
          </p>

          <h2
            class="mt-1 truncate text-lg font-black sm:text-2xl"
          >
            {{ greenTeamName }}
          </h2>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    orangeScore?: number;
    greenScore?: number;
    timeRemaining?: number;
    orangeTeamName?: string;
    greenTeamName?: string;
  }>(),
  {
    orangeScore: 0,
    greenScore: 0,
    timeRemaining: 0,
    orangeTeamName: "Orange Team",
    greenTeamName: "Green Team",
  },
);

const formattedTime = computed(() => {
  const totalSeconds = Math.max(
    0,
    Math.floor(props.timeRemaining),
  );

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes
    .toString()
    .padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
});
</script>