# 角色设定图来源与生成提示词

日期：2026-10-18。使用内置 `image_gen` 参考图生成与局部修订，未使用 CLI/API 备用方式。三张最终图均为 1254×1254 PNG。

## 来源与取舍

本机没有找到 `~/Downloads/comics-redraw/`，在可访问的代码目录与 Spotlight 索引中也未找到重画提示词。因此以下是本次角色设定图的生成提示词，不是 No.1–17 原重画提示词的恢复稿。

分支基于 `82d9af060`，已包含 `affb739817f72aeb2ed2aa94b215fbcf42a74e24`。仅通过公开 URL 下载参考，未运行发布、替换、R2 上传或数据库写入命令。

| 本地参考 | 公开来源 | 用途 |
|---|---|---|
| `sources/airing-avatar-hd.png` | [高清头像](https://r2.airingdeng.com/avatars/airing/48-doodle-beret-bear-b791aabf77d9.png) | 白脸、点眼、ω 嘴、橙腮红、贝雷帽与领巾；与仓库 `src/assets/airing-avatar-48.png` 同一角色 |
| `sources/no02-v2.webp` | [No.2 v2](https://r2.airingdeng.com/strip/7c68dc99-9956-44ae-8020-904474d470a7/v2/strip.webp) | 两人身份、颗粒笔触、断续黑线、场景与对白 |
| `sources/no09-v2.webp` | [No.9 v2](https://r2.airingdeng.com/strip/9976bc6d-9d0f-4bb9-88cd-41028806850f/v2/strip.webp) | Moflow 圆团轮廓、暖光、完整背景、左上旁白 |

固定设定优先于参考漫画中的偶发差异：贝雷帽收敛为深蓝，Moflow 每个视角均为三撮呆毛；背包为卡其色，形制可变。设定图为了看清全身采用素纸背景和三视图布局，不适用故事漫画的 2×2 格与旁白规则。两人同框比例图采用同一基线，含帽柄与呆毛的全高约 2:1。

## 1. Airing：`panda.png`

输入顺序：高清头像、No.2 v2、No.9 v2。

```text
Use case: stylized-concept. Generate one polished canonical character model sheet for Airing, the SAME panda/bear character as image 1 avatar and images 2/3 comics. The images are identity and drawing-medium references, not a collage to reproduce. Square 1:1 large high-resolution canvas. Colored pencil + wax crayon hand-drawn chibi, deliberately broken slightly scratchy black outlines, visible grainy color strokes on warm ivory paper. NOT watercolor, not ink wash, no vector smoothness. Character MUST have a very large round pure white face WITHOUT black eye patches, two small solid black dot eyes, omega-shaped ω mouth, orange oval cheeks with a few short dark hatch marks, round black ears, dark navy-blue beret with short stem ALWAYS worn, orange triangular neckerchief ALWAYS worn, short chubby body with black arms and legs and white belly, khaki backpack with shoulder straps and flap. Backpack can be simple but clearly a backpack, not only a side handbag. Match the facial simplicity and shape of avatar exactly; slightly richer pencil texture like comic references. Layout: title at top exactly 'Airing · 角色设定'. Upper two-thirds has three equally scaled COMPLETE standing full-body orthographic views on a shared baseline, labeled '正面', '侧面', '背面'; profile is true side view, rear shows backpack and back of hat/ears and scarf tie. Nothing cropped, paws and hat stem visible. Lower section has three large head-and-neck expression studies, labeled '开心', '惊讶', '困倦'. Each expression retains beret, scarf, orange cheeks, and the same round face; calm/happy uses dot eyes and omega mouth, surprise allows small open mouth, sleepy allows closed curved eyelids. Keep each expression unmistakably same identity. No other characters, no hearts, no black eye patches. One restrained warm paper background and soft ground shadows for readability, no narrative panels or busy scenery because this is a production turnaround sheet, not an episode. All labels readable black handwritten Chinese, no bubbles. No invented extra notes or logos. Supply the finished sheet.
```

原输出帽色偏亮，以上一步输出为唯一输入执行修订，最终保存为 `panda.png`：

```text
Use case: precise-object-edit. Change ONLY the beret color in ALL SIX drawings of this exact Airing model sheet. The blue berets are currently bright cobalt. They MUST instead be DARK NAVY BLUE (main pigment approximately #203B63 / #243E64), with restrained lighter navy colored-pencil streaks, NOT bright cobalt or cyan. Keep the beret silhouettes, little stems, grainy wax crayon texture and broken black outline identical. Preserve all other content, positions and sizing exactly: large white face without eye patches, black dot eyes, omega ω mouth, orange oval cheeks, black ears, orange triangular scarf, khaki backpack and shoulder straps, black limbs, white belly, three full-body front/side/back views, three lower expressions and their Chinese labels, title, ivory paper and ground shadows. No new details, no extra characters, no hearts. Keep 1:1 square.
```

## 2. Moflow：`moflow-ink.png`

输入顺序：No.2 v2、No.9 v2、Airing 首次输出（借鉴版式与笔触）。

```text
Use case: stylized-concept. Generate ONE canonical character model sheet for Moflow, the little PALE BLUE ROUND FLUFFY BLOB from reference comic images 1 and 2. Reference 3 is the companion's model sheet, use it for consistent presentation and pencil/crayon drawing medium, do not include the panda. Square 1:1 high-resolution image. Intentionally broken black hand-drawn outlines with colored-pencil and wax-crayon texture and visible grainy strokes on warm ivory paper. NO watercolor/ink wash, not vector, not 3D. Canonical Moflow: small round plush dumpling/spherical blob, pastel pale-blue fur all over, gently scalloped fuzzy perimeter; exactly THREE short separate feather-shaped tufts of hair on crown, black DOT eyes with a tiny white highlight inside each dot (not big anime eyes), light pink circular cheek blush, tiny mouth, optional tiny rounded hands, small bottom nubs consistent with reference. BODY IS ROUND, not a teardrop with tall pointed head, not a bird. NO wings, NO beak, NO tail feathers, NO heart anywhere, no held object or clothing. Moflow's entire canonical height is about half of Airing including tufts; don't draw Airing on this sheet. Layout matches companion's sheet: top title exactly 'Moflow · 角色设定'. Upper two-thirds: THREE equally scaled complete full-body standing views aligned on one baseline, each with exactly three hair tufts: front view labeled '正面', TRUE side view labeled '侧面' with just one visible dot eye and one cheek and same round volume, back view labeled '背面' showing round pale blue fur and three tufts, no face on back. No cropping. Lower third: three expression studies same character, all with three tufts and pink cheeks, labeled '开心', '惊讶', '困倦'. Happy = tiny delighted open mouth, surprise = tiny round open mouth and slightly raised hands, sleepy = closed tiny curved eyelids and tiny relaxed mouth. No tears or hearts. Soft ground shadows, restrained warm paper background for production readability. Every label black handwritten Chinese; no speech bubbles, no extra explanatory notes. Deliver a clean usable model sheet.
```

原输出部分视角只有两撮呆毛，以上一步输出为唯一输入执行修订，最终保存为 `moflow-ink.png`：

```text
Use case: precise-object-edit. Edit this exact Moflow model sheet with ONE correction only: in ALL SIX drawings, the hair at the top MUST be EXACTLY THREE clearly separately countable rounded feather-shaped tufts (three rounded lobes, not two). The side and back drawings at top already have a readable three-lobe tuft; make the front drawing and all three bottom expressions equally clearly THREE lobes. Keep the character round with pale blue fluffy body, tiny hands/nubs, dot eyes with small white highlights, pink cheeks, tiny mouth; keep every pose, expression, label, size, title, paper background, pencil/crayon grain and broken black outlines unchanged. No bird wings, beak, tail or hearts. Do not add extra characters or notes. Preserve the same square 1:1 full sheet layout.
```

## 3. 身高比：`character-height.png`

输入顺序：最终 Airing 设定图、最终 Moflow 设定图、No.2 v2。

```text
Use case: stylized-concept. Create one canonical TWO CHARACTER HEIGHT COMPARISON illustration, 1:1 square, colored pencil and wax crayon on warm ivory paper, visibly grainy strokes and deliberately broken black outlines. Reproduce EXACTLY the identities from character sheets image 1 (Airing) and image 2 (Moflow); image 3 is a texture/mood reference only. Clean model reference composition, not four comic panels. Title at top exactly 'Airing 与 Moflow · 身高比'. Show only ONE Airing and ONE Moflow, both complete full-body FRONT views, standing SIDE BY SIDE on the SAME clearly drawn horizontal ground baseline in the lower half of page. Airing on left; Moflow on right. Airing large white round face, NO black eye patches, small solid black dot eyes, omega ω mouth, orange oval cheeks with short dark hatch marks, black round ears, DARK NAVY beret (#203B63, NOT bright blue) with tiny stem, orange triangular scarf, black limbs and white belly, short chubby shape, visible khaki backpack straps and side. Moflow pale blue spherical fluffy dumpling with exactly THREE clearly separately visible short rounded feather-shaped hair tufts, tiny black dot eyes with white highlights, pink cheeks, tiny mouth and small rounded hands/nubs. Moflow is NOT a bird: no wings, no beak, no tail, no hearts. Precise visual ratio: Airing from floor to top of hat stem = 2 height units; Moflow from same floor to top of three tufts = 1 height unit. So Moflow tuft tips meet exactly the horizontal halfway point between Airing's floor and hat stem. Use two thin lightly penciled horizontal guide lines, one at Airing hat stem, one at Moflow tuft top, and the shared ground line, with a slender simple ruler at far right marking '2', '1', '0' respectively, in black handwriting. Names under figures exactly 'Airing' and 'Moflow'. One bottom handwritten caption exactly '身高约 2 : 1（含帽柄与呆毛）'. No overlapping poses or perspective foreshortening: both face camera on one plane. Readable margins, no cropped feet or tufts, restrained soft ground shadows, no environmental scenery or extraneous items.
```

## 验收记录

- 目视检查三张最终图：两人各有正、侧、背全身与三种表情；Airing 无黑眼圈，帽子均为带柄深蓝，领巾橙色；Moflow 六个视角/表情均为三撮呆毛，无鸟形、翅膀或爱心。
- 同框图采用共同基线与 0/1/2 刻度，Moflow 全高约为 Airing 的一半。
- 最终三张 PNG 已按字节复制到桌面目录；提交前核对文件尺寸、文件签名与桌面副本 SHA-256，并检查文档参考路径。
- 本次只更新工作台文档与本地参考图，不改已发布漫画、R2 对象或漫画数据。
