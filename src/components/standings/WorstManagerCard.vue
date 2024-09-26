<script setup lang="ts">
import { computed } from "vue";
import { RosterType, UserType } from "../../api/types";
const props = defineProps<{
  users: UserType[];
  rosters: RosterType[];
  cardHeight: string;
}>();

const worstManager: any = computed(() => {
  const rosterEfficiency = props.rosters.reduce(
    (highestValue: any, roster: RosterType) => {
      return roster.managerEfficiency < highestValue.managerEfficiency
        ? roster
        : highestValue;
    }
  );
  return rosterEfficiency.managerEfficiency ? rosterEfficiency : null;
});

const worstManagerUser: any = computed(() => {
  return props.users.filter(
    (user: any) => user.id === worstManager.value["id"]
  )[0];
});
</script>
<template>
  <div
    :class="props.cardHeight"
    class="block w-full p-2 bg-white border border-gray-200 rounded-lg shadow sm:w-auto dark:bg-gray-800 dark:border-gray-700 min-w-56"
  >
    <svg
      :class="{
        'w-8 mt-px': props.rosters.length <= 10,
        'w-14': props.rosters.length <= 12 && props.rosters.length > 10,
        'w-16 mt-4': props.rosters.length > 12,
      }"
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
          <path
            fill="#B4CCB9"
            d="M55,60c0,1.104-0.896,2-2,2H11c-1.104,0-2-0.896-2-2V14h46V60z"
          ></path>
          <g>
            <path
              fill="#F9EBB2"
              d="M56,6H8C6.896,6,6,6.896,6,8v4h52V8C58,6.896,57.104,6,56,6z"
            ></path>
          </g>
          <path
            fill="#506C7F"
            d="M36,2h-8c-1.104,0-2,0.896-2,2h12C38,2.896,37.104,2,36,2z"
          ></path>
          <g>
            <path
              fill="#394240"
              d="M56,4H40c0-2.211-1.789-4-4-4h-8c-2.211,0-4,1.789-4,4H8C5.789,4,4,5.789,4,8v5c0,0.553,0.447,1,1,1h2v46 c0,2.211,1.789,4,4,4h42c2.211,0,4-1.789,4-4V14h2c0.553,0,1-0.447,1-1V8C60,5.789,58.211,4,56,4z M28,2h8c1.104,0,2,0.896,2,2H26 C26,2.896,26.896,2,28,2z M55,60c0,1.104-0.896,2-2,2H11c-1.104,0-2-0.896-2-2V14h46V60z M58,12H6V8c0-1.104,0.896-2,2-2h48 c1.104,0,2,0.896,2,2V12z"
            ></path>
            <path
              fill="#394240"
              d="M20,54c1.657,0,3-1.343,3-3V25c0-1.657-1.343-3-3-3s-3,1.343-3,3v26C17,52.657,18.343,54,20,54z M19,25 c0-0.553,0.447-1,1-1s1,0.447,1,1v26c0,0.553-0.447,1-1,1s-1-0.447-1-1V25z"
            ></path>
            <path
              fill="#394240"
              d="M32,54c1.657,0,3-1.343,3-3V25c0-1.657-1.343-3-3-3s-3,1.343-3,3v26C29,52.657,30.343,54,32,54z M31,25 c0-0.553,0.447-1,1-1s1,0.447,1,1v26c0,0.553-0.447,1-1,1s-1-0.447-1-1V25z"
            ></path>
            <path
              fill="#394240"
              d="M44,54c1.657,0,3-1.343,3-3V25c0-1.657-1.343-3-3-3s-3,1.343-3,3v26C41,52.657,42.343,54,44,54z M43,25 c0-0.553,0.447-1,1-1s1,0.447,1,1v26c0,0.553-0.447,1-1,1s-1-0.447-1-1V25z"
            ></path>
          </g>
          <g opacity="0.15">
            <path
              fill="#231F20"
              d="M20,24c-0.553,0-1,0.447-1,1v26c0,0.553,0.447,1,1,1s1-0.447,1-1V25C21,24.447,20.553,24,20,24z"
            ></path>
            <path
              fill="#231F20"
              d="M32,24c-0.553,0-1,0.447-1,1v26c0,0.553,0.447,1,1,1s1-0.447,1-1V25C33,24.447,32.553,24,32,24z"
            ></path>
            <path
              fill="#231F20"
              d="M44,24c-0.553,0-1,0.447-1,1v26c0,0.553,0.447,1,1,1s1-0.447,1-1V25C45,24.447,44.553,24,44,24z"
            ></path>
          </g>
        </g>
      </g>
    </svg>
    <h1
      class="text-xl font-semibold tracking-tight text-center text-gray-900 dark:text-white"
    >
      Worst Manager
    </h1>
    <div class="mt-2 text-center">
      <div
        class="flex justify-center"
        :class="props.users.length <= 10 ? '-mt-1' : ''"
      >
        <img
          alt="Worst manager user avatar"
          v-if="worstManager && worstManagerUser && worstManagerUser.avatarImg"
          class="rounded-full w-7 h-7"
          :src="worstManagerUser.avatarImg"
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
          v-if="worstManager && worstManagerUser"
          class="mx-3 mt-0.5 text-gray-800 text-md dark:text-white"
        >
          {{ worstManagerUser.name }}
        </p>
        <p v-else class="mx-3 mt-1 text-gray-800 text-md dark:text-white">
          Undecided
        </p>
      </div>
      <p class="mx-auto mt-2 leading-5 text-gray-800 text-md dark:text-white">
        <span v-if="worstManager && worstManagerUser" class="font-semibold"
          >{{ (worstManager.managerEfficiency * 100).toFixed(1) }}%</span
        >
        <span v-else class="font-semibold">0%</span>
        efficiency
      </p>
    </div>
  </div>
</template>
