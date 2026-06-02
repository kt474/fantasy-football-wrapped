<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { Button } from "@/components/ui/button";
import Badge from "@/components/ui/badge/Badge.vue";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AudioRecap from "./AudioRecap.vue";
import {
  ChartNoAxesColumnIncreasing,
  Flame,
  Lock,
  MessageSquareQuote,
  Mic2,
  Newspaper,
  Sparkles,
  Trophy,
} from "lucide-vue-next";
import type { PremiumLeagueReport } from "@/types/premiumReport";

const props = defineProps<{
  hasLeague: boolean;
  isAuthenticated: boolean;
  isPremium: boolean;
  isLoading: boolean;
  hasLastScoredWeek: boolean;
  reportHtml: string;
  structuredReport: PremiumLeagueReport | null;
  rawReport: string;
  audioText: string;
  fileName: string;
}>();

const commentaryStyle = defineModel<string>("commentaryStyle", {
  required: true,
});

const emit = defineEmits<{
  generate: [];
}>();

const hasReport = computed(
  () => props.rawReport.trim().length > 0 || props.structuredReport !== null
);
const canGenerate = computed(
  () => props.hasLeague && props.isAuthenticated && props.isPremium
);
const shouldShowLockedPreview = computed(
  () => !hasReport.value && (!props.isAuthenticated || !props.isPremium)
);

const generateButtonLabel = computed(() => {
  if (props.isLoading) return "Writing report...";
  if (!props.isAuthenticated) return "Sign in to unlock";
  if (!props.isPremium) return "Unlock Season Pass";
  return hasReport.value ? "Regenerate League Report" : "Generate League Report";
});

const ctaPath = computed(() =>
  props.isAuthenticated && props.isPremium ? undefined : "/account"
);

const lockedSections = [
  {
    title: "League Headline",
    description: "A sharper opening story for the week.",
    icon: Newspaper,
  },
  {
    title: "Matchup Drama",
    description: "Big wins, painful losses, and turning points.",
    icon: Flame,
  },
  {
    title: "Bench Regrets",
    description: "The sit/start misses everyone will remember.",
    icon: MessageSquareQuote,
  },
  {
    title: "Manager Callouts",
    description: "Team-specific notes with more personality.",
    icon: Trophy,
  },
  {
    title: "Playoff Movement",
    description: "How the week changed the league race.",
    icon: ChartNoAxesColumnIncreasing,
  },
  {
    title: "Audio Recap",
    description: "A podcast-style version of the report.",
    icon: Mic2,
  },
];

const sampleReport: PremiumLeagueReport = {
  eyebrow: "Week 14 League Report",
  headline: "Saquondo Survives The Shootout While The Princess Keeps The Crown",
  intro:
    "Week 14 had a little bit of everything: a top-seed flex, a one-score heartbreaker, and enough bench regret to keep the group chat busy until waivers clear.",
  sections: [
    {
      title: "Matchup Drama",
      kicker: "Game of the week",
      body: "Saquondo escaped LaPorta Potty 129.62 to 123.26 in the kind of matchup that makes both managers stare at their app until Monday night. Deebo Samuel did the heavy lifting, while Tee Higgins kept LaPorta close enough to make every late stat correction feel personal.",
    },
    {
      title: "Bench Regrets",
      kicker: "Pain index: high",
      body: "Bijan Mustard left Patrick Mahomes on the bench for 26 points, which is the sort of decision that sounds reasonable before kickoff and like evidence in court afterward. Jameson Williams and Zach Ertz also joined the weekly museum of unused points.",
    },
    {
      title: "Manager Callouts",
      kicker: "Identity check",
      body: "The Princess McBride continues to look like the league's most stable contender: not always flashy, rarely sloppy, and usually holding the better Sunday night sweat. Dak to the Future, meanwhile, is drifting into spoiler territory with a roster that still has just enough talent to ruin someone's week.",
    },
    {
      title: "Playoff Movement",
      kicker: "Race status",
      body: "The top of the standings is starting to harden, but the middle remains wonderfully uncomfortable. Baby Back Gibbs and Breece's Puffs both grabbed useful wins, while the teams sitting around .500 are officially out of time for moral victories.",
    },
  ],
  shareCaption:
    "Saquondo wins the week's thriller, The Princess McBride holds first, and the bench points are getting loud.",
};
</script>

<template>
  <div class="space-y-4">
    <div
      class="flex flex-col gap-4 rounded-lg border bg-muted/30 p-4 sm:flex-row sm:items-end sm:justify-between"
    >
      <div>
        <div class="flex flex-wrap items-center gap-2">
          <p class="text-xl font-bold">League Report</p>
          <Badge class="gap-1">
            <Sparkles class="size-3.5" />
            Season Pass
          </Badge>
        </div>
        <p class="mt-2 max-w-2xl text-sm text-muted-foreground">
          A deeper weekly write-up with league context, manager callouts,
          commentary styles, and an audio recap.
        </p>
      </div>
      <div class="flex flex-wrap items-end gap-2">
        <div>
          <p class="mb-1 text-xs font-medium text-muted-foreground">
            Commentary Style
          </p>
          <Select v-model="commentaryStyle">
            <SelectTrigger class="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="roast">Roast</SelectItem>
              <SelectItem value="analytical">Analyst</SelectItem>
              <SelectItem value="hype">Hype</SelectItem>
              <SelectItem value="cutthroat">Cutthroat</SelectItem>
              <SelectItem value="neutral">Neutral</SelectItem>
              <SelectItem value="newspaper">Newspaper</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          v-if="canGenerate"
          type="button"
          :disabled="isLoading"
          @click="emit('generate')"
        >
          {{ generateButtonLabel }}
        </Button>
        <Button v-else as-child>
          <RouterLink :to="{ path: ctaPath, query: $route.query }">
            <Lock class="mr-2 size-4" />
            {{ generateButtonLabel }}
          </RouterLink>
        </Button>
      </div>
    </div>

    <div v-if="structuredReport">
      <div class="rounded-lg border bg-background p-4 md:p-5">
        <div class="flex flex-wrap items-center gap-2">
          <Badge variant="outline">League Report</Badge>
          <p
            v-if="structuredReport.eyebrow"
            class="text-xs font-medium uppercase text-muted-foreground"
          >
            {{ structuredReport.eyebrow }}
          </p>
        </div>
        <h3 class="mt-3 max-w-3xl text-2xl font-bold leading-tight">
          {{ structuredReport.headline }}
        </h3>
        <p class="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          {{ structuredReport.intro }}
        </p>
        <div class="mt-5 grid gap-3 md:grid-cols-2">
          <section
            v-for="section in structuredReport.sections"
            :key="`${section.kicker}-${section.title}`"
            class="rounded-lg border p-4"
          >
            <p class="text-xs font-medium uppercase text-muted-foreground">
              {{ section.kicker }}
            </p>
            <h4 class="mt-1 text-base font-semibold">{{ section.title }}</h4>
            <p class="mt-2 text-sm leading-relaxed text-muted-foreground">
              {{ section.body }}
            </p>
          </section>
        </div>
        <div class="mt-4 rounded-md bg-secondary p-3">
          <p class="text-xs font-medium uppercase text-muted-foreground">
            Share caption
          </p>
          <p class="mt-1 text-sm">{{ structuredReport.shareCaption }}</p>
        </div>
      </div>
      <p class="text-xs text-muted-foreground">
        AI-generated report. Information provided may not always be accurate.
      </p>
      <AudioRecap :recap-text="audioText" :file-name="fileName" />
    </div>

    <div v-else-if="hasReport">
      <div v-html="reportHtml" class="my-2.5 report-content"></div>
      <p class="text-xs text-muted-foreground">
        AI-generated report. Information provided may not always be accurate.
      </p>
      <AudioRecap :recap-text="audioText" :file-name="fileName" />
    </div>

    <div v-else-if="isLoading && hasLastScoredWeek">
      <div role="status" class="mt-2 max-w-lg space-y-2.5 animate-pulse">
        <p>Writing this week's league report...</p>
        <div class="flex items-center w-full">
          <div class="h-2.5 w-32 rounded-full bg-gray-200 dark:bg-gray-700"></div>
          <div class="ms-2 h-2.5 w-24 rounded-full bg-gray-300 dark:bg-gray-600"></div>
          <div class="ms-2 h-2.5 w-full rounded-full bg-gray-300 dark:bg-gray-600"></div>
        </div>
        <div class="flex max-w-[480px] items-center w-full">
          <div class="h-2.5 w-full rounded-full bg-gray-200 dark:bg-gray-700"></div>
          <div class="ms-2 h-2.5 w-full rounded-full bg-gray-300 dark:bg-gray-600"></div>
          <div class="ms-2 h-2.5 w-24 rounded-full bg-gray-300 dark:bg-gray-600"></div>
        </div>
        <div class="flex max-w-[400px] items-center w-full">
          <div class="h-2.5 w-full rounded-full bg-gray-300 dark:bg-gray-600"></div>
          <div class="ms-2 h-2.5 w-80 rounded-full bg-gray-200 dark:bg-gray-700"></div>
          <div class="ms-2 h-2.5 w-full rounded-full bg-gray-300 dark:bg-gray-600"></div>
        </div>
        <span class="sr-only">Loading...</span>
      </div>
    </div>

    <div v-else class="space-y-4">
      <div class="rounded-lg border bg-background p-4 md:p-5">
        <div class="flex flex-wrap items-center gap-2">
          <Badge variant="outline">Sample format</Badge>
          <p class="text-xs font-medium uppercase text-muted-foreground">
            {{ sampleReport.eyebrow }}
          </p>
        </div>
        <h3 class="mt-3 max-w-3xl text-2xl font-bold leading-tight">
          {{ sampleReport.headline }}
        </h3>
        <p class="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          {{ sampleReport.intro }}
        </p>
        <div class="mt-5 grid gap-3 md:grid-cols-2">
          <section
            v-for="section in sampleReport.sections"
            :key="section.title"
            class="rounded-lg border p-4"
          >
            <p class="text-xs font-medium uppercase text-muted-foreground">
              {{ section.kicker }}
            </p>
            <h4 class="mt-1 text-base font-semibold">{{ section.title }}</h4>
            <p class="mt-2 text-sm leading-relaxed text-muted-foreground">
              {{ section.body }}
            </p>
          </section>
        </div>
        <div class="mt-4 rounded-md bg-secondary p-3">
          <p class="text-xs font-medium uppercase text-muted-foreground">
            Share caption
          </p>
          <p class="mt-1 text-sm">{{ sampleReport.shareCaption }}</p>
        </div>
      </div>
    </div>

    <div v-if="shouldShowLockedPreview" class="space-y-4">
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="section in lockedSections"
          :key="section.title"
          class="rounded-lg border bg-background p-4"
        >
          <div class="flex items-start gap-3">
            <div class="rounded-md bg-secondary p-2">
              <component :is="section.icon" class="size-4" />
            </div>
            <div>
              <p class="font-semibold">{{ section.title }}</p>
              <p class="mt-1 text-sm text-muted-foreground">
                {{ section.description }}
              </p>
            </div>
          </div>
        </div>
      </div>
      <p class="max-w-3xl text-sm text-muted-foreground">
        Your standard recap stays free. Season Pass unlocks the fuller weekly
        league artifact built for sharing with the group chat.
      </p>
    </div>
  </div>
</template>
