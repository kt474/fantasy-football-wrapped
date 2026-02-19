import type { ClassValue } from "clsx"
import type { Ref } from "vue"
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

type Updater<T> = T | ((old: T) => T)

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function valueUpdater<T>(updaterOrValue: Updater<T>, ref: Ref<T>) {
  ref.value
    = typeof updaterOrValue === "function"
      ? (updaterOrValue as (old: T) => T)(ref.value)
      : updaterOrValue
}
