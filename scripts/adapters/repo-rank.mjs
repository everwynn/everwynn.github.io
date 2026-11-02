import { freshness } from '../lib/freshness.mjs';

export function adaptRepoRank({ pushedAt, files }, now = new Date()) {
  const meta = files?.['data/meta.json'] ?? null;
  const health = files?.['data/health.json'] ?? null;
  const index = files?.['data/index.json'] ?? null;
  const updatedAt = meta?.updatedAt ?? health?.updatedAt ?? index?.updatedAt ?? null;

  if (!meta) {
    return {
      lastCommitAt: pushedAt ?? null,
      dataUpdatedAt: updatedAt,
      status: 'unknown',
      statusLabel: '未知',
      statusDetail: '缺少 meta.json',
      summary: null,
    };
  }

  const requests = Number(meta.requests ?? 0);
  const failed = Number(meta.failed ?? 0);
  let status = 'ok';
  let statusLabel = `${requests} 次查询 · ${failed} 失败`;

  if (requests === 0) {
    status = 'error';
    statusLabel = '无查询记录';
  } else if (failed >= requests) {
    status = 'error';
    statusLabel = '全部查询失败';
  } else if (failed > 0) {
    status = 'warn';
    statusLabel = `${failed} 次查询失败`;
  }

  const age = freshness(updatedAt, 7, 30, now);
  if (status === 'ok' && age !== 'ok') {
    status = age;
    statusLabel = age === 'warn' ? '数据偏旧' : '数据过期';
  }

  const categories = index?.counts && typeof index.counts === 'object' ? Object.keys(index.counts).length : 0;

  return {
    lastCommitAt: pushedAt ?? null,
    dataUpdatedAt: updatedAt,
    status,
    statusLabel,
    statusDetail: failed > 0 ? `${requests} 次查询中 ${failed} 次失败` : null,
    summary: {
      label: `${requests} 次查询`,
      detail: categories > 0 ? `${categories} 个分类` : null,
    },
  };
}
