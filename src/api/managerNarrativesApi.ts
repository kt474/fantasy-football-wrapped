import { authenticatedFetch } from "@/lib/authFetch";
import { assertOk, parseJson } from "@/lib/http";

export interface ManagerBlurbsPayload {
  league: {
    leagueId: string;
    leagueName: string;
    seasonsAnalyzed: number;
    totalManagers: number;
  };
  managers: {
    userId: string;
    name: string;
    seasons: number;
    titles: number;
    record: string;
    winRate: number;
    totalPointsScored: number;
    totalPointsAgainst: number;
    totalTrades: number;
    tradeValueGained: number;
    totalWaivers: number;
    averageEfficiency: number;
    averageDraftPickRank: number | null;
    playoffAppearances: number;
    relative: {
      titlesRank: number;
      winRateRank: number;
      pointsScoredRank: number;
      pointsAgainstRank: number;
      tradesRank: number;
      waiversRank: number;
      efficiencyRank: number;
      tradeValueGainedRank: number;
      draftAbilityRank: number;
    };
  }[];
}

export interface ManagerBlurbsResponse {
  blurbs: {
    userId: string;
    name: string;
    blurb: string;
  }[];
}

export interface ManagerComparisonPayload {
  managers: {
    displayName: string;
    seasons: string[];
    championships: number;
    record: {
      wins: number;
      losses: number;
    };
    scoring: {
      totalPoints: number;
      pointsPerGame: number;
      recentScoresBySeason: {
        season: string;
        points: number[];
      }[];
    };
    lineupEfficiency: {
      averageManagerEfficiency: number;
    };
    managementStyle: {
      totalTrades: number | null;
      tradeValueGained: number | null;
      totalWaivers: number | null;
      averageDraftPickRank: number | null;
      playoffAppearances: number | null;
      weeklyScoreStdDev: number | null;
    };
  }[];
  headToHead: Record<string, string>;
}

export interface ManagerComparisonResponse {
  text: string;
}

export const generateManagerArchetype = async (
  payload: ManagerBlurbsPayload
): Promise<ManagerBlurbsResponse> => {
  try {
    const response = await authenticatedFetch(
      import.meta.env.VITE_MANAGER_PROFILES,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: payload,
        }),
      }
    );
    if (response.status === 401) {
      throw new Error("Please sign in to generate manager profiles");
    }
    assertOk(response, "Manager archetype request");
    return await parseJson<ManagerBlurbsResponse>(
      response,
      "Manager Archetype"
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unable to generate report.";
    if (message.includes("Please sign in")) {
      throw new Error("Please sign in to generate manager profiles.");
    }
    throw new Error(
      "Unable to generate manager profiles right now. Please try again later."
    );
  }
};

export const generateManagerComparison = async (
  leagueId: string,
  payload: ManagerComparisonPayload
): Promise<ManagerComparisonResponse> => {
  try {
    const response = await authenticatedFetch(
      import.meta.env.VITE_MANAGER_COMPARISON,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          leagueId,
          data: payload,
        }),
      }
    );
    if (response.status === 401) {
      throw new Error("Please sign in to generate manager comparison");
    }
    assertOk(response, "Manager comparison request");
    return await parseJson<ManagerComparisonResponse>(
      response,
      "Manager Comparison"
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to generate manager comparison.";
    if (message.includes("Please sign in")) {
      throw new Error("Please sign in to generate manager comparison.");
    }
    throw new Error(
      "Unable to generate manager comparison right now. Please try again later."
    );
  }
};
