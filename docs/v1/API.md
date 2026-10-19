# 排行榜 API

生产基础路径：`https://<project>.supabase.co/functions/v1/sushi-api`。只允许配置的 GitHub Pages Origin；OPTIONS 返回 CORS 预检。公开读榜无需玩家 JWT，玩家操作须 `Authorization: Bearer <Supabase access token>`。客户端不得提供可信玩家 ID、日期或分数。

| 方法 / 路径 | 请求 | 响应 |
| --- | --- | --- |
| GET /api/health | 无 | app/version/mode/数据库时间（不是完整业务验收） |
| GET /api/identity | 可选JWT | 本人 profile 或 null、服务端 clock |
| POST /api/identity | JWT，nickname | 创建/改名，仅由已验证 auth.uid 关联本人；允许重名 |
| GET /api/leaderboard | 可选JWT | entries前100、me全榜名次、day、serverTime、resetsAt、本人profile |
| POST /api/runs | JWT，{} | runId、服务端 seed、characterId、startedAt、rulesVersion |
| POST /api/runs/:id/finish | JWT，ticks、actions:[tick,foodId][] | 独立复算 result + board；相同提交幂等 |
| GET /api/finalize | 服务端CRON_SECRET | 幂等历史归档；不向玩家开放 |

客户端游客创建、Token 更新、邮箱绑定/恢复走 Supabase Auth SDK；只有 publishable key 可放前端。API 用 getUser 再验证 Token，不信任昵称、客户端 UUID 或 JWT 未验证 payload。

成功结算包含 runId、playerId、nickname、score、sushi、duration、startedAt、endedAt、day、todayBest、allTimeBest、rank、rankQueriedAt、personalRecord、dailyRecord、globalRecord、enteredTop100、champion、duplicate。全球/今日提示只使用该响应。个人累计与每日历史在 profile 中返回（UI 最近31个有成绩日期，数据库完整保留）。

202 + quarantined 表示暂不计入排名；不是上传成功。400 输入错误、401 身份失效、403 Origin、404 不属于本人的局、409 结算内容改变、410 过期、429 限流、503 依赖故障。前端遇到网络/503 保留最多10局日志供重试，不创建虚假本地全球排名。

权威结束时间为服务器首次接收结算时的数据库时间，跨日按该时间归属。若离线直到次日才首次送达，以次日首次确认归属；客户端声称的结束时间不可信。首次确认后暂时写入失败，允许10分钟内同摘要重试，日期固定。迟于确认宽限的异常处理局隔离，避免已冻结历史冠军被重写。尚未送达的原会话最多7天有效。
