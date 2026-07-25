import { onBeforeUnmount, watch, type Ref } from "vue";

export const usePaywallViewTracking = (
  target: Ref<Element | null>,
  trackView: () => void
) => {
  let observer: IntersectionObserver | null = null;
  let tracked = false;

  const stop = () => {
    observer?.disconnect();
    observer = null;
  };

  watch(
    target,
    (element) => {
      stop();
      if (!element || tracked) return;

      if (typeof IntersectionObserver === "undefined") {
        tracked = true;
        trackView();
        return;
      }

      observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry?.isIntersecting || entry.intersectionRatio < 0.5) return;
          tracked = true;
          stop();
          trackView();
        },
        { threshold: 0.5 }
      );
      observer.observe(element);
    },
    { immediate: true, flush: "post" }
  );

  onBeforeUnmount(stop);
};
