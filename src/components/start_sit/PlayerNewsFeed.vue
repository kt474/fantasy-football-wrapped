<script setup lang="ts">
import { computed } from "vue";
import { AlertTriangle } from "@lucide/vue";
import Card from "../ui/card/Card.vue";
import { Skeleton } from "../ui/skeleton";
import { formatRelativeTime } from "@/lib/format";
import PlayerNewsCard from "./PlayerNewsCard.vue";
import type { NewsPost, RosterNewsItem } from "./playerNews";

const props = defineProps<{
  news: RosterNewsItem[];
  posts: NewsPost[];
  loading: boolean;
  error: string | null;
}>();

const latestPosts = computed(() =>
  [...props.posts]
    .sort(
      (a, b) =>
        Date.parse(b.record?.createdAt || "") -
        Date.parse(a.record?.createdAt || "")
    )
    .slice(0, 10)
);

const getPostUrl = (post: NewsPost) => {
  if (post.embed?.external?.uri) return post.embed.external.uri;
  const recordKey = post.uri?.split("/").pop();
  return post.author?.handle && recordKey
    ? `https://bsky.app/profile/${post.author.handle}/post/${recordKey}`
    : undefined;
};

</script>

<template>
  <section class="max-w-3xl">
    <div class="flex flex-wrap items-start justify-between gap-3 mb-4">
      <div>
        <h2 class="text-2xl font-semibold">Roster News</h2>
        <p class="mt-1 text-sm text-muted-foreground">
          The newest updates from fantasy football news accounts.
        </p>
      </div>
    </div>

    <div v-if="loading" class="grid gap-3" aria-busy="true" aria-live="polite">
      <span class="sr-only">Loading roster news...</span>
      <Card v-for="index in 3" :key="index" class="p-4">
        <div class="flex gap-2">
          <Skeleton class="w-20 h-5 bg-muted dark:bg-muted/70" />
          <Skeleton class="w-16 h-5 bg-muted dark:bg-muted/70" />
        </div>
        <Skeleton class="w-4/5 h-5 mt-4 bg-muted dark:bg-muted/70" />
        <Skeleton class="w-full h-4 mt-3 bg-muted dark:bg-muted/70" />
        <Skeleton class="w-3/5 h-4 mt-2 bg-muted dark:bg-muted/70" />
      </Card>
    </div>

    <Card v-else-if="error" class="p-4 border-warning/40">
      <div class="flex items-start gap-3">
        <AlertTriangle class="mt-0.5 text-warning size-5 shrink-0" />
        <div>
          <p class="font-medium">Roster news is temporarily unavailable.</p>
          <p class="mt-1 text-sm text-muted-foreground">{{ error }}</p>
        </div>
      </div>
    </Card>

    <div v-else-if="news.length > 0" class="grid gap-3">
      <PlayerNewsCard v-for="item in news" :key="item.id" :item="item" />
    </div>

    <section v-else-if="latestPosts.length > 0">
      <div class="grid gap-3">
        <Card
          v-for="post in latestPosts"
          :key="post.uri || post.cid || post.record?.createdAt"
          class="p-4 transition-colors hover:border-foreground/20 hover:bg-muted/20"
        >
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center min-w-0 gap-2">
              <img
                v-if="post.author?.avatar"
                :src="post.author.avatar"
                :alt="post.author.displayName || 'News source'"
                class="object-cover rounded-full size-8"
              />
              <div class="min-w-0">
                <p class="text-sm font-medium truncate">
                  {{
                    post.author?.displayName ||
                    post.author?.handle ||
                    "Fantasy news"
                  }}
                </p>
                <p
                  v-if="post.author?.handle"
                  class="text-xs truncate text-muted-foreground"
                >
                  @{{ post.author.handle }}
                </p>
              </div>
            </div>
            <time class="text-xs shrink-0 text-muted-foreground">
              {{ formatRelativeTime(post.record?.createdAt) }}
            </time>
          </div>
          <a
            v-if="getPostUrl(post)"
            :href="getPostUrl(post)"
            target="_blank"
            rel="noopener noreferrer"
            class="flex items-start justify-between gap-4 mt-3 font-semibold leading-snug hover:underline"
          >
            <span>
              {{ post.embed?.external?.title || post.record?.text }}
            </span>
            <img
              v-if="post.embed?.external?.thumb"
              :src="post.embed.external.thumb"
              :alt="post.embed.external.title || 'Article thumbnail'"
              class="object-cover w-20 h-16 border rounded-md shrink-0 bg-muted"
            />
          </a>
          <div v-else class="flex items-start justify-between gap-4 mt-3">
            <p class="font-semibold leading-snug">
              {{ post.embed?.external?.title || post.record?.text }}
            </p>
            <img
              v-if="post.embed?.external?.thumb"
              :src="post.embed.external.thumb"
              :alt="post.embed.external.title || 'Article thumbnail'"
              class="object-cover w-20 h-16 border rounded-md shrink-0 bg-muted"
            />
          </div>
        </Card>
      </div>
    </section>

    <Card v-else class="p-4">
      <p class="font-medium">No recent roster news found.</p>
      <p class="mt-1 text-sm text-muted-foreground">
        Check back closer to kickoff for player updates.
      </p>
    </Card>
  </section>
</template>
