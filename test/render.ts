import assert from 'assert';
import { JSDOM } from 'jsdom';

import { render } from '../src/render';

describe('render', function () {
  it('renders', function () {
    const dom = new JSDOM();
    const appRoot = dom.window.document.body;

    const renderString = 'Hello World';
    render(
      {
        type: 'div',
        props: { className: 'container' },
        children: [{ type: 'String', value: renderString }],
      },
      appRoot
    );

    assert.equal(appRoot.querySelector('.container')?.innerHTML, renderString);
  });
});
