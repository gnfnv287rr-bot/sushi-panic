# V1 联网测试版执行状态 · 2026-10-19

[公开游戏](https://gnfnv287rr-bot.github.io/sushi-panic/) · [源代码](https://github.com/gnfnv287rr-bot/sushi-panic) · [成功部署](https://github.com/gnfnv287rr-bot/sushi-panic/actions/runs/39236478068)

**游戏与每日联网榜已上线；邮箱跨设备恢复暂未开放。** GitHub Pages + Supabase Free + Edge Functions，不使用 Vercel。原核心玩法/角色/计分/渲染哈希未变；旧 Sites/D1 与旧分支保留。

| 阶段 | 完成内容与实际结果 | 仍需处理 |
| --- | --- | --- |
| 1 检查诊断 | 原源码完整，基线哈希留存；原 Cloudflare 拦截属于托管访问层，规则未知 | 中国朋友原网络需复测新地址 |
| 2 备份迁移 | 保留旧 Git 分支/ZIP/Sites/D1；正式客户端已移除 chatgpt.site API 依赖 | 不把无法确认身份的旧榜导入新游客账号 |
| 3 数据身份 | 生产/测试 Free 项目已就绪，两项迁移已应用；Supabase 真实匿名游客、同名、再次识别和改名保分实测通过 | 公共 SMTP 未配置，邮箱按钮明确禁用 |
| 4 积分每日榜 | 真实 Edge 重放、两玩家同步、幂等重试、个人/每日最高、TOP100与本人、冠军历史 | 跨实际午夜长期运行与压力测试尚未做 |
| 5 UI | 指定右下角榜单、结算、分享、历史、北京时间倒计时；保留店铺风格 | 真机可读性待试玩 |
| 6 安全异常 | 6表RLS、只读本人、禁止直接写分/RPC、所有权、限流、隔离实测；advisors路径提示已修复 | 剩余3个游客本人SELECT提醒为有意权限；专业反机器人未实现 |
| 7 自动测试 | 本地57/57、Chrome回归25/25、真实云端双玩家10项、安全4项、受控云端日期断言通过 | 自动测试不是受控真人试玩；其他浏览器与真机未验证 |
| 8 部署 | GitHub Actions构建/发布成功；正式URL两新会话HTTP200、游客联网开局、进食/暂停/读榜通过 | 生产榜未写测试分；完整双玩家结算在独立云测试项目验证 |

## 资源与权限

- GitHub默认源码分支 `codex/daily-leaderboard-v1`，Pages由Actions发布；该分支代码push自动发布，只有文档改动不重发。
- 生产 Supabase：`hyqgkenarjgxdbqiwpxl`，测试：`ujejpprlmpjmmbodhqdj`；组织 `uuuu`，FREE，新加坡。已占两个免费活跃项目名额，不创建更多或升级。
- 用户已明确授权本机CLI登录和免费资源配置。没有创建付费资源、买域名、删除旧生产数据；管理员密钥未进Git或浏览器。
- `/sushi-panic/v1/` 旧预览入口跳转到正式根入口。旧源码在 `codex/public-game` 可恢复，但它曾依赖Sites API，不作为新版本回滚后的联网保证。

## 下一步

1. 朋友在中国原网络验收公开URL、角色卡“联网计分局”、结算“提交成功”、双方榜单同步。
2. iPhone Safari / Android / Windows Edge真机与实际网络验证。
3. 配置经Owner授权的公共SMTP，指定收件人实测邮箱绑定/恢复后再启用开关；目前不能承诺跨设备恢复。
4. 观察匿名Auth滥用、免费额度/暂停、长局Edge CPU和数据库增长，不自动删历史成绩或升级。
