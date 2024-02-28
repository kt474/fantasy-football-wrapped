// helper methods
import { groupBy, flatten } from "lodash";
import { getMatchup } from "./api";

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
  regularSeasonLength: number
) => {
  const allMatchups = [];
  for (let i: number = 0; i < regularSeasonLength; i++) {
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
    avatarImg:
      "https://avataaars.io/?avatarStyle=Circle&topType=LongHairFroBand&accessoriesType=Kurt&hairColor=Red&facialHairType=BeardMajestic&facialHairColor=Auburn&clotheType=ShirtCrewNeck&clotheColor=Gray02&eyeType=Side&eyebrowType=DefaultNatural&mouthType=Disbelief&skinColor=Tanned",
  },
  {
    id: "2",
    name: "Bijan Mustard",
    avatar: "a77d198f5c82bd93d3da5bd10493f7cd",
    avatarImg:
      "https://avataaars.io/?avatarStyle=Circle&topType=ShortHairTheCaesar&accessoriesType=Sunglasses&hairColor=Auburn&facialHairType=MoustacheFancy&facialHairColor=BlondeGolden&clotheType=BlazerSweater&clotheColor=PastelOrange&eyeType=Surprised&eyebrowType=FlatNatural&mouthType=Serious&skinColor=DarkBrown",
  },
  {
    id: "3",
    name: "Addison in Wonderland",
    avatar: "8eb8f8bf999945d523f2c4033f70473e",
    avatarImg:
      "https://avataaars.io/?avatarStyle=Circle&topType=LongHairFrida&accessoriesType=Blank&facialHairType=MoustacheFancy&facialHairColor=Blonde&clotheType=Hoodie&clotheColor=Gray02&eyeType=Squint&eyebrowType=UpDownNatural&mouthType=Grimace&skinColor=Brown",
  },
  {
    id: "4",
    name: "Ladies and Edelman",
    avatar: "15d7cf259bc30eab8f6120f45f652fb6",
    avatarImg:
      "https://avataaars.io/?avatarStyle=Circle&topType=ShortHairDreads02&accessoriesType=Blank&hatColor=Heather&hairColor=Blonde&facialHairType=MoustacheMagnum&facialHairColor=Red&clotheType=GraphicShirt&clotheColor=PastelOrange&graphicType=Pizza&eyeType=Default&eyebrowType=Angry&mouthType=Eating&skinColor=Yellow",
  },
  {
    id: "5",
    name: "Run CMC",
    avatar: "15d7cf259bc30eab8f6120f45f652fb6",
    avatarImg:
      "https://avataaars.io/?avatarStyle=Circle&topType=Turban&accessoriesType=Wayfarers&hatColor=PastelGreen&hairColor=Blonde&facialHairType=MoustacheMagnum&facialHairColor=Platinum&clotheType=GraphicShirt&clotheColor=Gray02&graphicType=Diamond&eyeType=Happy&eyebrowType=AngryNatural&mouthType=Smile&skinColor=Tanned",
  },
  {
    id: "6",
    name: "Finding Deebo",
    avatar: "d6ad9a18c52dcdb704399beed5d5b21f",
    avatarImg:
      "https://avataaars.io/?avatarStyle=Circle&topType=WinterHat3&accessoriesType=Wayfarers&hatColor=Red&hairColor=BlondeGolden&facialHairType=BeardLight&facialHairColor=Brown&clotheType=CollarSweater&clotheColor=Gray02&eyeType=Squint&eyebrowType=DefaultNatural&mouthType=Disbelief&skinColor=Light",
  },
  {
    id: "7",
    name: "Loud and Stroud",
    avatar: "3d8ea1e7289177ddf22dd57e107ee334",
    avatarImg:
      "https://avataaars.io/?avatarStyle=Circle&topType=WinterHat3&accessoriesType=Kurt&hatColor=PastelYellow&hairColor=BrownDark&facialHairType=BeardLight&facialHairColor=BlondeGolden&clotheType=BlazerSweater&clotheColor=Pink&eyeType=Squint&eyebrowType=Angry&mouthType=Grimace&skinColor=Light",
  },
  {
    id: "8",
    name: "How I Kmet Your Mother",
    avatar: "4f4090e5e9c3941414db40a871e3e909",
    avatarImg:
      "https://avataaars.io/?avatarStyle=Circle&topType=Hat&accessoriesType=Kurt&hairColor=Platinum&facialHairType=Blank&clotheType=Hoodie&clotheColor=Red&eyeType=WinkWacky&eyebrowType=UpDownNatural&mouthType=ScreamOpen&skinColor=Light",
  },
  {
    id: "9",
    name: "Game of Mahomes",
    avatar: "b3338675f635c2c1f42b469621d38ec6",
    avatarImg:
      "https://avataaars.io/?avatarStyle=Circle&topType=LongHairFroBand&accessoriesType=Blank&hairColor=Brown&facialHairType=Blank&facialHairColor=Black&clotheType=ShirtVNeck&clotheColor=PastelRed&graphicType=Resist&eyeType=Close&eyebrowType=DefaultNatural&mouthType=Concerned&skinColor=Tanned",
  },
  {
    id: "10",
    name: "Kamara Shy",
    avatar: "81d984f3556782876d25195356b0ab58",
    avatarImg:
      "https://avataaars.io/?avatarStyle=Circle&topType=LongHairCurly&accessoriesType=Sunglasses&hairColor=Platinum&facialHairType=Blank&facialHairColor=Red&clotheType=CollarSweater&clotheColor=Pink&eyeType=Hearts&eyebrowType=SadConcerned&mouthType=Sad&skinColor=Pale",
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
  },
  {
    rosterId: 2,
    points: [
      108.78, 97.72, 145.82, 80.42, 89.14, 92.92, 74.88, 120.74, 120.56, 92.92,
      67.44, 101.46, 109.26, 82.42,
    ],
  },
  {
    rosterId: 3,
    points: [
      129.14, 95, 125.88, 70.72, 130.94, 88.14, 123.86, 127.2, 109.2, 100.32,
      104.28, 128.62, 126, 90.04,
    ],
  },
  {
    rosterId: 4,
    points: [
      104.04, 89.66, 159.92, 105.28, 102.92, 153.98, 102.64, 115.06, 77.12,
      130.76, 103.5, 126.72, 87.2, 95,
    ],
  },
  {
    rosterId: 5,
    points: [
      90.74, 97.14, 113.06, 148.9, 162.78, 73.82, 90.64, 123.4, 144.1, 101.94,
      86.04, 147.46, 125.08, 94.82,
    ],
  },
  {
    rosterId: 6,
    points: [
      114.54, 126.36, 113.92, 151.7, 115.26, 79.36, 105.2, 120.26, 123.42,
      117.18, 121.9, 142.56, 95.28, 129.62,
    ],
  },
  {
    rosterId: 7,
    points: [
      97.36, 116.08, 126.58, 125.54, 90.04, 97.42, 104.88, 91.38, 104.68, 96.62,
      83.36, 136.08, 115, 90.44,
    ],
  },
  {
    rosterId: 8,
    points: [
      89.5, 145.42, 131.78, 86.26, 86.12, 112.2, 90.76, 101.26, 86.78, 140.92,
      104, 139.2, 128.62, 124.48,
    ],
  },
  {
    rosterId: 9,
    points: [
      89.94, 111.94, 98.68, 108.96, 97.36, 93.14, 104.16, 98.38, 94.58, 128.9,
      114.78, 92.16, 93.62, 76.3,
    ],
  },
  {
    rosterId: 10,
    points: [
      63.68, 78.88, 115.16, 108.64, 102.28, 100.5, 97.4, 149.92, 99.02, 116.28,
      108.64, 82.4, 131.96, 123.26,
    ],
  },
];
