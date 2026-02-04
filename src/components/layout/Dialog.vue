<script setup lang="ts">
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
// import { Input } from "@/components/ui/input";
import Input from "../util/Input.vue";
// import { Label } from "@/components/ui/label";
</script>

<template>
  <Dialog>
    <DialogTrigger as-child>
      <div class="ml-2 font-medium text-muted-foreground">Add League</div>
    </DialogTrigger>
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Add League</DialogTitle>
      </DialogHeader>
      <div class="flex items-center gap-2">
        <div class="grid flex-1 gap-2">
          <!-- <Label for="link" class="sr-only"> Link </Label> -->
          <!-- <Input
            id="link"
            default-value="https://ui.shadcn.com/docs/installation"
            read-only
          /> -->
          <Input />
        </div>
      </div>
      <DialogFooter class="sm:justify-start">
        <DialogClose as-child>
          <Button type="button" variant="secondary"> Close </Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
