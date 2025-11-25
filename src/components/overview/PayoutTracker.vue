<script setup lang="ts">
import { computed } from "vue";
import { useStore } from "../../store/store";
import { LeagueInfoType, TableDataType } from "../../api/types";

const props = defineProps<{
  league?: LeagueInfoType;
  tableData?: TableDataType[];
}>();

const store = useStore();

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
    label: "Weekly Bonuses + Fun Awards",
    amount: 360,
    detail: "Weekly high-score bonuses plus five season-long mini awards",
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

const findUserByRosterId = (rosterId?: number) => {
  if (!rosterId || !props.league?.users || !props.league?.rosters) return null;
  const roster = props.league.rosters.find((r: any) => r.rosterId === rosterId);
  if (!roster) return null;
  return props.league.users.find((user: any) => user.id === roster.id);
};

const resolveNameByRosterId = (rosterId?: number) => {
  const user = findUserByRosterId(rosterId);
  if (user) return formatTeamName(user);
  return rosterId ? `Roster #${rosterId}` : "Pending";
};

const weeklyBonusWinners = computed(() => {
  const seasonLength = props.league?.regularSeasonLength || 0;
  const limit = Math.max(seasonLength || 0, weeksPlayed.value || 0);
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

const totalWeeklyBonuses = computed(() => weeklyBonusWinners.value.length);
const weeklyPoolTotal = computed(() => totalWeeklyBonuses.value * 15);

const seasonalAwards = computed(() => {
  const seasonComplete = props.league?.status === "complete";
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
  const mostPointsPendingLabel = mostPointsTeam
    ? `Pending (current leader: ${formatTeamName(mostPointsTeam)})`
    : "Pending";
  const mostPointsName = seasonComplete && mostPointsTeam
    ? formatTeamName(mostPointsTeam)
    : mostPointsPendingLabel;

  return [
    { award: "Champion", winner: championName, amount: 1000, pending: championName === "Pending" },
    { award: "Runner-Up", winner: runnerUpName, amount: 680, pending: runnerUpName === "Pending" },
    {
      award: "Most Points (Regular Season)",
      winner: mostPointsName,
      amount: 360,
      pending: !seasonComplete,
    },
    { award: "Award I - Acting Coach", winner: "Pending", amount: 25, pending: true },
    { award: "Award II - In the House", winner: "Pending", amount: 25, pending: true },
    { award: "Award III - Nahbers", winner: "Pending", amount: 25, pending: true },
    { award: "Award IV - Sticklemonsters", winner: "Pending", amount: 15, pending: true },
    { award: "Award V - Wonderful Team", winner: "Pending", amount: 15, pending: true },
  ];
});

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

const managerTotals = computed(() => {
  const totals = new Map<
    string,
    { name: string; weeklyBonuses: number; seasonalAwards: string[]; total: number }
  >();

  managerNames.value.forEach((name) => {
    totals.set(name, {
      name,
      weeklyBonuses: 0,
      seasonalAwards: [],
      total: 0,
    });
  });

  weeklyBonusWinners.value.forEach((bonus) => {
    if (bonus.winner === "Pending") return;
    const entry =
      totals.get(bonus.winner) ||
      {
        name: bonus.winner,
        weeklyBonuses: 0,
        seasonalAwards: [],
        total: 0,
      };
    entry.weeklyBonuses += 1;
    // track weeks won so we can list them in the table
    (entry as any).bonusWeeks = Array.isArray((entry as any).bonusWeeks)
      ? (entry as any).bonusWeeks
      : [];
    (entry as any).bonusWeeks.push(bonus.week);
    entry.total += bonus.amount;
    totals.set(bonus.winner, entry);
  });

  seasonalAwards.value.forEach((award) => {
    if (award.pending) return;
    const entry =
      totals.get(award.winner) ||
      {
        name: award.winner,
        weeklyBonuses: 0,
        seasonalAwards: [],
        total: 0,
      };
    entry.seasonalAwards.push(award.award);
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
              <span>Season fun awards bucket</span>
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

      <div class="grid gap-4 xl:grid-cols-3">
        <div
          class="xl:col-span-2 overflow-hidden border border-gray-200 rounded-xl shadow-sm dark:border-gray-700 bg-white dark:bg-gray-800"
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
                  v-for="bonus in weeklyBonusWinners"
                  :key="bonus.week"
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
              </tbody>
            </table>
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
              v-for="award in seasonalAwards"
              :key="award.award"
              class="flex items-center justify-between px-4 py-3"
            >
              <div>
                <p class="text-sm font-semibold text-gray-900 dark:text-gray-50">
                  {{ award.award }}
                </p>
                <p
                  class="text-xs"
                  :class="[
                    award.pending
                      ? 'text-amber-600 dark:text-amber-300'
                      : 'text-gray-600 dark:text-gray-200',
                  ]"
                >
                  {{ award.winner }}
                </p>
              </div>
              <span class="text-sm font-semibold text-gray-900 dark:text-gray-50">
                {{ formatCurrency(award.amount) }}
              </span>
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
