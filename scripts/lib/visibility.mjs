/**
 * 站点可见性判定。
 *
 * GitHub 对「当前 token 无权访问的私有仓库」统一返回 404，不区分私有、改名与删除，
 * 所以只能拿 404 当不可见的信号；200 才是可确认的公开。
 * 超时、403 限流、5xx 都只说明这一轮没问到，不能据此把站点从门户摘掉。
 */

export const PROBE = {
  PUBLIC: 'public',
  PRIVATE: 'private',
  ERROR: 'error',
};

/** 连续多少轮确认不可见才真正隐藏。两轮约等于 24 小时，用于过滤抖动与改名瞬间。 */
export const HIDE_AFTER_ROUNDS = 2;

/**
 * @param {'public'|'private'|'error'} probe 本轮的探测结论
 * @param {{ visibility?: string, privateRounds?: number }} [previous] 上一轮写入站点记录的状态
 * @returns {{ visibility: 'public'|'private', privateRounds: number }}
 */
export function resolveVisibility(probe, previous = {}) {
  const previousVisibility = previous?.visibility === 'private' ? 'private' : 'public';
  const previousRounds = Number.isFinite(previous?.privateRounds) ? previous.privateRounds : 0;

  if (probe === PROBE.PUBLIC) {
    return { visibility: 'public', privateRounds: 0 };
  }

  if (probe === PROBE.PRIVATE) {
    const privateRounds = previousRounds + 1;
    return {
      visibility: privateRounds >= HIDE_AFTER_ROUNDS ? 'private' : 'public',
      privateRounds,
    };
  }

  // 本轮没问到：维持上一轮判定，且不计入轮次
  return { visibility: previousVisibility, privateRounds: previousRounds };
}
