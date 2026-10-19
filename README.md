# 当前开发：V1.2 P0 联网与存档修复

P0修复已在[线上游戏](https://gnfnv287rr-bot.github.io/sushi-panic/?release=120-p0)发布；**真实邮箱跨浏览器恢复仍待Owner在网页完成验证码验收，P0门禁未通过，P1尚未启动**。不要把SMTP已保存或SDK契约测试视为恢复成功。

继续开发先读 [V1.2状态](docs/v12/STATUS.md)、[阶段门禁](docs/v12/P0_GATE.json)、[测试报告](docs/v12/TEST_REPORT.md) 和 [版本说明](docs/v12/CHANGELOG.md)。开发分支 `codex/v1-2-p0`，验收后快进到 `codex/daily-leaderboard-v1` 自动发布。旧版源码/数据保留。以下V1文档为历史基线，当前状态以前述V1.2文档为准。

# SUSHI PANIC《寿司别吃撑！》

V1.0 RC · Canvas + DOM 原游戏，GitHub Pages + Supabase Free / Edge Functions。

**每日联网榜已上线。** [直接开玩 / 分享给朋友](https://gnfnv287rr-bot.github.io/sushi-panic/)，无需登录。首次输入昵称后创建游客身份，服务器记录当日最高积分，每天北京时间00:00换榜。右下角可查看今日排行榜。

当前为联网测试版。**邮箱跨设备恢复暂未开放**（公共SMTP待配置）；中国原网络与真实手机待验收。清除网站数据可能丢失游客身份。详见 [状态](docs/v1/STATUS.md) 和 [验收边界](docs/v1/ACCEPTANCE.md)。

## 本地运行

Node.js 24+：

```sh
npm ci
npm run build
npm start
# http://localhost:5173
```

本地使用 PGlite PostgreSQL 与签名 Cookie 模拟身份，数据库在 `.data/v1-postgres`。这是独立联调环境，不是 Supabase Anonymous Auth 的云端验收，也不与公网榜单同步。`play.html` 可双击离线练习。

## 已实现

- 完整保留 4 角色、8 食物、计分、生命/饱腹、难度、音效、Canvas 表现与鼠标/触屏/键盘操作。
- 自填 2–12 字中文/英文/数字昵称；允许重名，身份由认证 UUID 识别；改名保留成绩。
- 右下角「今日排行榜」、全球 TOP100、本人高亮及榜外名次、服务端北京时间换榜倒计时。
- 每人每日只保留最高分，同分先达到优先，再按 UUID；历史成绩、累计局数/有效积分、冠军及历史快照永久保留。
- 服务端随机局和重放验证、幂等结算、限流、异常成绩隔离、审计摘要、失败重试。
- 成绩结算、服务端确认的新纪录提示、带排名查询时间的复制分享文案。
- Supabase 游客身份与自愿邮箱绑定/恢复接口。**实际邮件收信未验证；公网邮件恢复需可用 SMTP。**

## 云端配置

1. 使用已授权的 Supabase **Free** 项目，开启 Anonymous Sign-ins 与邮箱身份绑定；配置 GitHub Pages 回调 URL。仅在有可用 SMTP 时开放面向任意邮箱的恢复能力。
2. 先审查并按序应用 `supabase/migrations/*.sql`。不修改、删除旧 Sites D1 生产数据。
3. 仅在 Edge Function Secrets 设置 `.env.example` 所列私密值。实际密钥不可提交 Git。
4. 将项目 URL 和 **publishable key** 写到 `src/config.js`，它们是公开配置，不是管理员密钥。
5. `npm run build` 生成浏览器 SDK 和 Edge 共享模块。部署 `supabase/functions/sushi-api/`。网关允许公开读榜，函数对所有玩家操作调用 Auth.getUser 验证 JWT。
6. 独立浏览器验证真实云端计分后，将 `dist/` 发布到 GitHub Pages。目前根入口已切换，旧分支与Sites/D1保留。

详细步骤、接口、安全边界与费用见 [部署说明](docs/v1/DEPLOYMENT.md)、[API](docs/v1/API.md)、[安全说明](docs/v1/SECURITY.md)、[费用](docs/v1/COSTS.md)。

## 验证

```sh
npm test                 # 32 项原规则/旧API + 25 项 V1 数据库/认证/邮箱契约
npm run test:e2e         # 本机 Chrome；全量用例数随新增覆盖见报告
npm run test:security    # 核心文件哈希、RLS 声明、代码/提交历史凭证模式扫描
npm audit
npx --yes deno check supabase/functions/sushi-api/index.ts
```

报告：[完整测试报告](docs/v1/TEST_REPORT.md)。测试证据在 `artifacts/`，不进入公开站点。第三方 SDK、测试依赖已锁版本。原 D1/Drizzle 文件仅作旧版审计保留，不参与 V1 部署。

继续开发前先读 `docs/v1/STATUS.md` 和 `docs/DECISIONS.md`。核心规则与渲染的保护哈希在 `docs/v1/BASELINE.json`。不要把旧单机纪录、演示玩家或测试分数直接写入公开每日榜。

## 后续更新

默认分支 `codex/daily-leaderboard-v1`；push游戏代码会自动运行GitHub Actions测试、健康检查、构建和Pages发布。只改README或docs不重发。Edge逻辑更改先 `npm run build`，再用已授权CLI部署 `sushi-api`，追加SQL迁移而不改写已应用文件。生产项目与独立测试项目、完整步骤见部署说明。管理员凭据不提交Git。无需Vercel。
