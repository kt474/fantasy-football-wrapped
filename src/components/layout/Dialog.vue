<script setup lang="ts">
import { computed, ref, watch, useSlots } from "vue";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LeagueInputForm from "@/components/shared/LeagueInputForm.vue";
import {
  useLeagueInput,
  type LeaguePlatform,
} from "@/composables/useLeagueInput";

const activeTab = ref<"Sleeper" | "Espn">("Sleeper");
const platform = computed<LeaguePlatform>(() =>
  activeTab.value === "Espn" ? "espn" : "sleeper"
);

const {
  inputType,
  seasonYear,
  leagueIdInput,
  showErrorMsg,
  onSubmit,
  clearError,
} = useLeagueInput(platform);

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
          <p>
            Enter your
            <a
              class="font-medium text-primary hover:underline"
              href="https://sleeper.com/"
              target="_blank"
              rel="noopener noreferrer"
              >Sleeper</a
            >
            league ID or username.
          </p>
        </DialogDescription>
      </DialogHeader>
      <div class="space-y-3">
        <Tabs default-value="Sleeper" v-model="activeTab">
          <TabsList>
            <TabsTrigger value="Sleeper">
              <div class="flex gap-2 py-1">
                <img width="20" src="/sleeperlogo.jpeg" alt="Sleeper logo" />
                <p>Sleeper</p>
              </div>
            </TabsTrigger>
            <TabsTrigger value="Espn">
              <div class="flex gap-2 py-1">
                <img width="20" src="/espnlogo.png" alt="ESPN logo" />
                <p>ESPN</p>
              </div>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="Sleeper">
            <LeagueInputForm
              v-model:inputType="inputType"
              v-model:seasonYear="seasonYear"
              v-model:leagueIdInput="leagueIdInput"
              platform="sleeper"
              @submit="handleSubmit"
            />
          </TabsContent>
          <TabsContent value="Espn">
            <LeagueInputForm
              inputType="League ID"
              v-model:seasonYear="seasonYear"
              v-model:leagueIdInput="leagueIdInput"
              platform="espn"
              @submit="handleSubmit"
            />
          </TabsContent>
        </Tabs>
      </div>
    </DialogContent>
  </Dialog>
</template>
