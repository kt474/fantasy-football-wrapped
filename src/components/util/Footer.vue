<script setup lang="ts"></script>

<template>
  <div
    class="container w-11/12 py-3 mx-auto text-xs text-gray-700 dark:text-gray-300"
  >
    <div class="flex justify-between max-w-screen-xl mx-auto">
      <div>
        <p class="mb-2 font-bold text-black dark:text-white">
          Acknowledgements
        </p>
        <p>
          Data:
          <a
            aria-label="https://docs.sleeper.com/ Sleeper API"
            href="https://docs.sleeper.com/"
            class="text-blue-700 dark:text-blue-500 hover:underline"
            target="_blank"
            >Sleeper API</a
          >
        </p>
        <p>
          Icon:
          <a
            aria-label="Freepik - Flaticon icon credit"
            class="text-blue-700 dark:text-blue-500 hover:underline"
            href="https://www.flaticon.com/free-icons/american-football"
            title="american football icons"
            target="_blank"
            >Freepik - Flaticon</a
          >
        </p>
        <p>
          Avatars:
          <a
            aria-label="avataaars generator"
            class="text-blue-700 dark:text-blue-500 hover:underline"
            href="https://getavataaars.com/"
            title="avataaars generator website"
            target="_blank"
            >Avataaars generator</a
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
        <button
          data-modal-target="footer-modal"
          data-modal-toggle="footer-modal"
          aria-label="privacy policy"
          class="text-blue-700 dark:text-blue-500 hover:underline"
          title="privacy policy"
        >
          Privacy policy
        </button>
        <div
          id="footer-modal"
          tabindex="-1"
          aria-hidden="true"
          class="hidden overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-[calc(100%-1rem)] max-h-full"
        >
          <div class="relative w-full max-w-3xl max-h-full p-4">
            <div class="relative bg-white rounded-lg shadow dark:bg-gray-700">
              <div
                class="flex items-center justify-between p-4 border-b rounded-t md:p-5 dark:border-gray-600"
              >
                <h3 class="text-xl font-semibold text-gray-900 dark:text-white">
                  Privacy Policy
                </h3>
                <button
                  aria-label="Button to close footer modal"
                  type="button"
                  class="inline-flex items-center justify-center w-8 h-8 text-sm text-gray-400 bg-transparent rounded-lg hover:bg-gray-200 hover:text-gray-900 ms-auto dark:hover:bg-gray-600 dark:hover:text-white"
                  data-modal-hide="footer-modal"
                >
                  <svg
                    class="w-3 h-3"
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 14 14"
                  >
                    <path
                      stroke="currentColor"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
                    />
                  </svg>
                  <span class="sr-only">Close modal</span>
                </button>
              </div>
              <div class="p-4 space-y-4 md:p-5">
                <div
                  class="text-base leading-relaxed text-gray-700 dark:text-gray-100"
                >
                  <p class="mb-3 text-xl font-semibold">Introduction</p>
                  ffwrapped ("we," "our," or "us") is committed to protecting
                  your privacy. This Privacy Policy explains how we collect,
                  use, and share information when you use our website,
                  ffwrapped.com.
                  <p class="my-3 text-xl font-semibold">
                    Information Collection and Use
                  </p>
                  We do not collect any personal data from our users. You can
                  browse and use our website without providing any personal
                  information.
                  <p class="my-3 text-xl font-semibold">Cookies</p>
                  We do not use cookies on our website.
                  <p class="my-3 text-xl font-semibold">Analytics</p>
                  To improve user experience and understand how our website is
                  used, we utilize PostHog and Vercel Web Analytics. These
                  services helps us analyze traffic and usage patterns on our
                  site without collecting any personal data. The information
                  collected is purely for the purpose of understanding user
                  behavior and enhancing our services. Neither of these services
                  use cookies.
                  <p class="my-3 text-xl font-semibold">Third-Party Services</p>
                  Our website may include links to third-party services or use
                  third-party analytics tools. These services have their own
                  privacy policies, and we encourage you to review them.
                  <p class="my-3 text-xl font-semibold">
                    Changes to This Privacy Policy
                  </p>
                  We may update this Privacy Policy from time to time. Any
                  changes will be posted on this page, and the "Last updated"
                  date will be revised accordingly.
                  <p class="my-3 text-xl font-semibold">Contact Us</p>
                  If you have any questions or concerns about this Privacy
                  Policy, please contact us at this
                  <a
                    href="mailto:kt474@cornell.edu?subject=ffwrapped request"
                    class="font-medium text-blue-600 dark:text-blue-500 hover:underline"
                    >email</a
                  >.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
