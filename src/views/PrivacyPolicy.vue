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
        profiles, audio recaps, or video recaps. If you access a private ESPN
        league, the ESPN credentials you provide are transmitted through our
        service to ESPN to retrieve the requested league data.

        <p class="my-3 text-xl font-semibold">Generated Video Recaps</p>
        When you request a video recap, we process a render snapshot that may
        include your league name and identifier, season and week, team and
        manager names, player names and images, matchup scores, standings
        movement, and generated report text. Vercel infrastructure processes
        the snapshot and stores the finished MP4 in Vercel Blob.
        <br /><br />
        Finished videos use an unlisted but publicly reachable file URL. The
        URL is not displayed to other ffwrapped users, but anyone who obtains
        it may be able to view or download the video. We stop returning a
        finished video after 15 days and schedule the file for automated
        deletion. Because cleanup runs periodically, deletion may not occur at
        the exact moment the availability period ends.
        <br /><br />
        We also store video-job metadata associated with your account, such as
        the league, season, week, input hash, render status, timestamps, output
        URL, and error information. We use this metadata to recover jobs,
        enforce generation limits, secure the feature, and provide support.
        Copies you download or share are outside our control and may remain
        available after the ffwrapped-hosted copy is deleted.

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
        email delivery, hosting, and AI, audio, or video generation. These
        providers include Sleeper, ESPN, Supabase, Stripe, Vercel, OpenAI,
        PostHog, and Umami. They process information as needed to perform
        services for us and have their own privacy policies.

        <p class="my-3 text-xl font-semibold">
          Data Retention and Your Choices
        </p>
        We retain information only as reasonably needed to provide the Service,
        manage accounts and purchases, comply with law, and resolve disputes.
        Browser-stored league data can be removed by clearing the site's data
        in your browser. You may contact us to request access to, correction of,
        or deletion of your account information, subject to legal and
        operational requirements. Deleting an account may not immediately
        remove a generated video from temporary storage; the hosted copy will
        remain subject to the video deletion schedule described above.

        <p class="my-3 text-xl font-semibold">Children's Privacy</p>
        The Service is not intended for children under 13, and children under
        13 may not create an account. We do not knowingly collect personal
        information from children under 13. If you believe a child has provided
        personal information to us, please contact us so we can review and
        delete it as appropriate.

        <p class="my-3 text-xl font-semibold">Changes to This Privacy Policy</p>
        We may update this Privacy Policy from time to time. Any changes will be
        posted on this page, and the "Last updated" date will be revised
        accordingly. Last updated: July 19, 2026.
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
