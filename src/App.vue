<script setup lang="ts">
import { onMounted, watch, ref, computed } from "vue";
import AppSidebar from "@/components/layout/AppSidebar.vue";
import CardContainer from "./components/util/CardContainer.vue";
import { useStore } from "./store/store";
import { LeagueInfoType } from "./types/types";
import { inject } from "@vercel/analytics";
import { useRouter } from "vue-router";

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
      localStorage.currentLeagueId = store.currentLeagueId;
      if (
        store.currentTab === "Wrapped" &&
        store.leagueInfo[store.currentLeagueIndex]?.season !== "2025"
      ) {
        store.currentTab = "Standings";
      }
      if (store.currentLeagueId !== "undefined") {
        // update league id in url
        // sometimes errors to undefined, TODO
        router.replace({ query: { leagueId: store.currentLeagueId } });
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
            <SidebarTrigger class="-ml-1" />
            <Separator
              orientation="vertical"
              class="data-[orientation=vertical]:h-4"
            />
            <CardContainer />
            <Button
              @click="setColorMode()"
              class="ml-auto transition-colors text-foreground hover:text-foreground"
              variant="ghost"
              size="icon-sm"
            >
              <component :is="darkMode ? Sun : MoonStar" class="w-4 h-4" />
              <span class="sr-only">
                {{ darkMode ? "Switch to light mode" : "Switch to dark mode" }}
              </span>
            </Button>
          </header>
          <main class="flex-1 min-w-0 overflow-x-hidden overflow-y-auto">
            <RouterView />
          </main>
        </SidebarInset>
      </SidebarProvider>
    </div>
    <Toaster />
  </div>
</template>
