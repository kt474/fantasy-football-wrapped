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

const savedLeague = computed(() => {
  return localStorage.leagueId;
});

const originalData = computed(() => {
  const combined = props.users.map((a: any) => ({
    ...a,
    ...props.rosters.find((b: any) => b.id === a.id),
  }));
  const combinedPoints = combined.map((a: any) => ({
    ...a,
    ...props.points.find((b: any) => b.rosterId === a.rosterId),
  }));

  const pointsArr: any = [];
  combinedPoints.forEach((value: any) => {
    pointsArr.push(value.points);
  });
  const zipped = zip(...pointsArr);
  const medians: number[] = [];
  zipped.forEach((value: any) => {
    medians.push(Number(getMedian(value)?.toFixed(2)));
  });

  if (combinedPoints) {
    combinedPoints.forEach((value: any) => {
      value["rating"] = getPowerRanking(
        mean(value.points),
        Number(max(value.points)),
        Number(min(value.points)),
        value.wins / (value.wins + value.losses)
      );
      const pairs = zip(value.points, medians);
      const counts = countBy(pairs, ([a, b]: [number, number]) => a > b);
      value["winsWithMedian"] = counts["true"] + value.wins;
      value["lossesWithMedian"] = counts["false"] + value.losses;
    });

    const result = combinedPoints.sort((a: any, b: any) => {
      if (a.wins !== b.wins) {
        return b.wins - a.wins;
      }
      return b.pointsFor - a.pointsFor;
    });
    return result;
  }
  return [];
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
  <div class="relative overflow-x-auto shadow-md sm:rounded-lg mx-auto">
    <table
      v-if="tableData.length > 0"
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
                  class="w-3 h-3 ms-1.5 fill-slate-400"
                  :class="{
                    'fill-slate-600 dark:fill-slate-50': tableOrder == 'wins',
                  }"
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
                  class="w-3 h-3 ms-1.5 fill-slate-400"
                  :class="{
                    'fill-slate-600 dark:fill-slate-50': tableOrder == 'points',
                  }"
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
                  class="w-3 h-3 ms-1.5 fill-slate-400"
                  :class="{
                    'fill-slate-600 dark:fill-slate-50':
                      tableOrder == 'pointsAgainst',
                  }"
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
                  class="w-3 h-3 ms-1.5 fill-slate-400"
                  :class="{
                    'fill-slate-600 dark:fill-slate-50': tableOrder == 'rating',
                  }"
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
                  class="w-3 h-3 ms-1.5 fill-slate-400"
                  :class="{
                    'fill-slate-600 dark:fill-slate-50':
                      tableOrder == 'medianRecord',
                  }"
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
            <div class="flex items-center">
              <img
                v-if="item.avatarImg"
                class="rounded-full w-8 h-8"
                :src="item.avatarImg"
              />
              <svg
                v-else
                class="w-8 h-8 text-gray-800 dark:text-white"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z"
                />
              </svg>
              <p class="ml-2">{{ index + 1 }}.&nbsp;</p>
              <p>{{ item.name }}</p>
            </div>
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
            {{ item.rating ? item.rating : "" }}
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
            {{ item.winsWithMedian ? item.winsWithMedian : "" }} -
            {{ item.lossesWithMedian ? item.lossesWithMedian : "" }}
          </td>
        </tr>
      </tbody>
    </table>
    <div v-else-if="savedLeague" role="status" class="flex justify-center m-6">
      <svg
        aria-hidden="true"
        class="w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600"
        viewBox="0 0 100 101"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
          fill="currentColor"
        />
        <path
          d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
          fill="currentFill"
        />
      </svg>
      <span class="sr-only">Loading...</span>
    </div>
  </div>
</template>
