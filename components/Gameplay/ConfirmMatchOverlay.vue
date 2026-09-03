<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
  >
    <div
      class="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 text-white shadow-2xl"
    >
      <div class="text-center">
        <h2 class="text-2xl font-bold">
          Match Found
        </h2>

        <p class="mt-2 text-sm text-white/70">
          Your match is ready. Do you want to play?
        </p>
      </div>

      <div class="mt-6 grid grid-cols-2 gap-3">
        <button
          type="button"
          class="rounded-xl border border-white/10 bg-white/10 px-4 py-3 font-semibold transition hover:bg-white/20"
          @click="respond(false)"
        >
          Decline
        </button>

        <button
          type="button"
          class="rounded-xl bg-green-500 px-4 py-3 font-semibold text-black transition hover:bg-green-400"
          @click="respond(true)"
        >
          Accept
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  (
    event: "confirm-response",
    accepted: boolean,
  ): void;
}>();

const respond = (
  accepted: boolean,
) => {
  emit(
    "confirm-response",
    accepted,
  );
};
</script>