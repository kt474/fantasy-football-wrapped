<script setup lang="ts">
//@ts-ignore
import { groupBy, flatten } from "lodash";
import { onMounted, ref, computed } from "vue";
import Table from "./components/Table.vue";
import Header from "./components/Header.vue";
import Footer from "./components/Footer.vue";
import { getLeague, getRosters, getUsers, getMatchup } from "./api/api";
const leagueInfo = ref({ name: "", regularSeasonLength: 0 });
const leagueRosters = ref([]);
const leagueUsers = ref([]);
const weeklyPoints: any = ref([]);

onMounted(async () => {
  leagueInfo.value = await getLeague();
  leagueRosters.value = await getRosters();
  leagueUsers.value = await getUsers();
  weeklyPoints.value = await getWeeklyPoints();
});

const regularSeasonLength = computed(() => {
  return leagueInfo.value.regularSeasonLength;
});

const getWeeklyPoints = async () => {
  const allMatchups = [];
  for (let i: number = 0; i < regularSeasonLength.value; i++) {
    const singleWeek = await getMatchup(i + 1);
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
  <div class="bg-slate-50">
    <div class="container mx-auto">
      <Header />
      <h2 class="text-2xl font-semibold dark:text-white m-4">
        {{ leagueInfo["name"] }}
      </h2>
      <Table
        :users="leagueUsers"
        :rosters="leagueRosters"
        :points="weeklyPoints"
      />
      <Footer />
    </div>
  </div>
</template>

<style scoped></style>
