// helper methods
import {
  groupBy,
  flatten,
  zip,
  mean,
  max,
  min,
  countBy,
  map,
  sum,
} from "lodash";
import { getMatchup } from "./api";
import { RosterType, UserType } from "./types";

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
  const squaredDiffs = map(arr, (n) => Math.pow(n - avg, 2));
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
  const positionWeights: any = {
    RB: 1.0,
    WR: 0.9,
    TE: 1.1,
    QB: 0.7,
    K: 0.4,
    DEF: 0.4,
  };
  if (positionRank === 0) return roundToOneDecimal(0); // player did not play
  const firstRoundAdjust = round === 1 ? 2 : 0;
  const posWeightMultiplier =
    position in positionWeights ? positionWeights[position] : 1;
  const baseMultiplier =
    posWeightMultiplier * getTierMultiplier(position, positionRank);
  const rankScore =
    ((pickNumber + firstRoundAdjust - positionRank) / pickNumber) *
    baseMultiplier;
  const ppgScore = (ppg / 25) * baseMultiplier; // 25 is generally around the max ppg for a season
  const finalScore = roundToOneDecimal(rankScore * 0.7 + ppgScore * 0.3);
  return Number(finalScore) > -3 ? finalScore : roundToOneDecimal(-3);
};

export const createTableData = (
  users: UserType[],
  rosters: RosterType[],
  points: Record<string, any>[],
  medianScoring: boolean
) => {
  if (users && points) {
    const combined = users.map((a: UserType) => {
      const matched = rosters.find((b: RosterType) => b.id === a.id);
      if (matched) {
        return {
          ...a,
          ...matched,
        };
      }
      return null;
    });
    const ghostRosters: any = rosters.filter((roster) => roster.id === null);
    if (ghostRosters.length > 0) {
      combined.push(...ghostRosters);
    }
    const filtered = combined.filter((a: any) => a !== null);
    const combinedPoints = filtered.map((a: any) => ({
      ...a,
      ...points.find((b: any) => b.rosterId === a.rosterId),
    }));

    const pointsArr: any[] = [];
    combinedPoints.forEach((value: any) => {
      const weekLength = value.recordByWeek ? value.recordByWeek.length : 0;
      const pointsList = value.points ? value.points : [];
      pointsArr.push(pointsList.slice(0, weekLength));
      value["winsAgainstAll"] = 0;
      value["lossesAgainstAll"] = 0;
    });
    const zipped: any = zip(...pointsArr);
    const medians: number[] = [];
    for (let i: number = 0; i < zipped.length; i++) {
      medians.push(Number(getMedian(zipped[i])?.toFixed(2)));
      for (let j: number = 0; j < zipped[i].length; j++) {
        const numberOfWins = zipped[i].filter(
          (a: any) => a < zipped[i][j]
        ).length;
        const currentTeam = combinedPoints.find((obj: any) => {
          return obj.points[i] === zipped[i][j];
        });
        if (currentTeam.pointsFor !== 0) {
          currentTeam["winsAgainstAll"] += numberOfWins;
          currentTeam["lossesAgainstAll"] +=
            zipped[i].length - numberOfWins - 1;
        }
      }
    }
    if (combinedPoints) {
      combinedPoints.forEach((value: any) => {
        let randomScheduleWins = 0;
        const numOfSimulations = 10000;
        const numberWeeks = medianScoring
          ? 2 * (value.wins + value.losses)
          : value.wins + value.losses;
        const simulationWins = Array(numOfSimulations).fill(0);
        if (value.points) {
          for (let i = 0; i < numberWeeks; i++) {
            for (
              let simulations = 0;
              simulations < numOfSimulations;
              simulations++
            )
              if (
                value.points[i] >
                combinedPoints[getRandomUser(combinedPoints.length, i)].points[
                  i
                ]
              ) {
                randomScheduleWins++;
                simulationWins[simulations]++;
              }
          }
        }
        const meanWins =
          simulationWins.reduce((sum, wins) => sum + wins, 0) /
          numOfSimulations;
        const variance =
          simulationWins.reduce(
            (sum, wins) => sum + Math.pow(wins - meanWins, 2),
            0
          ) / numOfSimulations;
        value["expectedWinsSTD"] = Math.sqrt(variance);
        value["randomScheduleWins"] = randomScheduleWins / numOfSimulations;
        if (medianScoring) {
          value["randomScheduleWins"] =
            (2 * randomScheduleWins) / numOfSimulations;
        }
        value["rating"] = getPowerRanking(
          mean(value.points),
          Number(max(value.points)),
          Number(min(value.points)),
          value.wins / (value.wins + value.losses)
        );
        if (!medianScoring) {
          const weekLength = value.recordByWeek ? value.recordByWeek.length : 0;
          const pointsList = value.points ? value.points : [];
          const pairs = zip(pointsList.slice(0, weekLength), medians);
          const counts = countBy(pairs, ([a, b]: [number, number]) => a > b);
          const addedWins = counts["true"] ? counts["true"] : 0;
          const addedLosses = counts["false"] ? counts["false"] : 0;
          value["winsWithMedian"] = addedWins + value.wins;
          value["lossesWithMedian"] = addedLosses + value.losses;
        } else {
          value["winsWithMedian"] = value.wins;
          value["lossesWithMedian"] = value.losses;
        }
      });

      combinedPoints.sort((a: any, b: any) => {
        if (a.wins !== b.wins) {
          return b.wins - a.wins;
        }
        return b.pointsFor - a.pointsFor;
      });

      combinedPoints.forEach((user, index) => {
        user["regularSeasonRank"] = index + 1;
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

export const getRandomUser = (leagueSize: number, excludedIndex: number) => {
  let randomIndex;
  do {
    randomIndex = Math.floor(Math.random() * leagueSize);
  } while (randomIndex === excludedIndex);
  return randomIndex;
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

export const getTotalTransactions = (transactions: any) => {
  return transactions.reduce((countMap: any, obj: any) => {
    const id = obj.creator;
    const shouldCount = obj.status === "complete" && obj.adds !== null;

    if (shouldCount) {
      countMap[id] = (countMap[id] || 0) + 1;
    }
    return countMap;
  }, {});
};

export const getWaiverMoves = (transactions: any) => {
  const trades: any[] = [];
  const waivers: any[] = [];
  transactions.forEach((transaction: any) => {
    if (transaction.status === "complete" && transaction.type === "trade") {
      trades.push(transaction);
    } else if (
      transaction.status === "complete" &&
      ["free_agent", "waiver"].includes(transaction.type) &&
      transaction.adds !== null
    ) {
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
  startWeek: number = 0
) => {
  const promises = [];
  for (let i = startWeek; i < regularSeasonLength; i++) {
    promises.push(getMatchup(i + 1, leagueId));
  }
  const allMatchups = await Promise.all(promises);
  const grouped = Object.values(groupBy(flatten(allMatchups), "rosterId"));
  const allTeams: Array<object> = [];
  grouped.forEach((group: any) => {
    let consolidatedObject: Record<
      number,
      {
        rosterId: number;
        points: number[];
        matchupId: number;
      }
    > = group.reduce(
      (
        result: any,
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
          starters: number[];
          starterPoints: string[];
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
        result[rosterId].matchups.push(matchupId);
        result[rosterId].starters.push(starters);
        result[rosterId].starterPoints.push(starterPoints);
        result[rosterId].benchPlayers.push(benchPlayers);
        result[rosterId].benchPoints.push(benchPoints);
        return result;
      },
      {}
    );
    allTeams.push(Object.values(consolidatedObject)[0]);
  });
  return allTeams;
};

export const fakeWeeklyPreview = [
  {
    id: 3,
    players: [
      {
        position: "QB",
        player_id: "4881",
        name: "Lamar Jackson",
        team: "BAL",
        projection: 25.66,
      },
      {
        position: "RB",
        player_id: "9509",
        name: "Bijan Robinson",
        team: "ATL",
        projection: 18.09,
      },
      {
        position: "RB",
        player_id: "8150",
        name: "Kyren Williams",
        team: "LAR",
        projection: 15.93,
      },
      {
        position: "WR",
        player_id: "5045",
        name: "Courtland Sutton",
        team: "DEN",
        projection: 11.2,
      },
      {
        position: "WR",
        player_id: "12501",
        name: "Matthew Golden",
        team: "GB",
        projection: 8.76,
      },
      {
        position: "TE",
        player_id: "5012",
        name: "Mark Andrews",
        team: "BAL",
        projection: 8.16,
      },
      {
        position: "RB",
        player_id: "6790",
        name: "D'Andre Swift",
        team: "CHI",
        projection: 11.23,
      },
      {
        position: "K",
        player_id: "6650",
        name: "Chase McLaughlin",
        team: "TB",
        projection: 9.28,
      },
      {
        position: "DEF",
        player_id: "DEN",
        name: null,
        team: "DEN",
        projection: 8.42,
      },
    ],
    total: 116.73,
  },
  {
    id: 6,
    players: [
      {
        position: "QB",
        player_id: "3163",
        name: "Jared Goff",
        team: "DET",
        projection: 20.46,
      },
      {
        position: "RB",
        player_id: "4866",
        name: "Saquon Barkley",
        team: "PHI",
        projection: 19.52,
      },
      {
        position: "RB",
        player_id: "11584",
        name: "Bucky Irving",
        team: "TB",
        projection: 16.19,
      },
      {
        position: "WR",
        player_id: "2133",
        name: "Davante Adams",
        team: "LAR",
        projection: 11.78,
      },
      {
        position: "WR",
        player_id: "11624",
        name: "Xavier Worthy",
        team: "KC",
        projection: 11.64,
      },
      {
        position: "TE",
        player_id: "12518",
        name: "Tyler Warren",
        team: "IND",
        projection: 7.42,
      },
      {
        position: "RB",
        player_id: "12507",
        name: "Omarion Hampton",
        team: "LAC",
        projection: 14.2,
      },
      {
        position: "K",
        player_id: "8259",
        name: "Cameron Dicker",
        team: "LAC",
        projection: 9.19,
      },
      {
        position: "DEF",
        player_id: "HOU",
        name: null,
        team: "HOU",
        projection: 6.79,
      },
    ],
    total: 117.19000000000001,
  },
  {
    id: 12,
    players: [
      {
        position: "QB",
        player_id: "4046",
        name: "Patrick Mahomes",
        team: "KC",
        projection: 21.52,
      },
      {
        position: "RB",
        player_id: "12527",
        name: "Ashton Jeanty",
        team: "LV",
        projection: 16.75,
      },
      {
        position: "RB",
        player_id: "6813",
        name: "Jonathan Taylor",
        team: "IND",
        projection: 16.98,
      },
      {
        position: "WR",
        player_id: "11628",
        name: "Marvin Harrison",
        team: "ARI",
        projection: 9.81,
      },
      {
        position: "WR",
        player_id: "4039",
        name: "Cooper Kupp",
        team: "SEA",
        projection: 9.94,
      },
      {
        position: "TE",
        player_id: "4217",
        name: "George Kittle",
        team: "SF",
        projection: 12.39,
      },
      {
        position: "RB",
        player_id: "4199",
        name: "Aaron Jones",
        team: "MIN",
        projection: 11.93,
      },
      {
        position: "K",
        player_id: "5095",
        name: "Daniel Carlson",
        team: "LV",
        projection: 8.87,
      },
      {
        position: "DEF",
        player_id: "ARI",
        name: null,
        team: "ARI",
        projection: 7.07,
      },
    ],
    total: 115.25999999999999,
  },
  {
    id: 10,
    players: [
      {
        position: "QB",
        player_id: "5849",
        name: "Kyler Murray",
        team: "ARI",
        projection: 20.42,
      },
      {
        position: "RB",
        player_id: "8151",
        name: "Kenneth Walker",
        team: "SEA",
        projection: 11.68,
      },
      {
        position: "RB",
        player_id: "7588",
        name: "Javonte Williams",
        team: "DAL",
        projection: 11.28,
      },
      {
        position: "WR",
        player_id: "6786",
        name: "CeeDee Lamb",
        team: "DAL",
        projection: 14.67,
      },
      {
        position: "WR",
        player_id: "5859",
        name: "A.J. Brown",
        team: "PHI",
        projection: 13.32,
      },
      {
        position: "TE",
        player_id: "8130",
        name: "Trey McBride",
        team: "ARI",
        projection: 11.53,
      },
      {
        position: "WR",
        player_id: "12526",
        name: "Tetairoa McMillan",
        team: "CAR",
        projection: 11.94,
      },
      {
        position: "K",
        player_id: "3451",
        name: "Ka'imi Fairbairn",
        team: "HOU",
        projection: 8.74,
      },
      {
        position: "DEF",
        player_id: "SEA",
        name: null,
        team: "SEA",
        projection: 6.47,
      },
    ],
    total: 110.05,
  },
  {
    id: 1,
    players: [
      {
        position: "QB",
        player_id: "6770",
        name: "Joe Burrow",
        team: "CIN",
        projection: 22.98,
      },
      {
        position: "RB",
        player_id: "4035",
        name: "Alvin Kamara",
        team: "NO",
        projection: 15.2,
      },
      {
        position: "RB",
        player_id: "8205",
        name: "Isiah Pacheco",
        team: "KC",
        projection: 11.64,
      },
      {
        position: "WR",
        player_id: "7569",
        name: "Nico Collins",
        team: "HOU",
        projection: 14.05,
      },
      {
        position: "WR",
        player_id: "8112",
        name: "Drake London",
        team: "ATL",
        projection: 13.59,
      },
      {
        position: "TE",
        player_id: "8110",
        name: "Jake Ferguson",
        team: "DAL",
        projection: 6.45,
      },
      {
        position: "WR",
        player_id: "11638",
        name: "Ricky Pearsall",
        team: "SF",
        projection: 10.83,
      },
      {
        position: "K",
        player_id: "12711",
        name: "Tyler Loop",
        team: "BAL",
        projection: 8.56,
      },
      {
        position: "DEF",
        player_id: "PHI",
        name: null,
        team: "PHI",
        projection: 8.12,
      },
    ],
    total: 111.42000000000002,
  },
  {
    id: 2,
    players: [
      {
        position: "QB",
        player_id: "8183",
        name: "Brock Purdy",
        team: "SF",
        projection: 21.36,
      },
      {
        position: "RB",
        player_id: "9224",
        name: "Chase Brown",
        team: "CIN",
        projection: 16.75,
      },
      {
        position: "RB",
        player_id: "5967",
        name: "Tony Pollard",
        team: "TEN",
        projection: 12.7,
      },
      {
        position: "WR",
        player_id: "6794",
        name: "Justin Jefferson",
        team: "MIN",
        projection: 15.98,
      },
      {
        position: "WR",
        player_id: "9488",
        name: "Jaxon Smith-Njigba",
        team: "SEA",
        projection: 12.06,
      },
      {
        position: "TE",
        player_id: "4033",
        name: "David Njoku",
        team: "CLE",
        projection: 10.97,
      },
      {
        position: "WR",
        player_id: "2216",
        name: "Mike Evans",
        team: "TB",
        projection: 13.76,
      },
      {
        position: "K",
        player_id: "7839",
        name: "Evan McPherson",
        team: "CIN",
        projection: 9.33,
      },
      {
        position: "DEF",
        player_id: "BAL",
        name: null,
        team: "BAL",
        projection: 6.31,
      },
    ],
    total: 119.22000000000001,
  },
  {
    id: 4,
    players: [
      {
        position: "QB",
        player_id: "4892",
        name: "Baker Mayfield",
        team: "TB",
        projection: 21.66,
      },
      {
        position: "RB",
        player_id: "9221",
        name: "Jahmyr Gibbs",
        team: "DET",
        projection: 18.24,
      },
      {
        position: "RB",
        player_id: "12504",
        name: "Kaleb Johnson",
        team: "PIT",
        projection: 8.56,
      },
      {
        position: "WR",
        player_id: "11635",
        name: "Ladd McConkey",
        team: "LAC",
        projection: 12.38,
      },
      {
        position: "WR",
        player_id: "5846",
        name: "DK Metcalf",
        team: "PIT",
        projection: 12.11,
      },
      {
        position: "TE",
        player_id: "11604",
        name: "Brock Bowers",
        team: "LV",
        projection: 13.12,
      },
      {
        position: "WR",
        player_id: "8148",
        name: "Jameson Williams",
        team: "DET",
        projection: 10.05,
      },
      {
        position: "K",
        player_id: "3678",
        name: "Wil Lutz",
        team: "DEN",
        projection: 8.86,
      },
      {
        position: "DEF",
        player_id: "BUF",
        name: null,
        team: "BUF",
        projection: 6.07,
      },
    ],
    total: 111.05000000000001,
  },
  {
    id: 5,
    players: [
      {
        position: "QB",
        player_id: "11563",
        name: "Bo Nix",
        team: "DEN",
        projection: 19.51,
      },
      {
        position: "RB",
        player_id: "3198",
        name: "Derrick Henry",
        team: "BAL",
        projection: 17.22,
      },
      {
        position: "RB",
        player_id: "9226",
        name: "De'Von Achane",
        team: "MIA",
        projection: 17.97,
      },
      {
        position: "WR",
        player_id: "3321",
        name: "Tyreek Hill",
        team: "MIA",
        projection: 12.91,
      },
      {
        position: "WR",
        player_id: "8146",
        name: "Garrett Wilson",
        team: "NYJ",
        projection: 11.53,
      },
      {
        position: "TE",
        player_id: "5844",
        name: "T.J. Hockenson",
        team: "MIN",
        projection: 8.83,
      },
      {
        position: "WR",
        player_id: "4983",
        name: "DJ Moore",
        team: "CHI",
        projection: 11.25,
      },
      {
        position: "K",
        player_id: "11539",
        name: "Jake Bates",
        team: "DET",
        projection: 9.04,
      },
      {
        position: "DEF",
        player_id: "MIN",
        name: null,
        team: "MIN",
        projection: 7.34,
      },
    ],
    total: 115.6,
  },
  {
    id: 7,
    players: [
      {
        position: "QB",
        player_id: "4984",
        name: "Josh Allen",
        team: "BUF",
        projection: 23.92,
      },
      {
        position: "RB",
        player_id: "8138",
        name: "James Cook",
        team: "BUF",
        projection: 13.93,
      },
      {
        position: "RB",
        player_id: "7594",
        name: "Chuba Hubbard",
        team: "CAR",
        projection: 14.18,
      },
      {
        position: "WR",
        player_id: "7564",
        name: "Ja'Marr Chase",
        team: "CIN",
        projection: 16.85,
      },
      {
        position: "WR",
        player_id: "5872",
        name: "Deebo Samuel",
        team: "WAS",
        projection: 10.93,
      },
      {
        position: "TE",
        player_id: "9484",
        name: "Tucker Kraft",
        team: "GB",
        projection: 7.49,
      },
      {
        position: "RB",
        player_id: "4137",
        name: "James Conner",
        team: "ARI",
        projection: 13.7,
      },
      {
        position: "K",
        player_id: "11533",
        name: "Brandon Aubrey",
        team: "DAL",
        projection: 9.69,
      },
      {
        position: "DEF",
        player_id: "WAS",
        name: null,
        team: "WAS",
        projection: 7.48,
      },
    ],
    total: 118.17,
  },
  {
    id: 9,
    players: [
      {
        position: "QB",
        player_id: "6904",
        name: "Jalen Hurts",
        team: "PHI",
        projection: 25.42,
      },
      {
        position: "RB",
        player_id: "5850",
        name: "Josh Jacobs",
        team: "GB",
        projection: 14.96,
      },
      {
        position: "RB",
        player_id: "12489",
        name: "RJ Harvey",
        team: "DEN",
        projection: 10.48,
      },
      {
        position: "WR",
        player_id: "7547",
        name: "Amon-Ra St. Brown",
        team: "DET",
        projection: 13.29,
      },
      {
        position: "WR",
        player_id: "5927",
        name: "Terry McLaurin",
        team: "WAS",
        projection: 12.28,
      },
      {
        position: "TE",
        player_id: "1466",
        name: "Travis Kelce",
        team: "KC",
        projection: 8.87,
      },
      {
        position: "RB",
        player_id: "7543",
        name: "Travis Etienne",
        team: "JAX",
        projection: 9.38,
      },
      {
        position: "K",
        player_id: "11786",
        name: "Cam Little",
        team: "JAX",
        projection: 9.04,
      },
      {
        position: "DEF",
        player_id: "SF",
        name: null,
        team: "SF",
        projection: 6.76,
      },
    ],
    total: 110.48,
  },
  {
    id: 11,
    players: [
      {
        position: "QB",
        player_id: "11566",
        name: "Jayden Daniels",
        team: "WAS",
        projection: 24.53,
      },
      {
        position: "RB",
        player_id: "12529",
        name: "TreVeyon Henderson",
        team: "NE",
        projection: 12.83,
      },
      {
        position: "RB",
        player_id: "8228",
        name: "Jaylen Warren",
        team: "PIT",
        projection: 11.97,
      },
      {
        position: "WR",
        player_id: "9493",
        name: "Puka Nacua",
        team: "LAR",
        projection: 13.25,
      },
      {
        position: "WR",
        player_id: "11632",
        name: "Malik Nabers",
        team: "NYG",
        projection: 14.19,
      },
      {
        position: "TE",
        player_id: "10859",
        name: "Sam LaPorta",
        team: "DET",
        projection: 8.87,
      },
      {
        position: "WR",
        player_id: "12514",
        name: "Emeka Egbuka",
        team: "TB",
        projection: 9.95,
      },
      {
        position: "K",
        player_id: "4227",
        name: "Harrison Butker",
        team: "KC",
        projection: 9.24,
      },
      {
        position: "DEF",
        player_id: "DET",
        name: null,
        team: "DET",
        projection: 6.57,
      },
    ],
    total: 111.4,
  },
  {
    id: 8,
    players: [
      {
        position: "QB",
        player_id: "3294",
        name: "Dak Prescott",
        team: "DAL",
        projection: 20.27,
      },
      {
        position: "RB",
        player_id: "4034",
        name: "Christian McCaffrey",
        team: "SF",
        projection: 18.58,
      },
      {
        position: "RB",
        player_id: "8155",
        name: "Breece Hall",
        team: "NYJ",
        projection: 12.68,
      },
      {
        position: "WR",
        player_id: "11631",
        name: "Brian Thomas",
        team: "JAX",
        projection: 12.52,
      },
      {
        position: "WR",
        player_id: "6801",
        name: "Tee Higgins",
        team: "CIN",
        projection: 12.55,
      },
      {
        position: "TE",
        player_id: "4144",
        name: "Jonnu Smith",
        team: "PIT",
        projection: 4.87,
      },
      {
        position: "RB",
        player_id: "5892",
        name: "David Montgomery",
        team: "DET",
        projection: 11.2,
      },
      {
        position: "K",
        player_id: "1945",
        name: "Chris Boswell",
        team: "PIT",
        projection: 8.58,
      },
      {
        position: "DEF",
        player_id: "PIT",
        name: null,
        team: "PIT",
        projection: 7.77,
      },
    ],
    total: 109.02,
  },
];
export const fakeTopPerformers = [
  {
    player: {
      position: "QB",
      player_id: "6770",
      name: "Joe Burrow",
      team: "CIN",
    },

    points: 36.98,
    user: "The Princess McBride",
  },
  {
    player: {
      position: "WR",
      player_id: "6801",
      name: "Tee Higgins",
      team: "CIN",
    },
    points: 34.6,
    user: "LaPorta Potty",
  },
  {
    player: {
      position: "QB",
      player_id: "11566",
      name: "Jayden Daniels",
      team: "WAS",
    },
    points: 31.78,
    user: "Baby Back Gibbs",
  },
  {
    player: {
      position: "QB",
      player_id: "8183",
      name: "Brock Purdy",
      team: "SF",
    },
    points: 30.28,
    user: "Just the Tua Us",
  },
];

export const fakeBottomPerformers = [
  {
    player: {
      position: "DEF",
      player_id: "IND",
      name: null,
      team: "IND",
    },
    points: -4,
    user: "Breece's Puffs",
  },
  {
    player: {
      position: "K",
      player_id: "3451",
      name: "Ka'imi Fairbairn",
      team: "HOU",
    },
    points: 0,
    user: "Bijan Mustard",
  },
  {
    player: {
      position: "WR",
      player_id: "5927",
      name: "Terry McLaurin",
      team: "WAS",
    },
    points: 1,
    user: "Saquondo ",
  },
  {
    player: {
      position: "RB",
      player_id: "9757",
      name: "Kendre Miller",
      team: "NO",
    },
    points: 2.4,
    user: "Ja’Marr the Merrier",
  },
];

export const fakeBenchPerformers = [
  {
    player: {
      position: "QB",
      player_id: "4046",
      name: "Patrick Mahomes",
      team: "KC",
    },

    points: 26,
    user: "Bijan Mustard",
  },
  {
    player: {
      position: "QB",
      player_id: "4943",
      name: "Sam Darnold",
      team: "SEA",
    },
    points: 24.78,
    user: "Dak to the Future",
  },
  {
    player: {
      position: "TE",
      player_id: "1339",
      name: "Zach Ertz",
      team: "WAS",
    },
    points: 22.2,
    user: "Lamario Kart ",
  },
  {
    player: {
      position: "WR",
      player_id: "8148",
      name: "Jameson Williams",
      team: "DET",
    },
    points: 22,
    user: "Breece's Puffs",
  },
];
export const fakeHighlights = [
  "<b>Collard Greens</b> is the hottest team, riding a dominant 5-game win streak and averaging 132 points per game over that span, vaulting to 3rd place.",
  "<b>Saquondo </b> leads the league in total points (1646) but just saw a 4-game win streak snapped, opening the door for surging contenders.",
];
export const fakeWaiverMoves = [
  {
    id: 1,
    user: {
      id: "1",
      name: "Just the Tua Us",
      username: "Just the Tua Us",
      avatar: "3fd3d500b13b04926820e10e9306f6ab",
      avatarImg: "../avatars/avatar1.svg",
    },
    adds: "Isaiah Likely",
    week: 1,
    value: 23.3,
    position: "TE",
  },
  {
    id: 1,
    user: {
      id: "1",
      name: "Just the Tua Us",
      username: "Just the Tua Us",
      avatar: "3fd3d500b13b04926820e10e9306f6ab",
      avatarImg: "../avatars/avatar1.svg",
    },
    adds: "Ray Davis",
    week: 3,
    value: 35.3,
    position: "RB",
  },
  {
    id: 1,
    user: {
      id: "1",
      name: "Just the Tua Us",
      username: "Just the Tua Us",
      avatar: "3fd3d500b13b04926820e10e9306f6ab",
      avatarImg: "../avatars/avatar1.svg",
    },
    adds: "Darnell Mooney",
    week: 7,
    value: 18.4,
    position: "WR",
  },
  {
    id: 1,
    user: {
      id: "1",
      name: "Just the Tua Us",
      username: "Just the Tua Us",
      avatar: "3fd3d500b13b04926820e10e9306f6ab",
      avatarImg: "../avatars/avatar1.svg",
    },
    adds: "Kimani Vidal",
    week: 8,
    value: 68.2,
    position: "RB",
  },
  {
    id: 1,
    user: {
      id: "1",
      name: "Just the Tua Us",
      username: "Just the Tua Us",
      avatar: "3fd3d500b13b04926820e10e9306f6ab",
      avatarImg: "../avatars/avatar1.svg",
    },
    adds: "CIN Defense",
    week: 10,
    value: 22.4,
    position: "DEF",
  },
  {
    id: 1,
    user: {
      id: "1",
      name: "Just the Tua Us",
      username: "Just the Tua Us",
      avatar: "3fd3d500b13b04926820e10e9306f6ab",
      avatarImg: "../avatars/avatar1.svg",
    },
    adds: "Juwan Johnson",
    week: 11,
    value: 18.2,
    position: "TE",
  },
  {
    id: 1,
    user: {
      id: "1",
      name: "Just the Tua Us",
      username: "Just the Tua Us",
      avatar: "3fd3d500b13b04926820e10e9306f6ab",
      avatarImg: "../avatars/avatar1.svg",
    },
    adds: "Stone Smartt",
    week: 13,
    value: 26,
    position: "TE",
  },
  {
    id: 2,
    user: {
      id: "2",
      name: "Bijan Mustard",
      username: "Bijan Mustard",
      avatar: "a77d198f5c82bd93d3da5bd10493f7cd",
      avatarImg: "../avatars/avatar2.svg",
    },
    adds: "Baker Mayfield",
    week: 2,
    value: 10.4,
    position: "QB",
  },
  {
    id: 3,
    user: {
      id: "3",
      name: "The Princess McBride",
      username: "The Princess McBride",
      avatar: "8eb8f8bf999945d523f2c4033f70473e",
      avatarImg: "../avatars/avatar3.svg",
    },
    adds: "Jerome Ford",
    week: 9,
    value: 31.1,
    position: "RB",
  },
  {
    id: 4,
    user: {
      id: "4",
      name: "Baby Back Gibbs",
      username: "Baby Back Gibbs",
      avatar: "15d7cf259bc30eab8f6120f45f652fb6",
      avatarImg: "../avatars/avatar4.svg",
    },
    adds: "Cam Akers",
    week: 3,
    value: 40.6,
    position: "RB",
  },
  {
    id: 5,
    user: {
      id: "5",
      name: "Breece's Puffs",
      username: "Breece's Puffs",
      avatar: "15d7cf259bc30eab8f6120f45f652fb6",
      avatarImg: "../avatars/avatar5.svg",
    },
    adds: "Dalton Schultz",
    week: 3,
    value: 22.6,
    position: "RB",
  },
];

export const fakeTrades = [
  {
    team1: {
      user: {
        id: "1",
        name: "Just the Tua Us",
        avatar: "3fd3d500b13b04926820e10e9306f6ab",
        avatarImg: "../avatars/avatar1.svg",
        transactions: 14,
      },
      players: ["J.K. Dobbins"],
      draftPicks: [],
      waiverBudget: [],
      value: [19],
    },
    team2: {
      user: {
        id: "2",
        name: "Bijan Mustard",
        avatar: "a77d198f5c82bd93d3da5bd10493f7cd",
        avatarImg: "../avatars/avatar2.svg",
        transactions: 10,
      },
      players: ["Zack Moss", "Tyler Allgeier"],
      draftPicks: [],
      waiverBudget: [],
      value: [32.8, 41.2],
    },
  },
  {
    team1: {
      user: {
        id: "3",
        name: "The Princess McBride",
        avatar: "8eb8f8bf999945d523f2c4033f70473e",
        avatarImg: "../avatars/avatar3.svg",
        transactions: 25,
      },
      players: ["Justice Hill"],
      draftPicks: [],
      waiverBudget: [],
      value: [38.8],
    },
    team2: {
      user: {
        id: "4",
        name: "Baby Back Gibbs",
        avatar: "15d7cf259bc30eab8f6120f45f652fb6",
        avatarImg: "../avatars/avatar4.svg",
        transactions: 31,
      },
      players: ["Tyjae Spears"],
      draftPicks: [],
      waiverBudget: [],
      value: [34],
    },
  },
  {
    team1: {
      user: {
        id: "4",
        name: "Baby Back Gibbs",
        avatar: "15d7cf259bc30eab8f6120f45f652fb6",
        avatarImg: "../avatars/avatar4.svg",
        transactions: 31,
      },
      players: ["Tank Bigsby"],
      draftPicks: [],
      waiverBudget: [],
      value: [40],
    },
    team2: {
      user: {
        id: "5",
        name: "Breece's Puffs",
        avatar: "15d7cf259bc30eab8f6120f45f652fb6",
        avatarImg: "../avatars/avatar5.svg",
        transactions: 38,
      },
      players: ["Jordan Love"],
      draftPicks: [],
      waiverBudget: [],
      value: [17],
    },
  },
  {
    team1: {
      user: {
        id: "6",
        name: "Saquondo ",
        avatar: "d6ad9a18c52dcdb704399beed5d5b21f",
        avatarImg: "../avatars/avatar6.svg",
        transactions: 29,
      },
      players: ["Justice Hill", "Quentin Johnston", "Jayden Daniels"],
      draftPicks: [],
      waiverBudget: [],
      value: [38.8, 44.4, 11.5],
    },
    team2: {
      user: {
        id: "7",
        name: "Lamario Kart ",
        avatar: "3d8ea1e7289177ddf22dd57e107ee334",
        avatarImg: "../avatars/avatar7.svg",
        transactions: 19,
      },
      players: ["Jalen Hurts", "Tank Dell", "Tyjae Spears"],
      draftPicks: [],
      waiverBudget: [],
      value: [9.7, 37, 34],
    },
  },
  {
    team1: {
      user: {
        id: "8",
        name: "Ja’Marr the Merrier",
        avatar: "4f4090e5e9c3941414db40a871e3e909",
        avatarImg: "../avatars/avatar8.svg",
        transactions: 40,
      },
      players: ["Aaron Jones", "Cam Akers", "Najee Harris", "Cedric Tillman"],
      draftPicks: [],
      waiverBudget: [],
      value: [17.3, 44.5, 25.7, 49.6],
    },
    team2: {
      user: {
        id: "9",
        name: "Dak to the Future",
        avatar: "b3338675f635c2c1f42b469621d38ec6",
        avatarImg: "../avatars/avatar9.svg",
        transactions: 33,
      },
      players: ["Alvin Kamara", "Bo Nix"],
      draftPicks: [],
      waiverBudget: [],
      value: [16.3, 15],
    },
  },
  {
    team1: {
      user: {
        id: "9",
        name: "Dak to the Future",
        avatar: "b3338675f635c2c1f42b469621d38ec6",
        avatarImg: "../avatars/avatar9.svg",
        transactions: 33,
      },
      players: ["Nick Chubb", "Courtland Sutton", "James Cook", "Bucky Irving"],
      draftPicks: [],
      waiverBudget: [],
      value: [30.5, 27.4, 13.4, 15.2],
    },
    team2: {
      user: {
        id: "10",
        name: "LaPorta Potty",
        avatar: "81d984f3556782876d25195356b0ab58",
        avatarImg: "../avatars/avatar10.svg",
        transactions: 42,
      },
      players: [
        "Javonte Williams",
        "Tyler Allgeier",
        "Bijan Robinson",
        "Quentin Johnston",
      ],
      draftPicks: [],
      waiverBudget: [],
      value: [48.6, 46.2, 7.2, 53],
    },
  },
];

export const fakeUsers = [
  {
    id: "1",
    name: "Just the Tua Us",
    avatar: "3fd3d500b13b04926820e10e9306f6ab",
    avatarImg: "../avatars/avatar1.svg",
    transactions: 14,
  },
  {
    id: "2",
    name: "Bijan Mustard",
    avatar: "a77d198f5c82bd93d3da5bd10493f7cd",
    avatarImg: "../avatars/avatar2.svg",
    transactions: 10,
  },
  {
    id: "3",
    name: "The Princess McBride",
    avatar: "8eb8f8bf999945d523f2c4033f70473e",
    avatarImg: "../avatars/avatar3.svg",
    transactions: 25,
  },
  {
    id: "4",
    name: "Baby Back Gibbs",
    avatar: "15d7cf259bc30eab8f6120f45f652fb6",
    avatarImg: "../avatars/avatar4.svg",
    transactions: 31,
  },
  {
    id: "5",
    name: "Breece's Puffs",
    avatar: "15d7cf259bc30eab8f6120f45f652fb6",
    avatarImg: "../avatars/avatar5.svg",
    transactions: 38,
  },
  {
    id: "6",
    name: "Saquondo ",
    avatar: "d6ad9a18c52dcdb704399beed5d5b21f",
    avatarImg: "../avatars/avatar6.svg",
    transactions: 29,
  },
  {
    id: "7",
    name: "Lamario Kart ",
    avatar: "3d8ea1e7289177ddf22dd57e107ee334",
    avatarImg: "../avatars/avatar7.svg",
    transactions: 19,
  },
  {
    id: "8",
    name: "Ja’Marr the Merrier",
    avatar: "4f4090e5e9c3941414db40a871e3e909",
    avatarImg: "../avatars/avatar8.svg",
    transactions: 40,
  },
  {
    id: "9",
    name: "Dak to the Future",
    avatar: "b3338675f635c2c1f42b469621d38ec6",
    avatarImg: "../avatars/avatar9.svg",
    transactions: 33,
  },
  {
    id: "10",
    name: "LaPorta Potty",
    avatar: "81d984f3556782876d25195356b0ab58",
    avatarImg: "../avatars/avatar10.svg",
    transactions: 42,
  },
];
export const fakeRosters = [
  {
    id: "1",
    pointsFor: 1379,
    pointsAgainst: 1509,
    potentialPoints: 1500,
    wins: 5,
    losses: 9,
    ties: 0,
    rosterId: 1,
    managerEfficiency: 0.914,
    recordByWeek: "WWLWLLLLWLWLLL",
  },
  {
    id: "2",
    pointsFor: 1383,
    pointsAgainst: 1412,
    potentialPoints: 1482,
    wins: 7,
    losses: 7,
    ties: 0,
    rosterId: 2,
    managerEfficiency: 0.953,
    recordByWeek: "WLWLLWLWWLWWLL",
  },
  {
    id: "3",
    pointsFor: 1549,
    potentialPoints: 1690,
    pointsAgainst: 1501,
    wins: 9,
    losses: 5,
    ties: 0,
    rosterId: 3,
    managerEfficiency: 0.916,
    recordByWeek: "WLWLWLWWLLWWWW",
  },
  {
    id: "4",
    pointsFor: 1553,
    pointsAgainst: 1433,
    potentialPoints: 1807,
    wins: 8,
    losses: 6,
    ties: 0,
    rosterId: 4,
    managerEfficiency: 0.859,
    recordByWeek: "WLWLWLWWLWLWLW",
  },
  {
    id: "5",
    pointsFor: 1599,
    pointsAgainst: 1535,
    potentialPoints: 1790,
    wins: 8,
    losses: 6,
    ties: 0,
    rosterId: 5,
    managerEfficiency: 0.893,
    recordByWeek: "WLLWWLLWWLLWWW",
  },
  {
    id: "6",
    pointsFor: 1646,
    potentialPoints: 1796,
    pointsAgainst: 1502,
    wins: 9,
    losses: 5,
    ties: 0,
    rosterId: 6,
    managerEfficiency: 0.916,
    recordByWeek: "LWWWLWWWLLWWLW",
  },
  {
    id: "7",
    pointsFor: 1475,
    potentialPoints: 1725,
    pointsAgainst: 1408,
    wins: 6,
    losses: 8,
    ties: 0,
    rosterId: 7,
    managerEfficiency: 0.855,
    recordByWeek: "LWLWWLWLWWLLLL",
  },
  {
    id: "8",
    pointsFor: 1567,
    potentialPoints: 1787,
    pointsAgainst: 1501,
    wins: 8,
    losses: 6,
    ties: 0,
    rosterId: 8,
    managerEfficiency: 0.876,
    recordByWeek: "LWWLLWLLLWWWWW",
  },
  {
    id: "9",
    pointsFor: 1402,
    potentialPoints: 1643,
    pointsAgainst: 1543,
    wins: 5,
    losses: 9,
    ties: 0,
    rosterId: 9,
    managerEfficiency: 0.853,
    recordByWeek: "LWLWLLWLLLLWWL",
  },
  {
    id: "10",
    pointsFor: 1478,
    potentialPoints: 1697,
    pointsAgainst: 1470,
    wins: 7,
    losses: 7,
    ties: 0,
    rosterId: 10,
    managerEfficiency: 0.87,
    recordByWeek: "LLWLLWWLWWWLWL",
  },
];
export const fakePoints = [
  {
    rosterId: 1,
    points: [
      96.26, 103.9, 76.3, 91.08, 133.34, 114.08, 92.26, 111.02, 63.34, 84.72,
      121.1, 78.18, 101.68, 82.64,
    ],
    playoffPoints: [94.31, 99.75, 103.21],
    matchups: [2, 3, 4, 2, 2, 1, 3, 5, 1, 3, 2, 2, 4, 2],
  },
  {
    rosterId: 2,
    points: [
      108.78, 97.72, 145.82, 80.42, 89.14, 92.92, 74.88, 120.74, 120.56, 92.92,
      67.44, 101.46, 109.26, 82.42,
    ],
    playoffPoints: [88.33, 104.13, 110.87],
    matchups: [1, 1, 5, 2, 3, 5, 4, 1, 5, 2, 4, 3, 2, 1],
  },
  {
    rosterId: 3,
    points: [
      129.14, 95, 125.88, 70.72, 130.94, 88.14, 123.86, 127.2, 109.2, 100.32,
      104.28, 128.62, 126, 124.48,
    ],
    playoffPoints: [101.98, 110.71, 98.31],
    matchups: [3, 4, 2, 3, 1, 4, 3, 5, 3, 2, 5, 2, 5, 4],
  },
  {
    rosterId: 4,
    points: [
      104.04, 89.66, 159.92, 105.28, 102.92, 153.98, 102.64, 115.06, 77.12,
      130.76, 103.5, 126.72, 87.2, 95,
    ],
    playoffPoints: [103.53, 124.68, 100.48],
    matchups: [4, 5, 3, 5, 5, 4, 1, 4, 3, 5, 1, 1, 1, 1],
  },
  {
    rosterId: 5,
    points: [
      90.74, 97.14, 113.06, 148.9, 162.78, 73.82, 90.64, 123.4, 144.1, 101.94,
      86.04, 147.46, 125.08, 94.82,
    ],
    playoffPoints: [111.39, 120.01, 89.68],
    matchups: [5, 2, 1, 1, 4, 3, 2, 3, 5, 4, 5, 3, 1, 3],
  },
  {
    rosterId: 6,
    points: [
      114.54, 126.36, 113.92, 151.7, 115.26, 99.36, 105.2, 120.26, 123.42,
      127.18, 131.9, 142.56, 99.28, 129.62,
    ],
    playoffPoints: [99.58, 131.79, 101.39],
    matchups: [3, 1, 1, 4, 2, 3, 5, 2, 2, 1, 4, 4, 4, 5],
  },
  {
    rosterId: 7,
    points: [
      97.36, 116.08, 126.58, 125.54, 90.04, 97.42, 104.88, 91.38, 104.68, 96.62,
      83.36, 136.08, 115, 90.44,
    ],
    playoffPoints: [97.32, 93.11, 105.11],
    matchups: [4, 2, 5, 5, 3, 1, 1, 1, 4, 3, 3, 5, 3, 3],
  },
  {
    rosterId: 8,
    points: [
      89.5, 145.42, 131.78, 86.26, 86.12, 112.2, 90.76, 101.26, 86.78, 140.92,
      104, 139.2, 128.62, 90.04,
    ],
    playoffPoints: [116.21, 108.19, 98.14],
    matchups: [2, 4, 4, 4, 1, 5, 5, 3, 2, 1, 1, 5, 3, 2],
  },
  {
    rosterId: 9,
    points: [
      89.94, 111.94, 98.68, 108.96, 97.36, 93.14, 104.16, 98.38, 94.58, 128.9,
      114.78, 92.16, 93.62, 76.3,
    ],
    playoffPoints: [95.97, 112.49, 118.24],
    matchups: [1, 5, 2, 3, 5, 2, 2, 2, 4, 5, 2, 1, 5, 4],
  },
  {
    rosterId: 10,
    points: [
      63.68, 78.88, 115.16, 108.64, 102.28, 100.5, 97.4, 149.92, 99.02, 116.28,
      108.64, 82.4, 131.96, 123.26,
    ],
    playoffPoints: [100.55, 107.57, 117.91],
    matchups: [5, 3, 3, 1, 4, 2, 4, 4, 1, 4, 3, 4, 2, 5],
  },
];

export const fakeWinnersBracket = [
  {
    t2: 4,
    t1: 10,
    w: 4,
    l: 10,
    r: 1,
    m: 1,
  },
  {
    t2: 5,
    t1: 3,
    w: 5,
    l: 3,
    r: 1,
    m: 2,
  },
  {
    t2_from: {
      w: 1,
    },
    t2: 4,
    t1: 8,
    w: 4,
    l: 8,
    r: 2,
    m: 3,
  },
  {
    t2_from: {
      w: 2,
    },
    t2: 5,
    t1: 6,
    w: 6,
    l: 5,
    r: 2,
    m: 4,
  },
  {
    t1_from: {
      l: 1,
    },
    t2_from: {
      l: 2,
    },
    t2: 3,
    t1: 10,
    w: 3,
    l: 10,
    r: 2,
    p: 5,
    m: 5,
  },
  {
    t1_from: {
      w: 3,
    },
    t2_from: {
      w: 4,
    },
    t2: 6,
    t1: 4,
    w: 6,
    l: 4,
    r: 3,
    p: 1,
    m: 6,
  },
  {
    t1_from: {
      l: 3,
    },
    t2_from: {
      l: 4,
    },
    t2: 5,
    t1: 8,
    w: 8,
    l: 5,
    r: 3,
    p: 3,
    m: 7,
  },
];

export const fakeLosersBracket = [
  {
    t2: 1,
    t1: 2,
    w: 2,
    l: 1,
    r: 1,
    m: 1,
  },
  {
    t2: 7,
    t1: 9,
    w: 9,
    l: 7,
    r: 1,
    m: 2,
  },
  {
    t1_from: {
      w: 1,
    },
    t2_from: {
      w: 2,
    },
    t2: 9,
    t1: 2,
    w: 2,
    l: 9,
    r: 2,
    m: 3,
    p: 1,
  },
  {
    t1_from: {
      l: 1,
    },
    t2_from: {
      l: 2,
    },
    t2: 7,
    t1: 1,
    w: 7,
    l: 1,
    r: 2,
    m: 4,
    p: 3,
  },
];

export const fakePlayoffData = [
  {
    name: "Saquondo ",
    placement: [100, 0, 0, 0, 0, 0],
  },
  {
    name: "Breece's Puffs",
    placement: [0, 0, 100, 0, 0, 0],
  },
  {
    name: "Baby Back Gibbs",
    placement: [0, 0, 0, 100, 0, 0],
  },
  {
    name: "Ja’Marr the Merrier",
    placement: [0, 100, 0, 0, 0, 0],
  },
  {
    name: "The Princess McBride",
    placement: [0, 0, 0, 0, 100, 0],
  },
  {
    name: "LaPorta Potty",
    placement: [0, 0, 0, 0, 0, 100],
  },
  {
    name: "Lamario Kart ",
    placement: [0, 0, 0, 0, 0, 0],
  },
  {
    name: "Bijan Mustard",
    placement: [0, 0, 0, 0, 0, 0],
  },
  {
    name: "Dak to the Future",
    placement: [0, 0, 0, 0, 0, 0],
  },
  {
    name: "Just the Tua Us",
    placement: [0, 0, 0, 0, 0, 0],
  },
];

export const fakeProjectionData = [
  {
    name: "Saquondo ",
    data: [
      { position: "RB", projection: 482 },
      { position: "WR", projection: 369 },
      { projection: 288, position: "QB" },
      { projection: 74, position: "TE" },
      { projection: 99, position: "K" },
      { projection: 88, position: "DEF" },
    ],
    total: 1400,
  },
  {
    name: "Breece's Puffs",
    data: [
      { position: "RB", projection: 410 },
      { position: "WR", projection: 427 },
      { projection: 254, position: "QB" },
      { projection: 81, position: "TE" },
      { projection: 115, position: "K" },
      { projection: 88, position: "DEF" },
    ],
    total: 1375,
  },
  {
    name: "Baby Back Gibbs",
    data: [
      { position: "RB", projection: 376 },
      { position: "WR", projection: 336 },
      { projection: 315, position: "QB" },
      { projection: 77, position: "TE" },
      { projection: 124, position: "K" },
      { projection: 97, position: "DEF" },
    ],
    total: 1325,
  },
  {
    name: "Ja’Marr the Merrier",
    data: [
      { position: "RB", projection: 412 },
      { position: "WR", projection: 351 },
      { projection: 298, position: "QB" },
      { projection: 62, position: "TE" },
      { projection: 114, position: "K" },
      { projection: 85, position: "DEF" },
    ],
    total: 1322,
  },
  {
    name: "The Princess McBride",
    data: [
      { position: "RB", projection: 390 },
      { position: "WR", projection: 354 },
      { projection: 297, position: "QB" },
      { projection: 46, position: "TE" },
      { projection: 120, position: "K" },
      { projection: 102, position: "DEF" },
    ],
    total: 1309,
  },
  {
    name: "LaPorta Potty",
    data: [
      { position: "RB", projection: 359 },
      { position: "WR", projection: 342 },
      { projection: 280, position: "QB" },
      { projection: 71, position: "TE" },
      { projection: 121, position: "K" },
      { projection: 90, position: "DEF" },
    ],
    total: 1263,
  },
  {
    name: "Lamario Kart ",
    data: [
      { position: "RB", projection: 422 },
      { position: "WR", projection: 331 },
      { projection: 240, position: "QB" },
      { projection: 69, position: "TE" },
      { projection: 98, position: "K" },
      { projection: 93, position: "DEF" },
    ],
    total: 1253,
  },
  {
    name: "Bijan Mustard",
    data: [
      { position: "RB", projection: 374 },
      { position: "WR", projection: 335 },
      { projection: 264, position: "QB" },
      { projection: 55, position: "TE" },
      { projection: 111, position: "K" },
      { projection: 100, position: "DEF" },
    ],
    total: 1239,
  },
  {
    name: "Dak to the Future",
    data: [
      { position: "RB", projection: 400 },
      { position: "WR", projection: 330 },
      { projection: 259, position: "QB" },
      { projection: 90, position: "TE" },
      { projection: 83, position: "K" },
      { projection: 74, position: "DEF" },
    ],
    total: 1230,
  },
  {
    name: "Just the Tua Us",
    data: [
      { position: "RB", projection: 247 },
      { position: "WR", projection: 344 },
      { projection: 251, position: "QB" },
      { projection: 97, position: "TE" },
      { projection: 109, position: "K" },
      { projection: 88, position: "DEF" },
    ],
    total: 1136,
  },
];
