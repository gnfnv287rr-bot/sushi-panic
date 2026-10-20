# SUSHI PANIC《寿司别吃撑！》 · V1.3.1

[公开游戏 / 分享给朋友](https://gnfnv287rr-bot.github.io/sushi-panic/) · [源码仓库](https://github.com/gnfnv287rr-bot/sushi-panic)

Canvas + DOM网页游戏，GitHub Pages + Supabase Free。输入昵称即可建立游客身份；自愿绑定邮箱验证码后可换浏览器恢复。温和饱腹、20秒空闲自动休息、主动结账、自愿参榜、长期寿司图鉴、188常驻＋28本期特色＋往期秋日菜单、每日北京时间00:00换榜。旧角色与视觉保留，旧0.2.0对局仍按旧规则结算。

V1.3.1 音频：点击现有「音效」入口，自愿开启原创咖啡馆循环曲或游戏音效；首次默认静音，设置保存在本机。详细来源、交互与验证边界见 [音频说明](docs/v13/AUDIO.md)。

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

## V1.2.4 图鉴分类栏

图鉴改为横向分类选项，统一菜单/珍稀/排序命名，支持组合搜索、重置和无结果提示；概率说明默认折叠，编号排序按数字升序。

- [本次交互与实际测试](docs/V124_FILTERS.md) · [新版游戏](https://gnfnv287rr-bot.github.io/sushi-panic/?release=124-filters)

## V1.2.3 清新视觉更新

圆润蓝色标题，欢迎语「欢迎光临，今天想吃点什么？」；清白底、薄荷传送带、明亮番茄橙按钮，统一菜单/图鉴/存档弹窗配色。客户端1.2.3，游戏与后端规则仍1.2.1。

- [视觉说明与实际验证](docs/V123_VISUAL.md) · [新版游戏](https://gnfnv287rr-bot.github.io/sushi-panic/?release=123-fresh)
- 标题字体同站托管的OFL圆体小子集，无额外外部字体请求；字体源及复现见 assets/fonts/README.md。

## V1.2.2 体验更新

主导航分组、传送带下常驻收藏进度、真实存档状态与可关闭的邮箱提醒、新品发现队列、三档/秘密菜单音画反馈、手帐NEW和最近发现、大胃王寿司奖牌。

- [设计与数据语义](docs/V122_DESIGN.md)、[测试与发布报告](docs/V122_TEST_REPORT.md)
- UI模块`src/shop-experience.js`与纯模型`src/collection-feedback.js`。NEW已读是当前浏览器的玩家偏好；真实收藏继续从原云端读取，不增加数据库迁移。
- 前端版本1.2.2，游戏/后端规则仍1.2.1。部署仅更新Pages，不能因为UI升级去修改种子、概率、配方或旧对局核验。

## 菜单扩充

本期216款收藏菜，乌龙茶另计；旧秋日6款仍在往期，全图鉴222种。日常/精选/珍藏基础抽档72%/23%/5%，含8次精选、40次珍藏保底与安全盘，实际比例见报告。

- [216款清单](docs/menus/MENU_216.csv)、[菜单研究与官方来源](docs/menus/RESEARCH_2026-10-19.md)、[珍稀与兼容设计](docs/menus/DESIGN_216.md)、[本次测试与发布](docs/menus/TEST_REPORT.md)
- 更新菜品须同步配置、SQL迁移、服务端版本和测试，不直接更改已发布规则的种子池。

## 当前验收与文档

- [V1.2版本说明](docs/v12/CHANGELOG.md)、[实际测试报告](docs/v12/TEST_REPORT.md)、[阶段状态](docs/v12/STATUS.md)
- [架构/接口/异常与安全边界](docs/v12/ARCHITECTURE.md)、[设计](docs/GAME_DESIGN.md)、[决策](docs/DECISIONS.md)、[路线图](docs/ROADMAP.md)
- [环境变量与原部署说明](docs/v1/DEPLOYMENT.md)、[免费额度与费用边界](docs/v1/COSTS.md)

P0真实邮箱已由Owner在Safari绑定、Chrome恢复同ID并保留12盘/6种收藏。浏览器尺寸模拟不等于真机测试；中国不同网络、真实手机及长期负载仍需实测。服务端重放防任意改分，但不证明操作来自真人。旧Sites/D1与生产历史记录均保留。


## V1.3 · Cozy Sushi Bar（已正式上线）

本地分支`codex/v1.3-cozy-integration`以Owner已验收的`design-preview/v1.3/`为唯一视觉基准，复用原素材/字体/组件；真实引擎、游客/邮箱身份、排行榜、图鉴、结账/重试/云端存档保持。2026-10-20已正式发布V1.3.0；未执行数据库迁移或改动原玩家存档。

- [整合与本地启动](docs/v13/IMPLEMENTATION.md) · [52项浏览器＋87项规则测试、真实staging12项及限制](docs/v13/TEST_REPORT.md)
- `node scripts/verify-cozy-integration.mjs`核验16个业务模块和126个旧控件不丢失；`node scripts/verify-build.mjs`核验正式/离线美术资源。
- 不要把纯视觉Demo的模拟数据逻辑接入真实游戏。后续改动应保持已验收风格；发布须遵循Owner的发布边界。

- [V1.3公开游戏](https://gnfnv287rr-bot.github.io/sushi-panic/?release=130-cozy) · [最终部署及双身份公开验收、网络限制](docs/v13/DEPLOYMENT.md)
