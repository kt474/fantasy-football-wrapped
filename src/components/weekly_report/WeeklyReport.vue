<script setup lang="ts">
import {
  TableDataType,
  LeagueInfoType,
  PremiumReport,
} from "../../types/types.ts";
import { Player } from "../../types/apiTypes.ts";
import { computed, ref, watch, onMounted, nextTick } from "vue";
import { getLeagueKey, useStore } from "../../store/store";
import {
  generateReport,
  generatePremiumReport,
  getPlayersByIdsMap,
  sharePremiumReport,
} from "../../api/api.ts";
import SectionCard from "../layout/SectionCard.vue";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectItem,
  SelectValue,
} from "../ui/select";
import {
  fakeTopPerformers,
  fakeBottomPerformers,
  fakeBenchPerformers,
} from "../../api/fakeLeague.ts";
import WeeklyPreview from "./WeeklyPreview.vue";
import WeeklyShareCard from "./WeeklyShareCard.vue";
import WeeklyAwards from "./WeeklyAwards.vue";
import WeeklyPerformers from "./WeeklyPerformers.vue";
import WeeklyReportSummary from "./WeeklyReportSummary.vue";
import WeeklyMatchups from "./WeeklyMatchups.vue";
import WeeklyPointsChart from "./WeeklyPointsChart.vue";
import Separator from "../ui/separator/Separator.vue";
import { toast } from "vue-sonner";
import { toPng } from "html-to-image";
import { getLeagueAnalyticsProperties, trackEvent } from "@/lib/analytics";
import { normalizePremiumReport } from "@/lib/premiumReport";
import {
  buildPremiumReportPrompt,
  buildReportPrompt,
  buildWeeklyWaiverContext,
  getBenchPerformers,
  getBracketRosterIds,
  getExportPlayers,
  getExportTopTeams,
  getMatchupNumbers,
  getPlayoffRoundMetadata,
  getSortedTableData,
  getWeeklyAwards,
  getWeeklyPerformers,
} from "./weeklyReportTransforms";

const store = useStore();
const props = defineProps<{
  tableData: TableDataType[];
  regularSeasonLength: number;
}>();

const rawWeeklyReport = ref<string>("");
const playerNames = ref<Player[][]>([]);
const benchPlayerNames = ref<Player[][]>([]);
const weeklyPlayerLookup = ref<Map<string, Player>>(new Map());
const loading = ref(false);
const tier = ref("Standard");
const premiumLoading = ref(false);
const isSharingReport = ref(false);
const sharedReportUrl = ref("");
const fetchingPlayers = ref(false);

const activeTab = ref("Report");
const premiumCommentaryStyle = ref("roast");
const premiumWeeklyReport = ref<PremiumReport | null>(null);

const getWeeklyReportAnalyticsProperties = (action: string) => ({
  feature: "weekly_report",
  action,
  ...getLeagueAnalyticsProperties(store.currentLeague),
});

const getSavedPremiumReport = (
  league: LeagueInfoType | undefined,
  week: number
): PremiumReport | null => {
  const weeklyReport = league?.premiumWeeklyReports?.[week];
  return normalizePremiumReport(weeklyReport);
};

const premiumReportText = computed(() => {
  const report = premiumWeeklyReport.value;
  if (!report) {
    return "";
  }

  const matchups = report.matchupReports
    .map(
      (matchup) =>
        `Matchup ${matchup.matchupNumber} (${matchup.bracket} bracket)\n${matchup.headline}\n${matchup.recap}`
    )
    .join("\n\n");
  const lowlights = report.weeklyLowlights.entries
    .map((entry) => `${entry.teamName} — ${entry.headline}\n${entry.analysis}`)
    .join("\n\n");

  return [
    report.frontPage.headline,
    report.frontPage.subheadline,
    report.frontPage.lead,
    matchups,
    `Team of the Week: ${report.teamOfTheWeek.teamName} (${report.teamOfTheWeek.pointsScored} points)`,
    report.teamOfTheWeek.headline,
    report.teamOfTheWeek.analysis,
    report.weeklyLowlights.headline,
    lowlights,
  ]
    .filter(Boolean)
    .join("\n\n");
});

const weeks = computed(() => {
  if (
    store.leagueInfo.length == 0 ||
    !store.currentLeague
  ) {
    return [...Array(15).keys()].slice(1).reverse();
  }
  if (
    props.tableData[0].matchups &&
    store.currentLeague.lastScoredWeek
  ) {
    const recordLength = props.tableData[0].matchups.length + 1;
    const weeksList = [
      ...Array(
        store.currentLeague.lastScoredWeek + 1
      ).keys(),
    ]
      .slice(1)
      .reverse();

    const result =
      recordLength < weeksList.length
        ? [...Array(recordLength).keys()].slice(1).reverse()
        : weeksList;
    return activeTab.value === "Report"
      ? result
      : result.length === 17 ||
          result.length === 18 ||
          store.leagueInfo.length === 0
        ? result
        : (result.unshift(result[result.length - 1] + result.length), result);
  }
  return [1];
});

const playoffWeeks = computed(() => {
  if (
    store.leagueInfo.length > 0 &&
    store.currentLeague
  ) {
    const currentLeague = store.currentLeague;
    const result: number[] = [];
    for (let i = currentLeague.regularSeasonLength + 1; i <= 18; i++) {
      result.push(i);
    }
    return result;
  }
  return [15, 16, 17];
});

const currentWeek = ref(weeks.value[0]);
let playerRequestId = 0;

const fetchPlayerNames = async () => {
  if (
    store.leagueIds.length > 0 &&
    store.currentLeague?.lastScoredWeek &&
    weeks.value.length > 0
  ) {
    const requestId = ++playerRequestId;
    fetchingPlayers.value = true;
    const weekIndex = currentWeek.value - 1;
    const currentLeague = store.currentLeague;
    const waiverPlayerIds = currentLeague.waivers
      .filter(
        (transaction) =>
          transaction.status === "complete" &&
          transaction.leg === currentWeek.value &&
          (transaction.type === "waiver" || transaction.type === "free_agent")
      )
      .flatMap((transaction) => Object.keys(transaction.adds ?? {}));
    const allPlayerIds = [
      ...props.tableData.flatMap((user) =>
        (user.starters[weekIndex] ?? []).filter(
          (id): id is string => id !== null
        )
      ),
      ...props.tableData.flatMap((user) =>
        (user.benchPlayers[weekIndex] ?? []).filter(
          (id): id is string => id !== null
        )
      ),
      ...waiverPlayerIds,
    ];
    const uniquePlayerIds = [...new Set(allPlayerIds)];
    const playerLookupMap =
      uniquePlayerIds.length > 0
        ? await getPlayersByIdsMap(uniquePlayerIds)
        : new Map<string, Player>();
    if (requestId !== playerRequestId) {
      return;
    }
    weeklyPlayerLookup.value = playerLookupMap;
    const result = props.tableData.map((user) => {
      const starterIds = user.starters[weekIndex];
      const starterNames = starterIds
        ?.map((id: string) => playerLookupMap.get(id))
        .filter((player) => player !== undefined);
      return starterNames;
    });
    playerNames.value = result;

    const benchResult: Player[][] = props.tableData.map((user) => {
      const benchIds = user.benchPlayers[weekIndex] ?? [];
      return benchIds
        .map((id: string) => playerLookupMap.get(id))
        .filter((player): player is Player => player !== undefined);
    });
    benchPlayerNames.value = benchResult;
    fetchingPlayers.value = false;
  }
};

const getPremiumReport = async () => {
  if (premiumLoading.value) return;

  if (
    store.leagueIds.length > 0 &&
    store.currentLeague?.lastScoredWeek &&
    !fetchingPlayers.value
  ) {
    const reportWeek = currentWeek.value;
    const reportPrompt = premiumReportPrompt.value;
    premiumWeeklyReport.value = null;
    sharedReportUrl.value = "";
    const currentLeague = store.currentLeague;
    const reportLeagueKey = getLeagueKey(currentLeague);
    let leagueMetadata: Record<string, string | number> = {
      leagueName: currentLeague.name,
      season: currentLeague.season,
      currentWeek: reportWeek,
      numberOfPlayoffTeams: currentLeague.playoffTeams,
      numberRegularSeasonWeeks: currentLeague.regularSeasonLength,
      medianScoring: currentLeague.medianScoring,
    };
    if (reportWeek > currentLeague.regularSeasonLength) {
      const playoffRound = getPlayoffRoundMetadata({
        currentWeek: reportWeek,
        regularSeasonLength: currentLeague.regularSeasonLength,
        playoffTeams: currentLeague.playoffTeams,
        espnPlayoffMatchupPeriods: currentLeague.espnPlayoffMatchupPeriods,
      });
      leagueMetadata = {
        ...leagueMetadata,
        playoffRound: playoffRound.playoffRound,
      };
    }
    premiumLoading.value = true;
    const response = await generatePremiumReport(
      reportPrompt,
      leagueMetadata,
      premiumCommentaryStyle.value
    );
    if (!response.report) {
      toast.error(response.text ?? "Unable to generate premium report.");
      premiumLoading.value = false;
      return;
    }
    premiumLoading.value = false;
    if (
      store.currentLeagueId === reportLeagueKey &&
      currentWeek.value === reportWeek
    ) {
      premiumWeeklyReport.value = response.report;
      sharedReportUrl.value = "";
    }
    trackEvent("Weekly Report Generated", {
      ...getWeeklyReportAnalyticsProperties("report_generated"),
      tier: "premium",
      week: reportWeek,
    });
    store.addPremiumWeeklyReport(reportLeagueKey, reportWeek, response.report);
  }
};

const getReport = async () => {
  if (store.leagueIds.length > 0) {
    const currentLeague = store.currentLeague;
    let leagueMetadata: Record<string, string | number>;
    if (isPlayoffs.value) {
      const playoffRound = getPlayoffRoundMetadata({
        currentWeek: currentWeek.value,
        regularSeasonLength: currentLeague.regularSeasonLength,
        playoffTeams: currentLeague.playoffTeams,
        espnPlayoffMatchupPeriods: currentLeague.espnPlayoffMatchupPeriods,
      });
      leagueMetadata = {
        playoffRound: playoffRound.playoffRound,
      };
      if (playoffRound.championshipMatchup) {
        leagueMetadata["ChampionshipMatchup"] = 1;
      }
    } else {
      leagueMetadata = {
        numberOfPlayoffTeams: currentLeague.playoffTeams,
        numberRegularSeasonWeeks: currentLeague.regularSeasonLength,
        currentWeek: currentWeek.value,
      };
    }
    const response = await generateReport(
      reportPrompt.value,
      leagueMetadata,
      currentLeague.leagueId,
      currentWeek.value,
      currentLeague.season
    );
    rawWeeklyReport.value = response.text;
    trackEvent("Weekly Report Generated", {
      ...getWeeklyReportAnalyticsProperties("report_generated"),
      tier: "standard",
    });
    store.addWeeklyReport(getLeagueKey(currentLeague), rawWeeklyReport.value);
  }
};

onMounted(async () => {
  if (
    store.leagueInfo.length > 0 &&
    props.tableData[0].matchups &&
    weeks.value.length > 0 &&
    store.currentLeague &&
    store.currentLeague.lastScoredWeek &&
    !store.currentLeague.weeklyReport &&
    store.currentLeague.seasonType !== "Guillotine"
  ) {
    loading.value = true;
    await fetchPlayerNames();
    await getReport();
    loading.value = false;
  } else if (
    store.leagueInfo.length > 0 &&
    store.currentLeague &&
    store.currentLeague.lastScoredWeek
  ) {
    loading.value = true;
    await fetchPlayerNames();
    const savedText = store.currentLeague?.weeklyReport
      ? (store.currentLeague.weeklyReport ?? "")
      : "";
    rawWeeklyReport.value = savedText;
    premiumWeeklyReport.value = getSavedPremiumReport(
      store.currentLeague,
      currentWeek.value
    );
    loading.value = false;
  }
});

const isPlayoffs = computed(() => {
  const currentLeague = store.currentLeague;
  if (currentWeek.value > currentLeague?.regularSeasonLength) {
    return true;
  }
  return false;
});

const losersBracketIDs = computed(() => {
  return getBracketRosterIds(
    store.currentLeague.losersBracket
  );
});

const winnersBracketIDs = computed(() => {
  return getBracketRosterIds(
    store.currentLeague.winnersBracket
  );
});

const bestPerformers = computed(() => {
  if (
    playerNames.value.length > 0 &&
    store.currentLeague?.lastScoredWeek
  ) {
    return getWeeklyPerformers({
      tableData: props.tableData,
      playerNames: playerNames.value,
      weekIndex: currentWeek.value - 1,
      showUsernames: store.showUsernames,
      sortDirection: "desc",
    });
  } else if (store.leagueInfo.length === 0) {
    return fakeTopPerformers;
  }
  return [];
});

const worstPerformers = computed(() => {
  if (
    playerNames.value.length > 0 &&
    store.currentLeague?.lastScoredWeek
  ) {
    return getWeeklyPerformers({
      tableData: props.tableData,
      playerNames: playerNames.value,
      weekIndex: currentWeek.value - 1,
      showUsernames: store.showUsernames,
      sortDirection: "asc",
    });
  } else if (store.leagueInfo.length === 0) {
    return fakeBottomPerformers;
  }
  return [];
});

const benchPerformers = computed(() => {
  if (
    playerNames.value.length > 0 &&
    benchPlayerNames.value.length > 0 &&
    store.currentLeague?.lastScoredWeek
  ) {
    return getBenchPerformers({
      tableData: props.tableData,
      benchPlayerNames: benchPlayerNames.value,
      weekIndex: currentWeek.value - 1,
      showUsernames: store.showUsernames,
    });
  } else if (store.leagueInfo.length === 0) {
    return fakeBenchPerformers;
  }
  return [];
});

const weeklyAwards = computed(() => {
  if (
    playerNames.value.length > 0 &&
    benchPlayerNames.value.length > 0 &&
    store.currentLeague?.lastScoredWeek
  ) {
    return getWeeklyAwards({
      tableData: props.tableData,
      playerNames: playerNames.value,
      benchPlayerNames: benchPlayerNames.value,
      weekIndex: currentWeek.value - 1,
      showUsernames: store.showUsernames,
      rosterPositions:
        store.currentLeague?.rosterPositions ?? [],
    });
  }
  return [];
});

const reportPrompt = computed(() => {
  return buildReportPrompt({
    tableData: props.tableData,
    playerNames: playerNames.value,
    benchPlayerNames: benchPlayerNames.value,
    weekIndex: currentWeek.value - 1,
    showUsernames: store.showUsernames,
    isPlayoffs: isPlayoffs.value,
    losersBracket:
      store.currentLeague?.losersBracket ?? [],
    winnersBracket:
      store.currentLeague?.winnersBracket ?? [],
    espnLosersBracket:
      store.currentLeague?.espnLosersBracket ?? [],
    espnWinnersBracket:
      store.currentLeague?.espnWinnersBracket ?? [],
    medianScoring: medianScoring.value,
  });
});

const premiumReportPrompt = computed(() => {
  const currentLeague = store.currentLeague;
  const waiverMovesByRoster = buildWeeklyWaiverContext({
    waivers: currentLeague?.waivers ?? [],
    tableData: props.tableData,
    playerLookup: weeklyPlayerLookup.value,
    weekIndex: currentWeek.value - 1,
  });

  return buildPremiumReportPrompt({
    tableData: props.tableData,
    playerNames: playerNames.value,
    benchPlayerNames: benchPlayerNames.value,
    weekIndex: currentWeek.value - 1,
    showUsernames: store.showUsernames,
    isPlayoffs: isPlayoffs.value,
    losersBracketIds: losersBracketIDs.value,
    winnersBracketIds: winnersBracketIDs.value,
    losersBracket:
      store.currentLeague?.losersBracket ?? [],
    winnersBracket:
      store.currentLeague?.winnersBracket ?? [],
    espnLosersBracket:
      store.currentLeague?.espnLosersBracket ?? [],
    espnWinnersBracket:
      store.currentLeague?.espnWinnersBracket ?? [],
    rosterPositions: currentLeague?.rosterPositions ?? [],
    medianScoring: medianScoring.value,
    waiverMovesByRoster,
  });
});

const numOfMatchups = computed(() => {
  return getMatchupNumbers(sortedTableData.value, currentWeek.value - 1);
});

const medianScoring = computed(() => {
  return Boolean(
    store.leagueInfo.length > 0 &&
    store.currentLeague &&
    store.currentLeague.medianScoring === 1
  );
});

const sortedTableData = computed(() => {
  return getSortedTableData(props.tableData, currentWeek.value - 1);
});

watch(
  () => store.currentLeagueId,
  async () => {
    currentWeek.value = weeks.value[0];
    if (
      store.currentLeague.lastScoredWeek &&
      !store.currentLeague.weeklyReport &&
      store.currentLeague.seasonType !== "Guillotine" &&
      weeks.value.length > 0
    ) {
      rawWeeklyReport.value = "";
      loading.value = true;
      await fetchPlayerNames();
      await getReport();
      loading.value = false;
    } else if (
      store.currentLeague.lastScoredWeek &&
      weeks.value.length > 0
    ) {
      await fetchPlayerNames();
    }
    rawWeeklyReport.value =
      store.currentLeague.weeklyReport ?? "";
    premiumWeeklyReport.value = getSavedPremiumReport(
      store.currentLeague,
      currentWeek.value
    );
  }
);

const copyReport = () => {
  const reportText =
    tier.value === "Standard" ? rawWeeklyReport.value : premiumReportText.value;
  if (!reportText) {
    toast.error("Generate a report before copying.");
    return;
  }

  navigator.clipboard.writeText(
    reportText + "\n\nCreated with https://ffwrapped.com"
  );
  trackEvent("Weekly Report Shared", {
    ...getWeeklyReportAnalyticsProperties("report_copied"),
    method: "clipboard_copy",
    tier: tier.value.toLowerCase(),
  });
  toast.success("Full report copied to clipboard");
};

const shareReport = async () => {
  if (!premiumWeeklyReport.value || isSharingReport.value) {
    return;
  }

  isSharingReport.value = true;
  try {
    if (!sharedReportUrl.value) {
      const currentLeague = store.currentLeague;
      const response = await sharePremiumReport({
        leagueId: currentLeague.leagueId,
        platform: currentLeague.platform === "espn" ? "espn" : "sleeper",
        leagueName: currentLeague.name,
        season: currentLeague.season,
        week: currentWeek.value,
        report: premiumWeeklyReport.value,
      });
      sharedReportUrl.value = response.url;
    }

    const shareData = {
      title: `${store.currentLeague.name} Week ${currentWeek.value} Report`,
      text: "Check out this ffwrapped premium weekly report.",
      url: sharedReportUrl.value,
    };

    if (navigator.share) {
      await navigator.share(shareData);
      trackEvent("Weekly Report Shared", {
        ...getWeeklyReportAnalyticsProperties("report_shared"),
        method: "native",
        tier: "premium",
      });
      return;
    }

    await navigator.clipboard.writeText(sharedReportUrl.value);
    trackEvent("Weekly Report Shared", {
      ...getWeeklyReportAnalyticsProperties("report_shared"),
      method: "clipboard",
      tier: "premium",
    });
    toast.success("Share link copied to clipboard!");
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return;
    }
    console.error("Unable to share premium report:", error);
    toast.error("Unable to create the share link. Please try again.");
  } finally {
    isSharingReport.value = false;
  }
};

const isGeneratingImage = ref(false);
const shareCardRef = ref<HTMLElement | null>(null);

const exportTopTeams = computed(() => {
  return getExportTopTeams(
    sortedTableData.value,
    currentWeek.value - 1,
    store.showUsernames
  );
});

const exportHotPlayers = computed(() => {
  return getExportPlayers(bestPerformers.value);
});

const exportColdPlayers = computed(() => {
  return getExportPlayers(worstPerformers.value);
});

const exportBenchPlayers = computed(() => {
  return getExportPlayers(benchPerformers.value);
});

const exportSummary = computed(() => {
  const sourceText =
    tier.value === "Premium" ? premiumReportText.value : rawWeeklyReport.value;
  if (!sourceText) {
    return "";
  }
  return sourceText;
});

const exportPremiumFrontPage = computed(() =>
  tier.value === "Premium" ? premiumWeeklyReport.value?.frontPage : undefined
);

const getReportImageFilename = () => `ffwrapped-week-${currentWeek.value}.png`;

// html-to-image replaces remote images with this value when they cannot be
// fetched (for example, an expired ESPN avatar). Its default is an empty src,
// which causes the cloned image to fail loading and aborts the whole export.
const transparentImagePlaceholder =
  "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";

const downloadReportImageFile = (dataUrl: string) => {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = getReportImageFilename();
  link.click();
  trackEvent("Weekly Report Shared", {
    ...getWeeklyReportAnalyticsProperties("report_image_exported"),
    method: "image_download",
    tier: tier.value.toLowerCase(),
  });
  toast.success("Weekly report image downloaded");
};

const dataUrlToFile = async (dataUrl: string) => {
  const blob = await (await fetch(dataUrl)).blob();
  return new File([blob], getReportImageFilename(), {
    type: "image/png",
  });
};

const shareOrDownloadReportImage = async () => {
  if (isGeneratingImage.value) {
    return;
  }
  if (!shareCardRef.value || exportTopTeams.value.length === 0) {
    toast.error("No weekly data available yet");
    return;
  }
  if (tier.value === "Premium" && !premiumWeeklyReport.value) {
    toast.error("Generate a premium report before sharing the image.");
    return;
  }

  isGeneratingImage.value = true;
  try {
    await nextTick();
    const exportWidth = shareCardRef.value.scrollWidth;
    const exportHeight = shareCardRef.value.scrollHeight;
    const dataUrl = await toPng(shareCardRef.value, {
      cacheBust: true,
      imagePlaceholder: transparentImagePlaceholder,
      // The page has already loaded its fonts. Avoid reading cross-origin
      // stylesheet rules, which browsers correctly block for Google Fonts.
      skipFonts: true,
      pixelRatio: 2,
      backgroundColor: "#ffffff",
      width: exportWidth,
      height: exportHeight,
      canvasWidth: exportWidth * 2,
      canvasHeight: exportHeight * 2,
    });

    const file = await dataUrlToFile(dataUrl);
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        title: `Week ${currentWeek.value} ffwrapped Report`,
        text: "https://ffwrapped.com",
        files: [file],
      });
      trackEvent("Weekly Report Shared", {
        ...getWeeklyReportAnalyticsProperties("report_image_exported"),
        method: "image_share",
        tier: tier.value.toLowerCase(),
      });
      return;
    }

    downloadReportImageFile(dataUrl);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return;
    }
    console.error(error);
    toast.error("Unable to generate image");
  } finally {
    isGeneratingImage.value = false;
  }
};

watch(
  [() => props.regularSeasonLength, () => activeTab.value],
  () => (currentWeek.value = weeks.value[0])
);
watch(
  () => currentWeek.value,
  async (week) => {
    const currentLeague = store.currentLeague;
    rawWeeklyReport.value =
      week === weeks.value[0] ? (currentLeague?.weeklyReport ?? "") : "";
    premiumWeeklyReport.value = getSavedPremiumReport(currentLeague, week);
    sharedReportUrl.value = "";
    playerNames.value = [];
    benchPlayerNames.value = [];
    weeklyPlayerLookup.value = new Map();
    await fetchPlayerNames();
  }
);
</script>
<template>
  <SectionCard class="h-full my-4 custom-width">
    <Tabs default-value="Report" v-model="activeTab">
      <div class="flex justify-between w-full mb-3">
        <h2 class="mr-4 heading-section">Weekly {{ activeTab }}</h2>
        <div class="flex flex-wrap justify-end">
          <div class="inline-flex pb-1 rounded-lg sm:mr-2" role="tablist">
            <TabsList>
              <TabsTrigger value="Report"> Report </TabsTrigger>
              <TabsTrigger value="Preview"> Preview </TabsTrigger>
            </TabsList>
          </div>
          <Select v-model="currentWeek">
            <SelectTrigger
              :class="playoffWeeks.includes(currentWeek) ? 'w-44' : 'w-28'"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-if="weeks.length > 0"
                v-for="week in weeks"
                :key="week"
                :value="week"
              >
                Week {{ week }}
                {{ playoffWeeks.includes(week) ? "(playoffs)" : "" }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <Separator class="h-px mt-2 mb-3" />
      <TabsContent value="Report">
        <WeeklyReportSummary
          v-model:tier="tier"
          v-model:premium-commentary-style="premiumCommentaryStyle"
          :weeks-length="weeks.length"
          :current-week="currentWeek"
          :is-latest-week="currentWeek === weeks[0]"
          :has-leagues="store.leagueIds.length !== 0"
          :has-last-scored-week="
            Boolean(store.currentLeague?.lastScoredWeek)
          "
          :raw-weekly-report="rawWeeklyReport"
          :premium-weekly-report="premiumWeeklyReport"
          :loading="loading"
          :premium-loading="premiumLoading"
          :report-data-loading="fetchingPlayers"
          :is-generating-image="isGeneratingImage"
          :is-sharing-report="isSharingReport"
          @download-image="shareOrDownloadReportImage"
          @copy-report="copyReport"
          @share-report="shareReport"
          @generate-premium="getPremiumReport"
        />
        <WeeklyMatchups
          :sorted-table-data="sortedTableData"
          :matchup-numbers="numOfMatchups"
          :current-week="currentWeek"
          :show-usernames="store.showUsernames"
          :median-scoring="medianScoring"
        />
        <Separator class="h-px mt-4 mb-2.5" />

        <WeeklyAwards :awards="weeklyAwards" />
        <Separator v-if="weeklyAwards.length > 0" class="h-px mt-4 mb-2.5" />

        <WeeklyPerformers
          title="Top Performers"
          :performers="bestPerformers"
          :loading="fetchingPlayers"
          score-class="mt-2 font-semibold"
        />
        <WeeklyPerformers
          title="Bottom Performers"
          :performers="worstPerformers"
          :loading="fetchingPlayers"
          score-class="mt-3.5 font-semibold"
        />
        <WeeklyPerformers
          title="Top Benchwarmers"
          :performers="benchPerformers"
          :loading="fetchingPlayers"
          score-class="mt-3 font-semibold"
        />
        <Separator class="h-px mt-4 mb-2" />
        <WeeklyPointsChart
          :sorted-table-data="sortedTableData"
          :current-week="currentWeek"
          :dark-mode="store.darkMode"
          :show-usernames="store.showUsernames"
        />
      </TabsContent>
      <TabsContent
        value="Preview"
        v-if="
          store.currentLeague?.seasonType !==
          'Guillotine'
        "
      >
        <WeeklyPreview
          :table-data="sortedTableData"
          :current-week="currentWeek ? currentWeek : 0"
          :is-playoffs="isPlayoffs"
        />
      </TabsContent>
    </Tabs>
  </SectionCard>
  <div class="fixed top-0 left-[-10000px] pointer-events-none">
    <div ref="shareCardRef">
      <WeeklyShareCard
        :league-name="store.currentLeague?.name"
        :week="currentWeek"
        :top-teams="exportTopTeams"
        :hot-players="exportHotPlayers"
        :cold-players="exportColdPlayers"
        :bench-players="exportBenchPlayers"
        :summary="exportSummary"
        :tier="tier"
        :premium-front-page="exportPremiumFrontPage"
      />
    </div>
  </div>
</template>
