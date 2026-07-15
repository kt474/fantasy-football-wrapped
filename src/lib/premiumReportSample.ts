import type { PremiumReport } from "@/types/types";

export const premiumReportPreview: PremiumReport = {
  frontPage: {
    headline: "A Trapdoor Has Opened at the Playoff Line",
    subheadline:
      "Breece's Puffs escaped onto the cutoff, Bijan Mustard buried the field, and Lamario Kart benched the points that would have won the week.",
    lead: "Week 8 turned the playoff race into a revolving door. Breece's Puffs escaped the closest matchup by 3.8 and jumped onto the final playoff spot, while Bijan Mustard dropped 156.42 to separate from the field. The real pain belonged to Lamario Kart, who lost by 3.2 with an 11.4-point winning swap sitting on the bench like a receipt nobody wanted to read. Add a 71.26-point weekly low from Fourth and Long, and the standings were not the only thing getting rearranged. The league chat now has material for days.",
  },
  matchupReports: [
    {
      matchupNumber: 1,
      bracket: "regular",
      headline: "Breece's Puffs Survived the Week's Most Expensive 3.8 Points",
      recap:
        "Breece's Puffs did not dominate so much as survive a 132.60 to 128.80 stress test. Ja'Marr Chase supplied 28.4 points, and the escape pushed Breece's Puffs up two places into sixth, directly onto the playoff cutoff. Goal Line Stand posted the week's third-highest score and still got nothing but a loss and a worse view of the standings. That is fantasy football's favorite customer-service policy: excellent effort, no refund.",
    },
    {
      matchupNumber: 2,
      bracket: "regular",
      headline: "Bijan Mustard Turned a Matchup Into a Warning Label",
      recap:
        "Bijan Mustard detonated for 156.42 and beat CeeDeez Nuts by 55.24, the kind of margin that makes the Monday stat corrections feel purely decorative. Josh Allen opened the runway with 31.8, and Bijan Robinson added 27.6 while the rest of the lineup refused to supply a weak spot. The win extended the streak to three and moved Bijan Mustard into third. This was not just a weekly high. It was a contender announcing that the polite part of the schedule is over.",
    },
  ],
  teamOfTheWeek: {
    teamName: "Bijan Mustard",
    pointsScored: 156.42,
    headline: "The Whole Lineup Chose Violence",
    analysis:
      "Four starters cleared 20 points, the lineup finished at 94 percent efficiency, and the final total landed 18.36 above the league average. More important, the production came from every corner of the roster instead of one superhero dragging seven passengers. With three straight wins and third place now secured, Bijan Mustard looks less like a hot team and more like the matchup nobody wants waiting in November.",
  },
  weeklyLowlights: {
    headline: "Weekly Lowlights: The Regret Department Is Open",
    entries: [
      {
        teamName: "Fourth and Long",
        category: "weekly_low",
        headline: "From 121.08 to 71.26, a Disappearing Act With No Applause",
        analysis:
          "Fourth and Long followed last week's 121.08 with the lowest score in the league and no starter above 13.5 points. There was no single villain to blame, which somehow made it worse. The entire lineup clocked in, stared at the scoreboard, and quietly took the afternoon off. A playoff hopeful can survive one bad result. A weekly total this empty leaves a crater.",
      },
      {
        teamName: "Lamario Kart",
        category: "bench_burn",
        headline:
          "The Winning Lineup Was Available, Just Apparently Too Obvious",
        analysis:
          "Lamario Kart lost 109.34 to 106.14 while Terry McLaurin's 19.6 points watched from the bench and D.J. Moore supplied 8.2 in the starting lineup. The legal swap was worth 11.4, more than enough to reverse the result. This was not harmless bench regret or hindsight theater. The winning points were present, eligible, and denied entry at the door.",
      },
    ],
  },
};
