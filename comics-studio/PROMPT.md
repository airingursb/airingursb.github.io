# 四格漫画主提示词（彩铅与蜡笔版）

每次出图先附上 `refs/panda.png`、`refs/moflow-ink.png` 和 `refs/character-height.png`，再附 `refs/sources/no02-v2.webp`、`refs/sources/no09-v2.webp` 作场景与笔触参考。前两张是角色设定图；`moflow-ink.png` 仅保留兼容文件名，内容已换为新版圆团子。

角色身份以本模板、`refs/style-prompt.md` 和新版设定图为准。头像 `../src/assets/airing-avatar-48.png` 与 `refs/sources/airing-avatar-hd.png` 是同一个 Airing；新版漫画偶有配件或呆毛数量变化时，以固定设定为准。

将下面四格的场景、旁白和对白占位符全部替换后提交给支持参考图的图像模型。中文逐字填写；没有对白的格子写 `none`，每格仍须有左上角一至两行旁白。

## 固定提示词

```text
Create ONE square 1:1 comic image containing exactly FOUR panels in a 2×2 grid, with narrow ivory gutters. Read top-left, top-right, bottom-left, bottom-right. All four panels are complete scenes. No outer title or issue number inside the artwork. No.17's historical 3:2 landscape format is an exception and MUST NOT be copied.

MEDIUM AND ENVIRONMENT
Hand-drawn chibi illustration in COLORED PENCIL + WAX CRAYON. Intentionally broken, slightly scratchy BLACK outlines; visible grain, paper tooth and layered crayon/pencil strokes in the color fills. Warm light, rich but soft color, complete backgrounds with spatial depth and lived-in scene details. Draw the actual room, street or landscape in every panel, not a blank paper field with an isolated prop. Keep text readable within the detailed setting. No ink-wash aesthetic, photorealism, 3D rendering or smooth vector fills.

FIXED CHARACTERS — use the attached model sheets for identity and the joint height sheet for relative scale.
Airing: the SAME character as the beret avatar. Very large round WHITE face, NO black eye patches. Two SMALL BLACK DOT eyes, omega-shaped ω mouth, ORANGE OVAL cheek blush, round BLACK ears. ALWAYS wears a DARK NAVY BLUE BERET with a short stem and an ORANGE TRIANGULAR NECKERCHIEF, including in indoor and sleeping scenes. Short chubby body, BLACK arms and legs, WHITE belly. KHAKI BACKPACK; backpack design can vary, identity and palette cannot. If the scene sets the bag down, keep it khaki and recognizable. Natural expression changes may use closed eyelids or a small open mouth without changing the face design.
Moflow: the AI companion, a PALE BLUE FLUFFY ROUND DUMPLING/BLOB, about HALF Airing's height at the same distance from camera. Exactly THREE short feather-shaped hair tufts on top, BLACK DOT eyes with tiny WHITE HIGHLIGHTS, PINK cheeks, a TINY mouth, optional tiny rounded hands. The tufts are hair, not bird anatomy. NO bird body, beak, wings or tail feathers. NO heart-shaped body, heart marking, heart accessory or held heart. Not a tall teardrop and not a one-third-size mascot.
Match the same silhouettes, colors and accessories across all four panels. Do not use black eye patches as shorthand for the panda.

LETTERING
Render the supplied Chinese text VERBATIM as readable BLACK HANDWRITING.
Each panel MUST have ONE OR TWO lines of narration in its UPPER-LEFT corner; leave a readable area for it during composition. Narration has no pointer line.
Place dialogue near its speaker. Each dialogue utterance uses just ONE SHORT BLACK LINE pointing toward that speaker. NO enclosed speech balloons, rectangular dialogue boxes, balloon outlines, long tails or arrowheads. A panel may have no dialogue when specified, but keep its upper-left narration. Do not invent extra text. Keep the episode title in metadata, outside the image.

PANEL 1 — TOP LEFT
Scene/action/expression/light/setting: {PANEL_1_SCENE}
Upper-left narration, 1–2 lines, exact Chinese: {PANEL_1_NARRATION}
Dialogue, speaker + exact Chinese (or none): {PANEL_1_DIALOGUE}

PANEL 2 — TOP RIGHT
Scene/action/expression/light/setting: {PANEL_2_SCENE}
Upper-left narration, 1–2 lines, exact Chinese: {PANEL_2_NARRATION}
Dialogue, speaker + exact Chinese (or none): {PANEL_2_DIALOGUE}

PANEL 3 — BOTTOM LEFT
Scene/action/expression/light/setting: {PANEL_3_SCENE}
Upper-left narration, 1–2 lines, exact Chinese: {PANEL_3_NARRATION}
Dialogue, speaker + exact Chinese (or none): {PANEL_3_DIALOGUE}

PANEL 4 — BOTTOM RIGHT
Scene/action/expression/light/setting: {PANEL_4_SCENE}
Upper-left narration, 1–2 lines, exact Chinese: {PANEL_4_NARRATION}
Dialogue, speaker + exact Chinese (or none): {PANEL_4_DIALOGUE}
```

## 场景填写示例：分号

每格写清动作、表情、光源、完整环境和道具位置。对白用“角色名：原文”，旁白换行用实际换行；场景描述不要夹带模型需要猜测的对白。

| 格子 | 场景 | 左上旁白（每格 1–2 行） | 对白 |
|---|---|---|---|
| 1 起 | 早晨书房，窗外树影、书架、木桌和热茶；Airing 戴帽系领巾，背包靠椅，盯着电脑；Moflow 在桌边看着。 | 今天的错误，<br>看起来很小。 | Airing：应该很快。 |
| 2 承 | 同一书房，午后暖光照进来；桌上多了两个空杯，Airing 托腮，Moflow 趴在键盘旁。 | 三小时过去，<br>杯子倒是多了。 | none |
| 3 转 | 完整保留书房环境，镜头靠近电脑和两人；Airing 惊讶地指着光标旁的小分号，Moflow 抬头。 | 终于找到了，<br>少了一个分号。 | Airing：原来是你。 |
| 4 合 | 傍晚书房，台灯暖光、窗外暮色、书架和空杯；Airing 伏在桌上，Moflow 靠着他的胳膊。 | 屏幕终于安静，<br>人也需要重启。 | Moflow：先喝口水吧。 |

`meta.json.title` 填“分号”，不把标题塞进四格。表中的换行请转成实际文字换行。

## 出图后逐项检查

- 整张是 1:1 正方形、2×2 四格，顺序正确；不用 No.17 的横版比例。
- 彩铅与蜡笔颗粒清晰，黑线断续；每格都有暖光和完整场景细节。
- Airing 无黑眼圈，深蓝带柄贝雷帽、橙色三角领巾、橙色椭圆腮红齐全；背包是卡其色。
- Moflow 是淡蓝毛绒圆团、三撮呆毛、粉腮红；无鸟嘴、翅膀和爱心。同景同距离身高约为 Airing 的 1/2。
- 每格左上有 1–2 行黑色手写旁白；对白逐字正确，只用一根小短线指向说话人，无对白框。
- 修正错字和角色漂移后，才进入 README 的草稿与预览流程。角色设定图本身使用三视图与表情布局，不套用漫画四格和旁白规则。
