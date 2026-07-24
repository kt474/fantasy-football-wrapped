<script setup lang="ts">
import { computed, type Component } from "vue";
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
  ShieldUser,
  CircleUserRound,
  BadgeCheck,
  Handshake,
  Dices,
  FlaskConical,
  IdCard,
  ListOrdered,
} from "lucide-vue-next";
import { Separator } from "../ui/separator";
import { useStore } from "../../store/store";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "@/store/auth";
import { useSubscriptionStore } from "@/store/subscription";
import { clearPendingCheckout } from "@/lib/pendingCheckout";
import { sidebarLeagueFeatures, type LeagueFeature } from "@/lib/features";

const store = useStore();
const authStore = useAuthStore();
const subStore = useSubscriptionStore();
const route = useRoute();
const router = useRouter();
const props = defineProps<SidebarProps>();
const { isMobile, setOpenMobile } = useSidebar();

const currentUser = computed(() => {
  if (authStore.isAuthenticated) {
    return authStore.user?.email?.match(/^[^@]+(?=@)/)?.[0] ?? "";
  }
});

const defaultRouteQuery = computed(() => {
  const {
    intent,
    upgrade_source,
    destination,
    tradeMode,
    ...query
  } = route.query;
  return query;
});

const defaultAccountRoute = computed(() => ({
  path: "/account",
  query: defaultRouteQuery.value,
}));

const closeMobileSidebar = () => {
  if (isMobile.value) {
    setOpenMobile(false);
  }
};

const RouteTabChange = () => {
  clearPendingCheckout();
  if (isMobile.value) {
    setOpenMobile(false);
  }
};

const goBackToHome = () => {
  router.push({ path: "/", query: defaultRouteQuery.value });
};

const changeTab = (tab: LeagueFeature) => {
  clearPendingCheckout();
  if (route.path !== "/") {
    goBackToHome();
  } else if (
    route.query.intent ||
    route.query.upgrade_source ||
    route.query.destination ||
    route.query.tradeMode
  ) {
    router.replace({ path: "/", query: defaultRouteQuery.value });
  }
  store.currentTab = tab;
  localStorage.setItem("currentTab", tab);
  closeMobileSidebar();
};

const featureIcons: Record<LeagueFeature, Component> = {
  Home,
  Standings: ChartColumn,
  "Power Rankings": ChartNoAxesCombined,
  "Expected Wins": TicketPercent,
  "Roster Management": Move3D,
  "Weekly Report": NotebookPen,
  Playoffs: Trophy,
  "Player Values": ListOrdered,
  "Trade Lab": FlaskConical,
  "Start/Sit": Newspaper,
  "Season Forecast": Dices,
  Draft: Users,
  "League History": FolderClock,
  "Manager Profiles": IdCard,
  Wrapped: Gift,
  ESPN: ChartColumn,
};

const data = computed(() => ({
  navMain: [
    {
      items: sidebarLeagueFeatures
        .filter(({ id }) => store.isLeagueFeatureVisible(id))
        .map(({ id: title }) => ({
          title,
          icon: featureIcons[title],
        })),
    },
  ],
}));
</script>

<template>
  <Sidebar v-bind="props">
    <SidebarHeader
      ><SidebarMenu>
        <SidebarMenuItem>
          <div class="flex items-center ml-2 mt-1.5">
            <img
              height="32"
              width="32"
              src="../../assets/logo.webp"
              class="-mx-1"
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
                :is-active="
                  route.path === '/' && store.currentTab === childItem.title
                "
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
                v-else-if="
                  !store.currentLeagueId &&
                  !route.query.leagueId &&
                  !store.loadingLeague
                "
                as-child
                :is-active="
                  store.currentTab === childItem.title && route.path === '/'
                "
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
                :to="{ path: '/about', query: defaultRouteQuery }"
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
                :to="{ path: '/changelog', query: defaultRouteQuery }"
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
              <router-link
                :to="{ path: '/privacy', query: defaultRouteQuery }"
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
                :to="{ path: '/terms', query: defaultRouteQuery }"
                class="cursor-pointer"
                @click="RouteTabChange"
              >
                <SidebarMenuButton
                  as-child
                  :is-active="route.path === '/terms'"
                >
                  <div>
                    <Handshake />
                    Terms of Service
                  </div>
                </SidebarMenuButton></router-link
              >
            </SidebarMenuItem>
            <SidebarMenuItem>
              <router-link
                :to="defaultAccountRoute"
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
                    <span
                      v-if="authStore.isAuthenticated && !subStore.isPremium"
                      >({{ currentUser?.slice(0, 16) }})</span
                    >
                    <span
                      class="flex"
                      v-else-if="
                        authStore.isAuthenticated && subStore.isPremium
                      "
                      >({{ currentUser?.slice(0, 16)
                      }}<BadgeCheck class="mt-0.5 ml-2" :size="15" />)</span
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
