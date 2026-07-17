export type ManagerIdentity = {
  name?: string | null;
  username?: string | null;
};

export const getManagerDisplayName = (
  manager: ManagerIdentity | null | undefined,
  showUsernames: boolean,
  fallback = "Ghost Roster"
) => {
  const value = showUsernames ? manager?.username : manager?.name;
  return value?.trim() || fallback;
};
