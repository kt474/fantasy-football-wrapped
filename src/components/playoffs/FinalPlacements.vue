<script setup lang="ts">
import { useStore } from "../../store/store";
import Card from "../ui/card/Card.vue";
const store = useStore();
const props = defineProps<{
  rosters: Record<string, string | number>[];
}>();
</script>
<template>
  <Card class="w-full p-4 mt-4 lg:w-1/4 lg:mt-0 lg:ml-4 md:p-6">
    <div class="flex items-start justify-between mb-4">
      <h5 class="text-2xl font-semibold tracking-tight text-pretty">
        Final Placements
      </h5>
    </div>
    <div v-if="props.rosters.length > 0" class="flow-root">
      <ul role="list" class="divide-y">
        <li v-for="(user, index) in props.rosters">
          <div v-if="user" class="flex items-center">
            <div class="flex-1 min-w-0 list-padding ms-1">
              <p
                class="text-lg truncate"
                :class="props.rosters.length <= 10 ? 'py-2.5' : 'py-1.5'"
              >
                <span class="font-medium">{{ index + 1 }}.&nbsp;</span>
                {{ store.showUsernames ? user.username : user.name }}
              </p>
            </div>
          </div>
        </li>
      </ul>
    </div>
    <div v-else>
      <p class="pt-1 mb-2 border-t">Season in progress</p>
    </div>
  </Card>
</template>
