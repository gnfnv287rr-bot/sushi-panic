# 寿司别吃撑！ · SUSHI PANIC

**v0.2.0 / 2026-10-19 — 自填玩家 ID、共享积分榜与「大胃王」称号。** 点击回转寿司，维持饱腹，避开角色的过敏食物。支持鼠标、触屏和数字键。离线练习无需服务器；公网计分局使用共享榜单服务，无需注册账号。美术与玩法不依赖外部素材或 CDN。

v0.1.2 在饱腹低于 25 或超过 85 时，提前在场景中央显示琥珀色行动提示；进入危险区升级为红色警告，回到舒适区清除。伤害与平衡数值不变。

v0.1.1 放大生命/饱腹数字、加粗数值条，饱腹条改为实心进度并按状态显示绿/琥珀/红色；饥饿、过饱、低生命在场景中央补充提醒。玩法与平衡数值沿用 v0.1.0。

本版保留原有随机体质、过敏和饱腹规则。玩家姓名由自己输入，2–16 个字母、汉字、数字、下划线或短横线。同一 ID 按单局最高积分排名，第一名为「大胃王」。

## 公网分享

备用分享入口：[寿司别吃撑！GitHub Pages](https://gnfnv287rr-bot.github.io/sushi-panic/)。已通过测试网络的匿名开局和触控模拟，仍待中国朋友原网络复测。

原 [Sites 入口](https://sushi-panic.rubyssss98.chatgpt.site) 仍为 public，但已有中国朋友遇到 Cloudflare 拦截反馈，不能把公开状态等同于所有网络可达。两个入口连接同一个榜单 API；如果该 API 被朋友网络拦截，会明确降级为练习局，无法上传排行榜。尚未证明中国原网络已恢复。两个入口均不需要本机一直开着。发布身份与更新方式见 [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)。

## 马上玩

**最省事：用现代浏览器打开项目中的 `play.html`。** 这是已生成的离线练习单文件版，可以双击打开，不需要 Node.js、安装依赖或启动服务器。建议使用当前 Chrome / Edge；Safari 真机尚未验收。系统若默认用编辑器打开 HTML，请选择“打开方式 → Google Chrome”。

开发预览（Node.js 24+，不需要先 npm install）：

```sh
cd "/Users/uxy/Documents/ChatGPT/IEITS 7 冲冲冲/sushi-panic"
npm start
```

访问 <http://localhost:5173>。停止：终端按 Ctrl+C。端口占用时：`npm start -- --port 5180`。

手机同一 Wi-Fi 试玩：`npm start -- --host`，再用手机访问电脑的局域网 IP 加 `:5173`；需操作系统允许本地网络访问。localhost 会启动本地 SQLite 榜单 API，与公网榜单独立；局域网 IP 访问的客户端仍连接公网 API。离线 HTML 在手机文件预览器中的运行能力取决于系统，手机优先使用浏览器访问局域网地址。

## 操作

1. 输入自己的玩家 ID，点击“入座，开吃！”，读体质卡，再开始。
2. 点击盘子吃寿司；电脑可按盘子旁的数字 **1–8**。每次成功进食间隔至少 0.24 秒。
3. 饱腹维持 **25–85** 可得舒适进食与连击奖励。低于 15 或高于 100 持续 2 秒会掉生命。
4. 红色“忌”是本局过敏源；乌龙茶减 18 饱腹。食物标注已按角色胃口调整并四舍五入。
5. **P / Esc** 暂停或继续。切换窗口或页面自动暂停，返回后手动继续。死亡后两次点击即可重新入座开局。

声音默认关闭，可以手动开启。本机纪录仍保留；联网计分局正常结束后由服务端复算积分并更新共享榜单。离线练习不上榜。小屏竖屏对局时隐藏页面介绍与侧栏，让仪表和传送带同时可见；完整角色说明在开局卡上。

ID 和凭证保存在当前链接的当前浏览器；换设备、换域名或清空存储不能仅凭 ID 找回。这不是完整账号系统。上传暂时失败时最多保存 3 局，可在榜单刷新时重试（7 天内）。本地数据库位于 .data/local.sqlite，与公网独立。

## 验证与构建

规则、API 测试和模拟使用 Node 自带能力，不需要安装开发依赖：

```sh
npm test
npm run test:sim
```

浏览器自动测试需要联网安装一次开发依赖，以及本机 Chrome：

```sh
npm ci
npm run build
npm run test:e2e
# 三项一起运行：npm run test:all
```

没有 Chrome 时，可先 `npx playwright install chromium`，再将 `playwright.config.js` 中的 `channel: 'chrome'` 去掉。锁文件已固定测试依赖。CI 首次运行也要安装浏览器。

修改源码后运行 `npm run build`，同步更新 `dist/` 和根目录 `play.html`。`dist/` 客户端可部署到静态站点，共享排行榜仍需 API；`npm start -- --dist` 可本地检查构建结果。直接双击 `index.html` 不适合 ES Module 源码预览，请使用 `play.html`。

## 交付内容

| 文件 | 内容 |
| --- | --- |
| `play.html` | 可直接打开的完整离线游戏 |
| `src/core.js` | 纯规则、随机系统、得分、状态机 |
| `src/renderer.js` | 原创寿司、猫厨师、角色头像和传送带绘图 |
| `src/main.js` | 输入、界面、声音、固定步长和生命周期 |
| `src/social.js` | 玩家 ID、联网计分、共享榜单与失败重试 |
| `server/` | 服务端复算、排行榜与本地 SQLite 适配 |
| `db/` / `drizzle/` / `worker/` | 数据库模型、版本化迁移、云端 Worker 入口 |
| [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md) | 完整数值、角色和玩法 |
| [docs/RESEARCH.md](docs/RESEARCH.md) | 外部研究来源和适用边界 |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | 技术比较、架构、维护方式 |
| [docs/DECISIONS.md](docs/DECISIONS.md) | 版本决策和阶段完成记录 |
| [docs/TEST_REPORT.md](docs/TEST_REPORT.md) | 自动测试报告与验收边界 |
| [docs/KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md) | 已知问题与待确认设计建议 |
| [docs/ROADMAP.md](docs/ROADMAP.md) | 后续版本路线图 |
| `artifacts/` | 对局模拟 JSON、浏览器报告和实测截图 |

当前交付是可玩原型。自动测试通过不代表真人觉得好玩，不代表已完成 iOS / Android 真机、发布商店或商业化验收。
