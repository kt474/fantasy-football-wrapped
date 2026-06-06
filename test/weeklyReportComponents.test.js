import { createSSRApp, defineComponent, h } from "vue";
import { renderToString } from "@vue/server-renderer";
import { describe, expect, test } from "vitest";
import WeeklyMatchups from "../src/components/weekly_report/WeeklyMatchups.vue";
import WeeklyPointsChart from "../src/components/weekly_report/WeeklyPointsChart.vue";

const team = ({
  rosterId,
  name,
  username,
  points,
  matchup = 1,
  avatarImg = "",
  recordByWeek = "WWLL",
}) => ({
  id: `user-${rosterId}`,
  rosterId,
  name,
  username,
  avatarImg,
  wins: 0,
  losses: 0,
  ties: 0,
  pointsFor: 0,
  pointsAgainst: 0,
  winsAgainstAll: 0,
  lossesAgainstAll: 0,
  winsWithMedian: 0,
  lossesWithMedian: 0,
  rating: 0,
  randomScheduleWins: 0,
  potentialPoints: 0,
  managerEfficiency: 0,
  regularSeasonRank: rosterId,
  expectedWinsSTD: 0,
  recordByWeek,
  players: [],
  points,
  matchups: [matchup, matchup],
  starters: [[], []],
  starterPoints: [[], []],
  benchPlayers: [[], []],
  benchPoints: [[], []],
});

const renderComponent = (component, props, globalComponents = {}) => {
  const app = createSSRApp({
    render: () => h(component, props),
  });

  Object.entries(globalComponents).forEach(([name, definition]) => {
    app.component(name, definition);
  });

  return renderToString(app);
};

describe("weekly report components", () => {
  test("WeeklyMatchups renders manager names, median records, and winner highlight", async () => {
    const html = await renderComponent(WeeklyMatchups, {
      sortedTableData: [
        team({
          rosterId: 1,
          name: "Alpha Team",
          username: "alpha_user",
          points: [90, 120],
          avatarImg: "alpha.png",
        }),
        team({
          rosterId: 2,
          name: "Beta Team",
          username: "beta_user",
          points: [88, 95],
        }),
      ],
      matchupNumbers: [1],
      currentWeek: 2,
      showUsernames: true,
      medianScoring: true,
    });

    expect(html).toContain("alpha_user");
    expect(html).toContain("beta_user");
    expect(html).toContain("(2 - 2)");
    expect(html).toContain("alpha.png");
    expect(html).toMatch(
      /class="[^"]*text-primary[^"]*font-semibold[^"]*"[^>]*>\s*120/
    );
  });

  test("WeeklyMatchups renders display names and ghost roster fallback", async () => {
    const html = await renderComponent(WeeklyMatchups, {
      sortedTableData: [
        team({
          rosterId: 1,
          name: "Alpha Team",
          username: "alpha_user",
          points: [100, 105],
        }),
        team({
          rosterId: 2,
          name: "",
          username: "",
          points: [95, 98],
        }),
      ],
      matchupNumbers: [1],
      currentWeek: 1,
      showUsernames: false,
      medianScoring: false,
    });

    expect(html).toContain("Alpha Team");
    expect(html).toContain("Ghost Roster");
    expect(html).toContain("(1 - 0)");
  });

  test("WeeklyPointsChart passes series, labels, and light theme options to apexchart", async () => {
    const ApexChartStub = defineComponent({
      props: ["options", "series", "type", "width", "height"],
      setup(props) {
        return () =>
          h(
            "pre",
            {
              id: "chart-props",
            },
            JSON.stringify({
              options: props.options,
              series: props.series,
              type: props.type,
              width: props.width,
              height: props.height,
            })
          );
      },
    });

    const html = await renderComponent(
      WeeklyPointsChart,
      {
        sortedTableData: [
          team({
            rosterId: 1,
            name: "Alpha Team",
            username: "alpha_user",
            points: [90, 120],
          }),
          team({
            rosterId: 2,
            name: "Beta Team",
            username: "beta_user",
            points: [88, 95],
          }),
        ],
        currentWeek: 2,
        darkMode: false,
        showUsernames: true,
      },
      { apexchart: ApexChartStub }
    );

    expect(html).toContain("Points");
    expect(html).toContain("&quot;type&quot;:&quot;bar&quot;");
    expect(html).toContain("&quot;width&quot;:&quot;100%&quot;");
    expect(html).toContain("&quot;height&quot;:&quot;475&quot;");
    expect(html).toContain(
      "&quot;series&quot;:[{&quot;name&quot;:&quot;Points&quot;,&quot;data&quot;:[120,95]}]"
    );
    expect(html).toContain(
      "&quot;categories&quot;:[&quot;alpha_user&quot;,&quot;beta_user&quot;]"
    );
    expect(html).toContain("&quot;theme&quot;:&quot;light&quot;");
    expect(html).toContain("&quot;foreColor&quot;:&quot;#111827&quot;");
  });

  test("WeeklyPointsChart switches labels and theme from props", async () => {
    const ApexChartStub = defineComponent({
      props: ["options", "series"],
      setup(props) {
        return () =>
          h(
            "pre",
            JSON.stringify({
              categories: props.options.xaxis.categories,
              theme: props.options.tooltip.theme,
              foreColor: props.options.chart.foreColor,
              series: props.series,
            })
          );
      },
    });

    const html = await renderComponent(
      WeeklyPointsChart,
      {
        sortedTableData: [
          team({
            rosterId: 1,
            name: "Alpha Team",
            username: "alpha_user",
            points: [90, 120],
          }),
          team({
            rosterId: 2,
            name: "Beta Team",
            username: "beta_user",
            points: [88, 95],
          }),
        ],
        currentWeek: 1,
        darkMode: true,
        showUsernames: false,
      },
      { apexchart: ApexChartStub }
    );

    expect(html).toContain(
      "&quot;categories&quot;:[&quot;Alpha Team&quot;,&quot;Beta Team&quot;]"
    );
    expect(html).toContain("&quot;theme&quot;:&quot;dark&quot;");
    expect(html).toContain("&quot;foreColor&quot;:&quot;#ffffff&quot;");
    expect(html).toContain(
      "&quot;series&quot;:[{&quot;name&quot;:&quot;Points&quot;,&quot;data&quot;:[90,88]}]"
    );
  });
});
