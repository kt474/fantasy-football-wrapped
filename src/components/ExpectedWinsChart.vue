<script setup lang="ts">
import { ref } from "vue";

const series = ref([
  {
    name: "Actual",
    data: [
      {
        x: "2011",
        y: 1292,
        goals: [
          {
            name: "Expected",
            value: 1400,
            strokeHeight: 5,
            strokeColor: "#775DD0",
          },
        ],
      },
      {
        x: "2012",
        y: 4432,
        goals: [
          {
            name: "Expected",
            value: 5400,
            strokeHeight: 5,
            strokeColor: "#775DD0",
          },
        ],
      },
      {
        x: "2013",
        y: 5423,
        goals: [
          {
            name: "Expected",
            value: 5200,
            strokeHeight: 5,
            strokeColor: "#775DD0",
          },
        ],
      },
      {
        x: "2014",
        y: 6653,
        goals: [
          {
            name: "Expected",
            value: 6500,
            strokeHeight: 5,
            strokeColor: "#775DD0",
          },
        ],
      },
      {
        x: "2015",
        y: 8133,
        goals: [
          {
            name: "Expected",
            value: 6600,
            strokeHeight: 13,
            strokeWidth: 0,
            strokeLineCap: "round",
            strokeColor: "#775DD0",
          },
        ],
      },
      {
        x: "2016",
        y: 7132,
        goals: [
          {
            name: "Expected",
            value: 7500,
            strokeHeight: 5,
            strokeColor: "#775DD0",
          },
        ],
      },
      {
        x: "2017",
        y: 7332,
        goals: [
          {
            name: "Expected",
            value: 8700,
            strokeHeight: 5,
            strokeColor: "#775DD0",
          },
        ],
      },
      {
        x: "2018",
        y: 6553,
        goals: [
          {
            name: "Expected",
            value: 7300,
            strokeHeight: 2,
            strokeDashArray: 2,
            strokeColor: "#775DD0",
          },
        ],
      },
    ],
  },
]);

const chartOptions = ref({
  chart: {
    height: 350,
    type: "bar",
  },
  plotOptions: {
    bar: {
      columnWidth: "60%",
    },
  },
  colors: ["#00E396"],
  dataLabels: {
    enabled: false,
  },
  legend: {
    show: true,
    showForSingleSeries: true,
    customLegendItems: ["Actual", "Expected"],
    markers: {
      fillColors: ["#00E396", "#775DD0"],
    },
  },
});
</script>
<template>
  <div
    class="w-full p-4 bg-white rounded-lg shadow dark:bg-gray-800 md:p-6 min-w-96"
  >
    <div class="flex justify-between">
      <div>
        <h5
          class="pb-2 text-3xl font-bold leading-none text-gray-900 dark:text-white"
        >
          Power Rankings
        </h5>
        <p class="text-base font-normal text-gray-500 dark:text-gray-400">
          Regular Season
        </p>
      </div>
    </div>
    <apexchart
      width="100%"
      height="475"
      :options="chartOptions"
      :series="series"
    ></apexchart>
  </div>
</template>
