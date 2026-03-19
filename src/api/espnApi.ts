import type { DraftPick } from "@/types/apiTypes";
import type {
  LeagueInfoType,
  PointsType,
  RosterType,
  UserType,
} from "@/types/types";

const ESPN_BASE_URL = "https://lm-api-reads.fantasy.espn.com";

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

const safeJson = async (response: Response) => {
  if (!response.ok) {
    throw new Error(`ESPN request failed with status ${response.status}`);
  }
  return response.json();
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
    pointsFor: Number(overall.pointsFor ?? team.points ?? 0),
    pointsAgainst: Number(overall.pointsAgainst ?? 0),
  };
};

const getManagerMap = (
  members: Array<Record<string, unknown>> = [],
  teams: Array<Record<string, unknown>> = []
) => {
  const teamNameByOwner = new Map<string, string>();

  teams.forEach((team) => {
    const owners = Array.isArray(team.owners) ? team.owners : [];
    const location = String(team.location ?? "").trim();
    const nickname = String(team.nickname ?? "").trim();
    const teamName = [location, nickname].filter(Boolean).join(" ").trim();

    owners.forEach((owner) => {
      teamNameByOwner.set(String(owner), teamName || nickname || location);
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
      name: teamNameByOwner.get(id) || fullName || username,
      username,
    } satisfies UserType;
  });

  if (mappedMembers.length > 0) {
    return mappedMembers;
  }
  return teams.map(
    (team) =>
      ({
        id: String(team.primaryOwner ?? team.id ?? ""),
        avatar: String(team.logo ?? ""),
        name: String(team.name ?? ""),
        username: String(team.name ?? ""),
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

const getRosterMap = (teams: Array<Record<string, unknown>> = []) => {
  return teams.map((team) => {
    const record = getTeamRecord(team);
    const rosterEntries = getRosterEntries(team);
    const valuesByStat =
      (team.valuesByStat as Record<string, number> | undefined) ?? {};

    return {
      id: String(team.primaryOwner ?? team.id ?? ""),
      rosterId: Number(team.id ?? 0),
      pointsFor: record.pointsFor,
      pointsAgainst: record.pointsAgainst,
      potentialPoints: Number(valuesByStat["0"] ?? record.pointsFor),
      managerEfficiency: 0,
      wins: record.wins,
      losses: record.losses,
      ties: record.ties,
      recordByWeek: "",
      players: rosterEntries
        .map((entry) => String(entry.playerId ?? ""))
        .filter(Boolean),
      playerNames: rosterEntries
        .map((entry) => String(entry.playerPoolEntry.player.fullName ?? ""))
        .filter(Boolean),
    } satisfies RosterType;
  });
};

const getWeeklyPointsMap = (
  teams: Array<Record<string, unknown>> = [],
  schedule: Array<Record<string, unknown>> = []
) => {
  const weeklyPoints = new Map<number, PointsType>();
  teams.forEach((team) => {
    const rosterEntries = getRosterEntries(team);
    const starters = rosterEntries
      .filter((entry) => Number(entry.lineupSlotId ?? 20) !== 20)
      .filter((entry) => Number(entry.lineupSlotId ?? 21) !== 21)
      .map((entry) => String(entry.playerId ?? ""))
      .filter(Boolean);
    const bench = rosterEntries
      .filter((entry) => Number(entry.lineupSlotId ?? 20) === 20)
      .map((entry) => String(entry.playerId ?? ""))
      .filter(Boolean);
    const rosterId = Number(team.id ?? 0);

    weeklyPoints.set(rosterId, {
      rosterId,
      points: [],
      matchups: [],
      starters: starters.length ? [starters] : [],
      starterPoints: starters.length ? [starters.map(() => 0)] : [],
      benchPlayers: bench.length ? [bench] : [],
      benchPoints: bench.length ? [bench.map(() => 0)] : [],
    });
  });

  schedule.forEach((matchup) => {
    const matchupId = Number(matchup.id ?? matchup.matchupPeriodId ?? 0);
    const home = matchup.home as Record<string, unknown> | undefined;
    const away = matchup.away as Record<string, unknown> | undefined;

    [home, away].forEach((side) => {
      if (!side) {
        return;
      }
      const teamId = Number(side.teamId ?? 0);
      const entry = weeklyPoints.get(teamId);
      if (!entry) {
        return;
      }
      entry.points.push(Number(side.totalPoints ?? 0));
      entry.matchups?.push(matchupId || 0);
    });
  });

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

const getDraftPicks = (
  draft: Record<string, unknown> | undefined,
  teams: Array<Record<string, unknown>> = []
) => {
  const picks = Array.isArray(draft?.picks)
    ? (draft?.picks as Array<Record<string, unknown>>)
    : [];
  const teamById = new Map(
    teams.map((team) => [Number(team.id ?? 0), team] as const)
  );

  return picks.map((pick) => {
    const player = (pick.player as Record<string, unknown> | undefined) ?? {};
    const ownerId = String(pick.memberId ?? pick.bidderId ?? "");
    const team = teamById.get(Number(pick.teamId ?? 0));

    return {
      firstName: String(player.firstName ?? ""),
      lastName: String(player.lastName ?? ""),
      amount:
        pick.bidAmount != null
          ? Number(pick.bidAmount)
          : Number(pick.price ?? 0),
      playerId: String(player.id ?? pick.playerId ?? ""),
      position: String(player.defaultPositionId ?? player.position ?? ""),
      pickNumber: Number(pick.overallPickNumber ?? pick.pickNumber ?? 0),
      draftSlot: Number(pick.roundPickNumber ?? 0),
      team: String(player.proTeam ?? ""),
      round: Number(pick.roundId ?? pick.roundNumber ?? 0),
      rosterId: Number(team?.id ?? pick.teamId ?? 0),
      userId: ownerId,
      rank: 0,
      pickRank: "0.0",
    } satisfies DraftPick;
  });
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

const getLeagueStatus = (
  currentWeek: number,
  lastScoredWeek: number,
  regularSeasonLength: number
) => {
  if (lastScoredWeek === 0 && currentWeek === 0) {
    return "pre_draft";
  }
  if (currentWeek <= regularSeasonLength) {
    return "in_season";
  }
  return "post_season";
};

export const getLeagueData = async (season: string, league_id: string) => {
  try {
    const response = await fetch(
      `${ESPN_BASE_URL}/apis/v3/games/ffl/seasons/${season}/segments/0/leagues/${league_id}?view=mSettings`
    );
    return safeJson(response);
  } catch (e) {
    console.error(e);
  }
};

export const getTeamData = async (season: string, league_id: string) => {
  try {
    const response = await fetch(
      `${ESPN_BASE_URL}/apis/v3/games/ffl/seasons/${season}/segments/0/leagues/${league_id}?view=mTeam`
    );
    return safeJson(response);
  } catch (e) {
    console.error(e);
  }
};

export const getRosterData = async (season: string, league_id: string) => {
  try {
    const response = await fetch(
      `${ESPN_BASE_URL}/apis/v3/games/ffl/seasons/${season}/segments/0/leagues/${league_id}?view=mRoster`
    );
    return safeJson(response);
  } catch (e) {
    console.error(e);
  }
};

export const getMatchups = async (season: string, league_id: string) => {
  try {
    const response = await fetch(
      `${ESPN_BASE_URL}/apis/v3/games/ffl/seasons/${season}/segments/0/leagues/${league_id}?view=mMatchupScore`
    );
    return safeJson(response);
  } catch (e) {
    console.error(e);
  }
};

export const getDraftData = async (season: string, league_id: string) => {
  try {
    const response = await fetch(
      `${ESPN_BASE_URL}/apis/v3/games/ffl/seasons/${season}/segments/0/leagues/${league_id}?view=mDraftDetail`
    );
    return safeJson(response);
  } catch (e) {
    console.error(e);
  }
};

export const getLeagueInfoLike = async (
  season: string,
  leagueId: string
): Promise<LeagueInfoType | null> => {
  try {
    const [league, teamData, rosterData, matchupData, draftData] =
      await Promise.all([
        getLeagueData(season, leagueId),
        getTeamData(season, leagueId),
        getRosterData(season, leagueId),
        getMatchups(season, leagueId),
        getDraftData(season, leagueId),
      ]);

    const leagueRoot = (league ?? {}) as Record<string, unknown>;
    const settings =
      (leagueRoot.settings as Record<string, unknown> | undefined) ?? {};
    const scheduleSettings =
      (settings.scheduleSettings as Record<string, unknown> | undefined) ?? {};
    const rosterSettings =
      (settings.rosterSettings as Record<string, unknown> | undefined) ?? {};
    const acquisitionSettings =
      (settings.acquisitionSettings as Record<string, unknown> | undefined) ??
      {};
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
    const schedule = Array.isArray(matchupData?.schedule)
      ? (matchupData.schedule as Array<Record<string, unknown>>)
      : [];
    const regularSeasonLength = Number(
      scheduleSettings.matchupPeriodCount ??
        scheduleSettings.regularSeasonMatchupPeriodCount ??
        0
    );
    const currentWeek = Number(status.currentMatchupPeriod ?? 0);
    const finalScoringPeriod = Number(status.finalScoringPeriod ?? 0);
    const lastScoredWeek = Math.max(finalScoringPeriod, currentWeek - 1, 0);

    return {
      name: String(settings.name ?? leagueRoot.name ?? ""),
      regularSeasonLength,
      medianScoring: 0,
      totalRosters: Number(settings.size ?? teams.length ?? 0),
      season,
      seasonType: "Redraft",
      leagueId,
      leagueWinner: getLeagueWinner(teams),
      lastUpdated: Date.now(),
      previousLeagueId: null,
      lastScoredWeek,
      winnersBracket: [],
      losersBracket: [],
      users: getManagerMap(members, teams),
      rosters: getRosterMap(teams),
      weeklyPoints: getWeeklyPointsMap(teams, schedule),
      transactions: {},
      trades: [],
      waivers: [],
      previousLeagues: [],
      status: getLeagueStatus(currentWeek, lastScoredWeek, regularSeasonLength),
      currentWeek,
      scoringType: 1,
      rosterPositions: getRosterPositions(
        (rosterSettings.lineupSlotCounts as
          | Record<string, number>
          | undefined) ?? {}
      ),
      playoffTeams: Number(scheduleSettings.playoffTeamCount ?? 0),
      playoffType: 0,
      draftId: String(draftData?.id ?? draftData?.draftDetail?.id ?? ""),
      draftPicks: getDraftPicks(
        (draftData?.draftDetail as Record<string, unknown> | undefined) ??
          draftData,
        teams
      ),
      waiverType:
        Number(acquisitionSettings.acquisitionBudget ?? 0) > 0 ? 2 : 0,
      sport: "nfl",
    };
  } catch (error) {
    console.error("Error building ESPN league info:", error);
    return null;
  }
};
