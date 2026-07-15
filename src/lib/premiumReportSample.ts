import type { PremiumReport } from "@/types/types";

export const premiumReportPreview: PremiumReport = {
  frontPage: {
    headline: "One Escape, Two Blunders, and a New League Villain",
    subheadline:
      "Breece's Puffs survives by 3.8 while Lamario Kart leaves 11.4 winning points on the bench.",
    lead: "Week 8 turned on narrow margins. The league's closest matchup reshaped the playoff race, the highest-scoring lineup separated itself from the field, and one missed bench swap was large enough to reverse a result. Here is what mattered, why it mattered, and who will be hearing about it in the group chat.",
  },
  matchupReports: [
    {
      matchupNumber: 1,
      bracket: "winners",
      headline: "A 3.8-Point Escape Changes the Playoff Race",
      recap:
        "Breece's Puffs edged Goal Line Stand 132.60 to 128.80 in the week's closest matchup. The win moved Breece's Puffs up two places while Goal Line Stand fell outside the final playoff position on the points-for tiebreaker.",
    },
  ],
  teamOfTheWeek: {
    teamName: "Bijan Mustard",
    pointsScored: 156.42,
    headline: "The lineup that could not miss",
    analysis:
      "Bijan Mustard posted the week's highest score with four starters above 20 points and 94% lineup efficiency. The performance finished 18.36 points above the league average and extended the team's winning streak to three.",
  },
  weeklyLowlights: {
    headline: "Weekly Lowlights",
    entries: [
      {
        teamName: "Lamario Kart",
        category: "bench_burn",
        headline: "The winning points watched from the bench",
        analysis:
          "Lamario Kart lost by 3.20 after a legal bench replacement outscored the selected starter by 11.40. The best available swap was more than enough to change the result.",
      },
    ],
  },
};
