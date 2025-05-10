<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useStore } from "../../store/store";
import { inputEmail } from "../../api/api";
const store = useStore();
const isVisible = ref(false);
const email = ref("");

const closePopup = () => {
  localStorage.setItem("subscribed", "removed");
  isVisible.value = false;
};

const subscribe = async () => {
  if (email.value) {
    isVisible.value = false;
    localStorage.setItem("subscribed", "true");
    await inputEmail(email.value, store.currentLeagueId, store.username);
    email.value = "";
    store.updateShowEmailAlert(true);
    setTimeout(() => {
      store.updateShowEmailAlert(false);
    }, 3000);
  }
};

onMounted(() => {
  const subscribed = localStorage.getItem("subscribed");
  if (!subscribed) {
    setTimeout(() => {
      isVisible.value = true;
    }, 5000);
  }
});
</script>

<template>
  <div
    v-if="isVisible"
    class="fixed hidden p-4 bg-white border border-gray-200 rounded-lg shadow-lg bottom-4 right-4 w-80 sm:block"
  >
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-semibold text-gray-800">Join our Newsletter</h2>
      <button
        @click="closePopup"
        class="text-gray-400 hover:text-gray-600 focus:outline-none"
        aria-label="Close"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          class="w-5 h-5"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
    <p class="mt-2 text-sm text-gray-600 dark:text-gray-300 text-pretty">
      Stay up to date with new features, announcements and weekly fantasy
      football insights.
    </p>
    <form @submit.prevent="subscribe" class="mt-4">
      <div class="flex items-center">
        <div class="relative flex-grow">
          <input
            v-model="email"
            type="email"
            placeholder="Your email"
            class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            required
          />
        </div>
        <button
          type="submit"
          class="px-4 py-2.5 ml-2 text-white text-sm bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
          Subscribe
        </button>
      </div>
    </form>
  </div>
</template>
