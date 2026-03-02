<script setup lang="ts">
import { useRoute, useRouter } from "vue-router";
import { onMounted } from "vue";
import { toast } from "vue-sonner";
import { LeagueInfoType } from "../types/types";
import { getData, getLeague, inputLeague } from "../api/api";
import { useStore } from "@/store/store";

const router = useRouter();
const route = useRoute();
const store = useStore();

onMounted(async () => {
  // this league has somehow been cached in google sitelinks
  if (route.query.leagueId === "1057743221285101568") {
    const newQuery = { ...route.query };
    delete newQuery.leagueId;
    router.replace({ path: route.path, query: newQuery });
  }
  await loadSavedLeagues();
});

const loadSavedLeagues = async () => {
  try {
    if (localStorage.leagueInfo) {
      const savedLeagues = JSON.parse(localStorage.leagueInfo);
      await Promise.all(
        savedLeagues.map(async (league: LeagueInfoType) => {
          if (!store.leagueIds.includes(league.leagueId)) {
            store.updateLeagueInfo(league);
          }
        })
      );
      store.updateCurrentLeagueId(localStorage.currentLeagueId);
      store.updateLoadingLeague("");
    }
    const leagueId = Array.isArray(route.query.leagueId)
      ? route.query.leagueId[0]
      : route.query.leagueId;
    // sometimes on refresh the leagueId in the URL becomes undefined
    if (leagueId && !store.leagueIds.includes(leagueId)) {
      const checkInput = await getLeague(leagueId);
      if (checkInput["name"]) {
        store.updateCurrentLeagueId(leagueId);
        store.updateLoadingLeague(checkInput["name"]);
        const league = await getData(leagueId);
        store.updateLeagueInfo(league);
        await inputLeague(
          leagueId,
          league.name,
          league.totalRosters,
          league.seasonType,
          league.season
        );
        store.updateLoadingLeague("");
      } else {
        toast.error("Invalid League ID");
      }
    }
  } catch {
    toast.error("Error fetching data. Please try refreshing the page.");
  }
};
</script>
<template>
  <div class="container w-11/12 h-auto max-w-screen-xl pb-20 mx-auto">
    <div class="container mx-auto mt-4">
      <h1 class="mb-4 text-3xl font-semibold">Privacy Policy</h1>

      <div class="max-w-4xl text-base leading-relaxed">
        <p class="mb-3 text-xl font-semibold">Introduction</p>
        ffwrapped ("we," "our," or "us") is committed to protecting your
        privacy. This Privacy Policy explains how we collect, use, and share
        information when you use our website, ffwrapped.com.
        <p class="my-3 text-xl font-semibold">Information Collection and Use</p>
        You can browse most of ffwrapped without creating an account. If you
        create an account or sign in, we process account data through Supabase
        Authentication, including your email address, authentication provider,
        and a user identifier.
        <p class="my-3 text-xl font-semibold">Subscriptions and Billing</p>
        If you start or manage a paid subscription, billing is processed by
        Stripe. We do not store full payment card details on ffwrapped. We may
        store and use subscription metadata (for example, subscription status
        and billing period dates) to enable premium features and manage access.
        <p class="my-3 text-xl font-semibold">Session Storage and Cookies</p>
        Authentication and app state may use local browser storage and/or
        storage mechanisms required by third-party providers (such as Supabase
        and Stripe) to keep you signed in, secure your session, and support
        account and billing flows.
        <p class="my-3 text-xl font-semibold">Analytics</p>
        To improve user experience and understand how our website is used, we
        utilize PostHog and Vercel Web Analytics. These services helps us
        analyze traffic and usage patterns on our site. The information
        collected is used to understand user behavior and improve the product.
        <p class="my-3 text-xl font-semibold">Third-Party Services</p>
        Our website may include links to third-party services and relies on
        third-party providers including Supabase (authentication), Stripe
        (billing), and analytics tools. These services have their own privacy
        policies, and we encourage you to review them.
        <p class="my-3 text-xl font-semibold">Changes to This Privacy Policy</p>
        We may update this Privacy Policy from time to time. Any changes will be
        posted on this page, and the "Last updated" date will be revised
        accordingly. Last updated: February 28, 2026.
        <p class="my-3 text-xl font-semibold">Contact Us</p>
        If you have any questions or concerns about this Privacy Policy, please
        contact us at this
        <a
          href="mailto:kt474@cornell.edu?subject=privacy policy"
          class="font-medium text-primary hover:underline"
          >email</a
        >.
      </div>
    </div>
  </div>
</template>
