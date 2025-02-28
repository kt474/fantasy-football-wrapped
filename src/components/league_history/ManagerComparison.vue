<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useStore } from "../../store/store";

const store = useStore();
const manager1 = ref("");
const manager2 = ref("");

const props = defineProps<{
  tableData: any[];
}>();

const managers = computed(() => {
  return props.tableData.map((user) => user.name);
});

const currentManager1 = computed(() => {
  return props.tableData.find(
    (user) => user.name.trim() === manager1.value.trim()
  );
});

const currentManager2 = computed(() => {
  return props.tableData.find(
    (user) => user.name.trim() === manager2.value.trim()
  );
});

const matchupRecord = computed(() => {
  if (currentManager1.value.id === currentManager2.value.id) return "0-0";
  let wins = 0;
  let losses = 0;
  const minLength = Math.min(
    currentManager1.value.matchups.length,
    currentManager2.value.matchups.length
  );
  const matchups = [];

  for (let i = 0; i < minLength; i++) {
    if (
      currentManager1.value.matchups[i] !== null &&
      currentManager1.value.matchups[i] === currentManager2.value.matchups[i]
    ) {
      matchups.push(i);
    }
  }

  matchups.forEach((matchup: any) => {
    if (
      currentManager1.value.pointsArr[matchup] >
      currentManager2.value.pointsArr[matchup]
    ) {
      wins += 1;
    } else {
      losses += 1;
    }
  });
  return `${wins}-${losses}`;
});

const matchupRecord2 = computed(() => {
  if (currentManager1.value.id === currentManager2.value.id) return "0-0";
  let wins = 0;
  let losses = 0;
  const minLength = Math.min(
    currentManager1.value.matchups.length,
    currentManager2.value.matchups.length
  );
  const matchups = [];

  for (let i = 0; i < minLength; i++) {
    if (
      currentManager1.value.matchups[i] !== null &&
      currentManager1.value.matchups[i] === currentManager2.value.matchups[i]
    ) {
      matchups.push(i);
    }
  }

  matchups.forEach((matchup: any) => {
    if (
      currentManager1.value.pointsArr[matchup] >
      currentManager2.value.pointsArr[matchup]
    ) {
      wins += 1;
    } else {
      losses += 1;
    }
  });
  return `${losses}-${wins}`;
});

const manager1Champs = computed(() => {
  return (
    currentManager1.value.leagueWinner.filter(
      (item: any) => item === currentManager1.value.rosterId
    ).length >
    currentManager2.value.leagueWinner.filter(
      (item: any) => item === currentManager2.value.rosterId
    ).length
  );
});

const manager2Champs = computed(() => {
  return (
    currentManager2.value.leagueWinner.filter(
      (item: any) => item === currentManager2.value.rosterId
    ).length >
    currentManager1.value.leagueWinner.filter(
      (item: any) => item === currentManager1.value.rosterId
    ).length
  );
});

const seriesData = computed(() => {
  return [
    {
      name: currentManager1.value.name,
      data: currentManager1.value.pointSeason[0].points,
    },
    {
      name: currentManager2.value.name,
      data: currentManager2.value.pointSeason[0].points,
    },
  ];
});

watch(
  managers,
  (newManagers) => {
    if (newManagers.length) {
      manager1.value = newManagers[0];
      manager2.value = newManagers[1];
    }
  },
  { immediate: true }
);

watch(
  () => store.darkMode,
  () => updateChartColor()
);

watch(
  () => store.currentLeagueId,
  () => updateChartColor()
);

const updateChartColor = () => {
  chartOptions.value = {
    ...chartOptions.value,
    chart: {
      height: 350,
      foreColor: store.darkMode ? "#ffffff" : "#111827",
      type: "line",
      zoom: {
        enabled: false,
      },
      toolbar: {
        show: false,
      },
      animations: {
        enabled: false,
      },
    },
    colors: ["#f97316", "#22c55e"],
    tooltip: {
      theme: store.darkMode ? "dark" : "light",
    },
    dataLabels: {
      enabled: true,
    },
    stroke: {
      curve: "smooth",
    },
    grid: {
      borderColor: "#e7e7e7",
      row: {
        colors: store.darkMode
          ? ["#374151", "transparent"]
          : ["#f3f3f3", "transparent"],
        opacity: 0.5,
      },
    },
    markers: {
      size: 1,
    },
    xaxis: {
      title: {
        text: "Week",
        style: {
          fontSize: "16px",
          fontFamily:
            "ui-sans-serif, system-ui, sans-serif, Apple Color Emoji, Segoe UI Emoji",
          fontWeight: 600,
        },
      },
    },
    yaxis: {
      title: {
        text: "Points",
        style: {
          fontSize: "16px",
          fontFamily:
            "ui-sans-serif, system-ui, sans-serif, Apple Color Emoji, Segoe UI Emoji",
          fontWeight: 600,
        },
      },
    },
    legend: {
      position: "top",
      horizontalAlign: "right",
      floating: true,
      offsetY: -25,
      offsetX: -5,
    },
  };
};

const chartOptions = ref({
  chart: {
    height: 350,
    foreColor: store.darkMode ? "#ffffff" : "#111827",
    type: "line",
    zoom: {
      enabled: false,
    },
    toolbar: {
      show: false,
    },
    animations: {
      enabled: false,
    },
  },
  colors: ["#f97316", "#22c55e"],
  tooltip: {
    theme: store.darkMode ? "dark" : "light",
  },
  dataLabels: {
    enabled: true,
  },
  stroke: {
    curve: "smooth",
  },
  grid: {
    borderColor: "#e7e7e7",
    row: {
      colors: store.darkMode
        ? ["#374151", "transparent"]
        : ["#f3f3f3", "transparent"],
      opacity: 0.5,
    },
  },
  markers: {
    size: 1,
  },
  xaxis: {
    title: {
      text: "Week",
      style: {
        fontSize: "16px",
        fontFamily:
          "ui-sans-serif, system-ui, sans-serif, Apple Color Emoji, Segoe UI Emoji",
        fontWeight: 600,
      },
    },
  },
  yaxis: {
    title: {
      text: "Points",
      style: {
        fontSize: "16px",
        fontFamily:
          "ui-sans-serif, system-ui, sans-serif, Apple Color Emoji, Segoe UI Emoji",
        fontWeight: 600,
      },
    },
  },
  legend: {
    position: "top",
    horizontalAlign: "right",
    floating: true,
    offsetY: -25,
    offsetX: -5,
  },
});
</script>
<template>
  <div
    v-if="manager1 && manager2"
    class="w-full p-4 bg-white rounded-lg shadow dark:bg-gray-800 md:p-6"
  >
    <h5
      class="-mt-1.5 mb-4 text-2xl font-bold text-gray-900 sm:text-3xl dark:text-white"
    >
      Manager Comparison
    </h5>
    <div class="relative overflow-x-auto rounded-lg">
      <table
        class="w-full min-w-[648px] text-sm text-left text-gray-500 rtl:text-right dark:text-gray-300"
      >
        <thead
          :class="
            store.darkMode ? 'dark-custom-bg-color' : 'light-custom-bg-color'
          "
          class="text-xs text-gray-700 uppercase dark:text-gray-200"
        >
          <tr>
            <th
              scope="col"
              class="px-4 py-3 text-gray-700 sm:px-6 dark:text-gray-200"
            >
              Name
            </th>
            <th scope="col" class="px-3 py-3 sm:px-6">
              <div class="flex mt-1 ml-0 lg:ml-20">
                <img
                  alt="User avatar"
                  v-if="currentManager1.avatarImg"
                  class="w-8 h-8 -mt-0.5 rounded-full"
                  :src="currentManager1.avatarImg"
                />
                <svg
                  v-else
                  class="w-8 h-8 -mt-0.5 text-gray-800 dark:text-white"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z"
                  />
                </svg>
                <form class="max-w-sm ml-2">
                  <select
                    id="underline_select"
                    v-model="manager1"
                    class="block py-1.5 px-0 w-32 md:w-40 lg:w-48 xl:w-60 truncate text-base text-gray-700 bg-transparent border-0 border-b-2 border-gray-200 appearance-none dark:text-gray-200 dark:border-gray-500 focus:outline-none focus:ring-0 focus:border-gray-200 peer -mt-2 ml-2"
                  >
                    <option v-for="manager in managers" :value="manager">
                      {{ manager }}
                    </option>
                  </select>
                </form>
              </div>
            </th>
            <th scope="col" class="px-3 py-3 sm:px-6">
              <div class="flex mt-1 ml-0 lg:ml-20">
                <img
                  alt="User avatar"
                  v-if="currentManager2.avatarImg"
                  class="w-8 h-8 -mt-0.5 rounded-full"
                  :src="currentManager2.avatarImg"
                />
                <svg
                  v-else
                  class="w-8 h-8 -mt-0.5 text-gray-800 dark:text-white"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z"
                  />
                </svg>
                <form class="max-w-sm ml-2">
                  <select
                    id="underline_select"
                    v-model="manager2"
                    class="block py-1.5 px-0 w-32 md:w-40 lg:w-48 xl:w-60 truncate text-base text-gray-700 bg-transparent border-0 border-b-2 border-gray-200 appearance-none dark:text-gray-200 dark:border-gray-500 focus:outline-none focus:ring-0 focus:border-gray-200 peer -mt-2 ml-2"
                  >
                    <option v-for="manager in managers" :value="manager">
                      {{ manager }}
                    </option>
                  </select>
                </form>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr class="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
            <th
              scope="row"
              class="px-4 py-4 font-medium text-gray-900 sm:px-6 whitespace-nowrap dark:text-white"
            >
              Championships
            </th>
            <td
              class="px-3 py-4 sm:px-6"
              :class="{
                'font-semibold text-gray-800 dark:text-gray-200 bg-blue-100 dark:bg-blue-800':
                  manager1Champs,
              }"
            >
              <p class="text-center">
                {{
                  currentManager1.leagueWinner.filter(
                    (item: any) => item === currentManager1.rosterId
                  ).length
                }}
              </p>
            </td>
            <td
              class="px-3 py-4 sm:px-6"
              :class="{
                'font-semibold text-gray-800 dark:text-gray-200 bg-blue-100 dark:bg-blue-800':
                  manager2Champs,
              }"
            >
              <p class="text-center">
                {{
                  currentManager2.leagueWinner.filter(
                    (item: any) => item === currentManager2.rosterId
                  ).length
                }}
              </p>
            </td>
          </tr>
          <tr class="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
            <th
              scope="row"
              class="px-3 py-4 font-medium text-gray-900 sm:px-6 whitespace-nowrap dark:text-white"
            >
              Record
            </th>
            <td
              class="px-3 py-4 sm:px-6"
              :class="{
                'font-semibold text-gray-800 dark:text-gray-200 bg-blue-100 dark:bg-blue-800':
                  currentManager1.wins /
                    (currentManager1.losses + currentManager1.wins) >
                  currentManager2.wins /
                    (currentManager2.losses + currentManager2.wins),
              }"
            >
              <p class="text-center">
                {{ `${currentManager1.wins}-${currentManager1.losses}` }}
              </p>
            </td>
            <td
              class="px-3 py-4 sm:px-6"
              :class="{
                'font-semibold text-gray-800 dark:text-gray-200 bg-blue-100 dark:bg-blue-800':
                  currentManager1.wins /
                    (currentManager1.losses + currentManager1.wins) <
                  currentManager2.wins /
                    (currentManager2.losses + currentManager2.wins),
              }"
            >
              <p class="text-center">
                {{ `${currentManager2.wins}-${currentManager2.losses}` }}
              </p>
            </td>
          </tr>
          <tr class="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
            <th
              scope="row"
              class="px-3 py-4 font-medium text-gray-900 sm:px-6 whitespace-nowrap dark:text-white"
            >
              Total points
            </th>
            <td
              class="px-3 py-4 sm:px-6"
              :class="{
                'font-semibold text-gray-800 dark:text-gray-200 bg-blue-100 dark:bg-blue-800':
                  currentManager1.points > currentManager2.points,
              }"
            >
              <p class="text-center">{{ currentManager1.points }}</p>
            </td>
            <td
              class="px-3 py-4 sm:px-6"
              :class="{
                'font-semibold text-gray-800 dark:text-gray-200 bg-blue-100 dark:bg-blue-800':
                  currentManager1.points < currentManager2.points,
              }"
            >
              <p class="text-center">{{ currentManager2.points }}</p>
            </td>
          </tr>
          <tr class="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
            <th
              scope="row"
              class="px-3 py-4 font-medium text-gray-900 sm:px-6 whitespace-nowrap dark:text-white"
            >
              Points per game
            </th>
            <td
              class="px-3 py-4 sm:px-6"
              :class="{
                'font-semibold text-gray-800 dark:text-gray-200 bg-blue-100 dark:bg-blue-800':
                  currentManager1.points /
                    (currentManager1.wins + currentManager1.losses) >
                  currentManager2.points /
                    (currentManager2.wins + currentManager2.losses),
              }"
            >
              <p class="text-center">
                {{
                  Math.round(
                    (currentManager1.points /
                      (currentManager1.wins + currentManager1.losses)) *
                      100
                  ) / 100
                }}
              </p>
            </td>
            <td
              class="px-3 py-4 sm:px-6"
              :class="{
                'font-semibold text-gray-800 dark:text-gray-200 bg-blue-100 dark:bg-blue-800':
                  currentManager1.points /
                    (currentManager1.wins + currentManager1.losses) <
                  currentManager2.points /
                    (currentManager2.wins + currentManager2.losses),
              }"
            >
              <p class="text-center">
                {{
                  Math.round(
                    (currentManager2.points /
                      (currentManager2.wins + currentManager2.losses)) *
                      100
                  ) / 100
                }}
              </p>
            </td>
          </tr>
          <tr class="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
            <th
              scope="row"
              class="px-3 py-4 font-medium text-gray-900 sm:px-6 whitespace-nowrap dark:text-white"
            >
              Wins above expected
            </th>
            <td class="px-3 py-4 sm:px-6">
              <p class="text-center">
                {{
                  (
                    currentManager1.wins - currentManager1.randomScheduleWins
                  ).toFixed(2)
                }}
              </p>
            </td>
            <td class="px-3 py-4 sm:px-6">
              <p class="text-center">
                {{
                  (
                    currentManager2.wins - currentManager2.randomScheduleWins
                  ).toFixed(2)
                }}
              </p>
            </td>
          </tr>
          <tr class="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
            <th
              scope="row"
              class="px-3 py-4 font-medium text-gray-900 sm:px-6 whitespace-nowrap dark:text-white"
            >
              Manager efficiency
            </th>
            <td
              class="px-3 py-4 sm:px-6"
              :class="{
                'font-semibold text-gray-800 dark:text-gray-200 bg-blue-100 dark:bg-blue-800':
                  currentManager1.managerEfficiency /
                    currentManager1.seasons.length >
                  currentManager2.managerEfficiency /
                    currentManager2.seasons.length,
              }"
            >
              <p class="text-center">
                {{
                  (
                    (currentManager1.managerEfficiency /
                      currentManager1.seasons.length) *
                    100
                  ).toFixed(1)
                }}%
              </p>
            </td>
            <td
              class="px-3 py-4 sm:px-6"
              :class="{
                'font-semibold text-gray-800 dark:text-gray-200 bg-blue-100 dark:bg-blue-800':
                  currentManager1.managerEfficiency /
                    currentManager1.seasons.length <
                  currentManager2.managerEfficiency /
                    currentManager2.seasons.length,
              }"
            >
              <p class="text-center">
                {{
                  (
                    (currentManager2.managerEfficiency /
                      currentManager2.seasons.length) *
                    100
                  ).toFixed(1)
                }}%
              </p>
            </td>
          </tr>
          <tr class="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
            <th
              scope="row"
              class="px-3 py-4 font-medium text-gray-900 sm:px-6 whitespace-nowrap dark:text-white"
            >
              H2H
            </th>
            <td
              class="px-3 py-4 sm:px-6"
              :class="{
                'font-semibold text-gray-800 dark:text-gray-200 bg-blue-100 dark:bg-blue-800':
                  Number(matchupRecord[0]) > Number(matchupRecord2[0]),
              }"
            >
              <p class="text-center">
                {{ matchupRecord }}
              </p>
            </td>
            <td
              class="px-3 py-4 sm:px-6"
              :class="{
                'font-semibold text-gray-800 dark:text-gray-200 bg-blue-100 dark:bg-blue-800':
                  Number(matchupRecord[0]) < Number(matchupRecord2[0]),
              }"
            >
              <p class="text-center">
                {{ matchupRecord2 }}
              </p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p
      class="mt-4 mb-8 ml-3 font-semibold text-gray-700 sm:ml-6 sm:mb-0 dark:text-gray-200"
    >
      Recent Performances
    </p>
    <apexchart
      class="mt-4"
      type="line"
      height="350"
      :options="chartOptions"
      :series="seriesData"
    ></apexchart>
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
