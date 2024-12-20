<script setup lang="ts">
import { TableDataType, LeagueInfoType } from "../../api/types";
import { getPlayerNames, generateSummary } from "../../api/api.ts";
import { ref, onMounted, watch, computed } from "vue";
import { useStore } from "../../store/store";

const store = useStore();
const props = defineProps<{
  tableData: TableDataType[];
  finalPlacements: any[];
}>();

const summary: any = ref("");
const rawSummary: any = ref("");
const playoffPromptData = ref([]);

const showSummary = computed(() => {
  if (store.leagueInfo.length > 0) {
    if (
      store.leagueInfo[store.currentLeagueIndex] &&
      store.leagueInfo[store.currentLeagueIndex].status === "complete"
    ) {
      return true;
    }
    return false;
  }
  return true;
});

onMounted(async () => {
  if (
    store.leagueInfo.length > 0 &&
    !store.leagueInfo[store.currentLeagueIndex].yearEndReport
  ) {
    await fetchPlayerNames();
    await getSummary();
  } else if (store.leagueInfo.length > 0) {
    const savedText: any =
      store.leagueInfo[store.currentLeagueIndex].yearEndReport;
    summary.value = savedText;
    rawSummary.value = savedText
      .replace(/<b>(.*?)<\/b>/g, "**$1**")
      .replace(/<br>/g, "\n");
  }
});

watch(
  () => store.currentLeagueId,
  async () => {
    if (!store.leagueInfo[store.currentLeagueIndex].yearEndReport) {
      summary.value = "";
      await fetchPlayerNames();
      await getSummary();
    }
    summary.value = store.leagueInfo[store.currentLeagueIndex].yearEndReport;
  }
);

const fetchPlayerNames = async () => {
  if (store.leagueIds.length > 0) {
    const currentLeague = store.leagueInfo[store.currentLeagueIndex];
    const result: any = await Promise.all(
      currentLeague.weeklyPoints.map(async (user: any) => {
        const starterNames = await getPlayerNames(user.starters.at(-1));
        return {
          playerNames: starterNames,
          rosterId: user.rosterId,
          points: user.points,
        };
      })
    );
    playoffPromptData.value = result;
  }
};

const getSummary = async () => {
  if (props.finalPlacements.length > 0) {
    const currentLeague = store.leagueInfo[store.currentLeagueIndex];
    const leagueMetadata = {
      leagueWinner: props.finalPlacements.find((val) => val.placement === 1)
        .name,
      lastPlace: props.finalPlacements.find(
        (val) => val.placement === currentLeague.totalRosters
      ).name,
      playoffTeams: currentLeague.playoffTeams,
      season: currentLeague.season,
    };
    const userData = props.tableData.map((user) => {
      return {
        name: user.name,
        wins: user.wins,
        losses: user.losses,
        totalPoints: user.pointsFor,
        regularSeasonRank: user.regularSeasonRank,
        finalRank: props.finalPlacements.find((val) => val.name === user.name)
          ? props.finalPlacements.find((val) => val.name === user.name)
              .placement
          : 0,
        playOffData: playoffPromptData.value.find(
          (val: any) => val.rosterId === user.rosterId
        ),
      };
    });
    const response = await generateSummary(userData, leagueMetadata);
    rawSummary.value = response.text;
    summary.value = response.text
      .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
      .replace(/\n/g, "<br>");
    store.addYearEndReport(currentLeague.leagueId, summary.value);
    localStorage.setItem(
      "leagueInfo",
      JSON.stringify(store.leagueInfo as LeagueInfoType[])
    );
  }
};
const copyReport = () => {
  navigator.clipboard.writeText(rawSummary.value);
  store.showCopyReport = true;
  setTimeout(() => {
    store.showCopyReport = false;
  }, 3000);
};
</script>
<template>
  <div
    v-if="showSummary"
    class="h-full px-6 pt-4 mt-4 bg-white border border-gray-200 rounded-lg shadow custom-width dark:bg-gray-800 dark:border-gray-700"
  >
    <div class="flex justify-between">
      <h5 class="text-2xl font-bold text-gray-900 sm:text-3xl dark:text-white">
        League Recap
      </h5>
      <svg
        @click="copyReport()"
        class="w-6 h-6 mt-2 text-gray-800 cursor-pointer dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        fill="none"
        viewBox="0 0 24 24"
      >
        <path
          stroke="currentColor"
          stroke-linejoin="round"
          stroke-width="2"
          d="M9 8v3a1 1 0 0 1-1 1H5m11 4h2a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1h-7a1 1 0 0 0-1 1v1m4 3v10a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-7.13a1 1 0 0 1 .24-.65L7.7 8.35A1 1 0 0 1 8.46 8H13a1 1 0 0 1 1 1Z"
        />
      </svg>
    </div>
    <hr class="h-px mt-3 mb-2 bg-gray-200 border-0 dark:bg-gray-700" />
    <div v-if="summary">
      <p
        v-html="summary"
        class="max-w-5xl my-3 text-gray-900 dark:text-gray-300"
      ></p>

      <p class="mb-4 text-xs text-gray-500 dark:text-gray-300">
        Generated using GPT-4o. Information provided may not always be accurate.
      </p>
    </div>
    <!-- Fake data for home page  -->
    <div
      v-else-if="store.leagueInfo.length == 0"
      class="max-w-5xl text-gray-900 dark:text-gray-300"
    >
      <p class="mb-3">
        <b>Finding Deebo</b> took the league by storm, riding Jalen Hurts and
        Kyren Williams to a championship like a cowboy on a rocket-powered
        steed. With 1646 points and a 9-5 record, they left the competition
        eating dust and their own tears. <b>Baby Back Gibbs</b> tried to keep
        up, but even Lamar Jackson couldn't sprint past the finish line fast
        enough, settling for a respectable second place.
      </p>
      <p class="mb-3">
        <b>Pollard Greens</b> and <b>Ja’Marr the Merrier</b> showed up to the
        playoffs like they were at a family reunion—happy to be there but not
        expecting much. Meanwhile, the <b>LaPorta Potty</b> seemed to take their
        name a bit too seriously, sleepwalking to a sixth-place finish.
        <b>The Princess McBride</b> dashed in and out of relevance, ending up
        fifth, while <b>Just the Tua Us</b> and <b>Loud and Stroud</b> played
        the role of lovable underdogs, ultimately barking up the wrong tree.
      </p>
      <p class="mb-4">
        <b>Dak to the Future</b> was as unpredictable as a cat on catnip,
        finishing in second to last. And then there's <b>Bijan Mustard</b>, who
        lived up to their name by stinking up the league basement. Joe Flacco as
        your QB? Bold strategy, Cotton. Let's see how that worked out... oh,
        right, last place. Better luck next year, folks!
      </p>
    </div>
    <div v-else>
      <div role="status" class="space-y-2.5 animate-pulse max-w-lg mb-6">
        <p class="mt-4 text-gray-900 dark:text-gray-300">Generating Recap...</p>
        <div class="flex items-center w-full">
          <div
            class="h-2.5 bg-gray-200 rounded-full dark:bg-gray-700 w-32"
          ></div>
          <div
            class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-24"
          ></div>
          <div
            class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-full"
          ></div>
        </div>
        <div class="flex items-center w-full max-w-[480px]">
          <div
            class="h-2.5 bg-gray-200 rounded-full dark:bg-gray-700 w-full"
          ></div>
          <div
            class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-full"
          ></div>
          <div
            class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-24"
          ></div>
        </div>
        <div class="flex items-center w-full max-w-[400px]">
          <div
            class="h-2.5 bg-gray-300 rounded-full dark:bg-gray-600 w-full"
          ></div>
          <div
            class="h-2.5 ms-2 bg-gray-200 rounded-full dark:bg-gray-700 w-80"
          ></div>
          <div
            class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-full"
          ></div>
        </div>
        <div class="flex items-center w-full max-w-[480px]">
          <div
            class="h-2.5 ms-2 bg-gray-200 rounded-full dark:bg-gray-700 w-full"
          ></div>
          <div
            class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-full"
          ></div>
          <div
            class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-24"
          ></div>
        </div>
        <div class="flex items-center w-full max-w-[440px]">
          <div
            class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-32"
          ></div>
          <div
            class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-24"
          ></div>
          <div
            class="h-2.5 ms-2 bg-gray-200 rounded-full dark:bg-gray-700 w-full"
          ></div>
        </div>
        <div class="flex items-center w-full max-w-[360px]">
          <div
            class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-full"
          ></div>
          <div
            class="h-2.5 ms-2 bg-gray-200 rounded-full dark:bg-gray-700 w-80"
          ></div>
          <div
            class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-full"
          ></div>
        </div>
        <span class="sr-only">Loading...</span>
      </div>
    </div>
  </div>
</template>
