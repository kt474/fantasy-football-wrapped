<script setup lang="ts">
import { Button } from "@/components/ui/button";
import logoUrl from "@/assets/logo.webp";
</script>

<template>
  <div class="min-h-screen bg-background text-foreground">
    <header class="border-b bg-background">
      <div class="flex items-center justify-between h-16 gap-4 px-5 mx-auto max-w-6xl">
        <RouterLink
          to="/"
          class="inline-flex items-center gap-2 font-semibold"
          aria-label="Go to ffwrapped home"
        >
          <img :src="logoUrl" width="30" height="30" alt="" />
          <span class="text-lg tracking-tight">
            <span class="text-primary">ff</span>wrapped
          </span>
        </RouterLink>

        <nav class="items-center hidden gap-6 text-sm text-muted-foreground md:flex" aria-label="Public pages">
          <RouterLink class="transition-colors hover:text-foreground" to="/sleeper-league-analyzer">
            Sleeper analyzer
          </RouterLink>
          <RouterLink class="transition-colors hover:text-foreground" to="/fantasy-football-weekly-recap">
            Weekly recaps
          </RouterLink>
          <RouterLink class="transition-colors hover:text-foreground" to="/fantasy-football-weekly-recap-example">
            Report example
          </RouterLink>
        </nav>

        <Button as-child size="sm">
          <RouterLink to="/">Analyze a league</RouterLink>
        </Button>
      </div>
    </header>

    <main>
      <slot />
    </main>

    <footer class="mt-20 border-t">
      <div class="grid gap-8 px-5 py-10 mx-auto text-sm max-w-6xl sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <p class="font-semibold"><span class="text-primary">ff</span>wrapped</p>
          <p class="max-w-md mt-2 leading-6 text-muted-foreground">
            Fantasy football league analysis and weekly reports for Sleeper and ESPN leagues.
          </p>
        </div>
        <nav class="flex flex-wrap gap-x-5 gap-y-2 text-muted-foreground" aria-label="Footer navigation">
          <RouterLink class="hover:text-foreground" to="/about">About</RouterLink>
          <a class="hover:text-foreground" href="https://blog.ffwrapped.com">Blog</a>
          <RouterLink class="hover:text-foreground" to="/privacy">Privacy</RouterLink>
          <RouterLink class="hover:text-foreground" to="/terms">Terms</RouterLink>
        </nav>
      </div>
    </footer>
  </div>
</template>
