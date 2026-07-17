<script setup lang="ts">
import { onMounted, watch, ref, computed, nextTick } from "vue";
import AppSidebar from "@/components/layout/AppSidebar.vue";
import CardContainer from "./components/util/CardContainer.vue";
import { getLeagueKey, useStore } from "./store/store";
import { inject } from "@vercel/analytics";
import { useRoute, useRouter } from "vue-router";

import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Sun, MoonStar } from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import "vue-sonner/style.css";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "vue-sonner";
import { scrollAppToTop } from "@/lib/appScroll";
import { useAuthStore } from "@/store/auth";
import { useSubscriptionStore } from "@/store/subscription";
import {
  createFeatureViewTracker,
  getLeagueAnalyticsProperties,
} from "@/lib/analytics";

const router = useRouter();
const route = useRoute();
const store = useStore();
const authStore = useAuthStore();
const subscriptionStore = useSubscriptionStore();
const currentLeague = computed(() => store.currentLeague);
const trackFeatureView = createFeatureViewTracker();

const systemDarkMode = window.matchMedia(
  "(prefers-color-scheme: dark)"
).matches;
const savedDarkMode = localStorage.getItem("darkMode");
// if savedDarkMode is null, use system preference
// otherwise check if it is explicitly "true"
const initialDarkMode =
  savedDarkMode !== null ? savedDarkMode === "true" : systemDarkMode;

const clicked = ref(initialDarkMode);
// sync store immediately
store.updateDarkMode(initialDarkMode);

const darkMode = computed(() => {
  return store.darkMode;
});

watch(clicked, () => {
  localStorage.setItem("darkMode", String(clicked.value));
  store.updateDarkMode(clicked.value);
});

const setColorMode = () => {
  clicked.value = !clicked.value;
};

onMounted(async () => {
  inject();
});

watch(
  () => store.currentLeagueId,
  () => {
    if (store.currentLeagueId === "") {
      localStorage.removeItem("currentLeagueId");
    } else {
      localStorage.setItem("currentLeagueId", store.currentLeagueId);
      if (
        store.currentTab === "Wrapped" &&
        store.currentLeague?.season !== "2025"
      ) {
        store.currentTab = "Standings";
      }
      if (store.currentLeagueId !== "undefined") {
        const currentLeague = store.currentLeague;
        if (currentLeague?.platform === "espn") {
          router.replace({
            query: {
              ...route.query,
              espn: null,
              leagueId: currentLeague.leagueId,
              season: currentLeague.season,
            },
          });
        } else {
          router.replace({
            query: {
              ...route.query,
              espn: undefined,
              leagueId: store.currentLeagueId,
              season: undefined,
            },
          });
        }
      } else {
        localStorage.removeItem("currentLeagueId");
        toast.error("Error fetching data. Please try refreshing the page.");
      }
    }
  }
);

watch(
  () => store.leagueInfo.length,
  () => {
    if (store.leagueInfo.length > 0 && store.leagueSubmitted) {
      toast.success("League added!");
      store.leagueSubmitted = false;
    }
  }
);

watch(
  () => store.darkMode,
  async (isDark) => {
    document.documentElement.classList.toggle("dark", isDark);
    await nextTick();
    setHtmlBackground();
  },
  { immediate: true }
);

watch(
  () => [
    route.path,
    store.currentTab,
    store.currentLeagueId,
    currentLeague.value?.leagueId ?? "",
    authStore.initialized,
    subscriptionStore.initialized,
    subscriptionStore.loading,
  ],
  () => {
    if (
      !authStore.initialized ||
      !subscriptionStore.initialized ||
      subscriptionStore.loading
    ) {
      return;
    }
    // A league ID is set before its data finishes loading. Waiting prevents a
    // real import from being recorded as a demo feature view.
    if (store.currentLeagueId && !currentLeague.value) return;

    trackFeatureView({
      path: route.path,
      tab: store.currentTab,
      leagueKey: currentLeague.value
        ? getLeagueKey(currentLeague.value)
        : undefined,
      properties: {
        ...getLeagueAnalyticsProperties(currentLeague.value),
        is_authenticated: authStore.isAuthenticated,
        is_premium: subscriptionStore.isPremium,
        plan_type: subscriptionStore.planType ?? "none",
      },
    });
  },
  { immediate: true, flush: "post" }
);

watch(
  () => route.fullPath,
  async () => {
    await nextTick();
    if (
      window.matchMedia("(min-width: 768px)").matches &&
      document.getElementById("mainScrollSection")
    ) {
      scrollAppToTop();
    }
  }
);

const setHtmlBackground = () => {
  const html = document.querySelector("html");
  if (html) {
    const backgroundColor = getComputedStyle(document.body).backgroundColor;
    html.style.backgroundColor = backgroundColor;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", backgroundColor);
  }
};
</script>

<template>
  <div>
    <RouterView v-if="route.meta.standalone" />
    <div v-else>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset class="flex flex-col min-h-svh md:h-svh md:min-h-0">
          <header
            class="sticky top-0 z-30 flex items-center h-16 gap-2 px-4 border-b bg-background shrink-0 md:static md:z-auto"
          >
            <SidebarTrigger
              class="-ml-1 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            />
            <Separator
              orientation="vertical"
              class="data-[orientation=vertical]:h-4"
            />
            <CardContainer />
            <Button
              asChild
              class="hidden ml-auto transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground sm:inline-flex"
              variant="ghost"
              size="icon-sm"
            >
              <a
                href="https://discord.gg/sSVwNhyv7U"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg
                  role="img"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="currentColor"
                >
                  <title>Discord</title>
                  <path
                    d="M20.317 4.3698a19.7913 19.7913 0 0 0-4.8851-1.5152.0741.0741 0 0 0-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 0 0-.0785-.037 19.7363 19.7363 0 0 0-4.8852 1.515.0699.0699 0 0 0-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 0 0 .0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 0 0 .0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 0 0-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 0 1-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 0 1 .0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 0 1 .0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 0 1-.0066.1276 12.2986 12.2986 0 0 1-1.873.8914.0766.0766 0 0 0-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 0 0 .0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 0 0 .0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 0 0-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"
                  />
                </svg>
              </a>
            </Button>
            <Button
              asChild
              class="hidden ml-auto transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground sm:inline-flex"
              variant="ghost"
              size="icon-sm"
            >
              <a
                href="https://github.com/kt474/fantasy-football-wrapped"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg
                  role="img"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="currentColor"
                >
                  <title>GitHub</title>
                  <path
                    d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
                  />
                </svg>
              </a>
            </Button>
            <Button
              @click="setColorMode()"
              class="transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              variant="ghost"
              size="icon-sm"
            >
              <component :is="darkMode ? Sun : MoonStar" class="w-4 h-4" />
              <span class="sr-only">
                {{ darkMode ? "Switch to light mode" : "Switch to dark mode" }}
              </span>
            </Button>
          </header>
          <main
            id="mainScrollSection"
            class="flex-1 min-w-0 overflow-x-clip md:overflow-x-hidden md:overflow-y-auto md:overscroll-none"
          >
            <RouterView />
          </main>
        </SidebarInset>
      </SidebarProvider>
    </div>
    <Toaster />
  </div>
</template>
