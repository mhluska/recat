// TODO: Use an actual polyfill. This is gross.
export const polyfillRequestIdleCallback = (
  window: Window & typeof globalThis
) => {
  if (typeof window.requestIdleCallback === 'undefined') {
    window.requestIdleCallback = (
      callback: IdleRequestCallback,
      options?: IdleRequestOptions
    ) => setTimeout(callback, 0);
  }
};

export const polyfillAll = (window: Window & typeof globalThis) => {
  polyfillRequestIdleCallback(window);
};
