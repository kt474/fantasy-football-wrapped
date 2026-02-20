<script setup lang="ts">
import { computed } from "vue";
import { useStore } from "../../store/store";
import Card from "../ui/card/Card.vue";

const store = useStore();
const props = defineProps<{
  tableData: any[];
}>();

const mostPoints = computed(() => {
  const allPointsWithDetails = props.tableData.flatMap((obj) =>
    obj.pointSeason.flatMap((seasonObj: any) =>
      seasonObj.points
        .map((point: number, index: number) => ({
          week: index + 1,
          name: obj.name,
          username: obj.username,
          season: seasonObj.season,
          point,
        }))
        .filter((entry: any) => entry.point !== 0)
    )
  );

  const sortedPointsWithDetails = allPointsWithDetails.sort(
    (a, b) => a.point - b.point
  );

  return sortedPointsWithDetails.slice(0, 10);
});
</script>
<template>
  <Card class="relative w-full overflow-x-auto md:max-w-2xl">
    <p class="w-full pt-2 text-lg font-semibold text-center bg-secondary">
      All Time Weekly Low Score
    </p>
    <table class="w-full text-sm text-left rtl:text-right">
      <thead class="text-xs uppercase bg-secondary">
        <tr>
          <th scope="col" class="px-4 py-6 sm:px-6">Team Name</th>

          <th scope="col" class="px-2 py-3">
            <div class="flex items-center cursor-pointer max-w-24">Points</div>
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
        <tr v-for="(item, index) in mostPoints" :key="index" class="border-b">
          <th
            scope="row"
            class="px-4 font-medium truncate sm:px-6 max-w-36 sm:max-w-56 whitespace-nowrap"
          >
            {{ store.showUsernames ? item.username : item.name }}
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
  </Card>
</template>
<style scoped>
.light-custom-bg-color {
  background-color: #eff0f2;
}
.dark-custom-bg-color {
  background-color: #374151;
}
</style>
