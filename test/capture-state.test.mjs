import assert from 'node:assert/strict';
import test from 'node:test';

import { captureStateFromSearch } from '../src/capture-state.mjs';

test('uses only supported capture screen and device query values', () => {
  assert.deepEqual(captureStateFromSearch('?captureScreen=summary&captureDevice=phone'), {
    screen: 'summary',
    device: 'phone',
  });
});

test('falls back safely for missing or unknown capture state', () => {
  assert.deepEqual(captureStateFromSearch('?captureScreen=unknown&captureDevice=tv'), {
    screen: 'home',
    device: 'console',
  });
});
