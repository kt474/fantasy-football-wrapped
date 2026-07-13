import type { WeeklyStats } from "../../types/apiTypes";
import type { PlayerType } from "../../types/types";

const RANKING_POSITIONS = new Set(["QB", "RB", "WR", "TE", "K", "DEF"]);

export const attachRosterIdsToStats = (
  statsByPlayer: (WeeklyStats | null)[],
  rosterPlayers: { rosterId: number }[]
): PlayerType[] =>
  statsByPlayer.flatMap((stats, index) =>
    stats
      ? [
          {
            ...stats,
            rosterId: rosterPlayers[index].rosterId,
          },
        ]
      : []
  );

export const hasUsablePlayerRankingData = (
  rankings: object | undefined
) =>
  Boolean(
    rankings &&
      Object.entries(rankings).some(
        ([position, players]) =>
          RANKING_POSITIONS.has(position) &&
          Array.isArray(players) &&
          players.some(
            (player) =>
              typeof player === "object" &&
              player !== null &&
              (player as { position?: unknown }).position === position &&
              typeof (player as { id?: unknown }).id === "string"
          )
      )
  );
