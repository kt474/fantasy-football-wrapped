<script setup lang="ts">
import Card from "../ui/card/Card.vue";

type NewsPost = {
  author: {
    avatar: string;
    displayName: string;
    handle: string;
  };
  record: {
    createdAt: string;
    text: string;
  };
  embed?: {
    external?: {
      uri: string;
      thumb?: string;
      title: string;
      description: string;
    };
  };
};

defineProps<{
  posts: NewsPost[];
}>();

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));

  if (hours < 1) return `${Math.floor(diff / (1000 * 60))}m`;
  if (hours < 24) return `${hours}h`;
  return date.toLocaleDateString();
};
</script>

<template>
  <section>
    <div class="flex flex-wrap items-start justify-between gap-3 mb-4">
      <div>
        <h2 class="text-2xl font-semibold tracking-tight">Roster News</h2>
      </div>
    </div>
    <div v-if="posts.length > 0" class="grid max-w-2xl gap-3">
      <Card
        v-for="post in posts"
        :key="post.record.createdAt"
        class="p-4 overflow-hidden shadow-sm"
      >
        <div class="flex items-center gap-3 mb-3">
          <img
            :src="post.author.avatar"
            :alt="post.author.displayName"
            class="object-cover rounded-full size-10"
          />
          <div class="flex-1 min-w-0">
            <div class="font-medium truncate">
              {{ post.author.displayName }}
            </div>
            <div class="text-sm truncate text-muted-foreground">
              @{{ post.author.handle }}
            </div>
          </div>
          <div class="text-sm text-muted-foreground">
            {{ formatDate(post.record.createdAt) }}
          </div>
        </div>
        <div
          class="mb-3 text-sm leading-relaxed whitespace-pre-wrap overflow-x-clip"
        >
          {{ post.record.text }}
        </div>
        <a
          v-if="post.embed?.external"
          :href="post.embed.external.uri"
          target="_blank"
          rel="noopener noreferrer"
          class="block overflow-hidden no-underline transition-colors border rounded-lg bg-muted/20 hover:bg-muted/40"
        >
          <img
            v-if="post.embed.external.thumb"
            :src="post.embed.external.thumb"
            :alt="post.embed.external.title"
            class="object-cover w-full h-36"
          />
          <div class="p-3">
            <div class="mb-1 font-semibold">
              {{ post.embed.external.title }}
            </div>
            <div class="text-sm text-muted-foreground line-clamp-2">
              {{ post.embed.external.description }}
            </div>
          </div>
        </a>
      </Card>
    </div>
    <Card v-else class="p-4">
      <p class="font-medium">No recent roster news found.</p>
      <p class="text-sm text-muted-foreground">
        Check back closer to kickoff for player updates.
      </p>
    </Card>
  </section>
</template>
