<script setup lang="ts">
import { computed, ref } from "vue";
import { useStore } from "../../store/store";
import { TableDataType } from "../../types/types";
import { fakeUsers } from "../../api/helper";

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

const managers = computed(() => {
  const currentLeague = store.leagueInfo[store.currentLeagueIndex];
  if (currentLeague) {
    const currentRosterIds = currentLeague.rosters.map((roster) => roster.id);
    const result = currentLeague.users
      .filter((user) => currentRosterIds.includes(user.id))
      .map((user) => (store.showUsernames ? user.username : user.name));
    result.unshift("All Managers");
    return result;
  } else if (store.leagueInfo.length == 0) {
    return fakeUsers.map((user) => user.name);
  }
  return [];
});

const currentManager = ref(managers.value[0]);

const getValueColor = (value: number) => {
  if (value <= 15) return `bg-emerald-400 dark:bg-emerald-600 text-gray-50`;
  if (value <= 25) return `bg-green-400 dark:bg-green-600 text-gray-50`;
  if (value <= 35) return "bg-yellow-300 dark-bg-yellow-600 text-black";
  if (value <= 45) return `bg-orange-400 dark:bg-orange-500 text-gray-50`;
  return `bg-red-400 dark:bg-red-600 text-gray-50`;
};
</script>
<template>
  <div>
    <label
      for="Manager name"
      class="block mb-1 text-sm text-gray-600 dark:text-gray-300"
      >Manager</label
    >
    <select
      aria-label="current week"
      id="Manager name"
      class="block p-2 text-sm text-gray-600 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-gray-300 dark:focus:ring-blue-500 dark:focus:border-blue-500"
      v-model="currentManager"
    >
      <option v-for="manager in managers" :key="manager" :value="manager">
        {{ manager }}
      </option>
    </select>
    <hr class="h-px mr-6 my-4 mb-2.5 bg-gray-200 border-0 dark:bg-gray-700" />
    <div
      v-for="(positions, userId) in groupedPlayerData"
      :key="userId"
      class=""
    >
      <div
        v-if="getNameFromId(Number(userId)) === currentManager"
        class="flex flex-wrap gap-4 sm:gap-12"
      >
        <div
          class="overflow-x-hidden w-80 sm:w-48"
          v-for="position in ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']"
          :key="position"
        >
          <template v-if="positions[position] && positions[position].length">
            <p
              class="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-50"
            >
              {{ position }}
            </p>
            <div class="gap-2 text-gray-700 dark:text-gray-300">
              <div
                v-for="player in positions[position]"
                :key="player.id"
                class="flex justify-between mb-2"
              >
                <img
                  v-if="player.position !== 'DEF'"
                  class="object-cover w-12 mr-2 -mt-1 -ml-2 rounded-full"
                  :src="`https://sleepercdn.com/content/nfl/players/thumb/${player.id}.jpg`"
                  alt="player_img"
                />
                <img
                  v-else
                  class="w-8 mx-2 rounded-full h-7"
                  :src="`https://sleepercdn.com/images/team_logos/nfl/${player.id.toLowerCase()}.png`"
                  alt="Team avatar"
                />
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
      <div v-else-if="currentManager === 'All Managers'">
        <p class="mb-1 text-lg font-semibold text-gray-900 dark:text-gray-50">
          {{ getNameFromId(Number(userId)) }}
        </p>
        <div class="flex flex-wrap gap-4 sm:gap-12">
          <div
            class="overflow-x-hidden w-80 sm:w-48"
            v-for="position in ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']"
            :key="position"
          >
            <template v-if="positions[position] && positions[position].length">
              <p
                class="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-50"
              >
                {{ position }}
              </p>
              <div class="gap-2 text-gray-700 dark:text-gray-300">
                <div
                  v-for="player in positions[position]"
                  :key="player.id"
                  class="flex justify-between mb-2"
                >
                  <img
                    v-if="player.position !== 'DEF'"
                    class="object-cover w-12 mr-2 -mt-1 -ml-2 rounded-full"
                    :src="`https://sleepercdn.com/content/nfl/players/thumb/${player.id}.jpg`"
                    alt="player_img"
                  />
                  <img
                    v-else
                    class="w-8 mx-2 rounded-full h-7"
                    :src="`https://sleepercdn.com/images/team_logos/nfl/${player.id.toLowerCase()}.png`"
                    alt="Team avatar"
                  />
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
        <hr class="h-px my-3 mr-6 bg-gray-200 border-0 dark:bg-gray-700" />
      </div>
    </div>
  </div>
</template>
