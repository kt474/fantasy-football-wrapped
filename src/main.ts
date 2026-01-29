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
import Contact from "./views/Contact.vue";
import NotFound from "./views/404.vue";
import Home from "./views/Home.vue";

const routes = [
  { path: "/", component: Home },
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
    path: "/contact",
    component: Contact,
    meta: {
      title: "Newsletter",
      description: "Subscribe to our newsletter for updates and announcements.",
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
// app.use(posthogPlugin);
registerSW({ immediate: true });
app.mount("#app");
