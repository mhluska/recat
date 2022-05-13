# Recat

<a href="https://github.com/mhluska/recat/actions"><img src="https://github.com/mhluska/recat/actions/workflows/test.yml/badge.svg?branch=master" alt="Build Status" /></a>
<a href="https://www.npmjs.com/package/recat-core"><img src="https://img.shields.io/npm/v/recat-core.svg" alt="Version"></a>
<a href="https://github.com/mhluska/recat/blob/master/LICENSE"><img src="https://img.shields.io/github/license/mhluska/recat" alt="License"></a>

*Simple JavaScript rendering library with a React-compatible API*

I built this mostly to understand how React works under the hood. Currently it
supports only a small subset of the React API (3KB minified).

See it live [here](https://poker.mhluska.com).

## Features

- Function components with hooks (useState, useEffect)
- No dependencies
- Built with TypeScript

## Install

```sh
npm install --save recat-core
```

## API

- [render](https://github.com/mhluska/recat#rendervirtualnode-domroot)
- [createElement](https://github.com/mhluska/recat#createelement-or-e)
- [useState](https://github.com/mhluska/recat#usestateinitialvalue)
- [useEffect](https://github.com/mhluska/recat#useeffectcallback-dependencies)

### `render(virtualNode, domRoot)`

Updates the `domRoot` contents using the virtual DOM tree at `virtualNode`.
Subsequent render calls will try to make as few writes as possible to the real
DOM tree.

### `createElement` or `e`

Creates a virtual DOM node. It can be used to render regular DOM elements:

```js
createElement(tagName, attributes, ...children);
```

To render, pass the virtual node to the `render` function:

```js
render(
  e('div', { className: 'kittens' }, e('h1', null, ' Nora')),
  document.body
);
```

Which renders:

```html
<div class="kittens">
  <h1>Nora</h1>
</div>
```

It can also render function components:

```js
createElement(functionComponent, props, ...children);
```

```js
const Kitten = ({ name }) => {
  return e('div', { className: 'kitten' }, e('h1', null, name));
};

render(
  e('div', { className: 'kittens' }, e(Kitten, { name: 'Nora' })),
  document.body
);
```

Which renders:

```html
<div class="kittens">
  <div class="kitten">
    <h1>Nora</h1>
  </div>
</div>
```

### Event Handling

Use `onClick`, `onInput` or `onSubmit` props:

```js
const Kitten = ({ name }) => {
  return e(
    'div',
    { className: 'kitten' },
    e('h1', null, name),
    e('button', { onClick: () => console.log(`${name} woke up!`) }, 'Wake up')
  );
};

render(
  e('div', { className: 'kittens' }, e(Kitten, { name: 'Nora' })),
  document.body
);
```

Which renders:

```html
<div class="kittens">
  <div class="kitten">
    <h1>Nora</h1>
    <button>Wake up</button>
  </div>
</div>
```

Pressing the button will print `Nora woke up!` to the console.

### `useState(initialValue)`

Adds local state to the component and provides a setter to update the state.
Calling the setter triggers a rerender of the component subtree:

```js
const Kitten = ({ name }) => {
  const [isAwake, setIsAwake] = useState(false);

  return e(
    'div',
    { className: 'kitten' },
    e('h1', null, name),
    e('button', { onClick: () => setIsAwake(true) }, 'Wake up'),
    isAwake && e('span', null, `${name} woke up!`)
  );
};

render(
  e('div', { className: 'kittens' }, e(Kitten, { name: 'Nora' })),
  document.body
);
```

Which renders:

```html
<div class="kittens">
  <div class="kitten">
    <h1>Nora</h1>
    <button>Wake up</button>
  </div>
</div>
```

Pressing the button will update the DOM to:

```html
<div class="kittens">
  <div class="kitten">
    <h1>Nora</h1>
    <button>Wake up</button>
    <span>Nora woke up!</span>
  </div>
</div>
```

### `useEffect(callback, dependencies)`

Calls `callback` whenever the dependencies array changes after the current
component render. Useful for running side effects during render:

```js
const Kitten = ({ name }) => {
  const [isAwake, setIsAwake] = useState(false);

  useEffect(() => {
    console.log(isAwake ? `${name} woke up!` : `${name} is asleep`);
  }, [isAwake]);

  return e(
    'div',
    { className: 'kitten' },
    e('h1', null, name),
    e('button', { onClick: () => setIsAwake(true) }, 'Wake up')
  );
};

render(
  e('div', { className: 'kittens' }, e(Kitten, { name: 'Nora' })),
  document.body
);
```

Which renders:

```html
<div class="kittens">
  <div class="kitten">
    <h1>Nora</h1>
    <button>Wake up</button>
  </div>
</div>
```

On first render, the component prints `Nora is asleep` to the console.

Pressing the button will print `Nora woke up!` to the console. Future button
presses will not trigger the effect since we added `isAwake` to the dependency
array.
