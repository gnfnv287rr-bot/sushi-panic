# GitHub Pages + Supabase 部署

最终方案：不使用 Vercel。现有仓库 `gnfnv287rr-bot/sushi-panic`，旧 Pages 分支 `codex/public-game`；V1 完整源码在 `codex/daily-leaderboard-v1`。旧根入口与 Sites/D1 保留到新后端验收完成。

## 当前部署结果

Owner邮箱注册和本机CLI授权均已完成。生产 `hyqgkenarjgxdbqiwpxl` 与独立测试 `ujejpprlmpjmmbodhqdj` 均为同一FREE组织的新加坡项目；两项迁移、Auth配置、Edge Secrets和函数已部署。正式[Pages入口](https://gnfnv287rr-bot.github.io/sushi-panic/)已通过两个新浏览器会话验证。真实双玩家最终计分与安全测试在独立测试项目完成，没有把验收分数放进生产榜。

账号访问使用CLI官方凭据存储；不把Token、管理员key或数据库密码发到聊天、前端或Git。两项迁移按序执行，后续不改写历史迁移。

## 复现/后续更新步骤

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

现已启用正式自动发布，默认源码分支为 `codex/daily-leaderboard-v1`，Pages来源为GitHub Actions。每次更新：先读STATUS与保护哈希 → 修改独立模块 → 适当测试 → 构建 → Edge代码有改则部署函数 → 更新Pages → 验证两层版本/接口。数据结构变化追加新迁移，已应用迁移不可改写。


`.github/workflows/pages.yml` 支持源码分支push及手动触发，README/docs-only修改跳过发布。release-check在生产公开配置或Edge健康失败时阻止发布。初次成功run为39236478068。仅发布dist，排除测试、文档、本机数据和凭据。

## 独立云端验收脚本

先 `npm run build`。只在测试环境设置 `SUSHI_TEST_URL=https://ujejpprlmpjmmbodhqdj.supabase.co` 与其公开 `SUSHI_TEST_PUBLISHABLE_KEY`，运行 `node scripts/cloud-acceptance.mjs`、`node scripts/cloud-security.mjs`。两脚本都硬性拒绝生产项目，使用公开key创建独立游客，不需要管理员key。测试分只留独立库。日期用 `supabase db query --linked --project-ref ujejpprlmpjmmbodhqdj --file tests/v1/cloud-calendar.sql`；事务回滚测试时钟与全部fixtures。

`node scripts/public-smoke.mjs` 则直接访问正式公开页面，无资源/API替换，验证匿名访问与联网开局。它不提交测试分数；不代表中国网络或真机验收。不要将浏览器trace（可能含测试游客凭证）发布到公开站点。
