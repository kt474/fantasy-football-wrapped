<script setup lang="ts">
import { ref, onMounted, watch, computed } from "vue";
import { generateTrends, getPlayersByIdsMap } from "../../api/api";
import { getDraftProjections, getDraftPicks } from "../../api/sleeperApi";
import { TableDataType, LeagueInfoType } from "../../types/types";
import { DraftPick, Player } from "../../types/apiTypes";
import { getLeagueKey, useStore } from "../../store/store";
import { fakeHighlights } from "../../api/fakeLeague";
import { Card, CardTitle, CardHeader } from "../ui/card";

const store = useStore();
const props = defineProps<{
  tableData: TableDataType[];
}>();

const currentTrends = ref<string[]>([]);
const renderedCurrentTrends = ref<string[]>([]);
const preseasonUnavailableTrends = [
  "League news will appear once draft or scoring data is available.",
];

const hasRealDraftPick = (draftPicks: DraftPick[] | undefined) =>
  draftPicks?.some((pick) => Number(pick.playerId) > 0) ?? false;

const isPreDraftLeague = (league: LeagueInfoType | undefined) => {
  if (!league) {
    return false;
  }

  return (
    league.status === "pre_draft" ||
    (league.platform === "espn" &&
      !league.lastScoredWeek &&
      !hasRealDraftPick(league.draftPicks))
  );
};

let renderRequestId = 0;

watch(
  currentTrends,
  async (trends) => {
    const requestId = ++renderRequestId;

    if (trends.length === 0) {
      renderedCurrentTrends.value = [];
      return;
    }

    const [{ default: MarkdownIt }, { default: DOMPurify }] = await Promise.all(
      [import("markdown-it"), import("dompurify")]
    );
    const md = new MarkdownIt({
      html: false,
      linkify: true,
      breaks: true,
    });
    const renderedTrends = trends.map((trend) =>
      DOMPurify.sanitize(md.render(trend))
    );

    if (requestId === renderRequestId) {
      renderedCurrentTrends.value = renderedTrends;
    }
  },
  { immediate: true }
);

const getCurrentStreak = (str: string): string => {
  const match = str.match(/([WLT])\1*$/);
  if (!match) return "";
  return match[1] + match[0].length;
};

const getFiveMostRecent = (str: string, n = 5): string => {
  const recent = str.slice(-n);

  const wins = (recent.match(/W/g) || []).length;
  const losses = (recent.match(/L/g) || []).length;
  return `${wins}-${losses}`;
};

const getPreseasonData = async () => {
  const currentLeague = store.leagueInfo[store.currentLeagueIndex];
  if (!currentLeague) {
    return;
  }

  if (isPreDraftLeague(currentLeague)) {
    currentTrends.value = preseasonUnavailableTrends;
    return;
  }

  if (!currentLeague.draftId && currentLeague.platform !== "espn") {
    currentTrends.value = preseasonUnavailableTrends;
    return;
  }

  const seasonState =
    currentLeague?.seasonType === "Dynasty" && currentLeague?.previousLeagueId
      ? "dynasty"
      : "preseason";

  let result: Record<string, unknown>[] = [];
  try {
    const draftPicks: DraftPick[] =
      currentLeague.platform === "espn"
        ? (currentLeague.draftPicks ?? [])
        : await getDraftPicks(
            currentLeague.draftId,
            currentLeague.season,
            currentLeague.scoringType,
            currentLeague.seasonType
          );

    if (draftPicks.length === 0) {
      currentTrends.value = preseasonUnavailableTrends;
      return;
    }

    const first3Rounds = draftPicks.slice(0, 3 * currentLeague.rosters.length);
    const qbs = currentLeague.rosterPositions.reduce(
      (sum, item) => sum + (item === "QB" || item === "SUPER_FLEX" ? 1 : 0),
      0
    );
    const promises = first3Rounds.map(async (pick) => {
      const projections = await getDraftProjections(
        pick.playerId,
        currentLeague.season,
        currentLeague.scoringType,
        currentLeague.seasonType,
        true ? qbs >= 2 : false
      );
      if (seasonState === "dynasty") {
        return {
          draftSlot: pick.pickNumber,
          round: Math.ceil(pick.pickNumber / currentLeague.rosters.length),
          pickInRound:
            ((pick.pickNumber - 1) % currentLeague.rosters.length) + 1,
          name: `${pick.firstName} ${pick.lastName}`,
          position: pick.position,
          projectedPoints: projections.projectedPoints,
          userName: getNameFromId(pick.userId),
          NFLTeam: pick.team,
        };
      }
      return {
        draftSlot: pick.pickNumber,
        round: Math.ceil(pick.pickNumber / currentLeague.rosters.length),
        pickInRound: ((pick.pickNumber - 1) % currentLeague.rosters.length) + 1,
        name: `${pick.firstName} ${pick.lastName}`,
        position: pick.position,
        projectedPoints: projections.projectedPoints,
        userName: getNameFromId(pick.userId),
        adp: projections.adp,
        pickVsAdp: projections.adp
          ? roundToOneDecimal(projections.adp - pick.pickNumber)
          : null,
      };
    });
    result = [
      {
        league: {
          totalTeams: currentLeague.rosters.length,
          season: currentLeague.season,
          scoringFormat: currentLeague.scoringType,
          seasonType: currentLeague.seasonType,
          rosterPositions: currentLeague.rosterPositions,
          draftRoundsIncluded: 3,
        },
        earlyDraftPicks: await Promise.all(promises),
      },
    ];
  } catch {
    currentTrends.value = preseasonUnavailableTrends;
    return;
  }
  if (result.length > 0) {
    let response;
    try {
      if (currentLeague && currentLeague.rosters.length <= 8) {
        response = await generateTrends(result, 110, 3, seasonState);
      } else if (currentLeague && currentLeague.rosters.length <= 10) {
        response = await generateTrends(result, 125, 3, seasonState);
      } else {
        response = await generateTrends(result, 170, 4, seasonState);
      }
      currentTrends.value = response.bulletPoints;
      store.addCurrentTrends(getLeagueKey(currentLeague), currentTrends.value);
    } catch (e) {
      currentTrends.value = [
        "Unable to generate league news. Please try again later",
      ];
      store.addCurrentTrends(getLeagueKey(currentLeague), currentTrends.value);
    }
  }
};

const getNameFromId = (userId: string): string => {
  const userObj = props.tableData.find((user) => user.id === userId);
  if (!userObj) return "";
  return store.showUsernames ? userObj.username : userObj.name;
};

const getNameFromTransactionId = (id: string): string => {
  const userObj = props.tableData.find(
    (user) => user.id === id || String(user.rosterId) === id
  );
  if (!userObj) return "";
  return store.showUsernames ? userObj.username : userObj.name;
};

const getMaxIndex = (arr: number[]): number => {
  return arr.reduce(
    (bestIndex, value, i, src) => (value > src[bestIndex] ? i : bestIndex),
    0
  );
};

const roundToOneDecimal = (value: number): number =>
  Math.round(value * 10) / 10;

const getAverage = (values: number[]): number => {
  if (values.length === 0) {
    return 0;
  }

  return roundToOneDecimal(
    values.reduce((sum, value) => sum + value, 0) / values.length
  );
};

const formatRecord = (user: TableDataType): string =>
  `${user.wins}-${user.losses}${user.ties ? `-${user.ties}` : ""}`;

const getTeamName = (user: TableDataType): string =>
  store.showUsernames ? user.username : user.name;

const getTeamId = (user: TableDataType): number => user.rosterId;

const getWeekTotal = (values: number[][], weekIndex: number): number =>
  roundToOneDecimal(
    values[weekIndex]?.reduce((sum, value) => sum + Number(value ?? 0), 0) ?? 0
  );

const getScoringRank = (
  user: TableDataType,
  teamsByPoints: TableDataType[]
): number =>
  teamsByPoints.findIndex((team) => team.rosterId === user.rosterId) + 1;

const getTeamRef = (
  user: TableDataType,
  extra: Record<string, unknown> = {}
): Record<string, unknown> => ({
  id: getTeamId(user),
  name: getTeamName(user),
  ...extra,
});

const getStandingsRef = (
  user: TableDataType,
  teamsByPoints: TableDataType[]
): Record<string, unknown> =>
  getTeamRef(user, {
    rank: user.regularSeasonRank,
    record: formatRecord(user),
    pfRank: getScoringRank(user, teamsByPoints),
    winsAboveExpectedSchedule: roundToOneDecimal(
      user.wins - user.randomScheduleWins
    ),
  });

const getPlayerName = (
  user: TableDataType,
  playerLookupMap: Map<string, Player>,
  playerId: string | undefined,
  weekIndex: number,
  starterIndex: number
): string => {
  if (store.leagueInfo[store.currentLeagueIndex]?.platform === "espn") {
    const starter = user.starterNames?.[weekIndex]?.[starterIndex];
    return starter?.name ?? String(starter ?? "");
  }

  return playerLookupMap.get(String(playerId))?.name ?? "";
};

const buildLeagueNewsPayload = (
  currentLeague: LeagueInfoType,
  playerLookupMap: Map<string, Player>,
  weekIndex: number
): Record<string, unknown>[] => {
  const teamsByPoints = [...props.tableData].sort(
    (a, b) => b.pointsFor - a.pointsFor
  );
  const teamsByPointsAgainst = [...props.tableData].sort(
    (a, b) => b.pointsAgainst - a.pointsAgainst
  );
  const teamsByRank = [...props.tableData].sort(
    (a, b) => a.regularSeasonRank - b.regularSeasonRank
  );
  const teamsWithScoringRank = props.tableData.map((user) => ({
    user,
    pointsRank: getScoringRank(user, teamsByPoints),
  }));
  const recentWeekStart = Math.max(1, currentLeague.lastScoredWeek - 1);
  const recentTrades = (currentLeague.trades ?? []).filter(
    (trade) =>
      trade.status === "complete" &&
      trade.type === "trade" &&
      trade.leg >= recentWeekStart &&
      trade.leg <= currentLeague.lastScoredWeek
  );
  const recentWaivers = (currentLeague.waivers ?? []).filter(
    (waiver) =>
      waiver.status === "complete" &&
      ["free_agent", "waiver"].includes(waiver.type) &&
      waiver.leg >= recentWeekStart &&
      waiver.leg <= currentLeague.lastScoredWeek
  );
  const topActiveEntry = Object.entries(currentLeague.transactions ?? {}).sort(
    ([, a], [, b]) => b - a
  )[0];
  const topStarterTeams = props.tableData
    .map((user) => {
      const starterPoints = user.starterPoints[weekIndex] ?? [];
      const maxIndex =
        starterPoints.length > 0 ? getMaxIndex(starterPoints) : 0;
      const points = roundToOneDecimal(starterPoints[maxIndex] ?? 0);
      const playerId = user.starters[weekIndex]?.[maxIndex];

      return {
        user,
        points,
        player: getPlayerName(
          user,
          playerLookupMap,
          playerId,
          weekIndex,
          maxIndex
        ),
      };
    })
    .sort((a, b) => b.points - a.points);
  const benchTeams = props.tableData
    .map((user) => ({
      user,
      benchPoints: getWeekTotal(user.benchPoints, weekIndex),
      starterPoints: getWeekTotal(user.starterPoints, weekIndex),
    }))
    .sort((a, b) => b.benchPoints - a.benchPoints);
  const highestScore = [...props.tableData].sort(
    (a, b) => (b.points[weekIndex] ?? 0) - (a.points[weekIndex] ?? 0)
  );
  const lowestScore = [...props.tableData].sort(
    (a, b) => (a.points[weekIndex] ?? 0) - (b.points[weekIndex] ?? 0)
  );
  const playoffCutoffTeam = teamsByRank[currentLeague.playoffTeams - 1];
  const firstTeamOut = teamsByRank[currentLeague.playoffTeams];
  const playoffBubbleStart = Math.max(0, currentLeague.playoffTeams - 3);
  const playoffBubbleEnd = Math.min(
    teamsByRank.length,
    currentLeague.playoffTeams + 3
  );

  return [
    {
      league: {
        lastScoredWeek: currentLeague.lastScoredWeek,
        regularSeasonLength: currentLeague.regularSeasonLength,
        weeksRemaining: Math.max(
          currentLeague.regularSeasonLength - currentLeague.lastScoredWeek,
          0
        ),
        playoffTeams: currentLeague.playoffTeams,
        totalTeams: props.tableData.length,
        scoringFormat: currentLeague.scoringType,
        seasonType: currentLeague.seasonType,
        medianScoring: currentLeague.medianScoring === 1,
      },
      stories: {
        standings: {
          leader: teamsByRank[0]
            ? getStandingsRef(teamsByRank[0], teamsByPoints)
            : null,
          playoffCutoffTeam: playoffCutoffTeam
            ? getStandingsRef(playoffCutoffTeam, teamsByPoints)
            : null,
          firstTeamOut: firstTeamOut
            ? getStandingsRef(firstTeamOut, teamsByPoints)
            : null,
          playoffBubble: teamsByRank
            .slice(playoffBubbleStart, playoffBubbleEnd)
            .map((user) => getStandingsRef(user, teamsByPoints)),
        },
        hotTeams: [...props.tableData]
          .sort(
            (a, b) =>
              getAverage(b.points.slice(-3)) - getAverage(a.points.slice(-3))
          )
          .slice(0, 2)
          .map((user) =>
            getTeamRef(user, {
              last3Avg: getAverage(user.points.slice(-3)),
              last5Record: getFiveMostRecent(user.recordByWeek),
              streak: getCurrentStreak(user.recordByWeek),
            })
          ),
        coldTeams: [...props.tableData]
          .sort(
            (a, b) =>
              getAverage(a.points.slice(-3)) - getAverage(b.points.slice(-3))
          )
          .slice(0, 2)
          .map((user) =>
            getTeamRef(user, {
              last3Avg: getAverage(user.points.slice(-3)),
              last5Record: getFiveMostRecent(user.recordByWeek),
              streak: getCurrentStreak(user.recordByWeek),
            })
          ),
        unluckyTeams: teamsWithScoringRank
          .sort(
            (a, b) =>
              b.user.regularSeasonRank -
              b.pointsRank -
              (a.user.regularSeasonRank - a.pointsRank)
          )
          .slice(0, 2)
          .map(({ user, pointsRank }) =>
            getTeamRef(user, {
              rank: user.regularSeasonRank,
              pfRank: pointsRank,
              winsAboveExpectedSchedule: roundToOneDecimal(
                user.wins - user.randomScheduleWins
              ),
            })
          ),
        luckyTeams: teamsWithScoringRank
          .sort(
            (a, b) =>
              b.pointsRank -
              b.user.regularSeasonRank -
              (a.pointsRank - a.user.regularSeasonRank)
          )
          .slice(0, 2)
          .map(({ user, pointsRank }) =>
            getTeamRef(user, {
              rank: user.regularSeasonRank,
              pfRank: pointsRank,
              winsAboveExpectedSchedule: roundToOneDecimal(
                user.wins - user.randomScheduleWins
              ),
            })
          ),
        scoringLeaders: teamsByPoints.slice(0, 2).map((user) =>
          getTeamRef(user, {
            pf: user.pointsFor,
            pfRank: getScoringRank(user, teamsByPoints),
          })
        ),
        scoringLaggards: [...teamsByPoints]
          .reverse()
          .slice(0, 2)
          .map((user) =>
            getTeamRef(user, {
              pf: user.pointsFor,
              pfRank: getScoringRank(user, teamsByPoints),
            })
          ),
        schedules: {
          toughest: teamsByPointsAgainst.slice(0, 2).map((user) =>
            getTeamRef(user, {
              pa: user.pointsAgainst,
              paRank:
                teamsByPointsAgainst.findIndex(
                  (team) => team.rosterId === user.rosterId
                ) + 1,
            })
          ),
          easiest: [...teamsByPointsAgainst]
            .reverse()
            .slice(0, 2)
            .map((user) =>
              getTeamRef(user, {
                pa: user.pointsAgainst,
                paRank:
                  teamsByPointsAgainst.findIndex(
                    (team) => team.rosterId === user.rosterId
                  ) + 1,
              })
            ),
        },
        efficiencyWatch: {
          bestManager: [...props.tableData]
            .sort((a, b) => b.managerEfficiency - a.managerEfficiency)
            .slice(0, 1)
            .map((user) =>
              getTeamRef(user, {
                efficiency: roundToOneDecimal(user.managerEfficiency),
              })
            )[0],
          worstManager: [...props.tableData]
            .sort((a, b) => a.managerEfficiency - b.managerEfficiency)
            .slice(0, 1)
            .map((user) =>
              getTeamRef(user, {
                efficiency: roundToOneDecimal(user.managerEfficiency),
              })
            )[0],
        },
        weeklyHighlights: {
          highestScores: highestScore.slice(0, 2).map((user) =>
            getTeamRef(user, {
              score: roundToOneDecimal(user.points[weekIndex] ?? 0),
            })
          ),
          lowestScores: lowestScore.slice(0, 2).map((user) =>
            getTeamRef(user, {
              score: roundToOneDecimal(user.points[weekIndex] ?? 0),
            })
          ),
          highestScore: highestScore[0]
            ? getTeamRef(highestScore[0], {
                score: roundToOneDecimal(
                  highestScore[0].points[weekIndex] ?? 0
                ),
              })
            : null,
          lowestScore: lowestScore[0]
            ? getTeamRef(lowestScore[0], {
                score: roundToOneDecimal(lowestScore[0].points[weekIndex] ?? 0),
              })
            : null,
          biggestBenchMiss: benchTeams[0]
            ? getTeamRef(benchTeams[0].user, {
                benchPoints: benchTeams[0].benchPoints,
                starterPoints: benchTeams[0].starterPoints,
              })
            : null,
          biggestBenchMisses: benchTeams.slice(0, 2).map((team) =>
            getTeamRef(team.user, {
              benchPoints: team.benchPoints,
              starterPoints: team.starterPoints,
            })
          ),
          topPlayerPerformance: topStarterTeams[0]
            ? getTeamRef(topStarterTeams[0].user, {
                player: topStarterTeams[0].player,
                points: topStarterTeams[0].points,
              })
            : null,
          topPlayerPerformances: topStarterTeams.slice(0, 2).map((team) =>
            getTeamRef(team.user, {
              player: team.player,
              points: team.points,
            })
          ),
        },
        activity: {
          mostActiveTeam: topActiveEntry
            ? {
                name: getNameFromTransactionId(topActiveEntry[0]),
                transactions: topActiveEntry[1],
              }
            : null,
          recentTradeCount: recentTrades.length,
          recentWaiverCount: recentWaivers.length,
          recentWeeksIncluded: `${recentWeekStart}-${currentLeague.lastScoredWeek}`,
        },
      },
    },
  ];
};

const formatData = async () => {
  const currentLeague = store.leagueInfo[store.currentLeagueIndex];
  if (!currentLeague) {
    return;
  }

  if (isPreDraftLeague(currentLeague)) {
    currentTrends.value = preseasonUnavailableTrends;
    return;
  }

  const weekIndex = currentLeague.lastScoredWeek - 1;

  const bestStarters = props.tableData.flatMap((user) => {
    const starterPoints = user.starterPoints?.[weekIndex] ?? [];
    if (starterPoints.length === 0) {
      return [];
    }

    const maxIndex = getMaxIndex(starterPoints);
    const starter = user.starters?.[weekIndex]?.[maxIndex];
    return starter ? [starter] : [];
  });

  let playerLookupMap = new Map<string, Player>();
  if (bestStarters.length > 0) {
    playerLookupMap = await getPlayersByIdsMap(bestStarters);
  }

  const leagueNewsPayload = buildLeagueNewsPayload(
    currentLeague,
    playerLookupMap,
    weekIndex
  );

  try {
    let response;
    if (currentLeague.rosters.length <= 8) {
      response = await generateTrends(leagueNewsPayload, 120, 3);
    } else if (currentLeague.rosters.length <= 10) {
      response = await generateTrends(leagueNewsPayload, 145, 4);
    } else {
      response = await generateTrends(leagueNewsPayload, 180, 4);
    }
    currentTrends.value = response.bulletPoints;
    store.addCurrentTrends(getLeagueKey(currentLeague), currentTrends.value);
  } catch {
    currentTrends.value = [
      "Unable to generate league news. Please try again later",
    ];
    store.addCurrentTrends(getLeagueKey(currentLeague), currentTrends.value);
  }
};

onMounted(async () => {
  if (
    store.leagueInfo.length > 0 &&
    isPreDraftLeague(store.leagueInfo[store.currentLeagueIndex])
  ) {
    currentTrends.value = preseasonUnavailableTrends;
  } else if (
    store.leagueInfo.length > 0 &&
    !store.leagueInfo[store.currentLeagueIndex]?.currentTrends &&
    store.leagueInfo[store.currentLeagueIndex]?.lastScoredWeek
  ) {
    await formatData();
  } else if (
    store.leagueInfo.length > 0 &&
    !store.leagueInfo[store.currentLeagueIndex]?.currentTrends &&
    store.leagueInfo[store.currentLeagueIndex]?.status !== "pre_draft"
  ) {
    await getPreseasonData();
  } else if (store.leagueInfo.length == 0) {
    currentTrends.value = fakeHighlights;
  } else if (
    store.leagueInfo.length > 0 &&
    (store.leagueInfo[store.currentLeagueIndex]?.lastScoredWeek ||
      store.leagueInfo[store.currentLeagueIndex]?.status === "in_season")
  ) {
    const savedText: string[] =
      store.leagueInfo[store.currentLeagueIndex].currentTrends ?? [];
    if (
      savedText.length === 0 &&
      store.leagueInfo[store.currentLeagueIndex]?.lastScoredWeek
    ) {
      await formatData();
    } else {
      currentTrends.value = savedText;
    }
  }
});

watch(
  () => store.currentLeagueId,
  async () => {
    if (isPreDraftLeague(store.leagueInfo[store.currentLeagueIndex])) {
      currentTrends.value = preseasonUnavailableTrends;
      return;
    }

    if (
      store.leagueInfo[store.currentLeagueIndex] &&
      (!store.leagueInfo[store.currentLeagueIndex].currentTrends ||
        (store.leagueInfo[store.currentLeagueIndex].currentTrends?.length ??
          0) === 0) &&
      store.leagueInfo[store.currentLeagueIndex].lastScoredWeek
    ) {
      currentTrends.value = [];
      await formatData();
      return;
    }
    currentTrends.value =
      store.leagueInfo[store.currentLeagueIndex]?.currentTrends ?? [];
  }
);

const cardHeight = computed(() => {
  const currentLeague = store.leagueInfo[store.currentLeagueIndex];
  if (!currentLeague) {
    return "min-h-[360px]";
  } else {
    if (currentLeague.rosters.length <= 8) {
      return "min-h-[360px]";
    } else if (currentLeague.rosters.length <= 10) {
      return "min-h-[400px]";
    } else if (currentLeague.rosters.length <= 12) {
      return "min-h-[460px]";
    } else {
      return "min-h-[520px]";
    }
  }
});
</script>
<template>
  <Card :class="[cardHeight]" class="flex flex-col h-full p-0 overflow-hidden">
    <CardHeader class="p-4 pb-0 md:px-6 md:pb-0">
      <div class="min-w-0">
        <CardTitle>League News</CardTitle>
      </div>
    </CardHeader>

    <div v-if="renderedCurrentTrends.length > 0" class="px-4 md:px-6">
      <ul class="divide-y">
        <li
          v-for="(trend, index) in renderedCurrentTrends"
          :key="index + trend"
          class="py-4"
        >
          <div class="news-copy" v-html="trend"></div>
        </li>
      </ul>
    </div>

    <div
      v-else-if="
        store.leagueInfo[store.currentLeagueIndex] &&
        !store.leagueInfo[store.currentLeagueIndex].lastScoredWeek &&
        store.leagueInfo[store.currentLeagueIndex]?.status === 'pre_draft'
      "
      class="p-5"
    >
      <p class="text-sm text-muted-foreground">
        Please come back after week 1.
      </p>
    </div>

    <div v-else class="px-4 py-4 sm:px-6">
      <div role="status" class="w-full space-y-3 animate-pulse">
        <p class="text-muted-foreground">Analyzing league...</p>
        <div class="h-3 rounded-full bg-muted"></div>
        <div class="w-11/12 h-3 rounded-full bg-muted/80"></div>
        <div class="w-4/5 h-3 rounded-full bg-muted"></div>
        <div class="w-3/4 h-3 rounded-full bg-muted/70"></div>
        <div class="h-3 rounded-full bg-muted"></div>
        <div class="w-11/12 h-3 rounded-full bg-muted/80"></div>
        <div class="w-4/5 h-3 rounded-full bg-muted"></div>
        <div class="w-3/4 h-3 rounded-full bg-muted/70"></div>
        <div class="h-3 rounded-full bg-muted"></div>
        <div class="w-11/12 h-3 rounded-full bg-muted/80"></div>
        <div class="w-4/5 h-3 rounded-full bg-muted"></div>
        <div class="w-3/4 h-3 rounded-full bg-muted/70"></div>
        <span class="sr-only">Loading...</span>
      </div>
    </div>
  </Card>
</template>
<style scoped>
.news-copy :deep(p) {
  margin: 0;
}

.news-copy :deep(strong) {
  font-weight: 700;
}

.news-copy :deep(a) {
  color: hsl(var(--primary));
  text-decoration: underline;
  text-underline-offset: 2px;
}
</style>
