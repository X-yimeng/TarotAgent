import type { TarotCard, TarotElement, TarotSuit } from "./types";

const SUITS: Record<
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
    themes: ["行动", "热情", "创造", "方向"],
    light: "把想法落到行动里，用一次小尝试验证热情是否真实。",
    shadow: "容易急躁、分散或只靠冲动推进，需要先确认优先级。",
  },
  cups: {
    zh: "圣杯",
    element: "water",
    themes: ["情绪", "关系", "直觉", "滋养"],
    light: "允许感受被看见，也让关系里的真实需要浮出水面。",
    shadow: "可能沉在想象、依赖或过度敏感里，需要回到事实与边界。",
  },
  swords: {
    zh: "宝剑",
    element: "air",
    themes: ["思考", "沟通", "判断", "真相"],
    light: "用清晰语言切开问题，分辨事实、推测和情绪。",
    shadow: "容易过度分析、尖锐防御或陷入自我消耗，需要停下内耗。",
  },
  pentacles: {
    zh: "星币",
    element: "earth",
    themes: ["现实", "资源", "身体", "稳定"],
    light: "把洞察落实到时间、金钱、身体和可执行步骤上。",
    shadow: "可能过度求稳、害怕损失或忽略长期价值，需要重新评估投入。",
  },
};

const NUMBER_STAGES: Record<
  number,
  {
    label: string;
    keywords: string[];
    upright: string;
    reversed: string;
    reflection: string[];
    actions: string[];
  }
> = {
  1: {
    label: "种子",
    keywords: ["开始", "潜能", "机会"],
    upright: "新的可能正在出现，重点不是一次做到完美，而是先让它开始。",
    reversed: "机会存在，但能量还没有聚焦；你可能在等待一个永远不会完美的时机。",
    reflection: ["我最想启动的是什么？", "我在等什么条件才允许自己开始？"],
    actions: ["用 20 分钟做一个最小版本。", "写下这件事最小的下一步。"],
  },
  2: {
    label: "选择",
    keywords: ["平衡", "选择", "回应"],
    upright: "你正在比较两个方向，答案来自倾听，而不是立刻证明谁对谁错。",
    reversed: "摇摆拖慢了行动，也可能说明你还没有承认真正的偏好。",
    reflection: ["我真正偏向哪一个选择？", "我害怕失去什么？"],
    actions: ["列出两个选项各自的代价。", "向一个可信的人复述你的选择困境。"],
  },
  3: {
    label: "生长",
    keywords: ["表达", "协作", "展开"],
    upright: "事情开始成形，适合把想法说出来，邀请反馈和协作。",
    reversed: "表达被卡住，或合作里有未说清的期待。",
    reflection: ["我需要谁的支持？", "哪些话我还没有说出口？"],
    actions: ["发出一次明确邀请。", "把模糊期待改写成一句请求。"],
  },
  4: {
    label: "结构",
    keywords: ["秩序", "稳定", "边界"],
    upright: "建立规则和节奏，会让这件事从情绪波动里稳定下来。",
    reversed: "结构过紧或过松都在消耗你，需要重新设置边界。",
    reflection: ["哪里需要更清楚的规则？", "我把安全感交给了什么？"],
    actions: ["设定一个可执行的时间块。", "删掉一个不必要的承诺。"],
  },
  5: {
    label: "冲突",
    keywords: ["变化", "摩擦", "挑战"],
    upright: "冲突暴露了真实问题，它不舒服，但能推动你调整策略。",
    reversed: "你可能在逃避必要的碰撞，或把所有阻力都看成失败。",
    reflection: ["这次摩擦真正提醒了我什么？", "我能接受哪种不完美？"],
    actions: ["把冲突拆成可处理的具体问题。", "先解决影响最大的一个点。"],
  },
  6: {
    label: "调和",
    keywords: ["关系", "修复", "互惠"],
    upright: "关系或局面有修复空间，关键是让给予和接受重新平衡。",
    reversed: "你可能承担太多，或期待别人自动理解你的需要。",
    reflection: ["我在这段关系里给了什么、收到了什么？", "我需要怎样被回应？"],
    actions: ["说出一个具体需要。", "为自己保留一段恢复时间。"],
  },
  7: {
    label: "试炼",
    keywords: ["坚持", "辨别", "防守"],
    upright: "现在需要坚持核心立场，同时辨别哪些战斗值得投入。",
    reversed: "你可能因为疲惫而防御过度，或把所有声音都当成威胁。",
    reflection: ["我真正要守住的是什么？", "哪些压力其实可以放下？"],
    actions: ["写下前三个优先级。", "拒绝一个不必要的消耗。"],
  },
  8: {
    label: "推进",
    keywords: ["练习", "速度", "掌握"],
    upright: "持续练习会带来突破，适合把注意力放在手艺和节奏上。",
    reversed: "忙碌不等于推进，你可能在重复低效动作。",
    reflection: ["我在哪个环节需要练习而不是焦虑？", "哪些动作只是在假装努力？"],
    actions: ["设定一个三天的小练习。", "停止一个低产出的重复动作。"],
  },
  9: {
    label: "成熟",
    keywords: ["收获", "独处", "整合"],
    upright: "你已经积累了经验，现在适合整合成果，也承认自己的成长。",
    reversed: "你可能看不见已拥有的东西，或把独立误解成孤立。",
    reflection: ["这段经历让我变得更清楚的是什么？", "我已经拥有了哪些资源？"],
    actions: ["记录三个已完成的进展。", "为自己安排一次独处复盘。"],
  },
  10: {
    label: "完成",
    keywords: ["结果", "循环", "转折"],
    upright: "一个阶段正在收束，适合看见结果，并准备进入新的循环。",
    reversed: "旧循环还没有真正结束，可能因为你还在重复熟悉的模式。",
    reflection: ["这件事的阶段性结论是什么？", "我不想再重复哪个模式？"],
    actions: ["给当前阶段写一句总结。", "决定下一阶段只保留一件事。"],
  },
};

const COURTS = {
  Page: {
    zh: "侍从",
    label: "学习者",
    keywords: ["好奇", "尝试", "消息"],
    upright: "用初学者心态靠近问题，允许自己边做边学。",
    reversed: "想得很多但经验不足，容易因为怕幼稚而不敢开始。",
    reflection: ["我可以向谁学习？", "我愿意承认自己还在学习吗？"],
    actions: ["提出一个具体问题。", "做一次低风险尝试。"],
  },
  Knight: {
    zh: "骑士",
    label: "行动者",
    keywords: ["推进", "追求", "动力"],
    upright: "行动力正在聚集，适合带着明确方向推进。",
    reversed: "速度可能盖过判断，先确认你不是在用行动逃避感受。",
    reflection: ["我急着冲向哪里？", "我的动力来自热爱还是焦虑？"],
    actions: ["给行动设置一个停止点。", "先确认目标再加速。"],
  },
  Queen: {
    zh: "王后",
    label: "照看者",
    keywords: ["接纳", "滋养", "成熟"],
    upright: "成熟的力量来自照看真实需要，而不是压抑自己。",
    reversed: "你可能照顾了别人，却忽略自己的边界和恢复。",
    reflection: ["我正在滋养什么？", "我是否把照顾变成了控制？"],
    actions: ["为自己安排一件恢复性的事。", "温和但明确地表达边界。"],
  },
  King: {
    zh: "国王",
    label: "掌舵者",
    keywords: ["领导", "承担", "决策"],
    upright: "你需要站到主导位置，用稳定的判断承担决定。",
    reversed: "控制感可能变成僵硬，真正的掌控包括听见反馈。",
    reflection: ["我愿意为哪个决定负责？", "我是否把控制误认为安全？"],
    actions: ["写下一条清晰决策。", "邀请一个反对意见来校准判断。"],
  },
} as const;

function suitInfo(suit: TarotSuit) {
  return SUITS[suit];
}

function mergeKeywords(...groups: ReadonlyArray<ReadonlyArray<string>>): string[] {
  return Array.from(new Set(groups.flat())).slice(0, 6);
}

export function createMinorArcana(): TarotCard[] {
  const cards: TarotCard[] = [];
  const suits: TarotSuit[] = ["wands", "cups", "swords", "pentacles"];

  for (const suit of suits) {
    const info = suitInfo(suit);

    for (let num = 1; num <= 10; num++) {
      const meta = NUMBER_STAGES[num];
      const rank = num === 1 ? "Ace" : String(num);
      cards.push({
        id: `minor-${suit}-${rank.toLowerCase()}`,
        name: `${info.zh}${rank === "Ace" ? "首牌" : rank}`,
        arcana: "minor",
        suit,
        rank,
        keywords: mergeKeywords(meta.keywords, info.themes),
        upright: `${info.zh}关注${info.themes.join("、")}。${meta.upright}${info.light}`,
        reversed: `${info.zh}关注${info.themes.join("、")}。${meta.reversed}${info.shadow}`,
        element: info.element,
        archetype: `${info.zh}的${meta.label}`,
        light: meta.upright,
        shadow: meta.reversed,
        reflectionQuestions: [...meta.reflection],
        actionAdvice: [...meta.actions],
      });
    }

    for (const court of ["Page", "Knight", "Queen", "King"] as const) {
      const meta = COURTS[court];
      cards.push({
        id: `minor-${suit}-${court.toLowerCase()}`,
        name: `${info.zh}${meta.zh}`,
        arcana: "minor",
        suit,
        rank: court,
        keywords: mergeKeywords(meta.keywords, info.themes),
        upright: `${info.zh}${meta.zh}提醒你：${meta.upright}${info.light}`,
        reversed: `${info.zh}${meta.zh}提醒你：${meta.reversed}${info.shadow}`,
        element: info.element,
        archetype: `${info.zh}的${meta.label}`,
        light: meta.upright,
        shadow: meta.reversed,
        reflectionQuestions: [...meta.reflection],
        actionAdvice: [...meta.actions],
      });
    }
  }

  return cards;
}
