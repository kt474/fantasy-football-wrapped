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
  espnPrivate,
  espnSwid,
  espnS2,
  showErrorMsg,
  onSubmit,
  clearError,
} = useLeagueInput(platform, "add_league");

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
          <p>Select your platform then enter your league ID or username.</p>
        </DialogDescription>
      </DialogHeader>
      <div class="space-y-3">
        <Tabs default-value="Sleeper" v-model="activeTab">
          <TabsList
            class="h-10 p-1 border rounded-md shadow-sm border-input bg-popover"
          >
            <TabsTrigger
              value="Sleeper"
              class="hover:bg-muted/50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow"
            >
              <div class="flex items-center gap-1.5">
                <img width="16.5" src="/sleeperlogo.webp" alt="Sleeper logo" />
                <p>Sleeper</p>
              </div>
            </TabsTrigger>
            <TabsTrigger
              value="Espn"
              class="hover:bg-muted/50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow"
            >
              <div class="flex items-center gap-1.5">
                <img width="16.5" src="/espnlogo.webp" alt="ESPN logo" />
                <p>ESPN</p>
                <span
                  class="rounded border border-primary/30 bg-primary/10 px-1 text-[10px] font-semibold uppercase leading-5 text-primary"
                >
                  Beta
                </span>
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
              v-model:espnPrivate="espnPrivate"
              v-model:espnSwid="espnSwid"
              v-model:espnS2="espnS2"
              platform="espn"
              @submit="handleSubmit"
            />
          </TabsContent>
        </Tabs>
      </div>
    </DialogContent>
  </Dialog>
</template>
