import { authenticatedFetch } from "@/lib/authFetch";
import { assertOk, parseJson } from "@/lib/http";
import type {
  DynastyPerspective,
  TradeFinderPlayer,
  TradeSuggestion,
} from "@/lib/tradeFinder";

export type TradeValueRequestPayload = {
  league: {
    leagueId: string;
    season: string;
    status: string;
    scoringType: number;
    scoringSettings: Record<string, number>;
    rosterPositions: string[];
    totalRosters: number;
    seasonType: string;
    platform: string;
  };
  rosters: Array<{
    id: number;
    managerName: string;
    playerIds: string[];
  }>;
  selectedWeek: number;
  remainingWeeks: number;
  dynastyPerspective: DynastyPerspective;
  finderForRosterId?: number | null;
};

export type PlayerValuesResponse = {
  access: "preview" | "premium";
  previewLimit: number;
  totalPlayers: number;
  rankings: TradeFinderPlayer[];
  suggestions?: TradeSuggestion[];
};

export type TradeQuotePayload = {
  teamARosterId: number;
  teamBRosterId: number;
  teamAPlayerIds: string[];
  teamBPlayerIds: string[];
  teamAPicks: Array<{ season: number; round: number }>;
  teamBPicks: Array<{ season: number; round: number }>;
  teamAFaab: number;
  teamBFaab: number;
  firstDraftSeason: number;
};

export type TradeQuoteResponse = {
  fairnessLabel:
    | "Very fair"
    | "Reasonably fair"
    | "Slightly uneven"
    | "Very uneven";
  favoredSide: "team_a" | "team_b" | "even";
  gapBand:
    | "within_10_percent"
    | "10_to_20_percent"
    | "20_to_35_percent"
    | "greater_than_35_percent";
};

export class TradeValuesAccessError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const backendUrl = (path: string) =>
  `${(import.meta.env.VITE_BACKEND_URL ?? "").replace(/\/$/, "")}${path}`;

const post = async <T>(path: string, body: unknown, label: string) => {
  const response = await authenticatedFetch(backendUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (response.status === 401 || response.status === 403) {
    let message =
      response.status === 401
        ? "Sign in and subscribe to use this feature."
        : "A Premium subscription is required.";
    try {
      const payload = (await response.json()) as { message?: string };
      if (payload.message) message = payload.message;
    } catch {
      // Keep the safe fallback message.
    }
    throw new TradeValuesAccessError(response.status, message);
  }
  assertOk(response, label);
  return parseJson<T>(response, label);
};

export const getPlayerValues = (payload: TradeValueRequestPayload) =>
  post<PlayerValuesResponse>("/api/playerValues", payload, "Player values");

export const getTradeQuote = (
  payload: TradeValueRequestPayload,
  quote: TradeQuotePayload
) =>
  post<TradeQuoteResponse>(
    "/api/tradeQuote",
    { ...payload, finderForRosterId: null, quote },
    "Trade quote"
  );
