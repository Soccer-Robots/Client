<template>
  <div
    class="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
    @click.self="close"
  >
    <div
      class="w-full max-w-md rounded-2xl border border-white/10 bg-[#154734] text-white shadow-2xl"
    >
      <!-- Header -->
      <div
        class="flex items-center justify-between border-b border-white/10 px-6 py-5"
      >
        <div>
          <p
            class="text-xs font-bold uppercase tracking-[0.2em] text-orange-300"
          >
            Player Access
          </p>

          <h2 class="mt-1 text-2xl font-black">
            Log In
          </h2>
        </div>

        <button
          type="button"
          aria-label="Close login"
          class="flex h-10 w-10 items-center justify-center rounded-lg text-2xl transition hover:bg-white/10 disabled:opacity-50"
          :disabled="isSubmitting"
          @click="close"
        >
          ×
        </button>
      </div>

      <!-- Email form -->
      <form
        v-if="!success"
        class="p-6"
        @submit.prevent="submit"
      >
        <p class="text-sm leading-6 text-white/70">
          Enter your email address and we'll send you a one-time magic link to
          log in.
        </p>

        <div class="mt-6">
          <label
            for="login-email"
            class="mb-2 block text-sm font-bold"
          >
            Email address
          </label>

          <input
            id="login-email"
            v-model="email"
            type="email"
            autocomplete="email"
            placeholder="player@example.com"
            :disabled="isSubmitting"
            class="w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 disabled:opacity-60"
          />
        </div>

        <p
          v-if="validationError"
          class="mt-3 text-sm font-semibold text-red-300"
        >
          {{ validationError }}
        </p>

        <p
          v-else-if="errorMessage"
          class="mt-3 text-sm font-semibold text-red-300"
        >
          {{ errorMessage }}
        </p>

        <button
          type="submit"
          :disabled="isSubmitting"
          class="mt-6 w-full rounded-xl bg-[#f96c00] px-5 py-3 font-bold transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {{
            isSubmitting
              ? "Sending login link..."
              : "Send Magic Link"
          }}
        </button>

        <p class="mt-4 text-center text-xs leading-5 text-white/45">
          No password required. Your login link expires after 10 minutes.
        </p>
      </form>

      <!-- Success state -->
      <div
        v-else
        class="p-6 text-center"
      >
        <div
          class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-400/20 text-2xl font-black text-emerald-200"
        >
          ✓
        </div>

        <h3 class="mt-5 text-xl font-black">
          Check your email
        </h3>

        <p class="mt-3 text-sm leading-6 text-white/70">
          We sent a login link to
          <span class="font-bold text-white">
            {{ email }}
          </span>.
        </p>

        <button
          type="button"
          class="mt-6 w-full rounded-xl border border-white/15 px-5 py-3 font-bold transition hover:bg-white/10"
          @click="close"
        >
          Close
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

const props = withDefaults(
  defineProps<{
    isSubmitting?: boolean;
    success?: boolean;
    errorMessage?: string;
  }>(),
  {
    isSubmitting: false,
    success: false,
    errorMessage: "",
  },
);

const emit = defineEmits<{
  (event: "close"): void;
  (event: "submit", email: string): void;
}>();

const email = ref("");
const validationError = ref("");

const submit = () => {
  const normalizedEmail = email.value
    .trim()
    .toLowerCase();

  if (!normalizedEmail) {
    validationError.value =
      "Email is required.";

    return;
  }

  const emailRegex =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(normalizedEmail)) {
    validationError.value =
      "Please enter a valid email address.";

    return;
  }

  validationError.value = "";

  emit("submit", normalizedEmail);
};

const close = () => {
  if (props.isSubmitting) {
    return;
  }

  emit("close");
};
</script>