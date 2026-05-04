import { TAROT_DECK } from "./deck";
import { hashStringToUint32, mulberry32 } from "./rng";
import type { DrawnCard, SpreadType, TarotCard } from "./types";

export type ReadingInput = {
  question: string;
  spread: SpreadType;
  seed: string;
  allowReversed: boolean;
};

export type ReadingResult = {
  question: string;
  spread: SpreadType;
  seed: string;
  allowReversed: boolean;
  cards: DrawnCard[];
  summary: string;
};

const SPREAD_POSITIONS: Record<SpreadType, string[]> = {
  one: ["当下的核心提醒"],
  three: ["过去的影响", "现在的状态", "下一步建议"],
};

function drawUnique(rng: () => number, deck: TarotCard[], count: number): TarotCard[] {
  const pool = deck.slice();
  const drawn: TarotCard[] = [];

  for (let i = 0; i < count; i++) {
    const idx = Math.floor(rng() * pool.length);
    drawn.push(pool.splice(idx, 1)[0]);
  }

  return drawn;
}

function pickReversed(rng: () => number, allowReversed: boolean): boolean {
  return allowReversed && rng() < 0.5;
}

export function generateReading(input: ReadingInput): ReadingResult {
  const question = input.question.trim();
  const seed = input.seed.trim() || "seed";
  const spread = input.spread;
  const allowReversed = input.allowReversed;
  const positions = SPREAD_POSITIONS[spread];
  const rng = mulberry32(hashStringToUint32(`${seed}::${question}::${spread}`));
  const picked = drawUnique(rng, TAROT_DECK, positions.length);

  const cards = picked.map<DrawnCard>((card, i) => ({
    card,
    reversed: pickReversed(rng, allowReversed),
    position: positions[i],
  }));

  return {
    question,
    spread,
    seed,
    allowReversed,
    cards,
    summary: buildSummary(question, cards),
  };
}

function cardMeaning(card: DrawnCard): string {
  return card.reversed ? card.card.reversed : card.card.upright;
}

function buildSummary(question: string, cards: DrawnCard[]): string {
  const theme = Array.from(new Set(cards.flatMap((c) => c.card.keywords))).slice(0, 5).join(" / ");
  const lines = cards.map((c) => {
    const direction = c.reversed ? "逆位" : "正位";
    return `- ${c.position}：${c.card.name}（${direction}）提示 ${cardMeaning(c)}`;
  });
  const actions = Array.from(new Set(cards.flatMap((c) => c.card.actionAdvice ?? []))).slice(0, 3);
  const reflections = Array.from(new Set(cards.flatMap((c) => c.card.reflectionQuestions ?? []))).slice(0, 3);

  return [
    `问题：${question || "暂未输入具体问题"}`,
    `主题线索：${theme || "观察当下、辨认真相、采取小行动"}`,
    "",
    "牌面洞察：",
    ...lines,
    "",
    "反思问题：",
    ...reflections.map((x) => `- ${x}`),
    "",
    "下一步行动：",
    ...actions.map((x) => `- ${x}`),
    "",
    "温和提醒：塔罗适合作为自我反思工具，不替代医疗、法律、财务等专业建议，也不需要把牌面当成绝对预言。",
  ].join("\n");
}
