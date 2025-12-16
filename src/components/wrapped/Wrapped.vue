<script setup lang="ts">
import { computed, ref, onMounted } from "vue";
import {
  TableDataType,
  LeagueInfoType,
  RosterType,
} from "../../types/types.ts";
import { useStore } from "../../store/store";
import { maxBy, minBy } from "lodash";
import WrappedSlide from "./WrappedSlide.vue";
import Draft from "../draft/Draft.vue";
import Trades from "../roster_management/Trades.vue";
import Waivers from "../roster_management/Waivers.vue";
import LeagueHistory from "../league_history/LeagueHistory.vue";

const store = useStore();
const props = defineProps<{
  tableData: TableDataType[];
}>();

const closestMatchups: any = ref([]);
const farthestMatchups: any = ref([]);

const league = computed(() => {
  return store.leagueInfo[store.currentLeagueIndex];
});

const leagueSize = computed(() => {
  return league.value.totalRosters;
});

const bestPicks = computed(() => {
  return league.value.draftPicks
    ?.filter((obj) => obj.position !== "TE")
    .sort((a, b) => b.pickRank - a.pickRank)
    .slice(0, 5);
});

const worstPicks = computed(() => {
  return league.value.draftPicks
    ?.filter((obj) => obj.position !== "TE")
    .sort((a, b) => a.pickRank - b.pickRank)
    .slice(0, 5);
});

const draftSteal = computed(() => {
  return league.value.draftPicks
    ?.filter((obj) => obj.pickNumber > 36)
    .filter((obj) => obj.position !== "TE")
    .sort((a, b) => b.pickRank - a.pickRank)
    .slice(0, 2);
});

const highestBids = computed(() => {
  return league.value.waiverMoves
    ?.slice()
    .filter((bid) => bid.status === "complete")
    .sort((a, b) => (b.bid ?? 0) - (a.bid ?? 0))
    .slice(0, 4);
});

const bestPickups = computed(() => {
  return (
    league.value.waiverMoves
      ?.filter(
        (obj) =>
          obj.value !== null && obj.position !== "DEF" && obj.position !== "K"
      )
      .sort((a, b) => (a.value ?? 0) - (b.value ?? 0))
      .slice(0, 5) ?? []
  );
});

const mostMoves = computed(() => {
  const maxKey: any = Object.keys(league.value.transactions).reduce(
    (a: any, b: any) =>
      league.value.transactions[a] > league.value.transactions[b] ? a : b
  );
  const user = league.value.users.find((user) => user.id === maxKey);
  return {
    user: user,
    moves: league.value.transactions[maxKey],
  };
});

const fewestMoves = computed(() => {
  const maxKey: any = Object.keys(league.value.transactions).reduce(
    (a: any, b: any) =>
      league.value.transactions[b] > league.value.transactions[a] ? a : b
  );
  const user = league.value.users.find((user) => user.id === maxKey);
  return {
    user: user,
    moves: league.value.transactions[maxKey],
  };
});

const totalBids = computed(() => {
  if (league.value.waiverMoves) {
    const grouped: any[] = league.value.waiverMoves.reduce(
      (acc: any, obj: any) => {
        const userId = obj.user.id;
        const status = obj.status;

        if (!acc[userId]) {
          acc[userId] = {
            user: obj.user,
            sumByStatus: {},
            totalSpent: 0,
          };
        }
        acc[userId].sumByStatus[status] =
          (acc[userId].sumByStatus[status] || 0) + obj.bid;
        acc[userId].totalSpent += obj.bid;

        return acc;
      },
      {}
    );
    return {
      highest: maxBy(Object.values(grouped), "totalSpent"),
      lowest: minBy(Object.values(grouped), "totalSpent"),
    };
  }
});

const impactfulTrades = computed(() => {
  let minValue = Infinity;
  let minTrade = null;
  if (league.value.tradeNames) {
    for (const trade of league.value.tradeNames) {
      // Combine value arrays from both teams
      const values = [
        ...(trade.team1.value || []),
        ...(trade.team2.value || []),
      ];

      for (const val of values) {
        if (val < minValue) {
          minValue = val;
          minTrade = trade;
        }
      }
    }
  }
  return minTrade;
});

const scheduleData = computed(() => {
  return props.tableData.map((user) => {
    return {
      teamName: store.showUsernames ? user.username : user.name,
      avatarImg: user.avatarImg,
      matchups: user.matchups,
      points: user.points,
      actualWins: user.wins,
      expectedWins: user.randomScheduleWins,
    };
  });
});

const scheduleAnalysis = computed(() => {
  const teams = scheduleData.value;

  let result = teams.map((team) => {
    let bestRecord = team.actualWins;
    let worstRecord = team.actualWins;
    let bestScheduleTeam = team.teamName;
    let worstScheduleTeam = team.teamName;

    // Try each other team's schedule
    teams.forEach((otherTeam) => {
      if (otherTeam.teamName === team.teamName) return;

      let winsWithThisSchedule = 0;

      // Play this team's points against the other team's opponents
      for (
        let week = 0;
        week <
        (store.leagueInfo.length > 0
          ? store.leagueInfo[store.currentLeagueIndex].lastScoredWeek
          : 14);
        week++
      ) {
        const opponentId = otherTeam.matchups[week];
        const opponent = teams.find(
          (t) => t.matchups[week] === opponentId && t !== otherTeam
        );

        if (!opponent) continue;

        // Would this team have won with their points against this opponent?
        if (team.points[week] > opponent.points[week]) {
          winsWithThisSchedule++;
        }
      }

      // Track best and worst possible records
      if (winsWithThisSchedule > bestRecord) {
        bestRecord = winsWithThisSchedule;
        bestScheduleTeam = otherTeam.teamName;
      }

      if (winsWithThisSchedule < worstRecord) {
        worstRecord = winsWithThisSchedule;
        worstScheduleTeam = otherTeam.teamName;
      }
    });
    return {
      teamName: team.teamName,
      actualWins: team.actualWins,
      expectedWins: team.expectedWins,
      bestPossibleRecord: bestRecord,
      worstPossibleRecord: worstRecord,
      bestScheduleTeam,
      worstScheduleTeam,
      recordRange: bestRecord - worstRecord,
      avatarImg: team.avatarImg,
    };
  });

  return result.sort(
    (a, b) => b.actualWins - b.expectedWins - (a.actualWins - a.expectedWins)
  );
});

const bestManagers = computed(() => {
  return props.tableData
    .slice()
    .sort(
      (a, b) =>
        b.potentialPoints - b.pointsFor - (a.potentialPoints - a.pointsFor)
    );
});

const uniquePlayers = computed(() => {
  const result = props.tableData.map((user) => {
    // Flatten all the starter arrays into one array of IDs
    const allStarterIds = user.starters.flat();

    // Get the set of unique IDs
    const uniqueStarterIds = new Set(allStarterIds);

    return {
      id: user.id,
      name: store.showUsernames ? user.username : user.name,
      avatar: user.avatarImg,
      uniqueStarterCount: uniqueStarterIds.size,
      // uniqueStarterIds: Array.from(uniqueStarterIds) // (optional, if you want the IDs)
    };
  });
  return result
    .sort((a, b) => b.uniqueStarterCount - a.uniqueStarterCount)
    .slice(0, 14);
});

const originalPlayers = computed(() => {
  const result = props.tableData.map((user) => {
    const draftedPicks = league.value.draftPicks
      ?.filter((pick) => pick.rosterId === user.rosterId)
      .map((pick) => pick.playerId);
    let playerCount = 0;
    user.players.forEach((player) => {
      if (draftedPicks?.includes(player)) {
        playerCount += 1;
      }
    });

    return {
      userId: user.id,
      userName: store.showUsernames ? user.username : user.name,
      totalDrafted: draftedPicks?.length,
      stillOnTeam: playerCount,
    };
  });
  return result.sort((a, b) => b.stillOnTeam - a.stillOnTeam).slice(0, 14);
});

const pointsFromWaivers = computed(() => {
  let result: any[] = [];
  props.tableData.forEach((user) => {
    let sum = 0;
    const draftedPlayers = league.value.draftPicks
      ?.filter((pick) => pick.rosterId === user.rosterId)
      .map((player) => player.playerId);

    user.starters.forEach((week, weekIndex) => {
      week.forEach((starter, starterIndex) => {
        if (!draftedPlayers?.includes(starter)) {
          sum += user.starterPoints[weekIndex][starterIndex];
        }
      });
    });
    result.push({
      name: store.showUsernames ? user.username : user.name,
      avatar: user.avatarImg,
      pointsFromWaivers: Math.round(sum * 100) / 100,
    });
  });
  result.sort((a, b) => b.pointsFromWaivers - a.pointsFromWaivers);
  return result;
});

const draftRankings = computed(() => {
  return league.value.draftGrades
    ?.map((user) => ({
      grade: user.grade,
      user: props.tableData.find(
        (manager) => manager.rosterId === user.picks[0].draftPick.rosterId
      ),
    }))
    .sort(
      (a, b) =>
        (a.user?.regularSeasonRank ?? 0) - (b.user?.regularSeasonRank ?? 0)
    )
    .slice(0, 14);
});

const allTimeRecord = computed(() => {
  let result = props.tableData.map((user) => ({
    name: store.showUsernames ? user.username : user.name,
    rosterId: user.rosterId,
    userId: user.id,
    wins: user.wins,
    losses: user.losses,
    ties: user.ties,
    avatarImg: user.avatarImg,
  }));

  if (league.value.previousLeagues.length > 0) {
    league.value.previousLeagues.forEach((league: LeagueInfoType) => {
      league.rosters.forEach((roster: RosterType) => {
        let currentUser = result.find((user) => user.userId === roster.id);
        if (currentUser) {
          currentUser.wins += roster.wins;
          currentUser.losses += roster.losses;
          currentUser.ties += roster.ties;
        }
      });
    });
  }
  return result.sort((a, b) => b.wins - a.wins);
});

const winStreak = computed(() => {
  let result = props.tableData.map((user) => ({
    name: store.showUsernames ? user.username : user.name,
    avatar: user.avatarImg,
    streak: getCurrentStreak(user.recordByWeek),
  }));

  return result.sort((a, b) => {
    const getNumber = (obj: any) => parseInt(obj.streak.slice(1), 10);

    return getNumber(b) - getNumber(a);
  });
});

const getMatchups = () => {
  const matchupDifferences: any[] = [];

  props.tableData.forEach((teamA) => {
    teamA.matchups.forEach((matchupId: any, matchupIndex: number) => {
      if (matchupId === null) {
        return;
      }

      const teamB = props.tableData.find(
        (team) => team !== teamA && team.matchups[matchupIndex] === matchupId
      );

      if (teamB && teamB.matchups[matchupIndex] !== null) {
        const scoreA = teamA.points[matchupIndex];
        const scoreB = teamB.points[matchupIndex];

        if (
          typeof scoreA === "number" &&
          typeof scoreB === "number" &&
          !isNaN(scoreA) &&
          !isNaN(scoreB) &&
          scoreA !== 0 &&
          scoreB !== 0
        ) {
          const difference = Math.abs(scoreA - scoreB);
          matchupDifferences.push({
            teamA: teamA,
            teamB: teamB,
            scoreA: scoreA,
            scoreB: scoreB,
            difference: difference,
            matchupId: matchupId,
            matchupIndex: matchupIndex,
          });
        }
      }
    });
  });

  const uniqueMatchups: any[] = [];
  const processedMatchups = new Set();

  matchupDifferences.forEach((matchup) => {
    const teamAId =
      matchup.teamA.id ||
      matchup.teamA.name ||
      `teamA-idx-${matchup.matchupIndex}`;
    const teamBId =
      matchup.teamB.id ||
      matchup.teamB.name ||
      `teamB-idx-${matchup.matchupIndex}`;

    const sortedTeamIds = [teamAId, teamBId].sort();
    const id = `${sortedTeamIds[0]}-${sortedTeamIds[1]}-${matchup.matchupId}`;

    if (!processedMatchups.has(id)) {
      uniqueMatchups.push(matchup);
      processedMatchups.add(id);
    }
  });
  uniqueMatchups.sort((a, b) => a.difference - b.difference);
  closestMatchups.value = uniqueMatchups.slice(0, 5);

  uniqueMatchups.sort((a, b) => b.difference - a.difference);
  farthestMatchups.value = uniqueMatchups.slice(0, 5);
};

const getCurrentStreak = (str: string): string => {
  const match = str.match(/([WL])\1*$/);
  if (!match) return "";
  return match[1] + match[0].length;
};

const getUserObject = (userId: string) => {
  return props.tableData.find((user) => user.id === userId);
};

onMounted(() => {
  getMatchups();
});
</script>

<template>
  <div
    class="w-full h-screen mt-4 overflow-y-scroll font-sans text-white rounded-lg snap-y snap-mandatory bg-zinc-900 scroll-smooth"
  >
    <!-- Intro Slide -->
    <WrappedSlide bg-color="bg-gradient-to-r from-green-950 to-gray-900">
      <div class="">
        <h1 class="font-bold md:text-8xl">{{ league.season }}</h1>
        <h1
          class="mb-8 text-4xl font-bold text-transparent md:text-9xl bg-gradient-to-r from-green-400 to-lime-600 bg-clip-text"
        >
          Wrapped
        </h1>
        <p class="text-xl text-gray-400 md:text-xl">
          The stats are in. The league champion has been crowned. Lets see how
          everyone in
          <!-- <span class="font-bold text-gray-200">{{ league.name }}</span> -->
          <span class="font-bold text-gray-200">Test League</span>
          really did.
        </p>
      </div>
      <p
        class="absolute bottom-0 ml-8 text-gray-400 -translate-x-1/3 left-1/3 animate-bounce"
      >
        SCROLL TO REVEAL
      </p>
    </WrappedSlide>

    <!-- First Pick Slide -->
    <WrappedSlide bg-color="bg-zinc-900" alignment="center">
      <h2 class="mb-8 text-5xl font-bold text-purple-400">
        Where it all began...
      </h2>
      <div class="flex flex-col items-center gap-6">
        <div class="flex items-center gap-4">
          <img
            class="w-16 h-16 border-4 border-purple-500 rounded-full shadow-lg"
            :src="league.draftMetadata?.order[0].avatarImg"
          />
          <span class="text-xl font-semibold">{{
            store.showUsernames
              ? league.draftMetadata?.order[0].username
              : league.draftMetadata?.order[0].name
          }}</span>
        </div>
        <div class="text-lg">Started off the draft with</div>
        <div
          class="flex flex-col items-center w-full p-6 shadow-xl bg-zinc-800 rounded-2xl"
        >
          <img
            alt="Player image"
            class="object-cover w-32 h-32 mb-4 shadow-md rounded-xl"
            :src="`https://sleepercdn.com/content/nfl/players/thumb/${league.draftPicks?.[0].playerId}.jpg`"
          />
          <p class="text-2xl font-bold">
            {{ league.draftPicks?.[0].firstName }}
            {{ league.draftPicks?.[0].lastName }}
          </p>
          <p class="mt-2 text-sm text-zinc-400">Pick 1.01</p>
        </div>
      </div>
    </WrappedSlide>

    <!-- Best Picks Slide -->
    <WrappedSlide bg-color="bg-indigo-950" alignment="center">
      <h2 class="mb-8 text-5xl font-bold text-indigo-300">
        Drafted to Perfection
      </h2>
      <p class="mb-6 -mt-2 text-lg font-medium text-indigo-200">
        Draft picks that made you look like a fantasy genius.
      </p>
      <div class="w-full space-y-4">
        <div
          v-for="(pick, index) in bestPicks?.slice(0, 5)"
          class="flex items-center gap-4 p-4 bg-white/10 rounded-xl backdrop-blur-sm"
        >
          <div class="text-3xl font-bold text-indigo-400 opacity-50">
            #{{ index + 1 }}
          </div>
          <img
            alt="Player image"
            class="w-20 rounded-lg"
            :src="`https://sleepercdn.com/content/nfl/players/thumb/${pick.playerId}.jpg`"
          />
          <div class="flex-1 min-w-0">
            <p class="font-bold truncate">
              {{ pick.firstName }} {{ pick.lastName }}
            </p>
            <p class="text-sm text-indigo-200">
              Round {{ pick.round }} • Pick {{ pick.draftSlot }} ({{
                pick.pickNumber
              }})
            </p>
          </div>
          <div class="flex flex-col items-end truncate w-36">
            <img
              class="w-8 h-8 border border-indigo-300 rounded-full"
              :src="getUserObject(pick.userId)?.avatarImg"
            />
            <p>
              {{
                store.showUsernames
                  ? getUserObject(pick.userId)?.username
                  : getUserObject(pick.userId)?.name
              }}
            </p>
          </div>
        </div>
      </div>
    </WrappedSlide>

    <!-- Worst Picks Slide -->
    <WrappedSlide bg-color="bg-red-950" alignment="center">
      <h2 class="mb-8 text-5xl font-bold text-red-400">Buyer's Remorse</h2>
      <p class="mb-6 -mt-2 text-lg font-medium text-red-200">
        Draft picks that didn't quite pan out...
      </p>
      <div class="w-full space-y-4">
        <div
          v-for="(pick, index) in worstPicks?.slice(0, 5)"
          class="flex items-center gap-4 p-4 border bg-white/5 rounded-xl border-red-900/50"
        >
          <div class="text-3xl font-bold text-red-500 opacity-50">
            #{{ index + 1 }}
          </div>
          <img
            alt="Player image"
            class="w-20 rounded-lg"
            :src="`https://sleepercdn.com/content/nfl/players/thumb/${pick.playerId}.jpg`"
          />
          <div class="flex-1 min-w-0">
            <p class="font-bold text-red-400 truncate">
              {{ pick.firstName }} {{ pick.lastName }}
            </p>
            <p class="text-sm text-red-200">
              Round {{ pick.round }} • Pick {{ pick.draftSlot }} ({{
                pick.pickNumber
              }})
            </p>
          </div>
          <div class="flex flex-col items-end truncate w-36">
            <img
              class="w-8 h-8 rounded-full opacity-70"
              :src="getUserObject(pick.userId)?.avatarImg"
            />
            <p>
              {{
                store.showUsernames
                  ? getUserObject(pick.userId)?.username
                  : getUserObject(pick.userId)?.name
              }}
            </p>
          </div>
        </div>
      </div>
    </WrappedSlide>

    <!-- Draft Steal Slide -->
    <WrappedSlide
      bg-color="bg-teal-950"
      alignment="center"
      v-if="draftSteal && draftSteal.length > 0"
    >
      <h2 class="mb-8 text-5xl font-bold text-teal-400">Late Round Legends</h2>
      <p class="mb-6 -mt-2 text-lg font-medium text-teal-200">
        Found gold while everyone else was digging for silver.
      </p>
      <div
        v-for="pick in draftSteal"
        class="flex flex-col items-center w-full p-6 mb-4 border bg-teal-900/30 rounded-2xl border-teal-500/30"
      >
        <img
          class="w-16 h-16 mb-4 border-2 border-teal-400 rounded-full"
          :src="getUserObject(pick.userId)?.avatarImg"
        />
        <div class="mb-4 text-xl font-bold">
          {{
            store.showUsernames
              ? getUserObject(pick.userId)?.username
              : getUserObject(pick.userId)?.name
          }}
        </div>

        <div class="flex items-center gap-4 p-4 bg-black/20 rounded-xl">
          <img
            alt="Player image"
            class="w-16 rounded"
            :src="`https://sleepercdn.com/content/nfl/players/thumb/${pick.playerId}.jpg`"
          />
          <div class="text-left">
            <p class="text-2xl font-bold text-teal-100">
              {{ pick.firstName }} {{ pick.lastName }}
            </p>
            <p class="text-teal-300">
              Round {{ pick.round }} • Pick
              {{ pick.pickNumber }}
            </p>
          </div>
        </div>
      </div>
    </WrappedSlide>

    <!-- Loyalty / Retention Slide -->
    <WrappedSlide bg-color="bg-blue-950" alignment="center">
      <h2 class="mb-8 text-5xl font-bold text-blue-400">Day Ones</h2>
      <p class="mb-6 -mt-4 text-lg text-blue-200">
        The number of drafted players that earned their spot and never left.
      </p>

      <div
        class="grid w-full grid-flow-col grid-cols-2 gap-4"
        :style="`grid-template-rows: repeat(${leagueSize / 2}, minmax(0, 1fr))`"
      >
        <div
          v-for="user in originalPlayers"
          class="flex items-center justify-between p-3 rounded-lg bg-blue-900/40"
        >
          <div class="flex items-center gap-3">
            <img
              class="w-10 h-10 rounded-full"
              :src="getUserObject(user.userId)?.avatarImg"
            />
            <span class="text-sm font-semibold">{{ user.userName }}</span>
          </div>
          <div class="text-right">
            <span class="text-xl font-bold text-blue-300"
              >{{ user.stillOnTeam }}/{{ user.totalDrafted }}</span
            >
          </div>
        </div>
      </div>
    </WrappedSlide>

    <!-- Total Players Used Slide -->
    <WrappedSlide bg-color="bg-sky-950" alignment="center">
      <h2 class="mb-6 text-5xl font-bold text-sky-400">The Full Cast</h2>
      <p class="mb-6 text-lg text-blue-200">
        The total number of different starting players.
      </p>
      <div
        class="grid w-full grid-flow-col grid-cols-2 gap-4 overflow-auto"
        :style="`grid-template-rows: repeat(${leagueSize / 2}, minmax(0, 1fr))`"
      >
        <div
          v-for="user in uniquePlayers"
          class="flex items-center justify-between p-3 rounded-lg bg-sky-900/40"
        >
          <div class="flex items-center gap-3">
            <img class="w-10 h-10 rounded-full" :src="user.avatar" />
            <span class="text-sm font-semibold">{{ user.name }}</span>
          </div>
          <div class="text-right">
            <span class="text-xl font-bold text-sky-300">{{
              user.uniqueStarterCount
            }}</span>
          </div>
        </div>
      </div>
    </WrappedSlide>

    <!-- Trade Slide -->
    <WrappedSlide bg-color="bg-emerald-950" v-if="impactfulTrades">
      <h2 class="mb-2 text-5xl font-bold text-emerald-400">
        Blockbuster Trade
      </h2>
      <p class="mt-4 mb-8 text-lg text-emerald-200/80">
        The one that shook the league.
      </p>

      <div class="flex flex-col w-full gap-6">
        <!-- Team 1 Side -->
        <div
          class="p-4 border bg-emerald-900/40 rounded-2xl border-emerald-800/50"
        >
          <div class="flex items-center gap-3 mb-4">
            <img
              class="w-10 h-10 border-2 rounded-full border-emerald-500"
              :src="impactfulTrades.team1.user.avatarImg"
            />
            <span class="font-bold">{{
              store.showUsernames
                ? impactfulTrades.team1.user.username
                : impactfulTrades.team1.user.name
            }}</span>
          </div>
          <div class="flex flex-wrap gap-2">
            <div
              v-for="(player, idx) in impactfulTrades.team1.players"
              class="flex items-center gap-2 p-2 text-sm rounded-lg bg-emerald-950/50"
            >
              <img
                class="w-8 rounded"
                :src="`https://sleepercdn.com/content/nfl/players/thumb/${impactfulTrades.team1.playerIds[idx]}.jpg`"
              />
              {{ player }}
            </div>
          </div>
        </div>

        <!-- Exchange Icon -->
        <div class="text-2xl rotate-90 text-emerald-500">⇄</div>

        <!-- Team 2 Side -->
        <div
          class="p-4 border bg-emerald-900/40 rounded-2xl border-emerald-800/50"
        >
          <div class="flex items-center gap-3 mb-4">
            <img
              class="w-10 h-10 border-2 rounded-full border-emerald-500"
              :src="impactfulTrades.team2.user.avatarImg"
            />
            <span class="font-bold">{{
              store.showUsernames
                ? impactfulTrades.team2.user.username
                : impactfulTrades.team2.user.name
            }}</span>
          </div>
          <div class="flex flex-wrap gap-2">
            <div
              v-for="(player, idx) in impactfulTrades.team2.players"
              class="flex items-center gap-2 p-2 text-sm rounded-lg bg-emerald-950/50"
            >
              <img
                class="w-8 rounded"
                :src="`https://sleepercdn.com/content/nfl/players/thumb/${impactfulTrades.team2.playerIds[idx]}.jpg`"
              />
              {{ player }}
            </div>
          </div>
        </div>
      </div>
    </WrappedSlide>

    <!-- Waiver Wire Slide -->
    <WrappedSlide bg-color="bg-cyan-950">
      <h2 class="mb-6 text-5xl font-bold text-cyan-400 bg-clip-text">
        Waiver Wire Warriors
      </h2>
      <p class="mb-6 text-lg text-cyan-200">
        Some lived on the waiver wire. Some pretended it didn't exist.
      </p>
      <div class="grid w-full grid-cols-2 gap-4">
        <div class="flex flex-col items-center p-4 bg-cyan-900/30 rounded-2xl">
          <div class="mb-2 text-xs tracking-widest uppercase text-cyan-300">
            Most Active
          </div>
          <img
            class="w-16 h-16 mb-3 border-4 rounded-full border-cyan-500/50"
            :src="mostMoves.user.avatarImg"
          />
          <div class="font-bold text-center">
            {{
              store.showUsernames
                ? mostMoves.user.username
                : mostMoves.user.name
            }}
          </div>
          <div class="text-3xl font-black text-cyan-400">
            {{ mostMoves.moves }}
          </div>
          <div class="text-xs text-cyan-500/80">Moves</div>
        </div>

        <div class="flex flex-col items-center p-4 bg-cyan-900/30 rounded-2xl">
          <div class="mb-2 text-xs tracking-widest uppercase text-cyan-300">
            Least Active
          </div>
          <img
            class="w-16 h-16 mb-3 border-4 rounded-full border-cyan-500/50"
            :src="fewestMoves.user.avatarImg"
          />
          <div class="font-bold text-center">
            {{
              store.showUsernames
                ? fewestMoves.user.username
                : fewestMoves.user.name
            }}
          </div>
          <div class="text-3xl font-black text-cyan-400">
            {{ fewestMoves.moves }}
          </div>
          <div class="text-xs text-cyan-500/80">Moves</div>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div
          v-if="league.waiverType === 2 && totalBids?.highest"
          class="w-full mt-4"
        >
          <div class="mb-2 text-xl font-semibold text-center text-cyan-200">
            Big Spender
          </div>
          <div
            class="flex items-center justify-center gap-4 p-4 bg-cyan-900/20 rounded-xl"
          >
            <img
              class="w-12 h-12 rounded-full"
              :src="totalBids.highest.user.avatarImg"
            />
            <div class="text-left">
              <div class="text-lg font-bold">
                {{
                  store.showUsernames
                    ? totalBids.highest.user.username
                    : totalBids.highest.user.name
                }}
              </div>
              <div class="font-mono text-cyan-400">
                ${{ totalBids.highest.sumByStatus.complete }} spent
              </div>
            </div>
          </div>
        </div>
        <div
          v-if="league.waiverType === 2 && totalBids?.lowest"
          class="w-full mt-4"
        >
          <div class="mb-2 text-xl font-semibold text-center text-cyan-200">
            Penny Pincher
          </div>
          <div
            class="flex items-center justify-center gap-4 p-4 bg-cyan-900/20 rounded-xl"
          >
            <img
              class="w-12 h-12 rounded-full"
              :src="totalBids.lowest.user.avatarImg"
            />
            <div class="text-left">
              <p class="text-lg font-bold">
                {{
                  store.showUsernames
                    ? totalBids.lowest.user.username
                    : totalBids.lowest.user.name
                }}
              </p>
              <p class="font-mono text-cyan-400">
                ${{ totalBids.lowest.sumByStatus.complete }} spent
              </p>
            </div>
          </div>
        </div>
      </div>
      <p class="mt-2 mb-2.5 text-xl font-semibold text-center text-cyan-200">
        Highest Bids
      </p>
      <div class="grid grid-cols-2 gap-4">
        <div
          v-for="bid in highestBids"
          class="flex justify-between bg-cyan-900/30 rounded-2xl"
        >
          <div class="p-3">
            <img
              alt="Player image"
              class="rounded-lg w-14"
              :src="`https://sleepercdn.com/content/nfl/players/thumb/${bid.player_id}.jpg`"
            />
            <p class="w-24 mt-1 font-semibold text-left">
              {{ bid.position }} {{ bid.adds }}
            </p>
          </div>
          <div class="mt-10">
            <p class="font-semibold">
              {{ store.showUsernames ? bid.user.username : bid.user.name }}
            </p>
            <p class="text-xs text-cyan-500/80">Week {{ bid.week }}</p>
          </div>
          <p class="p-3 text-2xl font-bold mt-7 text-cyan-400">
            ${{ bid.bid }}
          </p>
        </div>
      </div>
    </WrappedSlide>

    <!-- Best Pickups Slide -->
    <WrappedSlide
      bg-color="bg-teal-950"
      alignment="center"
      v-if="bestPickups.length > 0"
    >
      <h2 class="mb-8 text-5xl font-bold text-teal-400">The Pickup Artists</h2>
      <p class="mb-8 text-lg text-teal-200">
        Found league winners in the bargain bin.
      </p>
      <div class="w-full space-y-4">
        <div
          v-for="(move, index) in bestPickups"
          class="flex items-center gap-4 p-4 bg-white/10 rounded-xl backdrop-blur-sm"
        >
          <div class="text-3xl font-bold text-teal-500 opacity-50">
            #{{ index + 1 }}
          </div>
          <div class="flex-1">
            <div class="flex items-center gap-2">
              <img
                class="w-20 rounded"
                :src="`https://sleepercdn.com/content/nfl/players/thumb/${move.player_id}.jpg`"
              />
              <div>
                <div class="font-bold">{{ move.position }} {{ move.adds }}</div>
                <div class="text-xs text-teal-200">
                  Week {{ move.week }} • Avg Rank: {{ move.value }}
                </div>
              </div>
            </div>
          </div>
          <div class="flex flex-col items-end">
            <img class="w-8 h-8 rounded-full" :src="move.user.avatarImg" />
            <p>
              {{ store.showUsernames ? move.user.username : move.user.name }}
            </p>
          </div>
        </div>
      </div>
    </WrappedSlide>

    <!-- Predictions Slide -->
    <WrappedSlide
      bg-color="bg-purple-950"
      alignment="center"
      v-if="draftRankings && draftRankings.length > 0"
    >
      <h2 class="mb-8 text-5xl font-bold text-purple-400">
        Expectations vs. Reality
      </h2>
      <p class="mb-8 text-lg text-purple-200">
        Sleeper said A+. Reality said otherwise.
      </p>
      <div
        class="grid gap-4 w-full max-h-[70vh] grid-cols-2 grid-flow-col"
        :style="`grid-template-rows: repeat(${leagueSize / 2}, minmax(0, 1fr))`"
      >
        <div
          v-for="grade in draftRankings"
          class="flex items-center justify-between p-3 rounded-lg bg-purple-900/40"
        >
          <div class="flex items-center gap-3">
            <img class="w-8 h-8 rounded-full" :src="grade.user?.avatarImg" />
            <span class="text-sm font-bold">{{
              store.showUsernames ? grade.user?.username : grade.user?.name
            }}</span>
          </div>
          <div class="flex items-center gap-4 text-right">
            <div class="flex flex-col items-center">
              <span class="text-xs text-purple-300 uppercase">Rank</span>
              <span class="text-lg font-bold text-white">{{
                grade.user?.regularSeasonRank
              }}</span>
            </div>
            <div class="flex flex-col items-center">
              <span class="text-xs text-purple-300 uppercase">Grade</span>
              <span class="text-lg font-bold">{{ grade.grade }}</span>
            </div>
          </div>
        </div>
      </div>
    </WrappedSlide>

    <!-- Schedule Luck Slide -->
    <WrappedSlide bg-color="bg-fuchsia-950">
      <h2 class="mb-6 -mt-4 text-5xl font-bold text-fuchsia-400">
        Schedule Roulette
      </h2>
      <p class="mb-6 text-lg text-fuchsia-200">
        One got easy matchups. One got the gauntlet. Life isn't fair.
      </p>
      <div class="grid grid-cols-2 gap-4">
        <!-- Luckiest -->
        <div>
          <div class="flex items-center gap-4 px-2 mb-1">
            <h3
              class="text-sm font-bold tracking-widest uppercase text-fuchsia-200"
            >
              Luckiest Schedules
            </h3>
          </div>
          <div v-for="schedule in scheduleAnalysis.slice(0, 3)" class="mb-4">
            <div class="flex justify-between p-4 bg-fuchsia-900/30 rounded-2xl">
              <div class="flex gap-4">
                <img
                  class="border-2 rounded-full w-14 h-14 border-fuchsia-500"
                  :src="schedule.avatarImg"
                />
                <div class="text-left">
                  <p class="text-lg font-bold text-left truncate w-36">
                    {{ schedule.teamName }}
                  </p>
                  <p class="text-xs text-fuchsia-300/80">
                    Expected Wins:
                    <span class="text-fuchsia-200">{{
                      schedule.expectedWins.toFixed(1)
                    }}</span>
                  </p>
                  <p class="text-xs text-fuchsia-300/80">
                    Actual:
                    <span class="text-fuchsia-200">{{
                      schedule.actualWins
                    }}</span>
                  </p>
                </div>
              </div>
              <div>
                <p class="mt-2 text-2xl font-semibold">
                  +{{
                    (schedule.actualWins - schedule.expectedWins).toFixed(2)
                  }}
                </p>
                <p class="text-xs">Wins</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Unluckiest -->
        <div>
          <div class="flex items-center gap-4 px-2 mb-1">
            <h3
              class="text-sm font-bold tracking-widest uppercase text-fuchsia-200"
            >
              Hardest Roads
            </h3>
          </div>
          <div
            v-for="schedule in scheduleAnalysis.slice(-3).reverse()"
            class="mb-4"
          >
            <div class="flex justify-between p-4 bg-fuchsia-900/30 rounded-2xl">
              <div class="flex gap-4">
                <img
                  class="border-2 rounded-full w-14 h-14 border-fuchsia-500"
                  :src="schedule.avatarImg"
                />
                <div class="text-left">
                  <p class="text-lg font-bold text-left truncate w-36">
                    {{ schedule.teamName }}
                  </p>
                  <p class="text-xs text-fuchsia-300/80">
                    Expected Wins:
                    <span class="text-fuchsia-200">{{
                      schedule.expectedWins.toFixed(1)
                    }}</span>
                  </p>
                  <p class="text-xs text-fuchsia-300/80">
                    Actual:
                    <span class="text-fuchsia-200">{{
                      schedule.actualWins
                    }}</span>
                  </p>
                </div>
              </div>
              <div>
                <p class="mt-2 text-2xl font-semibold">
                  {{ (schedule.actualWins - schedule.expectedWins).toFixed(2) }}
                </p>
                <p class="text-xs">Wins</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </WrappedSlide>

    <!-- Matchups Slide -->
    <WrappedSlide bg-color="bg-rose-950" alignment="center">
      <h2 class="mb-6 text-5xl font-bold text-rose-400">
        Too Close vs. Not Even Close
      </h2>
      <p class="mb-6 text-lg text-rose-200">
        Some matchups came down to the wire. Some were over by noon.
      </p>
      <div class="grid w-full grid-cols-2 gap-4">
        <!-- Closest -->
        <div v-if="closestMatchups.length > 0">
          <div class="mb-2 text-sm font-bold text-left uppercase text-rose-200">
            Nail Biters
          </div>
          <div
            v-for="matchup in closestMatchups.slice(0, 3)"
            class="p-4 mb-4 border bg-rose-900/30 rounded-xl border-rose-500/20"
          >
            <div class="flex justify-between">
              <div class="truncate w-44">
                <div class="flex gap-3">
                  <img
                    class="w-8 h-8 rounded-full"
                    :src="matchup.teamA.avatarImg"
                  />
                  <span class="text-xl font-bold">{{ matchup.scoreA }}</span>
                </div>
                <p class="w-32 mt-1 text-left truncate">
                  {{
                    store.showUsernames
                      ? matchup.teamA.username
                      : matchup.teamA.name
                  }}
                </p>
              </div>
              <div>
                <span class="font-bold text-rose-500">VS</span>
                <div class="mt-2 text-xs text-center text-rose-300">
                  Week {{ matchup.matchupIndex + 1 }}
                </div>
              </div>
              <div class="truncate w-44">
                <div class="flex justify-end gap-2">
                  <span class="text-xl font-bold">{{ matchup.scoreB }}</span>
                  <img
                    class="w-8 h-8 rounded-full"
                    :src="matchup.teamB.avatarImg"
                  />
                </div>
                <p class="float-right w-32 mt-1 text-right truncate">
                  {{
                    store.showUsernames
                      ? matchup.teamB.username
                      : matchup.teamB.name
                  }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Blowout -->
        <div v-if="farthestMatchups.length > 0">
          <div class="mb-2 text-sm font-bold text-left uppercase text-rose-200">
            Biggest Blowouts
          </div>
          <div
            v-for="matchup in farthestMatchups.slice(0, 3)"
            class="p-4 mb-4 border bg-rose-900/30 rounded-xl border-rose-500/20"
          >
            <div class="flex justify-between">
              <div class="truncate w-44">
                <div class="flex gap-3">
                  <img
                    class="w-8 h-8 rounded-full"
                    :src="matchup.teamA.avatarImg"
                  />
                  <span class="text-xl font-bold">{{ matchup.scoreA }}</span>
                </div>
                <p class="mt-1 text-left truncate w-36">
                  {{ matchup.teamA.name }}
                </p>
              </div>
              <div>
                <span class="font-bold text-rose-500">VS</span>
                <div class="mt-2 text-xs text-center text-rose-300">
                  Week {{ matchup.matchupIndex + 1 }}
                </div>
              </div>
              <div class="truncate w-44">
                <div class="flex justify-end gap-2">
                  <span class="text-xl font-bold">{{ matchup.scoreB }}</span>
                  <img
                    class="w-8 h-8 rounded-full"
                    :src="matchup.teamB.avatarImg"
                  />
                </div>
                <p class="float-right mt-1 text-right truncate w-36">
                  {{ matchup.teamB.name }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </WrappedSlide>

    <!-- Win Streak Slide -->
    <WrappedSlide bg-color="bg-orange-950" alignment="center">
      <h2 class="mb-6 text-5xl font-bold text-orange-400">Hot and Cold</h2>
      <p class="mb-6 text-lg text-orange-200">
        Hottest run. Coldest stretch. Momentum is everything.
      </p>
      <div class="flex flex-col gap-4">
        <div v-for="user in winStreak.slice(0, 3)" class="relative">
          <div
            class="bg-orange-900/40 p-6 rounded-2xl border border-orange-500/30 flex flex-col items-center min-w-[200px]"
          >
            <img
              class="w-12 h-12 mb-4 border-4 border-orange-500 rounded-full"
              :src="user.avatar"
            />
            <div class="mb-2 text-xl font-bold">{{ user.name }}</div>
            <div class="text-3xl font-black text-orange-500">
              {{ user.streak }}
            </div>
          </div>
        </div>
      </div>
    </WrappedSlide>

    <!-- Legacy Slide -->
    <WrappedSlide
      bg-color="bg-slate-900"
      alignment="center"
      v-if="
        allTimeRecord &&
        allTimeRecord.length > 0 &&
        league.previousLeagues.length > 0
      "
    >
      <h2 class="mb-6 text-5xl font-bold text-slate-200">The History Books</h2>
      <p class="mb-6 text-lg text-slate-200">
        All time regular season records.
      </p>
      <div
        class="grid w-full grid-flow-col grid-cols-2 gap-4"
        :style="`grid-template-rows: repeat(${leagueSize / 2}, minmax(0, 1fr))`"
      >
        <div
          v-for="user in allTimeRecord.slice(0, 12)"
          class="flex items-center justify-between p-3 rounded-lg bg-slate-800"
        >
          <div class="flex items-center gap-3">
            <img class="w-8 h-8 rounded-full" :src="user.avatarImg" />
            <span class="font-medium">{{ user.name }}</span>
          </div>
          <div class="font-mono font-bold text-slate-300">
            {{ user.wins }}-{{ user.losses
            }}<span v-if="user.ties > 0">-{{ user.ties }}</span>
          </div>
        </div>
      </div>
    </WrappedSlide>

    <!-- Efficiency Slide -->
    <WrappedSlide bg-color="bg-amber-950" alignment="center">
      <h2 class="mb-4 text-5xl font-bold text-amber-500">Left on the Bench</h2>

      <p class="mb-6 text-lg text-amber-200">
        How many points did you leave sitting on your bench?
      </p>

      <div
        class="grid w-full grid-flow-col grid-cols-2 gap-4 overflow-auto"
        :style="`grid-template-rows: repeat(${leagueSize / 2}, minmax(0, 1fr))`"
      >
        <div
          v-for="user in bestManagers"
          class="flex items-center justify-between p-3 rounded-lg bg-amber-900/40"
        >
          <div class="flex items-center gap-3">
            <img class="w-10 h-10 rounded-full" :src="user.avatarImg" />
            <span class="text-sm font-semibold">{{
              store.showUsernames ? user.username : user.name
            }}</span>
          </div>
          <div class="text-right">
            <p class="text-xl font-bold text-amber-300">
              {{ user.potentialPoints - user.pointsFor }}
            </p>
          </div>
        </div>
      </div>
    </WrappedSlide>

    <!-- Points from Waivers Slide -->
    <WrappedSlide bg-color="bg-violet-950" alignment="center">
      <h2 class="mb-4 text-5xl font-bold text-violet-500">
        Waiver Wire Impact
      </h2>

      <p class="mb-6 text-lg text-violet-200">
        Points scored from players you didn't draft.
      </p>

      <div
        class="grid w-full grid-flow-col grid-cols-2 gap-4 overflow-auto"
        :style="`grid-template-rows: repeat(${leagueSize / 2}, minmax(0, 1fr))`"
      >
        <div
          v-for="user in pointsFromWaivers"
          class="flex items-center justify-between p-3 rounded-lg bg-violet-900/40"
        >
          <div class="flex items-center gap-3">
            <img class="w-10 h-10 rounded-full" :src="user.avatar" />
            <span class="text-sm font-semibold">{{ user.name }}</span>
          </div>
          <div class="text-right">
            <p class="text-xl font-bold text-violet-300">
              {{ user.pointsFromWaivers }}
            </p>
          </div>
        </div>
      </div>
    </WrappedSlide>

    <!-- Outro Slide -->
    <WrappedSlide bg-color="bg-black" alignment="center">
      <div class="space-y-6">
        <h1 class="mb-4 text-6xl font-black text-white">
          See you next season!
        </h1>
        <p class="text-zinc-300">Thank you for using ffwrapped ❤️</p>
      </div>
    </WrappedSlide>
    <!-- workaround to get data without copying over methods -->
    <Draft v-show="false" />
    <Trades v-show="false" />
    <Waivers v-show="false" />
    <LeagueHistory v-show="false" :table-data="tableData" />
  </div>
</template>

<style>
/* Hide scrollbar for a cleaner look */
div::-webkit-scrollbar {
  display: none;
}
div {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
