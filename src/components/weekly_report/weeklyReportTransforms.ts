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

export type PlayoffPremiumReportRow = Record<string, unknown> & {
  name: string;
  matchupNumber: number | null;
  winner: boolean;
  starterPlayerPoints: number[];
  starterPlayerNames: string[];
  benchPlayerPoints: number[];
  benchPlayerNames: string[];
  pointsScored: number;
  inLosersBracket: boolean;
  inWinnersBracket: boolean;
};

export type RegularSeasonPremiumReportRow = Record<string, unknown> & {
  name: string;
  matchupNumber: number | null;
  playerPoints: number[];
  pointsScored: number;
  winner: boolean;
  starterPlayerPoints: number[];
  starterPlayerNames: string[];
  benchPlayerPoints: number[];
  benchPlayerNames: string[];
  currentRecord: string;
  currentRank: number;
};

export const getPlayerLabel = (player: WeeklyReportPlayer) =>
  player.name ? player.name : `${player.team} Defense`;

export const getManagerName = (user: TableDataType, showUsernames: boolean) => {
  if (showUsernames) {
    return user.username ? user.username : "Ghost Roster";
  }
  return user.name ? user.name : "Ghost Roster";
};

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
  sortedTableData,
  playerNames,
  benchPlayerNames,
  weekIndex,
  showUsernames,
  isPlayoffs,
  losersBracketIds,
  winnersBracketIds,
}: {
  tableData: TableDataType[];
  sortedTableData: TableDataType[];
  playerNames: WeeklyReportPlayer[][];
  benchPlayerNames: WeeklyReportPlayer[][];
  weekIndex: number;
  showUsernames: boolean;
  isPlayoffs: boolean;
  losersBracketIds: number[];
  winnersBracketIds: number[];
}) => {
  const result: Array<PlayoffPremiumReportRow | RegularSeasonPremiumReportRow> =
    [];
  tableData.forEach((user, index) => {
    if (!user.matchups[weekIndex]) {
      return;
    }
    const matchupNumber = user.matchups[weekIndex];
    const winner =
      getMatchupWinner(sortedTableData, matchupNumber, weekIndex) ===
      user.points[weekIndex];
    const starterPlayerNames = (playerNames[index] ?? []).map(getPlayerLabel);
    const benchPlayerLabels = (benchPlayerNames[index] ?? []).map(
      getPlayerLabel
    );

    if (isPlayoffs) {
      result.push({
        name: getManagerName(user, showUsernames),
        matchupNumber,
        winner,
        starterPlayerPoints: user.starterPoints[weekIndex],
        starterPlayerNames,
        benchPlayerPoints: user.benchPoints[weekIndex],
        benchPlayerNames: benchPlayerLabels,
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
      starterPlayerPoints: user.starterPoints[weekIndex],
      starterPlayerNames,
      benchPlayerPoints: user.benchPoints[weekIndex],
      benchPlayerNames: benchPlayerLabels,
      currentRecord: `${user.wins}-${user.losses}`,
      currentRank: user.regularSeasonRank,
    });
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
