<script setup lang="ts">
import { computed } from "vue";
import { UserType, RosterType } from "../api/types";
import { useStore } from "../store/store";

const store = useStore();
const props = defineProps<{
  users: UserType[];
  rosters: RosterType[];
  leagueWinner: number | null;
  cardHeight: string;
}>();

const leagueStatusComplete = computed(() => {
  if (store.leagueInfo[store.currentLeagueIndex]) {
    if (store.leagueInfo[store.currentLeagueIndex].status == "complete") {
      return true;
    }
  } else {
    return true;
  }
  return false;
});

const winner: any = computed(() => {
  if (props.leagueWinner) {
    const winnerId = props.rosters.filter(
      (roster: RosterType) => roster.rosterId === props.leagueWinner
    )[0]["id"];
    return props.users.filter((user: UserType) => user.id === winnerId)[0];
  }
  return null;
});
</script>
<template>
  <div
    :class="props.cardHeight"
    class="block w-full p-2 bg-white border border-gray-200 rounded-lg shadow sm:w-auto dark:bg-gray-800 dark:border-gray-700 min-w-56"
  >
    <svg
      :class="{
        'w-10': props.rosters.length <= 10,
        'w-16 mt-2.5': props.rosters.length <= 12 && props.rosters.length > 10,
        'w-16 mt-7': props.rosters.length > 12,
      }"
      class="mx-auto mt-2"
      version="1.0"
      id="Layer_1"
      xmlns="http://www.w3.org/2000/svg"
      xmlns:xlink="http://www.w3.org/1999/xlink"
      viewBox="0 0 64 64"
      enable-background="new 0 0 64 64"
      xml:space="preserve"
      fill="#000000"
    >
      <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
      <g
        id="SVGRepo_tracerCarrier"
        stroke-linecap="round"
        stroke-linejoin="round"
      ></g>
      <g id="SVGRepo_iconCarrier">
        <g>
          <g>
            <path
              fill="#F9EBB2"
              d="M49,2H15c-1.104,0-2,0.895-2,2v23c0,10.492,8.507,19,19,19s19-8.508,19-19V4C51,2.895,50.104,2,49,2z"
            ></path>
          </g>
          <g>
            <path
              fill="#394240"
              d="M60,6h-7V4c0-2.213-1.789-4-4-4H15c-2.211,0-4,1.787-4,4v2H4c-2.211,0-4,1.787-4,4v8 c0,6.074,4.925,11,11,11h0.101C12.015,38.66,19.477,46.395,29,47.76V56h-7c-2.211,0-4,1.787-4,4v3c0,0.551,0.447,1,1,1h26 c0.553,0,1-0.449,1-1v-3c0-2.213-1.789-4-4-4h-7v-8.24c9.523-1.365,16.985-9.1,17.899-18.76H53c6.075,0,11-4.926,11-11v-8 C64,7.787,62.211,6,60,6z M11,23c-2.762,0-5-2.24-5-5v-6h5V23z M11,10H5c-0.553,0-1,0.445-1,1v7c0,3.865,3.134,7,7,7v2 c-4.971,0-9-4.031-9-9v-8c0-1.105,0.896-2,2-2h7V10z M42,58c1.104,0,2,0.895,2,2v2H20v-2c0-1.105,0.896-2,2-2H42z M31,56v-8.053 C31.334,47.963,31.662,48,32,48s0.666-0.037,1-0.053V56H31z M51,23v2v2c0,10.492-8.507,19-19,19s-19-8.508-19-19v-2v-2V4 c0-1.105,0.896-2,2-2h34c1.104,0,2,0.895,2,2V23z M53,12h5v6c0,2.76-2.238,5-5,5V12z M62,18c0,4.969-4.029,9-9,9v-2 c3.866,0,7-3.135,7-7v-7c0-0.555-0.447-1-1-1h-6V8h7c1.104,0,2,0.895,2,2V18z"
            ></path>
            <path
              fill="#394240"
              d="M39.147,19.359l-4.309-0.658l-1.936-4.123c-0.165-0.352-0.518-0.574-0.905-0.574s-0.74,0.223-0.905,0.574 l-1.936,4.123l-4.309,0.658c-0.37,0.059-0.678,0.316-0.797,0.672s-0.029,0.746,0.232,1.016l3.146,3.227l-0.745,4.564 c-0.062,0.377,0.099,0.758,0.411,0.979s0.725,0.242,1.061,0.059l3.841-2.123l3.841,2.123C35.99,29.959,36.157,30,36.323,30 c0.202,0,0.404-0.062,0.576-0.184c0.312-0.221,0.473-0.602,0.411-0.979l-0.745-4.564l3.146-3.227 c0.262-0.27,0.352-0.66,0.232-1.016S39.518,19.418,39.147,19.359z M34.781,23.238c-0.222,0.227-0.322,0.545-0.271,0.859 l0.495,3.029l-2.522-1.395c-0.151-0.084-0.317-0.125-0.484-0.125s-0.333,0.041-0.484,0.125l-2.522,1.395l0.495-3.029 c0.051-0.314-0.05-0.633-0.271-0.859l-2.141-2.193l2.913-0.447c0.329-0.049,0.612-0.26,0.754-0.562l1.257-2.678l1.257,2.678 c0.142,0.303,0.425,0.514,0.754,0.562l2.913,0.447L34.781,23.238z"
            ></path>
          </g>
          <path
            fill="#F76D57"
            d="M34.781,23.238c-0.222,0.227-0.322,0.545-0.271,0.859l0.495,3.029l-2.522-1.395 c-0.151-0.084-0.317-0.125-0.484-0.125s-0.333,0.041-0.484,0.125l-2.522,1.395l0.495-3.029c0.051-0.314-0.05-0.633-0.271-0.859 l-2.141-2.193l2.913-0.447c0.329-0.049,0.612-0.26,0.754-0.562l1.257-2.678l1.257,2.678c0.142,0.303,0.425,0.514,0.754,0.562 l2.913,0.447L34.781,23.238z"
          ></path>
          <g>
            <path
              fill="#B4CCB9"
              d="M2,10v8c0,4.969,4.029,9,9,9v-2c-3.866,0-7-3.135-7-7v-7c0-0.555,0.447-1,1-1h6V8H4C2.896,8,2,8.895,2,10z "
            ></path>
            <path
              fill="#B4CCB9"
              d="M60,8h-7v2h6c0.553,0,1,0.445,1,1v7c0,3.865-3.134,7-7,7v2c4.971,0,9-4.031,9-9v-8C62,8.895,61.104,8,60,8 z"
            ></path>
            <path
              fill="#B4CCB9"
              d="M42,58H22c-1.104,0-2,0.895-2,2v2h24v-2C44,58.895,43.104,58,42,58z"
            ></path>
            <path
              fill="#B4CCB9"
              d="M33,47.947C32.666,47.963,32.338,48,32,48s-0.666-0.037-1-0.053V56h2V47.947z"
            ></path>
          </g>
          <path
            opacity="0.15"
            fill="#231F20"
            d="M33,47.947C32.666,47.963,32.338,48,32,48s-0.666-0.037-1-0.053V56h2V47.947z"
          ></path>
        </g>
      </g>
    </svg>

    <h1
      v-if="!leagueStatusComplete"
      class="mt-3 text-xl font-semibold tracking-tight text-center text-gray-900 dark:text-white"
    >
      Projected League Champ
    </h1>
    <h1
      v-else
      class="mt-3 text-xl font-semibold tracking-tight text-center text-gray-900 dark:text-white"
    >
      League Champ
    </h1>
    <div class="flex justify-center mt-2">
      <img
        alt="League winner user avatar"
        v-if="winner && winner.avatarImg"
        class="rounded-full w-7 h-7"
        :src="winner.avatarImg"
      />
      <svg
        v-else
        class="text-gray-800 w-7 h-7 dark:text-white"
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z"
        />
      </svg>
      <p
        v-if="winner"
        class="mx-2 mt-0.5 text-gray-800 text-md dark:text-white"
      >
        {{ winner.name }}
      </p>
      <p v-else class="mx-2 mt-0.5 text-gray-800 text-md dark:text-white">
        Undecided
      </p>
    </div>
  </div>
</template>
