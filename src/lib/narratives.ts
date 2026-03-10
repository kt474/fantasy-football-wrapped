import { LeagueInfoType, PointsType } from "../types/types";
import { WeeklyWaiver, WaiverStatus, WaiverType } from "../types/apiTypes";

export type HistoricalSeasonInput = Pick<
  LeagueInfoType,
  | "season"
  | "leagueId"
  | "leagueWinner"
  | "rosters"
  | "weeklyPoints"
  | "users"
  | "trades"
  | "waivers"
>;

export type ManagerSeasonRecord = {
  userId: string;
  rosterId: number;
  season: string;
  name: string;
  username: string;
  avatarImg?: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  managerEfficiency: number;
  weeklyScores: number[];
  matchupIds: (number | null)[];
  tradeCount: number;
  waiverCount: number;
  isChampion: boolean;
  placement?: number;
};

export type LeagueDNA = {
  sample: {
    seasonsAnalyzed: number;
    distinctManagers: number;
    averageTeamsPerSeason: number;
  };
  parity: {
    uniqueChampions: number;
    championDiversityIndex: number;
    titlesByManager: Record<string, number>;
    championships: {
      season: string;
      winner: string;
    }[];
  };
  activity: {
    totalTrades: number;
    totalWaivers: number;
    avgTradesPerSeason: number;
    avgWaiversPerSeason: number;
    avgTradesPerTeamSeason: number;
    avgWaiversPerTeamSeason: number;
  };
  scoring: {
    averageWeeklyScore: number;
    weeklyScoreStdDev: number;
    highestWeeklyScore: number;
    lowestWeeklyScore: number;
  };
  volatility: {
    averageWeeklyMargin: number;
    closeGameRate: number;
    blowoutRate: number;
  };
};

export type ManagerArchetype = {
  userId: string;
  displayName: string;
  avatarImg?: string;
  seasons: number;
  titles: number;
  totalWins: number;
  totalLosses: number;
  totalTies: number;
  totalPointsFor: number;
  totalPointsAgainst: number;
  totalTrades: number;
  totalWaivers: number;
  averageEfficiency: number;
  averagePointsPerSeason: number;
  averageTradesPerSeason: number;
  averageWaiversPerSeason: number;
  winRate: number;
  weeklyScoreStdDev: number;
};

export type RivalryProfile = {
  manager1Id: string;
  manager2Id: string;
  manager1Name: string;
  manager2Name: string;
  manager1Avatar?: string;
  manager2Avatar?: string;
  gamesPlayed: number;
  manager1Wins: number;
  manager2Wins: number;
  ties: number;
  avgMargin: number;
  closeGames: number;
  blowouts: number;
  score: number;
  closeGameRate: number;
  matchupHistory: {
    season: string;
    week: number;
    winnerId: string | null;
    winnerName: string | null;
    margin: number;
    manager1Points: number;
    manager2Points: number;
  }[];
};

export type NarrativeBundle = {
  managerSeasons: ManagerSeasonRecord[];
  leagueDNA: LeagueDNA;
  managerArchetypes: ManagerArchetype[];
  rivalries: RivalryProfile[];
};

type ManagerAggregate = {
  userId: string;
  displayName: string;
  avatarImg?: string;
  seasons: number;
  titles: number;
  totalWins: number;
  totalLosses: number;
  totalTies: number;
  totalPointsFor: number;
  totalPointsAgainst: number;
  totalTrades: number;
  totalWaivers: number;
  avgEfficiency: number;
  scoreVariance: number;
};

type MatchupRecord = {
  season: string;
  rosterId: number;
  managerId: string;
  managerName: string;
  avatarImg?: string;
  matchupId: number;
  week: number;
  points: number;
};

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

const average = (values: number[]) => {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const stdDev = (values: number[]) => {
  if (values.length <= 1) return 0;
  const mean = average(values);
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
};

const countTransactionsForManager = (
  transactions: WeeklyWaiver[],
  userId: string,
  rosterId: number,
  type: "trade" | "waiver"
) => {
  return transactions.filter((transaction) => {
    if (transaction.status !== WaiverStatus.Complete) {
      return false;
    }

    if (type === "trade" && transaction.type !== WaiverType.Trade) {
      return false;
    }

    if (
      type === "waiver" &&
      transaction.type !== WaiverType.Waiver &&
      transaction.type !== WaiverType.FreeAgent
    ) {
      return false;
    }

    return (
      transaction.creator === userId ||
      transaction.roster_ids.includes(rosterId) ||
      transaction.consenter_ids.includes(rosterId)
    );
  }).length;
};

const getChampionRosterId = (season: HistoricalSeasonInput) => {
  if (!season.leagueWinner) return null;
  const parsed = Number(season.leagueWinner);
  return Number.isNaN(parsed) ? null : parsed;
};

const buildSeasonRecords = (
  season: HistoricalSeasonInput
): ManagerSeasonRecord[] => {
  const championRosterId = getChampionRosterId(season);
  const records: ManagerSeasonRecord[] = [];

  season.rosters.forEach((roster) => {
    const user = season.users.find((candidate) => candidate.id === roster.id);
    const points = season.weeklyPoints.find(
      (weeklyEntry) => weeklyEntry.rosterId === roster.rosterId
    );

    if (!user || !points) {
      return;
    }

    records.push({
      userId: user.id,
      rosterId: roster.rosterId,
      season: season.season,
      name: user.name,
      username: user.username,
      avatarImg: user.avatarImg,
      wins: roster.wins,
      losses: roster.losses,
      ties: roster.ties,
      pointsFor: roster.pointsFor,
      pointsAgainst: roster.pointsAgainst,
      managerEfficiency: roster.managerEfficiency,
      weeklyScores: points.points,
      matchupIds: points.matchups ?? [],
      tradeCount: countTransactionsForManager(
        season.trades,
        user.id,
        roster.rosterId,
        "trade"
      ),
      waiverCount: countTransactionsForManager(
        season.waivers,
        user.id,
        roster.rosterId,
        "waiver"
      ),
      isChampion: championRosterId === roster.rosterId,
      placement: user.placement,
    });
  });

  return records;
};

const aggregateManagers = (records: ManagerSeasonRecord[]) => {
  const map = new Map<string, ManagerAggregate>();

  records.forEach((record) => {
    const existing = map.get(record.userId);
    const weeklyVariance = stdDev(record.weeklyScores);

    if (!existing) {
      map.set(record.userId, {
        userId: record.userId,
        displayName: record.username || record.name,
        avatarImg: record.avatarImg,
        seasons: 1,
        titles: record.isChampion ? 1 : 0,
        totalWins: record.wins,
        totalLosses: record.losses,
        totalTies: record.ties,
        totalPointsFor: record.pointsFor,
        totalPointsAgainst: record.pointsAgainst,
        totalTrades: record.tradeCount,
        totalWaivers: record.waiverCount,
        avgEfficiency: record.managerEfficiency,
        scoreVariance: weeklyVariance,
      });
      return;
    }

    const totalSeasons = existing.seasons + 1;
    existing.seasons = totalSeasons;
    existing.titles += record.isChampion ? 1 : 0;
    existing.totalWins += record.wins;
    existing.totalLosses += record.losses;
    existing.totalTies += record.ties;
    existing.totalPointsFor += record.pointsFor;
    existing.totalPointsAgainst += record.pointsAgainst;
    existing.totalTrades += record.tradeCount;
    existing.totalWaivers += record.waiverCount;
    existing.avgEfficiency =
      (existing.avgEfficiency * (totalSeasons - 1) + record.managerEfficiency) /
      totalSeasons;
    existing.scoreVariance =
      (existing.scoreVariance * (totalSeasons - 1) + weeklyVariance) /
      totalSeasons;
  });

  return Array.from(map.values());
};

const buildLeagueDNA = (
  seasons: HistoricalSeasonInput[],
  managerAggregates: ManagerAggregate[]
): LeagueDNA => {
  const seasonCount = seasons.length;
  const rosterCounts = seasons.map((season) => season.rosters.length);
  const titlesByManager = seasons.reduce(
    (accumulator, season) => {
      const winnerRosterId = getChampionRosterId(season);
      if (winnerRosterId === null) {
        return accumulator;
      }

      const winnerRoster = season.rosters.find(
        (roster) => roster.rosterId === winnerRosterId
      );
      const winnerUser = winnerRoster
        ? season.users.find((user) => user.id === winnerRoster.id)
        : null;
      const winnerName = winnerUser
        ? winnerUser.username || winnerUser.name
        : `Roster ${winnerRosterId}`;

      accumulator[winnerName] = (accumulator[winnerName] ?? 0) + 1;
      return accumulator;
    },
    {} as Record<string, number>
  );
  const championships = seasons
    .map((season) => {
      const winnerRosterId = getChampionRosterId(season);
      if (winnerRosterId === null) {
        return null;
      }

      const winnerRoster = season.rosters.find(
        (roster) => roster.rosterId === winnerRosterId
      );
      const winnerUser = winnerRoster
        ? season.users.find((user) => user.id === winnerRoster.id)
        : null;

      return {
        season: season.season,
        winner: winnerUser
          ? winnerUser.username || winnerUser.name
          : `Roster ${winnerRosterId}`,
      };
    })
    .filter(
      (
        championship
      ): championship is {
        season: string;
        winner: string;
      } => Boolean(championship)
    )
    .sort((left, right) => Number(right.season) - Number(left.season));
  const uniqueChampions = Object.keys(titlesByManager).length;
  const championDiversity = seasonCount ? uniqueChampions / seasonCount : 0;

  const tradesPerSeason = seasons.map(
    (season) =>
      season.trades.filter(
        (trade) =>
          trade.status === WaiverStatus.Complete &&
          trade.type === WaiverType.Trade
      ).length
  );
  const waiversPerTeamSeason = seasons.map((season, index) => {
    const waiverCount = season.waivers.filter(
      (waiver) =>
        waiver.status === WaiverStatus.Complete &&
        (waiver.type === WaiverType.Waiver ||
          waiver.type === WaiverType.FreeAgent)
    ).length;
    return rosterCounts[index] ? waiverCount / rosterCounts[index] : 0;
  });
  const waiversPerSeason = seasons.map(
    (season) =>
      season.waivers.filter(
        (waiver) =>
          waiver.status === WaiverStatus.Complete &&
          (waiver.type === WaiverType.Waiver ||
            waiver.type === WaiverType.FreeAgent)
      ).length
  );

  const scoringSamples = seasons.flatMap((season) =>
    season.weeklyPoints.flatMap((pointsEntry) => pointsEntry.points)
  );
  const scoringAverage = average(scoringSamples);
  const scoringDeviation = stdDev(scoringSamples);
  const avgTradesPerSeason = average(tradesPerSeason);
  const avgWaiversPerSeason = average(waiversPerSeason);
  const avgWaiversPerTeamSeason = average(waiversPerTeamSeason);
  const avgTradesPerTeamSeason = average(
    tradesPerSeason.map((tradeCount, index) =>
      rosterCounts[index] ? tradeCount / rosterCounts[index] : 0
    )
  );

  const allMargins = seasons.flatMap((season) => {
    const seasonRecords = buildSeasonRecords(season);
    const matchupRecords = buildMatchupRecords(season, seasonRecords);
    const matchupGroups = new Map<string, MatchupRecord[]>();

    matchupRecords.forEach((record) => {
      const key = `${record.season}-${record.week}-${record.matchupId}`;
      const existing = matchupGroups.get(key) ?? [];
      existing.push(record);
      matchupGroups.set(key, existing);
    });

    return Array.from(matchupGroups.values())
      .filter((records) => records.length === 2)
      .map((records) => Math.abs(records[0].points - records[1].points));
  });

  return {
    sample: {
      seasonsAnalyzed: seasonCount,
      distinctManagers: managerAggregates.length,
      averageTeamsPerSeason: average(rosterCounts),
    },
    parity: {
      uniqueChampions,
      championDiversityIndex: clamp(championDiversity),
      titlesByManager,
      championships,
    },
    activity: {
      totalTrades: tradesPerSeason.reduce((sum, count) => sum + count, 0),
      totalWaivers: waiversPerSeason.reduce((sum, count) => sum + count, 0),
      avgTradesPerSeason,
      avgWaiversPerSeason,
      avgTradesPerTeamSeason,
      avgWaiversPerTeamSeason,
    },
    scoring: {
      averageWeeklyScore: scoringAverage,
      weeklyScoreStdDev: scoringDeviation,
      highestWeeklyScore: scoringSamples.length
        ? Math.max(...scoringSamples)
        : 0,
      lowestWeeklyScore: scoringSamples.length
        ? Math.min(...scoringSamples)
        : 0,
    },
    volatility: {
      averageWeeklyMargin: average(allMargins),
      closeGameRate: allMargins.length
        ? allMargins.filter((margin) => margin <= 10).length / allMargins.length
        : 0,
      blowoutRate: allMargins.length
        ? allMargins.filter((margin) => margin >= 25).length / allMargins.length
        : 0,
    },
  };
};

const buildManagerArchetypes = (records: ManagerSeasonRecord[]) => {
  const aggregates = aggregateManagers(records);

  return aggregates
    .map((manager) => {
      const averagePointsPerSeason = manager.totalPointsFor / manager.seasons;
      const averageTradesPerSeason = manager.totalTrades / manager.seasons;
      const averageWaiversPerSeason = manager.totalWaivers / manager.seasons;
      const winRate =
        (manager.totalWins + manager.totalTies * 0.5) /
        Math.max(
          1,
          manager.totalWins + manager.totalLosses + manager.totalTies
        );

      return {
        userId: manager.userId,
        displayName: manager.displayName,
        avatarImg: manager.avatarImg,
        seasons: manager.seasons,
        titles: manager.titles,
        totalWins: manager.totalWins,
        totalLosses: manager.totalLosses,
        totalTies: manager.totalTies,
        totalPointsFor: manager.totalPointsFor,
        totalPointsAgainst: manager.totalPointsAgainst,
        totalTrades: manager.totalTrades,
        totalWaivers: manager.totalWaivers,
        averageEfficiency: manager.avgEfficiency,
        averagePointsPerSeason,
        averageTradesPerSeason,
        averageWaiversPerSeason,
        winRate,
        weeklyScoreStdDev: manager.scoreVariance,
      } satisfies ManagerArchetype;
    })
    .sort((left, right) => {
      if (right.titles !== left.titles) {
        return right.titles - left.titles;
      }
      return right.winRate - left.winRate;
    });
};

const buildMatchupRecords = (
  season: HistoricalSeasonInput,
  seasonRecords: ManagerSeasonRecord[]
) => {
  const rosterMap = new Map<number, ManagerSeasonRecord>(
    seasonRecords.map((record) => [record.rosterId, record])
  );
  const matchups: MatchupRecord[] = [];

  season.weeklyPoints.forEach((entry: PointsType) => {
    const manager = rosterMap.get(entry.rosterId);
    if (!manager || !entry.matchups) {
      return;
    }

    entry.matchups.forEach((matchupId, weekIndex) => {
      if (matchupId === null || matchupId === undefined) {
        return;
      }

      matchups.push({
        season: season.season,
        rosterId: entry.rosterId,
        managerId: manager.userId,
        managerName: manager.username || manager.name,
        avatarImg: manager.avatarImg,
        matchupId,
        week: weekIndex + 1,
        points: entry.points[weekIndex] ?? 0,
      });
    });
  });

  return matchups;
};

const buildRivalries = (
  seasons: HistoricalSeasonInput[],
  managerSeasons: ManagerSeasonRecord[]
) => {
  const rivalryMap = new Map<string, RivalryProfile>();
  +seasons.forEach((season) => {
    const seasonRecords = managerSeasons.filter(
      (record) => record.season === season.season
    );
    const matchupRecords = buildMatchupRecords(season, seasonRecords);
    const matchupGroups = new Map<string, MatchupRecord[]>();

    matchupRecords.forEach((record) => {
      const key = `${record.season}-${record.week}-${record.matchupId}`;
      const existing = matchupGroups.get(key) ?? [];
      existing.push(record);
      matchupGroups.set(key, existing);
    });

    matchupGroups.forEach((records) => {
      if (records.length !== 2) {
        return;
      }

      const [left, right] = records.sort((a, b) =>
        a.managerId.localeCompare(b.managerId)
      );
      const rivalryKey = `${left.managerId}-${right.managerId}`;
      const margin = Math.abs(left.points - right.points);
      const existing = rivalryMap.get(rivalryKey) ?? {
        manager1Id: left.managerId,
        manager2Id: right.managerId,
        manager1Name: left.managerName,
        manager2Name: right.managerName,
        manager1Avatar: left.avatarImg,
        manager2Avatar: right.avatarImg,
        gamesPlayed: 0,
        manager1Wins: 0,
        manager2Wins: 0,
        ties: 0,
        avgMargin: 0,
        closeGames: 0,
        blowouts: 0,
        score: 0,
        closeGameRate: 0,
        matchupHistory: [],
      };

      existing.gamesPlayed += 1;
      existing.avgMargin += margin;
      if (margin <= 10) {
        existing.closeGames += 1;
      }
      if (margin >= 25) {
        existing.blowouts += 1;
      }

      let winnerId: string | null = null;
      let winnerName: string | null = null;
      if (left.points > right.points) {
        existing.manager1Wins += 1;
        winnerId = left.managerId;
        winnerName = left.managerName;
      } else if (right.points > left.points) {
        existing.manager2Wins += 1;
        winnerId = right.managerId;
        winnerName = right.managerName;
      } else {
        existing.ties += 1;
      }

      existing.matchupHistory.push({
        season: left.season,
        week: left.week,
        winnerId,
        winnerName,
        margin,
        manager1Points: left.points,
        manager2Points: right.points,
      });

      rivalryMap.set(rivalryKey, existing);
    });
  });

  return Array.from(rivalryMap.values())
    .map((rivalry) => {
      const avgMargin = rivalry.gamesPlayed
        ? rivalry.avgMargin / rivalry.gamesPlayed
        : 0;
      const balanceBonus = Math.min(rivalry.manager1Wins, rivalry.manager2Wins);
      const score =
        rivalry.gamesPlayed * 2 + balanceBonus * 3 + rivalry.closeGames * 2;

      return {
        ...rivalry,
        avgMargin,
        score,
        closeGameRate: rivalry.gamesPlayed
          ? rivalry.closeGames / rivalry.gamesPlayed
          : 0,
      } satisfies RivalryProfile;
    })
    .filter((rivalry) => rivalry.gamesPlayed >= 2)
    .sort((left, right) => right.score - left.score);
};

export const normalizeHistoricalSeasons = (
  currentLeague?: LeagueInfoType
): HistoricalSeasonInput[] => {
  if (!currentLeague) {
    return [];
  }

  const seasons = [currentLeague, ...(currentLeague.previousLeagues ?? [])];

  return seasons.map((season) => ({
    season: season.season,
    leagueId: season.leagueId,
    leagueWinner:
      season.leagueWinner !== null && season.leagueWinner !== undefined
        ? String(season.leagueWinner)
        : season.legacyWinner !== null && season.legacyWinner !== undefined
          ? String(season.legacyWinner)
          : null,
    rosters: season.rosters,
    weeklyPoints: season.weeklyPoints,
    users: season.users,
    trades: season.trades,
    waivers: season.waivers,
  }));
};

export const buildNarrativeBundle = (
  seasons: HistoricalSeasonInput[]
): NarrativeBundle => {
  const managerSeasons = seasons.flatMap((season) =>
    buildSeasonRecords(season)
  );
  const managerAggregates = aggregateManagers(managerSeasons);

  return {
    managerSeasons,
    leagueDNA: buildLeagueDNA(seasons, managerAggregates),
    managerArchetypes: buildManagerArchetypes(managerSeasons),
    rivalries: buildRivalries(seasons, managerSeasons),
  };
};
