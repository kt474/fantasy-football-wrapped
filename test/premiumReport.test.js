import { describe, expect, test } from "vitest";
import { addPremiumReportTeamAvatars } from "../src/lib/premiumReport.ts";

const report = {
  frontPage: { headline: "Headline", subheadline: "Subheadline", lead: "Lead" },
  matchupReports: [
    { matchupNumber: 1, bracket: "regular", headline: "Game", recap: "Recap" },
  ],
  teamOfTheWeek: {
    teamName: "Alpha Team",
    pointsScored: 140,
    headline: "Big week",
    analysis: "Strong lineup.",
  },
  weeklyLowlights: {
    headline: "Weekly Lowlights",
    entries: [
      {
        teamName: "beta_user",
        category: "weekly_low",
        headline: "Rough week",
        analysis: "Nothing worked.",
      },
    ],
  },
};

const tableData = [
  {
    name: "Alpha Team",
    username: "alpha_user",
    avatarImg: "alpha.png",
    points: [140],
    matchups: [7],
  },
  {
    name: "Beta Team",
    username: "beta_user",
    avatarImg: "beta.png",
    points: [95],
    matchups: [7],
  },
];

describe("premium report team avatars", () => {
  test("adds matchup and named-section avatars from weekly team data", () => {
    const enriched = addPremiumReportTeamAvatars({
      report,
      tableData,
      weekIndex: 0,
      showUsernames: false,
    });

    expect(enriched.matchupReports[0].teams).toEqual([
      { teamName: "Alpha Team", avatarUrl: "alpha.png" },
      { teamName: "Beta Team", avatarUrl: "beta.png" },
    ]);
    expect(enriched.teamOfTheWeek.avatarUrl).toBe("alpha.png");
    expect(enriched.weeklyLowlights.entries[0].avatarUrl).toBe("beta.png");
    expect(report.matchupReports[0].teams).toBeUndefined();
  });
});
