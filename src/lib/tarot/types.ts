export type TarotArcana = "major" | "minor";

export type TarotSuit = "wands" | "cups" | "swords" | "pentacles";

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
};

export type DrawnCard = {
  card: TarotCard;
  reversed: boolean;
  position: string;
};

export type SpreadType = "one" | "three";

