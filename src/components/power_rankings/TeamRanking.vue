<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { groupBy } from "lodash";
import { TableDataType, LeagueInfoType, WeeklyEntry } from "../../types/types";
import { getStats } from "../../api/api";
import { useStore } from "../../store/store";
import { fakePlayerRankings, fakeRosterData } from "../../api/playerRanks";
import { fakeUsers } from "../../api/helper";
import Roster from "./Roster.vue";
import Card from "../ui/card/Card.vue";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const store = useStore();
const props = defineProps<{
  tableData: TableDataType[];
}>();

const data = ref<Record<string, any[]>>({});
const allData = ref<Record<string, WeeklyEntry[]>>({});
const loading = ref(false);
const tab = ref("QB");

const getData = async () => {
  const currentLeague = store.leagueInfo[store.currentLeagueIndex];
  const rosterPlayers = props.tableData.flatMap((user) =>
    user.players.map((player) => ({
      rosterId: user.rosterId,
      player,
    }))
  );

  const allPlayers = await Promise.all(
    rosterPlayers.map(({ player }) =>
      getStats(player, currentLeague.season, currentLeague.scoringType)
    )
  );

  const allPlayersWithRoster = allPlayers.map((stats, idx) => ({
    ...stats,
    rosterId: rosterPlayers[idx].rosterId,
  }));

  const filtered = allPlayersWithRoster.filter((item) => item !== null);

  function groupByRosterId(arr: WeeklyEntry[]) {
    return arr.reduce<Record<number, WeeklyEntry[]>>((acc, item) => {
      if (!acc[item.rosterId]) acc[item.rosterId] = [];
      acc[item.rosterId].push(item);
      return acc;
    }, {});
  }

  allData.value = groupByRosterId(filtered);
  store.addRosterRankings(currentLeague.leagueId, allData.value);

  const groupedPositions = groupBy(filtered, "position");
  const sorted = Object.fromEntries(
    Object.entries(groupedPositions).map(([position, items]) => [
      position,
      items
        .sort((a, b) => {
          const pointsA = typeof a.points === "number" ? a.points : 0;
          const pointsB = typeof b.points === "number" ? b.points : 0;
          return pointsB - pointsA;
        })
        .slice(0, 5),
    ])
  );
  data.value = sorted;
  store.addPlayerRankings(currentLeague.leagueId, data.value);
  localStorage.setItem(
    "leagueInfo",
    JSON.stringify(store.leagueInfo as LeagueInfoType[])
  );
};

const getTeamName = (playerId: string) => {
  const currentLeague = store.leagueInfo[store.currentLeagueIndex];
  if (currentLeague) {
    const roster = currentLeague.rosters.find((roster) =>
      roster.players.includes(playerId)
    );
    const user = currentLeague.users.find((user) => user?.id === roster?.id);
    if (user) {
      if (store.showUsernames) {
        return user.username ? user.username : "";
      }
      return user.name ? user.name : "";
    }
    return "";
  } else {
    return fakeUsers[Math.floor(Math.random() * fakeUsers.length)].name;
  }
};

onMounted(async () => {
  if (
    store.leagueInfo.length > 0 &&
    store.leagueInfo[store.currentLeagueIndex] &&
    !store.leagueInfo[store.currentLeagueIndex].playerRankings
  ) {
    loading.value = true;
    data.value = {};
    allData.value = {};
    await getData();
    loading.value = false;
  } else if (store.leagueInfo[store.currentLeagueIndex]) {
    data.value =
      store.leagueInfo[store.currentLeagueIndex].playerRankings ?? {};
    allData.value =
      store.leagueInfo[store.currentLeagueIndex].rosterRankings ?? {};
  } else if (store.leagueInfo.length === 0) {
    data.value = fakePlayerRankings;
    allData.value = fakeRosterData;
  }
});

watch(
  () => store.currentLeagueId,
  async () => {
    if (!store.leagueInfo[store.currentLeagueIndex].playerRankings) {
      data.value = {};
      allData.value = {};
      loading.value = true;
      await getData();
      loading.value = false;
    }
    data.value =
      store.leagueInfo[store.currentLeagueIndex].playerRankings ?? {};
    allData.value =
      store.leagueInfo[store.currentLeagueIndex].rosterRankings ?? {};
  }
);
</script>
<template>
  <Card class="w-full py-4 pl-4 md:py-6 md:pl-6 min-w-80">
    <Tabs v-if="!loading" default-value="score">
      <div class="flex justify-between">
        <h1 class="pb-2 text-3xl font-bold leading-none">Player Rankings</h1>
        <div class="inline-flex p-1 mr-4 rounded-lg md:mr-6 max-h-12">
          <TabsList>
            <TabsTrigger value="roster"> By Roster </TabsTrigger>
            <TabsTrigger value="score"> Overall </TabsTrigger>
          </TabsList>
        </div>
      </div>
      <div v-if="Object.keys(data).length === 0">
        <p class="">Please come back after week 1!</p>
      </div>
      <TabsContent value="score">
        <div class="flex flex-wrap mt-2">
          <Tabs v-model="tab" class="w-full">
            <TabsList class="flex rounded-t-lg w-fit">
              <TabsTrigger
                v-for="position in ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']"
                :key="position"
                :value="position"
                class="px-4 py-2 text-sm"
              >
                {{ position }}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div
            v-for="(players, position) in data"
            class="w-full mr-4 overflow-x-hidden md:mr-6"
          >
            <Card
              v-if="position === tab"
              v-for="(player, index) in players"
              class="my-4 h-36"
            >
              <div class="flex p-1 mt-1">
                <img
                  v-if="player.position !== 'DEF'"
                  alt="Player image"
                  class="object-cover w-16 h-16 mx-2 sm:h-auto"
                  :src="`https://sleepercdn.com/content/nfl/players/thumb/${player.id}.jpg`"
                />
                <img
                  v-else
                  alt="Defense image"
                  class="object-cover w-16 h-16 my-auto ml-2"
                  :src="`https://sleepercdn.com/images/team_logos/nfl/${player.id.toLowerCase()}.png`"
                />
                <div class="w-full mt-0.5 ml-3">
                  <div class="flex justify-between px-2 mt-1 mb-4">
                    <p
                      class="text-base font-semibold truncate sm:text-lg max-w-24 sm:max-w-52"
                    >
                      {{ index + 1 }}.
                      {{
                        player.position !== "DEF" && player.firstName
                          ? `${player.firstName[0]}.`
                          : ""
                      }}
                      {{ player.lastName }}
                    </p>
                    <div class="px-3 py-1 rounded-lg bg-secondary">
                      <p
                        class="text-sm truncate sm:text-base max-w-16 sm:max-w-52"
                      >
                        {{ getTeamName(player.id) }}
                      </p>
                    </div>
                  </div>
                  <div class="flex">
                    <div class="w-full px-3 py-1 m-1 rounded-lg bg-secondary">
                      <p>Points:</p>
                      <p class="text-base font-semibold sm:text-lg">
                        {{ player.points ? player.points.toFixed(1) : 0 }}
                      </p>
                    </div>
                    <div class="w-full px-3 py-1 m-1 rounded-lg bg-secondary">
                      <p>PPG:</p>
                      <p class="text-base font-semibold sm:text-lg">
                        {{ player.ppg ? player.ppg.toFixed(1) : 0 }}
                      </p>
                    </div>
                    <div
                      class="hidden w-full px-3 py-1 m-1 rounded-lg bg-secondary sm:inline-block"
                    >
                      <p>Overall Rank:</p>
                      <p class="text-base font-semibold sm:text-lg">
                        {{ player.overallRank }}
                      </p>
                    </div>
                    <div
                      class="hidden w-full px-3 py-1 m-1 rounded-lg bg-secondary sm:inline-block"
                    >
                      <p>Games Played:</p>
                      <p class="text-base font-semibold sm:text-lg">
                        {{ player.gp }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </TabsContent>
      <TabsContent value="roster">
        <Roster :player-data="allData" :table-data="tableData" />
      </TabsContent>
    </Tabs>
    <!-- Loading div -->
    <div v-else-if="loading" role="status" class="max-w-sm animate-pulse">
      <p class="mb-2">Loading player data...</p>
      <div
        class="h-2.5 bg-gray-200 rounded-full dark:bg-gray-700 w-48 mb-4"
      ></div>
      <div
        class="h-2 bg-gray-200 rounded-full dark:bg-gray-700 max-w-[360px] mb-2.5"
      ></div>
      <div class="h-2 bg-gray-200 rounded-full dark:bg-gray-700 mb-2.5"></div>
      <div
        class="h-2 bg-gray-200 rounded-full dark:bg-gray-700 max-w-[330px] mb-2.5"
      ></div>
      <div
        class="h-2 bg-gray-200 rounded-full dark:bg-gray-700 max-w-[300px] mb-2.5"
      ></div>
      <div
        class="h-2 bg-gray-200 rounded-full dark:bg-gray-700 max-w-[360px]"
      ></div>
      <span class="sr-only">Loading...</span>
    </div>
  </Card>
</template>
