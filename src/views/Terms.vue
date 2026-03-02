<script lang="ts" setup>
import { useRoute } from "vue-router";
import { onMounted } from "vue";
import { toast } from "vue-sonner";
import { LeagueInfoType } from "../types/types";
import { getData, getLeague, inputLeague } from "../api/api";
import { useStore } from "@/store/store";

const route = useRoute();
const store = useStore();

onMounted(async () => {
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
      <h1 class="mb-4 text-3xl font-semibold">Terms of Service</h1>

      <div class="max-w-4xl text-base leading-relaxed">
        <p class="mb-3 text-xl font-semibold">Acceptance of Terms</p>
        By accessing or using ffwrapped ("Service"), you agree to be bound by
        these Terms of Service ("Terms"). If you do not agree to these Terms, do
        not use the Service.

        <p class="my-3 text-xl font-semibold">Eligibility and Accounts</p>
        You must provide accurate information when creating an account and keep
        your login credentials secure. You are responsible for activity that
        occurs under your account. We may suspend or terminate accounts that
        violate these Terms.

        <p class="my-3 text-xl font-semibold">Service Description</p>
        ffwrapped provides fantasy football analysis, reports, and related
        features. Some features are free and some are available only with a paid
        subscription.

        <p class="my-3 text-xl font-semibold">
          Subscriptions, Billing, and Trial
        </p>
        Paid features are billed as recurring subscriptions through Stripe. By
        starting a subscription, you authorize recurring charges for the plan
        you selected until canceled. Prices, billing intervals, and trial terms
        are shown at checkout and on the account page.
        <br /><br />
        If a free trial is offered, you will be charged when the trial ends
        unless you cancel before renewal. You can manage or cancel your
        subscription from your account billing portal.

        <p class="my-3 text-xl font-semibold">Cancellation and Refunds</p>
        You may cancel your subscription at any time through the billing portal.
        Unless stated otherwise at checkout or required by law, payments are
        non-refundable and partial billing periods are not prorated.

        <p class="my-3 text-xl font-semibold">Acceptable Use</p>
        You agree not to misuse the Service, including by attempting to access
        systems without authorization, interfering with platform operations,
        reverse engineering protected systems, scraping at abusive rates, or
        using the Service for unlawful activity.

        <p class="my-3 text-xl font-semibold">Intellectual Property</p>
        The Service, including site content, branding, and software, is owned by
        ffwrapped or its licensors and is protected by applicable law. You may
        not copy, modify, distribute, sell, or lease any part of the Service
        except as permitted by law.

        <p class="my-3 text-xl font-semibold">Third-Party Services</p>
        The Service relies on third-party providers, including Supabase
        (authentication), Stripe (billing), and analytics providers. Your use of
        those services may be subject to their separate terms and privacy
        policies.

        <p class="my-3 text-xl font-semibold">Disclaimers</p>
        The Service and all generated content are provided "as is" and "as
        available" without warranties of any kind, express or implied.
        Analytical outputs and AI-generated content may contain errors or
        omissions and should be independently validated.

        <p class="my-3 text-xl font-semibold">Limitation of Liability</p>
        To the maximum extent permitted by law, ffwrapped and its operators are
        not liable for indirect, incidental, special, consequential, exemplary,
        or punitive damages, or for loss of profits, data, goodwill, or use,
        arising from or related to your use of the Service.

        <p class="my-3 text-xl font-semibold">Indemnification</p>
        You agree to defend, indemnify, and hold harmless ffwrapped and its
        operators from claims, liabilities, damages, losses, and expenses
        arising out of your use of the Service or violation of these Terms.

        <p class="my-3 text-xl font-semibold">
          Changes to the Service and Terms
        </p>
        We may modify, suspend, or discontinue any part of the Service at any
        time. We may also update these Terms from time to time. Continued use of
        the Service after changes become effective constitutes acceptance of the
        updated Terms.

        <p class="my-3 text-xl font-semibold">Governing Law</p>
        These Terms are governed by and construed in accordance with applicable
        laws of the United States and the state in which the Service operator
        resides, without regard to conflict of law principles.

        <p class="my-3 text-xl font-semibold">Contact</p>
        If you have questions about these Terms, contact:
        <a
          href="mailto:kt474@cornell.edu?subject=terms of service"
          class="font-medium text-primary hover:underline"
          >kt474@cornell.edu</a
        >. <br /><br />
        Last updated: February 28, 2026.
      </div>
    </div>
  </div>
</template>
