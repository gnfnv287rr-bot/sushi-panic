# 当前部署入口（2026-10-19）

当前使用GitHub Pages + Supabase Free / Edge Functions；[公开游戏](https://gnfnv287rr-bot.github.io/sushi-panic/)，无ChatGPT登录或Sites接口依赖。默认源码分支 `codex/daily-leaderboard-v1`，Actions自动发布。更新流程与实际项目ref见 `v1/DEPLOYMENT.md`，验收见 `v1/ACCEPTANCE.md`。以下记录仅为旧Sites/D1发布历史，旧数据未删除。

# 公网发布

游戏版本：v0.2.0；2026-10-19。已更新现有 Sites 与 GitHub Pages 入口，无需本机持续开机。

- [Sites 游戏与 API](https://sushi-panic.rubyssss98.chatgpt.site)：原生发布 succeeded，访问范围沿用 public。
- [GitHub Pages 游戏](https://gnfnv287rr-bot.github.io/sushi-panic/)：构建 built，前端调用同一 Sites 共享积分榜 API。
- 原静态单机版升级为 Worker ESM + D1，绑定 DB；players/runs 通过版本化 Drizzle 迁移部署。请求处理不执行建表。
- 发布源码目录 ../sites/sushi-panic/；Pages 目录 ../sites/sushi-panic-pages/。canonical 游戏目录保留本地测试、设计文档和独立本地数据库，不作为公开内容整体上传。

## 当前发布记录

project_id: appgprj_6ad5cdbab964819180fc314f569eb79a
saved_version_id: appgprj_6ad5cdbab964819180fc314f569eb79a~appgver_a9fdfc5df7f08191849851d9da3fa2a1
site_version_number: 3
commit_sha: aadc155269e55e20d6f3dd7874d784c90aac0c55
deployment_id: appgdep_6ad5dd57e0d4819194edbeb0c671a4ac
status: succeeded

Pages 仓库 gnfnv287rr-bot/sushi-panic，分支 codex/public-game；提交 c96b46e6de87d310938515ff7aa8f66c844f1084，构建 built。Pages 只发布游戏单文件入口、.nojekyll 和说明，不发布数据库、测试日志或本地文档。

机器发布记录为 artifacts/deployment.json；旧版记录保留 artifacts/deployment-v012.json。后续更新复用同一 project_id，源代码同步后按精确提交与构建归档保存版本，再发布。已应用 SQL/meta 不应改写；结构变化新增迁移。

## 已验证与边界

两个入口使用新匿名浏览器均能填写 ID、创建联网局（201）、读取同一共享榜（200），无 JS 错误。证据 artifacts/public-v020-check.json。联网局正常结算并跨浏览器上榜的完整流程已在本地同实现自动测试中完成，没有向公开榜写入 QA 积分。最终长 ID 换行修订另通过 8 项定向浏览器检查。

ID 绑定当前域名与浏览器凭证，两个不同域名不是自动登录同一玩家；仅数据榜相同。localhost API 使用独立 .data/local.sqlite，删除本地库不影响公网。file:// 只作练习。

## 中国朋友访问问题

用户截图是 Cloudflare “Sorry, you have been blocked / unable to access chatgpt.site”。Sites 原访问配置 active/public，截图能证明托管安全层拦截，不能证明具体命中规则或明确地区封锁。参照 [Cloudflare 默认拦截响应](https://developers.cloudflare.com/waf/reference/legacy/firewall-rules-upgrade/#different-error-page-for-blocked-requests)。未取得平台 WAF 事件日志或控制权限。

Pages 页面采用不同域名，但榜单 API 仍在 Sites；API 同样被拦截时，明确进入练习局，不能上传全局排名。测试机网络通过不代表中国朋友原网络通过。下一步应由朋友在原网络复测页面、联网局标识与结算；如仍受限，再迁移到实际可用的独立 API 托管及域名，不能声称静态镜像已完全解决。
