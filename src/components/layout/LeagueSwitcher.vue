<script setup lang="ts">
import { Check, ChevronsUpDown, Plus } from "lucide-vue-next";
import { capitalize } from "lodash";

import { ref } from "vue";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { LeagueInfoType } from "@/types/types";

const props = defineProps<{
  leagues: LeagueInfoType[];
}>();

const selectedVersion = ref(props.leagues[0]?.leagueId);
</script>

<template>
  <SidebarMenu>
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <SidebarMenuButton
            size="lg"
            class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          >
            <div class="flex flex-col gap-0.5 leading-none">
              <span class="font-medium">{{ props.leagues[0]?.name }}</span>
              <span class="text-sm text-gray-800">{{
                props.leagues[0]?.season +
                ": " +
                capitalize(props.leagues[0]?.seasonType) +
                " " +
                props.leagues[0]?.totalRosters +
                "-team"
              }}</span>
            </div>
            <ChevronsUpDown class="ml-auto" />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          class="w-(--reka-dropdown-menu-trigger-width)"
          align="start"
        >
          <DropdownMenuItem
            v-for="league in leagues"
            :key="league.leagueId"
            @select="selectedVersion = league.leagueId"
          >
            {{ league.name }}
            <Check v-if="league.leagueId === selectedVersion" class="ml-auto" />
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem class="gap-2 p-2">
            <div
              class="flex items-center justify-center bg-transparent border rounded-md size-6"
            >
              <Plus class="size-4" />
            </div>
            <div class="font-medium text-muted-foreground">Add team</div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  </SidebarMenu>
</template>
