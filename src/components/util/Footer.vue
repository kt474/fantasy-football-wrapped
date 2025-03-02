<script setup lang="ts"></script>

<template>
  <div
    class="container w-11/12 py-3 mx-auto text-xs text-gray-700 dark:text-gray-300"
  >
    <div class="flex justify-between max-w-screen-xl mx-auto">
      <div>
        <p class="mb-2 font-bold text-black dark:text-white">
          Support & Resources
        </p>
        <p>
          <router-link
            :to="{ path: '/changelog', query: $route.query }"
            class="text-blue-700 dark:text-blue-500 hover:underline"
            >Changelog</router-link
          >
        </p>
        <p>
          <a
            aria-label="ffwrapped blog page"
            class="text-blue-700 dark:text-blue-500 hover:underline"
            href="https://blog.ffwrapped.com/"
            title="ffwrapped blog page"
            target="_blank"
            >Blog</a
          >
        </p>
        <p>
          <a
            aria-label="buymeacoffee donation page"
            class="text-blue-700 dark:text-blue-500 hover:underline"
            href="https://buymeacoffee.com/kt474"
            title="buymeacofee donation page"
            target="_blank"
            >Donate</a
          >
        </p>
        <p>
          <a
            aria-label="PWA installation guide"
            class="text-blue-700 dark:text-blue-500 hover:underline"
            href="https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Installing"
            title="PWA installation guide"
            target="_blank"
            >Add To Homescreen</a
          >
        </p>
        <p>
          <a
            aria-label="Freepik - Flaticon icon credit"
            class="text-blue-700 dark:text-blue-500 hover:underline"
            href="https://www.flaticon.com/free-icons/american-football"
            title="american football icons"
            target="_blank"
            >Icon Package</a
          >
        </p>
        <p>
          <router-link
            :to="{ path: '/privacy', query: $route.query }"
            class="text-blue-700 dark:text-blue-500 hover:underline"
            >Privacy Policy</router-link
          >
        </p>
      </div>
    </div>
  </div>
</template>
