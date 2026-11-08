/** Vibração curta no telemóvel (Android). Ignorada onde não existe ou com "reduzir movimento". */
export function haptic(pattern: number | number[] = 12): void {
  try {
    if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    navigator.vibrate(pattern);
  } catch {
    // sem vibração: não faz mal
  }
}
