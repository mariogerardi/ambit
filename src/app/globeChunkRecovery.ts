const reloadKey = "ambit.globe-chunk-reload.v1";

export function reloadGlobeChunkOnce(
  error: unknown,
  storage?: Pick<Storage, "getItem" | "setItem">,
  reload: () => void = () => location.reload(),
): boolean {
  if (
    !(error instanceof Error) ||
    !(
      error.name === "ChunkLoadError" ||
      /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk .+ failed/i.test(
        error.message,
      )
    )
  )
    return false;
  try {
    const store = storage ?? sessionStorage;
    if (store.getItem(reloadKey)) return false;
    store.setItem(reloadKey, "1");
    reload();
    return true;
  } catch {
    return false;
  }
}

export function clearGlobeChunkReload() {
  try {
    sessionStorage.removeItem(reloadKey);
  } catch {
    // Storage may be unavailable; the globe is already usable.
  }
}
