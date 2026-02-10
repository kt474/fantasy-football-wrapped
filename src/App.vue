<script setup lang="ts">
import { onMounted, watch, ref, computed } from "vue";
import AppSidebar from "@/components/layout/AppSidebar.vue";
import CardContainer from "./components/util/CardContainer.vue";
import Alert from "./components/util/Alert.vue";
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

const router = useRouter();
const store = useStore();

const systemDarkMode = window.matchMedia(
  "(prefers-color-scheme: dark)"
).matches;
const clicked = ref(systemDarkMode);

const darkMode = computed(() => {
  return store.darkMode;
});

watch(clicked, () => {
  localStorage.darkMode = clicked.value;
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
        store.showLoadingAlert = true;
        setTimeout(() => {
          store.showLoadingAlert = false;
        }, 8000);
      }
    }
  }
);

watch(
  () => store.leagueInfo.length,
  () => {
    if (
      store.leagueInfo.length > 0 &&
      !store.showRemovedAlert &&
      store.leagueSubmitted
    ) {
      store.updateShowAddedAlert(true);
      setTimeout(() => {
        store.updateShowAddedAlert(false);
      }, 3000);
      store.leagueSubmitted = false;
    }
    localStorage.setItem(
      "leagueInfo",
      JSON.stringify(store.leagueInfo as LeagueInfoType[])
    );
  }
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
  <div :class="{ dark: store.darkMode }">
    <div>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset class="flex flex-col h-screen">
          <header class="flex items-center h-16 gap-2 px-4 border-b shrink-0">
            <SidebarTrigger class="-ml-1" />
            <Separator
              orientation="vertical"
              class="mr-2 data-[orientation=vertical]:h-4"
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
          <main class="flex-1 overflow-y-auto">
            <RouterView />
          </main>
        </SidebarInset>
      </SidebarProvider>
    </div>

    <Alert
      v-if="store.showEmailAlert"
      alert-msg="Thanks for subscribing!"
      type="success"
    />
    <Alert
      v-if="store.showAddedAlert"
      alert-msg="League successfully added!"
      type="success"
    />
    <Alert
      v-if="store.showRefreshAlert"
      alert-msg="League data refreshed!"
      type="success"
    />
    <Alert
      v-if="store.showRemovedAlert"
      alert-msg="League removed!"
      type="success"
    />
    <Alert
      v-if="store.showCopiedAlert"
      alert-msg="Link copied to clipboard!"
      type="success"
    />
    <Alert
      v-if="store.showCopyReport"
      alert-msg="Summary copied to clipboard!"
      type="success"
    />
    <Alert
      v-if="store.showLoadingAlert"
      alert-msg="Error fetching data. Please try refreshing the page."
      type="error"
    />
    <Alert
      v-if="store.showInvalidLeagueAlert"
      alert-msg="Invalid League ID."
      type="error"
    />
  </div>
</template>
