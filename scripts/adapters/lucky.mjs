import { freshness } from '../lib/freshness.mjs';

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
      statusLabel: '未知',
      statusDetail: '缺少 meta.json',
      summary: null,
    };
  }

  const lastCode = meta.lastCode ?? '—';
  const total = Number(meta.total ?? 0);
  const lastSuccess = shortDate(health?.lastSuccessAt ?? meta.updatedAt);

  let status = 'ok';
  let statusLabel = `第 ${lastCode} 期`;
  let statusDetail = lastSuccess ? `最近成功 ${lastSuccess}` : null;

  if (health?.status === 'error') {
    status = 'error';
    statusLabel = '抓取失败';
    statusDetail = [health.message, lastSuccess ? `最近成功 ${lastSuccess}` : null]
      .filter(Boolean)
      .join(' · ');
  } else {
    const age = freshness(updatedAt, 14, 45, now);
    if (age !== 'ok') {
      status = age;
      statusLabel = age === 'warn' ? '数据偏旧' : '数据过期';
    }
  }

  return {
    lastCommitAt: pushedAt ?? null,
    dataUpdatedAt: updatedAt,
    status,
    statusLabel,
    statusDetail,
    summary: { label: `第 ${lastCode} 期`, detail: `共 ${total} 期` },
  };
}
