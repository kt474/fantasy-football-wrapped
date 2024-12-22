<script setup lang="ts">
import { useRouter } from "vue-router";

const router = useRouter();
</script>
<template>
  <div class="container w-11/12 h-auto max-w-screen-xl pb-20 mx-auto">
    <div class="container mx-auto mt-4">
      <h1 class="mb-4 text-3xl font-semibold text-gray-800 dark:text-gray-300">
        Privacy Policy
      </h1>

      <div
        class="max-w-4xl text-base leading-relaxed text-gray-700 dark:text-gray-100"
      >
        <p class="mb-3 text-xl font-semibold">Introduction</p>
        ffwrapped ("we," "our," or "us") is committed to protecting your
        privacy. This Privacy Policy explains how we collect, use, and share
        information when you use our website, ffwrapped.com.
        <p class="my-3 text-xl font-semibold">Information Collection and Use</p>
        We do not collect any personal data from our users. You can browse and
        use our website without providing any personal information.
        <p class="my-3 text-xl font-semibold">Cookies</p>
        We do not use cookies on our website.
        <p class="my-3 text-xl font-semibold">Analytics</p>
        To improve user experience and understand how our website is used, we
        utilize PostHog and Vercel Web Analytics. These services helps us
        analyze traffic and usage patterns on our site without collecting any
        personal data. The information collected is purely for the purpose of
        understanding user behavior and enhancing our services. Neither of these
        services use cookies.
        <p class="my-3 text-xl font-semibold">Third-Party Services</p>
        Our website may include links to third-party services or use third-party
        analytics tools. These services have their own privacy policies, and we
        encourage you to review them.
        <p class="my-3 text-xl font-semibold">Changes to This Privacy Policy</p>
        We may update this Privacy Policy from time to time. Any changes will be
        posted on this page, and the "Last updated" date will be revised
        accordingly. Last updated: December 22, 2024.
        <p class="my-3 text-xl font-semibold">Contact Us</p>
        If you have any questions or concerns about this Privacy Policy, please
        contact us at this
        <a
          href="mailto:kt474@cornell.edu?subject=ffwrapped request"
          class="font-medium text-blue-600 dark:text-blue-500 hover:underline"
          >email</a
        >.
      </div>

      <button
        aria-label="Button to go back one page"
        @click="router.back()"
        class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm w-full sm:w-auto px-3 sm:px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 mt-4"
      >
        Back
      </button>
    </div>
  </div>
</template>
