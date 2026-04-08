---
title: "Weekly #11: How Divination Works"
date: 2022-07-17
tags: ["weekly"]
description: ""
---

## How Does Divination Work?

A few days ago I came across a video called [How the I Ching Is Used for Divination](https://www.bilibili.com/video/BV1yY4y1G7SU), and I found the process surprisingly fascinating. (Ah, the blood of a Chinese philosophy major starts to stir again.) I learned enough to jot down some notes.

In ancient times, divination was called "bushi" — "bu" referred to reading the cracks on tortoise shells, though the exact technique has been lost to history; "shi" (yarrow divination) used stalks of yarrow grass arranged in random combinations to perform readings. The process is described in the *Great Commentary* of the I Ching:

> The number of the Great Expansion is fifty, of which forty-nine are used. They are divided into two parts to represent the two principles. One stalk is set apart to represent the three powers. They are counted by fours to represent the four seasons. The remainder is put aside to represent the intercalary month. In five years there are two intercalary months, hence two operations with the remainder before a new set begins. The number of heaven is five, and of earth five. When the five positions of heaven and earth are matched together, each has its proper correlate. The total of the numbers of heaven is twenty-five; the total of the numbers of earth is thirty. The total of heaven and earth is fifty-five. It is by these numbers that the changes and transformations are effected, and the spiritual agencies kept in movement.

**Preparation: "The number of the Great Expansion is fifty, of which forty-nine are used."**

- "Fifty stalks": Begin with 50 yarrow stalks, representing the primordial undifferentiated whole.
- "Forty-nine used": Remove one at random, leaving 49. That single removed stalk represents the "loss" inherent in manifestation. The Taiji — the interplay of yin and yang — must operate within the imbalance of an odd number.

**Counting: "Divided into two parts to represent the two principles; one set apart to represent the three powers; counted by fours to represent the four seasons; the remainder set aside to represent intercalation."**

The four operations are: divide, suspend, count by fours, and collect the remainder.

- **Divide**: Split the 49 stalks randomly into two groups, one representing Heaven and one representing Earth.
- **Suspend**: Take one stalk at random from either group — this is the "suspended" stalk representing Humanity. Now "Heaven, Earth, and Humanity" are the three powers referenced in the text. 48 stalks remain.
- **Count by fours**: Count through the Heaven group in sets of four, setting aside any remainder; do the same for the Earth group. The remaining stalks total 50 − (1 + 1 + (Heaven mod 4) + (Earth mod 4)). The groups of four represent the four seasons.
- **Collect**: Gather the remaining stalks and repeat the whole process. This cycle is performed three times in total — the "four operations, three changes."

After three rounds, count what remains. After working through these steps, only four outcomes are possible: 36, 32, 28, or 24 stalks (with probabilities 3/16, 7/16, 5/16, and 1/16). Dividing each by 4 gives the numbers 9, 8, 7, and 6 — the "Four Images."

Following the rule "odd is yang, even is yin":

- 9: Greater Yang (Old Yang)
- 7: Lesser Yang
- 8: Lesser Yin
- 6: Greater Yin (Old Yin)

These are then converted into lines (yao):

- Yang line (—): 9 or 7
- Yin line (- -): 6 or 8

The probability of getting a yin line ((1+7)/16) and a yang line ((3+5)/16) are each exactly 1/2.

Every three lines combine to produce one of the eight basic trigrams, so the full process must be repeated six times to generate the six lines of a full hexagram.

Say three rounds produce "7, 8, 7" — that's yang, yin, yang — giving the Li (Fire) trigram. But 6 and 9 are special: "when things reach their extreme, they reverse." So a hexagram of all 9s (Qian, pure yang) can transform into all 6s (Kun, pure yin). Lines of 7 or 8 are "stable" and don't change.

Two trigrams stacked gives the full hexagram — 8×8 = 64 possible combinations. So six full rounds of the process are needed. If the result is 9-7-8-9-7-6, for example, you might get the hexagram Xun over Xun (Wind/Wind), with the changing lines producing a second "relating hexagram." You'd then consult the I Ching for the interpretation of both.

## Weekly Picks

### Hook: Link Any Two Files

[Hook – Links Beat Searching](https://hookproductivity.com/) is a paid macOS app that lets you link two files by registering their file-type-specific `open` scheme URLs — which is exactly what "Hook" means.

My two main use cases:

- Linking: requirements notes + ticket + design mockup + technical spec
- Linking: code + code notes + technical spec

With any one of these files open, I can press `Ctrl+H` to instantly see all the files and links associated with it.

There's also a popular use case for linking GTD tasks to related files (though sadly my current app, TickTick, doesn't support custom schemes):

![](https://airing.ursb.me/image/blog/2022071701.png)

### Emojimix

[emojimix](https://tikolu.net/emojimix/) is a web app that combines two emoji into a new one. It's delightfully silly.

A couple of examples:

![](https://airing.ursb.me/image/blog/emojimix.jpg)

## This Week's Log

### Recent Viewings

- Watching: Anime | *Pokémon Ultimate Journeys*
- Finished: Novel | *Silent Parade* | ★★★☆☆
- Watched: Esports | IEM - Navi vs AST | ★★★★★
- Watched: Anime | *Spy × Family* | ★★★★★
- Watched: Film | *Groundhog Day* | ★★★★★
- Watched: Film | *The Best Offer* | ★★★★★
- Watched: Film | *Drishyam* | ★★★★★
- Watched: Film | *Hana to Alice* (rewatch) | ★★★★★

- *Pokémon*: The little dumb thing saved his 100%-accuracy Thunderbolt for the very first match of the quarterfinals — bold move. My bold prediction: the final will be Dragonite vs. Mega Lucario, and Ash still won't take the championship this year.
- *Silent Parade*: An interesting premise, but the plot twists felt a bit forced — like the story was manufactured around the reversal rather than building naturally toward it.
- Last night's Navi match was absolutely electric. The crowd energy was incredible. Navi's mantra: "3 points to draw, 4 points to win."
- *Spy × Family*: Season 1 wrapped. Apparently Season 2 won't come until October — and we still haven't even seen Yuri make a proper appearance.
- *Groundhog Day*: Finally got around to it. I expected a horror film; I got a heartwarming comedy. Life really is just ordinary days repeating themselves. If *The Truman Show* is about being trapped in space and breaking free, *Groundhog Day* is about being trapped in time and breaking free. Change a little each day, become a little better, and learn to love and live.
- *The Best Offer*: Absolutely blew me away. Italian thriller at its finest — highly recommend.

### Recent Code

```
TypeScript 28 hrs 49 mins ██████████████████▏░░  86.6%
JSON       1 hr 41 mins   █░░░░░░░░░░░░░░░░░░░░   5.1%
JavaScript 58 mins        ▌░░░░░░░░░░░░░░░░░░░░   2.9%
HTML       43 mins        ▍░░░░░░░░░░░░░░░░░░░░   2.2%
YAML       26 mins        ▎░░░░░░░░░░░░░░░░░░░░   1.3%
```

PS. Not sure if WakaTime had a bug this week — TypeScript React somehow didn't get counted at all…
