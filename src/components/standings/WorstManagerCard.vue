<script setup lang="ts">
import { computed } from "vue";
import { RosterType, UserType } from "../../api/types";
import { useStore } from "../../store/store";

const store = useStore();
const props = defineProps<{
  users: UserType[];
  rosters: RosterType[];
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
  <div>
    <div class="flex justify-between px-3">
      <div>
        <p class="text-lg font-semibold text-gray-900 dark:text-gray-200">
          Worst Manager
        </p>
        <div>
          <div class="flex justify-center">
            <img
              alt="Worst manager user avatar"
              v-if="
                worstManager && worstManagerUser && worstManagerUser.avatarImg
              "
              class="w-6 h-6 rounded-full"
              :src="worstManagerUser.avatarImg"
            />
            <svg
              v-else
              class="w-6 h-6 text-gray-800 dark:text-gray-50"
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
              class="mx-3 text-gray-800 truncate text-md dark:text-gray-200 max-w-32"
            >
              {{
                store.showUsernames
                  ? worstManagerUser.username
                  : worstManagerUser.name
              }}
            </p>
            <p
              v-else
              class="mx-3 mt-1 text-gray-800 text-md dark:text-gray-200"
            >
              Undecided
            </p>
          </div>
        </div>
      </div>
      <div class="flex flex-wrap mt-2">
        <p
          class="flex flex-col items-end ml-auto text-right text-gray-800 text-md dark:text-gray-200"
        >
          <span v-if="worstManager && worstManagerUser" class="font-semibold">
            {{ (worstManager.managerEfficiency * 100).toFixed(1) }}%
          </span>
          <span v-else class="font-semibold">0%</span>
          <span class="text-sm">efficiency</span>
        </p>
      </div>
    </div>
  </div>
</template>
