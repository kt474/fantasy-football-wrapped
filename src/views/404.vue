<script setup lang="ts">
import { useRouter } from "vue-router";
import Button from "@/components/ui/button/Button.vue";

const router = useRouter();
</script>
<template>
  <div class="container w-11/12 h-full max-w-screen-xl mx-auto">
    <div class="max-w-screen-sm mx-auto text-center">
      <h1 class="mt-12 mb-4 font-bold text-7xl lg:text-9xl">404</h1>
      <p class="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
        Something's missing.
      </p>
      <p class="mb-4 text-lg font-light text-muted-foreground">
        Sorry, we can't find that page.
      </p>
      <Button
        aria-label="Button to go back one page"
        @click="router.replace('/')"
        class="mt-2"
      >
        Return Home
      </Button>
    </div>
  </div>
</template>
