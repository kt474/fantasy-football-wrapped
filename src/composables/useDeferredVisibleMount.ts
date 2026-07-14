import { onBeforeUnmount, ref, watch, type Ref } from "vue";
import { useDocumentVisibility, useElementVisibility } from "@vueuse/core";

type IdleWindow = Window &
  typeof globalThis & {
    requestIdleCallback?: (callback: IdleRequestCallback) => number;
    cancelIdleCallback?: (handle: number) => void;
  };

/**
 * Mount expensive below-the-fold content only after it is visible and scrolling
 * has settled. The activity timer is important on Safari, which may not expose
 * requestIdleCallback and can otherwise mount work in the middle of a swipe.
 */
export const useDeferredVisibleMount = (
  target: Ref<HTMLElement | null>,
  {
    settleDelay = 500,
    minimumDelay = 0,
  }: { settleDelay?: number; minimumDelay?: number } = {}
) => {
  const shouldMount = ref(false);
  const isVisible = useElementVisibility(target);
  const documentVisibility = useDocumentVisibility();
  const idleWindow = window as IdleWindow;
  let idleCallback: number | undefined;
  let settleTimer: ReturnType<typeof window.setTimeout> | undefined;
  let listeningForActivity = false;
  const earliestMountTime = Date.now() + minimumDelay;

  const cancelScheduledMount = () => {
    if (idleCallback !== undefined) {
      idleWindow.cancelIdleCallback?.(idleCallback);
      idleCallback = undefined;
    }
    if (settleTimer !== undefined) {
      window.clearTimeout(settleTimer);
      settleTimer = undefined;
    }
  };

  const removeActivityListeners = () => {
    if (!listeningForActivity) return;
    window.removeEventListener("scroll", handleActivity, true);
    window.removeEventListener("touchmove", handleActivity);
    listeningForActivity = false;
  };

  const commitMount = () => {
    cancelScheduledMount();
    if (!isVisible.value || documentVisibility.value !== "visible") return;
    shouldMount.value = true;
    removeActivityListeners();
  };

  const scheduleMount = () => {
    cancelScheduledMount();
    if (
      shouldMount.value ||
      !isVisible.value ||
      documentVisibility.value !== "visible"
    ) {
      return;
    }

    const remainingDelay = earliestMountTime - Date.now();
    if (remainingDelay > 0) {
      settleTimer = window.setTimeout(scheduleMount, remainingDelay);
      return;
    }

    if (idleWindow.requestIdleCallback) {
      idleCallback = idleWindow.requestIdleCallback(commitMount);
      return;
    }

    settleTimer = window.setTimeout(commitMount, settleDelay);
  };

  function handleActivity() {
    if (!isVisible.value || shouldMount.value) return;
    scheduleMount();
  }

  const addActivityListeners = () => {
    if (listeningForActivity) return;
    window.addEventListener("scroll", handleActivity, {
      passive: true,
      capture: true,
    });
    window.addEventListener("touchmove", handleActivity, { passive: true });
    listeningForActivity = true;
  };

  watch(
    [isVisible, documentVisibility],
    ([visible, visibility]) => {
      if (!visible || visibility !== "visible") {
        cancelScheduledMount();
        removeActivityListeners();
        return;
      }

      addActivityListeners();
      scheduleMount();
    },
    { immediate: true }
  );

  onBeforeUnmount(() => {
    cancelScheduledMount();
    removeActivityListeners();
  });

  return shouldMount;
};
