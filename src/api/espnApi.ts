import type { LeagueOriginal } from "@/types/apiTypes";
import type { PointsType, RosterType, UserType } from "@/types/types";
import {
  buildLeagueKey,
  normalizeLeagueOriginal,
} from "@/lib/leagueIdentity";

type EspnMember = {
  id?: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
};

type EspnPlayerPoolEntry = {
  appliedStatTotal?: number;
  player?: {
    id?: number;
    fullName?: string;
    defaultPositionId?: number;
  };
};

type EspnRosterEntry = {
  lineupSlotId?: number;
  playerPoolEntry?: EspnPlayerPoolEntry;
};

type EspnTeamRecord = {
  overall?: {
    wins?: number;
    losses?: number;
    ties?: number;
    pointsFor?: number;
    pointsAgainst?: number;
  };
};

type EspnTeam = {
  id?: number;
  abbrev?: string;
  location?: string;
  nickname?: string;
  logo?: string;
  owners?: string[];
  primaryOwner?: string;
  points?: number;
  record?: EspnTeamRecord;
  roster?: {
    entries?: EspnRosterEntry[];
  };
};

type EspnMatchupSide = {
  teamId?: number;
  totalPoints?: number;
  rosterForCurrentScoringPeriod?: {
    entries?: EspnRosterEntry[];
  };
};

type EspnScheduleItem = {
  id?: number;
  matchupPeriodId?: number;
  playoffTierType?: string;
  home?: EspnMatchupSide | null;
  away?: EspnMatchupSide | null;
  winner?: "HOME" | "AWAY" | "UNDECIDED";
};

type EspnSettings = {
  name?: string;
  size?: number;
  lineupSlotCounts?: Record<string, number>;
  scoringSettings?: {
    scoringItems?: Array<{
      statId?: number;
      points?: number;
    }>;
  };
  scheduleSettings?: {
    matchupPeriodCount?: number;
    playoffTeamCount?: number;
  };
};

type EspnStatus = {
  currentMatchupPeriod?: number;
  finalScoringPeriod?: number;
  firstScoringPeriod?: number;
  isActive?: boolean;
  latestScoringPeriod?: number;
};

type EspnLeagueResponse = {
  id?: number;
  seasonId?: number;
  settings?: EspnSettings;
  status?: EspnStatus;
  members?: EspnMember[];
  teams?: EspnTeam[];
  schedule?: EspnScheduleItem[];
};

type EspnPlayerScoreRow = {
  id: string;
  position: string;
  points: number;
};

const ESPN_BASE_URL =
  "https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons";

const ESPN_VIEWS = [
  "mSettings",
  "mTeam",
  "mRoster",
  "mMatchup",
  "mStatus",
  "mMembers",
];

const assertOk = (response: Response, context: string) => {
  if (!response.ok) {
    throw new Error(`${context} failed with status ${response.status}`);
  }
};

const parseJson = async <T>(
  response: Response,
  context: string
): Promise<T> => {
  try {
    return (await response.json()) as T;
  } catch {
    throw new Error(`${context} returned invalid JSON`);
  }
};

const fetchEspnLeague = async (
  leagueId: string,
  season: string
): Promise<EspnLeagueResponse | null> => {
  const viewQuery = ESPN_VIEWS.map((view) => `view=${view}`).join("&");
  const response = await fetch(
    `${ESPN_BASE_URL}/${season}/segments/0/leagues/${leagueId}?${viewQuery}`
  );

  if (response.status === 404) {
    return null;
  }

  assertOk(response, "ESPN league request");
  return parseJson<EspnLeagueResponse>(response, "ESPN league");
};

const LINEUP_SLOT_MAP: Record<number, string> = {
  0: "QB",
  2: "RB",
  4: "WR",
  6: "TE",
  16: "DEF",
  17: "K",
  20: "BN",
  23: "FLEX",
};

const STARTER_LINEUP_SLOT_IDS = new Set([0, 2, 4, 6, 16, 17, 23]);
const FIXED_SLOT_IDS = [0, 2, 4, 6, 16, 17];
const POSITION_ID_MAP: Record<number, string> = {
  1: "QB",
  2: "RB",
  3: "WR",
  4: "TE",
  5: "K",
  16: "DEF",
};

const getRosterPositions = (settings?: EspnSettings) => {
  const slotCounts = settings?.lineupSlotCounts ?? {};
  const positions: string[] = [];

  Object.entries(slotCounts).forEach(([slotId, count]) => {
    const repeats = Number(count);
    const mapped = LINEUP_SLOT_MAP[Number(slotId)];
    if (!mapped || repeats <= 0) return;

    for (let i = 0; i < repeats; i += 1) {
      positions.push(mapped);
    }
  });

  return positions;
};

const getScoringType = (settings?: EspnSettings) => {
  const receptionItem = settings?.scoringSettings?.scoringItems?.find(
    (item) => item.statId === 53
  );
  const receptionPoints = receptionItem?.points ?? 0;

  if (receptionPoints === 0.5) return 0.5;
  if (receptionPoints === 0) return 0;
  return 1;
};

const buildTeamName = (team: EspnTeam) => {
  const location = team.location?.trim() ?? "";
  const nickname = team.nickname?.trim() ?? "";
  const fullName = [location, nickname].filter(Boolean).join(" ").trim();

  return fullName || team.abbrev || `Team ${team.id ?? ""}`.trim();
};

const getTeamOwnerId = (team: EspnTeam) => {
  return team.primaryOwner ?? team.owners?.[0] ?? `espn-team-${team.id ?? 0}`;
};

const getEntryPoints = (entry: EspnRosterEntry) => {
  return entry.playerPoolEntry?.appliedStatTotal ?? 0;
};

const getEntryPlayerId = (entry: EspnRosterEntry) => {
  return String(entry.playerPoolEntry?.player?.id ?? "");
};

const getEntryPosition = (entry: EspnRosterEntry) => {
  const positionId = entry.playerPoolEntry?.player?.defaultPositionId ?? -1;
  return POSITION_ID_MAP[positionId] ?? "";
};

const getOptimalLineupPoints = (
  entries: EspnRosterEntry[],
  settings?: EspnSettings
) => {
  const slotCounts = settings?.lineupSlotCounts ?? {};
  const availablePlayers: EspnPlayerScoreRow[] = entries
    .map((entry) => ({
      id: getEntryPlayerId(entry),
      position: getEntryPosition(entry),
      points: getEntryPoints(entry),
    }))
    .filter((entry) => entry.id && entry.position);

  const usedPlayerIds = new Set<string>();
  let total = 0;

  FIXED_SLOT_IDS.forEach((slotId) => {
    const position = LINEUP_SLOT_MAP[slotId];
    const count = Number(slotCounts[String(slotId)] ?? 0);

    for (let i = 0; i < count; i += 1) {
      const bestAvailable = availablePlayers
        .filter(
          (player) => player.position === position && !usedPlayerIds.has(player.id)
        )
        .sort((a, b) => b.points - a.points)[0];

      if (!bestAvailable) continue;

      usedPlayerIds.add(bestAvailable.id);
      total += bestAvailable.points;
    }
  });

  const flexCount = Number(slotCounts["23"] ?? 0);

  for (let i = 0; i < flexCount; i += 1) {
    const bestFlex = availablePlayers
      .filter(
        (player) =>
          ["RB", "WR", "TE"].includes(player.position) &&
          !usedPlayerIds.has(player.id)
      )
      .sort((a, b) => b.points - a.points)[0];

    if (!bestFlex) continue;

    usedPlayerIds.add(bestFlex.id);
    total += bestFlex.points;
  }

  return Number(total.toFixed(2));
};

const buildRecordByWeek = (
  rosterId: number,
  schedule: EspnScheduleItem[],
  completedWeeks: number
) => {
  const weeklyRecords: string[] = [];

  for (let week = 1; week <= completedWeeks; week += 1) {
    const matchup = schedule.find(
      (item) =>
        item.matchupPeriodId === week &&
        (item.home?.teamId === rosterId || item.away?.teamId === rosterId)
    );

    if (!matchup) {
      continue;
    }

    if (matchup.winner === "UNDECIDED") {
      continue;
    }

    const isHomeTeam = matchup.home?.teamId === rosterId;
    const won =
      (isHomeTeam && matchup.winner === "HOME") ||
      (!isHomeTeam && matchup.winner === "AWAY");

    weeklyRecords.push(won ? "W" : "L");
  }

  return weeklyRecords.join("");
};

const buildWeeklyPoints = (
  teams: EspnTeam[],
  schedule: EspnScheduleItem[],
  completedWeeks: number
): PointsType[] => {
  const pointsByRoster = new Map<number, PointsType>();

  teams.forEach((team) => {
    const rosterId = team.id ?? 0;
    if (!rosterId) return;

    pointsByRoster.set(rosterId, {
      rosterId,
      points: [],
      matchups: [],
      starters: [],
      starterPoints: [],
      benchPlayers: [],
      benchPoints: [],
    });
  });

  for (let week = 1; week <= completedWeeks; week += 1) {
    const weeklyMatchups = schedule.filter((item) => item.matchupPeriodId === week);

    pointsByRoster.forEach((value) => {
      value.points.push(0);
      value.matchups?.push(0);
      value.starters.push([]);
      value.starterPoints.push([]);
      value.benchPlayers.push([]);
      value.benchPoints.push([]);
    });

    weeklyMatchups.forEach((matchup) => {
      const matchupKey = matchup.id ?? week;
      const sides = [matchup.home, matchup.away];

      sides.forEach((side) => {
        if (!side?.teamId) return;

        const pointsEntry = pointsByRoster.get(side.teamId);
        if (!pointsEntry) return;

        const opponent = sides.find((candidate) => candidate?.teamId !== side.teamId);
        const index = week - 1;
        const rosterEntries = side.rosterForCurrentScoringPeriod?.entries ?? [];
        const starters = rosterEntries
          .filter((entry) => STARTER_LINEUP_SLOT_IDS.has(entry.lineupSlotId ?? -1))
          .map((entry) => String(entry.playerPoolEntry?.player?.id ?? ""));
        const bench = rosterEntries
          .filter((entry) => !STARTER_LINEUP_SLOT_IDS.has(entry.lineupSlotId ?? -1))
          .map((entry) => String(entry.playerPoolEntry?.player?.id ?? ""));

        pointsEntry.points[index] = side.totalPoints ?? 0;
        if (pointsEntry.matchups) {
          pointsEntry.matchups[index] = matchupKey;
        }
        pointsEntry.starters[index] = starters.filter(Boolean);
        pointsEntry.starterPoints[index] = starters.map(() => 0);
        pointsEntry.benchPlayers[index] = bench.filter(Boolean);
        pointsEntry.benchPoints[index] = bench.map(() => 0);

        if (!opponent) {
          pointsEntry.matchups![index] = 0;
        }
      });
    });
  }

  return Array.from(pointsByRoster.values());
};

const getSeasonPotentialPoints = (
  rosterId: number,
  schedule: EspnScheduleItem[],
  completedWeeks: number,
  settings?: EspnSettings
) => {
  let total = 0;

  for (let week = 1; week <= completedWeeks; week += 1) {
    const matchup = schedule.find(
      (item) =>
        item.matchupPeriodId === week &&
        (item.home?.teamId === rosterId || item.away?.teamId === rosterId)
    );

    const side =
      matchup?.home?.teamId === rosterId
        ? matchup.home
        : matchup?.away?.teamId === rosterId
          ? matchup.away
          : null;

    if (!side) continue;

    total += getOptimalLineupPoints(
      side.rosterForCurrentScoringPeriod?.entries ?? [],
      settings
    );
  }

  return Number(total.toFixed(2));
};

export const getEspnLeague = async (
  leagueId: string,
  season: string
): Promise<LeagueOriginal> => {
  const league = await fetchEspnLeague(leagueId, season);

  if (!league) {
    return normalizeLeagueOriginal({
      provider: "espn",
      leagueKey: buildLeagueKey("espn", ""),
      name: "",
      regularSeasonLength: 0,
      medianScoring: 0,
      totalRosters: 0,
      season: "",
      seasonType: "",
      leagueId: "",
      leagueWinner: null,
      previousLeagueId: null,
      lastScoredWeek: 0,
      status: "",
      scoringType: 1,
      rosterPositions: [],
      playoffTeams: 0,
      playoffType: 0,
      draftId: "",
      waiverType: 0,
      sport: "",
    });
  }

  const settings = league.settings;
  const currentSeason = Number(season);
  const currentYear = new Date().getFullYear();
  const regularSeasonLength = settings?.scheduleSettings?.matchupPeriodCount ?? 14;
  const currentWeek = league.status?.currentMatchupPeriod ?? 1;
  const status =
    currentSeason < currentYear
      ? "complete"
      : currentWeek <= 1
        ? "pre_season"
        : currentWeek <= regularSeasonLength + 1
          ? "in_season"
          : "complete";
  const completedWeeks =
    status === "complete"
      ? regularSeasonLength
      : Math.max(
          0,
          Math.min(
            league.status?.latestScoringPeriod ?? currentWeek - 1,
            regularSeasonLength
          )
        );

  return normalizeLeagueOriginal({
    provider: "espn",
    leagueKey: buildLeagueKey("espn", leagueId),
    name: settings?.name ?? "",
    regularSeasonLength,
    medianScoring: 0,
    totalRosters: settings?.size ?? league.teams?.length ?? 0,
    season: String(league.seasonId ?? season),
    seasonType: "Redraft",
    leagueId: String(league.id ?? leagueId),
    leagueWinner: null,
    previousLeagueId: null,
    lastScoredWeek: completedWeeks,
    status,
    scoringType: getScoringType(settings),
    rosterPositions: getRosterPositions(settings),
    playoffTeams: settings?.scheduleSettings?.playoffTeamCount ?? 0,
    playoffType: 0,
    draftId: "",
    waiverType: 0,
    sport: "nfl",
  });
};

export const getEspnLeagueBundle = async (
  leagueId: string,
  season: string
) => {
  const [leagueInfo, league] = await Promise.all([
    getEspnLeague(leagueId, season),
    fetchEspnLeague(leagueId, season),
  ]);

  if (!league || !leagueInfo.name) {
    throw new Error("Invalid ESPN league");
  }

  const members = new Map((league.members ?? []).map((member) => [member.id ?? "", member]));
  const teams = league.teams ?? [];
  const schedule = league.schedule ?? [];
  const completedWeeks = leagueInfo.lastScoredWeek;

  const users: UserType[] = teams.map((team) => {
    const ownerId = getTeamOwnerId(team);
    const member = members.get(ownerId);
    const displayName =
      member?.displayName ??
      [member?.firstName, member?.lastName].filter(Boolean).join(" ") ??
      buildTeamName(team);

    return {
      id: ownerId,
      avatar: team.logo ?? "",
      avatarImg: team.logo ?? undefined,
      name: buildTeamName(team),
      username: displayName,
    };
  });

  const rosters: RosterType[] = teams.map((team) => {
    const rosterId = team.id ?? 0;
    const overallRecord = team.record?.overall;
    const players =
      team.roster?.entries?.map((entry) =>
        String(entry.playerPoolEntry?.player?.id ?? "")
      ) ?? [];
    const pointsFor = overallRecord?.pointsFor ?? team.points ?? 0;
    const potentialPoints = getSeasonPotentialPoints(
      rosterId,
      schedule,
      completedWeeks,
      league.settings
    );

    return {
      id: getTeamOwnerId(team),
      pointsFor,
      pointsAgainst: overallRecord?.pointsAgainst ?? 0,
      potentialPoints: potentialPoints || pointsFor,
      managerEfficiency:
        potentialPoints > 0 ? Number((pointsFor / potentialPoints).toFixed(3)) : 0,
      wins: overallRecord?.wins ?? 0,
      losses: overallRecord?.losses ?? 0,
      ties: overallRecord?.ties ?? 0,
      rosterId,
      recordByWeek: buildRecordByWeek(
        rosterId,
        schedule,
        completedWeeks
      ),
      players: players.filter(Boolean),
    };
  });

  const weeklyPoints = buildWeeklyPoints(
    teams,
    schedule,
    completedWeeks
  );

  return {
    ...leagueInfo,
    users,
    rosters,
    weeklyPoints,
    winnersBracket: [],
    losersBracket: [],
    transactions: {},
    trades: [],
    waivers: [],
    previousLeagues: [],
    currentWeek: league.status?.currentMatchupPeriod ?? 0,
    lastUpdated: Date.now(),
  };
};
