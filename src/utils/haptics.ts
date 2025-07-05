export function triggerHaptic(pattern: number | number[] = 15) {
  if (typeof window !== "undefined") {
    if ("vibrate" in window.navigator) {
      (window.navigator as Navigator).vibrate(pattern);
    } else if (/iPhone|iPad|iPod/.test((window.navigator as Navigator).userAgent)) {
    }
  }
}
