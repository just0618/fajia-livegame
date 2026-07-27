# 法嘉直播游戏屋

这是 `fajia-livegame` 仓库的第一版首页。

## 文件

```text
fajia-livegame/
├── index.html
├── style.css
├── app.js
└── README.md
```

## 已配置内容

- 法嘉应援色：
  - 粉色 `#FF8AA1`
  - 金色 `#FFE25B`
- 手机、平板和电脑响应式布局
- 大富翁入口跳转至原独立网站：
  - https://just0618.github.io/fajia-game/
- 真心话大冒险、默契挑战和小动作你比我猜均已上线
- 非官方粉丝作品说明
- 使用用户提供并允许公开展示的两张人物照片

## 上传到 GitHub

1. 新建公开仓库 `fajia-livegame`。
2. 点击 `Add file → Upload files`。
3. 上传本文件夹中的 `index.html`、`style.css`、`app.js` 和 `README.md`。
4. 打开 `Settings → Pages`。
5. 在 `Build and deployment` 中选择 `Deploy from a branch`。
6. Branch 选择 `main`，文件夹选择 `/ (root)`，点击 `Save`。
7. 发布完成后访问：

```text
https://just0618.github.io/fajia-livegame/
```

## 后续增加游戏

轻量游戏可以放在：

```text
games/
└── truth-or-dare/
    ├── index.html
    ├── style.css
    ├── app.js
    └── questions.js
```

然后把首页对应卡片的按钮链接改成：

```html
<a href="./games/truth-or-dare/">开始游戏</a>
```


## 大富翁地图系列规划

- 当前的 `MAP 01` 继续链接到原独立仓库，不移动、不改旧网址。
- 只有一个地图时，首页可直接进入 `MAP 01`。
- 第二个地图完成后，可在本仓库新建 `monopoly/index.html` 作为“选择地图”页面。
- 每张新地图可以独立仓库维护，也可以放在 `games/monopoly-map-02/` 等子目录中。
- 首页只展示“大富翁系列”一次，避免不同地图挤占整个游戏大厅。


## 已上线：真心话大冒险

路径：

```text
games/truth-or-dare/
├── index.html
├── style.css
├── app.js
└── questions.js
```

功能：

- 轻松、心动、挑战三档题目
- 真心话、大冒险、随机三种模式
- 法宣阁与贺嘉述自动轮流
- 同一局题目不重复
- 题库用完自动重新洗牌
- 手机、平板和电脑适配
- 可返回直播游戏屋首页

后续增加题目时，只需要编辑：

```text
games/truth-or-dare/questions.js
```


## 已上线：法嘉默契挑战

路径：

```text
games/compatibility/
├── index.html
├── style.css
├── app.js
└── questions.js
```

功能：

- 轻松日常、心动回忆、默契挑战、全部混合四种主题
- 5题、10题、15题三种轮数
- 同时指向、同时选择、同时回答三类题型
- 三秒倒计时
- 手动记录“这题很默契”“这题不太默契”或跳过
- 每个独立主题均包含15题，支持5题、10题和15题模式
- 自动计算默契百分比
- 根据结果生成默契称号
- 手机、平板和电脑适配

后续增加题目时，只需要编辑：

```text
games/compatibility/questions.js
```


## 已上线：法嘉小动作你比我猜

路径：

```text
games/charades/
├── index.html
├── style.css
├── app.js
└── questions.js
```

功能：

- 简单动作、日常情境、脑洞剧情、直播情境和全部混合
- 共60道题，每类15道
- 完全无声与允许拟声词两种规则
- 5题、10题、15题三种轮数
- 法宣阁与贺嘉述自动轮流表演
- 每题30秒倒计时
- 猜中、跳过和时间结束三种结果
- 跳过不消耗所选题数，由当前表演者补抽一题
- 已完成题目不重复；跳过或表演前换掉的题目会排到题库后面
- 最终仅显示团队成绩、成功率与平均猜中用时
- 所有题目均可坐着完成，不含动物内容
- 手机、平板和电脑适配

后续增加题目时，只需要编辑：

```text
games/charades/questions.js
```


## 公开测试版 V1.0 首页文案

首页对外定位：

- 主标题：今天法嘉想玩点什么？
- 大富翁名称：法嘉致富大富翁
- 标识：粉丝自制 · 公开测试版 V1.0 · 持续更新
- 欢迎大家提供适合法嘉直播的游戏点子
- 欢迎法法嘉嘉对玩法、题目和互动形式提出建议
- 页脚明确说明页面不收集登录信息、答题内容或游戏记录
