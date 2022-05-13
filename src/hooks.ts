import { Primitive, FunctionComponent, VirtualFunctionElement } from './types';
import { arraysEqual } from './utils';

type Effect = {
  callback: () => void;
  unmountCallback: void | (() => void);
  dependencies: Primitive[];
};

type HookData<T> = {
  [key in keyof T]: T[key];
};

type UseStateHook = HookData<{ value: unknown }>;
type UseEffectHook = HookData<Effect>;

let currentComponent: FunctionComponent<unknown>;
let currentForceRender: () => void;

const hooks = {
  useStateCallCount: 0,
  useState: new Map<FunctionComponent<unknown>, UseStateHook[]>(),
  useEffect: new Map<FunctionComponent<unknown>, UseEffectHook[]>(),
};

// Calls callback if dependencies change between renders.
export const useEffect = (
  callback: Effect['callback'],
  dependencies: Effect['dependencies']
) => {
  const componentEffects = hooks.useEffect.get(currentComponent) || [];

  componentEffects.push({
    callback,
    dependencies,
    unmountCallback: undefined,
  });

  hooks.useEffect.set(currentComponent, componentEffects);
};

// TODO: This should be a special case of `useReducer` once it's implemented.
export const useState = <T>(initialValue: T): [T, (value: T) => void] => {
  let componentHookCalls = hooks.useState.get(currentComponent);
  if (!componentHookCalls) {
    componentHookCalls = [];
    hooks.useState.set(currentComponent, componentHookCalls);
  }

  let hook = componentHookCalls[hooks.useStateCallCount];
  if (!hook) {
    hook = { value: initialValue };
    componentHookCalls.push(hook);
  }

  hooks.useStateCallCount += 1;

  const setState = (value: T) => {
    if (hook.value !== value) {
      hook.value = value;

      // We could end up here during the current render. That means we'd kick
      // off another render before the DOM has finished updating. So we use
      // `requestIdleCallback` to ensure the next render runs after the current
      // one is complete.
      // TODO: Once fibers are implemented, this can go away.
      requestIdleCallback(currentForceRender);
    }
  };

  return [hook.value as T, setState];
};

export const mountWithHooks = (
  virtualElement: VirtualFunctionElement,
  forceRender: () => void
) => {
  hooks.useStateCallCount = 0;
  currentComponent = virtualElement.type;
  currentForceRender = forceRender;

  const prevEffects = hooks.useEffect.get(virtualElement.type);

  // Repopulates after calling the function component below.
  hooks.useEffect.delete(virtualElement.type);

  virtualElement.result = virtualElement.type(virtualElement.props);

  const currentUseEffectCalls = hooks.useEffect.get(currentComponent);

  if (!currentUseEffectCalls || currentUseEffectCalls.length === 0) {
    return virtualElement.result;
  }

  currentUseEffectCalls.forEach((nextEffect, index) => {
    const prevEffect = prevEffects?.[index];

    if (
      prevEffect &&
      arraysEqual(prevEffect.dependencies, nextEffect.dependencies)
    ) {
      nextEffect.unmountCallback = prevEffect.unmountCallback;
    } else {
      nextEffect.unmountCallback = nextEffect.callback();
    }
  });

  return virtualElement.result;
};

export const unmountWithHooks = (virtualElement: VirtualFunctionElement) => {
  const componentEffects = hooks.useEffect.get(virtualElement.type);
  if (!componentEffects) {
    return virtualElement.result;
  }

  for (const { unmountCallback } of componentEffects) {
    if (unmountCallback) {
      unmountCallback();
    }
  }

  hooks.useEffect.delete(virtualElement.type);
  hooks.useState.delete(virtualElement.type);

  return virtualElement.result;
};
