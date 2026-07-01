import { createApp, defineAsyncComponent, watch } from "vue";
import { createPinia } from "pinia";
import { createRouter, createWebHistory } from "vue-router";
import { registerSW } from "virtual:pwa-register";
import "./index.css";
import App from "./App.vue";
import posthogPlugin from "./plugins/posthog";
import { useAuthStore } from "./store/auth";
import { useSubscriptionStore } from "./store/subscription";
import {
  identifyUser,
  resetAnalytics,
  setUserProperties,
  trackPageView,
} from "./lib/analytics";

const Home = () => import("./views/Home.vue");
const About = () => import("./views/About.vue");
const ChangelogPage = () => import("./views/Changelog.vue");
const PrivacyPolicy = () => import("./views/PrivacyPolicy.vue");
const Terms = () => import("./views/Terms.vue");
const Account = () => import("./views/Account.vue");
const SharedReport = () => import("./views/SharedReport.vue");
const NotFound = () => import("./views/404.vue");

const siteUrl = "https://ffwrapped.com";
const defaultMeta = {
  title: "Fantasy Football Wrapped",
  description:
    "Analyze your fantasy football league with power rankings, roster insights, custom weekly reports, playoff odds, and much more.",
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
      robots: "noindex, follow",
    },
  },
  {
    path: "/report/:token",
    component: SharedReport,
    meta: {
      title: "Shared Weekly Report | ffwrapped",
      description: "View a shared ffwrapped premium weekly report.",
      robots: "noindex, nofollow",
      standalone: true,
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
      robots: "noindex, follow",
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

const staleChunkReloadKey = "stale-chunk-reload-attempted";
const isDynamicImportError = (reason: unknown) => {
  const message = reason instanceof Error ? reason.message : String(reason);

  return (
    message.includes("Failed to fetch dynamically imported module") ||
    message.includes("Importing a module script failed") ||
    message.includes("error loading dynamically imported module")
  );
};

window.addEventListener("unhandledrejection", (event) => {
  if (!isDynamicImportError(event.reason)) {
    return;
  }

  if (sessionStorage.getItem(staleChunkReloadKey)) {
    return;
  }

  sessionStorage.setItem(staleChunkReloadKey, "true");
  window.location.reload();
});

router.afterEach(() => {
  sessionStorage.removeItem(staleChunkReloadKey);
});

const pinia = createPinia();
const app = createApp(App);
const ApexChart = defineAsyncComponent(() => import("vue3-apexcharts"));

app.use(pinia);
app.use(posthogPlugin);
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
  const robots = String(to.meta.robots ?? "index, follow");
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

  let robotsMeta = document.querySelector<HTMLMetaElement>(
    'meta[name="robots"]'
  );
  if (!robotsMeta) {
    robotsMeta = document.createElement("meta");
    robotsMeta.name = "robots";
    document.head.appendChild(robotsMeta);
  }
  robotsMeta.content = robots;

  document
    .querySelector('link[rel="canonical"]')
    ?.setAttribute("href", canonicalUrl);

  trackPageView(to.fullPath, title);
});

watch(
  () => authStore.user,
  (user) => {
    if (!user) {
      resetAnalytics();
      return;
    }

    identifyUser(user.id, {
      email: user.email ?? "",
      created_at: user.created_at,
    });
  },
  { immediate: true }
);

watch(
  () => [
    authStore.isAuthenticated,
    subscriptionStore.isPremium,
    subscriptionStore.status,
    subscriptionStore.planType,
  ],
  ([isAuthenticated, isPremium, status, planType]) => {
    if (!isAuthenticated) return;

    setUserProperties({
      is_premium: Boolean(isPremium),
      subscription_status: String(status),
      plan_type: String(planType ?? "none"),
    });
  },
  { immediate: true }
);

app.component("apexchart", ApexChart);
app.use(router);
registerSW({ immediate: true });
app.mount("#app");
