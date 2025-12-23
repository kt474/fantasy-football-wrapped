<script setup lang="ts">
import { computed } from "vue";

// Hard coding data, not worth it to create another endpoint
//4132 2025 leagues
const leagueTypeSeries = computed(() => {
  return [2031, 2439, 638];
});

const leagueSizeSeries = computed(() => {
  return [2663, 1689, 296, 294, 190];
});

const leagueSizeChartOptions = computed(() => {
  return {
    chart: {
      width: 380,
      type: "pie",
    },
    labels: ["12", "10", "8", "14", "Other"],
    legend: {
      labels: {
        colors: ["#e5e7eb", "#e5e7eb", "#e5e7eb", "#e5e7eb", "#e5e7eb"], // array for each, or single color (e.g. '#fff')
      },
    },
    title: {
      text: "League Sizes",
      style: {
        color: "#e5e7eb",
      },
    },
    responsive: [
      {
        breakpoint: 480,
        options: {
          chart: {
            width: 290,
          },
          legend: {
            position: "bottom",
          },
        },
      },
    ],
  };
});

const leagueTypeChartOptions = computed(() => {
  return {
    chart: {
      width: 380,
      type: "pie",
    },
    labels: ["Dynasty", "Redraft", "Keeper"],
    legend: {
      labels: {
        colors: ["#e5e7eb", "#e5e7eb", "#e5e7eb"], // array for each, or single color (e.g. '#fff')
      },
    },
    title: {
      text: "League Types",
      style: {
        color: "#e5e7eb",
      },
    },
    responsive: [
      {
        breakpoint: 480,
        options: {
          chart: {
            width: 290,
          },
          legend: {
            position: "bottom",
          },
        },
      },
    ],
  };
});
</script>
<template>
  <div class="flex flex-wrap justify-center sm:flex-nowrap">
    <apexchart
      class="mb-4"
      type="pie"
      width="380"
      :options="leagueTypeChartOptions"
      :series="leagueTypeSeries"
    ></apexchart>
    <apexchart
      type="pie"
      width="380"
      :options="leagueSizeChartOptions"
      :series="leagueSizeSeries"
    ></apexchart>
  </div>
</template>
