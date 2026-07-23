// helper methods
import {
  countBy,
  flatten,
  groupBy,
  max,
  mean,
  min,
  sum,
  zip,
} from "@/lib/collection";
import { getMatchup } from "./sleeperApi";
import {
  RosterType,
  UserType,
  PointsType,
  TableDataType,
} from "../types/types";
import { mapWithConcurrency } from "@/lib/async";
import { WeeklyWaiver } from "../types/apiTypes";

type MatchupPointRow = {
  rosterId: number;
  points: number;
  matchupId: number;
  starters: string[];
  starterPoints: number[];
  benchPlayers: string[];
  benchPoints: number[];
};

const getTierMultiplier = (position: string, rank: number) => {
  switch (position) {
    case "RB":
      if (rank <= 6) return 2.0; // Elite RB1s
      if (rank <= 12) return 1.7; // Strong RB1s
      if (rank <= 18) return 1.4; // RB2s
      if (rank <= 24) return 1.2; // Solid RB2s
      if (rank <= 30) return 1.1; // RB3s
      if (rank <= 36) return 1.0; // Bench RBs
      return 0.8; // Deep bench

    case "WR":
      if (rank <= 6) return 1.8; // Elite WR1s
      if (rank <= 12) return 1.5; // Strong WR1s
      if (rank <= 18) return 1.3; // WR2s
      if (rank <= 24) return 1.1; // Solid WR2s
      if (rank <= 30) return 1.0; // WR3s
      if (rank <= 36) return 0.9; // Bench WRs
      return 0.7; // Deep bench

    case "TE":
      if (rank <= 3) return 2.0; // Elite TEs
      if (rank <= 6) return 1.6; // Strong TE1s
      if (rank <= 12) return 1.4; // Startable TEs
      if (rank <= 18) return 1.1; // Backup TEs
      return 0.8; // Deep bench

    case "QB":
      if (rank <= 3) return 1.6; // Elite QBs
      if (rank <= 6) return 1.4; // Strong QB1s
      if (rank <= 12) return 1.2; // Startable QBs
      if (rank <= 18) return 1.0; // Backup QBs
      return 0.7; // Deep bench

    case "K":
      if (rank <= 3) return 1.3;
      return 1.0;

    case "DEF":
      if (rank <= 3) return 1.3;
      return 1.0;
    default:
      return 1.0;
  }
};

export const standardDeviation = (arr: number[]) => {
  const avg = mean(arr);
  const squaredDiffs = arr.map((n) => Math.pow(n - avg, 2));
  const variance = sum(squaredDiffs) / arr.length;
  return Math.sqrt(variance);
};

export const roundToOneDecimal = (number: number) => {
  const rounded = parseFloat(number.toFixed(1));
  // If it's effectively zero after rounding, return 0.0
  return rounded === 0 ? "0.0" : rounded.toFixed(1);
};

export const calculateDraftRank = (
  pickNumber: number,
  positionRank: number,
  round: number,
  position: string,
  ppg: number
) => {
  const positionWeights: Record<string, number> = {
    RB: 1.0,
    WR: 0.9,
    TE: 0.9,
    QB: 0.7,
    K: 0.4,
    DEF: 0.4,
  };
  if (positionRank === 0) return roundToOneDecimal(0); // player did not play
  const firstRoundAdjust = round === 1 ? 2 : 0;
  const earlyPicksAdjust = pickNumber <= 3 ? 1.5 : 0;
  const posWeightMultiplier =
    position in positionWeights ? positionWeights[position] : 1;
  const baseMultiplier =
    posWeightMultiplier * getTierMultiplier(position, positionRank);
  const rankScore =
    ((pickNumber + firstRoundAdjust + earlyPicksAdjust - positionRank) /
      pickNumber) *
    baseMultiplier;
  const ppgScore = (ppg / 25) * baseMultiplier; // 25 is generally around the max ppg for a season
  const finalScore = roundToOneDecimal(rankScore * 0.7 + ppgScore * 0.3);
  return Number(finalScore) > -3 ? finalScore : roundToOneDecimal(-3);
};

export const createTableData = (
  users: UserType[],
  rosters: RosterType[],
  points: PointsType[],
  medianScoring: boolean
) => {
  if (users && points) {
    const combined: ((UserType & RosterType) | null)[] = users.map(
      (a: UserType) => {
        const matched = rosters.find((b: RosterType) => b.id === a.id);

        if (matched) {
          return {
            ...a,
            ...matched,
          };
        }

        return null;
      }
    );
    const ghostRosters = rosters.filter(
      (roster): roster is RosterType & { id: null } => roster.id === null
    );
    if (ghostRosters.length > 0) {
      combined.push(...ghostRosters);
    }
    const filtered: RosterType[] = combined.filter((a) => a !== null);
    const combinedPoints = filtered.map((a: RosterType) => {
      const matchupData = points.find(
        (b: PointsType) => b.rosterId === a.rosterId
      );

      return {
        ...a,
        ...(matchupData ?? {
          points: [],
          matchups: [],
          starters: [],
          starterPoints: [],
          benchPlayers: [],
          benchPoints: [],
        }),
      };
    }) as TableDataType[];

    const pointsArr: number[][] = [];
    combinedPoints.forEach((value) => {
      let weekLength = value.recordByWeek ? value.recordByWeek.length : 0;
      if (medianScoring) weekLength = weekLength / 2;
      const pointsList = value.points ? value.points : [];
      pointsArr.push(pointsList.slice(0, weekLength));
      value.winsAgainstAll = 0;
      value.lossesAgainstAll = 0;
    });
    const zipped = zip(...pointsArr).map((row) =>
      row.filter((v): v is number => v !== undefined)
    );
    const medians: number[] = [];
    const expectedScheduleWins = new Map<TableDataType, number>();
    const expectedWinsVariances = new Map<TableDataType, number>();
    for (let i: number = 0; i < zipped.length; i++) {
      const weeklyScores = combinedPoints
        .map((team) => ({
          team,
          score: team.points?.[i],
        }))
        .filter(
          (entry): entry is { team: TableDataType; score: number } =>
            entry.score !== undefined
        );
      const scores = weeklyScores.map((entry) => entry.score);
      medians.push(Number(getMedian(scores)?.toFixed(2)));
      weeklyScores.forEach(({ team, score }) => {
        const numberOfWins = scores.filter(
          (otherScore) => otherScore < score
        ).length;
        const opponentCount = scores.length - 1;
        const winProbability =
          opponentCount > 0 ? numberOfWins / opponentCount : 0;
        expectedScheduleWins.set(
          team,
          (expectedScheduleWins.get(team) ?? 0) + winProbability
        );
        expectedWinsVariances.set(
          team,
          (expectedWinsVariances.get(team) ?? 0) +
            winProbability * (1 - winProbability)
        );
        if (team.pointsFor !== 0) {
          team.winsAgainstAll += numberOfWins;
          team.lossesAgainstAll += scores.length - numberOfWins - 1;
        }
      });
    }
    if (combinedPoints) {
      combinedPoints.forEach((value) => {
        const scheduleWins = expectedScheduleWins.get(value) ?? 0;
        value.expectedWinsSTD = Math.sqrt(
          expectedWinsVariances.get(value) ?? 0
        );
        value.randomScheduleWins = scheduleWins;
        if (medianScoring) {
          value.randomScheduleWins = 2 * scheduleWins;
        }
        const gamesPlayed = value.wins + value.losses;
        value.rating =
          value.points.length === 0
            ? 0
            : getPowerRanking(
                mean(value.points),
                Number(max(value.points)),
                Number(min(value.points)),
                gamesPlayed > 0 ? value.wins / gamesPlayed : 0
              );
        if (!medianScoring) {
          const weekLength = value.recordByWeek ? value.recordByWeek.length : 0;
          const pointsList = value.points ? value.points : [];
          const pairs = zip(pointsList.slice(0, weekLength), medians);
          const counts = countBy(
            pairs,
            ([a, b]) => Number(a) > Number(b)
          );
          const addedWins = counts["true"] ? counts["true"] : 0;
          const addedLosses = counts["false"] ? counts["false"] : 0;
          value.winsWithMedian = addedWins + value.wins;
          value.lossesWithMedian = addedLosses + value.losses;
        } else {
          value.winsWithMedian = value.wins;
          value.lossesWithMedian = value.losses;
        }

        value.headToHeadWins = 0;
        value.headToHeadLosses = 0;
        value.headToHeadTies = 0;
        if (medianScoring) {
          const recordedResults = value.recordByWeek?.length ?? 0;
          const officialResults = value.wins + value.losses + value.ties;
          const completedWeeks = Math.floor(
            (recordedResults || officialResults) / 2
          );

          for (let week = 0; week < completedWeeks; week++) {
            const matchupId = value.matchups?.[week];
            const teamScore = value.points?.[week];
            if (matchupId == null || teamScore == null) continue;

            const opponent = combinedPoints.find(
              (team) =>
                team.rosterId !== value.rosterId &&
                team.matchups?.[week] === matchupId
            );
            const opponentScore = opponent?.points?.[week];
            if (opponentScore == null) continue;

            if (teamScore > opponentScore) value.headToHeadWins++;
            else if (teamScore < opponentScore) value.headToHeadLosses++;
            else value.headToHeadTies++;
          }
        }
      });

      combinedPoints.sort((a, b) => {
        if (a.wins !== b.wins) {
          return b.wins - a.wins;
        }
        return b.pointsFor - a.pointsFor;
      });

      combinedPoints.forEach((user, index) => {
        user.regularSeasonRank = index + 1;
      });
      return combinedPoints;
    }
  }
  return [];
};

const erf = (x: number) => {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x >= 0 ? 1 : -1;
  x = Math.abs(x);

  const t = 1.0 / (1.0 + p * x);
  const y =
    1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return sign * y;
};

export const zScoreToPValue = (z: number) => {
  return 2 * (1 - 0.5 * (1 + erf(Math.abs(z) / Math.sqrt(2))));
};

export const getWinProbability = (z: number) => {
  return 0.5 * (1 + erf(z / Math.sqrt(2)));
};

export const winsOnWeek = (recordString: string, week: number) => {
  let count = 0;
  for (let i = 0; i <= week; i++) {
    if (recordString[i] === "W") {
      count++;
    }
  }
  return count;
};

export const getTotalTransactions = (transactions: WeeklyWaiver[]) => {
  return transactions.reduce((countMap: Record<string, number>, obj) => {
    const id = obj.creator;
    const shouldCount = obj.status === "complete" && obj.adds !== null;

    if (shouldCount) {
      countMap[id] = (countMap[id] || 0) + 1;
    }
    return countMap;
  }, {});
};

export const getWaiverMoves = (
  transactions: WeeklyWaiver[]
): { trades: WeeklyWaiver[]; waivers: WeeklyWaiver[] } => {
  const trades: WeeklyWaiver[] = [];
  const waivers: WeeklyWaiver[] = [];
  transactions.forEach((transaction) => {
    if (transaction.status === "complete" && transaction.type === "trade") {
      trades.push(transaction);
    } else if (["free_agent", "waiver"].includes(transaction.type)) {
      waivers.push(transaction);
    }
  });
  return {
    trades: trades,
    waivers: waivers,
  };
};

export const getPowerRanking = (
  avgScore: number,
  highScore: number,
  lowScore: number,
  winPercentage: number
) => {
  return Number(
    (
      (avgScore * 6 + (highScore + lowScore) * 2 + winPercentage * 400) /
      10
    ).toFixed(2)
  );
};

export const getMedian = (arr: number[]): number | undefined => {
  if (!arr.length) return undefined;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

export const getWeeklyPoints = async (
  leagueId: string,
  regularSeasonLength: number,
  startWeek: number = 0,
  signal?: AbortSignal
) => {
  const weeks = Array.from(
    { length: Math.max(0, regularSeasonLength - startWeek) },
    (_, index) => startWeek + index + 1
  );
  const allMatchups = await mapWithConcurrency(weeks, 4, (week) =>
    signal
      ? getMatchup(week, leagueId, signal)
      : getMatchup(week, leagueId)
  );
  const validMatchups = flatten(allMatchups).filter(
    (matchup): matchup is MatchupPointRow =>
      Boolean(matchup) && typeof matchup.rosterId === "number"
  );
  const grouped = Object.values(groupBy(validMatchups, "rosterId"));
  const allTeams: PointsType[] = [];
  grouped.forEach((group: MatchupPointRow[]) => {
    const consolidatedObject = group.reduce<Record<number, PointsType>>(
      (
        result,
        {
          rosterId,
          points,
          matchupId,
          starters,
          starterPoints,
          benchPlayers,
          benchPoints,
        }: {
          rosterId: number;
          points: number;
          matchupId: number;
          starters: string[];
          starterPoints: number[];
          benchPlayers: string[];
          benchPoints: number[];
        }
      ) => {
        if (!result[rosterId]) {
          result[rosterId] = {
            rosterId,
            points: [],
            matchups: [],
            starters: [],
            starterPoints: [],
            benchPlayers: [],
            benchPoints: [],
          };
        }
        result[rosterId].points.push(points);
        if (!result[rosterId].matchups) {
          result[rosterId].matchups = [];
        }
        result[rosterId].matchups.push(matchupId);
        result[rosterId].starters.push(starters);
        result[rosterId].starterPoints.push(starterPoints);
        result[rosterId].benchPlayers.push(benchPlayers);
        result[rosterId].benchPoints.push(benchPoints);
        return result;
      },
      {} as Record<number, PointsType>
    );
    const consolidatedValues = Object.values(consolidatedObject);
    if (consolidatedValues.length > 0 && consolidatedValues[0]) {
      allTeams.push(consolidatedValues[0]);
    }
  });
  return allTeams;
};
