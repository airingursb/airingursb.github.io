---
title: "After AI Takes Everything"
date: 2026-06-12
tags: ["essays"]
description: ""
cover: "https://r2.airingdeng.com/blog/aae/cover.webp"
---

Over the past month I've received three letters in a row from strangers — all software engineers I've never met. One was a frontend developer in infrastructure, another did data ops, the third was somewhere in between. The three letters look different, but they ask the same question.

The first one asked me: "Do you think one day all of it will be handed over to AI? If so, do code reviews even still need humans?"

My answer: soon. By the end of this year or next, the year after at the very latest.

The second was more direct: "Is our future job going to be building AI and then letting it replace ourselves?"

The third was the longest. The writer listed every reason he was embracing AI-assisted coding — fewer rewrites, less communication overhead, more output — and then admitted at the end: if things keep going like this, what happens to my own growth? He hadn't figured that part out.

These three questions are, fundamentally, the same question. On the surface it looks like an engineering question, or a career planning question, but underneath it is an existential question: once execution is fully taken over by machines, where does the human stand? Or more bluntly — **once AI takes everything it can take, what is left for us?**

I gave fragmented answers in my replies, but I knew they weren't enough. The question deserved a more complete answer, so I wrote this essay. It's a shared question and one I've been turning over in my own mind lately. Writing my thoughts down may help others who are wrestling with the same thing.

---

## I. The Spinning Jenny

> The blue mountains cannot hold it back — the river still flows east.
> — Xin Qiji, *Pusa Man · Inscribed on the Wall at Zaokou, Jiangxi*

A little over two hundred years ago in England, a spinning frame called the Spinning Jenny came into the world. One person could now do the work of several. Yarn got cheap, and the hand-spinners who had made their living with a pair of hands and an old wheel saw their livelihoods collapse in a matter of months.

Later, some of them went out at night and smashed the machines. History calls them the Luddites. People usually treat them as fools who hated technology, but that's a misreading — what they wanted to smash was never the machine itself, but the position they suddenly occupied in front of it: a position that had become worthless overnight. They weren't blind to the technology; on the contrary, they saw what was happening earlier than anyone.

The day Meituan announced 30%–50% layoffs, a friend texted me asking what to do. I replied: we should not be the spinners replaced by the Jenny — we should be the operators who use the Jenny well.

He may have remembered that line for a long time. Today I want to correct it. It was only half right.

Because the next page of history reads like this: the skilled Jenny operators didn't have it easy for long either. Faster machines were built, and the Jenny — along with all its skilled operators — was sent to the museum. Every machine is waiting for the next machine. "Learn to use the new tool" has never been an amnesty. It's just a stay of execution.

So the real question is not "do you know how to use AI." People who know how to use it today do hold an advantage over those who don't, but the half-life of that advantage is maybe a year or two — and at the top of the field, possibly only one or two months. The pressure from each new model generation is mounting; the window for exploration and adaptation gets shorter every time. Every new model release brings another paradigm shift, and the workflow you painstakingly built, the prompting tricks you collected, the engineering scaffolding you accumulated — any of it can become a Spinning Jenny overnight.

My only method for dealing with this is what I call **end-state thinking**: don't spend yourself on intermediate-state problems. Think and act with the endpoint as the premise.

An example. A while back I had a serious argument with a few peers about a question: as AI writes more and more of the code, do engineers still need to understand it line by line? There are plenty of partial answers — better documentation, better visualization, mandatory code walkthroughs. But from the end-state view, this isn't the core question at all. Once intent can be translated directly and reliably into a working system, "humans reading the intermediate artifact line by line" loses its meaning — just as today, no one asks engineers to read every line of the assembly the compiler produces. Getting stuck on a question that is destined to disappear is the most invisible kind of waste this era inflicts on us.

What does the end-state look like? My take is simple — a single line: **PRD is Code**. Or in more general terms: **intent is implementation**. A sufficiently clear expression of intent becomes a runnable system directly. All the redundant connective tissue in between — scheduling, integration, cross-team review, back-and-forth translation — disappears. To my eye, this isn't ten years away. It's well within reach this year. The Fable 5 release a few days ago made the point: anyone who has actually used it knows the gap to Opus 4.8 — it's confident and powerful enough that I momentarily wondered whether the questions I was asking it were just dumb.

This gives us the first corollary of end-state thinking — cold but honest: **every step that sits between intent and implementation will, by default, disappear.**

So the remaining question is: where does the human stand?

---

## II. The Bottleneck Has Moved to Us

> Aim at the highest, you reach the middle. Aim at the middle, you fall to the low.
> — Li Shimin, *The Emperor's Plan*

Let me start with what's been happening to me.

Over the past year, every piece of my work that I could hand off, I handed off to AI, piece by piece. The design doc — it wrote. The code — it wrote. The first drafts of documents and review comments — it wrote. What I can now run in parallel in one evening would have taken a full quarter two years ago. By rights I should be idle, but the truth is the opposite — I am busier than I have ever been. The content of "busy" has simply changed: I almost never produce anything with my own hands now. I spend the whole day reviewing what it produces.

This is the embryo of the end-state workflow. In it, there are only two things left for humans to do: **review the design, and verify the result.**

Notice what these two have in common: neither of them is production. They are gatekeeping.

Ninety years ago in *Modern Times*, Chaplin stood at the conveyor belt tightening bolts, fell behind the belt's pace, and got pulled into the gears. That image became iconic because it captured the industrial-era human condition exactly: machines set the rhythm, humans chase the machines. Ninety years later, the belt is moving in a new direction — now the machine produces and the human inspects. AI's production speed is effectively unlimited; the cost of starting a new task is approaching zero. But the cost of verifying its output hasn't dropped a cent, because verification requires a human in the loop. So for the first time in human history, **the production bottleneck has shifted, wholesale, from the machine to the human.**

This shift brings a quiet, lethal corollary. You can run 6 or 7 sessions concurrently, dancing across different worktrees, optimizing your context-switching like a maniac. But on this new assembly line, you'll find that there is only one way to push your throughput further —

**lower your own standards.**

Read one fewer line of code. Skip one step of reasoning. Don't ask one of the "whys." When the little voice in your head says "eh, probably fine," nod and let it pass. Project this forward and you can already predict the next few years: nearly every collapse in engineering quality will not be because one specific person was lazy — it will be structural. When production is infinitely fast, the verification standard becomes the only compressible variable in the system, and every incentive in sight pushes you to compress it: the boss's expectations, your peers' speed, the performance-review whip — they're all telling you to let go.

But think clearly about what letting go means. The reason you have not yet been optimized away from the verification step is precisely that your standard is higher than the machine's. A gatekeeper who keeps lowering the standard is personally building the case for their own replaceability. My stance on this has never moved: slower is fine. The standard, not one inch.

---

## III. The Disappearing Moat

> Do not rely on the enemy not coming. Rely on having the means to receive him.
> — *Sun Tzu, The Nine Variations*

But there's a question one layer earlier: not everyone gets to retreat safely to the gatekeeping role. Some jobs will be submerged earlier than others — they won't even get the chance to retreat.

Inside our industry, the first to feel the water temperature changing, in my view, is the frontend engineer.

Not because frontend isn't important. Because frontend's position is structurally exposed. The frontend sits at the hub of the entire engineering pipeline — connecting product and design upstream, server-side downstream, and the QA team to the side. It is the role with the most connections. It's a router. But at the same time, its moat is the shallowest: the technical complexity of a single page is bounded; when you break it, the blast radius is your own page, not other systems; even if a page becomes unmaintainable, the cost of rewriting it from scratch is low.

Lower bar (outside infrastructure work — I'm talking about ordinary business code), small blast radius, easy to rewrite — these three traits together mean: no moat. So everyone in the industry is watching everyone pour into the room with the lowest barrier: designers no longer hand over Figma files — they hand over HTML via D2C, sometimes written better than what some engineers produce; QA engineers are transitioning to frontend at scale; backend engineers write the page themselves on the side; people who can't write code at all are taking their first freelance gig by leaning on AI.

But please don't read this section as a story about frontend. It's a story about **moats**, and it applies to every industry and every role. Ask yourself two questions:

1. What fraction of your work is, at its core, **moving information and converting formats**? Translating requirements into code, data into reports, policies into slide decks, the client's words into the vendor's words — every position that earns its living by "carrying messages between two domains" is standing on the fastest-flooding shoreline. Because large language models are, exactly, machines built for format conversion.

2. How big is the cost when you get it wrong? The smaller the cost of a mistake, the more readily the work will be handed to machines to experiment on; and once a machine is allowed to experiment, its iteration speed will run circles around any human. Conversely, domains where the cost of failure is enormous — system architecture, high performance, low-level quality affecting tens of millions of users — machines cannot enter yet. Not because they aren't smart enough, but because no one dares let them try. Payments. Trading. Finance. Large native clients. Infrastructure containers.

Think these two questions through and the exit routes show themselves. There are two:

1. **Go deeper.** Move yourself from being the author of a page to being the guardian of a system — toward the places where mistakes cost a lot: performance, architecture, quality, stability. The advice I gave the frontend engineers in those letters was: take on some backend work, even do small features full-stack by yourself — not to learn another technology, but to pull your awareness from a single point into a column. The job boundaries are crumbling. What the future needs is not engineers of one specific side, but people who can take responsibility for the whole system.

2. **Go where it's new.** Build things no one has built yet — things that other people's workflows can come to depend on. One important rule here: **don't build what can be obtained by burning tokens.** Any engineering product that someone has already built and that you can simply have AI clone — one more review bot, one more workflow tool — is not worth your energy, because its acquisition cost has already approached zero. What's worth building is paradigm-level work: things that, once they exist, change how other people work.

A note on the window. A year ago, the consensus was that "use AI like an intern" was still a safe strategy — you set the direction, it does the grunt work, you check it. But the upgrade cycle has gotten shorter and shorter. Today's AI can be a mentor in many domains, not an intern. People treating AI as an intern can stay comfortable for another year or two. After that, the real question becomes: **when it is better than you, what can you still contribute to this collaboration?**

The next section answers that.

---

## IV. Three Things It Cannot Take

> The gentleman is not a tool.
> — *The Analects · Wei Zheng*

If the execution layer is destined to be handed over, what is left for us?

I want to clarify the nature of this question first. It sounds like a lament; it is actually a refining process. Michelangelo said the statue was already in the marble — he just chipped away the parts that didn't belong. The AI age is doing the same thing to every profession. The parts it takes from us — the repetitive execution, the format conversion, the skilled message-carrying — **were never "us" in the first place. They were just the hours we traded for a paycheck.**

When these layers peel away, what remains, the part it cannot take, is the true outline of a person. In other words: **what's left is what is precious — and the further it survives this stripping, the more precious it gets.**

In the past, these things were hidden under mountains of execution work; they seemed cheap, and barely anyone noticed them. Now that the cover has been pulled clean off, for the first time they're standing fully in the light.

In those three letters I wrote about the same three things, over and over again. They are not skills — skills are "tools," and tools age out. No matter how skilled the operator of the Spinning Jenny was, she went into the museum together with her machine. These three things sit *above* the tool layer, and I'm fairly confident they are irreplaceable not because the machines are temporarily weak, but because of the technical structure of this generation of AI itself.

**The first: judgment.**

AI is the most powerful question-answering machine ever built, but it doesn't ask the questions. You tell it what to do, it does it — and "what to do" is a human's job.

Many people think AI flattens the differences between humans. I think the opposite: it amplifies them. Try a thought experiment: suppose everyone's prompting skills are at peak, everyone can get AI to do something with a single sentence. The output between any two people will still differ enormously, because the *things* you each ask AI to do are different. The person who picks the right problem gets ten times the output; the person who picks the wrong problem just does the wrong thing ten times as fast. In the past, execution ability masked mediocre judgment, because execution itself consumed most of the time. Now that execution is approaching free, judgment is exposed in the result for the first time, with nowhere to hide.

There is no shortcut to building judgment, but there is a clumsy method: lay out everything on your plate, prioritize them by hand, and then interrogate yourself about why this order — what makes this one come before that one? What's the business value? What's the cost of not doing it? The answers come from your feel for the business and your awareness of the technology — and both of those, conveniently, can only be obtained personally.

**The second: taste.**

AI's output is a product of pretraining. Without coaxing, what everyone gets from it is the same thing: an 80-out-of-100 mean — functionally correct, blandly faceless, correct in the same generic way.

What moves the result from that mean to a specific, signed 95 — that's the taste a human injects.

A true story. A friend who couldn't write a line of code took her first freelance gig on the back of AI. The page worked, the client accepted it — but I took one look at her technical setup and it was a mess: it ran, but it was unmaintainable, structureless, just one step ahead of the wall. I didn't write a single line of code for her. I just told the AI two more things: what stack the backend should use, and where to deploy it. Those two sentences redirected the whole project. The AI took it from there and refactored the rest itself.

Same functionality. Where's the difference? In those two sentences. Those two sentences are taste.

The philosopher Polanyi has a famous line: "We know more than we can tell." Taste is a textbook case of tacit knowledge: it can't be written into a prompt template, can't be transferred to a machine in one shot, because it isn't a set of rules — it's something grown through thousands of feedback loops in your own hands, in the heat of "no, not like that; like *this*."

In *Zhuangzi*, the cook Pao Ding said: "What I love is the Tao — it goes beyond technique." Technique can be handed to machines. The Tao, not yet — and the more technique is handed over, the rarer the Tao becomes.

**The third: derivation.**

AI is a creature of probability, which is why the material it gives you is always abundant, relevant, and looks plausible — but between "looks logical" and "is logically sound" lies a road that has to be walked on your own feet.

AI does addition; the human has to do subtraction. In a second it can give you ten reasons, twenty references, five options. Your work is to find the most solid point inside this lush field of relevance and rebuild the logical chain link by link, by hand: if we go down this road, what happens at step one? Where will the blocker appear? Is that blocker fundamental, or engineering? — build this logical tower in your head, on your own, brick by brick. A plan whose tower you can't build will collapse when you ship it.

One of the people who wrote to me said she uses paper and pen. Before asking AI for a plan, she sketches it on paper first: if upstream just hands us the code, how do we run it? What goes wrong? How does that problem come about? I treasure this habit, because the act of derivation is the source of **knowledge ownership**.

AI can hand you the blueprints to the entire building in one instant. But if you didn't build the logical chain yourself, the knowledge isn't yours — it sits in your head, but it can't transfer to the next problem. Next time, in a different context, you'll still just have to ask AI again.

Wang Yangming said: "There is no such thing as knowing without acting. To know but not act is simply not to know." Five hundred years later, in the AI age, that line gets an oddly precise footnote: cognition that did not come through your own derivation and action — no matter how complete it looks — is just someone else's words, parked in your head.

Having said all this, I have to face a contradiction honestly, because one of the letter writers stated it plainly: "If in the future we write less code and only review, these abilities are hard to train — what do we do?"

She's right. Judgment, taste, derivation — all three come from doing things by hand. And we are handing "doing things by hand" over to AI. Use it or lose it. This is a real, structural contradiction, and I'm not going to gloss over it with pretty words: **I don't have a complete answer to this contradiction.**

But she said in the letter that she had found a method. I think it's the best local solution available right now: **don't throw the problem at AI immediately.** Push the logical chain through yourself first, even roughly — form a high-level idea: what do I want, how many parts is it in, where are the key dependencies. *Then* hand that idea to AI to expand, refine, and execute. This way you preserve the thinking process and still borrow the machine's speed — and because you have the blueprint in your head, verification goes faster too. She said she got this method from my [Weekly #31: A Claude-Based Reading Flow](https://ursb.me/en/posts/weekly-31). It's slow, but you don't lose yourself.

Slower is fine. When the tide of the times is pushing you along, slow can be a discipline.

---

## V. Presence, or Subjecthood

> Man is a thinking reed.
> — Pascal, *Pensées*

Judgment, taste, derivation — at root, these are three capabilities. They are the "art" that helps you do the job better. But beneath these capabilities lies a more fundamental, more easily overlooked question. It is not about whether you can do the job well. It is about whether *you*, as a person, are even still in the room.

Lift your eyes from the engineering for a moment.

In *Phaedrus*, Plato tells an Egyptian legend: Theuth, the god who invented writing, presented it to the Pharaoh Thamus, claiming the invention would make the Egyptians wiser, with better memory. The Pharaoh refused. He said: "On the contrary, this invention will sow forgetfulness in the souls of those who learn it. They will rely on external marks instead of remembering for themselves. They will hear many things and learn nothing truly. They will appear to know everything, while in fact knowing nothing."

For twenty-four hundred years, every revolution in cognitive technology has summoned Thamus's ghost again: **writing kills memory; printing kills authority; search engines kill learning. And every time, looking back, the worry seems overblown — we outsourced memory, but freed mental room to grow more complex thought; we outsourced retrieval, but built knowledge architectures one level higher up.** Technological pessimism has never won.

So what's different this time?

What's different is the *layer* of what's being outsourced. Writing outsourced memory. Printing outsourced duplication. Search outsourced retrieval. What they all handed off was the **raw material** of thought. This time, for the first time in human history, we can hand off **thinking itself**: reasoning, weighing, judging — the parts of the soul that Thamus most feared losing.

In every previous revolution, the freed mental room flowed to higher-level cognitive activity. This time, no one knows what is higher than the highest.

I've seen what the loss of subjecthood looks like, and it isn't dramatic — it makes no sound at all. A question comes in. The person doesn't think first anymore — they just forward it to AI. AI gives an answer. The person screenshots it and forwards it back to the asker. Round trip. This person's function in the chain is an ethernet cable. A bug ships, the manager asks what happened, and they say: I don't know, the AI wrote it.

In that moment, what got replaced was not their job — it was their *presence* (and quite possibly their job too). They are still in the seat. But they are no longer there.

In his analysis of alienated labor, Marx wrote that the worker "does not affirm himself in his labor, but denies himself." **The horror of alienation has never been that the worker ultimately loses the job — it's that long before unemployment, the labor itself has already become something foreign to him.**

The spinster in the age of the Jenny first lost her relation to her labor, and then lost the labor itself.

Today's version is a cognitive alienation: **before being replaced by AI, a person first lives themselves into someone who no longer needs to be a subject at all.**

This is the real danger. Foucault warned long ago: discipline never needs a guard — we will trim ourselves into the shape the process requires. Heidegger put it more coldly: "The real danger of technology is never that the machine hurts the human, but that the human begins to understand himself, too, as a resource to be optimized."

But what I want to say is not the pessimistic half. The opposite.

A real question, most of the time, does not have a deterministic answer. **Cognition does not fall from the sky. It is ground out by humans through derivation, argument, and exchange — bit by bit, through a process that cannot be skipped, because that process *is* the human.** If cognition is handed to you directly by AI — whether or not it is comprehensive, whether or not it is critical — the mere absence of that middle stretch of thinking is enough to let subjecthood retreat, inch by inch, until what is left is the silhouette of someone waiting in front of a Jenny to be retired.

AI cannot replace humans in perceiving and experiencing the world — and this isn't a pep talk; it has a structural basis. I wrote, in an earlier essay on AI and psychological healing: human cognition is not just information processing — it is an experience interwoven from sensation and emotion. We perceive the real world through our bodies; we assign meaning through feeling. AI is unmatched at processing information and generating text, but what it lacks is precisely this dimension of experience — it can process data, but cannot experience the real world that the data represents. In one line: **AI's understanding is instrumental, not existential.** It can help us understand certain facets of the human condition, but it cannot replace the insight we obtain through lived experience and inner reflection. A painting can imitate nature, but it can never become nature itself.

So: logical derivation, free-associative leaps, the feel for a business, the urge to explore the unknown — these are not bullet points on a résumé. They are the *organs* of subjecthood. My view is this: **human thought should not be worn down in the AI age. It should be amplified.** AI takes over the deterministic part. Humans were always meant to live in the uncertainty — that is where judgment, taste, and derivation reside, and that is where the question "what makes us human" finds its answer.

Pascal said: man is a thinking reed; the universe needs no weapon to crush him. But man is still more noble than what crushes him, because he knows he will die, and the universe knows nothing of this. In the AI age, that line gets a new reading: a model can surpass us at nearly every task, but knowing what one is doing, why one is doing it, and what difference it will make in the world — that is still only the reed.

The reed's entire dignity is in its thinking. Please do not hand it over.

---

## VI. The Anchor of Value

> What defines us is never the voyage itself, but the meaning we give to the voyage.
> — [On the Value of Existence and the Experience of Life](https://ursb.me/en/posts/life)

The reasoning above is a path that keeps moving inward: from the job, to ability, to subjecthood — each layer deeper than the last. Now we have arrived at the innermost room — where the real source of all the anxiety sits. I think I have already answered this question, years ago, in [On the Value of Existence and the Experience of Life](https://ursb.me/en/posts/life).

The threat to the job, the cultivation of the ability, the survival of subjecthood — all of these anxieties collapse, when gathered, into the same thing: **we are afraid of losing our sense of value.** Afraid that one day we will wake up and find we are no longer useful to this world. Being laid off is just the outer shell of that fear. The core is older: a person's deepest fear has never been having no job. It is the suspicion that one is no longer worthy.

But the sense of value has never been something the world hands you. It is something you anchor yourself.

Years ago I wrote an essay called [On the Value of Existence and the Experience of Life](https://ursb.me/en/posts/life). AI had nothing to do with my life back then. In it I wrote: life has no inherent purpose. We arrive by accident, leave by accident, and no law mandates what we must do. Even so, we must steer this meaningless life forward with courage — "this voyage has no destination, but in the vast sea we constantly anchor markers along the way." What defines us is never the voyage itself, but the meaning we give to the voyage. **Existence precedes essence. We exist first, and then go searching for meaning — assigning meaning to the fact of existence.**

I did not expect that, years later, that passage about life would land precisely on a technical question.

Because meaning is assigned after the fact — because it's a marker you anchor yourself — anchoring has an ancient trap: if you tie all your sense of meaning to a single external feedback loop, then the moment that loop breaks, the entire structure of meaning collapses overnight into disillusion. The example I used back then was the workaholic — pinning all of their sense of meaning on performance reviews and the boss's recognition. The moment the feedback cuts off, the enthusiasm goes out and self-doubt rushes in.

The AI age has done nothing more than cash in this ancient fragility, at unprecedented scale and speed, for the whole world to see.

If your sense of value happens to be anchored to "I can write code," "I can execute fast," "I deliver more than others" — then face the cruel fact: you have dropped your anchor into a sea that is going out. The anchor itself is not wrong. It is simply no longer yours — it belongs to the machine, and the machine is reeling it back in at visible speed. I wrote another line in that old essay that today reads almost like prophecy: "The more you try to do everything to perfection, the less complete it ever feels — and life becomes hollow shards." In the sprint where every task is marked P0, in the inertia of "shove the saved time into more requirements," the sense of value is not accumulating. It is being diluted.

So where is the truly stable anchor of value? Exactly where AI cannot reach.

AI can *process* the entire world, but it cannot *experience* it (I recommend my older piece: [Weekly #28: AI Has No Capacity to Experience the World](https://ursb.me/en/posts/weekly-28)). It can simulate all meanings, but it cannot truly *assign* meaning — because to assign meaning, you need a subject who is genuinely alive, genuinely feeling, genuinely caring. This is the only reliable source of value: **it does not come from "you are useful." It comes from "you can perceive, you can care, and you can give the things you do a meaning that belongs to no one else but you."** The former is the quote the market gives you, and it rises and falls with technology. The latter is your *own* value, and no one can take it from you — unless you yourself confuse the two.

Years ago, in a low point in my life, I wrote this down for myself, almost stubbornly: with or without those external things, believe you are 100% precious; I always have my own value, unconditionally. Today I want to give that line back to anyone who feels themselves being devalued in front of AI. AI is lowering your *quote*. It cannot touch your *value*.

So: after AI takes everything, what remains is not some second-best refuge — it is the place where the sense of value was always meant to live. AI is a receding tide. It washes away all the external anchors we carelessly threw out over the years — title, output, the feeling of being needed — and forces us to swim back to the one center that the tide cannot reach.

In that old essay I gave that center a definition: **The value of our existence is the act of fixing this center. The meaning of being alive is the work of expanding its boundary.** The center is what makes you you. The boundary is the world you spend a lifetime experiencing, perceiving, and giving meaning to. AI can approach the boundary without limit, but it can never reach the center — because what sits at the center is a person who will die, who will love, who, in the late hours of the night, will still ask after meaning.

Reclaim your sense of value from "being needed by AI." This is the most quiet, and most urgent, lesson this age hands every one of us.

---

## VII. The Wind Rises in the Reeds

> The wind is born of the earth and rises from the tips of the reeds.
> — Song Yu, *Rhapsody on Wind*

Back to the three letters, back to the question at the start.

This year, friends who know me well call me radical: I hand designs to AI, code to AI, review drafts to AI; next I'm preparing to hand over testing too. But few understand: efficiency was never the goal. If AI's entire purpose were to let one person do four people's work, piled with ever more workload — then what? That would just be turning yourself into a cheaper Jenny, saving the balance sheet two more years before you got replaced. **A human can never out-compete a machine on efficiency.** That road has two words written at the end of it: *inevitably replaced*.

The real purpose of being radical is one thing only: **before the macro trend arrives, keep finding new ground to stand on.** All the time AI saves you must flow into growth and exploration — not into more requirements. This is a discipline I set for myself, and a sentence I repeat in every reply: if the dividends of efficiency get eaten entirely by workload, then this revolution is meaningless to the individual.

In the end-state workflow I envision, engineers have two positions, both indispensable.

One is **Infra**: building the world in which AI works. How knowledge is accumulated, how context flows, how agents collaborate, how paradigms refresh — this world will not grow on its own. Engineers have to build it. This is "understanding systems and building systems" — the engineer's native gift — migrated from business code up to a higher layer.

The other is **the gatekeeper**: in the rushing river from intent to implementation, standing as the last guard of quality and judgment — picking the right problem with judgment, setting the standard with taste, holding the logic with derivation. This is what makes an engineer specifically an engineer. The task is not to throw it away but to push it to the extreme, and then fit it into the workflow of the future.

To close, I want to return to those Luddites who smashed machines in the night.

Their real tragedy was not that they targeted the wrong thing — the machine truly did roll over their livelihoods, and their anger deserves the respect of those of us reading them two hundred years later. The real tragedy was that, standing in that moment, the only option they could *see* was to smash. They could see what they were **losing**. They could not see what they could **become**. This is not their fault. In that age, no one could.

But we are different from them. This is the harsh privilege specific to our generation: the change happens on the order of years, fast enough that a single person can witness the end-state inside their own career, and fast enough that no one is left any room to wait and see. We are the first generation of ordinary people who can participate in the revolution **with a sense of the endgame in hand.**

So — where do we go?

Back to the question in the first letter: "Will all of it be handed over to AI?"

Yes. And faster than most people expect.

But the answer to that question doesn't depend on AI. It depends on where you are standing when that day comes: at the end of the assembly line, stamping approval on the machine's output with an ever-lower bar, waiting for even the stamping to be optimized away? Or further upstream — where the questions are picked, where the standards are set, where the logic is guarded, where the world is built.

And wherever you choose to stand, please remember the other face of this revolution. It is a grand subtraction, but what it subtracts is never the most precious thing about us — only the execution and repetition that for so long hid the precious thing from view.

When the tide goes out, what is laid bare on the sand was there all along, only buried by endless busyness: **your judgment, your taste, the logic you've walked through with your own hands, your perception of and your curiosity about this world.**

So the question "what is left for us" no longer needs to be asked with a worried tone. What is left is precious. What is left is us.

The wind rises in the reeds. The great trend is never some monolith descending from the sky — it is composed of the choices of countless individuals in this very moment. The decision you make today to push the logical chain through on paper before opening the chat window, to refuse to lower your standard for the sake of speed, to invest the saved hours into an exploration no one has done before — these tiny decisions are themselves the trend.

We are not individuals carried by the trend.

The wind rises in the reeds. **We should be the trend itself.**

Run forward. Don't look back.

---

To the three friends who wrote in: thank you. Most of the thinking in this essay was not done by me alone — it was derived in the back-and-forth of those letters. And that fact, itself, is exactly what this essay is about.

May you always, in the roar of the machines, still hear your own voice.

Written late at night, June 12, 2026.
