<script setup lang="ts">
import { ref, onMounted, watch, computed } from "vue";
import { generateTrends } from "../../api/api";
import { getDraftProjections, getDraftPicks } from "../../api/api";
import { TableDataType, LeagueInfoType } from "../../api/types";
import { useStore } from "../../store/store";
import { fakeHighlights } from "../../api/helper";

const store = useStore();
const props = defineProps<{
  tableData: TableDataType[];
}>();

const currentTrends: any = ref("");

const getCurrentStreak = (str: string) => {
  const match = str.match(/([WL])\1*$/);
  if (!match) return "";
  return match[1] + match[0].length;
};

const getFiveMostRecent = (str: string, n = 5) => {
  const recent = str.slice(-n);

  const wins = (recent.match(/W/g) || []).length;
  const losses = (recent.match(/L/g) || []).length;
  return `${wins}-${losses}`;
};

const getPreseasonData = async () => {
  const currentLeague = store.leagueInfo[store.currentLeagueIndex];
  const seasonState =
    currentLeague?.seasonType === "Dynasty" && currentLeague?.previousLeagueId
      ? "dynasty"
      : "preseason";

  let result: any[] = [];
  if (currentLeague) {
    const draftPicks = await getDraftPicks(
      currentLeague.draftId,
      currentLeague.season,
      currentLeague.scoringType,
      currentLeague.seasonType
    );
    const first2Rounds = draftPicks.slice(0, currentLeague.rosters.length);
    const qbs = currentLeague.rosterPositions.reduce(
      (sum, item) => sum + (item === "QB" || item === "SUPER_FLEX" ? 1 : 0),
      0
    );
    const promises = first2Rounds.map(async (pick) => {
      const projections = await getDraftProjections(
        pick.playerId,
        currentLeague.season,
        currentLeague.scoringType,
        currentLeague.seasonType,
        true ? qbs >= 2 : false
      );
      if (seasonState === "dynasty") {
        return {
          draftSlot: pick.draftSlot,
          name: `${pick.firstName} ${pick.lastName}`,
          position: pick.position,
          projectedPoints: projections.projectedPoints,
          userName: getNameFromId(pick.userId),
          NFLTeam: pick.team,
        };
      }
      return {
        draftSlot: pick.draftSlot,
        name: `${pick.firstName} ${pick.lastName}`,
        position: pick.position,
        projectedPoints: projections.projectedPoints,
        userName: getNameFromId(pick.userId),
        adp: projections.adp,
      };
    });
    result = await Promise.all(promises);
  }
  if (result) {
    let response;
    try {
      if (currentLeague && currentLeague.rosters.length <= 8) {
        response = await generateTrends(result, 60, 2, seasonState);
      } else if (currentLeague && currentLeague.rosters.length <= 10) {
        response = await generateTrends(result, 65, 2, seasonState);
      } else {
        response = await generateTrends(result, 75, 3, seasonState);
      }
      currentTrends.value = response.bulletPoints.map((trend: string) =>
        trend.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
      );
      store.addCurrentTrends(currentLeague.leagueId, currentTrends.value);
      localStorage.setItem(
        "leagueInfo",
        JSON.stringify(store.leagueInfo as LeagueInfoType[])
      );
    } catch (e) {
      currentTrends.value = [
        "Unable to generate league news. Please try again later",
      ];
      store.addCurrentTrends(currentLeague.leagueId, currentTrends.value);
      localStorage.setItem(
        "leagueInfo",
        JSON.stringify(store.leagueInfo as LeagueInfoType[])
      );
    }
  }
};

const getNameFromId = (userId: string) => {
  const userObj = props.tableData.find((user) => user.id === userId);
  if (userObj) {
    return store.showUsernames ? userObj.username : userObj.name;
  }
};

const formatData = async () => {
  const currentLeague = store.leagueInfo[store.currentLeagueIndex];
  const userData = props.tableData.map((user) => {
    return {
      name: store.showUsernames ? user.username : user.name,
      record: `${user.wins}-${user.losses}`,
      totalPoints: user.pointsFor,
      currentStreak: user.recordByWeek
        ? getCurrentStreak(user.recordByWeek)
        : "",
      lastFiveResults: user.recordByWeek
        ? getFiveMostRecent(user.recordByWeek)
        : "",
      lastFiveScores: user.points ? user.points.slice(-5) : [],
      currentRanking: user.regularSeasonRank,
    };
  });

  try {
    let response;
    if (currentLeague.rosters.length <= 8) {
      response = await generateTrends(userData, 60, 2);
    } else if (currentLeague.rosters.length <= 10) {
      response = await generateTrends(userData, 65, 2);
    } else {
      response = await generateTrends(userData, 75, 3);
    }
    currentTrends.value = response.bulletPoints.map((trend: string) =>
      trend.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
    );
    store.addCurrentTrends(currentLeague.leagueId, currentTrends.value);
    localStorage.setItem(
      "leagueInfo",
      JSON.stringify(store.leagueInfo as LeagueInfoType[])
    );
  } catch {
    currentTrends.value = [
      "Unable to generate league news. Please try again later",
    ];
    store.addCurrentTrends(currentLeague.leagueId, currentTrends.value);
    localStorage.setItem(
      "leagueInfo",
      JSON.stringify(store.leagueInfo as LeagueInfoType[])
    );
  }
};

onMounted(async () => {
  if (
    store.leagueInfo.length > 0 &&
    !store.leagueInfo[store.currentLeagueIndex]?.currentTrends &&
    store.leagueInfo[store.currentLeagueIndex]?.lastScoredWeek
  ) {
    await formatData();
  } else if (
    store.leagueInfo.length > 0 &&
    !store.leagueInfo[store.currentLeagueIndex]?.currentTrends &&
    store.leagueInfo[store.currentLeagueIndex]?.status !== "pre_draft"
  ) {
    await getPreseasonData();
  } else if (store.leagueInfo.length == 0) {
    currentTrends.value = fakeHighlights;
  } else if (
    store.leagueInfo.length > 0 &&
    (store.leagueInfo[store.currentLeagueIndex]?.lastScoredWeek ||
      store.leagueInfo[store.currentLeagueIndex]?.status === "in_season")
  ) {
    const savedText: any = store.leagueInfo[store.currentLeagueIndex]
      .currentTrends
      ? store.leagueInfo[store.currentLeagueIndex].currentTrends
      : "";
    currentTrends.value = savedText;
  }
});

watch(
  () => store.currentLeagueId,
  async () => {
    if (
      !store.leagueInfo[store.currentLeagueIndex].currentTrends &&
      store.leagueInfo[store.currentLeagueIndex].lastScoredWeek
    ) {
      currentTrends.value = "";
      await formatData();
    }
    currentTrends.value =
      store.leagueInfo[store.currentLeagueIndex].currentTrends;
  }
);

const cardHeight = computed(() => {
  const currentLeague = store.leagueInfo[store.currentLeagueIndex];
  if (!currentLeague) {
    return "min-h-[215px] xl:min-h-[360px]";
  } else {
    if (currentLeague.rosters.length <= 8) {
      return "min-h-[200px] xl:min-h-[320px]";
    } else if (currentLeague.rosters.length <= 10) {
      return "min-h-[200px] xl:min-h-[380px]";
    } else if (currentLeague.rosters.length <= 12) {
      return "min-h-[215px] xl:min-h-[455px]";
    } else {
      return "min-h-[215px] xl:min-h-[610px]";
    }
  }
});
</script>
<template>
  <div
    :class="[cardHeight]"
    class="block w-auto px-6 py-4 bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700"
  >
    <h1 class="-mt-0.5 text-2xl font-semibold text-gray-900 dark:text-gray-50">
      League News
    </h1>
    <div v-if="currentTrends">
      <ul
        class="mr-0 text-gray-800 divide-y divide-gray-300 space-y dark:text-gray-200 dark:divide-gray-700"
      >
        <li
          v-for="(trend, index) in currentTrends"
          :key="trend"
          class="flex gap-2 py-3"
        >
          <svg
            v-if="index == 0 && currentTrends.length > 1"
            class="w-6 h-6 flex-shrink-0 mr-2 xl:mt-1.5 mt-1"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 64 64"
            fill="currentColor"
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
          <svg
            v-else-if="index == 1"
            class="w-6 h-6 flex-shrink-0 mr-2 xl:mt-1.5 mt-1"
            version="1.0"
            id="Layer_1"
            xmlns="http://www.w3.org/2000/svg"
            xmlns:xlink="http://www.w3.org/1999/xlink"
            viewBox="0 0 64 64"
            enable-background="new 0 0 64 64"
            xml:space="preserve"
          >
            <g>
              <path
                fill="#394240"
                d="M60,0H4C1.789,0,0,1.789,0,4v56c0,2.211,1.789,4,4,4h56c2.211,0,4-1.789,4-4V4C64,1.789,62.211,0,60,0z
		 M4,2h56c1.104,0,2,0.896,2,2v21.428l-11.409,6.713C49.49,30.832,47.844,30,46,30c-1.8,0-3.41,0.796-4.51,2.051l-15.93-9.803
		C25.842,21.553,26,20.796,26,20c0-3.314-2.686-6-6-6s-6,2.686-6,6c0,1.296,0.414,2.492,1.112,3.473L2,36.586V4C2,2.896,2.896,2,4,2
		z M46,32c2.209,0,4,1.791,4,4s-1.791,4-4,4s-4-1.791-4-4S43.791,32,46,32z M16,20c0-2.209,1.791-4,4-4s4,1.791,4,4s-1.791,4-4,4
		S16,22.209,16,20z M60,62H4c-1.104,0-2-0.896-2-2V39.414l14.526-14.527C17.507,25.586,18.704,26,20,26c1.8,0,3.41-0.795,4.51-2.051
		l15.93,9.804C40.158,34.447,40,35.205,40,36c0,3.314,2.686,6,6,6s6-2.686,6-6c0-0.752-0.145-1.471-0.397-2.135L62,27.748V60
		C62,61.104,61.104,62,60,62z"
              />
              <circle fill="#F76D57" cx="46" cy="36" r="4" />
              <circle fill="#45AAB8" cx="20" cy="20" r="4" />
              <g>
                <path
                  fill="#F9EBB2"
                  d="M60,2H4C2.896,2,2,2.896,2,4v32.586l13.112-13.113C14.414,22.492,14,21.296,14,20c0-3.314,2.686-6,6-6
			s6,2.686,6,6c0,0.796-0.158,1.553-0.439,2.248l15.93,9.803C42.59,30.796,44.2,30,46,30c1.844,0,3.49,0.832,4.591,2.141L62,25.428
			V4C62,2.896,61.104,2,60,2z"
                />
              </g>
              <path
                fill="#B4CCB9"
                d="M52,36c0,3.314-2.686,6-6,6s-6-2.686-6-6c0-0.795,0.158-1.553,0.439-2.247l-15.93-9.804
		C23.41,25.205,21.8,26,20,26c-1.296,0-2.493-0.414-3.474-1.113L2,39.414V60c0,1.104,0.896,2,2,2h56c1.104,0,2-0.896,2-2V27.748
		l-10.397,6.117C51.855,34.529,52,35.248,52,36z"
              />
            </g>
          </svg>
          <svg
            v-else-if="index == 2"
            class="w-6 h-6 flex-shrink-0 mr-2 xl:mt-1.5 mt-1"
            version="1.0"
            id="Layer_1"
            xmlns="http://www.w3.org/2000/svg"
            xmlns:xlink="http://www.w3.org/1999/xlink"
            viewBox="0 0 64 64"
            enable-background="new 0 0 64 64"
            xml:space="preserve"
          >
            <g>
              <g>
                <circle fill="#F9EBB2" cx="32" cy="22" r="16" />
                <path
                  fill="#F9EBB2"
                  d="M32,2c-11.028,0-20,8.972-20,20s8.972,20,20,20s20-8.972,20-20S43.028,2,32,2z M32,40
			c-9.941,0-18-8.059-18-18S22.059,4,32,4s18,8.059,18,18S41.941,40,32,40z"
                />
              </g>
              <g>
                <path
                  fill="#45AAB8"
                  d="M20,60l2-1.5V41.586c-0.688-0.353-1.355-0.74-2-1.161V60z"
                />
                <path
                  fill="#45AAB8"
                  d="M24,42.487V57l6.8-5.1L32,51l1.2,0.9L40,57V42.487C37.519,43.46,34.822,44,32,44S26.481,43.46,24,42.487z"
                />
                <path
                  fill="#45AAB8"
                  d="M42,41.586V58.5l2,1.5V40.425C43.355,40.846,42.688,41.233,42,41.586z"
                />
              </g>
              <g>
                <path
                  fill="#394240"
                  d="M32,0C19.869,0,10,9.869,10,22c0,6.816,3.117,12.92,8,16.958V60c0,0.758,0.428,1.45,1.105,1.789
			C19.388,61.931,19.694,62,19.998,62c0.426,0,0.848-0.136,1.202-0.4L32,53.5l10.8,8.1c0.354,0.265,0.775,0.4,1.2,0.4
			c0.305,0,0.611-0.069,0.895-0.211C45.572,61.45,46,60.758,46,60V38.958C50.883,34.92,54,28.816,54,22C54,9.869,44.131,0,32,0z
			 M22,58.5L20,60V40.425c0.645,0.421,1.312,0.809,2,1.161V58.5z M40,57l-6.8-5.1L32,51l-1.2,0.9L24,57V42.487
			C26.481,43.46,29.178,44,32,44s5.519-0.54,8-1.513V57z M44,60l-2-1.5V41.586c0.688-0.353,1.355-0.74,2-1.161V60z M32,42
			c-11.028,0-20-8.972-20-20S20.972,2,32,2s20,8.972,20,20S43.028,42,32,42z"
                />
                <path
                  fill="#394240"
                  d="M32,4c-9.925,0-18,8.075-18,18s8.075,18,18,18s18-8.075,18-18S41.925,4,32,4z M32,38
			c-8.822,0-16-7.178-16-16S23.178,6,32,6s16,7.178,16,16S40.822,38,32,38z"
                />
                <path
                  fill="#394240"
                  d="M39.147,19.361l-4.309-0.658l-1.936-4.123c-0.165-0.352-0.518-0.575-0.905-0.575s-0.74,0.224-0.905,0.575
			l-1.936,4.123l-4.309,0.658c-0.37,0.057-0.678,0.315-0.797,0.671s-0.029,0.747,0.232,1.016l3.146,3.227l-0.745,4.564
			c-0.062,0.378,0.099,0.758,0.411,0.979s0.725,0.243,1.061,0.058l3.841-2.124l3.841,2.124C35.99,29.959,36.157,30,36.323,30
			c0.202,0,0.404-0.062,0.576-0.183c0.312-0.221,0.473-0.601,0.411-0.979l-0.745-4.564l3.146-3.227
			c0.262-0.269,0.352-0.66,0.232-1.016S39.518,19.418,39.147,19.361z M34.781,23.239c-0.222,0.228-0.322,0.546-0.271,0.859
			l0.495,3.029l-2.522-1.395c-0.151-0.083-0.317-0.125-0.484-0.125s-0.333,0.042-0.484,0.125l-2.522,1.395l0.495-3.029
			c0.051-0.313-0.05-0.632-0.271-0.859l-2.141-2.194l2.913-0.445c0.329-0.05,0.612-0.261,0.754-0.563l1.257-2.678l1.257,2.678
			c0.142,0.303,0.425,0.514,0.754,0.563l2.913,0.445L34.781,23.239z"
                />
              </g>
              <g opacity="0.2">
                <path
                  fill="#231F20"
                  d="M20,60l2-1.5V41.586c-0.688-0.353-1.355-0.74-2-1.161V60z"
                />
                <path
                  fill="#231F20"
                  d="M42,41.586V58.5l2,1.5V40.425C43.355,40.846,42.688,41.233,42,41.586z"
                />
              </g>
              <path
                opacity="0.15"
                fill="#231F20"
                d="M32,2c-11.028,0-20,8.972-20,20s8.972,20,20,20s20-8.972,20-20S43.028,2,32,2z M32,40
		c-9.941,0-18-8.059-18-18S22.059,4,32,4s18,8.059,18,18S41.941,40,32,40z"
              />
              <path
                fill="#F76D57"
                d="M34.781,23.239c-0.222,0.228-0.322,0.546-0.271,0.859l0.495,3.029l-2.522-1.395
		c-0.151-0.083-0.317-0.125-0.484-0.125s-0.333,0.042-0.484,0.125l-2.522,1.395l0.495-3.029c0.051-0.313-0.05-0.632-0.271-0.859
		l-2.141-2.194l2.913-0.445c0.329-0.05,0.612-0.261,0.754-0.563l1.257-2.678l1.257,2.678c0.142,0.303,0.425,0.514,0.754,0.563
		l2.913,0.445L34.781,23.239z"
              />
            </g>
          </svg>
          <span v-html="trend"></span>
        </li>
      </ul>
    </div>
    <div
      v-else-if="
        store.leagueInfo[store.currentLeagueIndex] &&
        !store.leagueInfo[store.currentLeagueIndex].lastScoredWeek &&
        store.leagueInfo[store.currentLeagueIndex]?.status === 'pre_draft'
      "
    >
      <p class="mt-2 text-gray-600 dark:text-gray-200">
        Please come back after week 1!
      </p>
    </div>
    <div v-else class="w-64">
      <div role="status" class="space-y-2.5 animate-pulse max-w-lg mb-6 px-2">
        <p class="mt-4 text-gray-900 dark:text-gray-300">Analyzing League...</p>
        <div class="flex items-center w-full">
          <div
            class="h-2.5 bg-gray-200 rounded-full dark:bg-gray-700 w-32"
          ></div>
          <div
            class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-24"
          ></div>
          <div
            class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-full"
          ></div>
        </div>
        <div class="flex items-center w-full max-w-[480px]">
          <div
            class="h-2.5 bg-gray-200 rounded-full dark:bg-gray-700 w-full"
          ></div>
          <div
            class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-full"
          ></div>
          <div
            class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-24"
          ></div>
        </div>
        <div class="flex items-center w-full max-w-[400px]">
          <div
            class="h-2.5 bg-gray-300 rounded-full dark:bg-gray-600 w-full"
          ></div>
          <div
            class="h-2.5 ms-2 bg-gray-200 rounded-full dark:bg-gray-700 w-80"
          ></div>
          <div
            class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-full"
          ></div>
        </div>
        <div class="flex items-center w-full max-w-[480px]">
          <div
            class="h-2.5 ms-2 bg-gray-200 rounded-full dark:bg-gray-700 w-full"
          ></div>
          <div
            class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-full"
          ></div>
          <div
            class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-24"
          ></div>
        </div>
        <div class="flex items-center w-full max-w-[440px]">
          <div
            class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-32"
          ></div>
          <div
            class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-24"
          ></div>
          <div
            class="h-2.5 ms-2 bg-gray-200 rounded-full dark:bg-gray-700 w-full"
          ></div>
        </div>
        <br />
        <div
          v-if="store.leagueInfo[store.currentLeagueIndex]?.rosters.length > 8"
          class="space-y-2.5"
        >
          <div class="flex items-center w-full max-w-[360px]">
            <div
              class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-full"
            ></div>
            <div
              class="h-2.5 ms-2 bg-gray-200 rounded-full dark:bg-gray-700 w-80"
            ></div>
            <div
              class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-full"
            ></div>
          </div>
          <div class="flex items-center w-full max-w-[400px]">
            <div
              class="h-2.5 bg-gray-300 rounded-full dark:bg-gray-600 w-full"
            ></div>
            <div
              class="h-2.5 ms-2 bg-gray-200 rounded-full dark:bg-gray-700 w-80"
            ></div>
            <div
              class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-full"
            ></div>
          </div>
          <div class="flex items-center w-full max-w-[480px]">
            <div
              class="h-2.5 ms-2 bg-gray-200 rounded-full dark:bg-gray-700 w-full"
            ></div>
            <div
              class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-full"
            ></div>
            <div
              class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-24"
            ></div>
          </div>
        </div>
        <div class="flex items-center w-full max-w-[440px]">
          <div
            class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-32"
          ></div>
          <div
            class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-24"
          ></div>
          <div
            class="h-2.5 ms-2 bg-gray-200 rounded-full dark:bg-gray-700 w-full"
          ></div>
        </div>
        <div class="flex items-center w-full max-w-[360px]">
          <div
            class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-full"
          ></div>
          <div
            class="h-2.5 ms-2 bg-gray-200 rounded-full dark:bg-gray-700 w-80"
          ></div>
          <div
            class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-full"
          ></div>
        </div>
        <br />
        <div
          v-if="store.leagueInfo[store.currentLeagueIndex]?.rosters.length > 10"
          class="space-y-2.5"
        >
          <div class="flex items-center w-full max-w-[400px]">
            <div
              class="h-2.5 bg-gray-300 rounded-full dark:bg-gray-600 w-full"
            ></div>
            <div
              class="h-2.5 ms-2 bg-gray-200 rounded-full dark:bg-gray-700 w-80"
            ></div>
            <div
              class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-full"
            ></div>
          </div>
          <div class="flex items-center w-full max-w-[480px]">
            <div
              class="h-2.5 ms-2 bg-gray-200 rounded-full dark:bg-gray-700 w-full"
            ></div>
            <div
              class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-full"
            ></div>
            <div
              class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-24"
            ></div>
          </div>
          <div class="flex items-center w-full max-w-[440px]">
            <div
              class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-32"
            ></div>
            <div
              class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-24"
            ></div>
            <div
              class="h-2.5 ms-2 bg-gray-200 rounded-full dark:bg-gray-700 w-full"
            ></div>
          </div>
          <div class="flex items-center w-full max-w-[360px]">
            <div
              class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-full"
            ></div>
            <div
              class="h-2.5 ms-2 bg-gray-200 rounded-full dark:bg-gray-700 w-80"
            ></div>
            <div
              class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-full"
            ></div>
          </div>
        </div>

        <span class="sr-only">Loading...</span>
      </div>
    </div>
  </div>
</template>
<style scoped>
@media (min-width: 1280px) {
  .custom-min-height {
    min-height: 495px;
  }
}
</style>
