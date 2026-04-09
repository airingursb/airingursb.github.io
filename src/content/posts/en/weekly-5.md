---
title: "Weekly #5: A Day in My Life at TME"
date: 2022-06-04
tags: ["weekly"]
description: ""
---

## A Day in My Life at TME

- 7:30 — Wake up
- 8:10 — Leave home, take the company shuttle to work
- 8:50–9:30 — Arrive at the office; breakfast + reading through my reading list
- 9:30–10:00 — Review carry-overs from yesterday and plan today's tasks, then start working
- 10:00 — Morning standup; back to work afterward
- 12:00 — Lunch
- 12:30–13:30 — Read articles from my reading list, or read a book
- 13:30–14:15 — Nap; back to afternoon work afterward
- 18:00 — Dinner
- 19:00–21:00 — Evening coding session, until it's time to go home
- 22:00–23:30 — Entertainment / downtime
- 23:30–00:00 — Pre-sleep reading, away from screens, winding down

The walk to the shuttle stop:
![](https://airing.ursb.me/image/blog/20220604114354.jpg)

My desk at the office:
![](https://airing.ursb.me/image/blog/20220604114352.jpg)

My desk at home:
![](https://airing.ursb.me/image/blog/20220604114353.jpg)

## Weekly Picks
### Tech: Why's THE Design
Came across a great blog this week: [Why's THE Design — Programming with Faith](https://draveness.me/whys-the-design/). The author has written a series of articles about design decisions in computer science. Each post poses a specific question and examines the pros, cons, and implementation implications of the design choice from multiple angles. This "ask a question, then dig deep" approach to learning is well worth adopting.

![](https://airing.ursb.me/image/blog/20220604113130.png)

### App: 1Password 8
As a long-time 1Password user, I'd been sitting on version 7 and hadn't bothered upgrading. A while back, news broke that the new version was built with Electron, and the comments were full of people complaining about performance and lamenting the move away from native development. But this week I actually looked at the 1Password 8 landing page, and the new UI completely won me over — I caved and upgraded.

![](https://airing.ursb.me/image/blog/20220604114351.png)After a few days of use, I can say: for a password manager, there's really nothing that demands heavy CPU resources, and the Electron performance is perfectly smooth throughout. If the team hadn't publicly mentioned switching tech stacks, I don't think anyone would have noticed the new 1Password isn't built natively.

This reminded me of an article I read a while back (I can't find the link, unfortunately) about an iOS developer who quietly replaced a native app with a PWA shell in a new version — and none of the users noticed.

User experience isn't just about theoretical peak performance. It's about the overall interaction design, animation quality, and the intelligence of loading sequences — understanding the real user's experience and tolerance. Start from that, and then choose the technology stack that fits your product and workflow best.

*PS: I have three open slots on my 1Password Family plan. If anyone's interested, reach out.*

## This Week's Log
This is a new section starting this issue — a short personal digest tracking my reading, watching, and coding for the week. For books and films I've finished, I'll include a quick personal rating. The coding stats are pulled from Wakatime, which a GitHub Action fetches weekly and syncs to my [Gist](https://gist.github.com/airingursb/ca03eaa58db87fc814e0fe6ba3c48215). Since I only set up the Wakatime plugin on June 1st, the coding data starts from that date.

I'll also set up a CI pipeline so that when I publish each issue, it automatically fetches my Douban and Gist data and generates this section.

### Recent Viewings

- Finished: Novel | *The Decagon House Murders* | ★★★★★
- Finished: Film | *Everything Everywhere All at Once* | ★★★★★
- Finished: TV | *The Ghetto at the Top of the World* | ★★★☆☆
- Reading: Novel | *Red Finger*
- Watching: Anime | *Summer Time Rendering*
- Watching: Anime | *Spy × Family*
- Playing: Game | *Overcooked! 2*
- Playing: Game | *Outer Wilds*

### Recent Code (June 1–2)
```
TypeScript React   11 hrs 3 mins  ██████████████▌░░░░░░  69.5%
TypeScript         4 hrs 45 mins  ██████▎░░░░░░░░░░░░░░  30.0%
Objective-C        3 mins         ░░░░░░░░░░░░░░░░░░░░░   0.3%
Bash               0 secs         ░░░░░░░░░░░░░░░░░░░░░   0.1%
Markdown           0 secs         ░░░░░░░░░░░░░░░░░░░░░   0.1%
```
