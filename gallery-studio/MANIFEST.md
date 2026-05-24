# Gallery Studio — Asset Manifest

> 共 **34 个 sprite**。挨个生成，生成完把对应行 `[ ]` 改 `[x]` 并 commit。
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
