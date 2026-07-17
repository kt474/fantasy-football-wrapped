import { computed, ref, watch, type ComputedRef, type Ref } from "vue";

import {
  getPlayerPositionsById,
  getProjections,
  getWeeklyProjections,
} from "@/api/sleeperApi";
import { mapWithConcurrency } from "@/lib/async";
import { getLeagueAnalyticsProperties, trackEvent } from "@/lib/analytics";
import { getChartTheme, getChartTooltipTheme } from "@/lib/chartTheme";
import { getLeagueKey, useStore } from "@/store/store";
import type { TableDataType } from "@/types/types";
import {
  getProjectedStarterTotal,
  recordPoints,
  runForecastSimulation,
  shouldUseLiveSeasonForecast,
  type ForecastSummary,
} from "./seasonSimulation";

type ForecastDependencies = {
  tableData: ComputedRef<TableDataType[]>;
  displayedWeekCount: ComputedRef<number>;
  regularSeasonWeekCount: ComputedRef<number>;
  remainingWeekCount: ComputedRef<number>;
  fullSeasonOpponents: ComputedRef<(number | null)[][]>;
  playoffCutoff: ComputedRef<number>;
  usesMedianScoring: ComputedRef<boolean>;
  activeToolValue: Ref<string>;
  teamName: (team: TableDataType) => string;
};

const FORECAST_RUNS = 5000;

export const useSeasonForecast = ({
  tableData,
  displayedWeekCount,
  regularSeasonWeekCount,
  remainingWeekCount,
  fullSeasonOpponents,
  playoffCutoff,
  usesMedianScoring,
  activeToolValue,
  teamName,
}: ForecastDependencies) => {
  const store = useStore();
  const forecastRunCount = ref(0);
  const forecastLoadingLeagueKeys = ref<Set<string>>(new Set());
  const forecastWeeklyWinsByTeam = ref<number[][]>([]);
  const forecastSummaryByTeam = ref<Record<number, ForecastSummary>>({});

  const isCurrentSeasonLeague = computed(() => {
    const league = store.currentLeague;
    return shouldUseLiveSeasonForecast({
      season: league?.season,
      status: league?.status,
      remainingWeeks: remainingWeekCount.value,
    });
  });

  const projectionTotalsByTeam = computed(() => {
    const league = store.currentLeague;
    const rosterById = new Map(
      (league?.rosters || []).map((roster) => [roster.rosterId, roster])
    );

    return tableData.value.map((team) => {
      const projections = rosterById.get(team.rosterId)?.projections || [];
      return getProjectedStarterTotal(
        projections,
        league?.rosterPositions || []
      );
    });
  });

  const forecastProjectionStartWeek = computed(() =>
    Math.max(displayedWeekCount.value + 1, 1)
  );

  const hasCurrentForecastProjections = computed(() => {
    const league = store.currentLeague;
    if (!league) return false;
    return league.rosters.every(
      (roster) =>
        !roster.players?.length ||
        (Boolean(roster.projections?.length) &&
          roster.projectionStartWeek === forecastProjectionStartWeek.value)
    );
  });

  const currentLeagueKey = computed(() => {
    const league = store.currentLeague;
    return league ? getLeagueKey(league) : "";
  });

  const forecastLoadingProjections = computed(() =>
    forecastLoadingLeagueKeys.value.has(currentLeagueKey.value)
  );

  const forecastReady = computed(
    () => forecastRunCount.value > 0 && !forecastLoadingProjections.value
  );

  const historicalTeamAverage = (teamIndex: number) => {
    const scores = (tableData.value[teamIndex]?.points || [])
      .slice(0, displayedWeekCount.value)
      .filter((score) => Number.isFinite(score) && score > 0);
    if (scores.length === 0) return 100;
    return scores.reduce((total, score) => total + score, 0) / scores.length;
  };

  const historicalTeamDeviation = (teamIndex: number, average: number) => {
    const scores = (tableData.value[teamIndex]?.points || [])
      .slice(0, displayedWeekCount.value)
      .filter((score) => Number.isFinite(score) && score > 0);
    if (scores.length < 2) return Math.max(12, average * 0.16);
    const variance =
      scores.reduce((total, score) => total + (score - average) ** 2, 0) /
      scores.length;
    return Math.max(10, Math.sqrt(variance));
  };

  const forecastRows = computed(() =>
    tableData.value
      .map((team, index) => {
        const actualWins = recordPoints(team.wins, team.ties ?? 0);
        const result = forecastSummaryByTeam.value[index] || {
          averageWins: actualWins,
          p10Wins: actualWins,
          p90Wins: actualWins,
          playoffOdds: 0,
          topSeedOdds: 0,
          averageSeed: index + 1,
        };
        return { index, name: teamName(team), ...result };
      })
      .sort((a, b) =>
        b.playoffOdds !== a.playoffOdds
          ? b.playoffOdds - a.playoffOdds
          : a.averageSeed - b.averageSeed
      )
  );

  const runSeasonForecast = () => {
    if (tableData.value.length === 0) return;
    const completedWeeks = displayedWeekCount.value;
    const projectionWeeks = Math.max(18 - completedWeeks, 1);
    const teams = tableData.value.map((team, index) => {
      const formAverage = historicalTeamAverage(index);
      const projectionAverage =
        projectionTotalsByTeam.value[index] / projectionWeeks;
      return {
        index,
        wins: team.wins,
        losses: team.losses,
        ties: team.ties ?? 0,
        pointsFor: team.pointsFor,
        mean:
          projectionAverage > 0
            ? projectionAverage * 0.7 + formAverage * 0.3
            : formAverage,
        deviation: historicalTeamDeviation(index, formAverage),
      };
    });
    const result = runForecastSimulation({
      teams,
      opponents: fullSeasonOpponents.value,
      completedWeeks,
      regularSeasonWeeks: regularSeasonWeekCount.value,
      playoffCutoff: playoffCutoff.value,
      medianScoring: usesMedianScoring.value,
      runs: FORECAST_RUNS,
    });
    forecastSummaryByTeam.value = result.summaryByTeam;
    forecastWeeklyWinsByTeam.value = result.weeklyWinsByTeam;
    forecastRunCount.value = result.runCount;
  };

  const loadForecastProjections = async () => {
    const league = store.currentLeague;
    if (!league) return;
    const leagueKey = getLeagueKey(league);
    if (forecastLoadingLeagueKeys.value.has(leagueKey)) return;
    const projectionStartWeek = forecastProjectionStartWeek.value;
    if (hasCurrentForecastProjections.value) return;

    forecastLoadingLeagueKeys.value = new Set([
      ...forecastLoadingLeagueKeys.value,
      leagueKey,
    ]);
    try {
      const playerIds = [
        ...new Set(league.rosters.flatMap((roster) => roster.players || [])),
      ];
      let positionsByPlayer: Record<string, string> | null = null;
      try {
        positionsByPlayer = await getPlayerPositionsById(playerIds);
      } catch (error) {
        console.error("Error fetching player positions:", error);
      }
      await mapWithConcurrency(league.rosters, 2, async (roster) => {
        if (!roster.players?.length) return;
        const projections = await mapWithConcurrency(
          roster.players,
          4,
          (player) =>
            positionsByPlayer
              ? getWeeklyProjections(
                  player,
                  league.season,
                  projectionStartWeek,
                  league.scoringType
                ).then((projection) => ({
                  projection,
                  position: positionsByPlayer?.[player] || "",
                }))
              : getProjections(
                  player,
                  league.season,
                  projectionStartWeek,
                  league.scoringType
                )
        );
        store.addProjectionData(
          leagueKey,
          roster.id,
          projections,
          projectionStartWeek
        );
      });
    } finally {
      const loadingLeagueKeys = new Set(forecastLoadingLeagueKeys.value);
      loadingLeagueKeys.delete(leagueKey);
      forecastLoadingLeagueKeys.value = loadingLeagueKeys;

      if (currentLeagueKey.value !== leagueKey) return;
      if (projectionStartWeek !== forecastProjectionStartWeek.value) {
        await loadForecastProjections();
        return;
      }
      runSeasonForecast();
    }
  };

  const rerunSeasonForecast = () => {
    runSeasonForecast();
    if (forecastRunCount.value <= 0) return;
    trackEvent("Feature Action Completed", {
      feature: "season_forecast",
      action: "forecast_run",
      simulation_count: forecastRunCount.value,
      ...getLeagueAnalyticsProperties(store.currentLeague),
    });
  };

  const forecastRaceSeries = computed(() =>
    tableData.value.map((team, index) => ({
      name: teamName(team),
      data: [
        recordPoints(team.wins, team.ties ?? 0),
        ...(forecastWeeklyWinsByTeam.value[index] || []),
      ],
    }))
  );

  const forecastRaceChartOptions = computed(() => ({
    chart: {
      type: "line",
      foreColor: getChartTheme().foreground,
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: { enabled: false },
    },
    colors: Array.from(
      { length: tableData.value.length },
      (_, index) => `hsl(var(--chart-rank-${(index % 12) + 1}))`
    ),
    stroke: { curve: "smooth", width: 2.5 },
    markers: { size: 3, hover: { size: 6 } },
    dataLabels: { enabled: false },
    xaxis: {
      categories: [
        "Now",
        ...Array.from(
          { length: remainingWeekCount.value },
          (_, index) => `Week ${displayedWeekCount.value + index + 1}`
        ),
      ],
      tickAmount: Math.max(0, Math.min(remainingWeekCount.value, 13)),
      labels: { rotate: -45, rotateAlways: remainingWeekCount.value > 8 },
    },
    yaxis: {
      min: 0,
      max: usesMedianScoring.value
        ? regularSeasonWeekCount.value * 2
        : regularSeasonWeekCount.value,
      forceNiceScale: true,
      title: { text: "Average cumulative wins" },
    },
    legend: {
      position: "bottom",
      horizontalAlign: "center",
      onItemClick: { toggleDataSeries: true },
      onItemHover: { highlightDataSeries: true },
    },
    grid: { borderColor: "hsl(var(--border))" },
    tooltip: {
      shared: true,
      intersect: false,
      theme: getChartTooltipTheme(store.darkMode),
      y: { formatter: (value: number) => `${value.toFixed(2)} wins` },
    },
  }));

  const forecastComparisonRows = computed(() =>
    [...forecastRows.value].sort((a, b) => b.averageWins - a.averageWins)
  );

  const forecastComparisonSeries = computed(() => [
    {
      name: "Current wins",
      data: forecastComparisonRows.value.map((team) =>
        recordPoints(
          tableData.value[team.index]?.wins ?? 0,
          tableData.value[team.index]?.ties ?? 0
        )
      ),
    },
    {
      name: "Projected wins",
      data: forecastComparisonRows.value.map((team) => team.averageWins),
    },
  ]);

  const forecastComparisonChartOptions = computed(() => ({
    chart: {
      type: "bar",
      foreColor: getChartTheme().foreground,
      toolbar: { show: false },
      animations: { enabled: false },
    },
    colors: ["hsl(var(--chart-1))", "hsl(var(--chart-3))"],
    plotOptions: {
      bar: { horizontal: true, borderRadius: 3, barHeight: "70%" },
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: forecastComparisonRows.value.map((team) => team.name),
      title: { text: "Wins" },
      min: 0,
      max: usesMedianScoring.value
        ? regularSeasonWeekCount.value * 2
        : regularSeasonWeekCount.value,
      tickAmount: usesMedianScoring.value
        ? Math.min(regularSeasonWeekCount.value * 2, 10)
        : Math.min(regularSeasonWeekCount.value, 10),
    },
    yaxis: { labels: { maxWidth: 180 } },
    legend: { position: "top", horizontalAlign: "left" },
    tooltip: {
      theme: getChartTooltipTheme(store.darkMode),
      y: { formatter: (value: number) => `${value.toFixed(2)} wins` },
    },
  }));

  watch(
    [tableData, regularSeasonWeekCount, displayedWeekCount],
    () => {
      if (isCurrentSeasonLeague.value && !hasCurrentForecastProjections.value) {
        return;
      }
      runSeasonForecast();
    },
    { immediate: true, deep: true }
  );

  watch(
    [activeToolValue, () => store.currentLeagueId, isCurrentSeasonLeague],
    async () => {
      if (
        activeToolValue.value === "season-simulation" &&
        isCurrentSeasonLeague.value
      ) {
        await loadForecastProjections();
      }
    },
    { immediate: true }
  );

  return {
    forecastComparisonChartOptions,
    forecastComparisonSeries,
    forecastLoadingProjections,
    forecastRaceChartOptions,
    forecastRaceSeries,
    forecastReady,
    forecastRows,
    forecastRunCount,
    isCurrentSeasonLeague,
    rerunSeasonForecast,
  };
};
