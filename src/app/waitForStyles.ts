/** The build loads its entry CSS without blocking the inline loading shell. */
export function waitForStyles(): Promise<void> {
  const style = document.querySelector<HTMLLinkElement>(
    "link[data-ambit-style]",
  );
  if (!style) return Promise.resolve(); // Vite's development CSS arrives through JS.
  if (style.dataset.failed)
    return Promise.reject(new Error("Stylesheet failed"));
  const loaded = style.dataset.ready
    ? Promise.resolve()
    : new Promise<void>((resolve, reject) => {
        style.addEventListener("load", () => resolve(), { once: true });
        style.addEventListener(
          "error",
          () => reject(new Error("Stylesheet failed")),
          {
            once: true,
          },
        );
      });
  return loaded.then(
    () =>
      new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
  );
}
