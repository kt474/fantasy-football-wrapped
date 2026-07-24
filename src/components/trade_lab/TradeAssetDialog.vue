<script setup lang="ts">
import { Plus } from "lucide-vue-next";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const props = defineProps<{
  managerName?: string;
  fallbackTeamLabel: string;
  inputId: string;
  draftSeasons: number[];
  draftRounds: number[];
  availableDraftPicks?: Array<{
    id: string;
    label: string;
  }>;
  triggerClass?: string;
}>();

const faab = defineModel<string>("faab", { required: true });
const pickSeason = defineModel<string>("pickSeason", { required: true });
const pickRound = defineModel<string>("pickRound", { required: true });
const pickId = defineModel<string>("pickId", { default: "" });

defineEmits<{
  open: [];
  addFaab: [];
  addDraftPick: [];
}>();
</script>

<template>
  <Dialog>
    <DialogTrigger as-child>
      <Button
        variant="secondary"
        size="xs"
        :aria-label="`Add assets for ${props.managerName || props.fallbackTeamLabel}`"
        :class="props.triggerClass"
        @click="$emit('open')"
      >
        <Plus class="size-4" />
      </Button>
    </DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Add Assets</DialogTitle>
        <DialogDescription>Add FAAB or draft picks.</DialogDescription>
      </DialogHeader>
      <div class="flex flex-wrap sm:flex-nowrap">
        <div class="mr-4">
          <Label :for="props.inputId" class="text-xs">FAAB</Label>
          <div class="flex gap-2 mt-0.5">
            <Input
              :id="props.inputId"
              v-model="faab"
              class="w-20"
              type="number"
              min="0"
            />
            <DialogClose as-child>
              <Button type="button" variant="outline" @click="$emit('addFaab')">
                Add
              </Button>
            </DialogClose>
          </div>
        </div>
        <div>
          <Label class="text-xs">Draft Pick</Label>
          <div class="flex gap-2 mt-0.5">
            <Select
              v-if="props.availableDraftPicks !== undefined"
              v-model="pickId"
            >
              <SelectTrigger class="w-56 text-xs">
                <SelectValue placeholder="Select an owned pick" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="pick in props.availableDraftPicks"
                  :key="pick.id"
                  :value="pick.id"
                >
                  {{ pick.label }}
                </SelectItem>
              </SelectContent>
            </Select>
            <Select v-else v-model="pickSeason">
              <SelectTrigger class="w-24 text-xs">
                <SelectValue placeholder="Season" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="season in props.draftSeasons"
                  :key="`trade-season-${season}`"
                  :value="String(season)"
                >
                  {{ season }}
                </SelectItem>
              </SelectContent>
            </Select>
            <Select
              v-if="props.availableDraftPicks === undefined"
              v-model="pickRound"
            >
              <SelectTrigger class="w-24 text-xs">
                <SelectValue placeholder="Round" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="round in props.draftRounds"
                  :key="`trade-round-${round}`"
                  :value="String(round)"
                >
                  Round {{ round }}
                </SelectItem>
              </SelectContent>
            </Select>
            <DialogClose as-child>
              <Button
                type="button"
                variant="outline"
                :disabled="
                  props.availableDraftPicks !== undefined ? !pickId : false
                "
                @click="$emit('addDraftPick')"
              >
                Add
              </Button>
            </DialogClose>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
