import test from 'node:test';
import assert from 'node:assert/strict';
import { STATS_SITES, toSnapshot } from '../scripts/stats.mjs';

const payload = {
  sites: {
    'cs-lab': {
      totals: { pv: 10, uv: 4 },
      series: [
        { day: '2026-11-05', pv: 1, uv: 1 },
        { day: '2026-11-06', pv: 2, uv: 1 },
        { day: '2026-11-07', pv: 3, uv: 2 },
      ],
      top: [{ path: '/a/', pv: 5 }],
    },
    'whimsy-hub': { totals: { pv: 999 }, series: [], top: [] },
  },
};

test('白名单固定 6 个站点', () => {
  assert.deepEqual(STATS_SITES, ['station', 'cs-lab', 'lucky-hub', 'pulse-hub', 'repo-rank', 'tech-radar']);
});

test('只保留接入站点并记录时间', () => {
  const snapshot = toSnapshot(payload, 30, new Date('2026-11-07T01:00:00Z'));
  assert.deepEqual(Object.keys(snapshot.sites), ['cs-lab']);
  assert.equal(snapshot.updatedAt, '2026-11-07T01:00:00.000Z');
});

test('按窗口裁剪并汇总', () => {
  const snapshot = toSnapshot(payload, 2, new Date('2026-11-07T01:00:00Z'));
  const site = snapshot.sites['cs-lab'];
  assert.equal(site.series.length, 2);
  assert.equal(site.d30Pv, 5);
  assert.equal(site.d30Uv, 3);
  assert.equal(site.totalPv, 10);
  assert.equal(site.totalUv, 4);
  assert.equal(snapshot.total.pv, 10);
});

test('缺字段降级为 0 而不是 NaN', () => {
  const snapshot = toSnapshot({ sites: { 'tech-radar': {} } }, 30, new Date('2026-11-07T01:00:00Z'));
  const site = snapshot.sites['tech-radar'];
  assert.equal(site.totalPv, 0);
  assert.equal(site.d30Pv, 0);
  assert.deepEqual(site.series, []);
  assert.deepEqual(site.top, []);
});
