<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import groupBy from "lodash/groupBy";
import {
  TableDataType,
  LeagueInfoType,
  WeeklyEntry,
  PlayerType,
} from "../../types/types";
import { getStats } from "../../api/sleeperApi";
import { getLeagueKey, useStore } from "../../store/store";
import { fakePlayerRankings, fakeRosterData } from "../../api/playerRanks";
import { fakeUsers } from "../../api/fakeLeague";
import Roster from "./Roster.vue";
import Card from "../ui/card/Card.vue";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const store = useStore();
const props = defineProps<{
  tableData: TableDataType[];
}>();

type RankingPlayer = Partial<PlayerType>;

const data = ref<Record<string, RankingPlayer[]>>({});
const allData = ref<Record<string, WeeklyEntry[]>>({});
const loading = ref(false);
const tab = ref("QB");

const hasPlayerRankingData = (league: LeagueInfoType) =>
  Boolean(
    league.playerRankings && Object.keys(league.playerRankings).length > 0
  );

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
  store.addRosterRankings(getLeagueKey(currentLeague), allData.value);

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
  data.value = sorted as Record<string, RankingPlayer[]>;
  store.addPlayerRankings(
    getLeagueKey(currentLeague),
    data.value as unknown as Record<string, PlayerType[]>
  );
  localStorage.setItem(
    "leagueInfo",
    JSON.stringify(store.leagueInfo as LeagueInfoType[])
  );
};

const getTeamName = (playerId: string) => {
  const currentLeague = store.leagueInfo[store.currentLeagueIndex];
  if (currentLeague) {
    const roster = currentLeague.rosters.find((roster) =>
      roster.players?.includes(playerId)
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
    !hasPlayerRankingData(store.leagueInfo[store.currentLeagueIndex])
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
    data.value = fakePlayerRankings as unknown as Record<
      string,
      RankingPlayer[]
    >;
    allData.value = fakeRosterData;
  }
});

watch(
  () => store.currentLeagueId,
  async () => {
    if (!hasPlayerRankingData(store.leagueInfo[store.currentLeagueIndex])) {
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
  <Card class="w-full min-w-0 p-4 md:p-6">
    <Tabs v-if="!loading" default-value="score">
      <div class="flex justify-between">
        <h1 class="pb-2 text-2xl font-semibold tracking-tight">
          Player Rankings
        </h1>
        <div class="inline-flex p-1 rounded-lg max-h-12">
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
            class="w-full mr-2 overflow-x-hidden"
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
                  class="object-cover w-12 h-12 mx-1 shrink-0 sm:mx-2 sm:h-auto sm:w-16"
                  :src="`https://sleepercdn.com/content/nfl/players/thumb/${player.id}.jpg`"
                />
                <img
                  v-else
                  alt="Defense image"
                  class="object-cover w-12 h-12 my-auto ml-1 shrink-0 sm:ml-2 sm:h-16 sm:w-16"
                  :src="`https://sleepercdn.com/images/team_logos/nfl/${(player.id ?? '').toLowerCase()}.png`"
                />
                <div class="min-w-0 w-full mt-0.5 ml-2 sm:ml-3">
                  <div class="flex justify-between gap-2 px-2 mt-1 mb-4">
                    <p
                      class="min-w-0 max-w-32 flex-1 truncate text-base font-semibold sm:max-w-52 sm:text-lg"
                    >
                      {{ index + 1 }}.
                      {{
                        player.position !== "DEF" && player.firstName
                          ? `${player.firstName[0]}.`
                          : ""
                      }}
                      {{ player.lastName }}
                    </p>
                    <div
                      class="px-2 py-1 rounded-lg shrink-0 bg-muted/50 sm:px-3"
                    >
                      <p
                        class="max-w-20 truncate text-sm sm:max-w-52 sm:text-base"
                      >
                        {{ getTeamName(player.id ?? "") }}
                      </p>
                    </div>
                  </div>
                  <div class="flex">
                    <div class="w-full px-3 py-1 m-1 rounded-lg bg-muted/50">
                      <p>Points:</p>
                      <p class="text-base font-semibold sm:text-lg">
                        {{ player.points ? player.points.toFixed(1) : 0 }}
                      </p>
                    </div>
                    <div class="w-full px-3 py-1 m-1 rounded-lg bg-muted/50">
                      <p>PPG:</p>
                      <p class="text-base font-semibold sm:text-lg">
                        {{ player.ppg ? player.ppg.toFixed(1) : 0 }}
                      </p>
                    </div>
                    <div
                      class="hidden w-full px-3 py-1 m-1 rounded-lg bg-muted/50 sm:inline-block"
                    >
                      <p>Overall Rank:</p>
                      <p class="text-base font-semibold sm:text-lg">
                        {{ player.overallRank }}
                      </p>
                    </div>
                    <div
                      class="hidden w-full px-3 py-1 m-1 rounded-lg bg-muted/50 sm:inline-block"
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
    <div
      v-else-if="loading"
      role="status"
      class="max-w-80 sm:max-w-sm animate-pulse"
    >
      <p class="mb-2">Loading player data...</p>
      <div class="h-2.5 bg-muted rounded-full w-48 mb-4"></div>
      <div class="h-2 bg-muted rounded-full max-w-[360px] mb-2.5"></div>
      <div class="h-2 bg-muted rounded-full mb-2.5"></div>
      <div class="h-2 bg-muted rounded-full max-w-[330px] mb-2.5"></div>
      <div class="h-2 bg-muted rounded-full max-w-[300px] mb-2.5"></div>
      <div class="h-2 bg-muted rounded-full max-w-[360px]"></div>
      <span class="sr-only">Loading...</span>
    </div>
  </Card>
</template>
