import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useStore } from "../src/store/store.ts";

const createStorageMock = () => {
  const storage = new Map();
  return {
    getItem: vi.fn((key) => (storage.has(key) ? storage.get(key) : null)),
    setItem: vi.fn((key, value) => storage.set(key, String(value))),
    removeItem: vi.fn((key) => storage.delete(key)),
    clear: vi.fn(() => storage.clear()),
    key: vi.fn((index) => Array.from(storage.keys())[index] ?? null),
    get length() {
      return storage.size;
    },
  };
};

const buildLeague = (leagueId) => ({
  provider: "sleeper",
  leagueKey: `sleeper:${leagueId}`,
  name: "League",
  regularSeasonLength: 14,
  medianScoring: 0,
  totalRosters: 2,
  season: "2025",
  seasonType: "Redraft",
  leagueId,
  leagueWinner: null,
  legacyWinner: 0,
  lastUpdated: 0,
  previousLeagueId: null,
  lastScoredWeek: 14,
  winnersBracket: [],
  losersBracket: [],
  users: [
    {
      id: "u1",
      avatar: "",
      name: "Manager One",
      username: "manager1",
    },
  ],
  rosters: [
    {
      id: "u1",
      pointsFor: 100,
      pointsAgainst: 90,
      potentialPoints: 110,
      managerEfficiency: 0.91,
      wins: 1,
      losses: 0,
      ties: 0,
      rosterId: 1,
      recordByWeek: "W",
      players: ["p1"],
    },
    {
      id: "u2",
      pointsFor: 90,
      pointsAgainst: 100,
      potentialPoints: 105,
      managerEfficiency: 0.86,
      wins: 0,
      losses: 1,
      ties: 0,
      rosterId: 2,
      recordByWeek: "L",
      players: ["p2"],
    },
  ],
  weeklyPoints: [],
  transactions: {},
  trades: [],
  waivers: [],
  previousLeagues: [],
  status: "in_season",
  currentWeek: 1,
  scoringType: 1,
  rosterPositions: ["QB"],
  playoffTeams: 4,
  playoffType: 1,
  draftId: "draft-1",
  waiverType: 2,
  sport: "nfl",
});

beforeEach(() => {
  setActivePinia(createPinia());
  Object.defineProperty(globalThis, "localStorage", {
    value: createStorageMock(),
    configurable: true,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("main store", () => {
  test("updateLeagueInfo does not add duplicate league keys", () => {
    const store = useStore();
    const league = buildLeague("league-1");

    store.updateLeagueInfo(league);
    store.updateLeagueInfo({ ...league, name: "Duplicate Name" });

    expect(store.leagueInfo).toHaveLength(1);
    expect(store.leagueInfo[0].name).toBe("League");
  });

  test("updateCurrentLeagueId stores provider-aware identity", () => {
    const store = useStore();
    store.updateLeagueInfo(buildLeague("league-1"));

    store.updateCurrentLeagueId("league-1");

    expect(store.currentLeagueKey).toBe("sleeper:league-1");
    expect(store.currentLeagueId).toBe("league-1");
    expect(store.currentLeagueProvider).toBe("sleeper");
  });

  test("active league getters resolve from league key before league data is loaded", () => {
    const store = useStore();

    store.updateCurrentLeagueId("league-1", "sleeper");

    expect(store.currentLeagueKey).toBe("sleeper:league-1");
    expect(store.currentLeagueId).toBe("league-1");
    expect(store.currentLeagueProvider).toBe("sleeper");
  });

  test("addProjectionData updates only the targeted roster", () => {
    const store = useStore();
    store.updateLeagueInfo(buildLeague("league-1"));

    store.addProjectionData(0, "u2", [{ projection: 22.4, position: "RB" }]);

    const league = store.leagueInfo[0];
    const roster1 = league.rosters.find((r) => r.id === "u1");
    const roster2 = league.rosters.find((r) => r.id === "u2");

    expect(roster1?.projections).toBeUndefined();
    expect(roster2?.projections).toEqual([{ projection: 22.4, position: "RB" }]);
  });
});
