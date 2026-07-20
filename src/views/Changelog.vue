<script setup lang="ts">
import PageContainer from "@/components/layout/PageContainer.vue";
import PageHeader from "@/components/layout/PageHeader.vue";
import { Badge, type BadgeVariants } from "@/components/ui/badge";

const badgeVariant = (type: string): BadgeVariants["variant"] => {
  if (type === "Feature") return "success";
  if (type === "Fix") return "destructive";
  return "info";
};
// this should eventually be moved to the server side
const data = [
  {
    date: "7/20/26",
    content: [
      {
        type: "Feature",
        text: [
          "There is a new draft tendencies component in the manager profiles tab that shows the history of how every manager drafts.",
        ],
      },
    ],
  },
  {
    date: "7/18/26",
    content: [
      {
        type: "Feature",
        text: [
          "Premium weekly reports can now be exported in a short form video format.",
        ],
      },
    ],
  },
  {
    date: "7/17/26",
    content: [
      {
        type: "Fix",
        text: [
          "Moved all league data from local storage to indexedDB. You can now save up to 10 leagues.",
        ],
      },
    ],
  },
  {
    date: "7/14/26",
    content: [
      {
        type: "Fix",
        text: [
          "Made a lot of optimizations so performance on mobile devices should be much better. Also fixed some bugs related to stale cached data.",
        ],
      },
    ],
  },
  {
    date: "7/13/26",
    content: [
      {
        type: "Feature",
        text: [
          "Added a new season forecast component that simulates a whole season based on projections.",
        ],
      },
    ],
  },
  {
    date: "7/09/26",
    content: [
      {
        type: "Update",
        text: [
          "Updated the league news section to give more valuable insights.",
        ],
      },
    ],
  },
  {
    date: "7/07/26",
    content: [
      {
        type: "Feature",
        text: ["The weekly reports now have an awards section."],
      },
    ],
  },
  {
    date: "7/06/26",
    content: [
      {
        type: "Feature",
        text: [
          "The start/sit tab now has a player adjustment/comparison to show player replacement options.",
        ],
      },
    ],
  },
  {
    date: "7/03/26",
    content: [
      {
        type: "Feature",
        text: [
          "There is new table in the league history tab that shows final placements across all seasons for every manager. There are also new all time records and awards.",
        ],
      },
    ],
  },
  {
    date: "6/29/26",
    content: [
      {
        type: "Feature",
        text: [
          "The manager comparisons have been moved to the manager profile tab. There are now also AI generated manager rivalry stories.",
        ],
      },
    ],
  },
  {
    date: "6/21/26",
    content: [
      {
        type: "Feature",
        text: [
          "There is now a trade database in the trade lab tab. All trades from ffwrapped leagues will be searchable.",
        ],
      },
    ],
  },
  {
    date: "6/18/26",
    content: [
      {
        type: "Update",
        text: [
          "The premium weekly reports are now much more detailed and displayed in a journalist/newspaper layout with different sections.",
        ],
      },
    ],
  },
  {
    date: "5/31/26",
    content: [
      {
        type: "Update",
        text: [
          "ESPN support is now in the beta phase! Please report any issues.",
        ],
      },
    ],
  },
  {
    date: "5/03/26",
    content: [
      {
        type: "Update",
        text: [
          "The AI-generated weekly matchup previews have been combined into one matchup forecast.",
        ],
      },
    ],
  },
  {
    date: "4/19/26",
    content: [
      {
        type: "Update",
        text: [
          "Users can now generate one manager profile without paying for Premium.",
        ],
      },
    ],
  },
  {
    date: "3/11/26",
    content: [
      {
        type: "Feature",
        text: [
          "There is a new Manager Profiles tab that has custom manager profile descriptions and historical trends.",
        ],
      },
    ],
  },
  {
    date: "3/09/26",
    content: [
      {
        type: "Feature",
        text: ["You can now download the weekly reports as shareable images."],
      },
    ],
  },
  {
    date: "3/04/26",
    content: [
      {
        type: "Feature",
        text: [
          "There is a new Trade Lab tool that allows you to brainstorm trades and evaluate fairness.",
        ],
      },
    ],
  },
  {
    date: "3/03/26",
    content: [
      {
        type: "Feature",
        text: [
          "There is a new Schedule Simulator tool that shows the impact of scheduling on the final standings.",
        ],
      },
    ],
  },
  {
    date: "3/02/26",
    content: [
      {
        type: "Feature",
        text: [
          "Users can now create an account with email/password or Google sign in. Accounts allow users to access Premium features.",
        ],
      },
    ],
  },
  {
    date: "2/20/26",
    content: [
      {
        type: "Update",
        text: [
          "Site has been completely redesigned to use a more user friendly side bar navigation.",
        ],
      },
    ],
  },
  {
    date: "12/30/25",
    content: [
      {
        type: "Feature",
        text: [
          "Added a new 'wrapped' tab for the Spotify Wrapped-style end of season recap.",
        ],
      },
    ],
  },
  {
    date: "12/10/25",
    content: [
      {
        type: "Fix",
        text: [
          "Fixed a bug in the schedule analysis where the best/worst possible records were not calculated correctly.",
        ],
      },
    ],
  },
  {
    date: "11/20/25",
    content: [
      {
        type: "Feature",
        text: [
          "The weekly preview section now has AI-generated matchup previews for each matchup.",
        ],
      },
    ],
  },
  {
    date: "11/18/25",
    content: [
      {
        type: "Feature",
        text: [
          "The schedule analysis section now shows the specific weeks teams were lucky/unlucky as well as the best/worst possible schedules for each team.",
        ],
      },
    ],
  },
  {
    date: "11/12/25",
    content: [
      {
        type: "Feature",
        text: [
          "In the 'Expected Wins' tab there is now a schedule analysis section. The goal of this component is to show which weeks were especially lucky/unlucky.",
        ],
      },
    ],
  },
  {
    date: "11/11/25",
    content: [
      {
        type: "Fix",
        text: [
          "Team names on the x-axis of charts should no longer randomly disappear.",
        ],
      },
    ],
  },
  {
    date: "11/09/25",
    content: [
      {
        type: "Feature",
        text: ["Added more player stats to the start/sit section."],
      },
    ],
  },
  {
    date: "11/01/25",
    content: [
      {
        type: "Feature",
        text: [
          "There is a new Start/Sit tab that shows player projections, past performances, and news fetched from Bluesky.",
        ],
      },
    ],
  },
  {
    date: "10/17/25",
    content: [
      {
        type: "Feature",
        text: [
          "The league history section now shows the all time closest matchups and biggest blowouts.",
        ],
      },
    ],
  },
  {
    date: "10/12/25",
    content: [
      {
        type: "Update",
        text: [
          "The league transactions chart has been updated to show the type of transaction: waiver claim, free agent, or trade.",
        ],
      },
    ],
  },
  {
    date: "10/04/25",
    content: [
      {
        type: "Feature",
        text: [
          "For leagues that play with FAAB waivers, total budget spent and failed bids are now shown in the waivers section.",
        ],
      },
    ],
  },
  {
    date: "10/03/25",
    content: [
      {
        type: "Update",
        text: [
          "Added player images to the roster previews, player rankings, and best adds sections.",
        ],
      },
    ],
  },
  {
    date: "9/27/25",
    content: [
      {
        type: "Update",
        text: [
          "The player rankings and waiver moves can now be all viewed at once instead of only selecting a single manager.",
        ],
      },
    ],
  },
  {
    date: "9/26/25",
    content: [
      {
        type: "Fix",
        text: [
          "Fixed an issue with the all time H2H table, managers that did not play in every year resulted in incorrect records.",
        ],
      },
    ],
  },
  {
    date: "9/24/25",
    content: [
      {
        type: "Feature",
        text: [
          "The weekly preview section now shows the best and worst possible placement outcomes after each matchup.",
          "Added projected record to the playoff odds section.",
        ],
      },
    ],
  },
  {
    date: "9/14/25",
    content: [
      {
        type: "Fix",
        text: [
          "All of the url logic has been refactored to use vue-router. This should fix issues with getting stuck on the loading screen.",
        ],
      },
    ],
  },
  {
    date: "9/10/25",
    content: [
      {
        type: "Feature",
        text: [
          "The power rankings tab now has a rosters section that shows ranking scores from every player on each team.",
        ],
      },
    ],
  },
  {
    date: "9/01/25",
    content: [
      {
        type: "Feature",
        text: [
          "The weekly report tab now has a weekly preview section that shows weekly matchup previews with projection data from Sleeper.",
        ],
      },
    ],
  },
  {
    date: "8/23/25",
    content: [
      {
        type: "Update",
        text: [
          "The weekly report section now shows top performers, bottom performers, and top benchwarmers.",
          "The power rankings now also include preseason rankings.",
        ],
      },
    ],
  },
  {
    date: "8/22/25",
    content: [
      {
        type: "Update",
        text: [
          "The league news section now works in the preseason, using data from the draft.",
        ],
      },
    ],
  },
  {
    date: "8/19/25",
    content: [
      {
        type: "Feature",
        text: [
          "Added draft grades to the 'Draft' tab. Grades are only based on player pick position, ADP, and projected points from Sleeper.",
        ],
      },
    ],
  },
  {
    date: "8/16/25",
    content: [
      {
        type: "Feature",
        text: [
          "Added a new strength of schedule chart in the expected wins tab that shows each team's relative strength of schedule. This value is the average difference between a team’s opponents’ points per game and the league‑wide average points per game.",
        ],
      },
    ],
  },
  {
    date: "8/12/25",
    content: [
      {
        type: "Feature",
        text: [
          "Added a new 'League News' section in the standings tab that shows AI-generated league trends and highlights.",
        ],
      },
    ],
  },
  {
    date: "7/27/25",
    content: [
      {
        type: "Feature",
        text: [
          "Added a new component in the roster management section that shows the best waiver moves made across the whole season. Kickers and Defenses are not counted.",
        ],
      },
    ],
  },
  {
    date: "7/22/25",
    content: [
      {
        type: "Fix",
        text: [
          "Refactored the API calls that require player names to be much faster.",
        ],
      },
    ],
  },
  {
    date: "7/17/25",
    content: [
      {
        type: "Feature",
        text: [
          "Added a new component in the roster management section that shows all waiver moves made by each manager. ",
        ],
      },
    ],
  },
  {
    date: "4/30/25",
    content: [
      {
        type: "Feature",
        text: [
          "In the about button modal there is now a settings section. In the settings, there is a toggle to show usernames instead of team names. ",
        ],
      },
    ],
  },
  {
    date: "2/11/25",
    content: [
      {
        type: "Feature",
        text: ["Draft picks can now be sorted by score."],
      },
    ],
  },
  {
    date: "1/8/25",
    content: [
      {
        type: "Feature",
        text: [
          "Added a new section in the power rankings tab to show top performers in each position.",
        ],
      },
    ],
  },
  {
    date: "1/6/25",
    content: [
      {
        type: "Update",
        text: [
          "Updated the formatting and layout of the draft picks for auction and linear drafts.",
        ],
      },
    ],
  },
  {
    date: "1/5/25",
    content: [
      {
        type: "Feature",
        text: [
          "Added rankings next to each player in the trades section. The value represents the average positional ranking for every week after the trade date. ",
        ],
      },
    ],
  },
  {
    date: "1/4/25",
    content: [
      {
        type: "Fix",
        text: [
          "Fixed the draft order to correctly support leagues that use a third round reversal.",
        ],
      },
      {
        type: "Update",
        text: [
          "The draft rank formula has been updated to take points per game into account.",
        ],
      },
    ],
  },
  {
    date: "1/3/25",
    content: [
      {
        type: "Fix",
        text: [
          "For completed leagues the roster projections now show data from the entire season instead of data from only the remaining weeks.",
          "Added better error handling so 2025 leagues are supported.",
        ],
      },
    ],
  },
  {
    date: "12/29/24",
    content: [
      {
        type: "Feature",
        text: [
          "Added a new manager comparison section in the league history tab to compare manager stats like record, points per game, championships, etc.",
        ],
      },
    ],
  },
  {
    date: "12/27/24",
    content: [
      {
        type: "Feature",
        text: [
          "Added a new draft section where all draft picks along with a draft pick rank are shown in a table. Note that this feature is still a work in progress - the current ranks may be misleading or inaccurate.",
        ],
      },
    ],
  },
  {
    date: "12/23/24",
    content: [
      {
        type: "Fix",
        text: [
          "Fixed an issue where the expected wins in league history were not being calculated correctly.",
        ],
      },
    ],
  },
  {
    date: "12/22/24",
    content: [
      {
        type: "Update",
        text: [
          "Updated the prompt and inputs for the AI-generated weekly reports. The reports should no longer give incorrect winning teams. ",
        ],
      },
    ],
  },
  {
    date: "12/20/24",
    content: [
      {
        type: "Update",
        text: [
          "Performance improvements across the entire site. The league history tab should load significantly faster now. Requests to the API are done in parallel.",
        ],
      },
      {
        type: "Fix",
        text: [
          "Leagues with a mismatched number of users and rosters are now supported.",
        ],
      },
    ],
  },
  {
    date: "12/19/24",
    content: [
      {
        type: "Feature",
        text: [
          "All league trades are now visible under the roster management tab. Trades include draft picks and waiver budget.",
        ],
      },
      {
        type: "Fix",
        text: [
          "Fixed an issue where multiple leagues being loaded at the same time caused league data to appear incorrectly.",
        ],
      },
    ],
  },
  {
    date: "12/17/24",
    content: [
      {
        type: "Fix",
        text: [
          "Fixed an issue where the projected player points were not being being fetched correctly.",
        ],
      },
    ],
  },
  {
    date: "12/16/24",
    content: [
      {
        type: "Fix",
        text: [
          "Fixed issues with the loser's playoff bracket formatting. The final placements were being calculated incorrectly.",
          "Leagues from 2021 or older should now show the league winner correctly.",
        ],
      },
    ],
  },
  {
    date: "12/14/24",
    content: [
      {
        type: "Fix",
        text: [
          "Adding a changelog required adding vue-router which caused some issues with fetching league data. If you experience issues with loading your league please try refreshing the page.",
          "Added better error handling and an error alert if there are issues with fetching or refreshing data.",
        ],
      },
    ],
  },
  {
    date: "12/13/24",
    content: [
      {
        type: "Update",
        text: [
          "Fixed table headers for playoff odds and all time H2H matchup tables.",
        ],
      },
      {
        type: "Feature",
        text: [
          "Added all time highest and lowest weekly score tables in the league history tab.",
          "Added this changelog page to better publicize updates.",
        ],
      },
    ],
  },
  {
    date: "12/11/24",
    content: [
      {
        type: "Update",
        text: [
          "Fixed margins with tooltips on mobile.",
          "Playoff odds are toggled off if the playoffs have already started. If the season is completed, playoff odds will be hidden.",
        ],
      },
    ],
  },
  {
    date: "12/9/24",
    content: [
      {
        type: "Feature",
        text: [
          "Added option to copy weekly reports and league summary to clipboard.",
        ],
      },
    ],
  },
];
</script>
<template>
  <PageContainer>
    <PageHeader title="Changelog" class="mb-2" />
    <div class="max-w-lg mb-6">
      <p>
        Join our
        <a
          aria-label="Discord link"
          class="font-medium text-primary hover:underline"
          href="https://discord.gg/sSVwNhyv7U"
          target="_blank"
          rel="noopener noreferrer"
          >Discord</a
        >
        for more updates, feature requests, or bug reports. The frontend
        codebase is also available on
        <a
          aria-label="Github link"
          class="font-medium text-primary hover:underline"
          href="https://github.com/kt474/fantasy-football-wrapped"
          target="_blank"
          rel="noopener noreferrer"
          >Github</a
        >.
      </p>
    </div>
    <div v-for="entry in data" class="my-2 ml-1">
      <div class="flex">
        <p class="w-20 mb-1 mr-2 text-xl font-semibold">
          {{ entry.date }}
        </p>
        <div v-for="content in entry.content" class="mt-0.5">
          <Badge :variant="badgeVariant(content.type)" class="me-2">
            {{ content.type }}
          </Badge>
        </div>
      </div>
      <div v-for="content in entry.content" class="max-w-4xl">
        <ul class="space-y-1">
          <li v-for="text in content.text" class="px-2 my-1 ml-20 text-base">
            {{ text }}
          </li>
        </ul>
      </div>
      <hr class="h-px my-2 border-0 bg-muted" />
    </div>
  </PageContainer>
</template>
