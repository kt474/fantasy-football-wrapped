<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { ArrowRight, CheckCircle2 } from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type LandingPage = {
  eyebrow: string;
  heading: string;
  introduction: string;
  benefits: string[];
  sectionHeading: string;
  sections: Array<{ title: string; body: string }>;
};

const route = useRoute();
const page = computed(() => route.meta.landingPage as LandingPage);
</script>

<template>
  <main>
    <section class="border-b bg-gradient-to-b from-sky-500/10 to-background">
      <div class="container max-w-5xl px-5 py-16 mx-auto sm:py-24">
        <p class="text-sm font-semibold tracking-wide uppercase text-primary">
          {{ page.eyebrow }}
        </p>
        <h1
          class="max-w-4xl mt-3 text-4xl font-bold tracking-tight sm:text-6xl"
        >
          {{ page.heading }}
        </h1>
        <p class="max-w-3xl mt-6 text-lg leading-8 text-muted-foreground">
          {{ page.introduction }}
        </p>
        <div class="flex flex-wrap gap-3 mt-8">
          <Button as-child size="lg">
            <RouterLink to="/">
              Analyze your league
              <ArrowRight class="ml-2 size-4" />
            </RouterLink>
          </Button>
        </div>
      </div>
    </section>

    <section class="container max-w-5xl px-5 mx-auto py-14 sm:py-20">
      <div class="grid gap-4 sm:grid-cols-3">
        <Card v-for="benefit in page.benefits" :key="benefit">
          <CardContent class="flex gap-3 pt-6">
            <CheckCircle2 class="mt-0.5 size-5 shrink-0 text-primary" />
            <p class="font-medium">{{ benefit }}</p>
          </CardContent>
        </Card>
      </div>

      <h2 class="mt-16 text-3xl font-bold tracking-tight">
        {{ page.sectionHeading }}
      </h2>
      <div class="grid gap-5 mt-7 md:grid-cols-2">
        <Card v-for="section in page.sections" :key="section.title">
          <CardHeader>
            <CardTitle>{{ section.title }}</CardTitle>
          </CardHeader>
          <CardContent>
            <p class="leading-7 text-muted-foreground">{{ section.body }}</p>
          </CardContent>
        </Card>
      </div>

      <div class="p-8 text-center border mt-14 rounded-card bg-muted/40">
        <h2 class="text-2xl font-bold">Turn league data into a story</h2>
        <p class="max-w-2xl mx-auto mt-3 text-muted-foreground">
          Enter a Sleeper or ESPN league and explore the tools with no manual
          spreadsheet setup.
        </p>
        <Button as-child class="mt-6" size="lg">
          <RouterLink to="/">Get started free</RouterLink>
        </Button>
      </div>
    </section>
  </main>
</template>
