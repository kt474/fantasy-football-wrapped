<script setup lang="ts">
import { computed } from "vue";
import { maxBy, toPairs } from "lodash";
import { UserType, RosterType } from "../../api/types";

const props = defineProps<{
  users: UserType[];
  rosters: RosterType[];
  mostTransactions: object;
  cardHeight: string;
}>();

const mostTransactions: any = computed(() => {
  return maxBy(toPairs(props.mostTransactions), ([, value]) => value);
});

const mostTransactionsUser: any = computed(() => {
  if (mostTransactions.value) {
    return props.users.filter(
      (user: any) => user.id === mostTransactions.value[0]
    )[0];
  } else {
    return props.users[0];
  }
});
</script>
<template>
  <div
    :class="props.cardHeight"
    class="block w-full p-2 bg-white border border-gray-200 rounded-lg shadow sm:w-auto dark:bg-gray-800 dark:border-gray-700 min-w-56"
  >
    <svg
      :class="{
        'w-9 -mt-1': props.rosters.length <= 10,
        'w-14': props.rosters.length <= 12 && props.rosters.length > 10,
        'w-16 mt-3': props.rosters.length > 12,
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
          <rect x="2" y="20" fill="#506C7F" width="60" height="8"></rect>
          <g>
            <path
              fill="#B4CCB9"
              d="M2,52c0,1.104,0.896,2,2,2h56c1.104,0,2-0.896,2-2V30H2V52z"
            ></path>
            <path
              fill="#B4CCB9"
              d="M60,10H4c-1.104,0-2,0.895-2,2v6h60v-6C62,10.895,61.104,10,60,10z"
            ></path>
          </g>
          <path
            fill="#394240"
            d="M60,8H4c-2.211,0-4,1.789-4,4v40c0,2.211,1.789,4,4,4h56c2.211,0,4-1.789,4-4V12C64,9.789,62.211,8,60,8z M62,52c0,1.104-0.896,2-2,2H4c-1.104,0-2-0.896-2-2V30h60V52z M62,28H2v-8h60V28z M62,18H2v-6c0-1.105,0.896-2,2-2h56 c1.104,0,2,0.895,2,2V18z"
          ></path>
          <path
            fill="#394240"
            d="M11,40h14c0.553,0,1-0.447,1-1s-0.447-1-1-1H11c-0.553,0-1,0.447-1,1S10.447,40,11,40z"
          ></path>
          <path
            fill="#394240"
            d="M29,40h6c0.553,0,1-0.447,1-1s-0.447-1-1-1h-6c-0.553,0-1,0.447-1,1S28.447,40,29,40z"
          ></path>
          <path
            fill="#394240"
            d="M11,46h10c0.553,0,1-0.447,1-1s-0.447-1-1-1H11c-0.553,0-1,0.447-1,1S10.447,46,11,46z"
          ></path>
          <path
            fill="#394240"
            d="M45,46h8c0.553,0,1-0.447,1-1v-6c0-0.553-0.447-1-1-1h-8c-0.553,0-1,0.447-1,1v6C44,45.553,44.447,46,45,46 z M46,40h6v4h-6V40z"
          ></path>
          <rect x="46" y="40" fill="#F9EBB2" width="6" height="4"></rect>
        </g>
      </g>
    </svg>
    <p
      class="text-xl font-semibold tracking-tight text-center text-gray-900 dark:text-white"
    >
      Most Transactions
    </p>
    <div class="mt-2 text-center">
      <div class="flex justify-center -mt-0.5">
        <img
          alt="Most transactions user avatar"
          v-if="
            mostTransactions &&
            mostTransactionsUser &&
            mostTransactionsUser.avatarImg
          "
          class="rounded-full w-7 h-7"
          :src="mostTransactionsUser.avatarImg"
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
          v-if="mostTransactions && mostTransactionsUser"
          class="mx-3 mt-0.5 text-gray-800 text-md dark:text-white"
        >
          {{ mostTransactionsUser.name }}
        </p>
        <p v-else class="mx-3 mt-0.5 text-gray-800 text-md dark:text-white">
          Undecided
        </p>
      </div>
      <p
        class="mx-auto mt-1 leading-5 text-gray-800 text-md dark:text-white text-pretty"
      >
        <span class="font-semibold">{{
          mostTransactions ? mostTransactions[1] : "0"
        }}</span>
        Roster moves
      </p>
    </div>
  </div>
</template>
