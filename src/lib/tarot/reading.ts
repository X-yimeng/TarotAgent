import { MAJOR_ARCANA } from "./deck";
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
  one: ["指引"],
  three: ["过去/基础", "现在/阻碍", "未来/建议"],
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
  if (!allowReversed) return false;
  return rng() < 0.5;
}

export function generateReading(input: ReadingInput): ReadingResult {
  const question = input.question.trim();
  const seed = input.seed.trim() || "seed";
  const spread = input.spread;
  const allowReversed = input.allowReversed;

  const rng = mulberry32(hashStringToUint32(`${seed}::${question}::${spread}`));
  const positions = SPREAD_POSITIONS[spread];
  const picked = drawUnique(rng, MAJOR_ARCANA, positions.length);

  const cards: DrawnCard[] = picked.map((card, i) => {
    const reversed = pickReversed(rng, allowReversed);
    return {
      card,
      reversed,
      position: positions[i],
    };
  });

  const summary = buildSummary(question, cards);

  return { question, spread, seed, allowReversed, cards, summary };
}

function buildSummary(question: string, cards: DrawnCard[]): string {
  const q = question || "（未填写问题）";

  const bullets = cards.map((c) => {
    const dir = c.reversed ? "逆位" : "正位";
    return `- ${c.position}：${c.card.name}（${dir}）`;
  });

  const themes = cards.map((c) => {
    const k = c.card.keywords.slice(0, 2).join("、");
    return k ? k : c.reversed ? "调整" : "推进";
  });

  const themeText = Array.from(new Set(themes)).slice(0, 4).join(" / ");
  const spreadHint =
    cards.length === 1
      ? "把它当作一个“当下的指引”。"
      : "把它当作“过去 → 现在 → 下一步建议”的线索。";

  return [
    `关于「${q}」，我的回应是：`,
    "",
    `你现在最需要做的不是追求一个“绝对答案”，而是把注意力放回到可控的行动上（关键词：${themeText || "专注 / 选择"}）。`,
    "",
    "你可以这样用这次抽牌：",
    ...bullets,
    "",
    `建议：先把问题拆成一个最小可执行步骤（今天就能做、10-30 分钟完成），做完再根据反馈调整。${spreadHint}`,
    "",
    "提醒：塔罗更适合做自我探索与决策整理，不替代医学/法律/财务等专业建议。",
  ].join("\n");
}

