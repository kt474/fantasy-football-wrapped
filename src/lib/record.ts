export const getRecordForWeek = (
  recordString: string | undefined,
  week: number,
  medianScoring: boolean
) => {
  const resultCount = medianScoring ? week * 2 : week;
  const results = (recordString ?? "").slice(0, resultCount);
  if (!results) return "0-0";

  const wins = [...results].filter((result) => result === "W").length;
  const losses = [...results].filter((result) => result === "L").length;
  const ties = [...results].filter((result) => result === "T").length;

  return `${wins} - ${losses}${ties ? ` - ${ties}` : ""}`;
};
