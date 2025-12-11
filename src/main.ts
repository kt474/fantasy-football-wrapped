import { createApp } from "vue";
import { createPinia } from "pinia";
import { createRouter, createWebHistory } from "vue-router";
import VueApexCharts from "vue3-apexcharts";
// @ts-ignore
import { registerSW } from "virtual:pwa-register";
import "./index.css";
import App from "./App.vue";
// @ts-ignore
import posthogPlugin from "../plugins/posthog";
const Home = () => import("./views/Home.vue");
const Players = () => import("./views/Players.vue");
const Rosters = () => import("./views/Rosters.vue");
const ChangelogPage = () => import("./views/Changelog.vue");
const PrivacyPolicy = () => import("./views/PrivacyPolicy.vue");
const AdminAwards = () => import("./views/AdminAwards.vue");
const ScoringSettings = () => import("./views/ScoringSettings.vue");
const Stats = () => import("./views/Stats.vue");
const NotFound = () => import("./views/404.vue");

const routes = [
  { path: "/", component: Home },
  {
    path: "/players",
    component: Players,
    meta: {
      title: "Player Stats",
      description: "Weekly and season fantasy stats for any NFL player.",
    },
  },
  {
    path: "/rosters",
    component: Rosters,
    meta: {
      title: "Rosters",
      description:
        "Browse each roster and drill into player fantasy production.",
    },
  },
  {
    path: "/changelog",
    component: ChangelogPage,
    meta: {
      title: "Changelog",
      description: "A log of major updates",
    },
  },
  {
    path: "/privacy",
    component: PrivacyPolicy,
    meta: {
      title: "Privacy Policy",
      description: "We don’t collect or store your personal information.",
    },
  },
  {
    path: "/admin/awards",
    component: AdminAwards,
    meta: {
      title: "Admin: Awards",
      description: "Manage custom seasonal award titles, definitions, and winners.",
    },
  },
  {
    path: "/admin/scoring-settings",
    component: ScoringSettings,
    meta: {
      title: "Admin: Scoring Settings",
      description: "Debug view of the full scoring_settings object for the active league.",
    },
  },
  {
    path: "/stats",
    component: Stats,
    meta: {
      title: "League Stats",
      description:
        "Sortable player and team rankings by position and draft round using Sleeper data.",
    },
  },
  {
    path: "/:pathMatch(.*)*",
    name: "NotFound",
    component: NotFound,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  },
});

const pinia = createPinia();
const app = createApp(App);

app.use(pinia);
app.use(VueApexCharts);
app.use(router);
app.use(posthogPlugin);
registerSW({ immediate: true });
app.mount("#app");
