export type NewsPost = {
  uri?: string;
  cid?: string;
  author?: {
    avatar?: string;
    displayName?: string;
    handle?: string;
  };
  record?: {
    createdAt?: string;
    text?: string;
  };
  embed?: {
    external?: {
      uri?: string;
      thumb?: string;
      title?: string;
      description?: string;
    };
  };
};

export type NewsPlayerContext = {
  player_id: string;
  name?: string;
  position?: string;
  rosterSlot?: string;
  team?: string;
  projection?: {
    stats?: number;
    opponent?: string;
    away?: boolean;
  };
};

export type RosterNewsItem = {
  id: string;
  post: NewsPost;
  player: NewsPlayerContext;
  isStarter: boolean;
  label: "Availability" | "Update";
  headline: string;
  publishedAt: string;
  sourceUrl?: string;
  articleUrl?: string;
};

const AVAILABILITY =
  /\b(out|inactive|doubtful|questionable|injur(?:y|ed)|practice|cleared|will play|expected to play|good to go)\b/i;

export const normalizeNewsText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[.'’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const getPostText = (post: NewsPost) =>
  normalizeNewsText(
    [
      post.record?.text,
      post.embed?.external?.title,
      post.embed?.external?.description,
    ]
      .filter(Boolean)
      .join(" ")
  );

export const matchPostPlayer = (
  post: NewsPost,
  players: NewsPlayerContext[]
) => {
  const postText = ` ${getPostText(post)} `;

  return players.find((player) => {
    if (!player.name) return false;
    const fullName = normalizeNewsText(player.name);
    const withoutSuffix = fullName.replace(/\s+(jr|sr|ii|iii|iv)$/, "");
    return (
      postText.includes(` ${fullName} `) ||
      postText.includes(` ${withoutSuffix} `)
    );
  });
};

const getSourceUrl = (post: NewsPost) => {
  const recordKey = post.uri?.split("/").pop();
  return post.author?.handle && recordKey
    ? `https://bsky.app/profile/${post.author.handle}/post/${recordKey}`
    : undefined;
};

export const buildRosterNews = (
  posts: NewsPost[],
  players: NewsPlayerContext[]
) => {
  const items = posts.flatMap((post, index) => {
    const player = matchPostPlayer(post, players);
    if (!player) return [];

    const text = getPostText(post);
    const isStarter = player.rosterSlot !== "BN";

    return [
      {
        id:
          post.uri ||
          post.cid ||
          `${post.record?.createdAt || "news"}-${index}`,
        post,
        player,
        isStarter,
        label: AVAILABILITY.test(text) ? "Availability" : "Update",
        headline:
          post.embed?.external?.title ||
          post.record?.text ||
          "Roster update",
        publishedAt: post.record?.createdAt || "",
        sourceUrl: getSourceUrl(post),
        articleUrl: post.embed?.external?.uri,
      } satisfies RosterNewsItem,
    ];
  });

  items.sort((a, b) => {
    if (a.isStarter !== b.isStarter) return a.isStarter ? -1 : 1;
    return Date.parse(b.publishedAt) - Date.parse(a.publishedAt);
  });

  return items;
};
