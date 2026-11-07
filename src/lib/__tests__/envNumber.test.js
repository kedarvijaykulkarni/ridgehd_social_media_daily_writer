import { test } from 'node:test';
import assert from 'node:assert/strict';
import { envNumber } from '../envNumber.js';

test('envNumber keeps an explicit 0 and other valid values', () => {
  assert.equal(envNumber('X', 2, { X: '0' }), 0);
  assert.equal(envNumber('X', 2, { X: ' 5 ' }), 5);
});

test('envNumber falls back when unset, blank, negative or not a number', () => {
  for (const env of [{}, { X: '' }, { X: '  ' }, { X: '-1' }, { X: 'two' }]) {
    assert.equal(envNumber('X', 2, env), 2, JSON.stringify(env));
  }
});
