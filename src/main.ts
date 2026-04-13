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

const siteUrl = "https://ffwrapped.com";
const defaultMeta = {
  title: "Fantasy Football Wrapped",
  description:
    "Analyze your fantasy football league with standings, power rankings, playoff odds, weekly reports, roster insights, and league history.",
};

const routes = [
  {
    path: "/",
    component: Home,
    meta: defaultMeta,
  },
  {
    path: "/about",
    component: About,
    meta: {
      title: "About | ffwrapped",
      description:
        "Learn about ffwrapped, a tool for analyzing fantasy football leagues.",
    },
  },
  {
    path: "/changelog",
    component: ChangelogPage,
    meta: {
      title: "Changelog | ffwrapped",
      description: "See the latest ffwrapped updates, features, and bug fixes",
    },
  },
  {
    path: "/privacy",
    component: PrivacyPolicy,
    meta: {
      title: "Privacy Policy | ffwrapped",
      description:
        "Read the ffwrapped privacy policy and learn how league, account, and billing data are handled.",
    },
  },
  {
    path: "/terms",
    component: Terms,
    meta: {
      title: "Terms of Service | ffwrapped",
      description:
        "Read the ffwrapped terms of service for using the fantasy football league analysis app.",
    },
  },
  {
    path: "/account",
    component: Account,
    meta: {
      title: "Account | ffwrapped",
      description: "Manage your ffwrapped account and subscription settings.",
    },
  },
  {
    path: "/:pathMatch(.*)*",
    name: "NotFound",
    component: NotFound,
    meta: {
      title: "Page Not Found | ffwrapped",
      description:
        "The page you are looking for could not be found on ffwrapped.",
    },
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

router.afterEach((to) => {
  const title = String(to.meta.title ?? defaultMeta.title);
  const description = String(to.meta.description ?? defaultMeta.description);
  const canonicalUrl = `${siteUrl}${to.path === "/" ? "/" : to.path}`;

  document.title = title;

  const setMetaContent = (selector: string, content: string) => {
    document.querySelector(selector)?.setAttribute("content", content);
  };

  setMetaContent('meta[name="description"]', description);
  setMetaContent('meta[itemprop="name"]', title);
  setMetaContent('meta[itemprop="description"]', description);
  setMetaContent('meta[property="og:title"]', title);
  setMetaContent('meta[property="og:description"]', description);
  setMetaContent('meta[property="og:url"]', canonicalUrl);
  setMetaContent('meta[name="twitter:title"]', title);
  setMetaContent('meta[name="twitter:description"]', description);

  document
    .querySelector('link[rel="canonical"]')
    ?.setAttribute("href", canonicalUrl);
});

app.component("apexchart", ApexChart);
app.use(router);
app.use(posthogPlugin);
registerSW({ immediate: true });
app.mount("#app");
