/**
 * iframe-resizer child (design doc §4.1): wired once in core.
 * When the parent page does not include it, scroll internally without throwing.
 */
let attached = false;

export function initIframeResizer(): void {
  if (attached) return;
  attached = true;
  void import('@iframe-resizer/child').catch(() => undefined);
}
