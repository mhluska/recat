import assert from 'assert';
import { JSDOM } from 'jsdom';

import { render } from '../../src/render';

describe('render', () => {
  it('renders', () => {
    const dom = new JSDOM();
    const body = dom.window.document.body;
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
});
