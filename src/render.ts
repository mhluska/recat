import {
  FunctionComponent,
  ElementKeys,
  CustomProperties,
  VirtualStringElement,
  VirtualElement,
  VirtualFunctionElement,
  VirtualElementProps,
  VirtualNativeElement,
  EventHandler,
  NodeTypes,
} from './types';
import {
  keys,
  isVirtualFunctionElement,
  isVirtualNativeElement,
  isTextNode,
  isElementNode,
  replaceNode,
  appendNode,
  insertBefore,
} from './utils';
import { mountWithHooks, unmountWithHooks } from './hooks';
import { polyfillAll } from './polyfills';

enum ElementProperties {
  Value = 'value',
  ClassName = 'className',
}

const ELEMENT_PROPERTIES = new Set<Partial<ElementKeys>>(
  Object.values(ElementProperties)
);

const EVENT_PROPS: Map<keyof CustomProperties, keyof HTMLElementEventMap> =
  new Map([
    ['onInput', 'input'],
    ['onClick', 'click'],
    ['onSubmit', 'submit'],
  ]);

const createVirtualStringElement = (value: string): VirtualStringElement => ({
  type: 'String',
  value,
});

export function createElement<Props, ChildProps>(
  type: FunctionComponent<Props>,
  props?: Props,
  ...children: (null | string | VirtualElement<ChildProps>)[]
): VirtualFunctionElement<Props>;

export function createElement<ChildProps>(
  type: keyof HTMLElementTagNameMap,
  props?: VirtualElementProps | null,
  ...children: (null | string | VirtualElement<ChildProps>)[]
): VirtualNativeElement;

export function createElement<Props, ChildProps>(
  type: FunctionComponent<Props> | keyof HTMLElementTagNameMap,
  props?: Props | VirtualElementProps | null,
  ...children: (null | string | VirtualElement<ChildProps>)[]
) {
  return typeof type === 'function'
    ? ({
        type,
        props: props || {},
        result: null,
      } as VirtualFunctionElement<Props>)
    : ({
        type,
        props: {
          ...props,
          tagName: type || 'div',
        },
        children: children.map((child) =>
          typeof child === 'string' ? createVirtualStringElement(child) : child
        ),
      } as VirtualNativeElement);
}

export const e = createElement;

const reconcileEventHandlerProps = (
  domNode: Element,
  nativeEventName: string,
  prevValue: EventHandler | undefined,
  newValue: EventHandler | undefined
) => {
  if (prevValue === newValue) {
    return;
  }

  if (prevValue) {
    domNode.removeEventListener(nativeEventName, prevValue);
  }

  if (newValue) {
    domNode.addEventListener(nativeEventName, newValue);
  }
};

const reconcileProps = (
  domNode: Element,
  prevNode: VirtualElement | null,
  newNode: VirtualElement | null
) => {
  if (prevNode?.type === 'String' || newNode?.type === 'String') {
    return;
  }

  const prevPropKeys = prevNode ? keys(prevNode.props) : [];
  const newPropKeys = newNode ? keys(newNode.props) : [];

  for (const name of newPropKeys.concat(prevPropKeys)) {
    const prevValue = prevNode?.props[name];
    const newValue = newNode?.props[name];

    // HACK: With properties (as opposed to attributes), our crappy virtal DOM
    // can get out of sync after user input so we just always write.
    if (ELEMENT_PROPERTIES.has(name)) {
      // TODO: Fix type `Element` being too generic here.
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      domNode[name] = newValue === undefined ? '' : newValue;
      continue;
    }

    if (prevValue === newValue) {
      continue;
    }

    if (name === 'onClick' || name === 'onInput' || name === 'onSubmit') {
      const nativeEventName = EVENT_PROPS.get(name);

      if (nativeEventName) {
        reconcileEventHandlerProps(
          domNode,
          nativeEventName,
          prevNode?.props[name],
          newNode?.props[name]
        );
      }

      continue;
    }

    if (typeof newValue === 'boolean') {
      if (newValue) {
        domNode.setAttribute(name, '');
      } else {
        domNode.removeAttribute(name);
      }
    } else if (typeof newValue === 'undefined') {
      domNode.removeAttribute(name);
    } else {
      domNode.setAttribute(name, String(newValue));
    }
  }
};

const createDomNode = (
  virtualElement: VirtualElement | null
): Text | HTMLElement | null => {
  if (!virtualElement) {
    return null;
  }

  if (virtualElement.type === 'String') {
    return appDocument.createTextNode(virtualElement.value);
  }

  if (isVirtualFunctionElement(virtualElement)) {
    return createDomNode(mountWithHooks(virtualElement, forceRender));
  }

  const { children, type: tagName } = virtualElement;
  const element = appDocument.createElement(tagName);

  reconcileProps(element, null, virtualElement);

  for (const child of children) {
    if (!child) {
      continue;
    }

    const childDomElement = createDomNode(child);

    if (!childDomElement) {
      continue;
    }

    element.appendChild(childDomElement);
  }

  return element;
};

const reconcileStrings = (
  domNode: Element | Text,
  prevNode: VirtualStringElement,
  newNode: VirtualStringElement
) => {
  if (prevNode.value === newNode.value) {
    return;
  }

  if (isElementNode(domNode)) {
    replaceNode(domNode, createDomNode(newNode));
  } else if (isTextNode(domNode)) {
    domNode.replaceData(0, domNode.length, newNode.value);
  }
};

export const reconcile = (
  domNode: Element | Text,
  prevNode: VirtualElement | undefined | null,
  newNode: VirtualElement | undefined | null
) => {
  if (!newNode) {
    domNode.remove();
    return;
  }

  if (!prevNode || prevNode.type !== newNode.type) {
    if (prevNode && isVirtualFunctionElement(prevNode)) {
      // TODO: This should happen recursively for all child nodes being removed.
      unmountWithHooks(prevNode);
    }

    replaceNode(domNode, createDomNode(newNode));
    return;
  }

  // We have to repeatedly check the type of `prevNode` even though we ensure
  // that both types are the same above.
  // See https://stackoverflow.com/questions/71397541
  if (prevNode.type === 'String' && newNode.type === 'String') {
    reconcileStrings(domNode, prevNode, newNode);
    return;
  }

  if (isTextNode(domNode)) {
    replaceNode(domNode, createDomNode(newNode));
    return;
  }

  if (isVirtualFunctionElement(prevNode) && isVirtualFunctionElement(newNode)) {
    reconcile(domNode, prevNode.result, mountWithHooks(newNode, forceRender));
    return;
  }

  if (isVirtualNativeElement(prevNode) && isVirtualNativeElement(newNode)) {
    reconcileProps(domNode, prevNode, newNode);

    const domNodeChildren = Array.from(domNode.childNodes).filter(
      (node) =>
        node.nodeType === NodeTypes.Element || node.nodeType === NodeTypes.Text
    ) as (Element | Text)[];

    const maxChildren = Math.max(
      prevNode.children.length,
      newNode.children.length
    );

    let domIndex = 0;

    for (let index = 0; index < maxChildren; index += 1) {
      const domNodeChild = domNodeChildren[domIndex];
      const prevNodeChild = prevNode.children[index];
      const newNodeChild = newNode.children[index];

      // There are a few cases to consider when child nodes are updated:
      //
      // 1. DOM node does not exist:
      //    a. A new virtual DOM node exists:
      //       Just append a child under the parent node.
      // 2. DOM node exists:
      //    a. Both prev and next virtual DOM nodes exist:
      //       No deletion/addition happened so just reconcile the nodes.
      //    b. Prev virtual node exists but next does not:
      //       A deletion happened so remove the DOM node.
      //    c. Prev virtual node does not exist but next exists:
      //       An insertion happened. Since we know a DOM node exists, we insert
      //       before that node. What about insertion at the end of the child
      //       list? That is handled by case 1a where a DOM node does not exist.

      if (domNodeChild) {
        if (prevNodeChild && newNodeChild) {
          reconcile(domNodeChild, prevNodeChild, newNodeChild);
        } else if (prevNodeChild) {
          domNodeChild.remove();
        } else if (newNodeChild) {
          insertBefore(createDomNode(newNodeChild), domNodeChild);
          continue;
        } else {
          continue;
        }
      } else if (newNodeChild) {
        appendNode(domNode, createDomNode(newNodeChild));
      }

      domIndex += 1;
    }
  }
};

let prevVirtualElement: VirtualElement = createElement('div');
let forceRender: () => void;
let appDocument: Document;
let polyfilled = false;

// TODO: Add `createRoot` function instead.
export const render = (
  component: VirtualNativeElement | VirtualFunctionElement,
  appRoot: HTMLElement
) => {
  // Lets us avoid calling `global.document` so we can run this in a Node
  // environment. Particularly useful for testing.
  appDocument = appRoot.ownerDocument;

  if (!polyfilled && appDocument.defaultView) {
    polyfillAll(appDocument.defaultView);
    polyfilled = true;
  }

  const virtualElement = createElement('div', null, component);

  // We cache this for use in `mountWithHooks` (the `useState` hook needs to be
  // able to trigger renders).
  // TODO: Add the ability to do a partial render.
  forceRender = () => render(component, appRoot);

  reconcile(appRoot, prevVirtualElement, virtualElement);

  prevVirtualElement = virtualElement;
};
