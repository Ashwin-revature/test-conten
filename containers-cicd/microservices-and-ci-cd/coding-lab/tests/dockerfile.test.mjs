import { test } from 'node:test';
import assert from 'node:assert/strict';
import { check } from './lab.mjs';

test('reviews Dockerfile starts a server that listens on 0.0.0.0', () => {
  const problem = check('reviews-listen');
  assert.equal(problem, null, problem ?? undefined);
});
