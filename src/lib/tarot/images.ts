import type { TarotCard } from "./types";

const BASE_URL = "https://www.sacred-texts.com/tarot/pkt/img";

const MAJOR_FILES: Record<string, string> = {
  "the-fool": "ar00.jpg",
  "the-magician": "ar01.jpg",
  "the-high-priestess": "ar02.jpg",
  "the-empress": "ar03.jpg",
  "the-emperor": "ar04.jpg",
  "the-hierophant": "ar05.jpg",
  "the-lovers": "ar06.jpg",
  "the-chariot": "ar07.jpg",
  strength: "ar08.jpg",
  "the-hermit": "ar09.jpg",
  "wheel-of-fortune": "ar10.jpg",
  justice: "ar11.jpg",
  "the-hanged-man": "ar12.jpg",
  death: "ar13.jpg",
  temperance: "ar14.jpg",
  "the-devil": "ar15.jpg",
  "the-tower": "ar16.jpg",
  "the-star": "ar17.jpg",
  "the-moon": "ar18.jpg",
  "the-sun": "ar19.jpg",
  judgement: "ar20.jpg",
  "the-world": "ar21.jpg",
};

const SUIT_PREFIX: Record<string, string> = {
  wands: "wa",
  cups: "cu",
  swords: "sw",
  pentacles: "pe",
};

const RANK_SUFFIX: Record<string, string> = {
  ace: "ac",
  "2": "02",
  "3": "03",
  "4": "04",
  "5": "05",
  "6": "06",
  "7": "07",
  "8": "08",
  "9": "09",
  "10": "10",
  page: "pa",
  knight: "kn",
  queen: "qu",
  king: "ki",
};

export function getTarotImageUrl(card: TarotCard): string | null {
  const majorFile = MAJOR_FILES[card.id];
  if (majorFile) return `${BASE_URL}/${majorFile}`;

  if (!card.suit || !card.rank) return null;
  const suit = SUIT_PREFIX[card.suit];
  const rank = RANK_SUFFIX[card.rank.toLowerCase()];
  if (!suit || !rank) return null;

  return `${BASE_URL}/${suit}${rank}.jpg`;
}
