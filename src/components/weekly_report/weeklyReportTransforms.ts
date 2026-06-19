import type { Player } from "@/types/apiTypes";
import type { Bracket } from "@/types/apiTypes";
import type { TableDataType } from "@/types/types";

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

export type PlayoffReportRow = Record<string, unknown> & {
  name: string;
  matchupNumber: number | null;
  winner: boolean;
  playerPoints: number[];
  playerNames: string[];
  pointsScored: number;
  inLosersBracket: boolean;
  inWinnersBracket: boolean;
};

export type RegularSeasonReportRow = Record<string, unknown> & {
  name: string;
  matchupNumber: number | null;
  playerPoints: number[];
  pointsScored: number;
  winner: boolean;
  playerNames: string[];
  currentRecord: string;
  currentRank: number;
};

export type PremiumReportPlayer = {
  name: string;
  team: string;
  points: number;
};

type PremiumLineupPlayer = PremiumReportPlayer & {
  position: string;
  slot: string;
};

export type PremiumLineupDecision = {
  benched: PremiumReportPlayer;
  started: PremiumReportPlayer;
  pointsLost: number;
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
  playoffContext?: PlayoffMatchupContext;
};

export const getPlayerLabel = (player: WeeklyReportPlayer) =>
  player.name ? player.name : `${player.team} Defense`;

export const getManagerName = (user: TableDataType, showUsernames: boolean) => {
  if (showUsernames) {
    return user.username ? user.username : "Ghost Roster";
  }
  return user.name ? user.name : "Ghost Roster";
};

const roundPoints = (points: number) => Math.round(points * 100) / 100;

const getRecordCountsForWeek = (
  recordString: string,
  completedWeeks: number,
  medianScoring: boolean
) => {
  const resultCount = completedWeeks * (medianScoring ? 2 : 1);
  const results = recordString.slice(0, resultCount);
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
  recordString: string,
  completedWeeks: number,
  medianScoring: boolean
) => {
  const resultCount = completedWeeks * (medianScoring ? 2 : 1);
  const results = recordString.slice(0, resultCount);
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
      if (
        !usedPlayers[playerIndex] &&
        canFillSlot(player, slots[slotIndex])
      ) {
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

export const getRecordForWeek = (
  recordString: string,
  week: number,
  medianScoring: boolean
) => {
  const recordIndex = medianScoring ? week * 2 : week;
  if (recordString) {
    const numWins = recordString.slice(0, recordIndex).split("W").length - 1;
    const numLosses = recordString.slice(0, recordIndex).split("L").length - 1;
    return `${numWins} - ${numLosses}`;
  }
  return "0-0";
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
      .sort((a, b) => b.r - a.r || Number(Boolean(b.p)) - Number(Boolean(a.p)))[0];
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
    const matchupRosterIds = [matchup.home?.teamId, matchup.away?.teamId].filter(
      (rosterId): rosterId is number => rosterId != null
    );
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
        isChampionship && winnerRosterId
          ? getTeamName(winnerRosterId)
          : null,
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
  limit = 4,
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
  limit = 4,
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

export const buildReportPrompt = ({
  tableData,
  sortedTableData,
  playerNames,
  weekIndex,
  showUsernames,
  isPlayoffs,
  losersBracketIds,
  winnersBracketIds,
}: {
  tableData: TableDataType[];
  sortedTableData: TableDataType[];
  playerNames: WeeklyReportPlayer[][];
  weekIndex: number;
  showUsernames: boolean;
  isPlayoffs: boolean;
  losersBracketIds: number[];
  winnersBracketIds: number[];
}) => {
  const result: Array<PlayoffReportRow | RegularSeasonReportRow> = [];
  tableData.forEach((user, index) => {
    if (!user.matchups[weekIndex]) {
      return;
    }
    const matchupNumber = user.matchups[weekIndex];
    const winner =
      getMatchupWinner(sortedTableData, matchupNumber, weekIndex) ===
      user.points[weekIndex];
    const starterNames = (playerNames[index] ?? []).map(getPlayerLabel);

    if (isPlayoffs) {
      result.push({
        name: getManagerName(user, showUsernames),
        matchupNumber,
        winner,
        playerPoints: user.starterPoints[weekIndex].slice(0, 7),
        playerNames: starterNames.slice(0, 7),
        pointsScored: user.points[weekIndex],
        inLosersBracket: losersBracketIds.includes(user.rosterId),
        inWinnersBracket: winnersBracketIds.includes(user.rosterId),
      });
      return;
    }

    result.push({
      name: getManagerName(user, showUsernames),
      matchupNumber,
      playerPoints: user.starterPoints[weekIndex].slice(0, 7),
      pointsScored: user.points[weekIndex],
      winner,
      playerNames: starterNames.slice(0, 7),
      currentRecord: `${user.wins}-${user.losses}`,
      currentRank: user.regularSeasonRank,
    });
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
}) => {
  const result: PremiumReportMatchup[] = [];
  const weeklyScoreRanks = [...tableData]
    .filter((user) => user.matchups[weekIndex] !== null)
    .sort((a, b) => b.points[weekIndex] - a.points[weekIndex])
    .reduce((rankMap, user, index) => {
      rankMap.set(user.rosterId, index + 1);
      return rankMap;
    }, new Map<number, number>());
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
    const matchupScores = tableData
      .filter((team) => team.matchups[weekIndex] === matchupNumber)
      .map((team) => team.points[weekIndex]);
    const highestScore = Math.max(...matchupScores);
    const lowestScore = Math.min(...matchupScores);
    const result =
      highestScore === lowestScore
        ? "tie"
        : user.points[weekIndex] === highestScore
          ? "win"
          : "loss";
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
    };

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
