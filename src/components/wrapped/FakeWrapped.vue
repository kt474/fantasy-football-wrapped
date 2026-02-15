<script setup lang="ts">
import WrappedSlide from "./WrappedSlide.vue";
</script>

<template>
  <div
    class="w-full h-screen my-4 overflow-y-scroll font-sans text-white rounded-lg z-1 snap-y snap-mandatory bg-zinc-900 scroll-smooth"
  >
    <WrappedSlide bg-color="bg-gradient-to-r from-green-950 to-gray-900">
      <div class="absolute inset-0 pointer-events-none">
        <div
          class="absolute rounded-full w-80 h-80 bg-green-500/20 blur-3xl top-10 left-10"
          style="animation: float-slow 10s ease-in-out infinite"
        ></div>
        <div
          class="absolute rounded-full w-96 h-96 bg-lime-500/18 blur-3xl bottom-10 right-10"
          style="animation: float-slower 12s ease-in-out infinite"
        ></div>
        <div
          class="absolute w-56 h-56 rounded-full bg-green-400/15 blur-2xl top-1/3 left-1/2"
          style="animation: float 8s ease-in-out infinite"
        ></div>
      </div>
      <div class="">
        <h1 class="text-5xl font-bold md:text-8xl text-neutral-100">2025</h1>
        <h1
          class="mb-8 text-6xl font-bold text-transparent md:text-9xl bg-gradient-to-r from-green-400 to-lime-600 bg-clip-text"
        >
          Wrapped
        </h1>

        <p
          class="mx-auto text-lg text-gray-400 md:text-xl sm:w-96 text-balance"
        >
          Come back after Week 17 and enter your league ID to see your league's
          <span class="font-bold text-gray-200">Wrapped</span>!
        </p>
      </div>
    </WrappedSlide>
  </div>
</template>
