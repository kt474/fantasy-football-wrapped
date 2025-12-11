import { getLeague, getRosters, getTransactions, getUsers } from "./api";
import {
  getDraftPicksMap,
  getMatchupsForWeek,
  getPlayersDirectory,
  type SleeperPlayerMap,
  type DraftPickMeta,
} from "./sleeperClient";
import type {
  TeamPlayerContribution,
  TeamRecordRow,
  PlayerAggregateRow,
  PlayerWeeklyStat,
  LeagueContext,
  LeagueInfoType,
  AcquisitionType,
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
  const reportedLast = league.lastScoredWeek || 0;
  const inferredFromCurrent =
    league.currentWeek && league.currentWeek > 1 ? league.currentWeek - 1 : 0;
  const lastCompletedWeek = Math.max(reportedLast, inferredFromCurrent);
  const fallbackLast = lastCompletedWeek || league.regularSeasonLength || 14;
  const ctx: LeagueContext = {
    leagueId,
    season: league.season,
    seasonType: (league.seasonType || "").toLowerCase() || "regular",
    lastScoredWeek: fallbackLast,
    regularSeasonLength: league.regularSeasonLength || fallbackLast,
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

  const acquisitionByRosterPlayer = new Map<
    string,
    { type: AcquisitionType; week: number }
  >();
  const registerAcquisition = (
    playerId: string,
    rosterId: number | null | undefined,
    type: AcquisitionType,
    week: number
  ) => {
    if (rosterId === null || rosterId === undefined) return;
    const numericRosterId = Number(rosterId);
    if (!Number.isFinite(numericRosterId)) return;
    const key = `${numericRosterId}-${playerId}`;
    const existing = acquisitionByRosterPlayer.get(key);
    if (existing && existing.week <= week) return;
    acquisitionByRosterPlayer.set(key, { type, week });
  };

  draftMap.forEach((draftMeta, playerId) => {
    if (draftMeta && draftMeta.rosterId !== null && draftMeta.rosterId !== undefined) {
      registerAcquisition(playerId, draftMeta.rosterId, "draft", 0);
    }
  });

  const transactionWeeks = Array.from({ length: clampedEnd }, (_, i) => i + 1);
  const transactionsByWeekPromise = Promise.all(
    transactionWeeks.map(async (week) => {
      try {
        return await getTransactions(leagueId, week);
      } catch (err) {
        console.warn(`Unable to load transactions for week ${week}`, err);
        return [];
      }
    })
  );

  const matchupsByWeekPromise = Promise.all(
    weeks.map((week) => getMatchupsForWeek(leagueId, week))
  );

  const [matchupsByWeek, transactionsByWeek] = await Promise.all([
    matchupsByWeekPromise,
    transactionsByWeekPromise,
  ]);

  transactionsByWeek.forEach((transactions: any[], idx) => {
    const week = transactionWeeks[idx];
    (transactions || []).forEach((txn: any) => {
      if (txn.status !== "complete" || !txn.adds) return;
      const type: AcquisitionType =
        txn.type === "trade"
          ? "trade"
          : txn.type === "waiver"
            ? "waiver"
            : "free_agent";
      Object.entries(txn.adds).forEach(([playerId, rosterId]) => {
        registerAcquisition(playerId, Number(rosterId), type, week);
      });
    });
  });

  const contributions = new Map<string, TeamPlayerContribution>();
  const draftContributions = new Map<string, TeamPlayerContribution>();
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
        const draftMeta: DraftPickMeta | undefined = draftMap.get(playerId);
        const draftRound = draftMeta?.round ?? null;
        const draftingRosterId = draftMeta?.rosterId ?? null;
        const draftingOwnerId = draftingRosterId
          ? rosterOwnerByRosterId[draftingRosterId]
          : undefined;
        const draftingOwnerName =
          draftingOwnerId && ownerNameById[draftingOwnerId]
            ? ownerNameById[draftingOwnerId]
            : "Unknown";
        const key = `${game.roster_id}-${playerId}`;
        const acquisitionMeta = acquisitionByRosterPlayer.get(key);
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
            draftRound,
            acquiredVia: acquisitionMeta?.type ?? null,
            acquisitionWeek: acquisitionMeta?.week ?? null,
            startedPoints: 0,
            totalPoints: 0,
            startedGames: 0,
            totalGames: 0,
            lastWeekSeen: weekNumber,
          });
        }
        const row = contributions.get(key)!;
        if (!row.acquiredVia && acquisitionMeta?.type) {
          row.acquiredVia = acquisitionMeta.type;
          row.acquisitionWeek = acquisitionMeta.week ?? null;
        }
        row.totalPoints += pts;
        row.totalGames += 1;
        const started = starterSet.has(playerId);
        if (started) {
          row.startedPoints += pts;
          row.startedGames += 1;
        }
        row.lastWeekSeen = Math.max(row.lastWeekSeen || 0, weekNumber);

        // Attribute points to drafting manager for draft-specific totals. Skip undrafted.
        if (draftMeta && draftingRosterId !== null) {
          const draftKey = `${draftingRosterId}-${playerId}`;
          if (!draftContributions.has(draftKey)) {
            draftContributions.set(draftKey, {
              rosterId: draftingRosterId,
              ownerId: draftingOwnerId || null,
              ownerName: draftingOwnerName,
              playerId,
              name: ensureName(meta),
            position: normalizePosition(meta.position),
            team: meta.team || "",
            draftRound,
            acquiredVia: "draft",
            acquisitionWeek: 0,
            startedPoints: 0,
            totalPoints: 0,
            startedGames: 0,
            totalGames: 0,
            lastWeekSeen: weekNumber,
            });
          }
          const draftRow = draftContributions.get(draftKey)!;
          draftRow.totalPoints += pts;
          draftRow.totalGames += 1;
          if (started) {
            draftRow.startedPoints += pts;
            draftRow.startedGames += 1;
          }
          draftRow.lastWeekSeen = Math.max(draftRow.lastWeekSeen || 0, weekNumber);
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

  // Ensure every drafted player appears for their drafter even if they recorded 0 points in the window.
  draftMap.forEach((draftMeta, playerId) => {
    if (!draftMeta || draftMeta.rosterId === null || draftMeta.rosterId === undefined) return;
    const draftKey = `${draftMeta.rosterId}-${playerId}`;
    if (draftContributions.has(draftKey)) return;
    const meta = players[playerId] || {};
    const ownerId = rosterOwnerByRosterId[draftMeta.rosterId] || null;
    const ownerName = ownerId ? ownerNameById[ownerId] || "Unknown" : "Unknown";
    draftContributions.set(draftKey, {
      rosterId: draftMeta.rosterId,
      ownerId,
      ownerName,
      playerId,
      name: ensureName(meta),
      position: normalizePosition(meta.position),
      team: meta.team || "",
      draftRound: draftMeta.round ?? null,
      acquiredVia: "draft",
      acquisitionWeek: 0,
      startedPoints: 0,
      totalPoints: 0,
      startedGames: 0,
      totalGames: 0,
      lastWeekSeen: undefined,
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

  const undraftedContributions = Array.from(contributions.values()).filter(
    (row) => row.acquiredVia && row.acquiredVia !== "draft"
  );

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
    draftContributions: Array.from(draftContributions.values()),
    undraftedContributions,
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
