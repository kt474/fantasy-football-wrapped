const mobileAxisTitleStyle = {
  fontSize: "12px",
  fontFamily:
    "ui-sans-serif, system-ui, sans-serif, Apple Color Emoji, Segoe UI Emoji",
  fontWeight: 600,
};

export const mobileCategoricalChartResponsive = () => [
  {
    breakpoint: 640,
    options: {
      grid: {
        padding: { left: 0, right: 0 },
      },
      legend: {
        position: "bottom",
        horizontalAlign: "center",
        fontSize: "12px",
        offsetX: 0,
        offsetY: 0,
      },
      xaxis: {
        title: {
          offsetX: 0,
          offsetY: 0,
          style: mobileAxisTitleStyle,
        },
      },
      yaxis: {
        labels: {
          style: { fontSize: "10px" },
        },
        title: {
          offsetX: 0,
          style: mobileAxisTitleStyle,
        },
      },
    },
  },
];
