<script setup lang="ts">
//@ts-ignore
import { mean, max, min } from "lodash";
import { computed, ref } from "vue";
const tableOrder = ref("");
const props = defineProps<{
  users: Array<object>;
  rosters: Array<object>;
  points: Array<object>;
}>();

const originalData = computed(() => {
  const combined = props.users.map((a: any) => ({
    ...a,
    ...props.rosters.find((b: any) => b.id === a.id),
  }));
  const combinedPoints = combined.map((a: any) => ({
    ...a,
    ...props.points.find((b: any) => b.rosterId === a.rosterId),
  }));

  combinedPoints.forEach((value: any) => {
    value["rating"] = powerRanking(
      mean(value.points),
      max(value.points),
      min(value.points),
      value.wins / (value.wins + value.losses)
    );
  });
  return combinedPoints.sort((a: any, b: any) => {
    if (a.wins !== b.wins) {
      return b.wins - a.wins;
    }
    return b.pointsFor - a.pointsFor;
  });
});

const tableData: any = computed(() => {
  if (tableOrder.value === "wins") {
    return tableData.value.sort((a: any, b: any) => {
      if (a.wins !== b.wins) {
        return b.wins - a.wins;
      }
      return b.pointsFor - a.pointsFor;
    });
  } else if (tableOrder.value === "points") {
    return tableData.value.sort((a: any, b: any) => {
      return b.pointsFor - a.pointsFor;
    });
  } else if (tableOrder.value === "pointsAgainst") {
    return tableData.value.sort((a: any, b: any) => {
      return b.pointsAgainst - a.pointsAgainst;
    });
  } else if (tableOrder.value === "rating") {
    return tableData.value.sort((a: any, b: any) => {
      return b.rating - a.rating;
    });
  }
  return originalData.value;
});

const powerRanking = (
  avgScore: number,
  highScore: number,
  lowScore: number,
  winPercentage: number
) => {
  return (
    (avgScore * 6 + (highScore + lowScore) * 2 + winPercentage * 400) /
    10
  ).toFixed(2);
};
</script>
<template>
  <h2 class="text-2xl font-bold dark:text-white mb-4">Power Rankings</h2>
  <div class="relative overflow-x-auto shadow-md sm:rounded-lg">
    <table
      class="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400"
    >
      <thead
        class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400"
      >
        <tr>
          <th scope="col" class="px-6 py-3">Team name</th>
          <th scope="col" class="px-6 py-3">
            <div class="flex items-center">
              Record
              <a class="cursor-pointer" @click="tableOrder = 'wins'"
                ><svg
                  class="w-3 h-3 ms-1.5"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M8.574 11.024h6.852a2.075 2.075 0 0 0 1.847-1.086 1.9 1.9 0 0 0-.11-1.986L13.736 2.9a2.122 2.122 0 0 0-3.472 0L6.837 7.952a1.9 1.9 0 0 0-.11 1.986 2.074 2.074 0 0 0 1.847 1.086Zm6.852 1.952H8.574a2.072 2.072 0 0 0-1.847 1.087 1.9 1.9 0 0 0 .11 1.985l3.426 5.05a2.123 2.123 0 0 0 3.472 0l3.427-5.05a1.9 1.9 0 0 0 .11-1.985 2.074 2.074 0 0 0-1.846-1.087Z"
                  /></svg
              ></a>
            </div>
          </th>
          <th scope="col" class="px-6 py-3">
            <div class="flex items-center">
              Points
              <a class="cursor-pointer" @click="tableOrder = 'points'"
                ><svg
                  class="w-3 h-3 ms-1.5"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M8.574 11.024h6.852a2.075 2.075 0 0 0 1.847-1.086 1.9 1.9 0 0 0-.11-1.986L13.736 2.9a2.122 2.122 0 0 0-3.472 0L6.837 7.952a1.9 1.9 0 0 0-.11 1.986 2.074 2.074 0 0 0 1.847 1.086Zm6.852 1.952H8.574a2.072 2.072 0 0 0-1.847 1.087 1.9 1.9 0 0 0 .11 1.985l3.426 5.05a2.123 2.123 0 0 0 3.472 0l3.427-5.05a1.9 1.9 0 0 0 .11-1.985 2.074 2.074 0 0 0-1.846-1.087Z"
                  /></svg
              ></a>
            </div>
          </th>
          <th scope="col" class="px-6 py-3">
            <div class="flex items-center">
              Points Against
              <a class="cursor-pointer" @click="tableOrder = 'pointsAgainst'"
                ><svg
                  class="w-3 h-3 ms-1.5"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M8.574 11.024h6.852a2.075 2.075 0 0 0 1.847-1.086 1.9 1.9 0 0 0-.11-1.986L13.736 2.9a2.122 2.122 0 0 0-3.472 0L6.837 7.952a1.9 1.9 0 0 0-.11 1.986 2.074 2.074 0 0 0 1.847 1.086Zm6.852 1.952H8.574a2.072 2.072 0 0 0-1.847 1.087 1.9 1.9 0 0 0 .11 1.985l3.426 5.05a2.123 2.123 0 0 0 3.472 0l3.427-5.05a1.9 1.9 0 0 0 .11-1.985 2.074 2.074 0 0 0-1.846-1.087Z"
                  /></svg
              ></a>
            </div>
          </th>
          <th scope="col" class="px-6 py-3">
            <div class="flex items-center">
              Rating
              <a class="cursor-pointer" @click="tableOrder = 'rating'"
                ><svg
                  class="w-3 h-3 ms-1.5"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M8.574 11.024h6.852a2.075 2.075 0 0 0 1.847-1.086 1.9 1.9 0 0 0-.11-1.986L13.736 2.9a2.122 2.122 0 0 0-3.472 0L6.837 7.952a1.9 1.9 0 0 0-.11 1.986 2.074 2.074 0 0 0 1.847 1.086Zm6.852 1.952H8.574a2.072 2.072 0 0 0-1.847 1.087 1.9 1.9 0 0 0 .11 1.985l3.426 5.05a2.123 2.123 0 0 0 3.472 0l3.427-5.05a1.9 1.9 0 0 0 .11-1.985 2.074 2.074 0 0 0-1.846-1.087Z"
                  /></svg
              ></a>
            </div>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(item, index) in tableData"
          :key="index"
          class="odd:bg-white odd:dark:bg-gray-900 even:bg-gray-50 even:dark:bg-gray-800 border-b dark:border-gray-700"
        >
          <th
            scope="row"
            class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white"
          >
            {{ item.name }}
          </th>
          <td class="px-6 py-4">{{ item.wins }} - {{ item.losses }}</td>
          <td class="px-6 py-4">{{ item.pointsFor }}</td>
          <td class="px-6 py-4">{{ item.pointsAgainst }}</td>
          <td class="px-6 py-4">
            {{ item.rating }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
