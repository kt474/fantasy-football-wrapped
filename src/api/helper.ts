// helper methods
import { groupBy, flatten, zip, mean, max, min, countBy } from "lodash";
import { getMatchup } from "./api";

export const createTableData = (
  users: any[],
  rosters: any[],
  points: any[],
  medianScoring: boolean
) => {
  if (users && points) {
    const combined = users.map((a: any) => {
      const matched = rosters.find((b: any) => b.id === a.id);
      if (matched) {
        return {
          ...a,
          ...matched,
        };
      }
      return null;
    });
    const filtered = combined.filter((a: any) => a !== null);
    const combinedPoints = filtered.map((a: any) => ({
      ...a,
      ...points.find((b: any) => b.rosterId === a.rosterId),
    }));

    const pointsArr: any[] = [];
    combinedPoints.forEach((value: any) => {
      pointsArr.push(value.points);
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
        if (currentTeam.losses !== 0 && currentTeam.wins !== 0) {
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
        if (value.points) {
          for (let i = 0; i < value.points.length; i++) {
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
              }
          }
        }
        value["randomScheduleWins"] = randomScheduleWins / numOfSimulations;
        if (medianScoring) {
          value["randomScheduleWins"] = 3;
        }
        value["rating"] = getPowerRanking(
          mean(value.points),
          Number(max(value.points)),
          Number(min(value.points)),
          value.wins / (value.wins + value.losses)
        );
        if (!medianScoring) {
          const pairs = zip(value.points, medians);
          const counts = countBy(pairs, ([a, b]: [number, number]) => a > b);
          value["winsWithMedian"] = counts["true"] + value.wins;
          value["lossesWithMedian"] = counts["false"] + value.losses;
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
    const shouldCount = obj.status === "complete";

    if (shouldCount) {
      countMap[id] = (countMap[id] || 0) + 1;
    }

    return countMap;
  }, {});
};

export const sumWeeklyTransactions = (trasactionObj: any) => {
  trasactionObj.reduce((sumMap: any, obj: any) => {
    for (let [id, value] of Object.entries(obj)) {
      sumMap[id] = (sumMap[id] || 0) + value;
    }
    return sumMap;
  }, {});
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
  const allMatchups = [];
  for (let i: number = startWeek; i < regularSeasonLength; i++) {
    const singleWeek = await getMatchup(i + 1, leagueId);
    allMatchups.push(singleWeek);
  }

  const grouped = Object.values(groupBy(flatten(allMatchups), "rosterId"));
  const allTeams: Array<object> = [];
  grouped.forEach((group: any) => {
    let consolidatedObject: Record<
      number,
      { rosterId: number; points: number[] }
    > = group.reduce(
      (
        result: any,
        { rosterId, points }: { rosterId: number; points: number }
      ) => {
        if (!result[rosterId]) {
          result[rosterId] = { rosterId, points: [] };
        }
        result[rosterId].points.push(points);
        return result;
      },
      {}
    );
    allTeams.push(Object.values(consolidatedObject)[0]);
  });
  return allTeams;
};

export const fakeUsers = [
  {
    id: "1",
    name: "Just the Tua Us",
    avatar: "3fd3d500b13b04926820e10e9306f6ab",
    avatarImg: "../avatars/avatar1.svg",
  },
  {
    id: "2",
    name: "Bijan Mustard",
    avatar: "a77d198f5c82bd93d3da5bd10493f7cd",
    avatarImg: "../avatars/avatar2.svg",
  },
  {
    id: "3",
    name: "The Princess McBride",
    avatar: "8eb8f8bf999945d523f2c4033f70473e",
    avatarImg: "../avatars/avatar3.svg",
  },
  {
    id: "4",
    name: "Baby Back Gibbs",
    avatar: "15d7cf259bc30eab8f6120f45f652fb6",
    avatarImg: "../avatars/avatar4.svg",
  },
  {
    id: "5",
    name: "Pollard Greens",
    avatar: "15d7cf259bc30eab8f6120f45f652fb6",
    avatarImg: "../avatars/avatar5.svg",
  },
  {
    id: "6",
    name: "Finding Deebo",
    avatar: "d6ad9a18c52dcdb704399beed5d5b21f",
    avatarImg: "../avatars/avatar6.svg",
  },
  {
    id: "7",
    name: "Loud and Stroud",
    avatar: "3d8ea1e7289177ddf22dd57e107ee334",
    avatarImg: "../avatars/avatar7.svg",
  },
  {
    id: "8",
    name: "Ja’Marr the Merrier",
    avatar: "4f4090e5e9c3941414db40a871e3e909",
    avatarImg: "../avatars/avatar8.svg",
  },
  {
    id: "9",
    name: "Game of Mahomes",
    avatar: "b3338675f635c2c1f42b469621d38ec6",
    avatarImg: "../avatars/avatar9.svg",
  },
  {
    id: "10",
    name: "Dak to the Future",
    avatar: "81d984f3556782876d25195356b0ab58",
    avatarImg: "../avatars/avatar10.svg",
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
    rosterId: 1,
    managerEfficiency: 0.914,
    recordByWeek: "LLLWLWWLLWLWLL",
  },
  {
    id: "2",
    pointsFor: 1383,
    pointsAgainst: 1412,
    potentialPoints: 1482,
    wins: 7,
    losses: 7,
    rosterId: 2,
    managerEfficiency: 0.953,
    recordByWeek: "WWLWLWWLLWLWLL",
  },
  {
    id: "3",
    pointsFor: 1549,
    potentialPoints: 1690,
    pointsAgainst: 1501,
    wins: 9,
    losses: 5,
    rosterId: 3,
    managerEfficiency: 0.916,
    recordByWeek: "LLLWLWWWWWLWWW",
  },
  {
    id: "4",
    pointsFor: 1553,
    pointsAgainst: 1433,
    potentialPoints: 1807,
    wins: 8,
    losses: 6,
    rosterId: 4,
    managerEfficiency: 0.859,
    recordByWeek: "LWWWLWWLLWLWWL",
  },
  {
    id: "5",
    pointsFor: 1599,
    pointsAgainst: 1535,
    potentialPoints: 1790,
    wins: 8,
    losses: 6,
    rosterId: 5,
    managerEfficiency: 0.893,
    recordByWeek: "WWLWLWWLLWLWLW",
  },
  {
    id: "6",
    pointsFor: 1646,
    potentialPoints: 1796,
    pointsAgainst: 1502,
    wins: 9,
    losses: 5,
    rosterId: 6,
    managerEfficiency: 0.916,
    recordByWeek: "LWWWLWWLWWLWWL",
  },
  {
    id: "7",
    pointsFor: 1475,
    potentialPoints: 1725,
    pointsAgainst: 1408,
    wins: 6,
    losses: 8,
    rosterId: 7,
    managerEfficiency: 0.855,
    recordByWeek: "LWLWLWWLLWLWLL",
  },
  {
    id: "8",
    pointsFor: 1567,
    potentialPoints: 1787,
    pointsAgainst: 1501,
    wins: 8,
    losses: 6,
    rosterId: 8,
    managerEfficiency: 0.876,
    recordByWeek: "LWWWLWWLLWLWLW",
  },
  {
    id: "9",
    pointsFor: 1402,
    potentialPoints: 1643,
    pointsAgainst: 1543,
    wins: 5,
    losses: 9,
    rosterId: 9,
    managerEfficiency: 0.853,
    recordByWeek: "LLLWLLLWWWLWLL",
  },
  {
    id: "10",
    pointsFor: 1478,
    potentialPoints: 1697,
    pointsAgainst: 1470,
    wins: 7,
    losses: 7,
    rosterId: 10,
    managerEfficiency: 0.87,
    recordByWeek: "LLLWLWWLLWLWWW",
  },
];
export const fakePoints = [
  {
    rosterId: 1,
    points: [
      96.26, 123.9, 86.3, 91.08, 133.34, 114.08, 92.26, 111.02, 63.34, 84.72,
      121.1, 78.18, 101.68, 82.64,
    ],
    playoffPoints: [94.31, 99.75, 103.21],
  },
  {
    rosterId: 2,
    points: [
      108.78, 97.72, 145.82, 80.42, 89.14, 92.92, 74.88, 120.74, 120.56, 92.92,
      67.44, 101.46, 109.26, 82.42,
    ],
    playoffPoints: [88.33, 104.13, 110.87],
  },
  {
    rosterId: 3,
    points: [
      129.14, 95, 125.88, 70.72, 130.94, 88.14, 123.86, 127.2, 109.2, 100.32,
      104.28, 128.62, 126, 90.04,
    ],
    playoffPoints: [101.98, 110.71, 98.31],
  },
  {
    rosterId: 4,
    points: [
      104.04, 89.66, 159.92, 105.28, 102.92, 153.98, 102.64, 115.06, 77.12,
      130.76, 103.5, 126.72, 87.2, 95,
    ],
    playoffPoints: [103.53, 124.68, 100.48],
  },
  {
    rosterId: 5,
    points: [
      90.74, 97.14, 113.06, 148.9, 162.78, 73.82, 90.64, 123.4, 144.1, 101.94,
      86.04, 147.46, 125.08, 94.82,
    ],
    playoffPoints: [111.39, 120.01, 89.68],
  },
  {
    rosterId: 6,
    points: [
      114.54, 126.36, 113.92, 151.7, 115.26, 79.36, 105.2, 120.26, 123.42,
      117.18, 121.9, 142.56, 95.28, 129.62,
    ],
    playoffPoints: [99.58, 131.79, 101.39],
  },
  {
    rosterId: 7,
    points: [
      97.36, 116.08, 126.58, 125.54, 90.04, 97.42, 104.88, 91.38, 104.68, 96.62,
      83.36, 136.08, 115, 90.44,
    ],
    playoffPoints: [97.32, 93.11, 105.11],
  },
  {
    rosterId: 8,
    points: [
      89.5, 145.42, 131.78, 86.26, 86.12, 112.2, 90.76, 101.26, 86.78, 140.92,
      104, 139.2, 128.62, 124.48,
    ],
    playoffPoints: [116.21, 108.19, 98.14],
  },
  {
    rosterId: 9,
    points: [
      89.94, 111.94, 98.68, 108.96, 97.36, 93.14, 104.16, 98.38, 94.58, 128.9,
      114.78, 92.16, 93.62, 76.3,
    ],
    playoffPoints: [95.97, 112.49, 118.24],
  },
  {
    rosterId: 10,
    points: [
      63.68, 78.88, 115.16, 108.64, 102.28, 100.5, 97.4, 149.92, 99.02, 116.28,
      108.64, 82.4, 131.96, 123.26,
    ],
    playoffPoints: [100.55, 107.57, 117.91],
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
