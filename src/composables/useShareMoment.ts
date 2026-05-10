import { nextTick, ref, type Ref } from "vue";
import { toPng } from "html-to-image";
import { toast } from "vue-sonner";
import type { ShareMoment } from "@/lib/shareMoments";

type ShareMomentAction = "download" | "native_share" | "copy_link";

type WindowWithAnalytics = Window & {
  posthog?: {
    capture: (eventName: string, properties?: Record<string, unknown>) => void;
  };
  umami?: {
    track: (eventName: string, properties?: Record<string, unknown>) => void;
  };
};

const trackShareMoment = (moment: ShareMoment, action: ShareMomentAction) => {
  const properties = {
    action,
    moment_id: moment.id,
    moment_type: moment.type,
    week: moment.week,
    league_name: moment.leagueName,
  };
  const analyticsWindow = window as WindowWithAnalytics;
  analyticsWindow.posthog?.capture("share_moment_action", properties);
  analyticsWindow.umami?.track("share_moment_action", properties);
};

export const useShareMoment = (exportElement: Ref<HTMLElement | null>) => {
  const isGeneratingShareMoment = ref(false);

  const renderMomentImage = async () => {
    if (!exportElement.value) {
      throw new Error("Share moment export card is not ready.");
    }

    await nextTick();
    const width = exportElement.value.scrollWidth;
    const height = exportElement.value.scrollHeight;
    return toPng(exportElement.value, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: "#020617",
      width,
      height,
      canvasWidth: width * 2,
      canvasHeight: height * 2,
    });
  };

  const downloadMoment = async (moment: ShareMoment) => {
    if (isGeneratingShareMoment.value) return;

    isGeneratingShareMoment.value = true;
    try {
      const dataUrl = await renderMomentImage();
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `ffwrapped-${moment.type}-week-${moment.week}.png`;
      link.click();
      trackShareMoment(moment, "download");
      toast.success("Share card downloaded");
    } catch (error) {
      console.error(error);
      toast.error("Unable to generate share card");
    } finally {
      isGeneratingShareMoment.value = false;
    }
  };

  const shareMoment = async (moment: ShareMoment) => {
    if (isGeneratingShareMoment.value) return;

    isGeneratingShareMoment.value = true;
    try {
      const dataUrl = await renderMomentImage();
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File(
        [blob],
        `ffwrapped-${moment.type}-week-${moment.week}.png`,
        { type: "image/png" }
      );
      const shareText = `${moment.headline}\n\n${moment.ctaUrl}`;

      if (
        navigator.share &&
        navigator.canShare?.({ files: [file] })
      ) {
        await navigator.share({
          title: moment.title,
          text: shareText,
          url: moment.ctaUrl,
          files: [file],
        });
        trackShareMoment(moment, "native_share");
        return;
      }

      await navigator.clipboard.writeText(shareText);
      trackShareMoment(moment, "copy_link");
      toast.success("Share text copied to clipboard");
    } catch (error) {
      console.error(error);
      toast.error("Unable to share this card");
    } finally {
      isGeneratingShareMoment.value = false;
    }
  };

  const copyMoment = async (moment: ShareMoment) => {
    try {
      await navigator.clipboard.writeText(
        `${moment.headline}\n\n${moment.subtext}\n\n${moment.ctaUrl}`
      );
      trackShareMoment(moment, "copy_link");
      toast.success("Share text copied to clipboard");
    } catch (error) {
      console.error(error);
      toast.error("Unable to copy this card");
    }
  };

  return {
    isGeneratingShareMoment,
    downloadMoment,
    shareMoment,
    copyMoment,
  };
};
