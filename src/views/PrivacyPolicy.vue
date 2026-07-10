<script setup lang="ts">
import PageContainer from "@/components/layout/PageContainer.vue";
import PageHeader from "@/components/layout/PageHeader.vue";
</script>
<template>
  <PageContainer>
      <PageHeader title="Privacy Policy" class="mb-4" />

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

        <p class="my-3 text-xl font-semibold">League and Report Data</p>
        When you add a league, we process information provided by Sleeper or
        ESPN, such as league IDs, usernames, rosters, matchups, transactions,
        and standings. This data may be stored in your browser and sent to our
        service providers to generate analyses, AI-assisted reports, manager
        profiles, or audio recaps. If you access a private ESPN league, the ESPN
        credentials you provide are transmitted through our service to ESPN to
        retrieve the requested league data.

        <p class="my-3 text-xl font-semibold">Paid Plans and Billing</p>
        If you purchase or manage a paid plan, billing is processed by Stripe.
        We do not store full payment card details on ffwrapped. We may store
        and use billing and access metadata, such as subscription status,
        billing period dates, purchase records, and seasonal access expiration
        dates, to enable premium features and manage access.
        <p class="my-3 text-xl font-semibold">Browser Storage</p>
        We use browser storage, including local storage and session storage, to
        keep you signed in, remember preferences, and store app, league, and
        subscription-status data on your device. ffwrapped does not directly
        set cookies. Third-party websites or services you visit through
        ffwrapped, such as authentication, billing, or fantasy football
        providers, may use cookies or other storage under their own privacy
        policies.

        <p class="my-3 text-xl font-semibold">Analytics</p>
        We use Vercel Web Analytics, PostHog, and Umami to understand traffic,
        product usage, and how we can improve the Service. These providers may
        process information such as pages visited, referrers, approximate
        location, browser, device type, and usage events. When you sign in, we
        may associate PostHog analytics with your ffwrapped user ID, email
        address, account creation date, and subscription status or plan type.
        PostHog stores its analytics identifier in local storage. We do not
        sell personal information or use it for targeted advertising.

        <p class="my-3 text-xl font-semibold">Third-Party Services</p>
        Our website may include links to third-party services and relies on
        providers for fantasy league data, authentication, billing, analytics,
        email delivery, hosting, and AI or audio generation. These providers
        process information as needed to perform services for us and have their
        own privacy policies.

        <p class="my-3 text-xl font-semibold">
          Data Retention and Your Choices
        </p>
        We retain information only as reasonably needed to provide the Service,
        manage accounts and purchases, comply with law, and resolve disputes.
        Browser-stored league data can be removed by clearing the site's data
        in your browser. You may contact us to request access to, correction of,
        or deletion of your account information, subject to legal and
        operational requirements.

        <p class="my-3 text-xl font-semibold">Changes to This Privacy Policy</p>
        We may update this Privacy Policy from time to time. Any changes will be
        posted on this page, and the "Last updated" date will be revised
        accordingly. Last updated: July 9, 2026.
        <p class="my-3 text-xl font-semibold">Contact Us</p>
        If you have any questions or concerns about this Privacy Policy, please
        contact us at this
        <a
          href="mailto:kevin@ffwrapped.com?subject=privacy policy"
          class="font-medium text-primary hover:underline"
          >email</a
        >.
      </div>
  </PageContainer>
</template>
