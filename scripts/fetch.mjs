import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sites } from '../config/sites.mjs';
import { validateSites } from './lib/registry.mjs';
import { HttpError, fetchJson } from './lib/http.mjs';
import { mergeSites, readJson, writeJsonIfChanged } from './lib/files.mjs';
import { PROBE, resolveVisibility } from './lib/visibility.mjs';
import { adaptCommit } from './adapters/commit.mjs';
import { adaptPulse } from './adapters/pulse.mjs';
import { adaptRepoRank } from './adapters/repo-rank.mjs';
import { adaptLucky } from './adapters/lucky.mjs';
import { adaptTechRadar } from './adapters/tech-radar.mjs';
import { fetchStats, toSnapshot, writeStats } from './stats.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = resolve(ROOT, 'data');
const SITES_FILE = resolve(DATA_DIR, 'sites.json');
const HEALTH_FILE = resolve(DATA_DIR, 'health.json');
const STATS_FILE = resolve(DATA_DIR, 'stats.json');

const ADAPTERS = {
  commit: adaptCommit,
  pulse: adaptPulse,
  'repo-rank': adaptRepoRank,
  lucky: adaptLucky,
  'tech-radar': adaptTechRadar,
};

const DATA_FILES = {
  commit: [],
  pulse: ['data/health.json', 'data/index.json'],
  'repo-rank': ['data/meta.json', 'data/health.json', 'data/index.json'],
  lucky: ['data/meta.json', 'data/health.json'],
  'tech-radar': ['data/catalog.json'],
};

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

function githubHeaders() {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'everwynn-station/1.0 (+https://everwynn.github.io/)',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return headers;
}

function rawHeaders() {
  return { 'User-Agent': 'everwynn-station/1.0 (+https://everwynn.github.io/)' };
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function readRepoFile(repo, branch, path) {
  const attempts = [
    () => fetchJson(
      `https://raw.githubusercontent.com/${repo}/${branch}/${path}`,
      { headers: rawHeaders(), retries: 1, expectText: true },
    ),
    () => fetchJson(
      `https://api.github.com/repos/${repo}/contents/${path}?ref=${branch}`,
      { headers: { ...githubHeaders(), Accept: 'application/vnd.github.raw' }, retries: 1, expectText: true },
    ),
  ];

  for (const attempt of attempts) {
    try {
      return parseJson(await attempt());
    } catch {
      // 依次回退到下一个数据源
    }
  }
  return null;
}

async function run() {
  validateSites(sites);

  const now = new Date();
  const previous = readJson(SITES_FILE, null);
  const previousSites = Array.isArray(previous) ? previous : previous?.sites ?? [];
  const previousHealth = readJson(HEALTH_FILE, null);

  const nextSites = [];
  const healthSites = {};

  for (const site of sites) {
    const started = Date.now();
    const previousSite = previousSites.find((item) => item.id === site.id);
    let reason = null;
    let result;

    let repoInfo = null;
    let probe = PROBE.ERROR;
    try {
      repoInfo = await fetchJson(`https://api.github.com/repos/${site.repo}`, {
        headers: githubHeaders(),
        retries: 3,
      });
      // 自己的 token 能读到 private 字段；读不到时，200 本身已是「公开」的证据
      probe = repoInfo?.private === true ? PROBE.PRIVATE : PROBE.PUBLIC;
    } catch (error) {
      // 404 是「私有 / 删除 / 改名」在当前 token 下唯一能拿到的信号
      probe = error instanceof HttpError && error.status === 404 ? PROBE.PRIVATE : PROBE.ERROR;
      reason = probe === PROBE.PRIVATE
        ? '仓库不可访问：可能已转为私有、删除或改名'
        : `仓库信息获取失败：${error.message}`;
    }

    try {
      if (probe === PROBE.PRIVATE) {
        // 不回填旧提交时间：否则 commit 适配器会把一个打不开的仓库算成「正常」
        result = {
          lastCommitAt: previousSite?.lastCommitAt ?? null,
          dataUpdatedAt: previousSite?.dataUpdatedAt ?? null,
          status: 'unknown',
          statusLabel: '未知',
          statusDetail: reason,
          summary: null,
        };
      } else {
        let pushedAt = repoInfo?.pushed_at ?? null;
        pushedAt = pushedAt ?? previousSite?.lastCommitAt ?? null;

        const files = {};
        for (const path of DATA_FILES[site.adapter] ?? []) {
          files[path] = await readRepoFile(site.repo, site.branch ?? 'main', path);
          await sleep(120);
        }

        result = ADAPTERS[site.adapter]({ pushedAt, files }, now);
        if (result.status === 'unknown' && !reason) {
          reason = result.statusDetail ?? '数据不可用';
        }
      }
    } catch (error) {
      reason = error.message;
      result = {
        lastCommitAt: previousSite?.lastCommitAt ?? null,
        dataUpdatedAt: previousSite?.dataUpdatedAt ?? null,
        status: 'unknown',
        statusLabel: '未知',
        statusDetail: reason,
        summary: null,
      };
    }

    nextSites.push(mergeSites(previousSites, { ...site, ...result, ...resolveVisibility(probe, previousSite) }));
    healthSites[site.id] = { status: reason ? 'error' : 'ok', reason };

    const duration = Date.now() - started;
    console.log(`[station] ${site.id}: ${result.status} (${duration}ms)${reason ? ` - ${reason}` : ''}`);
    await sleep(150);
  }

  const sitesChanged = JSON.stringify(nextSites) !== JSON.stringify(previousSites);
  const sitesPayload = {
    updatedAt: sitesChanged || !previous?.updatedAt ? now.toISOString() : previous.updatedAt,
    sites: nextSites,
  };

  const healthChanged = JSON.stringify(healthSites) !== JSON.stringify(previousHealth?.sites ?? {});
  const healthPayload = {
    updatedAt: healthChanged || !previousHealth?.updatedAt ? now.toISOString() : previousHealth.updatedAt,
    sites: healthSites,
  };

  const sitesWritten = writeJsonIfChanged(SITES_FILE, sitesPayload);
  const healthWritten = writeJsonIfChanged(HEALTH_FILE, healthPayload);
  const failed = Object.values(healthSites).filter((item) => item.status === 'error').length;

  // 统计快照必须可失败：端点不可达时保留旧文件，不能让整轮抓取退出非 0
  let statsNote = '未配置 STATS_ENDPOINT，跳过';
  if (process.env.STATS_ENDPOINT) {
    try {
      const payload = await fetchStats({ endpoint: process.env.STATS_ENDPOINT, days: 30 });
      statsNote = writeStats(STATS_FILE, toSnapshot(payload, 30, now)) ? '已更新' : '无变化';
    } catch (error) {
      statsNote = `失败，沿用旧数据：${error.message}`;
    }
  }

  console.log(
    `[station] 完成：${nextSites.length} 个站点，${failed} 个失败，` +
    `sites.json ${sitesWritten ? '已更新' : '无变化'}，health.json ${healthWritten ? '已更新' : '无变化'}，` +
    `stats.json ${statsNote}`,
  );
}

run().catch((error) => {
  console.error(`[station] 抓取失败：${error.message}`);
  process.exitCode = 1;
});
