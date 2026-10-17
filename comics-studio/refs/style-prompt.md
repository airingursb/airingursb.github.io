# Comics Style Prompt — 彩铅与蜡笔 Q 版固定设定

这是以后漫画的固定风格前缀，与 `../PROMPT.md`、`panda.png`、`moflow-ink.png`、`character-height.png` 一起使用。角色设定图用于身份与比例，`sources/no02-v2.webp`、`sources/no09-v2.webp` 用于笔触、背景与暖光；不要把设定图的素纸底当成漫画背景。

## 可直接粘贴的固定前缀

```text
OUTPUT: One square 1:1 image, exactly four panels in a 2×2 grid with narrow ivory gutters. Read top-left, top-right, bottom-left, bottom-right. No.17 is a historical 3:2 landscape exception, not the template for new strips.

STYLE: Hand-drawn chibi characters in colored pencil + wax crayon. Deliberately broken black outlines, scratchy hand pressure, visibly grainy layered color and paper texture. Warm light and complete detailed environments in every panel: rooms, streets or landscapes with depth, furnishings and everyday objects. Maintain readable lettering areas. Avoid ink wash, blank minimalist backdrops, smooth vector fills, 3D and photographic rendering.

AIRING: Same identity as the beret avatar. Large round white face, no black eye patches; two small black-dot eyes, omega-shaped ω mouth, orange oval cheek blush, black round ears. Always a dark navy-blue beret with a little stem and an orange triangular neckerchief. Short chubby body, black arms/legs, white belly. Khaki backpack; its construction can change, its color and the character's identity cannot. Closed eyelids or small open mouth are allowed for expressions; the facial design stays constant.

MOFLOW: AI companion, pale-blue fluffy round dumpling/blob, about 1/2 Airing's height at equal distance from camera. Exactly three short feather-shaped hair tufts, black-dot eyes with tiny white highlights, pink cheeks, tiny mouth; optional small rounded hands. No bird anatomy, beak, wings, tail feathers, hearts or heart-holding. The body is round, not a tall teardrop. The hair tufts do not turn Moflow into a bird.

LETTERING: Chinese rendered verbatim in black handwriting. Each panel has one or two lines of narration at its upper-left corner, with no pointer. Dialogue is black handwritten text near the speaker, with only ONE small short line pointing toward the speaker per utterance. No dialogue boxes, enclosed speech bubbles, balloon outlines, arrowheads or long tails. No invented words. Dialogue may be absent if scripted; upper-left narration remains in all four panels. Episode title stays in metadata outside the artwork.

CONSISTENCY: Follow panda.png and moflow-ink.png for front/profile/back silhouettes, accessories and expression vocabulary; follow character-height.png for the shared-ground 2:1 height ratio, including Airing's hat stem and Moflow's tufts. Keep both characters consistent across panels. These explicit fixed settings override incidental differences in historical strips.
```

## 固定识别点

| 项目 | 不可漂移的设定 |
|---|---|
| 画风 | 彩铅 + 蜡笔质感手绘 Q 版，断续黑线、颗粒上色、完整背景与暖光 |
| Airing 脸 | 大圆白脸、无黑眼圈、小黑点眼睛、ω 形嘴、橙色椭圆腮红、黑耳朵 |
| Airing 配件 | 必戴深蓝带柄贝雷帽、橙色三角领巾；卡其背包款式可换 |
| Airing 身体 | 矮胖，黑色四肢、白肚子 |
| Moflow | 淡蓝毛绒圆团，头顶 3 撮羽毛状呆毛、带高光黑点眼、粉腮红、小嘴，可有小手 |
| Moflow 禁项 | 不画鸟形、鸟嘴、翅膀，不带或抱爱心 |
| 身高比 | 同景同距离 Airing : Moflow 约 2 : 1，比较含帽柄与呆毛的全高 |
| 中文 | 黑色手写字；每格左上 1–2 行旁白，对白只用一根小短线指向说话人，无对白框 |
| 画幅 | 1:1 正方形、2×2 四格；No.17 的 3:2 横版仅为历史例外 |

角色设定图本身使用正、侧、背全身三视图与三种表情，另有同框身高比图，因此不适用故事四格、完整场景和逐格旁白要求。后续漫画才必须使用上述完整输出格式。参考来源与本次生图提示词见 `generation-prompts.md`。
