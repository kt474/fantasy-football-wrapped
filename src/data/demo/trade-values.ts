import type {
  TradeFinderPlayer,
  TradeFinderRoster,
  TradeSuggestion,
} from "@/lib/tradeFinder";
import type { TradeBuilderRoster } from "@/lib/leagueTradeValues";

type DemoPlayer = TradeFinderPlayer & {
  player_id: string;
};

const demoPlayers: DemoPlayer[] = [
  {
    playerId: "6770",
    player_id: "6770",
    position: "QB",
    name: "Joe Burrow",
    team: "CIN",
    projectedPoints: 352,
    replacementPoints: 286,
    vorp: 66,
    tradeValue: 72,
    positionRank: 4,
    overallRank: 10,
    dynastyAdp: null,
  },
  {
    playerId: "9509",
    player_id: "9509",
    position: "RB",
    name: "Bijan Robinson",
    team: "ATL",
    projectedPoints: 294,
    replacementPoints: 168,
    vorp: 126,
    tradeValue: 92,
    positionRank: 1,
    overallRank: 2,
    dynastyAdp: null,
  },
  {
    playerId: "6794",
    player_id: "6794",
    position: "WR",
    name: "Justin Jefferson",
    team: "MIN",
    projectedPoints: 281,
    replacementPoints: 169,
    vorp: 112,
    tradeValue: 88,
    positionRank: 2,
    overallRank: 4,
    dynastyAdp: null,
  },
  {
    playerId: "9221",
    player_id: "9221",
    position: "RB",
    name: "Jahmyr Gibbs",
    team: "DET",
    projectedPoints: 287,
    replacementPoints: 168,
    vorp: 119,
    tradeValue: 90,
    positionRank: 2,
    overallRank: 3,
    dynastyAdp: null,
  },
  {
    playerId: "6786",
    player_id: "6786",
    position: "WR",
    name: "CeeDee Lamb",
    team: "DAL",
    projectedPoints: 268,
    replacementPoints: 169,
    vorp: 99,
    tradeValue: 84,
    positionRank: 3,
    overallRank: 6,
    dynastyAdp: null,
  },
  {
    playerId: "4866",
    player_id: "4866",
    position: "RB",
    name: "Saquon Barkley",
    team: "PHI",
    projectedPoints: 274,
    replacementPoints: 168,
    vorp: 106,
    tradeValue: 86,
    positionRank: 3,
    overallRank: 5,
    dynastyAdp: null,
  },
  {
    playerId: "4881",
    player_id: "4881",
    position: "QB",
    name: "Lamar Jackson",
    team: "BAL",
    projectedPoints: 378,
    replacementPoints: 286,
    vorp: 92,
    tradeValue: 78,
    positionRank: 2,
    overallRank: 8,
    dynastyAdp: null,
  },
  {
    playerId: "7564",
    player_id: "7564",
    position: "WR",
    name: "Ja'Marr Chase",
    team: "CIN",
    projectedPoints: 302,
    replacementPoints: 169,
    vorp: 133,
    tradeValue: 94,
    positionRank: 1,
    overallRank: 1,
    dynastyAdp: null,
  },
  {
    playerId: "4984",
    player_id: "4984",
    position: "QB",
    name: "Josh Allen",
    team: "BUF",
    projectedPoints: 386,
    replacementPoints: 286,
    vorp: 100,
    tradeValue: 80,
    positionRank: 1,
    overallRank: 7,
    dynastyAdp: null,
  },
  {
    playerId: "11604",
    player_id: "11604",
    position: "TE",
    name: "Brock Bowers",
    team: "LV",
    projectedPoints: 236,
    replacementPoints: 126,
    vorp: 110,
    tradeValue: 74,
    positionRank: 1,
    overallRank: 9,
    dynastyAdp: null,
  },
];

const demoManagers = [
  "Just the Tua Us",
  "Bijan Mustard",
  "The Princess McBride",
  "Baby Back Gibbs",
  "Breece's Puffs",
  "Saquondo",
  "Lamario Kart",
  "Ja’Marr the Merrier",
  "Dak to the Future",
  "LaPorta Potty",
];

export const demoTradeValueRosters: TradeFinderRoster[] = demoPlayers.map(
  (player, index) => ({
    id: index + 1,
    managerName: demoManagers[index],
    players: [player],
  })
);

export const demoTradeBuilderRosters: TradeBuilderRoster[] =
  demoTradeValueRosters.map((roster) => ({
    id: roster.id,
    managerName: roster.managerName,
    players: roster.players.map((player) => ({
      ...player,
      player_id: player.playerId,
      dynastyAdp: player.dynastyAdp ?? null,
    })),
  }));

export const demoStarterPlayerIdsByRoster: Record<number, string[]> =
  Object.fromEntries(
    demoTradeValueRosters.map((roster) => [
      roster.id,
      roster.players.map((player) => player.playerId),
    ])
  );

const rosterById = new Map(
  demoTradeValueRosters.map((roster) => [roster.id, roster])
);

const makeSuggestion = (
  teamAId: number,
  teamBId: number,
  teamAGainPerWeek: number,
  teamBGainPerWeek: number
): TradeSuggestion => {
  const teamA = rosterById.get(teamAId)!;
  const teamB = rosterById.get(teamBId)!;
  const teamAPlayer = teamA.players[0];
  const teamBPlayer = teamB.players[0];
  const valueGap = Math.abs(teamAPlayer.tradeValue - teamBPlayer.tradeValue);
  const valueGapPercent =
    (valueGap / Math.max(teamAPlayer.tradeValue, teamBPlayer.tradeValue)) * 100;

  return {
    id: `demo-${teamAId}-${teamBId}`,
    tradeType: "1-for-1",
    teamAId,
    teamAName: teamA.managerName,
    teamBId,
    teamBName: teamB.managerName,
    teamASends: [teamAPlayer],
    teamBSends: [teamBPlayer],
    teamAValue: teamAPlayer.tradeValue,
    teamBValue: teamBPlayer.tradeValue,
    teamAGain: teamAGainPerWeek * 8,
    teamBGain: teamBGainPerWeek * 8,
    teamAGainPerWeek,
    teamBGainPerWeek,
    fairnessPercent: 100 - valueGapPercent,
    valueGapPercent,
    score: 100 - valueGapPercent + teamAGainPerWeek + teamBGainPerWeek,
  };
};

const demoTradeSuggestions = [
  makeSuggestion(1, 10, 1.4, 1.1),
  makeSuggestion(2, 8, 1.8, 1.3),
  makeSuggestion(3, 4, 1.5, 1.6),
  makeSuggestion(5, 6, 1.2, 1.4),
  makeSuggestion(7, 9, 1.7, 1.5),
];

export const demoTradeSuggestionsByRoster: Record<
  number,
  TradeSuggestion[]
> = Object.fromEntries(
  demoTradeValueRosters.map((roster) => [
    roster.id,
    demoTradeSuggestions.filter(
      (suggestion) =>
        suggestion.teamAId === roster.id || suggestion.teamBId === roster.id
    ),
  ])
);

export const demoTradeValuePlayerCount = demoPlayers.length;
