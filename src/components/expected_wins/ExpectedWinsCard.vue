<script setup lang="ts">
import { cloneDeep, maxBy, minBy } from "lodash";
import { computed, ref } from "vue";
import { useStore } from "../../store/store";
import { TableDataType } from "../../types/types";
import { zScoreToPValue } from "../../api/helper";
import Card from "../ui/card/Card.vue";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
const store = useStore();
const tableOrder = ref("winsDifference");
const props = defineProps<{
  tableData: TableDataType[];
}>();
const tableData = computed(() => {
  const tableDataCopy = cloneDeep(props.tableData);
  if (tableOrder.value === "randomScheduleWins") {
    return tableDataCopy.sort((a, b) => {
      return b.randomScheduleWins - a.randomScheduleWins;
    });
  } else if (tableOrder.value === "winsDifference") {
    return tableDataCopy.sort((a, b) => {
      return b.wins - b.randomScheduleWins - (a.wins - a.randomScheduleWins);
    });
  } else if (tableOrder.value === "probability") {
    return tableDataCopy.sort((a, b) => {
      return (
        getProbability(b.wins, b.randomScheduleWins, b.expectedWinsSTD) -
        getProbability(a.wins, a.randomScheduleWins, a.expectedWinsSTD)
      );
    });
  }
});

const getProbability = (actualWins: number, meanWins: number, std: number) => {
  const zScore = std !== 0 ? (actualWins - meanWins) / std : 0;
  return zScoreToPValue(zScore);
};

const mostRandomScheduleWins = computed(() => {
  return maxBy(tableData.value, "randomScheduleWins")?.randomScheduleWins;
});

const leastRandomScheduleWins = computed(() => {
  return minBy(tableData.value, "randomScheduleWins")?.randomScheduleWins;
});

const mostWinsDifference = computed(() => {
  return maxBy(tableData.value, (team) => team.wins - team.randomScheduleWins)
    ?.name;
});
const leastWinsDifference = computed(() => {
  return minBy(tableData.value, (team) => team.wins - team.randomScheduleWins)
    ?.name;
});

const listPadding = computed(() => {
  if (props.tableData.length <= 10) {
    return "py-4";
  } else if (props.tableData.length <= 12) {
    return "py-3";
  }
  return "py-2.5";
});

const getTeamName = (tableDataItem: TableDataType) => {
  if (store.showUsernames) {
    return tableDataItem.username ? tableDataItem.username : `Ghost Roster`;
  }
  return tableDataItem.name ? tableDataItem.name : `Ghost Roster`;
};
</script>
<template>
  <Card class="relative w-full overflow-x-auto md:max-w-xl">
    <TooltipProvider>
      <table class="w-full text-sm text-left rtl:text-right">
        <thead class="text-xs uppercase bg-accent">
          <tr>
            <th scope="col" class="px-4 py-3 sm:px-6">Team Name</th>
            <th scope="col" class="px-2 py-3">
              <Tooltip>
                <TooltipTrigger as-child>
                  <div
                    @click="tableOrder = 'randomScheduleWins'"
                    class="flex items-center w-24 uppercase cursor-pointer"
                  >
                    Expected Wins
                    <div>
                      <svg
                        class="w-3 h-3 ms-1.5"
                        :class="
                          tableOrder === 'randomScheduleWins'
                            ? 'text-foreground'
                            : 'text-muted-foreground'
                        "
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
                </TooltipTrigger>
                <TooltipContent class="bg-muted-foreground w-52">
                  Average number of wins after simulating 10,000 randomized
                  weekly matchups
                </TooltipContent>
              </Tooltip>
            </th>
            <th scope="col" class="px-1 py-3">
              <Tooltip>
                <TooltipTrigger as-child>
                  <div
                    @click="tableOrder = 'winsDifference'"
                    class="flex items-center uppercase cursor-pointer w-28"
                  >
                    Wins above Expected
                    <div>
                      <svg
                        class="w-3 h-3 ms-1.5"
                        :class="
                          tableOrder === 'winsDifference'
                            ? 'text-foreground'
                            : 'text-muted-foreground'
                        "
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
                </TooltipTrigger>
                <TooltipContent class="bg-muted-foreground w-52">
                  Difference between expected wins and actual wins
                </TooltipContent>
              </Tooltip>
            </th>
            <th scope="col" class="px-2 py-3">
              <Tooltip>
                <TooltipTrigger as-child>
                  <div
                    @click="tableOrder = 'probability'"
                    class="flex items-center uppercase cursor-pointer w-28"
                  >
                    Probability
                    <div>
                      <svg
                        class="w-3 h-3 ms-1.5"
                        :class="
                          tableOrder === 'probability'
                            ? 'text-foreground'
                            : 'text-muted-foreground'
                        "
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
                </TooltipTrigger>
                <TooltipContent class="bg-muted-foreground w-52">
                  If wins above expected is positive, this is the probability of
                  having equal to or greater than the number of actual wins. If
                  negative, the probability of having equal to or less than the
                  number of actual wins.
                </TooltipContent>
              </Tooltip>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in tableData" :key="index" class="border-b">
            <th
              scope="row"
              :class="listPadding"
              class="px-4 font-medium truncate sm:px-6 max-w-36 sm:max-w-56 whitespace-nowrap"
            >
              {{ getTeamName(item) }}
            </th>
            <td
              class="px-2 py-2"
              :class="{
                'text-primary font-semibold':
                  item.randomScheduleWins === mostRandomScheduleWins,
                'text-destructive font-semibold':
                  item.randomScheduleWins === leastRandomScheduleWins,
              }"
            >
              {{ item.randomScheduleWins.toFixed(2) }}
            </td>
            <td
              class="px-2 py-2"
              :class="{
                'text-primary font-semibold': item.name === mostWinsDifference,
                'text-destructive font-semibold':
                  item.name === leastWinsDifference,
              }"
            >
              {{ (item.wins - item.randomScheduleWins).toFixed(2) }}
            </td>
            <td class="py-2 pl-2">
              {{
                (
                  100 *
                  getProbability(
                    item.wins,
                    item.randomScheduleWins,
                    item.expectedWinsSTD
                  )
                ).toFixed(2)
              }}%
            </td>
          </tr>
        </tbody>
      </table>
    </TooltipProvider>
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
