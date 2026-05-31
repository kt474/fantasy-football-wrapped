export const DEFAULT_LOGO_FALLBACK =
  "https://g.espncdn.com/lm-static/ffl/images/default_logos/1.svg";

export function handleImageFallback(
  event: Event,
  fallback = DEFAULT_LOGO_FALLBACK
) {
  const img = event.target as HTMLImageElement;
  if (img.src === fallback) return;
  img.src = fallback;
}
