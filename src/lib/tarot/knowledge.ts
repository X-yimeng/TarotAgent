import type { TarotCard, TarotElement, TarotSuit } from "./types";

const SUIT_INFO: Record<
  TarotSuit,
  {
    zh: string;
    element: TarotElement;
    themes: string[];
    light: string;
    shadow: string;
  }
> = {
  wands: {
    zh: "权杖",
    element: "fire",
    themes: ["行动", "热情", "意志", "创造力"],
    light: "把火点起来：启动、推动、敢于表达并承担后果。",
    shadow: "火失控或熄灭：冲动、拖延、三分钟热度、耗竭。",
  },
  cups: {
    zh: "圣杯",
    element: "water",
    themes: ["情感", "关系", "直觉", "共情"],
    light: "允许情绪流动：连接、滋养、表达感受与需要。",
    shadow: "情绪泛滥或冻结：依赖、逃避、幻想、压抑。",
  },
  swords: {
    zh: "宝剑",
    element: "air",
    themes: ["思考", "沟通", "真相", "边界"],
    light: "把话说清：分析、决断、澄清事实与规则。",
    shadow: "思维过载：苛刻、焦虑、争辩、伤人或自伤的语言。",
  },
  pentacles: {
    zh: "钱币",
    element: "earth",
    themes: ["现实", "资源", "身体", "长期积累"],
    light: "脚踏实地：稳定、积累、把计划落到时间与资源上。",
    shadow: "过度保守或物化：拖慢、贪心、麻木、只看短期收益。",
  },
};

type RankMeta = {
  rank: string;
  num: number;
  stage: string;
  light: string;
  shadow: string;
  keywords: string[];
  reflection: string[];
  actions: string[];
};

// A compact, original synthesis of numerology-style stages (Ace..10).
const NUMBER_META: Record<number, Omit<RankMeta, "rank" | "num">> = {
  1: {
    stage: "开端/种子",
    light: "新的机会出现，能量干净而直接，适合点火。",
    shadow: "想法很多但没落地，或把机会当成‘保证’。",
    keywords: ["开始", "灵感", "机会"],
    reflection: ["我真正想启动的是什么？", "我愿意为它投入哪 30 分钟？"],
    actions: ["把目标拆成 1 个最小动作并立刻做", "把资源/时间写成一行计划"],
  },
  2: {
    stage: "选择/张力",
    light: "两股力量在拉扯，你需要比较与协调。",
    shadow: "犹豫拖延或两面讨好，导致能量分散。",
    keywords: ["选择", "平衡", "合作"],
    reflection: ["我在避免哪个决定？", "我的底线与优先级是什么？"],
    actions: ["写下 A/B 的代价与收益", "先做一个可逆的小决定验证方向"],
  },
  3: {
    stage: "表达/扩张",
    light: "形成可被看见的成果：沟通、创作、连接。",
    shadow: "只顾热闹、不顾结构，或过度取悦他人。",
    keywords: ["表达", "增长", "协作"],
    reflection: ["我希望别人听见/看见什么？", "我在关系里怎么表达需要？"],
    actions: ["把想法做成一个可展示的版本", "发出一次清晰邀请/沟通"],
  },
  4: {
    stage: "结构/稳定",
    light: "建立秩序与边界，让系统可持续。",
    shadow: "僵化、保守或被安全感绑住。",
    keywords: ["稳定", "边界", "秩序"],
    reflection: ["什么规则能让我更轻松？", "我在哪些地方过度控制？"],
    actions: ["设定一个可执行的日程/规则", "把‘必须’改成‘选择’并写下理由"],
  },
  5: {
    stage: "冲突/变化",
    light: "变化带来突破：试错、移动、升级策略。",
    shadow: "对抗成瘾、情绪化反应或失控。",
    keywords: ["变化", "摩擦", "试错"],
    reflection: ["我在抗拒什么变化？", "冲突想教我学会什么？"],
    actions: ["把冲突点改写成需求", "做一次小幅调整而不是翻桌"],
  },
  6: {
    stage: "对齐/关系",
    light: "更成熟的选择与承诺：价值观对齐、互惠。",
    shadow: "取悦、内疚或失衡付出。",
    keywords: ["对齐", "承诺", "互惠"],
    reflection: ["我真正重视的是什么？", "我愿意对什么负责？"],
    actions: ["和关键人物对齐目标/边界", "用一句话明确你的承诺或拒绝"],
  },
  7: {
    stage: "意志/推进",
    light: "带着方向感前进，耐心与自律带来胜利。",
    shadow: "疑虑、拖延或过度用力导致反弹。",
    keywords: ["推进", "自律", "胜利"],
    reflection: ["我正在为谁证明？", "真正的目标是什么？"],
    actions: ["设定一个 7 天可衡量的里程碑", "减少一个分心源"],
  },
  8: {
    stage: "力量/掌控",
    light: "稳稳地驾驭资源与能量，提升影响力。",
    shadow: "控制欲、过度压榨或只看结果。",
    keywords: ["力量", "掌控", "效率"],
    reflection: ["我想掌控的是恐惧还是目标？", "我能不能更温柔地强大？"],
    actions: ["优化一个流程/习惯", "把‘强硬’换成‘清晰’的边界"],
  },
  9: {
    stage: "收敛/洞察",
    light: "回到内在总结经验，提炼真正的智慧。",
    shadow: "封闭、过度反思或迟迟不行动。",
    keywords: ["复盘", "洞察", "独处"],
    reflection: ["我学到的关键规律是什么？", "我在害怕哪个结果？"],
    actions: ["写 5 行复盘并提炼 1 条原则", "做一次低风险的试运行"],
  },
  10: {
    stage: "完成/循环",
    light: "阶段性结果出现，进入下一轮更高阶的课题。",
    shadow: "被结果绑架：要么过度庆祝、要么自我否定。",
    keywords: ["完成", "结果", "循环"],
    reflection: ["这一轮我真正获得了什么？", "下一轮我想换一种方式吗？"],
    actions: ["做收尾清单（3 件事以内）", "为下一阶段设一个更小但更清晰的目标"],
  },
};

const COURT_META: Record<
  "Page" | "Knight" | "Queen" | "King",
  {
    stage: string;
    light: string;
    shadow: string;
    keywords: string[];
    reflection: string[];
    actions: string[];
  }
> = {
  Page: {
    stage: "学习者/信使",
    light: "新鲜、好奇、愿意练习；带来一条消息或灵感。",
    shadow: "幼稚、三心二意、只停留在想象。",
    keywords: ["学习", "消息", "好奇"],
    reflection: ["我需要补哪块基本功？", "我是不是把‘不会’当成了借口？"],
    actions: ["做一次小实验并记录结果", "向靠谱的人请教一个具体问题"],
  },
  Knight: {
    stage: "行动者/推进者",
    light: "敢冲敢做，推动变化与执行。",
    shadow: "鲁莽、急躁、忽略后果与他人感受。",
    keywords: ["行动", "推进", "冒险"],
    reflection: ["我是在追求目标还是逃避感受？", "我冲得够稳吗？"],
    actions: ["把‘冲’变成两步：计划→执行", "设一个停止条件避免失控"],
  },
  Queen: {
    stage: "容纳者/管理者",
    light: "成熟、滋养、能把能量变成可持续的系统。",
    shadow: "过度保护、情绪化掌控或过度付出。",
    keywords: ["滋养", "成熟", "稳定"],
    reflection: ["我真正需要被照顾的是什么？", "我有没有把界限说清？"],
    actions: ["做一个自我照顾的具体安排", "把支持与边界同时表达出来"],
  },
  King: {
    stage: "权威者/决策者",
    light: "负责、清晰、以长期利益做决策并承担结果。",
    shadow: "专断、冷酷、把人当工具或害怕失去控制。",
    keywords: ["责任", "决策", "领导"],
    reflection: ["我愿意承担哪部分责任？", "我是否在用控制来对抗不安？"],
    actions: ["做一个明确决策并公布规则", "为长期目标配置资源（时间/钱/人）"],
  },
};

function suitLabel(suit: TarotSuit): string {
  return SUIT_INFO[suit].zh;
}

function suitElement(suit: TarotSuit): TarotElement {
  return SUIT_INFO[suit].element;
}

function suitKeywords(suit: TarotSuit): string[] {
  return SUIT_INFO[suit].themes;
}

function mergeKeywords(a: string[], b: string[]): string[] {
  const out: string[] = [];
  for (const x of [...a, ...b]) {
    if (!out.includes(x)) out.push(x);
  }
  return out.slice(0, 6);
}

function buildMinorCardText(meta: {
  stage: string;
  suit: TarotSuit;
  rank: string;
  light: string;
  shadow: string;
}): { upright: string; reversed: string } {
  const suit = SUIT_INFO[meta.suit];
  const header = `${suitLabel(meta.suit)}的主题：${suit.themes.join("、")}。阶段：${meta.stage}。`;
  const upright = `${header}${meta.light}（倾向：${suit.light}）`;
  const reversed = `${header}${meta.shadow}（提醒：${suit.shadow}）`;
  return { upright, reversed };
}

export function createMinorArcana(): TarotCard[] {
  const cards: TarotCard[] = [];
  const suits: TarotSuit[] = ["wands", "cups", "swords", "pentacles"];

  for (const suit of suits) {
    // Ace..10
    for (let num = 1; num <= 10; num++) {
      const meta = NUMBER_META[num];
      const rank = num === 1 ? "Ace" : String(num);
      const { upright, reversed } = buildMinorCardText({
        stage: meta.stage,
        suit,
        rank,
        light: meta.light,
        shadow: meta.shadow,
      });
      const name = `${suitLabel(suit)}${rank === "Ace" ? "A" : rank}`;
      cards.push({
        id: `minor-${suit}-${rank.toLowerCase()}`,
        name,
        arcana: "minor",
        suit,
        rank,
        keywords: mergeKeywords(meta.keywords, suitKeywords(suit)),
        upright,
        reversed,
        element: suitElement(suit),
        archetype: meta.stage,
        light: meta.light,
        shadow: meta.shadow,
        reflectionQuestions: meta.reflection.slice(0, 2),
        actionAdvice: meta.actions.slice(0, 2),
      });
    }

    // Courts
    const courts: Array<keyof typeof COURT_META> = ["Page", "Knight", "Queen", "King"];
    for (const court of courts) {
      const meta = COURT_META[court];
      const { upright, reversed } = buildMinorCardText({
        stage: meta.stage,
        suit,
        rank: court,
        light: meta.light,
        shadow: meta.shadow,
      });
      const name = `${suitLabel(suit)}${court}`;
      cards.push({
        id: `minor-${suit}-${court.toLowerCase()}`,
        name,
        arcana: "minor",
        suit,
        rank: court,
        keywords: mergeKeywords(meta.keywords, suitKeywords(suit)),
        upright,
        reversed,
        element: suitElement(suit),
        archetype: meta.stage,
        light: meta.light,
        shadow: meta.shadow,
        reflectionQuestions: meta.reflection.slice(0, 2),
        actionAdvice: meta.actions.slice(0, 2),
      });
    }
  }

  return cards;
}

