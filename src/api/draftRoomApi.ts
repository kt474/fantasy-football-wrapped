import { authenticatedFetch } from "@/lib/authFetch";
import type { ManagerArchetype } from "@/lib/narratives";

export type DraftRoomSummary = {
  draftLabel: string;
  trackedDrafts: number;
  projectedPositions: string[] | null;
  projectedObservedCount: number;
  dominantPosition: string | null;
  dominantPositionShare: number;
  averageFirstQBRound: number | null;
  firstQBDraftCount: number;
  patternStrength:
    | "Strong pattern"
    | "Consistent"
    | "Early signal"
    | "Mixed openings"
    | "Limited history";
};

export type DraftStrategyResult = {
  opening: string;
  seasons: number;
  playoffAppearances: number;
  playoffRate: number;
  averagePoints: number | null;
  draftLabel: string;
};

export type PositionalDraftPlan = {
  managerId: string;
  managerName: string;
  draftLabel: string;
  draftSlot: number;
  leagueSize: number;
  rounds: Array<{
    round: number;
    overallPick: number;
    picksBeforePick: number;
    pressure: Array<{ position: string; expectedPicks: number }>;
    pressureLevel: "High" | "Medium" | "Low" | "Unknown";
    threats: string[];
    guidance: string;
  }>;
};

export type SnakeDraftRoomResponse = {
  mode: "snake";
  pulse: Array<{ label: string; value: string; detail: string }>;
  managers: Array<{
    userId: string;
    summary: DraftRoomSummary;
    relative: string[];
    strategyResult: DraftStrategyResult | null;
    shifts: string[];
  }>;
  plan: PositionalDraftPlan | null;
};

export type AuctionDraftRoomResponse = {
  mode: "auction";
  budgetPlan: {
    budget: number;
    suggestedTopBid: number;
    allocations: Array<{
      position: string;
      amount: number;
      share: number;
    }>;
  } | null;
  roomBenchmarks: Array<{
    position: "RB" | "WR" | "QB" | "TE";
    averageShare: number;
    averageAmount: number;
    likelySpenders: string[];
  }>;
  priceBands: Array<{
    position: "RB" | "WR" | "QB" | "TE";
    tier: 1 | 2;
    medianAmount: number;
    lowAmount: number;
    highAmount: number;
    sampleSize: number;
  }>;
};

type AnalyzeDraftRoomOptions = {
  mode: "snake" | "auction";
  managers: ManagerArchetype[];
  selectedManagerId: string;
  leagueSize?: number;
  draftSlot?: number;
  budget?: number;
};

const backendBaseUrl = (import.meta.env.VITE_BACKEND_URL ?? "").replace(
  /\/$/,
  ""
);
const draftRoomAnalyzePath = `${backendBaseUrl}/api/draftRoomAnalyze`;
export const DRAFT_ROOM_TIMEOUT_MS = 15_000;

const toRequestManager = (manager: ManagerArchetype) => ({
  userId: manager.userId,
  displayName: manager.displayName,
  draftHistory: manager.draftHistory ?? [],
  auctionHistory: manager.auctionHistory ?? [],
});

export const analyzeDraftRoom = async ({
  mode,
  managers,
  selectedManagerId,
  leagueSize,
  draftSlot,
  budget,
}: AnalyzeDraftRoomOptions): Promise<
  SnakeDraftRoomResponse | AuctionDraftRoomResponse
> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DRAFT_ROOM_TIMEOUT_MS);

  try {
    const response = await authenticatedFetch(draftRoomAnalyzePath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode,
        managers: managers.map(toRequestManager),
        selectedManagerId,
        leagueSize,
        draftSlot,
        budget,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        message?: unknown;
      } | null;
      const fallback =
        response.status === 401
          ? "Please sign in to use Draft Room scouting."
          : response.status === 403
            ? "A Premium subscription is required for Draft Room scouting."
            : response.status === 429
              ? "Too many draft-room requests. Please try again shortly."
              : "Unable to analyze the draft room right now.";
      throw new Error(
        typeof payload?.message === "string" ? payload.message : fallback
      );
    }

    const payload = (await response.json()) as
      | SnakeDraftRoomResponse
      | AuctionDraftRoomResponse;
    if (payload.mode !== mode) {
      throw new Error("The draft-room response was invalid.");
    }
    return payload;
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error("Draft-room analysis timed out. Please try again.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};
