<script setup lang="ts">
import { computed } from "vue";
import { RosterType, UserType } from "../api/types";
const props = defineProps<{
  users: UserType[];
  rosters: RosterType[];
}>();

const bestManager: any = computed(() => {
  const rosterEfficiency = props.rosters.reduce(
    (highestValue: any, roster: RosterType) => {
      return roster.managerEfficiency > highestValue.managerEfficiency
        ? roster
        : highestValue;
    }
  );
  return rosterEfficiency;
});

const bestManagerUser: any = computed(() => {
  return props.users.filter(
    (user: any) => user.id === bestManager.value["id"]
  )[0];
});
</script>
<template>
  <div
    :class="props.users.length <= 10 ? 'h-36' : 'h-44'"
    class="block w-full p-2 bg-white border border-gray-200 rounded-lg shadow sm:w-auto dark:bg-gray-800 dark:border-gray-700 min-w-56"
  >
    <svg
      :class="props.users.length <= 10 ? 'w-9' : 'w-14 mt-1.5'"
      class="mx-auto my-1"
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
              d="M62,60c0,1.104-0.896,2-2,2H4c-1.104,0-2-0.896-2-2V4c0-1.104,0.896-2,2-2h56c1.104,0,2,0.896,2,2V60z"
            ></path>
            <g>
              <path
                fill="#394240"
                d="M60,0H4C1.789,0,0,1.789,0,4v56c0,2.211,1.789,4,4,4h56c2.211,0,4-1.789,4-4V4C64,1.789,62.211,0,60,0z M62,60c0,1.104-0.896,2-2,2H4c-1.104,0-2-0.896-2-2V4c0-1.104,0.896-2,2-2h56c1.104,0,2,0.896,2,2V60z"
              ></path>
              <path
                fill="#394240"
                d="M35,8h-6c-0.553,0-1,0.447-1,1v47h8V9C36,8.447,35.553,8,35,8z M34,54h-4V40h4V54z M34,38h-4V10h4V38z"
              ></path>
              <path
                fill="#394240"
                d="M25,16h-6c-0.553,0-1,0.447-1,1v39h8V17C26,16.447,25.553,16,25,16z M24,54h-4V44h4V54z M24,42h-4V18h4 V42z"
              ></path>
              <path
                fill="#394240"
                d="M55,24h-6c-0.553,0-1,0.447-1,1v31h8V25C56,24.447,55.553,24,55,24z M54,54h-4V44h4V54z M54,42h-4V26h4 V42z"
              ></path>
              <path
                fill="#394240"
                d="M45,32h-6c-0.553,0-1,0.447-1,1v23h8V33C46,32.447,45.553,32,45,32z M44,54h-4v-6h4V54z M44,46h-4V34h4 V46z"
              ></path>
              <path
                fill="#394240"
                d="M15,24H9c-0.553,0-1,0.447-1,1v31h8V25C16,24.447,15.553,24,15,24z M14,54h-4v-6h4V54z M14,46h-4V26h4V46 z"
              ></path>
            </g>
          </g>
          <g>
            <rect x="10" y="26" fill="#B4CCB9" width="4" height="20"></rect>
            <rect x="20" y="18" fill="#45AAB8" width="4" height="24"></rect>
            <rect x="40" y="34" fill="#F76D57" width="4" height="12"></rect>
            <rect x="30" y="40" fill="#45AAB8" width="4" height="14"></rect>
            <rect x="50" y="26" fill="#B4CCB9" width="4" height="16"></rect>
            <rect x="30" y="10" fill="#45AAB8" width="4" height="28"></rect>
            <rect x="10" y="48" fill="#B4CCB9" width="4" height="6"></rect>
            <rect x="40" y="48" fill="#F76D57" width="4" height="6"></rect>
            <rect x="50" y="44" fill="#B4CCB9" width="4" height="10"></rect>
            <rect x="20" y="44" fill="#45AAB8" width="4" height="10"></rect>
          </g>
          <g opacity="0.2">
            <rect x="30" y="40" width="4" height="14"></rect>
            <rect x="10" y="48" width="4" height="6"></rect>
            <rect x="40" y="48" width="4" height="6"></rect>
            <rect x="50" y="44" width="4" height="10"></rect>
            <rect x="20" y="44" width="4" height="10"></rect>
          </g>
        </g>
      </g>
    </svg>
    <h1
      class="text-xl font-semibold tracking-tight text-center text-gray-900 dark:text-white"
    >
      Best Manager
    </h1>
    <div class="flex justify-center mt-1 mb-2">
      <img
        alt="Best manager user avatar"
        v-if="bestManagerUser.avatarImg"
        class="rounded-full w-7 h-7"
        :src="bestManagerUser.avatarImg"
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
      <p class="mx-3 mt-1 text-gray-800 text-md dark:text-white">
        {{ bestManagerUser.name }}
      </p>
    </div>
    <p
      :class="props.users.length <= 10 ? '-mt-1' : ''"
      class="mx-auto leading-5 text-center text-gray-800 text-md dark:text-white"
    >
      <span class="font-semibold"
        >{{ (bestManager.managerEfficiency * 100).toFixed(1) }}%</span
      >
      efficiency
    </p>
  </div>
</template>
