<script setup lang="ts">
import { computed, ref, onMounted, watch } from "vue";
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
import OverallStats from "./OverallStats.vue";
import WinnerPyramid from "./WinnerPyramid.vue";

const store = useStore();
const props = defineProps<{
  tableData: TableDataType[];
}>();

const closestMatchups: any = ref([]);
const farthestMatchups: any = ref([]);
const loading = ref<boolean>(true);

const isShareSupported = ref(false);

if (typeof window !== "undefined") {
  isShareSupported.value = !!navigator.share;
}

const share = async () => {
  try {
    await navigator.share({
      title: document.title,
      text: "ffwrapped 2025",
      url: window.location.href,
    });
  } catch (error) {
    console.error("Sharing failed:", error);
  }
};

const chartOptions = ref({
  chart: {
    foreColor: "#ffffff",
    height: 350,
    type: "line",
    zoom: {
      enabled: false,
    },
    toolbar: {
      show: false,
    },
    animations: {
      enabled: false,
    },
  },
  colors: ["#f97316"],
  tooltip: {
    theme: "dark",
  },
  dataLabels: {
    enabled: true,
  },
  stroke: {
    curve: "smooth",
  },
  markers: {
    size: 1,
  },
  title: {
    text: "Weekly Points",
    style: {
      fontSize: "16px",
      fontFamily:
        "ui-sans-serif, system-ui, sans-serif, Apple Color Emoji, Segoe UI Emoji",
      fontWeight: 600,
    },
  },

  responsive: [
    {
      breakpoint: 480,
      options: {
        chart: {
          width: 290,
          height: 230,
        },
        legend: {
          position: "bottom",
        },
      },
    },
  ],

  xaxis: {
    title: {
      text: "Week",
      style: {
        fontSize: "16px",
        fontFamily:
          "ui-sans-serif, system-ui, sans-serif, Apple Color Emoji, Segoe UI Emoji",
        fontWeight: 600,
      },
    },
  },
  yaxis: {
    title: {
      text: "Points",
      style: {
        fontSize: "16px",
        fontFamily:
          "ui-sans-serif, system-ui, sans-serif, Apple Color Emoji, Segoe UI Emoji",
        fontWeight: 600,
      },
    },
  },
});

const seriesData = computed(() => {
  const user = props.tableData.find(
    (user) => user.rosterId === currentManager.value.rosterId
  );
  return [
    {
      name: currentManager.value.name,
      data: user?.points.slice(0, league.value.regularSeasonLength),
    },
  ];
});

const getOrdinalSuffix = (number: number) => {
  const suffixes = ["th", "st", "nd", "rd"];
  const v = number % 100;

  return number + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
};

const managers = computed(() => {
  if (store.leagueInfo.length > 0) {
    return props.tableData.map((user) => {
      return {
        name: store.showUsernames ? user.username : user.name,
        rosterId: user.rosterId,
      };
    });
  }
  return [];
});

const currentManager = ref(managers.value[0]);

const league = computed(() => {
  return store.leagueInfo[store.currentLeagueIndex];
});

const leagueSize = computed(() => {
  return league.value.totalRosters;
});

const bestPicks = computed(() => {
  return league.value.draftPicks
    ?.filter((obj) => obj.position !== "TE")
    .sort((a, b) => Number(b.pickRank) - Number(a.pickRank))
    .slice(0, 5);
});

const worstPicks = computed(() => {
  if (league.value.draftMetadata?.draftType !== "auction") {
    return league.value.draftPicks
      ?.filter((obj) => obj.position !== "TE" && obj.position !== "K")
      .sort((a, b) => Number(a.pickRank) - Number(b.pickRank))
      .slice(0, 5);
  } else {
    return league.value.draftPicks
      ?.filter((obj) => obj.position !== "TE" && obj.position !== "K")
      .filter((obj) => obj.amount > 12)
      .sort((a, b) => Number(a.pickRank) - Number(b.pickRank))
      .slice(0, 5);
  }
});

const draftSteal = computed(() => {
  if (league.value.draftPicks && league.value.draftPicks.length <= 48)
    return [];
  if (league.value.draftMetadata?.draftType !== "auction") {
    return league.value.draftPicks
      ?.filter((obj) => obj.pickNumber > 36)
      .filter((obj) => obj.position !== "TE")
      .sort((a, b) => Number(b.pickRank) - Number(a.pickRank))
      .slice(0, 3);
  } else {
    return league.value.draftPicks
      ?.filter((obj) => obj.amount < 20)
      .filter((obj) => obj.position !== "TE")
      .sort((a, b) => Number(b.pickRank) - Number(a.pickRank))
      .slice(0, 3);
  }
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
          obj.value !== null &&
          obj.position !== "DEF" &&
          obj.position !== "K" &&
          obj.player_id !== "12530" && // filter out travis hunter
          obj.status === "complete" &&
          obj.week < 16 // filter out most recent players
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
  const activeRosterIds = league.value.rosters.map((roster) => roster.id);
  const maxKey: any = Object.keys(league.value.transactions)
    .filter((id) => activeRosterIds.includes(id))
    .reduce((a: any, b: any) =>
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
  if (!league.value.tradeNames) return [];

  return league.value.tradeNames.slice().sort((a, b) => {
    const aValues = [...(a.team1.value || []), ...(a.team2.value || [])];
    const bValues = [...(b.team1.value || []), ...(b.team2.value || [])];

    const minA = aValues.reduce(
      (min, val) => (val != null && val < min ? val : min),
      Infinity
    );
    const minB = bValues.reduce(
      (min, val) => (val != null && val < min ? val : min),
      Infinity
    );

    return minA - minB;
  });
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
  interface resultType {
    name: string;
    avatar: string;
    pointsFromWaivers: number;
  }
  let result: resultType[] = [];
  props.tableData.forEach((user) => {
    let sum = 0;
    const draftedPlayers = league.value.draftPicks
      ?.filter((pick) => pick.rosterId === user.rosterId)
      .map((player) => player.playerId);

    if (user.starters) {
      user.starters.forEach((week, weekIndex) => {
        if (week) {
          week.forEach((starter, starterIndex) => {
            if (!draftedPlayers?.includes(starter)) {
              sum += user.starterPoints[weekIndex][starterIndex];
            }
          });
        }
      });
    }
    result.push({
      name: store.showUsernames ? user.username : user.name,
      avatar: user.avatarImg,
      pointsFromWaivers: Math.round(sum * 100) / 100,
    });
  });
  result.sort((a, b) => b.pointsFromWaivers - a.pointsFromWaivers);
  return result;
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
    streak: getAllStreaks(user.recordByWeek),
  }));

  result.sort((a, b) => b.streak.length - a.streak.length);
  return result;
});

const totalSlides = computed(() => {
  let total = 17;
  if (league.value.previousLeagues.length > 0) {
    total += 1;
  }
  if (draftSteal.value && draftSteal.value.length > 0) {
    total += 1;
  }
  return total;
});

const teamName = computed(() => {
  const currentTeam =
    props.tableData.find(
      (user) => user.rosterId === currentManager.value.rosterId
    ) ?? props.tableData[0];
  return getTeamName(currentTeam);
});

const getTeamName = (user: TableDataType) => {
  if (user.regularSeasonRank === 1 && getPointsRank(user.pointsFor) <= 2) {
    return ["The Unquestioned Tyrant", "Best record with high points scored"];
  } else if (user.regularSeasonRank === league.value.totalRosters) {
    return ["The Walking Bye Week", "Last place in the regular season"];
  } else if (
    user.regularSeasonRank >= 8 &&
    ((league.value.transactions[user.id] <= 16 &&
      league.value.seasonType !== "Dynasty") ||
      (league.value.transactions[user.id] <= 5 &&
        league.value.seasonType === "Dynasty"))
  ) {
    return [
      "Set It and Forget It",
      "Poor performing team with few waiver moves",
    ];
  } else if (
    user.regularSeasonRank >= 8 &&
    league.value.transactions[user.id] >= 40
  ) {
    return [
      "The Panic Button Presser",
      "Poor performing team with many wavier moves",
    ];
  } else if (
    user.regularSeasonRank <= 4 &&
    ((league.value.transactions[user.id] <= 15 &&
      league.value.seasonType !== "Dynasty") ||
      (league.value.transactions[user.id] <= 5 &&
        league.value.seasonType === "Dynasty"))
  ) {
    return ["Won on Draft Day", "Finished top 4 with few waiver moves"];
  } else if (
    user.regularSeasonRank > league.value.playoffTeams &&
    ((user.managerEfficiency < 0.875 &&
      league.value.seasonType !== "Dynasty") ||
      (user.managerEfficiency < 0.815 && league.value.seasonType === "Dynasty"))
  ) {
    return [
      "Just Use Projections",
      "Missed the playoffs with low start/sit efficiency",
    ];
  } else if (getPointsAgainstRank(user.pointsAgainst) === 1) {
    return ["The League Punching Bag", "Most points against"];
  } else if (
    user.regularSeasonRank <= 4 &&
    getPointsRank(user.pointsFor) >= 8
  ) {
    return ["The Fraud", "Finished top 4 with bottom 4 points scored"];
  } else if (
    user.regularSeasonRank <= league.value.playoffTeams &&
    getPointsRank(user.pointsFor) > league.value.playoffTeams
  ) {
    return [
      "The Playoff Imposter",
      "Made the playoffs with below average points",
    ];
  } else if (
    user.regularSeasonRank > league.value.playoffTeams &&
    getPointsRank(user.pointsFor) <= league.value.playoffTeams
  ) {
    return [
      "All Those Points for Nothing",
      "Missed the playoffs with above average points",
    ];
  } else if (user.wins - user.randomScheduleWins > 2.2) {
    return ["The Schedule Merchant", "Extremely lucky matchups"];
  } else if (user.randomScheduleWins - user.wins > 2.2) {
    return ["Victim of Career Performances", "Extremely unlucky matchups"];
  } else if (user.managerEfficiency >= 0.915) {
    return ["The Lineup Savant", "High start/sit efficiency"];
  } else if (
    (league.value.seasonType === "Dynasty" && user.managerEfficiency <= 0.8) ||
    (league.value.seasonType !== "Dynasty" && user.managerEfficiency <= 0.85)
  ) {
    return ["Bench Points Champion", "Low start/sit efficiency"];
  } else if (user.regularSeasonRank === league.value.playoffTeams) {
    return ["Just Happy to Be Here", "Made the playoffs as the last seed"];
  } else if (user.regularSeasonRank === league.value.playoffTeams + 1) {
    return ["The Heartbreaker", "Just missed the playoffs"];
  } else if (user.regularSeasonRank <= 3) {
    return ["The Consistent Contender", "Top 3 regular season team"];
  } else if (user.regularSeasonRank <= league.value.playoffTeams) {
    return ["Textbook Mediocrity", "Average playoff team"];
  } else if (user.regularSeasonRank > league.value.playoffTeams) {
    return ["Mid Tier Disappointment", "Average consolation bracket team"];
  }
  return "Perfectly Average";
};

const totalPointsArray = computed(() => {
  return props.tableData.map((user) => user.pointsFor).sort((a, b) => b - a);
});

const totalPointsAgainst = computed(() => {
  return props.tableData
    .map((user) => user.pointsAgainst)
    .sort((a, b) => b - a);
});

const getPointsRank = (points: number) => {
  return totalPointsArray.value.indexOf(points) + 1;
};

const getPointsAgainstRank = (points: number) => {
  return totalPointsAgainst.value.indexOf(points) + 1;
};

const getMatchups = () => {
  const matchupDifferences: any[] = [];

  props.tableData.forEach((teamA) => {
    teamA.matchups.forEach((matchupId, matchupIndex: number) => {
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

const getAllStreaks = (str: string) => {
  const streaks: any[] = [];
  if (!str) return streaks;
  let i = 0;
  while (i < str.length) {
    const ch = str[i];
    let j = i + 1;
    while (j < str.length && str[j] === ch) {
      j++;
    }
    streaks.push({
      type: ch,
      length: j - i,
      start: i,
      end: j - 1,
    });
    i = j;
  }
  return streaks.reduce((a, b) => (b.length > a.length ? b : a), streaks[0]);
};

const getUserObject = (userId: string) => {
  return props.tableData.find((user) => user.id === userId);
};

const leagueWinner = computed(() => {
  if (!league.value.leagueWinner) return null;
  return props.tableData.find(
    (user) => user.rosterId === Number(league.value.leagueWinner)
  );
});

const onScroll = () => {
  if (!slideshow.value) return;
  const container: any = slideshow.value;
  const slideHeight = container.clientHeight;
  currentSlide.value = Math.round(container.scrollTop / slideHeight);
};

const scrollToSlide = (index: number) => {
  if (!slideshow.value) return;
  const container: any = slideshow.value;
  container.scrollTo({
    top: index * container.clientHeight,
    behavior: "smooth",
  });
};

const slideshow = ref(null);
const currentSlide = ref(0);

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
      class="flex justify-center gap-1.5 z-40 bg-neutral-100 dark:bg-neutral-900 backdrop-blur-sm px-3 rounded-t-lg py-2 mt-4 -mb-6 relative opacity-20"
    >
      <button
        v-for="(_, index) in totalSlides"
        :key="index"
        @click="scrollToSlide(index)"
        :class="[
          'transition-all duration-300 rounded-full',
          currentSlide === index
            ? 'bg-neutral-900 dark:bg-neutral-100 w-8 h-2'
            : 'bg-neutral-400 hover:bg-neutral-300 w-2 h-2',
        ]"
        :aria-label="`Go to slide ${index + 1}`"
      />
    </div>
    <div
      v-if="!loading"
      ref="slideshow"
      @scroll="onScroll"
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
            The stats are in. The league champion has been crowned. Lets see how
            everyone in
            <span class="font-bold text-gray-200">{{ league.name }}</span>
            really did.
          </p>
        </div>
        <p
          class="absolute left-0 w-full text-center text-gray-400 animate-bounce bottom-4"
        >
          SCROLL TO REVEAL
        </p>
      </WrappedSlide>

      <!-- First Pick Slide -->
      <WrappedSlide bg-color="bg-zinc-900" alignment="center">
        <h2 class="mb-8 text-4xl font-bold text-purple-400 sm:text-5xl">
          Where it all began...
        </h2>
        <div class="flex flex-col items-center gap-6">
          <div class="flex items-center gap-4">
            <img
              v-if="league.draftMetadata?.order[0]?.avatarImg"
              class="w-16 h-16 border-4 border-purple-500 rounded-full shadow-lg"
              :src="league.draftMetadata?.order[0].avatarImg"
            />
            <svg
              v-else
              class="w-16 h-16 text-gray-200 border-4 border-purple-500 rounded-full shadow-lg"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z"
              />
            </svg>
            <span class="text-xl font-semibold">{{
              store.showUsernames
                ? league.draftMetadata?.order[0]?.username
                : league.draftMetadata?.order[0]?.name
            }}</span>
          </div>
          <div class="text-base sm:text-lg">Started off the draft with</div>
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
        <h2 class="mb-6 text-3xl font-bold text-indigo-300 sm:text-5xl">
          Drafted to Perfection
        </h2>
        <p class="mb-6 -mt-2 text-base font-medium text-indigo-200 sm:text-lg">
          Draft picks that made you look like a fantasy genius.
        </p>
        <div class="w-full space-y-2 sm:space-y-4">
          <div
            v-for="(pick, index) in bestPicks?.slice(0, 5)"
            class="flex items-center gap-1 p-4 sm:gap-4 bg-white/10 rounded-xl backdrop-blur-sm"
          >
            <p
              class="text-2xl font-bold text-indigo-400 opacity-50 sm:text-3xl"
            >
              #{{ index + 1 }}
            </p>
            <img
              alt="Player image"
              class="w-12 rounded-lg sm:w-20"
              :src="`https://sleepercdn.com/content/nfl/players/thumb/${pick.playerId}.jpg`"
            />

            <div class="flex-1 min-w-0">
              <p class="font-bold">{{ pick.firstName }} {{ pick.lastName }}</p>
              <p
                v-if="league.draftMetadata?.draftType !== 'auction'"
                class="text-xs text-indigo-200 sm:text-sm"
              >
                Round {{ pick.round }} • Pick {{ pick.draftSlot }} ({{
                  pick.pickNumber
                }})
              </p>
              <p v-else class="text-xs text-indigo-200 sm:text-sm">
                Winning bid ${{ pick.amount }}
              </p>
            </div>
            <div class="flex flex-col items-end max-w-20 sm:max-w-36">
              <img
                v-if="getUserObject(pick.userId)?.avatarImg"
                class="w-6 border border-indigo-300 rounded-full sm:w-8"
                :src="getUserObject(pick.userId)?.avatarImg"
              />
              <svg
                v-else
                class="w-6 text-gray-200 border border-indigo-300 rounded-full sm:w-8"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z"
                />
              </svg>
              <p
                class="w-16 text-xs break-words sm:w-36 text-end sm:text-base text-pretty"
              >
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
        <h2 class="mb-6 text-3xl font-bold text-red-400 sm:text-5xl">
          Buyer's Remorse
        </h2>
        <p class="mb-6 -mt-2 text-base font-medium text-red-200 sm:text-lg">
          Draft picks that didn't quite pan out...
        </p>
        <div class="w-full space-y-2 sm:space-y-4">
          <div
            v-for="(pick, index) in worstPicks?.slice(0, 5)"
            class="flex items-center gap-1 p-4 border sm:gap-4 bg-white/5 rounded-xl border-red-900/50"
          >
            <div class="text-2xl font-bold text-red-500 opacity-50 sm:text-3xl">
              #{{ index + 1 }}
            </div>
            <img
              alt="Player image"
              class="w-12 rounded-lg sm:w-20"
              :src="`https://sleepercdn.com/content/nfl/players/thumb/${pick.playerId}.jpg`"
            />
            <div class="flex-1 min-w-0">
              <p class="font-bold text-red-400">
                {{ pick.firstName }} {{ pick.lastName }}
              </p>
              <p
                v-if="league.draftMetadata?.draftType !== 'auction'"
                class="text-xs text-red-200 sm:text-sm"
              >
                Round {{ pick.round }} • Pick {{ pick.draftSlot }} ({{
                  pick.pickNumber
                }})
              </p>
              <p v-else class="text-xs text-red-200 sm:text-sm">
                Winning bid ${{ pick.amount }}
              </p>
            </div>
            <div class="flex flex-col items-end max-w-20 sm:max-w-36">
              <img
                v-if="getUserObject(pick.userId)?.avatarImg"
                class="w-6 rounded-full sm:w-8"
                :src="getUserObject(pick.userId)?.avatarImg"
              />
              <svg
                v-else
                class="w-6 text-gray-200 rounded-full sm:w-8"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z"
                />
              </svg>
              <p
                class="w-16 text-xs break-words sm:w-36 text-end sm:text-base text-pretty"
              >
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
        <h2 class="mb-4 text-3xl font-bold text-teal-400 sm:mb-6 sm:text-5xl">
          Late Round Legends
        </h2>
        <p
          class="mb-4 -mt-2 text-base font-medium text-teal-200 sm:mb-6 sm:text-lg"
        >
          Found gold while everyone else was digging for silver.
        </p>
        <div
          v-for="pick in draftSteal"
          class="flex flex-col items-center w-full px-2 py-3 mb-4 border bg-teal-900/30 rounded-2xl border-teal-500/30"
        >
          <img
            v-if="getUserObject(pick.userId)?.avatarImg"
            class="w-10 mb-2 border-2 border-teal-400 rounded-full sm:w-12"
            :src="getUserObject(pick.userId)?.avatarImg"
          />
          <svg
            v-else
            class="w-10 mb-2 text-gray-200 border-2 border-teal-400 rounded-full sm:w-12"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z"
            />
          </svg>
          <p class="mb-3 text-lg font-bold truncate sm:text-xl max-w-60">
            {{
              store.showUsernames
                ? getUserObject(pick.userId)?.username
                : getUserObject(pick.userId)?.name
            }}
          </p>
          <div class="flex items-center gap-4 p-2.5 bg-black/20 rounded-xl">
            <img
              alt="Player image"
              class="w-12 rounded sm:w-16"
              :src="`https://sleepercdn.com/content/nfl/players/thumb/${pick.playerId}.jpg`"
            />
            <div class="text-left">
              <p class="text-lg font-bold text-teal-100 sm:text-xl">
                {{ pick.firstName }} {{ pick.lastName }}
              </p>
              <p
                v-if="league.draftMetadata?.draftType !== 'auction'"
                class="text-sm text-teal-300 sm:text-base"
              >
                Round {{ pick.round }} • Pick
                {{ pick.pickNumber }}
              </p>
              <p v-else class="text-sm text-teal-300 sm:text-base">
                Winning bid ${{ pick.amount }}
              </p>
            </div>
          </div>
        </div>
      </WrappedSlide>

      <!-- Waiver Wire Slide -->
      <WrappedSlide bg-color="bg-cyan-950">
        <h2
          class="mb-4 text-3xl font-bold sm:text-5xl text-cyan-400 bg-clip-text"
        >
          Waiver Wire Warriors
        </h2>
        <p class="mb-4 text-base sm:mb-6 sm:text-lg text-cyan-200">
          Some lived on the waiver wire. Some pretended it didn't exist.
        </p>
        <div class="grid w-full grid-cols-2 gap-4">
          <div
            class="flex flex-col items-center p-4 bg-cyan-900/30 rounded-2xl"
          >
            <p class="mb-2 text-xs tracking-widest uppercase text-cyan-300">
              Most Active
            </p>
            <img
              v-if="mostMoves.user?.avatarImg"
              class="w-10 mb-3 border-4 rounded-full sm:w-16 border-cyan-500/50"
              :src="mostMoves.user.avatarImg"
            />
            <svg
              v-else
              class="w-10 mb-3 text-gray-200 border-4 rounded-full sm:w-16 border-cyan-500/50"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z"
              />
            </svg>
            <p
              class="text-sm font-bold text-center truncate sm:text-base max-w-32 sm:max-w-60"
            >
              {{
                store.showUsernames
                  ? mostMoves.user?.username
                  : mostMoves.user?.name
              }}
            </p>
            <p class="text-2xl font-black sm:text-3xl text-cyan-400">
              {{ mostMoves.moves }}
            </p>
            <div class="text-xs text-cyan-500/80">Moves</div>
          </div>

          <div
            v-if="fewestMoves?.user"
            class="flex flex-col items-center p-4 bg-cyan-900/30 rounded-2xl"
          >
            <p class="mb-2 text-xs tracking-widest uppercase text-cyan-300">
              Least Active
            </p>
            <img
              v-if="fewestMoves.user.avatarImg"
              class="w-10 mb-3 border-4 rounded-full sm:w-16 border-cyan-500/50"
              :src="fewestMoves.user.avatarImg"
            />
            <svg
              v-else
              class="w-10 mb-3 text-gray-200 border-4 rounded-full sm:w-16 border-cyan-500/50"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z"
              />
            </svg>
            <p class="text-sm font-bold text-center sm:text-base">
              {{
                store.showUsernames
                  ? fewestMoves.user.username
                  : fewestMoves.user.name
              }}
            </p>
            <p class="text-2xl font-black sm:text-3xl text-cyan-400">
              {{ fewestMoves.moves }}
            </p>
            <div class="text-xs text-cyan-500/80">Moves</div>
          </div>
        </div>
        <div v-if="league.waiverType === 2" class="grid grid-cols-2 gap-4">
          <div v-if="totalBids?.highest" class="w-full mt-2">
            <div
              class="mb-2 text-lg font-semibold text-center sm:text-xl text-cyan-200"
            >
              Big Spender
            </div>
            <div
              class="flex items-center justify-center gap-4 p-4 bg-cyan-900/20 rounded-xl"
            >
              <img
                v-if="totalBids.highest.user.avatarImg"
                class="w-8 rounded-full sm:w-12"
                :src="totalBids.highest.user.avatarImg"
              />
              <svg
                v-else
                class="w-8 h-8 text-gray-200 rounded-full sm:w-12"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z"
                />
              </svg>
              <div class="text-left">
                <p
                  class="text-sm font-bold truncate max-w-24 sm:max-w-52 sm:text-lg"
                >
                  {{
                    store.showUsernames
                      ? totalBids.highest.user.username
                      : totalBids.highest.user.name
                  }}
                </p>
                <div class="font-mono text-sm text-cyan-400 sm:text-base">
                  ${{ totalBids.highest.sumByStatus.complete }} spent
                </div>
              </div>
            </div>
          </div>
          <div
            v-if="league.waiverType === 2 && totalBids?.lowest"
            class="w-full mt-2"
          >
            <div
              class="mb-2 text-lg font-semibold text-center sm:text-xl text-cyan-200"
            >
              Penny Pincher
            </div>
            <div
              class="flex items-center justify-center gap-4 p-4 bg-cyan-900/20 rounded-xl"
            >
              <img
                v-if="totalBids.lowest.user.avatarImg"
                class="w-8 rounded-full sm:w-12"
                :src="totalBids.lowest.user.avatarImg"
              />
              <svg
                v-else
                class="w-8 text-gray-200 rounded-full sm:w-12"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z"
                />
              </svg>
              <div class="text-left">
                <p
                  class="text-sm font-bold truncate sm:text-lg max-w-24 sm:max-w-52"
                >
                  {{
                    store.showUsernames
                      ? totalBids.lowest.user.username
                      : totalBids.lowest.user.name
                  }}
                </p>
                <p class="font-mono text-sm text-cyan-400 sm:text-base">
                  ${{ totalBids.lowest.sumByStatus.complete ?? 0 }} spent
                </p>
              </div>
            </div>
          </div>
        </div>
        <p
          v-if="league.waiverType === 2"
          class="mt-2 mb-2.5 text-lg sm:text-xl font-semibold text-center text-cyan-200"
        >
          Highest Bids
        </p>
        <div v-if="league.waiverType === 2" class="grid grid-cols-2 gap-4">
          <div v-for="bid in highestBids" class="bg-cyan-900/30 rounded-2xl">
            <div class="flex justify-between">
              <div class="p-1.5 sm:p-3">
                <img
                  alt="Player image"
                  class="w-10 rounded-lg sm:w-14"
                  :src="`https://sleepercdn.com/content/nfl/players/thumb/${bid.player_id}.jpg`"
                />
                <p
                  class="w-16 mt-1 text-xs font-semibold text-left sm:w-24 sm:text-base"
                >
                  {{ bid.adds }}
                </p>
              </div>
              <div class="hidden mt-10 sm:inline">
                <p class="w-32 text-xs font-semibold truncate sm:text-base">
                  {{ store.showUsernames ? bid.user.username : bid.user.name }}
                </p>
                <p class="text-xs text-cyan-500/80">Week {{ bid.week }}</p>
              </div>
              <p
                class="p-3 mt-2 text-xl font-bold sm:text-2xl sm:mt-7 text-cyan-400"
              >
                ${{ bid.bid }}
              </p>
            </div>
            <div class="block pb-2 sm:hidden">
              <p
                class="mx-auto text-xs font-semibold truncate sm:text-base w-28"
              >
                {{ store.showUsernames ? bid.user.username : bid.user.name }}
              </p>
              <p class="text-xs text-cyan-500/80">Week {{ bid.week }}</p>
            </div>
          </div>
        </div>
      </WrappedSlide>

      <!-- Best Pickups Slide -->
      <WrappedSlide
        bg-color="bg-teal-950"
        alignment="center"
        v-if="bestPickups.length > 0"
      >
        <h2 class="mb-4 text-3xl font-bold text-teal-400 sm:text-5xl">
          The Pickup Artists
        </h2>
        <p class="mb-6 text-base text-teal-200 sm:text-lg">
          Found league winners in the bargain bin.
        </p>
        <div class="w-full space-y-4">
          <div
            v-for="(move, index) in bestPickups"
            class="flex items-center gap-2 p-3 sm:p-4 sm:gap-4 bg-white/10 rounded-xl backdrop-blur-sm"
          >
            <div
              class="text-2xl font-bold text-teal-500 opacity-50 sm:text-3xl"
            >
              #{{ index + 1 }}
            </div>
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <img
                  class="w-12 rounded sm:w-20"
                  :src="`https://sleepercdn.com/content/nfl/players/thumb/${move.player_id}.jpg`"
                />
                <div>
                  <div class="text-sm font-bold sm:text-base">
                    {{ move.position }} {{ move.adds }}
                  </div>
                  <div class="text-xs text-teal-200">
                    Week {{ move.week }} • Avg Rank: {{ move.value }}
                  </div>
                </div>
              </div>
            </div>
            <div class="flex flex-col items-end">
              <img
                v-if="move.user?.avatarImg"
                class="w-8 h-8 rounded-full"
                :src="move.user.avatarImg"
              />
              <svg
                v-else
                class="w-8 h-8 text-gray-200 rounded-full"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z"
                />
              </svg>
              <p
                class="w-20 text-sm text-right break-words text-pretty sm:text-base sm:w-36"
              >
                {{
                  store.showUsernames ? move.user?.username : move.user?.name
                }}
              </p>
            </div>
          </div>
        </div>
      </WrappedSlide>

      <!-- Trade Slide -->
      <WrappedSlide bg-color="bg-emerald-950" v-if="impactfulTrades">
        <h2 class="mb-3 text-3xl font-bold sm:text-5xl text-emerald-400">
          Blockbuster Trades
        </h2>
        <p
          v-if="impactfulTrades.length > 0"
          class="mt-2 mb-8 text-base sm:text-lg text-emerald-200/80"
        >
          Out of the {{ league.tradeNames?.length }} trade<span
            v-if="impactfulTrades.length !== 1"
            >s</span
          >
          made this season,
          {{ impactfulTrades.length === 1 ? "this" : "these" }}
          {{ impactfulTrades.length === 1 ? "was" : "were" }} the most
          impactful.
        </p>

        <div
          v-if="impactfulTrades.length > 0"
          v-for="trade in impactfulTrades.slice(0, 2)"
          class="flex justify-between w-full mb-4"
        >
          <!-- Team 1 Side -->
          <div
            class="p-4 border w-72 bg-emerald-900/40 rounded-2xl border-emerald-800/50 overflow-y-clip max-h-96"
          >
            <div class="flex items-center gap-1 mb-4 sm:gap-3">
              <img
                v-if="trade.team1.user.avatarImg"
                class="w-8 h-8 border-2 rounded-full sm:w-10 sm:h-10 border-emerald-500"
                :src="trade.team1.user.avatarImg"
              />
              <svg
                v-else
                class="w-8 h-8 text-gray-200 border-2 rounded-full sm:w-10 sm:h-10 border-emerald-500"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z"
                />
              </svg>
              <span
                class="w-20 text-sm font-bold break-words sm:w-auto sm:text-base text-pretty"
                >{{
                  store.showUsernames
                    ? trade.team1.user.username
                    : trade.team1.user.name
                }}</span
              >
            </div>
            <div class="flex flex-wrap gap-2 font-medium">
              <div
                v-for="(player, idx) in trade.team1.players"
                class="flex items-center gap-2 p-2 text-sm rounded-lg bg-emerald-950/50"
              >
                <img
                  v-if="/\d/.test(trade.team1.playerIds[idx])"
                  class="w-8 rounded"
                  :src="`https://sleepercdn.com/content/nfl/players/thumb/${trade.team1.playerIds[idx]}.jpg`"
                />
                <img
                  v-else
                  class="w-8 rounded"
                  :src="`https://sleepercdn.com/images/team_logos/nfl/${trade.team1.playerIds[
                    idx
                  ].toLowerCase()}.png`"
                />
                <p class="text-xs sm:text-sm">{{ player }}</p>
              </div>
              <p
                v-for="pick in trade.team1.draftPicks"
                class="p-2 text-xs rounded-lg sm:text-sm bg-emerald-950/50"
              >
                {{ pick ? pick.season : "" }}
                {{ pick ? `${getOrdinalSuffix(pick.round)} round` : "" }}
              </p>
              <p
                v-for="budget in trade.team1.waiverBudget"
                class="p-2 text-xs rounded-lg sm:text-sm bg-emerald-950/50"
              >
                {{ budget ? `$${budget.amount} FAAB` : "" }}
              </p>
            </div>
          </div>

          <!-- Exchange Icon -->
          <div class="w-6 mx-2">
            <svg
              class="w-6 h-6 mt-12 text-emerald-500"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 16h13M4 16l4-4m-4 4 4 4M20 8H7m13 0-4 4m4-4-4-4"
              />
            </svg>
          </div>

          <!-- Team 2 Side -->
          <div
            class="p-4 border w-72 bg-emerald-900/40 rounded-2xl border-emerald-800/50 overflow-y-clip max-h-96"
          >
            <div class="flex items-center gap-1 mb-4 sm:gap-3">
              <img
                v-if="trade.team2.user.avatarImg"
                class="w-8 h-8 border-2 rounded-full sm:w-10 sm:h-10 border-emerald-500"
                :src="trade.team2.user.avatarImg"
              />
              <svg
                v-else
                class="w-8 h-8 text-gray-200 border-2 rounded-full sm:w-10 sm:h-10 border-emerald-500"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z"
                />
              </svg>

              <span
                class="w-20 text-sm font-bold break-words sm:text-base sm:w-auto text-pretty"
                >{{
                  store.showUsernames
                    ? trade.team2.user.username
                    : trade.team2.user.name
                }}</span
              >
            </div>
            <div class="flex flex-wrap gap-2 font-medium">
              <div
                v-for="(player, idx) in trade.team2.players"
                class="flex items-center gap-2 p-2 text-sm rounded-lg bg-emerald-950/50"
              >
                <img
                  v-if="/\d/.test(trade.team2.playerIds[idx])"
                  class="w-8 rounded"
                  :src="`https://sleepercdn.com/content/nfl/players/thumb/${trade.team2.playerIds[idx]}.jpg`"
                />
                <img
                  v-else
                  class="w-8 rounded"
                  :src="`https://sleepercdn.com/images/team_logos/nfl/${trade.team2.playerIds[
                    idx
                  ].toLowerCase()}.png`"
                />
                <p class="text-xs sm:text-sm">{{ player }}</p>
              </div>
              <p
                v-for="pick in trade.team2.draftPicks"
                class="p-2 text-xs rounded-lg sm:text-sm bg-emerald-950/50"
              >
                {{ pick ? pick.season : "" }}
                {{ pick ? `${getOrdinalSuffix(pick.round)} round` : "" }}
              </p>
              <p
                v-for="budget in trade.team2.waiverBudget"
                class="p-2 text-xs rounded-lg sm:text-sm bg-emerald-950/50"
              >
                {{ budget ? `$${budget.amount} FAAB` : "" }}
              </p>
            </div>
          </div>
        </div>
        <div v-else>
          <p class="mt-4 mb-8 text-lg text-emerald-200/80">
            Zero trades all season? That's... something. Maybe next year find
            some league mates who like to shake things up a bit.
          </p>
        </div>
      </WrappedSlide>

      <!-- Points from Waivers Slide -->
      <WrappedSlide bg-color="bg-violet-950" alignment="center">
        <h2 class="mb-4 text-3xl font-bold sm:text-5xl text-violet-500">
          Waiver Wire Impact
        </h2>

        <p class="mb-6 text-base sm:text-lg text-violet-200">
          Points scored from players you didn't draft.
        </p>

        <div
          class="grid w-full grid-cols-1 gap-2 overflow-auto sm:gap-4 sm:grid-flow-col sm:grid-cols-2"
          :style="`grid-template-rows: repeat(${
            leagueSize / 2
          }, minmax(0, 1fr))`"
        >
          <div
            v-for="user in pointsFromWaivers"
            class="flex items-center justify-between px-3 py-1.5 rounded-lg bg-violet-900/40"
          >
            <div class="flex items-center gap-3">
              <img
                v-if="user.avatar"
                class="rounded-full w-7 sm:w-10"
                :src="user.avatar"
              />
              <svg
                v-else
                class="text-gray-200 rounded-full w-7 sm:w-10"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z"
                />
              </svg>
              <span class="text-sm font-semibold text-left truncate max-w-40">{{
                user.name
              }}</span>
            </div>
            <div class="text-right">
              <p class="text-lg font-bold sm:text-xl text-violet-300">
                {{ user.pointsFromWaivers }}
              </p>
            </div>
          </div>
        </div>
      </WrappedSlide>

      <!-- Efficiency Slide -->
      <WrappedSlide bg-color="bg-amber-950" alignment="center">
        <h2 class="mb-4 text-3xl font-bold sm:text-5xl text-amber-500">
          The What-Ifs
        </h2>

        <p class="mb-6 text-base sm:text-lg text-amber-200">
          How many points did you leave sitting on your bench?
        </p>

        <div
          class="grid w-full grid-cols-1 gap-2 overflow-auto sm:grid-flow-col sm:grid-cols-2 sm:gap-4"
          :style="`grid-template-rows: repeat(${
            leagueSize / 2
          }, minmax(0, 1fr))`"
        >
          <div
            v-for="user in bestManagers"
            class="flex items-center justify-between px-3 py-1.5 rounded-lg bg-amber-900/40"
          >
            <div class="flex items-center gap-3">
              <img
                v-if="user.avatarImg"
                class="rounded-full sm:w-10 w-7"
                :src="user.avatarImg"
              />
              <svg
                v-else
                class="text-gray-200 rounded-full sm:w-10 w-7"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z"
                />
              </svg>
              <span class="text-sm font-semibold truncate max-w-44">{{
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

      <!-- Matchups Slide -->
      <WrappedSlide bg-color="bg-rose-950" alignment="center">
        <h2 class="mb-4 text-3xl font-bold sm:text-5xl text-rose-400">
          Too Close vs. Not Even Close
        </h2>
        <p class="mb-4 text-base sm:mb-6 sm:text-lg text-rose-200">
          Some matchups came down to the wire. Some were over by noon.
        </p>
        <div class="grid w-full grid-cols-1 gap-2 sm:gap-4 sm:grid-cols-2">
          <!-- Closest -->
          <div v-if="closestMatchups.length > 0">
            <div
              class="mb-2 text-sm font-bold text-left uppercase text-rose-200"
            >
              Nail Biters
            </div>
            <div
              v-for="matchup in closestMatchups.slice(0, 3)"
              class="px-2 py-1.5 mb-2 border sm:px-4 sm:py-4 sm:mb-4 bg-rose-900/30 rounded-xl border-rose-500/20"
            >
              <div class="flex justify-between">
                <div class="truncate w-44">
                  <div class="flex gap-3">
                    <img
                      v-if="matchup.teamA.avatarImg"
                      class="w-8 h-8 rounded-full"
                      :src="matchup.teamA.avatarImg"
                    />
                    <svg
                      v-else
                      class="w-8 h-8 text-gray-200"
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z"
                      />
                    </svg>
                    <span class="text-lg font-bold sm:text-xl">{{
                      matchup.scoreA
                    }}</span>
                  </div>
                  <p
                    class="w-24 mt-1 text-sm text-left truncate sm:w-32 sm:text-base"
                  >
                    {{
                      store.showUsernames
                        ? matchup.teamA.username
                        : matchup.teamA.name
                    }}
                  </p>
                </div>
                <div class="mt-1 min-w-12 sm:mt-0">
                  <span class="font-bold text-rose-500">VS</span>
                  <p class="mt-2 text-xs text-center text-rose-300">
                    Week {{ matchup.matchupIndex + 1 }}
                  </p>
                </div>
                <div class="truncate w-44">
                  <div class="flex justify-end gap-2">
                    <span class="text-lg font-bold sm:text-xl">{{
                      matchup.scoreB
                    }}</span>
                    <img
                      v-if="matchup.teamB.avatarImg"
                      class="w-8 h-8 rounded-full"
                      :src="matchup.teamB.avatarImg"
                    />
                    <svg
                      v-else
                      class="w-8 h-8 text-gray-200"
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z"
                      />
                    </svg>
                  </div>
                  <p
                    class="float-right w-24 mt-1 text-sm text-right truncate sm:w-28 sm:text-base"
                  >
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
            <div
              class="mb-2 text-sm font-bold text-left uppercase text-rose-200"
            >
              Biggest Blowouts
            </div>
            <div
              v-for="matchup in farthestMatchups.slice(0, 3)"
              class="px-2 py-1.5 mb-2 border sm:px-4 sm:py-4 sm:mb-4 bg-rose-900/30 rounded-xl border-rose-500/20"
            >
              <div class="flex justify-between">
                <div class="truncate w-44">
                  <div class="flex gap-3">
                    <img
                      v-if="matchup.teamA.avatarImg"
                      class="w-8 h-8 rounded-full"
                      :src="matchup.teamA.avatarImg"
                    />
                    <svg
                      v-else
                      class="w-8 h-8 text-gray-200"
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z"
                      />
                    </svg>
                    <span class="text-lg font-bold sm:text-xl">{{
                      matchup.scoreA
                    }}</span>
                  </div>
                  <p
                    class="w-24 mt-1 text-sm text-left truncate sm:w-32 sm:text-base"
                  >
                    {{
                      store.showUsernames
                        ? matchup.teamA.username
                        : matchup.teamA.name
                    }}
                  </p>
                </div>
                <div class="mt-1 min-w-12 sm:mt-0">
                  <span class="font-bold text-rose-500">VS</span>
                  <p class="mt-2 text-xs text-center text-rose-300">
                    Week {{ matchup.matchupIndex + 1 }}
                  </p>
                </div>
                <div class="truncate w-44">
                  <div class="flex justify-end gap-2">
                    <span class="text-lg font-bold sm:text-xl">{{
                      matchup.scoreB
                    }}</span>
                    <img
                      v-if="matchup.teamB.avatarImg"
                      class="w-8 h-8 rounded-full"
                      :src="matchup.teamB.avatarImg"
                    />
                    <svg
                      v-else
                      class="w-8 h-8 text-gray-200"
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z"
                      />
                    </svg>
                  </div>
                  <p
                    class="float-right w-24 mt-1 text-sm text-right truncate sm:w-28 sm:text-base"
                  >
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
        </div>
      </WrappedSlide>

      <!-- Win Streak Slide -->
      <WrappedSlide bg-color="bg-orange-950" alignment="center">
        <h2 class="mb-4 text-3xl font-bold text-orange-400 sm:text-5xl">
          Hot and Cold
        </h2>
        <p class="mb-6 text-base text-orange-200 sm:text-lg">
          Hottest run. Coldest stretch. Momentum is everything.
        </p>
        <div class="flex flex-col gap-4">
          <div v-for="user in winStreak.slice(0, 3)" class="relative">
            <div
              class="bg-orange-900/40 sm:p-6 p-4 rounded-2xl border border-orange-500/30 flex flex-col items-center min-w-[200px]"
            >
              <img
                v-if="user.avatar"
                class="w-10 mb-4 border-4 border-orange-500 rounded-full sm:w-12"
                :src="user.avatar"
              />
              <svg
                v-else
                class="w-10 text-gray-200 border-4 border-orange-500 rounded-full sm:w-12"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z"
                />
              </svg>
              <div class="mb-2 text-xl font-bold">{{ user.name }}</div>
              <div class="text-3xl font-black text-orange-500">
                <p>
                  {{ user.streak.type }}{{ user.streak.length
                  }}<span class="text-lg font-medium">
                    (Weeks
                    {{
                      league.medianScoring
                        ? Math.floor((user.streak.start + 1) / 2)
                        : user.streak.start + 1
                    }}-{{
                      league.medianScoring
                        ? Math.round((user.streak.end + 1) / 2)
                        : user.streak.end + 1
                    }})</span
                  >
                </p>
              </div>
            </div>
          </div>
        </div>
      </WrappedSlide>

      <!-- Schedule Luck Slide -->
      <WrappedSlide bg-color="bg-fuchsia-950">
        <h2 class="mb-4 -mt-4 text-3xl font-bold sm:text-5xl text-fuchsia-400">
          Schedule Roulette
        </h2>
        <p class="mb-6 text-base sm:text-lg text-fuchsia-200">
          Some got easy matchups. Some got the gauntlet. Life isn't fair.
        </p>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <!-- Luckiest -->
          <div>
            <div class="flex items-center gap-4 px-2 mb-1">
              <h3
                class="text-sm font-bold tracking-widest uppercase text-fuchsia-200"
              >
                Luckiest Schedules
              </h3>
            </div>
            <div
              v-for="schedule in scheduleAnalysis.slice(0, 3)"
              class="mb-2 sm:mb-4"
            >
              <div
                class="flex justify-between px-3 py-2 sm:px-4 sm:py-4 bg-fuchsia-900/30 rounded-2xl"
              >
                <div class="flex gap-4">
                  <img
                    v-if="schedule.avatarImg"
                    class="w-10 h-10 border-2 rounded-full sm:w-14 sm:h-14 border-fuchsia-500"
                    :src="schedule.avatarImg"
                  />
                  <svg
                    v-else
                    class="w-10 h-10 text-gray-200 border-2 rounded-full sm:w-14 sm:h-14 border-fuchsia-500"
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z"
                    />
                  </svg>
                  <div class="text-left">
                    <p
                      class="text-base font-bold text-left truncate sm:text-lg w-36"
                    >
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
                  <p class="mt-1 text-xl font-semibold sm:mt-2 sm:text-2xl">
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
              class="mb-2 sm:mb-4"
            >
              <div
                class="flex justify-between px-3 py-2 sm:px-4 sm:py-4 bg-fuchsia-900/30 rounded-2xl"
              >
                <div class="flex gap-4">
                  <img
                    v-if="schedule.avatarImg"
                    class="w-10 h-10 border-2 rounded-full sm:w-14 sm:h-14 border-fuchsia-500"
                    :src="schedule.avatarImg"
                  />
                  <svg
                    v-else
                    class="w-10 h-10 text-gray-200 border-2 rounded-full sm:w-14 sm:h-14 border-fuchsia-500"
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z"
                    />
                  </svg>
                  <div class="text-left">
                    <p
                      class="text-base font-bold text-left truncate sm:text-lg w-36"
                    >
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
                  <p class="mt-1 text-xl font-semibold sm:mt-2 sm:text-2xl">
                    {{
                      (schedule.actualWins - schedule.expectedWins).toFixed(2)
                    }}
                  </p>
                  <p class="text-xs">Wins</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </WrappedSlide>

      <!-- Loyalty / Retention Slide -->
      <WrappedSlide bg-color="bg-blue-950" alignment="center">
        <h2 class="mb-6 text-3xl font-bold text-blue-400 sm:mb-8 sm:text-5xl">
          Day Ones
        </h2>
        <p class="mb-6 -mt-4 text-base text-blue-200 sm:text-lg">
          The number of drafted players that earned their spot and never left.
        </p>

        <div
          class="grid w-full grid-cols-1 gap-2 sm:gap-4 sm:grid-flow-col sm:grid-cols-2"
          :style="`grid-template-rows: repeat(${
            leagueSize / 2
          }, minmax(0, 1fr))`"
        >
          <div
            v-for="user in originalPlayers"
            class="flex items-center justify-between sm:p-3 py-1.5 px-2 rounded-lg bg-blue-900/40"
          >
            <div class="flex items-center gap-3">
              <img
                v-if="getUserObject(user.userId)?.avatarImg"
                class="rounded-full sm:w-10 w-7"
                :src="getUserObject(user.userId)?.avatarImg"
              />
              <svg
                v-else
                class="text-gray-200 sm:w-10 w-7"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z"
                />
              </svg>
              <span class="text-sm font-semibold truncate max-w-44">{{
                user.userName
              }}</span>
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
        <h2 class="mb-4 text-3xl font-bold sm:text-5xl text-sky-400">
          The Full Cast
        </h2>
        <p class="mb-6 text-base text-blue-200 sm:text-lg">
          The total number of different starting players.
        </p>
        <div
          class="grid w-full grid-cols-1 gap-2 overflow-auto sm:grid-flow-col sm:grid-cols-2 sm:gap-4"
          :style="`grid-template-rows: repeat(${
            leagueSize / 2
          }, minmax(0, 1fr))`"
        >
          <div
            v-for="user in uniquePlayers"
            class="flex items-center justify-between sm:p-3 px-2 py-1.5 rounded-lg bg-sky-900/40"
          >
            <div class="flex items-center gap-3">
              <img
                v-if="user.avatar"
                class="rounded-full sm:w-10 w-7"
                :src="user.avatar"
              />
              <svg
                v-else
                class="text-gray-200 rounded-full sm:w-10 w-7"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z"
                />
              </svg>
              <span class="text-sm font-semibold truncate max-w-44">{{
                user.name
              }}</span>
            </div>
            <div class="text-right">
              <span class="text-xl font-bold text-sky-300">{{
                user.uniqueStarterCount
              }}</span>
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
        <h2 class="mb-4 text-3xl font-bold sm:text-5xl text-slate-200">
          The History Books
        </h2>
        <p class="mb-6 text-base sm:text-lg text-slate-200">
          All time regular season records.
        </p>
        <div
          class="grid w-full grid-cols-1 gap-2 sm:gap-4 sm:grid-flow-col sm:grid-cols-2"
          :style="`grid-template-rows: repeat(${
            leagueSize / 2
          }, minmax(0, 1fr))`"
        >
          <div
            v-for="user in allTimeRecord.slice(0, 14)"
            class="flex items-center justify-between rounded-lg sm:p-3 px-2 py-1.5 bg-slate-800"
          >
            <div class="flex items-center gap-3">
              <img
                v-if="user.avatarImg"
                class="rounded-full sm:w-8 w-7"
                :src="user.avatarImg"
              />
              <svg
                v-else
                class="text-gray-200 rounded-full sm:w-8 w-7"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z"
                />
              </svg>
              <span class="font-medium truncate max-w-40">{{ user.name }}</span>
            </div>
            <div class="font-mono font-bold text-slate-300">
              {{ user.wins }}-{{ user.losses
              }}<span v-if="user.ties > 0">-{{ user.ties }}</span>
            </div>
          </div>
        </div>
      </WrappedSlide>

      <!-- Individual Team Slide -->

      <WrappedSlide bg-color="bg-zinc-900" alignment="center">
        <div>
          <h1
            class="mt-4 text-3xl font-bold text-white sm:mt-0 sm:mb-4 sm:text-5xl"
          >
            Team Summary
          </h1>
          <div v-for="team in props.tableData">
            <div v-if="team.rosterId === currentManager.rosterId">
              <div>
                <div
                  class="flex flex-wrap justify-between my-4 sm:my-6 sm:flex-nowrap"
                >
                  <div class="flex mx-auto sm:mx-0">
                    <img
                      v-if="team.avatarImg"
                      class="w-10 h-10 mt-0.5 mr-4 border-2 rounded-full sm:mt-0 border-greem-400 sm:w-12 sm:h-12"
                      :src="team.avatarImg"
                    />
                    <svg
                      v-else
                      class="w-10 mr-4 text-gray-200 border-2 border-green-400 rounded-full sm:w-12"
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z"
                      />
                    </svg>
                    <select
                      aria-label="Manager name"
                      id="Manager name"
                      class="block p-2 text-base font-bold text-gray-200 bg-green-900 border border-gray-300 rounded-lg w-60 sm:text-lg focus:ring-green-500 focus:border-green-500"
                      v-model="currentManager"
                    >
                      <option
                        v-for="manager in managers"
                        :key="manager.rosterId"
                        :value="manager"
                      >
                        {{ manager.name }}
                      </option>
                    </select>
                  </div>
                  <div class="mx-auto mt-3 sm:mt-0 sm:pl-6">
                    <p class="text-2xl font-semibold">{{ teamName[0] }}</p>
                    <p class="text-xs">{{ teamName[1] }}</p>
                  </div>
                </div>
                <div class="grid grid-cols-1 gap-2 sm:gap-4 sm:grid-cols-2">
                  <div
                    class="flex justify-between px-3 py-2 bg-green-900 rounded-lg sm:p-3"
                  >
                    <p class="mt-0.5 font-semibold">Regular Season Rank</p>
                    <p class="text-lg font-bold sm:text-xl">
                      {{ team.regularSeasonRank }}
                    </p>
                  </div>
                  <div
                    class="flex justify-between px-3 py-2 bg-green-900 rounded-lg sm:p-3"
                  >
                    <p class="mt-0.5 font-semibold">Record</p>
                    <p class="text-lg font-bold sm:text-xl">
                      {{ team.wins }} - {{ team.losses }}
                      <span v-if="team.ties">-{{ team.ties }}</span>
                    </p>
                  </div>
                  <div
                    class="flex justify-between px-3 py-2 bg-green-900 rounded-lg sm:p-3"
                  >
                    <p class="mt-0.5 font-semibold">Record with Median</p>
                    <p class="text-lg font-bold sm:text-xl">
                      {{ team.winsWithMedian }} -
                      {{ team.lossesWithMedian }}
                    </p>
                  </div>
                  <div
                    class="flex justify-between px-3 py-2 bg-green-900 rounded-lg sm:p-3"
                  >
                    <p class="mt-0.5 font-semibold">Start/Sit Efficiency</p>
                    <p class="text-lg font-bold sm:text-xl">
                      {{ (team.managerEfficiency * 100).toFixed(1) }}%
                    </p>
                  </div>

                  <div
                    class="flex justify-between px-3 py-2 bg-green-900 rounded-lg sm:p-3"
                  >
                    <p class="mt-0.5 font-semibold">Points For</p>
                    <p class="text-lg font-bold sm:text-xl">
                      {{ team.pointsFor }}
                    </p>
                  </div>
                  <div
                    class="flex justify-between px-3 py-2 bg-green-900 rounded-lg sm:p-3"
                  >
                    <p class="mt-0.5 font-semibold">Points Against</p>
                    <p class="text-lg font-bold sm:text-xl">
                      {{ team.pointsAgainst }}
                    </p>
                  </div>
                </div>
                <apexchart
                  class="mt-4"
                  type="line"
                  height="350"
                  :options="chartOptions"
                  :series="seriesData"
                ></apexchart>
              </div>
            </div>
          </div>
        </div>
      </WrappedSlide>

      <!-- Winner Slide -->
      <WrappedSlide bg-color="bg-amber-950" alignment="center">
        <!-- Background Glows -->
        <div class="absolute inset-0 pointer-events-none">
          <div
            class="absolute rounded-full w-80 h-80 bg-yellow-500/20 blur-3xl top-10 right-10"
            style="animation: float-slow 10s ease-in-out infinite"
          ></div>
          <div
            class="absolute rounded-full w-96 h-96 bg-orange-600/10 blur-3xl bottom-10 left-10"
            style="animation: float-slower 15s ease-in-out infinite"
          ></div>
        </div>

        <div class="z-10 flex flex-col items-center w-full max-w-4xl mx-auto">
          <!-- The Winner -->
          <h2 class="mb-4 text-3xl font-bold text-yellow-400 sm:text-5xl">
            The Champion
          </h2>
          <p class="mb-6 text-base sm:text-lg text-slate-200 text-balance">
            Conquered all challengers and claimed the throne.
          </p>
          <div
            v-if="leagueWinner"
            class="flex flex-col items-center gap-4 mb-2"
          >
            <div class="relative">
              <div
                class="absolute inset-0 bg-yellow-500 rounded-full opacity-60 blur-2xl animate-pulse"
              ></div>
              <img
                v-if="leagueWinner.avatarImg"
                class="relative w-20 h-20 border-4 border-yellow-400 rounded-full shadow-2xl sm:w-24 sm:h-24 ring-4 ring-yellow-500/30"
                :src="leagueWinner.avatarImg"
              />
              <svg
                v-else
                class="relative w-20 h-20 text-gray-200 border-4 border-yellow-400 rounded-full shadow-2xl sm:w-24 sm:h-24"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z"
                />
              </svg>
            </div>

            <div class="text-center">
              <h3
                class="text-2xl font-black text-center text-white truncate sm:text-3xl text-shadow-lg max-w-64 sm:max-w-96"
              >
                {{
                  store.showUsernames
                    ? leagueWinner.username
                    : leagueWinner.name
                }}
              </h3>
            </div>
          </div>
          <div
            class="flex flex-col items-center w-full mt-4 border-t-2 border-yellow-500"
          >
            <WinnerPyramid
              v-if="leagueWinner"
              :losers="
                props.tableData
                  .filter((u) => u.rosterId !== leagueWinner?.rosterId)
                  .slice(0, 12)
              "
            />
          </div>
        </div>
      </WrappedSlide>

      <!-- Outro Slide -->
      <WrappedSlide bg-color="bg-gray-900" alignment="center">
        <div class="space-y-6">
          <h1 class="mb-4 text-3xl font-bold text-white sm:text-5xl">
            Thank you for using ffwrapped!
          </h1>

          <div class="text-gray-200">
            <!-- Hardcoding data from 12/29/25 -->
            <p class="mb-6 text-base sm:mb-8 sm:text-lg">
              Here's a look at the 5600+ leagues that used ffwrapped in 2025.
            </p>
            <OverallStats />
            <p class="my-4 text-base sm:text-lg">See you next season ❤️</p>
            <button
              v-if="isShareSupported"
              @click="share"
              aria-label="Button share"
              type="submit"
              class="text-gray-50 mt-2 bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm w-auto px-5 py-2.5 text-center"
            >
              Share
            </button>
          </div>
        </div>
      </WrappedSlide>
      <!-- workaround to get data without copying over methods -->
    </div>
    <div v-else>
      <p class="mt-8 text-lg font-semibold mb-96 dark:text-gray-300">
        Loading...
      </p>
    </div>
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
