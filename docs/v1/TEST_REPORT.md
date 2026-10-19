# V1 测试报告 · 2026-10-19

**这是候选版本的本地自动测试报告，不是正式云端验收。** 正式真人组织测试/手机真机为0；此前用户有自然试玩正向反馈，不计为受控测试。

## 已通过

- 原核心/API：32/32，核心计分、饥饿/过饱、角色、随机、状态继续通过。core.js 与 renderer.js SHA-256 和原版完全相同。
- V1：24/24。17项使用真实 PostgreSQL(PGlite)测试业务、日期、权限；4项 Edge/Supabase SDK 认证契约用 stub；3项邮箱 SDK 契约用 stub，未实际发邮件。合计规则/API/数据库/契约测试 **56项通过**。
- 完整 Chrome 浏览器：24/24通过，43.5秒；结果保存在 artifacts/v1-browser-full.json。没有 skip/flaky。保留旧7尺寸(320/375/390/768/1024/1440宽及横屏)、鼠标/键盘/触屏模拟、离线、存储拒绝、音效控制、预警与暂停。
- 新增真实浏览器流程：用户昵称、同一浏览器多窗口身份、右下角榜单位置；真实进食至死上传并由另一浏览器读到；网络失败→保留日志→刷新→恢复后重试→累计局数仍为1；改名保留历史；分享文案标注北京时间查询时间。手机100行列表使用明确标注的 fixture 验证滚动/榜外个人排名，不当作100真实玩家成绩。
- 最后存档按钮、历史区与窄屏调整另跑定向检查，最新结果见 artifacts/v1-browser-focused-output.txt 和 browser-results.json；不把定向报告说成完整用例重跑。
- Deno check：Supabase Edge 入口检查通过；构建生成官方SDK本地资源和Edge共享规则模块，不依赖运行时CDN。
- 约5小时58分模拟局、6,425次进食、1,290,040 ticks，本地 Node重放约75ms，得分一致（artifacts/v1-long-replay.json）。这是单个工程基准，不代表真实Edge每次请求CPU或手机帧率。v0.1.0的1800局平衡模拟仍是历史证据，本次未重跑。
- 依赖 npm audit 当前0漏洞；凭证已知模式扫描、Git历史检查、六表RLS声明和客户端无chatgpt.site依赖检查通过，详见安全输出。

## 日期/成绩/权限覆盖

测试服务端数据库时钟，未修改生产数据：北京时间23:59:59→00:00；跨日结束；客户端自报时间不参与；昨日不入今日、历史最高仍在；同分按先达/UUID；TOP100截取和101名本人；低分不覆盖高分；重复/并发提交只累计一次；待处理跨日确认保留首次日期；超时隔离后冻结历史；重复归档冠军次数不增；无人日期为空冠军；改名不改变已冻结快照。

RLS实际切换 authenticated/anon 角色测试：只能读取本人，不能改分，不能调用服务RPC，不能写每日成绩。伪造Cookie/Token、他人局ID、极端计时、非法盘子、未结束局被拒绝或隔离，并记录审计。Edge SDK stub验证 getUser 校验和CORS，不能冒充Supabase云端认证已通过。

## 发现与修复

初次浏览器18通过1超时：旧测试仍查找旧按钮名，更新为今日排行榜后全套通过。认证测试初次有stub括号语法错误，修复后4项契约通过。最终部署由用户改为Pages+Edge后重新跑56项及24浏览器，均通过。移除不再使用的旧Drizzle开发工具后依赖审计为0；旧迁移文件仅保留审计，不用于V1。

## 未实际验证 / 当前阻塞

Supabase Free项目创建、生产迁移/RLS advisors、云端匿名Auth、Edge真实资源配额/冷启动、生产完成局、两个真实云端玩家同步、实际邮箱绑定/收信/跨设备恢复、真实Safari/Edge/Windows/iPhone/Android、不同公网出口与中国朋友原网络、低性能手机持续帧率、电耗、压力/攻击场景均未验证。原因分别是账号连接未就绪或缺少真机/该网络，不能写成已通过。

GitHub Pages公网预览只证明静态游戏与新UI可访问，未接通时明确练习，不满足正式全球每日榜验收。需要接通Supabase后完成部署测试A及云端身份/积分/排行再验收。

最后一次定向回归9/9通过（7尺寸、断网、存档邮箱弹窗）。完整24项JSON单独保留，最新browser-results.json仅为定向9项。Supabase CLI migration list --local 因没有Docker/Postgres端口54322而连接失败；没有把该检查写成通过，业务SQL/RLS由PGlite PostgreSQL实际执行验证。

公网预览在Pages构建built后，桌面及390px触屏模拟两个新匿名浏览器均HTTP200，能开局、进食得分和暂停，无JS错误、普通URL无测试接口。均明确练习局，不伪造榜单。见 artifacts/v1-public-preview.json；这不是Supabase联网同步验证。生产发布保护脚本在公开配置为空时按预期拒绝正式发布。

# 2026-10-19 云端接通与正式入口复验（最新）

此节取代上文“云端尚未连接”的旧状态，仍保留旧测试的历史记录。

| 实际测试 | 结果 | 证据/范围 |
| --- | --- | --- |
| 全部规则/API/真实本地PG/SDK契约 | 57/57通过（原32 + V1 25） | `artifacts/v1-cloud-release-unit-output.txt`；SDK部分是契约模拟，不能单独证明邮件可用 |
| Chrome完整浏览器回归 | 25/25通过，51.7秒 | `artifacts/v1-cloud-release-browser-output.txt`；含7尺寸、离线、预警、真实进食与重试 |
| 独立Supabase云端浏览器验收 | 10项检查通过 | `artifacts/v1-cloud-acceptance.json`；两个新浏览器游客、同名不同UUID、真实操作/死亡/Edge复算、断网重试、幂等、双方同步、改名/重新访问、RLS拒绝；静态资产由dist在生产origin下路由加载，API/Auth/PG不模拟 |
| 独立云端安全测试 | 4项通过 | `artifacts/v1-cloud-security.json`；未认证/坏Origin拒绝、跨玩家finish拒绝、加速自报高分隔离且有效局数不变、第13次开局429 |
| 云端受控日期测试 | 全部SQL断言通过 | `artifacts/v1-cloud-calendar.json`；23:59/00:00、跨日归属、历史最高、冠军幂等/冻结昵称、空日；独立测试库事务全部回滚，未修改生产时间 |
| 生产部署 | Actions build/deploy success | [run39236478068](https://github.com/gnfnv287rr-bot/sushi-panic/actions/runs/39236478068)；健康检查独立通过 |
| 生产正式URL | 两个全新Chrome会话通过 | `artifacts/v1-public-online-smoke.json`；真实公开资源，桌面1440×1100/手机模拟390×844，HTTP200、无账号登录、真实游客联网开局/进食/暂停/读榜、邮箱关闭提示、无横溢出/JS异常；没有向生产榜提交测试分 |
| 生产数据库与advisors | 6表RLS启用，2项路径提醒已修复 | `artifacts/v1-production-rls.json`、`v1-production-advisors.json`；剩余3项游客自身SELECT提醒是有意配置，云端实测不能读其他人、写分或调用服务RPC |
| 本机代码/Git凭据扫描 | 核心与渲染哈希未变；已知模式匹配0 | `npm run test:security`；不等于完整密钥审计或渗透测试 |

云端测试脚本最初两次未等待异步响应/昵称初始化完成，出现测试断言失败。查库证实首局已verified；修正脚本等待后全部通过，没有更改得分或绕过后端验证。`artifacts/v1-cloud-acceptance-attempt2.json`保留第二次失败证据。生产榜切换前为0行，测试分全部在独立项目，没有制造正式冠军。

**未完成：公共SMTP与实际邮件绑定/恢复。** 生产配置 `emailEnabled=false`，界面和调用均明确拒绝，不显示虚假成功。需要邮件服务授权和真实收信验收后再打开。

**未实际验证：** 中国朋友原网络、真实iPhone/Android、Safari/Edge/Windows、真实跨夜运行、长局Edge CPU配额/持续压力、分布式机器人、正式100人规模、受控真人可玩性研究。自动模拟不是人工验收。
