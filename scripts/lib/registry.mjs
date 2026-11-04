const CATEGORIES = new Set(['learn', 'data', 'tool', 'experience']);
const ADAPTERS = new Set(['commit', 'pulse', 'repo-rank', 'lucky', 'tech-radar']);

export function validateSites(sites) {
  if (!Array.isArray(sites) || sites.length === 0) throw new Error('站点注册表不能为空');
  const errors = [];
  const ids = new Set();

  sites.forEach((site, index) => {
    const where = `第 ${index + 1} 项${site?.id ? `（${site.id}）` : ''}`;
    if (!site || typeof site !== 'object') {
      errors.push(`${where} 不是对象`);
      return;
    }
    if (!site.id || !/^[a-z0-9-]+$/.test(site.id)) errors.push(`${where} id 非法`);
    else if (ids.has(site.id)) errors.push(`${where} id 重复`);
    else ids.add(site.id);
    if (!site.name) errors.push(`${where} 缺少 name`);
    if (!site.url || !/^https:\/\/.+\/$/.test(site.url)) errors.push(`${where} url 必须以 https:// 开头并以 / 结尾`);
    if (!site.repo || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(site.repo)) errors.push(`${where} repo 必须为 owner/name`);
    if (!CATEGORIES.has(site.category)) errors.push(`${where} category 非法`);
    if (!ADAPTERS.has(site.adapter)) errors.push(`${where} adapter 非法`);
    if (!Array.isArray(site.tech)) errors.push(`${where} tech 必须为数组`);
    if (site.order !== undefined && !Number.isFinite(site.order)) errors.push(`${where} order 必须为数字`);
  });

  if (errors.length) throw new Error(`站点注册表校验失败：\n- ${errors.join('\n- ')}`);
  return sites;
}

export { CATEGORIES, ADAPTERS };
