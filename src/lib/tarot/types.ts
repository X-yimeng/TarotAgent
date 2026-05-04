export type TarotArcana = "major" | "minor";

export type TarotSuit = "wands" | "cups" | "swords" | "pentacles";

export type TarotElement = "fire" | "water" | "air" | "earth";

export type TarotCard = {
  id: string;
  name: string;
  arcana: TarotArcana;
  number?: number;
  suit?: TarotSuit;
  rank?: string;
  keywords: string[];
  upright: string;
  reversed: string;
  element?: TarotElement;
  archetype?: string;
  light?: string;
  shadow?: string;
  reflectionQuestions?: string[];
  actionAdvice?: string[];
};

export type DrawnCard = {
  card: TarotCard;
  reversed: boolean;
  position: string;
};

export type SpreadType = "one" | "three";
