<script setup lang="ts">
import { computed } from "vue";
import { useStore } from "../../store/store";

const store = useStore();

const props = defineProps<{
  losers: any[];
}>();

const pyramidRows = computed(() => {
  const rows = [];
  let remaining = [...props.losers];
  let rowSize = 2;

  while (remaining.length > 0) {
    if (remaining.length <= rowSize) {
      rows.push(remaining);
      break;
    }
    const chunk = remaining.slice(0, rowSize);
    rows.push(chunk);
    remaining = remaining.slice(rowSize);
    rowSize++;
  }

  return rows;
});

// Deterministic random rotation based on name
const getRotation = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  // Range -15 to 15 degrees
  return (hash % 30) - 15;
};
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-1 mt-4 isolate">
    <p class="mb-3 text-3xl font-bold text-yellow-400">
      The Rest of the League
    </p>
    <p class="mb-4 text-base sm:text-lg text-slate-200 text-balance">
      A champion needs someone to beat. Thanks for your service.
    </p>
    <div
      v-for="(row, rowIndex) in pyramidRows"
      :key="rowIndex"
      class="flex items-center justify-center"
      :style="{ zIndex: pyramidRows.length - rowIndex }"
    >
      <div
        v-for="(loser, index) in row"
        :key="loser.id || loser.name"
        class="relative flex flex-col items-center mb-1"
        :style="{
          transform: `rotate(${getRotation(loser.name || '')}deg)`,
          marginLeft: index > 0 ? '-20px' : '0',
          marginTop: rowIndex > 0 ? '-12px' : '0',
        }"
      >
        <div class="relative flex flex-col items-center">
          <img
            v-if="loser.avatarImg"
            :src="loser.avatarImg"
            class="w-10 h-10 border-2 rounded-full shadow-lg sm:w-12 sm:h-12 border-slate-600 bg-slate-800"
          />
          <div
            v-else
            class="flex items-center justify-center w-10 h-10 border-2 rounded-full shadow-lg sm:w-12 sm:h-12 border-slate-600 bg-slate-800 text-slate-500"
          >
            <span class="text-xs">{{ loser.name?.[0] }}</span>
          </div>

          <div
            class="mt-1 px-1.5 py-0.5 bg-black/40 backdrop-blur-md rounded-md border border-white/10 shadow-sm max-w-[80px] sm:max-w-[100px]"
          >
            <p
              class="text-[10px] sm:text-xs text-white font-medium truncate text-center leading-tight"
            >
              {{ store.showUsernames ? loser.username : loser.name }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
