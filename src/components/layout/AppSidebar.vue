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
import {
  ChartColumn,
  ChartNoAxesCombined,
  FolderClock,
  Gift,
  Home,
  Move3D,
  Newspaper,
  NotebookPen,
  TicketPercent,
  Trophy,
  Users,
  Info,
  ScrollText,
  FolderGit,
  HandCoins,
  MessageSquareMore,
  ShieldUser,
} from "lucide-vue-next";
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
          icon: Home,
        },
        {
          title: "Standings",
          icon: ChartColumn,
        },
        {
          title: "Power Rankings",
          icon: ChartNoAxesCombined,
        },
        {
          title: "Expected Wins",
          icon: TicketPercent,
        },
        {
          title: "Roster Management",
          icon: Move3D,
        },
        {
          title: "Playoffs",
          icon: Trophy,
        },
        {
          title: "Weekly Report",
          icon: NotebookPen,
        },
        {
          title: "Start/Sit",
          icon: Newspaper,
        },
        {
          title: "Draft",
          icon: Users,
        },
        {
          title: "League History",
          icon: FolderClock,
        },
        {
          title: "Wrapped",
          icon: Gift,
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
              class="self-center -mb-1.5 ml-2.5 custom-font whitespace-nowrap"
              ><span class="text-primary">ff</span>wrapped</span
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
                @click="changeTab(childItem.title)"
                class="cursor-pointer"
              >
                <div>
                  <component :is="childItem.icon" v-if="childItem.icon" />
                  <p>
                    {{ childItem.title }}
                  </p>
                </div>
              </SidebarMenuButton>
              <SidebarMenuButton
                v-else-if="!store.currentLeagueId"
                as-child
                :is-active="store.currentTab === childItem.title"
                @click="changeTab(childItem.title)"
                class="cursor-pointer"
              >
                <div>
                  <component :is="childItem.icon" v-if="childItem.icon" />
                  <p>
                    {{ childItem.title }}
                  </p>
                </div>
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
              <router-link
                :to="{ path: '/about', query: $route.query }"
                class="cursor-pointer"
              >
                <SidebarMenuButton as-child>
                  <div>
                    <Info />
                    About
                  </div>
                </SidebarMenuButton>
              </router-link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <router-link
                :to="{ path: '/changelog', query: $route.query }"
                class="cursor-pointer"
              >
                <SidebarMenuButton as-child>
                  <div>
                    <ScrollText />
                    Changelog
                  </div>
                </SidebarMenuButton>
              </router-link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <a
                href="https://github.com/kt474/fantasy-football-wrapped"
                target="_blank"
              >
                <SidebarMenuButton as-child>
                  <div>
                    <FolderGit />
                    Github
                  </div>
                </SidebarMenuButton>
              </a>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <a
                aria-label="buymeacoffee donation page"
                href="https://buymeacoffee.com/kt474"
                title="buymeacofee donation page"
                target="_blank"
              >
                <SidebarMenuButton as-child>
                  <div>
                    <HandCoins />
                    Donate
                  </div>
                </SidebarMenuButton>
              </a>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <a
                aria-label="discord community invite"
                href="https://discord.gg/sSVwNhyv7U"
                title="discord community invite"
                target="_blank"
              >
                <SidebarMenuButton as-child>
                  <div>
                    <MessageSquareMore />
                    Discord
                  </div>
                </SidebarMenuButton>
              </a>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <router-link
                :to="{ path: '/privacy', query: $route.query }"
                class="cursor-pointer"
              >
                <SidebarMenuButton as-child>
                  <div>
                    <ShieldUser />
                    Privacy Policy
                  </div>
                </SidebarMenuButton></router-link
              >
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
