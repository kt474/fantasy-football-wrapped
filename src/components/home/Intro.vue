<script setup lang="ts">
import { computed, ref } from "vue";
import LeagueInputForm from "@/components/shared/LeagueInputForm.vue";
import {
  useLeagueInput,
  type LeaguePlatform,
} from "@/composables/useLeagueInput";
import { useStore } from "@/store/store";
import IntroSections from "@/components/home/IntroSections.vue";
import Card from "../ui/card/Card.vue";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const store = useStore();
const isDark = computed(() => store.darkMode);

const activeTab = ref<"Sleeper" | "Espn">("Sleeper");
const platform = computed<LeaguePlatform>(() =>
  activeTab.value === "Espn" ? "espn" : "sleeper"
);

const {
  inputType,
  seasonYear,
  leagueIdInput,
  espnPrivate,
  espnSwid,
  espnS2,
  onSubmit,
} = useLeagueInput(platform);
</script>

<template>
  <section
    aria-labelledby="intro-home-heading"
    :class="[
      'relative overflow-hidden text-center min-h-[calc(100dvh-4rem)] bg-background',
      isDark ? 'intro-dark' : '',
    ]"
  >
    <div
      aria-hidden="true"
      :class="['absolute inset-0 saas-bg', isDark ? 'saas-bg-dark' : '']"
    />
    <div
      aria-hidden="true"
      :class="[
        'absolute -translate-x-1/2 rounded-full -top-28 left-1/2 size-96 blur-3xl',
        isDark ? 'bg-sky-500/[0.03]' : 'bg-sky-500/12',
      ]"
    />
    <div
      aria-hidden="true"
      :class="[
        'absolute rounded-full -bottom-24 -left-10 size-80 blur-3xl',
        isDark ? 'bg-blue-500/[0.02]' : 'bg-blue-500/10',
      ]"
    />

    <div
      class="relative z-10 flex min-h-[calc(100dvh-4rem)] items-start px-4 py-6 sm:px-8 sm:items-center lg:px-12"
    >
      <div class="w-full mx-auto max-w-7xl">
        <div
          class="grid items-center gap-8 min-[1240px]:grid-cols-2 min-[1240px]:gap-10 min-[1240px]:-translate-y-2"
        >
          <div
            class="w-full max-w-2xl mx-auto text-left animate-rise min-[1240px]:mx-0"
          >
            <p
              class="inline-flex items-center px-3 py-1 text-xs font-semibold border rounded-full border-border/80 bg-background/80 text-muted-foreground backdrop-blur"
            >
              Powering 13,000+ fantasy leagues
            </p>
            <h1
              id="intro-home-heading"
              class="max-w-xl mt-4 text-4xl font-bold lg:text-5xl xl:text-6xl"
            >
              All your
              <span
                class="text-transparent bg-gradient-to-r from-sky-500 to-blue-500 bg-clip-text"
              >
                fantasy football
              </span>
              league insights in one place
            </h1>

            <h2 class="max-w-lg mt-5 text-lg text-muted-foreground lg:text-xl">
              Analyze your league with power rankings, roster insights, custom
              weekly reports, playoff odds, and much more.
            </h2>
            <Card class="p-4 mt-8">
              <div class="mb-4 text-left">
                <p class="text-sm font-semibold">Get started</p>
                <p class="text-sm text-muted-foreground">
                  Select your platform then enter your league ID or username.
                </p>
              </div>
              <Tabs default-value="Sleeper" v-model="activeTab" class="mb-2">
                <TabsList
                  class="h-10 p-1 border rounded-md shadow-sm border-input bg-popover"
                >
                  <TabsTrigger
                    value="Sleeper"
                    class="hover:bg-muted/50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow"
                  >
                    <div class="flex items-center gap-1.5">
                      <img
                        width="16.5"
                        src="/sleeperlogo.webp"
                        alt="Sleeper logo"
                      />
                      <p>Sleeper</p>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger
                    value="Espn"
                    class="hover:bg-muted/50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow"
                  >
                    <div class="flex items-center gap-1.5">
                      <img width="16.5" src="/espnlogo.webp" alt="ESPN logo" />
                      <p>ESPN</p>
                      <span
                        class="rounded border border-primary/30 bg-primary/10 px-1 text-[10px] font-semibold uppercase text-primary"
                      >
                        Beta
                      </span>
                    </div>
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="Sleeper">
                  <LeagueInputForm
                    v-model:inputType="inputType"
                    v-model:seasonYear="seasonYear"
                    v-model:leagueIdInput="leagueIdInput"
                    platform="sleeper"
                    @submit="onSubmit"
                  />
                </TabsContent>
                <TabsContent value="Espn">
                  <LeagueInputForm
                    inputType="League ID"
                    v-model:seasonYear="seasonYear"
                    v-model:leagueIdInput="leagueIdInput"
                    v-model:espnPrivate="espnPrivate"
                    v-model:espnSwid="espnSwid"
                    v-model:espnS2="espnS2"
                    platform="espn"
                    @submit="onSubmit"
                  />
                </TabsContent>
              </Tabs>
            </Card>
          </div>

          <div
            aria-hidden="true"
            class="relative hidden h-[480px] overflow-hidden min-[1240px]:block"
          >
            <div
              class="absolute inset-0 z-20 pointer-events-none showcase-fade"
            />
            <div class="h-full animate-rise">
              <div class="showcase-lane-track">
                <div class="showcase-lane-list">
                  <slot name="header" />
                </div>
                <div class="showcase-lane-list" aria-hidden="true">
                  <slot name="header" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <IntroSections />
  </section>
</template>

<style scoped>
.saas-bg {
  background-image:
    radial-gradient(
      circle at 20% 10%,
      rgba(14, 165, 233, 0.08),
      transparent 32rem
    ),
    radial-gradient(
      circle at 82% 16%,
      rgba(59, 130, 246, 0.08),
      transparent 34rem
    ),
    radial-gradient(
      circle at 72% 64%,
      rgba(14, 165, 233, 0.035),
      transparent 28rem
    ),
    linear-gradient(
      to bottom,
      rgba(248, 250, 252, 0.86) 0%,
      rgba(248, 250, 252, 0.96) 48%,
      rgba(248, 250, 252, 1) 100%
    );
}

.saas-bg-dark {
  background-image:
    radial-gradient(
      circle at 20% 10%,
      rgba(14, 165, 233, 0.025),
      transparent 32rem
    ),
    radial-gradient(
      circle at 82% 16%,
      rgba(59, 130, 246, 0.03),
      transparent 34rem
    ),
    radial-gradient(
      circle at 72% 64%,
      rgba(14, 165, 233, 0.012),
      transparent 28rem
    ),
    linear-gradient(to bottom, hsl(222.2 20% 4.9%), hsl(222.2 20% 4.9%));
}

.saas-bg::after {
  content: "";
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(148, 163, 184, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(148, 163, 184, 0.05) 1px, transparent 1px);
  background-size: 36px 36px;
  mask-image: radial-gradient(circle at center, black, transparent 80%);
  pointer-events: none;
}

.saas-bg-dark::after {
  background-image:
    linear-gradient(rgba(148, 163, 184, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(148, 163, 184, 0.03) 1px, transparent 1px);
}

.showcase-lane-track {
  display: flex;
  flex-direction: column;
  animation: lane-scroll-up 90s linear infinite;
  will-change: transform;
  transform: translate3d(0, 0, 0);
  backface-visibility: hidden;
  contain: layout paint;
}

.showcase-lane-list {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

:slotted(*) {
  opacity: 0.75;
  transition: opacity 180ms ease;
}

.intro-dark :slotted(*) {
  opacity: 0.7;
}

:slotted(*:hover) {
  opacity: 0.9;
}

.showcase-fade {
  background: linear-gradient(
    to bottom,
    rgba(248, 250, 252, 1) 0%,
    rgba(248, 250, 252, 0) 14%,
    rgba(248, 250, 252, 0) 86%,
    rgba(248, 250, 252, 1) 100%
  );
}

.intro-dark .showcase-fade {
  background: linear-gradient(
    to bottom,
    rgba(10, 12, 16, 1) 0%,
    rgba(10, 12, 16, 0) 14%,
    rgba(10, 12, 16, 0) 86%,
    rgba(10, 12, 16, 1) 100%
  );
}

@keyframes lane-scroll-up {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(-50%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .showcase-lane-track {
    animation: none;
    transform: none;
  }

  :slotted(*) {
    transition: none;
  }
}
</style>
