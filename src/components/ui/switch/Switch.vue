<script setup lang="ts">
import type { SwitchRootEmits, SwitchRootProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { reactiveOmit } from "@vueuse/core";
import { SwitchRoot, SwitchThumb, useForwardPropsEmits } from "reka-ui";
import { cn } from "@/lib/utils";

const props = defineProps<
  SwitchRootProps & { class?: HTMLAttributes["class"] }
>();

const emits = defineEmits<SwitchRootEmits>();

const delegatedProps = reactiveOmit(props, "class");

const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
  <SwitchRoot
    v-bind="forwarded"
    :class="
      cn(
        'group peer relative inline-flex h-11 w-12 shrink-0 cursor-pointer items-center rounded-md bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
        props.class
      )
    "
  >
    <span
      aria-hidden="true"
      class="pointer-events-none absolute left-1/2 top-1/2 h-7 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-input shadow-sm transition-colors group-data-[state=checked]:bg-primary sm:h-5 sm:w-9"
    />
    <SwitchThumb
      :class="
        cn(
          'pointer-events-none absolute left-0.5 block size-6 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0 sm:left-2 sm:size-4 sm:data-[state=checked]:translate-x-4'
        )
      "
    >
      <slot name="thumb" />
    </SwitchThumb>
  </SwitchRoot>
</template>
