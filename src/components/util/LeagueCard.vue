<script setup lang="ts">
import { capitalize } from "lodash";
import { useStore } from "../../store/store";
import { onMounted } from "vue";
import { initFlowbite } from "flowbite";
import { getData, inputLeague } from "../../api/api";
import { LeagueInfoType } from "../../api/types";
import { useRouter } from "vue-router";

const router = useRouter();
onMounted(() => {
  initFlowbite();
});

const props = defineProps<{
  leagueInfo: LeagueInfoType;
  dropdownIndex: number;
}>();
const store = useStore();

const selectLeague = () => {
  store.updateCurrentLeagueId(props.leagueInfo.leagueId);
};

const refreshLeague = async () => {
  selectLeague();
  store.$patch((state) => {
    state.leagueInfo = state.leagueInfo.filter(
      (item: any) => item.leagueId !== props.leagueInfo.leagueId
    );
  });
  store.updateLoadingLeague(props.leagueInfo.name);
  store.updateLeagueInfo(await getData(props.leagueInfo.leagueId));
  if (localStorage.originalData) {
    const currentData = JSON.parse(localStorage.originalData);
    delete currentData[props.leagueInfo.leagueId];
    localStorage.originalData = JSON.stringify(currentData);
  }
  store.showRefreshAlert = true;
  store.updateLoadingLeague("");
  setTimeout(() => {
    store.showRefreshAlert = false;
  }, 3000);
  await inputLeague(
    props.leagueInfo.leagueId,
    props.leagueInfo.name,
    props.leagueInfo.totalRosters,
    props.leagueInfo.seasonType,
    props.leagueInfo.season
  );
};

const removeLeague = () => {
  if (localStorage.leagueInfo) {
    if (props.leagueInfo.previousLeagues) {
      props.leagueInfo.previousLeagues.forEach((league: LeagueInfoType) => {
        localStorage.removeItem(league.leagueId);
      });
    }
    store.$patch((state) => {
      state.leagueInfo = state.leagueInfo.filter(
        (item: any) => item.leagueId !== props.leagueInfo.leagueId
      );
    });
    store.updateCurrentLeagueId(store.leagueIds[0] || "");
    store.updateRemovedAlert(true);
    if (store.currentLeagueId === "") {
      localStorage.removeItem("currentTab");
      store.currentTab = "standings";
      // reset url if there are no leagues
      router.replace({
        path: "/",
        query: {},
      });
      // sometimes the league id in the url persists
      const baseUrl = window.location.origin + window.location.pathname;
      window.history.pushState({}, "", baseUrl);
    }
    if (localStorage.originalData) {
      const currentData = JSON.parse(localStorage.originalData);
      delete currentData[props.leagueInfo.leagueId];
      if (Object.keys(currentData).length == 0) {
        localStorage.removeItem("originalData");
      } else {
        localStorage.originalData = JSON.stringify(currentData);
      }
    }
    setTimeout(() => {
      store.updateRemovedAlert(false);
    }, 3000);
  }
};

const shareLeague = () => {
  const currentUrl =
    window.location.protocol +
    "//" +
    window.location.host +
    window.location.pathname;
  const updatedURL = `${currentUrl}?leagueId=${props.leagueInfo.leagueId}`;
  navigator.clipboard.writeText(updatedURL);
  store.showCopiedAlert = true;
  setTimeout(() => {
    store.showCopiedAlert = false;
  }, 3000);
};
</script>
<template>
  <div
    @click.self="selectLeague()"
    :class="
      props.leagueInfo.leagueId === store.currentLeagueId
        ? 'border-b-4 border-b-blue-700 dark:border-b-blue-600'
        : 'border-b-2'
    "
    class="block px-4 py-3 mt-4 mr-4 bg-white border border-gray-200 rounded-lg shadow cursor-pointer card-width w-80 hover:bg-gray-100 dark:hover:bg-gray-700 min-w-60 dark:bg-gray-800 dark:border-gray-700"
  >
    <div @click.self="selectLeague()" class="flex justify-between">
      <h5
        @click.self="selectLeague()"
        class="mb-1 text-xl font-semibold tracking-tight text-gray-900 truncate dark:text-white"
      >
        {{ props.leagueInfo.name }}
      </h5>
      <div>
        <button
          :aria-label="'Button to open dropdown menu' + props.dropdownIndex"
          id="dropdownMenuIconButton"
          :data-dropdown-toggle="props.dropdownIndex.toString()"
          class="inline-flex items-center p-2 mb-1 text-xs font-medium text-center text-gray-900 bg-white rounded-lg hover:bg-gray-200 focus:ring-2 focus:outline-none dark:text-white focus:ring-gray-100 dark:bg-gray-800 dark:hover:bg-gray-600 dark:focus:ring-gray-500"
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
          :id="props.dropdownIndex.toString()"
          class="z-10 hidden w-32 bg-white divide-y divide-gray-100 rounded-lg shadow dark:bg-gray-700 dark:divide-gray-600"
        >
          <ul
            class="py-2 text-sm text-gray-700 dark:text-gray-200"
            aria-labelledby="dropdownMenuIconButton"
          >
            <li class="cursor-pointer">
              <button
                aria-label="Refresh league data from API"
                @click="refreshLeague()"
                class="block w-full px-2 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white"
              >
                Refresh
              </button>
            </li>
            <li class="cursor-pointer">
              <button
                aria-label="Remove league from dashboard"
                @click="removeLeague()"
                class="block w-full px-2 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white"
              >
                Remove
              </button>
            </li>
            <li class="cursor-pointer">
              <button
                aria-label="Remove league from dashboard"
                @click="shareLeague()"
                class="block w-full px-2 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white"
              >
                Share
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
    <div
      @click.self="selectLeague()"
      class="w-full border-b border-slate-200 dark:border-slate-600"
    ></div>
    <p
      @click.self="selectLeague()"
      class="font-normal text-gray-700 dark:text-gray-300 mt-1.5"
    >
      {{
        props.leagueInfo.season +
        ": " +
        capitalize(props.leagueInfo.seasonType) +
        " " +
        props.leagueInfo.totalRosters +
        "-team"
      }}
    </p>
  </div>
</template>
<style scoped>
.card-width {
  width: 19.4rem;
}
</style>
