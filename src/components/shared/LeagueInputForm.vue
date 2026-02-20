<script setup lang="ts">
import { computed } from "vue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SEASON_YEAR_OPTIONS } from "@/composables/useLeagueInput";

const props = defineProps<{
  inputType: string;
  seasonYear: string;
  leagueIdInput: string;
}>();

const emit = defineEmits<{
  "update:inputType": [value: string];
  "update:seasonYear": [value: string];
  "update:leagueIdInput": [value: string];
  submit: [];
}>();

const inputTypeModel = computed({
  get: () => props.inputType,
  set: (value: string) => emit("update:inputType", value),
});

const seasonYearModel = computed({
  get: () => props.seasonYear,
  set: (value: string) => emit("update:seasonYear", value),
});

const leagueIdInputModel = computed({
  get: () => props.leagueIdInput,
  set: (value: string) => emit("update:leagueIdInput", value),
});
</script>

<template>
  <div class="flex flex-col gap-2 sm:flex-row">
    <div class="flex flex-row gap-2">
      <Select v-model="inputTypeModel">
        <SelectTrigger class="sm:w-32">
          <SelectValue placeholder="League ID" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="League ID">League ID</SelectItem>
          <SelectItem value="Username">Username</SelectItem>
        </SelectContent>
      </Select>
      <Select v-if="inputTypeModel === 'Username'" v-model="seasonYearModel">
        <SelectTrigger class="sm:w-24">
          <SelectValue placeholder="2025" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem
            v-for="year in SEASON_YEAR_OPTIONS"
            :key="year"
            :value="year"
          >
            {{ year }}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
    <Input
      v-model="leagueIdInputModel"
      type="text"
      class="flex-1 min-h-9"
      @keydown.enter="emit('submit')"
      :name="inputTypeModel === 'League ID' ? 'leagueId' : 'username'"
      :placeholder="
        inputTypeModel === 'League ID' ? 'Enter League ID' : 'Enter Username'
      "
    />
    <Button @click="emit('submit')">Submit</Button>
  </div>
</template>
