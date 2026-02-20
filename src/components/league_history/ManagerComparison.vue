<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useStore } from "../../store/store";
import Card from "../ui/card/Card.vue";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectItem,
  SelectValue,
} from "../ui/select";

const store = useStore();
const manager1 = ref("");
const manager2 = ref("");

const props = defineProps<{
  tableData: any[];
}>();

const managers = computed(() => {
  return props.tableData.map((user) =>
    store.showUsernames ? user.username : user.name
  );
});

const currentManager1 = computed(() => {
  return props.tableData.find((user) =>
    store.showUsernames
      ? user.username.trim() === manager1.value.trim()
      : user.name.trim() === manager1.value.trim()
  );
});

const currentManager2 = computed(() => {
  return props.tableData.find((user) =>
    store.showUsernames
      ? user.username.trim() === manager2.value.trim()
      : user.name.trim() === manager2.value.trim()
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
      name: store.showUsernames
        ? currentManager1.value.username
        : currentManager1.value.name,
      data:
        currentManager1.value.pointSeason[0].points.length > 0
          ? currentManager1.value.pointSeason[0].points
          : currentManager1.value.pointSeason[1]
            ? currentManager1.value.pointSeason[1].points
            : [],
    },
    {
      name: store.showUsernames
        ? currentManager2.value.username
        : currentManager2.value.name,
      data:
        currentManager2.value.pointSeason[0].points.length > 0
          ? currentManager2.value.pointSeason[0].points
          : currentManager2.value.pointSeason[1]
            ? currentManager2.value.pointSeason[1].points
            : [],
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

watch([() => store.currentLeagueId, () => store.darkMode], () =>
  updateChartColor()
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
  <Card v-if="manager1 && manager2" class="w-full p-4 md:p-6">
    <h5 class="-mt-1.5 mb-4 text-2xl font-bold sm:text-3xl">
      Manager Comparison
    </h5>
    <div class="relative overflow-x-auto rounded-lg">
      <table class="w-full min-w-[648px] text-sm text-left rtl:text-right">
        <thead class="text-xs uppercase bg-secondary">
          <tr>
            <th scope="col" class="px-4 py-3 sm:px-6">Name</th>
            <th scope="col" class="px-3 py-3 sm:px-6">
              <div class="flex mt-1 ml-0 lg:ml-20">
                <img
                  alt="User avatar"
                  v-if="currentManager1.avatarImg"
                  class="w-8 h-8 rounded-full"
                  :src="currentManager1.avatarImg"
                />
                <svg
                  v-else
                  class="w-8 h-8"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z"
                  />
                </svg>
                <Select v-model="manager1">
                  <SelectTrigger class="ml-2 w-52">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="manager in managers"
                      :key="manager"
                      :value="manager"
                    >
                      {{ manager }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </th>
            <th scope="col" class="px-3 py-3 sm:px-6">
              <div class="flex mt-1 ml-0 lg:ml-20">
                <img
                  alt="User avatar"
                  v-if="currentManager2.avatarImg"
                  class="w-8 h-8 rounded-full"
                  :src="currentManager2.avatarImg"
                />
                <svg
                  v-else
                  class="w-8 h-8"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z"
                  />
                </svg>
                <Select v-model="manager2">
                  <SelectTrigger class="ml-2 w-52">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="manager in managers"
                      :key="manager"
                      :value="manager"
                    >
                      {{ manager }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr class="border-b">
            <th
              scope="row"
              class="px-4 py-4 font-medium sm:px-6 whitespace-nowrap"
            >
              Championships
            </th>
            <td
              class="px-3 py-4 sm:px-6"
              :class="{
                'font-semibold text-primary': manager1Champs,
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
                'font-semibold text-primary': manager2Champs,
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
          <tr class="border-b">
            <th
              scope="row"
              class="px-3 py-4 font-medium sm:px-6 whitespace-nowrap"
            >
              Record
            </th>
            <td
              class="px-3 py-4 sm:px-6"
              :class="{
                'font-semibold text-primary':
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
                'font-semibold text-primary':
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
          <tr class="border-b">
            <th
              scope="row"
              class="px-3 py-4 font-medium sm:px-6 whitespace-nowrap"
            >
              Total points
            </th>
            <td
              class="px-3 py-4 sm:px-6"
              :class="{
                'font-semibold text-primary':
                  currentManager1.points > currentManager2.points,
              }"
            >
              <p class="text-center">{{ currentManager1.points }}</p>
            </td>
            <td
              class="px-3 py-4 sm:px-6"
              :class="{
                'font-semibold text-primary':
                  currentManager1.points < currentManager2.points,
              }"
            >
              <p class="text-center">{{ currentManager2.points }}</p>
            </td>
          </tr>
          <tr class="border-b">
            <th
              scope="row"
              class="px-3 py-4 font-medium sm:px-6 whitespace-nowrap"
            >
              Points per game
            </th>
            <td
              class="px-3 py-4 sm:px-6"
              :class="{
                'font-semibold text-primary':
                  currentManager1.points /
                    (currentManager1.wins + currentManager1.losses) >
                  currentManager2.points /
                    (currentManager2.wins + currentManager2.losses),
              }"
            >
              <p class="text-center">
                {{
                  currentManager1.wins + currentManager1.losses > 0
                    ? Math.round(
                        (currentManager1.points /
                          (currentManager1.wins + currentManager1.losses)) *
                          100
                      ) / 100
                    : 0
                }}
              </p>
            </td>
            <td
              class="px-3 py-4 sm:px-6"
              :class="{
                'font-semibold text-primary':
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
          <tr class="border-b">
            <th
              scope="row"
              class="px-3 py-4 font-medium sm:px-6 whitespace-nowrap"
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
          <tr class="border-b">
            <th
              scope="row"
              class="px-3 py-4 font-medium sm:px-6 whitespace-nowrap"
            >
              Manager efficiency
            </th>
            <td
              class="px-3 py-4 sm:px-6"
              :class="{
                'font-semibold text-primary':
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
                'font-semibold text-primary':
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
          <tr class="border-b">
            <th
              scope="row"
              class="px-3 py-4 font-medium sm:px-6 whitespace-nowrap"
            >
              H2H
            </th>
            <td
              class="px-3 py-4 sm:px-6"
              :class="{
                'font-semibold text-primary':
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
                'font-semibold':
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
    <p class="mt-4 mb-8 ml-3 font-semibold sm:ml-6 sm:mb-0">
      Recent Performances
    </p>
    <apexchart
      class="mt-4"
      type="line"
      height="350"
      :options="chartOptions"
      :series="seriesData"
    ></apexchart>
  </Card>
</template>
