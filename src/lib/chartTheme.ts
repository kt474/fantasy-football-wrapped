const hslToHex = (value: string) => {
  const [rawHue, rawSaturation, rawLightness] = value.split(/\s+/);
  const hue = Number.parseFloat(rawHue);
  const saturation = Number.parseFloat(rawSaturation) / 100;
  const lightness = Number.parseFloat(rawLightness) / 100;

  if (![hue, saturation, lightness].every(Number.isFinite)) return null;

  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const segment = ((hue % 360) + 360) % 360 / 60;
  const intermediate = chroma * (1 - Math.abs((segment % 2) - 1));
  const offset = lightness - chroma / 2;

  const [red, green, blue] =
    segment < 1
      ? [chroma, intermediate, 0]
      : segment < 2
        ? [intermediate, chroma, 0]
        : segment < 3
          ? [0, chroma, intermediate]
          : segment < 4
            ? [0, intermediate, chroma]
            : segment < 5
              ? [intermediate, 0, chroma]
              : [chroma, 0, intermediate];

  return `#${[red, green, blue]
    .map((channel) =>
      Math.round((channel + offset) * 255)
        .toString(16)
        .padStart(2, "0")
    )
    .join("")}`;
};

const cssColor = (token: string, fallback: string) => {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(token)
    .trim();
  return value ? (hslToHex(value) ?? fallback) : fallback;
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

export const getChartTooltipTheme = (darkMode: boolean): "dark" | "light" =>
  darkMode ? "dark" : "light";

export type ChartTheme = ReturnType<typeof getChartTheme>;
