<script setup lang="ts">
import { computed } from "vue";
import { useStore } from "../../store/store";
import { Badge } from "../ui/badge";
import Card from "../ui/card/Card.vue";
import CardContent from "../ui/card/CardContent.vue";
import CardHeader from "../ui/card/CardHeader.vue";
import CardTitle from "../ui/card/CardTitle.vue";

const store = useStore();

interface SeasonRow {
  name: string;
  username: string;
  id: string;
  rosterId: number;
  season: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  points: number[];
  matchups: (number | null)[];
  recordByWeek: string;
}

interface StreakRecord {
  row: SeasonRow;
  type: "W" | "L";
  length: number;
  startWeek: number;
  endWeek: number;
}

interface MatchupRecord {
  season: string;
  week: number;
  teamA: SeasonRow;
  teamB: SeasonRow;
  scoreA: number;
  scoreB: number;
  total: number;
  difference: number;
}

interface ScoredMatchupRecord {
  matchup: MatchupRecord;
  team: SeasonRow;
  opponent: SeasonRow;
  score: number;
  opponentScore: number;
}

interface BaseRecordCard {
  title: string;
  value: string;
  meta: string;
}

interface SummaryRecordCard extends BaseRecordCard {
  kind: "summary";
  detail: string;
}

interface MatchupTeamDisplay {
  name: string;
  score: string;
  isFeatured?: boolean;
}

interface MatchupRecordCard extends BaseRecordCard {
  kind: "matchup";
  teams: MatchupTeamDisplay[];
}

type AllTimeRecordCard = SummaryRecordCard | MatchupRecordCard;

const props = defineProps<{
  seasonRows: SeasonRow[];
}>();

const displayName = (row: SeasonRow) =>
  store.showUsernames
    ? row.username || "Ghost Roster"
    : row.name || "Ghost Roster";

const formatPoints = (value: number) =>
  value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

const getWinPercentage = (row: SeasonRow) => {
  const games = row.wins + row.losses + row.ties;
  return games > 0 ? (row.wins + row.ties * 0.5) / games : -1;
};

const formatRecord = (row: SeasonRow) =>
  `${row.wins}-${row.losses}${row.ties ? `-${row.ties}` : ""}`;

const seasonRowsWithGames = computed(() =>
  props.seasonRows.filter((row) => row.wins + row.losses + row.ties > 0)
);

const bestSeasonPoints = computed(
  () =>
    [...seasonRowsWithGames.value].sort((a, b) => b.pointsFor - a.pointsFor)[0]
);

const worstSeasonPoints = computed(
  () =>
    [...seasonRowsWithGames.value]
      .filter((row) => row.pointsFor > 0)
      .sort((a, b) => a.pointsFor - b.pointsFor)[0]
);

const bestRecord = computed(
  () =>
    [...seasonRowsWithGames.value].sort((a, b) => {
      const winPctDifference = getWinPercentage(b) - getWinPercentage(a);
      return winPctDifference !== 0
        ? winPctDifference
        : b.pointsFor - a.pointsFor;
    })[0]
);

const worstRecord = computed(
  () =>
    [...seasonRowsWithGames.value].sort((a, b) => {
      const winPctDifference = getWinPercentage(a) - getWinPercentage(b);
      return winPctDifference !== 0
        ? winPctDifference
        : a.pointsFor - b.pointsFor;
    })[0]
);

const getLongestStreak = (row: SeasonRow, type: "W" | "L"): StreakRecord => {
  let bestLength = 0;
  let bestEndWeek = 0;
  let currentLength = 0;

  row.recordByWeek.split("").forEach((result, index) => {
    if (result === type) {
      currentLength += 1;
      if (currentLength > bestLength) {
        bestLength = currentLength;
        bestEndWeek = index + 1;
      }
      return;
    }

    currentLength = 0;
  });

  return {
    row,
    type,
    length: bestLength,
    startWeek: bestEndWeek - bestLength + 1,
    endWeek: bestEndWeek,
  };
};

const longestWinStreak = computed(
  () =>
    seasonRowsWithGames.value
      .map((row) => getLongestStreak(row, "W"))
      .sort((a, b) => b.length - a.length)[0]
);

const longestLosingStreak = computed(
  () =>
    seasonRowsWithGames.value
      .map((row) => getLongestStreak(row, "L"))
      .sort((a, b) => b.length - a.length)[0]
);

const matchupRecords = computed(() => {
  const records: MatchupRecord[] = [];
  const processedMatchups = new Set<string>();

  props.seasonRows.forEach((teamA) => {
    teamA.matchups.forEach((matchupId, matchupIndex) => {
      if (matchupId === null || matchupId === 0) {
        return;
      }

      const teamB = props.seasonRows.find(
        (row) =>
          row.season === teamA.season &&
          row !== teamA &&
          row.matchups[matchupIndex] === matchupId
      );

      if (!teamB) {
        return;
      }

      const scoreA = teamA.points[matchupIndex];
      const scoreB = teamB.points[matchupIndex];
      if (
        typeof scoreA !== "number" ||
        typeof scoreB !== "number" ||
        Number.isNaN(scoreA) ||
        Number.isNaN(scoreB) ||
        scoreA === 0 ||
        scoreB === 0
      ) {
        return;
      }

      const sortedTeamIds = [
        teamA.id || teamA.name,
        teamB.id || teamB.name,
      ].sort();
      const key = `${teamA.season}-${matchupIndex}-${matchupId}-${sortedTeamIds.join("-")}`;
      if (processedMatchups.has(key)) {
        return;
      }

      processedMatchups.add(key);
      records.push({
        season: teamA.season,
        week: matchupIndex + 1,
        teamA,
        teamB,
        scoreA,
        scoreB,
        total: scoreA + scoreB,
        difference: Math.abs(scoreA - scoreB),
      });
    });
  });

  return records;
});

const scoredMatchups = computed(() =>
  matchupRecords.value
    .filter((matchup) => matchup.scoreA !== matchup.scoreB)
    .map((matchup) => {
      const teamAWon = matchup.scoreA > matchup.scoreB;

      return {
        matchup,
        winner: {
          matchup,
          team: teamAWon ? matchup.teamA : matchup.teamB,
          opponent: teamAWon ? matchup.teamB : matchup.teamA,
          score: teamAWon ? matchup.scoreA : matchup.scoreB,
          opponentScore: teamAWon ? matchup.scoreB : matchup.scoreA,
        },
        loser: {
          matchup,
          team: teamAWon ? matchup.teamB : matchup.teamA,
          opponent: teamAWon ? matchup.teamA : matchup.teamB,
          score: teamAWon ? matchup.scoreB : matchup.scoreA,
          opponentScore: teamAWon ? matchup.scoreA : matchup.scoreB,
        },
      };
    })
);

const highestScoringLoss = computed(
  () =>
    [...scoredMatchups.value].sort((a, b) => b.loser.score - a.loser.score)[0]
);

const lowestScoringWin = computed(
  () =>
    [...scoredMatchups.value].sort((a, b) => a.winner.score - b.winner.score)[0]
);

const biggestBlowout = computed(
  () => [...matchupRecords.value].sort((a, b) => b.difference - a.difference)[0]
);

const closestMatchup = computed(
  () => [...matchupRecords.value].sort((a, b) => a.difference - b.difference)[0]
);

const formatStreakWeeks = (streak: StreakRecord) =>
  streak.startWeek === streak.endWeek
    ? `Week ${streak.startWeek}`
    : `Weeks ${streak.startWeek}-${streak.endWeek}`;

const formatMatchupTeams = (matchup: MatchupRecord): MatchupTeamDisplay[] => [
  { name: displayName(matchup.teamA), score: formatPoints(matchup.scoreA) },
  { name: displayName(matchup.teamB), score: formatPoints(matchup.scoreB) },
];

const formatScoredMatchupTeams = (
  record: ScoredMatchupRecord
): MatchupTeamDisplay[] => [
  {
    name: displayName(record.team),
    score: formatPoints(record.score),
    isFeatured: true,
  },
  {
    name: displayName(record.opponent),
    score: formatPoints(record.opponentScore),
  },
];

const createSummaryRecord = ({
  title,
  value,
  detail,
  meta,
}: Omit<SummaryRecordCard, "kind">): SummaryRecordCard => ({
  kind: "summary",
  title,
  value,
  detail,
  meta,
});

const createMatchupRecord = ({
  title,
  value,
  teams,
  meta,
}: Omit<MatchupRecordCard, "kind">): MatchupRecordCard => ({
  kind: "matchup",
  title,
  value,
  teams,
  meta,
});

const recordCards = computed<AllTimeRecordCard[]>(() => {
  const cards: AllTimeRecordCard[] = [];

  if (bestSeasonPoints.value) {
    cards.push(
      createSummaryRecord({
        title: "Most Points in a Season",
        value: formatPoints(bestSeasonPoints.value.pointsFor),
        detail: displayName(bestSeasonPoints.value),
        meta: bestSeasonPoints.value.season,
      })
    );
  }

  if (worstSeasonPoints.value) {
    cards.push(
      createSummaryRecord({
        title: "Fewest Points in a Season",
        value: formatPoints(worstSeasonPoints.value.pointsFor),
        detail: displayName(worstSeasonPoints.value),
        meta: worstSeasonPoints.value.season,
      })
    );
  }

  if (bestRecord.value) {
    cards.push(
      createSummaryRecord({
        title: "Best Record",
        value: formatRecord(bestRecord.value),
        detail: displayName(bestRecord.value),
        meta: bestRecord.value.season,
      })
    );
  }

  if (worstRecord.value) {
    cards.push(
      createSummaryRecord({
        title: "Worst Record",
        value: formatRecord(worstRecord.value),
        detail: displayName(worstRecord.value),
        meta: worstRecord.value.season,
      })
    );
  }

  if (longestWinStreak.value?.length) {
    cards.push(
      createSummaryRecord({
        title: "Longest Win Streak",
        value: `${longestWinStreak.value.length} wins`,
        detail: displayName(longestWinStreak.value.row),
        meta: `${longestWinStreak.value.row.season} / ${formatStreakWeeks(
          longestWinStreak.value
        )}`,
      })
    );
  }

  if (longestLosingStreak.value?.length) {
    cards.push(
      createSummaryRecord({
        title: "Longest Losing Streak",
        value: `${longestLosingStreak.value.length} losses`,
        detail: displayName(longestLosingStreak.value.row),
        meta: `${longestLosingStreak.value.row.season} / ${formatStreakWeeks(
          longestLosingStreak.value
        )}`,
      })
    );
  }

  if (highestScoringLoss.value) {
    cards.push(
      createMatchupRecord({
        title: "Highest Scoring Loss",
        value: formatPoints(highestScoringLoss.value.loser.score),
        teams: formatScoredMatchupTeams(highestScoringLoss.value.loser),
        meta: `${highestScoringLoss.value.matchup.season} / Week ${highestScoringLoss.value.matchup.week}`,
      })
    );
  }

  if (lowestScoringWin.value) {
    cards.push(
      createMatchupRecord({
        title: "Lowest Scoring Win",
        value: formatPoints(lowestScoringWin.value.winner.score),
        teams: formatScoredMatchupTeams(lowestScoringWin.value.winner),
        meta: `${lowestScoringWin.value.matchup.season} / Week ${lowestScoringWin.value.matchup.week}`,
      })
    );
  }

  if (biggestBlowout.value) {
    cards.push(
      createMatchupRecord({
        title: "Biggest Blowout",
        value: `${formatPoints(biggestBlowout.value.difference)} pts`,
        teams: formatMatchupTeams(biggestBlowout.value),
        meta: `${biggestBlowout.value.season} / Week ${biggestBlowout.value.week}`,
      })
    );
  }

  if (closestMatchup.value) {
    cards.push(
      createMatchupRecord({
        title: "Closest Matchup",
        value: `${formatPoints(closestMatchup.value.difference)} pts`,
        teams: formatMatchupTeams(closestMatchup.value),
        meta: `${closestMatchup.value.season} / Week ${closestMatchup.value.week}`,
      })
    );
  }

  return cards;
});
</script>

<template>
  <Card v-if="recordCards.length" class="mt-4 overflow-hidden">
    <CardHeader class="p-4 border-b bg-muted/30 sm:p-6">
      <CardTitle>All Time Records</CardTitle>
    </CardHeader>
    <CardContent class="p-4 sm:p-6">
      <div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Card
          v-for="record in recordCards"
          :key="record.title"
          class="flex flex-col h-44"
        >
          <CardHeader class="h-12 p-4 pb-1 space-y-0">
            <p class="text-sm font-medium text-muted-foreground">
              {{ record.title }}
            </p>
          </CardHeader>
          <CardContent class="flex flex-col flex-1 p-4 pt-0">
            <p class="text-2xl font-bold tabular-nums">
              {{ record.value }}
            </p>

            <div v-if="record.kind === 'matchup'" class="mt-1 mb-2 space-y-1">
              <div
                v-for="team in record.teams"
                :key="`${record.title}-${team.name}-${team.score}`"
                class="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 rounded-md bg-muted/40 px-2 py-1"
              >
                <p
                  :title="team.name"
                  class="min-w-0 max-w-32 truncate text-xs font-medium"
                >
                  {{ team.name }}
                </p>
                <p
                  class="text-xs font-semibold text-right tabular-nums"
                >
                  {{ team.score }}
                </p>
              </div>
            </div>

            <p
              v-else
              :title="record.detail"
              class="min-w-0 max-w-32 mt-2 truncate text-sm font-medium"
            >
              {{ record.detail }}
            </p>

            <Badge
              variant="outline"
              class="max-w-full mt-auto text-xs text-left whitespace-normal w-fit"
            >
              {{ record.meta }}
            </Badge>
          </CardContent>
        </Card>
      </div>
    </CardContent>
  </Card>
</template>
