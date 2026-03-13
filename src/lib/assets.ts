import type { FantasyProviderId } from "@/types/types";

const createPlaceholder = (label: string, background: string) =>
  `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
      <rect width="96" height="96" rx="18" fill="${background}" />
      <text x="48" y="56" text-anchor="middle" font-size="28" font-family="Arial, sans-serif" fill="#f8fafc">${label}</text>
    </svg>`
  )}`;

const PLAYER_PLACEHOLDER = createPlaceholder("P", "#334155");
const TEAM_PLACEHOLDER = createPlaceholder("D", "#1d4ed8");

const normalizeDefenseKey = (playerId: string, team?: string) => {
  const candidate = (team || playerId || "").trim();
  return candidate.toLowerCase();
};

export const getPlayerImageUrl = (
  provider: FantasyProviderId,
  playerId: string,
  position?: string,
  team?: string
) => {
  if (!playerId) {
    return position === "DEF" ? TEAM_PLACEHOLDER : PLAYER_PLACEHOLDER;
  }

  if (position === "DEF") {
    return getTeamLogoUrl(provider, normalizeDefenseKey(playerId, team));
  }

  if (provider === "espn") {
    return /^\d+$/.test(playerId)
      ? `https://a.espncdn.com/i/headshots/nfl/players/full/${playerId}.png`
      : PLAYER_PLACEHOLDER;
  }

  return `https://sleepercdn.com/content/nfl/players/thumb/${playerId}.jpg`;
};

export const getTeamLogoUrl = (
  provider: FantasyProviderId,
  teamKey?: string
) => {
  if (!teamKey) {
    return TEAM_PLACEHOLDER;
  }

  if (provider === "espn") {
    return `https://a.espncdn.com/i/teamlogos/nfl/500/${teamKey.toLowerCase()}.png`;
  }

  return `https://sleepercdn.com/images/team_logos/nfl/${teamKey.toLowerCase()}.png`;
};
