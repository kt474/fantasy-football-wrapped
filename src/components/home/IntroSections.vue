<script setup lang="ts">
import { onMounted, onUnmounted, ref, type Component } from "vue";
import { useDocumentVisibility, useElementVisibility } from "@vueuse/core";
import Card from "@/components/ui/card/Card.vue";
import {
  Move3D,
  FlaskConical,
  ChartNoAxesCombined,
  FolderClock,
  NotebookPen,
  Trophy,
} from "lucide-vue-next";

type ToolSummary = {
  title: string;
  description: string;
  icon: Component;
};

type Testimonial = {
  quote: string;
  author: string;
  detail: string;
  url: string;
};

const testimonials: Testimonial[] = [
  {
    quote:
      "This is really cool! You should read our Sleeper Minis - Developer Guide and consider submitting this for a Mini in the Sleeper App!",
    author: "Sleeper_Official",
    detail: "Sleeper Social Media Team",

    url: "https://www.reddit.com/r/fantasyfootball/comments/1hwvuty/comment/m65vimk/?utm_source=share&utm_medium=web3x&utm_name=web3xcss&utm_term=1&utm_content=share_button",
  },
  {
    quote:
      "Really impressive! Added our league ID and laughing out loud at the AI summaries of our season and playoffs. Amazing work!",
    author: "r/fantasyfootball",
    detail: "Community comment",

    url: "https://www.reddit.com/r/fantasyfootball/comments/1hwvuty/comment/m64tmj9/?utm_source=share&utm_medium=web3x&utm_name=web3xcss&utm_term=1&utm_content=share_button",
  },
  {
    quote:
      "Absolutely amazing, too bad it's not upvoted that much. This might be the best ff content that I've ever seen.",
    author: "r/fantasyfootball",
    detail: "Community comment",

    url: "https://www.reddit.com/r/fantasyfootball/comments/1p6fc4t/comment/nqqfxe4/?utm_source=share&utm_medium=web3x&utm_name=web3xcss&utm_term=1&utm_content=share_button",
  },
  {
    quote:
      "Dude!!!! Amazing! I did not know this existed! Holy crap we love it!!! The week write up is perfection",
    author: "r/FFCommish",
    detail: "Community comment",

    url: "https://www.reddit.com/r/FFCommish/comments/1ndlgl9/comment/ndl1p0f/?utm_source=share&utm_medium=web3x&utm_name=web3xcss&utm_term=1&utm_content=share_button",
  },
];

const activeTestimonialIndex = ref(0);
const testimonialDeck = ref<HTMLElement | null>(null);
const documentVisibility = useDocumentVisibility();
const testimonialDeckIsVisible = useElementVisibility(testimonialDeck);
let testimonialInterval: number | undefined;

const getTestimonialPosition = (index: number) =>
  (index - activeTestimonialIndex.value + testimonials.length) %
  testimonials.length;

const getTestimonialStyle = (index: number) => {
  const position = getTestimonialPosition(index);
  const visiblePosition = Math.min(position, 3);
  const stackStates = [
    {
      opacity: 1,
      transform: "translate3d(0, 42px, 0) scale(1) rotate(-0.2deg)",
      boxShadow: "0 18px 45px hsl(var(--foreground) / 0.08)",
    },
    {
      opacity: 0.84,
      transform: "translate3d(0, 15px, -18px) scale(0.965) rotate(0.35deg)",
      boxShadow: "0 12px 32px hsl(var(--foreground) / 0.055)",
    },
    {
      opacity: 0.64,
      transform: "translate3d(0, -8px, -36px) scale(0.93) rotate(-0.45deg)",
      boxShadow: "0 8px 22px hsl(var(--foreground) / 0.04)",
    },
    {
      opacity: 0,
      transform: "translate3d(0, -30px, -54px) scale(0.9) rotate(0.45deg)",
      boxShadow: "0 4px 14px hsl(var(--foreground) / 0.03)",
    },
  ];
  const state = stackStates[visiblePosition];
  return {
    opacity: state.opacity,
    transform: state.transform,
    boxShadow: state.boxShadow,
    zIndex: stackStates.length - visiblePosition,
  };
};

onMounted(() => {
  testimonialInterval = window.setInterval(() => {
    if (
      documentVisibility.value !== "visible" ||
      !testimonialDeckIsVisible.value
    ) {
      return;
    }
    activeTestimonialIndex.value =
      (activeTestimonialIndex.value + 1) % testimonials.length;
  }, 4200);
});

onUnmounted(() => {
  if (testimonialInterval) {
    window.clearInterval(testimonialInterval);
  }
});

const toolSummaries: ToolSummary[] = [
  {
    title: "Power rankings and standings",
    description:
      "Compare teams by record, scoring, expected wins, power rankings, and roster strength.",
    icon: ChartNoAxesCombined,
  },
  {
    title: "Weekly reports",
    description:
      "Generate custom matchup reports, previews, and league storylines.",
    icon: NotebookPen,
  },
  {
    title: "Roster management",
    description: "See which managers are making the smartest waiver moves.",
    icon: Move3D,
  },
  {
    title: "Playoff odds",
    description:
      "Calculate each team's path to the bracket with final placement odds and simulated outcomes.",
    icon: Trophy,
  },
  {
    title: "Trade tools",
    description:
      "Explore fair trade ideas and compare deals made in other leagues.",
    icon: FlaskConical,
  },
  {
    title: "League history",
    description:
      "Review all-time records, H2H matchups, and manager rivalries.",
    icon: FolderClock,
  },
];
</script>

<template>
  <div class="relative z-10 px-4 pt-12 pb-16 sm:px-8 sm:pt-0 lg:px-12">
    <div class="w-full mx-auto text-left space-y-14 max-w-7xl">
      <section
        aria-labelledby="intro-testimonials-heading"
        class="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center"
      >
        <div class="max-w-xl mx-auto">
          <h2
            id="intro-testimonials-heading"
            class="text-3xl font-bold md:text-4xl"
          >
            Analysis your league will actually talk about
          </h2>
          <p class="mt-4 leading-7 sm:text-lg text-muted-foreground">
            Turn matchups, manager trends, power rankings, and league history
            into shareable stories. All for free.
          </p>

          <div class="grid max-w-lg grid-cols-3 mt-6 divide-x divide-border">
            <div class="pr-5">
              <p class="text-xl font-semibold sm:text-2xl">13,000+</p>
              <p class="mt-1 text-xs text-muted-foreground">
                Unique leagues entered
              </p>
            </div>
            <div class="px-5">
              <p class="text-xl font-semibold sm:text-2xl">50,000+</p>
              <p class="mt-1 text-xs text-muted-foreground">
                Reports generated
              </p>
            </div>
            <div class="pl-5">
              <p class="text-xl font-semibold sm:text-2xl">No login</p>
              <p class="mt-1 text-xs text-muted-foreground">Needed to start</p>
            </div>
          </div>
        </div>

        <div
          ref="testimonialDeck"
          class="testimonial-deck relative mt-12 mx-auto h-[330px] w-full max-w-xl"
        >
          <Card
            v-for="(testimonial, index) in testimonials"
            :key="testimonial.quote"
            class="absolute inset-x-0 top-0 shadow-md rounded-xl testimonial-card border-border/80 bg-background/95"
            :style="getTestimonialStyle(index)"
          >
            <div
              class="flex items-start justify-between gap-4 px-5 py-4 border-b"
            >
              <div class="flex items-center gap-3">
                <img
                  v-if="index === 0"
                  class="rounded-full"
                  width="32"
                  :src="'/sleeperlogo.webp'"
                  alt="Sleeper logo"
                />
                <img
                  v-else
                  class="rounded-full"
                  width="32"
                  :src="'/reddit.webp'"
                  alt="Reddit logo"
                />
                <div>
                  <p class="text-sm font-semibold">
                    {{ testimonial.author }}
                  </p>
                  <p class="mt-1 text-xs text-muted-foreground">
                    {{ testimonial.detail }}
                  </p>
                </div>
              </div>
            </div>
            <blockquote class="px-5 py-5">
              <a
                :href="testimonial.url"
                target="_blank"
                rel="noopener noreferrer"
                class="transition-colors text-muted-foreground hover:underline"
                :aria-label="`Read ${testimonial.author}'s original Reddit comment`"
              >
                "{{ testimonial.quote }}"
              </a>
            </blockquote>
          </Card>
        </div>
      </section>

      <section aria-labelledby="intro-tools-heading" class="pt-4">
        <div class="max-w-3xl mx-auto text-center">
          <h2
            id="intro-tools-heading"
            class="mt-3 text-3xl font-bold md:text-4xl"
          >
            Explore your league from every angle
          </h2>
          <p
            data-nosnippet
            class="max-w-xl mx-auto mt-4 leading-7 sm:text-lg text-muted-foreground"
          >
            Try the demo league or enter your own, then dig into the numbers,
            decisions, and outcomes behind every season.
          </p>
        </div>

        <div class="mt-12 bg-transparent tool-grid border-x border-border/80">
          <div
            v-for="tool in toolSummaries"
            :key="tool.title"
            class="p-8 transition-colors tool-cell group hover:bg-muted/20"
          >
            <component :is="tool.icon" class="transition-colors size-6" />
            <h3 class="text-xl font-semibold mt-7">
              {{ tool.title }}
            </h3>
            <p class="max-w-sm mt-4 text-sm leading-6 text-muted-foreground">
              {{ tool.description }}
            </p>
          </div>
          <div class="premium-cell">
            <div class="max-w-3xl">
              <h3 class="mt-2 text-2xl font-semibold">
                Premium features for leagues that want more
              </h3>
              <p class="mt-4 text-sm leading-6 text-muted-foreground">
                Optional
                <router-link
                  :to="{
                    path: '/account',
                    query: $route.query,
                    state: { scrollToPricing: true },
                  }"
                  class="font-medium text-primary hover:underline"
                >
                  Premium
                </router-link>
                features turn every week into a shareable
                <a
                  href="https://ffwrapped.com/report/1BJ_ktCJQl1Ocjwy"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="font-medium text-primary hover:underline"
                  >league newsletter</a
                >
                and
                <RouterLink
                  to="/fantasy-football-video-recap-example"
                  class="font-medium text-primary hover:underline"
                >
                  video recap</RouterLink
                >, reveal what your league's full history says about every
                manager, and give you the receipts to settle old rivalries.
                Everything else from the past three seasons, plus plenty more,
                is still free.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.testimonial-deck {
  perspective: 1200px;
  transform-style: preserve-3d;
}

.testimonial-card {
  min-height: 13.5rem;
  overflow: hidden;
  transform-origin: center top;
  transition:
    opacity 720ms ease,
    transform 620ms cubic-bezier(0.2, 0.8, 0.2, 1),
    box-shadow 720ms ease;
}

@media (min-width: 1024px) {
  .testimonial-card {
    will-change: opacity, transform;
  }
}

.tool-grid {
  display: grid;
  grid-template-columns: 1fr;
}

.tool-cell {
  position: relative;
}

.tool-cell::before {
  content: "";
  position: absolute;
  top: 8rem;
  left: -1px;
  width: 6px;
  height: 2.25rem;
  border-radius: 0 999px 999px 0;
  background: hsl(var(--border));
  transition: background-color 180ms ease;
}

.tool-cell:hover::before {
  background: hsl(var(--foreground) / 0.28);
}

.tool-cell:not(:last-child) {
  border-bottom: 1px solid hsl(var(--border) / 0.8);
}

.premium-cell {
  grid-column: 1 / -1;
  padding: 2rem;
}

@media (min-width: 640px) {
  .tool-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .tool-cell:nth-child(odd) {
    border-right: 1px solid hsl(var(--border) / 0.8);
  }

  .tool-cell:nth-last-child(2) {
    border-bottom: 1px solid hsl(var(--border) / 0.8);
  }
}

@media (min-width: 1024px) {
  .tool-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .tool-cell:nth-child(odd) {
    border-right: 0;
  }

  .tool-cell:not(:nth-child(3n)) {
    border-right: 1px solid hsl(var(--border) / 0.8);
  }

  .tool-cell:nth-child(n + 4) {
    border-bottom: 1px solid hsl(var(--border) / 0.8);
  }
}

@media (prefers-reduced-motion: reduce) {
  .testimonial-card {
    transition: none;
  }
}
</style>
