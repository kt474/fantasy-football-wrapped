<script setup lang="ts">
import { computed, ref, onMounted } from "vue";
import {
  TableDataType,
  LeagueInfoType,
  RosterType,
} from "../../types/types.ts";
import { useStore } from "../../store/store";
import { maxBy, minBy } from "lodash";
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
    .slice(0, 1);
});

const highestBids = computed(() => {
  return league.value.waiverMoves
    ?.slice()
    .sort((a, b) => (b.bid ?? 0) - (a.bid ?? 0))
    .slice(0, 5);
});

const bestPickups = computed(() => {
  return league.value.waiverMoves
    ?.filter(
      (obj) =>
        obj.value !== null && obj.position !== "DEF" && obj.position !== "K"
    )
    .sort((a, b) => (a.value ?? 0) - (b.value ?? 0))
    .slice(0, 5);
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
    const grouped = league.value.waiverMoves.reduce((acc: any, obj: any) => {
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
    }, {});
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
    .sort((a, b) => b.managerEfficiency - a.managerEfficiency);
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
  return result.sort((a, b) => b.uniqueStarterCount - a.uniqueStarterCount);
});

const originalPlayers = computed(() => {
  return props.tableData.map((user) => {
    // Get all draft picks made by this user (could also match by rosterId if needed)
    const draftedPicks = league.value.draftPicks?.filter(
      (pick) => pick.rosterId === user.rosterId
    );
    // Count how many of those players are still on their team
    const playersStillOnTeam = league.value.draftPicks?.filter((pick) =>
      user.players.includes(pick.playerId)
    );

    return {
      userId: user.id,
      userName: user.name,
      totalDrafted: draftedPicks?.length,
      stillOnTeam: playersStillOnTeam?.length,
      playerIds: playersStillOnTeam?.map((p) => p.playerId), // Optional: to see which
    };
  });
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
      name: user.name,
      avatar: user.avatarImg,
      pointsFromWaivers: Math.round(sum * 100) / 100,
    });
  });
  result.sort((a, b) => b.pointsFromWaivers - a.pointsFromWaivers);
  return result;
});

const draftRankings = computed(() => {
  return league.value.draftGrades?.map((user) => ({
    grade: user.grade,
    user: props.tableData.find(
      (manager) => manager.rosterId === user.picks[0].draftPick.rosterId
    ),
  }));
});

const allTimeRecord = computed(() => {
  let result = props.tableData.map((user) => ({
    name: user.name,
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
  return result;
});

const winStreak = computed(() => {
  let result = props.tableData.map((user) => ({
    name: user.name,
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

// Best/worst draft picks DONE
// Best/worst trades DONE
// Best/worst waiver moves DONE
// Most/fewest moves DONE
// Biggest blowouts/closest matchups DONE
// Unluckiest/luckiest DONE
// Most points left on bench (potential points) DONE
// Players drafted still on team DONE
// Total players used DONE

// Predraft rankings DONE
// If multiple years, show all time record DONE

// Points gained from waivers`? (difficult) DONE
// Win/lose streaks DONE

// Overall League recap
// League Champ
</script>
<template>
  <div class="pt-4 text-center text-gray-900 geist-text dark:text-gray-200">
    <!-- Intro -->
    <div>
      <h1 class="my-2 text-3xl font-semibold">Test League</h1>
      <h2 class="my-2 text-5xl font-semibold">{{ league.season }} Wrapped</h2>
      <!-- <p>{{ league.seasonType }} {{ league.scoringType }}</p> -->
      <p>
        It's been a season to remember. Let's review your fantasy football
        journey through 2025.
      </p>
    </div>
    <!-- Draft Intro -->
    <div>
      <h1 class="my-2 text-5xl font-semibold">Let's start with the draft</h1>
      <div class>
        <div class="flex justify-center mb-4">
          <img
            class="w-10 h-10 mr-2 rounded-full"
            :src="league.draftMetadata?.order[0].avatarImg"
          />
          <p class="text-xl font-semibold">
            {{ league.draftMetadata?.order[0].name }}
          </p>
        </div>
        <p>Started off {{ league.season }} with</p>
        <div class="flex justify-center">
          <img
            alt="Player image"
            class="w-14 sm:h-auto object-cover mr-2.5"
            :src="`https://sleepercdn.com/content/nfl/players/thumb/${league.draftPicks?.[0].playerId}.jpg`"
          />
          <p>
            {{ league.draftPicks?.[0].firstName }}
            {{ league.draftPicks?.[0].lastName }}
          </p>
        </div>
      </div>
    </div>
    <!-- Draft -->
    <div>
      <h2 class="my-4 text-3xl font-semibold">Best picks</h2>
      <div>
        <div
          class="flex my-2 justify-evenly"
          v-for="(pick, index) in bestPicks"
        >
          <div>
            <img
              class="w-10 h-10 mb-2 mr-2 rounded-full"
              :src="getUserObject(pick.userId)?.avatarImg"
            />
            <p>{{ getUserObject(pick.userId)?.name }}</p>
          </div>
          <p>
            {{ index + 1 }}. {{ pick.position }} {{ pick.firstName }}
            {{ pick.lastName }}
          </p>
          <img
            alt="Player image"
            class="w-10 h-10"
            :src="`https://sleepercdn.com/content/nfl/players/thumb/${pick.playerId}.jpg`"
          />
          <p>
            Drafted round {{ pick.round }}, pick {{ pick.draftSlot }} ({{
              pick.pickNumber
            }})
          </p>
          <p>Positional rank {{ pick.rank }}</p>
        </div>
      </div>
      <h2 class="text-3xl font-semibold">Worst picks</h2>
      <div>
        <div
          class="flex my-2 justify-evenly"
          v-for="(pick, index) in worstPicks"
        >
          <div>
            <img
              class="w-10 h-10 mb-2 mr-2 rounded-full"
              :src="getUserObject(pick.userId)?.avatarImg"
            />
            <p>{{ getUserObject(pick.userId)?.name }}</p>
          </div>
          <img
            alt="Player image"
            class="w-10 h-10"
            :src="`https://sleepercdn.com/content/nfl/players/thumb/${pick.playerId}.jpg`"
          />
          <p>
            {{ index + 1 }}. {{ pick.position }} {{ pick.firstName }}
            {{ pick.lastName }}
          </p>
          <p>
            Drafted round {{ pick.round }}, pick {{ pick.draftSlot }} ({{
              pick.pickNumber
            }})
          </p>
          <p>Positional rank {{ pick.rank }}</p>
        </div>
      </div>
    </div>
    <div>
      <h2 class="mt-20 mb-4 text-3xl font-semibold">Steal of the draft</h2>
      <div class="flex justify-center">
        <img
          class="w-10 h-10 mb-2 mr-2 rounded-full"
          :src="getUserObject(draftSteal?.[0].userId)?.avatarImg"
        />
        <p class="text-xl font-semibold">
          {{ getUserObject(draftSteal?.[0].userId)?.name }}
        </p>
      </div>
      <div class="flex justify-center">
        <img
          alt="Player image"
          class="w-10"
          :src="`https://sleepercdn.com/content/nfl/players/thumb/${draftSteal?.[0].playerId}.jpg`"
        />

        <p>
          {{ draftSteal?.[0].position }} {{ draftSteal?.[0].firstName }}
          {{ draftSteal?.[0].lastName }}
        </p>
      </div>
      <p>
        Drafted round {{ draftSteal?.[0].round }}, pick
        {{ draftSteal?.[0].draftSlot }} ({{ draftSteal?.[0].pickNumber }})
      </p>
      <p>Positional Rank: {{ draftSteal?.[0].rank }}</p>
    </div>
    <!-- Trades -->
    <div>
      <h2 class="mt-20 text-3xl font-semibold">Trades</h2>
      <p class="my-2">
        {{ league.tradeNames?.length }} trades were made this season.
      </p>
      <p class="my-2">Here's the most impactful.</p>
      <div>
        <div class="flex justify-center">
          <img
            class="w-10 h-10 mb-2 mr-2 rounded-full"
            :src="impactfulTrades?.team1.user.avatarImg"
          />
          <p>{{ impactfulTrades?.team1.user.name }}</p>
        </div>
        <div
          v-for="(player, index) in impactfulTrades?.team1.players"
          class="flex justify-center"
        >
          <img
            alt="Player image"
            class="w-10"
            :src="`https://sleepercdn.com/content/nfl/players/thumb/${impactfulTrades?.team1.playerIds[index]}.jpg`"
          />
          <p>{{ player }}</p>
        </div>
        <div class="flex justify-center mt-4">
          <img
            class="w-10 h-10 mb-2 mr-2 rounded-full"
            :src="impactfulTrades?.team2.user.avatarImg"
          />
          <p>{{ impactfulTrades?.team2.user.name }}</p>
        </div>
        <div
          v-for="(player, index) in impactfulTrades?.team2.players"
          class="flex justify-center"
        >
          <img
            alt="Player image"
            class="w-10"
            :src="`https://sleepercdn.com/content/nfl/players/thumb/${impactfulTrades?.team2.playerIds[index]}.jpg`"
          />
          <p>{{ player }}</p>
        </div>
      </div>
    </div>
    <!-- Waivers -->
    <div>
      <h2 class="mt-20 text-3xl font-semibold">Waiver wire</h2>
      <p class="my-2">
        {{ league.waivers.length }} players were picked up on waivers or as free
        agents.
      </p>
      <div v-if="league.waiverType === 2">
        <h2 class="text-xl font-semibold">Highest Bids</h2>
        <p class="my-2">Here are the players your league wanted the most.</p>
        <div>
          <div v-for="move in highestBids" class="flex justify-evenly">
            <img
              class="w-10 mb-2 mr-2 rounded-full"
              :src="move.user.avatarImg"
            />
            <p>{{ move.user.name }}</p>

            <img
              alt="Player image"
              class="w-10"
              :src="`https://sleepercdn.com/content/nfl/players/thumb/${move.player_id}.jpg`"
            />
            <p>{{ move.position }} {{ move.adds }}</p>
            <p>${{ move.bid }}</p>
          </div>
        </div>
      </div>
      <h2 class="mt-4 text-xl font-semibold">Best Pickups</h2>
      <p class="my-2">The moves with the biggest impact.</p>
      <div>
        <div v-for="move in bestPickups" class="flex justify-evenly">
          <img class="w-10 mb-2 mr-2 rounded-full" :src="move.user.avatarImg" />
          <p>{{ move.user.name }}</p>

          <img
            alt="Player image"
            class="w-10"
            :src="`https://sleepercdn.com/content/nfl/players/thumb/${move.player_id}.jpg`"
          />
          <p>{{ move.position }} {{ move.adds }}</p>
          <p>Avg Rank: {{ move.value }}</p>
        </div>
      </div>
      <h2 class="mt-4 text-xl font-semibold">Most active</h2>
      <div class="flex my-2 justify-evenly">
        <img
          class="w-10 h-10 mb-2 mr-2 rounded-full"
          :src="mostMoves.user.avatarImg"
        />
        <p>{{ mostMoves.user.name }}</p>
        <p>{{ mostMoves.moves }} moves</p>
      </div>
      <h2 class="text-xl font-semibold">Least active</h2>
      <div class="flex my-2 justify-evenly">
        <img
          class="w-10 h-10 mb-2 mr-2 rounded-full"
          :src="fewestMoves.user.avatarImg"
        />
        <p>{{ fewestMoves.user.name }}</p>
        <p>{{ fewestMoves.moves }} moves</p>
      </div>
      <h2 class="text-xl font-semibold">Highest Bidders</h2>
      <div class="flex my-2 justify-evenly">
        <img
          class="w-10 h-10 mb-2 mr-2 rounded-full"
          :src="totalBids?.highest?.user.avatarImg"
        />
        <p>{{ totalBids?.highest.user.name }}</p>
        <p>${{ totalBids?.highest.sumByStatus.complete }} spent</p>
        <p v-if="totalBids.highest.sumByStatus.failed">
          ${{ totalBids?.highest.sumByStatus.failed }} in failed bids
        </p>
      </div>
      <h2 class="text-xl font-semibold">Lowest Bidders</h2>
      <p>This league member was way too frugal.</p>
      <div class="flex my-2 justify-evenly">
        <img
          class="w-10 h-10 mb-2 mr-2 rounded-full"
          :src="totalBids?.lowest?.user.avatarImg"
        />
        <p>{{ totalBids?.lowest.user.name }}</p>
        <p>${{ totalBids?.lowest.sumByStatus.complete }} spent</p>
        <p>${{ totalBids?.lowest.sumByStatus.failed }} in failed bids</p>
      </div>
    </div>
    <div>
      <h2 class="text-xl font-semibold">Luckiest Managers</h2>
      <p>These managers need to go buy a lottery ticket.</p>
      <div class="mb-2" v-for="user in scheduleAnalysis.slice(0, 3)">
        <div class="flex justify-center">
          <img class="w-10 h-10 mb-2 mr-2 rounded-full" :src="user.avatarImg" />
          <p>{{ user.teamName }}</p>
        </div>
        <p>Actual wins {{ user.actualWins }}</p>
        <p>Expected Wins {{ user.expectedWins }}</p>
        <p>
          Best record with a different schedule {{ user.bestPossibleRecord }}
        </p>
        <p>
          Worst record with a different schedule {{ user.worstPossibleRecord }}
        </p>
      </div>
    </div>
    <div>
      <h2 class="text-xl font-semibold">Unluckiest Managers</h2>
      <div class="mb-2" v-for="user in scheduleAnalysis.slice(-3)">
        <div class="flex justify-center">
          <img class="w-10 h-10 mb-2 mr-2 rounded-full" :src="user.avatarImg" />
          <p>{{ user.teamName }}</p>
        </div>
        <p>{{ user.teamName }}</p>
        <p>Actual wins {{ user.actualWins }}</p>
        <p>Expected Wins {{ user.expectedWins }}</p>
        <p>
          Best record with a different schedule {{ user.bestPossibleRecord }}
        </p>
        <p>
          Worst record with a different schedule {{ user.worstPossibleRecord }}
        </p>
      </div>
    </div>
    <div>
      <h2 class="text-xl font-semibold">Most Efficient Managers</h2>
      <div v-for="manager in bestManagers.slice(0, 3)">
        <div class="flex justify-center">
          <img
            class="w-10 h-10 mb-2 mr-2 rounded-full"
            :src="manager.avatarImg"
          />
          <p>{{ manager.name }}</p>
        </div>
        <p>{{ manager.managerEfficiency }}</p>
        <p>
          {{ manager.potentialPoints - manager.pointsFor }} Points left on the
          bench
        </p>
      </div>
    </div>
    <div>
      <h2 class="text-xl font-semibold">Least Efficient Manager</h2>
      <div v-for="manager in bestManagers.slice(-3)">
        <div class="flex justify-center">
          <img
            class="w-10 h-10 mb-2 mr-2 rounded-full"
            :src="manager.avatarImg"
          />
          <p>{{ manager.name }}</p>
        </div>
        <p>{{ manager.managerEfficiency }}</p>
        <p>
          {{ manager.potentialPoints - manager.pointsFor }} Points left on the
          bench
        </p>
      </div>
    </div>
    <div>
      <h2 class="text-xl font-semibold">Total Players Used</h2>
      <div>
        <div v-for="manager in uniquePlayers">
          <div class="flex justify-center">
            <img
              class="w-10 h-10 mb-2 mr-2 rounded-full"
              :src="manager.avatar"
            />
            <p>
              {{ manager.name }}
            </p>
          </div>
          <p>{{ manager.uniqueStarterCount }}</p>
        </div>
      </div>
    </div>
    <div>
      <h2 class="text-xl font-semibold">Drafted players still on team</h2>
      <div v-for="user in originalPlayers">
        <div class="flex justify-center">
          <img
            class="w-10 h-10 mb-2 mr-2 rounded-full"
            :src="getUserObject(user.userId)?.avatarImg"
          />
          <p>{{ user.userName }}</p>
        </div>
        <p>
          Drafted players still on team {{ user.stillOnTeam }} /
          {{ user.totalDrafted }}
        </p>
      </div>
    </div>
    <h2 class="text-xl font-semibold">Does ADP mean anything?</h2>
    <div>
      <div v-for="grade in draftRankings">
        <div class="flex justify-center">
          <img
            class="w-10 h-10 mb-2 mr-2 rounded-full"
            :src="grade.user?.avatarImg"
          />
          <p>{{ grade.user?.name }}</p>
        </div>
        <p>{{ grade.grade }}</p>
        <p>{{ grade.user?.regularSeasonRank }}</p>
      </div>
    </div>
    <div>
      <h2 class="text-xl font-semibold">All Time Records</h2>
      <div v-for="user in allTimeRecord">
        <div class="flex justify-center">
          <img class="w-10 h-10 mb-2 mr-2 rounded-full" :src="user.avatarImg" />
          <p>{{ user.name }}</p>
        </div>
        <p>
          {{ user.wins }} - {{ user.losses }}
          <span v-if="user.ties !== 0">{{ user.ties }}</span>
        </p>
      </div>
    </div>
    <h2 class="text-xl font-semibold">Closest Matchups</h2>
    <div v-for="matchup in closestMatchups">
      <div class="my-2">
        <div class="flex justify-center">
          <img
            class="w-10 h-10 mb-2 mr-2 rounded-full"
            :src="matchup.teamA.avatarImg"
          />
          <p>{{ matchup.teamA.name }} {{ matchup.scoreA }}</p>
        </div>
        <div class="flex justify-center">
          <img
            class="w-10 h-10 mb-2 mr-2 rounded-full"
            :src="matchup.teamB.avatarImg"
          />
          <p>{{ matchup.teamB.name }} {{ matchup.scoreB }}</p>
        </div>
      </div>
    </div>
    <h2 class="text-xl font-semibold">Biggest Blowouts</h2>
    <div v-for="matchup in farthestMatchups">
      <div class="my-2">
        <div class="flex justify-center">
          <img
            class="w-10 h-10 mb-2 mr-2 rounded-full"
            :src="matchup.teamA.avatarImg"
          />
          <p>{{ matchup.teamA.name }} {{ matchup.scoreA }}</p>
        </div>
        <div class="flex justify-center">
          <img
            class="w-10 h-10 mb-2 mr-2 rounded-full"
            :src="matchup.teamB.avatarImg"
          />
          <p>{{ matchup.teamB.name }} {{ matchup.scoreB }}</p>
        </div>
      </div>
    </div>
    <div>
      <h2 class="text-xl font-semibold">Points from non drafted players</h2>
      <div v-for="user in pointsFromWaivers" class="flex justify-evenly">
        <img class="w-10 h-10 mb-2 mr-2 rounded-full" :src="user.avatar" />
        <p>{{ user.name }}</p>
        <p>{{ user.pointsFromWaivers }}</p>
      </div>
    </div>
    <div>
      <h2 class="text-xl font-semibold">Longest Streaks</h2>
      <div v-for="user in winStreak.slice(0, 2)" class="flex justify-evenly">
        <img class="w-10 h-10 mb-2 mr-2 rounded-full" :src="user.avatar" />
        <p>{{ user.name }}</p>
        <p>{{ user.streak }}</p>
      </div>
    </div>
    <h2 class="text-xl font-semibold">Playoffs</h2>
    <h2 class="text-xl font-semibold">League Champion</h2>
    <!-- workaround to get data without copying over methods -->
    <Draft v-show="false" />
    <Trades v-show="false" />
    <Waivers v-show="false" />
    <LeagueHistory v-show="false" :table-data="tableData" />
  </div>
</template>
<style scoped>
.geist-text {
  font-family: "Geist", sans-serif;
}
</style>
