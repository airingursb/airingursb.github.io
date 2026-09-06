---
title: "Monthly #36: A Beginning"
date: 2026-09-06
tags: ["weekly"]
description: "June to August: a growing AI bill, little worlds of my own, a trip to Seoul and Busan, and finding my rhythm again through walks, games, and everyday life."
cover: https://r2.airingdeng.com/blog/wj36/cover-c0b38e12b394/full.webp
draft: false
---

These are my notes and reflections from June through August 2026.

The last monthly update was in May. Somehow, three months have gone by. A few times along the way, I opened my notebook, jotted down some keywords, and told myself I'd fill in the rest that weekend, or whenever I had time. And here we are. I also turned 31 during this stretch, so I'm calling this one *A Beginning*. There's no grand meaning behind it. Just a few months of life in fragments. Read it as a diary.

Quite a lot happened: a trip to Korea, more slightly unhinged vibe coding, tinkering with my reading stream and little worlds, a few new toys, and getting back into games. Looking through my journal, there are weekends I've already completely forgotten. Good thing I left myself a few lines at the time.

## The AI Bill Keeps Growing

Last issue, I was saying one Claude account wasn't enough. Over the past few months, I've kept buying more AI subscriptions. I'm now up to two Claude Max 20x accounts, plus a ChatGPT Pro 20x account, Cursor Ultra × Grok Bot (mostly to try Grok Bot, only for them to lower the subscription requirement later…), and assorted tools I've tried along the way. The AI bill has climbed past S$1,000. I used to agonize over buying an app. Now I agonize over feeding another AI account.

It's expensive, but I've made a few pretty damn cool systems with it. Some are experiments for work; others are little toys purely for myself. A few months ago, I wouldn't even have considered spending time on many of these things. Now I think: might as well try. What if I can get it working tonight? That feeling gets addictive very quickly.

Before heading out, I give my agents some work. By the time I get home that evening, they've usually worked through most of the quota. While I'm out, I can pull out my phone and assign another task, or settle into a café, write a little, and check remotely on how Professor Claude is doing. Humans get holidays. Agents don't.

Being able to hand a task to a remote computer from my phone, check progress, and add a quick instruction whenever I want is genuinely convenient. Things that used to require sitting at my desk can now inch forward over a meal, on a walk, or while waiting for a ride.

So when I choose tools now, I care about more than raw capability. Can they actually finish the job? Do they take initiative? How often do they get it right on the first delivery, instead of making me spend every day arguing with them and watching over their shoulders? With a dozen sessions running at once, I become the bottleneck too. They're all waiting for my sign-off, documents are waiting to be read, and new ideas keep arriving. Turns out I can buy more AI quota, but I still only have so much attention.

## Giving Grok Bot a Few Jobs

In August, I finally gave in and bought Grok Bot. At first, I was still wondering what to do with it. Before long, I had a whole row of bots with their own jobs: a collection secretary, an email assistant, a blog assistant, and developers for individual projects.

The collection secretary gets the most use. When I bookmark something on X, save an article to Raindrop, or forward it to a WeChat service account or Telegram, it periodically gathers the new items into my Notion inbox. I used to move things between all these places myself. Now I just keep saving things the way I always have.

The email assistant picks out messages worth my attention in the morning and checks for anything urgent during the day. The blog assistant keeps an eye on reader comments and feedback. They're a good fit for those small, easy-to-forget jobs that don't really deserve a whole block of my time.

The development bots are split by project too. The blog, the news subscription system, and MoneyWise each have their own. When I want to pick something back up, I return to its conversation. There's also a source-code study companion for slowly taking apart implementations I find interesting.

I like using them this way. Give a bot something to look after over the long term, and I don't have to explain the background all over again every day or remember to check everything myself. I can open it, see what it's been up to, and add a thought if needed. It's starting to feel a little like working with a few familiar colleagues.

## Still Tinkering with My Little Worlds

The blog and my little worlds are still changing, bit by bit.

I wrote quite a lot about them in May. These past few months have mostly been smaller additions: adjusting interactions, filling in details, playing with the animals' movements, and redoing anything I don't like. I tried generating video to improve the pet animations, and in early September, another conversation with AI somehow turned into making a game. Still very much the sort of thing where I look up and realize it's far too late.

I also gave the article pages a panda in the bottom-right corner. On a computer, it looks wherever your mouse goes. Such a tiny movement, but suddenly the page feels like it has something alive in it.

![A screenshot of an article page. The panda in the bottom-right corner follows the mouse with its head. Try it on a computer.](https://r2.airingdeng.com/blog/wj36/3d2fdd52-9483-8155-bb1c-e33e4d0c2470-8b95b0b979ef/full.webp)

The process was fun too, mostly following an idea from an open-source project. I first used image-2 to establish the panda's appearance and keyframes, keeping the watercolor texture and hand-drawn lines. Then I handed them to [MiniMax H3](https://www.minimax.io/blog/minimax-h3) to generate the head turns. Initially, I made separate clips for eight directions. Later, I switched to one continuous loop: start at the upper left, look around clockwise, and return to the upper left. The same image serves as both the first and last frame. The body, paws, and camera stay still; only the head and eyes follow the directions.

I deliberately used a solid green background so I could remove it afterward. Once I had the video, I extracted the frames, removed duplicates and excess footage at either end, and kept 54 frames. These became a single transparent WebP sprite sheet. Below are the finished head-turn poses. Each little square is a pose the panda can hold.

![The 54 finished head-turn frames. The page selects a frame based on the mouse's direction.](https://r2.airingdeng.com/blog/wj36/3d2fdd52-9483-8149-9e24-e3754e68ef35-7a480cc66b22/full.webp)

Then comes the frontend part: calculate the angle of the mouse relative to the panda's center, map that angle to a frame, and draw it on a canvas. As the mouse moves, the panda turns smoothly toward the target pose. When it crosses the seam between the first and last frames, it takes the shorter route instead of going all the way around. There's also a small area near the center where turning isn't triggered, so it doesn't twitch when the pointer gets too close. Once it reaches the right pose, it stops redrawing and quietly watches.

So although it looks like it's moving continuously, it's really choosing the most suitable pose from a set of movements generated in advance. AI makes the character and the motion; a little code connects the small interactions. Not terribly useful, but whenever I open an article, I still can't resist waving the mouse around a couple of times.

Yesterday, I also used GPT-6 to make some 3D dioramas for the blog. I wanted to turn moments from my journal and four-panel comics into little scenes you can rotate and look at up close.

One is [*Marina Bay in the Rain*](https://ursb.me/diorama/rainy-marina-bay/), holding that day in July when we got caught in the rain while cycling. Two bicycles are parked nearby, the characters sit at a bus stop, and Marina Bay Sands stands in the distance. The two little fellows waiting side by side for the rain to stop are pretty cute.

![A preview of the Marina Bay in the Rain diorama.](https://r2.airingdeng.com/blog/wj36/3d2fdd52-9483-8196-9868-cf49979c99b0-af0fbfc0f5ac/full.webp)

The other is [*Saving the Sea Breeze for a Birthday*](https://ursb.me/diorama/busan-birthday-sea/), remembering Busan on June 30. Little boats by the water, a red lighthouse, shops under warm lights. A small place to hold the sea breeze and everyday bustle of that birthday.

![A preview of the Saving the Sea Breeze for a Birthday diorama.](https://r2.airingdeng.com/blog/wj36/3d2fdd52-9483-8153-837a-facb66200aaf-281ee9c8ee4b/full.webp)

Working on these, I found GPT-6 surprisingly good at 3D, a real step up from before. The shapes, materials, and lighting come together into something quite pleasing. Especially once the two characters sit down in the scene, it suddenly feels like they live there. I keep dragging the scenes around and zooming in to inspect the details. Both can be rotated and zoomed, and clicking the numbered markers opens the little memories attached to them. Here are two previews; you're welcome to explore the [diorama shelf](https://ursb.me/diorama/). Whenever there's another bit of everyday life I want to keep, I can add it there.

That's the joy of making your own things. A tiny idea turns into something on the screen. You can click it, play with it, and keep changing it. How is that not more fun than any game?

Another happy thing in June: one of my articles made it onto the Hacker News front page, and suddenly people were visiting from all over the world. Most of the time, I'm just tinkering away on my blog. When strangers discover these things and take the time to read them, it feels pretty lucky that someone else cares about something I've put so many hours into.

## Sharing My Reading Stream

Last year, I wrote about [my Claude-based reading workflow](https://ursb.me/en/posts/weekly-31/). This time, I finally connected it to the outside world: a [Reading Stream](https://ursb.me/en/reading/) that anyone can browse.

The collection secretary I mentioned earlier files materials into a Notion database, and the public reading records appear on the blog. Sources include X, WeChat public accounts, GitHub, newsletters, and pages I happen to come across. You can now filter by source and month. Each item has its own reading page and a whiteboard-style illustration, which makes finding things again much easier.

![Reading Stream: keeping a record of what I've been reading on the blog.](https://r2.airingdeng.com/blog/wj36/3d2fdd52-9483-810a-a67d-dab1121d6694-0349b2502fbb/full.webp)

This version is already available, though I'm still refining some details. I like turning an everyday habit into a little product. What started as a way to keep track of what I've been reading can slowly become a way to connect with other people too.

If you're also interested in agents, technology, and these odd little toys, you're welcome to subscribe. To follow updates in your feed reader, use the [Reading Stream RSS feed](https://ursb.me/en/reading/feed.xml). If you prefer email, click “Subscribe” on the [Reading Stream page](https://ursb.me/en/reading/) and select the reading digest. The plan is to bring together the past week's pieces worth revisiting every Monday. You can choose it separately from blog post notifications.

![Reading Stream subscriptions: live RSS updates or a weekly email.](https://r2.airingdeng.com/blog/wj36/3d2fdd52-9483-815a-ba4a-d49de3e11e73-c9c8ed1042d0/full.webp)

Of course, the question that bothered me when I wrote about this last year hasn't changed: I've collected all this stuff, but how much have I actually read?

When collecting, organizing, and searching for information all go smoothly, it's easy to feel as though I've already absorbed a great deal. Especially now, when even a complete-looking summary takes almost no time to generate. But when I sit down to write something of my own with those materials, I still have to think it through again. Which parts do I agree with? Which parts merely sound reasonable?

I spent almost every weekend in August preparing documents. AI helped a lot, but I eventually found that sorting things out and explaining them clearly still required me to do the work. I even took a day of annual leave to finish writing in peace, and still ended up getting interrupted by all sorts of things.

That's roughly how these past few months with AI have felt: astonishment at what it can do, alongside repeated encounters with my own limits. Before, I wanted to make things but lacked the time and energy. Now there are too many things I can make and want to make, and I end up scattered and a little restless.

## Wanting to Do Everything at Once

I've been reading *Cognitive Awakening* (认知觉醒), and highlighted this line: “Wanting to do many things at once, and wanting to see results immediately.”

Sounds a bit like me. I want to do well at work, keep building my toys, read books, and play games. Something new comes along, and I think: I could learn that, or make this. Now that AI has shortened the distance between an idea and getting started, this tendency has become even more obvious.

An idea used to be something I might think about and leave there. Now I can open a new task almost without thinking. Starting is easy; finishing isn't. Plenty of things still need a solid stretch of time where I can sit down and think. So although I've made quite a lot these past few months, I've also been tired. Some weekends, even after a day spent doing things I enjoy, my brain still doesn't feel rested.

I haven't found a particularly good solution. I still bought that Nth account. I'm still going to start new projects.

I'm just beginning to think I need to leave some time for things that can't be sped up. Going for a walk, sitting by the sea doing nothing, or properly losing myself in a game for a few hours. Otherwise, life can so easily turn into an endless loop.

## Korea: Seoul and Busan

I went to Korea from late June into early July, starting in Seoul and then going to Busan.

When I arrived in Seoul that afternoon, I thought I'd rest a little before heading out. Instead, I slept until 7:30 p.m. Then came barbecue, followed by fried chicken and beer, and staying out well past midnight.

Food was the most reliable source of happiness on this trip. Most days, I slept until around noon before going out. Shopping in Myeongdong, finding cafés in Seongsu-dong, buying clothes and Miffy things. I visited Gyeongbokgung Palace and Seoul Tower too, though neither particularly amazed me. The barbecue place in Hongdae, on the other hand, was good enough that I went back for another meal.

![June 28, Seongsu. A sunset I came across while shopping.](https://r2.airingdeng.com/blog/wj36/3d2fdd52-9483-81e3-8225-cbe31843ff75-8644835fcebd/full.webp)

I like this street-corner shot too. Wires tangled overhead, traffic lights and signs crowded together, and the evening sun landing right on the glass across the street. Sometimes, it's an ordinary corner like this that stays with you from a trip.

![Evening light at a street corner, with overhead wires and golden reflections in the glass.](https://r2.airingdeng.com/blog/wj36/3d2fdd52-9483-8125-8e47-d98161ceb230-344402076dfd/full.webp)

I also kept a photo of [Heungnyemun Gate](https://royal.khs.go.kr/ENG/contents/E101020000.do?bdProgramCode=storyCtg3&pageType=story&schBdcode=gbg) at Gyeongbokgung Palace: two tiers of tiled roofs, red and green painted details beneath the eaves, and mountains behind it. People in hanbok stood outside, while others strolled slowly under umbrellas. It didn't leave a huge impression at the time, but looking back at the photo, it does feel like summer.

![Heungnyemun Gate at Gyeongbokgung Palace.](https://r2.airingdeng.com/blog/wj36/3d2fdd52-9483-81ac-bb63-c2096f13419c-028c83c76fb6/full.webp)

I also took a photo of sunset over Seoul from up high. Trees and a red-and-white tower in the foreground; buildings packed all the way to the horizon. As the sun went down, the sky was still warm gold, but the city was already turning a little gray-blue. Finding this photo again made me think Seoul really is rather lovely.

[![Sunset over Seoul, with the KBS Namsan broadcasting tower in the foreground.](https://r2.airingdeng.com/blog/wj36/3d2fdd52-9483-81f2-ab14-ea5f2d904776-3a62004af8e5/full.webp)](https://www.ohmynews.com/NWS_Web/View/at_pg.aspx?CNTN_CD=A0001454263)

And then there was budae-jjigae. After wandering around until late, sitting down to a bubbling pot of stew is easier to remember than how many sights I visited that day.

![Budae-jjigae in Hongdae after a late evening out.](https://r2.airingdeng.com/blog/wj36/3d2fdd52-9483-81fa-a628-faf6c2150579-d4e8e016cd8b/full.webp)

On June 30, I took a two-and-a-half-hour train ride to Busan. As soon as I got to the coast, I felt much better. The sea breeze was warm and gentle.

![The Busan waterfront on June 30.](https://r2.airingdeng.com/blog/wj36/8bce3d80-e083-4ad1-b6db-4f184d44626f-0c0ce20a809c/full.webp)

In Busan, I had excellent soy-marinated crab and raw marinated seafood, ate samgyetang, and visited T1's gaming café. I bought a white 2024 team jersey. That year's Sylas and Galio performances really stayed with me.

I also took my camera down to the sea. Looking back, what comes to mind isn't so much which places I checked off that day. It's the evening before the sky had gone fully dark, the shore lights already coming on, and the sea and sky both blue.

![June 30, Busan. Follow the street downhill and you reach the sea.](https://r2.airingdeng.com/blog/wj36/3d2fdd52-9483-8137-9fac-d746cbeee782-b2ac4da8fd18/full.webp)

The next day was overcast. A white lighthouse stood at the end of the breakwater, with a heap of concrete wave breakers beside it. The sea and sky were both gray-blue. Two very different versions of the coast, just a day apart.

![A white lighthouse and an overcast sea.](https://r2.airingdeng.com/blog/wj36/3d2fdd52-9483-816c-abbc-dcca568d8ab8-e5cc73328a06/full.webp)

I wasn't completely switched off, of course. There were still a few agents working across my two phones. On the day Fable returned, I topped up two 20x accounts, prepared a bunch of task prompts in advance, and handed out work from my phone while walking around.

On the day I left Busan, I spent another hour at a seaside Starbucks before heading to the airport. I like that point in a trip when there's nothing much left to rush to, just time to sit with a drink.

![A little train on an elevated track, also kept in my photo album.](https://r2.airingdeng.com/blog/wj36/3d2fdd52-9483-8188-b1e2-da451d4eb6a3-5120392cf5d5/full.webp)

## 🌺 Bits of Everyday Life

**👋 A Friend Visits Singapore**

A friend came to Singapore for a weekend in July. I took him out for a bit. We had hotpot skewers at night and bak kut teh for lunch, then went to Sentosa. He went off to take photos while I sat by the sea for a while.

The next day, we had dim sum before I saw him off. A very simple visit.

**🥾 Getting Out for a Walk Again**

I walked the southern route at MacRitchie in June and the Southern Ridges again in August. Before leaving, I might think it'll be hot and tiring, but once I'm walking, it feels better. Especially lately, with so much in my head, a walk lets me focus on just the stretch of path in front of me.

In July, I also took my new bicycle out, only to get caught halfway through by a sudden tropical downpour.

![July 18, out cycling.](https://r2.airingdeng.com/blog/wj36/3d2fdd52-9483-8104-a392-c62af34e632a-e2c44af45dc7/full.webp)

**🎮 Switching Contexts with Games**

I bought a Switch 2 in August and spent four hours of one weekend playing *Dynasty Warriors: Origins*. Games are fun, of course, but I found that even mowing through crowds in Dynasty Warriors could feel tiring. After dealing with so much during the day, jumping into another battle didn't really let my brain stop.

So I started wanting something aimless and easygoing. I reopened *Animal Crossing*, which had been gathering dust for ages, and alternated between that and *Pokopia*. Both are just right. Wander around if I feel like it, build something if I want to, without setting myself any goals.

As I play, my attention gradually moves away from the day's business. Work problems and unfinished projects can sit aside while I spend a little time in another small world. A bit like an LLM: when the context fills up, you need to `/clear`. Switch the context in your head, or the whole session turns to mush and gets less useful the longer it goes on.

**💍 Oura Ring 5**

At the end of July, I bought an Oura Ring 5. Another little toy for keeping track of how my body is doing. I talked several colleagues into getting one too. Sadly, Oura hasn't cut me in on any of the profits.

**📱 Weekends with Just an iPad**

Herdr + Moshi has been a really comfortable combination lately. Even when I'm out, I can connect remotely to my computer and carry on with my own things. I later bought Moshi's lifetime plan. Using it has made working from just about anywhere feel quite practical.

These days, I'll head out on a weekend with only my iPad, find a café or teahouse, order a drink, and work remotely for a while. I've spent a whole afternoon sitting in a teahouse like that and felt pretty focused.

The computer stays home, and whatever needs to run keeps running. I just sit somewhere else. When I want to check on things, I connect; when I'm tired, I have a drink and take a break. It's nice. I'm still doing things, but being able to choose the place and set my own pace makes a real difference.

## 🎬 Books, Films, and Shows

I've also read and watched a few things over these months. Here are some worth noting.

- Watched: Film | *The Odyssey* | ★★★★★
- Watched: Film | *Spider-Man 4* | ★★★★★
- Watched: Film | *Obsession* (痴迷) | ★★★★★
- Watched: Series | *I Will Find You* (我会找到你) | ★★★☆☆
- Watched: Anime | *Re:Zero — Starting Life in Another World*, Season 4 | ★★★★★
- Finished: Book | *Cognitive Awakening* (认知觉醒) | ★★★☆☆
- Reading: Book | *Gödel, Escher, Bach* | ★★★★★

Finally, I want to share [“HEART BEAT” by YOASOBI](https://www.bilibili.com/video/BV1x64y1H7wG/).

[![The HEART BEAT group performance.](https://r2.airingdeng.com/blog/wj36/3d2fdd52-9483-81b5-ad05-effa032b234c-c5bfcb9d51b5/full.webp)](https://www.bilibili.com/video/BV1x64y1H7wG/)

I've always liked group singing, and I like this side of YOASOBI's music. So many people earnestly singing the same song, their voices coming together, their faces completely absorbed in it. It's infectious. Even through a screen, I get caught up in the excitement. There's so much power in that sound.

I've been tired a lot lately, but watching them sing like this makes me feel I can keep doing a few more things I love. So I'll let it close this monthly update that's been three months in the making, and give myself a little encouragement too.

Reading back through these three months of journal entries, most days were ordinary: work, meetings, writing, then more tinkering at night. On weekends, I'd find somewhere else to keep going. Sometimes excited, sometimes complaining about being tired.

But there were still plenty of moments I liked enough to keep: the sea breeze in Busan, opening Animal Crossing again, finally being able to play something I'd spent ages building, or hearing from a reader I'd never met.

One of my Grok Bots makes a card each morning from a passage I've highlighted in my past reading. This morning, I drew this one. I sat with it for a bit and thought it made a lot of sense, so I'm sharing it here:

![A daily Readwise card about freedom and the circumstances that give it ground, from Sarah Bakewell's At the Existentialist Café.](https://r2.airingdeng.com/blog/wj36/3d3fdd52-9483-80e1-9c52-d39f8283fa1a-bb4a4f255803/full.webp)

*The card above is in Chinese. Here is a translation:*

**Real freedom doesn't mean casting off your circumstances. It means finding your footing through them.**

> “Freedom does not mean acting entirely without constraints, nor does it mean acting arbitrarily. We often mistakenly think that the very things that make us free—our context, meaning, facticity, circumstances, and general direction in life—define us and constrain our freedom. In fact, it is only through all these things that we can gain freedom in the fullest sense.”
>
> — *At the Existentialist Café*, Sarah Bakewell; translated here from the Chinese passage on the card

The things that seem to define and limit you—your context, the facts, your direction—are also the scaffolding of freedom.

Without ground beneath you, choices have nowhere to land; without facticity, commitments have nowhere to take shape.

What we call “being unconstrained” can simply push action back into a vacuum that will never arrive.

Freedom is not escaping your circumstances. It's standing on the ground you've already been given, and still being willing to take a step.

This monthly update took a long time, written in little bits and pieces. There's no single big point to this issue. I just thought these things were worth writing down. Hopefully, the next one won't take another three months.
