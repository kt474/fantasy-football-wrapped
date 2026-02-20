<script setup lang="ts">
import { computed } from "vue";
import maxBy from "lodash/maxBy";
import toPairs from "lodash/toPairs";
import { UserType, RosterType } from "../../types/types";
import { useStore } from "../../store/store";

const store = useStore();

const props = defineProps<{
  users: UserType[];
  rosters: RosterType[];
  mostTransactions: Record<string, number>;
}>();

const mostTransactions = computed<[string, number] | null>(
  () => maxBy(toPairs(props.mostTransactions), ([, value]) => value) ?? null
);

const mostTransactionsUser = computed<UserType | null>(() => {
  const entry = mostTransactions.value;
  if (!entry) return null;
  return props.users.find((user) => user.id === entry[0]) ?? null;
});
</script>
<template>
  <div>
    <div class="flex px-3">
      <div>
        <p class="text-lg font-semibold">Most Active</p>
        <div class="flex xl:w-36 w-52">
          <img
            alt="Most transactions user avatar"
            v-if="
              mostTransactions &&
              mostTransactionsUser &&
              mostTransactionsUser.avatarImg
            "
            class="w-6 h-6 rounded-full"
            :src="mostTransactionsUser.avatarImg"
          />
          <svg
            v-else
            class="w-6 h-6"
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
            class="ml-3 xl:truncate text-md xl:max-w-32 max-w-52"
          >
            {{
              store.showUsernames
                ? mostTransactionsUser.username
                : mostTransactionsUser.name
            }}
          </p>
          <p v-else class="ml-3 text-md">Undecided</p>
        </div>
      </div>
      <div class="flex flex-wrap w-24 mt-2 ml-auto">
        <p
          class="flex flex-col items-end ml-auto text-right text-md text-pretty"
        >
          <span class="font-semibold">
            {{ mostTransactions ? mostTransactions[1] : "0" }}
          </span>
          <span class="text-sm">Roster moves</span>
        </p>
      </div>
    </div>
  </div>
</template>
