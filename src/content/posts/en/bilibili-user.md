---
title: "Analysis of Bilibili's 20 Million Users"
date: 2016-02-23
tags: ["tech"]
description: ""
---

## Preface

With some free time on my hands a few days ago, I spent four or five days scraping all 20 million users from Bilibili (http://bilibili.com).

The code is on GitHub: https://github.com/airingursb/bilibili-user — feel free to download and run it yourself.

## About Bilibili

Bilibili is currently the largest youth pop-culture entertainment community in China. The site was founded on June 26, 2009 and is commonly known as "B Site."

I registered my own account on February 14, 2013. I vaguely remember that Bilibili restricted registrations before the summer of 2013 — new registrations were only open on special holidays — and later moved to a captcha-based registration plus a quiz to become a full member.

Below I'll walk through what the user data looks like. (This is just a preliminary look.)

## User Overview

Bilibili is steeped in ACG (anime, comics, games) culture. Together with AcFun (A site), it holds up the sky of Chinese animation fandom.

So the users are... well, let's just take a look at some randomly captured user signature screenshots:

![User Signatures](https://airing.ursb.me/ursbbilibili-sign1.png)

![User Signatures](https://airing.ursb.me/ursbbilibili-sign2.png)

![User Signatures](https://airing.ursb.me/ursbbilibili-sign3.png)

![User Signatures](https://airing.ursb.me/ursbbilibili-sign4.png)

![User Signatures](https://airing.ursb.me/ursbbilibili-sign5.png)

![User Signatures](https://airing.ursb.me/ursbbilibili-sign6.png)

![User Signatures](https://airing.ursb.me/ursbbilibili-sign7.png)

## Preliminary User Data Analysis

### Basic Overview

- Total records: 20,119,918
- Users scraped in order of registration time: from 2009-06-24 14:06:54 to 2016-02-18 21:04:52
- Estimated missing data: less than 2%
- Fields captured: user ID, username, gender, avatar, level, XP, follower count, birthday, location, registration time, signature, level and XP details, etc.

### Gender

- Valid records: 14,643,019
- Undisclosed: 11,621,898
- Male: 1,674,196
- Female: 1,346,925

![Gender stats](https://airing.ursb.me/ursbbilibili-sex1.png)

The male-to-female ratio was somewhat surprising to me — it came out close to 1:1. In an earlier preliminary scrape of data from before the summer of 2013, the ratio was closer to 3:1.

![Gender stats](https://airing.ursb.me/ursbbilibili-sex2.png)

![Gender stats](https://airing.ursb.me/ursbbilibili-sex3.png)

Users who disclosed their gender are a small proportion — only about 15% of the total.

More in-depth analysis to come in a future update.

### Age

- Range: birth years 1970–2010 (excluding 1980)
- Total records: 3,800,767

I won't list all the raw numbers — here's a quick look at the summary:

![Age stats](https://airing.ursb.me/ursbbilibili-age3.png)

The core user base falls in the 1993–2000 birth year range (roughly 16–23 years old at the time), with 1997 (age 19) making up the single largest cohort by a wide margin.

So no, Bilibili is not dominated by elementary schoolers — high school and university students are the real majority.

![Age stats](https://airing.ursb.me/ursbbilibili-age1.png)

![Age stats](https://airing.ursb.me/ursbbilibili-age2.png)

Post-90s users are the dominant demographic, but the age range is gradually shifting later — fitting for a platform defined by youth.

### Region

- Scope: 34 provinces, municipalities, and regions within China
- Valid records: 863,541

![Region stats](https://airing.ursb.me/ursbbilibili-place1.png)

The top regions are Guangdong, Jiangsu, Beijing, Shanghai, and Zhejiang — all economically developed coastal areas.

![Region stats](https://airing.ursb.me/ursbbilibili-place3.png)

![Region stats](https://airing.ursb.me/ursbbilibili-place2.png)

### Registration Time

- Period: 2009-06-24 14:06:54 to 2016-02-18 21:04:52
- Total records: 20,119,823

![Registration time stats](https://airing.ursb.me/ursbbilibili-reg1.png)

Since only about two months of 2016 had elapsed at the time of the scrape, that year's numbers look low — but projections suggest 2016 would far outpace 2015. Since the site launched in 2009, user counts have grown at roughly exponential rates year over year.

![Registration time stats](https://airing.ursb.me/ursbbilibili-reg2.png)

![Registration time stats](https://airing.ursb.me/ursbbilibili-reg3.png)

### Activity Level

- Level range: 0–6
- Total records: 20,119,918
- Cutoff date: 2016-02-18

Bilibili has an XP-based leveling system, so level serves as a proxy for activity.

Level 0 = registered but never logged in again. Levels 1–2 = inactive users. Level 3 and above = active users. Levels 5–6 indicate prolific content contributors whose videos have performed exceptionally well — the backbone of the platform (approximately 5,000 users).

![Level stats](https://airing.ursb.me/ursbbilibili-level1.png)

![Level stats](https://airing.ursb.me/ursbbilibili-level2.png)

Retention rate analysis will come in a future update.

### Follower Counts

- Valid records: 2,011,918
- Range: 0–988,323
- Cutoff: 2016-02-18 21:04:52

![Follower stats](https://airing.ursb.me/ursbbilibili-fans1.png)

Hey — I have 2 followers too!

![Follower stats](https://airing.ursb.me/ursbbilibili-fans4.png)

Below are Bilibili's top 20 users. Many familiar faces:

![Follower stats](https://airing.ursb.me/ursbbilibili-fans3.png)

---

That's a preliminary look at the 20 million Bilibili users. More detailed analysis will follow in future posts.
