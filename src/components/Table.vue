<script setup lang="ts">
//@ts-ignore
import { mean, max, min, zip, countBy, maxBy, minBy } from "lodash";
import { getPowerRanking, getMedian } from "../api/helper";
import { computed, ref } from "vue";
const tableOrder = ref("wins");
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
    value["rating"] = getPowerRanking(
      mean(value.points),
      // @ts-ignore
      max(value.points),
      min(value.points),
      value.wins / (value.wins + value.losses)
    );
  });

  const pointsArr: any = [];
  combinedPoints.forEach((value: any) => {
    pointsArr.push(value.points);
  });
  const zipped = zip(...pointsArr);
  const medians: number[] = [];
  zipped.forEach((value: any) => {
    medians.push(Number(getMedian(value)?.toFixed(2)));
  });

  combinedPoints.forEach((value: any) => {
    const pairs = zip(value.points, medians);
    const counts = countBy(pairs, ([a, b]: [number, number]) => a > b);
    value["winsWithMedian"] = counts[true] + value.wins;
    value["lossesWithMedian"] = counts[false] + value.losses;
  });

  const result = combinedPoints.sort((a: any, b: any) => {
    if (a.wins !== b.wins) {
      return b.wins - a.wins;
    }
    return b.pointsFor - a.pointsFor;
  });
  return result;
});

// sorted version of originalData
const tableData: any = computed(() => {
  if (tableOrder.value === "wins") {
    return originalData.value.sort((a: any, b: any) => {
      if (a.wins !== b.wins) {
        return b.wins - a.wins;
      }
      return b.pointsFor - a.pointsFor;
    });
  } else if (tableOrder.value === "points") {
    return originalData.value.sort((a: any, b: any) => {
      return b.pointsFor - a.pointsFor;
    });
  } else if (tableOrder.value === "pointsAgainst") {
    return originalData.value.sort((a: any, b: any) => {
      return b.pointsAgainst - a.pointsAgainst;
    });
  } else if (tableOrder.value === "rating") {
    return originalData.value.sort((a: any, b: any) => {
      return b.rating - a.rating;
    });
  } else if (tableOrder.value === "medianRecord") {
    return originalData.value.sort((a: any, b: any) => {
      if (a.winsWithMedian !== b.winsWithMedian) {
        return b.winsWithMedian - a.winsWithMedian;
      }
      return b.pointsFor - a.pointsFor;
    });
  }
});

const mostWins = computed(() => {
  return maxBy(originalData.value, "wins")?.wins;
});

const mostLosses = computed(() => {
  return maxBy(originalData.value, "losses")?.losses;
});

const mostPoints = computed(() => {
  return maxBy(originalData.value, "pointsFor")?.pointsFor;
});
const leastPoints = computed(() => {
  return minBy(originalData.value, "pointsFor")?.pointsFor;
});
const mostPointsAgainst = computed(() => {
  return maxBy(originalData.value, "pointsAgainst")?.pointsAgainst;
});
const leastPointsAgainst = computed(() => {
  return minBy(originalData.value, "pointsAgainst")?.pointsAgainst;
});
const highestRating = computed(() => {
  return maxBy(originalData.value, "rating")?.rating;
});
const lowestRating = computed(() => {
  return minBy(originalData.value, "rating")?.rating;
});
const mostMedianWins = computed(() => {
  return maxBy(originalData.value, "winsWithMedian")?.winsWithMedian;
});
const mostMedianLosses = computed(() => {
  return maxBy(originalData.value, "lossesWithMedian")?.lossesWithMedian;
});
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
                  :class="{ 'fill-blue-500': tableOrder == 'wins' }"
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
                  :class="{ 'fill-blue-500': tableOrder == 'points' }"
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
                  :class="{ 'fill-blue-500': tableOrder == 'pointsAgainst' }"
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
                  :class="{ 'fill-blue-500': tableOrder == 'rating' }"
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
              Median Record
              <a class="cursor-pointer" @click="tableOrder = 'medianRecord'"
                ><svg
                  class="w-3 h-3 ms-1.5"
                  :class="{ 'fill-blue-500': tableOrder == 'medianRecord' }"
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
          <td
            class="px-6 py-4"
            :class="{
              'text-blue-500 font-semibold': item.wins === mostWins,
              'text-red-500 font-semibold': item.losses === mostLosses,
            }"
          >
            {{ item.wins }} - {{ item.losses }}
          </td>
          <td
            class="px-6 py-4"
            :class="{
              'text-blue-500 font-semibold': item.pointsFor === mostPoints,
              'text-red-500 font-semibold': item.pointsFor === leastPoints,
            }"
          >
            {{ item.pointsFor }}
          </td>
          <td
            class="px-6 py-4"
            :class="{
              'text-blue-500 font-semibold':
                item.pointsAgainst === mostPointsAgainst,
              'text-red-500 font-semibold':
                item.pointsAgainst === leastPointsAgainst,
            }"
          >
            {{ item.pointsAgainst }}
          </td>
          <td
            class="px-6 py-4"
            :class="{
              'text-blue-500 font-semibold': item.rating === highestRating,
              'text-red-500 font-semibold': item.rating === lowestRating,
            }"
          >
            {{ item.rating }}
          </td>
          <td
            class="px-6 py-4"
            :class="{
              'text-blue-500 font-semibold':
                item.winsWithMedian === mostMedianWins,
              'text-red-500 font-semibold':
                item.lossesWithMedian === mostMedianLosses,
            }"
          >
            {{ item.winsWithMedian }} - {{ item.lossesWithMedian }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
  <p class="my-3 text-sm">
    Rating equation is from
    <a
      class="font-medium text-blue-600 dark:text-blue-500 hover:underline"
      href="http://www.okiraqi.org/opr.html"
      >http://www.okiraqi.org/opr.html</a
    >
  </p>
</template>
