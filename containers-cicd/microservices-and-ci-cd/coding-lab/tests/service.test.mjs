import { test } from 'node:test';
import assert from 'node:assert/strict';
import { check } from './lab.mjs';

test('the outgoing api call sets explicit connect and read timeouts', () => {
  const problem = check('reviews-timeouts');
  assert.equal(problem, null, problem ?? undefined);
});

test('the outgoing api call forwards the caller\'s token instead of a hard-coded one', () => {
  const problem = check('reviews-auth-forward');
  assert.equal(problem, null, problem ?? undefined);
});

test('a failed or timed-out downstream call becomes a clear 502/503/504 response', () => {
  const problem = check('reviews-error-mapping');
  assert.equal(problem, null, problem ?? undefined);
});
