<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useStore } from "../store/store";
import { inputEmail } from "../api/api";
const router = useRouter();
const store = useStore();
const email = ref("");

const subscribe = async () => {
  if (email.value) {
    localStorage.setItem("subscribed", "true");
    await inputEmail(email.value, store.currentLeagueId, store.username);
    email.value = "";
    store.updateShowEmailAlert(true);
    setTimeout(() => {
      store.updateShowEmailAlert(false);
    }, 3000);
  }
};
</script>
<template>
  <div class="container w-11/12 h-auto max-w-screen-xl pb-20 mx-auto">
    <div class="container mx-auto mt-4">
      <section>
        <div class="px-4 py-8">
          <h2
            class="mb-4 text-4xl font-semibold tracking-tight text-gray-900 dark:text-white"
          >
            Join our Newsletter
          </h2>
          <p
            class="max-w-xl mb-8 text-lg font-light text-gray-600 text-balance lg:mb-12 dark:text-gray-400 sm:text-xl"
          >
            Stay up to date with new features, announcements, and weekly fantasy
            football insights.
          </p>
          <form @submit.prevent="subscribe" class="mt-4">
            <div class="flex items-center max-w-xl">
              <div class="relative flex-grow">
                <input
                  v-model="email"
                  type="email"
                  placeholder="Your email"
                  class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-gray-50 dark:focus:ring-blue-500 dark:focus:border-blue-500"
                  required
                />
              </div>
              <button
                type="submit"
                class="px-4 py-2.5 ml-2 text-gray-50 text-sm bg-blue-700 rounded-lg hover:bg-blue-800 focus:ring-2 focus:ring-blue-300 focus:outline-none dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
              >
                Subscribe
              </button>
            </div>
          </form>
          <button
            aria-label="Button to go back one page"
            @click="router.back()"
            class="text-gray-50 bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm w-full sm:w-auto px-3 sm:px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 mt-4"
          >
            Back
          </button>
        </div>
      </section>
    </div>
  </div>
</template>
