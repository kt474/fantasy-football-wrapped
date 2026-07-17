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
