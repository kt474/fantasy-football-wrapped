<script setup lang="ts">
import type { SidebarProps } from "@/components/ui/sidebar";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Separator } from "../ui/separator";
import { useStore } from "../../store/store";
import { useRoute, useRouter } from "vue-router";

const store = useStore();
const route = useRoute();
const router = useRouter();
const props = defineProps<SidebarProps>();

const goBackToHome = () => {
  const currentQueryParams = route.query;
  router.push({ path: "/", query: currentQueryParams });
};

const changeTab = (tab: string) => {
  if (route.path !== "/") {
    goBackToHome();
  }
  store.currentTab = tab;
  localStorage.currentTab = tab;
};

const data = {
  navMain: [
    {
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
      <SidebarGroup v-for="item in data.navMain">
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem
              v-for="childItem in item.items"
              :key="childItem.title"
            >
              <SidebarMenuButton
                v-if="childItem.title !== 'Home'"
                as-child
                :is-active="store.currentTab === childItem.title"
              >
                <p class="cursor-pointer" @click="changeTab(childItem.title)">
                  {{ childItem.title }}
                </p>
              </SidebarMenuButton>
              <SidebarMenuButton
                v-else-if="!store.currentLeagueId"
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

      <SidebarGroup class="mt-auto">
        <Separator
          orientation="horizontal"
          class="mr-2 mb-2 data-[orientation=vertical]:h-4"
        />
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <a class="cursor-pointer">
                <SidebarMenuButton as-child>
                  <router-link :to="{ path: '/about', query: $route.query }"
                    >About</router-link
                  >
                </SidebarMenuButton>
              </a>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <a class="cursor-pointer">
                <SidebarMenuButton as-child>
                  <router-link :to="{ path: '/changelog', query: $route.query }"
                    >Changelog</router-link
                  >
                </SidebarMenuButton>
              </a>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton as-child>
                <a
                  href="https://github.com/kt474/fantasy-football-wrapped"
                  target="_blank"
                  >Github</a
                >
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton as-child>
                <a
                  aria-label="buymeacoffee donation page"
                  href="https://buymeacoffee.com/kt474"
                  title="buymeacofee donation page"
                  target="_blank"
                  >Donate</a
                >
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton as-child>
                <a
                  aria-label="discord community invite"
                  href="https://discord.gg/sSVwNhyv7U"
                  title="discord community invite"
                  target="_blank"
                  >Discord</a
                >
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <a class="cursor-pointer">
                <SidebarMenuButton as-child>
                  <router-link :to="{ path: '/privacy', query: $route.query }"
                    >Privacy Policy</router-link
                  >
                </SidebarMenuButton></a
              >
            </SidebarMenuItem>
            <!-- <SidebarMenuItem>
              <SidebarMenuButton as-child>
                <a class="cursor-pointer">
                  <router-link :to="{ path: '/changelog', query: $route.query }"
                    >Changelog</router-link
                  >
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem> -->
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
