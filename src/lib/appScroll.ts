const desktopScrollQuery = "(min-width: 768px)";

export const scrollAppTo = (options: ScrollToOptions) => {
  const main = document.getElementById("mainScrollSection");

  if (window.matchMedia(desktopScrollQuery).matches && main) {
    main.scrollTo(options);
    return;
  }

  window.scrollTo(options);
};

export const scrollAppToTop = (behavior: ScrollBehavior = "auto") =>
  scrollAppTo({ top: 0, behavior });
