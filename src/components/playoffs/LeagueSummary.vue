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
const playoffPromptData = ref([]);

const showSummary = computed(() => {
  if (store.leagueInfo.length > 0) {
    if (store.leagueInfo[store.currentLeagueIndex].status === "complete") {
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
    summary.value = store.leagueInfo[store.currentLeagueIndex].yearEndReport;
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
      currentLeague.playoffPoints.map(async (user: any) => {
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
          .placement,
        playOffData: playoffPromptData.value.find(
          (val: any) => val.rosterId === user.rosterId
        ),
      };
    });
    const response = await generateSummary(userData, leagueMetadata);
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
</script>
<template>
  <div
    v-if="showSummary"
    class="h-full px-6 pt-4 mt-4 bg-white border border-gray-200 rounded-lg shadow custom-width dark:bg-gray-800 dark:border-gray-700"
  >
    <h5 class="text-2xl font-bold text-gray-900 sm:text-3xl dark:text-white">
      League Recap
    </h5>
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
        Well, well, well, the fantasy football gods have spoken, and
        <b>Finding Deebo</b> is wearing the crown, leaving the rest of you
        peasants to ponder your poor life choices. With Josh Allen and Christian
        McCaffrey leading the charge, it was like watching a cheat code in
        action.
      </p>
      <p class="mb-3">
        Meanwhile, <b>Bijan Mustard</b> lived up to their name, stinking it up
        with Joe Flacco at the helm. Seriously, Joe Flacco?
        <b>Baby Back Gibbs</b>
        tried to keep pace with Patrick Mahomes and Tyreek Hill, but their
        playoff performance was like a bad sequel—some hype, no delivery.
      </p>
      <p class="mb-3">
        Speaking of underwhelming, <b>The Princess McBride</b> must've been
        asleep at the wheel, with Tua and company barely making a peep.
        <b>Ja’Marr the Merrier</b>
        and <b>Pollard Greens</b> put up respectable fights, but it was
        <b>LaPorta Potty</b>
        who quietly snuck past the pack, proving that sometimes it's better to
        fly under the radar than crash and burn like
        <b>Dak to the Future</b> and their playoffs disaster.
      </p>
      <p class="mb-4">
        And let's not forget <b>Just the Tua Us</b> and <b>Loud and Stroud</b>,
        who both managed to be just mediocre enough to not embarrass themselves
        completely. Better luck next year, folks—maybe leave the Flacco jerseys
        at home.
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
