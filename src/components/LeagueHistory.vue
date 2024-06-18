<script setup lang="ts">
// import { ref, onMounted } from "vue";
// import { TableDataType } from "../api/types";
// import { useStore } from "../store/store";
// import { getData } from "../api/api";

// const store = useStore();
// const props = defineProps<{
//   tableData: TableDataType[];
// }>();

// const previousLeagues = ref([] as TableDataType[]);

// const checkPreviousLeagues = async (leagueId: string) => {
//   const leagueData = await getData(leagueId);
//   previousLeagues.value.push(leagueData);
//   if (leagueData.previousLeagueId) {
//     await checkPreviousLeagues(leagueData.previousLeagueId);
//   }
// };

// const getPreviousLeagues = async () => {
//   const previousLeagueId =
//     store.leagueInfo[store.currentLeagueIndex].previousLeagueId;

//   if (previousLeagueId) {
//     await checkPreviousLeagues(previousLeagueId);
//   }
// };

// onMounted(async () => {
//   getPreviousLeagues();
// });
</script>
<template>
  <p class="h-screen m-2 dark:text-white">Coming soon</p>
</template>
