import type { Player, WeeklyWaiver } from "@/types/apiTypes";
import type { Bracket } from "@/types/apiTypes";
import type {
  PremiumReport,
  TableDataType,
  WeeklyRecapVideoProps,
} from "@/types/types";
import { getOrdinalSuffix } from "@/lib/format";
import { getManagerDisplayName } from "@/lib/manager";

export type WeeklyReportPlayer = Omit<Player, "name"> & {
  name?: string | null;
};

export interface PerformerGroup {
  playerPoints: number[];
  playerNames: WeeklyReportPlayer[];
  user: string;
}

export interface PerformerEntry {
  player: WeeklyReportPlayer;
  points: number;
  user: string;
}

export interface WeeklyAward {
  id: string;
  title: string;
  teamName: string;
  description: string;
  metricLabel: string;
  metricValue: string;
}

export type ReportPlayer = {
  name: string;
  team: string;
  points: number;
};

export type ReportTeam = {
  name: string;
  result: "win" | "loss" | "tie";
  pointsScored: number;
  weeklyScoreRank: number;
  starters: ReportPlayer[];
  bench: ReportPlayer[];
};

export type RegularSeasonReportTeam = ReportTeam & {
  recordAfterWeek: string;
  rankAfterWeek: number;
};

export type PlayoffReportTeam = ReportTeam & {
  bracket: "winners" | "losers" | "unknown";
};

export type PremiumReportPlayer = ReportPlayer;

type PremiumLineupPlayer = PremiumReportPlayer & {
  position: string;
  slot: string;
};

export type PremiumLineupDecision = {
  benched: PremiumReportPlayer;
  started: PremiumReportPlayer;
  pointsLost: number;
};

export type PremiumWaiverMove = {
  playerName: string;
  acquisitionType: "waiver" | "free_agent";
  faabBid?: number;
  startedThisWeek: boolean;
  pointsScored: number | null;
};

export type PreviousTeamMatchupResult = {
  week: number;
  opponentName: string;
  result: "win" | "loss" | "tie";
  pointsScored: number;
  opponentPoints: number;
  margin: number;
};

export type PremiumReportTeam = {
  name: string;
  result: "win" | "loss" | "tie";
  pointsScored: number;
  weeklyScoreRank: number;
  starters: PremiumReportPlayer[];
  bench: PremiumReportPlayer[];
  optimalPoints: number;
  pointsLeftOnBench: number;
  lineupEfficiency: number;
  bestBenchSwap: PremiumLineupDecision | null;
  seasonAverageThroughWeek: number;
  seasonAverageBeforeWeek: number | null;
  scoreVsSeasonAverageBeforeWeek: number | null;
  previousMatchupResult?: PreviousTeamMatchupResult;
  waiverMoves?: PremiumWaiverMove[];
};

export type RegularSeasonPremiumReportTeam = PremiumReportTeam & {
  currentStreak: string;
  recordBeforeWeek: string;
  recordAfterWeek: string;
  rankBeforeWeek: number;
  rankAfterWeek: number;
  rankChange: number;
};

export type PlayoffPremiumReportTeam = PremiumReportTeam & {
  bracket: "winners" | "losers" | "unknown";
};

export type PlayoffMatchupContext = {
  bracket: "winners" | "losers" | "unknown";
  round: number | null;
  placement: number | null;
  isChampionship: boolean;
  leagueChampion: string | null;
};

export type PreviousHeadToHeadResult = {
  week: number;
  margin: number;
  teams: Array<{
    name: string;
    pointsScored: number;
    result: "win" | "loss" | "tie";
  }>;
};

type EspnPlayoffMatchup = {
  id?: number;
  matchupPeriodId?: number;
  playoffTierType?: string;
  winner?: "HOME" | "AWAY" | "UNDECIDED";
  home?: { teamId?: number };
  away?: { teamId?: number };
};

export type PremiumReportMatchup = Record<string, unknown> & {
  teams: Array<RegularSeasonPremiumReportTeam | PlayoffPremiumReportTeam>;
  previousHeadToHeadResult?: PreviousHeadToHeadResult;
  playoffContext?: PlayoffMatchupContext;
};

export type ReportMatchup = Record<string, unknown> & {
  teams: Array<RegularSeasonReportTeam | PlayoffReportTeam>;
  playoffContext?: PlayoffMatchupContext;
};

export const getPlayoffRoundMetadata = ({
  currentWeek,
  regularSeasonLength,
  playoffTeams,
  espnPlayoffMatchupPeriods = [],
}: {
  currentWeek: number;
  regularSeasonLength: number;
  playoffTeams: number;
  espnPlayoffMatchupPeriods?: number[][];
}) => {
  const espnRoundIndex = espnPlayoffMatchupPeriods.findIndex((periods) =>
    periods.includes(currentWeek)
  );
  const totalRounds =
    espnRoundIndex >= 0
      ? espnPlayoffMatchupPeriods.length
      : Math.max(1, Math.ceil(Math.log2(Math.max(playoffTeams, 2))));
  const roundIndex =
    espnRoundIndex >= 0
      ? espnRoundIndex
      : Math.max(0, currentWeek - regularSeasonLength - 1);
  const roundsRemaining = Math.max(1, totalRounds - roundIndex);

  if (roundsRemaining === 1) {
    return {
      playoffRound: "Final Championship round",
      championshipMatchup: true,
    };
  }
  if (roundsRemaining === 2) {
    return {
      playoffRound: "Semifinal round",
      championshipMatchup: false,
    };
  }
  if (roundsRemaining === 3) {
    return {
      playoffRound: "Quarterfinal round",
      championshipMatchup: false,
    };
  }

  return {
    playoffRound: `Playoff round ${roundIndex + 1}`,
    championshipMatchup: false,
  };
};

export const getPlayerLabel = (player: WeeklyReportPlayer) =>
  player.name ? player.name : `${player.team} Defense`;

export const getManagerName = (user: TableDataType, showUsernames: boolean) => {
  return getManagerDisplayName(user, showUsernames);
};

const getWaiverPlayerName = (
  playerId: string,
  playerLookup: Map<string, Player>
) => {
  const player = playerLookup.get(playerId);
  if (!player) {
    return playerId;
  }
  return player.name || (player.team ? `${player.team} Defense` : playerId);
};

export const buildWeeklyWaiverContext = ({
  waivers,
  tableData,
  playerLookup,
  weekIndex,
}: {
  waivers: WeeklyWaiver[];
  tableData: TableDataType[];
  playerLookup: Map<string, Player>;
  weekIndex: number;
}): Record<number, PremiumWaiverMove[]> => {
  const movesByRoster: Record<number, PremiumWaiverMove[]> = {};

  waivers
    .filter(
      (transaction) =>
        transaction.status === "complete" &&
        transaction.leg === weekIndex + 1 &&
        (transaction.type === "waiver" || transaction.type === "free_agent") &&
        transaction.adds
    )
    .forEach((transaction) => {
      Object.entries(transaction.adds ?? {}).forEach(([playerId, rosterId]) => {
        const team = tableData.find((entry) => entry.rosterId === rosterId);
        if (!team) {
          return;
        }

        const starterIndex = team.starters[weekIndex]?.indexOf(playerId) ?? -1;
        const benchIndex =
          team.benchPlayers[weekIndex]?.indexOf(playerId) ?? -1;
        const pointsScored =
          starterIndex >= 0
            ? (team.starterPoints[weekIndex]?.[starterIndex] ?? null)
            : benchIndex >= 0
              ? (team.benchPoints[weekIndex]?.[benchIndex] ?? null)
              : null;
        const move: PremiumWaiverMove = {
          playerName: getWaiverPlayerName(playerId, playerLookup),
          acquisitionType:
            transaction.type === "waiver" ? "waiver" : "free_agent",
          startedThisWeek: starterIndex >= 0,
          pointsScored,
        };

        if (
          transaction.type === "waiver" &&
          transaction.settings?.waiver_bid != null
        ) {
          move.faabBid = transaction.settings.waiver_bid;
        }

        movesByRoster[rosterId] ??= [];
        movesByRoster[rosterId].push(move);
      });
    });

  return movesByRoster;
};

const roundPoints = (points: number) => Math.round(points * 100) / 100;

const getRecordCountsForWeek = (
  recordString: string | null | undefined,
  completedWeeks: number,
  medianScoring: boolean
) => {
  const resultCount = completedWeeks * (medianScoring ? 2 : 1);
  const results = (recordString ?? "").slice(0, resultCount);
  return {
    wins: [...results].filter((result) => result === "W").length,
    losses: [...results].filter((result) => result === "L").length,
    ties: [...results].filter((result) => result === "T").length,
  };
};

const formatRecord = ({
  wins,
  losses,
  ties,
}: {
  wins: number;
  losses: number;
  ties: number;
}) => `${wins}-${losses}${ties ? `-${ties}` : ""}`;

const getCurrentStreak = (
  recordString: string | null | undefined,
  completedWeeks: number,
  medianScoring: boolean
) => {
  const resultCount = completedWeeks * (medianScoring ? 2 : 1);
  const results = (recordString ?? "").slice(0, resultCount);
  const latestResult = results[results.length - 1];
  if (!latestResult) {
    return "N/A";
  }

  let streak = 0;
  for (let index = results.length - 1; index >= 0; index -= 1) {
    if (results[index] !== latestResult) {
      break;
    }
    streak += 1;
  }
  return `${latestResult}${streak}`;
};

const getPointsThroughWeek = (user: TableDataType, completedWeeks: number) =>
  user.points
    .slice(0, completedWeeks)
    .reduce((total, points) => total + (Number(points) || 0), 0);

const getStandingsForWeek = (
  tableData: TableDataType[],
  completedWeeks: number,
  medianScoring: boolean
) =>
  [...tableData]
    .map((user) => ({
      rosterId: user.rosterId,
      ...getRecordCountsForWeek(
        user.recordByWeek,
        completedWeeks,
        medianScoring
      ),
      pointsFor: getPointsThroughWeek(user, completedWeeks),
    }))
    .sort(
      (a, b) =>
        b.wins - a.wins ||
        a.losses - b.losses ||
        b.ties - a.ties ||
        b.pointsFor - a.pointsFor
    )
    .reduce((rankMap, user, index) => {
      rankMap.set(user.rosterId, index + 1);
      return rankMap;
    }, new Map<number, number>());

const getEligiblePositions = (slot: string) => {
  const normalizedSlot = slot.toUpperCase();
  const positionGroups: Record<string, string[]> = {
    FLEX: ["RB", "WR", "TE"],
    "RB/WR/TE": ["RB", "WR", "TE"],
    REC_FLEX: ["WR", "TE"],
    "WR/TE": ["WR", "TE"],
    WRRB_FLEX: ["RB", "WR"],
    "RB/WR": ["RB", "WR"],
    SUPER_FLEX: ["QB", "RB", "WR", "TE"],
    OP: ["QB", "RB", "WR", "TE"],
    "D/ST": ["DEF"],
    DST: ["DEF"],
    DEF: ["DEF"],
  };
  return positionGroups[normalizedSlot] ?? [normalizedSlot];
};

const canFillSlot = (player: PremiumLineupPlayer, slot: string) =>
  getEligiblePositions(slot).includes(player.position.toUpperCase());

const getOptimalPoints = (
  players: PremiumLineupPlayer[],
  lineupSlots: string[]
) => {
  const slots = lineupSlots
    .filter((slot) => slot.toUpperCase() !== "BN")
    .sort(
      (a, b) => getEligiblePositions(a).length - getEligiblePositions(b).length
    );
  const memo = new Map<string, number>();
  const usedPlayers = Array(players.length).fill(false);
  const assignPlayer = (slotIndex: number): number => {
    if (slotIndex === slots.length) {
      return 0;
    }

    const memoKey = `${slotIndex}:${usedPlayers
      .map((isUsed) => (isUsed ? "1" : "0"))
      .join("")}`;
    const cachedScore = memo.get(memoKey);
    if (cachedScore !== undefined) {
      return cachedScore;
    }

    let bestRemainingScore = Number.NEGATIVE_INFINITY;
    players.forEach((player, playerIndex) => {
      if (!usedPlayers[playerIndex] && canFillSlot(player, slots[slotIndex])) {
        usedPlayers[playerIndex] = true;
        const remainingScore = assignPlayer(slotIndex + 1);
        usedPlayers[playerIndex] = false;
        if (remainingScore !== Number.NEGATIVE_INFINITY) {
          bestRemainingScore = Math.max(
            bestRemainingScore,
            player.points + remainingScore
          );
        }
      }
    });
    memo.set(memoKey, bestRemainingScore);
    return bestRemainingScore;
  };

  const bestScore = assignPlayer(0);
  return bestScore === Number.NEGATIVE_INFINITY ? 0 : roundPoints(bestScore);
};

const getBestBenchSwap = (
  starters: PremiumLineupPlayer[],
  bench: PremiumLineupPlayer[]
): PremiumLineupDecision | null => {
  let bestDecision: PremiumLineupDecision | null = null;
  starters.forEach((starter) => {
    bench.forEach((benched) => {
      const pointsLost = roundPoints(benched.points - starter.points);
      if (
        pointsLost > 0 &&
        canFillSlot(benched, starter.slot) &&
        (!bestDecision || pointsLost > bestDecision.pointsLost)
      ) {
        bestDecision = {
          benched: {
            name: benched.name,
            team: benched.team,
            points: benched.points,
          },
          started: {
            name: starter.name,
            team: starter.team,
            points: starter.points,
          },
          pointsLost,
        };
      }
    });
  });
  return bestDecision;
};

const buildPremiumPlayers = (
  players: WeeklyReportPlayer[],
  points: number[],
  slots: string[],
  fallbackSlot: string
) =>
  players.map(
    (player, index): PremiumLineupPlayer => ({
      name: getPlayerLabel(player),
      position: player.position,
      team: player.team,
      slot: slots[index] ?? fallbackSlot,
      points: points[index] ?? 0,
    })
  );

const stripLineupMetadata = ({
  name,
  team,
  points,
}: PremiumLineupPlayer): PremiumReportPlayer => ({
  name,
  team,
  points,
});

const buildReportPlayers = (
  players: WeeklyReportPlayer[],
  points: number[],
  limit?: number
) =>
  players.slice(0, limit).map(
    (player, index): ReportPlayer => ({
      name: getPlayerLabel(player),
      team: player.team,
      points: points[index] ?? 0,
    })
  );

const getWeeklyScoreRanks = (tableData: TableDataType[], weekIndex: number) =>
  [...tableData]
    .filter((user) => user.matchups[weekIndex] !== null)
    .sort((a, b) => b.points[weekIndex] - a.points[weekIndex])
    .reduce((rankMap, user, index) => {
      rankMap.set(user.rosterId, index + 1);
      return rankMap;
    }, new Map<number, number>());

const getTeamResult = (
  tableData: TableDataType[],
  matchupNumber: number | null,
  weekIndex: number,
  pointsScored: number
): ReportTeam["result"] => {
  const matchupScores = tableData
    .filter((team) => team.matchups[weekIndex] === matchupNumber)
    .map((team) => team.points[weekIndex]);
  if (matchupScores.length === 1) {
    return "win";
  }
  const highestScore = Math.max(...matchupScores);
  const lowestScore = Math.min(...matchupScores);
  if (highestScore === lowestScore) {
    return "tie";
  }
  return pointsScored === highestScore ? "win" : "loss";
};

const getPreviousTeamMatchupResult = ({
  team,
  tableData,
  weekIndex,
  showUsernames,
}: {
  team: TableDataType;
  tableData: TableDataType[];
  weekIndex: number;
  showUsernames: boolean;
}): PreviousTeamMatchupResult | null => {
  for (
    let previousWeekIndex = weekIndex - 1;
    previousWeekIndex >= 0;
    previousWeekIndex -= 1
  ) {
    const priorMatchupId = team.matchups[previousWeekIndex];
    if (priorMatchupId == null) {
      continue;
    }

    const opponent = tableData.find(
      (candidate) =>
        candidate.rosterId !== team.rosterId &&
        candidate.matchups[previousWeekIndex] === priorMatchupId
    );
    if (!opponent) {
      continue;
    }

    const pointsScored = Number(team.points[previousWeekIndex]);
    const opponentPoints = Number(opponent.points[previousWeekIndex]);
    if (!Number.isFinite(pointsScored) || !Number.isFinite(opponentPoints)) {
      continue;
    }

    return {
      week: previousWeekIndex + 1,
      opponentName: getManagerName(opponent, showUsernames),
      result:
        pointsScored === opponentPoints
          ? "tie"
          : pointsScored > opponentPoints
            ? "win"
            : "loss",
      pointsScored,
      opponentPoints,
      margin: roundPoints(Math.abs(pointsScored - opponentPoints)),
    };
  }

  return null;
};

const getPreviousHeadToHeadResult = ({
  tableData,
  rosterIds,
  weekIndex,
  showUsernames,
}: {
  tableData: TableDataType[];
  rosterIds: number[];
  weekIndex: number;
  showUsernames: boolean;
}): PreviousHeadToHeadResult | null => {
  const matchupTeams = rosterIds
    .map((rosterId) =>
      tableData.find((team) => team.rosterId === rosterId)
    )
    .filter((team): team is TableDataType => Boolean(team));

  if (matchupTeams.length < 2) {
    return null;
  }

  for (
    let previousWeekIndex = weekIndex - 1;
    previousWeekIndex >= 0;
    previousWeekIndex -= 1
  ) {
    const priorMatchupId = matchupTeams[0].matchups[previousWeekIndex];
    if (
      priorMatchupId == null ||
      !matchupTeams.every(
        (team) => team.matchups[previousWeekIndex] === priorMatchupId
      )
    ) {
      continue;
    }

    const scores = matchupTeams.map((team) =>
      Number(team.points[previousWeekIndex])
    );
    if (scores.some((score) => !Number.isFinite(score))) {
      continue;
    }

    const highestScore = Math.max(...scores);
    const lowestScore = Math.min(...scores);
    const tied = highestScore === lowestScore;
    const teams = matchupTeams
      .map((team, index) => ({
        name: getManagerName(team, showUsernames),
        pointsScored: scores[index],
        result: tied
          ? ("tie" as const)
          : scores[index] === highestScore
            ? ("win" as const)
            : ("loss" as const),
      }))
      .sort((a, b) => b.pointsScored - a.pointsScored);

    return {
      week: previousWeekIndex + 1,
      margin: roundPoints(highestScore - lowestScore),
      teams,
    };
  }

  return null;
};

export const getSortedTableData = (
  tableData: TableDataType[],
  weekIndex: number
) => {
  if (tableData[0]?.points) {
    return [...tableData].sort(
      (a, b) => a.points[weekIndex] - b.points[weekIndex]
    );
  }
  return [];
};

export const getMatchupWinner = (
  tableData: TableDataType[],
  matchupIndex: number | null,
  weekIndex: number
) => {
  const pointsArray = tableData
    .filter((user) => user.matchups[weekIndex] === matchupIndex)
    .map((user) => user.points[weekIndex]);
  return Math.max(...pointsArray);
};

export const getBracketRosterIds = (bracket: Bracket[] = []) => {
  const result: number[] = [];
  bracket.forEach((matchup) => {
    result.push(matchup.t1);
    result.push(matchup.t2);
  });
  return result;
};

const getPlayoffMatchupContext = (
  rosterIds: number[],
  winnersBracket: Bracket[],
  losersBracket: Bracket[],
  espnWinnersBracket: EspnPlayoffMatchup[],
  espnLosersBracket: EspnPlayoffMatchup[],
  getTeamName: (rosterId: number) => string | null
): PlayoffMatchupContext => {
  const matchesRosterPair = (matchup: Bracket) =>
    rosterIds.length === 2 &&
    rosterIds.includes(matchup.t1) &&
    rosterIds.includes(matchup.t2);
  const findLatestMatchup = (bracket: Bracket[]) =>
    bracket
      .filter(matchesRosterPair)
      .sort(
        (a, b) => b.r - a.r || Number(Boolean(b.p)) - Number(Boolean(a.p))
      )[0];
  const winnersMatchup = findLatestMatchup(winnersBracket);
  if (winnersMatchup) {
    const isChampionship = winnersMatchup.p === 1;
    return {
      bracket: "winners",
      round: winnersMatchup.r ?? null,
      placement: winnersMatchup.p ?? null,
      isChampionship,
      leagueChampion:
        isChampionship && winnersMatchup.w
          ? getTeamName(winnersMatchup.w)
          : null,
    };
  }

  const losersMatchup = findLatestMatchup(losersBracket);
  if (losersMatchup) {
    return {
      bracket: "losers",
      round: losersMatchup.r ?? null,
      placement: losersMatchup.p ?? null,
      isChampionship: false,
      leagueChampion: null,
    };
  }

  const matchesEspnRosterPair = (matchup: EspnPlayoffMatchup) => {
    const matchupRosterIds = [
      matchup.home?.teamId,
      matchup.away?.teamId,
    ].filter((rosterId): rosterId is number => rosterId != null);
    return (
      rosterIds.length === 2 &&
      matchupRosterIds.length === 2 &&
      rosterIds.every((rosterId) => matchupRosterIds.includes(rosterId))
    );
  };
  const espnWinnersMatchup = espnWinnersBracket.find(matchesEspnRosterPair);
  if (espnWinnersMatchup) {
    const mainBracketMatchups = espnWinnersBracket.filter(
      (matchup) => matchup.playoffTierType === "WINNERS_BRACKET"
    );
    const roundPeriods = [
      ...new Set(
        mainBracketMatchups
          .map((matchup) => matchup.matchupPeriodId)
          .filter((period): period is number => period != null)
      ),
    ].sort((a, b) => a - b);
    const finalPeriod = roundPeriods[roundPeriods.length - 1];
    const isChampionship =
      espnWinnersMatchup.playoffTierType === "WINNERS_BRACKET" &&
      espnWinnersMatchup.matchupPeriodId === finalPeriod;
    const winnerRosterId =
      espnWinnersMatchup.winner === "HOME"
        ? espnWinnersMatchup.home?.teamId
        : espnWinnersMatchup.winner === "AWAY"
          ? espnWinnersMatchup.away?.teamId
          : undefined;
    return {
      bracket: "winners",
      round:
        espnWinnersMatchup.matchupPeriodId == null
          ? null
          : roundPeriods.indexOf(espnWinnersMatchup.matchupPeriodId) + 1,
      placement: isChampionship ? 1 : null,
      isChampionship,
      leagueChampion:
        isChampionship && winnerRosterId ? getTeamName(winnerRosterId) : null,
    };
  }

  const espnLosersMatchup = espnLosersBracket.find(matchesEspnRosterPair);
  if (espnLosersMatchup) {
    return {
      bracket: "losers",
      round: null,
      placement: null,
      isChampionship: false,
      leagueChampion: null,
    };
  }

  return {
    bracket: "unknown",
    round: null,
    placement: null,
    isChampionship: false,
    leagueChampion: null,
  };
};

export const getWeeklyPerformers = ({
  tableData,
  playerNames,
  weekIndex,
  showUsernames,
  sortDirection,
  limit = 6,
}: {
  tableData: TableDataType[];
  playerNames: WeeklyReportPlayer[][];
  weekIndex: number;
  showUsernames: boolean;
  sortDirection: "asc" | "desc";
  limit?: number;
}) => {
  const groups: PerformerGroup[] = [];
  tableData.forEach((user, index) => {
    if (user.matchups[weekIndex]) {
      groups.push({
        playerPoints: user.starterPoints[weekIndex],
        playerNames: playerNames[index] ?? [],
        user: showUsernames ? user.username : user.name,
      });
    }
  });

  return groups
    .flatMap((group) =>
      group.playerNames.map(
        (player, idx): PerformerEntry => ({
          player,
          points: group.playerPoints[idx] ?? 0,
          user: group.user,
        })
      )
    )
    .sort((a, b) =>
      sortDirection === "desc" ? b.points - a.points : a.points - b.points
    )
    .slice(0, limit);
};

export const getBenchPerformers = ({
  tableData,
  benchPlayerNames,
  weekIndex,
  showUsernames,
  limit = 6,
}: {
  tableData: TableDataType[];
  benchPlayerNames: WeeklyReportPlayer[][];
  weekIndex: number;
  showUsernames: boolean;
  limit?: number;
}) => {
  const groups: PerformerGroup[] = [];
  tableData.forEach((user, index) => {
    if (user.matchups[weekIndex]) {
      groups.push({
        playerPoints: user.benchPoints[weekIndex],
        playerNames: benchPlayerNames[index] ?? [],
        user: showUsernames ? user.username : user.name,
      });
    }
  });

  return groups
    .flatMap((group) =>
      group.playerNames.map(
        (player, idx): PerformerEntry => ({
          player,
          points: group.playerPoints[idx] ?? 0,
          user: group.user,
        })
      )
    )
    .sort((a, b) => b.points - a.points)
    .slice(0, limit);
};

const formatPoints = (points: number) => roundPoints(points).toFixed(2);

const getTeamLineupProfile = ({
  tableData,
  playerNames,
  benchPlayerNames,
  weekIndex,
  showUsernames,
  rosterPositions = [],
}: {
  tableData: TableDataType[];
  playerNames: WeeklyReportPlayer[][];
  benchPlayerNames: WeeklyReportPlayer[][];
  weekIndex: number;
  showUsernames: boolean;
  rosterPositions?: string[];
}) => {
  const weeklyScoreRanks = getWeeklyScoreRanks(tableData, weekIndex);

  return tableData
    .map((user, index) => {
      const matchupNumber = user.matchups[weekIndex];
      if (matchupNumber == null) {
        return null;
      }

      const lineupSlots =
        rosterPositions.length > 0
          ? rosterPositions
          : (playerNames[index] ?? []).map((player) => player.position);
      const starters = buildPremiumPlayers(
        playerNames[index] ?? [],
        user.starterPoints[weekIndex] ?? [],
        lineupSlots,
        "STARTER"
      );
      const bench = buildPremiumPlayers(
        benchPlayerNames[index] ?? [],
        user.benchPoints[weekIndex] ?? [],
        [],
        "BN"
      );
      const optimalPoints = getOptimalPoints(
        [...starters, ...bench],
        lineupSlots
      );
      const starterPoints = roundPoints(
        starters.reduce((total, player) => total + player.points, 0)
      );
      const opponentScores = tableData
        .filter(
          (team) =>
            team.rosterId !== user.rosterId &&
            team.matchups[weekIndex] === matchupNumber
        )
        .map((team) => team.points[weekIndex]);
      const opponentScore =
        opponentScores.length > 0 ? Math.max(...opponentScores) : null;
      const result = getTeamResult(
        tableData,
        matchupNumber,
        weekIndex,
        user.points[weekIndex]
      );
      const topStarter = [...starters].sort((a, b) => b.points - a.points)[0];

      return {
        rosterId: user.rosterId,
        name: getManagerName(user, showUsernames),
        pointsScored: user.points[weekIndex],
        result,
        opponentScore,
        weeklyScoreRank: weeklyScoreRanks.get(user.rosterId) ?? 0,
        teamsOutscored: tableData.filter(
          (team) =>
            team.matchups[weekIndex] != null &&
            team.points[weekIndex] < user.points[weekIndex]
        ).length,
        optimalPoints,
        starterPoints,
        pointsLeftOnBench: roundPoints(
          Math.max(0, optimalPoints - starterPoints)
        ),
        lineupEfficiency:
          optimalPoints > 0
            ? Math.round((starterPoints / optimalPoints) * 1000) / 1000
            : 0,
        bestBenchSwap: getBestBenchSwap(starters, bench),
        topStarter: topStarter
          ? {
              name: topStarter.name,
              points: topStarter.points,
              pointShare:
                starterPoints > 0
                  ? Math.round((topStarter.points / starterPoints) * 1000) /
                    1000
                  : 0,
            }
          : null,
      };
    })
    .filter((profile): profile is NonNullable<typeof profile> =>
      Boolean(profile)
    );
};

export const getWeeklyAwards = ({
  tableData,
  playerNames,
  benchPlayerNames,
  weekIndex,
  showUsernames,
  rosterPositions = [],
}: {
  tableData: TableDataType[];
  playerNames: WeeklyReportPlayer[][];
  benchPlayerNames: WeeklyReportPlayer[][];
  weekIndex: number;
  showUsernames: boolean;
  rosterPositions?: string[];
}): WeeklyAward[] => {
  const profiles = getTeamLineupProfile({
    tableData,
    playerNames,
    benchPlayerNames,
    weekIndex,
    showUsernames,
    rosterPositions,
  });

  if (profiles.length === 0) {
    return [];
  }

  const awards: WeeklyAward[] = [];
  const losers = profiles.filter((team) => team.result === "loss");
  const winners = profiles.filter((team) => team.result === "win");
  const teamCount = profiles.length;

  const selfInflicted =
    [...losers]
      .filter(
        (team) =>
          team.opponentScore != null &&
          team.bestBenchSwap &&
          team.bestBenchSwap.pointsLost >
            Math.max(0, team.opponentScore - team.pointsScored)
      )
      .sort(
        (a, b) =>
          (b.bestBenchSwap?.pointsLost ?? 0) -
          (a.bestBenchSwap?.pointsLost ?? 0)
      )[0] ??
    [...profiles]
      .filter((team) => team.bestBenchSwap)
      .sort(
        (a, b) =>
          (b.bestBenchSwap?.pointsLost ?? 0) -
          (a.bestBenchSwap?.pointsLost ?? 0)
      )[0];

  if (selfInflicted?.bestBenchSwap) {
    const margin =
      selfInflicted.opponentScore == null
        ? null
        : Math.abs(selfInflicted.opponentScore - selfInflicted.pointsScored);
    awards.push({
      id: "self-inflicted-wound",
      title: "Self-Inflicted Wound",
      teamName: selfInflicted.name,
      description:
        margin != null && selfInflicted.result === "loss"
          ? `${selfInflicted.bestBenchSwap.benched.name} outscored ${selfInflicted.bestBenchSwap.started.name} by ${formatPoints(selfInflicted.bestBenchSwap.pointsLost)}. ${selfInflicted.name} lost by ${formatPoints(margin)}, so the best bench swap was enough to flip the matchup.`
          : `${selfInflicted.bestBenchSwap.benched.name} outscored ${selfInflicted.bestBenchSwap.started.name} by ${formatPoints(selfInflicted.bestBenchSwap.pointsLost)}. It was the week's biggest missed lineup swap.`,
      metricLabel: "Swing",
      metricValue: `${formatPoints(selfInflicted.bestBenchSwap.pointsLost)} pts`,
    });
  }

  const gotAwayWithIt = [...winners]
    .filter((team) => team.optimalPoints > 0)
    .sort(
      (a, b) =>
        a.lineupEfficiency - b.lineupEfficiency ||
        b.pointsLeftOnBench - a.pointsLeftOnBench
    )[0];

  if (gotAwayWithIt) {
    awards.push({
      id: "got-away-with-it",
      title: "Got Away With It",
      teamName: gotAwayWithIt.name,
      description: `${gotAwayWithIt.name} won while using only ${Math.round(gotAwayWithIt.lineupEfficiency * 100)}% of their optimal lineup. They left ${formatPoints(gotAwayWithIt.pointsLeftOnBench)} possible points unused, but the matchup still broke their way.`,
      metricLabel: "Efficiency",
      metricValue: `${Math.round(gotAwayWithIt.lineupEfficiency * 100)}%`,
    });
  }

  const deservedBetter = [...losers].sort(
    (a, b) =>
      b.teamsOutscored - a.teamsOutscored ||
      a.weeklyScoreRank - b.weeklyScoreRank
  )[0];

  if (deservedBetter) {
    awards.push({
      id: "deserved-better",
      title: "Deserved Better",
      teamName: deservedBetter.name,
      description: `${deservedBetter.name} lost despite outscoring ${deservedBetter.teamsOutscored} of ${teamCount - 1} possible opponents. They finished ${deservedBetter.weeklyScoreRank}${getOrdinalSuffix(deservedBetter.weeklyScoreRank)} in weekly scoring and still took the loss.`,
      metricLabel: "Score rank",
      metricValue: `#${deservedBetter.weeklyScoreRank}`,
    });
  }

  const onePlayerCarry = [...profiles]
    .filter((team) => team.topStarter && team.starterPoints > 0)
    .sort(
      (a, b) =>
        (b.topStarter?.pointShare ?? 0) - (a.topStarter?.pointShare ?? 0)
    )[0];

  if (onePlayerCarry?.topStarter) {
    awards.push({
      id: "one-player-carry",
      title: "One-Player Carry",
      teamName: onePlayerCarry.name,
      description: `${onePlayerCarry.topStarter.name} supplied ${Math.round(onePlayerCarry.topStarter.pointShare * 100)}% of ${onePlayerCarry.name}'s starting lineup points. That one player accounted for ${formatPoints(onePlayerCarry.topStarter.points)} of their ${formatPoints(onePlayerCarry.starterPoints)} starter points.`,
      metricLabel: "Carry share",
      metricValue: `${Math.round(onePlayerCarry.topStarter.pointShare * 100)}%`,
    });
  }

  return awards.slice(0, 4);
};

export const buildReportPrompt = ({
  tableData,
  playerNames,
  benchPlayerNames,
  weekIndex,
  showUsernames,
  isPlayoffs,
  losersBracket = [],
  winnersBracket = [],
  espnLosersBracket = [],
  espnWinnersBracket = [],
  medianScoring = false,
}: {
  tableData: TableDataType[];
  playerNames: WeeklyReportPlayer[][];
  benchPlayerNames: WeeklyReportPlayer[][];
  weekIndex: number;
  showUsernames: boolean;
  isPlayoffs: boolean;
  losersBracket?: Bracket[];
  winnersBracket?: Bracket[];
  espnLosersBracket?: EspnPlayoffMatchup[];
  espnWinnersBracket?: EspnPlayoffMatchup[];
  medianScoring?: boolean;
}) => {
  const result: ReportMatchup[] = [];
  const weeklyScoreRanks = getWeeklyScoreRanks(tableData, weekIndex);
  const ranksAfterWeek = getStandingsForWeek(
    tableData,
    weekIndex + 1,
    medianScoring
  );
  const teamsByMatchup = new Map<
    number | null,
    Array<RegularSeasonReportTeam | PlayoffReportTeam>
  >();

  tableData.forEach((user, index) => {
    if (!user.matchups[weekIndex]) {
      return;
    }
    const matchupNumber = user.matchups[weekIndex];
    const baseTeam: ReportTeam = {
      name: getManagerName(user, showUsernames),
      result: getTeamResult(
        tableData,
        matchupNumber,
        weekIndex,
        user.points[weekIndex]
      ),
      pointsScored: user.points[weekIndex],
      weeklyScoreRank: weeklyScoreRanks.get(user.rosterId) ?? 0,
      starters: buildReportPlayers(
        playerNames[index] ?? [],
        user.starterPoints[weekIndex] ?? [],
        7
      ),
      bench: buildReportPlayers(
        benchPlayerNames[index] ?? [],
        user.benchPoints[weekIndex] ?? []
      ),
    };
    const matchupTeams = teamsByMatchup.get(matchupNumber) ?? [];

    if (isPlayoffs) {
      matchupTeams.push({
        ...baseTeam,
        bracket: "unknown",
      });
      teamsByMatchup.set(matchupNumber, matchupTeams);
      return;
    }

    matchupTeams.push({
      ...baseTeam,
      recordAfterWeek: formatRecord(
        getRecordCountsForWeek(user.recordByWeek, weekIndex + 1, medianScoring)
      ),
      rankAfterWeek: ranksAfterWeek.get(user.rosterId) ?? 0,
    });
    teamsByMatchup.set(matchupNumber, matchupTeams);
  });

  teamsByMatchup.forEach((teams, matchupNumber) => {
    const matchup: ReportMatchup = {
      teams: [...teams].sort((a, b) => b.pointsScored - a.pointsScored),
    };
    if (isPlayoffs) {
      const rosterIds = tableData
        .filter((user) => user.matchups[weekIndex] === matchupNumber)
        .map((user) => user.rosterId);
      matchup.playoffContext = getPlayoffMatchupContext(
        rosterIds,
        winnersBracket,
        losersBracket,
        espnWinnersBracket,
        espnLosersBracket,
        (rosterId) => {
          const user = tableData.find((team) => team.rosterId === rosterId);
          return user ? getManagerName(user, showUsernames) : null;
        }
      );
      matchup.teams = matchup.teams.map((team) => ({
        ...team,
        bracket: matchup.playoffContext?.bracket ?? "unknown",
      }));
    }
    result.push(matchup);
  });

  return result;
};

export const buildPremiumReportPrompt = ({
  tableData,
  playerNames,
  benchPlayerNames,
  weekIndex,
  showUsernames,
  isPlayoffs,
  losersBracketIds,
  winnersBracketIds,
  losersBracket = [],
  winnersBracket = [],
  espnLosersBracket = [],
  espnWinnersBracket = [],
  rosterPositions = [],
  medianScoring = false,
  waiverMovesByRoster = {},
}: {
  tableData: TableDataType[];
  playerNames: WeeklyReportPlayer[][];
  benchPlayerNames: WeeklyReportPlayer[][];
  weekIndex: number;
  showUsernames: boolean;
  isPlayoffs: boolean;
  losersBracketIds: number[];
  winnersBracketIds: number[];
  losersBracket?: Bracket[];
  winnersBracket?: Bracket[];
  espnLosersBracket?: EspnPlayoffMatchup[];
  espnWinnersBracket?: EspnPlayoffMatchup[];
  rosterPositions?: string[];
  medianScoring?: boolean;
  waiverMovesByRoster?: Record<number, PremiumWaiverMove[]>;
}) => {
  const result: PremiumReportMatchup[] = [];
  const weeklyScoreRanks = getWeeklyScoreRanks(tableData, weekIndex);
  const ranksBeforeWeek = getStandingsForWeek(
    tableData,
    weekIndex,
    medianScoring
  );
  const ranksAfterWeek = getStandingsForWeek(
    tableData,
    weekIndex + 1,
    medianScoring
  );
  const teamsByMatchup = new Map<
    number | null,
    Array<RegularSeasonPremiumReportTeam | PlayoffPremiumReportTeam>
  >();

  tableData.forEach((user, index) => {
    if (!user.matchups[weekIndex]) {
      return;
    }
    const matchupNumber = user.matchups[weekIndex];
    const result = getTeamResult(
      tableData,
      matchupNumber,
      weekIndex,
      user.points[weekIndex]
    );
    const lineupSlots =
      rosterPositions.length > 0
        ? rosterPositions
        : (playerNames[index] ?? []).map((player) => player.position);
    const starters = buildPremiumPlayers(
      playerNames[index] ?? [],
      user.starterPoints[weekIndex] ?? [],
      lineupSlots,
      "STARTER"
    );
    const bench = buildPremiumPlayers(
      benchPlayerNames[index] ?? [],
      user.benchPoints[weekIndex] ?? [],
      [],
      "BN"
    );
    const optimalPoints = getOptimalPoints(
      [...starters, ...bench],
      lineupSlots
    );
    const pointsScored = user.points[weekIndex];
    const starterPoints = roundPoints(
      starters.reduce((total, player) => total + player.points, 0)
    );
    const seasonAverageBeforeWeek =
      weekIndex > 0
        ? roundPoints(getPointsThroughWeek(user, weekIndex) / weekIndex)
        : null;
    const baseTeam: PremiumReportTeam = {
      name: getManagerName(user, showUsernames),
      result,
      pointsScored,
      weeklyScoreRank: weeklyScoreRanks.get(user.rosterId) ?? 0,
      starters: starters.map(stripLineupMetadata),
      bench: bench.map(stripLineupMetadata),
      optimalPoints,
      pointsLeftOnBench: roundPoints(
        Math.max(0, optimalPoints - starterPoints)
      ),
      lineupEfficiency:
        optimalPoints > 0
          ? Math.round((starterPoints / optimalPoints) * 1000) / 1000
          : 0,
      bestBenchSwap: getBestBenchSwap(starters, bench),
      seasonAverageThroughWeek: roundPoints(
        getPointsThroughWeek(user, weekIndex + 1) / (weekIndex + 1)
      ),
      seasonAverageBeforeWeek,
      scoreVsSeasonAverageBeforeWeek:
        seasonAverageBeforeWeek == null
          ? null
          : roundPoints(pointsScored - seasonAverageBeforeWeek),
    };
    const previousMatchupResult = getPreviousTeamMatchupResult({
      team: user,
      tableData,
      weekIndex,
      showUsernames,
    });
    if (previousMatchupResult) {
      baseTeam.previousMatchupResult = previousMatchupResult;
    }
    const weeklyWaiverMoves = waiverMovesByRoster[user.rosterId];
    if (weeklyWaiverMoves?.length) {
      baseTeam.waiverMoves = weeklyWaiverMoves;
    }

    if (isPlayoffs) {
      const bracket = winnersBracketIds.includes(user.rosterId)
        ? "winners"
        : losersBracketIds.includes(user.rosterId)
          ? "losers"
          : "unknown";
      const matchupTeams = teamsByMatchup.get(matchupNumber) ?? [];
      matchupTeams.push({
        ...baseTeam,
        bracket,
      });
      teamsByMatchup.set(matchupNumber, matchupTeams);
      return;
    }

    const recordBefore = getRecordCountsForWeek(
      user.recordByWeek,
      weekIndex,
      medianScoring
    );
    const recordAfter = getRecordCountsForWeek(
      user.recordByWeek,
      weekIndex + 1,
      medianScoring
    );
    const rankBeforeWeek = ranksBeforeWeek.get(user.rosterId) ?? 0;
    const rankAfterWeek = ranksAfterWeek.get(user.rosterId) ?? 0;
    const matchupTeams = teamsByMatchup.get(matchupNumber) ?? [];
    matchupTeams.push({
      ...baseTeam,
      currentStreak: getCurrentStreak(
        user.recordByWeek,
        weekIndex + 1,
        medianScoring
      ),
      recordBeforeWeek: formatRecord(recordBefore),
      recordAfterWeek: formatRecord(recordAfter),
      rankBeforeWeek,
      rankAfterWeek,
      rankChange: rankBeforeWeek - rankAfterWeek,
    });
    teamsByMatchup.set(matchupNumber, matchupTeams);
  });

  teamsByMatchup.forEach((teams, matchupNumber) => {
    const matchup: PremiumReportMatchup = {
      teams: [...teams].sort((a, b) => b.pointsScored - a.pointsScored),
    };
    const rosterIds = tableData
      .filter((user) => user.matchups[weekIndex] === matchupNumber)
      .map((user) => user.rosterId);
    const previousHeadToHeadResult = getPreviousHeadToHeadResult({
      tableData,
      rosterIds,
      weekIndex,
      showUsernames,
    });
    if (previousHeadToHeadResult) {
      matchup.previousHeadToHeadResult = previousHeadToHeadResult;
    }
    if (isPlayoffs) {
      matchup.playoffContext = getPlayoffMatchupContext(
        rosterIds,
        winnersBracket,
        losersBracket,
        espnWinnersBracket,
        espnLosersBracket,
        (rosterId) => {
          const user = tableData.find((team) => team.rosterId === rosterId);
          return user ? getManagerName(user, showUsernames) : null;
        }
      );
      matchup.teams = matchup.teams.map((team) => ({
        ...team,
        bracket: matchup.playoffContext?.bracket ?? "unknown",
      }));
    }
    result.push(matchup);
  });

  return result;
};

export const getMatchupNumbers = (
  sortedTableData: TableDataType[],
  weekIndex: number
) => {
  const result: (number | null)[] = [];
  sortedTableData.forEach((user) => {
    const matchupIndex = user.matchups[weekIndex];
    if (matchupIndex && !result.includes(matchupIndex)) {
      result.push(matchupIndex);
    }
  });
  return result;
};

export const getSeriesData = (
  sortedTableData: TableDataType[],
  weekIndex: number
) => [
  {
    name: "Points",
    data: sortedTableData.map((user) =>
      user.matchups[weekIndex] ? user.points[weekIndex] : 0
    ),
  },
];

export const getExportTopTeams = (
  sortedTableData: TableDataType[],
  weekIndex: number,
  showUsernames: boolean
) =>
  [...sortedTableData]
    .filter((user) => user.matchups[weekIndex] !== null)
    .sort((a, b) => b.points[weekIndex] - a.points[weekIndex])
    .slice(0, 6)
    .map((user) => ({
      name: getManagerName(user, showUsernames),
      points: user.points[weekIndex],
      avatar: user.avatarImg,
    }));

export const getExportPlayers = (performers: PerformerEntry[]) =>
  performers.slice(0, 4).map((entry) => ({
    name: getPlayerLabel(entry.player),
    user: entry.user,
    points: entry.points,
    player_id: entry.player.player_id,
    position: entry.player.position,
  }));

type VideoTeamInput = {
  name: string;
  points: number;
  avatar?: string;
};

type VideoPlayerInput = {
  name: string;
  user: string;
  points: number;
  position?: string;
};

const optionalHttpUrl = (value?: string) => {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
};

const getVideoBracket = (
  matchup: PremiumReportMatchup
): WeeklyRecapVideoProps["facts"]["matchups"][number]["bracket"] => {
  if (matchup.playoffContext?.bracket) {
    return matchup.playoffContext.bracket;
  }
  const firstTeam = matchup.teams[0];
  return firstTeam && "bracket" in firstTeam ? firstTeam.bracket : "regular";
};

export const buildWeeklyRecapVideoProps = ({
  league,
  report,
  matchups,
  topTeams,
  topPlayers,
  benchPlayers,
}: {
  league: WeeklyRecapVideoProps["league"];
  report: PremiumReport;
  matchups: PremiumReportMatchup[];
  topTeams: VideoTeamInput[];
  topPlayers: VideoPlayerInput[];
  benchPlayers: VideoPlayerInput[];
}): WeeklyRecapVideoProps => {
  const benchDecisions = new Map<
    string,
    { startedPlayerName: string; pointsLost: number }
  >();
  const standingsMoves = new Map<
    string,
    WeeklyRecapVideoProps["facts"]["standingsMoves"][number]
  >();

  matchups.forEach((matchup) => {
    matchup.teams.forEach((team) => {
      if (team.bestBenchSwap) {
        benchDecisions.set(
          `${team.name}:${team.bestBenchSwap.benched.name}`,
          {
            startedPlayerName: team.bestBenchSwap.started.name,
            pointsLost: team.bestBenchSwap.pointsLost,
          }
        );
      }
      if (
        "rankBeforeWeek" in team &&
        "rankAfterWeek" in team &&
        team.rankBeforeWeek > 0 &&
        team.rankAfterWeek > 0 &&
        team.rankBeforeWeek !== team.rankAfterWeek
      ) {
        standingsMoves.set(team.name, {
          teamName: team.name,
          from: team.rankBeforeWeek,
          to: team.rankAfterWeek,
        });
      }
    });
  });

  const videoMatchups = matchups.flatMap((matchup, index) => {
    const teams = matchup.teams.slice(0, 2).map((team) => ({
      name: team.name,
      score: team.pointsScored,
    }));
    if (teams.length !== 2) return [];

    return [
      {
        matchupNumber: index + 1,
        teams: teams as WeeklyRecapVideoProps["facts"]["matchups"][number]["teams"],
        margin: Math.abs(teams[0].score - teams[1].score),
        bracket: getVideoBracket(matchup),
      },
    ];
  });

  return {
    schemaVersion: 1,
    templateVersion: "weekly-v1",
    league,
    report,
    facts: {
      matchups: videoMatchups,
      topTeams: topTeams.slice(0, 5).map((team) => ({
        name: team.name,
        score: team.points,
        ...(optionalHttpUrl(team.avatar)
          ? { avatarUrl: optionalHttpUrl(team.avatar) }
          : {}),
      })),
      topPlayers: topPlayers.slice(0, 5).map((player) => ({
        name: player.name,
        points: player.points,
        teamName: player.user,
        ...(player.position ? { position: player.position } : {}),
      })),
      benchPain: benchPlayers.slice(0, 5).map((player) => {
        const decision = benchDecisions.get(`${player.user}:${player.name}`);
        return {
          playerName: player.name,
          points: player.points,
          teamName: player.user,
          ...(decision ?? {}),
        };
      }),
      standingsMoves: [...standingsMoves.values()].slice(0, 5),
    },
    branding: {
      callToAction: "See the full weekly recap",
      destination: "ffwrapped.com",
    },
  };
};
