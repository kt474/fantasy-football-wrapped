<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from "vue";
import { useStore } from "../../store/store";

const store = useStore();

/*
Best/worst draft picks
Best/worst trades 
Best/worst waiver moves
Biggest blowouts
Unluckiest/luckiest

Overall League recap
League Champ
*/

const data = computed(() => {
  const currentLeague = store.leagueInfo[store.currentLeagueIndex];
});
const slides = [
  {
    title: "Your Year Wrapped",
    description: "Here's a look back at your 2025!",
  },
  {
    title: "Top Scorer",
    description: "Josh Allen",
    icon: "🏈",
    bg: "from-pink-800 to-gray-900",
  },
  {
    title: "Minutes Managed",
    description: "42000",
    icon: "⏱️",
    bg: "from-cyan-700 to-gray-900",
  },
  {
    title: "Trades Made",
    description: "12",
    icon: "🔄",
    bg: "from-purple-700 to-gray-900",
  },
  {
    title: "Trades Made",
    description: "12",
    icon: "🔄",
    bg: "from-purple-700 to-gray-900",
  },
  {
    title: "Trades Made",
    description: "12",
    icon: "🔄",
    bg: "from-purple-700 to-gray-900",
  },
  {
    title: "Trades Made",
    description: "12",
    icon: "🔄",
    bg: "from-purple-700 to-gray-900",
  },
  {
    title: "Trades Made",
    description: "12",
    icon: "🔄",
    bg: "from-purple-700 to-gray-900",
  },
];

const current = ref(0);
const progress = ref(0);

let timer: number | null = null;
let progressTimer: number | null = null;
const duration = 5000; // slide duration ms

const next = () => {
  if (current.value < slides.length - 1) {
    current.value++;
  } else {
    stopTimers();
  }
};

const prev = () => {
  if (current.value > 0) {
    current.value--;
  }
};

const stopTimers = () => {
  if (timer) clearTimeout(timer);
  if (progressTimer) clearInterval(progressTimer);
};

const startTimers = () => {
  stopTimers();
  progress.value = 0;

  // progress bar filler
  const step = 100 / (duration / 50);
  progressTimer = window.setInterval(() => {
    progress.value += step;
    if (progress.value >= 100) {
      progress.value = 100;
      clearInterval(progressTimer!);
    }
  }, 50);

  // auto-advance
  timer = window.setTimeout(() => {
    next();
  }, duration);
};

watch(current, () => {
  startTimers();
});

onMounted(() => {
  startTimers();
});

onUnmounted(() => {
  stopTimers();
});
</script>

<template>
  <div class="flex items-center justify-around gap-x-4">
    <button
      @click="prev"
      type="button"
      class="text-gray-700 border border-gray-700 hover:bg-gray-300 hover:text-white focus:ring-2 focus:outline-none focus:ring-gray-300 font-medium rounded-full text-sm p-2.5 text-center inline-flex items-center dark:border-gray-500 dark:text-gray-500 dark:hover:text-white dark:focus:ring-gray-800 dark:hover:bg-gray-500 h-12"
    >
      <svg
        class="w-6 h-6 text-gray-800 dark:text-white"
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        fill="none"
        viewBox="0 0 24 24"
      >
        <path
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="m15 19-7-7 7-7"
        />
      </svg>

      <span class="sr-only">Icon description</span>
    </button>
    <div
      class="w-[390px] max-w-full aspect-[9/19.5] bg-black rounded-3xl overflow-hidden"
    >
      <section
        v-for="(slide, idx) in slides"
        :key="idx"
        v-show="current === idx"
        class="relative flex flex-col items-center justify-center w-full h-screen px-8 text-white transition-all duration-700 ease-in-out rounded-xl"
        :class="`bg-gradient-to-br ${slide.bg}`"
      >
        <!-- Progress bar -->
        <div class="absolute flex gap-2 top-4 left-4 right-4">
          <div
            v-for="(s, i) in slides"
            :key="i"
            class="flex-1 h-1 overflow-hidden rounded bg-white/20"
          >
            <div
              v-if="i < current"
              class="h-full transition-all duration-300 bg-white"
              style="width: 100%"
            ></div>
            <div
              v-else-if="i === current"
              class="h-full transition-all duration-100 ease-linear bg-white"
              :style="{ width: progress + '%' }"
            ></div>
          </div>
        </div>

        <!-- Slide Content -->
        <transition name="fade" mode="out-in">
          <div :key="idx" class="text-center">
            <h1 class="mb-4 text-4xl font-extrabold md:text-6xl">
              {{ slide.title }}
            </h1>
            <p v-if="slide.icon" class="mb-4 text-6xl">
              {{ slide.icon }}
            </p>
            <p v-else class="text-2xl font-semibold md:text-4xl drop-shadow-lg">
              {{ slide.description }}
            </p>
          </div>
        </transition>
      </section>
    </div>
    <button
      @click="next"
      type="button"
      class="text-gray-700 border border-gray-700 hover:bg-gray-300 hover:text-white focus:ring-2 focus:outline-none focus:ring-gray-300 font-medium rounded-full text-sm p-2.5 text-center inline-flex items-center dark:border-gray-500 dark:text-gray-500 dark:hover:text-white dark:focus:ring-gray-800 dark:hover:bg-gray-500 h-12"
    >
      <svg
        class="w-6 h-6 text-gray-800 dark:text-white"
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        fill="none"
        viewBox="0 0 24 24"
      >
        <path
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="m9 5 7 7-7 7"
        />
      </svg>
      <span class="sr-only">Icon description</span>
    </button>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: all 0.6s ease;
}
.fade-enter-from {
  opacity: 0;
  transform: translateY(50px) scale(0.9);
}
.fade-leave-to {
  opacity: 0;
  transform: translateY(-50px) scale(0.9);
}
</style>
