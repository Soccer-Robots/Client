<template>
  <div class="flex min-h-screen items-center justify-center bg-[#154734] text-white">
    <div class="text-center">
      <h2
        v-if="status === 'loading'"
        class="text-2xl font-bold"
      >
        Logging you in...
      </h2>

      <h2
        v-else-if="status === 'success'"
        class="text-2xl font-bold"
      >
        Login successful!
      </h2>

      <div v-else>
        <h2 class="text-2xl font-bold text-red-300">
          Invalid or expired login link.
        </h2>

        <NuxtLink
          to="/"
          class="mt-5 inline-block rounded-lg bg-[#f96c00] px-5 py-3 font-bold"
        >
          Return Home
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
type LoginStatus = "loading" | "success" | "error";

const route = useRoute();

const status = ref<LoginStatus>("loading");

onMounted(async () => {
  const token = route.query.token;

  if (typeof token !== "string" || !token) {
    status.value = "error";
    return;
  }

  try {
    await $fetch("/api/login", {
      method: "GET",
      query: {
        token,
      },
    });

    status.value = "success";

    // Full reload intentionally:
    // server middleware validates srtoken on the new request.
    window.location.replace("/");
  } catch (error) {
    console.error("Login failed:", error);

    status.value = "error";
  }
});
</script>