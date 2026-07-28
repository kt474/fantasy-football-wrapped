<script setup lang="ts">
import { mean } from "@/lib/collection";
import { ref, onMounted, computed, shallowRef, watch } from "vue";
import { getDraftProjections } from "../../api/sleeperApi";
import { DraftPick, PickObj } from "../../types/apiTypes.ts";
import { getLeagueKey, useStore } from "../../store/store";
import { standardDeviation } from "../../api/helper";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectItem,
  SelectValue,
} from "../ui/select";
import Separator from "../ui/separator/Separator.vue";
import Label from "../ui/label/Label.vue";
import {
  loadDemoDraftGrades,
  loadDemoLeague,
  type DemoLeagueFixtures,
} from "@/data/demo/loaders";
import { isSuperflexLeague } from "@/lib/lineup";
import { calculateExpectedAuctionValues } from "@/lib/auctionDraftGrades";
const store = useStore();

type DraftProjectionEntry = PickObj & {
  draftPick: DraftPick;
};
type DraftGradeSummary = {
  totalScore: number;
  picks: DraftProjectionEntry[];
  zScore: number;
  grade: string;
  mode?: "standard" | "auction";
};

const projectionData = ref<DraftGradeSummary[]>([]);
const demoUsers = shallowRef<DemoLeagueFixtures["fakeUsers"]>([]);
const props = defineProps<{
  draftData: DraftPick[];
  scoringType: string;
}>();

const isAuction = computed(
  () =>
    store.currentLeague?.draftMetadata?.draftType === "auction" ||
    props.draftData.some((pick) => Number(pick.amount ?? 0) > 0)
);
const gradeMode = computed(() =>
  isAuction.value ? ("auction" as const) : ("standard" as const)
);

const managers = computed(() => {
  const currentLeague = store.currentLeague;
  if (currentLeague) {
    const currentRosterIds = currentLeague.rosters.map((roster) => roster.id);
    return currentLeague.users
      .filter((user) => currentRosterIds.includes(user.id))
      .map((user) => ({
        name: store.showUsernames ? user.username : user.name,
        id: user.id,
      }));
  } else if (store.leagueInfo.length == 0) {
    return demoUsers.value.map((user) => ({ name: user.name, id: user.id }));
  }
  return [];
});

const currentManager = ref(managers.value[0]);

const loadDemoData = async () => {
  const [league, draftGrades] = await Promise.all([
    loadDemoLeague(),
    loadDemoDraftGrades(),
  ]);
  demoUsers.value = league.fakeUsers;
  projectionData.value =
    draftGrades.fakeDraftGrades as DraftGradeSummary[];
  currentManager.value = managers.value[0];
};

const getProjections = async () => {
  const currentLeague = store.currentLeague;
  const superflex = isSuperflexLeague(currentLeague.rosterPositions);
  const result: DraftProjectionEntry[] = await Promise.all(
    props.draftData.map(async (pick) => {
      const projections = await getDraftProjections(
        pick.playerId,
        currentLeague.season,
        currentLeague.scoringType,
        currentLeague.seasonType,
        superflex,
        props.scoringType === "idp"
      );
      const projectedPoints = projections["projectedPoints"] ?? 0;
      const adp =
        projections["adp"] ?? (isAuction.value ? 999 : pick["pickNumber"]);
      return {
        draftPick: pick,
        adp,
        projectedPoints,
        draftValue: isAuction.value
          ? 0
          : projectedPoints / 10 + (pick["pickNumber"] - adp),
      };
    })
  );

  if (isAuction.value) {
    const auctionValues = calculateExpectedAuctionValues(
      result.map((pick) => ({
        key: `${pick.draftPick.playerId}:${pick.draftPick.pickNumber}`,
        adp: pick.adp === 999 ? null : pick.adp,
        projectedPoints: pick.projectedPoints,
        bid: Number(pick.draftPick.amount ?? 0),
        draftOrder: pick.draftPick.pickNumber,
      }))
    );
    const surpluses = [...auctionValues.values()].map(
      (value) => value.surplus
    );
    const surplusMean = mean(surpluses);
    const surplusStd = standardDeviation(surpluses);

    result.forEach((pick) => {
      const value = auctionValues.get(
        `${pick.draftPick.playerId}:${pick.draftPick.pickNumber}`
      );
      const surplus = value?.surplus ?? 0;
      pick.expectedAuctionValue = value?.expectedValue ?? 0;
      pick.auctionSurplus = surplus;
      pick.auctionGrade = zScoreToGrade(
        surplusStd > 0 ? (surplus - surplusMean) / surplusStd : 0
      );
      pick.draftValue = surplus;
    });
  }

  const grouped = result.reduce<Record<number, DraftProjectionEntry[]>>(
    (acc, obj) => {
      const key = obj.draftPick.rosterId;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(obj);
      return acc;
    },
    {}
  );

  const totalDraftScores: DraftGradeSummary[] = [];
  Object.values(grouped).forEach((group) => {
    let sum = 0;
    const picks: DraftProjectionEntry[] = [];
    group.forEach((pick, index: number) => {
      if (isAuction.value || index < 13) {
        sum += pick.draftValue ?? 0;
      }
      picks.push(pick);
    });
    totalDraftScores.push({
      totalScore: sum,
      picks: picks,
      zScore: 0,
      grade: "F",
      mode: gradeMode.value,
    });
  });

  const meanScore = mean(totalDraftScores.map((user) => user.totalScore));
  const stdScore = standardDeviation(
    totalDraftScores.map((user) => user.totalScore)
  );

  totalDraftScores.forEach((user) => {
    user.zScore =
      stdScore > 0 ? (user.totalScore - meanScore) / stdScore : 0;
    user.grade = zScoreToGrade(user.zScore);
  });

  projectionData.value = totalDraftScores;
  store.addDraftGrades(getLeagueKey(currentLeague), projectionData.value);
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
  const currentLeague = store.currentLeague;
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

const formatDollarDelta = (value?: number) => {
  const amount = Number(value ?? 0);
  if (amount === 0) return "$0";
  return `${amount > 0 ? "+" : "-"}$${Math.abs(amount)}`;
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
  if (store.leagueInfo.length > 0 && store.currentLeague) {
    const cachedGrades = store.currentLeague.draftGrades as
      | DraftGradeSummary[]
      | undefined;
    if (!cachedGrades?.length || cachedGrades[0]?.mode !== gradeMode.value) {
      await getProjections();
    } else {
      projectionData.value = cachedGrades;
    }
  } else if (store.currentLeague) {
    projectionData.value = store.currentLeague.draftGrades ?? [];
  } else if (store.leagueInfo.length === 0) {
    await loadDemoData();
  }
});

watch(
  () => store.currentLeagueId,
  async () => {
    if (!store.currentLeague) {
      await loadDemoData();
      return;
    }
    if (store.currentLeague) {
      const cachedGrades = store.currentLeague.draftGrades as
        | DraftGradeSummary[]
        | undefined;
      if (!cachedGrades?.length || cachedGrades[0]?.mode !== gradeMode.value) {
        projectionData.value = [];
        await getProjections();
      } else {
        projectionData.value = cachedGrades;
      }
    }
    currentManager.value = managers.value[0];
  }
);
</script>
<template>
  <div class="">
    <Label for="manager" class="block mb-1 text-sm">Manager</Label>
    <Select id="manager" v-model="currentManager">
      <SelectTrigger id="manager" class="w-full sm:w-52">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem
          v-for="manager in managers"
          :key="manager.id"
          :value="manager"
        >
          {{ manager.name }}
        </SelectItem>
      </SelectContent>
    </Select>
    <Separator class="h-px mt-4 mb-2" />
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
                <p v-if="isAuction">
                  Paid:
                  <span class="font-semibold"
                    >${{ pick.draftPick.amount ?? 0 }}</span
                  >
                  Expected:
                  <span class="font-semibold"
                    >${{ pick.expectedAuctionValue ?? 0 }}</span
                  >
                </p>
                <p v-if="isAuction">
                  Value:
                  <span class="font-semibold">
                    {{ formatDollarDelta(pick.auctionSurplus) }}
                  </span>
                </p>
                <p v-else>
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
                isAuction
                  ? pick.auctionGrade
                  : pickToGrade(
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
      <p class="h-screen text-muted-foreground">Loading draft grades...</p>
    </div>
  </div>
</template>
