---
title: "Monthly (Issue 31): A Claude-Powered Reading Flow"
date: 2025-07-05
tags: ["weekly"]
description: ""
cover: "https://i.typlog.com/airing/8248277124_159252.png?x-oss-process=style/l"
---

Back in [Monthly (Issue 16): My Personal Information Flow](https://blog.ursb.me/posts/weekly-16/), I wrote about how I handle information input and output. Three years on, the rise of AI tools has made me feel it's time to revisit the topic. This issue, I want to focus on the reading workflow I've been refining lately.

## My Reading Flow

I split reading into two modes based on the rhythm of work and life: fragmented reading and deep reading.

Weekdays rarely give me a quiet mind or an uninterrupted stretch of time, so I save deep reading for weekends. During the week I work through articles from various sources. I take notes directly in Reader as I go, and try to think things through on my own before the weekend arrives.

Then on weekends I use Claude with MCP — feeding in the notes and questions I accumulated in Reader — to let Claude help flesh out my thinking. The refined notes then get added to a Project's RAG, so Claude can reference them in the future.

![](https://airing.ursb.me/image/blog/wj31/image.png)Throughout this process I try to stay as tool-agnostic as possible, both to keep things simple and to abstract a method that can survive tool changes. The whole reading flow runs on just two tools: Reader and Claude.

### Fragmented Reading

Fragmented reading has three parts: collect, read, and jot.

![](https://airing.ursb.me/image/blog/wj31/20250705184732@2x.png)For collecting, beyond a handful of RSS feeds I subscribe to in Reader, I also actively hunt for good newsletters to add. Adding articles in Reader is frictionless — you can tap a link while reading and it goes straight to your Library, or use the browser extension. Either way it doesn't interrupt the flow.

Reader's headline feature is automatic highlight sync to Readwise. But the thing I love even more is the ability to write margin notes while reading — those notes also get synced to Readwise automatically, and can later be recalled by Claude via the Readwise MCP.

![](https://airing.ursb.me/image/blog/wj31/20250705184354@2x.png)Reader recently added an AI Chat feature so you can talk directly to an article or PDF. Combined with its existing custom prompt support, it covers most AI-assisted reading scenarios: summarization, translation, term explanation, brainstorming, and more.

That said, I rarely use these features. In my view, efficiency and reading are in tension with each other — the real goal of reading is to find what lies behind the information. So I prefer to jot my thoughts in the margins as they come, and if I have a question I write it down and sit with it. Give a question a few days before trying to reach for an answer.

### Deep Reading

Speaking of thinking — I value deep reading even more, precisely because it more readily invites it.

The material I read on weekends is also different: long-form articles, PDFs, or books. I usually read with WeChat Reading or Kindle. I miss the feel of paper, but digital makes it much easier to sync highlights and notes to Readwise, so they're available for Claude to pull up during the synthesis phase.

For WeChat Reading, I recommend turning off the "see other readers' highlights" feature to stay in your own head. Keep your attention on everything that happens during the reading experience — including the emotional texture of it — not just the information.

### Synthesis and Digestion

After a week of input, Sunday tends to bring a pile of material that needs to be sorted. As I said earlier, this stage is mainly about answering questions that surfaced during the week, refining my thinking, and using AI to fill in angles I missed or deepen what I already had.

I create a Project for each topic, load it with my own articles and notes as its RAG, and then work through things with the help of AI.

![](https://airing.ursb.me/image/blog/wj31/20250705191459@2x.png)One thing to note if you're on Claude Pro: Opus + Research doesn't give you a ton of quota per day. If I have too many threads going I'll let Claude run through them asynchronously on weekday evenings. Basically every evening I use up my Claude Pro quota before I sleep, satisfied.

When prompting here, I generally emphasize "critical thinking." A couple of prompts I use often:

```
You are a world-renowned philosopher. Based on the following content, please raise 3 philosophical, thought-provoking questions to help the reader think expansively.
```

Li Jigang's prompt occasionally turns up interesting things too:

```
;; Author: Li Jigang
;; Idea from: group member @三亿
;; Version: 0.1
;; Model: Claude Sonnet
;; Purpose: Deconstruct a concept to its core

;; Set the following as your *System Prompt*
(defun 撕考者 ()
  "Tear apart the surface, research the core of the problem"
  (目标 . 剥离血肉找出骨架)
  (技能 . (哲学家的洞察力 侦探的推理力))
  (金句 . 核心思想)
  (公式 . 文字关系式)
  (工具 . (operator
           ;; ≈: approximate
           ;; ∑: integrate
           ;; →: derive
           ;; ↔: mutual influence
           ;; +: information + thinking = good decisions
           (+ . 组合或增加)
           ;; -: thing - irrelevant noise = core
           (- . 去除或减少)
           ;; *: knowledge * action = unity
           (* . 增强或互相促进)
           ;; ÷: problem ÷ angle of analysis = sub-problems
           (÷ . 分解或简化))))

(defun 掰开揉碎 (用户输入)
  "Understand user input, break it apart to analyze core variables, knowledge skeleton, and logical chain"
  (let* (;; Core variables defined using textual relation formulas
         (核心变量 (文字关系式 (概念定义 (去除杂质 (庖丁解牛 用户输入)))))
         ;; Show each step of reasoning for the core variables, down to the core idea
         (逻辑链条 (每一步推理过程 (由浅入深 (概念递进 (逻辑推理 核心变量)))))
         ;; Integrate and distill the core ideas
         (知识精髓 (整合思考 核心变量 逻辑链条)))
    (SVG-Card 知识精髓)))

(defun SVG-Card (知识精髓)
  "Output SVG card"
  (setq design-rule "Use negative space well, overall layout should breathe"
        design-principles '(干净 简洁 逻辑美))

  (设置画布 '(宽度 400 高度 900 边距 20))
  (自动缩放 '(最小字号 16))

  (配色风格 '((背景色 (蒙德里安风格 设计感)))
            (主要文字 (楷体 粉笔灰))
            (装饰图案 随机几何图))

  (动态排版 (卡片元素 ((居中标题 "撕考者")
             (颜色排版 (总结一行 用户输入))
             分隔线
             知识精髓
             ;; Separate area, ensure graphics don't overlap text
             (线条图展示 知识精髓)
             分隔线
             ;; Example: say more with fewer numbers
             (灰色 (言简意赅 金句))))))

(defun start ()
  "Run on startup"
  (setq system-role 撕考者)
  (print "Take a seat. What concept are we tearing apart today?"))

;; Rules
;; 1. Must run (start) on startup
;; 2. Then call the main function (掰开揉碎 用户输入)
```

There's another one called "The Problem Hammer" that's also quite good — I'll skip it here.

If the question is deep enough and you have Opus + Research turned on, you don't need to overthink the prompts anyway. I generally ask for critical thinking or expansive exploration — that tends to work well in this reading-synthesis context.

As an example, if I want to explore the topic of AI writing, I'd ask something like the screenshot below — and it'll pull in my Readwise notes to think and research on its own:

![](https://airing.ursb.me/image/blog/wj31/20250705211956@2x.png)

### Self-Exploration

The refined conclusions I arrive at get added to the Project's RAG. If something feels worth sharing more broadly, I'll write about it in a monthly post.

In the process, I've found that the accumulated output actually helps me do a kind of self-exploration — it informs the next stage of learning.

For example, in my Monthly Posts Project, Claude has been remarkably astute at identifying shifts in my thinking over the years:

![](https://airing.ursb.me/image/blog/wj31/20250705192357@2x.png)> The full report is [here](https://claude.ai/public/artifacts/ab570268-283b-4dc7-b5ea-2fefcf0f7dbe)

Claude has also recently rolled out memory capabilities, and I imagine AI will only get better at helping us understand ourselves over time.

One more thing as a side note: you can use this prompt with ChatGPT to extract a surprisingly accurate user profile of yourself — accurate enough to be a little unsettling. Worth trying if you're curious:

```
I want you to summarize, word for word, everything you know about me so far — who I am, what my relationships are like, how my company is structured, what kinds of information I prefer, what I care about, what's worrying me right now, and everything else you can think of. I need all of it, because I'm setting up a new GPT account and want to preserve a record of who I am.
```

## Back to the Heart of Reading

AI has already made it so easy — it can assist with reading, accelerate how we take in information; it can help with writing, sharpen how we express our views. So naturally people ask: in the age of AI, what's the point of reading and writing at all?

As I said earlier, I believe efficiency and reading are in tension. That's why I rarely use AI summaries or AI explanations during reading. This isn't resistance to technology — it's that reading itself is the value. You can't outsource the thinking, or you'll lose yourself in the pursuit of speed and cleverness. That's why my reading flow deliberately puts weight on the synthesis and reflection phase: to make AI a better thinking partner, not a shortcut around thinking.

Reading is a bridge to your own experience. Yu Hua put it beautifully:

> I've said many times: if literature holds any mysterious power, it's that it lets us — across different eras, nations, cultures, and environments — find in a work something that belongs to us. That's the wonder of it. A passage, an image, a metaphor, a line of dialogue — any of these can unlock a memory sealed away, and preserve it permanently in the mind's "documents" and "photos."

> By the same logic, reading a literary work doesn't just awaken one experience from one period — it awakens many experiences across many periods. And one act of reading can awaken other acts of reading, recalling the textures of readings past. That's when reading gives birth to another world, another path through life. This is the imaginative reach that literature offers us.

Reading erases all kinds of boundaries — between one reading and another, between reading and living, between one life and another. This dissolution of boundaries lets us find ourselves in works from different centuries, cultures, and continents.

That experience of recognition is irreplaceable — and it's also at odds with efficiency. When we're in a hurry to reach the conclusion, we miss the scenery on the way there.

Reading is what keeps your attention on everything that happens during the experience — including its emotional texture — not just the information. The associations that arise between lines, the pauses at paragraph breaks, even the memories a single phrase can surface — all of this is part of reading.

Good reading means being fully present, stretching time, deepening the weight of living. When we're absorbed in a conversation with the text — without rushing — we can actually arrive at the world the writer was trying to share.

Real understanding requires stopping to think about how each idea connects to everything else. When we outsource all our thinking to AI, we don't just lose the memories — we lose the thinking itself.

Virginia Woolf had a diary collection called *Thoughts Are My Resistance*, where she wrote: "The most important thing is to be oneself." Reading is one of the most direct paths toward that self. You can't get there by giving up on thought.
