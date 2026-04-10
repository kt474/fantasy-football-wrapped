<script setup lang="ts">
import { onMounted, watch, ref, computed } from "vue";
import AppSidebar from "@/components/layout/AppSidebar.vue";
import CardContainer from "./components/util/CardContainer.vue";
import { useStore } from "./store/store";
import { LeagueInfoType } from "./types/types";
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

const router = useRouter();
const route = useRoute();
const store = useStore();

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
  setHtmlBackground();
});

watch(
  () => store.darkMode,
  () => setHtmlBackground()
);

watch(
  () => store.currentLeagueId,
  () => {
    if (store.currentLeagueId === "") {
      localStorage.removeItem("currentLeagueId");
      localStorage.removeItem("leagueInfo");
    } else {
      localStorage.setItem("currentLeagueId", store.currentLeagueId);
      if (
        store.currentTab === "Wrapped" &&
        store.leagueInfo[store.currentLeagueIndex]?.season !== "2025"
      ) {
        store.currentTab = "Standings";
      }
      if (store.currentLeagueId !== "undefined") {
        // update league id in url
        router.replace({
          query: { ...route.query, leagueId: store.currentLeagueId },
        });
      } else {
        localStorage.removeItem("currentLeagueId");
        localStorage.removeItem("leagueInfo");
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
    localStorage.setItem(
      "leagueInfo",
      JSON.stringify(store.leagueInfo as LeagueInfoType[])
    );
  }
);

watch(
  () => store.darkMode,
  (isDark) => {
    document.documentElement.classList.toggle("dark", isDark);
  },
  { immediate: true }
);

const setHtmlBackground = () => {
  const html = document.querySelector("html");
  if (html) {
    if (store.darkMode) {
      html.style.backgroundColor = "#030712";
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", "#030712");
    } else {
      html.style.backgroundColor = "#F9FAFB";
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", "#F9FAFB");
    }
  }
};
</script>

<template>
  <div>
    <div>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset class="flex flex-col h-screen">
          <header class="flex items-center h-16 gap-2 px-4 border-b shrink-0">
            <SidebarTrigger
              class="-ml-1 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            />
            <Separator
              orientation="vertical"
              class="data-[orientation=vertical]:h-4"
            />
            <CardContainer />
            <Button
              class="ml-auto hidden transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground sm:inline-flex"
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
            class="flex-1 min-w-0 overflow-x-hidden overflow-y-auto overscroll-none"
          >
            <RouterView />
          </main>
        </SidebarInset>
      </SidebarProvider>
    </div>
    <Toaster />
  </div>
</template>
