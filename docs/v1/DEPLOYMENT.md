# GitHub Pages + Supabase 部署

最终方案：不使用 Vercel。现有仓库 `gnfnv287rr-bot/sushi-panic`，旧 Pages 分支 `codex/public-game`；V1 完整源码在 `codex/daily-leaderboard-v1`。旧根入口与 Sites/D1 保留到新后端验收完成。

## 当前连接进度

Owner 已完成邮箱注册，浏览器已登录。已确认 FREE 组织 `uuuu` 下的新加坡项目 `hyqgkenarjgxdbqiwpxl` Healthy；复用此项目，不重复创建资源。官方 CLI 授权页已打开，等待 Owner 确认连接本机部署工具。尚未应用云端迁移或部署函数。

不把 access token、数据库密码或 secret key 粘到聊天中，不提交到 Git。CLI 使用官方凭据存储。公开 URL / publishable key 可以进入前端，管理员 secret key 仅配置到 Edge Secrets。

## 接通后的执行顺序

1. 用 CLI 核对已登录账号及现有 Free 项目 `hyqgkenarjgxdbqiwpxl`；检查现有表与迁移，复用 Owner 刚创建的项目。若套餐或权限不符，报告，不升级。
2. 启用 Anonymous Sign-ins；允许匿名身份自愿绑定邮箱。认证重定向精确加入 `https://gnfnv287rr-bot.github.io/sushi-panic/` 及预览 `/sushi-panic/v1/`。保持邮箱验证，不为绕过邮件错误关闭安全验证。
3. 审查并应用 CLI 生成的 `20261019093147_daily_leaderboard.sql`。新表全部 sushi_ 前缀，不接触旧 D1。执行迁移后查询表、权限并运行 Supabase advisors；记录实际结果。
4. 设置 `SUSHI_SECRET_KEY`、`RATE_LIMIT_SECRET`、`CRON_SECRET`、`ALLOWED_ORIGINS=https://gnfnv287rr-bot.github.io` 到 Edge Secrets。SUPABASE_URL 由运行时注入。只把 URL/publishable key 写入 `src/config.js`。
5. 构建共享模块后部署函数：

```sh
npm ci
npm run build
npx --yes supabase@2.121.0 functions deploy sushi-api --project-ref YOUR_VERIFIED_PROJECT_REF
```

函数 `verify_jwt=false` 仅让公开榜单和 CORS 预检通过网关，玩家写入仍在函数中用 Auth.getUser 强制验证。不得删掉该验证。

6. 新匿名浏览器做两个独立游客的真实完成局，验证跨浏览器看到成绩、个人排名、再次访问、改名、重复提交；测试成绩使用独立非生产环境，正式榜不放演示冠军。真实邮箱测试仅在 Owner 指定收件人/授权后执行。
7. 通过后发布 dist 到正式 Pages；核实网页状态、游戏起止重开、Auth、计分、排行榜分别通过，再把 RC 标为正式版本。中国朋友原网络、Safari/iPhone/Android 真机仍需单独验证。

## 每日归档与更新

榜单按数据库当前日期查询，所以00:00换榜不依赖 Cron 准点。读取榜单时懒归档前日（幂等、待处理确认局会短暂延后）。可配置免费 Supabase Cron 每日调用归档函数作为补充；不设置为维持免费实例活跃而空转的任务。没有流量的日期后续访问会补记空冠军，历史无删除。

当前尚未启用正式自动发布，避免未接通后端的占位配置覆盖旧版。接通且验收通过后，以 V1 源码分支的构建发布到 Pages，复用既有仓库。每次更新：先读STATUS与保护哈希 → 修改独立模块 → 适当测试 → 构建 → Edge代码有改则部署函数 → 更新Pages → 验证两层版本/接口。数据结构变化追加新迁移，已应用迁移不可改写。


已提供 .github/workflows/pages.yml 手动发布流程；release-check 在真实Supabase配置/Edge健康未通过前拒绝覆盖正式Pages。接通并完成双玩家验收后，将Pages来源切为GitHub Actions，并给该workflow加源码分支push触发，即可自动更新。当前未执行该切换。
