<script setup lang="ts">
import { computed, ref, onMounted, watch } from "vue";
import {
  TableDataType,
  // LeagueInfoType,
  // RosterType,
} from "../../types/types.ts";
import { useStore } from "../../store/store";
// import { maxBy, minBy } from "lodash";
import WrappedSlide from "./WrappedSlide.vue";
// import Draft from "../draft/Draft.vue";
// import Trades from "../roster_management/Trades.vue";
// import Waivers from "../roster_management/Waivers.vue";
// import LeagueHistory from "../league_history/LeagueHistory.vue";
// import OverallStats from "./OverallStats.vue";

const store = useStore();
const props = defineProps<{
  tableData: TableDataType[];
}>();

const closestMatchups: any = ref([]);
const farthestMatchups: any = ref([]);
const loading: any = ref(true);

const isShareSupported = ref(false);

if (typeof window !== "undefined") {
  isShareSupported.value = !!navigator.share;
}

// const share = async () => {
//   try {
//     await navigator.share({
//       title: document.title,
//       text: "ffwrapped 2025",
//       url: window.location.href,
//     });
//   } catch (error) {
//     console.error("Sharing failed:", error);
//   }
// };

// const chartOptions = ref({
//   chart: {
//     foreColor: "#ffffff",
//     height: 350,
//     type: "line",
//     zoom: {
//       enabled: false,
//     },
//     toolbar: {
//       show: false,
//     },
//     animations: {
//       enabled: false,
//     },
//   },
//   colors: ["#f97316"],
//   tooltip: {
//     theme: "dark",
//   },
//   dataLabels: {
//     enabled: true,
//   },
//   stroke: {
//     curve: "smooth",
//   },
//   markers: {
//     size: 1,
//   },
//   title: {
//     text: "Weekly Points",
//     style: {
//       fontSize: "16px",
//       fontFamily:
//         "ui-sans-serif, system-ui, sans-serif, Apple Color Emoji, Segoe UI Emoji",
//       fontWeight: 600,
//     },
//   },

//   responsive: [
//     {
//       breakpoint: 480,
//       options: {
//         chart: {
//           width: 290,
//           height: 230,
//         },
//         legend: {
//           position: "bottom",
//         },
//       },
//     },
//   ],

//   xaxis: {
//     title: {
//       text: "Week",
//       style: {
//         fontSize: "16px",
//         fontFamily:
//           "ui-sans-serif, system-ui, sans-serif, Apple Color Emoji, Segoe UI Emoji",
//         fontWeight: 600,
//       },
//     },
//   },
//   yaxis: {
//     title: {
//       text: "Points",
//       style: {
//         fontSize: "16px",
//         fontFamily:
//           "ui-sans-serif, system-ui, sans-serif, Apple Color Emoji, Segoe UI Emoji",
//         fontWeight: 600,
//       },
//     },
//   },
// });

// const seriesData = computed(() => {
//   const user = props.tableData.find(
//     (user) => user.rosterId === currentManager.value.rosterId
//   );
//   return [
//     {
//       name: currentManager.value.name,
//       data: user?.points.slice(0, league.value.regularSeasonLength),
//     },
//   ];
// });

// const getOrdinalSuffix = (number: number) => {
//   const suffixes = ["th", "st", "nd", "rd"];
//   const v = number % 100;

//   return number + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
// };

// const managers = computed(() => {
//   if (store.leagueInfo.length > 0) {
//     return props.tableData.map((user) => {
//       return {
//         name: store.showUsernames ? user.username : user.name,
//         rosterId: user.rosterId,
//       };
//     });
//   }
//   return [];
// });

// const currentManager = ref(managers.value[0]);

const league = computed(() => {
  return store.leagueInfo[store.currentLeagueIndex];
});

// const leagueSize = computed(() => {
//   return league.value.totalRosters;
// });

// const bestPicks = computed(() => {
//   return league.value.draftPicks
//     ?.filter((obj) => obj.position !== "TE")
//     .sort((a, b) => b.pickRank - a.pickRank)
//     .slice(0, 5);
// });

// const worstPicks = computed(() => {
//   return league.value.draftPicks
//     ?.filter((obj) => obj.position !== "TE" && obj.position !== "K")
//     .sort((a, b) => a.pickRank - b.pickRank)
//     .slice(0, 5);
// });

// const draftSteal = computed(() => {
//   return league.value.draftPicks
//     ?.filter((obj) => obj.pickNumber > 36)
//     .filter((obj) => obj.position !== "TE")
//     .sort((a, b) => b.pickRank - a.pickRank)
//     .slice(0, 3);
// });

// const highestBids = computed(() => {
//   return league.value.waiverMoves
//     ?.slice()
//     .filter((bid) => bid.status === "complete")
//     .sort((a, b) => (b.bid ?? 0) - (a.bid ?? 0))
//     .slice(0, 4);
// });

// const bestPickups = computed(() => {
//   return (
//     league.value.waiverMoves
//       ?.filter(
//         (obj) =>
//           obj.value !== null &&
//           obj.position !== "DEF" &&
//           obj.position !== "K" &&
//           obj.player_id !== "12530" && // filter out travis hunter
//           obj.status === "complete"
//       )
//       .sort((a, b) => (a.value ?? 0) - (b.value ?? 0))
//       .slice(0, 5) ?? []
//   );
// });

// const mostMoves = computed(() => {
//   const maxKey: any = Object.keys(league.value.transactions).reduce(
//     (a: any, b: any) =>
//       league.value.transactions[a] > league.value.transactions[b] ? a : b
//   );
//   const user = league.value.users.find((user) => user.id === maxKey);
//   return {
//     user: user,
//     moves: league.value.transactions[maxKey],
//   };
// });

// const fewestMoves = computed(() => {
//   const activeRosterIds = league.value.rosters.map((roster) => roster.id);
//   const maxKey: any = Object.keys(league.value.transactions)
//     .filter((id) => activeRosterIds.includes(id))
//     .reduce((a: any, b: any) =>
//       league.value.transactions[b] > league.value.transactions[a] ? a : b
//     );
//   const user = league.value.users.find((user) => user.id === maxKey);
//   return {
//     user: user,
//     moves: league.value.transactions[maxKey],
//   };
// });

// const totalBids = computed(() => {
//   if (league.value.waiverMoves) {
//     const grouped: any[] = league.value.waiverMoves.reduce(
//       (acc: any, obj: any) => {
//         const userId = obj.user.id;
//         const status = obj.status;

//         if (!acc[userId]) {
//           acc[userId] = {
//             user: obj.user,
//             sumByStatus: {},
//             totalSpent: 0,
//           };
//         }
//         acc[userId].sumByStatus[status] =
//           (acc[userId].sumByStatus[status] || 0) + obj.bid;
//         acc[userId].totalSpent += obj.bid;

//         return acc;
//       },
//       {}
//     );
//     return {
//       highest: maxBy(Object.values(grouped), "totalSpent"),
//       lowest: minBy(Object.values(grouped), "totalSpent"),
//     };
//   }
// });

// const impactfulTrades = computed(() => {
//   if (!league.value.tradeNames) return [];

//   return league.value.tradeNames.slice().sort((a, b) => {
//     const aValues = [...(a.team1.value || []), ...(a.team2.value || [])];
//     const bValues = [...(b.team1.value || []), ...(b.team2.value || [])];

//     const minA = aValues.reduce(
//       (min, val) => (val != null && val < min ? val : min),
//       Infinity
//     );
//     const minB = bValues.reduce(
//       (min, val) => (val != null && val < min ? val : min),
//       Infinity
//     );

//     return minA - minB;
//   });
// });

// const scheduleData = computed(() => {
//   return props.tableData.map((user) => {
//     return {
//       teamName: store.showUsernames ? user.username : user.name,
//       avatarImg: user.avatarImg,
//       matchups: user.matchups,
//       points: user.points,
//       actualWins: user.wins,
//       expectedWins: user.randomScheduleWins,
//     };
//   });
// });

// const scheduleAnalysis = computed(() => {
//   const teams = scheduleData.value;

//   let result = teams.map((team) => {
//     let bestRecord = team.actualWins;
//     let worstRecord = team.actualWins;
//     let bestScheduleTeam = team.teamName;
//     let worstScheduleTeam = team.teamName;

//     // Try each other team's schedule
//     teams.forEach((otherTeam) => {
//       if (otherTeam.teamName === team.teamName) return;

//       let winsWithThisSchedule = 0;

//       // Play this team's points against the other team's opponents
//       for (
//         let week = 0;
//         week <
//         (store.leagueInfo.length > 0
//           ? store.leagueInfo[store.currentLeagueIndex].lastScoredWeek
//           : 14);
//         week++
//       ) {
//         const opponentId = otherTeam.matchups[week];
//         const opponent = teams.find(
//           (t) => t.matchups[week] === opponentId && t !== otherTeam
//         );

//         if (!opponent) continue;

//         // Would this team have won with their points against this opponent?
//         if (team.points[week] > opponent.points[week]) {
//           winsWithThisSchedule++;
//         }
//       }

//       // Track best and worst possible records
//       if (winsWithThisSchedule > bestRecord) {
//         bestRecord = winsWithThisSchedule;
//         bestScheduleTeam = otherTeam.teamName;
//       }

//       if (winsWithThisSchedule < worstRecord) {
//         worstRecord = winsWithThisSchedule;
//         worstScheduleTeam = otherTeam.teamName;
//       }
//     });
//     return {
//       teamName: team.teamName,
//       actualWins: team.actualWins,
//       expectedWins: team.expectedWins,
//       bestPossibleRecord: bestRecord,
//       worstPossibleRecord: worstRecord,
//       bestScheduleTeam,
//       worstScheduleTeam,
//       recordRange: bestRecord - worstRecord,
//       avatarImg: team.avatarImg,
//     };
//   });

//   return result.sort(
//     (a, b) => b.actualWins - b.expectedWins - (a.actualWins - a.expectedWins)
//   );
// });

// const bestManagers = computed(() => {
//   return props.tableData
//     .slice()
//     .sort(
//       (a, b) =>
//         b.potentialPoints - b.pointsFor - (a.potentialPoints - a.pointsFor)
//     );
// });

// const uniquePlayers = computed(() => {
//   const result = props.tableData.map((user) => {
//     // Flatten all the starter arrays into one array of IDs
//     const allStarterIds = user.starters.flat();

//     // Get the set of unique IDs
//     const uniqueStarterIds = new Set(allStarterIds);

//     return {
//       id: user.id,
//       name: store.showUsernames ? user.username : user.name,
//       avatar: user.avatarImg,
//       uniqueStarterCount: uniqueStarterIds.size,
//       // uniqueStarterIds: Array.from(uniqueStarterIds) // (optional, if you want the IDs)
//     };
//   });
//   return result
//     .sort((a, b) => b.uniqueStarterCount - a.uniqueStarterCount)
//     .slice(0, 14);
// });

// const originalPlayers = computed(() => {
//   const result = props.tableData.map((user) => {
//     const draftedPicks = league.value.draftPicks
//       ?.filter((pick) => pick.rosterId === user.rosterId)
//       .map((pick) => pick.playerId);
//     let playerCount = 0;
//     user.players.forEach((player) => {
//       if (draftedPicks?.includes(player)) {
//         playerCount += 1;
//       }
//     });

//     return {
//       userId: user.id,
//       userName: store.showUsernames ? user.username : user.name,
//       totalDrafted: draftedPicks?.length,
//       stillOnTeam: playerCount,
//     };
//   });
//   return result.sort((a, b) => b.stillOnTeam - a.stillOnTeam).slice(0, 14);
// });

// const pointsFromWaivers = computed(() => {
//   let result: any[] = [];
//   props.tableData.forEach((user) => {
//     let sum = 0;
//     const draftedPlayers = league.value.draftPicks
//       ?.filter((pick) => pick.rosterId === user.rosterId)
//       .map((player) => player.playerId);

//     user.starters.forEach((week, weekIndex) => {
//       week.forEach((starter, starterIndex) => {
//         if (!draftedPlayers?.includes(starter)) {
//           sum += user.starterPoints[weekIndex][starterIndex];
//         }
//       });
//     });
//     result.push({
//       name: store.showUsernames ? user.username : user.name,
//       avatar: user.avatarImg,
//       pointsFromWaivers: Math.round(sum * 100) / 100,
//     });
//   });
//   result.sort((a, b) => b.pointsFromWaivers - a.pointsFromWaivers);
//   return result;
// });

// const allTimeRecord = computed(() => {
//   let result = props.tableData.map((user) => ({
//     name: store.showUsernames ? user.username : user.name,
//     rosterId: user.rosterId,
//     userId: user.id,
//     wins: user.wins,
//     losses: user.losses,
//     ties: user.ties,
//     avatarImg: user.avatarImg,
//   }));

//   if (league.value.previousLeagues.length > 0) {
//     league.value.previousLeagues.forEach((league: LeagueInfoType) => {
//       league.rosters.forEach((roster: RosterType) => {
//         let currentUser = result.find((user) => user.userId === roster.id);
//         if (currentUser) {
//           currentUser.wins += roster.wins;
//           currentUser.losses += roster.losses;
//           currentUser.ties += roster.ties;
//         }
//       });
//     });
//   }
//   return result.sort((a, b) => b.wins - a.wins);
// });

// const winStreak = computed(() => {
//   let result = props.tableData.map((user) => ({
//     name: store.showUsernames ? user.username : user.name,
//     avatar: user.avatarImg,
//     streak: getAllStreaks(user.recordByWeek),
//   }));

//   result.sort((a, b) => b.streak.length - a.streak.length);
//   return result;
// });

// const totalSlides = computed(() => {
//   if (league.value.previousLeagues.length > 0) {
//     return 18;
//   }
//   return 17;
// });

// const teamName = computed(() => {
//   const currentTeam: any = props.tableData.find(
//     (user) => user.rosterId === currentManager.value.rosterId
//   );
//   return getTeamName(currentTeam);
// });

// const getTeamName = (user: TableDataType) => {
//   if (user.regularSeasonRank === 1 && getPointsRank(user.pointsFor) <= 2) {
//     return ["The Unquestioned Tyrant", "Best record with high points scored"];
//   } else if (user.regularSeasonRank === league.value.totalRosters) {
//     return ["The Walking Bye Week", "Last place in the regular season"];
//   } else if (user.wins - user.randomScheduleWins > 2.2) {
//     return ["The Schedule Merchant", "Extremely lucky matchups"];
//   } else if (user.randomScheduleWins - user.wins > 2.2) {
//     return [
//       "Weekly Victim of Career Performances",
//       "Extremely unlucky matchups",
//     ];
//   } else if (
//     user.regularSeasonRank >= 8 &&
//     league.value.transactions[user.id] <= 16
//   ) {
//     return [
//       "Set It and Forget It",
//       "Poor performing team with few waiver moves",
//     ];
//   } else if (
//     user.regularSeasonRank >= 8 &&
//     league.value.transactions[user.id] >= 40
//   ) {
//     return [
//       "The Panic Button Presser",
//       "Poor performing team with many wavier moves",
//     ];
//   } else if (
//     user.regularSeasonRank <= 4 &&
//     league.value.transactions[user.id] <= 15
//   ) {
//     return ["Won on Draft Day", "Finished top 4 with few waiver moves"];
//   } else if (
//     user.regularSeasonRank > league.value.playoffTeams &&
//     user.managerEfficiency < 0.875
//   ) {
//     return [
//       "Should've Just Used the Projections",
//       "Missed the playoffs with low start/sit efficiency",
//     ];
//   } else if (getPointsAgainstRank(user.pointsAgainst) === 1) {
//     return ["The League Punching Bag", "Most points against"];
//   } else if (
//     user.regularSeasonRank <= 4 &&
//     getPointsRank(user.pointsFor) >= 8
//   ) {
//     return ["The Fraud", "Finished top 4 with bottom 4 points scored"];
//   } else if (
//     user.regularSeasonRank <= league.value.playoffTeams &&
//     getPointsRank(user.pointsFor) > league.value.playoffTeams
//   ) {
//     return [
//       "The Playoff Imposter",
//       "Made the playoffs with below average points",
//     ];
//   } else if (
//     user.regularSeasonRank > league.value.playoffTeams &&
//     getPointsRank(user.pointsFor) <= league.value.playoffTeams
//   ) {
//     return [
//       "All Those Points for Nothing",
//       "Missed the playoffs with above average points",
//     ];
//   } else if (user.managerEfficiency >= 0.915) {
//     return ["The Lineup Savant", "High start/sit efficiency"];
//   } else if (user.managerEfficiency <= 0.85) {
//     return ["Bench Points Champion", "Low start/sit efficiency"];
//   } else if (user.regularSeasonRank === league.value.playoffTeams) {
//     return ["Just Happy to Be Here", "Made the playoffs as the last seed"];
//   } else if (user.regularSeasonRank === league.value.playoffTeams + 1) {
//     return ["The Heartbreaker", "Just missed the playoffs"];
//   } else if (user.regularSeasonRank <= 3) {
//     return ["The Consistent Contender", "Top 3 regular season team"];
//   } else if (user.regularSeasonRank <= league.value.playoffTeams) {
//     return ["Textbook Mediocrity", "Average playoff team"];
//   } else if (user.regularSeasonRank > league.value.playoffTeams) {
//     return ["Mid Tier Disappointment", "Average consolation bracket team"];
//   }
//   return "Perfectly Average";
// };

// const totalPointsArray = computed(() => {
//   return props.tableData.map((user) => user.pointsFor).sort((a, b) => b - a);
// });

// const totalPointsAgainst = computed(() => {
//   return props.tableData
//     .map((user) => user.pointsAgainst)
//     .sort((a, b) => b - a);
// });

// const getPointsRank = (points: number) => {
//   return totalPointsArray.value.indexOf(points) + 1;
// };

// const getPointsAgainstRank = (points: number) => {
//   return totalPointsAgainst.value.indexOf(points) + 1;
// };

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

// const getAllStreaks = (str: string) => {
//   const streaks: any[] = [];
//   if (!str) return streaks;
//   let i = 0;
//   while (i < str.length) {
//     const ch = str[i];
//     let j = i + 1;
//     while (j < str.length && str[j] === ch) {
//       j++;
//     }
//     streaks.push({
//       type: ch,
//       length: j - i,
//       start: i,
//       end: j - 1,
//     });
//     i = j;
//   }
//   return streaks.reduce((a, b) => (b.length > a.length ? b : a), streaks[0]);
// };

// const getUserObject = (userId: string) => {
//   return props.tableData.find((user) => user.id === userId);
// };

// const onScroll = () => {
//   if (!slideshow.value) return;
//   const container: any = slideshow.value;
//   const slideHeight = container.clientHeight;
//   currentSlide.value = Math.round(container.scrollTop / slideHeight);
// };

// const scrollToSlide = (index: number) => {
//   if (!slideshow.value) return;
//   const container: any = slideshow.value;
//   container.scrollTo({
//     top: index * container.clientHeight,
//     behavior: "smooth",
//   });
// };

// const slideshow = ref(null);
// const currentSlide = ref(0);

onMounted(() => {
  getMatchups();
  if (league.value.draftGrades) {
    loading.value = false;
  }
});

watch(
  () => store.currentLeagueId,
  () => getMatchups()
);

watch(
  () => league.value.draftGrades,
  () => (loading.value = false)
);
</script>

<template>
  <div>
    <div
      class="w-full h-screen overflow-y-scroll font-sans text-white rounded-lg z-1 snap-y snap-mandatory bg-zinc-900 scroll-smooth"
    >
      <!-- Intro Slide -->
      <WrappedSlide bg-color="bg-gradient-to-r from-green-950 to-gray-900">
        <div class="absolute inset-0 pointer-events-none">
          <div
            class="absolute rounded-full w-80 h-80 bg-green-500/20 blur-3xl top-10 left-10"
            style="animation: float-slow 10s ease-in-out infinite"
          ></div>
          <div
            class="absolute rounded-full w-96 h-96 bg-lime-500/18 blur-3xl bottom-10 right-10"
            style="animation: float-slower 12s ease-in-out infinite"
          ></div>
          <div
            class="absolute w-56 h-56 rounded-full bg-green-400/15 blur-2xl top-1/3 left-1/2"
            style="animation: float 8s ease-in-out infinite"
          ></div>
        </div>
        <div class="">
          <h1 class="text-5xl font-bold md:text-8xl">{{ league.season }}</h1>
          <h1
            class="mb-8 text-6xl font-bold text-transparent md:text-9xl bg-gradient-to-r from-green-400 to-lime-600 bg-clip-text"
          >
            Wrapped
          </h1>
          <p class="text-lg text-gray-400 md:text-xl">
            Come back after Week 17 to see the wrapped for
            <span class="font-bold text-gray-200">{{ league.name }}</span
            >!
          </p>
        </div>
        <p
          class="absolute left-0 w-full text-center text-gray-400 animate-bounce bottom-4"
        >
          SCROLL TO REVEAL
        </p>
      </WrappedSlide>
    </div>
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

@keyframes float {
  0%,
  100% {
    transform: translateY(0px) translateX(0px);
  }
  50% {
    transform: translateY(-30px) translateX(20px);
  }
}

@keyframes float-slow {
  0%,
  100% {
    transform: translateY(0px) translateX(0px);
  }
  50% {
    transform: translateY(-35px) translateX(-25px);
  }
}

@keyframes float-slower {
  0%,
  100% {
    transform: translateY(0px) translateX(0px);
  }
  50% {
    transform: translateY(30px) translateX(35px);
  }
}

@keyframes gradient {
  0%,
  100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}
</style>
