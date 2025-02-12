<script setup lang="ts">
import { useRouter } from "vue-router";

const router = useRouter();
// this should eventually be moved to the server side
const data = [
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
          "Added a new draft section where all draft picks along with a draft pick rank are shown in a table. Note that this feature is still a work in progress - the current ranks may be misleading on inaccruate.",
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
          "Updated the prompt and inputs for the AI generated weekly reports. The reports should no longer give incorrect winning teams. ",
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
  <div class="container w-11/12 h-auto max-w-screen-xl pb-20 mx-auto">
    <div class="container mx-auto mt-4">
      <h1 class="mb-4 text-3xl font-semibold text-gray-800 dark:text-gray-300">
        Changelog
      </h1>
      <div v-for="entry in data" class="my-2">
        <p class="mb-1 text-xl font-semibold text-gray-800 dark:text-gray-300">
          {{ entry.date }}
        </p>

        <div v-for="content in entry.content" class="max-w-4xl">
          <span
            v-if="content.type == 'Update'"
            class="bg-blue-100 text-blue-800 text-sm font-medium me-2 px-2.5 py-0.5 rounded dark:bg-blue-900 dark:text-blue-300"
            >{{ content.type }}</span
          >
          <span
            v-if="content.type == 'Feature'"
            class="bg-green-100 text-green-800 text-sm font-medium me-2 px-2.5 py-0.5 rounded dark:bg-green-900 dark:text-green-300"
            >{{ content.type }}</span
          >
          <span
            v-if="content.type == 'Fix'"
            class="bg-red-100 text-red-800 text-sm font-medium me-2 px-2.5 py-0.5 rounded dark:bg-red-900 dark:text-red-300"
            >{{ content.type }}</span
          >
          <ul
            class="space-y-1 text-gray-800 list-disc list-inside dark:text-gray-300"
          >
            <li v-for="text in content.text" class="my-1 text-base">
              {{ text }}
            </li>
          </ul>
        </div>
        <hr class="h-px my-2 bg-gray-200 border-0 dark:bg-gray-700" />
      </div>
      <button
        aria-label="Button to go back one page"
        @click="router.back()"
        class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm w-full sm:w-auto px-3 sm:px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 mt-2"
      >
        Back
      </button>
    </div>
  </div>
</template>
