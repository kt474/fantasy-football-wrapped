<script setup lang="ts">
const props = defineProps<{
  alertMsg: string;
}>();
</script>
<template>
  <Transition class="animate-in slide-in-from-bottom-10 duration-300">
    <div
      class="fixed bottom-2 right-4 z-10 p-4 mb-4 text-sm text-green-800 rounded-lg bg-green-50 dark:bg-gray-800 dark:text-green-400"
      role="alert"
    >
      <span class="font-medium">{{ props.alertMsg }}</span>
    </div>
  </Transition>
</template>
