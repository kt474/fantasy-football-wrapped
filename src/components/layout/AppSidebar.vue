<script setup lang="ts">
import type { SidebarProps } from "@/components/ui/sidebar";
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

const props = defineProps<SidebarProps>();

const data = {
  navMain: [
    {
      title: "Home",
      url: "#",
      items: [
        {
          title: "Add League",
          url: "#",
        },
      ],
    },
    {
      title: "Insights",
      url: "#",
      items: [
        {
          title: "Standings",
          url: "#",
        },
        {
          title: "Power Rankings",
          url: "#",
          isActive: true,
        },
        {
          title: "Expected Wins",
          url: "#",
        },
        {
          title: "Caching",
          url: "#",
        },
        {
          title: "Roster Management",
          url: "#",
        },
        {
          title: "Playoffs",
          url: "#",
        },
        {
          title: "Weekly Report",
          url: "#",
        },
        {
          title: "Start/Sit",
          url: "#",
        },
        {
          title: "Draft",
          url: "#",
        },
        {
          title: "League History",
          url: "#",
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
          <div class="flex items-center">
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
    <SidebarContent>
      <SidebarGroup v-for="item in data.navMain" :key="item.title">
        <SidebarGroupLabel>{{ item.title }}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem
              v-for="childItem in item.items"
              :key="childItem.title"
            >
              <SidebarMenuButton as-child :is-active="childItem.isActive">
                <a :href="childItem.url">{{ childItem.title }}</a>
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
