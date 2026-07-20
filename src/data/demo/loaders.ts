export const loadDemoLeague = () => import("./league");
export const loadDemoWeeklyReport = () => import("./weekly-report");
export const loadDemoCurrentTrends = () => import("./current-trends");
export const loadDemoRosterManagement = () => import("./roster-management");
export const loadDemoPlayoffs = () => import("./playoffs");
export const loadDemoProjections = () => import("./projections");
export const loadDemoStartSit = () => import("./start-sit");
export const loadDemoManagerProfiles = () => import("./manager-profiles");
export const loadDemoDraft = () => import("./draft");
export const loadDemoDraftGrades = () => import("./draft-grades");
export const loadDemoPlayerRankings = () => import("./player-rankings");
export const loadDemoRosterRankings = () => import("./roster-rankings");

export type DemoLeagueFixtures = Awaited<ReturnType<typeof loadDemoLeague>>;
export type DemoRosterManagementFixtures = Awaited<
  ReturnType<typeof loadDemoRosterManagement>
>;
export type DemoPlayoffFixtures = Awaited<ReturnType<typeof loadDemoPlayoffs>>;
export type DemoWeeklyReportFixtures = Awaited<
  ReturnType<typeof loadDemoWeeklyReport>
>;
