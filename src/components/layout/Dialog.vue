<script setup lang="ts">
import { watch, useSlots } from "vue";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import LeagueInputForm from "@/components/shared/LeagueInputForm.vue";
import { useLeagueInput } from "@/composables/useLeagueInput";

const {
  provider,
  inputType,
  seasonYear,
  leagueIdInput,
  showErrorMsg,
  errorMsg,
  showHelperMsg,
  onSubmit,
  clearError,
} = useLeagueInput();

const slots = useSlots();
const open = defineModel<boolean>("open", { default: false });

watch(
  () => open.value,
  () => clearError()
);

const handleSubmit = async () => {
  await onSubmit();
  if (!showErrorMsg.value) {
    open.value = false;
  }
};
</script>

<template>
  <Dialog v-model:open="open">
    <DialogTrigger v-if="slots.trigger" as-child>
      <slot name="trigger" />
    </DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Add League</DialogTitle>
        <DialogDescription>
          <p>Add a Sleeper or ESPN league.</p>
        </DialogDescription>
      </DialogHeader>
      <div class="space-y-3">
        <LeagueInputForm
          v-model:provider="provider"
          v-model:inputType="inputType"
          v-model:seasonYear="seasonYear"
          v-model:leagueIdInput="leagueIdInput"
          @submit="handleSubmit"
        />
        <p v-if="showErrorMsg" class="text-xs text-destructive">
          {{ errorMsg }}
        </p>
        <p v-if="showHelperMsg" class="text-xs text-muted-foreground">
          Loading leagues...
        </p>
      </div>
    </DialogContent>
  </Dialog>
</template>
