import { getLeague, getRosters, getUsers } from "./api";
import {
  getDraftPicksMap,
  getMatchupsForWeek,
  getPlayersDirectory,
  type SleeperPlayerMap,
} from "./sleeperClient";
import type {
  TeamPlayerContribution,
  TeamRecordRow,
  PlayerAggregateRow,
  PlayerWeeklyStat,
  LeagueContext,
  LeagueInfoType,
} from "../types/types";

const defaultLeagueId =
  import.meta.env.VITE_DEFAULT_LEAGUE_ID || "1257507151190958081";

const leagueCache = new Map<string, LeagueContext>();

const normalizePosition = (pos?: string) => {
  if (!pos) return "UNK";
  if (pos === "DST") return "DEF";
  if (pos === "LB" || pos === "DL" || pos === "CB" || pos === "S") return "DEF";
  return pos;
};

const fetchLeagueContext = async (
  leagueId: string
): Promise<LeagueContext> => {
  if (leagueCache.has(leagueId)) return leagueCache.get(leagueId)!;
  const league = (await getLeague(leagueId)) as unknown as LeagueInfoType;
  const ctx: LeagueContext = {
    leagueId,
    season: league.season,
    seasonType: (league.seasonType || "").toLowerCase() || "regular",
    lastScoredWeek: league.lastScoredWeek || league.regularSeasonLength || 14,
    rosterPositions: league.rosterPositions || [],
    scoringSettings: league.scoringSettings || {},
    name: league.name,
    draftId: league.draftId,
  };
  leagueCache.set(leagueId, ctx);
  return ctx;
};

const ensureName = (player: any) => {
  if (!player) return "Unknown";
  const first = player.first_name || "";
  const last = player.last_name || "";
  const full = `${first} ${last}`.trim();
  return full || player.full_name || "Unknown";
};

export const loadStatsData = async ({
  leagueId = defaultLeagueId,
  startWeek,
  endWeek,
}: {
  leagueId?: string;
  startWeek: number;
  endWeek: number;
}) => {
  const leagueCtx = await fetchLeagueContext(leagueId);
  const rosters = await getRosters(leagueId);
  const users = await getUsers(leagueId);
  const players: SleeperPlayerMap = await getPlayersDirectory();
  const draftMap = await getDraftPicksMap(leagueCtx.draftId);

  const ownerNameById: Record<string, string> = {};
  users.forEach((user: any) => {
    ownerNameById[user.id] = user.name;
  });
  const rosterOwnerByRosterId: Record<number, string | undefined> = {};
  rosters.forEach((roster: any) => {
    rosterOwnerByRosterId[roster.rosterId] = roster.id;
  });

  const weeks: number[] = [];
  const clampedStart = Math.max(1, startWeek);
  const requestedEnd = endWeek || leagueCtx.lastScoredWeek;
  const clampedEnd = Math.min(
    Math.max(clampedStart, requestedEnd),
    leagueCtx.lastScoredWeek
  );
  for (let w = clampedStart; w <= clampedEnd; w += 1) {
    weeks.push(w);
  }
  const matchupsByWeek = await Promise.all(
    weeks.map((week) => getMatchupsForWeek(leagueId, week))
  );

  const contributions = new Map<string, TeamPlayerContribution>();
  const playerWeekly = new Map<string, PlayerWeeklyStat[]>();

  weeks.forEach((weekNumber, idx) => {
    const week = matchupsByWeek[idx] || [];
    week.forEach((game: any) => {
      const starters: string[] = game.starters || [];
      const starterSet = new Set(starters);
      const playersPoints: Record<string, number> = game.players_points || {};
      const playerIds =
        game.players ||
        Object.keys(playersPoints); // fallback to keys if players array missing

      playerIds.forEach((playerId: string) => {
        const pts = Number(playersPoints[playerId]) || 0;
        const meta = players[playerId] || {};
        const key = `${game.roster_id}-${playerId}`;
        if (!contributions.has(key)) {
          contributions.set(key, {
            rosterId: game.roster_id,
            ownerId: rosterOwnerByRosterId[game.roster_id] || null,
            ownerName:
              ownerNameById[rosterOwnerByRosterId[game.roster_id] || ""] ||
              "Unknown",
            playerId,
            name: ensureName(meta),
            position: normalizePosition(meta.position),
            team: meta.team || "",
            draftRound: draftMap.get(playerId) ?? null,
            startedPoints: 0,
            totalPoints: 0,
            startedGames: 0,
            totalGames: 0,
            lastWeekSeen: weekNumber,
          });
        }
        const row = contributions.get(key)!;
        row.totalPoints += pts;
        row.totalGames += 1;
        const started = starterSet.has(playerId);
        if (started) {
          row.startedPoints += pts;
          row.startedGames += 1;
        }
        row.lastWeekSeen = Math.max(row.lastWeekSeen || 0, weekNumber);
        if (!playerWeekly.has(playerId)) {
          playerWeekly.set(playerId, []);
        }
        playerWeekly.get(playerId)!.push({
          week: weekNumber,
          points: pts,
          started,
        });
      });
    });
  });

  const playerAggregateMap = new Map<string, PlayerAggregateRow & { latestOwnerWeek?: number }>();
  contributions.forEach((row) => {
    const existing = playerAggregateMap.get(row.playerId) as (PlayerAggregateRow & { latestOwnerWeek?: number }) | undefined;
    if (!existing) {
      playerAggregateMap.set(row.playerId, {
        playerId: row.playerId,
        name: row.name,
        position: row.position,
        team: row.team,
        draftRound: row.draftRound,
        ownerId: row.ownerId,
        ownerName: row.ownerName,
        totalPoints: row.totalPoints,
        startedPoints: row.startedPoints,
        weeksStarted: row.startedGames,
        weeksPlayed: row.totalGames,
        latestOwnerWeek: row.lastWeekSeen || 0,
      });
    } else {
      existing.totalPoints += row.totalPoints;
      existing.startedPoints += row.startedPoints;
      existing.weeksStarted += row.startedGames;
      existing.weeksPlayed += row.totalGames;
      const candidateWeek = row.lastWeekSeen || 0;
      if (!existing.latestOwnerWeek || candidateWeek >= existing.latestOwnerWeek) {
        existing.ownerId = row.ownerId;
        existing.ownerName = row.ownerName;
        existing.latestOwnerWeek = candidateWeek;
      }
      if (!existing.team && row.team) {
        existing.team = row.team;
      }
      if (existing.draftRound === null && row.draftRound !== null) {
        existing.draftRound = row.draftRound;
      }
    }
  });

  return {
    league: leagueCtx,
    rosters: rosters.map(
      (r: any): TeamRecordRow => ({
        rosterId: r.rosterId,
        ownerId: r.id,
        ownerName: ownerNameById[r.id] || "Unknown",
        wins: r.wins,
        losses: r.losses,
        ties: r.ties || 0,
      })
    ),
    contributions: Array.from(contributions.values()),
    playerRows: Array.from(playerAggregateMap.values()).map((row) => ({
      // strip internal latestOwnerWeek before returning
      playerId: row.playerId,
      name: row.name,
      position: row.position,
      team: row.team,
      draftRound: row.draftRound,
      ownerId: row.ownerId,
      ownerName: row.ownerName,
      totalPoints: row.totalPoints,
      startedPoints: row.startedPoints,
      weeksStarted: row.weeksStarted,
      weeksPlayed: row.weeksPlayed,
      avgPoints: row.weeksPlayed
        ? Number((row.totalPoints / row.weeksPlayed).toFixed(2))
        : row.totalPoints,
    })),
    playerWeekly,
    weeks,
  };
};

export const getDefaultLeagueId = () => defaultLeagueId;
