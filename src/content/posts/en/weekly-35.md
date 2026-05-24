---
title: "Weekly #35: Vibe Coding Weekends with Professor Claude"
date: 2026-05-23
tags: ["weekly"]
description: ""
cover: "https://r2.airingdeng.com/blog/wj35/multitask-phone.webp"
---

This issue covers April and May 2026.

## A Month of Vibe Coding

This past month I went on a vibe-coding spree — 25.7 billion Claude Code tokens spent in total:

![Claude Code token usage](https://r2.airingdeng.com/blog/wj35/tokens-stats.webp)

Almost all of those were burned across six weekends, because weekends are the only stretches I have for messing around (otherwise a 20x plan would only last me three days).

I usually have at least seven long-running tasks going at once in Claude Code, and I'm not glued to my desk the whole time — my Samsung small foldable phone is fantastic for this. I can be anywhere, watching short videos with one eye while keeping the other on the agent dashboard. The moment an agent stops, the phone catches it first; voice input keeps them moving (the ruthless boss can't let them rest):

![Managing many Claude Code agents from a phone](https://r2.airingdeng.com/blog/wj35/multitask-phone.webp)

So what got built across those six weekends? Let me share it in this issue.

## Some Small Toys

I polished the [blog](https://ursb.me/) a bit, added multi-language support, and shipped a few new modules:

Workouts:

![Workouts module](https://r2.airingdeng.com/blog/wj35/mod-workouts.webp)

A photo wall:

![Photos module](https://r2.airingdeng.com/blog/wj35/mod-photos.webp)

And a comics pipeline: I set up a workspace that locks in my own character and art style, so I only need to say one sentence to the agent each day (optionally with photos — it style-transfers and anonymizes them), and it auto-generates a 4-panel strip and publishes it ——

![Comics pipeline](https://r2.airingdeng.com/blog/wj35/mod-comics.webp)

Sharing turned out nice too:

![Comic share 1](https://r2.airingdeng.com/blog/wj35/comics-share-1.webp)
![Comic share 2](https://r2.airingdeng.com/blog/wj35/comics-share-2.webp)
![Comic share 3](https://r2.airingdeng.com/blog/wj35/comics-share-3.webp)

I also wired up analytics. The site does about 10K PV/month right now:

![Umami PV stats](https://r2.airingdeng.com/blog/wj35/umami-pv.webp)

## The App

Following up on last issue's finance app: I added quite a bit — AI voice input for transactions, OCR receipt capture, position tracking and analysis, and a family-shared ledger that took me a long while to get right.

![MoneyWise main screen](https://r2.airingdeng.com/blog/wj35/moneywise-app.webp)

MoneyWise is now live on iOS, Android, and macOS, and it has fully replaced MoneyWiz which I'd been paying for for years.

![MoneyWise on the stores](https://r2.airingdeng.com/blog/wj35/moneywise-stores.webp)

The whole journey from development to App Store didn't take much time — design, dev, ops, and the store-listing materials were all handled by Professor Claude.

## 14 Deep-Dive Articles

This period I shipped 14 new immersive technical longforms. Each one is an encyclopedic deep dive, paired with rich visualizations and interactive learning. Studying this way turned out to be remarkably efficient:

- [The Life of Bytecode to Pixels — A Tour of Chromium's Rendering Pipeline](https://ursb.me/immersive/chromium-renderer/): I originally wrote this in 2022, which back then took me a month — I had to spin up the Chromium project and step through it line by line, hand-drawing the logic chains. Not anymore. Claude spent one day rebuilding that article with much better visualizations and deeper explanations.

![Chromium renderer immersive article](https://r2.airingdeng.com/blog/wj35/immersive-chromium.webp)

And 13 others, written-while-learning, with both learning efficiency and output at maximum:

- [Measuring "Smoothness" — From FrameTime to Stutter](https://ursb.me/immersive/jank-stutter/)
- [Extreme JS Performance — V8's Optimization Principles and the Reincarnation of a Hot Function](https://ursb.me/immersive/v8-fast-js/)
- [Sedimented Pixels — A Full-Spectrum Encyclopedia of 50+ Image Formats](https://ursb.me/immersive/image-formats/)
- [The Life of One Request — HTTP/3 in Full](https://ursb.me/immersive/http3/)
- [From Rust to SIMD — The Life of WebAssembly](https://ursb.me/immersive/webassembly/)
- [The Life of One JS Line — A QuickJS Source-Level Walkthrough](https://ursb.me/immersive/quickjs/)
- [The Life of One setState — A Tour of React's Render Pipeline](https://ursb.me/immersive/react-internals/)
- [Helio: The Evolution of a High-Performance Mini-Game Container](https://ursb.me/immersive/helio/)
- [Many Ways to Die — Family Tree of 11 GC Algorithms](https://ursb.me/immersive/gc/)
- [Eight Translations of One Dispatch — A WebGPU Stack Source-Level Walkthrough](https://ursb.me/immersive/webgpu/)
- [The Life of One CSS Rule — A Tour of Chromium's Style Engine](https://ursb.me/immersive/css-engine/)
- [The Life of an LLM Inference](https://ursb.me/immersive/llm-inference-life/)
- [The Life of a TLS Handshake — TLS 1.3 Protocol in Full](https://ursb.me/immersive/tls-handshake/)

Claude even went one step further with the GC piece and turned it into a 3D game that explains each GC algorithm through gameplay:

![GC 3D game 1](https://r2.airingdeng.com/blog/wj35/gc-game-1.jpg)

![GC 3D game 2](https://r2.airingdeng.com/blog/wj35/gc-game-2.jpg)

## A Homemade Programming Language —— [Penelope](https://penelope.ursb.me/)

In Homer's epic, Penelope waited twenty years for Odysseus. By day she wove a shroud; each night she secretly unraveled the day's work. She wasn't unable to choose — she was unwilling to. She was waiting for someone who hadn't come back.

After that story rolled around in Claude's head for a long while, it suggested I turn it into a programming language.

Anyone who writes code is familiar with this predicament: the programs you write have no patience for waiting. The moment a process is interrupted, everything in its head — the stack, the variables, the line it was on — is gone. To make programs survive waiting, we wrap them in scaffolding: checkpoint files, message queues, idempotency keys, retry logic, durable-execution frameworks like Temporal or Inngest. They work, but they all extract the same cost — you have to translate what you want to do into what the framework will let you say, slicing your code into activities, steps, and awaits.

Penelope's idea is plain: pull all of that back into the language itself.

```jsx
let x = 10;
let y = pause;          // process exits here, state writes to disk
print(to_str(x + y));   // an hour later, a week later, a year later,
                        // another process picks up and prints 15
```

No `await`, no checkpoints, no decorators. Just one keyword `pause`, on equal footing with `let`. Underneath it sits a single axiom ——

> Execution is data. A running program is itself a value.

Penelope ships with a self-implemented bytecode + VM execution, a debugger, an LSP, a VSCode extension; for performance, both JIT and a WASM backend are supported. On top of all this, the language is now self-hosting — the new lexer, parser, and compiler are all written in Penelope itself.

![Penelope language site](https://r2.airingdeng.com/blog/wj35/penelope-site.webp)

By making `pause` a first-class expression, Penelope rewinds an engineering problem all the way back to a semantic one.

In the process, I shored up my own programming foundations, and along the way realized something about Professor Claude's reasoning: when the reasoning capacity is strong enough, the higher-level usage might actually be *subtraction* — push back to the most solid base point, and then go forward together with it doing *addition*. Knowledge absorbed that way is denser in value and far more durable.

![Penelope's axiomatic derivation](https://r2.airingdeng.com/blog/wj35/penelope-axiom.webp)

## A Living Stardew Valley

This project's origin: after I added i18n to the blog and a real-time online presence indicator, I noticed quite a few overseas visitors landing on the site, some of whom were happy to comment, which kept the traffic flowing. There were even a few days when the free Supabase tier started to choke:

![Supabase quota hit](https://r2.airingdeng.com/blog/wj35/supabase-limit.webp)

So I thought — why not just make a game? Represent visitors as little animals, put them all in a shared room interacting with each other, give it a "the world is one village" feel:

![World concept sketch](https://r2.airingdeng.com/blog/wj35/world-idea.webp)

Because the image-2 results were great, I splurged on Codex too, and had Claude Code and Codex team up to build the game:

![Claude Code + Codex collaboration](https://r2.airingdeng.com/blog/wj35/codex-claude.webp)

The little game kept growing. Every NPC is wired up to AI, and borrowing from OpenClaw's architecture, each has its own SOUL and independent memory system — if you sign in, it stores memories specifically about you, and occasionally sends you check-in emails on its own initiative. A living Stardew Valley:

![NPC SOUL memory system](https://r2.airingdeng.com/blog/wj35/npc-soul.webp)

The creative momentum is real and just keeps coming. For example, right now I'm building a chaotic exhibition hall for my own work — I've rebuilt it several times and still not happy with it:

![Exhibition gallery](https://r2.airingdeng.com/blog/wj35/gallery-exhibit.webp)

I'll hold back the 2D world's link for now — there's still plenty I, the creator-god, need to fix up first.

## 3D Game Explorations

If the above was the 2D direction, this section is the 3D direction. Besides the GC game already mentioned, I also built a 3D zen miniature world:

![3D zen world](https://r2.airingdeng.com/blog/wj35/zen-world.jpg)

It's still being polished, but you can already get a taste: [https://ursb.me/world/](https://ursb.me/world/). You can play white noise, set a Pomodoro timer, and there are subtle wind animations throughout — it has a real atmosphere to it.

3D gaming took me down plenty of dead ends. For instance, I tried for a long time to build this "chatting under a tree" scene, and after all that effort this was the result:

![Chat-under-tree early attempt](https://r2.airingdeng.com/blog/wj35/tree-chat-fail.webp)

Avatars in particular burned a lot of my time and money. Diffusion model outputs are like a blind box — never quite what you want.

![Diffusion-model avatar attempts](https://r2.airingdeng.com/blog/wj35/avatar-diffusion.webp)

But if you just let the coding model handle the art assets, you get this:

![Coding model generating art assets](https://r2.airingdeng.com/blog/wj35/code-art.webp)

There's still plenty more I want to make — I'll save it for another issue.

## 🌺 Life Moments

**⛰️ MacRitchie Hike**

[https://ursb.me/workouts/521415AA-9098-4F05-96D8-AF11B5893821/](https://ursb.me/workouts/521415AA-9098-4F05-96D8-AF11B5893821/)

![MacRitchie hike](https://r2.airingdeng.com/blog/wj35/macritchie.webp)

**🗡️ The Holy Sword Microphone**

I built myself a holy-sword-shaped microphone:

![Holy sword microphone](https://r2.airingdeng.com/blog/wj35/mic-sword.webp)

**⌨️ ZSA Voyager + Navigator + ZSA Moonlander**

Recently retired my HHKB series after over a decade of use, and picked up a ZSA Voyager + Navigator. The split keyboard took me two weeks of practice just to barely type again... but once it clicks, it's wonderful. So I went and bought a ZSA Moonlander too.

My desk's a mess right now, so I'll go with a stock photo this issue — looks roughly like this:

![ZSA Voyager split keyboard](https://r2.airingdeng.com/blog/wj35/zsa-voyager.webp)

**🎮 Roco Kingdom**

I've been hooked on Roco Kingdom lately, and caught a shiny-pink Snowshade Doll variant:

![Roco Kingdom shiny variant](https://r2.airingdeng.com/blog/wj35/rock-kingdom.webp)

## 🎬 Books, Films & Music

What I consumed this period:

- Watched: TV | *Fatal Wish* | ★★★★★
- Watched: TV | *Extraordinary Attorney Woo* | ★★★★★ | second rewatch
- Watched: Film | *Sacrifice Hill* | ★★★★☆
- Watched: TV | *The Boys: Season 5* | ★★★☆☆ — disappointing ending.
