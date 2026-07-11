<script setup lang="ts">
import { computed } from "vue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  platform: string;
  espnPrivate?: boolean;
  espnSwid?: string;
  espnS2?: string;
}>();

const emit = defineEmits<{
  "update:inputType": [value: string];
  "update:seasonYear": [value: string];
  "update:leagueIdInput": [value: string];
  "update:espnPrivate": [value: boolean];
  "update:espnSwid": [value: string];
  "update:espnS2": [value: string];
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

const espnPrivateModel = computed({
  get: () => props.espnPrivate ?? false,
  set: (value: boolean) => emit("update:espnPrivate", value),
});

const espnPrivacyModel = computed({
  get: () => (espnPrivateModel.value ? "private" : "public"),
  set: (value: string) => {
    espnPrivateModel.value = value === "private";
  },
});

const espnSwidModel = computed({
  get: () => props.espnSwid ?? "",
  set: (value: string) => emit("update:espnSwid", value),
});

const espnS2Model = computed({
  get: () => props.espnS2 ?? "",
  set: (value: string) => emit("update:espnS2", value),
});
</script>

<template>
  <div class="space-y-2">
    <div
      v-if="props.platform === 'sleeper'"
      class="flex flex-col gap-2 sm:flex-row"
    >
      <div class="flex flex-row gap-2">
        <Select v-model="inputTypeModel">
          <SelectTrigger
            class="h-11 min-h-11 sm:h-9 sm:min-h-9 sm:w-32"
            aria-label="Input type"
          >
            <SelectValue placeholder="League ID" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="League ID">League ID</SelectItem>
            <SelectItem value="Username">Username</SelectItem>
          </SelectContent>
        </Select>
        <Select v-if="inputTypeModel === 'Username'" v-model="seasonYearModel">
          <SelectTrigger
            class="h-11 min-h-11 sm:h-9 sm:min-h-9 sm:w-24"
            aria-label="Season"
          >
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
        class="h-11 min-h-11 flex-1 sm:h-9 sm:min-h-9"
        :inputmode="inputTypeModel === 'League ID' ? 'numeric' : 'text'"
        enterkeyhint="go"
        autocapitalize="none"
        spellcheck="false"
        @keydown.enter="emit('submit')"
        :name="inputTypeModel === 'League ID' ? 'leagueId' : 'username'"
        :placeholder="
          inputTypeModel === 'League ID' ? 'Enter League ID' : 'Enter Username'
        "
      />
      <Button @click="emit('submit')">Submit</Button>
    </div>

    <div v-else class="space-y-2">
      <div class="grid gap-2 sm:grid-cols-[10rem_6rem_minmax(0,1fr)]">
        <div
          class="grid grid-cols-2 p-1 text-sm border rounded-md shadow-sm min-h-9 border-input bg-popover"
          role="radiogroup"
          aria-label="ESPN league privacy"
        >
          <label class="cursor-pointer">
            <input
              v-model="espnPrivacyModel"
              class="sr-only peer"
              type="radio"
              name="espnPrivacy"
              value="public"
            />
            <span
              class="flex items-center justify-center h-full px-3 transition-all rounded-md text-muted-foreground hover:bg-muted/50 peer-checked:bg-background peer-checked:text-foreground peer-checked:shadow"
            >
              Public
            </span>
          </label>
          <label class="cursor-pointer">
            <input
              v-model="espnPrivacyModel"
              class="sr-only peer"
              type="radio"
              name="espnPrivacy"
              value="private"
            />
            <span
              class="flex items-center justify-center h-full px-3 transition-all rounded-md text-muted-foreground hover:bg-muted/50 peer-checked:bg-background peer-checked:text-foreground peer-checked:shadow"
            >
              Private
            </span>
          </label>
        </div>
        <Select v-model="seasonYearModel">
          <SelectTrigger class="w-full" aria-label="Season">
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
        <Dialog v-if="espnPrivateModel">
          <DialogTrigger as-child>
            <button
              type="button"
              class="self-center text-xs font-medium text-left text-primary hover:underline sm:justify-self-start"
            >
              How do I find these?
            </button>
          </DialogTrigger>
          <DialogContent class="text-left">
            <DialogHeader>
              <DialogTitle>Find ESPN League Credentials</DialogTitle>
              <DialogDescription>
                Use these steps while signed in to ESPN Fantasy in the same
                browser.
              </DialogDescription>
            </DialogHeader>
            <ol class="space-y-2 text-sm text-muted-foreground">
              <li>
                1. Open your ESPN fantasy football league page in a desktop
                browser.
              </li>
              <li>
                2. Copy the league ID from the page URL. It is the number after
                <span class="font-medium text-foreground"> leagueId=</span>.
              </li>
              <li>
                3. Open developer tools, then go to the
                <span class="font-medium text-foreground"> Application</span>
                tab in Chrome or
                <span class="font-medium text-foreground"> Storage</span> tab in
                Firefox/Safari.
              </li>
              <li>
                4. Find
                <span class="font-medium text-foreground"> Cookies</span> for
                <span class="font-medium text-foreground"> espn.com</span>.
              </li>
              <li>
                5. Copy the values for
                <span class="font-medium text-foreground"> SWID</span> and
                <span class="font-medium text-foreground"> espn_s2</span> into
                the fields here.
              </li>
            </ol>
            <p class="text-xs text-muted-foreground">
              Treat these like a password. ffwrapped stores them locally in this
              browser and only sends them through our service to ESPN when
              loading your private league.
            </p>
          </DialogContent>
        </Dialog>
      </div>
      <div
        :class="[
          'grid gap-2',
          espnPrivateModel
            ? 'sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]'
            : 'sm:grid-cols-[minmax(0,1fr)_auto]',
        ]"
      >
        <Input
          v-model="leagueIdInputModel"
          type="text"
          class="flex-1 min-w-0 min-h-9"
          inputmode="numeric"
          enterkeyhint="go"
          autocapitalize="none"
          spellcheck="false"
          @keydown.enter="emit('submit')"
          name="leagueId"
          placeholder="Enter League ID"
        />
        <Input
          v-if="espnPrivateModel"
          v-model="espnSwidModel"
          type="text"
          autocomplete="off"
          autocapitalize="none"
          spellcheck="false"
          aria-label="ESPN SWID"
          name="swid"
          placeholder="SWID"
          class="min-w-0 min-h-9"
          @keydown.enter="emit('submit')"
        />
        <Input
          v-if="espnPrivateModel"
          v-model="espnS2Model"
          type="password"
          autocomplete="off"
          autocapitalize="none"
          spellcheck="false"
          aria-label="ESPN espn_s2"
          name="espn_s2"
          placeholder="espn_s2"
          class="min-w-0 min-h-9"
          @keydown.enter="emit('submit')"
        />
        <Button class="w-full sm:w-auto" @click="emit('submit')">Submit</Button>
      </div>
    </div>
  </div>
</template>
