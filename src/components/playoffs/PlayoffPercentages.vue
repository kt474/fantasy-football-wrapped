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

const props = defineProps<{
  propsTableData: TableDataType[];
}>();

onMounted(async () => {
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
      (a: any, b: any) => b.playoffPercentage - a.playoffPercentage
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
    v-if="!loading"
    :class="store.darkMode ? 'dark-custom-bg-color' : 'light-custom-bg-color'"
    class="relative w-full overflow-x-auto bg-gray-100 rounded-lg shadow-md dark:bg-gray-700"
  >
    <p
      class="flex justify-center pt-2 font-semibold text-gray-700 text-md dark:text-gray-200"
    >
      Playoff Odds
    </p>
    <table
      class="w-full text-sm text-left text-gray-500 rtl:text-right dark:text-gray-200"
    >
      <thead
        :class="
          store.darkMode ? 'dark-custom-bg-color' : 'light-custom-bg-color'
        "
        class="text-xs text-gray-700 uppercase dark:text-gray-200"
      >
        <tr>
          <th scope="col" class="px-2 py-3 sm:px-6 w-60 dark:text-gray-200">
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
            class="px-2 font-medium text-gray-900 truncate sm:px-6 max-w-52 whitespace-nowrap dark:text-white"
          >
            {{ item.name }}
          </th>
          <td v-for="i in playoffTeams" class="px-2 py-3">
            {{
              store.leagueInfo.length > 0
                ? Math.round(
                    (item.placement.filter((position: number) => position === i)
                      .length *
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
      class="py-3 ml-2 text-xs text-gray-500 sm:ml-6 footer-font dark:text-gray-300"
    >
      Playoff odds are calculated with each team's win percentage, total points,
      and rest of season projected points.
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
    <div class="w-48 h-2 mb-10 bg-gray-200 rounded-full dark:bg-gray-700"></div>
    <div class="flex items-baseline mt-36">
      <div class="w-full h-40 bg-gray-200 rounded-t-lg dark:bg-gray-700"></div>
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
</template>
<style scoped>
.light-custom-bg-color {
  background-color: #eff0f2;
}
.dark-custom-bg-color {
  background-color: #374151;
}
</style>
