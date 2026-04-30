export type TarotArcana = "major" | "minor";

export type TarotSuit = "wands" | "cups" | "swords" | "pentacles";

export type TarotElement = "fire" | "water" | "air" | "earth";

export type TarotCard = {
  id: string; // stable id used for URLs
  name: string;
  arcana: TarotArcana;
  number?: number; // major only: 0..21
  suit?: TarotSuit; // minor only
  rank?: string; // minor only: Ace..10..Page..Knight..Queen..King
  keywords: string[];
  upright: string;
  reversed: string;

  // Enriched, structured "reading material" (original writing, not quoting any single source).
  element?: TarotElement;
  archetype?: string; // short archetype label, e.g. "开端/冒险者"
  light?: string; // constructive expression
  shadow?: string; // blocked / distorted expression
  reflectionQuestions?: string[]; // 1-3 prompts for self-inquiry
  actionAdvice?: string[]; // 1-3 concrete actions
};

export type DrawnCard = {
  card: TarotCard;
  reversed: boolean;
  position: string;
};

export type SpreadType = "one" | "three";

