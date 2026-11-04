import { freshness } from '../lib/freshness.mjs';
import { STATUS_LABELS } from '../lib/status.mjs';

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
      statusLabel: STATUS_LABELS.unknown,
      statusDetail: '缺少 meta.json',
      summary: null,
    };
  }

  const requests = Number(meta.requests ?? 0);
  const failed = Number(meta.failed ?? 0);

  // status 决定颜色，statusDetail 说明原因，summary 放数字，三者不重复。
  let status = 'ok';
  let statusDetail = null;

  if (requests === 0) {
    status = 'error';
    statusDetail = '无查询记录';
  } else if (failed >= requests) {
    status = 'error';
    statusDetail = `${requests} 次查询全部失败`;
  } else if (failed > 0) {
    status = 'warn';
    statusDetail = `${requests} 次查询中 ${failed} 次失败`;
  }

  const age = freshness(updatedAt, 7, 30, now);
  if (status === 'ok' && age !== 'ok') {
    status = age;
    statusDetail = age === 'warn' ? '数据超过 7 天未更新' : '数据超过 30 天未更新';
  }

  const categories = index?.counts && typeof index.counts === 'object' ? Object.keys(index.counts).length : 0;

  return {
    lastCommitAt: pushedAt ?? null,
    dataUpdatedAt: updatedAt,
    status,
    statusLabel: STATUS_LABELS[status],
    statusDetail,
    summary: {
      label: `${requests} 次查询`,
      detail: categories > 0 ? `${categories} 个分类` : null,
    },
  };
}
