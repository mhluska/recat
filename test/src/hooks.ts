import assert from 'assert';
import { JSDOM } from 'jsdom';

import { attributeChanged } from '../utils';
import { render, e, useState } from '../../src';

describe('hooks', () => {
  describe('useState', () => {
    let dom: JSDOM;
    let buttonElem: HTMLButtonElement;

    beforeEach(() => {
      dom = new JSDOM();
      const body = dom.window.document.body;

      const Button = () => {
        const [isDisabled, setIsDisabled] = useState(false);
        return e(
          'button',
          { disabled: isDisabled, onClick: () => setIsDisabled(true) },
          'Submit'
        );
      };

      render(e(Button), body);

      const el = body.querySelector('button');
      assert.ok(el);

      buttonElem = el;
    });

    it('sets state', async () => {
      assert.equal(buttonElem.disabled, false);

      buttonElem.dispatchEvent(new dom.window.Event('click'));

      await attributeChanged(buttonElem, 'disabled');

      assert.equal(buttonElem.disabled, true);
    });
  });
});
