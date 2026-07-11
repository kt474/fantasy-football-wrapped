<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import {
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  useId,
} from "vue";
import { cn } from "@/lib/utils";
import SectionCard from "./SectionCard.vue";

const props = defineProps<{
  label: string;
  class?: HTMLAttributes["class"];
  contentClass?: HTMLAttributes["class"];
}>();

const scroller = ref<HTMLElement>();
const canScrollLeft = ref(false);
const canScrollRight = ref(false);
const hintId = useId();
let resizeObserver: ResizeObserver | undefined;

const updateScrollState = () => {
  const element = scroller.value;
  if (!element) return;

  const maxScrollLeft = element.scrollWidth - element.clientWidth;
  canScrollLeft.value = element.scrollLeft > 1;
  canScrollRight.value = maxScrollLeft > 1 && element.scrollLeft < maxScrollLeft - 1;
};

const scrollByKeyboard = (direction: -1 | 1) => {
  scroller.value?.scrollBy({ left: direction * 96, behavior: "smooth" });
};

onMounted(async () => {
  await nextTick();
  updateScrollState();

  resizeObserver = new ResizeObserver(updateScrollState);
  if (scroller.value) {
    resizeObserver.observe(scroller.value);
    if (scroller.value.firstElementChild) {
      resizeObserver.observe(scroller.value.firstElementChild);
    }
  }
});

onBeforeUnmount(() => resizeObserver?.disconnect());
</script>

<template>
  <SectionCard
    :class="cn('relative min-w-0 overflow-hidden p-0 sm:p-0', props.class)"
  >
    <div
      ref="scroller"
      data-scroll-container
      role="region"
      :aria-label="label"
      :aria-describedby="canScrollLeft || canScrollRight ? hintId : undefined"
      :tabindex="canScrollLeft || canScrollRight ? 0 : undefined"
      :class="
        cn(
          'w-full overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
          contentClass,
        )
      "
      @scroll="updateScrollState"
      @keydown.left.prevent="scrollByKeyboard(-1)"
      @keydown.right.prevent="scrollByKeyboard(1)"
    >
      <slot />
    </div>
    <span :id="hintId" class="sr-only">Scroll horizontally for more columns.</span>
    <div
      aria-hidden="true"
      data-scroll-edge="left"
      class="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-card to-transparent transition-opacity duration-200"
      :class="canScrollLeft ? 'opacity-100' : 'opacity-0'"
    />
    <div
      aria-hidden="true"
      data-scroll-edge="right"
      class="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-card to-transparent transition-opacity duration-200"
      :class="canScrollRight ? 'opacity-100' : 'opacity-0'"
    />
  </SectionCard>
</template>
