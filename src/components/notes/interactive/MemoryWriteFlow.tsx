import { useState } from 'react';

type Phase = 'extract' | 'consolidate' | 'delete';

const strings = {
  zh: {
    headerLabel: '记忆写入流程',
    title: '如何写入记忆？',
    subtitle: '三个阶段：提取 → 整合 → 删除',
    phases: [
      { id: 'extract' as Phase, title: '阶段一：逐轮提取' },
      { id: 'consolidate' as Phase, title: '阶段二：定期整合' },
      { id: 'delete' as Phase, title: '阶段三：记忆删除' },
    ],
    extract: {
      browseRecent: '后台 Agent 浏览最近 N 条消息',
      receiveExisting: '接收现有记忆，避免重复创建',
      worthRemembering: '值得记住?',
      yesLabel: 'yes',
      noLabel: 'no',
      createNew: '新建记忆文件',
      createNewSub: '或更新已有文件',
      writeIndex: '写入索引 MEMORY.md',
      writeIndexSub: '目录表 + 单行摘要，方便后续检索',
      skip: 'skip',
    },
    consolidate: {
      triggerTitle: '触发条件',
      triggerSub: '距上次整合 ≥ 24 小时 且 ≥ 5 个会话',
      afterTrigger: '触发后 → ',
      autoDreamNote: '（分叉子 Agent）',
      gatedNote: 'gated: tengu_onyx_plover',
      steps: [
        { text: '读取 MEMORY.md，浏览现有主题文件', sub: '了解当前记忆全貌' },
        { text: '从日志和会话记录中收集近期信号', sub: '通过关键词精准检索，从不全量读取' },
        { text: '合并新信息到现有文件', sub: '相对日期 → 绝对日期；删除与当前代码库矛盾的事实' },
        { text: '修剪记忆', sub: '移除失效的索引条目，缩短冗长内容；解决文件间矛盾' },
      ],
      done: 'done',
      footer: '使用通用读写工具，通过锁文件防止跨会话并发整合',
    },
    delete: {
      p1: '记忆没有过期时间，也不会定时自动清理。',
      p2Before: '唯一的删除方式是 Claude Code Agent 在',
      p2Mid: '整合过程',
      p2After: '中主动判断：比如某条记忆和代码库已经对不上了，或者和其他记忆产生了矛盾。',
      p3: '换句话说，记忆只会越写越精，但绝不会在你不知情的情况下消失。',
    },
  },
  en: {
    headerLabel: 'Memory Write Flow',
    title: 'How is Memory written?',
    subtitle: 'Three phases: extract → consolidate → delete',
    phases: [
      { id: 'extract' as Phase, title: 'Phase 1: Per-Turn Extraction' },
      { id: 'consolidate' as Phase, title: 'Phase 2: Periodic Consolidation' },
      { id: 'delete' as Phase, title: 'Phase 3: Memory Deletion' },
    ],
    extract: {
      browseRecent: 'Background agent scans the last N messages',
      receiveExisting: 'Receives existing memories to avoid duplicates',
      worthRemembering: 'Worth remembering?',
      yesLabel: 'yes',
      noLabel: 'no',
      createNew: 'Create a new memory file',
      createNewSub: 'Or update an existing one',
      writeIndex: 'Write to the MEMORY.md index',
      writeIndexSub: 'Table of contents + one-line summary for later retrieval',
      skip: 'skip',
    },
    consolidate: {
      triggerTitle: 'Trigger condition',
      triggerSub: '≥ 24 hours since last consolidation and ≥ 5 sessions',
      afterTrigger: 'On trigger → ',
      autoDreamNote: ' (spawns a sub-agent)',
      gatedNote: 'gated: tengu_onyx_plover',
      steps: [
        { text: 'Read MEMORY.md, scan existing topic files', sub: 'Understand the current memory landscape' },
        { text: 'Gather recent signals from logs and session records', sub: 'Targeted keyword retrieval — never a full scan' },
        { text: 'Merge new information into existing files', sub: 'Relative dates → absolute dates; remove facts contradicted by the current codebase' },
        { text: 'Prune memories', sub: 'Remove stale index entries, trim verbose content; resolve contradictions between files' },
      ],
      done: 'done',
      footer: 'Uses general read/write tools; a lockfile prevents concurrent consolidation across sessions',
    },
    delete: {
      p1: 'Memories have no expiration and are never purged on a schedule.',
      p2Before: 'The only way a memory is deleted is when the Claude Code Agent decides so during ',
      p2Mid: 'consolidation',
      p2After: ' — for example, a memory no longer matches the codebase, or contradicts another memory.',
      p3: 'In other words, memories only grow sharper — they never disappear behind your back.',
    },
  },
} as const;

const phaseStyles: Record<Phase, { color: string; bgColor: string }> = {
  extract: { color: '#c09a3e', bgColor: '#fdf9ed' },
  consolidate: { color: '#4a80b0', bgColor: '#e8f0fa' },
  delete: { color: '#b05050', bgColor: '#fdf0ef' },
};

function Arrow({ color = 'var(--c-border)' }: { color?: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '4px 0', color,
    }}>
      <svg width="16" height="20" viewBox="0 0 16 20">
        <path d="M8 0 L8 14 M3 10 L8 16 L13 10" stroke="currentColor" strokeWidth="2" fill="none" />
      </svg>
    </div>
  );
}

function FlowBox({ text, sub, color, bg }: { text: string; sub?: string; color: string; bg: string }) {
  return (
    <div style={{
      padding: '12px 16px',
      border: `1.5px solid ${color}`,
      borderRadius: 8,
      background: bg,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 13, fontWeight: 600, color }}>{text}</div>
      {sub && <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

const STEP_MARKERS = ['①', '②', '③', '④'];

interface Props {
  lang?: 'zh' | 'en';
}

export default function MemoryWriteFlow({ lang = 'zh' }: Props) {
  const s = strings[lang];
  const [activePhase, setActivePhase] = useState<Phase>('extract');

  return (
    <div className="interactive-block">
      <div className="interactive-block-header">
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="badge-interactive" />
          Interactive · {s.headerLabel}
        </span>
      </div>
      <div className="interactive-block-body" style={{ padding: '24px 28px' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
            {s.title}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            {s.subtitle}
          </div>
        </div>

        {/* Phase tabs */}
        <div style={{
          display: 'flex', gap: 8, justifyContent: 'center',
          marginBottom: 20, flexWrap: 'wrap',
        }}>
          {s.phases.map(p => {
            const style = phaseStyles[p.id];
            return (
            <button
              key={p.id}
              onClick={() => setActivePhase(p.id)}
              style={{
                padding: '8px 16px', borderRadius: 20,
                border: `1.5px solid ${activePhase === p.id ? style.color : 'var(--c-border)'}`,
                background: activePhase === p.id ? style.bgColor : 'transparent',
                color: activePhase === p.id ? style.color : 'var(--c-text)',
                fontWeight: 600, fontSize: 13,
                cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              {p.title}
            </button>
          );})}
        </div>

        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          {activePhase === 'extract' && (
            <div>
              <FlowBox
                text={s.extract.browseRecent}
                color="#c09a3e" bg="#fdf9ed"
              />
              <Arrow color="#c09a3e" />
              <FlowBox
                text={s.extract.receiveExisting}
                color="#c09a3e" bg="#fdf9ed"
              />
              <Arrow color="#c09a3e" />
              <div style={{ textAlign: 'center', position: 'relative', padding: '8px 0' }}>
                <div style={{
                  display: 'inline-block', padding: '10px 24px',
                  border: '1.5px solid #c09a3e', borderRadius: 8,
                  background: '#fff',
                }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#c09a3e' }}>{s.extract.worthRemembering}</div>
                </div>
              </div>
              <div style={{
                display: 'flex', gap: 12, marginTop: 8,
              }}>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#4a9a6a', marginBottom: 4, fontWeight: 600 }}>{s.extract.yesLabel}</div>
                  <div style={{
                    display: 'flex', flexDirection: 'column', gap: 6,
                  }}>
                    <FlowBox text={s.extract.createNew} sub={s.extract.createNewSub} color="#4a9a6a" bg="#e8f5ee" />
                    <Arrow color="#4a9a6a" />
                    <FlowBox text={s.extract.writeIndex} sub={s.extract.writeIndexSub} color="#4a9a6a" bg="#e8f5ee" />
                  </div>
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#999', marginBottom: 4, fontWeight: 600 }}>{s.extract.noLabel}</div>
                  <FlowBox text={s.extract.skip} color="#999" bg="#f5f5f5" />
                </div>
              </div>
            </div>
          )}

          {activePhase === 'consolidate' && (
            <div>
              <FlowBox
                text={s.consolidate.triggerTitle}
                sub={s.consolidate.triggerSub}
                color="#4a80b0" bg="#e8f0fa"
              />
              <Arrow color="#4a80b0" />
              <div style={{
                textAlign: 'center', fontSize: 12,
                color: 'var(--text-secondary)', padding: '2px 0',
              }}>
                {s.consolidate.afterTrigger}<strong>autoDream</strong>{s.consolidate.autoDreamNote}
              </div>
              <div style={{
                fontSize: 11, fontStyle: 'italic', color: '#b05050',
                textAlign: 'right', marginBottom: 4,
              }}>
                {s.consolidate.gatedNote}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {s.consolidate.steps.map((item, i) => (
                  <div key={i}>
                    {i > 0 && <Arrow color="#4a80b0" />}
                    <FlowBox
                      text={`${STEP_MARKERS[i]} ${item.text}`}
                      sub={item.sub}
                      color="#4a80b0" bg="#e8f0fa"
                    />
                  </div>
                ))}
              </div>
              <Arrow color="#4a80b0" />
              <FlowBox text={s.consolidate.done} color="#808080" bg="#f5f5f5" />
              <div style={{
                marginTop: 10, textAlign: 'center',
                fontSize: 12, fontStyle: 'italic', color: 'var(--text-secondary)',
              }}>
                {s.consolidate.footer}
              </div>
            </div>
          )}

          {activePhase === 'delete' && (
            <div>
              <div style={{
                padding: '20px',
                border: '1.5px solid #b05050',
                borderRadius: 10,
                background: '#fdf0ef',
                lineHeight: 1.8,
                fontSize: 13.5,
                color: 'var(--c-text)',
              }}>
                <p style={{ margin: '0 0 12px' }}>
                  {s.delete.p1}
                </p>
                <p style={{ margin: '0 0 12px' }}>
                  {s.delete.p2Before}<strong style={{ color: '#b05050' }}>{s.delete.p2Mid}</strong>{s.delete.p2After}
                </p>
                <p style={{ margin: 0, fontStyle: 'italic', color: '#b05050' }}>
                  {s.delete.p3}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
