<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";

const props = withDefaults(
  defineProps<{
    bgColor?: string;
    alignment?: "center" | "left" | "right";
  }>(),
  {
    bgColor: "bg-zinc-900",
    alignment: "center",
  }
);

const slideRef = ref<HTMLElement | null>(null);
const isVisible = ref(false);

let observer: IntersectionObserver | null = null;

onMounted(() => {
  observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        isVisible.value = true;
      } else {
        // Optional: reset when scrolling away to re-trigger animation?
        // isVisible.value = false;
      }
    },
    {
      threshold: 0.4,
    }
  );

  if (slideRef.value) {
    observer.observe(slideRef.value);
  }
});

onUnmounted(() => {
  if (observer) {
    observer.disconnect();
  }
});
</script>

<template>
  <div
    ref="slideRef"
    class="relative flex flex-col w-full h-screen p-6 overflow-hidden snap-start shrink-0"
    :class="[
      props.bgColor,
      props.alignment === 'center' ? 'items-center text-center' : '',
      props.alignment === 'left' ? 'items-start text-left' : '',
      props.alignment === 'right' ? 'items-end text-right' : '',
    ]"
  >
    <!-- Background Gradient Effect (Optional) -->
    <div
      class="absolute inset-0 pointer-events-none bg-gradient-to-br from-white/5 to-transparent"
    ></div>

    <!-- Content Container with Animation -->
    <div
      class="z-10 flex flex-col justify-center w-full h-full max-w-lg transition-all duration-1000 ease-out sm:max-w-2xl"
      :class="[
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10',
      ]"
    >
      <slot></slot>
    </div>
  </div>
</template>

<style scoped>
/* Ensure content doesn't overflow awkwardly on small screens */
.max-w-md {
  max-width: 28rem;
  /* margin-left: auto; */
  /* margin-right: auto; */
}
</style>
