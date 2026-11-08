"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * false no servidor e durante a hidratação; true depois. Para tudo o que só pode
 * existir no browser (portais, decisões com matchMedia) sem erros de hidratação.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
