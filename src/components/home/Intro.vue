<script setup lang="ts">
import { computed } from "vue";
import LeagueInputForm from "@/components/shared/LeagueInputForm.vue";
import { useLeagueInput } from "@/composables/useLeagueInput";
import { useStore } from "@/store/store";

const { inputType, seasonYear, leagueIdInput, onSubmit } = useLeagueInput();
const store = useStore();
const isDark = computed(() => store.darkMode);
</script>

<template>
  <section
    :class="[
      'relative overflow-hidden text-center h-dvh',
      isDark ? 'bg-slate-950' : 'bg-slate-50',
    ]"
  >
    <div :class="['absolute inset-0 saas-bg', isDark ? 'saas-bg-dark' : '']" />
    <div
      :class="[
        'absolute -translate-x-1/2 rounded-full -top-28 left-1/2 size-96 blur-3xl',
        isDark ? 'bg-sky-500/5' : 'bg-sky-500/12',
      ]"
    />
    <div
      :class="[
        'absolute rounded-full -bottom-24 -left-10 size-80 blur-3xl',
        isDark ? 'bg-blue-500/[0.03]' : 'bg-blue-500/10',
      ]"
    />

    <div
      class="relative z-10 flex items-center h-full px-4 py-6 sm:px-8 sm:py-8 lg:px-12 lg:py-10"
    >
      <div class="mx-auto max-w-7xl">
        <div class="grid items-center gap-8 lg:grid-cols-2 lg:gap-10">
          <div class="text-left animate-rise">
            <p
              class="inline-flex items-center px-3 py-1 text-xs font-semibold border rounded-full border-border/80 bg-background/80 text-muted-foreground backdrop-blur"
            >
              Powering 12,000+ fantasy leagues
            </p>
            <h1
              class="mt-4 text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl"
            >
              All your
              <span
                class="text-transparent bg-gradient-to-r from-sky-500 to-blue-500 bg-clip-text"
              >
                fantasy football
              </span>
              league insights in one place
            </h1>

            <p class="max-w-lg mt-5 text-lg text-muted-foreground lg:text-xl">
              Analyze your league with power rankings, roster insights, custom
              weekly reports, playoff odds, and much more.
            </p>
            <div
              class="max-w-4xl p-5 mx-auto mt-8 border rounded-md shadow-lg border-border/80 bg-background/90 backdrop-blur sm:p-6"
            >
              <div class="mb-4 text-left">
                <p class="text-sm font-semibold">Add League</p>
                <p class="text-sm text-muted-foreground">
                  Enter your Sleeper league ID or username.
                </p>
              </div>
              <LeagueInputForm
                v-model:inputType="inputType"
                v-model:seasonYear="seasonYear"
                v-model:leagueIdInput="leagueIdInput"
                @submit="onSubmit"
              />
            </div>
          </div>

          <div class="hidden animate-rise-delayed md:block">
            <div
              class="max-w-xl p-5 mx-auto text-left border rounded-md shadow-2xl border-border/70 bg-background/85 backdrop-blur"
            >
              <div class="flex items-center justify-between mb-4">
                <div>
                  <p class="text-sm text-muted-foreground">League Snapshot</p>
                  <p class="font-semibold">KJ Dynasty 2025</p>
                </div>
                <span
                  class="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                >
                  +12% win outlook
                </span>
              </div>

              <div class="grid grid-cols-3 gap-3">
                <div class="p-3 border rounded-xl border-border/70 bg-card">
                  <p class="text-xs text-muted-foreground">Record</p>
                  <p class="text-xl font-semibold">8-3</p>
                </div>
                <div class="p-3 border rounded-xl border-border/70 bg-card">
                  <p class="text-xs text-muted-foreground">Power Rank</p>
                  <p class="text-xl font-semibold">#2</p>
                </div>
                <div class="p-3 border rounded-xl border-border/70 bg-card">
                  <p class="text-xs text-muted-foreground">Bench Value</p>
                  <p class="text-xl font-semibold">91.4</p>
                </div>
              </div>

              <div class="p-4 mt-4 border rounded-xl border-border/70 bg-card">
                <div
                  class="flex items-center justify-between mb-2 text-xs text-muted-foreground"
                >
                  <span>Weekly Trend</span>
                  <span>Last 6 weeks</span>
                </div>
                <div class="flex items-end h-24 gap-2">
                  <span
                    class="w-full rounded-t h-9 bg-sky-300/75 dark:bg-sky-700/80"
                  />
                  <span
                    class="w-full h-12 rounded-t bg-sky-400/75 dark:bg-sky-600/80"
                  />
                  <span
                    class="w-full h-8 rounded-t bg-sky-300/75 dark:bg-sky-700/80"
                  />
                  <span
                    class="w-full h-16 rounded-t bg-blue-400/80 dark:bg-blue-600/85"
                  />
                  <span
                    class="w-full h-20 rounded-t bg-blue-500/85 dark:bg-blue-500/90"
                  />
                  <span
                    class="w-full rounded-t h-[4.5rem] bg-blue-400/80 dark:bg-blue-600/85"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          class="grid grid-cols-3 gap-3 mt-6 text-left md:hidden animate-rise-delayed"
        >
          <div
            class="p-3 border rounded-xl border-border/70 bg-background/85 backdrop-blur"
          >
            <p class="text-xs text-muted-foreground">Record</p>
            <p class="text-lg font-semibold">8-3</p>
          </div>
          <div
            class="p-3 border rounded-xl border-border/70 bg-background/85 backdrop-blur"
          >
            <p class="text-xs text-muted-foreground">Power Rank</p>
            <p class="text-lg font-semibold">#2</p>
          </div>
          <div
            class="p-3 border rounded-xl border-border/70 bg-background/85 backdrop-blur"
          >
            <p class="text-xs text-muted-foreground">Win Outlook</p>
            <p
              class="text-lg font-semibold text-emerald-600 dark:text-emerald-400"
            >
              +12%
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.saas-bg {
  background-image:
    radial-gradient(
      circle at 20% 12%,
      rgba(14, 165, 233, 0.08),
      transparent 35%
    ),
    radial-gradient(
      circle at 82% 20%,
      rgba(59, 130, 246, 0.09),
      transparent 38%
    ),
    linear-gradient(to bottom, rgba(248, 250, 252, 0.8), rgba(248, 250, 252, 1));
}

.saas-bg-dark {
  background-image:
    radial-gradient(
      circle at 20% 12%,
      rgba(14, 165, 233, 0.04),
      transparent 35%
    ),
    radial-gradient(
      circle at 82% 20%,
      rgba(59, 130, 246, 0.05),
      transparent 38%
    ),
    linear-gradient(to bottom, rgba(2, 6, 23, 0.96), rgba(2, 6, 23, 1));
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

.animate-rise {
  animation: rise 520ms ease-out;
}

.animate-rise-delayed {
  animation: rise 680ms ease-out;
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
