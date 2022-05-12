export const attributeChanged = (
  elem: HTMLElement,
  attributeName: string
) => {
  const view = elem.ownerDocument.defaultView;
  if (!view) {
    return Promise.reject();
  }

  return new Promise<void>((resolve, reject) => {
    const observer = new view.MutationObserver((mutationsList) => {
      if (
        mutationsList.find(
          (m) => m.type === 'attributes' && m.attributeName === attributeName
        )
      ) {
        observer.disconnect();
        resolve();
      }
    });

    observer.observe(elem, { attributes: true });
  });
};
