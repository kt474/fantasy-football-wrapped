// helper methods
import { groupBy, flatten, zip, mean, max, min, countBy } from "lodash";
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

export const getTrades = (transactions: any) => {
  const result: any[] = [];
  transactions.forEach((transaction: any) => {
    if (transaction.status === "complete" && transaction.type === "trade") {
      result.push(transaction);
    }
  });
  return result;
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
        }: {
          rosterId: number;
          points: number;
          matchupId: number;
          starters: number[];
          starterPoints: string[];
        }
      ) => {
        if (!result[rosterId]) {
          result[rosterId] = {
            rosterId,
            points: [],
            matchups: [],
            starters: [],
            starterPoints: [],
          };
        }
        result[rosterId].points.push(points);
        result[rosterId].matchups.push(matchupId);
        result[rosterId].starters.push(starters);
        result[rosterId].starterPoints.push(starterPoints);
        return result;
      },
      {}
    );
    allTeams.push(Object.values(consolidatedObject)[0]);
  });
  return allTeams;
};

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
        name: "Pollard Greens",
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
        name: "Finding Deebo",
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
        name: "Loud and Stroud",
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
    name: "Pollard Greens",
    avatar: "15d7cf259bc30eab8f6120f45f652fb6",
    avatarImg: "../avatars/avatar5.svg",
    transactions: 38,
  },
  {
    id: "6",
    name: "Finding Deebo",
    avatar: "d6ad9a18c52dcdb704399beed5d5b21f",
    avatarImg: "../avatars/avatar6.svg",
    transactions: 29,
  },
  {
    id: "7",
    name: "Loud and Stroud",
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
    name: "Finding Deebo",
    placement: [100, 0, 0, 0, 0, 0],
  },
  {
    name: "Pollard Greens",
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
    name: "Loud and Stroud",
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
    name: "Finding Deebo",
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
    name: "Pollard Greens",
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
    name: "Loud and Stroud",
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
