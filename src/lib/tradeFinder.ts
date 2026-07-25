export type DynastyPerspective = "balanced" | "contender" | "rebuilder";

export type TradeValuationMode =
  | "ros projection"
  | "season results"
  | "dynasty";

export type TradeFinderPlayer = {
  playerId: string;
  position: string;
  name: string;
  team: string;
  projectedPoints: number;
  replacementPoints: number;
  vorp: number;
  tradeValue: number;
  positionRank: number;
  overallRank: number;
  dynastyAdp?: number | null;
};

export type TradeFinderRoster = {
  id: number;
  managerName: string;
  players: TradeFinderPlayer[];
};

export type TradeFinderPick = {
  id: string;
  season: number;
  round: number;
};

export type TradeSuggestion = {
  id: string;
  tradeType: "1-for-1" | "2-for-1" | "multi-asset";
  teamAId: number;
  teamAName: string;
  teamBId: number;
  teamBName: string;
  teamASends: TradeFinderPlayer[];
  teamBSends: TradeFinderPlayer[];
  teamAPicks?: TradeFinderPick[];
  teamBPicks?: TradeFinderPick[];
  teamAValue: number;
  teamBValue: number;
  teamAGain: number;
  teamBGain: number;
  teamAGainPerWeek: number;
  teamBGainPerWeek: number;
  fairnessPercent: number;
  valueGapPercent: number;
  score: number;
};
