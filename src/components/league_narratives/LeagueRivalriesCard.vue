<script setup lang="ts">
import { computed, ref } from "vue";
import type {
  HistoricalSeasonInput,
  ManagerArchetype,
} from "@/lib/narratives";
import Card from "../ui/card/Card.vue";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

type RivalryIdentity = {
  userId: string;
  displayName: string;
  avatarImg?: string;
};

type RivalryGame = {
  season: string;
  week: number;
  pointsA: number;
  pointsB: number;
  winnerUserId: string | null;
  margin: number;
};

type RivalryGameView = RivalryGame & {
  summary: string;
  resultLabel: string;
};

type RivalryAggregate = {
  managerAUserId: string;
  managerBUserId: string;
  winsA: number;
  winsB: number;
  ties: number;
  totalPointsA: number;
  totalPointsB: number;
  games: RivalryGame[];
};

type RivalryCard = {
  key: string;
  managerA: RivalryIdentity;
  managerB: RivalryIdentity;
  winsA: number;
  winsB: number;
  ties: number;
  gamesPlayed: number;
  totalPointsA: number;
  totalPointsB: number;
  averageMargin: number;
  recordSummary: string;
  pointsSummary: string;
  closestGameSummary: string;
  blowoutSummary: string;
  lastPlayedSummary: string;
  streakSummary: string;
  rivalryScore: number;
  headline: string;
  blurb: string;
  heatLabel: string;
  heatToneClass: string;
  signatureMoments: string[];
  games: RivalryGameView[];
};

const props = defineProps<{
  seasons: HistoricalSeasonInput[];
  archetypes: ManagerArchetype[];
}>();

const selectedManager = ref("all");

const compareSeasons = (left: string, right: string) => {
  const leftYear = Number.parseInt(left, 10);
  const rightYear = Number.parseInt(right, 10);

  if (Number.isNaN(leftYear) || Number.isNaN(rightYear)) {
    return left.localeCompare(right);
  }

  return leftYear - rightYear;
};

const formatRecord = (wins: number, losses: number, ties: number) =>
  ties > 0 ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`;

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

const getHeatLabel = (gamesPlayed: number, winGap: number, averageMargin: number) => {
  if (gamesPlayed >= 8 && winGap <= 2 && averageMargin <= 10) {
    return {
      label: "Heated",
      className:
        "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
    };
  }

  if (gamesPlayed >= 6 && winGap <= 3) {
    return {
      label: "Competitive",
      className:
        "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300",
    };
  }

  if (gamesPlayed <= 3) {
    return {
      label: "New",
      className:
        "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
    };
  }

  if (winGap >= 5) {
    return {
      label: "Lopsided",
      className:
        "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    };
  }

  return {
    label: "Steady",
    className:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  };
};

const formatGameResult = (
  game: RivalryGame,
  managerA: RivalryIdentity,
  managerB: RivalryIdentity
) => {
  if (game.winnerUserId === null) {
    return {
      summary: `Tie in ${game.season} W${game.week}, ${game.pointsA.toFixed(1)}-${game.pointsB.toFixed(1)}`,
      resultLabel: "Tie",
    };
  }

  const winner =
    game.winnerUserId === managerA.userId ? managerA.displayName : managerB.displayName;

  return {
    summary: `${winner} in ${game.season} W${game.week}, ${game.pointsA.toFixed(1)}-${game.pointsB.toFixed(1)}`,
    resultLabel:
      game.winnerUserId === managerA.userId
        ? `${managerA.displayName} won by ${game.margin.toFixed(1)}`
        : `${managerB.displayName} won by ${game.margin.toFixed(1)}`,
  };
};

const buildHeadline = (
  managerA: RivalryIdentity,
  managerB: RivalryIdentity,
  gamesPlayed: number,
  winGap: number,
  averageMargin: number
) => {
  if (gamesPlayed >= 8 && winGap <= 2 && averageMargin <= 10) {
    return `${managerA.displayName} vs ${managerB.displayName} is the league's closest long-running feud`;
  }

  if (gamesPlayed >= 6 && winGap === 0) {
    return `${managerA.displayName} and ${managerB.displayName} have turned this into a dead-even war`;
  }

  if (winGap >= 5) {
    return `${managerA.displayName} vs ${managerB.displayName} has been mostly one-way traffic`;
  }

  if (averageMargin <= 6) {
    return `${managerA.displayName} and ${managerB.displayName} keep playing coin-flip games`;
  }

  return `${managerA.displayName} and ${managerB.displayName} keep finding each other`;
};

const buildBlurb = (
  managerA: RivalryIdentity,
  managerB: RivalryIdentity,
  winsA: number,
  winsB: number,
  ties: number,
  totalPointsA: number,
  totalPointsB: number,
  averageMargin: number,
  latestGame: RivalryGame | undefined,
  streakSummary: string
) => {
  const leader =
    winsA === winsB ? null : winsA > winsB ? managerA.displayName : managerB.displayName;
  const record =
    winsA >= winsB
      ? formatRecord(winsA, winsB, ties)
      : formatRecord(winsB, winsA, ties);
  const pointGap = Math.abs(totalPointsA - totalPointsB).toFixed(1);
  const pointsLeader =
    totalPointsA === totalPointsB
      ? null
      : totalPointsA > totalPointsB
        ? managerA.displayName
        : managerB.displayName;
  const recentNote = latestGame
    ? `Their latest meeting came in ${latestGame.season} Week ${latestGame.week}.`
    : "They have not met recently.";

  if (!leader) {
    return `Nobody owns this matchup yet. The series is tied, the average margin is just ${averageMargin.toFixed(1)}, and ${streakSummary.toLowerCase()}. ${recentNote}`;
  }

  if (!pointsLeader || pointGap === "0.0") {
    return `${leader} leads the series ${record}, but the total points are basically even. Average margin: ${averageMargin.toFixed(1)}. ${recentNote}`;
  }

  return `${leader} leads ${record}, while ${pointsLeader} holds a ${pointGap}-point all-time scoring edge. Average margin: ${averageMargin.toFixed(1)}. ${recentNote}`;
};

const identityMap = computed(() => {
  const map = new Map<string, RivalryIdentity>();

  props.archetypes.forEach((manager) => {
    map.set(manager.userId, {
      userId: manager.userId,
      displayName: manager.displayName,
      avatarImg: manager.avatarImg,
    });
  });

  props.seasons.forEach((season) => {
    season.users.forEach((user) => {
      if (!map.has(user.id)) {
        map.set(user.id, {
          userId: user.id,
          displayName: user.username || user.name || "Ghost Roster",
          avatarImg: user.avatarImg,
        });
      }
    });
  });

  return map;
});

const rivalries = computed<RivalryCard[]>(() => {
  const seriesMap = new Map<string, RivalryAggregate>();

  props.seasons.forEach((season) => {
    const rosterToUserId = new Map<number, string>();
    season.rosters.forEach((roster) => {
      if (roster.id) {
        rosterToUserId.set(roster.rosterId, roster.id);
      }
    });

    const totalWeeks = Math.max(
      0,
      ...season.weeklyPoints.map((weeklyEntry) => weeklyEntry.matchups?.length ?? 0)
    );

    for (let weekIndex = 0; weekIndex < totalWeeks; weekIndex += 1) {
      const weeklyMatchups = new Map<
        number,
        Array<{ userId: string; points: number }>
      >();

      season.weeklyPoints.forEach((weeklyEntry) => {
        const matchupId = weeklyEntry.matchups?.[weekIndex];
        const points = weeklyEntry.points?.[weekIndex];
        const userId = rosterToUserId.get(weeklyEntry.rosterId);

        if (
          matchupId === null ||
          matchupId === undefined ||
          !userId ||
          points === undefined ||
          points === 0
        ) {
          return;
        }

        const teams = weeklyMatchups.get(matchupId) ?? [];
        teams.push({ userId, points });
        weeklyMatchups.set(matchupId, teams);
      });

      weeklyMatchups.forEach((teams) => {
        if (teams.length !== 2) {
          return;
        }

        const [firstTeam, secondTeam] = teams;
        if (firstTeam.userId === secondTeam.userId) {
          return;
        }

        const orderedTeams =
          firstTeam.userId < secondTeam.userId
            ? [firstTeam, secondTeam]
            : [secondTeam, firstTeam];
        const [teamA, teamB] = orderedTeams;
        const key = `${teamA.userId}::${teamB.userId}`;
        const rivalry =
          seriesMap.get(key) ??
          ({
            managerAUserId: teamA.userId,
            managerBUserId: teamB.userId,
            winsA: 0,
            winsB: 0,
            ties: 0,
            totalPointsA: 0,
            totalPointsB: 0,
            games: [],
          } satisfies RivalryAggregate);

        rivalry.totalPointsA += teamA.points;
        rivalry.totalPointsB += teamB.points;

        const winnerUserId =
          teamA.points === teamB.points
            ? null
            : teamA.points > teamB.points
              ? teamA.userId
              : teamB.userId;

        if (winnerUserId === teamA.userId) {
          rivalry.winsA += 1;
        } else if (winnerUserId === teamB.userId) {
          rivalry.winsB += 1;
        } else {
          rivalry.ties += 1;
        }

        rivalry.games.push({
          season: season.season,
          week: weekIndex + 1,
          pointsA: teamA.points,
          pointsB: teamB.points,
          winnerUserId,
          margin: Math.abs(teamA.points - teamB.points),
        });

        seriesMap.set(key, rivalry);
      });
    }
  });

  return Array.from(seriesMap.entries())
    .map(([key, rivalry]) => {
      const managerA =
        identityMap.value.get(rivalry.managerAUserId) ?? {
          userId: rivalry.managerAUserId,
          displayName: rivalry.managerAUserId,
        };
      const managerB =
        identityMap.value.get(rivalry.managerBUserId) ?? {
          userId: rivalry.managerBUserId,
          displayName: rivalry.managerBUserId,
        };
      const games = [...rivalry.games].sort((left, right) => {
        const seasonDelta = compareSeasons(left.season, right.season);
        if (seasonDelta !== 0) {
          return seasonDelta;
        }

        return left.week - right.week;
      });
      const latestGame = games[games.length - 1];
      const closestGame = [...games].sort((left, right) => left.margin - right.margin)[0];
      const biggestBlowout = [...games].sort(
        (left, right) => right.margin - left.margin
      )[0];

      let streakSummary = "No recent games";
      if (latestGame) {
        if (latestGame.winnerUserId === null) {
          streakSummary = "Last meeting ended in a tie";
        } else {
          let streakCount = 0;
          for (let index = games.length - 1; index >= 0; index -= 1) {
            if (games[index].winnerUserId === latestGame.winnerUserId) {
              streakCount += 1;
            } else {
              break;
            }
          }

          const streakLeader =
            latestGame.winnerUserId === managerA.userId ? managerA : managerB;
          streakSummary =
            streakCount === 1
              ? `${streakLeader.displayName} won the last meeting`
              : `${streakLeader.displayName} has won ${streakCount} straight`;
        }
      }

      const winGap = Math.abs(rivalry.winsA - rivalry.winsB);
      const averageMargin =
        games.reduce((sum, game) => sum + game.margin, 0) / Math.max(1, games.length);
      const heat = getHeatLabel(games.length, winGap, averageMargin);

      const highestScoringGame = [...games].sort(
        (left, right) =>
          right.pointsA + right.pointsB - (left.pointsA + left.pointsB)
      )[0];
      const latestWinner =
        latestGame?.winnerUserId === null
          ? "Nobody"
          : latestGame?.winnerUserId === managerA.userId
            ? managerA.displayName
            : managerB.displayName;

      const signatureMoments = [
        closestGame
          ? `Closest finish: ${closestGame.season} W${closestGame.week}, decided by ${closestGame.margin.toFixed(1)}`
          : null,
        biggestBlowout
          ? `Biggest blowout: ${biggestBlowout.season} W${biggestBlowout.week}, margin ${biggestBlowout.margin.toFixed(1)}`
          : null,
        highestScoringGame
          ? `Highest combined score: ${highestScoringGame.season} W${highestScoringGame.week}, ${(highestScoringGame.pointsA + highestScoringGame.pointsB).toFixed(1)} points`
          : null,
        latestGame
          ? `${latestWinner} took the latest chapter in ${latestGame.season} W${latestGame.week}`
          : null,
      ].filter((moment): moment is string => moment !== null);

      const leaderName =
        rivalry.winsA === rivalry.winsB
          ? null
          : rivalry.winsA > rivalry.winsB
            ? managerA.displayName
            : managerB.displayName;
      const leaderRecord =
        rivalry.winsA >= rivalry.winsB
          ? formatRecord(rivalry.winsA, rivalry.winsB, rivalry.ties)
          : formatRecord(rivalry.winsB, rivalry.winsA, rivalry.ties);
      const pointLeader =
        rivalry.totalPointsA === rivalry.totalPointsB
          ? null
          : rivalry.totalPointsA > rivalry.totalPointsB
            ? managerA
            : managerB;
      const pointGap = Math.abs(rivalry.totalPointsA - rivalry.totalPointsB);

      const formatGameSummary = (game: RivalryGame | undefined) => {
        if (!game) {
          return "No completed games";
        }

        return formatGameResult(game, managerA, managerB).summary;
      };

      return {
        key,
        managerA,
        managerB,
        winsA: rivalry.winsA,
        winsB: rivalry.winsB,
        ties: rivalry.ties,
        gamesPlayed: games.length,
        totalPointsA: rivalry.totalPointsA,
        totalPointsB: rivalry.totalPointsB,
        averageMargin,
        recordSummary: leaderName
          ? `${leaderName} leads ${leaderRecord}`
          : `Series tied ${formatRecord(rivalry.winsA, rivalry.winsB, rivalry.ties)}`,
        pointsSummary: pointLeader
          ? `${pointLeader.displayName} leads total points by ${pointGap.toFixed(1)}`
          : "Total points are dead even",
        closestGameSummary: `Closest finish: ${formatGameSummary(closestGame)}`,
        blowoutSummary: `Biggest blowout: ${formatGameSummary(biggestBlowout)}`,
        lastPlayedSummary: latestGame
          ? `Last played ${latestGame.season} W${latestGame.week}`
          : "No recent meeting",
        streakSummary,
        rivalryScore:
          games.length * 10 -
          Math.abs(rivalry.winsA - rivalry.winsB) * 2 -
          Math.abs(rivalry.totalPointsA - rivalry.totalPointsB) / 25,
        headline: buildHeadline(
          managerA,
          managerB,
          games.length,
          winGap,
          averageMargin
        ),
        blurb: buildBlurb(
          managerA,
          managerB,
          rivalry.winsA,
          rivalry.winsB,
          rivalry.ties,
          rivalry.totalPointsA,
          rivalry.totalPointsB,
          averageMargin,
          latestGame,
          streakSummary
        ),
        heatLabel: heat.label,
        heatToneClass: heat.className,
        signatureMoments,
        games: [...games].reverse().map((game) => ({
          ...game,
          ...formatGameResult(game, managerA, managerB),
        })),
      } satisfies RivalryCard;
    })
    .sort((left, right) => {
      if (right.gamesPlayed !== left.gamesPlayed) {
        return right.gamesPlayed - left.gamesPlayed;
      }

      if (right.rivalryScore !== left.rivalryScore) {
        return right.rivalryScore - left.rivalryScore;
      }

      return left.managerA.displayName.localeCompare(right.managerA.displayName);
    });
});

const managerOptions = computed(() => {
  const options = new Map<string, string>();

  rivalries.value.forEach((rivalry) => {
    options.set(rivalry.managerA.userId, rivalry.managerA.displayName);
    options.set(rivalry.managerB.userId, rivalry.managerB.displayName);
  });

  return Array.from(options.entries())
    .map(([userId, displayName]) => ({ userId, displayName }))
    .sort((left, right) => left.displayName.localeCompare(right.displayName));
});

const filteredRivalries = computed(() => {
  if (selectedManager.value === "all") {
    return rivalries.value;
  }

  return rivalries.value.filter(
    (rivalry) =>
      rivalry.managerA.userId === selectedManager.value ||
      rivalry.managerB.userId === selectedManager.value
  );
});
</script>

<template>
  <Card class="overflow-hidden">
    <div class="border-b bg-secondary/40 px-4 py-4 sm:px-6">
      <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p class="text-lg font-semibold">League Rivalries</p>
          <p class="text-sm text-muted-foreground">
            Every all-time manager matchup, with enough context to see which
            series are actually heated.
          </p>
        </div>
        <div class="w-full lg:w-60">
          <p class="mb-1 text-xs font-medium uppercase text-muted-foreground">
            Filter by manager
          </p>
          <Select v-model="selectedManager">
            <SelectTrigger class="w-full">
              <SelectValue placeholder="All managers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All managers</SelectItem>
              <SelectItem
                v-for="manager in managerOptions"
                :key="manager.userId"
                :value="manager.userId"
              >
                {{ manager.displayName }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>

    <div class="p-4 sm:p-6">
      <p class="mb-4 text-sm text-muted-foreground">
        Showing {{ filteredRivalries.length }} rivalry{{
          filteredRivalries.length === 1 ? "" : "ies"
        }} sorted by volume and how competitive the series has been.
      </p>

      <div
        v-if="filteredRivalries.length > 0"
        class="grid gap-4 xl:grid-cols-2"
      >
        <div
          v-for="rivalry in filteredRivalries"
          :key="rivalry.key"
          class="rounded-xl border bg-background/70 p-4"
        >
          <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div class="space-y-2">
              <div class="flex flex-wrap items-center gap-2">
                <span
                  class="rounded-full px-2.5 py-1 text-xs font-semibold"
                  :class="rivalry.heatToneClass"
                >
                  {{ rivalry.heatLabel }}
                </span>
                <span class="text-xs uppercase tracking-wide text-muted-foreground">
                  Rivalry spotlight
                </span>
              </div>
              <p class="text-lg font-semibold leading-snug">
                {{ rivalry.headline }}
              </p>
              <p class="max-w-3xl text-sm text-muted-foreground">
                {{ rivalry.blurb }}
              </p>
              <div class="flex items-center gap-2">
                <div
                  v-if="rivalry.managerA.avatarImg"
                  class="h-9 w-9 overflow-hidden rounded-full border"
                >
                  <img
                    :src="rivalry.managerA.avatarImg"
                    :alt="rivalry.managerA.displayName"
                    class="h-full w-full object-cover"
                  />
                </div>
                <div
                  v-else
                  class="flex h-9 w-9 items-center justify-center rounded-full border bg-secondary text-xs font-semibold"
                >
                  {{ getInitials(rivalry.managerA.displayName) }}
                </div>
                <span class="text-base font-semibold">
                  {{ rivalry.managerA.displayName }}
                </span>
                <span class="text-muted-foreground">vs</span>
                <div
                  v-if="rivalry.managerB.avatarImg"
                  class="h-9 w-9 overflow-hidden rounded-full border"
                >
                  <img
                    :src="rivalry.managerB.avatarImg"
                    :alt="rivalry.managerB.displayName"
                    class="h-full w-full object-cover"
                  />
                </div>
                <div
                  v-else
                  class="flex h-9 w-9 items-center justify-center rounded-full border bg-secondary text-xs font-semibold"
                >
                  {{ getInitials(rivalry.managerB.displayName) }}
                </div>
                <span class="text-base font-semibold">
                  {{ rivalry.managerB.displayName }}
                </span>
              </div>
              <p class="text-sm text-muted-foreground">
                {{ rivalry.recordSummary }}
              </p>
            </div>

            <div class="flex flex-wrap gap-2 text-xs">
              <span class="rounded-full bg-secondary px-2.5 py-1 font-medium">
                {{ rivalry.gamesPlayed }} games
              </span>
              <span class="rounded-full bg-secondary px-2.5 py-1 font-medium">
                Avg margin {{ rivalry.averageMargin.toFixed(1) }}
              </span>
            </div>
          </div>

          <div class="mt-4 rounded-lg border bg-card p-3">
            <div class="mb-3 flex items-center justify-between">
              <p class="text-xs uppercase text-muted-foreground">
                Matchup timeline
              </p>
              <p class="text-xs text-muted-foreground">
                Most recent on the left
              </p>
            </div>
            <div class="flex flex-wrap gap-2">
              <div
                v-for="game in rivalry.games"
                :key="`timeline-${rivalry.key}-${game.season}-${game.week}`"
                class="group relative"
              >
                <div
                  class="h-4 w-4 rounded-full border"
                  :class="
                    game.winnerUserId === null
                      ? 'bg-slate-300 dark:bg-slate-600'
                      : game.winnerUserId === rivalry.managerA.userId
                        ? 'bg-orange-500'
                        : 'bg-emerald-500'
                  "
                  :title="game.summary"
                />
              </div>
            </div>
            <div class="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span class="flex items-center gap-1.5">
                <span class="h-2.5 w-2.5 rounded-full bg-orange-500" />
                {{ rivalry.managerA.displayName }} win
              </span>
              <span class="flex items-center gap-1.5">
                <span class="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                {{ rivalry.managerB.displayName }} win
              </span>
              <span class="flex items-center gap-1.5">
                <span class="h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                Tie
              </span>
            </div>
          </div>

          <div class="mt-4 grid gap-3 sm:grid-cols-2">
            <div class="rounded-lg border bg-card p-3">
              <p class="text-xs uppercase text-muted-foreground">Series score</p>
              <p class="mt-1 text-sm font-medium">
                {{ formatRecord(rivalry.winsA, rivalry.winsB, rivalry.ties) }}
              </p>
            </div>
            <div class="rounded-lg border bg-card p-3">
              <p class="text-xs uppercase text-muted-foreground">Points edge</p>
              <p class="mt-1 text-sm font-medium">
                {{ rivalry.pointsSummary }}
              </p>
            </div>
            <div class="rounded-lg border bg-card p-3">
              <p class="text-xs uppercase text-muted-foreground">Current trend</p>
              <p class="mt-1 text-sm font-medium">
                {{ rivalry.streakSummary }}
              </p>
            </div>
            <div class="rounded-lg border bg-card p-3">
              <p class="text-xs uppercase text-muted-foreground">Most recent</p>
              <p class="mt-1 text-sm font-medium">
                {{ rivalry.lastPlayedSummary }}
              </p>
            </div>
            <div class="rounded-lg border bg-card p-3">
              <p class="text-xs uppercase text-muted-foreground">Closest game</p>
              <p class="mt-1 text-sm font-medium">
                {{ rivalry.closestGameSummary }}
              </p>
            </div>
            <div class="rounded-lg border bg-card p-3">
              <p class="text-xs uppercase text-muted-foreground">
                Biggest blowout
              </p>
              <p class="mt-1 text-sm font-medium">
                {{ rivalry.blowoutSummary }}
              </p>
            </div>
          </div>

          <div class="mt-4 rounded-lg border bg-card p-3">
            <p class="mb-3 text-xs uppercase text-muted-foreground">
              Signature moments
            </p>
            <div class="grid gap-2 sm:grid-cols-2">
              <div
                v-for="moment in rivalry.signatureMoments"
                :key="moment"
                class="rounded-md border bg-background/70 px-3 py-2 text-sm"
              >
                {{ moment }}
              </div>
            </div>
          </div>

          <div class="mt-4 rounded-lg border bg-card p-3">
            <div class="mb-3 flex items-center justify-between">
              <p class="text-xs uppercase text-muted-foreground">
                All matchups
              </p>
              <p class="text-xs text-muted-foreground">
                {{ rivalry.games.length }} total
              </p>
            </div>
            <div class="space-y-2">
              <div
                v-for="game in rivalry.games"
                :key="`${rivalry.key}-${game.season}-${game.week}`"
                class="flex flex-col gap-1 rounded-md border bg-background/70 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p class="text-sm font-medium">
                    {{ game.season }} Week {{ game.week }}
                  </p>
                  <p class="text-xs text-muted-foreground">
                    {{ rivalry.managerA.displayName }} {{ game.pointsA.toFixed(1) }}
                    -
                    {{ game.pointsB.toFixed(1) }} {{ rivalry.managerB.displayName }}
                  </p>
                </div>
                <p class="text-sm text-muted-foreground">
                  {{ game.resultLabel }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p v-else class="text-sm text-muted-foreground">
        No all-time rivalries found for this manager yet.
      </p>
    </div>
  </Card>
</template>
