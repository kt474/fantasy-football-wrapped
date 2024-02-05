<script setup lang="ts">
import { mean, max, min, zip, countBy, maxBy, minBy } from "lodash";
import { getPowerRanking, getMedian, getRandomUser } from "../api/helper";
import { computed, ref } from "vue";
import { getAvatar } from "../api/api";
import { useStore } from "../store/store";
const tableOrder = ref("wins");
const props = defineProps<{
  users: Array<object>;
  rosters: Array<object>;
  points: Array<object>;
}>();
const store = useStore();

const originalData = computed(() => {
  if (props.users && props.points) {
    const combined = props.users.map((a: any) => {
      const matched = props.rosters.find((b: any) => b.id === a.id);
      if (matched) {
        return {
          ...a,
          ...matched,
        };
      }
      return null;
    });
    const filtered = combined.filter((a: any) => a !== null);
    const combinedPoints = filtered.map((a: any) => ({
      ...a,
      ...props.points.find((b: any) => b.rosterId === a.rosterId),
    }));

    const pointsArr: any[] = [];
    combinedPoints.forEach((value: any) => {
      pointsArr.push(value.points);
      value["winsAgainstAll"] = 0;
      value["lossesAgainstAll"] = 0;
    });
    const zipped: any = zip(...pointsArr);
    const medians: number[] = [];
    for (let i: number = 0; i < zipped.length; i++) {
      medians.push(Number(getMedian(zipped[i])?.toFixed(2)));
      for (let j: number = 0; j < zipped[i].length; j++) {
        const numberOfWins = zipped[i].filter(
          (a: any) => a < zipped[i][j]
        ).length;
        const currentTeam = combinedPoints.find((obj: any) => {
          return obj.points[i] === zipped[i][j];
        });
        if (currentTeam) {
          currentTeam["winsAgainstAll"] += numberOfWins;
          currentTeam["lossesAgainstAll"] +=
            zipped[i].length - numberOfWins - 1;
        }
      }
    }
    if (combinedPoints) {
      combinedPoints.forEach((value: any) => {
        let randomScheduleWins = 0;
        const numOfSimulations = 10000;
        for (let i = 0; i < value.points.length; i++) {
          for (
            let simulations = 0;
            simulations < numOfSimulations;
            simulations++
          )
            if (
              value.points[i] >
              combinedPoints[getRandomUser(combinedPoints.length, i)].points[i]
            ) {
              randomScheduleWins++;
            }
        }
        value["randomScheduleWins"] = randomScheduleWins / numOfSimulations;
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

      const result: any[] = combinedPoints.sort((a: any, b: any) => {
        if (a.wins !== b.wins) {
          return b.wins - a.wins;
        }
        return b.pointsFor - a.pointsFor;
      });
      store.tableData = result;
      return result;
    }
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
  } else if (tableOrder.value === "recordAgainstAll") {
    return originalData.value.sort((a: any, b: any) => {
      if (a.winsAgainstAll !== b.winsAgainstAll) {
        return b.winsAgainstAll - a.winsAgainstAll;
      }
      return b.pointsFor - a.pointsFor;
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

// createObjectUrl does not persist across page loads
const refetchAvatar = () => {
  store.leagueInfo[store.currentLeagueIndex].users.forEach(async (val: any) => {
    if (val["avatar"] !== null) {
      val["avatarImg"] = await getAvatar(val["avatar"]);
    }
  });
};

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
const mostWinsAgainstAll = computed(() => {
  return maxBy(originalData.value, "winsAgainstAll")?.winsAgainstAll;
});
const mostLossesAgainstAll = computed(() => {
  return maxBy(originalData.value, "lossesAgainstAll")?.lossesAgainstAll;
});
const mostMedianWins = computed(() => {
  return maxBy(originalData.value, "winsWithMedian")?.winsWithMedian;
});
const mostMedianLosses = computed(() => {
  return maxBy(originalData.value, "lossesWithMedian")?.lossesWithMedian;
});
</script>
<template>
  <div
    class="relative w-full overflow-x-auto shadow-md sm:rounded-lg dark:bg-gray-700"
  >
    <table
      v-if="tableData.length > 0"
      class="w-full text-sm text-left text-gray-500 rtl:text-right dark:text-gray-400"
    >
      <thead
        class="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-gray-700 dark:text-gray-400"
      >
        <tr>
          <th scope="col" class="px-6 py-3 dark:text-gray-200">Team name</th>
          <th scope="col" class="px-6 py-3">
            <div
              @click="tableOrder = 'wins'"
              data-tooltip-target="record-tooltip"
              data-tooltip-placement="bottom"
              class="flex items-center cursor-pointer dark:text-gray-200"
            >
              Record
              <div aria-label="Sort by wins">
                <svg
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
                  />
                </svg>
              </div>
            </div>
            <div
              id="record-tooltip"
              role="tooltip"
              class="absolute z-10 invisible inline-block px-3 py-2 text-sm font-medium text-white normal-case bg-gray-900 rounded-lg shadow-sm opacity-0 tooltip dark:bg-gray-600"
            >
              Regular season wins and losses
              <div class="tooltip-arrow" data-popper-arrow></div>
            </div>
          </th>
          <th scope="col" class="px-6 py-3">
            <div
              @click="tableOrder = 'points'"
              data-tooltip-target="points-tooltip"
              data-tooltip-placement="bottom"
              class="flex items-center cursor-pointer dark:text-gray-200"
            >
              Points
              <div aria-label="Sort by points">
                <svg
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
                  />
                </svg>
              </div>
            </div>
            <div
              id="points-tooltip"
              role="tooltip"
              class="absolute z-10 invisible inline-block px-3 py-2 text-sm font-medium text-white normal-case bg-gray-900 rounded-lg shadow-sm opacity-0 tooltip dark:bg-gray-600"
            >
              Total regular season points
              <div class="tooltip-arrow" data-popper-arrow></div>
            </div>
          </th>
          <th scope="col" class="px-6 py-3">
            <div
              @click="tableOrder = 'pointsAgainst'"
              data-tooltip-target="points-against-tooltip"
              data-tooltip-placement="bottom"
              class="flex items-center w-20 cursor-pointer dark:text-gray-200"
            >
              Points Against
              <div aria-label="Sort by points against">
                <svg
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
                  />
                </svg>
              </div>
            </div>
            <div
              id="points-against-tooltip"
              role="tooltip"
              class="absolute z-10 invisible inline-block px-3 py-2 text-sm font-medium text-white normal-case bg-gray-900 rounded-lg shadow-sm opacity-0 tooltip dark:bg-gray-600"
            >
              Total regular season points against
              <div class="tooltip-arrow" data-popper-arrow></div>
            </div>
          </th>
          <th scope="col" class="px-6 py-3">
            <div
              @click="tableOrder = 'recordAgainstAll'"
              data-tooltip-target="recordAgainstAll-tooltip"
              data-tooltip-placement="bottom"
              class="flex items-center w-20 cursor-pointer dark:text-gray-200"
            >
              Record vs. All
              <div aria-label="Sort by record against all ">
                <svg
                  class="w-3 h-3 ms-1.5 fill-slate-400"
                  :class="{
                    'fill-slate-600 dark:fill-slate-50':
                      tableOrder == 'recordAgainstAll',
                  }"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M8.574 11.024h6.852a2.075 2.075 0 0 0 1.847-1.086 1.9 1.9 0 0 0-.11-1.986L13.736 2.9a2.122 2.122 0 0 0-3.472 0L6.837 7.952a1.9 1.9 0 0 0-.11 1.986 2.074 2.074 0 0 0 1.847 1.086Zm6.852 1.952H8.574a2.072 2.072 0 0 0-1.847 1.087 1.9 1.9 0 0 0 .11 1.985l3.426 5.05a2.123 2.123 0 0 0 3.472 0l3.427-5.05a1.9 1.9 0 0 0 .11-1.985 2.074 2.074 0 0 0-1.846-1.087Z"
                  />
                </svg>
              </div>
            </div>
            <div
              id="recordAgainstAll-tooltip"
              role="tooltip"
              class="absolute z-10 invisible inline-block px-3 py-2 text-sm font-medium text-white normal-case bg-gray-900 rounded-lg shadow-sm opacity-0 max-w-60 tooltip dark:bg-gray-600"
            >
              Team record if each team played every other team each week.
              <div class="tooltip-arrow" data-popper-arrow></div>
            </div>
          </th>
          <th scope="col" class="px-6 py-3">
            <div
              @click="tableOrder = 'medianRecord'"
              data-tooltip-target="median-tooltip"
              data-tooltip-placement="bottom"
              class="flex items-center w-20 cursor-pointer dark:text-gray-200"
            >
              Median Record
              <div aria-label="Sort by median record">
                <svg
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
                  />
                </svg>
              </div>
            </div>
            <div
              id="median-tooltip"
              role="tooltip"
              class="absolute z-10 invisible inline-block px-3 py-2 text-sm font-medium text-white normal-case bg-gray-900 rounded-lg shadow-sm opacity-0 max-w-60 tooltip dark:bg-gray-600"
            >
              Team record where a win is awarded if a team's weekly score is
              higher than the league median, and a loss is added if the score is
              less than the median.
              <div class="tooltip-arrow" data-popper-arrow></div>
            </div>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(item, index) in tableData"
          :key="index"
          class="border-b odd:bg-white odd:dark:bg-gray-900 even:bg-gray-50 even:dark:bg-gray-800 dark:border-gray-700"
        >
          <th
            scope="row"
            class="px-6 py-3 font-medium text-gray-900 whitespace-nowrap dark:text-white"
          >
            <div class="flex items-center">
              <img
                alt="User avatar"
                @error="refetchAvatar()"
                v-if="item.avatarImg"
                class="w-8 h-8 rounded-full"
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
            class="px-6 py-3"
            :class="{
              'text-blue-600 dark:text-blue-500 font-semibold':
                item.wins === mostWins,
              'text-red-600 dark:text-red-500 font-semibold':
                item.losses === mostLosses,
            }"
          >
            {{ item.wins }} - {{ item.losses }}
          </td>
          <td
            class="px-6 py-3"
            :class="{
              'text-blue-600 dark:text-blue-500 font-semibold':
                item.pointsFor === mostPoints,
              'text-red-600 dark:text-red-500 font-semibold':
                item.pointsFor === leastPoints,
            }"
          >
            {{ item.pointsFor }}
          </td>
          <td
            class="px-6 py-3"
            :class="{
              'text-blue-600 dark:text-blue-500 font-semibold':
                item.pointsAgainst === mostPointsAgainst,
              'text-red-600 dark:text-red-500 font-semibold':
                item.pointsAgainst === leastPointsAgainst,
            }"
          >
            {{ item.pointsAgainst }}
          </td>
          <td
            class="px-6 py-3"
            :class="{
              'text-blue-600 dark:text-blue-500 font-semibold':
                item.winsAgainstAll === mostWinsAgainstAll,
              'text-red-600 dark:text-red-500 font-semibold':
                item.lossesAgainstAll === mostLossesAgainstAll,
            }"
          >
            {{ item.winsAgainstAll }} -
            {{ item.lossesAgainstAll }}
          </td>
          <td
            class="px-6 py-3"
            :class="{
              'text-blue-600 font-semibold dark:text-blue-500':
                item.winsWithMedian === mostMedianWins,
              'text-red-600 dark:text-red-500 font-semibold':
                item.lossesWithMedian === mostMedianLosses,
            }"
          >
            {{ item.winsWithMedian ? item.winsWithMedian : "" }} -
            {{ item.lossesWithMedian ? item.lossesWithMedian : "" }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
