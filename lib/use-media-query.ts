"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Tracks a CSS media query. Only safe inside a component that already renders
 * client-side, since the server has no viewport to measure and reports `false`.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
