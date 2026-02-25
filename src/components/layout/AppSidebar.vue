<script setup lang="ts">
import { computed } from "vue";
import type { SidebarProps } from "@/components/ui/sidebar";
import { useSidebar } from "@/components/ui/sidebar";
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
  CircleUserRound,
} from "lucide-vue-next";
import { Separator } from "../ui/separator";
import { useStore } from "../../store/store";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "@/store/auth";

const store = useStore();
const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();
const props = defineProps<SidebarProps>();
const { isMobile, setOpenMobile } = useSidebar();

const currentUser = computed(() => {
  if (authStore.isAuthenticated) {
    return authStore.user?.email?.match(/^[^@]+(?=@)/)?.[0] ?? "";
  }
});

const closeMobileSidebar = () => {
  if (isMobile.value) {
    setOpenMobile(false);
  }
};

const scrollToTop = () => {
  const main = document.getElementById("mainScrollSection");
  if (main) {
    main.scrollTop = 0;
  }
};

const RouteTabChange = () => {
  if (isMobile.value) {
    setOpenMobile(false);
  }
  store.currentTab = "";
  scrollToTop();
};

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
  closeMobileSidebar();
  scrollToTop();
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
              src="../../assets/football-helmet.webp"
              class="h-6"
              alt="ffwrapped logo"
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
                @click="RouteTabChange"
              >
                <SidebarMenuButton
                  :is-active="route.path === '/about'"
                  as-child
                >
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
                @click="RouteTabChange"
              >
                <SidebarMenuButton
                  :is-active="route.path === '/changelog'"
                  as-child
                >
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
                rel="noopener noreferrer"
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
                rel="noopener noreferrer"
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
                rel="noopener noreferrer"
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
                @click="RouteTabChange"
              >
                <SidebarMenuButton
                  as-child
                  :is-active="route.path === '/privacy'"
                >
                  <div>
                    <ShieldUser />
                    Privacy Policy
                  </div>
                </SidebarMenuButton></router-link
              >
            </SidebarMenuItem>
            <SidebarMenuItem>
              <router-link
                :to="{ path: '/account', query: $route.query }"
                class="cursor-pointer"
                @click="RouteTabChange"
              >
                <SidebarMenuButton
                  :is-active="route.path === '/account'"
                  as-child
                >
                  <div>
                    <CircleUserRound />
                    Account
                    <span v-if="authStore.isAuthenticated"
                      >({{ currentUser }})</span
                    >
                  </div>
                </SidebarMenuButton>
              </router-link>
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
