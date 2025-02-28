<script setup lang="ts">
import { computed } from "vue";
import { useStore } from "../../store/store";

const store = useStore();
const props = defineProps<{
  tableData: any[];
}>();

const matchupData = computed(() => {
  const result: any = [];
  props.tableData.forEach((user) => {
    const currentUser: any = [];
    user.matchups.forEach((matchupId: number, index: number) => {
      const opponentList = props.tableData.filter(
        (opp) => opp.matchups[index] == matchupId
      );
      const opponent = opponentList.find((opp) => opp.name != user.name);
      if (opponent) {
        if (!currentUser.map((opp: any) => opp.name).includes(opponent.name)) {
          if (user.pointsArr[index] > opponent.pointsArr[index]) {
            currentUser.push({
              name: opponent.name,
              record: { wins: 1, losses: 0 },
            });
          } else {
            currentUser.push({
              name: opponent.name,
              record: { losses: 1, wins: 0 },
            });
          }
        } else {
          if (user.pointsArr[index] > opponent.pointsArr[index]) {
            currentUser.find((opp: any) => opp.name == opponent.name)[
              "record"
            ].wins += 1;
          } else {
            currentUser.find((opp: any) => opp.name == opponent.name)[
              "record"
            ].losses += 1;
          }
        }
      }
    });
    result.push(currentUser);
  });
  return result;
});

const extractRecord = (user: any, opponent: any) => {
  const opp = user.find((opp: any) => opp.name == opponent.name);
  // This is backwards but the chart is read horizontally
  return opp ? `${opp.record.losses} - ${opp.record.wins}` : "0 - 0";
};
</script>
<template>
  <div>
    <div
      class="flex justify-between rounded-t-lg shadow-md"
      :class="store.darkMode ? 'dark-custom-bg-color' : 'light-custom-bg-color'"
    >
      <p
        class="w-full pt-2 text-lg font-semibold text-center text-gray-700 dark:text-gray-200"
      >
        All Time H2H Matchups
      </p>
    </div>
    <div
      :class="store.darkMode ? 'dark-custom-bg-color' : 'light-custom-bg-color'"
      class="relative w-full overflow-x-auto bg-gray-100 rounded-b-lg shadow-md dark:bg-gray-700"
    >
      <table
        class="w-full text-sm text-left text-gray-500 rtl:text-right dark:text-gray-200"
      >
        <thead
          :class="
            store.darkMode ? 'dark-custom-bg-color' : 'light-custom-bg-color'
          "
          class="text-xs text-gray-700 dark:text-gray-200"
        >
          <tr>
            <th
              scope="col"
              class="px-4 py-3 uppercase sm:px-6 w-60 dark:text-gray-200"
            >
              Team Name
            </th>
            <th v-for="item in props.tableData" scope="col" class="px-2 py-3">
              <div class="flex items-center dark:text-gray-200 min-w-14">
                {{ item.name ? item.name : "Ghost Roster" }}
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(item, index) in props.tableData"
            :key="index"
            class="bg-white border-b dark:bg-gray-800 dark:border-gray-700"
          >
            <th
              scope="row"
              class="px-4 font-medium text-gray-900 truncate sm:px-6 max-w-52 whitespace-nowrap dark:text-white"
            >
              {{ item.name ? item.name : "Ghost Roster" }}
            </th>
            <td
              v-for="(user, rowIndex) in matchupData"
              class="px-2 py-3.5"
              :class="{ 'bg-blue-100 dark:bg-blue-800': rowIndex == index }"
            >
              {{ extractRecord(user, item) }}
            </td>
          </tr>
        </tbody>
      </table>
      <p
        class="py-3 ml-2 text-xs text-gray-500 sm:ml-6 footer-font dark:text-gray-300"
      >
        Table is meant to be read horizontally. For each team/row, each
        opponent/column is the record the team has against that opponent.
      </p>
    </div>
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
