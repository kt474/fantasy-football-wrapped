<script setup lang="ts">
import { onMounted, computed, watch } from "vue";
import Table from "./components/Table.vue";
import Header from "./components/Header.vue";
import Footer from "./components/Footer.vue";
import Input from "./components/Input.vue";
import Intro from "./components/Intro.vue";
import Alert from "./components/Alert.vue";
import CardContainer from "./components/CardContainer.vue";
import { fakePoints, fakeRosters, fakeUsers } from "./api/helper";
import { useStore, LeagueInfoType } from "./store/store";
import { inject } from "@vercel/analytics";

const store = useStore();

onMounted(async () => {
  inject();
  setHtmlBackground();
  if (localStorage.leagueInfo) {
    const savedLeagues = JSON.parse(localStorage.leagueInfo);
    savedLeagues.forEach((league: LeagueInfoType) => {
      store.updateLeagueInfo(league);
    });
  }
});

const darkMode = computed(() => {
  return store.darkMode;
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
</script>

<template>
  <div :class="{ dark: darkMode }" class="h-screen">
    <div class="h-full overflow-auto bg-slate-50 dark:bg-slate-950">
      <Header />
      <div class="w-full border-b border-slate-200 dark:border-slate-600"></div>
      <div class="container w-11/12 max-w-screen-xl mx-auto">
        <div v-if="leagueInfoArray.length > 0" class="container mx-auto">
          <Input v-if="showInput" />
          <div class="flex justify-between">
            <CardContainer />
          </div>
          <Table
            v-if="
              store.leagueUsers[0] &&
              store.leagueRosters[0] &&
              store.weeklyPoints[0]
            "
            :users="store.leagueUsers[0]"
            :rosters="store.leagueRosters[0]"
            :points="store.weeklyPoints[0]"
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
