// TODO: Use an actual polyfill. This is gross.
export const polyfillRequestIdleCallback = () => {
  if (typeof requestIdleCallback === 'function') {
    return requestIdleCallback;
  } else {
    return (callback: () => void) => setTimeout(callback, 0);
  }
}
