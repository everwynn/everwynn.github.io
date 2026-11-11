import test from 'node:test';
import assert from 'node:assert/strict';
import { HIDE_AFTER_ROUNDS, PROBE, resolveVisibility } from '../scripts/lib/visibility.mjs';

test('200 即公开，并清零连续计数', () => {
  assert.deepEqual(resolveVisibility(PROBE.PUBLIC, {}), {
    visibility: 'public',
    privateRounds: 0,
  });
  assert.deepEqual(resolveVisibility(PROBE.PUBLIC, { visibility: 'private', privateRounds: 5 }), {
    visibility: 'public',
    privateRounds: 0,
  });
});

test('首轮 404 仅累计计数，不立即隐藏', () => {
  const next = resolveVisibility(PROBE.PRIVATE, {});
  assert.equal(next.visibility, 'public');
  assert.equal(next.privateRounds, 1);
});

test('连续两轮 404 才隐藏', () => {
  const first = resolveVisibility(PROBE.PRIVATE, {});
  const second = resolveVisibility(PROBE.PRIVATE, first);
  assert.equal(second.visibility, 'private');
  assert.equal(second.privateRounds, HIDE_AFTER_ROUNDS);
});

test('网络错误与限流不改变可见性，也不推进计数', () => {
  const next = resolveVisibility(PROBE.ERROR, { visibility: 'public', privateRounds: 1 });
  assert.deepEqual(next, { visibility: 'public', privateRounds: 1 });

  const hidden = resolveVisibility(PROBE.ERROR, { visibility: 'private', privateRounds: 2 });
  assert.deepEqual(hidden, { visibility: 'private', privateRounds: 2 });
});

test('隐藏后可恢复：再遇到 200 立刻转回公开', () => {
  const hidden = { visibility: 'private', privateRounds: 2 };
  assert.deepEqual(resolveVisibility(PROBE.PUBLIC, hidden), {
    visibility: 'public',
    privateRounds: 0,
  });
});

test('无历史记录时的错误探测按公开处理，不误杀', () => {
  assert.deepEqual(resolveVisibility(PROBE.ERROR, {}), {
    visibility: 'public',
    privateRounds: 0,
  });
});
