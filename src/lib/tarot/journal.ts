import type { ChatMessage } from "./messages";
import type { ReadingResponse } from "./insight";

export type JournalEntry = ReadingResponse & {
  id: string;
  createdAt: string;
  reviewNote: string;
  chatMessages: ChatMessage[];
  guidanceAnswer: string;
};

export const JOURNAL_STORAGE_KEY = "tarot.insight_agent.journal.v2";
const OLD_JOURNAL_STORAGE_KEY = "tarot.insight_agent.journal.v1";
const MAX_JOURNAL_ENTRIES = 30;

function normalizeEntry(value: unknown): JournalEntry | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<JournalEntry>;
  if (!Array.isArray(item.cards) || typeof item.seed !== "string") return null;

  return {
    question: typeof item.question === "string" ? item.question : "",
    spread: item.spread === "one" ? "one" : "three",
    seed: item.seed,
    allowReversed: item.allowReversed !== false,
    cards: item.cards,
    summary: typeof item.summary === "string" ? item.summary : "",
    llmText: typeof item.llmText === "string" ? item.llmText : null,
    insight: item.insight ?? null,
    id: typeof item.id === "string" ? item.id : `${item.seed}-${Date.now()}`,
    createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString(),
    reviewNote: typeof item.reviewNote === "string" ? item.reviewNote : "",
    chatMessages: Array.isArray(item.chatMessages) ? item.chatMessages : [],
    guidanceAnswer: typeof item.guidanceAnswer === "string" ? item.guidanceAnswer : "",
  };
}

export function loadJournal(): JournalEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(JOURNAL_STORAGE_KEY) ?? window.localStorage.getItem(OLD_JOURNAL_STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    const entries = data.flatMap((item): JournalEntry[] => {
      const normalized = normalizeEntry(item);
      return normalized ? [normalized] : [];
    });
    saveJournal(entries);
    return entries.slice(0, MAX_JOURNAL_ENTRIES);
  } catch {
    return [];
  }
}

export function saveJournal(entries: JournalEntry[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_JOURNAL_ENTRIES)));
}

export function updateJournalEntry(id: string, patch: Partial<JournalEntry>): JournalEntry | null {
  const entries = loadJournal();
  let updated: JournalEntry | null = null;
  const next = entries.map((entry) => {
    if (entry.id !== id) return entry;
    updated = { ...entry, ...patch };
    return updated;
  });
  saveJournal(next);
  return updated;
}
