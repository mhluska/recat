import assert from 'assert';
import { JSDOM } from 'jsdom';

import { render } from '../../src/render';

describe('render', () => {
  let dom: JSDOM;
  let body: HTMLElement;

  beforeEach(() => {
    dom = new JSDOM();
    body = dom.window.document.body;
  });

  it('renders virtual native elements', () => {
    const renderString = 'Hello World';

    render(
      {
        type: 'div',
        props: { className: 'container' },
        children: [{ type: 'String', value: renderString }],
      },
      body
    );

    const container = body.querySelector('.container');

    assert.ok(container);
    assert.equal(container.innerHTML, renderString);
  });

  it('renders virtual function elements', () => {
    const renderString = 'Hello World';

    render(
      {
        type: () => ({
          type: 'div',
          props: { className: 'container' },
          children: [{ type: 'String', value: renderString }],
        }),
        props: {},
        result: null
      },
      body
    );

    const container = body.querySelector('.container');

    assert.ok(container);
    assert.equal(container.innerHTML, renderString);
  });

  it('updates child elements', () => {
    const observer = new dom.window.MutationObserver(() => {});
    observer.observe(body, { childList: true, subtree: true });

    render(
      {
        type: 'ol',
        props: { className: 'container' },
        children: [
          null,
          { type: 'li', props: {}, children: [{ type: 'String', value: 'B' }] },
          { type: 'li', props: {}, children: [{ type: 'String', value: 'C' }] },
        ],
      },
      body
    );

    render(
      {
        type: 'ol',
        props: { className: 'container' },
        children: [
          { type: 'li', props: {}, children: [{ type: 'String', value: 'A' }] },
          { type: 'li', props: {}, children: [{ type: 'String', value: 'B' }] },
          { type: 'li', props: {}, children: [{ type: 'String', value: 'C' }] },
        ],
      },
      body
    );

    render(
      {
        type: 'ol',
        props: { className: 'container' },
        children: [
          null,
          { type: 'li', props: {}, children: [{ type: 'String', value: 'B' }] },
          { type: 'li', props: {}, children: [{ type: 'String', value: 'C' }] },
        ],
      },
      body
    );

    const container = body.querySelector('.container');
    const items = body.querySelectorAll('li');

    assert.ok(container);
    assert.ok(items);
    assert.equal(items.length, 2);
    assert.equal(items[0]?.innerHTML, 'B');
    assert.equal(items[1]?.innerHTML, 'C');

    const mutationRecords = observer.takeRecords();

    assert.equal(mutationRecords.length, 3);
    assert.equal(mutationRecords[2]?.addedNodes.length, 0);
    assert.equal(mutationRecords[2]?.removedNodes.length, 1);
    assert.equal(mutationRecords[2]?.removedNodes[0]?.textContent, 'A');

    observer.disconnect();
  });
});
