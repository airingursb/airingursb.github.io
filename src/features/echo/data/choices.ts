import type { Correspondence } from "./letters";

export const choiceLetters: readonly Correspondence[] = [
  {
    "id": "offer-autumn",
    "number": "05",
    "code": "行舟",
    "label": "第一次往返",
    "round": "第一次往返",
    "title": "先接受眼前的选择，还是继续找？",
    "chapter": "role",
    "issue": "02",
    "incoming": {
      "id": "incoming",
      "label": "来信",
      "sender": "行舟",
      "recipient": "Airing",
      "date": "2024-11-18",
      "salutation": "Airing 前辈：",
      "paragraphs": [
        {
          "id": "offer-autumn-incoming-1",
          "text": "最近遇到了一些有关就业选择上的困惑，想到你应该在这方面很有经验，因此特来请教！"
        },
        {
          "id": "offer-autumn-incoming-2",
          "text": "如你所见，我现在正在秋招的过程中，或者说我的秋招已经将近结束了，目前我是拿到〔云服务公司〕后台开发岗和〔出行公司〕测试开发岗的 offer，并且已经签了前者；诚然后者的薪资会比前者高得多，但是考虑到我其实并不喜欢做测试开发（之前实习过，感受并不好），加之测试开发个人感觉未来的路径很窄，因此选择了前者。"
        },
        {
          "id": "offer-autumn-incoming-3",
          "text": "其实对我来说，此二者都并不是令我“最满意”的 offer，但前者也许差强人意，并不让我讨厌（除了薪资低点，〔工作城市与具体薪酬已隐去〕），老实说，看到朋友拿到 〔具体金额隐去〕的大包，再看看我自己的，还是有点眼馋的。"
        },
        {
          "id": "offer-autumn-incoming-4",
          "text": "所以想请教你的是，你觉得我应该见好就收，就此满足（本地中厂+后端岗+WLB也不错？）；还是继续战春招（也许可以边在〔云服务公司〕实习边找？），寻找更好的机会？（另一个角度来看，牺牲掉 WLB 来换更高的 base 是否又值得呢？）"
        },
        {
          "id": "offer-autumn-incoming-5",
          "text": "希望得到你的指导！"
        }
      ],
      "closing": "顺颂时祺",
      "signature": "行舟"
    },
    "reply": {
      "id": "reply",
      "label": "回信",
      "sender": "Airing",
      "recipient": "行舟",
      "date": "2024-11-18",
      "salutation": "行舟：",
      "paragraphs": [
        {
          "id": "offer-autumn-reply-1",
          "text": "先直接回答问题："
        },
        {
          "id": "offer-autumn-reply-2",
          "text": "1. 建议边在〔云服务公司〕实习，边战春招。"
        },
        {
          "id": "offer-autumn-reply-3",
          "text": "2. 对于家底一般的校招生而言，毕业前 3 年不要追求 WLB。"
        },
        {
          "id": "offer-autumn-reply-4",
          "text": "先说第一个问题，为什么要你战春招。"
        },
        {
          "id": "offer-autumn-reply-5",
          "text": "一是机遇。"
        },
        {
          "id": "offer-autumn-reply-6",
          "text": "对于面试官而言，校招简历看重的是你的实习经历>学历；社招简历看重的是工作经验>学历。校招简历关在于此，因为头部大厂会两者都要。但是有两种情况可以在简历不好的时候进去："
        },
        {
          "id": "offer-autumn-reply-7",
          "text": "1. 春招会存在 hc 空缺的情况，很多团队会急于补人，简历就会松一松。因为到了年中盘点的时候，空 hc 没招到人是会被上面回收的，这个时候招到能用的比招到优秀的更重要。"
        },
        {
          "id": "offer-autumn-reply-8",
          "text": "2. 非超一线（〔公司举例隐去〕）的厂，通常简历也会松一些，尤其时间上越靠后越松。"
        },
        {
          "id": "offer-autumn-reply-9",
          "text": "二是为了以后做准备。"
        },
        {
          "id": "offer-autumn-reply-10",
          "text": "校招生第一段经验很重要，是之后社招的跳板。如果起点低了，那其实现在面临的难度将会转嫁到未来的社招上。我建议是有问题当下解决，而不是逃避或转嫁未来。"
        },
        {
          "id": "offer-autumn-reply-11",
          "text": "再说第二个问题，为什么推荐你选择〔云服务公司〕。"
        },
        {
          "id": "offer-autumn-reply-12",
          "text": "因为岗位很重要，决定了未来的天花板。这点你也看出来了，研发岗是绝对优于测试岗的，且不说测试的天花板低，单论内容而言，测试在厂里地位永远是很低的、内容也是非常单调和乏味的，这会极大磨灭你对于工作的热情。"
        },
        {
          "id": "offer-autumn-reply-13",
          "text": "你在实习的时候过于追求「提前实习」的这个履历，从而选择了这个岗位。但这其实适得其反——前面说了，简历关会看你的实习经验，如果你是测试岗，很难在校招的时候面研发岗。面试官会额外考虑你的岗位匹配性，这会增加你的简历关门槛。其实还是相当于你把当下的难度转嫁到未来了，也就是现在你需要面临的困境。"
        },
        {
          "id": "offer-autumn-reply-14",
          "text": "最后一个问题，我不建议家底一般的校招生 WLB。"
        },
        {
          "id": "offer-autumn-reply-15",
          "text": "毕业前几年是个人成长最快的几年，因为十几年的求学生涯好不容易走向社会，面对社会会自带热情 Buff，做什么事情都会非常高效；学习力在这种 buff 和年龄 buff 以及学习 buff 的加持在也会非常强；对万事万物也会有着好奇心和求知欲。这种时候需要发挥出你的优势，尽量短时间内发现短板、补足短板、发觉喜好、发展优势，以备未来之需。"
        },
        {
          "id": "offer-autumn-reply-16",
          "text": "如果走了 WLB 这条路，未来极容易被定型于起点，你原本拥有的无限可能性也就不复存在了。或许会后悔、或许会遗憾，但日后再想去弥补，会很难很难。这本质上也是一种把当下困境转嫁到未来的做法。"
        },
        {
          "id": "offer-autumn-reply-17",
          "text": "以上仅是个人意见，仅供参考。"
        }
      ],
      "closing": "祝你可以顺利找到自己满意的工作。",
      "signature": "Airing"
    }
  },
  {
    "id": "offer-spring",
    "number": "06",
    "code": "行舟",
    "label": "第二次往返",
    "round": "第二次往返",
    "title": "新机会来了，要不要换一条路？",
    "chapter": "people",
    "issue": "02",
    "incoming": {
      "id": "incoming",
      "label": "来信",
      "sender": "行舟",
      "recipient": "Airing",
      "date": "2025-04-17",
      "salutation": "Airing：",
      "paragraphs": [
        {
          "id": "offer-spring-incoming-1",
          "text": "近来可好？时不时看看你的博客，看你最近都没怎么更新了，不知道是不是在忙着做什么很有趣的事情~"
        },
        {
          "id": "offer-spring-incoming-2",
          "text": "长话短说，自上次询问你〔出行公司〕和〔云服务公司〕的选择之后，我确实先选择了〔云服务公司〕的 offer，随后在〔云服务公司〕参加了提前实习。春招过程中，我也在积极寻找更好的机会。今天（4/17），我通过了〔游戏公司〕的技术面试，〔后续面试日期隐去〕HR 面，如果有机会发 offer 的话，想问问 Airing 这两个 offer 之间的权衡？"
        },
        {
          "id": "offer-spring-incoming-3",
          "text": "两个 offer 的大致情况是这样的：〔云服务公司的团队与产品细节隐去〕的后台研发岗位，〔城市与薪酬隐去〕；〔游戏公司及工作室细节隐去〕的游戏服务端开发的岗位，〔城市隐去〕，底薪目前不清楚，〔预估薪酬范围隐去〕。"
        },
        {
          "id": "offer-spring-incoming-4",
          "text": "大概想问 Airing 前辈这些问题："
        },
        {
          "id": "offer-spring-incoming-5",
          "text": "· 我应该选〔游戏公司〕还是继续留在〔云服务公司〕？"
        },
        {
          "id": "offer-spring-incoming-6",
          "text": "· 游戏服务端岗位怎么样，未来好不好跳槽？"
        },
        {
          "id": "offer-spring-incoming-7",
          "text": "· 游戏行业大概率加班比较严重，大概怎样的一个薪资水平会比较配得上这份工作？"
        },
        {
          "id": "offer-spring-incoming-8",
          "text": "希望得到你的指导！"
        }
      ],
      "closing": "顺颂时祺",
      "signature": "行舟"
    },
    "reply": {
      "id": "reply",
      "label": "回信",
      "sender": "Airing",
      "recipient": "行舟",
      "date": "2025-04-18",
      "salutation": "行舟：",
      "paragraphs": [
        {
          "id": "offer-spring-reply-1",
          "text": "展信佳。最近的生活确实有些变化，预计这两天会发一篇月刊分享下，有空记得来看～"
        },
        {
          "id": "offer-spring-reply-2",
          "text": "回到正题，首先恭喜你拿到合适的 offer。我直接从我的角度回答这三个问题。"
        },
        {
          "id": "offer-spring-reply-3",
          "text": "1. 应该选〔游戏公司〕还是继续留在〔云服务公司〕？"
        },
        {
          "id": "offer-spring-reply-4",
          "text": "这个基于目前的信息，我不好给你提供建议。但如果单纯从发展的角度来说，我自己会选择〔游戏公司〕，游戏服务端的业务和技术挑战会相对大一些。如果从 base 地考虑，我也会选择〔游戏公司〕，〔新工作城市〕地区互联网相对发达一些，而且近一些〔邻近城市〕的机会会更多。"
        },
        {
          "id": "offer-spring-reply-5",
          "text": "但是你需要额外考虑以下问题："
        },
        {
          "id": "offer-spring-reply-6",
          "text": "· 〔云服务公司〕的团队氛围怎么样？换团队有融入的成本，如果〔游戏公司〕的氛围不好，可能会影响工作。"
        },
        {
          "id": "offer-spring-reply-7",
          "text": "· 〔云服务公司〕和〔游戏公司〕中你的+1/+2领导，对你怎么样、对团队怎么样？他们能不能抗事？对新人的培养和关注度怎么样？后者需要你回顾你面试的经历和感受，来做出相对合理的判断。"
        },
        {
          "id": "offer-spring-reply-8",
          "text": "· 〔原工作城市〕这个城市你怎么看？如果你有家人、朋友，或者是其他理由，能否完全割舍。"
        },
        {
          "id": "offer-spring-reply-9",
          "text": "你需要遵从自己的内心，做出当下的选择。"
        },
        {
          "id": "offer-spring-reply-10",
          "text": "2. 游戏服务端岗位怎么样，未来好不好跳槽？"
        },
        {
          "id": "offer-spring-reply-11",
          "text": "个人比较看好游戏的技术栈，玩法多样、对于用户体验的要求会更高。通常，技术同学也会要求从全方位去考虑游戏的玩法设计，在产品的参与度上，会比 toB 项目和传统 toC 项目都要好。因此，预想中可以得到比较快速地成长，利好跳槽。"
        },
        {
          "id": "offer-spring-reply-12",
          "text": "3. 游戏行业大概率加班比较严重，大概怎样的一个薪资水平会比较配得上这份工作？"
        },
        {
          "id": "offer-spring-reply-13",
          "text": "得看年包构成，直说年包的话，〔具体薪酬判断已隐去〕我觉得是个不错的机会。"
        }
      ],
      "closing": "祝你顺利。",
      "signature": "Airing"
    }
  },
  {
    "id": "offer-summer",
    "number": "07",
    "code": "行舟",
    "label": "第三次往返",
    "round": "第三次往返",
    "title": "时间不多了，怎样接受不完美？",
    "chapter": "conditions",
    "issue": "02",
    "incoming": {
      "id": "incoming",
      "label": "来信",
      "sender": "行舟",
      "recipient": "Airing",
      "date": "2025-06-20",
      "salutation": "Airing:",
      "paragraphs": [
        {
          "id": "offer-summer-incoming-1",
          "text": "展信佳。不知道最近在 〔公司与工作地隐去〕 的工作是否称心得手？发信给你是想跟你探讨最近可能拿到的 offer 和现有 offer 的选择。"
        },
        {
          "id": "offer-summer-incoming-2",
          "text": "先聊聊我的近况，最近先后被〔公司名称隐去〕约面，不过都没有走到最后。正当我想放弃的时候，〔具体招聘联系与推荐路径已隐去〕。"
        },
        {
          "id": "offer-summer-incoming-3",
          "text": "可能是因为秋招面过的原因，似乎只是进行一些非正式的聊天面试即可，所以我觉得可能比较稳。"
        },
        {
          "id": "offer-summer-incoming-4",
          "text": "不过又因为这是个测开岗（尽管经过沟通了解到这个测开可能是偏开为主的，和QA有点区别），因此想问问 Airing 怎么选这两个 offer："
        },
        {
          "id": "offer-summer-incoming-5",
          "text": "1. 〔云服务公司及业务隐去〕后端，〔薪酬与城市隐去〕"
        },
        {
          "id": "offer-summer-incoming-6",
          "text": "2. 〔出行公司及部门隐去〕测开，〔预估薪酬与城市隐去〕"
        },
        {
          "id": "offer-summer-incoming-7",
          "text": "主要大致有以下几个点导致我很犹豫："
        },
        {
          "id": "offer-summer-incoming-8",
          "text": "1. 担心测开未来发展"
        },
        {
          "id": "offer-summer-incoming-9",
          "text": "2. 担心质量中台业务边缘"
        },
        {
          "id": "offer-summer-incoming-10",
          "text": "个人考虑如果选择〔出行公司〕，优势可能有："
        },
        {
          "id": "offer-summer-incoming-11",
          "text": "1. title 好一些，方便跳槽"
        },
        {
          "id": "offer-summer-incoming-12",
          "text": "2. 钱多"
        },
        {
          "id": "offer-summer-incoming-13",
          "text": "3. 〔新工作城市〕比〔原工作城市〕机会多"
        }
      ],
      "closing": "期待 Airing 的回答！",
      "signature": "行舟"
    },
    "reply": {
      "id": "reply",
      "label": "回信",
      "sender": "Airing",
      "recipient": "行舟",
      "date": "2025-06-20",
      "salutation": "行舟：",
      "paragraphs": [
        {
          "id": "offer-summer-reply-1",
          "text": "感谢你的信任和最新进展的反馈，这两个我觉得都不是特别理想，但是时间上确实也不乐观了。"
        },
        {
          "id": "offer-summer-reply-2",
          "text": "你目前对〔出行公司〕的分析还是挺全面的，我也觉得较〔云服务公司〕会好一些。你之前在那边做测开的时候会更有开发的机会吗（也可以找内部人问问）？另外，也咨询一下内部的人有没有测开成功活水转岗到开发的案例？"
        },
        {
          "id": "offer-summer-reply-3",
          "text": "如果这两部分都 OK 的话我觉得问题也不是特别大，但是要规划好入职之后的职业路径，可能也就两条路："
        },
        {
          "id": "offer-summer-reply-4",
          "text": "1. 要不就在测试岗快速晋升"
        },
        {
          "id": "offer-summer-reply-5",
          "text": "2. 要不就快速积累经验，然后活水 or 跳槽转研发。"
        },
        {
          "id": "offer-summer-reply-6",
          "text": "要规划好时间节点。"
        }
      ],
      "closing": "祝好",
      "signature": "Airing"
    }
  },
  {
    "id": "four-options",
    "number": "08",
    "code": "知秋",
    "label": "四个选项",
    "round": "四个选项",
    "title": "稳定、收入、成长，怎样取舍？",
    "chapter": "next-step",
    "issue": "02",
    "incoming": {
      "id": "incoming",
      "label": "来信",
      "sender": "知秋",
      "recipient": "Airing",
      "date": "2026-04-04",
      "salutation": "",
      "paragraphs": [
        {
          "id": "four-options-incoming-1",
          "text": "Hello Airing大佬~，看你的个人站上有\"来信咨询\"服务，恰好最近在纠结职业发展上的一些选择🤔，您如果有空的话可以稍微给我些指点。"
        },
        {
          "id": "four-options-incoming-2",
          "text": "〔教育经历、工作履历、技术方向组合及招聘线索已隐去〕",
          "redaction": true
        },
        {
          "id": "four-options-incoming-3",
          "text": "目前手上的机会"
        },
        {
          "id": "four-options-incoming-4",
          "text": "〔原信选项表，按原顺序转为分项排版〕",
          "redaction": true
        },
        {
          "id": "four-options-incoming-5",
          "text": "选项：A；公司：留在 〔选项A公司〕；薪资：〔具体薪酬与股权归属时间已隐去〕；特点：稳定，〔内部项目与职责隐去〕，成长空间有限"
        },
        {
          "id": "four-options-incoming-6",
          "text": "选项：B；公司：初创公司；薪资：〔薪酬与股期权金额已隐去〕；特点：〔团队规模隐去〕，965 双休 Remote"
        },
        {
          "id": "four-options-incoming-7",
          "text": "选项：C；公司：〔选项C公司〕；薪资：〔涨薪幅度隐去〕；特点：〔团队、产品与职级隐去〕，需搬〔城市隐去〕"
        },
        {
          "id": "four-options-incoming-8",
          "text": "选项：D；公司：〔选项D公司〕；薪资：〔薪酬与加班费幅度已隐去〕；特点：垂直明星创业公司，〔规模隐去〕，强度大，需搬〔城市隐去〕"
        },
        {
          "id": "four-options-incoming-9",
          "text": "我的一些分析"
        },
        {
          "id": "four-options-incoming-10",
          "text": "A：留在 〔选项A公司〕：短期最稳，长期最差"
        },
        {
          "id": "four-options-incoming-11",
          "text": "利："
        },
        {
          "id": "four-options-incoming-12",
          "text": "· 〔股权金额与归属时间隐去〕 + 涨薪是确定性收益，〔具体绩效与时间信息隐去〕"
        },
        {
          "id": "four-options-incoming-13",
          "text": "· 熟悉业务，〔内部项目、职责与个人技术标签已隐去〕"
        },
        {
          "id": "four-options-incoming-14",
          "text": "· 不用搬家，不用适应新环境，心理成本为零"
        },
        {
          "id": "four-options-incoming-15",
          "text": "弊："
        },
        {
          "id": "four-options-incoming-16",
          "text": "· 〔具体技术转向与雇主投入比较已隐去〕"
        },
        {
          "id": "four-options-incoming-17",
          "text": "· 留下来的隐性成本很难量化，感觉我在用时间换一个确定性越来越低的未来，我感觉〔选项A公司〕就像是一艘正在沉没的旧时代大船"
        },
        {
          "id": "four-options-incoming-18",
          "text": "B. 初创公司"
        },
        {
          "id": "four-options-incoming-19",
          "text": "利："
        },
        {
          "id": "four-options-incoming-20",
          "text": "· 965 双休 Remote，生活质量极高"
        },
        {
          "id": "four-options-incoming-21",
          "text": "· 创始人交流下来感觉比较靠谱，〔创始人履历及经营信息已隐去〕"
        },
        {
          "id": "four-options-incoming-22",
          "text": "· 〔技术方向隐去〕方向对口"
        },
        {
          "id": "four-options-incoming-23",
          "text": "弊："
        },
        {
          "id": "four-options-incoming-24",
          "text": "· 现金年包〔金额隐去〕，有点太少了"
        },
        {
          "id": "four-options-incoming-25",
          "text": "· 〔股期权金额及条款已隐去〕，期权和纸没有区别"
        },
        {
          "id": "four-options-incoming-26",
          "text": "C. 〔大型互联网公司及团队隐去〕"
        },
        {
          "id": "four-options-incoming-27",
          "text": "利："
        },
        {
          "id": "four-options-incoming-28",
          "text": "· 薪资涨了不少"
        },
        {
          "id": "four-options-incoming-29",
          "text": "· 〔选项C公司〕的背书价值"
        },
        {
          "id": "four-options-incoming-30",
          "text": "· 〔团队与产品比较隐去〕，不存在转方向问题"
        },
        {
          "id": "four-options-incoming-31",
          "text": "· 团队综合水平比较高，〔面试官履历隐去〕，+1给人的感觉还不错"
        },
        {
          "id": "four-options-incoming-32",
          "text": "弊："
        },
        {
          "id": "four-options-incoming-33",
          "text": "· 〔原城市〕搬〔新城市〕，租房搬家生活重建，有一部分直接成本，而且适应成本更高"
        },
        {
          "id": "four-options-incoming-34",
          "text": "· 试用期考核严格，〔选项C公司〕的淘汰文化比较严重"
        },
        {
          "id": "four-options-incoming-35",
          "text": "· 〔具体产品与公司隐去〕作为产品本身的风险：〔公司隐去〕内部项目调整频繁，团队可能被重组"
        },
        {
          "id": "four-options-incoming-36",
          "text": "· 〔公司内部绩效制度细节已隐去〕，不确定在这个团队landing能否顺利"
        },
        {
          "id": "four-options-incoming-37",
          "text": "D. 〔选项D公司〕：明星创业公司，〔具体方向隐去〕"
        },
        {
          "id": "four-options-incoming-38",
          "text": "利："
        },
        {
          "id": "four-options-incoming-39",
          "text": "· 薪资最高的选择"
        },
        {
          "id": "four-options-incoming-40",
          "text": "· 垂直赛道明星创业公司，如果公司做起来了，早期员工的回报远超大厂打工"
        },
        {
          "id": "four-options-incoming-41",
          "text": "· 创业公司的成长速度和责任范围通常远超大厂，能接触到更完整的业务链条"
        },
        {
          "id": "four-options-incoming-42",
          "text": "· 〔新城市〕的生活基础设施和〔原城市〕接近，并且未来机会可能会更多些"
        },
        {
          "id": "four-options-incoming-43",
          "text": "· 〔具体产品与技术路线比较已隐去〕"
        },
        {
          "id": "four-options-incoming-44",
          "text": "弊："
        },
        {
          "id": "four-options-incoming-45",
          "text": "· 创业公司的存活率比较低，如果 〔选项D公司〕 没做起来，简历上的背书价值不如〔选项C公司〕"
        },
        {
          "id": "four-options-incoming-46",
          "text": "· 创业公司的工作强度巨大，大小周，偶尔忙起来的时候加班到深夜是常有的事"
        },
        {
          "id": "four-options-incoming-47",
          "text": "我的倾向：D > C  > A > B ，这只是我的一些判断和倾向，毕竟是第一次社招跳槽，其实心里还是很没有底的，怕有些风险点被我忽略掉了。"
        },
        {
          "id": "four-options-incoming-48",
          "text": "结合我目前的阶段，您有什么建议吗？"
        }
      ],
      "closing": "",
      "signature": "知秋"
    },
    "reply": {
      "id": "reply",
      "label": "回信",
      "sender": "Airing",
      "recipient": "知秋",
      "date": "2026-04-04",
      "salutation": "",
      "paragraphs": [
        {
          "id": "four-options-reply-1",
          "text": "我个人建议 D>A 吧，"
        },
        {
          "id": "four-options-reply-2",
          "text": "D 的两个弊端我觉得不算什么"
        },
        {
          "id": "four-options-reply-3",
          "text": "1. 跳回大厂这个项目的深度和项目经验是完全足够有竞争力的"
        },
        {
          "id": "four-options-reply-4",
          "text": "2. 加班换 〔具体幅度隐去〕涨薪得看自己了，刚毕业我觉得可以接受。如果原本自己的空余时间也是用来成长 & 〔选项D公司〕 的工作内容有深度可以学到东西，那我觉得还是划算的。"
        },
        {
          "id": "four-options-reply-5",
          "text": "B 不建议考虑。"
        },
        {
          "id": "four-options-reply-6",
          "text": "留在 A 也是短期较优但长期非最优的选择，既然年中承诺给高绩效，我觉得不着急这几个月，可以观望观望，最好也顺便争取下快速晋升。在 〔职级隐去〕 离开我觉得是最高性价比。"
        }
      ],
      "closing": "",
      "signature": "Airing"
    }
  }
];
