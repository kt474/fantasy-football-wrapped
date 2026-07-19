export const getRivalryReportPairKey = (
  managerIds: readonly [string, string]
) =>
  managerIds
    .map((managerId) => managerId.trim())
    .sort((left, right) => left.localeCompare(right))
    .map(encodeURIComponent)
    .join(":");
