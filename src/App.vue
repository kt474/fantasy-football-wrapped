<script setup lang="ts">
import { groupBy, flatten } from "lodash";
import { onMounted, ref, computed, watch } from "vue";
import Table from "./components/Table.vue";
import Header from "./components/Header.vue";
import Footer from "./components/Footer.vue";
import Input from "./components/Input.vue";
import Intro from "./components/Intro.vue";
import LeagueCard from "./components/LeagueCard.vue";
import {
  getLeague,
  getRosters,
  getUsers,
  getMatchup,
  getAvatar,
} from "./api/api";
import { fakePoints, fakeRosters, fakeUsers } from "./api/helper";
import { useStore } from "./store/store";
import { inject } from "@vercel/analytics";

type LeagueInfo = {
  name: string;
  regularSeasonLength: number;
  rosters: number;
  season: string;
  seasonType: string;
};
const leagueInfo = ref({} as LeagueInfo);
const leagueRosters = ref([]);
const leagueUsers = ref([]);
const weeklyPoints: any = ref([]);
const store = useStore();

onMounted(async () => {
  inject();
  setHtmlBackground();
  if (localStorage.leagueId) {
    store.updateLeagueId(localStorage.leagueId);
    await getAllData();
  }
});

const darkMode = computed(() => {
  return store.darkMode;
});

const regularSeasonLength = computed(() => {
  return leagueInfo.value.regularSeasonLength;
});

const leagueId = computed(() => {
  return store.leagueId;
});

watch(
  () => leagueId.value,
  async () => {
    await getAllData();
  }
);

watch(
  () => darkMode.value,
  () => setHtmlBackground()
);

const setHtmlBackground = () => {
  const html = document.querySelector("html");
  if (html) {
    if (darkMode.value) {
      html.style.backgroundColor = "#020617";
    } else {
      html.style.backgroundColor = "#f8fafc";
    }
  }
};

const getAllData = async () => {
  leagueInfo.value = (await getLeague(leagueId.value)) as {
    name: string;
    regularSeasonLength: number;
    rosters: number;
    season: string;
    seasonType: string;
  };
  leagueRosters.value = await getRosters(leagueId.value);
  leagueUsers.value = await getUsers(leagueId.value);
  weeklyPoints.value = await getWeeklyPoints();
  leagueUsers.value.forEach(async (user: any) => {
    if (user["avatar"] !== null) {
      user["avatarImg"] = await getAvatar(user["avatar"]);
    }
  });
};

const getWeeklyPoints = async () => {
  const allMatchups = [];
  for (let i: number = 0; i < regularSeasonLength.value; i++) {
    const singleWeek = await getMatchup(i + 1, leagueId.value);
    allMatchups.push(singleWeek);
  }

  const grouped = Object.values(groupBy(flatten(allMatchups), "rosterId"));
  const allTeams: Array<object> = [];
  grouped.forEach((group: any) => {
    let consolidatedObject: Record<
      number,
      { rosterId: number; points: number[] }
    > = group.reduce(
      (
        result: any,
        { rosterId, points }: { rosterId: number; points: number }
      ) => {
        if (!result[rosterId]) {
          result[rosterId] = { rosterId, points: [] };
        }
        result[rosterId].points.push(points);
        return result;
      },
      {}
    );
    allTeams.push(Object.values(consolidatedObject)[0]);
  });
  return allTeams;
};
</script>

<template>
  <div :class="{ dark: darkMode }" class="h-screen">
    <div class="bg-slate-50 dark:bg-slate-950 overflow-auto h-full">
      <Header />
      <div class="w-full border-b border-slate-200 dark:border-slate-600"></div>
      <div class="container mx-auto w-11/12 max-w-screen-xl">
        <div v-if="leagueId">
          <LeagueCard :league-info="leagueInfo" />
          <Table
            :users="leagueUsers"
            :rosters="leagueRosters"
            :points="weeklyPoints"
          />
        </div>
        <div v-else>
          <Intro />
          <Input />
          <Table
            :users="fakeUsers"
            :rosters="fakeRosters"
            :points="fakePoints"
          />
        </div>
        <Footer />
      </div>
    </div>
  </div>
</template>

<style scoped></style>
