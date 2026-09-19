/**
 * iframe-resizer child（设计文档 §4.1）：core 统一接入。
 * 父页未引入时内部滚动，不报错。
 */
let attached = false;

export function initIframeResizer(): void {
  if (attached) return;
  attached = true;
  void import('@iframe-resizer/child').catch(() => undefined);
}
