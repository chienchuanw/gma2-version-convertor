/**
 * Tracks overlapping async requests so only the most recently started one may
 * apply its result. `start()` returns an `isCurrent()` check for that request.
 */
export function createLatestGuard() {
  let latest = 0;
  return {
    start(): () => boolean {
      const id = ++latest;
      return () => id === latest;
    },
  };
}
