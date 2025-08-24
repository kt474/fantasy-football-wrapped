<script setup lang="ts">
import { mean } from "lodash";
import { ref, onMounted, computed, watch } from "vue";
import { getDraftProjections } from "../../api/api";
import { LeagueInfoType } from "../../api/types.ts";
import { useStore } from "../../store/store";
import { standardDeviation, fakeUsers } from "../../api/helper";
import { fakeDraftGrades } from "../../api/draft.ts";
const store = useStore();

const projectionData: any = ref([]);
const props = defineProps<{
  draftData: any[];
}>();

const managers = computed(() => {
  const currentLeague = store.leagueInfo[store.currentLeagueIndex];
  if (currentLeague) {
    const currentRosterIds = currentLeague.rosters.map((roster) => roster.id);
    return currentLeague.users
      .filter((user) => currentRosterIds.includes(user.id))
      .map((user) => ({
        name: store.showUsernames ? user.username : user.name,
        id: user.id,
      }));
  } else if (store.leagueInfo.length == 0) {
    return fakeUsers.map((user) => ({ name: user.name, id: user.id }));
  }
  return [];
});

const currentManager = ref(managers.value[0]);

const getProjections = async () => {
  const currentLeague = store.leagueInfo[store.currentLeagueIndex];
  const qbs = currentLeague.rosterPositions.reduce(
    (sum, item) => sum + (item === "QB" || item === "SUPER_FLEX" ? 1 : 0),
    0
  );
  const result = await Promise.all(
    props.draftData.map(async (pick) => {
      const projections = await getDraftProjections(
        pick.playerId,
        currentLeague.season,
        currentLeague.scoringType,
        currentLeague.seasonType,
        true ? qbs >= 2 : false
      );
      return {
        draftPick: pick,
        adp: projections["adp"],
        projectedPoints: projections["projectedPoints"],
        draftValue:
          projections["projectedPoints"] / 10 +
          (pick["pickNumber"] - projections["adp"]),
      };
    })
  );

  const grouped = result.reduce((acc: any, obj: any) => {
    const key = obj.draftPick.rosterId;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(obj);
    return acc;
  }, {});

  let totalDraftScores: any[] = [];
  Object.values(grouped).forEach((group: any) => {
    let sum = 0;
    let picks: any[] = [];
    group.forEach((pick: any, index: number) => {
      if (index < 13) {
        sum += pick["draftValue"] ? pick["draftValue"] : 0;
      }
      picks.push(pick);
    });
    totalDraftScores.push({ totalScore: sum, picks: picks });
  });

  const meanScore = mean(totalDraftScores.map((user) => user.totalScore));
  const stdScore = standardDeviation(
    totalDraftScores.map((user) => user.totalScore)
  );

  totalDraftScores.forEach((user) => {
    user.zScore = (user.totalScore - meanScore) / stdScore;
    user.grade = zScoreToGrade((user.totalScore - meanScore) / stdScore);
  });

  projectionData.value = totalDraftScores;
  store.addDraftGrades(currentLeague.leagueId, projectionData.value);
  localStorage.setItem(
    "leagueInfo",
    JSON.stringify(store.leagueInfo as LeagueInfoType[])
  );
};

const zScoreToGrade = (z: number) => {
  if (z >= 1.4) return "A+";
  if (z >= 1) return "A";
  if (z >= 0.75) return "A-";
  if (z >= 0.5) return "B+";
  if (z >= 0.25) return "B";
  if (z >= 0) return "B-";
  if (z >= -0.6) return "C+";
  if (z >= -1) return "C";
  if (z >= -1.2) return "C-";
  if (z >= -1.4) return "D+";
  if (z >= -1.8) return "D";
  if (z >= -2) return "D-";
  return "F";
};

const pickToGrade = (pickNumber: number, adp: number, round: number) => {
  const currentLeague = store.leagueInfo[store.currentLeagueIndex];
  // Sleeper API does not return dynasty ADPs for returning leagues
  if (
    currentLeague &&
    currentLeague.previousLeagueId &&
    currentLeague.seasonType === "Dynasty"
  ) {
    return "";
  }
  if (round <= 2) {
    const diff = pickNumber - adp;
    if (diff <= -18) return "F";
    if (diff <= -16) return "D-";
    if (diff <= -14) return "D";
    if (diff <= -12) return "D+";
    if (diff <= -10) return "C-";
    if (diff <= -8) return "C";
    if (diff <= -6) return "C+";
    if (diff <= -4) return "B-";
    if (diff <= 4) return "B";
    if (diff === 6) return "B+";
    if (diff === 8) return "A-";
    if (diff === 10) return "A";
    return "A+";
  } else {
    const percentDiff = ((pickNumber - adp) / adp) * 100;
    if (percentDiff <= -25) return "F";
    if (percentDiff <= -20) return "D-";
    if (percentDiff <= -15) return "D";
    if (percentDiff <= -10) return "D+";
    if (percentDiff <= -7) return "C-";
    if (percentDiff <= -1) return "C";
    if (percentDiff <= 0) return "C+";
    if (percentDiff < 1) return "B-";
    if (percentDiff < 3) return "B";
    if (percentDiff < 7) return "B+";
    if (percentDiff < 9) return "A-";
    if (percentDiff < 12) return "A";
    return "A+";
  }
};

const getBgColor = (position: string) => {
  if (position === "RB") {
    return "bg-sky-300 dark:bg-sky-800";
  } else if (position === "WR") {
    return "bg-green-300 dark:bg-green-800";
  } else if (position === "QB") {
    return "bg-fuchsia-300 dark:bg-fuchsia-800";
  } else if (position === "TE") {
    return "bg-red-300 dark:bg-red-800";
  } else if (position === "K") {
    return "bg-amber-300 dark:bg-amber-800";
  } else if (position === "DEF") {
    return "bg-rose-300 dark:bg-rose-800";
  } else {
    return "bg-neutral-300 dark:bg-neutral-700";
  }
};

onMounted(async () => {
  if (
    store.leagueInfo.length > 0 &&
    store.leagueInfo[store.currentLeagueIndex] &&
    !store.leagueInfo[store.currentLeagueIndex].draftGrades
  ) {
    await getProjections();
  } else if (store.leagueInfo[store.currentLeagueIndex]) {
    projectionData.value =
      store.leagueInfo[store.currentLeagueIndex].draftGrades;
  } else if (store.leagueInfo.length === 0) {
    projectionData.value = fakeDraftGrades;
  }
});

watch(
  () => store.currentLeagueId,
  async () => {
    if (
      store.leagueInfo[store.currentLeagueIndex] &&
      !store.leagueInfo[store.currentLeagueIndex].draftGrades
    ) {
      projectionData.value = [];
      await getProjections();
    }
    currentManager.value = managers.value[0];
    projectionData.value =
      store.leagueInfo[store.currentLeagueIndex].draftGrades;
  }
);
</script>
<template>
  <div class="text-gray-900 dark:text-gray-200">
    <label
      for="Manager name"
      class="block mb-1 text-sm text-gray-600 dark:text-gray-300"
      >Manager</label
    >
    <select
      aria-label="current week"
      id="Manager name"
      class="block p-2 text-sm text-gray-600 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-gray-300 dark:focus:ring-blue-500 dark:focus:border-blue-500"
      v-model="currentManager"
    >
      <option v-for="manager in managers" :key="manager.id" :value="manager">
        {{ manager.name }}
      </option>
    </select>
    <hr class="h-px mt-4 mb-2 bg-gray-200 border-0 dark:bg-gray-700" />
    <div
      v-if="projectionData.length > 0"
      v-for="user in projectionData"
      class="my-2"
    >
      <div v-if="user.picks[0].draftPick.userId === currentManager.id">
        <p class="mb-2 text-xl font-medium">
          Team Grade:
          {{ user.grade }}
        </p>
        <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="pick in user.picks"
            class="flex justify-between p-3 mb-1 align-middle rounded"
            :class="getBgColor(pick.draftPick.position)"
          >
            <div class="flex">
              <img
                v-if="pick.draftPick.position !== 'DEF'"
                alt="Player image"
                class="w-14 sm:h-auto object-cover mr-2.5"
                :src="`https://sleepercdn.com/content/nfl/players/thumb/${pick.draftPick.playerId}.jpg`"
              />
              <img
                v-else
                alt="Defense image"
                class="object-cover w-14 mr-2.5 sm:h-auto"
                :src="`https://sleepercdn.com/images/team_logos/nfl/${pick.draftPick.playerId.toLowerCase()}.png`"
              />
              <div>
                <p class="font-semibold">
                  {{ pick.draftPick.firstName }} {{ pick.draftPick.lastName }}
                </p>
                <p>{{ pick.draftPick.position }} - {{ pick.draftPick.team }}</p>
                <p>
                  Pick:
                  <span class="font-semibold">{{
                    pick.draftPick.pickNumber
                  }}</span>
                  ADP: <span class="font-semibold">{{ pick.adp }}</span>
                </p>
              </div>
            </div>
            <p class="w-6 mt-5 mr-1 text-lg font-medium">
              {{
                pickToGrade(
                  pick.draftPick.pickNumber,
                  pick.adp,
                  pick.draftPick.round
                )
              }}
            </p>
          </div>
        </div>
      </div>
    </div>
    <div v-else>
      <p class="text-gray-600 dark:text-gray-300">Loading draft grades...</p>
    </div>
  </div>
</template>
