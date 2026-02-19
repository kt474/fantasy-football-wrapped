<script setup lang="ts">
import LeagueInputForm from "@/components/shared/LeagueInputForm.vue";
import { useLeagueInput } from "@/composables/useLeagueInput";

const { inputType, seasonYear, leagueIdInput, onSubmit } = useLeagueInput();
</script>
<template>
  <div class="text-center">
    <div class="mt-40">
      <h1
        class="px-4 font-bold tracking-tight text-center custom-font-size sm:leading-none lg:px-24 xl:px-56 sm:text-5xl lg:text-6xl dark:text-gray-50"
      >
        All your
        <span
          class="text-transparent bg-clip-text bg-gradient-to-r to-blue-500 from-sky-500 dark:to-blue-400 dark:from-sky-400 whitespace-nowrap"
          >fantasy football</span
        >
        league insights in<span class="whitespace-nowrap"> one place</span>
      </h1>
      <h2
        class="max-w-4xl mx-auto mt-5 mb-0 text-lg font-normal text-center text-balance lg:text-xl sm:px-16"
      >
        Detailed analysis and elegant charts for winning fantasy football
        managers.
      </h2>
      <p
        class="max-w-3xl mx-auto text-lg font-normal text-center lg:text-xl sm:px-16"
      >
        Start by entering your league ID
        <span class="hidden sm:inline">or username</span> below.
      </p>
      <a
        aria-label="Sleeper website link"
        href="https://sleeper.com/"
        target="_blank"
        class="inline-block mb-2 text-lg font-semibold text-center text-primary lg:text-xl sm:px-16 xl:px-48 whitespace-nowrap"
      >
        https://sleeper.com/leagues/<span class="text-destructive"
          >{League ID}</span
        >
      </a>
      <div class="max-w-2xl mx-auto mt-4">
        <LeagueInputForm
          v-model:inputType="inputType"
          v-model:seasonYear="seasonYear"
          v-model:leagueIdInput="leagueIdInput"
          @submit="onSubmit"
        />
      </div>
    </div>
    <!-- <div class="flex flex-col justify-center w-full mx-auto mt-20">
      <p class="my-4 text-4xl font-bold">See your league like never before</p>
      <p class="">
        Interactive charts and visualizations that turn raw stats into
        compelling league narratives. See the tabs for more examples with sample
        data.
      </p>
    </div> -->
  </div>
</template>
<style scoped>
@media (max-width: 640px) {
  .custom-font-size {
    font-size: 2.7rem;
    line-height: 2.8rem;
  }
}
.custom-background {
  background: linear-gradient(
    90deg,
    rgba(36, 19, 0, 0) 0%,
    rgba(90, 140, 255, 0.1) 54%,
    rgba(0, 187, 255, 0) 100%
  );
}
</style>
