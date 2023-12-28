<script setup lang="ts">
//@ts-ignore
import { groupBy, flatten } from "lodash";
import { onMounted, ref, computed, watch } from "vue";
import Table from "./components/Table.vue";
import Header from "./components/Header.vue";
import Footer from "./components/Footer.vue";
import Input from "./components/Input.vue";
import Intro from "./components/Intro.vue";
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
const leagueInfo = ref({ name: "", regularSeasonLength: 0 });
const leagueRosters = ref([]);
const leagueUsers = ref([]);
const weeklyPoints: any = ref([]);
const store = useStore();

onMounted(async () => {
  inject();
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

const getAllData = async () => {
  //@ts-ignore TODO fix this
  leagueInfo.value = await getLeague(leagueId.value);
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
    <div class="bg-slate-50 dark:bg-slate-800 overflow-auto h-full">
      <div class="container mx-auto">
        <Header />
        <Input />
        <h2 class="text-2xl font-medium dark:text-white m-4">
          {{ leagueInfo["name"] }}
        </h2>
        <Table
          v-if="leagueId"
          :users="leagueUsers"
          :rosters="leagueRosters"
          :points="weeklyPoints"
        />
        <div v-else>
          <Intro />
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
