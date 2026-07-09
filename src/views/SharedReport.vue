<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ArrowLeft, CalendarDays, MoonStar, Sun } from "lucide-vue-next";
import { getSharedReport, type SharedReportResponse } from "@/api/api";
import PremiumReportContent from "@/components/weekly_report/PremiumReportContent.vue";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useStore } from "@/store/store";
import { trackEvent } from "@/lib/analytics";

const route = useRoute();
const router = useRouter();
const store = useStore();

const sharedReport = ref<SharedReportResponse | null>(null);
const loading = ref(true);
const errorMessage = ref("");

const toggleDarkMode = () => {
  const nextDarkMode = !store.darkMode;
  store.updateDarkMode(nextDarkMode);
  localStorage.setItem("darkMode", String(nextDarkMode));
};

const getEntrySource = () => {
  if (typeof document === "undefined") return "unknown";
  if (!document.referrer) return "direct";

  try {
    const referrerHost = new URL(document.referrer).hostname;
    if (referrerHost.includes("google") || referrerHost.includes("bing")) {
      return "search";
    }
    if (
      referrerHost.includes("twitter") ||
      referrerHost.includes("x.com") ||
      referrerHost.includes("facebook") ||
      referrerHost.includes("reddit") ||
      referrerHost.includes("discord")
    ) {
      return "social";
    }
    return "referral";
  } catch {
    return "unknown";
  }
};

const isReturningUser = () => {
  if (typeof localStorage === "undefined") return false;
  return Boolean(localStorage.getItem("leagueInfo"));
};

const trackSharedReportCta = (cta: string) => {
  trackEvent("Shared Report CTA Clicked", {
    cta,
    entry: getEntrySource(),
  });
};

const goToHome = (cta = "explore") => {
  trackSharedReportCta(cta);
  router.push("/");
};

const loadReport = async () => {
  const token = String(route.params.token ?? "").trim();
  sharedReport.value = null;
  errorMessage.value = "";
  loading.value = true;

  if (!/^(?:[a-f0-9]{32}|[A-Za-z0-9_-]{16})$/.test(token)) {
    errorMessage.value = "This report link is invalid.";
    loading.value = false;
    return;
  }

  try {
    const result = await getSharedReport(token);
    if (!result) {
      errorMessage.value =
        "This shared report could not be found or is no longer available.";
      return;
    }
    sharedReport.value = result;
    trackEvent("Shared Report Viewed", {
      entry: getEntrySource(),
      returning: isReturningUser(),
    });
  } catch (error) {
    console.error("Unable to load shared report:", error);
    errorMessage.value =
      "We couldn't load this report right now. Please try again shortly.";
  } finally {
    loading.value = false;
  }
};

onMounted(loadReport);
watch(() => route.params.token, loadReport);
</script>

<template>
  <div class="container w-11/12 max-w-5xl py-8 mx-auto sm:py-12">
    <div class="flex items-center justify-between mb-6">
      <Button as-child class="shadow-sm">
        <a href="/" @click="trackSharedReportCta('explore')">
          <ArrowLeft class="mr-2 size-4" />
          Try ffwrapped
        </a>
      </Button>
      <Button
        variant="outline"
        size="icon"
        :aria-label="
          store.darkMode ? 'Switch to light mode' : 'Switch to dark mode'
        "
        @click="toggleDarkMode"
      >
        <Sun v-if="store.darkMode" class="size-4" />
        <MoonStar v-else class="size-4" />
      </Button>
    </div>

    <div v-if="loading" class="space-y-6">
      <div class="space-y-3">
        <Skeleton class="w-32 h-4" />
        <Skeleton class="w-4/5 h-10" />
        <Skeleton class="w-3/5 h-6" />
      </div>
      <Skeleton class="w-full h-40" />
      <div class="grid gap-4 lg:grid-cols-2">
        <Skeleton class="h-44" />
        <Skeleton class="h-44" />
      </div>
    </div>

    <Card v-else-if="errorMessage" class="max-w-xl mx-auto">
      <CardContent class="p-8 text-center">
        <h1 class="text-2xl font-bold">Report unavailable</h1>
        <p class="mt-3 text-muted-foreground">{{ errorMessage }}</p>
        <Button class="mt-6" @click="goToHome('explore')"> Return home </Button>
      </CardContent>
    </Card>

    <article v-else-if="sharedReport">
      <header class="pb-5 border-b mb-7">
        <a
          href="/"
          class="inline-flex items-center gap-2 mb-2 text-xl font-semibold"
          aria-label="Go to ffwrapped home"
          @click="trackSharedReportCta('explore')"
        >
          <img
            height="32"
            width="32"
            src="../assets/logo.webp"
            class="-mx-1"
            alt="ffwrapped logo"
          />
          <p class="custom-font mt-1.5">
            <span class="text-primary">ff</span>wrapped
          </p>
        </a>
        <div
          class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"
        >
          <div>
            <h1 class="text-2xl font-bold sm:text-3xl">
              {{ sharedReport.leagueName }}
            </h1>
            <p class="mt-1 text-muted-foreground">
              {{ sharedReport.season }} season · Week {{ sharedReport.week }}
            </p>
          </div>
          <p class="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays class="size-3.5" />
            Shared
            {{
              new Date(sharedReport.createdAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            }}
          </p>
        </div>
      </header>

      <PremiumReportContent :report="sharedReport.report" />
      <section
        class="p-5 mt-4 mb-8 border rounded-lg bg-card text-card-foreground sm:p-6"
        aria-label="Try ffwrapped"
      >
        <div
          class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"
        >
          <div>
            <h2 class="mt-2 text-2xl font-bold">
              Want weekly reports for a different league?
            </h2>
            <p
              class="max-w-2xl mt-2 text-sm text-muted-foreground sm:text-base"
            >
              Generate weekly reports, power rankings, playoff odds, and roster
              insights for your own fantasy league. Join 13,000+ fantasy leagues
              using ffwrapped.
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <Button @click="goToHome('analyze_league')">
              Analyze Your League
            </Button>
          </div>
        </div>
      </section>

      <footer class="pt-6 mt-8 text-sm border-t text-muted-foreground">
        AI-generated report. Information provided may not always be accurate.
        Created with
        <a
          class="font-medium text-primary hover:underline"
          href="/"
          @click="trackSharedReportCta('explore')"
        >
          ffwrapped.com
        </a>
      </footer>
    </article>
  </div>
</template>
<style scoped>
.custom-font {
  font-family: "Josefin Sans", sans-serif;
  font-optical-sizing: auto;
  font-weight: 600;
  font-style: normal;
  font-size: 1.6rem;
}
</style>
