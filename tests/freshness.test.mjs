import test from 'node:test';
import assert from 'node:assert/strict';
import { freshness, daysBetween } from '../scripts/lib/freshness.mjs';

const NOW = new Date('2026-11-02T00:00:00.000Z');
const daysAgo = (n) => new Date(NOW.getTime() - n * 86400000).toISOString();

test('7 天边界为正常', () => assert.equal(freshness(daysAgo(7), 7, 30, NOW), 'ok'));
test('8 天为需关注', () => assert.equal(freshness(daysAgo(8), 7, 30, NOW), 'warn'));
test('30 天仍为需关注', () => assert.equal(freshness(daysAgo(30), 7, 30, NOW), 'warn'));
test('31 天为异常', () => assert.equal(freshness(daysAgo(31), 7, 30, NOW), 'error'));
test('空值为未知', () => assert.equal(freshness(null, 7, 30, NOW), 'unknown'));
test('天数计算', () => assert.equal(daysBetween(NOW, daysAgo(3)), 3));
