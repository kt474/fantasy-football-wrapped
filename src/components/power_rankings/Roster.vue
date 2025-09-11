<script setup lang="ts">
import { computed } from "vue";
import { useStore } from "../../store/store";
import { TableDataType } from "../../api/types";

const store = useStore();
const props = defineProps<{
  playerData: any;
  tableData: TableDataType[];
}>();

const getNameFromId = (rosterId: number) => {
  const userObj = props.tableData.find((user) => user.rosterId === rosterId);
  if (userObj) {
    return store.showUsernames ? userObj.username : userObj.name;
  }
};

const getImgFromId = (rosterId: number) => {
  const userObj = props.tableData.find((user) => user.rosterId === rosterId);
  if (userObj) {
    return userObj.avatarImg;
  }
};

const groupedPlayerData = computed(() => {
  const result: Record<string, Record<string, any[]>> = {};
  for (const userId in props.playerData) {
    const players = props.playerData[userId];
    const positions: Record<string, any[]> = {};
    for (const player of players) {
      if (!positions[player.position]) {
        positions[player.position] = [];
      }
      positions[player.position].push(player);
    }
    // Sort each position group by player.rank
    for (const pos in positions) {
      positions[pos].sort(
        (a, b) =>
          (a.rank ?? Number.POSITIVE_INFINITY) -
          (b.rank ?? Number.POSITIVE_INFINITY)
      );
    }
    result[userId] = positions;
  }
  return result;
});

const getValueColor = (value: number) => {
  if (value <= 15) return `bg-emerald-400 dark:bg-emerald-600 text-gray-50`;
  if (value <= 25) return `bg-green-400 dark:bg-green-600 text-gray-50`;
  if (value <= 35) return "bg-yellow-300 dark-bg-yellow-600 text-black";
  if (value <= 45) return `bg-orange-400 dark:bg-orange-500 text-gray-50`;
  return `bg-red-400 dark:bg-red-600 text-gray-50`;
};
</script>
<template>
  <div
    v-for="(positions, userId) in groupedPlayerData"
    :key="userId"
    class="h-auto px-4 py-3.5 my-4 mr-4 md:mr-6 bg-white border border-gray-200 rounded-lg shadow dark:border-gray-700 dark:bg-gray-800"
  >
    <div class="flex mb-2">
      <img
        v-if="getImgFromId(Number(userId))"
        alt="User avatar"
        class="w-8 h-8 rounded-full"
        :src="getImgFromId(Number(userId))"
      />
      <svg
        v-else
        class="w-8 h-8 text-gray-800 dark:text-gray-50"
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z"
        />
      </svg>
      <p class="mb-2 ml-2 text-xl font-medium text-gray-900 dark:text-gray-50">
        {{ getNameFromId(Number(userId)) }}
      </p>
    </div>
    <hr class="h-px mt-3 mb-2.5 bg-gray-200 border-0 dark:bg-gray-700" />
    <div class="flex flex-wrap gap-4 sm:gap-12">
      <div
        class="w-72 sm:w-40"
        v-for="position in ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']"
        :key="position"
      >
        <template v-if="positions[position] && positions[position].length">
          <p class="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-50">
            {{ position }}
          </p>
          <div class="gap-2 text-gray-700 dark:text-gray-300">
            <div
              v-for="player in positions[position]"
              :key="player.id"
              class="flex mb-1.5 justify-between"
            >
              <p class="w-auto truncate sm:w-28">
                {{
                  player.position !== "DEF" && player.firstName
                    ? `${player.firstName[0]}.`
                    : ""
                }}
                {{ player.lastName }}
              </p>
              <span
                :class="[
                  player.rank
                    ? getValueColor(player.rank)
                    : 'bg-gray-300 dark:text-black',
                ]"
                class="text-xs px-2.5 py-1 mb-1 rounded-full float-end ml-2"
                >{{ player.rank ? player.rank : "N/A" }}</span
              >
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
