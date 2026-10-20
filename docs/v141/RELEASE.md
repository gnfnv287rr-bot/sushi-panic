# V1.4.1 · 我的口味

在V1.4原店铺基础上增量实现，不重画主场景。230个可食用条目（229款收藏＋乌龙茶）和7位好友配置、餐盘、权重、保底完全保留。

## 体验

- 首次昵称创建后的角色卡可点「今天想吃点什么呀？」选口味，也可直接开吃。老玩家仅收到可关闭的小提示；跳过也记录为已设置。设置入口在声音设置和座位详情。
- 心头好最多3道真实菜；挑食支持14类标签及单道菜。使用原菜品插画、搜索、菜单筛选及12道分页，不一次渲染全部图片。
- 每次选择立即在本机生效，短暂合并后同步云端；「收好口味」立即发起同步。喜欢/挑食都有正常食物分、舒适连吃奖励、发现奖励及饱腹变化；不额外奖励或惩罚。
- 猫咪短暂开心/嫌弃，三秒轻文案；连续挑食会换吐槽。角色气泡与好友彩蛋合并显示，首遇收藏卡仍独立展示，不互相覆盖。
- 「我什么都爱吃！」清空挑食分类和单菜清单，保留心头好。直接同菜互斥并提示；心头好若同时命中挑食分类，优先挑食，仅触发一次反馈。
- 原本的饱腹上限/喝茶条件、0.7秒进食间隔仍保留；这些与口味无关。20秒安全休息、无挂机得分、BGM默认开启和现存声音偏好保持。

## 数据与接口

独立设置，不改昵称、UUID、积分、图鉴或对局记录：

```json
{"version":1,"favorites":["friends_uu"],"dislikedTags":["matcha"],"dislikedFoods":[],"configured":true}
```

`favorites`最多3个现有菜品ID；`dislikedFoods`现有ID；`dislikedTags`仅已定义且真实菜单中存在的标签。`src/food-tags-v141.js`逐ID明确列出全部230道菜的多标签，运行时不猜菜名、不改变旧配方或出盘。

- `GET /api/tastes`：JWT认证自己的偏好、revision、updatedAt、playerId；不进入公开榜单/其他玩家档案。
- `POST /api/tastes`：`{preferences, revision, mutation, owner}`，服务端以认证UUID授权，owner用于防止异步请求中身份切换误写。有效同mutation重试幂等；revision不符返回conflict，旧设备不静默覆盖新设置。冲突时可采用云端或明确点保存。
- `sushi_players`仅新增taste_preferences/revision/updated_at/mutation列；已有RLS保持，直接写和RPC对anon/authenticated禁用，仅Edge service_role调用。POST用户10次/分钟限流，不影响游戏请求。客户端验证之外服务端再次校验真实菜品/标签/上限。
- 本地键`sushi.tastes.v141.<authenticated UUID>`独立持久化待传队列。网络失败只显示本机生效，30秒可见页面重试/恢复联网/手动重试；不冒充云端成功。多设备/窗口冲突需要明确处理，不自动合并相反喜好。
- 游客清理浏览器数据会丢失身份访问；沿用现有自愿邮箱绑定/恢复。新功能没有修改认证或SMTP；练习档只本机保存，不冒充跨设备同步。

## 旧桌兼容与得分

新开局规则1.4.1仅取消随机过敏分支，所有食物走原普通食物公式；口味偏好不参与服务端计分。旧0.2.0、1.2.0、1.2.1、1.4.0原实现保持字节不变。

旧未结账休闲局恢复后，在当前活动tick追加一次`[tick,-1]`规则转换标记。同一seed、对局ID、食物队列、已吃次数、历史得分和精神值继续；标记以前按原规则核验，以后按原普通食物公式进食，不追溯补分或恢复旧损伤。重复转换标记被拒绝。旧缓存客户端不含标记，继续使用原核验器。已结算成绩完全不改。旧生存模式仅测试入口保留原规则。

柚子旧「首次过敏免伤」随随机过敏取消而不再触发；其慢消化与1.15饱腹体质保留，界面去掉失效能力宣称。其他角色食物分/回血能力照常。

## 修改文件

- 新增：`src/taste-model.js`、`food-tags-v141.js`、`taste-store.js`、`taste-ui.js`、`casual-v141.js`。
- 整合：`main.js`、`renderer-cozy.js`、`run-state-v14.js`、`casual-engine.js`、`social.js`、`index.html`、`style.css`。
- 后端：`server/v1/app.js`、迁移`20261020110000_player_tastes.sql`、`supabase/rollback/v141-compatibility.sql`、构建同步的Edge共享模块。
- 发布：package版本/锁文件、构建和校验脚本、生成的离线play.html、版本保护清单。
- 测试：`tests/v1/tastes.test.mjs`、`tests/browser/tastes.spec.js`；两处旧浏览器当前版本断言从1.4.0更新为1.4.1，不改变旧规则专项测试。

## 维护、部署与回滚

```sh
npm ci
npm test
npx playwright test
npm run test:security
npm run build
node scripts/verify-build.mjs
node scripts/verify-cozy-integration.mjs
npm start  # 仅本机 http://localhost:5173
```

先在独立staging应用追加迁移、部署Edge、跑`scripts/v141/cloud-acceptance.mjs`，再保护快照并更新生产后端，最后推送发布分支。只用已有免费项目，不配置新密钥、SMTP或付费服务。

回滚文件只禁用新开局、保留口味列与已升级桌核验；恢复可重跑迁移。不得删除新列或回退Edge导致1.4.1/转换旧桌无法结账。Pages可回到旧客户端，但新版未结账桌应在新版结清；保留新版核验器。

## 正式发布

2026-10-20已发布1.4.1，源码c706b47，Actions39404029554成功，生产资源6b31d70a84d4。生产页面两独立游客/桌面与触屏尺寸真实口味反馈、云端保存与刷新恢复通过；完整证据及未验证范围见TEST_REPORT.md。

[立即体验](https://gnfnv287rr-bot.github.io/sushi-panic/?release=141-tastes)
