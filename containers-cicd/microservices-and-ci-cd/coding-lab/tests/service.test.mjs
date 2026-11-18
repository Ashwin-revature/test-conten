import { test } from 'node:test';
import assert from 'node:assert/strict';
import { check } from './lab.mjs';

test('the outgoing api call sets explicit connect and read timeouts', () => {
  const problem = check('reviews-timeouts');
  assert.equal(problem, null, problem ?? undefined);
});

test('the outgoing api call forwards the caller\'s token, and a request without one is refused', () => {
  const problem = check('reviews-auth-forward');
  assert.equal(problem, null, problem ?? undefined);
});

test('a timed-out call answers 504 and a refused connection answers 502 or 503', () => {
  const problem = check('reviews-error-mapping');
  assert.equal(problem, null, problem ?? undefined);
});
