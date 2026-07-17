import { computed, ref, watch, type ComputedRef } from "vue";

import { getLeagueAnalyticsProperties, trackEvent } from "@/lib/analytics";
import { getChartTheme, getChartTooltipTheme } from "@/lib/chartTheme";
import { useStore } from "@/store/store";
import type { TableDataType } from "@/types/types";
import {
  recordPoints,
  runReplaySimulation,
  type ReplaySummary,
} from "./seasonSimulation";

type SeasonReplayDependencies = {
  tableData: ComputedRef<TableDataType[]>;
  actualStandings: ComputedRef<Array<{ index: number }>>;
  displayedWeekCount: ComputedRef<number>;
  regularSeasonWeekCount: ComputedRef<number>;
  fullSeasonOpponents: ComputedRef<(number | null)[][]>;
  playoffCutoff: ComputedRef<number>;
  usesMedianScoring: ComputedRef<boolean>;
  teamName: (team: TableDataType) => string;
};

const REPLAY_RUNS = 5000;

export const useSeasonReplay = ({
  tableData,
  actualStandings,
  displayedWeekCount,
  regularSeasonWeekCount,
  fullSeasonOpponents,
  playoffCutoff,
  usesMedianScoring,
  teamName,
}: SeasonReplayDependencies) => {
  const store = useStore();
  const replayThroughWeekValue = ref("1");
  const replayRunCount = ref(0);
  const replayWeeklyWinsByTeam = ref<number[][]>([]);
  const replaySummaryByTeam = ref<Record<number, ReplaySummary>>({});

  const replayWeekCount = computed(() =>
    Math.min(displayedWeekCount.value, regularSeasonWeekCount.value)
  );

  const replayThroughWeek = computed(() => {
    const week = Number(replayThroughWeekValue.value);
    if (!Number.isFinite(week)) return Math.min(1, replayWeekCount.value);
    return Math.min(Math.max(Math.floor(week), 1), replayWeekCount.value);
  });

  const replayThroughWeekOptions = computed(() =>
    Array.from({ length: replayWeekCount.value }, (_, index) => ({
      value: String(index + 1),
      label: `After Week ${index + 1}`,
    }))
  );

  const actualSeedByTeam = computed(() => {
    const seeds = new Map<number, number>();
    actualStandings.value.forEach((team, index) => {
      seeds.set(team.index, index + 1);
    });
    return seeds;
  });

  const replayRows = computed(() =>
    tableData.value
      .map((team, index) => {
        const actualWins = recordPoints(team.wins, team.ties ?? 0);
        const actualSeed = actualSeedByTeam.value.get(index) ?? index + 1;
        const result = replaySummaryByTeam.value[index] || {
          averageWins: actualWins,
          p10Wins: actualWins,
          p90Wins: actualWins,
          playoffOdds: 0,
          topSeedOdds: 0,
          averageSeed: actualSeed,
          sameSeedOdds: 0,
        };
        return {
          index,
          name: teamName(team),
          actualWins,
          actualSeed,
          ...result,
        };
      })
      .sort((a, b) =>
        b.playoffOdds !== a.playoffOdds
          ? b.playoffOdds - a.playoffOdds
          : a.averageSeed - b.averageSeed
      )
  );

  const replayComparisonRows = computed(() =>
    [...replayRows.value].sort(
      (a, b) =>
        Math.abs(b.actualWins - b.averageWins) -
        Math.abs(a.actualWins - a.averageWins)
    )
  );

  const replayComparisonSeries = computed(() => [
    {
      name: "Actual wins",
      data: replayComparisonRows.value.map((team) => team.actualWins),
    },
    {
      name: "Projected wins",
      data: replayComparisonRows.value.map((team) => team.averageWins),
    },
  ]);

  const replayComparisonChartOptions = computed(() => ({
    chart: {
      type: "bar",
      foreColor: getChartTheme().foreground,
      toolbar: { show: false },
      animations: { enabled: false },
    },
    colors: ["hsl(var(--chart-1))", "hsl(var(--chart-3))"],
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 3,
        barHeight: "70%",
      },
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: replayComparisonRows.value.map((team) => team.name),
      title: { text: "Wins" },
      min: 0,
      max: usesMedianScoring.value
        ? replayWeekCount.value * 2
        : replayWeekCount.value,
      tickAmount: usesMedianScoring.value
        ? Math.min(replayWeekCount.value * 2, 10)
        : Math.min(replayWeekCount.value, 10),
    },
    yaxis: { labels: { maxWidth: 180 } },
    legend: { position: "top", horizontalAlign: "left" },
    tooltip: {
      theme: getChartTooltipTheme(store.darkMode),
      y: { formatter: (value: number) => `${value.toFixed(2)} wins` },
    },
  }));

  const replayRecordSeries = computed(() =>
    tableData.value.map((team, index) => ({
      name: teamName(team),
      data: replayWeeklyWinsByTeam.value[index] || [],
    }))
  );

  const replayRecordChartOptions = computed(() => ({
    chart: {
      type: "line",
      foreColor: getChartTheme().foreground,
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: {
        enabled: true,
        easing: "easeinout",
        speed: 900,
        animateGradually: { enabled: true, delay: 80 },
        dynamicAnimation: { enabled: true, speed: 500 },
      },
    },
    colors: Array.from(
      { length: tableData.value.length },
      (_, index) => `hsl(var(--chart-rank-${(index % 12) + 1}))`
    ),
    stroke: { curve: "smooth", width: 2.5 },
    markers: { size: 3, hover: { size: 6 } },
    dataLabels: { enabled: false },
    xaxis: {
      categories: Array.from(
        { length: replayWeekCount.value },
        (_, index) => `Week ${index + 1}`
      ),
      tickAmount: Math.max(0, Math.min(replayWeekCount.value - 1, 13)),
      labels: { rotate: -45, rotateAlways: replayWeekCount.value > 8 },
    },
    yaxis: {
      min: 0,
      max: usesMedianScoring.value
        ? replayWeekCount.value * 2
        : replayWeekCount.value,
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

  const runSeasonReplay = () => {
    const weeks = replayWeekCount.value;
    if (tableData.value.length === 0 || weeks === 0) {
      replaySummaryByTeam.value = {};
      replayWeeklyWinsByTeam.value = [];
      replayRunCount.value = 0;
      return;
    }
    const result = runReplaySimulation({
      teams: tableData.value.map((team, index) => ({
        index,
        wins: team.wins,
        losses: team.losses,
        ties: team.ties ?? 0,
        pointsFor: team.pointsFor,
        scores: (team.points || [])
          .slice(0, weeks)
          .filter((score) => Number.isFinite(score) && score >= 0),
        actualSeed: actualSeedByTeam.value.get(index) ?? index + 1,
      })),
      actualScores: tableData.value.map((team) => team.points || []),
      opponents: fullSeasonOpponents.value,
      weeks,
      keepResultsThroughWeek: replayThroughWeek.value,
      playoffCutoff: playoffCutoff.value,
      medianScoring: usesMedianScoring.value,
      runs: REPLAY_RUNS,
    });
    replaySummaryByTeam.value = result.summaryByTeam;
    replayWeeklyWinsByTeam.value = result.weeklyWinsByTeam;
    replayRunCount.value = result.runCount;
  };

  const rerunSeasonReplay = () => {
    runSeasonReplay();
    if (replayRunCount.value <= 0) return;
    trackEvent("Feature Action Completed", {
      feature: "season_forecast",
      action: "replay_run",
      simulation_count: replayRunCount.value,
      through_week: replayThroughWeek.value,
      ...getLeagueAnalyticsProperties(store.currentLeague),
    });
  };

  watch(
    [tableData, replayWeekCount, replayThroughWeek, fullSeasonOpponents],
    () => runSeasonReplay(),
    { immediate: true, deep: true }
  );

  watch(
    replayWeekCount,
    (count) => {
      if (count <= 0) return;
      const selectedWeek = Number(replayThroughWeekValue.value);
      const normalizedWeek = Number.isFinite(selectedWeek)
        ? Math.min(Math.max(Math.floor(selectedWeek), 1), count)
        : 1;
      if (normalizedWeek !== selectedWeek) {
        replayThroughWeekValue.value = String(normalizedWeek);
      }
    },
    { immediate: true }
  );

  return {
    replayComparisonChartOptions,
    replayComparisonSeries,
    replayRecordChartOptions,
    replayRecordSeries,
    replayRows,
    replayRunCount,
    replayThroughWeekOptions,
    replayThroughWeekValue,
    rerunSeasonReplay,
  };
};
