<script setup lang="ts">
import { onMounted, ref, watch, computed } from "vue";
import { useStore } from "../../store/store";
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

watch(
  () => store.showUsernames,
  (newValue) => {
    localStorage.setItem("showUsernames", JSON.stringify(newValue));
  }
);
</script>
<template>
  <nav
    class="container w-11/12 mx-auto border-gray-200 border-solid bg-gray-50 dark:bg-gray-950"
  >
    <div
      class="flex flex-wrap items-center justify-between max-w-screen-xl py-2 mx-auto"
    >
      <div
        @click="
          store.leaguesList = [];
          store.showLeaguesList = false;
        "
        :class="{ 'cursor-pointer': store.showLeaguesList }"
        class="flex items-center space-x-3 rtl:space-x-reverse"
      >
        <img
          height="24"
          width="24"
          src="../../assets/football-helmet.png"
          class="h-6"
        />
        <span
          class="self-center -mb-1.5 custom-font whitespace-nowrap dark:text-gray-50"
          ><span class="text-blue-600 dark:text-blue-500">ff</span>wrapped</span
        >
      </div>

      <div class="block w-auto" id="navbar-default">
        <div class="flex flex-row p-0 mt-0 space-x-2 font-medium rounded-lg">
          <button
            aria-label="Button to show info modal"
            data-modal-target="default-modal"
            data-modal-toggle="default-modal"
            data-tooltip-target="about-tooltip"
            data-tooltip-placement="bottom"
            class="text-gray-50 bg-gray-50 hover:bg-gray-300 focus:ring focus:outline-none focus:ring-gray-300 font-small rounded-lg text-sm p-2.5 text-center inline-flex items-center me-2 dark:bg-gray-950 dark:hover:bg-gray-600 dark:focus:ring-gray-600 -mr-2 md:mr-2"
          >
            <svg
              class="w-5 h-5 text-gray-800 dark:text-gray-50"
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
            class="absolute z-10 invisible inline-block px-3 py-2 text-sm font-medium bg-gray-900 rounded-lg shadow-sm opacity-0 text-gray-50 tooltip dark:bg-gray-600"
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
            <div class="relative w-full max-w-2xl max-h-full p-4 -ml-4 sm:ml-0">
              <div
                class="relative bg-white rounded-lg shadow dark:bg-darkmodal"
              >
                <div
                  class="flex items-center justify-between p-4 border-b rounded-t md:p-5 dark:border-gray-600"
                >
                  <h3
                    class="text-xl font-semibold text-gray-900 dark:text-gray-50"
                  >
                    About
                  </h3>
                  <button
                    aria-label="Button to close info modal"
                    type="button"
                    class="inline-flex items-center justify-center w-8 h-8 text-sm text-gray-400 bg-transparent rounded-lg hover:bg-gray-200 hover:text-gray-900 ms-auto dark:hover:bg-gray-600 dark:hover:text-gray-50"
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
                  </button>
                </div>
                <div class="p-4 space-y-4 md:p-5">
                  <p
                    class="text-base leading-relaxed text-gray-700 dark:text-gray-100"
                  >
                    Welcome to ffwrapped, a platform designed to provide
                    insightful data and charts for your
                    <a
                      aria-label="Link to sleeper website"
                      class="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                      href="https://sleeper.com"
                      target="_blank"
                      >Sleeper</a
                    >
                    fantasy football leagues.
                  </p>
                  <p
                    class="text-base leading-relaxed text-gray-700 dark:text-gray-100"
                  >
                    Everything on this site is free to use and the source code
                    can be found on
                    <a
                      aria-label="Link to github repository"
                      class="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                      href="https://github.com/kt474/fantasy-football-wrapped"
                      target="_blank"
                      >Github</a
                    >. To report a bug or request new features, please join our
                    <a
                      aria-label="Link to github issues page"
                      class="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                      href="https://discord.gg/sSVwNhyv7U"
                      target="_blank"
                      >discord,</a
                    >
                    send an
                    <a
                      href="mailto:kevin@ffwrapped.com?subject=ffwrapped request"
                      class="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                      >email,</a
                    >
                    or reach out on
                    <a
                      aria-label="Link to twitter"
                      class="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                      href="https://twitter.com/kevkevkt"
                      target="_blank"
                      >twitter</a
                    >.
                  </p>
                  <p
                    class="text-base leading-relaxed text-gray-700 dark:text-gray-100"
                  >
                    Using this site will always be completely free (and ad free)
                    but if you would like to support this project, any donations
                    would be greatly appreciated.
                  </p>
                  <div class="flex justify-evenly sm:flex-nowrap flex-wrap">
                    <a href="https://www.buymeacoffee.com/kt474" target="_blank"
                      ><img
                        src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png"
                        alt="Buy Me A Coffee"
                        style="height: 55px !important; width: 217px !important"
                        class="mx-auto mt-6"
                    /></a>
                    <a
                      href="https://venmo.com/u/ffwrapped"
                      target="_blank"
                      class=""
                    >
                      <img
                        src="../../../public/Venmo_Logo_Blue.png"
                        alt="Venmo"
                        style="height: 45px !important; width: 210px !important"
                        class="mt-7"
                      />
                    </a>
                  </div>
                </div>
                <div
                  class="flex items-center justify-between p-4 -mt-2 border-b rounded-t md:p-5 dark:border-gray-600"
                >
                  <h3
                    class="text-xl font-semibold text-gray-900 dark:text-gray-50"
                  >
                    Settings
                  </h3>
                </div>
                <div class="p-4 space-y-4 md:p-5">
                  <label
                    for="checkbox"
                    class="inline-flex items-center cursor-pointer"
                  >
                    <input
                      id="checkbox"
                      type="checkbox"
                      :disabled="store.leagueInfo.length == 0"
                      value=""
                      class="sr-only peer"
                      v-model="store.showUsernames"
                    />
                    <div
                      class="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 dark:peer-checked:bg-blue-600"
                    ></div>
                    <span
                      class="ml-3 text-base leading-relaxed text-gray-700 dark:text-gray-100"
                      >Show usernames instead of team names</span
                    >
                  </label>
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
              class="text-gray-50 bg-gray-50 hover:bg-gray-300 focus:ring focus:outline-none focus:ring-gray-300 font-small rounded-lg text-sm p-2.5 text-center hidden md:inline-flex items-center me-2 dark:bg-gray-950 dark:hover:bg-gray-600 dark:focus:ring-gray-600"
            >
              <svg
                class="w-5 h-5 text-gray-800 dark:text-gray-50"
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
              class="absolute z-10 invisible inline-block px-3 py-2 text-sm font-medium bg-gray-900 rounded-lg shadow-sm opacity-0 text-gray-50 tooltip dark:bg-gray-600"
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
            class="text-gray-50 bg-gray-50 hover:bg-gray-300 focus:ring focus:outline-none focus:ring-gray-300 font-small rounded-lg text-sm p-2.5 text-center inline-flex items-center me-2 dark:bg-gray-950 dark:hover:bg-gray-600 dark:focus:ring-gray-600"
          >
            <svg
              v-if="darkMode"
              class="w-5 h-5 text-gray-800 dark:text-gray-50"
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
              class="w-5 h-5 text-gray-800 dark:text-gray-50"
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
            class="absolute z-10 invisible inline-block px-3 py-2 text-sm font-medium bg-gray-900 rounded-lg shadow-sm opacity-0 text-gray-50 tooltip dark:bg-gray-600"
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
