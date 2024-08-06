<script setup lang="ts">
import { onMounted, ref, watch, computed } from "vue";
import { useStore } from "../store/store";
const store = useStore();
const systemDarkMode = window.matchMedia(
  "(prefers-color-scheme: dark)"
).matches;
const clicked = ref(systemDarkMode);

onMounted(() => {
  if (systemDarkMode && !localStorage.darkMode) {
    clicked.value = true;
    store.updateDarkMode(true);
  } else if (localStorage.darkMode) {
    clicked.value = JSON.parse(localStorage.darkMode);
    store.updateDarkMode(clicked.value);
  }
});

watch(clicked, () => {
  localStorage.darkMode = clicked.value;
  store.updateDarkMode(clicked.value);
});

const darkMode = computed(() => {
  return store.darkMode;
});

const setColorMode = () => {
  clicked.value = !clicked.value;
};
</script>
<template>
  <nav
    class="container w-11/12 mx-auto border-gray-200 border-solid bg-slate-50 dark:bg-slate-950"
  >
    <div
      class="flex flex-wrap items-center justify-between max-w-screen-xl py-2 mx-auto"
    >
      <div
        aria-label="Logo"
        class="flex items-center space-x-3 rtl:space-x-reverse"
      >
        <img
          height="24"
          width="24"
          src="../assets/football-helmet.png"
          class="h-6"
          alt="Flowbite Logo"
        />
        <span
          class="self-center -mb-1.5 custom-font whitespace-nowrap dark:text-white"
          ><span class="text-blue-600 dark:text-blue-500">ff</span>wrapped</span
        >
      </div>

      <div class="hidden w-full md:block md:w-auto" id="navbar-default">
        <div
          class="flex flex-col p-4 mt-4 font-medium border rounded-lg md:p-0 md:flex-row md:space-x-2 md:mt-0 md:border-0"
        >
          <button
            aria-label="Button to show info modal"
            data-modal-target="default-modal"
            data-modal-toggle="default-modal"
            data-tooltip-target="about-tooltip"
            data-tooltip-placement="bottom"
            class="text-white bg-slate-50 hover:bg-slate-300 focus:ring focus:outline-none focus:ring-slate-300 font-small rounded-lg text-sm p-2.5 text-center inline-flex items-center me-2 dark:bg-slate-950 dark:hover:bg-gray-600 dark:focus:ring-gray-600"
          >
            <svg
              class="w-5 h-5 text-gray-800 dark:text-white"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM9.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM12 15H8a1 1 0 0 1 0-2h1v-3H8a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1v4h1a1 1 0 0 1 0 2Z"
              />
            </svg>
          </button>
          <div
            id="about-tooltip"
            role="tooltip"
            class="absolute z-10 invisible inline-block px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg shadow-sm opacity-0 tooltip dark:bg-gray-600"
          >
            About
            <div class="tooltip-arrow" data-popper-arrow></div>
          </div>
          <div
            id="default-modal"
            tabindex="-1"
            aria-hidden="true"
            class="hidden overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-[calc(100%-1rem)] max-h-full"
          >
            <div class="relative w-full max-w-2xl max-h-full p-4">
              <div class="relative bg-white rounded-lg shadow dark:bg-gray-700">
                <div
                  class="flex items-center justify-between p-4 border-b rounded-t md:p-5 dark:border-gray-600"
                >
                  <h3
                    class="text-xl font-semibold text-gray-900 dark:text-white"
                  >
                    About
                  </h3>
                  <button
                    aria-label="Button to close info modal"
                    type="button"
                    class="inline-flex items-center justify-center w-8 h-8 text-sm text-gray-400 bg-transparent rounded-lg hover:bg-gray-200 hover:text-gray-900 ms-auto dark:hover:bg-gray-600 dark:hover:text-white"
                    data-modal-hide="default-modal"
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
                  <p
                    class="text-base leading-relaxed text-gray-700 dark:text-gray-200"
                  >
                    Welcome to ffwrapped, a platform designed to provide
                    insightful data and charts about your fantasy football
                    league. Currently, only
                    <a
                      aria-label="Link to sleeper website"
                      class="font-medium text-blue-600 dark:text-blue-500 hover:underline"
                      href="https://sleeper.com"
                      target="_blank"
                      >Sleeper</a
                    >
                    leagues are supported.
                  </p>
                  <p
                    class="text-base leading-relaxed text-gray-700 dark:text-gray-200"
                  >
                    Everything on this site is completely free and open source.
                    The source code can be found on
                    <a
                      aria-label="Link to github repository"
                      class="font-medium text-blue-600 dark:text-blue-500 hover:underline"
                      href="https://github.com/kt474/fantasy-football-wrapped"
                      target="_blank"
                      >Github</a
                    >. To report a bug or request new features, please open an
                    <a
                      aria-label="Link to github issues page"
                      class="font-medium text-blue-600 dark:text-blue-500 hover:underline"
                      href="https://github.com/kt474/fantasy-football-wrapped/issues"
                      target="_blank"
                      >issue</a
                    >
                    or send an
                    <a
                      href="mailto:kt474@cornell.edu?subject=ffwrapped request"
                      class="font-medium text-blue-600 dark:text-blue-500 hover:underline"
                      >email</a
                    >.
                  </p>
                  <p
                    class="text-base leading-relaxed text-gray-700 dark:text-gray-200"
                  >
                    Using this site will always be completely free (and ad free)
                    but if you would like to support this project, please
                    consider
                    <a
                      href="https://buymeacoffee.com/kt474"
                      class="font-medium text-blue-600 dark:text-blue-500 hover:underline"
                      target="_blank"
                      >buying me a coffee</a
                    >.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <a
            aria-label="Button for github repository"
            href="https://github.com/kt474/fantasy-football-wrapped"
            target="_blank"
          >
            <button
              aria-label="Button for github repository"
              data-tooltip-target="github-tooltip"
              data-tooltip-placement="bottom"
              class="text-white bg-slate-50 hover:bg-slate-300 focus:ring focus:outline-none focus:ring-slate-300 font-small rounded-lg text-sm p-2.5 text-center inline-flex items-center me-2 dark:bg-slate-950 dark:hover:bg-gray-600 dark:focus:ring-gray-600"
            >
              <svg
                class="w-5 h-5 text-gray-800 dark:text-white"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fill-rule="evenodd"
                  d="M10 .333A9.911 9.911 0 0 0 6.866 19.65c.5.092.678-.215.678-.477 0-.237-.01-1.017-.014-1.845-2.757.6-3.338-1.169-3.338-1.169a2.627 2.627 0 0 0-1.1-1.451c-.9-.615.07-.6.07-.6a2.084 2.084 0 0 1 1.518 1.021 2.11 2.11 0 0 0 2.884.823c.044-.503.268-.973.63-1.325-2.2-.25-4.516-1.1-4.516-4.9A3.832 3.832 0 0 1 4.7 7.068a3.56 3.56 0 0 1 .095-2.623s.832-.266 2.726 1.016a9.409 9.409 0 0 1 4.962 0c1.89-1.282 2.717-1.016 2.717-1.016.366.83.402 1.768.1 2.623a3.827 3.827 0 0 1 1.02 2.659c0 3.807-2.319 4.644-4.525 4.889a2.366 2.366 0 0 1 .673 1.834c0 1.326-.012 2.394-.012 2.72 0 .263.18.572.681.475A9.911 9.911 0 0 0 10 .333Z"
                  clip-rule="evenodd"
                />
              </svg>
            </button>
            <div
              id="github-tooltip"
              role="tooltip"
              class="absolute z-10 invisible inline-block px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg shadow-sm opacity-0 tooltip dark:bg-gray-600"
            >
              Github
              <div class="tooltip-arrow" data-popper-arrow></div>
            </div>
          </a>
          <button
            aria-label="Button to toggle dark mode"
            @click="setColorMode()"
            data-tooltip-target="tooltip-bottom"
            data-tooltip-placement="bottom"
            type="button"
            class="text-white bg-slate-50 hover:bg-slate-300 focus:ring focus:outline-none focus:ring-slate-300 font-small rounded-lg text-sm p-2.5 text-center inline-flex items-center me-2 dark:bg-slate-950 dark:hover:bg-gray-600 dark:focus:ring-gray-600"
          >
            <svg
              v-if="darkMode"
              class="w-5 h-5 text-gray-800 dark:text-white"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                d="M10 15a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0-11a1 1 0 0 0 1-1V1a1 1 0 0 0-2 0v2a1 1 0 0 0 1 1Zm0 12a1 1 0 0 0-1 1v2a1 1 0 1 0 2 0v-2a1 1 0 0 0-1-1ZM4.343 5.757a1 1 0 0 0 1.414-1.414L4.343 2.929a1 1 0 0 0-1.414 1.414l1.414 1.414Zm11.314 8.486a1 1 0 0 0-1.414 1.414l1.414 1.414a1 1 0 0 0 1.414-1.414l-1.414-1.414ZM4 10a1 1 0 0 0-1-1H1a1 1 0 0 0 0 2h2a1 1 0 0 0 1-1Zm15-1h-2a1 1 0 1 0 0 2h2a1 1 0 0 0 0-2ZM4.343 14.243l-1.414 1.414a1 1 0 1 0 1.414 1.414l1.414-1.414a1 1 0 0 0-1.414-1.414ZM14.95 6.05a1 1 0 0 0 .707-.293l1.414-1.414a1 1 0 1 0-1.414-1.414l-1.414 1.414a1 1 0 0 0 .707 1.707Z"
              />
            </svg>
            <svg
              v-else
              class="w-5 h-5 text-gray-800 dark:text-white"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              viewBox="0 0 18 20"
            >
              <path
                d="M17.8 13.75a1 1 0 0 0-.859-.5A7.488 7.488 0 0 1 10.52 2a1 1 0 0 0 0-.969A1.035 1.035 0 0 0 9.687.5h-.113a9.5 9.5 0 1 0 8.222 14.247 1 1 0 0 0 .004-.997Z"
              />
            </svg>
          </button>
          <div
            id="tooltip-bottom"
            role="tooltip"
            class="absolute z-10 invisible inline-block px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg shadow-sm opacity-0 tooltip dark:bg-gray-600"
          >
            Toggle dark mode
            <div class="tooltip-arrow" data-popper-arrow></div>
          </div>
        </div>
      </div>
    </div>
  </nav>
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
