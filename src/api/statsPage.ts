import { getLeague, getRosters, getUsers } from "./api";
import type {
  TeamPlayerContribution,
  TeamRecordRow,
  PlayerAggregateRow,
  PlayerWeeklyStat,
  LeagueContext,
} from "../types/types";

type SleeperPlayerMap = Record<
  string,
  { first_name?: string; last_name?: string; full_name?: string; position?: string; team?: string }
>;

const defaultLeagueId =
  import.meta.env.VITE_DEFAULT_LEAGUE_ID || "1257507151190958081";

const playersCache: { players?: SleeperPlayerMap } = {};
const draftMapCache = new Map<string, Map<string, number | null>>();
const matchupCache = new Map<string, any[]>();
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
  const league = await getLeague(leagueId);
  const ctx: LeagueContext = {
    leagueId,
    season: league.season,
    seasonType: league.seasonType?.toLowerCase() || "regular",
    lastScoredWeek: league.lastScoredWeek || league.regularSeasonLength || 14,
    rosterPositions: league.rosterPositions || [],
    scoringSettings: league.scoringSettings || {},
    name: league.name,
    draftId: league.draftId,
  };
  leagueCache.set(leagueId, ctx);
  return ctx;
};

const fetchPlayersDirectory = async (): Promise<SleeperPlayerMap> => {
  if (playersCache.players) return playersCache.players;
  const response = await fetch("https://api.sleeper.com/players/nfl");
  const result = await response.json();
  playersCache.players = result as SleeperPlayerMap;
  return playersCache.players;
};

const fetchDraftMap = async (draftId?: string) => {
  if (!draftId) return new Map<string, number | null>();
  if (draftMapCache.has(draftId)) return draftMapCache.get(draftId)!;
  const response = await fetch(
    `https://api.sleeper.app/v1/draft/${draftId}/picks`
  );
  const picks = await response.json();
  const map = new Map<string, number | null>();
  picks.forEach((pick: any) => {
    map.set(pick["player_id"], pick["round"] ?? null);
  });
  draftMapCache.set(draftId, map);
  return map;
};

const fetchMatchupsRaw = async (week: number, leagueId: string) => {
  const cacheKey = `${leagueId}-${week}`;
  if (matchupCache.has(cacheKey)) return matchupCache.get(cacheKey)!;
  const response = await fetch(
    `https://api.sleeper.app/v1/league/${leagueId}/matchups/${week}`
  );
  const matchup = await response.json();
  matchupCache.set(cacheKey, matchup);
  return matchup;
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
  const players = await fetchPlayersDirectory();
  const draftMap = await fetchDraftMap(leagueCtx.draftId);

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
    weeks.map((week) => fetchMatchupsRaw(week, leagueId))
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

  const playerAggregateMap = new Map<string, PlayerAggregateRow>();
  contributions.forEach((row) => {
    const existing = playerAggregateMap.get(row.playerId);
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
      });
    } else {
      existing.totalPoints += row.totalPoints;
      existing.startedPoints += row.startedPoints;
      existing.weeksStarted += row.startedGames;
      existing.weeksPlayed += row.totalGames;
      if (!existing.ownerId && row.ownerId) {
        existing.ownerId = row.ownerId;
        existing.ownerName = row.ownerName;
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
      ...row,
      avgPoints: row.weeksPlayed
        ? Number((row.totalPoints / row.weeksPlayed).toFixed(2))
        : row.totalPoints,
    })),
    playerWeekly,
    weeks,
  };
};

export const getDefaultLeagueId = () => defaultLeagueId;
