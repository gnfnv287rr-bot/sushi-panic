# V1.2 架构与安全边界

GitHub Pages静态Canvas/DOM客户端，Supabase匿名Auth/自愿邮箱OTP，Edge Functions，PostgreSQL，沿用原技术栈。没有Vercel或新付费服务。原始core.js/renderer.js保留；旧0.2.0对局继续服务端重放。V1.2采用独立casual-v12.js、renderer-v12.js和menus-v1.js。

## 数据与接口

- 身份/总档案：sushi_players、Supabase Auth UUID；邮箱验证只经官方Auth SDK。不凭昵称或公开ID认领。
- 对局：sushi_game_sessions，rules_version/theme_id/menu_edition/known_foods在服务端开局确定。客户端仅发ticks与合法事件（盘ID或恢复操作0），不信任其分数或自报食物数量。
- 配置：menus-v1.js为发布源，migration中保存同版sushi_themes.config/sushi_catalog.recipe。新增主题/食物只扩充配置和安全迁移；既有ID、配方、概率和规则版本不能改写，否则旧种子重放会变，需另留新版规则/配置。
- 收藏：sushi_player_collection按(player_id,sushi_id)唯一，记录first_discovered_at/last_tasted_at/taste_count。session.archived_counts保存本局已经入库的累计数量；每次只增加差值。最后结账不重复累计已checkpoint的寿司。
- 排名：原每日最高/冠军/快照表原样使用，北京时间与服务端首次结算时间，保留历史数据和旧分数。不同规则历史分数未重置，旧生存高分可能较难超过。

| 路径 | 功能 |
|---|---|
| GET /api/menus | 公开配置、服务端时间、本周/往期状态 |
| POST /api/runs | {rulesVersion:"1.2.0",themeId:"classic"或"autumn"}；无版本仍开旧局以兼容已有客户端 |
| POST /api/runs/:id/checkpoint | {ticks,actions}；校验JWT、会话所有权、真实服务端时长、完整重放，只同步收藏，不写最终榜分 |
| POST /api/runs/:id/finish | V1.2 {ticks,actions,checkout:true}，服务器复算并幂等结算；旧局按原死亡规则 |
| GET /api/identity | 原接口，含收藏/主题进度/每日历史 |
| GET /api/leaderboard | 原接口，公开读榜、本人TOP100外名次、服务器换榜时间 |

所有业务表9张保持RLS；客户端无INSERT/UPDATE/DELETE，所有service RPC禁止anon/authenticated直接执行。管理员密钥仅Edge Secrets。新增RPC仅service_role可执行。身份由getUser验证，checkpoint非法重放写审计；原限流、隔离、digest重试保护保留。

## 异常与费用控制

每局独立本地日志保留未结束/待提交动作；刷新后从种子重放恢复，不读取本地HP/分数。收藏每8秒合并请求，后台最多每20秒检查；没有新增寿司时不请求。公开榜每60秒，隐藏页停止。断网继续练习或保留本局、明确待同步，不承诺未确认的数据已进云端。

游戏关闭前最后一次尚未同步的操作仍依赖原浏览器本地记录；换设备只能恢复已确认的云端进度。清除存储会丢失这些未同步记录。邮件发送有第三方速率/策略限制，163不保证投递SLA；不能把SMTP保存当作成功。免费实例暂停/额度/邮件限制沿用docs/v1/COSTS.md，未开付费套餐，不承诺永远零成本或中国所有网络可达。

重放证明“操作符合规则”，不能证明真人操作。自动脚本、预知种子、并行会话等仍有自动化作弊空间；不宣称彻底防作弊。长局重复重放的Edge CPU成本、全量图鉴API体积随内容增长需要后续优化。
