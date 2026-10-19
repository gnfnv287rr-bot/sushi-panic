# 研究记录

版本：v0.1.0；查阅日期：2026-10-19（北京时间）。研究用于决定首版实现，达到必要证据后即进入开发。

## 方法与限制

先检查 agent-reach：Exa/mcporter 未配置，Reddit/Twitter 无可用已登录后端；按其网页路由尝试 Jina，返回 HTTP 401。随后用可用网页搜索/阅读工具查阅下列官方产品页和技术文档。没有擅自登录或安装社交平台工具。没有获取市场留存、流水、竞品局内遥测，也没有真人体验这些产品。资料里的发行方宣传不作为本项目商业效果的证据。

## 玩法与相邻产品

| 来源事实 | 本项目的推导与行动 | 边界 |
| --- | --- | --- |
| [Halfbrick：Fruit Ninja Classic](https://www.halfbrick.com/games/fruit-ninja-classic) 以切水果、避开炸弹概括基础操作。 | 采用单一“点盘子”动作，食物收益与过敏危险同时可见。操作相同，决策由饱腹状态改变。 | 证明此产品如何介绍操作，不证明“避危险物”必然带来留存。 |
| [Halfbrick：官方新手指南](https://www.halfbrick.com/blog/the-ultimate-beginners-guide-to-fruit-ninja) 区分 Classic、60 秒 Arcade 和无炸弹 Zen 等模式。 | 首版只做无尽生存。把“限时挑战 / 练习模式”记录为主策划待确认建议，避免第一版扩散。 | 2016 年文章，仅作历史规则参考，不声称当前全部版本一致。 |
| [Gamewright：Sushi Go!](https://gamewright.com/product/Sushi-Go) 描述快速选择寿司及通过组合取得分数。它是桌面卡牌游戏。 | 借鉴“食物选择比一味多吃更有价值”：舒适进食、连击、首次安全品种奖励。保持实时点击生存定位。 | 这是相邻题材与决策参考，并非同操作、同平台竞品。 |
| [Ketchapp：Stack](https://www.ketchappgames.com/game-stack) 和 [开发者 App Store 页面](https://apps.apple.com/us/app/stack/id1080487957) 以堆高、简洁视觉和分数竞争描述产品。 | 提供即时得分和本机纪录；角色死亡后直接进入结果单，两次点击可开新局。 | 未从官方短介绍推断关卡细节、广告配置或实际用户体验。 |

结论属于待验证的设计判断：简单操作持续有吸引力，需要“当前状态影响选择 → 立即反馈 → 下次做得更好”的短循环。本项目通过饱腹、忌口、速度和食物属性实现这个循环。是否紧张、魔性、有重复游玩价值，只能通过实际玩家验证。

## 公平随机与数值

以下为本项目自主方案，不冒充外部调研结论：

- 角色均匀随机选取；食物用带种子的洗牌袋。重复种子和角色可在自动测试中重放。
- 完全独立抽食物存在任意长“断安全食物”序列的可能，因此加入约束：最多连续两次出餐不是通用安全正饱腹食物，第三次注入黄瓜卷。
- 保底按“出餐次数”定义。入口空间不足时延迟出餐，不能把它夸大为固定秒数内必有食物，更不能等同于所有玩家状态都可救回。
- 首盘提供黄瓜卷，开局先读角色卡、时间冻结。过敏不隐藏，饥饿/过饱先有 2 秒宽限；玩家仍可因连续误判失败。
- 所有阈值、食物、角色和难度公式集中在规则文件；对局策略与规则共享同一引擎。
- 第一轮模拟发现同策略角色均分最大约 2.03 倍。按角色饱腹增量/基础消化折算进食分，保留角色天赋，再进行回归模拟。最终指标见测试报告。
- 难度有上限，避免靠无限提高消耗制造必败。新手和高手是否都觉得合适，尚需真人测试。

## 技术与移动交互依据

| 来源 | 可核实事实 | 落地 |
| --- | --- | --- |
| [Phaser 官方文档](https://docs.phaser.io/) | 面向桌面和移动网页的 HTML5 游戏框架，支持 Canvas/WebGL 与 JavaScript/TypeScript。 | 多场景、物理、资源管理扩展候选；当前规则不要求完整引擎。 |
| [PixiJS 8 架构](https://pixijs.com/8.x/guides/concepts/architecture) | 提供渲染器、场景图、Assets、Ticker、指针事件等模块。 | 若后续图层、精灵与特效显著增多，可替换当前渲染层；游戏规则仍独立。 |
| [MDN Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API) | Canvas 可绘制 2D 游戏；内容本身不具备语义 HTML 的可访问性。 | 首版场景采用 Canvas；按钮、仪表、说明、角色信息用 DOM，另提供数字键。视觉玩法的完整无障碍支持仍未完成。 |
| [MDN Pointer Events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events) | 指针事件统一描述鼠标、触笔与触摸，并可用 touch-action 控制触摸行为。 | 只在游戏画布禁用默认手势；主指针 pointerdown 一次触发一次进食。按钮保留原生语义。 |
| [MDN requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame) | 动画回调频率随显示刷新率变化，需要依据时间戳计算推进。 | 逻辑固定 1/60 秒，画面按浏览器刷新；长卡顿转为暂停，避免悄悄漏算饥饿。 |
| [MDN Page Visibility](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API) | 可检测页面可见状态，后台页面计时/动画可能受限制。 | 页面隐藏与窗口失焦自动暂停，返回后显式继续。 |
| [MDN Web Audio 最佳实践](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices) | 音频启动需考虑用户交互与自动播放政策。 | 默认静音，仅由用户手动开启，合成简短音效，音频失败不阻断游戏。 |
| [Playwright Emulation](https://playwright.dev/docs/emulation) | 可模拟 viewport、DPR、触摸等浏览器参数。 | 7 尺寸自动验证；明确模拟不等于真机。 |

## 有表现力但低成本的传送带

本项目判断：回转的空间感主要来自闭环轨道、链板、盘子底部阴影、寿司层次和中心厨师，而非必须使用 3D。采用原创程序绘图、圆角矩形弧长参数轨道，食品与链板共享运动距离。没有下载竞品美术，没有素材网络请求。DPR 限制到 2，最多 14 个盘子，避免无上限对象增长。

未开展：用户访谈、平台全量竞品扫描、付费买量数据、真实移动设备帧率和电耗测试。后续研究应围绕真人观察到的实际问题补充。
