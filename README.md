# SUSHI PANIC《寿司别吃撑！》 · V1.2.1

[公开游戏 / 分享给朋友](https://gnfnv287rr-bot.github.io/sushi-panic/) · [源码仓库](https://github.com/gnfnv287rr-bot/sushi-panic)

Canvas + DOM网页游戏，GitHub Pages + Supabase Free。输入昵称即可建立游客身份；自愿绑定邮箱验证码后可换浏览器恢复。温和饱腹、20秒空闲自动休息、主动结账、自愿参榜、长期寿司图鉴、188常驻＋28本期特色＋往期秋日菜单、每日北京时间00:00换榜。旧角色与视觉保留，旧0.2.0对局仍按旧规则结算。

## 开发

```sh
npm ci
npm run build
npm start                 # http://localhost:5173
npm test                  # 规则/API/数据库/认证契约
npm run test:e2e           # Chrome浏览器回归（需要本机Chrome）
npm run test:security
node scripts/verify-build.mjs
```

本地服务用PGlite +签名Cookie联调，不冒充Supabase云端验收；`play.html`可双击离线练习。新规则`src/casual-v121.js`，菜单资料`src/menu-catalog-v2.js`、主题配置`src/menus-v2.js`；`casual-v12.js`/`menus-v1.js`冻结用于旧1.2.0局，界面`src/main.js`。不要修改仍用于旧局验证的`src/core.js`/`src/renderer.js`原件。未来菜单只扩充配置和迁移，禁止更改已有ID/配方导致已开局种子失效。

## 云端与发布

默认发布分支`codex/daily-leaderboard-v1`；push触发GitHub Actions测试/构建/Pages发布。P0实际邮件恢复门禁为`docs/v12/P0_GATE.json`；不能凭构建成功替代线上验收。Edge/数据库先在独立staging验证，随后发布生产，最后发布客户端。

```sh
npx --yes supabase@2.121.0 db push --linked --project-ref <PROJECT_REF> --skip-vault --dry-run
npx --yes supabase@2.121.0 db push --linked --project-ref <PROJECT_REF> --skip-vault
npm run build
npx --yes supabase@2.121.0 functions deploy sushi-api --project-ref <PROJECT_REF> --use-api
```

只在Edge Secrets保存管理员配置，客户端仅有公开项目URL与publishable key。`.env.example`为变量说明，真实环境文件/凭证/备份不提交。SMTP授权码仅在Supabase控制台安全填写，不能写到Git或聊天。兼容回滚脚本在`supabase/rollback/`，只恢复接口，保留数据；回滚时前后端需一起回退，已开新版局需保留新版验证器。

## 菜单扩充

本期216款收藏菜，乌龙茶另计；旧秋日6款仍在往期，全图鉴222种。日常/精选/珍藏基础抽档72%/23%/5%，含8次精选、40次珍藏保底与安全盘，实际比例见报告。

- [216款清单](docs/menus/MENU_216.csv)、[菜单研究与官方来源](docs/menus/RESEARCH_2026-10-19.md)、[珍稀与兼容设计](docs/menus/DESIGN_216.md)、[本次测试与发布](docs/menus/TEST_REPORT.md)
- 更新菜品须同步配置、SQL迁移、服务端版本和测试，不直接更改已发布规则的种子池。

## 当前验收与文档

- [V1.2版本说明](docs/v12/CHANGELOG.md)、[实际测试报告](docs/v12/TEST_REPORT.md)、[阶段状态](docs/v12/STATUS.md)
- [架构/接口/异常与安全边界](docs/v12/ARCHITECTURE.md)、[设计](docs/GAME_DESIGN.md)、[决策](docs/DECISIONS.md)、[路线图](docs/ROADMAP.md)
- [环境变量与原部署说明](docs/v1/DEPLOYMENT.md)、[免费额度与费用边界](docs/v1/COSTS.md)

P0真实邮箱已由Owner在Safari绑定、Chrome恢复同ID并保留12盘/6种收藏。浏览器尺寸模拟不等于真机测试；中国不同网络、真实手机及长期负载仍需实测。服务端重放防任意改分，但不证明操作来自真人。旧Sites/D1与生产历史记录均保留。
