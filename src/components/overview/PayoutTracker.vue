<script setup lang="ts">
import { computed } from "vue";
import { useStore } from "../../store/store";
import { useAwardsStore } from "../../store/awards";
import { useWeeklyBonusStore } from "../../store/weeklyBonuses";
import { LeagueInfoType, TableDataType, WeeklyBonus } from "../../types/types";

const props = defineProps<{
  league?: LeagueInfoType;
  tableData?: TableDataType[];
}>();

const store = useStore();
const awardsStore = useAwardsStore();
const weeklyBonusStore = useWeeklyBonusStore();

if (!awardsStore.initialized) {
  awardsStore.hydrateFromApi();
}
if (!weeklyBonusStore.initialized) {
  weeklyBonusStore.hydrateFromApi();
}

const seasonYear = computed(() => props.league?.season || "");
const showTracker = computed(() => Boolean(seasonYear.value));

const payoutPlan = [
  { label: "1st Place (Champion)", amount: 1000, detail: "Playoff winner" },
  { label: "2nd Place (Runner-Up)", amount: 680, detail: "Title game runner-up" },
  {
    label: "Most Points (Regular Season)",
    amount: 360,
    detail: "Highest total points in the regular season",
  },
  {
    label: "Weekly + Seasonal Bonuses & Honors",
    amount: 360,
    detail: "Weekly high-score bonuses plus five season-long league honors",
  },
];

const fallbackManagers = [
  "Poop Warriors",
  "Danz in the House",
  "Benchwarmers (G.T.D.I.M.)",
  "Mr. Rodger's is Dead",
  "Harrieses Acting Coach",
  "Heavy D Up in the Limousine",
  "Sanduskysticklemonsters",
  "HurtSoGood",
  "Won't Ya Be My Nahbers",
  "Sunday Afternoon Raw",
  "Willi's Wonderful Team",
  "Blairy David",
];

const formatCurrency = (value: number) =>
  value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });

const formatTeamName = (user: any) => {
  if (!user) return "Pending";
  if (store.showUsernames) {
    return user.username || user.name || "Pending";
  }
  return user.name || user.username || "Pending";
};

const leagueInfo = computed(() => store.leagueInfo[store.currentLeagueIndex]);

const awardFallbackTitles: Record<string, string> = {
  "award-i": "Award I",
  "award-ii": "Award II",
  "award-iii": "Award III",
  "award-iv": "Award IV",
  "award-v": "Award V",
};

const awardFallbackLabels: Record<string, string> = {
  "award-i": "Acting Coach",
  "award-ii": "In the House",
  "award-iii": "Nahbers",
  "award-iv": "Sticklemonsters",
  "award-v": "Wonderful Team",
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const formatDefinition = (value?: string) => {
  if (!value) return "";
  const escaped = escapeHtml(value);
  return escaped.replace(/\*(.*?)\*/g, "<em>$1</em>");
};

const formatPointsTotal = (value?: number | null) => {
  if (value === null || value === undefined) return "";
  return `${value.toFixed(2)} pts`;
};

const managerNames = computed(() => {
  if (props.league?.users?.length) {
    const names = props.league.users
      .map((user: any) => formatTeamName(user))
      .filter(Boolean);
    return Array.from(new Set(names));
  }
  return fallbackManagers;
});

const weeksPlayed = computed(() => {
  if (!props.tableData || props.tableData.length === 0) return 0;
  return Math.max(
    ...props.tableData.map((team) => (team.points ? team.points.length : 0))
  );
});

const scoredWeeks = computed(() => {
  const lastScored = leagueInfo.value?.lastScoredWeek || 0;
  if (lastScored > 0) return Math.min(lastScored, weeksPlayed.value);
  return weeksPlayed.value;
});

const regularSeasonComplete = computed(() => {
  const totalRegularWeeks = props.league?.regularSeasonLength || 0;
  if (!totalRegularWeeks) return false;
  return scoredWeeks.value >= totalRegularWeeks;
});

const findUserByRosterId = (rosterId?: number) => {
  if (!rosterId || !props.league?.users || !props.league?.rosters) return null;
  const roster = props.league.rosters.find((r: any) => r.rosterId === rosterId);
  if (!roster) return null;
  return props.league.users.find((user: any) => user.id === roster.id);
};

const findUserByUserId = (userId?: string | null) => {
  if (!userId || !props.league?.users) return null;
  return props.league.users.find((user: any) => user.id === userId);
};

const resolveNameByRosterId = (rosterId?: number) => {
  const user = findUserByRosterId(rosterId);
  if (user) return formatTeamName(user);
  return rosterId ? `Roster #${rosterId}` : "Pending";
};

const regularWeeklyBonusWinners = computed(() => {
  // cap at 14 regular-season weeks; playoff bonuses handled separately
  const regularSeasonWeeks = 14;
  const limit = regularSeasonWeeks;
  const winners: { week: number; winner: string; amount: number; score: number | null }[] = [];
  for (let i = 0; i < limit; i++) {
    let bestTeam: TableDataType | undefined;
    let bestScore = -Infinity;
    if (i < scoredWeeks.value) {
      props.tableData?.forEach((team) => {
        const score = team.points?.[i];
        if (score !== undefined && score !== null && score > bestScore) {
          bestScore = score;
          bestTeam = team;
        }
      });
    }
    const hasScore = bestTeam && isFinite(bestScore);
    const winner = hasScore ? formatTeamName(bestTeam) : "Pending";
    winners.push({
      week: i + 1,
      winner,
      amount: 15,
      score: hasScore ? Number(bestScore.toFixed(2)) : null,
    });
  }
  return winners;
});

const playoffWeeklyBonuses = computed(() => {
  const manual = weeklyBonusStore.bonuses || [];
  const resolved = manual.map((bonus: WeeklyBonus) => {
    let winnerLabel = "Pending";
    if (bonus.winnerOwnerId) {
      const user = findUserByUserId(bonus.winnerOwnerId);
      if (user) winnerLabel = formatTeamName(user);
    }
    if (bonus.winnerNameOverride) {
      winnerLabel = bonus.winnerNameOverride;
    }
    return {
      week: bonus.week,
      winner: winnerLabel,
      amount: bonus.amount ?? 15,
      score:
        bonus.score === null || bonus.score === undefined
          ? null
          : Number(bonus.score),
      label: bonus.label,
      note: bonus.note,
    };
  });
  return resolved.sort((a, b) => a.week - b.week);
});

const weeklyBonusWinners = computed(() => [
  ...regularWeeklyBonusWinners.value,
  ...playoffWeeklyBonuses.value,
]);

const totalWeeklyBonuses = computed(() => weeklyBonusWinners.value.length);
const weeklyPoolTotal = computed(
  () => weeklyBonusWinners.value.reduce((sum, bonus) => sum + (bonus.amount || 0), 0) || 0
);

const normalizeAwardTitle = (award: any) =>
  (award.title && award.title.trim()) ||
  awardFallbackTitles[award.id] ||
  "Seasonal award";

const normalizeAwardInformal = (award: any) =>
  (award.informalLabel && award.informalLabel.trim()) ||
  awardFallbackLabels[award.id] ||
  "";

const resolveCustomWinner = (award: any) => {
  if (award.winnerOwnerId) {
    const user = findUserByUserId(award.winnerOwnerId);
    if (user) return formatTeamName(user);
  }
  if (award.winnerNameOverride) return award.winnerNameOverride;
  return "Pending";
};

const coreSeasonalAwards = computed(() => {
  const championshipMatch = props.league?.winnersBracket?.find(
    (matchup: any) => matchup.p === 1
  );
  const championName = championshipMatch
    ? resolveNameByRosterId(championshipMatch.w)
    : "Pending";
  const runnerUpName = championshipMatch
    ? resolveNameByRosterId(championshipMatch.l)
    : "Pending";
  const mostPointsTeam = props.tableData?.length
    ? [...props.tableData].sort((a, b) => (b.pointsFor || 0) - (a.pointsFor || 0))[0]
    : undefined;
  const mostPointsTotal = mostPointsTeam?.pointsFor;
  const mostPointsPendingLabel = mostPointsTeam
    ? `Pending (current leader: ${formatTeamName(mostPointsTeam)})`
    : "Pending";
  const mostPointsFinalized = regularSeasonComplete.value && Boolean(mostPointsTeam);
  const mostPointsName = mostPointsFinalized && mostPointsTeam
    ? formatTeamName(mostPointsTeam)
    : mostPointsPendingLabel;

  return [
    { id: "champion", title: "Champion", informalLabel: "", winner: championName, amount: 1000, pending: championName === "Pending", definition: "" },
    { id: "runner-up", title: "Runner-Up", informalLabel: "", winner: runnerUpName, amount: 680, pending: runnerUpName === "Pending", definition: "" },
    {
      id: "most-points",
      title: "Most Points (Regular Season)",
      informalLabel: "",
      winner: mostPointsName,
      amount: 360,
      pending: !mostPointsFinalized,
      pointsTotal:
        mostPointsFinalized && typeof mostPointsTotal === "number"
          ? Number(mostPointsTotal.toFixed(2))
          : null,
      definition: "",
    },
  ];
});

const customSeasonalAwards = computed(() =>
  awardsStore.awards.map((award) => {
    const winner = resolveCustomWinner(award);
    return {
      id: award.id,
      title: normalizeAwardTitle(award),
      informalLabel: normalizeAwardInformal(award),
      definition: award.definition,
      winner,
      amount: award.amount,
      pending: winner === "Pending",
      pointsTotal: null,
    };
  })
);

const seasonalAwards = computed(() => [
  ...coreSeasonalAwards.value,
  ...customSeasonalAwards.value,
]);

const totalPot = computed(
  () => payoutPlan.reduce((sum, item) => sum + item.amount, 0) || 0
);

const projectedPot = computed(() => {
  const entrants = props.league?.totalRosters || 12;
  return entrants * 200;
});

const awardedTotal = computed(() => {
  const weekly = weeklyBonusWinners.value
    .filter((bonus) => bonus.winner !== "Pending")
    .reduce((sum, bonus) => sum + bonus.amount, 0);
  const seasonal = seasonalAwards.value
    .filter((award) => !award.pending)
    .reduce((sum, award) => sum + award.amount, 0);
  return weekly + seasonal;
});

const remainingTotal = computed(() =>
  Math.max(totalPot.value - awardedTotal.value, 0)
);

const completedWeeklyAwards = computed(
  () => weeklyBonusWinners.value.filter((bonus) => bonus.winner !== "Pending").length
);

const completedSeasonalAwards = computed(
  () => seasonalAwards.value.filter((award) => !award.pending).length
);

type ManagerTotalsEntry = {
  name: string;
  weeklyBonuses: number;
  seasonalAwards: string[];
  total: number;
  bonusWeeks: number[];
};

const managerTotals = computed(() => {
  const totals = new Map<string, ManagerTotalsEntry>();

  managerNames.value.forEach((name) => {
    totals.set(name, {
      name,
      weeklyBonuses: 0,
      seasonalAwards: [],
      total: 0,
      bonusWeeks: [],
    });
  });

  weeklyBonusWinners.value.forEach((bonus) => {
    if (bonus.winner === "Pending") return;
    const entry: ManagerTotalsEntry =
      totals.get(bonus.winner) ||
      {
        name: bonus.winner,
        weeklyBonuses: 0,
        seasonalAwards: [] as string[],
        total: 0,
        bonusWeeks: [] as number[],
      };
    entry.weeklyBonuses += 1;
    entry.bonusWeeks = Array.isArray(entry.bonusWeeks) ? entry.bonusWeeks : [];
    entry.bonusWeeks.push(bonus.week);
    entry.total += bonus.amount;
    totals.set(bonus.winner, entry);
  });

  seasonalAwards.value.forEach((award) => {
    if (award.pending) return;
    const entry: ManagerTotalsEntry =
      totals.get(award.winner) ||
      {
        name: award.winner,
        weeklyBonuses: 0,
        seasonalAwards: [] as string[],
        total: 0,
        bonusWeeks: [] as number[],
      };
    const label = award.informalLabel
      ? `${award.title} (${award.informalLabel})`
      : award.title;
    entry.seasonalAwards.push(label);
    entry.total += award.amount;
    totals.set(award.winner, entry);
  });

  return Array.from(totals.values()).sort(
    (a, b) => b.total - a.total || a.name.localeCompare(b.name)
  );
});
</script>

<template>
  <div
    v-if="showTracker"
    class="mt-6 overflow-hidden border border-gray-200 rounded-2xl shadow-sm dark:border-gray-700"
  >
    <div
      class="px-4 py-5 bg-gradient-to-r from-slate-900 via-gray-900 to-slate-800 text-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900"
    >
      <div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <p class="text-xs font-semibold tracking-wide uppercase text-gray-300">
            League Payouts
          </p>
          <p class="text-2xl font-bold">
            {{ seasonYear ? `${seasonYear} Payout Tracker` : "Payout Tracker" }}
          </p>
          <p class="text-sm text-gray-300">
            Season-aware tracker with open slots marked as pending until results
            are recorded.
          </p>
        </div>
        <div class="text-right">
          <p class="text-sm font-semibold text-gray-200">
            Total pot (payout plan)
          </p>
          <p class="text-2xl font-bold">
            {{ formatCurrency(totalPot) }}
          </p>
          <p class="text-xs text-gray-300">
            Projected from buy-ins: {{ formatCurrency(projectedPot) }}
          </p>
        </div>
      </div>
    </div>

    <div class="p-4 space-y-4 bg-white dark:bg-gray-900">
      <div class="grid gap-4 lg:grid-cols-3">
        <div
          class="p-4 border border-gray-200 rounded-xl shadow-sm bg-gray-50 dark:bg-gray-800 dark:border-gray-700"
        >
          <p class="text-xs font-semibold tracking-wide text-gray-500 uppercase">
            Pool basics
          </p>
          <div class="mt-3 space-y-2 text-sm text-gray-800 dark:text-gray-50">
            <div class="flex items-center justify-between">
              <span>Number of players</span>
              <span class="font-semibold">
                {{ league?.totalRosters || 12 }}
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span>Buy-in</span>
              <span class="font-semibold">{{ formatCurrency(200) }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span>Weekly bonus per win</span>
              <span class="font-semibold">{{ formatCurrency(15) }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span>Seasonal league honors bucket</span>
              <span class="font-semibold">{{ formatCurrency(105) }}</span>
            </div>
          </div>
        </div>

        <div
          class="p-4 border border-gray-200 rounded-xl shadow-sm bg-gray-50 dark:bg-gray-800 dark:border-gray-700"
        >
          <p class="text-xs font-semibold tracking-wide text-gray-500 uppercase">
            Allocation
          </p>
          <dl class="mt-3 space-y-3">
            <div
              v-for="item in payoutPlan"
              :key="item.label"
              class="flex items-start justify-between gap-4"
            >
              <div>
                <dt class="text-sm font-semibold text-gray-800 dark:text-gray-50">
                  {{ item.label }}
                </dt>
                <dd class="text-xs text-gray-500 dark:text-gray-300">
                  {{ item.detail }}
                </dd>
              </div>
              <span class="text-sm font-semibold text-blue-700 dark:text-blue-300">
                {{ formatCurrency(item.amount) }}
              </span>
            </div>
          </dl>
        </div>

        <div
          class="p-4 border border-gray-200 rounded-xl shadow-sm bg-gray-50 dark:bg-gray-800 dark:border-gray-700"
        >
          <p class="text-xs font-semibold tracking-wide text-gray-500 uppercase">
            Season progress
          </p>
          <div class="grid grid-cols-2 gap-3 mt-3 text-sm">
            <div class="p-3 border border-gray-200 rounded-lg dark:border-gray-700">
              <p class="text-xs text-gray-500 dark:text-gray-300">Awarded to date</p>
              <p class="text-lg font-bold text-gray-900 dark:text-gray-50">
                {{ formatCurrency(awardedTotal) }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                Weekly bonuses: {{ completedWeeklyAwards }}/17
              </p>
            </div>
            <div class="p-3 border border-gray-200 rounded-lg dark:border-gray-700">
              <p class="text-xs text-gray-500 dark:text-gray-300">Still pending</p>
              <p class="text-lg font-bold text-gray-900 dark:text-gray-50">
                {{ formatCurrency(remainingTotal) }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                Seasonal awards: {{ completedSeasonalAwards }}/{{ seasonalAwards.length }}
              </p>
            </div>
          </div>
          <div class="flex items-center justify-between mt-4 text-xs text-gray-500 dark:text-gray-300">
            <span>Weekly pool ({{ totalWeeklyBonuses }} x $15)</span>
            <span class="font-semibold text-gray-800 dark:text-gray-50">
              {{ formatCurrency(weeklyPoolTotal) }}
            </span>
          </div>
        </div>
      </div>

      <div class="grid gap-4 xl:grid-cols-[3fr_2fr]">
        <div
          class="overflow-hidden border border-gray-200 rounded-xl shadow-sm dark:border-gray-700 bg-white dark:bg-gray-800"
        >
          <div
            class="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
          >
            <div>
              <p class="text-sm font-semibold text-gray-900 dark:text-gray-50">
                Weekly bonus winners
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-300">
                Highest score each week - $15 per win
              </p>
            </div>
            <span class="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full dark:bg-blue-900 dark:text-blue-100">
              {{ completedWeeklyAwards }} / {{ totalWeeklyBonuses }} awarded
            </span>
          </div>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead class="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th
                    scope="col"
                    class="px-4 py-2 text-xs font-semibold tracking-wide text-left text-gray-600 uppercase dark:text-gray-200"
                  >
                    Week
                  </th>
                  <th
                    scope="col"
                    class="px-4 py-2 text-xs font-semibold tracking-wide text-left text-gray-600 uppercase dark:text-gray-200"
                  >
                    Winner
                  </th>
                  <th
                    scope="col"
                    class="px-4 py-2 text-xs font-semibold tracking-wide text-right text-gray-600 uppercase dark:text-gray-200"
                  >
                    Points
                  </th>
                  <th
                    scope="col"
                    class="px-4 py-2 text-xs font-semibold tracking-wide text-right text-gray-600 uppercase dark:text-gray-200"
                  >
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
                <tr
                  v-for="bonus in regularWeeklyBonusWinners"
                  :key="`regular-${bonus.week}`"
                  class="hover:bg-gray-50 dark:hover:bg-gray-900"
                >
                  <td class="px-4 py-2 text-sm font-semibold text-gray-800 dark:text-gray-50">
                    {{ bonus.week.toString().padStart(2, "0") }}
                  </td>
                  <td class="px-4 py-2 text-sm text-gray-700 dark:text-gray-100">
                    <span
                      :class="[
                        bonus.winner === 'Pending'
                          ? 'text-amber-600 dark:text-amber-300'
                          : 'text-gray-800 dark:text-gray-50 font-semibold',
                      ]"
                    >
                      {{ bonus.winner }}
                    </span>
                  </td>
                  <td class="px-4 py-2 text-sm text-right text-gray-800 dark:text-gray-50">
                    {{ bonus.score !== null ? bonus.score.toFixed(2) : "-" }}
                  </td>
                  <td class="px-4 py-2 text-sm text-right text-gray-800 dark:text-gray-50">
                    {{ formatCurrency(bonus.amount) }}
                  </td>
                </tr>

                <tr class="bg-gray-100 dark:bg-gray-900/70">
                  <td colspan="4" class="px-4 py-3 text-xs font-semibold tracking-wide text-gray-700 uppercase dark:text-gray-200">
                    Playoffs (Weeks 15–17) <span class="playoff-bonuses-note text-xs text-gray-500 dark:text-gray-300" style="text-transform:none; display: block;">Playoff teams, active or disqualified, are ineligible for Week 15 - 17 "Weekly High Score" bonuses</span>
                  </td>
                </tr>

                <tr
                  v-for="bonus in playoffWeeklyBonuses"
                  :key="`playoff-${bonus.week}`"
                  class="hover:bg-gray-50 dark:hover:bg-gray-900"
                >
                  <td class="px-4 py-2 text-sm font-semibold text-gray-800 dark:text-gray-50">
                    {{ bonus.week.toString().padStart(2, "0") }}*
                  </td>
                  <td class="px-4 py-2 text-sm text-gray-700 dark:text-gray-100">
                    <div class="flex flex-col">
                      <span
                        :class="[
                          bonus.winner === 'Pending'
                            ? 'text-amber-600 dark:text-amber-300'
                            : 'text-gray-800 dark:text-gray-50 font-semibold',
                        ]"
                      >
                        {{ bonus.winner }}
                      </span>
                      <span class="text-[11px] text-gray-500 dark:text-gray-300">
                        {{ bonus.label }}
                      </span>
                      <span v-if="bonus.note" class="text-[10px] text-gray-400 dark:text-gray-400">
                        {{ bonus.note }}
                      </span>
                    </div>
                  </td>
                  <td class="px-4 py-2 text-sm text-right text-gray-800 dark:text-gray-50">
                    {{ bonus.score !== null ? bonus.score.toFixed(2) : "-" }}
                  </td>
                  <td class="px-4 py-2 text-sm text-right text-gray-800 dark:text-gray-50">
                    {{ formatCurrency(bonus.amount) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div
          class="border border-gray-200 rounded-xl shadow-sm dark:border-gray-700 bg-white dark:bg-gray-800 overflow-visible"
        >
          <div
            class="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
          >
            <div>
              <p class="text-sm font-semibold text-gray-900 dark:text-gray-50">
                Seasonal awards
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-300">
                Locked once playoffs and totals finalize
              </p>
            </div>
            <span class="px-2 py-1 text-xs font-semibold bg-emerald-100 text-emerald-800 rounded-full dark:bg-emerald-900 dark:text-emerald-100">
              {{ completedSeasonalAwards }} / {{ seasonalAwards.length }} set
            </span>
          </div>
          <div class="divide-y divide-gray-100 dark:divide-gray-700">
            <div
              v-for="award in coreSeasonalAwards"
              :key="award.id"
              class="flex items-center justify-between px-4 py-3"
            >
              <div class="relative group">
                <div class="flex items-top gap-2">
                  <div class="flex flex-col">
                    <span class="text-sm font-semibold text-gray-900 dark:text-gray-50">
                      {{ award.title }}
                    </span>
                    <span
                      v-if="award.informalLabel"
                      class="text-[11px] text-gray-500 dark:text-gray-300"
                    >
                      {{ award.informalLabel }}
                    </span>
                  </div>
                  <span
                    v-if="award.definition"
                    class="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold text-blue-800 bg-blue-100 rounded-full dark:bg-blue-900 dark:text-blue-100"
                  >
                    i
                  </span>
                </div>
                <div
                  v-if="award.definition"
                  class="absolute z-20 hidden min-w-[18rem] max-w-xl p-4 mt-2 text-sm leading-relaxed text-gray-800 bg-white border border-gray-200 rounded-lg shadow-lg group-hover:block whitespace-normal break-words dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                >
                  <p class="font-semibold text-gray-900 dark:text-gray-50">
                    {{ award.title }}
                  </p>
                  <p v-if="award.informalLabel" class="text-[11px] text-gray-500 dark:text-gray-300">
                    {{ award.informalLabel }}
                  </p>
                  <p
                    class="mt-1 text-gray-700 dark:text-gray-200"
                    v-html="formatDefinition(award.definition)"
                  />
                </div>
                <div class="flex flex-wrap items-center gap-2 mt-1">
                  <span
                    class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold shadow-sm"
                    :class="[
                      award.pending
                        ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:ring-amber-800/70'
                        : 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:ring-emerald-700/80',
                    ]"
                  >
                    <svg
                      v-if="!award.pending"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      class="w-4 h-4"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.25 7.333a1 1 0 0 1-1.435.018l-3.5-3.416a1 1 0 1 1 1.399-1.43l2.787 2.721 6.539-6.61a1 1 0 0 1 1.454-.02Z"
                        clip-rule="evenodd"
                      />
                    </svg>
                    {{ award.winner }}
                  </span>
                  <span
                    v-if="!award.pending && award.pointsTotal"
                    class="text-[11px] font-semibold text-gray-600 dark:text-gray-200"
                  >
                    {{ formatPointsTotal(award.pointsTotal) }}
                  </span>
                </div>
              </div>
              <span class="text-sm font-semibold text-gray-900 dark:text-gray-50">
                {{ formatCurrency(award.amount) }}
              </span>
            </div>
          </div>

          <div
            class="mt-3 pt-3 border-t-2 border-indigo-100 dark:border-indigo-800 bg-gradient-to-r from-sky-50 via-indigo-50 to-white dark:from-indigo-950 dark:via-slate-900 dark:to-gray-900 rounded-lg shadow-inner ring-1 ring-indigo-100/70 dark:ring-indigo-800/60 custom-seasonal-awards"
          >
            <div class="flex items-center justify-between px-4 pb-2">
              <span class="text-[11px] font-semibold tracking-wide uppercase text-indigo-700 dark:text-indigo-200">
                League honors
              </span>
            </div>
            <div
              class="divide-y divide-indigo-100 dark:divide-indigo-800 bg-white/80 dark:bg-gray-900/70 rounded-lg"
            >
              <div
                v-for="award in customSeasonalAwards"
                :key="award.id"
                class="flex items-center justify-between px-4 py-3"
              >
                <div class="relative group">
                  <div class="flex items-top gap-2">
                    <div class="flex flex-col">
                      <span class="text-sm font-semibold text-gray-900 dark:text-gray-50">
                        {{ award.title }}
                      </span>
                      <span
                        v-if="award.informalLabel"
                        class="text-[11px] text-gray-500 dark:text-gray-300"
                      >
                        {{ award.informalLabel }}
                      </span>
                    </div>
                    <span
                      v-if="award.definition"
                      class="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold text-blue-800 bg-blue-100 rounded-full dark:bg-blue-900 dark:text-blue-100"
                    >
                      i
                    </span>
                  </div>
                  <div
                    v-if="award.definition"
                    class="absolute z-20 hidden min-w-[18rem] max-w-xl p-4 mt-2 text-sm leading-relaxed text-gray-800 bg-white border border-gray-200 rounded-lg shadow-lg group-hover:block whitespace-normal break-words dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                  >
                    <p class="font-semibold text-gray-900 dark:text-gray-50">
                      {{ award.title }}
                    </p>
                    <p v-if="award.informalLabel" class="text-[11px] text-gray-500 dark:text-gray-300">
                      {{ award.informalLabel }}
                    </p>
                    <p
                      class="mt-1 text-gray-700 dark:text-gray-200"
                      v-html="formatDefinition(award.definition)"
                    />
                  </div>
                  <div class="flex flex-wrap items-center gap-2 mt-1">
                    <span
                      class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold shadow-sm"
                      :class="[
                        award.pending
                          ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:ring-amber-800/70'
                          : 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:ring-emerald-700/80',
                      ]"
                    >
                      <svg
                        v-if="!award.pending"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        class="w-4 h-4"
                      >
                        <path
                          fill-rule="evenodd"
                          d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.25 7.333a1 1 0 0 1-1.435.018l-3.5-3.416a1 1 0 1 1 1.399-1.43l2.787 2.721 6.539-6.61a1 1 0 0 1 1.454-.02Z"
                          clip-rule="evenodd"
                        />
                      </svg>
                      {{ award.winner }}
                    </span>
                    <span
                      v-if="!award.pending && award.pointsTotal"
                      class="text-[11px] font-semibold text-gray-600 dark:text-gray-200"
                    >
                      {{ formatPointsTotal(award.pointsTotal) }}
                    </span>
                  </div>
                </div>
                <span class="text-sm font-semibold text-gray-900 dark:text-gray-50">
                  {{ formatCurrency(award.amount) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

        <div
          class="overflow-hidden border border-gray-200 rounded-xl shadow-sm dark:border-gray-700 bg-white dark:bg-gray-800"
        >
        <div
          class="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
        >
          <div>
            <p class="text-sm font-semibold text-gray-900 dark:text-gray-50">
              Manager earnings tracker
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-300">
              Auto-sums weekly bonuses and season awards as winners are filled in.
            </p>
          </div>
          <span class="px-2 py-1 text-xs font-semibold bg-purple-100 text-purple-800 rounded-full dark:bg-purple-900 dark:text-purple-100">
            Season plan: {{ seasonYear || "current" }}
          </span>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead class="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th
                  scope="col"
                  class="px-4 py-2 text-xs font-semibold tracking-wide text-left text-gray-600 uppercase dark:text-gray-200"
                >
                  Manager
                </th>
                <th
                  scope="col"
                  class="px-4 py-2 text-xs font-semibold tracking-wide text-left text-gray-600 uppercase dark:text-gray-200"
                >
                  Weekly bonuses
                </th>
                <th
                  scope="col"
                  class="px-4 py-2 text-xs font-semibold tracking-wide text-left text-gray-600 uppercase dark:text-gray-200"
                >
                  Seasonal awards
                </th>
                <th
                  scope="col"
                  class="px-4 py-2 text-xs font-semibold tracking-wide text-right text-gray-600 uppercase dark:text-gray-200"
                >
                  Total winnings
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
              <tr
                v-for="manager in managerTotals"
                :key="manager.name"
                class="hover:bg-gray-50 dark:hover:bg-gray-900"
              >
                <td class="px-4 py-2 text-sm font-semibold text-gray-900 dark:text-gray-50">
                  {{ manager.name }}
                </td>
                <td class="px-4 py-2 text-sm text-gray-700 dark:text-gray-100">
                  x{{ manager.weeklyBonuses }}
                  <span
                    v-if="(manager as any).bonusWeeks?.length"
                    class="text-xs text-gray-500 dark:text-gray-300 ml-1"
                  >
                    (W{{ (manager as any).bonusWeeks.sort((a: number, b: number) => a - b).join(', W') }})
                  </span>
                </td>
                <td class="px-4 py-2 text-sm text-gray-700 dark:text-gray-100">
                  <span
                    v-if="manager.seasonalAwards.length === 0"
                    class="text-amber-600 dark:text-amber-300"
                  >
                    Pending
                  </span>
                  <span
                    v-else
                    class="inline-flex flex-wrap gap-1"
                  >
                    <span
                      v-for="award in manager.seasonalAwards"
                      :key="award"
                      class="px-2 py-0.5 text-xs font-semibold bg-gray-100 text-gray-800 rounded-full dark:bg-gray-700 dark:text-gray-100"
                    >
                      {{ award }}
                    </span>
                  </span>
                </td>
                <td class="px-4 py-2 text-sm font-semibold text-right text-gray-900 dark:text-gray-50">
                  {{ formatCurrency(manager.total) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
  <div
    v-else
    class="p-4 mt-6 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-900 dark:border-gray-700 dark:text-gray-200"
  >
    Payout tracker is hidden until a season is available for this league.
  </div>
</template>
