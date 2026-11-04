import test from 'node:test';
import assert from 'node:assert/strict';
import { adaptCommit } from '../scripts/adapters/commit.mjs';
import { adaptPulse } from '../scripts/adapters/pulse.mjs';
import { adaptRepoRank } from '../scripts/adapters/repo-rank.mjs';
import { adaptLucky } from '../scripts/adapters/lucky.mjs';

const NOW = new Date('2026-11-02T00:00:00.000Z');
const daysAgo = (n) => new Date(NOW.getTime() - n * 86400000).toISOString();

test('commit: 90 天内正常', () => {
  const result = adaptCommit({ pushedAt: daysAgo(10) }, NOW);
  assert.equal(result.status, 'ok');
  assert.equal(result.statusLabel, '正常');
});

test('commit: 提交久远不算异常', () => {
  const result = adaptCommit({ pushedAt: daysAgo(120) }, NOW);
  assert.equal(result.status, 'ok');
  assert.equal(result.statusLabel, '正常');
});

test('commit: 一年未提交仍为正常', () => {
  const result = adaptCommit({ pushedAt: daysAgo(365) }, NOW);
  assert.equal(result.status, 'ok');
  assert.equal(result.statusLabel, '正常');
});

test('commit: 缺少提交时间为未知', () => {
  const result = adaptCommit({ pushedAt: null }, NOW);
  assert.equal(result.status, 'unknown');
});

test('pulse: 全部源正常', () => {
  const result = adaptPulse({
    pushedAt: daysAgo(1),
    files: {
      'data/health.json': {
        updatedAt: daysAgo(1),
        summary: { total: 22, ok: 22, failed: 0, skipped: 0, todayCount: 57 },
      },
    },
  }, NOW);
  assert.equal(result.status, 'ok');
  assert.equal(result.summary.label, '22/22 源正常');
  assert.equal(result.summary.detail, '今日 57 条');
});

test('pulse: 有源失败为需关注', () => {
  const result = adaptPulse({
    pushedAt: daysAgo(1),
    files: {
      'data/health.json': {
        updatedAt: daysAgo(1),
        summary: { total: 22, ok: 20, failed: 2, skipped: 0, todayCount: 3 },
      },
    },
  }, NOW);
  assert.equal(result.status, 'warn');
  assert.equal(result.statusLabel, '需关注');
  assert.equal(result.statusDetail, '20/22 源正常，2 个失败');
  assert.equal(result.summary.label, '20/22 源正常');
});

test('pulse: 数据偏旧时状态词为需关注', () => {
  const result = adaptPulse({
    pushedAt: daysAgo(10),
    files: {
      'data/health.json': {
        updatedAt: daysAgo(10),
        summary: { total: 22, ok: 22, failed: 0, skipped: 0, todayCount: 0 },
      },
    },
  }, NOW);
  assert.equal(result.status, 'warn');
  assert.equal(result.statusLabel, '需关注');
  assert.match(result.statusDetail, /7 天/);
});

test('pulse: 数据超过 30 天为异常', () => {
  const result = adaptPulse({
    pushedAt: daysAgo(40),
    files: {
      'data/health.json': {
        updatedAt: daysAgo(40),
        summary: { total: 22, ok: 22, failed: 0, skipped: 0, todayCount: 0 },
      },
    },
  }, NOW);
  assert.equal(result.status, 'error');
});

test('pulse: 缺少汇总为未知', () => {
  const result = adaptPulse({ pushedAt: daysAgo(1), files: {} }, NOW);
  assert.equal(result.status, 'unknown');
});

test('repo-rank: 查询全部成功', () => {
  const result = adaptRepoRank({
    pushedAt: daysAgo(1),
    files: {
      'data/meta.json': { updatedAt: daysAgo(1), requests: 92, failed: 0 },
      'data/index.json': { counts: { go: {}, rust: {}, java: {} } },
    },
  }, NOW);
  assert.equal(result.status, 'ok');
  assert.equal(result.summary.detail, '3 个分类');
});

test('repo-rank: 部分失败为需关注', () => {
  const result = adaptRepoRank({
    pushedAt: daysAgo(1),
    files: { 'data/meta.json': { updatedAt: daysAgo(1), requests: 92, failed: 3 } },
  }, NOW);
  assert.equal(result.status, 'warn');
  assert.equal(result.statusLabel, '需关注');
  assert.equal(result.statusDetail, '92 次查询中 3 次失败');
});

test('repo-rank: 全部失败为异常', () => {
  const result = adaptRepoRank({
    pushedAt: daysAgo(1),
    files: { 'data/meta.json': { updatedAt: daysAgo(1), requests: 92, failed: 92 } },
  }, NOW);
  assert.equal(result.status, 'error');
  assert.equal(result.statusLabel, '异常');
});

test('lucky: 抓取失败为异常', () => {
  const result = adaptLucky({
    pushedAt: daysAgo(1),
    files: {
      'data/meta.json': { updatedAt: daysAgo(4), lastCode: '2026124', total: 2082 },
      'data/health.json': { status: 'error', message: 'HTTP 403 Forbidden', lastSuccessAt: daysAgo(4) },
    },
  }, NOW);
  assert.equal(result.status, 'error');
  assert.equal(result.statusLabel, '异常');
  assert.match(result.statusDetail, /HTTP 403 Forbidden/);
  // 期号属于摘要，异常时也要保留，否则看不出数据停在哪一期
  assert.equal(result.summary.label, '第 2026124 期');
  assert.equal(result.summary.detail, '共 2082 期');
});

test('lucky: 14 天内正常', () => {
  const result = adaptLucky({
    pushedAt: daysAgo(1),
    files: {
      'data/meta.json': { updatedAt: daysAgo(4), lastCode: '2026124', total: 2082 },
      'data/health.json': { status: 'ok', lastSuccessAt: daysAgo(4) },
    },
  }, NOW);
  assert.equal(result.status, 'ok');
  assert.equal(result.statusLabel, '正常');
  assert.equal(result.summary.label, '第 2026124 期');
});

test('lucky: 20 天为需关注', () => {
  const result = adaptLucky({
    pushedAt: daysAgo(1),
    files: {
      'data/meta.json': { updatedAt: daysAgo(20), lastCode: '2026120', total: 2078 },
      'data/health.json': { status: 'ok', lastSuccessAt: daysAgo(20) },
    },
  }, NOW);
  assert.equal(result.status, 'warn');
});
