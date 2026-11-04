# EverWynn Station · 维恩总站

个人站点的统一入口：一页看清每个子站点的地址、运行状态与数据新鲜度。

线上地址：<https://everwynn.github.io/>

## 站点

站点清单以 [`config/sites.mjs`](config/sites.mjs) 为准，下表为当前快照。

| 站点 | 分类 | 状态依据 |
|---|---|---|
| [CS Lab](https://everwynn.github.io/cs-lab/) | 学习 | 仓库最近提交 |
| [Lucky Hub](https://everwynn.github.io/lucky-hub/) | 数据 | `data/meta.json`、`data/health.json` |
| [Pulse Hub](https://everwynn.github.io/pulse-hub/) | 数据 | `data/health.json`、`data/index.json` |
| [Repo Rank](https://everwynn.github.io/repo-rank/) | 数据 | `data/meta.json`、`data/health.json`、`data/index.json` |
| [Stroke Annotation Tool](https://everwynn.github.io/stroke-annotation-tool/) | 工具 | 仓库最近提交 |
| [Whimsy Hub](https://everwynn.github.io/whimsy-hub/) | 体验 | 仓库最近提交 |

## 设计原则

- **纯静态**：Astro 在构建期读取 `data/*.json` 生成页面，没有后端、数据库与运行时密钥。
- **失败隔离**：单个站点抓取失败只会把该站标为「未知」，保留上一轮展示数据，不影响其他卡片。
- **零第三方**：不加载统计脚本、外部字体或 CDN 资源，首屏不依赖 JS。
- **渐进增强**：无 JavaScript 时全部卡片与链接可用，筛选、搜索、主题切换只是增强。
- **两级数据**：站点注册表回答「有哪些站」，抓取结果回答「现在怎么样」，两者解耦。

## 技术栈

| 层 | 选型 |
|---|---|
| 框架 | Astro 4.16（`output: 'static'`，`trailingSlash: 'always'`） |
| 样式 | Tailwind CSS 3.4 + CSS 变量语义色，`darkMode: 'class'` |
| 语言 | TypeScript 5.6（`astro check`） |
| 运行时 | Node.js ≥ 20.6 |
| 测试 | `node --test`，覆盖注册表、新鲜度、合并与 adapter，共 25 例 |
| 部署 | GitHub Actions → GitHub Pages |

## 快速开始

```bash
npm install
npm run dev       # 本地开发 http://localhost:4321
npm run fetch     # 抓取站点状态，写入 data/*.json
npm test          # 运行单元测试
npm run check     # Astro 类型检查
npm run build     # 构建到 dist/
npm run preview   # 预览构建产物
```

`npm run fetch` 需要访问 GitHub API。未配置 token 时受每小时 60 次限流，可先设置
`GITHUB_TOKEN`（只读公开仓库即可）再执行。

## 数据是怎么来的

`npm run fetch` 的执行顺序：

1. 校验 `config/sites.mjs`：id、url、repo、category、adapter 任一非法就报错退出。
2. 逐个站点请求 `api.github.com/repos/{repo}` 获取 `pushed_at`。
3. 按 adapter 读取该站仓库中的数据文件（见下表）。
4. 归一化为统一的 `status` / `statusLabel` / `statusDetail` / `summary`：`status` 决定颜色，`statusLabel` 只放状态词（正常 / 需关注 / 异常 / 未知），`statusDetail` 说明原因，数字进 `summary`。
5. 与上一轮结果合并，写入 `data/sites.json` 与 `data/health.json`；内容无变化时不写盘、不产生空提交。

文件读取优先走 `raw.githubusercontent.com`，失败后回退 GitHub Contents API；
请求超时 15 秒，仓库信息最多重试 3 次，文件读取每个源重试 1 次后回退。
站点之间串行执行并留有间隔，避免触发 GitHub 次级限流。

### adapter 一览

| adapter | 读取的文件 | 状态判定 |
|---|---|---|
| `commit` | 无 | 只看仓库可读性；提交时间仅用于展示，不参与告警 |
| `pulse` | `data/health.json`、`data/index.json` | 信息源成功率 + 7 / 30 天新鲜度 |
| `repo-rank` | `data/meta.json`、`data/health.json`、`data/index.json` | 查询成功率 + 7 / 30 天新鲜度 |
| `lucky` | `data/meta.json`、`data/health.json` | 最近一次抓取结果 + 14 / 45 天新鲜度 |

### 状态口径

| 站点 | 正常 | 需关注 | 异常 |
|---|---|---|---|
| Pulse Hub | 全部源成功且 7 天内更新 | 有源失败，或 8–30 天 | 无可用源，或超过 30 天 |
| Repo Rank | 全部查询成功且 7 天内更新 | 部分失败，或 8–30 天 | 全部失败，或超过 30 天 |
| Lucky Hub | 抓取成功且 14 天内更新 | 15–45 天 | 最近一次失败，或超过 45 天 |
| 其他站点 | 仓库可读即正常 | — | —（提交时间不参与判定） |

无法获取数据且没有历史记录时显示「未知」；有历史记录则保留旧数据，只把状态降级为「未知」并附原因。

内容站（学习 / 工具 / 体验）不做陈旧度告警：提交时间只能证明仓库可读，不能证明站点可用，
也不代表内容过时。多久没动由卡片上的「最近更新 08-18」直接表达。

## 新增站点

站点注册表是唯一维护入口，页面、筛选、统计、关于页都会自动跟随。

1. 在 `config/sites.mjs` 追加一条：

```js
{
  id: 'new-site',                                // 小写字母、数字、连字符，唯一
  name: 'New Site',
  url: 'https://everwynn.github.io/new-site/',   // 必须 https 且以 / 结尾
  repo: 'EverWynn/new-site',
  category: 'tool',                              // learn | data | tool | experience
  description: '一句话说明这个站做什么',
  tech: ['Astro', 'Vue'],                        // 卡片显示前两项，全部参与搜索
  adapter: 'commit',                             // 静态站直接用 commit
  order: 55,                                     // 分类内排序，建议留出间隔
},
```

2. 执行 `npm run fetch`，确认新记录写入 `data/sites.json`。
3. 依次执行 `npm test`、`npm run check`、`npm run build`。
4. 提交 `config/sites.mjs` 与 `data/*.json`。

补充说明：

- 默认分支不是 `main` 的仓库，在条目里加 `branch: 'master'`。
- 数据文件结构与现有数据站不同的，需要新增 adapter：`scripts/adapters/<name>.mjs`、
  `scripts/fetch.mjs` 的 `ADAPTERS` 与 `DATA_FILES`、`scripts/lib/registry.mjs` 的 `ADAPTERS`，
  并在 `tests/adapters.test.mjs` 补用例。
- 新增分类要同时改 `scripts/lib/registry.mjs` 的 `CATEGORIES` 与 `src/lib/sites.ts` 的
  `Category`、`CATEGORY_LABELS`、`CATEGORY_ORDER`。

## 目录结构

```text
config/sites.mjs          站点注册表（唯一维护入口）
astro.config.mjs          Astro 配置（static、trailingSlash）
tailwind.config.mjs       色板 token、字体与内容扫描
scripts/fetch.mjs         抓取编排
scripts/adapters/         commit / pulse / repo-rank / lucky
scripts/lib/              http、files、freshness、registry
data/                     sites.json、health.json（抓取生成，需提交）
src/lib/                  构建期读取数据、格式化时间
src/components/           SiteCard、StatusBadge、CategoryNav、ThemeToggle
src/layouts/              BaseLayout（页头、页脚、主题、SEO）
src/pages/                首页、关于、404、robots.txt、sitemap.xml
src/styles/               Tailwind 入口、主题变量、动效
public/                   favicon
tests/                    Node 内置测试
.github/workflows/        抓取、提交、构建、发布
```

## 部署

`.github/workflows/deploy.yml` 在以下时机执行：推送 `main`、每天两次定时（UTC 23:17 / 11:17，
即北京时间 07:17 / 19:17）、手动 `workflow_dispatch`。

流程：安装依赖 → 单元测试 → 抓取 → 数据有变化则提交 → 构建 → 上传并发布到 Pages。
`concurrency: pages` 保证同一时间只有一次发布。

仓库设置：

- Settings → Pages → Source 选择 **GitHub Actions**；
- 可选：配置 `DATA_PUSH_TOKEN`（fine-grained PAT，含 `contents: write`），数据提交会以该账号身份推送；未配置时回退 `GITHUB_TOKEN`；
- 仓库连续 60 天没有任何活动时，GitHub 会暂停定时工作流，届时在 Actions 页面重新启用或手动触发一次即可。

## 约定与限制

- 主题与筛选偏好存放在 `localStorage` 的 `station:` 前缀键，避免与其他站点冲突。
- 所有外链使用 `https`、`target="_blank"`、`rel="noopener noreferrer"`。
- 门户不保存任何业务数据，只读取各站仓库中的公开文件。
- 不做账号、评论、跨站全文搜索，也不在浏览器端实时调用 GitHub API。
- Lucky Hub 的官方开奖接口对海外 IP 返回 403，其数据只能本地更新，状态长期可能显示「抓取失败」。
- 设计与实施记录保存在本地 `docs/`，已加入 `.gitignore`，不随仓库发布；行为以代码与 `data/` 为准。
