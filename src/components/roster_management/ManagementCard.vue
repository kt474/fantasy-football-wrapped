<script setup lang="ts">
import cloneDeep from "lodash/cloneDeep";
import maxBy from "lodash/maxBy";
import minBy from "lodash/minBy";
import { computed, ref } from "vue";
import { useStore } from "../../store/store";
import { TableDataType } from "../../types/types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Card from "../ui/card/Card.vue";
const store = useStore();
const tableOrder = ref("points");
const props = defineProps<{
  tableData: TableDataType[];
}>();

const tableData = computed(() => {
  const tableDataCopy = cloneDeep(props.tableData);
  if (tableOrder.value === "points") {
    return tableDataCopy.sort((a, b) => {
      return b.pointsFor - a.pointsFor;
    });
  } else if (tableOrder.value === "potentialPoints") {
    return tableDataCopy.sort((a, b) => {
      return b.potentialPoints - a.potentialPoints;
    });
  } else if (tableOrder.value === "efficiency") {
    return tableDataCopy.sort((a, b) => {
      return b.managerEfficiency - a.managerEfficiency;
    });
  }
});

const mostPoints = computed(() => {
  return maxBy(tableData.value, "pointsFor")?.pointsFor;
});
const minPoints = computed(() => {
  return minBy(tableData.value, "pointsFor")?.pointsFor;
});
const mostPontentialPoints = computed(() => {
  return maxBy(tableData.value, "potentialPoints")?.potentialPoints;
});
const minPontentialPoints = computed(() => {
  return minBy(tableData.value, "potentialPoints")?.potentialPoints;
});
const highestEfficiency = computed(() => {
  return maxBy(tableData.value, "managerEfficiency")?.managerEfficiency;
});
const lowestEfficiency = computed(() => {
  return minBy(tableData.value, "managerEfficiency")?.managerEfficiency;
});

const listPadding = computed(() => {
  if (props.tableData.length <= 10) {
    return "py-4";
  } else if (props.tableData.length <= 12) {
    return "py-3";
  }
  return "py-2.5";
});
</script>
<template>
  <Card>
    <TooltipProvider>
      <table class="w-full text-sm text-left rtl:text-right">
        <thead class="text-xs uppercase bg-secondary">
          <tr>
            <th scope="col" class="px-4 py-3 sm:px-6">Team Name</th>
            <th scope="col" class="px-1 py-3">
              <Tooltip>
                <TooltipTrigger as-child>
                  <div
                    @click="tableOrder = 'points'"
                    class="flex items-center w-20 uppercase cursor-pointer"
                  >
                    Total Points
                    <div>
                      <svg
                        class="w-3 h-3 ms-1.5"
                        :class="
                          tableOrder === 'points'
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
                <TooltipContent class="bg-muted-foreground">
                  Total regular season points
                </TooltipContent>
              </Tooltip>
            </th>
            <th scope="col" class="px-1 py-3 max-w-24">
              <Tooltip>
                <TooltipTrigger as-child>
                  <div
                    @click="tableOrder = 'potentialPoints'"
                    class="flex items-center w-24 uppercase cursor-pointer"
                  >
                    Potential Points
                    <div>
                      <svg
                        class="w-3 h-3 ms-1.5"
                        :class="
                          tableOrder === 'potentialPoints'
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
                <TooltipContent class="w-36 bg-muted-foreground">
                  Maximum points possible if the best lineup was set each week
                </TooltipContent>
              </Tooltip>
            </th>
            <th scope="col" class="py-3 pl-2 pr-3 lg:pr-0">
              <Tooltip>
                <TooltipTrigger as-child>
                  <div
                    @click="tableOrder = 'efficiency'"
                    class="flex items-center w-24 uppercase cursor-pointer"
                  >
                    Efficiency
                    <div>
                      <svg
                        class="w-3 h-3 ms-1.5"
                        :class="
                          tableOrder === 'efficiency'
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
                <TooltipContent class="bg-muted-foreground">
                  Points / Potential Points
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
              class="px-4 font-medium truncate sm:px-6 max-w-56 whitespace-nowrap"
            >
              {{
                store.showUsernames
                  ? item.username
                    ? item.username
                    : "Ghost Roster"
                  : item.name
                    ? item.name
                    : "Ghost Roster"
              }}
            </th>
            <td
              class="py-2 pl-1 pr-3"
              :class="{
                'text-primary font-semibold': item.pointsFor === mostPoints,
                'text-destructive font-semibold': item.pointsFor === minPoints,
              }"
            >
              {{ item.pointsFor }}
            </td>
            <td
              class="py-2 pl-1 pr-3"
              :class="{
                'text-primary font-semibold':
                  item.potentialPoints === mostPontentialPoints,
                'text-destructive font-semibold':
                  item.potentialPoints === minPontentialPoints,
              }"
            >
              {{ item.potentialPoints }}
            </td>
            <td
              class="py-2 pl-2.5 pr-3"
              :class="{
                'text-primary font-semibold':
                  item.managerEfficiency === highestEfficiency,
                'text-destructive font-semibold':
                  item.managerEfficiency === lowestEfficiency,
              }"
            >
              {{ (item.managerEfficiency * 100).toFixed(1) }}%
            </td>
          </tr>
        </tbody>
      </table>
    </TooltipProvider>
  </Card>
</template>
