<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import MarkdownIt from "markdown-it";
import DOMPurify from "dompurify";
import { Copy, Download } from "lucide-vue-next";
import { useAuthStore } from "@/store/auth";
import { useSubscriptionStore } from "@/store/subscription";
import { useStore } from "@/store/store";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Separator from "../ui/separator/Separator.vue";
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
}>();

const emit = defineEmits<{
  "update:tier": [value: string];
  "update:premiumCommentaryStyle": [value: string];
  "download-image": [];
  "copy-report": [];
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
          @click="emit('download-image')"
          :disabled="isGeneratingImage"
          size="sm"
          class="ml-auto mr-2"
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
                  <SelectItem value="roast">Roast (default)</SelectItem>
                  <SelectItem value="analytical">Analyst</SelectItem>
                  <SelectItem value="hype">Hype</SelectItem>
                  <SelectItem value="cutthroat">Cutthroat</SelectItem>
                  <SelectItem value="neutral">Neutral</SelectItem>
                  <SelectItem value="newspaper">Newspaper</SelectItem>
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
          <div v-if="premiumWeeklyReport" class="my-5 space-y-4">
            <header class="max-w-5xl">
              <h2
                class="max-w-4xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl text-pretty"
              >
                {{ premiumWeeklyReport.frontPage.headline }}
              </h2>
              <p class="max-w-3xl mt-2 text-lg text-muted-foreground">
                {{ premiumWeeklyReport.frontPage.subheadline }}
              </p>
              <p class="max-w-4xl mt-5 text-base leading-7">
                {{ premiumWeeklyReport.frontPage.lead }}
              </p>
            </header>

            <Separator />

            <section class="space-y-3">
              <div class="flex items-start gap-3">
                <div>
                  <h3 class="text-lg font-semibold">Matchup Reports</h3>
                  <p class="text-sm text-muted-foreground">
                    This week's head-to-head action.
                  </p>
                </div>
              </div>
              <div class="grid gap-4 lg:grid-cols-2">
                <Card
                  v-for="matchup in premiumWeeklyReport.matchupReports"
                  :key="`${matchup.bracket}-${matchup.matchupNumber}`"
                  class="shadow-sm"
                >
                  <CardHeader class="pb-3">
                    <CardTitle class="text-base leading-snug">
                      {{ matchup.headline }}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p class="text-base leading-7 text-foreground/90">
                      {{ matchup.recap }}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </section>

            <section class="space-y-3">
              <div class="flex items-start gap-3">
                <div>
                  <h3 class="text-lg font-semibold">Team of the Week</h3>
                  <p class="text-sm text-muted-foreground">
                    The week's top-scoring lineup.
                  </p>
                </div>
              </div>
              <Card class="shadow-sm">
                <CardHeader>
                  <div
                    class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div class="space-y-1.5">
                      <CardTitle class="text-xl">
                        {{ premiumWeeklyReport.teamOfTheWeek.teamName }}
                      </CardTitle>
                      <CardDescription class="text-base">
                        {{ premiumWeeklyReport.teamOfTheWeek.headline }}
                      </CardDescription>
                    </div>
                    <div class="shrink-0 sm:text-right">
                      <p class="text-2xl font-bold tabular-nums">
                        {{ premiumWeeklyReport.teamOfTheWeek.pointsScored }}
                      </p>
                      <p
                        class="text-xs font-medium tracking-wide uppercase text-muted-foreground"
                      >
                        Points
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p class="text-base leading-7 text-foreground/90">
                    {{ premiumWeeklyReport.teamOfTheWeek.analysis }}
                  </p>
                </CardContent>
              </Card>
            </section>

            <section class="space-y-3">
              <div class="flex items-start gap-3">
                <div>
                  <h3 class="text-lg font-semibold">Manager Blunders</h3>
                  <p class="text-sm text-muted-foreground">
                    The lineup decisions that shaped the week.
                  </p>
                </div>
              </div>
              <div class="grid gap-4 lg:grid-cols-2">
                <Card
                  v-for="entry in premiumWeeklyReport.managersBlotter.entries"
                  :key="`${entry.teamName}-${entry.category}`"
                  class="shadow-sm"
                >
                  <CardHeader>
                    <CardTitle class="text-xl">
                      {{ entry.teamName }}
                    </CardTitle>
                    <CardDescription class="text-base">
                      {{ entry.headline }}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p class="text-base leading-7 text-foreground/90">
                      {{ entry.analysis }}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </section>

            <p class="text-xs text-muted-foreground">
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
          <div v-else>
            <p class="max-w-3xl">
              Premium weekly reports include deeper analysis, more league
              context, and customizable commentary styles. Available with a
              <router-link
                :to="{ path: '/account', query: route.query }"
                class="font-medium cursor-pointer hover:underline"
                @click="store.currentTab = ''"
              >
                Premium subscription</router-link
              >.
            </p>
          </div>
        </div>
        <div v-else>
          <p class="max-w-3xl">
            Premium weekly reports include deeper analysis, more league context,
            and customizable commentary styles. Available with a
            <router-link
              :to="{ path: '/account', query: route.query }"
              class="font-medium cursor-pointer hover:underline"
              @click="store.currentTab = ''"
            >
              Premium subscription</router-link
            >.
          </p>
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
