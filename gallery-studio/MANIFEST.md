# Gallery Studio — Asset Manifest

> 共 **69 个 sprite**（A–F 第一批 34，G–J 第二批 22，K–L 第三批"自然感" 9，M 第四批"中庭升级" 4）。挨个生成，生成完把对应行 `[ ]` 改 `[x]` 并 commit。
> 每个 prompt = `STYLE.md 整段` + 下面 `**Prompt:**` 后面那段。

总览：

| Series | 类别 | 数量 | 用途 |
|---|---|---|---|
| A | Paintings — 馆藏画作 | 14 | 每件 immersive 长文一幅 Saul Bass 海报 |
| B | Centerpieces — 焦点作品 | 1 | 中庭核心展品 |
| C | Architecture — 建筑构件 | 8 | 柱、雕像、长椅、信息台、门、画框灯、绒绳栏杆 |
| D | NPC — 馆员 | 4 | 导览员 4 方向 |
| E | Tiles — 地板 | 3 | 大理石变体 |
| F | Decorations — 装饰小品 | 4 | 植物、横幅、铭牌、垃圾桶 |
| G | Zone Floors — 分区地板 | 4 | 每个 wing 一种特色地砖 |
| H | Zone Murals — 分区壁画 | 4 | 每个 wing 入口墙面大壁画 |
| I | Refined Props — 精致小物 | 10 | 真博物馆的细节家具 |
| J | Nature Touches — 自然元素 | 4 | 蕨类、猫、鸽子、地毯 |
| K | Natural Floors — 自然地砖 | 4 | 草地 / 小溪 / 石板路 / 苔藓 |
| L | Garden Props — 园林小品 | 5 | 石椅 / 喷泉 / 锦鲤池 / 葡萄架 / 盆景 |
| M | Rotunda Marble — 中庭大理石 | 4 | 人字拼花 / 中央徽章 / 斜纹 / 角隅花饰 |

---

## A · Paintings — 馆藏画作（14 幅 · 512×512 PNG · 透明背景）

> 每幅画 = 一篇 immersive 长文的视觉提炼。**ONE metaphor, ONE moment.**

### A01 — Chromium Renderer  `[x]`
- **File:** `output/paintings/A01-chromium-renderer.png`
- **Source:** `/immersive/chromium-renderer/` —「字节码到像素的一生」
- **Size:** 512×512 px
- **Metaphor:** A vertical pipeline of stylized stages distills bytecode into a single luminous pixel at the end.
- **Prompt:** A tall vertical pipeline composed of 4 stacked geometric chambers (rectangles, parallelograms) on the cream background. Inside the topmost chamber, a tight cluster of small ink dots (raw bytecode). Each successive chamber transforms the dots into larger flat shapes — first into rectangles, then into vermilion glyphs, then into teal abstract grid lines. From the bottom of the lowest chamber, ONE single large mustard-colored square emerges and sits prominently in the lower negative space — this is the "pixel". Composition is asymmetric (pipeline slightly left of center), negative space dominates the lower right.

### A02 — CSS Engine Cascade  `[x]`
- **File:** `output/paintings/A02-css-engine.png`
- **Source:** `/immersive/css-engine/` —「一段 CSS 的一生」
- **Metaphor:** A literal cascade — a single ink stream from the top splits into a vermilion waterfall of styled rules pooling into a teal final layout box.
- **Prompt:** From the top edge, a single thick ink line descends and at the midpoint breaks into a stylized "cascade" — three vermilion angular strokes pouring downward and to the right like a waterfall. At the bottom, the strokes collect into a single teal rectangle (the rendered element) sitting in the lower-right. Cream background dominates the upper-left as negative space.

### A03 — Garbage Collection · 11 GC Families  `[x]`
- **File:** `output/paintings/A03-gc.png`
- **Source:** `/immersive/gc/` —「一段内存的多重死亡 — 11 个 GC 家族的家谱」
- **Metaphor:** A graveyard — 11 stylized ink tombstones in irregular rows on a cream field, one prominent vermilion tombstone in the front (the "newly dead" object). A teal sweeper-broom silhouette enters from the right edge.
- **Prompt:** A field of 11 simple geometric tombstone shapes (flat-topped or rounded-top rectangles) arranged in a loose grid across the cream background — most are ink black, one in the front-center is vermilion. From the right edge, a teal stylized broom shape (a triangle + line) enters partially, suggesting sweeping motion. No outlines around the tombstones — pure silhouette. Ground line is a single mustard horizontal stroke.

### A04 — Helio · High-Performance Mini-Game Container  `[x]`
- **File:** `output/paintings/A04-helio.png`
- **Source:** `/immersive/helio/` —「Helio 高性能小游戏容器」
- **Metaphor:** Helio = sun. A geometric sun radiating 8 rays, with a tiny abstract "controller" in the center.
- **Prompt:** A large mustard circle centered slightly above the canvas middle — the sun. From it radiate 8 vermilion triangle/wedge rays in a symmetric burst. In the center of the sun sits a small ink rectangle with two black dots (an abstract gamepad). Cream background. The lower portion of the canvas is empty negative space with only a single thin teal horizontal "horizon" line.

### A05 — HTTP/3 Request Lifecycle  `[x]`
- **File:** `output/paintings/A05-http3.png`
- **Source:** `/immersive/http3/` —「一次请求的一生」
- **Metaphor:** Three parallel streams (multiplexed) racing rightward — a single paper-airplane silhouette leading them.
- **Prompt:** Three horizontal parallel lanes spanning the full width — top lane vermilion, middle lane teal, bottom lane mustard, each a thick flat band. Inside the middle lane, a single ink-black paper airplane silhouette flies rightward, slightly ahead of the others. Negative cream space above and below the bands. Composition is horizontal — the painting is wide, energetic, directional.

### A06 — 50+ Image Formats  `[x]`
- **File:** `output/paintings/A06-image-formats.png`
- **Source:** `/immersive/image-formats/` —「沉积的像素 — 50+ 图片格式全谱」
- **Metaphor:** Geological strata — horizontal layers of different "pixel textures" stacked like sediment.
- **Prompt:** Six horizontal sedimentary bands stacked from top to bottom, each band a different flat treatment: ink solid, vermilion+cream checkerboard (coarse), pure cream, teal solid, mustard+ink diagonal stripes, ink solid. Each band is irregular in thickness, evoking geological strata. The bands span the full width edge-to-edge. A single tiny vermilion square is embedded in the second-from-top band like a fossil. No outlines, pure flat color blocks.

### A07 — Jank & Stutter · Measuring Smoothness  `[x]`
- **File:** `output/paintings/A07-jank-stutter.png`
- **Source:** `/immersive/jank-stutter/` —「测量「流畅」」
- **Metaphor:** A smooth horizontal ink waveform — interrupted in the middle by ONE jarring vertical vermilion spike.
- **Prompt:** A single thick ink horizontal line stretches across the middle of the canvas — gentle, flat, smooth. At the exact center, the line abruptly spikes vertically upward as a sharp vermilion triangle (a "jank" frame). Cream background. The composition is mostly negative space — the entire piece hinges on that single spike. Below the horizon line, a small teal text-less rectangle (a "frame budget" marker).

### A08 — LLM Inference Life  `[x]`
- **File:** `output/paintings/A08-llm-inference-life.png`
- **Source:** `/immersive/llm-inference-life/` —「一次 LLM 推理的一生 — 28 个站」
- **Metaphor:** A long subway-map line with many tiny ink dots (the 28 stations); at the rightmost terminus, ONE big vermilion dot — the predicted token.
- **Prompt:** A long horizontal ink line crossing the canvas with subtle bends (like a subway map route). Along it sit 27 small ink dots evenly spaced. At the far right terminus, ONE large vermilion circle (~3× the size of the others) marks the final station. Above the route, a thin mustard label-line points to the vermilion dot. Cream background, generous negative space.

### A09 — QuickJS · A Single Line of JS  `[x]`
- **File:** `output/paintings/A09-quickjs.png`
- **Source:** `/immersive/quickjs/` —「一行 JS 的一生 — QuickJS 源码详解」
- **Metaphor:** A single ink line of "code" enters from the left, passes through a geometric "engine" gear, and exits the right as a vermilion arrow.
- **Prompt:** From the left edge, a single thick ink horizontal line enters and bisects the canvas. In the middle, the line passes through a stylized vermilion geometric gear (a circle with 8 trapezoidal teeth — flat, no detail). After the gear, the line continues to the right edge but now changes — it becomes a sharp vermilion arrowhead. Cream background. Above the line, two tiny ink curly braces `{}`-like marks (NOT text — just the geometric shape of braces) bracket the gear.

### A10 — React setState Reconciliation  `[x]`
- **File:** `output/paintings/A10-react-internals.png`
- **Source:** `/immersive/react-internals/` —「一次 setState 的一生」
- **Metaphor:** A pebble dropped into water, ripples propagating outward through a stylized tree of nodes.
- **Prompt:** Top-center: a single ink dot (the setState call). Below it, three concentric expanding semicircular ripples in teal — each slightly fainter (use partial opacity ONLY by using progressively thinner ink stroke, not gradient). The ripples reach a fan of 5 small vermilion squares at the bottom (the components being re-rendered). Cream background. Vertical composition, top-heavy.

### A11 — TLS 1.3 Handshake  `[x]`
- **File:** `output/paintings/A11-tls-handshake.png`
- **Source:** `/immersive/tls-handshake/` —「一次 TLS 握手的一生」
- **Metaphor:** Two geometric hands clasping with a stylized wax-sealed envelope between them. A small mustard key floats above.
- **Prompt:** Two simplified ink-silhouette hands meet at the center — one entering from the lower-left, one from the upper-right — gripping each other. Between their interlocked fingers, a single vermilion envelope shape with a teal circular wax seal at its center. Above the handshake, a small mustard old-fashioned key silhouette floats. Cream background, asymmetric balance.

### A12 — V8 Hot Function Optimization  `[x]`
- **File:** `output/paintings/A12-v8-fast-js.png`
- **Source:** `/immersive/v8-fast-js/` —「JS 极致性能优化 — V8 优化原理」
- **Metaphor:** A rocket-shaped silhouette ascending sharply, leaving a vermilion exhaust trail; small ink gears along the trail.
- **Prompt:** A single ink rocket silhouette (a tall narrow trapezoid + triangular nose) tilted upward-right, ascending from lower-left to upper-right. Behind it, a thick vermilion exhaust band trails diagonally back to the lower-left corner. Along the exhaust trail, four small ink gear circles (no teeth detail, just dotted circles). Negative cream space dominates the upper-right and lower-right.

### A13 — WebAssembly · Rust to SIMD  `[x]`
- **File:** `output/paintings/A13-webassembly.png`
- **Source:** `/immersive/webassembly/` —「从 Rust 到 SIMD」
- **Metaphor:** ONE input line fans out into FOUR parallel output lines — the visual essence of SIMD vectorization.
- **Prompt:** From the left edge, a single thick ink line enters and at the canvas center splits into 4 parallel teal lines that exit the right edge in equal spacing. The split point is marked by a vermilion vertical bar. Above the split, a small mustard angular bracket (like a `<` shape, NOT a text character — just a geometric V) hangs as a marker. Cream background. Strong horizontal composition.

### A14 — WebGPU · 8-Layer Dispatch  `[x]`
- **File:** `output/paintings/A14-webgpu.png`
- **Source:** `/immersive/webgpu/` —「一次 dispatch 的八重翻译」
- **Metaphor:** Eight horizontal slabs stacked in a stair-step (each offset slightly from the one above) — translating through 8 layers.
- **Prompt:** Eight horizontal rectangular slabs stacked vertically with each slab offset slightly to the right of the one above (a leftward stair-step). Top slab is ink, then they alternate: ink, teal, ink, vermilion, ink, mustard, ink, teal. At the bottom-right corner of the stack, a single small mustard arrow points downward-right (the final dispatch output). Cream background.

---

## B · Centerpiece — 中庭焦点（1 幅 · 768×768 PNG · 透明背景）

> 比馆藏画作大、更精致。位于中央圆厅，所有方向能见。

### B01 — Mochi's Sakura Grove  `[x]`
- **File:** `output/centerpieces/B01-grove-sakura.png`
- **Source:** `/nook/inner/mochi-grove/` —「Mochi 的小园子 · 3D 散步」
- **Size:** 768×768 px
- **Metaphor:** A single stylized cherry-blossom branch crossing the canvas diagonally, with one large blossom in full bloom at the focal point.
- **Prompt:** A single ink-black tree branch (silhouette, like a sumi-e brush stroke) enters from the lower-left and arcs diagonally to the upper-right. Along the branch, three blossoms: two smaller vermilion 5-petal blossoms, and ONE large mustard-centered vermilion blossom (~80px diameter) at the focal point upper-right. Behind the branch in the upper-left, a single large flat teal circle suggests the moon. Cream background. Generous negative space — this is the masterpiece of the museum, it must feel breathing-room calm.

---

## C · Architecture — 建筑构件（8 sprite · 透明背景）

> 用于美术馆场景的可放置物件。**isometric / front-facing 都可**，但**必须跟现有 nook tileset 比例自洽**（nook 用 16×16 tile，所以这些 sprite 也按 tile 数算大小）。

### C01 — Marble Column  `[x]`
- **File:** `output/architecture/C01-marble-column.png`
- **Size:** 64×192 px (4 tiles tall, 4 tiles wide for the capital)
- **Theme:** 古典科林斯柱 / 罗马柱 — 美术馆门廊感
- **Prompt:** A single front-facing classical marble column drawn in flat Saul Bass style. Tapered cream-white shaft with 4 vertical ink fluting lines, a flat ink rectangular base at the bottom (slightly wider), and a stylized capital at the top (a thicker rectangle + a small teal scroll motif on each side). NO 3D shading. Single mustard horizontal accent line just below the capital. No outlines on the cream shaft — only the fluting lines and base are ink.

### C02 — Wooden Bench (Museum)  `[x]`
- **File:** `output/architecture/C02-bench.png`
- **Size:** 128×48 px
- **Prompt:** A front-facing wooden museum bench drawn in flat geometric style. Long horizontal seat (ink-black silhouette flat slab), 4 thin vertical leg rectangles in vermilion, a single mustard horizontal accent stripe along the seat's front edge suggesting a brass rivet line. No curves, no shading.

### C03 — Information Desk  `[x]`
- **File:** `output/architecture/C03-info-desk.png`
- **Size:** 128×96 px
- **Theme:** 美术馆入口的接待台
- **Prompt:** A front-facing reception desk in flat Saul Bass style. A horizontal teal rectangular counter (the desk body) with a vermilion thick top edge (the counter top). Behind/above, a tall ink-silhouette panel with a stylized mustard "i" information symbol (a circle + a vertical bar geometry, NOT a text letter — but a pure geometric "i" mark made of a dot and a bar). No 3D.

### C04 — Greco-Roman Statue Silhouette  `[x]`
- **File:** `output/architecture/C04-statue.png`
- **Size:** 96×160 px
- **Theme:** 站在台座上的古典雕像剪影，美术馆 hallway 标志物
- **Prompt:** A front-facing silhouette of a classical Greek statue (think of a draped figure with one arm extended) standing on a rectangular pedestal. The statue figure itself is a single solid cream-white silhouette (paper white, so it reads as marble against any background). The pedestal beneath is an ink-black rectangular block with a thin mustard band at the top edge. The statue has NO facial details, NO interior lines — it's pure silhouette, like a Saul Bass stencil.

### C05 — Doorway Arch (zone-to-zone door)  `[x]`
- **File:** `output/architecture/C05-arch-door.png`
- **Size:** 64×96 px
- **Theme:** 展区之间的圆拱门
- **Prompt:** A front-facing classical arched doorway in flat style. Cream rectangular opening with a semicircular cream top, framed by an ink-black thick outline (the doorframe). On either side of the doorway base, a small teal rectangle (the doorstops). At the top of the arch, a single small mustard keystone (a trapezoid shape). The doorway opening itself is transparent (the cream is just the doorframe interior border, the actual opening is transparent so it can sit on any wall).

### C06 — Glass Display Case  `[x]`
- **File:** `output/architecture/C06-display-case.png`
- **Size:** 96×112 px
- **Theme:** 展品玻璃柜（放小型雕塑或装置）
- **Prompt:** A front-facing rectangular display case in flat style. The case has a thin ink-black frame outlining a cream-white interior. Inside the case, a single stylized vermilion abstract sculpture (a vertical pyramid + a sphere on top — a Brancusi-esque silhouette). The case sits on a teal rectangular pedestal base with a mustard accent stripe at the top.

### C07 — Brass Picture Light Fixture  `[x]`
- **File:** `output/architecture/C07-picture-light.png`
- **Size:** 48×32 px
- **Theme:** 挂在每幅画上方的小铜灯
- **Prompt:** A front-facing brass museum picture light in flat geometric style. A short ink-black vertical arm extending down from the top, a horizontal mustard trapezoidal shade (wider at the bottom than top), and beneath the shade, a flat cream-yellow horizontal beam (the cast light). No 3D, no bevels.

### C08 — Velvet Rope Barrier Post  `[x]`
- **File:** `output/architecture/C08-rope-barrier.png`
- **Size:** 32×64 px
- **Theme:** 不让靠太近的红绒绳栏杆
- **Prompt:** A front-facing single velvet-rope stanchion post in flat style. A vertical mustard cylindrical post with a slightly wider top knob (a small mustard circle). At the top of the post, a vermilion thick rope curve extends to the right edge (suggesting it continues to another post). The post sits on a small ink-black flat circular base.

---

## D · NPC — 馆员（4 sprite · 64×64 PNG · 透明背景）

> 馆内导览员，一个端庄的西装/马甲打扮人物，4 个方向待机帧。**比例与 nook 现有 bear/cat sprite 一致**（角色高度约占 sprite 的 50px，剩 14px 留给阴影/空隙）。

### D01 — Docent Idle · Facing Down  `[x]`
- **File:** `output/npc/D01-docent-down.png`
- **Size:** 64×64 px
- **Prompt:** A pixel-art-style front-facing museum docent character in Saul Bass flat color style. A dignified middle-aged figure, ink-black suit silhouette with a cream-white shirt rectangle showing at the collar, a single vermilion thin bowtie. Head is a flat circular cream shape with NO facial features (true Bass silhouette style). The figure stands centered, holding a small mustard clipboard in their right hand. Character height ~50px, leaving margin around. Pure flat color, no shading, no outlines around the silhouette.

### D02 — Docent Idle · Facing Up  `[x]`
- **File:** `output/npc/D02-docent-up.png`
- **Size:** 64×64 px
- **Prompt:** Same character as D01 but facing away from the camera (back view). Ink-black suit silhouette from behind, head is a flat circular cream shape. NO clipboard visible from this angle. NO facial features. Otherwise identical proportions and palette.

### D03 — Docent Idle · Facing Left  `[x]`
- **File:** `output/npc/D03-docent-left.png`
- **Size:** 64×64 px
- **Prompt:** Same character as D01 but in profile facing left. Ink-black suit silhouette in side-view, a small cream collar visible at the front (left side), the vermilion bowtie shows at the neck. Head is a cream profile silhouette (rounded rectangle suggesting head + nose tip pointing left). Clipboard held in front. Pure silhouette style.

### D04 — Docent Idle · Facing Right  `[x]`
- **File:** `output/npc/D04-docent-right.png`
- **Size:** 64×64 px
- **Prompt:** Mirror of D03 — same character in profile facing right.

---

## E · Tiles — 地板瓦片（3 sprite · 128×128 PNG · 透明背景）

> 美术馆地面铺设。**rhombus 形（同 world-studio A 系列），seamless tileable**。

### E01 — Pale Marble Tile (base)  `[x]`
- **File:** `output/tiles/E01-marble-pale.png`
- **Size:** 128×128 px
- **Prompt:** A single seamless rhombus marble floor tile in flat Saul Bass style. Cream-white solid base with 2-3 subtle ink-line veins (irregular curved lines, thin, suggesting marble veining) running diagonally across the tile. NO 3D shading, NO gradients — just cream + thin ink lines. Must tile seamlessly with copies of itself. Diamond-shape only (top-left and other corners transparent).

### E02 — Veined Marble Tile (accent)  `[x]`
- **File:** `output/tiles/E02-marble-veined.png`
- **Size:** 128×128 px
- **Prompt:** Same rhombus shape as E01. More pronounced ink veining — 4-5 connecting curved lines forming a small branching pattern in the center, with one teal-tinted vein among the ink ones. Used sparingly mixed with E01 for visual interest. Tiles seamlessly with E01.

### E03 — Inlaid Border Tile  `[x]`
- **File:** `output/tiles/E03-marble-border.png`
- **Size:** 128×128 px
- **Prompt:** A rhombus marble tile with a thick mustard geometric border pattern around the edge (like a Greek key / meander border, simplified to 4 right-angle "key" units around each side). The center is cream. Used to outline display zones or the rotunda. Tiles seamlessly when placed in a chain along an edge.

---

## F · Decorations — 装饰小品（4 sprite · 透明背景）

### F01 — Tall Decorative Plant (Ficus)  `[x]`
- **File:** `output/decorations/F01-plant-ficus.png`
- **Size:** 48×112 px
- **Theme:** 美术馆角落里的高大盆栽
- **Prompt:** A front-facing tall ficus plant in flat Saul Bass style. The pot is an ink-black trapezoidal silhouette at the bottom with a mustard horizontal rim band. From the pot rises a thick ink-black trunk, and atop the trunk, a single large flat teal silhouette of overlapping leaves (a stylized blob made of 3-4 large rounded teal shapes). NO leaf veins, no 3D, pure silhouette.

### F02 — Exhibition Banner  `[x]`
- **File:** `output/decorations/F02-banner.png`
- **Size:** 96×144 px
- **Theme:** 高墙上悬挂的长方形展览横幅，宣布"特展"
- **Prompt:** A vertical hanging banner with a thin ink-black hanging rod at the top. The banner itself is vermilion solid color. On the banner, a single large flat cream geometric symbol (an abstract eye made of a horizontal lens-shape with a circle inside — the iconic "exhibit" symbol). Below the symbol, three thin mustard horizontal stripes evenly spaced. No text. The bottom edge of the banner has a slight inverted-V notch (banner tail shape).

### F03 — Brass Title Plaque  `[x]`
- **File:** `output/decorations/F03-plaque.png`
- **Size:** 64×24 px
- **Theme:** 挂在每幅画下方的小铜牌（**纯装饰**，不写真实标题；游戏内会程序化叠加标题文字）
- **Prompt:** A small rectangular brass plaque in flat style. Mustard-colored flat rectangle with a thin ink-black border. Two small ink-black screw-head dots in the top corners. Surface is solid mustard — completely blank (NO TEXT). The plaque should look "ready to be engraved" — the actual title appears as a Phaser text overlay in-game.

### F04 — Museum Trash Bin  `[x]`
- **File:** `output/decorations/F04-trash-bin.png`
- **Size:** 32×48 px
- **Theme:** 别有腔调的金属垃圾桶
- **Prompt:** A front-facing slim cylindrical museum trash bin in flat Saul Bass style. An ink-black tall trapezoidal silhouette (slightly wider at the top), with a mustard horizontal band at the top rim and another at the bottom base. A single small teal slot in the center (the trash slot). Minimalist, dignified.

---

## G · Zone Floors — 分区地板（4 sprite · 128×128 PNG · 透明背景 · rhombus）

> 每个 wing 一种地砖纹理，强化分区的"主题感"。**rhombus 形（同 E 系列），seamless tileable**。
> 风格仍是 Saul Bass cream/ink/vermilion/teal/mustard 五色 — 不要写实材质。

### G01 — Networks Floor (北厅)  `[x]`
- **File:** `output/tiles/G01-floor-networks.png`
- **Size:** 128×128 px
- **Theme:** 北厅 Networks — 服务器机房感
- **Prompt:** A single seamless rhombus floor tile in flat Saul Bass style. Cream-white base with a subtle stylized circuit-board pattern: a thin ink-line hexagonal mesh covering the diamond, with 3-4 small vermilion square "nodes" at hex intersections. NO 3D, NO shading. Must tile seamlessly with copies. Diamond-shape only.

### G02 — Web Internals Floor (东翼)  `[x]`
- **File:** `output/tiles/G02-floor-internals.png`
- **Size:** 128×128 px
- **Theme:** 东翼 Web Internals — 硅谷博物馆 / terrazzo 感
- **Prompt:** A single seamless rhombus floor tile in flat Saul Bass style. Cream base scattered with irregular flat chips — small vermilion polygons (~3-4), teal triangles (~2-3), mustard rectangles (~2) of varying sizes randomly placed across the diamond like terrazzo aggregate. NO 3D, NO outlines on the chips. Tiles seamlessly.

### G03 — Performance Floor (西翼)  `[x]`
- **File:** `output/tiles/G03-floor-performance.png`
- **Size:** 128×128 px
- **Theme:** 西翼 Performance/Memory — 精密计时 / 怀表机械感
- **Prompt:** A single seamless rhombus floor tile in flat Saul Bass style. Cream base with a single large stylized ink-black gear silhouette filling ~60% of the tile center (8 trapezoidal teeth, flat geometry, no inner detail). One mustard tiny clock-hand silhouette overlaid on the gear's center. Tiles seamlessly when adjacent (gear edges align across tile borders to suggest a clockwork machinery floor).

### G04 — Comics Floor (南厅)  `[x]`
- **File:** `output/tiles/G04-floor-comics.png`
- **Size:** 128×128 px
- **Theme:** 南厅 Comics pavilion — 书坊 / 漫画分镜感
- **Prompt:** A single seamless rhombus floor tile in flat Saul Bass style. Cream base divided by a thin ink-black "comic panel border" cross (one horizontal line + one vertical line through the diamond center, both 2-3 px thick). Each of the 4 quadrants has a tiny different colored mark: vermilion dot top, teal square right, mustard triangle bottom, ink slash left. Tiles seamlessly into a continuous "comic page grid" floor.

---

## H · Zone Murals — 分区壁画（4 sprite · 256×128 PNG · 透明背景）

> 每个 wing 入口墙面挂一幅大壁画，强化主题。比 painting (A 系列) 更"远观/装饰"，less metaphor more pattern。
> 尺寸是横向 2:1（贴在墙上的横幅画）。

### H01 — Networks Mural (卫星 + 群星)  `[x]`
- **File:** `output/murals/H01-mural-networks.png`
- **Size:** 256×128 px
- **Theme:** 北厅 Networks — 卫星弧线 + 数据流 + 星群
- **Prompt:** A horizontal mural in flat Saul Bass style on cream background. Three teal sweeping arcs across the canvas (suggesting orbital paths or signal waves), each ~256 px wide and slightly offset vertically. At the apex of the middle arc, a single mustard satellite silhouette (a small rectangle with two perpendicular solar-panel wings). Scattered across the cream space, 12 tiny ink dots (stars). Bottom-right, ONE large vermilion dot (the ground-station receiver). Pure flat color, no outlines.

### H02 — Web Internals Mural (DOM tree 几何)  `[x]`
- **File:** `output/murals/H02-mural-internals.png`
- **Size:** 256×128 px
- **Theme:** 东翼 Web Internals — 抽象 DOM 树
- **Prompt:** A horizontal mural in flat Saul Bass style on cream background. From the top-center, a single ink-black "root node" rectangle. From it, three ink lines descend to a row of 3 vermilion teal-bordered rectangles (mid-tier nodes). From each of those, 2 lines descend to mustard small squares (leaf nodes — total 6 leaves). The tree fills the canvas. No outlines beyond the nodes themselves. The composition is symmetric, dignified.

### H03 — Performance Mural (frame timeline)  `[x]`
- **File:** `output/murals/H03-mural-performance.png`
- **Size:** 256×128 px
- **Theme:** 西翼 Performance — 帧时间线 / 火焰图剖面
- **Prompt:** A horizontal mural in flat Saul Bass style on cream background. A horizontal flame-graph cross-section: from left to right, layered horizontal bars stacked vertically — bottom layer is a single long teal bar (full canvas width), middle layer has 4 ink-black bars of varying widths covering most of the canvas, top layer has 8 short vermilion bars scattered above the ink ones, with ONE thin tall mustard spike at the right edge (the slow function). NO labels, NO numbers — pure geometric pattern.

### H04 — Comics Mural (panda + speech bubbles)  `[x]`
- **File:** `output/murals/H04-mural-comics.png`
- **Size:** 256×128 px
- **Theme:** 南厅 Comics — 熊猫剪影 + 漫画对话框雨
- **Prompt:** A horizontal mural in flat Saul Bass style on cream background. A single large ink-black panda silhouette (a chubby round panda body with characteristic ink ears, NO facial features) sitting centered-left at the bottom of the canvas. Above the panda, scattered across the upper canvas, 8 vermilion stylized speech-bubble shapes (rounded rectangles with small triangular tails pointing down toward the panda) of varying sizes. One mustard speech bubble is the largest. NO text inside bubbles.

---

## I · Refined Props — 精致小物（10 sprite · 透明背景）

> 真博物馆里能见到的小家具/导览品，每个都要"一眼就懂"。

### I01 — Guidebook Stand  `[x]`
- **File:** `output/props/I01-guidebook-stand.png`
- **Size:** 32×64 px
- **Theme:** 展厅介绍小立牌 / 导览册支架
- **Prompt:** A front-facing freestanding guidebook stand in flat Saul Bass style. A thin ink-black vertical pole, atop which a tilted cream rectangular pamphlet display (tilted ~15 degrees). On the pamphlet, three thin vermilion horizontal lines (suggesting text rows). Below the pamphlet, a mustard small rectangle (the cover title bar). At the base of the pole, an ink-black flat circular foot.

### I02 — Acoustic Wall Panel (墙角声学吸音板)  `[x]`
- **File:** `output/props/I02-acoustic-panel.png`
- **Size:** 64×96 px
- **Theme:** 墙角的方形声学吸音板（高雅版），4 个并排
- **Prompt:** A front-facing wall-mounted acoustic panel in flat Saul Bass style. A vertical cream rectangle with an evenly spaced 4×6 grid of small ink-black dots (the acoustic perforations). At the top of the panel, a thin mustard horizontal accent stripe. Surrounding the panel, a thin teal frame border. Minimalist, geometric.

### I03 — Floor Grate (黄铜出风格栅)  `[x]`
- **File:** `output/props/I03-floor-grate.png`
- **Size:** 64×32 px
- **Theme:** 地面的金属通风格栅
- **Prompt:** A top-down view of a flat rectangular brass floor grate in flat Saul Bass style. Mustard solid rectangle as the frame, with 6 parallel ink-black thin horizontal slits cutting through the center (the grate vents). Four tiny vermilion screws at the corners. NO 3D, pure flat.

### I04 — Electric Wall Candle (壁烛灯)  `[x]`
- **File:** `output/props/I04-electric-candle.png`
- **Size:** 32×64 px
- **Theme:** 墙角的电子壁烛（装饰感强），4 个角放
- **Prompt:** A front-facing wall-mounted electric candle sconce in flat Saul Bass style. A vertical cream candle silhouette (a tall narrow rectangle) atop a small mustard semicircular wall mount. At the candle tip, a single small vermilion flat teardrop flame shape (no flicker, pure silhouette). A thin teal vertical line behind the candle suggests the wall bracket stem. Dignified, warm.

### I05 — Museum Map Board (信息台旁的大地图板)  `[x]`
- **File:** `output/props/I05-museum-map-board.png`
- **Size:** 96×112 px
- **Theme:** 进门的大型平面图展示板
- **Prompt:** A front-facing large standing map display board in flat Saul Bass style. A vertical cream rectangle framed by a thick ink-black border (the display panel), mounted on two short ink legs at the bottom. Inside the panel, a stylized cross-shape floor plan: a vermilion central square (rotunda), with 4 mustard rectangular wings extending up/down/left/right. A small teal "YOU ARE HERE" dot on the bottom wing. NO text labels — pure geometric map symbol.

### I06 — Direction Arrow Sign (黄铜箭头方向牌)  `[x]`
- **File:** `output/props/I06-info-arrow-sign.png`
- **Size:** 64×24 px
- **Theme:** 走廊上挂的指路牌
- **Prompt:** A front-facing rectangular brass directional sign in flat Saul Bass style. A horizontal mustard rectangle with a thin ink-black border. On the left half, a single thick ink-black right-pointing arrow (a triangle + rectangular shaft). The right half is blank brass (the room name will be programmatically overlaid). Two small ink screw dots in the corners.

### I07 — Drinking Fountain (不锈钢饮水器)  `[x]`
- **File:** `output/props/I07-water-fountain.png`
- **Size:** 32×64 px
- **Theme:** 墙边的金属饮水器
- **Prompt:** A front-facing wall-mounted drinking fountain in flat Saul Bass style. A vertical cream rectangular silhouette mounted to a teal vertical wall pipe. At the top, a small mustard semicircular basin. Below the basin, a thin ink-black spout. At the front of the basin, a small vermilion press-button. Minimalist sanitary aesthetic.

### I08 — Recycling Bin (垃圾分类桶)  `[x]`
- **File:** `output/props/I08-recycling-bin.png`
- **Size:** 32×48 px
- **Theme:** 配套 F04 trash bin 的回收桶（不同颜色 + 标识）
- **Prompt:** A front-facing slim cylindrical recycling bin in flat Saul Bass style. A teal tall trapezoidal silhouette (slightly wider at the top), with a mustard horizontal band at the top rim and another at the bottom base. A single small vermilion triangular "recycling" arrow trio in the center (3 ink-black arrows forming a triangle). Matches F04 in proportions but teal not ink.

### I09 — Postcard Rack (旋转明信片架)  `[x]`
- **File:** `output/props/I09-postcard-rack.png`
- **Size:** 64×96 px
- **Theme:** 礼品店感的旋转明信片架
- **Prompt:** A front-facing vertical postcard rack in flat Saul Bass style. A central ink-black thin vertical post. Off the post, 3 horizontal cream rectangles stacked vertically (the postcard rows), each with 2 small vermilion postcard rectangles tucked in. The top of the post has a mustard small flat cap. The base is a flat ink-black circle. No 3D — pure silhouette.

### I10 — Coat Hook Row (衣帽钩排)  `[x]`
- **File:** `output/props/I10-coat-hook-row.png`
- **Size:** 96×32 px
- **Theme:** 南厅入口的横排衣帽钩
- **Prompt:** A horizontal wall-mounted coat hook bar in flat Saul Bass style. A cream horizontal flat rectangular bar with 5 small ink-black inverted-U hook silhouettes evenly spaced along it. The bar has a thin mustard accent stripe along its top edge. A vermilion small coat silhouette hangs from the leftmost hook (a tiny triangle shape suggesting a hanging garment). Otherwise just empty hooks. Minimalist horizontal composition.

---

## J · Nature Touches — 自然元素（4 sprite · 透明背景）

> 让美术馆"贴近自然"。植物、小动物、地毯。

### J01 — Large Fern (大蕨类盆栽)  `[x]`
- **File:** `output/nature/J01-fern-large.png`
- **Size:** 80×128 px
- **Theme:** 角落里的大蕨类（比 F01 ficus 更野生）
- **Prompt:** A front-facing large fern plant in flat Saul Bass style. The pot is a teal trapezoidal silhouette at the bottom with a mustard horizontal rim. From the pot rises a cluster of 5-6 large ink-black fern fronds in a fan shape (each frond is a single tapered silhouette with 6-8 small ink-black "leaflet" notches along each edge — feathered silhouette, NOT detailed leaves). NO veins, no 3D. Plant fills upper 70% of the sprite. Wild, organic, ink-bold.

### J02 — Sleeping Cat on Bench (长椅上的睡猫)  `[x]`
- **File:** `output/nature/J02-cat-sleeping.png`
- **Size:** 48×24 px
- **Theme:** 一只蜷缩睡在长椅上的猫
- **Prompt:** A side-view sleeping curled cat silhouette in flat Saul Bass style. A single rounded ink-black blob silhouette (the cat curled in a ball), with a small tail curling around the body. Two tiny ear triangles on top. NO facial features. One small vermilion collar dot at the neck. The cat sprite is meant to be placed on top of the existing C02 bench sprite.

### J03 — Perched Pigeon (拱门顶的鸽子)  `[x]`
- **File:** `output/nature/J03-pigeon-perched.png`
- **Size:** 32×32 px
- **Theme:** 站在拱门顶上的鸽子
- **Prompt:** A side-view perched pigeon silhouette in flat Saul Bass style. A simple ink-black plump bird silhouette (rounded body + small head with tiny beak triangle), facing left. One small mustard leg visible. A small teal accent dot for the eye area (no detail). Sitting on an implied flat ledge. Compact, dignified.

### J04 — Long Floor Runner Rug (长地毯卷)  `[x]`
- **File:** `output/nature/J04-floor-runner.png`
- **Size:** 128×32 px
- **Theme:** 铺在 wing 走廊正中的长形装饰地毯
- **Prompt:** A top-down view of a horizontal rectangular floor runner rug in flat Saul Bass style. A vermilion long rectangle (the rug base), with a thin mustard border running ~3 px inside the edges (the rug binding). Down the center, a simplified geometric pattern: 4 evenly spaced cream diamonds, each with a small ink-black dot at center. The rug short ends have small mustard fringe-tassel marks (5 tiny vertical lines on each end). Tileable horizontally if needed.

---

## K · Natural Floor Tiles — 自然地砖（4 sprite · 128×128 PNG · 透明背景 · rhombus）

> 让美术馆"贴近自然"——草地、小溪、石板、苔藓。**rhombus 形 seamless tileable**。
> 跟 E/G 一样可以混着铺，但视觉更柔（不是几何 pattern，是有机纹理感觉）。

### K01 — Grass Patch  `[ ]`
- **File:** `output/tiles/K01-grass-patch.png`
- **Size:** 128×128 px
- **Theme:** 室内"草坪展区"用的草地砖（飘起来的几根草，不是写实草地）
- **Prompt:** A single seamless rhombus floor tile in flat Saul Bass style. Cream base with a scattered field of small teal vertical "grass blade" lines (~12-15 tiny upward strokes, 4-8px tall each, irregular spacing). 2-3 of the grass blades are slightly taller, in mustard. NO 3D, NO shading — pure flat color silhouettes evoking a stylized lawn from above. Tiles seamlessly.

### K02 — Stream Flow  `[ ]`
- **File:** `output/tiles/K02-stream-flow.png`
- **Size:** 128×128 px
- **Theme:** 流水/小溪砖（铺在 K01 之间形成一条蜿蜒小溪）
- **Prompt:** A single seamless rhombus tile in flat Saul Bass style. Cream base with a single thick teal sinuous horizontal "ribbon" crossing the diamond (suggesting flowing water). Inside the teal ribbon, 3-4 tiny cream "highlight" dashes (water ripples). A single tiny mustard fish-shape silhouette (a long pointed oval with a triangular tail) somewhere along the ribbon. Tiles seamlessly when chained — the teal ribbons should align across tile borders to form a continuous stream.

### K03 — Stone Path  `[ ]`
- **File:** `output/tiles/K03-stone-path.png`
- **Size:** 128×128 px
- **Theme:** 鹅卵石走道砖（连成一条小径）
- **Prompt:** A single seamless rhombus tile in flat Saul Bass style. Cream base with 5-7 irregular flat ink-black "stone" shapes (rounded polygons, varied sizes 6-14 px) clustered in the center, leaving a soft cream border. Between the stones, thin ink gap lines suggest mortar. NO shading, pure flat silhouettes. Tiles seamlessly into a meandering stone path.

### K04 — Moss & Rock  `[ ]`
- **File:** `output/tiles/K04-moss-rock.png`
- **Size:** 128×128 px
- **Theme:** 苔藓+碎石的自然地表（角落用，野生感）
- **Prompt:** A single seamless rhombus tile in flat Saul Bass style. Teal base (the moss), with 3-4 scattered ink-black irregular pebble silhouettes. Among them, 1-2 mustard mushroom-cap shapes (small flat semicircles on tiny ink stems). NO outlines beyond the silhouettes themselves. Tiles seamlessly.

---

## L · Garden Props — 园林小品（5 sprite · 透明背景）

> 让美术馆有"室内花园"感的几件大物件。

### L01 — Carved Stone Bench  `[ ]`
- **File:** `output/nature/L01-stone-bench.png`
- **Size:** 96×40 px
- **Theme:** 比 C02 木长椅更"户外"的石长椅（公园那种）
- **Prompt:** A front-facing carved stone garden bench in flat Saul Bass style. A long horizontal cream silhouette (the stone seat, slightly rougher edge than a wooden bench), supported at each end by an ink-black thick rectangular pedestal leg. A thin mustard horizontal accent stripe along the front face of the seat (a carved decorative line). NO 3D, no shading.

### L02 — Tiered Stone Fountain  `[ ]`
- **File:** `output/nature/L02-fountain-small.png`
- **Size:** 80×112 px
- **Theme:** 中庭可以放一座小喷泉
- **Prompt:** A front-facing 2-tier stone fountain in flat Saul Bass style. A wide cream circular base bowl at the bottom (an ellipse silhouette), with a vertical ink-black pillar rising from its center, topped by a smaller cream circular upper bowl. From the upper bowl, three thin teal vertical lines fall as flat "water streams" into the lower bowl. A single mustard horizontal stripe accents each bowl's rim. NO 3D, pure silhouette stack.

### L03 — Koi Pond  `[ ]`
- **File:** `output/nature/L03-koi-pond.png`
- **Size:** 96×64 px
- **Theme:** 中庭/南厅角落里的小池塘
- **Prompt:** A top-down oval koi pond in flat Saul Bass style. A teal elliptical silhouette (the water) framed by a thin ink-black rocky border. Inside the teal, 2 vermilion stylized koi-fish shapes (elongated ovals with triangular tails) curving in opposite directions, and 1 small mustard lily-pad circle. NO 3D, pure flat color blocks. Subtle inner cream "ripple" arc near each fish.

### L04 — Vine Trellis Arch  `[ ]`
- **File:** `output/nature/L04-vine-arch.png`
- **Size:** 80×128 px
- **Theme:** 攀爬植物的小拱门/格架（装饰用，南厅入口可以挂一个）
- **Prompt:** A front-facing wooden trellis arch in flat Saul Bass style. Two thin ink-black vertical posts connected at the top by an arched ink crossbeam (a half-circle). Climbing the trellis, irregular teal vine silhouettes (4-5 wavy lines with small teal leaf-blob clusters at intervals). Two small vermilion flower dots scattered on the vines. NO shading.

### L05 — Bonsai on Pedestal  `[ ]`
- **File:** `output/nature/L05-bonsai.png`
- **Size:** 48×80 px
- **Theme:** 黑色基座上的小盆景（精致的展品物件）
- **Prompt:** A front-facing miniature bonsai tree on a pedestal in flat Saul Bass style. At the bottom, an ink-black short rectangular pedestal with a thin mustard top stripe. Atop it sits a mustard shallow trapezoidal pot. From the pot rises a single twisted ink-black trunk silhouette with 2-3 horizontal branch silhouettes. Atop each branch, a small flat teal canopy blob. NO leaves detail, pure silhouette.

---

## M · Premium Rotunda Marble — 中央圆厅大理石升级（4 sprite · 透明背景）

> 中央圆厅当前用 E 系列普通菱形砖撑不住"中庭"的份量。M 系列是**专门给 rotunda 升级**的高级大理石，
> 真博物馆中庭的那种"人字拼花 + 中央徽章 + 角隅花饰"配置。

### M01 — Herringbone Marble Plank  `[ ]`
- **File:** `output/tiles/M01-marble-herringbone.png`
- **Size:** 128×128 px
- **Theme:** 人字拼花大理石（铺中庭走廊）
- **Prompt:** A single seamless square (NOT rhombus this time — orthogonal tile) marble floor tile in flat Saul Bass style. Cream base divided into a herringbone parquet pattern: 4 long rectangular "planks" arranged in a herringbone V (two horizontal, two vertical, interlocked), separated by ultra-thin ink lines. Inside each plank, a single thin curved ink vein evoking marble. A tiny mustard square dot at each plank intersection (suggesting brass inlay). Tiles seamlessly into a continuous herringbone floor.

### M02 — Central Medallion  `[ ]`
- **File:** `output/tiles/M02-marble-medallion.png`
- **Size:** 256×256 px
- **Theme:** 中庭**正中央**的大圆形徽章 inlay（铺在 centerpiece 底下当基座）
- **Prompt:** A large single circular floor medallion in flat Saul Bass style on a transparent background. The outermost ring is a thick mustard band with a stylized Greek-key meander pattern in ink. Inside that, a thin teal ring. The central disc is cream with a 6-fold radial sunburst pattern in ink (6 long triangular wedges meeting at center), with a small vermilion circle at the exact center. The medallion is a single self-contained sprite — NOT tileable — meant to be placed alone in the rotunda's center.

### M03 — Diagonal Veined Marble  `[ ]`
- **File:** `output/tiles/M03-marble-diagonal.png`
- **Size:** 128×128 px
- **Theme:** 比 E02 更显档次的对角斜纹大理石
- **Prompt:** A single seamless square marble floor tile in flat Saul Bass style. Cream base with a strong diagonal composition: 2 thick teal-tinted bands sweep diagonally from upper-left to lower-right, separated by thinner mustard pin-stripes. Inside the teal bands, irregular thin ink "vein" lines running with the diagonal. NO 3D, pure flat color blocks. Tiles seamlessly along the diagonal axis.

### M04 — Corner Rosette Inlay  `[ ]`
- **File:** `output/tiles/M04-marble-rosette.png`
- **Size:** 128×128 px
- **Theme:** 圆厅 4 个角隅的花饰嵌片（跟 M02 medallion 呼应）
- **Prompt:** A single (non-tiling) corner inlay sprite in flat Saul Bass style. A quarter-circle in the upper-left of the canvas, containing a stylized 4-petal flower made of vermilion arc petals around a mustard center, framed by a thin ink quarter-arc border. The rest of the canvas is cream/transparent. Designed to sit in the 4 corners of the rotunda with rotated copies (top-right = mirror horizontal, bottom-left = mirror vertical, bottom-right = mirror both).
