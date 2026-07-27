<script setup lang="ts">
import { ExternalLink } from "@lucide/vue";
import { Badge } from "../ui/badge";
import Card from "../ui/card/Card.vue";
import { formatRelativeTime } from "@/lib/format";
import type { RosterNewsItem } from "./playerNews";
import { normalizeNewsText } from "./playerNews";

defineProps<{
  item: RosterNewsItem;
}>();

const showPostText = (item: RosterNewsItem) => {
  const postText = item.post.record?.text || "";
  return (
    postText &&
    normalizeNewsText(postText) !== normalizeNewsText(item.headline)
  );
};

</script>

<template>
  <Card class="overflow-hidden shadow-xs">
    <div class="p-4">
      <div class="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{{ item.label }}</Badge>
        <Badge variant="outline">
          {{ item.isStarter ? "Starter" : "Bench" }}
        </Badge>
        <span class="text-sm font-semibold">
          {{ item.player.name || item.player.team || "Unknown player" }}
        </span>
        <span class="ml-auto text-xs text-muted-foreground">
          {{ formatRelativeTime(item.publishedAt, { fallback: "Recently" }) }}
        </span>
      </div>

      <h3 class="mt-3 text-base font-semibold leading-snug">
        {{ item.headline }}
      </h3>
      <p
        v-if="showPostText(item)"
        class="mt-2 text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap"
      >
        {{ item.post.record?.text }}
      </p>

      <div
        class="flex flex-wrap items-center gap-x-3 gap-y-2 pt-3 mt-4 text-xs border-t text-muted-foreground"
      >
        <div class="flex items-center gap-2 min-w-0">
          <img
            v-if="item.post.author?.avatar"
            :src="item.post.author.avatar"
            :alt="item.post.author.displayName || 'News source'"
            class="object-cover rounded-full size-6"
          />
          <span class="truncate">
            {{
              item.post.author?.displayName ||
              item.post.author?.handle ||
              "News source"
            }}
          </span>
        </div>
        <div class="flex items-center gap-3 sm:ml-auto">
          <a
            v-if="item.articleUrl"
            :href="item.articleUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1 font-medium text-foreground hover:underline"
          >
            Read report
            <ExternalLink class="size-3" />
          </a>
          <a
            v-if="item.sourceUrl"
            :href="item.sourceUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1 font-medium text-foreground hover:underline"
          >
            View post
            <ExternalLink class="size-3" />
          </a>
        </div>
      </div>
    </div>
  </Card>
</template>
