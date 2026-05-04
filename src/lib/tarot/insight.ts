import { cardDirection, cardMeaning } from "./reading";
import type { DrawnCard, SpreadType } from "./types";

export type InsightCardReading = {
  position: string;
  card: string;
  direction: string;
  message: string;
};

export type GuidancePrompt = {
  question: string;
  placeholder: string;
};

export type TarotInsight = {
  title: string;
  core: string;
  questionLink: string;
  cardReadings: InsightCardReading[];
  reflections: string[];
  actions: string[];
  guidancePrompt: GuidancePrompt;
};

export type ReadingResponse = {
  question: string;
  spread: SpreadType;
  seed: string;
  allowReversed: boolean;
  cards: DrawnCard[];
  summary: string;
  llmText?: string | null;
  insight?: TarotInsight | null;
};

const MARKDOWN_TOKEN_RE = /(?:^|\s)(#{1,6}|-{3,}|\*{1,2}|`{1,3})(?=\s|$)/g;

export function cleanModelText(value: unknown, fallback = ""): string {
  if (typeof value !== "string") return fallback;
  return value
    .replace(/```(?:json)?/gi, "")
    .replace(/```/g, "")
    .replace(MARKDOWN_TOKEN_RE, " ")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 1600);
}

export function fallbackInsight(reading: {
  question: string;
  spread: SpreadType;
  cards: DrawnCard[];
}): TarotInsight {
  const question = reading.question || "尚未写下具体问题";
  const theme = Array.from(new Set(reading.cards.flatMap((c) => c.card.keywords))).slice(0, 5).join("、");
  const cardReadings = reading.cards.map((card) => ({
    position: card.position,
    card: card.card.name,
    direction: cardDirection(card),
    message: cleanModelText(cardMeaning(card), "这张牌提示你先看清当前可控的部分。"),
  }));
  const reflections = Array.from(new Set(reading.cards.flatMap((c) => c.card.reflectionQuestions ?? []))).slice(0, 4);
  const actions = Array.from(new Set(reading.cards.flatMap((c) => c.card.actionAdvice ?? []))).slice(0, 4);

  return {
    title: "本次牌面的核心提示",
    core: theme ? `这组牌把重点放在 ${theme}。先把问题拆成事实、感受和下一步行动，会比急着求一个结论更有帮助。` : "这组牌更适合用来整理内在感受和下一步选择。",
    questionLink: `围绕“${question}”，牌面提醒你把注意力从结果预测转向当前能调整的选择。`,
    cardReadings,
    reflections: reflections.length ? reflections : ["我真正想被看见的需求是什么？", "这件事里哪些部分是我能控制的？"],
    actions: actions.length ? actions : ["写下一条可以在 24 小时内完成的小行动。", "先做一次低风险尝试，再根据反馈调整。"],
    guidancePrompt: buildFallbackGuidance(question, reading.spread),
  };
}

export function buildFallbackGuidance(question: string, spread: SpreadType): GuidancePrompt {
  const base = question || "这件事";
  return {
    question: spread === "one" ? `关于“${base}”，你现在最想被澄清的一点是什么？` : `关于“${base}”，你最担心的结果、最想获得的帮助分别是什么？`,
    placeholder: "例如：我担心自己选错方向，希望知道下一步怎么试探。",
  };
}

export function insightToPlainText(insight: TarotInsight): string {
  return [
    insight.title,
    insight.core,
    insight.questionLink,
    ...insight.cardReadings.map((item) => `${item.position}: ${item.card}（${item.direction}）${item.message}`),
    "反思问题:",
    ...insight.reflections.map((item) => `- ${item}`),
    "行动建议:",
    ...insight.actions.map((item) => `- ${item}`),
  ]
    .filter(Boolean)
    .join("\n");
}

function normalizeStringArray(value: unknown, fallback: string[], limit: number): string[] {
  if (!Array.isArray(value)) return fallback.slice(0, limit);
  const items = value
    .map((item) => cleanModelText(item))
    .filter(Boolean)
    .slice(0, limit);
  return items.length ? items : fallback.slice(0, limit);
}

export function normalizeInsight(value: unknown, reading: { question: string; spread: SpreadType; cards: DrawnCard[] }): TarotInsight | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  const fallback = fallbackInsight(reading);
  const rawCards = Array.isArray(source.cardReadings) ? source.cardReadings : [];
  const cardReadings = reading.cards.map((card, index) => {
    const raw = rawCards[index];
    const item = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    return {
      position: cleanModelText(item.position, card.position),
      card: cleanModelText(item.card, card.card.name),
      direction: cleanModelText(item.direction, cardDirection(card)),
      message: cleanModelText(item.message, cardMeaning(card)),
    };
  });
  const rawGuidance = source.guidancePrompt && typeof source.guidancePrompt === "object" ? (source.guidancePrompt as Record<string, unknown>) : {};
  const guidanceFallback = buildFallbackGuidance(reading.question, reading.spread);

  return {
    title: cleanModelText(source.title, fallback.title),
    core: cleanModelText(source.core, fallback.core),
    questionLink: cleanModelText(source.questionLink, fallback.questionLink),
    cardReadings,
    reflections: normalizeStringArray(source.reflections, fallback.reflections, 4),
    actions: normalizeStringArray(source.actions, fallback.actions, 4),
    guidancePrompt: {
      question: cleanModelText(rawGuidance.question, guidanceFallback.question),
      placeholder: cleanModelText(rawGuidance.placeholder, guidanceFallback.placeholder),
    },
  };
}
