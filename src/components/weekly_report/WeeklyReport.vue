<script setup lang="ts">
import { TableDataType, LeagueInfoType } from "../../api/types.ts";
import { computed, ref, watch, onMounted } from "vue";
import { useStore } from "../../store/store";
import { getPlayerNames, generateReport } from "../../api/api.ts";
import { max } from "lodash";

const store = useStore();
const props = defineProps<{
  tableData: TableDataType[];
  regularSeasonLength: number;
}>();

const weeklyReport: any = ref("");
const rawWeeklyReport: any = ref("");
const playerNames = ref([]);
const loading = ref(false);

const weeks = computed(() => {
  if (
    store.leagueInfo.length == 0 ||
    !store.leagueInfo[store.currentLeagueIndex]
  ) {
    return [...Array(15).keys()].slice(1).reverse();
  }
  if (props.tableData[0].matchups) {
    const recordLength = props.tableData[0].matchups.length + 1;
    const weeksList = [
      ...Array(
        store.leagueInfo[store.currentLeagueIndex].lastScoredWeek + 1
      ).keys(),
    ]
      .slice(1)
      .reverse();
    return recordLength < weeksList.length
      ? [...Array(recordLength).keys()].slice(1).reverse()
      : weeksList;
  }
  return [];
});

const playoffWeeks = computed(() => {
  if (
    store.leagueInfo.length > 0 &&
    store.leagueInfo[store.currentLeagueIndex]
  ) {
    const currentLeague = store.leagueInfo[store.currentLeagueIndex];
    const result: number[] = [];
    for (
      let i = currentLeague.regularSeasonLength + 1;
      i <= currentLeague.lastScoredWeek;
      i++
    ) {
      result.push(i);
    }
    return result;
  }
  return [15, 16, 17];
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
    let leagueMetadata;
    if (isPlayoffs.value) {
      const roundNames: { [key: number]: string } = {
        1: "Quarterfinal round",
        2: "Semifinal round",
        3: "Final Championship round",
        4: "Final Championship round",
      };
      leagueMetadata = {
        playoffRound:
          roundNames[currentWeek.value - currentLeague.regularSeasonLength],
      };
    } else {
      leagueMetadata = {
        numberOfPlayoffTeams: currentLeague.playoffTeams,
        numberRegularSeasonWeeks: currentLeague.regularSeasonLength,
        currentWeek: currentWeek.value,
      };
    }
    const response = await generateReport(reportPrompt.value, leagueMetadata);
    rawWeeklyReport.value = response.text;
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
    store.leagueInfo[store.currentLeagueIndex] &&
    !store.leagueInfo[store.currentLeagueIndex].weeklyReport
  ) {
    loading.value = true;
    await fetchPlayerNames();
    await getReport();
    loading.value = false;
  } else if (
    store.leagueInfo.length > 0 &&
    store.leagueInfo[store.currentLeagueIndex]
  ) {
    const savedText: any = store.leagueInfo[store.currentLeagueIndex]
      .weeklyReport
      ? store.leagueInfo[store.currentLeagueIndex].weeklyReport
      : "";
    weeklyReport.value = savedText;
    rawWeeklyReport.value = savedText
      .replace(/<b>(.*?)<\/b>/g, "**$1**")
      .replace(/<br>/g, "\n");
  }
});

const isPlayoffs = computed(() => {
  const currentLeague = store.leagueInfo[store.currentLeagueIndex];
  if (currentWeek.value > currentLeague.regularSeasonLength) {
    return true;
  }
  return false;
});

const losersBracketIDs = computed(() => {
  const result: number[] = [];
  store.leagueInfo[store.currentLeagueIndex].losersBracket.forEach(
    (matchup) => {
      result.push(matchup.t1);
      result.push(matchup.t2);
    }
  );
  return result;
});

const winnersBracketIDs = computed(() => {
  const result: number[] = [];
  store.leagueInfo[store.currentLeagueIndex].winnersBracket.forEach(
    (matchup) => {
      result.push(matchup.t1);
      result.push(matchup.t2);
    }
  );
  return result;
});

const reportPrompt = computed(() => {
  const result: any[] = [];
  if (isPlayoffs.value) {
    props.tableData.forEach((user: TableDataType, index: number) => {
      if (user.matchups[currentWeek.value - 1]) {
        const week: number = currentWeek.value - 1;
        result.push({
          name: user.name,
          matchupNumber: user.matchups[week],
          winner:
            getMatchupWinner(user.matchups[week], week) === user.points[week],
          playerPoints: user.starterPoints[week],
          playerNames: playerNames.value[index],
          pointsScored: user.points[week],
          inLosersBracket: losersBracketIDs.value.includes(user.rosterId),
          inWinnersBracket: winnersBracketIDs.value.includes(user.rosterId),
        });
      }
    });
  } else {
    props.tableData.forEach((user: TableDataType, index: number) => {
      if (user.matchups[currentWeek.value - 1]) {
        const week: number = currentWeek.value - 1;
        result.push({
          name: user.name,
          matchupNumber: user.matchups[week],
          playerPoints: user.starterPoints[week],
          pointsScored: user.points[week],
          winner:
            getMatchupWinner(user.matchups[week], week) === user.points[week],
          playerNames: playerNames.value[index],
          currentRecord: `${user.wins}-${user.losses}`,
          currentRank: user.regularSeasonRank,
        });
      }
    });
  }
  return result;
});

const numOfMatchups = computed(() => {
  const result: number[] = [];
  sortedTableData.value.forEach((user) => {
    const matchupIndex = user.matchups[currentWeek.value - 1];
    if (matchupIndex && !result.includes(matchupIndex)) {
      result.push(user.matchups[currentWeek.value - 1]);
    }
  });
  return result;
});

const sortedTableData = computed(() => {
  if (props.tableData[0].points) {
    return [...props.tableData].sort(
      (a, b) =>
        a.points[currentWeek.value - 1] - b.points[currentWeek.value - 1]
    );
  }
  return [];
});

const seriesData = computed(() => {
  return [
    {
      name: "Points",
      data: sortedTableData.value.map((user: any) =>
        user.matchups[currentWeek.value - 1]
          ? user.points[currentWeek.value - 1]
          : 0
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
    categories: sortedTableData.value.map((user) =>
      user.name ? user.name : ""
    ),
    labels: {
      formatter: function (str: string) {
        const n = 17;
        return str.length > n ? str.slice(0, n - 1) + "..." : str;
      },
    },
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
      categories: sortedTableData.value.map((user) =>
        user.name ? user.name : ""
      ),
      labels: {
        formatter: function (str: string) {
          const n = 17;
          return str.length > n ? str.slice(0, n - 1) + "..." : str;
        },
      },
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
      loading.value = true;
      await fetchPlayerNames();
      await getReport();
      loading.value = false;
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
    store.leagueInfo[store.currentLeagueIndex] &&
    store.leagueInfo[store.currentLeagueIndex].medianScoring === 1
  ) {
    index = index * 2;
  }
  if (recordString) {
    const numWins = recordString.slice(0, index).split("W").length - 1;
    const numLosses = recordString.slice(0, index).split("L").length - 1;
    return `${numWins} - ${numLosses}`;
  }
  return "0-0";
};

const getMatchupWinner = (matchupIndex: number, currentWeek: number) => {
  const opponents = sortedTableData.value.filter(
    (user) => user.matchups[currentWeek] === matchupIndex
  );
  const pointsArray = opponents.map((user) => user.points[currentWeek]);
  return max(pointsArray);
};

const copyReport = () => {
  navigator.clipboard.writeText(rawWeeklyReport.value);
  store.showCopyReport = true;
  setTimeout(() => {
    store.showCopyReport = false;
  }, 3000);
};

watch(
  () => props.regularSeasonLength,
  () => (currentWeek.value = weeks.value[0])
);
</script>
<template>
  <div
    class="h-full px-6 pt-4 mt-4 bg-white border border-gray-200 rounded-lg shadow custom-width dark:bg-gray-800 dark:border-gray-700"
  >
    <div class="flex items-center justify-between mb-3">
      <h5 class="text-2xl font-bold text-gray-900 sm:text-3xl dark:text-white">
        Weekly Report
      </h5>
      <select
        aria-label="current week"
        id="rankings"
        class="block p-2 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 custom-padding"
        :class="playoffWeeks.includes(currentWeek) ? 'w-44' : 'w-28'"
        v-model="currentWeek"
      >
        <option v-for="week in weeks" :key="week" :value="week">
          Week {{ week }} {{ playoffWeeks.includes(week) ? "(playoffs)" : "" }}
        </option>
      </select>
    </div>
    <hr class="h-px my-2 bg-gray-200 border-0 dark:bg-gray-700" />
    <div v-if="currentWeek == weeks[0]">
      <div class="flex">
        <p class="mb-2 text-xl font-bold text-gray-900 dark:text-white">
          Summary
        </p>
        <svg
          @click="copyReport()"
          class="w-6 h-6 mt-0.5 ml-2 text-gray-800 cursor-pointer dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            stroke="currentColor"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 8v3a1 1 0 0 1-1 1H5m11 4h2a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1h-7a1 1 0 0 0-1 1v1m4 3v10a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-7.13a1 1 0 0 1 .24-.65L7.7 8.35A1 1 0 0 1 8.46 8H13a1 1 0 0 1 1 1Z"
          />
        </svg>
      </div>
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
          like back to the past, scoring just 76.3 points and proving that even
          Patrick Mahomes can’t carry a team of underperformers.
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
      <div v-else-if="loading">
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
    <div class="flex flex-wrap w-full mb-2 overflow-x-hidden">
      <div
        v-for="index in numOfMatchups"
        class="block px-4 py-2.5 my-2 mr-4 text-gray-600 bg-white border border-gray-200 rounded-lg shadow w-80 custom-min-width dark:shadow-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
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
                    {{ user.name ? user.name : "Ghost Roster" }}
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
                    user.points[currentWeek - 1] ==
                    getMatchupWinner(index, currentWeek - 1),
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
<style scoped>
.custom-min-width {
  @media (width >= 390px) {
    min-width: 306px;
  }
}
</style>
