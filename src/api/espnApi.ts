import type { DraftPick } from "@/types/apiTypes";
import type {
  LeagueDraftMetadata,
  LeagueInfoType,
  PointsType,
  RosterType,
  UserType,
} from "@/types/types";
import {
  inputLeague,
  getPlayerIdLookupMap,
  getPlayerIdsByNameTeamMap,
  type PlayerNameTeamLookup,
} from "@/api/api";
import { getStats } from "./sleeperApi";
import { calculateDraftRank } from "./helper";

const ESPN_BASE_URL = "https://lm-api-reads.fantasy.espn.com";

export type EspnAuth = {
  swid: string;
  espnS2: string;
};

export const getEspnAuthStorageKey = (season: string, leagueId: string) =>
  `espn-auth:${leagueId}:${season}`;

export const saveEspnAuth = (
  season: string,
  leagueId: string,
  auth: EspnAuth
) => {
  localStorage.setItem(
    getEspnAuthStorageKey(season, leagueId),
    JSON.stringify(auth)
  );
};

export const getSavedEspnAuth = (
  season: string,
  leagueId: string
): EspnAuth | undefined => {
  const storageKey = getEspnAuthStorageKey(season, leagueId);
  const saved =
    localStorage.getItem(storageKey) ?? sessionStorage.getItem(storageKey);
  if (!saved) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(saved) as Partial<EspnAuth>;
    if (!parsed.swid || !parsed.espnS2) {
      return undefined;
    }

    const auth = { swid: parsed.swid, espnS2: parsed.espnS2 };
    if (!localStorage.getItem(storageKey)) {
      saveEspnAuth(season, leagueId, auth);
    }
    return auth;
  } catch {
    return undefined;
  }
};

const LINEUP_SLOT_MAP: Record<number, string> = {
  0: "QB",
  1: "TQB",
  2: "RB",
  3: "FLEX",
  4: "WR",
  5: "OP",
  6: "TE",
  7: "SUPER_FLEX",
  8: "DT",
  9: "DE",
  10: "LB",
  11: "DL",
  12: "CB",
  13: "S",
  14: "DB",
  15: "DP",
  16: "D/ST",
  17: "K",
  18: "P",
  19: "HC",
  20: "BENCH",
  21: "IR",
  23: "FLEX",
};

const TEAM_MAP: Record<number, string> = {
  0: "FA", // Free Agent
  1: "ATL",
  2: "BUF",
  3: "CHI",
  4: "CIN",
  5: "CLE",
  6: "DAL",
  7: "DEN",
  8: "DET",
  9: "GB",
  10: "TEN",
  11: "IND",
  12: "KC",
  13: "LV",
  14: "LAR",
  15: "MIA",
  16: "MIN",
  17: "NE",
  18: "NO",
  19: "NYG",
  20: "NYJ",
  21: "PHI",
  22: "ARI",
  23: "PIT",
  24: "LAC",
  25: "SF",
  26: "SEA",
  27: "TB",
  28: "WAS",
  29: "CAR",
  30: "JAX",
  33: "BAL",
  34: "HOU",
};

const POSITION_MAP: Record<number, string> = {
  0: "QB",
  1: "QB",
  2: "RB",
  3: "WR",
  4: "TE",
  5: "K",
  16: "DEF",
};

const getTeam = (posId: number) => {
  return TEAM_MAP[posId] || "FA";
};

const getPosition = (posId: number) => {
  return POSITION_MAP[posId] || "NA";
};

const getPlayerLookupKey = ({ name, team }: PlayerNameTeamLookup): string =>
  `${name.trim().toLowerCase()}::${team.trim().toUpperCase()}`;

interface EspnPlayerLookup extends PlayerNameTeamLookup {
  espnId: number | string;
  position: string;
}

interface DraftPickLookupResult {
  firstName: string;
  lastName: string;
  lookup: EspnPlayerLookup | null;
}

interface EspnWaiverItem extends Record<string, unknown> {
  playerId?: number | string;
  playerName?: string;
  team?: string;
  sleeperPlayerId?: string | null;
}

interface EspnWaiverTransaction extends Record<string, unknown> {
  items?: EspnWaiverItem[];
}

const getSleeperPlayerIdByEspnIdMap = (
  allPlayerLookups: EspnPlayerLookup[],
  playerLookupMap: Map<string, string>
) => {
  const sleeperPlayerIdByEspnId = new Map<string, string>();

  allPlayerLookups.forEach((playerLookup) => {
    const sleeperPlayerId = playerLookupMap.get(
      getPlayerLookupKey(playerLookup)
    );

    if (sleeperPlayerId) {
      sleeperPlayerIdByEspnId.set(String(playerLookup.espnId), sleeperPlayerId);
    }
  });

  return sleeperPlayerIdByEspnId;
};

export class EspnLeagueError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "private"
      | "not_found"
      | "invalid_response"
      | "request_failed"
      | "unknown"
  ) {
    super(message);
    this.name = "EspnLeagueError";
  }
}

export const getEspnErrorMessage = (error: unknown) => {
  if (error instanceof EspnLeagueError) {
    return error.message;
  }
  return "Unable to load ESPN league right now. Please try again.";
};

const safeJson = async (response: Response) => {
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new EspnLeagueError(
        "This ESPN league appears to be private. Public ESPN leagues are supported right now.",
        "private"
      );
    }
    if (response.status === 404) {
      throw new EspnLeagueError(
        "ESPN league not found. Check the league ID and season.",
        "not_found"
      );
    }
    throw new EspnLeagueError(
      `ESPN request failed with status ${response.status}. Please try again later.`,
      "request_failed"
    );
  }
  return response.json();
};

const fetchEspnJson = async (url: string, auth?: EspnAuth) => {
  if (!auth) {
    return safeJson(await fetch(url));
  }

  const response = await fetch("/api/espn", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      swid: auth.swid,
      espnS2: auth.espnS2,
    }),
  });

  return safeJson(response);
};

const assertRecord = (
  value: unknown,
  message: string
): Record<string, unknown> => {
  if (typeof value !== "object" || value === null) {
    throw new EspnLeagueError(message, "invalid_response");
  }
  return value as Record<string, unknown>;
};

const assertArray = <T = unknown>(value: unknown, message: string): T[] => {
  if (!Array.isArray(value)) {
    throw new EspnLeagueError(message, "invalid_response");
  }
  return value as T[];
};

const getTeamRecord = (team: Record<string, unknown>) => {
  const record = (team.record as Record<string, unknown> | undefined) ?? {};
  const overall =
    (record.overall as Record<string, unknown> | undefined) ??
    (record["overallRecord"] as Record<string, unknown> | undefined) ??
    {};

  return {
    wins: Number(overall.wins ?? 0),
    losses: Number(overall.losses ?? 0),
    ties: Number(overall.ties ?? 0),
    pointsFor:
      Math.round(Number(overall.pointsFor ?? team.points ?? 0) * 10) / 10,
    pointsAgainst: Math.round(Number(overall.pointsAgainst ?? 0) * 10) / 10,
  };
};

const getEspnTeamName = (team: Record<string, unknown>) => {
  const location = String(team.location ?? "").trim();
  const nickname = String(team.nickname ?? "").trim();
  const fullName = [location, nickname].filter(Boolean).join(" ").trim();
  return fullName || String(team.name ?? "").trim();
};

const getEspnTeamOwnerIds = (team: Record<string, unknown>) => {
  const owners = Array.isArray(team.owners) ? team.owners : [];
  return [team.primaryOwner, ...owners, team.owner, team.ownerId, team.id]
    .map((owner) => String(owner ?? "").trim())
    .filter(Boolean);
};

const getEspnPrimaryOwnerId = (team: Record<string, unknown>) =>
  getEspnTeamOwnerIds(team)[0] ?? String(team.id ?? "");

const getManagerMap = (
  members: Array<Record<string, unknown>> = [],
  teams: Array<Record<string, unknown>> = []
) => {
  const teamNameByOwner = new Map<string, string>();

  teams.forEach((team) => {
    const teamName = getEspnTeamName(team);

    getEspnTeamOwnerIds(team).forEach((ownerId) => {
      teamNameByOwner.set(ownerId, teamName);
    });
  });

  const mappedMembers = members.map((member) => {
    const id = String(member.id ?? "");
    const firstName = String(member.firstName ?? "").trim();
    const lastName = String(member.lastName ?? "").trim();
    const displayName = String(member.displayName ?? "").trim();
    const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
    const username = displayName || fullName || `Manager ${id}`;

    return {
      id,
      avatar: String(member.id ?? ""),
      avatarImg: String(member.id ?? ""),
      name: teamNameByOwner.get(id) || fullName || username,
      username,
    } satisfies UserType;
  });
  const mappedMemberIds = new Set(mappedMembers.map((member) => member.id));
  const fallbackTeamUsers = teams.flatMap((team) => {
    const id = getEspnPrimaryOwnerId(team);
    if (!id || mappedMemberIds.has(id)) {
      return [];
    }

    return [
      {
        id,
        avatar: String(team.logo ?? ""),
        avatarImg: String(team.logo ?? ""),
        name: getEspnTeamName(team) || `Team ${team.id ?? id}`,
        username: getEspnTeamName(team) || `Team ${team.id ?? id}`,
        placement:
          team.rankCalculatedFinal != null
            ? Number(team.rankCalculatedFinal)
            : undefined,
      } satisfies UserType,
    ];
  });

  if (mappedMembers.length > 0 || fallbackTeamUsers.length > 0) {
    return [...mappedMembers, ...fallbackTeamUsers];
  }

  return teams.map(
    (team) =>
      ({
        id: getEspnPrimaryOwnerId(team),
        avatar: String(team.logo ?? ""),
        avatarImg: String(team.logo ?? ""),
        name: getEspnTeamName(team) || `Team ${team.id ?? ""}`,
        username: getEspnTeamName(team) || `Team ${team.id ?? ""}`,
        placement:
          team.rankCalculatedFinal != null
            ? Number(team.rankCalculatedFinal)
            : undefined,
      }) satisfies UserType
  );
};

const mergeTeams = (
  teamDataTeams: Array<Record<string, unknown>> = [],
  rosterDataTeams: Array<Record<string, unknown>> = []
) => {
  const merged = new Map<number, Record<string, unknown>>();

  [...teamDataTeams, ...rosterDataTeams].forEach((team) => {
    const teamId = Number(team.id ?? 0);
    const existing = merged.get(teamId) ?? {};
    merged.set(teamId, {
      ...existing,
      ...team,
      roster:
        (team.roster as Record<string, unknown> | undefined) ??
        (existing.roster as Record<string, unknown> | undefined),
      valuesByStat:
        (team.valuesByStat as Record<string, unknown> | undefined) ??
        (existing.valuesByStat as Record<string, unknown> | undefined),
      record:
        (team.record as Record<string, unknown> | undefined) ??
        (existing.record as Record<string, unknown> | undefined),
      owners: Array.isArray(team.owners)
        ? team.owners
        : Array.isArray(existing.owners)
          ? existing.owners
          : [],
    });
  });

  return Array.from(merged.values());
};

const getRosterEntries = (team: Record<string, unknown>) => {
  const roster = (team.roster as Record<string, unknown> | undefined) ?? {};
  return Array.isArray(roster.entries)
    ? (roster.entries as Array<Record<string, unknown>>)
    : [];
};

const getWeeklyEntryPoints = (entry: Record<string, unknown>) => {
  const playerPoolEntry =
    (entry.playerPoolEntry as Record<string, unknown> | undefined) ?? {};
  const player =
    (playerPoolEntry.player as Record<string, unknown> | undefined) ?? {};
  const stats = Array.isArray(player.stats)
    ? (player.stats as Array<Record<string, unknown>>)
    : [];

  const actualWeekStats = stats.find(
    (stat) =>
      Number(stat.statSourceId ?? -1) === 0 &&
      Number(stat.statSplitTypeId ?? -1) === 1
  );

  return Number(
    actualWeekStats?.appliedTotal ?? playerPoolEntry.appliedStatTotal ?? 0
  );
};

const getWeeklyResult = (teamPoints: number, opponentPoints: number) => {
  if (teamPoints > opponentPoints) {
    return "W";
  }
  if (teamPoints < opponentPoints) {
    return "L";
  }
  return "T";
};

const getRecordByWeekMap = (
  teams: Array<Record<string, unknown>> = [],
  schedule: Array<Array<Record<string, unknown>>> = [],
  regularSeasonLength: number = schedule.length
) => {
  const recordMap = new Map<number, string>();

  teams.forEach((team) => {
    recordMap.set(Number(team.id ?? 0), "");
  });

  schedule.slice(0, regularSeasonLength).forEach((weekEntries) => {
    weekEntries.forEach((teamWeek) => {
      const teamId = Number(teamWeek.teamId ?? 0);
      const currentRecord = recordMap.get(teamId) ?? "";
      recordMap.set(teamId, `${currentRecord}${String(teamWeek.result ?? "")}`);
    });
  });

  return recordMap;
};

const getPotentialLineupSlotIds = (
  lineupSlotCounts: Record<string, number> = {}
) => {
  const slotIds = Object.entries(lineupSlotCounts).flatMap(([slotId, count]) =>
    Array.from({ length: Number(count ?? 0) }, () => Number(slotId))
  );

  return slotIds
    .filter((slotId) => slotId !== 20 && slotId !== 21)
    .sort((a, b) => {
      const aIsFlexible = a === 3 || a === 5 || a === 7 || a === 23;
      const bIsFlexible = b === 3 || b === 5 || b === 7 || b === 23;
      if (aIsFlexible === bIsFlexible) {
        return a - b;
      }
      return aIsFlexible ? 1 : -1;
    });
};

const getPotentialPointsForWeek = (
  entries: Array<Record<string, unknown>> = [],
  lineupSlotCounts: Record<string, number> = {}
) => {
  const slotIds = getPotentialLineupSlotIds(lineupSlotCounts);
  const players = entries
    .map((entry) => {
      const playerPoolEntry =
        (entry.playerPoolEntry as Record<string, unknown> | undefined) ?? {};
      const player =
        (playerPoolEntry.player as Record<string, unknown> | undefined) ?? {};
      return {
        eligibleSlots: Array.isArray(player.eligibleSlots)
          ? (player.eligibleSlots as unknown[]).map((slot) => Number(slot))
          : [],
        points: getWeeklyEntryPoints(entry),
      };
    })
    .filter((player) => player.eligibleSlots.length > 0);

  const memo = new Map<string, number>();

  const dfs = (slotIndex: number, usedMask: number) => {
    if (slotIndex >= slotIds.length) {
      return 0;
    }

    const key = `${slotIndex}:${usedMask}`;
    const cached = memo.get(key);
    if (cached != null) {
      return cached;
    }

    let best = 0;
    const slotId = slotIds[slotIndex];

    players.forEach((player, playerIndex) => {
      const playerMask = 1 << playerIndex;
      if ((usedMask & playerMask) !== 0) {
        return;
      }
      if (!player.eligibleSlots.includes(slotId)) {
        return;
      }

      best = Math.max(
        best,
        player.points + dfs(slotIndex + 1, usedMask | playerMask)
      );
    });

    memo.set(key, best);
    return best;
  };

  return dfs(0, 0);
};

const getPotentialPointsMap = (
  teams: Array<Record<string, unknown>> = [],
  schedule: Array<Array<Record<string, unknown>>> = [],
  lineupSlotCounts: Record<string, number> = {}
) => {
  const potentialPointsMap = new Map<number, number>();
  teams.forEach((team) => {
    potentialPointsMap.set(Number(team.id ?? 0), 0);
  });

  schedule.forEach((weekEntries) => {
    weekEntries.forEach((teamWeek) => {
      const teamId = Number(teamWeek.teamId ?? 0);
      const roster =
        (teamWeek.roster as Record<string, unknown> | undefined) ?? {};
      const entries = Array.isArray(roster.entries)
        ? (roster.entries as Array<Record<string, unknown>>)
        : [];
      const weeklyPotential = getPotentialPointsForWeek(
        entries,
        lineupSlotCounts
      );
      const currentTotal = potentialPointsMap.get(teamId) ?? 0;

      potentialPointsMap.set(
        teamId,
        Math.round((currentTotal + weeklyPotential) * 100) / 100
      );
    });
  });

  return potentialPointsMap;
};

const getRosterMap = async (
  teams: Array<Record<string, unknown>> = [],
  recordByWeekMap: Map<number, string> = new Map(),
  potentialPointsMap: Map<number, number> = new Map(),
  playerLookupMap: Map<string, string> = new Map()
) => {
  return Promise.all(
    teams.map(async (team) => {
      const record = getTeamRecord(team);
      const rosterEntries = getRosterEntries(team);
      const potentialPoints = potentialPointsMap.get(Number(team.id ?? 0)) ?? 0;

      const playerNames = rosterEntries.map((entry: any) => ({
        name: String(entry.playerPoolEntry.player.fullName ?? ""),
        team: getTeam(Number(entry.playerPoolEntry.player.proTeamId)),
      }));

      const playerIds = playerNames
        .map(
          (player) => playerLookupMap.get(getPlayerLookupKey(player)) ?? null
        )
        .filter((playerId): playerId is string => Boolean(playerId));
      const ownerId = getEspnPrimaryOwnerId(team);

      return {
        id: ownerId,
        rosterId: Number(team.id ?? 0),
        pointsFor: record.pointsFor,
        pointsAgainst: record.pointsAgainst,
        potentialPoints: potentialPoints,
        managerEfficiency: potentialPoints
          ? Math.round((record.pointsFor * 1000) / potentialPoints) / 1000
          : 0,
        wins: record.wins,
        losses: record.losses,
        ties: record.ties,
        recordByWeek: recordByWeekMap.get(Number(team.id ?? 0)) ?? "",
        players: playerIds.filter((playerId): playerId is string =>
          Boolean(playerId)
        ),
      } satisfies RosterType;
    })
  );
};

const getWeeklyPointsMap = async (
  teams: Array<Record<string, unknown>> = [],
  schedule: Array<Array<Record<string, unknown>>> = [],
  playerLookupMap: Map<string, string> = new Map()
) => {
  const weeklyPoints = new Map<number, PointsType>();
  teams.forEach((team) => {
    const rosterId = Number(team.id ?? 0);
    weeklyPoints.set(rosterId, {
      rosterId,
      points: Array(schedule.length).fill(0),
      matchups: Array(schedule.length).fill(0),
      starters: Array.from({ length: schedule.length }, () => [] as string[]),
      starterNames: Array.from(
        { length: schedule.length },
        () => [] as string[]
      ),
      starterPoints: Array.from(
        { length: schedule.length },
        () => [] as number[]
      ),
      benchPlayers: Array.from(
        { length: schedule.length },
        () => [] as string[]
      ),
      benchPoints: Array.from(
        { length: schedule.length },
        () => [] as number[]
      ),
    });
  });

  await Promise.all(
    schedule.map(async (weekEntries, weekIndex) => {
      await Promise.all(
        weekEntries.map(async (teamWeek) => {
          const rosterId = Number(teamWeek.teamId ?? 0);
          const roster =
            (teamWeek.roster as Record<string, unknown> | undefined) ?? {};
          const entries = Array.isArray(roster.entries)
            ? (roster.entries as Array<Record<string, unknown>>)
            : [];
          const pointsRow = weeklyPoints.get(rosterId);

          if (!pointsRow) {
            return;
          }

          const starterPoints: number[] = [];
          const starterNames: string[] = [];
          const starterLookupInput: Array<{ name: string; team: string }> = [];
          const benchPointValues: number[] = [];
          const benchLookupInput: Array<{ name: string; team: string }> = [];

          entries.forEach((entry: any) => {
            const playerId = String(entry.playerId ?? "");
            const playerName = String(entry.playerPoolEntry.player.fullName);
            const playerTeam = getTeam(entry.playerPoolEntry.player.proTeamId);
            const lineupSlotId = Number(entry.lineupSlotId ?? 20);
            const playerPoints = getWeeklyEntryPoints(entry);

            if (!playerId) {
              return;
            }
            if (lineupSlotId === 20) {
              benchPointValues.push(playerPoints);
              benchLookupInput.push({
                name: playerName,
                team: playerTeam,
              });
              return;
            }

            if (lineupSlotId !== 21) {
              starterPoints.push(playerPoints);
              starterNames.push(playerName);
              starterLookupInput.push({
                name: playerName,
                team: playerTeam,
              });
            }
          });

          pointsRow.points[weekIndex] = Number(teamWeek.totalPoints ?? 0);
          if (pointsRow.matchups) {
            pointsRow.matchups[weekIndex] = Number(teamWeek.matchupId ?? 0);
          }
          pointsRow.starters[weekIndex] = starterLookupInput.map(
            (player) => playerLookupMap.get(getPlayerLookupKey(player)) ?? null
          );
          pointsRow.benchPlayers[weekIndex] = benchLookupInput.map(
            (player) => playerLookupMap.get(getPlayerLookupKey(player)) ?? null
          );
          pointsRow.starterPoints[weekIndex] = starterPoints;
          pointsRow.benchPoints[weekIndex] = benchPointValues;
          if (pointsRow.starterNames) {
            pointsRow.starterNames[weekIndex] = starterNames;
          }
        })
      );
    })
  );
  return Array.from(weeklyPoints.values());
};

const getRosterPositions = (lineupSlotCounts: Record<string, number> = {}) => {
  return Object.entries(lineupSlotCounts)
    .flatMap(([slotId, count]) =>
      Array.from({ length: Number(count ?? 0) }, () => {
        return LINEUP_SLOT_MAP[Number(slotId)] ?? `SLOT_${slotId}`;
      })
    )
    .filter((slot) => slot !== "BENCH" && slot !== "IR");
};

const getDraftPicks = async (
  draft: Record<string, unknown> | undefined,
  teams: Array<Record<string, unknown>> = [],
  playerLookups: EspnPlayerLookup[] = [],
  season: string,
  scoringType: number
) => {
  const picks = Array.isArray(draft?.picks)
    ? (draft?.picks as Array<Record<string, unknown>>)
    : [];
  const teamById = new Map(
    teams.map((team) => [Number(team.id ?? 0), team] as const)
  );
  const playerLookupByEspnId = new Map(
    playerLookups.map((playerLookup) => [
      String(playerLookup.espnId ?? ""),
      playerLookup,
    ])
  );
  const draftPlayerLookups: DraftPickLookupResult[] = picks.map((pick) => {
    const player = (pick.player as Record<string, unknown> | undefined) ?? {};
    const espnPlayerId = String(player.id ?? pick.playerId ?? "");
    const lookupFromIndex = playerLookupByEspnId.get(espnPlayerId);
    const fullName =
      lookupFromIndex?.name ?? String(player.fullName ?? "").trim();
    const [firstName = "", ...lastNameParts] = fullName.split(" ");
    const lastName = lastNameParts.join(" ");
    const fallbackPosition = getPosition(
      Number(player.defaultPositionId ?? player.position ?? 0)
    );

    return {
      firstName: String(player.firstName ?? firstName),
      lastName: String(player.lastName ?? lastName),
      lookup:
        lookupFromIndex ??
        (fullName
          ? {
              name: fullName,
              team: getTeam(Number(player.proTeamId ?? player.proTeam)),
              position: fallbackPosition,
              espnId: espnPlayerId,
            }
          : null),
    };
  });
  const sleeperPlayerIds = await getPlayerIdsByNameTeamMap(
    draftPlayerLookups.flatMap((pick) =>
      pick.lookup ? [{ name: pick.lookup.name, team: pick.lookup.team }] : []
    )
  );
  let sleeperPlayerIdIndex = 0;
  const playerStatsCache = new Map<
    string,
    Promise<Awaited<ReturnType<typeof getStats>> | null>
  >();

  return Promise.all(
    picks.map(async (pick, pickIndex) => {
      const player = (pick.player as Record<string, unknown> | undefined) ?? {};
      const ownerId = String(pick.memberId ?? pick.bidderId ?? "");
      const team = teamById.get(Number(pick.teamId ?? 0));
      const draftPlayerLookup = draftPlayerLookups[pickIndex];
      const position = draftPlayerLookup.lookup?.position ?? "NA";

      const sleeperPlayerId = draftPlayerLookup?.lookup
        ? (sleeperPlayerIds[sleeperPlayerIdIndex++] ?? null)
        : null;
      const pickAmount =
        pick.bidAmount != null
          ? Number(pick.bidAmount)
          : Number(pick.price ?? 0);
      // const isAuctionPick = pick.bidAmount != null || pick.price != null;
      const overallPickNumber = Number(
        pick.overallPickNumber ?? pick.pickNumber ?? 0
      );
      const round = Number(pick.roundId ?? pick.roundNumber ?? 0);
      const playerStatsPromise =
        sleeperPlayerId == null
          ? Promise.resolve(null)
          : (playerStatsCache.get(sleeperPlayerId) ??
            getStats(sleeperPlayerId, season, scoringType).catch((error) => {
              console.error("Error fetching ESPN draft player stats:", error);
              return null;
            }));

      if (sleeperPlayerId != null) {
        playerStatsCache.set(sleeperPlayerId, playerStatsPromise);
      }

      const stats = await playerStatsPromise;
      const draftRank = calculateDraftRank(
        overallPickNumber,
        stats?.rank ?? 0,
        round,
        position,
        stats?.ppg ?? 0
      );
      return {
        firstName:
          draftPlayerLookup?.firstName ?? String(player.firstName ?? ""),
        lastName: draftPlayerLookup?.lastName ?? String(player.lastName ?? ""),
        amount: pickAmount,
        playerId: sleeperPlayerId ?? String(player.id ?? pick.playerId ?? ""),
        position,
        pickNumber: overallPickNumber,
        draftSlot: Number(pick.roundPickNumber ?? 0),
        team:
          draftPlayerLookup?.lookup?.team ??
          getTeam(Number(player.proTeamId ?? player.proTeam)),
        round,
        rosterId: Number(team?.id ?? pick.teamId ?? 0),
        userId: ownerId,
        rank: stats?.rank ?? 0,
        pickRank: draftRank,
      } satisfies DraftPick;
    })
  );
};

const getLeagueWinner = (teams: Array<Record<string, unknown>> = []) => {
  const sortedTeams = [...teams].sort((a, b) => {
    const aRank = Number(a.rankCalculatedFinal ?? a.playoffSeed ?? Infinity);
    const bRank = Number(b.rankCalculatedFinal ?? b.playoffSeed ?? Infinity);
    return aRank - bRank;
  });
  const winner = sortedTeams[0];
  return winner ? String(winner.id ?? "") : null;
};

const getEspnMatchupWinnerId = (matchup: Record<string, unknown>) => {
  const winner = matchup.winner;
  const home = (matchup.home as Record<string, unknown> | undefined) ?? {};
  const away = (matchup.away as Record<string, unknown> | undefined) ?? {};

  if (winner === "HOME") {
    return home.teamId != null ? String(home.teamId) : null;
  }

  if (winner === "AWAY") {
    return away.teamId != null ? String(away.teamId) : null;
  }

  return null;
};

const getEspnLeagueWinner = (
  playoffMatchups: Array<Record<string, unknown>>,
  teams: Array<Record<string, unknown>> = []
) => {
  const championshipMatchup = [...playoffMatchups]
    .filter((matchup) => matchup.playoffTierType === "WINNERS_BRACKET")
    .sort((a, b) => {
      const matchupPeriodDiff =
        Number(b.matchupPeriodId ?? 0) - Number(a.matchupPeriodId ?? 0);
      if (matchupPeriodDiff !== 0) {
        return matchupPeriodDiff;
      }
      return Number(b.id ?? 0) - Number(a.id ?? 0);
    })
    .find((matchup) => getEspnMatchupWinnerId(matchup));

  return championshipMatchup
    ? getEspnMatchupWinnerId(championshipMatchup)
    : getLeagueWinner(teams);
};

const getEspnDraftType = (draftPicks: DraftPick[]) => {
  return draftPicks.some((pick) => Number(pick.amount ?? 0) > 0)
    ? "auction"
    : "snake";
};

const getEspnDraftMetadata = (
  draftPicks: DraftPick[],
  users: UserType[],
  rosters: RosterType[]
): LeagueDraftMetadata => {
  const userById = new Map(users.map((user) => [user.id, user]));
  const userIdByRosterId = new Map(
    rosters.map((roster) => [roster.rosterId, roster.id] as const)
  );
  const orderedRosterIds = Array.from(
    new Set(draftPicks.map((pick) => pick.rosterId))
  ).slice(0, rosters.length);

  return {
    order: orderedRosterIds.flatMap((rosterId) => {
      const userId = userIdByRosterId.get(rosterId);
      const user = userId ? userById.get(userId) : undefined;
      return user
        ? [
            {
              id: user.id,
              name: user.name,
              username: user.username,
              avatar: user.avatar,
              avatarImg: user.avatarImg ?? "",
              placement: user.placement ?? 0,
            },
          ]
        : [];
    }),
    roundReversal: 0,
    draftType: getEspnDraftType(draftPicks),
  };
};

export const getLeagueStatus = (
  currentWeek: number,
  lastScoredWeek: number,
  regularSeasonLength: number,
  finalScoringPeriod: number = regularSeasonLength
) => {
  if (lastScoredWeek === 0 && currentWeek === 0) {
    return "pre_draft";
  }

  const completionWeek =
    finalScoringPeriod > regularSeasonLength
      ? finalScoringPeriod
      : regularSeasonLength;

  if (lastScoredWeek < completionWeek) {
    return "in_season";
  }

  return "complete";
};

export const getLastScoredWeek = (
  currentWeek: number,
  latestScoringPeriod: number,
  finalScoringPeriod: number
) => {
  if (currentWeek <= 0) {
    return 0;
  }

  const latestCompletedCandidate =
    latestScoringPeriod > currentWeek ? latestScoringPeriod : currentWeek - 1;
  const completedThroughFinalPeriod =
    finalScoringPeriod > 0 && latestScoringPeriod > finalScoringPeriod
      ? finalScoringPeriod
      : 0;

  const lastCompletedWeek = Math.max(
    Math.min(latestCompletedCandidate, currentWeek),
    completedThroughFinalPeriod,
    0
  );

  // ESPN's finalScoringPeriod is the scheduled season endpoint, not the last
  // completed week. Keep it only as an upper bound so we don't fetch future
  // matchup periods with zero scores.
  return finalScoringPeriod > 0
    ? Math.min(lastCompletedWeek, finalScoringPeriod)
    : lastCompletedWeek;
};

export const getLeagueData = async (
  season: string,
  league_id: string,
  auth?: EspnAuth
) => {
  return fetchEspnJson(
    `${ESPN_BASE_URL}/apis/v3/games/ffl/seasons/${season}/segments/0/leagues/${league_id}?view=mSettings`,
    auth
  );
};

export const getTeamData = async (
  season: string,
  league_id: string,
  auth?: EspnAuth
) => {
  return fetchEspnJson(
    `${ESPN_BASE_URL}/apis/v3/games/ffl/seasons/${season}/segments/0/leagues/${league_id}?view=mTeam`,
    auth
  );
};

export const getRosterData = async (
  season: string,
  league_id: string,
  auth?: EspnAuth
) => {
  return fetchEspnJson(
    `${ESPN_BASE_URL}/apis/v3/games/ffl/seasons/${season}/segments/0/leagues/${league_id}?view=mRoster`,
    auth
  );
};

export const getDraftData = async (
  season: string,
  league_id: string,
  auth?: EspnAuth
) => {
  return fetchEspnJson(
    `${ESPN_BASE_URL}/apis/v3/games/ffl/seasons/${season}/segments/0/leagues/${league_id}?view=mDraftDetail`,
    auth
  );
};

export const getPlayerStats = async (
  season: string,
  league_id: string,
  week: number,
  auth?: EspnAuth
) => {
  return fetchEspnJson(
    `${ESPN_BASE_URL}/apis/v3/games/ffl/seasons/${season}/segments/0/leagues/${league_id}?view=mMatchupScore&view=mScoreboard&scoringPeriodId=${String(week)}`,
    auth
  );
};

export const getPlayoffMatchups = async (
  season: string,
  league_id: string,
  auth?: EspnAuth
) => {
  return fetchEspnJson(
    `${ESPN_BASE_URL}/apis/v3/games/ffl/seasons/${season}/segments/0/leagues/${league_id}?view=mMatchupScore`,
    auth
  );
};

export const getWaivers = async (
  season: string,
  league_id: string,
  week: number,
  auth?: EspnAuth
) => {
  return fetchEspnJson(
    `${ESPN_BASE_URL}/apis/v3/games/ffl/seasons/${season}/segments/0/leagues/${league_id}?view=mTransactions2&scoringPeriodId=${String(week)}`,
    auth
  );
};

const getScoringType = (scoringItems: any[]): number => {
  const receptions = scoringItems.find((i) => i.statId === 53);
  return receptions?.points ?? 0;
};

const getLeagueFormat = (draftSettings: any): "Redraft" | "Keeper" => {
  return (draftSettings?.keeperCount ?? 0) > 0 ? "Keeper" : "Redraft";
};

export const getEspnLeagueInfo = async (
  season: string,
  leagueId: string,
  auth?: EspnAuth
): Promise<LeagueInfoType> => {
  const [league, teamData, rosterData, draftData, playoffData] =
    await Promise.all([
      getLeagueData(season, leagueId, auth),
      getTeamData(season, leagueId, auth),
      getRosterData(season, leagueId, auth),
      getDraftData(season, leagueId, auth),
      getPlayoffMatchups(season, leagueId, auth),
    ]);

  const leagueRoot = assertRecord(
    league,
    "ESPN returned an invalid league response."
  );
  const settings = assertRecord(
    leagueRoot.settings,
    "ESPN league settings are missing. Check that the league ID and season are correct."
  );
  const scheduleSettings = assertRecord(
    settings.scheduleSettings,
    "ESPN schedule settings are missing for this league."
  );
  const rosterSettings = assertRecord(
    settings.rosterSettings,
    "ESPN roster settings are missing for this league."
  );
  const acquisitionSettings = assertRecord(
    settings.acquisitionSettings,
    "ESPN acquisition settings are missing for this league."
  );
  const scoringSettings = assertRecord(
    settings.scoringSettings,
    "ESPN scoring settings are missing for this league."
  );
  // const playoffMatchupPeriodLength =
  //   scheduleSettings.playoffMatchupPeriodLength;
  // const numPlayoffTeams = scheduleSettings.playoffTeamCount;
  const playoffMatchups = assertArray<Record<string, unknown>>(
    assertRecord(playoffData, "ESPN playoff data is missing.").schedule,
    "ESPN playoff schedule data is missing."
  ).filter((matchup: any) => matchup.playoffTierType !== "NONE");

  const status =
    (leagueRoot.status as Record<string, unknown> | undefined) ?? {};
  const members = Array.isArray(leagueRoot.members)
    ? (leagueRoot.members as Array<Record<string, unknown>>)
    : [];
  const teamDataTeams = Array.isArray(teamData?.teams)
    ? (teamData.teams as Array<Record<string, unknown>>)
    : [];
  const rosterDataTeams = Array.isArray(rosterData?.teams)
    ? (rosterData.teams as Array<Record<string, unknown>>)
    : [];
  const teams = mergeTeams(teamDataTeams, rosterDataTeams);
  const regularSeasonLength = Number(
    scheduleSettings.matchupPeriodCount ??
      scheduleSettings.regularSeasonMatchupPeriodCount ??
      0
  );
  const currentWeek = Number(status.currentMatchupPeriod ?? 0);
  const finalScoringPeriod = Number(status.finalScoringPeriod ?? 0);
  const latestScoringPeriod = Number(status.latestScoringPeriod ?? 0);
  const lastScoredWeek = getLastScoredWeek(
    currentWeek,
    latestScoringPeriod,
    finalScoringPeriod
  );

  let schedule = [];
  let waivers = [];
  for (let i = 1; i <= lastScoredWeek; i++) {
    const scheduleData = assertRecord(
      await getPlayerStats(season, leagueId, i, auth),
      `ESPN weekly scoring data is missing for week ${i}.`
    );
    const waiverData = assertRecord(
      await getWaivers(season, leagueId, i, auth),
      `ESPN transaction data is missing for week ${i}.`
    );
    const filteredWaivers = assertArray<Record<string, unknown>>(
      waiverData.transactions ?? [],
      `ESPN transaction data is invalid for week ${i}.`
    ).filter(
      (transaction: any) =>
        transaction.status === "EXECUTED" && transaction.type !== "DRAFT"
    );
    waivers.push(filteredWaivers);

    const filtered = assertArray<Record<string, unknown>>(
      scheduleData.schedule,
      `ESPN matchup schedule data is missing for week ${i}.`
    )
      .filter(
        (matchup: any) =>
          matchup.home?.rosterForCurrentScoringPeriod &&
          matchup.away?.rosterForCurrentScoringPeriod
      )
      .flatMap((matchup: any, matchupIndex: number) => {
        const homePoints = Number(matchup.home.totalPoints ?? 0);
        const awayPoints = Number(matchup.away.totalPoints ?? 0);

        return [
          {
            matchupId: matchupIndex + 1,
            teamId: matchup.home.teamId,
            totalPoints: homePoints,
            result: getWeeklyResult(homePoints, awayPoints),
            roster:
              matchup.home.rosterForCurrentScoringPeriod ??
              matchup.home.rosterForMatchupPeriod,
          },
          {
            matchupId: matchupIndex + 1,
            teamId: matchup.away.teamId,
            totalPoints: awayPoints,
            result: getWeeklyResult(awayPoints, homePoints),
            roster:
              matchup.away.rosterForCurrentScoringPeriod ??
              matchup.away.rosterForMatchupPeriod,
          },
        ];
      });
    schedule.push(filtered);
  }
  const recordByWeekMap = getRecordByWeekMap(
    teams,
    schedule,
    regularSeasonLength
  );
  const potentialPointsMap = getPotentialPointsMap(
    teams,
    schedule,
    (rosterSettings.lineupSlotCounts as Record<string, number> | undefined) ??
      {}
  );

  const allPlayerLookups: EspnPlayerLookup[] = [
    ...teams.flatMap((team) =>
      getRosterEntries(team).map((entry: any) => ({
        name: String(entry.playerPoolEntry.player.fullName ?? ""),
        team: getTeam(Number(entry.playerPoolEntry.player.proTeamId)),
        position: getPosition(
          Number(entry.playerPoolEntry.player.defaultPositionId)
        ),
        espnId: entry.playerPoolEntry.player.id,
      }))
    ),
    ...schedule.flatMap((weekEntries) =>
      weekEntries.flatMap((teamWeek: Record<string, unknown>) => {
        const roster =
          (teamWeek.roster as Record<string, unknown> | undefined) ?? {};
        const entries = Array.isArray(roster.entries)
          ? (roster.entries as Array<Record<string, unknown>>)
          : [];

        return entries.map((entry: any) => ({
          name: String(entry.playerPoolEntry.player.fullName ?? ""),
          team: getTeam(Number(entry.playerPoolEntry.player.proTeamId)),
          position: getPosition(
            Number(entry.playerPoolEntry.player.defaultPositionId)
          ),
          espnId: entry.playerPoolEntry.player.id,
        }));
      })
    ),
  ];

  const playerLookupMap = await getPlayerIdLookupMap(allPlayerLookups);
  const sleeperPlayerIdByEspnId = getSleeperPlayerIdByEspnIdMap(
    allPlayerLookups,
    playerLookupMap
  );
  // TODO cleanup this logic
  const enrichedWaivers = waivers
    .flat()
    .map((waiver) => {
      const typedWaiver = waiver as EspnWaiverTransaction;
      if (
        typedWaiver &&
        typedWaiver.items?.[0].type === "ADD" &&
        (typedWaiver.type === "WAIVER" || typedWaiver.type === "FREEAGENT")
      ) {
        const sleeperPlayerId =
          sleeperPlayerIdByEspnId.get(
            String(typedWaiver.items[0].playerId ?? "")
          ) ?? null;
        const type = typedWaiver.type === "WAIVER" ? "waiver" : "free_agent";
        return {
          adds: sleeperPlayerId
            ? { [sleeperPlayerId]: typedWaiver.teamId }
            : {},
          status: typedWaiver.status === "EXECUTED" ? "complete" : "",
          type: type,
          roster_ids: [typedWaiver.teamId],
          week: typedWaiver.scoringPeriodId,
          settings: { waiver_bid: typedWaiver.bidAmount },
          creator: typedWaiver.memberId,
          leg: typedWaiver.scoringPeriodId,
        };
      }
    })
    .filter(Boolean);

  const excludedIds = new Set(["NightlyLeagueUpdateTaskProcessor", "kona"]);

  const transactions = enrichedWaivers.reduce<Record<string, number>>(
    (acc, item: any) => {
      const id = item.creator;

      if (excludedIds.has(id)) return acc; // skip

      acc[id] = (acc[id] || 0) + 1;
      return acc;
    },
    {}
  );
  const users = getManagerMap(members, teams);
  const rosters = await getRosterMap(
    teams,
    recordByWeekMap,
    potentialPointsMap,
    playerLookupMap
  );
  const scoringType = getScoringType(
    assertArray(
      scoringSettings.scoringItems ?? [],
      "ESPN scoring settings are invalid."
    )
  );
  const draftPicks = await getDraftPicks(
    (draftData?.draftDetail as Record<string, unknown> | undefined) ??
      draftData,
    teams,
    allPlayerLookups,
    season,
    scoringType
  );
  const espnWinnersBracket = playoffMatchups.filter((matchup: any) =>
    matchup.playoffTierType.includes("WINNER")
  );
  const espnLosersBracket = playoffMatchups.filter((matchup: any) =>
    matchup.playoffTierType.includes("LOSER")
  );

  const seasonType = getLeagueFormat(settings.draftSettings);
  const leagueName = String(settings.name ?? leagueRoot.name ?? "");
  const totalRosters = Number(settings.size ?? teams.length ?? 0);

  await inputLeague(
    leagueId,
    leagueName,
    totalRosters,
    seasonType,
    season,
    "espn"
  );

  return {
    platform: "espn",
    name: leagueName,
    regularSeasonLength,
    medianScoring: 0, // how do we check for median scoring?
    totalRosters: totalRosters,
    season,
    seasonType: seasonType,
    leagueId,
    leagueWinner: getEspnLeagueWinner(espnWinnersBracket, teams),
    lastUpdated: Date.now(),
    previousLeagueId: null, // previous years have the same id, just change the year
    lastScoredWeek,
    espnWinnersBracket,
    espnLosersBracket,
    winnersBracket: [],
    losersBracket: [],
    users,
    rosters,
    weeklyPoints: await getWeeklyPointsMap(teams, schedule, playerLookupMap),
    transactions: transactions,
    trades: [],
    waivers: enrichedWaivers as unknown as LeagueInfoType["waivers"],
    previousLeagues:
      (status.previousSeasons as LeagueInfoType[] | undefined) ?? [],
    status: getLeagueStatus(
      currentWeek,
      lastScoredWeek,
      regularSeasonLength,
      finalScoringPeriod
    ),
    currentWeek,
    scoringType,
    rosterPositions: getRosterPositions(
      (rosterSettings.lineupSlotCounts as Record<string, number> | undefined) ??
        {}
    ),
    playoffTeams: Number(scheduleSettings.playoffTeamCount ?? 0),
    playoffType: 0,
    draftId: String(draftData?.id ?? draftData?.draftDetail?.id ?? ""),
    draftPicks,
    draftMetadata: getEspnDraftMetadata(draftPicks, users, rosters),
    waiverType: acquisitionSettings.isUsingAcquisitionBudget ? 2 : 0,
    sport: "nfl",
  };
};
