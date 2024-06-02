<script setup lang="ts">
import { computed } from "vue";
import { useStore } from "../store/store";
const store = useStore();

const matchRosterId = (rosterId: string) => {
  if (!store.leagueInfo[store.currentLeagueIndex]) return "";
  const userId = store.leagueInfo[store.currentLeagueIndex].rosters.find(
    (roster) => roster.rosterId === rosterId
  );
  const userObject = store.leagueInfo[store.currentLeagueIndex].users.find(
    (user) => user.id === userId.id
  );
  return userObject;
};

const numberOfRounds = computed(() => {
  return store.leagueInfo[store.currentLeagueIndex].winnersBracket.reduce(
    (acc, curr) => {
      return curr.r > acc ? curr.r : acc;
    },
    0
  );
});
</script>
<template>
  <p class="mt-2 text-xl font-semibold">Winner's Bracket</p>
  <div v-if="store.leagueInfo[store.currentLeagueIndex]" class="flex">
    <div v-for="index in numberOfRounds">
      <p class="mt-2 font-semibold text-md">Round {{ index }}</p>
      <div
        v-for="matchup in store.leagueInfo[store.currentLeagueIndex]
          .winnersBracket"
      >
        <div
          v-if="index === matchup.r"
          class="block p-4 my-4 mr-4 bg-white border border-gray-200 rounded-lg shadow w-72 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700"
        >
          <p v-if="matchup.p === 1">Championship</p>
          <div class="flex mb-2">
            <img
              alt="User avatar"
              v-if="matchRosterId(matchup.t1).avatarImg"
              class="w-8 h-8 rounded-full"
              :src="matchRosterId(matchup.t1).avatarImg"
            />
            <p
              class="mx-2"
              :class="{ 'text-green-500': matchup.t1 === matchup.w }"
            >
              {{ matchRosterId(matchup.t1).name }}
            </p>
          </div>
          <div>
            <div class="flex m">
              <img
                alt="User avatar"
                v-if="matchRosterId(matchup.t2).avatarImg"
                class="w-8 h-8 rounded-full"
                :src="matchRosterId(matchup.t2).avatarImg"
              />
              <p
                class="mx-2"
                :class="{ 'text-green-500': matchup.t2 === matchup.w }"
              >
                {{ matchRosterId(matchup.t2).name }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
