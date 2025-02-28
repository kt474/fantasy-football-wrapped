<script setup lang="ts">
import { computed } from "vue";
import { useStore } from "../../store/store";

const store = useStore();
const props = defineProps<{
  tableData: any[];
}>();

const mostPoints = computed(() => {
  const allPointsWithDetails = props.tableData.flatMap((obj) =>
    obj.pointSeason.flatMap((seasonObj: any) =>
      seasonObj.points.map((point: number, index: number) => ({
        week: index + 1,
        name: obj.name,
        season: seasonObj.season,
        point,
      }))
    )
  );

  const sortedPointsWithDetails = allPointsWithDetails.sort(
    (a, b) => b.point - a.point
  );

  return sortedPointsWithDetails.slice(0, 10);
});
</script>
<template>
  <div
    class="relative w-full overflow-x-auto rounded-lg shadow-md md:max-w-2xl"
    :class="store.darkMode ? 'dark-custom-bg-color' : 'light-custom-bg-color'"
  >
    <p
      class="w-full pt-2 text-lg font-semibold text-center text-gray-700 dark:text-gray-200"
    >
      All Time Weekly High Score
    </p>
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
          <th scope="col" class="px-4 py-6 sm:px-6 dark:text-gray-200">
            Team Name
          </th>

          <th scope="col" class="px-2 py-3">
            <div
              class="flex items-center cursor-pointer max-w-24 dark:text-gray-200"
            >
              Points
            </div>
          </th>
          <th scope="col" class="px-1 py-3">
            <div>Season</div>
          </th>
          <th scope="col" class="px-1 py-3">
            <div>Week</div>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(item, index) in mostPoints"
          :key="index"
          class="bg-white border-b dark:bg-gray-800 dark:border-gray-700"
        >
          <th
            scope="row"
            class="px-4 font-medium text-gray-900 truncate sm:px-6 max-w-36 sm:max-w-56 whitespace-nowrap dark:text-white"
          >
            {{ item.name }}
          </th>
          <td class="px-2 py-3.5">
            {{ item.point }}
          </td>
          <td class="px-2 py-3.5">
            {{ item.season }}
          </td>
          <td class="px-4 py-3.5">
            {{ item.week }}
          </td>
        </tr>
      </tbody>
    </table>
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
