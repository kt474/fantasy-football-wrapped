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
} from "../../api/api.ts";
import Card from "../ui/card/Card.vue";
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
import WeeklyPerformers from "./WeeklyPerformers.vue";
import WeeklyReportSummary from "./WeeklyReportSummary.vue";
import WeeklyMatchups from "./WeeklyMatchups.vue";
import WeeklyPointsChart from "./WeeklyPointsChart.vue";
import Separator from "../ui/separator/Separator.vue";
import { toast } from "vue-sonner";
import { toPng } from "html-to-image";
import {
  buildPremiumReportPrompt,
  buildReportPrompt,
  getBenchPerformers,
  getBracketRosterIds,
  getExportPlayers,
  getExportTopTeams,
  getMatchupNumbers,
  getSortedTableData,
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
const loading = ref(false);
const tier = ref("Standard");
const premiumLoading = ref(false);
const fetchingPlayers = ref(false);

const activeTab = ref("Report");
const premiumCommentaryStyle = ref("roast");
const premiumWeeklyReport = ref<PremiumReport | null>(null);

const isPremiumReport = (value: unknown): value is PremiumReport => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const report = value as Partial<PremiumReport>;
  return Boolean(
    report.frontPage &&
      Array.isArray(report.matchupReports) &&
      report.teamOfTheWeek &&
      report.managersBlotter
  );
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
  const blotter = report.managersBlotter.entries
    .map(
      (entry) =>
        `${entry.teamName} — ${entry.headline}\n${entry.analysis}`
    )
    .join("\n\n");

  return [
    report.frontPage.headline,
    report.frontPage.subheadline,
    report.frontPage.lead,
    matchups,
    `Team of the Week: ${report.teamOfTheWeek.teamName} (${report.teamOfTheWeek.pointsScored} points)`,
    report.teamOfTheWeek.headline,
    report.teamOfTheWeek.analysis,
    "Manager Blunders",
    blotter,
  ]
    .filter(Boolean)
    .join("\n\n");
});

const weeks = computed(() => {
  if (
    store.leagueInfo.length == 0 ||
    !store.leagueInfo[store.currentLeagueIndex]
  ) {
    return [...Array(15).keys()].slice(1).reverse();
  }
  if (
    props.tableData[0].matchups &&
    store.leagueInfo[store.currentLeagueIndex].lastScoredWeek
  ) {
    const recordLength = props.tableData[0].matchups.length + 1;
    const weeksList = [
      ...Array(
        store.leagueInfo[store.currentLeagueIndex].lastScoredWeek + 1
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
    store.leagueInfo[store.currentLeagueIndex]
  ) {
    const currentLeague = store.leagueInfo[store.currentLeagueIndex];
    const result: number[] = [];
    for (let i = currentLeague.regularSeasonLength + 1; i <= 18; i++) {
      result.push(i);
    }
    return result;
  }
  return [15, 16, 17];
});

const currentWeek = ref(weeks.value[0]);

const fetchPlayerNames = async () => {
  if (
    store.leagueIds.length > 0 &&
    store.leagueInfo[store.currentLeagueIndex]?.lastScoredWeek &&
    weeks.value.length > 0
  ) {
    fetchingPlayers.value = true;
    const allPlayerIds = props.tableData
      .map((user) => [user.starters[currentWeek.value - 1]])
      .flat();
    let playerLookupMap = new Map<string, Player>();
    if (allPlayerIds.length > 0) {
      playerLookupMap = await getPlayersByIdsMap(allPlayerIds);
    }
    const result = props.tableData.map((user) => {
      const starterIds = user.starters[currentWeek.value - 1];
      const starterNames = starterIds
        ?.map((id: string) => playerLookupMap.get(id))
        .filter((player) => player !== undefined);
      return starterNames;
    });
    playerNames.value = result;

    const benchPlayerIds = props.tableData
      .map((user) => [user.benchPlayers[currentWeek.value - 1]])
      .flat();
    let benchPlayerLookupMap = new Map<string, Player>();
    if (benchPlayerIds.length > 0) {
      benchPlayerLookupMap = await getPlayersByIdsMap(benchPlayerIds);
    }
    const benchResult: Player[][] = props.tableData.map((user) => {
      const benchIds = user.benchPlayers[currentWeek.value - 1] ?? [];
      return benchIds
        .map((id: string) => benchPlayerLookupMap.get(id))
        .filter((player): player is Player => player !== undefined);
    });
    benchPlayerNames.value = benchResult;
    fetchingPlayers.value = false;
  }
};

const getPremiumReport = async () => {
  if (store.leagueIds.length > 0) {
    premiumWeeklyReport.value = null;
    const currentLeague = store.leagueInfo[store.currentLeagueIndex];
    let leagueMetadata: Record<string, string | number>;
    if (isPlayoffs.value) {
      const roundNames: { [key: number]: string } = {
        1: "Quarterfinal round",
        2: "Semifinal round",
        3: "Final Championship round",
        4: "Final Championship round",
      };
      leagueMetadata = {
        playoffRound:
          roundNames[currentWeek.value - currentLeague.regularSeasonLength],
      };
      if (currentWeek.value - currentLeague.regularSeasonLength > 2) {
        leagueMetadata["ChampionshipMatchup"] = 1;
      }
    } else {
      leagueMetadata = {
        leagueName: currentLeague.name,
        numberOfPlayoffTeams: currentLeague.playoffTeams,
        numberRegularSeasonWeeks: currentLeague.regularSeasonLength,
        currentWeek: currentWeek.value,
      };
    }
    premiumLoading.value = true;
    const response = await generatePremiumReport(
      premiumReportPrompt.value,
      leagueMetadata,
      premiumCommentaryStyle.value
    );
    if (!response.report) {
      toast.error(response.text ?? "Unable to generate premium report.");
      premiumLoading.value = false;
      return;
    }
    premiumLoading.value = false;
    premiumWeeklyReport.value = response.report;
    store.addPremiumWeeklyReport(
      getLeagueKey(currentLeague),
      premiumWeeklyReport.value
    );
    localStorage.setItem(
      "leagueInfo",
      JSON.stringify(store.leagueInfo as LeagueInfoType[])
    );
  }
};

const getReport = async () => {
  if (store.leagueIds.length > 0) {
    const currentLeague = store.leagueInfo[store.currentLeagueIndex];
    let leagueMetadata: Record<string, string | number>;
    if (isPlayoffs.value) {
      const roundNames: { [key: number]: string } = {
        1: "Quarterfinal round",
        2: "Semifinal round",
        3: "Final Championship round",
        4: "Final Championship round",
      };
      leagueMetadata = {
        playoffRound:
          roundNames[currentWeek.value - currentLeague.regularSeasonLength],
      };
      if (currentWeek.value - currentLeague.regularSeasonLength > 2) {
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
    store.addWeeklyReport(getLeagueKey(currentLeague), rawWeeklyReport.value);
    localStorage.setItem(
      "leagueInfo",
      JSON.stringify(store.leagueInfo as LeagueInfoType[])
    );
  }
};

onMounted(async () => {
  if (
    store.leagueInfo.length > 0 &&
    props.tableData[0].matchups &&
    weeks.value.length > 0 &&
    store.leagueInfo[store.currentLeagueIndex] &&
    !store.leagueInfo[store.currentLeagueIndex].weeklyReport &&
    store.leagueInfo[store.currentLeagueIndex].seasonType !== "Guillotine"
  ) {
    loading.value = true;
    await fetchPlayerNames();
    await getReport();
    loading.value = false;
  } else if (
    store.leagueInfo.length > 0 &&
    store.leagueInfo[store.currentLeagueIndex] &&
    store.leagueInfo[store.currentLeagueIndex].lastScoredWeek
  ) {
    loading.value = true;
    await fetchPlayerNames();
    const savedText = store.leagueInfo[store.currentLeagueIndex]?.weeklyReport
      ? (store.leagueInfo[store.currentLeagueIndex].weeklyReport ?? "")
      : "";
    rawWeeklyReport.value = savedText;
    const savedPremiumReport =
      store.leagueInfo[store.currentLeagueIndex].premiumWeeklyReport;
    premiumWeeklyReport.value = isPremiumReport(savedPremiumReport)
      ? savedPremiumReport
      : null;
    loading.value = false;
  }
});

const isPlayoffs = computed(() => {
  const currentLeague = store.leagueInfo[store.currentLeagueIndex];
  if (currentWeek.value > currentLeague?.regularSeasonLength) {
    return true;
  }
  return false;
});

const losersBracketIDs = computed(() => {
  return getBracketRosterIds(
    store.leagueInfo[store.currentLeagueIndex].losersBracket
  );
});

const winnersBracketIDs = computed(() => {
  return getBracketRosterIds(
    store.leagueInfo[store.currentLeagueIndex].winnersBracket
  );
});

const bestPerformers = computed(() => {
  if (
    playerNames.value.length > 0 &&
    store.leagueInfo[store.currentLeagueIndex]?.lastScoredWeek
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
    store.leagueInfo[store.currentLeagueIndex]?.lastScoredWeek
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
    store.leagueInfo[store.currentLeagueIndex]?.lastScoredWeek
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

const reportPrompt = computed(() => {
  return buildReportPrompt({
    tableData: props.tableData,
    playerNames: playerNames.value,
    benchPlayerNames: benchPlayerNames.value,
    weekIndex: currentWeek.value - 1,
    showUsernames: store.showUsernames,
    isPlayoffs: isPlayoffs.value,
    losersBracket:
      store.leagueInfo[store.currentLeagueIndex]?.losersBracket ?? [],
    winnersBracket:
      store.leagueInfo[store.currentLeagueIndex]?.winnersBracket ?? [],
    espnLosersBracket:
      store.leagueInfo[store.currentLeagueIndex]?.espnLosersBracket ?? [],
    espnWinnersBracket:
      store.leagueInfo[store.currentLeagueIndex]?.espnWinnersBracket ?? [],
    medianScoring: medianScoring.value,
  });
});

const premiumReportPrompt = computed(() => {
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
      store.leagueInfo[store.currentLeagueIndex]?.losersBracket ?? [],
    winnersBracket:
      store.leagueInfo[store.currentLeagueIndex]?.winnersBracket ?? [],
    espnLosersBracket:
      store.leagueInfo[store.currentLeagueIndex]?.espnLosersBracket ?? [],
    espnWinnersBracket:
      store.leagueInfo[store.currentLeagueIndex]?.espnWinnersBracket ?? [],
    rosterPositions:
      store.leagueInfo[store.currentLeagueIndex]?.rosterPositions ?? [],
    medianScoring: medianScoring.value,
  });
});

const numOfMatchups = computed(() => {
  return getMatchupNumbers(sortedTableData.value, currentWeek.value - 1);
});

const medianScoring = computed(() => {
  return Boolean(
    store.leagueInfo.length > 0 &&
    store.leagueInfo[store.currentLeagueIndex] &&
    store.leagueInfo[store.currentLeagueIndex].medianScoring === 1
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
      !store.leagueInfo[store.currentLeagueIndex].weeklyReport &&
      store.leagueInfo[store.currentLeagueIndex].seasonType !== "Guillotine" &&
      weeks.value.length > 0
    ) {
      rawWeeklyReport.value = "";
      loading.value = true;
      await fetchPlayerNames();
      await getReport();
      loading.value = false;
    } else if (
      store.leagueInfo[store.currentLeagueIndex].lastScoredWeek &&
      weeks.value.length > 0
    ) {
      await fetchPlayerNames();
    }
    rawWeeklyReport.value =
      store.leagueInfo[store.currentLeagueIndex].weeklyReport ?? "";
    const savedPremiumReport =
      store.leagueInfo[store.currentLeagueIndex].premiumWeeklyReport;
    premiumWeeklyReport.value = isPremiumReport(savedPremiumReport)
      ? savedPremiumReport
      : null;
  }
);

const copyReport = () => {
  navigator.clipboard.writeText(
    (tier.value === "Standard"
      ? rawWeeklyReport.value
      : premiumReportText.value) + "\n\nCreated with https://ffwrapped.com"
  );
  toast.success("Summary copied to clipboard!");
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
    tier.value === "Premium" && premiumReportText.value
      ? premiumReportText.value
      : rawWeeklyReport.value;
  if (!sourceText) {
    return "";
  }
  return sourceText;
});

const downloadReportImage = async () => {
  if (isGeneratingImage.value) {
    return;
  }
  if (!shareCardRef.value || exportTopTeams.value.length === 0) {
    toast.error("No weekly data available yet");
    return;
  }

  isGeneratingImage.value = true;
  try {
    await nextTick();
    const exportWidth = shareCardRef.value.scrollWidth;
    const exportHeight = shareCardRef.value.scrollHeight;
    const dataUrl = await toPng(shareCardRef.value, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: "#ffffff",
      width: exportWidth,
      height: exportHeight,
      canvasWidth: exportWidth * 2,
      canvasHeight: exportHeight * 2,
    });
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `ffwrapped-week-${currentWeek.value}.png`;
    link.click();
    toast.success("Weekly report image downloaded");
  } catch (error) {
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
watch(() => currentWeek.value, fetchPlayerNames);
</script>
<template>
  <Card class="h-full px-6 pt-4 my-4 custom-width">
    <Tabs default-value="Report" v-model="activeTab">
      <div class="flex justify-between w-full mb-3">
        <h5 class="mr-4 text-2xl font-bold sm:text-3xl">
          Weekly {{ activeTab }}
        </h5>
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
      <Separator class="h-px my-2" />
      <TabsContent value="Report">
        <WeeklyReportSummary
          v-if="
            currentWeek == weeks[0] &&
            (store.leagueInfo[store.currentLeagueIndex]?.lastScoredWeek ||
              store.leagueInfo.length == 0)
          "
          v-model:tier="tier"
          v-model:premium-commentary-style="premiumCommentaryStyle"
          :weeks-length="weeks.length"
          :current-week="currentWeek"
          :has-leagues="store.leagueIds.length !== 0"
          :has-last-scored-week="
            Boolean(store.leagueInfo[store.currentLeagueIndex]?.lastScoredWeek)
          "
          :raw-weekly-report="rawWeeklyReport"
          :premium-weekly-report="premiumWeeklyReport"
          :loading="loading"
          :premium-loading="premiumLoading"
          :is-generating-image="isGeneratingImage"
          @download-image="downloadReportImage"
          @copy-report="copyReport"
          @generate-premium="getPremiumReport"
        />
        <p
          v-else-if="
            currentWeek == 1 &&
            !store.leagueInfo[store.currentLeagueIndex]?.lastScoredWeek
          "
          class="mb-24"
        >
          Please come back after week 1!
        </p>
        <WeeklyMatchups
          :sorted-table-data="sortedTableData"
          :matchup-numbers="numOfMatchups"
          :current-week="currentWeek"
          :show-usernames="store.showUsernames"
          :median-scoring="medianScoring"
        />
        <Separator class="h-px mt-4 mb-2.5" />

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
          store.leagueInfo[store.currentLeagueIndex]?.seasonType !==
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
  </Card>
  <div class="fixed top-0 left-[-10000px] pointer-events-none">
    <div ref="shareCardRef">
      <WeeklyShareCard
        :league-name="store.leagueInfo[store.currentLeagueIndex]?.name"
        :week="currentWeek"
        :top-teams="exportTopTeams"
        :hot-players="exportHotPlayers"
        :cold-players="exportColdPlayers"
        :bench-players="exportBenchPlayers"
        :summary="exportSummary"
      />
    </div>
  </div>
</template>
