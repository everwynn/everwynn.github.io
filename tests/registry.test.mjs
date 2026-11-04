import test from 'node:test';
import assert from 'node:assert/strict';
import { sites } from '../config/sites.mjs';
import { validateSites } from '../scripts/lib/registry.mjs';

test('内置注册表合法', () => {
  assert.doesNotThrow(() => validateSites(sites));
  assert.equal(sites.length, 7);
});

test('拒绝重复 id', () => {
  const bad = [{ ...sites[0] }, { ...sites[1], id: sites[0].id }];
  assert.throws(() => validateSites(bad), /id 重复/);
});

test('拒绝非法分类', () => {
  const bad = [{ ...sites[0], category: 'other' }];
  assert.throws(() => validateSites(bad), /category 非法/);
});

test('拒绝非 https URL', () => {
  const bad = [{ ...sites[0], url: 'http://example.com' }];
  assert.throws(() => validateSites(bad), /url 必须/);
});
