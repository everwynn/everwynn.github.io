import { freshness } from '../lib/freshness.mjs';
import { STATUS_LABELS } from '../lib/status.mjs';

function shortDate(iso) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: '2-digit',
    day: '2-digit',
  }).format(date).replace(/\//g, '-');
}

export function adaptLucky({ pushedAt, files }, now = new Date()) {
  const meta = files?.['data/meta.json'] ?? null;
  const health = files?.['data/health.json'] ?? null;
  const updatedAt = meta?.updatedAt ?? health?.lastSuccessAt ?? null;

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

  const lastCode = meta.lastCode ?? '—';
  const total = Number(meta.total ?? 0);
  const lastSuccess = shortDate(health?.lastSuccessAt ?? meta.updatedAt);

  // 期号属于摘要，不放在状态词里；状态只回答“能不能用”。
  let status = 'ok';
  let statusDetail = lastSuccess ? `最近成功 ${lastSuccess}` : null;

  if (health?.status === 'error') {
    status = 'error';
    statusDetail = [health.message, lastSuccess ? `最近成功 ${lastSuccess}` : null]
      .filter(Boolean)
      .join(' · ');
  } else {
    const age = freshness(updatedAt, 14, 45, now);
    if (age !== 'ok') {
      status = age;
      statusDetail = age === 'warn' ? '数据超过 14 天未更新' : '数据超过 45 天未更新';
    }
  }

  return {
    lastCommitAt: pushedAt ?? null,
    dataUpdatedAt: updatedAt,
    status,
    statusLabel: STATUS_LABELS[status],
    statusDetail,
    summary: { label: `第 ${lastCode} 期`, detail: `共 ${total} 期` },
  };
}
