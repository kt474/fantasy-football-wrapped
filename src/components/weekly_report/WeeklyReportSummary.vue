<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import MarkdownIt from "markdown-it";
import DOMPurify from "dompurify";
import { Copy, Download, LoaderCircle, Share2 } from "lucide-vue-next";
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

const props = defineProps<{
  tier: string;
  premiumCommentaryStyle: string;
  weeksLength: number;
  currentWeek: number;
  hasLeagues: boolean;
  hasLastScoredWeek: boolean;
  rawWeeklyReport: string;
  premiumWeeklyReport: PremiumReport | null;
  loading: boolean;
  premiumLoading: boolean;
  isGeneratingImage: boolean;
  isSharingReport: boolean;
}>();

const emit = defineEmits<{
  "update:tier": [value: string];
  "update:premiumCommentaryStyle": [value: string];
  "download-image": [];
  "copy-report": [];
  "share-report": [];
  "generate-premium": [];
}>();

const store = useStore();
const route = useRoute();
const authStore = useAuthStore();
const subscriptionStore = useSubscriptionStore();

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
});

const renderedWeeklyReport = computed(() =>
  DOMPurify.sanitize(md.render(props.rawWeeklyReport))
);

const canGeneratePremium = computed(
  () => authStore.isAuthenticated && subscriptionStore.isPremium
);

const showShareButton = computed(
  () => props.tier === "Premium" && Boolean(props.premiumWeeklyReport)
);

const premiumReportPreview: PremiumReport = {
  frontPage: {
    headline: "Fourth-Quarter Chaos Turns the League Upside Down",
    subheadline:
      "A statement win, a brutal bench decision, and one matchup nobody saw coming.",
    lead: "Week 8 delivered the kind of fantasy football drama that makes the group chat impossible to mute. The favorites survived, the standings tightened, and one manager left enough points on the bench to haunt the rest of the season.",
  },
  matchupReports: [
    {
      matchupNumber: 1,
      bracket: "winners",
      headline: "Sunday Night Rally Steals the Week",
      recap:
        "Gridiron Royalty erased a 22-point deficit behind a huge primetime performance, turning a comfortable lead into the week's most painful loss.",
    },
  ],
  teamOfTheWeek: {
    teamName: "Gridiron Royalty",
    pointsScored: 156.42,
    headline: "The lineup that could not miss",
    analysis:
      "Every starter contributed, three players cleared 25 points, and the league's highest score was never seriously threatened.",
  },
  managersBlotter: {
    headline: "Manager Blunders",
    entries: [
      {
        teamName: "Fourth and Regret",
        category: "bench_burn",
        headline: "The winning points watched from the bench",
        analysis:
          "A 31-point receiver sat behind a struggling starter, turning what should have been a comfortable win into a narrow loss.",
      },
    ],
  },
};
</script>

<template>
  <Tabs
    :model-value="tier"
    default-value="Standard"
    @update:model-value="emit('update:tier', String($event))"
  >
    <div>
      <div class="flex">
        <div class="flex flex-wrap sm:flex-nowrap">
          <p class="mb-2 text-xl font-bold">Summary</p>
          <TabsList class="sm:ml-4">
            <TabsTrigger value="Standard"> Standard </TabsTrigger>
            <TabsTrigger value="Premium"> Premium </TabsTrigger>
          </TabsList>
        </div>
        <Button
          v-if="showShareButton"
          @click="emit('share-report')"
          :disabled="isSharingReport"
          size="sm"
          class="ml-auto mr-2"
        >
          <LoaderCircle
            v-if="isSharingReport"
            class="mr-2 size-4 animate-spin"
          />
          <Share2 v-else class="mr-2 size-4" />
          Share
        </Button>
        <Button
          @click="emit('download-image')"
          :disabled="isGeneratingImage"
          variant="outline"
          size="sm"
          :class="['mr-2', { 'ml-auto': !showShareButton }]"
        >
          <Download />
        </Button>
        <Button @click="emit('copy-report')" variant="outline" size="sm">
          <Copy class="size-4" />
        </Button>
      </div>
      <p v-if="weeksLength === 0">Please come back after week 1!</p>
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
                <SelectTrigger class="w-44">
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
              @click="emit('generate-premium')"
              :disabled="!canGeneratePremium || premiumLoading"
              type="button"
              class="mt-5 ml-2"
              >Generate</Button
            >
          </div>
          <div v-if="premiumWeeklyReport" class="my-5">
            <PremiumReportContent :report="premiumWeeklyReport" />
            <p class="mt-4 text-xs text-muted-foreground">
              AI-generated report. Information provided may not always be
              accurate.
            </p>
          </div>
          <div v-else-if="premiumLoading && hasLastScoredWeek">
            <div role="status" class="space-y-2.5 animate-pulse max-w-lg mt-2">
              <p>Generating Premium Summary...</p>
              <div class="flex items-center w-full">
                <div
                  class="h-2.5 bg-gray-200 rounded-full dark:bg-gray-700 w-32"
                ></div>
                <div
                  class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-24"
                ></div>
                <div
                  class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-full"
                ></div>
              </div>
              <div class="flex items-center w-full max-w-[480px]">
                <div
                  class="h-2.5 bg-gray-200 rounded-full dark:bg-gray-700 w-full"
                ></div>
                <div
                  class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-full"
                ></div>
                <div
                  class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-24"
                ></div>
              </div>
              <div class="flex items-center w-full max-w-[400px]">
                <div
                  class="h-2.5 bg-gray-300 rounded-full dark:bg-gray-600 w-full"
                ></div>
                <div
                  class="h-2.5 ms-2 bg-gray-200 rounded-full dark:bg-gray-700 w-80"
                ></div>
                <div
                  class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-full"
                ></div>
              </div>
              <div class="flex items-center w-full max-w-[480px]">
                <div
                  class="h-2.5 ms-2 bg-gray-200 rounded-full dark:bg-gray-700 w-full"
                ></div>
                <div
                  class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-full"
                ></div>
                <div
                  class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-24"
                ></div>
              </div>
              <div class="flex items-center w-full max-w-[440px]">
                <div
                  class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-32"
                ></div>
                <div
                  class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-24"
                ></div>
                <div
                  class="h-2.5 ms-2 bg-gray-200 rounded-full dark:bg-gray-700 w-full"
                ></div>
              </div>
              <div class="flex items-center w-full max-w-[360px]">
                <div
                  class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-full"
                ></div>
                <div
                  class="h-2.5 ms-2 bg-gray-200 rounded-full dark:bg-gray-700 w-80"
                ></div>
                <div
                  class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-full"
                ></div>
              </div>
              <span class="sr-only">Loading...</span>
            </div>
          </div>
          <p v-else-if="canGeneratePremium" class="max-w-3xl">
            Choose a commentary style and generate your premium weekly report.
          </p>
          <div v-else class="max-w-4xl">
            <p class="max-w-3xl">
              Premium weekly reports provide deeper analysis with newsletter
              style coverage, including a front-page story, individual matchup
              reports, manager highlights/lowlights, and customizable commentary
              tones.
            </p>
            <p
              class="mt-5 mb-2 text-xs font-medium tracking-wide uppercase text-muted-foreground"
            >
              Sample premium report
            </p>
            <div
              class="relative max-h-[400px] overflow-hidden rounded-xl border p-4 sm:p-6"
            >
              <PremiumReportContent :report="premiumReportPreview" />
              <div
                class="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-background via-background/95 to-transparent"
              ></div>
              <div class="absolute inset-x-0 z-10 flex justify-center bottom-6">
                <Button as-child>
                  <router-link
                    :to="{ path: '/account', query: route.query }"
                    @click="store.currentTab = ''"
                  >
                    Unlock Premium Reports
                  </router-link>
                </Button>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="max-w-4xl">
          <p class="max-w-3xl">
            Premium weekly reports provide deeper analysis with newsletter
            coverage, including a front-page story, individual matchup reports,
            manager highlights/lowlights, and customizable commentary tones.
          </p>
          <p
            class="mt-5 mb-2 text-xs font-medium tracking-wide uppercase text-muted-foreground"
          >
            Sample premium report
          </p>
          <div
            class="relative max-h-[400px] overflow-hidden rounded-xl border p-4 sm:p-6"
          >
            <PremiumReportContent :report="premiumReportPreview" />
            <div
              class="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-background via-background/95 to-transparent"
            ></div>
            <div class="absolute inset-x-0 z-10 flex justify-center bottom-6">
              <Button as-child>
                <router-link
                  :to="{ path: '/account', query: route.query }"
                  @click="store.currentTab = ''"
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
          <div v-html="renderedWeeklyReport" class="mb-3 report-content"></div>
          <p class="text-xs text-muted-foreground">
            AI-generated report. Information provided may not always be
            accurate.
          </p>
          <p class="text-xs text-muted-foreground">
            If you enjoy these weekly reports please consider supporting this
            project by
            <a
              aria-label="buymeacoffee donation page"
              class="text-primary hover:underline"
              href="https://buymeacoffee.com/kt474"
              title="buymeacoffee donation page"
              target="_blank"
              rel="noopener noreferrer"
              >donating</a
            >
            or subscribing to the
            <router-link
              :to="{ path: '/account', query: route.query }"
              class="cursor-pointer text-primary hover:underline"
              @click="store.currentTab = ''"
              >Premium Tier</router-link
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
        <div v-else-if="loading && hasLastScoredWeek">
          <div role="status" class="space-y-2.5 animate-pulse max-w-lg">
            <p>Generating Summary...</p>
            <div class="flex items-center w-full">
              <div
                class="h-2.5 bg-gray-200 rounded-full dark:bg-gray-700 w-32"
              ></div>
              <div
                class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-24"
              ></div>
              <div
                class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-full"
              ></div>
            </div>
            <div class="flex items-center w-full max-w-[480px]">
              <div
                class="h-2.5 bg-gray-200 rounded-full dark:bg-gray-700 w-full"
              ></div>
              <div
                class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-full"
              ></div>
              <div
                class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-24"
              ></div>
            </div>
            <div class="flex items-center w-full max-w-[400px]">
              <div
                class="h-2.5 bg-gray-300 rounded-full dark:bg-gray-600 w-full"
              ></div>
              <div
                class="h-2.5 ms-2 bg-gray-200 rounded-full dark:bg-gray-700 w-80"
              ></div>
              <div
                class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-full"
              ></div>
            </div>
            <div class="flex items-center w-full max-w-[480px]">
              <div
                class="h-2.5 ms-2 bg-gray-200 rounded-full dark:bg-gray-700 w-full"
              ></div>
              <div
                class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-full"
              ></div>
              <div
                class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-24"
              ></div>
            </div>
            <div class="flex items-center w-full max-w-[440px]">
              <div
                class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-32"
              ></div>
              <div
                class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-24"
              ></div>
              <div
                class="h-2.5 ms-2 bg-gray-200 rounded-full dark:bg-gray-700 w-full"
              ></div>
            </div>
            <div class="flex items-center w-full max-w-[360px]">
              <div
                class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-full"
              ></div>
              <div
                class="h-2.5 ms-2 bg-gray-200 rounded-full dark:bg-gray-700 w-80"
              ></div>
              <div
                class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-full"
              ></div>
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
