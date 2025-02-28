<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { maxBy, sum } from "lodash";
import { useStore } from "../../store/store";
import { RosterType, LeagueInfoType, TableDataType } from "../../api/types";
import { getProjections } from "../../api/api";
import { fakePlayoffData } from "../../api/helper";
const store = useStore();
const loading = ref(false);
const playoffOdds: any = ref([]);
const showData = ref(false);

const props = defineProps<{
  propsTableData: TableDataType[];
}>();

onMounted(async () => {
  showData.value = showPlayoffOdds.value;
  if (
    store.leagueInfo.length > 0 &&
    !store.leagueInfo[store.currentLeagueIndex].playoffProjections
  ) {
    loading.value = true;
    await getData();
    loading.value = false;
  } else if (store.leagueInfo.length > 0) {
    playoffOdds.value =
      store.leagueInfo[store.currentLeagueIndex].playoffProjections;
  }
});

watch(
  () => store.currentLeagueId,
  async () => {
    if (!store.leagueInfo[store.currentLeagueIndex].playoffProjections) {
      playoffOdds.value = [];
      loading.value = true;
      await getData();
      loading.value = false;
    }
    playoffOdds.value =
      store.leagueInfo[store.currentLeagueIndex].playoffProjections;
  }
);

const maxPoints = computed(() => {
  return maxBy(store.leagueInfo[store.currentLeagueIndex].rosters, "pointsFor")
    ?.pointsFor;
});

const playoffTeams = computed(() => {
  return store.leagueInfo[store.currentLeagueIndex]
    ? store.leagueInfo[store.currentLeagueIndex].playoffTeams
    : 6;
});

const playoffArray = computed(() => {
  return Array.from({ length: playoffTeams.value }, (_, i) => i + 1);
});

function getOrdinalSuffix(number: number) {
  const suffixes = ["th", "st", "nd", "rd"];
  const v = number % 100;

  return number + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
}

const numSimulations = 2000;

const getData = async () => {
  const currentLeague = store.leagueInfo[store.currentLeagueIndex];
  if (currentLeague.lastScoredWeek >= currentLeague.regularSeasonLength) {
    playoffOdds.value = props.propsTableData.map((user, index) => {
      return {
        name: user.name,
        id: user.id,
        placement: Array(numSimulations).fill(index + 1),
      };
    });
  } else {
    if (
      store.leagueInfo.length > 0 &&
      !store.leagueInfo[store.currentLeagueIndex].rosters[0].projections
    ) {
      await Promise.all(
        currentLeague.rosters.map(async (roster: any) => {
          const singleRoster: any[] = [];
          if (!roster.players) return [];
          const projectionPromises = roster.players.map((player: any) => {
            return getProjections(
              player,
              store.leagueInfo[store.currentLeagueIndex].season,
              currentLeague["currentWeek"] ? currentLeague["currentWeek"] : 0,
              currentLeague["scoringType"]
            );
          });

          const projections = await Promise.all(projectionPromises);
          singleRoster.push(...projections);
          store.addProjectionData(
            store.currentLeagueIndex,
            roster.id,
            singleRoster
          );
        })
      );
      localStorage.setItem(
        "leagueInfo",
        JSON.stringify(store.leagueInfo as LeagueInfoType[])
      );
    }

    const nameMapping: any = new Map(
      store.leagueInfo[store.currentLeagueIndex].users.map((user: any) => [
        user.id,
        user.name,
      ])
    );

    currentLeague.rosters.forEach((roster: RosterType) => {
      const winScore = roster.wins / currentLeague.lastScoredWeek;
      const pointScore = roster.pointsFor / maxPoints.value;
      const projectedScore: number = roster.projections
        ? getTopProjectionsSum(roster.projections) / maxProjectedScore.value
        : 0;
      playoffOdds.value.push({
        name: nameMapping.get(roster.id),
        id: roster.id,
        score: calculatePowerScore(winScore, pointScore, projectedScore),
        currentWins: roster.wins,
        originalWins: roster.wins,
        placement: [],
        playoffPercentage: 0,
      });
    });

    for (let sim = 0; sim < numSimulations; sim++) {
      for (
        let i = currentLeague.lastScoredWeek;
        i <= currentLeague.regularSeasonLength;
        i++
      ) {
        playoffOdds.value.forEach((roster: any) => {
          const randomOpponentIndex = Math.floor(
            Math.random() * currentLeague.totalRosters
          );
          const opponentPowerScore =
            playoffOdds.value[randomOpponentIndex].score;
          const winProbability =
            Math.round(
              (roster.score * 1000) / (roster.score + opponentPowerScore)
            ) / 1000;
          const randomOutcome = Math.random();
          if (winProbability > randomOutcome) {
            roster.currentWins += 1;
          }
        });
      }
      const copyArray = playoffOdds.value
        .slice()
        .sort((a: any, b: any) => b.currentWins - a.currentWins);
      playoffOdds.value.forEach((roster: any) => {
        const placement = copyArray.findIndex(
          (obj: any) => obj.id === roster.id
        );
        roster.placement.push(placement + 1);
        roster.currentWins = roster.originalWins;
        if (placement + 1 <= playoffTeams.value) {
          roster.playoffPercentage += 1;
        }
      });
    }

    playoffOdds.value.sort(
      (a: any, b: any) => sum(a.placement) - sum(b.placement)
    );
  }
  store.addPlayoffOdds(store.currentLeagueId, playoffOdds.value);
  localStorage.setItem(
    "leagueInfo",
    JSON.stringify(store.leagueInfo as LeagueInfoType[])
  );
};

const getTopProjectionsSum = (
  players: { projection: number; position: string }[]
) => {
  const sumTopN = (position: string, count: number) => {
    return players
      .filter((player) => player.position === position)
      .sort((a, b) => b.projection - a.projection)
      .slice(0, count)
      .reduce((sum, player) => sum + player.projection, 0);
  };

  return (
    sumTopN("RB", 3) + sumTopN("WR", 3) + sumTopN("QB", 1) + sumTopN("TE", 1)
  );
};

const maxProjectedScore = computed(() => {
  const result = store.leagueInfo[store.currentLeagueIndex].rosters.map(
    (roster) => {
      if (roster.projections) {
        return getTopProjectionsSum(roster.projections);
      }
      return 0;
    }
  );
  return Math.max(...result);
});

const showPlayoffOdds = computed(() => {
  if (store.leagueInfo.length > 0) {
    const currentLeague = store.leagueInfo[store.currentLeagueIndex];
    if (currentLeague.lastScoredWeek < currentLeague.regularSeasonLength) {
      return true;
    }
    return false;
  } else if (store.leagueInfo.length == 0) {
    return false;
  }
  return true;
});

const calculatePowerScore = (
  winScore: number,
  pointScore: number,
  projectedScore: number
) => {
  return (
    Math.round(
      (0.4 * winScore + 0.3 * pointScore + 0.3 * projectedScore) * 1000
    ) / 1000
  );
};

const tableData = computed(() => {
  return store.leagueInfo.length > 0
    ? store.leagueInfo[store.currentLeagueIndex].playoffProjections
    : fakePlayoffData;
});
</script>
<template>
  <div
    v-if="
      store.leagueInfo.length != 0 &&
      store.leagueInfo[store.currentLeagueIndex] &&
      store.leagueInfo[store.currentLeagueIndex].status !== 'complete'
    "
  >
    <div
      class="flex justify-between pb-2 shadow-md"
      :class="`
    ${store.darkMode ? 'dark-custom-bg-color' : 'light-custom-bg-color'}
    ${showData ? 'rounded-t-lg' : 'rounded-lg'}
  `"
    >
      <p
        class="w-full pt-2 text-lg font-semibold text-center text-gray-700 cursor-pointer dark:text-gray-200"
        @click="showData = !showData"
      >
        Playoff Odds
      </p>
      <svg
        v-if="!showData"
        @click="showData = !showData"
        class="w-6 h-6 mt-2.5 mr-3 sm:mr-4 text-gray-700 dark:text-gray-200 cursor-pointer"
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          fill-rule="evenodd"
          d="M18.425 10.271C19.499 8.967 18.57 7 16.88 7H7.12c-1.69 0-2.618 1.967-1.544 3.271l4.881 5.927a2 2 0 0 0 3.088 0l4.88-5.927Z"
          clip-rule="evenodd"
        />
      </svg>
      <svg
        v-else
        @click="showData = !showData"
        class="w-6 h-6 mt-2 mr-3 text-gray-700 cursor-pointer sm:mr-4 dark:text-gray-200"
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          fill-rule="evenodd"
          d="M5.575 13.729C4.501 15.033 5.43 17 7.12 17h9.762c1.69 0 2.618-1.967 1.544-3.271l-4.881-5.927a2 2 0 0 0-3.088 0l-4.88 5.927Z"
          clip-rule="evenodd"
        />
      </svg>
    </div>
    <div
      v-if="!loading"
      :class="store.darkMode ? 'dark-custom-bg-color' : 'light-custom-bg-color'"
      class="relative w-full overflow-x-auto bg-gray-100 rounded-b-lg shadow-md dark:bg-gray-700"
    >
      <table
        v-if="showData"
        class="w-full text-sm text-left text-gray-500 rtl:text-right dark:text-gray-200"
      >
        <thead
          :class="
            store.darkMode ? 'dark-custom-bg-color' : 'light-custom-bg-color'
          "
          class="text-xs text-gray-700 uppercase dark:text-gray-200"
        >
          <tr>
            <th scope="col" class="px-4 py-3 sm:px-6 w-60 dark:text-gray-200">
              Team Name
            </th>
            <th v-for="i in playoffTeams" scope="col" class="px-2 py-3">
              <div
                class="flex items-center w-8 cursor-pointer dark:text-gray-200"
              >
                {{ getOrdinalSuffix(i) }}
              </div>
            </th>
            <th
              scope="col"
              class="py-3 pl-3 pr-3 sm:pr-0 md:pl-10 lg:pl-20 xl:pl-52"
            >
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(item, index) in tableData"
            :key="index"
            class="bg-white border-b dark:bg-gray-800 dark:border-gray-700"
            :class="{
              'border-b-blue-600 border-b-2 dark:border-b-blue-500':
                index == playoffTeams - 1,
            }"
          >
            <th
              scope="row"
              class="px-4 font-medium text-gray-900 truncate sm:px-6 max-w-52 whitespace-nowrap dark:text-white"
            >
              {{ item.name }}
            </th>
            <td v-for="i in playoffTeams" class="px-2 py-3">
              {{
                store.leagueInfo.length > 0
                  ? Math.round(
                      (item.placement.filter(
                        (position: number) => position === i
                      ).length *
                        100 *
                        10) /
                        numSimulations
                    ) / 10
                  : item.placement[i - 1]
              }}%
            </td>
            <td
              class="py-3 pl-3 pr-0 border-l sm:pr-3 md:pl-10 lg:pl-20 xl:pl-52 dark:bg-gray-800 dark:border-gray-700"
            >
              {{
                store.leagueInfo.length > 0
                  ? Math.round(
                      (item.placement.filter((position: number) =>
                        playoffArray.includes(position)
                      ).length *
                        100 *
                        10) /
                        numSimulations
                    ) / 10
                  : sum(item.placement)
              }}%
            </td>
          </tr>
        </tbody>
      </table>
      <p
        v-if="showData"
        class="max-w-3xl py-3 ml-2 text-xs text-gray-500 sm:ml-6 footer-font dark:text-gray-300"
      >
        Playoff odds are estimated using Monte Carlo simulation based on team
        records, total points, and projected rest-of-season points. League
        settings are not taken into account so mathematically eliminated teams
        may still have a percentage greater than zero.
      </p>
    </div>
    <div
      v-else
      role="status"
      class="p-4 border border-gray-200 rounded shadow animate-pulse md:p-6 dark:border-gray-700 custom-height"
    >
      <p
        class="flex justify-center -mb-6 text-xl font-semibold text-gray-900 dark:text-white"
      >
        Loading projection data...
      </p>
      <div
        class="h-2.5 bg-gray-200 rounded-full dark:bg-gray-700 w-32 mb-2.5"
      ></div>
      <div
        class="w-48 h-2 mb-10 bg-gray-200 rounded-full dark:bg-gray-700"
      ></div>
      <div class="flex items-baseline mt-36">
        <div
          class="w-full h-40 bg-gray-200 rounded-t-lg dark:bg-gray-700"
        ></div>
        <div
          class="w-full bg-gray-200 rounded-t-lg h-96 ms-6 dark:bg-gray-700"
        ></div>
        <div
          class="w-full bg-gray-200 rounded-t-lg h-60 ms-6 dark:bg-gray-700"
        ></div>
        <div
          class="w-full h-40 bg-gray-200 rounded-t-lg ms-6 dark:bg-gray-700"
        ></div>
        <div
          class="w-full h-32 bg-gray-200 rounded-t-lg ms-6 dark:bg-gray-700"
        ></div>
        <div
          class="w-full bg-gray-200 rounded-t-lg h-36 ms-6 dark:bg-gray-700"
        ></div>
        <div
          class="w-full bg-gray-200 rounded-t-lg h-72 ms-6 dark:bg-gray-700"
        ></div>
        <div
          class="w-full bg-gray-200 rounded-t-lg h-44 ms-6 dark:bg-gray-700"
        ></div>
        <div
          class="w-full bg-gray-200 rounded-t-lg h-44 ms-6 dark:bg-gray-700"
        ></div>
        <div
          class="w-full h-64 bg-gray-200 rounded-t-lg ms-6 dark:bg-gray-700"
        ></div>
        <div
          class="w-full h-64 bg-gray-200 rounded-t-lg ms-6 dark:bg-gray-700"
        ></div>
        <div
          class="w-full bg-gray-200 rounded-t-lg h-44 ms-6 dark:bg-gray-700"
        ></div>
      </div>
      <span class="sr-only">Loading...</span>
    </div>
  </div>
</template>
<style scoped>
.light-custom-bg-color {
  background-color: #eff0f2;
}
.dark-custom-bg-color {
  background-color: #374151;
}
</style>
