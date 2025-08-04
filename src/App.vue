<script setup lang="ts">
import { onMounted, watch } from "vue";
import Header from "./components/util/Header.vue";
import Footer from "./components/util/Footer.vue";
import Alert from "./components/util/Alert.vue";
import Email from "./components/util/Email.vue";
import { useStore } from "./store/store";
import { LeagueInfoType } from "./api/types";
import { inject } from "@vercel/analytics";

const store = useStore();

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
      // update league id in url
      // sometimes errors to undefined, TODO
      if (store.currentLeagueId !== "undefined") {
        const url: any = new URL(window.location.href);
        url.searchParams.set("leagueId", store.currentLeagueId);
        window.history.pushState({}, "", url.toString());
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
  <div :class="{ dark: store.darkMode }" class="h-screen">
    <div class="h-full bg-gray-50 dark:bg-gray-950">
      <Header />
      <div class="w-full border-b border-gray-200 dark:border-gray-600"></div>
      <RouterView />
      <Footer />
    </div>
    <Email />
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
  </div>
</template>
