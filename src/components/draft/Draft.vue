<script setup lang="ts">
import { fakeDraftData } from "../../api/draft.ts";
import { ref, onMounted, computed, watch } from "vue";
import { getDraftPicks, getDraftMetadata } from "../../api/api";
import { LeagueInfoType } from "../../api/types.ts";
import { useStore } from "../../store/store";
import { fakeUsers } from "../../api/helper.ts";

const store = useStore();
const data: any = ref([]);
const loading = ref(false);
const draftOrder: any = ref([]);
const draftType = ref("snake");
const roundReversal = ref(0);
const sortOrder = ref("Draft Order");

const sortedData = computed(() => {
  if (sortOrder.value === "Draft Order") {
    return data.value;
  } else if (sortOrder.value === "Highest Score") {
    return [...data.value].sort((a: any, b: any) => b.pickRank - a.pickRank);
  }
  return [...data.value].sort((a: any, b: any) => a.pickRank - b.pickRank);
});

const getDraftOrder = async () => {
  const currentLeague = store.leagueInfo[store.currentLeagueIndex];
  const metadata: any = await getDraftMetadata(currentLeague.draftId);
  // sleeper api draft_order sometimes doesn't include all teams?
  // using slot_to_roster_id instead
  const draftOrderData = Object.values(metadata["slot_to_roster_id"]).filter(
    (item) => item != null
  );
  draftOrder.value = draftOrderData.map((rosterId) => {
    const rosterObj = currentLeague.rosters.find(
      (roster) => roster.rosterId === rosterId
    );
    if (rosterObj) return getTeamName(rosterObj.id);
  });

  roundReversal.value = metadata["settings"]["reversal_round"];
  draftType.value = metadata["type"];

  store.addDraftMetadata(currentLeague.leagueId, {
    order: draftOrder.value,
    roundReversal: roundReversal.value,
    draftType: draftType.value,
  });
  localStorage.setItem(
    "leagueInfo",
    JSON.stringify(store.leagueInfo as LeagueInfoType[])
  );
};

const draftSize = computed(() => {
  if (store.leagueInfo && store.leagueInfo[store.currentLeagueIndex]) {
    return store.leagueInfo[store.currentLeagueIndex].rosters.length;
  }
  return 10;
});

const teamRanks = computed(() => {
  return data.value.reduce((acc: any, pick: any) => {
    acc[pick.userId] = (acc[pick.userId] || 0) + parseFloat(pick.pickRank);
    return acc;
  }, {});
});

const snakeDraftFormat = computed(() => {
  if (
    store.leagueInfo[store.currentLeagueIndex] &&
    ((store.leagueInfo[store.currentLeagueIndex].seasonType === "Dynasty" &&
      draftType.value === "linear") ||
      draftType.value === "auction")
  ) {
    return false;
  }
  return true;
});

onMounted(async () => {
  if (
    store.leagueInfo.length > 0 &&
    store.leagueInfo[store.currentLeagueIndex] &&
    !store.leagueInfo[store.currentLeagueIndex].draftPicks
  ) {
    loading.value = true;
    await getDraftOrder();
    await getData();
    loading.value = false;
  } else if (store.leagueInfo[store.currentLeagueIndex]) {
    data.value = store.leagueInfo[store.currentLeagueIndex].draftPicks;
    draftOrder.value =
      store.leagueInfo[store.currentLeagueIndex].draftMetadata["order"];
    roundReversal.value =
      store.leagueInfo[store.currentLeagueIndex].draftMetadata["roundReversal"];
    draftType.value =
      store.leagueInfo[store.currentLeagueIndex].draftMetadata["draftType"];
  } else if (store.leagueInfo.length == 0) {
    data.value = fakeDraftData;
    draftOrder.value = data.value.slice(0, draftSize.value).map((pick: any) => {
      return getTeamName(pick.userId);
    });
  }
});

watch(
  () => store.currentLeagueId,
  async () => {
    if (
      store.leagueInfo[store.currentLeagueIndex] &&
      !store.leagueInfo[store.currentLeagueIndex].draftPicks
    ) {
      data.value = [];
      draftOrder.value = [];
      loading.value = true;
      await getDraftOrder();
      await getData();
      loading.value = false;
    }
    data.value = store.leagueInfo[store.currentLeagueIndex].draftPicks;
    draftOrder.value =
      store.leagueInfo[store.currentLeagueIndex].draftMetadata["order"];
    roundReversal.value =
      store.leagueInfo[store.currentLeagueIndex].draftMetadata["roundReversal"];
    draftType.value =
      store.leagueInfo[store.currentLeagueIndex].draftMetadata["draftType"];
  }
);

const getData = async () => {
  const currentLeague = store.leagueInfo[store.currentLeagueIndex];
  const draftPicks = await getDraftPicks(
    currentLeague.draftId,
    currentLeague.season,
    currentLeague.scoringType,
    currentLeague.seasonType
  );
  if (draftType.value === "snake") {
    const roundGroups = draftPicks.reduce((acc: any, pick: any) => {
      if (!acc[pick.round]) {
        acc[pick.round] = [];
      }
      acc[pick.round].push(pick);
      return acc;
    }, {});

    data.value = Object.entries(roundGroups)
      .map(([round, picks]: [any, any]) => {
        const roundNum = parseInt(round);
        if (roundReversal.value === 3) {
          // For round 1: never reverse
          // For rounds 2-3: reverse on even rounds
          // For rounds 4+: reverse on odd rounds
          if (roundNum === 1) {
            return picks;
          } else if (roundNum <= 2) {
            return roundNum % 2 === 0 ? [...picks].reverse() : picks;
          } else {
            return roundNum % 2 === 1 ? [...picks].reverse() : picks;
          }
        } else {
          // Regular snake: reverse every even round
          return roundNum % 2 === 0 ? [...picks].reverse() : picks;
        }
      })
      .flat();
  } else {
    data.value = draftPicks;
  }

  store.addDraftPicks(currentLeague.leagueId, data.value);
  localStorage.setItem(
    "leagueInfo",
    JSON.stringify(store.leagueInfo as LeagueInfoType[])
  );
};

const getTeamName = (userId: string) => {
  if (store.leagueInfo[store.currentLeagueIndex]) {
    const userObject = store.leagueInfo[store.currentLeagueIndex].users.find(
      (user) => user.id === userId
    );
    if (userObject) {
      return userObject;
    }
  } else {
    const userObject = fakeUsers.find((user) => user.id === userId);
    if (userObject) {
      return userObject;
    }
  }
};

const getBgColor = (position: string) => {
  if (position === "RB") {
    return "bg-sky-300 dark:bg-sky-800";
  } else if (position === "WR") {
    return "bg-green-300 dark:bg-green-800";
  } else if (position === "QB") {
    return "bg-fuchsia-300 dark:bg-fuchsia-800";
  } else if (position === "TE") {
    return "bg-red-300 dark:bg-red-800";
  } else if (position === "K") {
    return "bg-amber-300 dark:bg-amber-800";
  } else if (position === "DEF") {
    return "bg-rose-300 dark:bg-rose-800";
  } else {
    return "bg-neutral-300 dark:bg-neutral-700";
  }
};

const getRoundPick = (draftSlot: number, round: number) => {
  if (roundReversal.value === 3) {
    if (round <= 2) {
      return round % 2 === 0
        ? Math.abs(draftSlot - draftSize.value) + 1
        : draftSlot;
    } else {
      return round % 2 === 1
        ? Math.abs(draftSlot - draftSize.value) + 1
        : draftSlot;
    }
  } else {
    if (round % 2 == 0) {
      return Math.abs(draftSlot - draftSize.value) + 1;
    } else return draftSlot;
  }
};

const getValueColor = (value: number) => {
  if (value >= 2.5) return `bg-emerald-600 dark:bg-emerald-500 bg-opacity-80`;
  if (value >= 1.75) return `bg-emerald-500 dark:bg-emerald-600 bg-opacity-80`;
  if (value >= 0.75) return `bg-emerald-400 dark:bg-emerald-700 bg-opacity-100`;
  if (value >= 0) return "bg-gray-400 bg-opacity-65";
  if (value >= -1.75) return `bg-rose-300 dark:bg-rose-800`;
  if (value >= -2.5) return `bg-rose-400 dark:bg-rose-700`;
  return `bg-rose-500 dark:bg-rose-600`;
};
</script>
<template>
  <div
    class="w-full p-4 overflow-x-auto bg-white rounded-lg shadow dark:bg-gray-800 md:p-6"
  >
    <h5
      class="mb-2 -mt-1.5 text-2xl font-bold text-gray-900 sm:text-3xl dark:text-white"
    >
      Draft Recap
    </h5>
    <p
      class="max-w-3xl mb-2 text-sm text-gray-600 sm:text-base dark:text-gray-300"
    >
      Draft pick scores are calculated based on each player's current positional
      rank compared to where they were drafted. The sum of these scores is
      listed by each manager's name.
    </p>
    <form class="max-w-sm mb-4">
      <label
        for="Sort order"
        class="block text-sm mb-0.5 text-gray-600 dark:text-gray-300"
        >Sort Picks</label
      >
      <select
        id="sort order"
        v-model="sortOrder"
        class="bg-gray-50 border border-gray-300 text-gray-600 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-gray-300 dark:focus:ring-blue-500 dark:focus:border-blue-500"
      >
        <option selected>Draft Order</option>
        <option>Highest Score</option>
        <option>Lowest Score</option>
      </select>
    </form>
    <hr class="h-px mt-1 mb-4 bg-gray-200 border-0 dark:bg-gray-700" />
    <div v-if="!loading">
      <div
        class="grid gap-0.5 mb-2 text-gray-900 dark:text-gray-200"
        :style="{
          'grid-template-columns': `repeat(${draftSize}, minmax(100px, 1fr))`,
          'min-width': '100px',
        }"
      >
        <div
          v-for="team in draftOrder"
          class="flex flex-wrap items-center justify-center"
        >
          <p v-if="team" class="mr-1.5 font-semibold">
            {{ teamRanks[team.id] ? teamRanks[team.id].toFixed(1) : "0.0" }}
          </p>
          <img
            alt="User avatar"
            v-if="team && team.avatarImg"
            class="w-8 h-8 rounded-full"
            :src="team.avatarImg"
          />
          <svg
            v-else
            class="w-8 h-8 text-gray-900 dark:text-gray-200"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z"
            />
          </svg>
          <p v-if="team" class="w-20 text-sm text-center truncate">
            {{ team.name }}
          </p>
          <p v-else class="w-20 text-sm text-center truncate">No user</p>
        </div>
      </div>
      <div
        class="grid gap-0.5 text-sm"
        :style="{
          'grid-template-columns': `repeat(${draftSize}, minmax(100px, 1fr))`,
          'min-width': '100px',
        }"
      >
        <div
          v-if="snakeDraftFormat"
          v-for="pick in sortedData"
          class="block h-20 p-2.5 text-gray-900 rounded-md shadow dark:shadow-gray-800 dark:text-gray-200"
          :class="getBgColor(pick.position)"
        >
          <p class="font-semibold truncate">
            {{ `${pick.firstName.charAt(0)}. ${pick.lastName}` }}
          </p>
          <p>{{ `${pick.position} - ${pick.team}` }}</p>
          <div class="flex justify-between text-sm">
            <p>
              {{ `${pick.round}.${getRoundPick(pick.draftSlot, pick.round)}` }}
            </p>
            <p
              class="p-1 font-semibold -mt-0.5 -mr-1 rounded-full"
              :class="[getValueColor(parseFloat(pick.pickRank))]"
            >
              {{ pick.pickRank }}
            </p>
          </div>
        </div>
        <!-- auction or dynasy linear drafts  -->
        <div v-else v-for="team in draftOrder">
          <div v-for="pick in data">
            <div
              v-if="team.id === pick.userId"
              class="block h-20 p-2.5 mb-0.5 text-gray-900 rounded-md shadow dark:shadow-gray-800 dark:text-gray-200"
              :class="getBgColor(pick.position)"
            >
              <p class="font-semibold truncate">
                {{ `${pick.firstName.charAt(0)}. ${pick.lastName}` }}
              </p>
              <p>{{ `${pick.position} - ${pick.team}` }}</p>
              <div class="flex justify-between text-sm">
                <p>
                  {{
                    `${pick.round}.${getRoundPick(pick.draftSlot, pick.round)}`
                  }}
                </p>
                <p
                  class="p-1 font-semibold -mt-0.5 -mr-1 rounded-full"
                  :class="[getValueColor(parseFloat(pick.pickRank))]"
                >
                  {{ pick.pickRank }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-else role="status" class="max-w-sm animate-pulse">
      <p class="mb-2 text-gray-900 dark:text-gray-200">Loading draft data...</p>
      <div
        class="h-2.5 bg-gray-200 rounded-full dark:bg-gray-700 w-48 mb-4"
      ></div>
      <div
        class="h-2 bg-gray-200 rounded-full dark:bg-gray-700 max-w-[360px] mb-2.5"
      ></div>
      <div class="h-2 bg-gray-200 rounded-full dark:bg-gray-700 mb-2.5"></div>
      <div
        class="h-2 bg-gray-200 rounded-full dark:bg-gray-700 max-w-[330px] mb-2.5"
      ></div>
      <div
        class="h-2 bg-gray-200 rounded-full dark:bg-gray-700 max-w-[300px] mb-2.5"
      ></div>
      <div
        class="h-2 bg-gray-200 rounded-full dark:bg-gray-700 max-w-[360px]"
      ></div>
      <span class="sr-only">Loading...</span>
    </div>
  </div>
</template>
