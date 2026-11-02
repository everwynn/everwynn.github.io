import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeSites } from '../scripts/lib/files.mjs';

test('失败时保留上一轮摘要并标记未知', () => {
  const previous = [{
    id: 'pulse-hub', name: 'Pulse Hub', status: 'ok', statusLabel: '22/22 源正常',
    statusDetail: null, summary: { label: '22/22 源正常', detail: '今日 57 条' },
  }];
  const next = {
    id: 'pulse-hub', name: 'Pulse Hub', status: 'unknown', statusLabel: '未知',
    statusDetail: 'HTTP 403 Forbidden', summary: null,
  };
  const merged = mergeSites(previous, next);
  assert.equal(merged.status, 'unknown');
  assert.equal(merged.statusLabel, '未知');
  assert.equal(merged.statusDetail, 'HTTP 403 Forbidden');
  assert.equal(merged.summary.label, '22/22 源正常');
});

test('正常结果直接返回', () => {
  const next = { id: 'cs-lab', status: 'ok' };
  assert.equal(mergeSites([], next), next);
});
