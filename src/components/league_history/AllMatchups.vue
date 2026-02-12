<script setup lang="ts">
import { computed } from "vue";
import { useStore } from "../../store/store";
import { UserType } from "../../types/types";
import Card from "../ui/card/Card.vue";

const store = useStore();
const props = defineProps<{
  tableData: any[];
}>();

interface MatchupDataType {
  username: string;
  record: Record;
}

interface Record {
  losses: number;
  wins: number;
}

const matchupData = computed(() => {
  const result: MatchupDataType[][] = [];
  props.tableData.forEach((user) => {
    const currentUser: any = [];
    user.matchups.forEach((matchupId: number, index: number) => {
      if (matchupId !== null) {
        const opponentList = props.tableData.filter(
          (opp) => opp.matchups[index] == matchupId
        );
        const opponent = opponentList.find(
          (opp) => opp.username != user.username
        );
        if (
          opponent &&
          opponent.pointsArr[index] !== 0 &&
          user.pointsArr[index] !== 0
        ) {
          if (
            !currentUser
              .map((opp: any) => opp.username)
              .includes(opponent.username)
          ) {
            if (user.pointsArr[index] > opponent.pointsArr[index]) {
              currentUser.push({
                username: opponent.username,
                record: { wins: 1, losses: 0 },
              });
            } else {
              currentUser.push({
                username: opponent.username,
                record: { losses: 1, wins: 0 },
              });
            }
          } else {
            if (user.pointsArr[index] > opponent.pointsArr[index]) {
              currentUser.find((opp: any) => opp.username == opponent.username)[
                "record"
              ].wins += 1;
            } else {
              currentUser.find((opp: any) => opp.username == opponent.username)[
                "record"
              ].losses += 1;
            }
          }
        }
      }
    });
    result.push(currentUser);
  });
  return result;
});

const extractRecord = (user: MatchupDataType[], opponent: UserType) => {
  const opp = user.find((opp) => opp.username == opponent.username);
  // This is backwards but the chart is read horizontally
  return opp ? `${opp.record.losses} - ${opp.record.wins}` : "0 - 0";
};
</script>
<template>
  <Card>
    <div class="flex justify-between">
      <p
        class="w-full pt-2 text-lg font-semibold text-center rounded-t-lg bg-secondary"
      >
        All Time H2H Matchups
      </p>
    </div>
    <div class="relative w-full overflow-x-auto">
      <table class="w-full text-sm text-left rtl:text-right 0">
        <thead class="text-xs bg-secondary">
          <tr>
            <th scope="col" class="px-4 py-3 uppercase sm:px-6 w-60">
              Team Name
            </th>
            <th v-for="item in props.tableData" scope="col" class="px-2 py-3">
              <div class="flex items-center min-w-14">
                {{
                  store.showUsernames
                    ? item.username
                      ? item.username
                      : "Ghost Roster"
                    : item.name
                      ? item.name
                      : "Ghost Roster"
                }}
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(item, index) in props.tableData"
            :key="index"
            class="border-b"
          >
            <th
              scope="row"
              class="px-4 font-medium truncate sm:px-6 max-w-52 whitespace-nowrap"
            >
              {{
                store.showUsernames
                  ? item.username
                    ? item.username
                    : "Ghost Roster"
                  : item.name
                    ? item.name
                    : "Ghost Roster"
              }}
            </th>
            <td
              v-for="(user, rowIndex) in matchupData"
              class="px-2 py-3.5"
              :class="{ 'text-primary font-semibold': rowIndex == index }"
            >
              {{ extractRecord(user, item) }}
            </td>
          </tr>
        </tbody>
      </table>
      <p class="py-3 ml-2 text-xs sm:ml-6 text-muted-foreground">
        Table is meant to be read horizontally. For each team/row, each
        opponent/column is the record the team has against that opponent.
      </p>
    </div>
  </Card>
</template>
