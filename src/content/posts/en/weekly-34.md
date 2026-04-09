---
title: "Weekly #34: The Joy of Making Things"
date: 2026-04-05
tags: ["weekly"]
description: ""
cover: "https://airing.ursb.me/image/blog/wj34/2026-04-05.jpg"
---

This issue covers my reflections from March 2026.

When I first learned to program more than a decade ago, I'd often code until two or three in the morning without noticing the time, watching what was in my head slowly take shape under my fingertips. In [Monthly (Issue 24): Ten Years of Programming](https://ursb.me/posts/weekly-24/), I wrote: "Those late nights, full of excitement as I built that game — even now, looking back, that feeling hasn't dimmed at all. I think that must have been the purest form of love."

After years in the industry, that raw joy of making has been quietly fading — more time spent on collaboration, processes, and engineering complexity, and fewer real opportunities to build something from nothing. Then recently, Opus 4.6 helped me find that feeling again. Claude Code has become my source of joy after work. The only frustration is that Claude Max is nowhere near enough — a single window typically burns out in about forty minutes, and then I sit there watching the five-hour countdown, waiting for the window to reset so I can get back to building.

This month I made a few things with it. Here's a look at what that was like.

## A New Blog

> Building a blog platform, time spent: one weekend (2 days).

The blog has gone through another iteration — this is the fifth major version since 2014:

> The full history is documented in [Weekly (Issue 4): The Evolution of My Personal Blog](https://ursb.me/posts/weekly-4/). I'll just list the technical and visual changes at each stage here.

**2014: WordPress**

![](https://airing.ursb.me/image/blog/wj34/image.png)

**2015: Hexo**

Can't find any screenshots anymore.

**2017: Typecho**

![](https://airing.ursb.me/image/blog/wj34/image%201.png)

I also ran a separate weekly newsletter site for a while, which I merged into the main blog in 2023.

![](https://airing.ursb.me/image/blog/wj34/image%202.png)

**2023: Typlog**

![](https://airing.ursb.me/image/blog/wj34/CleanShot%202026-04-05%20at%2016.26.14@2x.png)

**2026: Astro**

The new blog has a magazine-style look:

![](https://airing.ursb.me/image/blog/wj34/CleanShot%202026-04-05%20at%2016.10.54@2x.png)

With a dynamic activity calendar:

![](https://airing.ursb.me/image/blog/wj34/CleanShot%202026-04-05%20at%2016.11.03@2x.png)

And AI Chat + Skills integration that can output interactive learning notes — great for co-creating educational content with AI:

![](https://airing.ursb.me/image/blog/wj34/CleanShot%202026-04-05%20at%2016.11.13@2x.png)
![](https://airing.ursb.me/image/blog/wj34/CleanShot%202026-04-05%20at%2016.13.01@2x.png)

There are some little surprises scattered throughout, like inline sidebar comments:

![](https://airing.ursb.me/image/blog/wj34/CleanShot%202026-04-05%20at%2016.13.33@2x.png)

The whole site was vibe-coded over a weekend as a static blog, with GitHub Actions pre-building and injecting data. But a lot of dynamic features — likes, comments, view counts — still use Serverless Functions under the hood.

Before, a project like this would have taken months, which is why I'd just subscribe to a blogging platform instead. But then you're always fighting against someone else's theme or feature constraints. Now, if you have an idea, AI can help you build it. **The bottleneck in software is shifting from engineering complexity to imagination itself.**

## A Personal Finance App

> Building an iOS app MVP from scratch, time spent: 2 hours.

I built a personal finance app MVP from zero in two hours. I've been looking for an app that has the design aesthetic of Copilot Money but the functionality of MoneyWiz — multi-currency support, portfolio tracking, budget management — along with voice input and AI-powered portfolio discussion, all cross-platform. I haven't found one. Apps with good looks tend to be feature-light, and apps with features tend to be clunky. Multi-currency in particular is always a core need for anyone living outside their home country.

So I built one: product concept, UI design, development, and testing — the full loop, handled by an agent.

**Step 1: Claude Code + Pencil for design**

This starts with defining a design system and spec, then describing the product's functionality and letting multiple agents simultaneously design screens, then iterating in conversation. You watch your mental image of the product materialize in front of you.

![](https://airing.ursb.me/image/blog/wj34/Pasted%202026-04-05-16-03-39.jpg)

**Step 2: Claude Code + Superpowers to refine the product design in conversation**

This step is mainly checking whether the features are internally consistent, whether any user flows are missing, and whether the design could be improved anywhere. These first two steps are the most important part of the whole process — they took about 1.5 hours in total. If the design is solid, the build that follows will be accurate.

The conversation itself is genuinely enjoyable. It's like having a rough idea in your head and a friend with deep industry experience helping you turn something naive into something polished and production-worthy. Every few minutes there's an "oh yes, *that's* what I wanted" moment.

**Step 3: Parallel multi-agent development**

After the design phase, it's straight into development. The agent writes the spec, you confirm the tech stack, and then you kick off parallel multi-agent development. The process runs according to the project's complexity — no need to tell it to test itself (set up the MCP and it handles that), no human intervention needed, one continuous build. You just sit back and drink tea. Because so much context was established in the earlier conversations, the agent has everything it needs.

The result was great — the UI fidelity was very high.

![](https://airing.ursb.me/image/blog/wj34/Pasted%202026-04-05-16-03-39%201.jpg)
![](https://airing.ursb.me/image/blog/wj34/Pasted%202026-04-05-16-03-39%202.jpg)

The AI runs its own self-tests:

![](https://airing.ursb.me/image/blog/wj34/Pasted%202026-04-05-16-03-39%203.jpg)

Then you merge and ship.

![](https://airing.ursb.me/image/blog/wj34/Pasted%202026-04-05-16-03-39.png)

Before, getting something to this point would have taken one designer and one developer, probably a month between the two of them.

Now it takes one person, in two hours.

## A New Personal Homepage

The old version was like this — fairly minimal:

![](https://airing.ursb.me/image/blog/wj34/image%203.png)

The new version looks like this:

![](https://airing.ursb.me/image/blog/wj34/CleanShot%202026-04-05%20at%2016.14.39@2x.png)

There are a few new things to explore over at [ursb.me](https://ursb.me):

- AI Chat (still being tuned)
- Real-time listening status sync
- Mood and fitness data sync
- Bookmarks, channel, blog, and notes update sync
- Vibe Coding stats
- And quite a few small surprises

## Other Projects

**[How to Train Your LLM](https://airingursb.github.io/how-to-train-your-llm)**: An interactive mini-game for learning the basics of LLMs through play.

**[Claude-101](https://airingursb.github.io/claude-101/)**: An interactive learning project, with analysis based on the previously leaked 2.1.88 source code.

**Linear workflow**: I've been experimenting with using Linear to assign tasks to agents, track progress, and generate summaries. Assigning tasks to agents isn't new — tools like Slock and Multica already do it — but the integration with Linear's project management capabilities makes the experience feel more complete. On the deployment side, in addition to Codex, I've also self-hosted Cline to run Claude Code and Gemini.

---

Looking back at everything I built this month, none of it was strictly necessary — I could have kept writing in Typlog, I could have downloaded an existing finance app, and my homepage was perfectly fine as it was. But I built them anyway, and I had a great time doing it.

I've always believed that the pleasure of making things is fundamentally a confirmation that *I can have an impact on this world*. A baby who discovers that pushing a toy makes it move will flail with delight. When we write code, build systems, and ship products, the drive underneath isn't really that different from that baby's.

AI hasn't diminished this pleasure — it's amplified it. Before, engineering constraints and time costs meant many ideas just stayed in your head. Now the path from idea to reality has been dramatically shortened: a thought can become something you can touch in a few hours. That means we get to experience the moment of opening something we made more often. We get to feel the joy of creation more frequently.

Of course, tools are still just tools. What actually brings joy is never the tool — it's having something in your mind that you want to build, and then building it. AI has made *building it* much easier. But *wanting to build it* — that can only ever come from you.

**Holding onto the urge to create is probably the best antidote to burnout.**

## Life Moments

**✈️ Shanghai**

I had a brief work trip to Shanghai this month. Time was tight, so I didn't manage to meet up with anyone.

![](https://airing.ursb.me/image/blog/wj34/2026-04-05%2016.58.17.jpg)
![](https://airing.ursb.me/image/blog/wj34/2026-04-05%2016.58.22.jpg)

**🤖 New Glasses**

![](https://airing.ursb.me/image/blog/wj34/telegram-cloud-photo-size-5-6174856430171655762-y.jpg)

These work nicely connected to OpenClaw — I now have a 24/7 assistant available on demand. I'm running OpenClaw as a service on the Mac Mini and connecting to it via Tailscale.

The real-time conversation subtitles have also been incredibly useful. My English communication with colleagues is nearly seamless now — before, I'd sometimes lose track when someone spoke quickly. The Chinese-to-English translation feature has also been handy for everyday spoken English practice.

## Books, Films & Music

Here's what I consumed this period:

- Watched: Film | *Project Hail Mary* | ★★★★★
- Watched: Film | *The Way Home* | ★★★☆☆
