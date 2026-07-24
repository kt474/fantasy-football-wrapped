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
          class="inline-flex items-center gap-2"
          aria-label="Go to ffwrapped home"
        >
          <img :src="logoUrl" width="32" height="32" class="-mx-1" alt="" />
          <span class="brand-wordmark mt-1.5">
            <span class="text-primary">ff</span>wrapped
          </span>
        </RouterLink>

        <nav class="items-center hidden gap-5 text-sm text-muted-foreground lg:flex" aria-label="Public pages">
          <RouterLink class="transition-colors hover:text-foreground" to="/sleeper-league-analyzer">
            Sleeper
          </RouterLink>
          <RouterLink class="transition-colors hover:text-foreground" to="/espn-league-analyzer">
            ESPN
          </RouterLink>
          <RouterLink class="transition-colors hover:text-foreground" to="/fantasy-football-draft-grades">
            Draft grades
          </RouterLink>
          <RouterLink class="transition-colors hover:text-foreground" to="/fantasy-football-playoff-odds-calculator">
            Playoff odds
          </RouterLink>
          <RouterLink class="transition-colors hover:text-foreground" to="/fantasy-football-power-rankings">
            Power rankings
          </RouterLink>
          <RouterLink class="transition-colors hover:text-foreground" to="/fantasy-football-league-history">
            League history
          </RouterLink>
          <RouterLink class="transition-colors hover:text-foreground" to="/fantasy-football-weekly-recap">
            Weekly recaps
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
      <div class="grid gap-10 px-5 py-10 mx-auto text-sm max-w-6xl md:grid-cols-[1fr_auto_auto]">
        <div>
          <p class="brand-wordmark"><span class="text-primary">ff</span>wrapped</p>
          <p class="max-w-md mt-2 leading-6 text-muted-foreground">
            Fantasy football league analysis and weekly reports for Sleeper and ESPN leagues.
          </p>
        </div>
        <nav aria-label="Fantasy football tools">
          <p class="font-medium">Tools</p>
          <div class="grid gap-2 mt-3 text-muted-foreground">
            <RouterLink class="hover:text-foreground" to="/sleeper-league-analyzer">Sleeper analyzer</RouterLink>
            <RouterLink class="hover:text-foreground" to="/espn-league-analyzer">ESPN analyzer</RouterLink>
            <RouterLink class="hover:text-foreground" to="/fantasy-football-draft-grades">Draft grades</RouterLink>
            <RouterLink class="hover:text-foreground" to="/fantasy-football-playoff-odds-calculator">Playoff odds</RouterLink>
            <RouterLink class="hover:text-foreground" to="/fantasy-football-power-rankings">Power rankings</RouterLink>
            <RouterLink class="hover:text-foreground" to="/fantasy-football-league-history">League history</RouterLink>
            <RouterLink class="hover:text-foreground" to="/fantasy-football-player-values">Player values</RouterLink>
            <RouterLink class="hover:text-foreground" to="/fantasy-football-trade-finder">Trade finder</RouterLink>
            <RouterLink class="hover:text-foreground" to="/fantasy-football-weekly-recap">Weekly recaps</RouterLink>
          </div>
        </nav>
        <nav aria-label="Footer navigation">
          <p class="font-medium">Company</p>
          <div class="grid gap-2 mt-3 text-muted-foreground">
            <RouterLink class="hover:text-foreground" to="/about">About</RouterLink>
            <a class="hover:text-foreground" href="https://blog.ffwrapped.com">Blog</a>
            <RouterLink class="hover:text-foreground" to="/privacy">Privacy</RouterLink>
            <RouterLink class="hover:text-foreground" to="/terms">Terms</RouterLink>
          </div>
        </nav>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.brand-wordmark {
  font-family: "Josefin Sans", sans-serif;
  font-optical-sizing: auto;
  font-size: 1.6rem;
  font-style: normal;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
}
</style>
