# refs/ — 风格参考

> 这里只放**视觉参考**，**不进 prompt**。Prompt 的样式锚定全在 `../STYLE.md`。

如果你的生图工具支持 image-to-image，可以把这些参考喂进去帮助 ground 风格。否则只看 STYLE.md 描述即可。

## 推荐扫一遍的外部参考（不需要本地存）

- **Saul Bass posters Google Image search**：搜 "Saul Bass Vertigo poster" / "Saul Bass Anatomy of a Murder"
- **WPA Federal Art Project posters**：Library of Congress 数字馆藏 https://www.loc.gov/free-to-use/wpa-posters/（CC0）
- **Polish poster school**：搜 "Polish film poster Tomaszewski"
- **Soviet constructivist posters**：搜 "Rodchenko poster" / "El Lissitzky"

## 风格 anchor 三大判别准则

如果你不确定某张图算不算"达标 Saul Bass / WPA"风格，自检这三点：

1. **数一下颜色** —— 超过 4 色，重画
2. **看有没有渐变 / 阴影 / 高光** —— 有，重画
3. **看负空间占比** —— 不到 30%，重画

只要每张都过了这三关，整批就稳。

## 调色板 swatch（直接复制到 prompt 也行）

```
cream      #f0e8c8   背景默认色
vermilion  #d44820   主动作色（警告 / 焦点 / 红）
teal       #2a8090   冷对比色（深度 / 反向）
mustard    #d8b048   黄色 accent（金属感 / 强调）
ink        #1a1a1a   silhouette / 描边（线条不超过整图 30%）
```

## 不要做的"风格漂移"

- ❌ 加 grayscale 中间色（应该全是 cream 或全是 ink，不要灰）
- ❌ 加第 6 个颜色（哪怕只是 navy 也不行 —— 想要冷色就用 teal）
- ❌ 加颗粒感 / 纸张纹理 / 印刷错位效果（这些是后期手段，不该在生成时叠）
- ❌ 加任何字体 / 文字 / 数字
