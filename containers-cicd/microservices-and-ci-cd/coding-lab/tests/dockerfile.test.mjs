import { test } from 'node:test';
import assert from 'node:assert/strict';
import { check } from './lab.mjs';

test('reviews Dockerfile uses a Python 3 base image and a WORKDIR', () => {
  const problem = check('reviews-image');
  assert.equal(problem, null, problem ?? undefined);
});

test('reviews Dockerfile installs requirements before copying the app code', () => {
  const problem = check('reviews-deps-order');
  assert.equal(problem, null, problem ?? undefined);
});

test('reviews Dockerfile starts a server that listens on 0.0.0.0', () => {
  const problem = check('reviews-listen');
  assert.equal(problem, null, problem ?? undefined);
});

test('reviews .dockerignore leaves out caches, version control and secrets', () => {
  const problem = check('reviews-ignore');
  assert.equal(problem, null, problem ?? undefined);
});
