<script setup lang="ts">
import type { SidebarProps } from "@/components/ui/sidebar";
import LeagueSwitcher from "./LeagueSwitcher.vue";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Separator } from "../ui/separator";
import { useStore } from "../../store/store";
const store = useStore();

const props = defineProps<SidebarProps>();

const changeTab = (tab: string) => {
  store.currentTab = tab;
  localStorage.currentTab = tab;
};

const data = {
  versions: ["1.0.1", "1.1.0-alpha", "2.0.0-beta1"],
  navMain: [
    // {
    //   title: "Home",
    //   url: "#",
    //   items: [
    //     {
    //       title: "Add League",
    //       url: "",
    //     },
    //   ],
    // },
    {
      title: "League Insights",
      url: "#",
      items: [
        {
          title: "Home",
          url: "home",
        },
        {
          title: "Standings",
          url: "standings",
        },
        {
          title: "Power Rankings",
          url: "powerRankings",
        },
        {
          title: "Expected Wins",
          url: "expectedWins",
        },
        {
          title: "Roster Management",
          url: "managerEfficiency",
        },
        {
          title: "Playoffs",
          url: "playoffs",
        },
        {
          title: "Weekly Report",
          url: "weeklyReport",
        },
        {
          title: "Start/Sit",
          url: "startSit",
        },
        {
          title: "Draft",
          url: "draft",
        },
        {
          title: "League History",
          url: "leagueHistory",
        },
        {
          title: "Wrapped",
          url: "wrapped",
        },
      ],
    },
  ],
};
</script>

<template>
  <Sidebar v-bind="props">
    <SidebarHeader
      ><SidebarMenu>
        <SidebarMenuItem>
          <div class="flex items-center ml-2 mt-1.5">
            <img
              height="24"
              width="24"
              src="../../assets/football-helmet.png"
              class="h-6"
            />
            <span
              class="self-center -mb-1.5 ml-2.5 custom-font whitespace-nowrap dark:text-gray-50"
              ><span class="text-blue-600 dark:text-blue-500">ff</span
              >wrapped</span
            >
          </div>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>
    <Separator
      orientation="horizontal"
      class="mr-2 mt-2 data-[orientation=vertical]:h-4"
    />
    <SidebarContent>
      <SidebarGroup v-for="item in data.navMain" :key="item.title">
        <!-- <SidebarGroupLabel>{{ item.title }}</SidebarGroupLabel> -->
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem
              v-for="childItem in item.items"
              :key="childItem.title"
            >
              <SidebarMenuButton
                as-child
                :is-active="store.currentTab === childItem.title"
              >
                <p class="cursor-pointer" @click="changeTab(childItem.title)">
                  {{ childItem.title }}
                </p>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
    <SidebarRail />
  </Sidebar>
</template>
<style scoped>
.custom-font {
  font-family: "Josefin Sans", sans-serif;
  font-optical-sizing: auto;
  font-weight: 600;
  font-style: normal;
  font-size: 1.6rem;
}
</style>
