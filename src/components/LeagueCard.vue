<script setup lang="ts">
import { capitalize } from "lodash";
import { useStore } from "../store/store";
import { initFlowbite } from "flowbite";
import { onMounted } from "vue";

onMounted(() => {
  initFlowbite();
});
const props = defineProps<{
  leagueInfo: any;
}>();
const store = useStore();

const removeLeague = () => {
  if (localStorage.leagueId) {
    localStorage.removeItem("leagueId");
    store.updateLeagueId("");
    store.updateRemovedAlert(true);
    setTimeout(() => {
      store.updateRemovedAlert(false);
    }, 3000);
  }
};
</script>
<template>
  <div
    class="block max-w-xs my-4 px-4 py-3 bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700"
  >
    <div class="flex justify-between">
      <h5
        class="mb-1 text-xl font-semibold tracking-tight text-gray-900 dark:text-white"
      >
        {{ props.leagueInfo.name }}
      </h5>
      <div>
        <button
          id="dropdownMenuIconButton"
          data-dropdown-toggle="dropdownDots"
          class="mb-1 inline-flex items-center p-2 text-xs font-medium text-center text-gray-900 bg-white rounded-lg hover:bg-gray-100 focus:ring-2 focus:outline-none dark:text-white focus:ring-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 dark:focus:ring-gray-600"
          type="button"
        >
          <svg
            class="w-4 h-4"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="currentColor"
            viewBox="0 0 4 15"
          >
            <path
              d="M3.5 1.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm0 6.041a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm0 5.959a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z"
            />
          </svg>
        </button>
        <div
          id="dropdownDots"
          class="z-10 hidden bg-white divide-y divide-gray-100 rounded-lg shadow w-32 dark:bg-gray-700 dark:divide-gray-600"
        >
          <ul
            class="py-2 text-sm text-gray-700 dark:text-gray-200"
            aria-labelledby="dropdownMenuIconButton"
          >
            <li class="cursor-pointer">
              <a
                class="block px-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white"
                >Refresh</a
              >
            </li>
            <li class="cursor-pointer">
              <a
                @click="removeLeague()"
                class="block px-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white"
                >Remove</a
              >
            </li>
          </ul>
        </div>
      </div>
    </div>
    <div class="w-full border-b border-slate-200 dark:border-slate-600"></div>
    <p class="font-normal text-gray-700 dark:text-gray-400 mt-1.5">
      {{
        props.leagueInfo.season +
        ": " +
        capitalize(props.leagueInfo.seasonType) +
        " " +
        props.leagueInfo.rosters +
        " man"
      }}
    </p>
  </div>
</template>
