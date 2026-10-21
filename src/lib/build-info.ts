// Viewer-local release time, e.g. "21 Oct 2026, 15:17"; the commit is in BUILD_TITLE.
export const BUILD_LABEL = new Date(__BUILD_TIME__).toLocaleString(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export const BUILD_TITLE = `Commit ${__BUILD_VERSION__}, built ${__BUILD_TIME__}`;
