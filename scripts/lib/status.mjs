/**
 * 状态词只管健康度，不放任何数字。
 * 数据摘要统一走 summary，避免同一个数字在徽章和卡片底部各说一遍。
 */
export const STATUS_LABELS = {
  ok: '正常',
  warn: '需关注',
  error: '异常',
  unknown: '未知',
};
