# ores-root — ores.cc 根域 301 + 访问统计

Cloudflare Pages 项目（GitHub 源，push 自动部署）。

## 作用

| 请求 | 行为 |
|---|---|
| `https://ores.cc/` | 记一次 PV/UV → `301` 到 `https://oe-brand.app.workbuddy.host/#/` |
| `https://ores.cc/p/3` | 同上，且路径带进 hash → `…#/p/3`（不再丢路径） |

## 结构

- `functions/[[path]].js` — catch-all 边缘函数：先 `fetch` 上报到 `stats.oebuylink.com/track`（`site=ores-cc`），再返回 301。用 `context.waitUntil` 保证上报不阻塞跳转，900ms 超时兜底。
- `index.html` — 静态兜底（函数异常时仍能跳转，但不计数）。

## 统计后台

站点键 `ores-cc`，显示名 `ORES.CC`（在 Worker `oe-stats` 的 `SITE_META` 中定义）。

## 部署

push 到 main → Cloudflare Pages 自动构建（无构建命令，纯静态 + Functions）。

## 迁移历史

2026-10-15 从 Tencent EdgeOne Pages（项目 `orientalessence`）迁到 Cloudflare Pages。
EdgeOne 版本代码留档在工作区 `ores-root-redirect/`（含回滚用 zip）。

## CI 自检标记

（2026-10-15 通过 push 触发自动部署验证）
