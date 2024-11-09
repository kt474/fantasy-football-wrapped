<script setup lang="ts">
import { computed } from "vue";
import { useStore } from "../../store/store";

const store = useStore();
const props = defineProps<{
  tableData: any[];
}>();

const matchupData = computed(() => {
  const records: any = {};
  props.tableData.forEach(
    (user) => (records[user.id] = { wins: 0, losses: 0 })
  );

  // Loop through each week
  const numWeeks = users[0].matchups.length;
  for (let week = 0; week < numWeeks; week++) {
    // Temporary storage to find matchups for this week
    const weeklyMatchups = {};

    // Group users by matchup number for this week
    users.forEach((user) => {
      const matchup = user.matchups[week];
      const points = user.points[week];
      if (!weeklyMatchups[matchup]) {
        weeklyMatchups[matchup] = [];
      }
      weeklyMatchups[matchup].push({ id: user.id, points });
    });

    // Compare points within each matchup
    for (const matchup in weeklyMatchups) {
      const [user1, user2] = weeklyMatchups[matchup];
      if (user1.points > user2.points) {
        records[user1.id].wins += 1;
        records[user2.id].losses += 1;
      } else if (user2.points > user1.points) {
        records[user2.id].wins += 1;
        records[user1.id].losses += 1;
      }
      // If points are equal, it's a tie (optionally handle if needed)
    }
  }
});
</script>
<template>
  <div
    :class="store.darkMode ? 'dark-custom-bg-color' : 'light-custom-bg-color'"
    class="relative w-full overflow-x-auto bg-gray-100 rounded-lg shadow-md dark:bg-gray-700"
  >
    <table
      class="w-full text-sm text-left text-gray-500 rtl:text-right dark:text-gray-300"
    >
      <thead
        :class="
          store.darkMode ? 'dark-custom-bg-color' : 'light-custom-bg-color'
        "
        class="text-xs text-gray-700 uppercase dark:text-gray-300"
      >
        <tr>
          <th scope="col" class="px-2 py-3 sm:px-6 w-60 dark:text-gray-200">
            Team Name
          </th>
          <th v-for="item in props.tableData" scope="col" class="px-2 py-3">
            <div class="flex items-center cursor-pointer dark:text-gray-200">
              {{ item.name }}
            </div>
          </th>
          <th
            scope="col"
            class="py-3 pl-3 pr-3 sm:pr-0 md:pl-10 lg:pl-20 xl:pl-52"
          >
            Total
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
            class="px-2 font-medium text-gray-900 truncate sm:px-6 max-w-52 whitespace-nowrap dark:text-white"
          >
            {{ item.name }}
          </th>
          <!-- <td v-for="i in playoffTeams" class="px-2 py-3"></td> -->
          <td
            class="py-3 pl-3 pr-0 border-l sm:pr-3 md:pl-10 lg:pl-20 xl:pl-52 dark:bg-gray-800 dark:border-gray-700"
          ></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
