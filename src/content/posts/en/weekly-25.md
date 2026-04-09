---
title: "Weekly #25: Love Concrete People"
date: 2024-03-17
tags: ["weekly"]
description: ""
---

This issue is a record of and reflection on life from January to March 2024.

I missed the last two issues. From Chinese New Year through the holidays and weekends, I'd been in preparation mode for my T11 performance review. Got through it this week — finally a bit of breathing room, and quiet weekends are back.

A couple of days ago I participated in an internal TED-style talk at the company. The night before I put together some slides, and the morning of I ran through the flow twice to get the pacing right, then walked on stage. I've always believed a talk doesn't need a script — what matters is composure, and adjusting your content and rhythm in response to the room. But it had been a full six years since I'd spoken in front of an audience, and I was nervous at first. As I got into my rhythm, though, things clicked — and to my complete surprise, I ended up winning first place. More than anything I felt genuinely delighted.

This issue is a written version of that talk: *Love Concrete People — A Human Approach to Quality Assurance in Engineering* (details have been anonymized).

![](https://airing.ursb.me/image/blog/wj25/%E7%88%B1%E5%85%B7%E4%BD%93%E7%9A%84%E4%BA%BA%E2%80%94%E2%80%94%E7%A0%94%E5%8F%91%E8%B4%A8%E9%87%8F%E4%BF%9D%E9%9A%9C%E7%9A%84%E4%BA%BA%E6%96%87%E5%85%B3%E6%80%80.001.jpeg)Imagine you're facing a choice: on one side, a one-off user complaint that can't be reproduced; on the other, a feature urgently waiting to ship. Given the constraints and ROI considerations, I think most people — including me — would instinctively choose to prioritize the feature. My hope is that after hearing this talk, that instinct gives you just a little pause.

![](https://airing.ursb.me/image/blog/wj25/%E7%88%B1%E5%85%B7%E4%BD%93%E7%9A%84%E4%BA%BA%E2%80%94%E2%80%94%E7%A0%94%E5%8F%91%E8%B4%A8%E9%87%8F%E4%BF%9D%E9%9A%9C%E7%9A%84%E4%BA%BA%E6%96%87%E5%85%B3%E6%80%80.002.jpeg)In our product's context, user feedback rates are quite low — partly because of the scale of the product and large denominators, but that doesn't mean individual feedback isn't worth taking seriously. When user problems go unresolved, users get frustrated fast. I took a screenshot just a couple of days ago — and there's a lot more like it, with language that really can't be quoted. At that point, in my view, the bond between that user and the product has become brittle.

![](https://airing.ursb.me/image/blog/wj25/%E7%88%B1%E5%85%B7%E4%BD%93%E7%9A%84%E4%BA%BA%E2%80%94%E2%80%94%E7%A0%94%E5%8F%91%E8%B4%A8%E9%87%8F%E4%BF%9D%E9%9A%9C%E7%9A%84%E4%BA%BA%E6%96%87%E5%85%B3%E6%80%80.004.jpeg)But if you actually pay attention, you'll find that the vast majority of users are friendly and sincere the first time they reach out. They're reaching out because they love the product — a problem came up and they want it fixed. Their intention is to help us make it better.

![](https://airing.ursb.me/image/blog/wj25/%E7%88%B1%E5%85%B7%E4%BD%93%E7%9A%84%E4%BA%BA%E2%80%94%E2%80%94%E7%A0%94%E5%8F%91%E8%B4%A8%E9%87%8F%E4%BF%9D%E9%9A%9C%E7%9A%84%E4%BA%BA%E6%96%87%E5%85%B3%E6%80%80.005.jpeg)Let me give you another example. A few days ago I grey-released a technical container, and monitoring picked up an interface throwing a few errors. I went to investigate — the errors were blocking users from entering the game. I found that over two days, only two users had been affected. Looking at one user's logs, I could see that after hitting the error, they'd tried logging in again every few hours — morning, noon, evening. Every single time it failed. They kept trying anyway. I could feel their frustration, and that evening I made fixing it the priority.

The point isn't that this bug was severe or subtle. What matters is that this user, from start to finish, never filed a single report. If the issue had kept being overlooked, we would have lost them — both of them. And even then, we'd never have known. Their individual numbers wouldn't have moved the conversion curve by a single visible tick.

![](https://airing.ursb.me/image/blog/wj25/%E7%88%B1%E5%85%B7%E4%BD%93%E7%9A%84%E4%BA%BA%E2%80%94%E2%80%94%E7%A0%94%E5%8F%91%E8%B4%A8%E9%87%8F%E4%BF%9D%E9%9A%9C%E7%9A%84%E4%BA%BA%E6%96%87%E5%85%B3%E6%80%80.006.jpeg)And for users who do reach out — when we solve their problem, they respond with gratitude, praise, and encouragement. In those moments I can really feel that the feedback on the other side of the screen is from real, living people — not a UID plus a User-Agent string. People I know personally also use our products. Imagine an elderly family member who can't figure out how to send a gift, or finishes a task but can't claim their reward, or wants to play and can't log in. How would you handle it then?

![](https://airing.ursb.me/image/blog/wj25/%E7%88%B1%E5%85%B7%E4%BD%93%E7%9A%84%E4%BA%BA%E2%80%94%E2%80%94%E7%A0%94%E5%8F%91%E8%B4%A8%E9%87%8F%E4%BF%9D%E9%9A%9C%E7%9A%84%E4%BA%BA%E6%96%87%E5%85%B3%E6%80%80.007.jpeg)Altman has a startup course at Stanford GSB, and two things he said really stuck with me.

The first is about **emotion**. He argues we shouldn't analyze our products through a purely rational lens — always chasing DAU, conversion rates, retention, ARPPU. We should mix in some feeling, think about product growth through an emotional lens. The relationship between a product and its users should be more like a courtship, or a marriage — something to build, maintain, and nurture over time.

![](https://airing.ursb.me/image/blog/wj25/%E7%88%B1%E5%85%B7%E4%BD%93%E7%9A%84%E4%BA%BA%E2%80%94%E2%80%94%E7%A0%94%E5%8F%91%E8%B4%A8%E9%87%8F%E4%BF%9D%E9%9A%9C%E7%9A%84%E4%BA%BA%E6%96%87%E5%85%B3%E6%80%80.008.jpeg)The second is about **respect**. He gives the example of WUFOO, an online form builder. Their team of 10 was serving 500,000 users, with over 1,000 issues to resolve every week. They assigned dedicated people to work through those issues on a rolling basis, aiming to clear the queue each week. The respect they showed their users is itself something to be respected.

![](https://airing.ursb.me/image/blog/wj25/%E7%88%B1%E5%85%B7%E4%BD%93%E7%9A%84%E4%BA%BA%E2%80%94%E2%80%94%E7%A0%94%E5%8F%91%E8%B4%A8%E9%87%8F%E4%BF%9D%E9%9A%9C%E7%9A%84%E4%BA%BA%E6%96%87%E5%85%B3%E6%80%80.009.jpeg)That made me think of a product I poured myself into back in school — and the warmth, support, and kind words I received in its feedback section. Those responses fed back into my love for building things, my stubborn desire to get products right. Even all these years later, recalling that feedback leaves me with a warmth inside, a sense of belief and strength.

![](https://airing.ursb.me/image/blog/wj25/%E7%88%B1%E5%85%B7%E4%BD%93%E7%9A%84%E4%BA%BA%E2%80%94%E2%80%94%E7%A0%94%E5%8F%91%E8%B4%A8%E9%87%8F%E4%BF%9D%E9%9A%9C%E7%9A%84%E4%BA%BA%E6%96%87%E5%85%B3%E6%80%80.010.jpeg)The last keyword is **meaning**. I recently read *Finite and Infinite Games*, in which the author frames every human activity as a kind of game — either finite or infinite. The latter carries a far stronger sense of purpose and value.

Returning to the scenario at the start of the talk: if you flip the perspective slightly, you get a completely different answer. If we're just pushing features from the outside in, resolving issues in order to build a better product, there's a clear endpoint and a repeatable cycle to it. That's a finite game.

But what if it's the other way around? If we're driven by a genuine belief in building something great — and the features and fixes flow from that — the internal motivation is incomparably stronger. From the inside out, the possibilities are infinite.

![](https://airing.ursb.me/image/blog/wj25/%E7%88%B1%E5%85%B7%E4%BD%93%E7%9A%84%E4%BA%BA%E2%80%94%E2%80%94%E7%A0%94%E5%8F%91%E8%B4%A8%E9%87%8F%E4%BF%9D%E9%9A%9C%E7%9A%84%E4%BA%BA%E6%96%87%E5%85%B3%E6%80%80.011.jpeg)To sum it all up: we should start from the lived experience of real users, pay attention to each one of them, and build the kind of warm connection between product and people that these things deserve.

![](https://airing.ursb.me/image/blog/wj25/%E7%88%B1%E5%85%B7%E4%BD%93%E7%9A%84%E4%BA%BA%E2%80%94%E2%80%94%E7%A0%94%E5%8F%91%E8%B4%A8%E9%87%8F%E4%BF%9D%E9%9A%9C%E7%9A%84%E4%BA%BA%E6%96%87%E5%85%B3%E6%80%80.012.jpeg)All of that, condensed into a single sentence we all know by heart: "User value above all else."

![](https://airing.ursb.me/image/blog/wj25/%E7%88%B1%E5%85%B7%E4%BD%93%E7%9A%84%E4%BA%BA%E2%80%94%E2%80%94%E7%A0%94%E5%8F%91%E8%B4%A8%E9%87%8F%E4%BF%9D%E9%9A%9C%E7%9A%84%E4%BA%BA%E6%96%87%E5%85%B3%E6%80%80.013.jpeg)Thank you.

![](https://airing.ursb.me/image/blog/wj25/%E7%88%B1%E5%85%B7%E4%BD%93%E7%9A%84%E4%BA%BA%E2%80%94%E2%80%94%E7%A0%94%E5%8F%91%E8%B4%A8%E9%87%8F%E4%BF%9D%E9%9A%9C%E7%9A%84%E4%BA%BA%E6%96%87%E5%85%B3%E6%80%80.014.jpeg)

## 🌺 Snippets from Life
A few moments from this period.

🏮 **Chinese New Year: The Moon Is Brightest Over Home**

![](https://airing.ursb.me/image/blog/wj25/4111710590875_.pic.jpg)![](https://airing.ursb.me/image/blog/wj25/4101710590872_.pic.jpg)![](https://airing.ursb.me/image/blog/wj25/4091710590872_.pic.jpg)🛫 **On the way back: shot of the Canton Tower from the plane**

![](https://airing.ursb.me/image/blog/wj25/4081710590871_.pic.jpg)🇭🇰 **Hong Kong: went to open a bank account**

![](https://airing.ursb.me/image/blog/wj25/4151710590881_.pic.jpg)![](https://airing.ursb.me/image/blog/wj25/4161710590882_.pic.jpg)![](https://airing.ursb.me/image/blog/wj25/4141710590879_.pic.jpg)![](https://airing.ursb.me/image/blog/wj25/4131710590878_.pic.jpg)🌇 **Sunset**

![](https://airing.ursb.me/image/blog/wj25/4071710590867_.pic.jpg)🏆 **Outstanding Individual Award & TED Talk**

![](https://airing.ursb.me/image/blog/wj25/4041710590865_.pic.jpg)![](https://airing.ursb.me/image/blog/wj25/4051710590866_.pic.jpg)🐱 **Mittens: still blissfully clueless**

![](https://airing.ursb.me/image/blog/wj25/4121710590877_.pic.jpg)

## 🎬 Books, Films, and More
What I've been reading, watching, and playing this period:

- Finished: Psychology | *Existential Psychotherapy* | ★★★★★
- Finished: Personal Finance | *Getting Rich Slowly* | ★★★★☆
- Finished: Philosophy | *Finite and Infinite Games* | ★★★★★
- Finished: Manga | *My Dearest Self with Malice Aforethought* | ★★★★★
- Finished: Film | *Pegasus 2* | ★★★★☆
- Finished: Film | *A Mother's Revenge* | ★★★☆☆
- Finished: Film | *The Long Way Round* | ★★★★☆
- Finished: Film | *Across the Ocean* | ★★★☆☆
- Finished: Film | *Swap* | ★☆☆☆☆
- Finished: US series | *Loki Season 2* | ★★★★☆
- Finished: Drama | *Hunt* | ★★☆☆☆
- Finished: Drama | *If Running Is My Life* | ★★★☆☆
- Finished: Anime | *Mashle: Magic and Muscles (Season 1)* | ★★★★☆
- Finished: Anime | *Jujutsu Kaisen Season 2* | ★★★★★
- Currently watching: Anime | *Frieren: Beyond Journey's End* | ★★★★★

Highly recommend *Frieren: Beyond Journey's End* 🎉

![](https://airing.ursb.me/image/blog/wj25/Capture-2024-03-17-145239.jpg)
