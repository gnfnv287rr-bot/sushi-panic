# 圆润菜单标题字 · V1.2.3

基于作者官方 [ChillRound / 寒蝉全圆体](https://github.com/Warren2060/ChillRound)，Copyright 2023 ChillType。

- 源文件 `ChillRoundF v3.0.ttf`，6,168,772 bytes，Git blob `4f7c5af27a6ef15edadf53aec804de7d157a9181`。由作者仓库完整下载并核对 blob。
- SIL OFL 1.1 原文随包分发，见 `OFL-ChillRound.txt`，保留上游版权。子集修改版的内部字体名为 **Sushi Round Labels**，不使用上游保留名称作为修改版名称。
- WOFF2 子集6,544 bytes；合并重叠轮廓以减少小字号交叠细缝。
- 仅用于欢迎语与菜单/图鉴/排行榜标题；正文和按钮继续用系统中文字体，分数用等宽字体。字体与游戏同站托管，不请求外部字体 CDN；离线版内嵌。
- 字符：今日放题我的寿司手帐大胃王常驻百味一测秋小食堂欢迎光临，今天想吃点什么？
- font-display:swap；失败时回退系统无衬线，避免再次回退毛笔楷体。少量文字描边让标题更饱满。
- 工具：临时 fonttools 4.60.2 / brotli 1.2.0 / skia-pathops 0.8.0.post2 环境，不增加游戏运行依赖。重建脚本见 `scripts/subset-menu-font.py`，完整源字体不进入发布包。

V1.2.2 曾使用 Ma Shan Zheng；本次根据 Owner 的参考图替换，不再用于当前版本。
