<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import {
  Clapperboard,
  Copy,
  Download,
  LoaderCircle,
  Share2,
} from "lucide-vue-next";
import { renderMarkdown } from "@/lib/markdown";
import { useAuthStore } from "@/store/auth";
import { useSubscriptionStore } from "@/store/subscription";
import { useStore } from "@/store/store";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Separator from "../ui/separator/Separator.vue";
import PremiumReportContent from "./PremiumReportContent.vue";
import type { PremiumReport } from "@/types/types";
import { trackEvent, trackPremiumFunnelEvent } from "@/lib/analytics";
import { scrollAppToTop } from "@/lib/appScroll";
import { premiumReportPreview } from "@/lib/premiumReportSample";

const props = defineProps<{
  tier: string;
  premiumCommentaryStyle: string;
  weeksLength: number;
  currentWeek: number;
  isLatestWeek: boolean;
  hasLeagues: boolean;
  hasLastScoredWeek: boolean;
  rawWeeklyReport: string;
  premiumWeeklyReport: PremiumReport | null;
  loading: boolean;
  premiumLoading: boolean;
  reportDataLoading: boolean;
  isGeneratingImage: boolean;
  isSharingReport: boolean;
  isRenderingVideo: boolean;
  videoRenderProgress: number;
  videoUrl: string;
}>();

const emit = defineEmits<{
  "update:tier": [value: string];
  "update:premiumCommentaryStyle": [value: string];
  "download-image": [];
  "copy-report": [];
  "share-report": [];
  "generate-video": [];
  "generate-premium": [];
}>();

const store = useStore();
const route = useRoute();
const authStore = useAuthStore();
const subscriptionStore = useSubscriptionStore();

const premiumAccountRoute = computed(() => ({
  path: "/account",
  query: {
    ...route.query,
    intent: "premium_report",
    upgrade_source: "weekly_report",
  },
}));

const renderedWeeklyReport = computed(() =>
  renderMarkdown(props.rawWeeklyReport)
);

const canGeneratePremium = computed(
  () => authStore.isAuthenticated && subscriptionStore.isPremium
);
const canGenerateCurrentPremiumReport = computed(
  () =>
    canGeneratePremium.value &&
    props.hasLastScoredWeek &&
    !props.reportDataLoading
);

const canUsePremiumReportActions = computed(
  () => canGeneratePremium.value && Boolean(props.premiumWeeklyReport)
);

const premiumActionTitle = computed(() => {
  if (!canGeneratePremium.value) {
    return "Premium subscription required";
  }
  if (!props.premiumWeeklyReport) {
    return "Generate a Premium report first";
  }
  return undefined;
});

const videoActionDisabled = computed(
  () => !canUsePremiumReportActions.value || props.isRenderingVideo
);

const shareActionDisabled = computed(
  () => !canUsePremiumReportActions.value || props.isSharingReport
);

const videoRenderPercent = computed(() =>
  Math.round(Math.max(0, Math.min(1, props.videoRenderProgress)) * 100)
);

const canUseCurrentReport = computed(() =>
  props.tier === "Premium"
    ? Boolean(props.premiumWeeklyReport)
    : Boolean(props.rawWeeklyReport)
);

const imageActionDisabled = computed(
  () => props.isGeneratingImage || !canUseCurrentReport.value
);

const copyActionDisabled = computed(() => !canUseCurrentReport.value);

const trackedPremiumPaywallView = ref(false);
const shouldTrackPremiumPaywallView = computed(
  () => props.tier === "Premium" && !canGeneratePremium.value
);

watch(
  shouldTrackPremiumPaywallView,
  (shouldTrack) => {
    if (!shouldTrack || trackedPremiumPaywallView.value) {
      return;
    }

    trackedPremiumPaywallView.value = true;
    trackEvent("Paywall Viewed", {
      feature: "premium_report",
      source: "weekly_report",
    });
    trackPremiumFunnelEvent("paywall_viewed", {
      feature: "premium_report",
      source: "weekly_report",
      has_league: props.hasLeagues,
      authenticated: authStore.isAuthenticated,
      is_premium: subscriptionStore.isPremium,
    });
  },
  { immediate: true }
);

const updateTier = (value: string) => {
  emit("update:tier", value);
  if (value === "Premium") {
    trackPremiumFunnelEvent("premium_tab_selected", {
      feature: "premium_report",
      source: "weekly_report",
      has_league: props.hasLeagues,
      authenticated: authStore.isAuthenticated,
      is_premium: subscriptionStore.isPremium,
    });
  }
};

const showPremiumReport = () => {
  updateTier("Premium");
  scrollAppToTop("smooth");
};

const handleGeneratePremium = () => {
  if (!canGenerateCurrentPremiumReport.value) {
    return;
  }
  emit("generate-premium");
};

const trackPremiumCtaClick = (cta: string) => {
  trackPremiumFunnelEvent("premium_cta_clicked", {
    cta,
    feature: "premium_report",
    source: "weekly_report",
    has_league: props.hasLeagues,
    authenticated: authStore.isAuthenticated,
  });
  store.currentTab = "";
};
</script>

<template>
  <Tabs
    :model-value="tier"
    default-value="Standard"
    @update:model-value="updateTier(String($event))"
  >
    <div>
      <div
        class="grid grid-cols-[1fr_auto] items-center gap-2 sm:flex sm:flex-wrap"
      >
        <p class="mb-1 text-xl font-semibold tracking-tight">Summary</p>
        <TabsList
          class="col-span-2 row-start-2 justify-self-start sm:order-none sm:ml-2"
        >
          <TabsTrigger value="Standard"> Standard </TabsTrigger>
          <TabsTrigger value="Premium"> Premium </TabsTrigger>
        </TabsList>
        <div
          :class="
            tier === 'Premium'
              ? 'col-span-2 row-start-3 grid grid-flow-col auto-cols-8 justify-self-start gap-2 sm:col-auto sm:row-auto sm:ml-auto sm:flex sm:justify-self-auto'
              : 'col-start-2 row-start-1 ml-auto flex gap-2 sm:col-auto sm:row-auto'
          "
        >
          <template v-if="tier === 'Premium'">
            <Button
              v-if="videoUrl && canUsePremiumReportActions"
              as-child
              size="sm"
              class="h-10 min-w-0 px-2 sm:h-8 sm:w-auto sm:px-3"
            >
              <a
                :href="videoUrl"
                target="_blank"
                rel="noopener noreferrer"
                download
              >
                <Download class="size-4" />
                <span class="sm:hidden">Video</span>
                <span class="hidden sm:inline">Video</span>
              </a>
            </Button>
            <Button
              v-else
              @click="emit('generate-video')"
              :disabled="videoActionDisabled"
              :title="premiumActionTitle"
              size="sm"
              class="h-10 min-w-0 px-2 sm:h-8 sm:w-auto sm:px-3"
            >
              <LoaderCircle
                v-if="isRenderingVideo"
                class="size-4 animate-spin"
              />
              <Clapperboard v-else class="size-4" />
              <span class="sm:hidden">Video</span>
              <span class="hidden sm:inline">
                {{
                  isRenderingVideo
                    ? `Rendering ${videoRenderPercent}%`
                    : "Video"
                }}
              </span>
            </Button>
            <Button
              @click="emit('share-report')"
              :disabled="shareActionDisabled"
              :title="premiumActionTitle"
              size="sm"
              class="h-10 min-w-0 px-2 sm:h-8 sm:w-auto sm:px-3"
            >
              <LoaderCircle
                v-if="isSharingReport"
                class="size-4 animate-spin"
              />
              <Share2 v-else class="size-4" />
              <span class="sm:hidden">Share</span>
              <span class="hidden sm:inline">Share</span>
            </Button>
          </template>
          <Button
            @click="emit('download-image')"
            :disabled="imageActionDisabled"
            variant="outline"
            size="sm"
            class="h-8"
            aria-label="Share recap image"
            title="Share recap image"
          >
            <Download />
          </Button>
          <Button
            @click="emit('copy-report')"
            :disabled="copyActionDisabled"
            variant="outline"
            size="sm"
            class="h-8"
            aria-label="Copy full report"
            title="Copy full report"
          >
            <Copy class="size-4" />
          </Button>
        </div>
      </div>
      <TabsContent value="Premium">
        <div v-if="hasLeagues">
          <div class="flex mb-4">
            <div>
              <p class="mb-1 text-xs">Commentary Style</p>
              <Select
                :model-value="premiumCommentaryStyle"
                @update:model-value="
                  emit('update:premiumCommentaryStyle', String($event))
                "
              >
                <SelectTrigger class="w-full sm:w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="roast">Roast</SelectItem>
                  <SelectItem value="neutral">Neutral</SelectItem>
                  <SelectItem value="newspaper">Newspaper</SelectItem>
                  <SelectItem value="cutthroat">Cutthroat</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              @click="handleGeneratePremium"
              :disabled="!canGenerateCurrentPremiumReport || premiumLoading"
              type="button"
              class="mt-5 ml-2"
              >Generate</Button
            >
          </div>
          <div v-if="premiumWeeklyReport" class="my-5">
            <PremiumReportContent :report="premiumWeeklyReport" />
            <video
              v-if="videoUrl"
              :src="videoUrl"
              controls
              playsinline
              preload="metadata"
              class="w-full max-w-sm mt-6 bg-black border rounded-card"
            >
              Your browser does not support the video element.
            </video>
            <p class="mt-4 text-xs text-muted-foreground">
              AI-generated report. Information provided may not always be
              accurate.
            </p>
          </div>
          <div v-else-if="premiumLoading && hasLastScoredWeek">
            <div role="status" class="space-y-2.5 animate-pulse max-w-lg mt-2">
              <p>Generating Premium Summary...</p>
              <div class="flex items-center w-full">
                <div class="h-2.5 bg-muted rounded-full w-32"></div>
                <div class="h-2.5 ms-2 bg-muted/80 rounded-full w-24"></div>
                <div class="h-2.5 ms-2 bg-muted/80 rounded-full w-full"></div>
              </div>
              <div class="flex items-center w-full max-w-[480px]">
                <div class="h-2.5 bg-muted rounded-full w-full"></div>
                <div class="h-2.5 ms-2 bg-muted/80 rounded-full w-full"></div>
                <div class="h-2.5 ms-2 bg-muted/80 rounded-full w-24"></div>
              </div>
              <div class="flex items-center w-full max-w-[400px]">
                <div class="h-2.5 bg-muted/80 rounded-full w-full"></div>
                <div class="h-2.5 ms-2 bg-muted rounded-full w-80"></div>
                <div class="h-2.5 ms-2 bg-muted/80 rounded-full w-full"></div>
              </div>
              <div class="flex items-center w-full max-w-[480px]">
                <div class="h-2.5 ms-2 bg-muted rounded-full w-full"></div>
                <div class="h-2.5 ms-2 bg-muted/80 rounded-full w-full"></div>
                <div class="h-2.5 ms-2 bg-muted/80 rounded-full w-24"></div>
              </div>
              <div class="flex items-center w-full max-w-[440px]">
                <div class="h-2.5 ms-2 bg-muted/80 rounded-full w-32"></div>
                <div class="h-2.5 ms-2 bg-muted/80 rounded-full w-24"></div>
                <div class="h-2.5 ms-2 bg-muted rounded-full w-full"></div>
              </div>
              <div class="flex items-center w-full max-w-[360px]">
                <div class="h-2.5 ms-2 bg-muted/80 rounded-full w-full"></div>
                <div class="h-2.5 ms-2 bg-muted rounded-full w-80"></div>
                <div class="h-2.5 ms-2 bg-muted/80 rounded-full w-full"></div>
              </div>
              <span class="sr-only">Loading...</span>
            </div>
          </div>
          <p
            v-else-if="canGeneratePremium && !hasLastScoredWeek"
            class="max-w-3xl"
          >
            Your first premium weekly report will be ready after Week 1 is
            scored.
          </p>
          <p v-else-if="canGeneratePremium" class="max-w-3xl">
            Choose a commentary style and generate your premium weekly report.
          </p>
          <div v-else class="max-w-4xl">
            <p class="max-w-3xl mb-4">
              Premium weekly reports turn each week into a shareable league
              newsletter with headline stories, matchup recaps, manager
              highlights, and your choice of commentary style. They're longer,
              more detailed, packed with richer league context, and aware of
              past matchups and rivalries.
              <a
                href="https://ffwrapped.com/report/1BJ_ktCJQl1Ocjwy"
                target="_blank"
                rel="noopener noreferrer"
                class="font-medium text-primary hover:underline"
              >
                View full sample report</a
              >.
            </p>

            <div
              class="relative max-h-[400px] overflow-hidden rounded-card border p-4 sm:p-6"
            >
              <PremiumReportContent :report="premiumReportPreview" />
              <div
                class="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-background via-background/95 to-transparent"
              ></div>
              <div class="absolute inset-x-0 z-10 flex justify-center bottom-6">
                <Button as-child>
                  <router-link
                    :to="premiumAccountRoute"
                    @click="trackPremiumCtaClick('unlock_premium_reports')"
                  >
                    Unlock Premium Reports
                  </router-link>
                </Button>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="max-w-4xl">
          <p class="max-w-3xl mb-4">
            Premium weekly reports turn each week into a shareable league
            newsletter with headline stories, matchup recaps, manager
            highlights, and your choice of commentary style. They're longer,
            more detailed, packed with richer league context, and aware of past
            matchups and rivalries.
            <a
              href="https://ffwrapped.com/report/1BJ_ktCJQl1Ocjwy"
              target="_blank"
              rel="noopener noreferrer"
              class="font-medium text-primary hover:underline"
            >
              View full sample report</a
            >.
          </p>
          <div
            class="relative max-h-[400px] overflow-hidden rounded-card border p-4 sm:p-6"
          >
            <PremiumReportContent :report="premiumReportPreview" />
            <div
              class="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-background via-background/95 to-transparent"
            ></div>
            <div class="absolute inset-x-0 z-10 flex justify-center bottom-6">
              <Button as-child>
                <router-link
                  :to="premiumAccountRoute"
                  @click="trackPremiumCtaClick('unlock_premium_reports')"
                >
                  Unlock Premium Reports
                </router-link>
              </Button>
            </div>
          </div>
        </div>
      </TabsContent>
      <TabsContent value="Standard">
        <div v-if="rawWeeklyReport" class="max-w-5xl">
          <div
            v-html="renderedWeeklyReport"
            class="mb-3 leading-7 text-foreground/90 dark:text-foreground/85 report-content"
          ></div>
          <p class="text-xs text-muted-foreground">
            AI-generated report. Information provided may not always be
            accurate.
          </p>
          <p class="text-xs text-muted-foreground">
            Smarter, more detailed, newsletter style weekly recaps with
            customizable tones and deeper league context are available with
            <button
              type="button"
              class="cursor-pointer text-primary hover:underline"
              @click="showPremiumReport"
            >
              Premium</button
            >.
          </p>
        </div>
        <div v-else-if="!hasLeagues" class="max-w-5xl">
          <p class="mb-3">
            Week 14 was a rollercoaster, and some of you might want to demand a
            refund for that ride.
            <b>The Princess McBride</b> retains the top spot with a solid 124.48
            points, thanks to Josh Allen and Christian McCaffrey doing their
            best superhero impressions. Meanwhile, <b>Dak to the Future</b>
            looked more like back to the past, scoring just 76.3 points and
            proving that even Patrick Mahomes can’t carry a team of
            underperformers.
          </p>
          <p class="mb-3">
            <b>Saquondo </b> narrowly edged out <b>LaPorta Potty </b> in a
            high-scoring showdown, 129.62 to 123.26. Deebo Samuel was the real
            MVP, putting up numbers like he was playing Madden on rookie mode.
            <b>Baby Back Gibbs</b> and <b>Bijan Mustard</b> had a snooze-fest,
            with the BBQ Ribs barely staying awake long enough to win 95 to
            82.64. Travis Kelce's performance was less "Mr. Swift" and more "Mr.
            Swiftly Disappointing."
          </p>
          <p class="mb-3">
            In the battle of the lower ranks, <b>Breece's Puffs</b> barely
            squeaked by <b>Lamario Kart </b> 94.82 to 90.44. Tony Pollard and
            James Cook did just enough to save the day, proving that even a
            broken clock is right twice a day.
          </p>
          <p>
            Finally, <b>Ja’Marr the Merrier</b> showed
            <b>Just the Tua Us</b> who's boss, winning 90.04 to 82.64. Russell
            Wilson must have found a new playbook, because he was cooking, and
            not just in the kitchen.
          </p>
        </div>
        <div
          v-else-if="weeksLength === 0 || !hasLastScoredWeek"
          class="max-w-3xl"
        >
          <p>
            Weekly reports will be ready after Week 1. There are also new
            <button
              type="button"
              class="font-semibold cursor-pointer text-primary hover:underline"
              @click="showPremiumReport"
            >
              Premium reports</button
            >.
          </p>
        </div>
        <div v-else-if="!isLatestWeek" class="max-w-2xl">
          <p>
            Standard weekly reports are only available for the latest scored
            week.
            <button
              type="button"
              class="font-semibold cursor-pointer text-primary hover:underline"
              @click="showPremiumReport"
            >
              Premium reports
            </button>
            are available for every scored week.
          </p>
        </div>
        <div v-else-if="loading && hasLastScoredWeek">
          <div role="status" class="space-y-2.5 animate-pulse max-w-lg">
            <p>Generating Summary...</p>
            <div class="flex items-center w-full">
              <div class="h-2.5 bg-muted rounded-full w-32"></div>
              <div class="h-2.5 ms-2 bg-muted/80 rounded-full w-24"></div>
              <div class="h-2.5 ms-2 bg-muted/80 rounded-full w-full"></div>
            </div>
            <div class="flex items-center w-full max-w-[480px]">
              <div class="h-2.5 bg-muted rounded-full w-full"></div>
              <div class="h-2.5 ms-2 bg-muted/80 rounded-full w-full"></div>
              <div class="h-2.5 ms-2 bg-muted/80 rounded-full w-24"></div>
            </div>
            <div class="flex items-center w-full max-w-[400px]">
              <div class="h-2.5 bg-muted/80 rounded-full w-full"></div>
              <div class="h-2.5 ms-2 bg-muted rounded-full w-80"></div>
              <div class="h-2.5 ms-2 bg-muted/80 rounded-full w-full"></div>
            </div>
            <div class="flex items-center w-full max-w-[480px]">
              <div class="h-2.5 ms-2 bg-muted rounded-full w-full"></div>
              <div class="h-2.5 ms-2 bg-muted/80 rounded-full w-full"></div>
              <div class="h-2.5 ms-2 bg-muted/80 rounded-full w-24"></div>
            </div>
            <div class="flex items-center w-full max-w-[440px]">
              <div class="h-2.5 ms-2 bg-muted/80 rounded-full w-32"></div>
              <div class="h-2.5 ms-2 bg-muted/80 rounded-full w-24"></div>
              <div class="h-2.5 ms-2 bg-muted rounded-full w-full"></div>
            </div>
            <div class="flex items-center w-full max-w-[360px]">
              <div class="h-2.5 ms-2 bg-muted/80 rounded-full w-full"></div>
              <div class="h-2.5 ms-2 bg-muted rounded-full w-80"></div>
              <div class="h-2.5 ms-2 bg-muted/80 rounded-full w-full"></div>
            </div>
            <span class="sr-only">Loading...</span>
          </div>
        </div>
      </TabsContent>
      <Separator class="h-px mt-4 mb-2" />
    </div>
  </Tabs>
</template>

<style scoped>
:deep(.report-content p + p) {
  margin-top: 1rem;
}
</style>
