<script setup lang="ts">
import { groupBy, flatten } from "lodash";
import { onMounted, computed, watch } from "vue";
import Table from "./components/Table.vue";
import Header from "./components/Header.vue";
import Footer from "./components/Footer.vue";
import Input from "./components/Input.vue";
import Intro from "./components/Intro.vue";
import Alert from "./components/Alert.vue";
import CardContainer from "./components/CardContainer.vue";
import {
  getRosters,
  getUsers,
  getMatchup,
  getAvatar,
  getLeague,
} from "./api/api";
import { fakePoints, fakeRosters, fakeUsers } from "./api/helper";
import { useStore } from "./store/store";
import { inject } from "@vercel/analytics";

const store = useStore();

onMounted(async () => {
  inject();
  setHtmlBackground();
  if (localStorage.leagueId) {
    const storedIds: string[] = JSON.parse(localStorage.leagueId);
    storedIds.forEach(async (id: string) => {
      store.updateLeagueId(id);
      const newLeagueInfo = await getLeague(id);
      store.updateLeagueInfo(newLeagueInfo);
    });
    await getAllData();
  }
});

const leagueUsers = computed(() => {
  return store.leagueUsers;
});
const leagueRosters = computed(() => {
  return store.leagueRosters;
});
const weeklyPoints = computed(() => {
  return store.weeklyPoints;
});

const darkMode = computed(() => {
  return store.darkMode;
});

const regularSeasonLength = computed(() => {
  return leagueInfoArray.value[0].regularSeasonLength;
});

const leagueId = computed(() => {
  return store.leagueId[0];
});

const leagueInfoArray = computed(() => {
  return store.leagueInfo;
});

const showAddedAlert = computed(() => {
  return store.showAddedAlert;
});
const showRemovedAlert = computed(() => {
  return store.showRemovedAlert;
});
const showInput = computed(() => {
  return store.showInput;
});

watch(
  () => leagueId.value,
  async () => {
    if (leagueId.value) {
      await getAllData();
    }
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
  store.leagueId.forEach(async (id: string) => {
    store.updateLeagueRosters(await getRosters(id));
    store.updateLeagueUsers(await getUsers(id));
    store.updateWeeklyPoints(await getWeeklyPoints(id));
    store.leagueUsers[0].forEach(async (user: any) => {
      if (user["avatar"] !== null) {
        user["avatarImg"] = await getAvatar(user["avatar"]);
      }
    });
  });
};

const getWeeklyPoints = async (leagueId: string) => {
  const allMatchups = [];
  for (let i: number = 0; i < regularSeasonLength.value; i++) {
    const singleWeek = await getMatchup(i + 1, leagueId);
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
    <div class="h-full overflow-auto bg-slate-50 dark:bg-slate-950">
      <Header />
      <div class="w-full border-b border-slate-200 dark:border-slate-600"></div>
      <div class="container w-11/12 max-w-screen-xl mx-auto">
        <div v-if="leagueId" class="container mx-auto">
          <Input v-if="showInput" />
          <div class="flex justify-between">
            <CardContainer />
          </div>
          <Table
            v-if="leagueUsers[0] && leagueRosters[0] && weeklyPoints[0]"
            :users="leagueUsers[0]"
            :rosters="leagueRosters[0]"
            :points="weeklyPoints[0]"
          />
        </div>
        <div v-else class="container mx-auto">
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
    <Alert v-if="showAddedAlert" alert-msg="League successfully added!" />
    <Alert v-if="showRemovedAlert" alert-msg="League removed!" />
  </div>
</template>

<style scoped></style>
