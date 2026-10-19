# V1 架构

浏览器仍是原生 Canvas + DOM。纯规则 Game 和渲染 Renderer 原样保留；main.js 负责现有交互及新榜单组件。新增 identity.js、social.js、公开 config.js 独立管理 Supabase Auth 与联网；SDK构建到本地静态资源，按需加载，不阻塞首屏游戏绘制。

GitHub Pages 静态前端 → Supabase Anonymous Auth（可选邮箱升级/恢复）→ Edge Functions → PostgreSQL。前端不再请求 chatgpt.site。Edge 用原 Game重放验证，受限service RPC以事务更新玩家累计、每日最佳和结果回执。

| 表 | 数据与索引 |
| --- | --- |
| sushi_players | Auth UUID主键、可重名昵称、历史最高、有效局数/总分、最近游玩 |
| sushi_game_sessions | 对局UUID主键、所属玩家/种子/规则版本、开始结束、权威日期、状态、摘要/回执；owner+started索引，pending按日期索引 |
| sushi_daily_scores | 日期+玩家联合主键；当日最高与首次达到时间、当时昵称、来源对局；day/score desc/achieved_at/player_id排行索引 |
| sushi_daily_champions | 日期主键、冠军身份/当时昵称/分数、当天完整快照、归档时间；空参与日期冠军null |
| sushi_security_events | 异常与拒绝摘要；时间索引；不公开 |
| sushi_rate_limits | 哈希网络/玩家限流桶；过期限流桶可清，成绩历史不删 |

每日00:00换榜只是服务端日期选择改变，不需要写入“重置”或删除。归档在读榜时幂等补办，可加每日数据库Cron。首次结束确认后暂时处理失败的局，在10分钟宽限内允许重试；归档等待该类待处理局，超时隔离后冻结历史，避免冠军反复变化。

本地只用 dev依赖PGlite PostgreSQL及签名Cookie实现独立联调；真实生产使用Supabase Auth JWT与数据库。生成的 supabase/functions/_shared 是受保护源码与server/v1的部署副本，修改源文件后重新build，不手改生成副本。旧D1迁移、worker、API保留供v0.2审计，V1不用它们部署。

浏览器只在可见侧栏/弹窗时每60秒刷新，后台停止；倒计时用数据库时间加单调时钟。网络失败让排名显示不可用/上次读取状态，游戏核心循环继续；只有用户主动打开弹窗才暂停。失败日志保留最多10局，服务端幂等，重试不会累计两次。

邮箱完全自愿。绑定调用当前Auth身份的updateUser，恢复调用signInWithOtp且shouldCreateUser=false；不自动合并另一游客数据。前端仅提示邮件请求受理，实际验证/收信/SMTP状态需要单独验收。
