import { createApp, defineAsyncComponent } from "vue";
import { createPinia } from "pinia";
import { createRouter, createWebHistory } from "vue-router";
import { registerSW } from "virtual:pwa-register";
import "./index.css";
import App from "./App.vue";
import posthogPlugin from "./plugins/posthog";
import { useAuthStore } from "./store/auth";
import { useSubscriptionStore } from "./store/subscription";

const Home = () => import("./views/Home.vue");
const About = () => import("./views/About.vue");
const ChangelogPage = () => import("./views/Changelog.vue");
const PrivacyPolicy = () => import("./views/PrivacyPolicy.vue");
const Terms = () => import("./views/Terms.vue");
const Account = () => import("./views/Account.vue");
const NotFound = () => import("./views/404.vue");

const routes = [
  { path: "/", component: Home },
  {
    path: "/about",
    component: About,
    meta: {
      title: "About",
      description: "Site description",
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
      description: "Privacy policy.",
    },
  },
  {
    path: "/terms",
    component: Terms,
    meta: {
      title: "Terms",
      description: "Terms of service.",
    },
  },
  {
    path: "/account",
    component: Account,
    meta: {
      title: "Account",
      description: "Account page",
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
const ApexChart = defineAsyncComponent(() => import("vue3-apexcharts"));

app.use(pinia);
const authStore = useAuthStore(pinia);
authStore.initialize();
const subscriptionStore = useSubscriptionStore(pinia);
subscriptionStore.initialize();

router.beforeEach(async (to) => {
  if (!authStore.initialized) {
    await authStore.initialize();
  }
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { path: "/" };
  }
  return true;
});

app.component("apexchart", ApexChart);
app.use(router);
app.use(posthogPlugin);
registerSW({ immediate: true });
app.mount("#app");
