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
import ChangelogPage from "./views/Changelog.vue";
import PrivacyPolicy from "./views/PrivacyPolicy.vue";
import NotFound from "./views/404.vue";
import Home from "./views/Home.vue";

const routes = [
  { path: "/", component: Home },
  { path: "/changelog", component: ChangelogPage },
  { path: "/privacy", component: PrivacyPolicy },
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
