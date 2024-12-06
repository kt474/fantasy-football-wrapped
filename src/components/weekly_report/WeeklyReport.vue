<script setup lang="ts">
import { TableDataType, LeagueInfoType } from "../../api/types.ts";
import { computed, ref, watch, onMounted } from "vue";
import { useStore } from "../../store/store";
import { getPlayerNames, generateReport } from "../../api/api.ts";

const store = useStore();
const props = defineProps<{
  tableData: TableDataType[];
  regularSeasonLength: number;
}>();

const weeklyReport: any = ref("");
const playerNames = ref([]);

const weeks = computed(() => {
  if (props.tableData[0].matchups) {
    const recordLength = props.tableData[0].matchups.length + 1;
    const weeksList = [...Array(props.regularSeasonLength).keys()]
      .slice(1)
      .reverse();
    return recordLength < weeksList.length
      ? [...Array(recordLength).keys()].slice(1).reverse()
      : weeksList;
  }
  return [];
});

const currentWeek = ref(weeks.value[0]);

const fetchPlayerNames = async () => {
  if (store.leagueIds.length > 0) {
    const result: any = await Promise.all(
      props.tableData.map(async (user: any) => {
        return await getPlayerNames(user.starters[currentWeek.value - 1]);
      })
    );
    playerNames.value = result;
  }
};

const getReport = async () => {
  if (store.leagueIds.length > 0) {
    const currentLeague = store.leagueInfo[store.currentLeagueIndex];
    const leagueMetadata = {
      numberOfPlayoffTeams: currentLeague.playoffTeams,
      numberRegularSeasonWeeks: currentLeague.regularSeasonLength,
      currentWeek: currentWeek.value,
    };
    const response = await generateReport(reportPrompt.value, leagueMetadata);
    weeklyReport.value = response.text
      .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
      .replace(/\n/g, "<br>");
    store.addWeeklyReport(currentLeague.leagueId, weeklyReport.value);
    localStorage.setItem(
      "leagueInfo",
      JSON.stringify(store.leagueInfo as LeagueInfoType[])
    );
  }
};

onMounted(async () => {
  if (
    store.leagueInfo.length > 0 &&
    props.tableData[0].matchups &&
    !store.leagueInfo[store.currentLeagueIndex].weeklyReport
  ) {
    await fetchPlayerNames();
    await getReport();
  } else if (store.leagueInfo.length > 0) {
    weeklyReport.value =
      store.leagueInfo[store.currentLeagueIndex].weeklyReport;
  }
});

const reportPrompt = computed(() => {
  const result: any[] = [];
  props.tableData.forEach((user: TableDataType, index: number) => {
    result.push({
      name: user.name,
      matchupNumber: user.matchups[currentWeek.value - 1],
      playerPoints: user.starterPoints[currentWeek.value - 1],
      playerNames: playerNames.value[index],
      totalPoints: user.points[currentWeek.value - 1],
      currentRecord: `${user.wins}-${user.losses}`,
      currentRank: user.regularSeasonRank,
    });
  });
  return result;
});

const numOfMatchups = computed(() => {
  return sortedTableData.value.length / 2;
});

const sortedTableData = computed(() => {
  return [...props.tableData].sort(
    (a, b) => a.points[currentWeek.value - 1] - b.points[currentWeek.value - 1]
  );
});

const seriesData = computed(() => {
  return [
    {
      name: "Points",
      data: sortedTableData.value.map(
        (user: any) => user.points[currentWeek.value - 1]
      ),
    },
  ];
});

const chartOptions = ref({
  chart: {
    foreColor: store.darkMode ? "#ffffff" : "#111827",
    type: "bar",
    toolbar: {
      show: false,
    },
    zoom: {
      enabled: false,
    },
    animations: {
      enabled: false,
    },
  },
  plotOptions: {
    bar: {
      columnWidth: "75%",
    },
  },
  colors: ["#22c55e"],
  dataLabels: {
    enabled: false,
  },
  tooltip: {
    theme: store.darkMode ? "dark" : "light",
    y: {
      show: true,
      formatter: (x: number) => {
        if (Number.isInteger(x)) {
          return `${x}`;
        }
        return `${x.toFixed(2)}`;
      },
    },
    marker: {
      show: false,
    },
  },
  xaxis: {
    categories: sortedTableData.value.map((user) => user.name),
    title: {
      text: "League Manager",
      offsetY: 3,
      style: {
        fontSize: "16px",
        fontFamily:
          "ui-sans-serif, system-ui, sans-serif, Apple Color Emoji, Segoe UI Emoji",
        fontWeight: 600,
      },
    },
  },
  yaxis: {
    labels: {
      formatter: function (x: number) {
        return x;
      },
    },
    title: {
      text: "Points Scored",
      offsetX: -10,
      style: {
        fontSize: "16px",
        fontFamily:
          "ui-sans-serif, system-ui, sans-serif, Apple Color Emoji, Segoe UI Emoji",
        fontWeight: 600,
      },
    },
  },
});

const updateChartColor = () => {
  chartOptions.value = {
    ...chartOptions.value,
    chart: {
      type: "bar",
      foreColor: store.darkMode ? "#ffffff" : "#111827",
      toolbar: {
        show: false,
      },
      zoom: {
        enabled: false,
      },
      animations: {
        enabled: false,
      },
    },
    tooltip: {
      theme: store.darkMode ? "dark" : "light",
      y: {
        show: true,
        formatter: (x: number) => {
          if (Number.isInteger(x)) {
            return `${x}`;
          }
          return `${x.toFixed(2)}`;
        },
      },
      marker: {
        show: false,
      },
    },
    xaxis: {
      categories: sortedTableData.value.map((user) => user.name),
      title: {
        text: "League Manager",
        offsetY: 3,
        style: {
          fontSize: "16px",
          fontFamily:
            "ui-sans-serif, system-ui, sans-serif, Apple Color Emoji, Segoe UI Emoji",
          fontWeight: 600,
        },
      },
    },
    yaxis: {
      labels: {
        formatter: function (x: number) {
          return x;
        },
      },
      title: {
        text: "Points Scored",
        offsetX: -10,
        style: {
          fontSize: "16px",
          fontFamily:
            "ui-sans-serif, system-ui, sans-serif, Apple Color Emoji, Segoe UI Emoji",
          fontWeight: 600,
        },
      },
    },
  };
};

watch(
  () => store.darkMode,
  () => updateChartColor()
);

watch(
  () => store.currentLeagueId,
  async () => {
    updateChartColor();
    currentWeek.value = weeks.value[0];
    if (!store.leagueInfo[store.currentLeagueIndex].weeklyReport) {
      weeklyReport.value = "";
      await fetchPlayerNames();
      await getReport();
    }
    weeklyReport.value =
      store.leagueInfo[store.currentLeagueIndex].weeklyReport;
  }
);

watch(
  () => currentWeek.value,
  () => updateChartColor()
);

const getRecord = (recordString: string, index: number) => {
  if (
    store.leagueInfo.length > 0 &&
    store.leagueInfo[store.currentLeagueIndex].medianScoring === 1
  ) {
    index = index * 2;
  }
  const numWins = recordString.slice(0, index).split("W").length - 1;
  const numLosses = recordString.slice(0, index).split("L").length - 1;
  return `${numWins} - ${numLosses}`;
};

watch(
  () => props.regularSeasonLength,
  () => (currentWeek.value = weeks.value[0])
);
</script>
<template>
  <div
    v-if="props.tableData[0].matchups"
    class="h-full px-6 pt-4 mt-4 bg-white border border-gray-200 rounded-lg shadow custom-width dark:bg-gray-800 dark:border-gray-700"
  >
    <div class="flex items-center justify-between mb-3">
      <h5 class="text-2xl font-bold text-gray-900 sm:text-3xl dark:text-white">
        Weekly Report
      </h5>
      <select
        aria-label="current week"
        id="rankings"
        class="block p-2 text-sm text-gray-900 border border-gray-300 rounded-lg w-15 bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 custom-padding"
        v-model="currentWeek"
      >
        <option v-for="week in weeks" :key="week" :value="week">
          Week {{ week }}
        </option>
      </select>
    </div>
    <hr class="h-px my-2 bg-gray-200 border-0 dark:bg-gray-700" />
    <div v-if="currentWeek == weeks[0]">
      <p class="mb-2 text-xl font-bold text-gray-900 dark:text-white">
        Summary
      </p>
      <div
        v-if="weeklyReport"
        class="max-w-5xl text-gray-900 dark:text-gray-300"
      >
        <p v-html="weeklyReport" class="mb-3"></p>
        <p class="text-xs text-gray-500 dark:text-gray-300">
          Generated using GPT-4o. Information provided may not always be
          accurate.
        </p>
      </div>
      <!-- Fake data for home page -->
      <div
        v-else-if="store.leagueIds.length == 0"
        class="max-w-5xl text-gray-900 dark:text-gray-300"
      >
        <p class="mb-3">
          Week 14 was a rollercoaster, and some of you might want to demand a
          refund for that ride.
          <b>The Princess McBride</b> retains the top spot with a solid 124.48
          points, thanks to Josh Allen and Christian McCaffrey doing their best
          superhero impressions. Meanwhile, <b>Dak to the Future</b> looked more
          like a pack of kittens, scoring just 90.04 points and proving that
          even Patrick Mahomes can’t carry a team of underperformers.
        </p>
        <p class="mb-3">
          <b>Finding Deebo</b> narrowly edged out <b>LaPorta Potty </b> in a
          high-scoring showdown, 129.62 to 123.26. Deebo Samuel was the real
          MVP, putting up numbers like he was playing Madden on rookie mode.
          <b>Baby Back Gibbs</b> and <b>Bijan Mustard</b> had a snooze-fest,
          with the BBQ Ribs barely staying awake long enough to win 95 to 82.64.
          Travis Kelce's performance was less "Mr. Swift" and more "Mr. Swiftly
          Disappointing."
        </p>
        <p class="mb-3">
          In the battle of the lower ranks, <b>Pollard Greens</b> barely
          squeaked by <b>Loud and Stroud</b> 94.82 to 90.44. Tony Pollard and
          James Cook did just enough to save the day, proving that even a broken
          clock is right twice a day.
        </p>
        <p>
          Finally, <b>Ja’Marr the Merrier</b> showed
          <b>Just the Tua Us</b> who's boss, winning 90.04 to 82.64. Russell
          Wilson must have found a new playbook, because he was cooking, and not
          just in the kitchen.
        </p>
      </div>
      <div v-else>
        <div role="status" class="space-y-2.5 animate-pulse max-w-lg mt-2.5">
          <p class="text-gray-900 dark:text-gray-300">Generating Summary...</p>
          <div class="flex items-center w-full">
            <div
              class="h-2.5 bg-gray-200 rounded-full dark:bg-gray-700 w-32"
            ></div>
            <div
              class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-24"
            ></div>
            <div
              class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-full"
            ></div>
          </div>
          <div class="flex items-center w-full max-w-[480px]">
            <div
              class="h-2.5 bg-gray-200 rounded-full dark:bg-gray-700 w-full"
            ></div>
            <div
              class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-full"
            ></div>
            <div
              class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-24"
            ></div>
          </div>
          <div class="flex items-center w-full max-w-[400px]">
            <div
              class="h-2.5 bg-gray-300 rounded-full dark:bg-gray-600 w-full"
            ></div>
            <div
              class="h-2.5 ms-2 bg-gray-200 rounded-full dark:bg-gray-700 w-80"
            ></div>
            <div
              class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-full"
            ></div>
          </div>
          <div class="flex items-center w-full max-w-[480px]">
            <div
              class="h-2.5 ms-2 bg-gray-200 rounded-full dark:bg-gray-700 w-full"
            ></div>
            <div
              class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-full"
            ></div>
            <div
              class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-24"
            ></div>
          </div>
          <div class="flex items-center w-full max-w-[440px]">
            <div
              class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-32"
            ></div>
            <div
              class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-24"
            ></div>
            <div
              class="h-2.5 ms-2 bg-gray-200 rounded-full dark:bg-gray-700 w-full"
            ></div>
          </div>
          <div class="flex items-center w-full max-w-[360px]">
            <div
              class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-full"
            ></div>
            <div
              class="h-2.5 ms-2 bg-gray-200 rounded-full dark:bg-gray-700 w-80"
            ></div>
            <div
              class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-full"
            ></div>
          </div>
          <span class="sr-only">Loading...</span>
        </div>
      </div>
      <hr class="h-px mt-4 mb-2 bg-gray-200 border-0 dark:bg-gray-700" />
    </div>
    <p class="text-xl font-bold text-gray-900 dark:text-white">Matchups</p>
    <div class="flex flex-wrap w-full mb-2 overflow-auto">
      <div
        v-for="index in numOfMatchups"
        class="block px-4 py-2.5 my-2 mr-4 text-gray-600 bg-white border border-gray-200 rounded-lg shadow w-80 dark:shadow-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
      >
        <div v-for="user in sortedTableData">
          <div v-if="user.matchups[currentWeek - 1] == index">
            <div class="flex justify-between my-2">
              <div class="flex">
                <img
                  v-if="user.avatarImg"
                  alt="User avatar"
                  class="w-8 h-8 rounded-full"
                  :src="user.avatarImg"
                />
                <svg
                  v-else
                  class="w-8 h-8 text-gray-800 dark:text-white"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z"
                  />
                </svg>
                <div>
                  <p class="px-2 -mt-1 truncate max-w-28 xl:max-w-44">
                    {{ user.name }}
                  </p>
                  <p class="ml-2 text-xs">
                    ({{ getRecord(user.recordByWeek, currentWeek) }})
                  </p>
                </div>
              </div>
              <p
                class="mt-0.5"
                :class="{
                  'text-blue-600 dark:text-blue-500 font-semibold':
                    store.leagueInfo.length > 0 &&
                    store.leagueInfo[store.currentLeagueIndex].medianScoring ===
                      1
                      ? user.recordByWeek[2 * (currentWeek - 1)] == 'W'
                      : user.recordByWeek[currentWeek - 1] == 'W',
                }"
              >
                {{ user.points[currentWeek - 1] }}
              </p>
            </div>
            <hr
              v-if="
                sortedTableData
                  .filter((u) => u.matchups[currentWeek - 1] === index)
                  .indexOf(user) === 0
              "
              class="h-px my-2 bg-gray-200 border-0 dark:bg-gray-700"
            />
          </div>
        </div>
      </div>
    </div>
    <hr class="h-px mt-4 mb-2 bg-gray-200 border-0 dark:bg-gray-700" />
    <p class="text-xl font-bold text-gray-900 dark:text-white">Points</p>
    <apexchart
      width="100%"
      height="475"
      type="bar"
      :options="chartOptions"
      :series="seriesData"
    ></apexchart>
  </div>
</template>
