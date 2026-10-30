// src/data/skills.ts
//
// Data for the homepage Skills card (SkillsCard.astro, a CRT radar).
// Four radar quadrants are the four skill groups and the four rings are the
// level; the open-source group is shown separately as IFF transponders.
//
// `cv` is quoted from the CV (https://resume.ursb.me/2024.html) and kept in
// the original language in both locales. The ai-agent items are not in the
// CV: they carry a neutral one-line `about` (zh/en) instead, with no claims.

export type SkillGroup = 'web' | 'cross' | 'game' | 'ai' | 'oss';
export type SkillLevel = 'expert' | 'proficient' | 'familiar' | 'learning';

export interface Skill {
  id: string;
  group: Exclude<SkillGroup, 'oss'>;
  name: string;
  level: SkillLevel;
  /** Monochrome SVG drawn as a mask in `fg` on `bg`. */
  logo: string;
  bg: string;
  fg: string;
  /** Quote from the CV (original language). */
  cv?: string;
  /** Neutral description for items without a CV quote. */
  about?: { zh: string; en: string };
}

export interface OssIdentity {
  id: string;
  name: string;
  role: string;
  /** Full-colour logo image. */
  logo: string;
  /** Logo needs a dark tile. */
  dark?: boolean;
  cv: string;
}

const L = '/images/skills/';

export const SKILL_GROUPS: Record<SkillGroup, { name: string; color: string }> = {
  web: { name: 'web-development', color: 'var(--g-web)' },
  cross: { name: 'cross-platform', color: 'var(--g-cross)' },
  game: { name: 'game-engine', color: 'var(--g-game)' },
  ai: { name: 'ai-agent', color: 'var(--g-ai)' },
  oss: { name: 'open-source', color: 'var(--g-oss)' },
};

/** Log order on the right of the card; also the blip numbering. */
export const RADAR_ORDER: Exclude<SkillGroup, 'oss'>[] = ['web', 'cross', 'game', 'ai'];

export const SKILLS: Skill[] = [
  { id: 'react', group: 'web', name: 'React', level: 'expert', logo: L + 'si-react.svg', bg: '#20232a', fg: '#61DAFB', cv: 'Q 音 / K 歌互通 Web 基础库 Top1 贡献，接入业务日 PV 2000 万+' },
  { id: 'ts', group: 'web', name: 'TypeScript', level: 'expert', logo: L + 'si-typescript.svg', bg: '#3178C6', fg: '#ffffff', cv: '基础类库、开放平台框架的设计与开发' },
  { id: 'js', group: 'web', name: 'JavaScript', level: 'expert', logo: L + 'si-javascript.svg', bg: '#F7DF1E', fg: '#111111', cv: '《引擎剖析：JS 中的字符串转数值》上下篇' },
  { id: 'perf', group: 'web', name: 'Performance', level: 'expert', logo: L + 'icon-gauge.svg', bg: '#0d1117', fg: '#4ade80', cv: '直播常驻页长线保持秒开率 80% 以上；Options 预检请求优化' },
  { id: 'build', group: 'web', name: 'Build & CI/CD', level: 'proficient', logo: L + 'icon-pipeline.svg', bg: '#1f2937', fg: '#fbbf24', cv: '完备的 CI/CD 与版本绑定；IIFE / ESM / 分端多产物' },
  { id: 'browser', group: 'web', name: 'Browser Internals', level: 'proficient', logo: L + 'icon-layers.svg', bg: '#e8eef8', fg: '#1a56db', cv: '《Chromium 渲染流水线——字节码到像素的一生》' },
  { id: 'cpp', group: 'game', name: 'C++', level: 'proficient', logo: L + 'si-cplusplus.svg', bg: '#00599C', fg: '#ffffff', cv: 'Atum 游戏引擎 C++ GFX 扩展层，大幅提升渲染性能' },
  { id: 'cocos', group: 'game', name: 'Cocos / 2D', level: 'proficient', logo: L + 'si-cocos.svg', bg: '#0f2a38', fg: '#55C2E1', cv: 'Cocos 引擎跨端容器；2D 大世界 JS 玩法插件化' },
  { id: 'babylon', group: 'game', name: 'Babylon / 3D', level: 'familiar', logo: L + 'si-babylondotjs.svg', bg: '#ffffff', fg: '#BB464B', cv: 'TMELAND 3D 开放平台与端渲染 SDK 性能优化' },
  { id: 'webgpu', group: 'game', name: 'WebGPU', level: 'learning', logo: L + 'si-webgpu.svg', bg: '#005A9C', fg: '#ffffff', cv: 'Dusk：基于 Dawn 的 WebGPU JS 运行时（2023，开发中）' },
  { id: 'flutter', group: 'cross', name: 'Flutter / Dart', level: 'expert', logo: L + 'si-flutter.svg', bg: '#ffffff', fg: '#02569B', cv: 'Kant：TME 集团 Flutter 方案，落地 QQ 音乐等 5+ 款 App' },
  { id: 'swift', group: 'cross', name: 'iOS / Swift', level: 'proficient', logo: L + 'si-swift.svg', bg: '#F05138', fg: '#ffffff', cv: 'Atum iOS 容器从零到一，JSBinding 与微信小游戏对齐' },
  { id: 'rn', group: 'cross', name: 'React Native', level: 'familiar', logo: L + 'si-react.svg', bg: '#20232a', fg: '#61DAFB', cv: 'React Native / Hippy 等跨端容器开发经验' },
  { id: 'android', group: 'cross', name: 'Android', level: 'familiar', logo: L + 'si-android.svg', bg: '#ffffff', fg: '#3DDC84', cv: 'Atum Android 端联调；Android Code Caching 方案设计' },
  {
    id: 'context', group: 'ai', name: 'Context Engine', level: 'expert', logo: L + 'icon-layers.svg', bg: '#2a1607', fg: '#fdba74',
    about: { zh: '为 LLM / Agent 组织、检索与压缩上下文的工程方向', en: 'Assembling, retrieving and compressing context for LLM agents' },
  },
  {
    id: 'rsi', group: 'ai', name: 'RSI', level: 'proficient', logo: L + 'icon-gauge.svg', bg: '#2a1607', fg: '#fdba74',
    about: { zh: 'Recursive Self-Improvement：让 Agent 依据反馈迭代改进自身的方向', en: 'Recursive self-improvement: agents that iterate on themselves from feedback' },
  },
  {
    id: 'infra', group: 'ai', name: 'Agent Infra', level: 'proficient', logo: L + 'icon-nodes.svg', bg: '#2a1607', fg: '#fdba74',
    about: { zh: '支撑 Agent 运行的基础设施：工具调用、编排、沙箱与评测', en: 'Infrastructure agents run on: tool calling, orchestration, sandboxes and evals' },
  },
];

export const OSS: OssIdentity[] = [
  { id: 'w3c', name: 'W3C ARIA WG', role: 'member', logo: L + 'w3c-mark.svg', cv: 'W3C Accessible Rich Internet Applications Working Group 成员' },
  { id: 'webf', name: 'Kraken / WebF', role: 'TSC', logo: L + 'webf.png', cv: '开发 Kun 时为 Kraken 贡献代码，加入 Kraken 与 WebF TSC' },
  { id: 'chromium', name: 'Chromium', role: 'contributor', logo: L + 'chromium.svg', cv: 'Chromium 贡献者' },
  { id: 'node', name: 'Node.js', role: 'contributor', logo: L + 'nodejs.svg', cv: 'Node.js 贡献者' },
  { id: 'bevy', name: 'Bevy', role: 'contributor', logo: L + 'bevy.png', dark: true, cv: 'Bevy（Rust 游戏引擎）贡献者' },
];

export const CV_URL = 'https://resume.ursb.me/2024.html';
