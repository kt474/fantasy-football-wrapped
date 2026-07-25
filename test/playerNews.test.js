import { describe, expect, test } from "vitest";
import {
  buildRosterNews,
  matchPostPlayer,
} from "../src/components/start_sit/playerNews.ts";

const makePost = ({
  uri = "at://did:plc:test/app.bsky.feed.post/story-1",
  createdAt = "2026-09-10T16:00:00Z",
  text = "",
  title = "",
  description = "",
} = {}) => ({
  uri,
  author: {
    displayName: "Fantasy News",
    handle: "fantasy-news.bsky.social",
  },
  record: { createdAt, text },
  embed: {
    external: {
      uri: "https://example.com/story",
      title,
      description,
    },
  },
});

const players = [
  {
    player_id: "1",
    name: "A.J. Brown",
    rosterSlot: "WR",
    projection: { stats: 17.2, opponent: "DAL", away: false },
  },
  {
    player_id: "2",
    name: "DeVonta Smith",
    rosterSlot: "BN",
    projection: { stats: 14.1, opponent: "DAL", away: false },
  },
];

describe("player news", () => {
  test("matches normalized player names in article metadata", () => {
    const post = makePost({
      text: "Philadelphia posted its final practice report.",
      title: "AJ Brown is questionable against Dallas",
    });

    expect(matchPostPlayer(post, players)?.player_id).toBe("1");
  });

  test("filters unrelated posts returned by the backend fallback", () => {
    const result = buildRosterNews(
      [makePost({ text: "A league-wide rankings update." })],
      players
    );

    expect(result).toEqual([]);
  });

  test("labels matched availability news for a starter", () => {
    const post = makePost({
      title: "A.J. Brown questionable after limited practice",
    });
    const result = buildRosterNews([post], players);

    expect(result[0]).toMatchObject({
      label: "Availability",
      isStarter: true,
      player: { player_id: "1" },
    });
  });

  test("keeps ordinary bench news in the roster feed", () => {
    const result = buildRosterNews(
      [
        makePost({
          text: "DeVonta Smith could see more targets this week.",
          title: "DeVonta Smith role continues to grow",
        }),
      ],
      players
    );

    expect(result[0]).toMatchObject({
      label: "Update",
      isStarter: false,
      player: { player_id: "2" },
    });
  });
});
