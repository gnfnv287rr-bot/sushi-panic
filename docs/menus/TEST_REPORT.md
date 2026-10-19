# V1.2.1 菜单测试与发布 · 2026-10-19

## 已实际通过

| 层级 | 结果 | 范围 / 本机证据 |
| --- | --- | --- |
| 本地规则/API/数据库/身份契约 | 81/81（旧32＋V1/P0/P1 49） | `artifacts/v121-unit.txt`；含5项新增目录、概率、重放、RLS和幂等归档测试；本地PGlite不冒充远端 |
| 完整Chrome浏览器回归 | 35/35 | `artifacts/v121-browser.txt`，含旧生存模式兼容、原有屏幕与输入、休闲/断网、216菜单与222图鉴 |
| 最后布局回归 | 2/2 | `artifacts/v121-browser-final-layout.txt`，390/1440宽度，筛选/分页/发现/结账、分页目标至少44px、无横向溢出 |
| 随机模拟 | 100,000次 | `artifacts/v121-probability.json`，216款全部出现，日常最长连7、非珍藏最长连39、食物连续7后有茶、过敏原食物最长连2。含保底珍藏5.6286%，非真人试玩 |
| 真实Supabase双玩家浏览器 | 7项 | `artifacts/v121-cloud.json`；独立匿名Auth、同昵称不同UUID、常驻/当期主题、真实点击、重复checkpoint、结账无重复、云端日榜一致、非参榜存档与重开恢复。客户端使用本次dist，Auth/Edge/PG为真实staging |
| 真实Supabase特色/兼容API | 3项 | `artifacts/v121-feature-cloud.json`；真实种子合法进食特色菜并查到收藏；旧1.2.0秋日局仍能结账；远端菜单217项/222图鉴。此项是API测试，不称真人/浏览器操作 |
| 安全/构建 | 通过 | `artifacts/v121-security.txt`：旧核心/渲染哈希未变，9表RLS，已知凭证模式0；构建和不可变资源检查通过；Deno检查通过 |

最初完整浏览器出现5个失败，其中新版对局被旧判断误判为生存模式、测试读取了不存在的版本字段；修复统一版本识别并改为正式snapshot断言后完整35项通过。另一次旧鼠标坐标用例初跑失败，重跑完整与后续定向通过；不隐瞒其坐标随传送带变化产生的时序敏感性。

截图已人工查看：28款特色插画联览、390宽图鉴与分页。根据检查加宽分页按钮、限制长菜名盘签宽度；同家族图形仍共享基础绘制，不声称216张独立手绘素材。

## 发布状态

生产迁移20261019131500已应用，sushi-api 1.2.1已部署；变更前私人备份在忽略目录`.data/backups/before-v121-catalog.json`（权限600，不进Git）。原18个玩家档案、10条收藏、每日成绩与冠军快照逐项未变，对局数量未减少，`artifacts/v121-production-preservation.json`全部true。Pages与正式公开资源验收现已完成，详见下文。

## 未实际验证

真实iPhone/Android硬件、Safari全流程、朋友中国原网络、多人长时负载，以及216款真人收集节奏。机器模拟不等于真人手感或完整公平性证明。上一版真实邮箱绑定/Chrome恢复证据继续有效，本次没有重复发邮件或重新配置SMTP。服务端核验合法事件不能证明操作者是人类。


## 正式发布验收通过 · 北京时间21:17

- 源码发布提交 `c40ab86`，[GitHub Actions 39258606957](https://github.com/gnfnv287rr-bot/sushi-panic/actions/runs/39258606957) 的build/deploy均success。
- [正式游戏](https://gnfnv287rr-bot.github.io/sushi-panic/?release=121-menu216)：公开HTTP200、build.json 1.2.1、HTML和新菜单模块同属不可变目录 `9c818b8e9958`；生产Edge 1.2.1、当期传送带217项。证据 `artifacts/v121-public-release.json`。
- 实际已发布资源、不拦截替换资源的两个全新Chrome会话（1440桌面／390触屏模拟）均联网开局、真实按键进食、暂停、读榜、24卡图鉴／珍藏过滤、邮箱入口与无横向溢出通过，JS异常0；两身份看到相同生产榜。证据 `artifacts/v1-public-online-smoke.json`。生产只开局和暂停，不提交自动测试最终分数。
- 第一次导航遭遇 `net::ERR_CONNECTION_CLOSED`，尚未进入游戏；保留 `artifacts/v121-public-smoke-initial-failure.json`。随后同一公开URL重试，两个会话均通过。不能因此承诺所有网络永远可达。
- 发布后再次比较原18档案、10收藏、原日榜与冠军快照全部true，对局数量未减少，证据 `artifacts/v121-production-preservation-final.json`。没有收费升级或删除生产记录。
- 无待Owner配置的密钥或授权。旧用户如已保存经典/秋日偏好，可在结账回门口后选择「第02期 · 一测百味放题」体验216款同台回转。
