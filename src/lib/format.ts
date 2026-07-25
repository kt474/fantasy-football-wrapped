export const getOrdinalSuffix = (value: number) => {
  const remainder = Math.abs(value) % 100;
  if (remainder >= 11 && remainder <= 13) return "th";

  switch (Math.abs(value) % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
};

export const formatOrdinal = (value: number) =>
  `${value}${getOrdinalSuffix(value)}`;

type RelativeTimeOptions = {
  fallback?: string;
  now?: number;
};

export const formatRelativeTime = (
  date: string | undefined,
  { fallback = "", now = Date.now() }: RelativeTimeOptions = {}
) => {
  const time = Date.parse(date ?? "");
  if (!Number.isFinite(time)) return fallback;

  const minutes = Math.floor(Math.max(0, now - time) / 60_000);
  if (minutes < 1) return "Now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1_440) return `${Math.floor(minutes / 60)}h ago`;
  return new Date(time).toLocaleDateString();
};
