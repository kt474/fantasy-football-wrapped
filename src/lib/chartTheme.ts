const cssColor = (token: string, fallback: string) => {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(token)
    .trim();
  return value ? `hsl(${value})` : fallback;
};

export const getChartTheme = () => ({
  foreground: cssColor("--foreground", "#111827"),
  mutedForeground: cssColor("--muted-foreground", "#6b7280"),
  border: cssColor("--border", "#e5e7eb"),
  background: cssColor("--background", "#ffffff"),
  card: cssColor("--card", "#ffffff"),
  positive: cssColor("--chart-positive", "#22c55e"),
  negative: cssColor("--chart-negative", "#ef4444"),
  neutral: cssColor("--chart-neutral", "#0ea5e9"),
  series: Array.from({ length: 8 }, (_, index) =>
    cssColor(`--chart-${index + 1}`, "#2563eb")
  ),
});

export type ChartTheme = ReturnType<typeof getChartTheme>;
