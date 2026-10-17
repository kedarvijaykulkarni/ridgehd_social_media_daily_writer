import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateProductHuntShape } from '../callOllama.js';

function wellFormed() {
  return {
    title: 'How we rebuilt waiver capture without slowing the front desk',
    body: 'Every participant now carries their waiver through the booking flow.',
    cta: 'Curious what you all think of the flow — fair trade-off?',
  };
}

test('validateProductHuntShape accepts a well-formed post', () => {
  const p = validateProductHuntShape(wellFormed());
  assert.equal(p.title, wellFormed().title);
});

test('validateProductHuntShape tolerates a missing/blank cta', () => {
  const input = wellFormed();
  input.cta = '   ';
  const p = validateProductHuntShape(input);
  assert.ok(!('cta' in p));
});

test('validateProductHuntShape rejects a missing title', () => {
  const input = wellFormed();
  delete input.title;
  assert.throws(() => validateProductHuntShape(input), /title/i);
});

test('validateProductHuntShape rejects a missing body', () => {
  const input = wellFormed();
  delete input.body;
  assert.throws(() => validateProductHuntShape(input), /body/i);
});
