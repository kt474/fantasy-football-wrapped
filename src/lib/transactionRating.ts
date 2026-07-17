const getRatingTier = (value: number) => {
  if (value <= 15) return 0;
  if (value <= 25) return 1;
  if (value <= 35) return 2;
  if (value <= 45) return 3;
  return 4;
};

const ratingClasses = [
  "performance-excellent",
  "performance-good",
  "performance-average",
  "performance-poor",
  "performance-bad",
] as const;

const ratingLabels = [
  "Excellent",
  "Good",
  "Average",
  "Below Avg",
  "Poor",
] as const;

export const getTransactionRatingClass = (
  value: number | null | undefined
) =>
  value == null
    ? "bg-muted text-muted-foreground"
    : ratingClasses[getRatingTier(value)];

export const getTransactionRatingLabel = (
  value: number | null | undefined
) => (value == null ? "" : ratingLabels[getRatingTier(value)]);
