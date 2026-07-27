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
- 真心话大冒险和默契挑战占位卡片
- 非官方粉丝作品说明
- 不使用真人照片或第三方图片素材

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
