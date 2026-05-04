"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { fallbackInsight, type ReadingResponse, type TarotInsight } from "@/lib/tarot/insight";
import { loadJournal, saveJournal, type JournalEntry } from "@/lib/tarot/journal";
import type { ChatMessage } from "@/lib/tarot/messages";
import { randomSeedString } from "@/lib/tarot/rng";
import type { DrawnCard, SpreadType } from "@/lib/tarot/types";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function cardMeaning(card: DrawnCard) {
  return card.reversed ? card.card.reversed : card.card.upright;
}

function cardDirection(card: DrawnCard) {
  return card.reversed ? "逆位" : "正位";
}

function initialAssistantMessage() {
  return "我会围绕这次牌面继续帮你澄清。你可以补充问题类型、当前处境、最担心的点，或你希望我帮你判断什么。";
}

function getInsight(reading: ReadingResponse): TarotInsight {
  return reading.insight ?? fallbackInsight(reading);
}

export function TarotClient() {
  const [question, setQuestion] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("q") ?? "";
  });
  const [spread, setSpread] = useState<SpreadType>(() => {
    if (typeof window === "undefined") return "three";
    return new URLSearchParams(window.location.search).get("s") === "one" ? "one" : "three";
  });
  const [allowReversed, setAllowReversed] = useState(() => {
    if (typeof window === "undefined") return true;
    return (new URLSearchParams(window.location.search).get("rev") ?? "1") !== "0";
  });
  const [seed, setSeed] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("seed") ?? randomSeedString();
  });
  const [reading, setReading] = useState<ReadingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const [journal, setJournal] = useState<JournalEntry[]>(loadJournal);
  const [reviewNote, setReviewNote] = useState("");
  const [guidanceAnswer, setGuidanceAnswer] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q") ?? "";
    const s = params.get("s") === "one" ? "one" : "three";
    const rev = (params.get("rev") ?? "1") !== "0";
    const seedFromUrl = params.get("seed") ?? "";

    if (seedFromUrl || q) {
      void fetchReading({
        question: q,
        spread: s,
        seed: seedFromUrl || randomSeedString(),
        allowReversed: rev,
      });
    }
  }, []);

  const shareUrl = useMemo(() => {
    if (!reading || typeof window === "undefined") return "";
    const params = new URLSearchParams();
    if (reading.question) params.set("q", reading.question);
    params.set("s", reading.spread);
    params.set("seed", reading.seed);
    params.set("rev", reading.allowReversed ? "1" : "0");
    return `${window.location.origin}/?${params.toString()}`;
  }, [reading]);

  const activeJournalEntry = useMemo(() => {
    if (!reading) return null;
    return journal.find((item) => item.seed === reading.seed && item.question === reading.question) ?? null;
  }, [journal, reading]);

  const insight = reading ? getInsight(reading) : null;
  const aiUnavailable = reading ? !reading.insight : false;

  async function fetchReading(input: {
    question: string;
    spread: SpreadType;
    seed: string;
    allowReversed: boolean;
  }) {
    setLoading(true);
    setError(null);
    setCopied(false);
    setChatError(null);

    try {
      const res = await fetch("/api/reading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, useLLM: true }),
      });
      if (!res.ok) throw new Error(`抽牌失败（${res.status}）`);

      const data = (await res.json()) as ReadingResponse;
      setReading(data);
      setReviewNote("");
      setGuidanceAnswer("");
      setChatMessages([{ role: "assistant", content: initialAssistantMessage() }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "抽牌失败，请稍后再试。");
    } finally {
      setLoading(false);
    }
  }

  async function onDraw() {
    const nextSeed = seed.trim() || randomSeedString();
    setSeed(nextSeed);
    const cleanQuestion = question.trim();

    await fetchReading({
      question: cleanQuestion,
      spread,
      seed: nextSeed,
      allowReversed,
    });

    const params = new URLSearchParams();
    if (cleanQuestion) params.set("q", cleanQuestion);
    params.set("s", spread);
    params.set("seed", nextSeed);
    params.set("rev", allowReversed ? "1" : "0");
    window.history.replaceState(null, "", `/?${params.toString()}`);
  }

  async function onCopyLink() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  function persistCurrentReading() {
    if (!reading) return;
    const nextEntry: JournalEntry = {
      ...reading,
      id: activeJournalEntry?.id ?? `${reading.seed}-${Date.now()}`,
      createdAt: activeJournalEntry?.createdAt ?? new Date().toISOString(),
      reviewNote,
      chatMessages,
      guidanceAnswer,
    };
    const next = [nextEntry, ...journal.filter((item) => item.id !== nextEntry.id)].slice(0, 30);
    setJournal(next);
    saveJournal(next);
  }

  function deleteJournalEntry(id: string) {
    const next = journal.filter((item) => item.id !== id);
    setJournal(next);
    saveJournal(next);
  }

  async function sendChat(overrideText?: string, nextGuidanceAnswer?: string) {
    if (!reading) return;
    const text = (overrideText ?? chatInput).trim();
    if (!text) return;

    const nextMessages: ChatMessage[] = [...chatMessages, { role: "user", content: text }];
    setChatMessages(nextMessages);
    setChatInput("");
    setChatLoading(true);
    setChatError(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: reading.question,
          spread: reading.spread,
          seed: reading.seed,
          allowReversed: reading.allowReversed,
          insight: reading.insight,
          guidanceAnswer: nextGuidanceAnswer ?? guidanceAnswer,
          messages: nextMessages,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { reply?: string; error?: string };
      if (!res.ok) throw new Error(data.error || `AI 追问失败（${res.status}）`);

      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply?.trim() || "我暂时没有生成新的建议。你可以再补充一点当前处境。",
        },
      ]);
    } catch (e) {
      setChatError(e instanceof Error ? e.message : "AI 追问暂不可用，基础牌义和本地记录仍可使用。");
    } finally {
      setChatLoading(false);
    }
  }

  async function continueWithGuidance() {
    if (!insight) return;
    const answer = guidanceAnswer.trim();
    if (!answer) return;
    await sendChat(`针对引导问题「${insight.guidancePrompt.question}」，我的补充是：${answer}`, answer);
  }

  return (
    <div className="min-h-full flex-1 bg-[#f7f3ee] text-stone-950">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[1fr_320px] lg:px-6">
        <main className="grid content-start gap-5">
          <header className="grid gap-3 border-b border-stone-300 pb-5">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center border border-stone-900 bg-stone-950 text-lg font-semibold text-white">
                T
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">塔罗洞察 Agent</h1>
                <p className="text-sm text-stone-600">先澄清问题，再抽牌、解读、追问和复盘。用于自我反思和娱乐，不替代专业建议。</p>
              </div>
            </div>
          </header>

          <section className="border border-stone-300 bg-white p-4 shadow-sm">
            <div className="grid gap-4">
              <div>
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">Step 1</div>
                <h2 className="mt-1 text-lg font-semibold">写下你想澄清的问题</h2>
              </div>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={4}
                placeholder="例如：我最近犹豫要不要换工作，卡住我的是什么？"
                className="w-full resize-none border border-stone-300 bg-stone-50 px-3 py-3 text-sm leading-6 outline-none focus:border-stone-900"
              />
              <div className="grid gap-3 md:grid-cols-3">
                <label className="grid gap-2">
                  <span className="text-sm font-medium">牌阵</span>
                  <select
                    value={spread}
                    onChange={(e) => setSpread(e.target.value as SpreadType)}
                    className="h-11 border border-stone-300 bg-white px-3 text-sm outline-none focus:border-stone-900"
                  >
                    <option value="three">三张牌：过去 / 现在 / 建议</option>
                    <option value="one">单张牌：核心提示</option>
                  </select>
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-medium">Seed</span>
                  <input
                    value={seed}
                    onChange={(e) => setSeed(e.target.value)}
                    placeholder="留空会自动生成"
                    className="h-11 border border-stone-300 bg-white px-3 text-sm outline-none focus:border-stone-900"
                  />
                </label>
                <label className="flex items-center gap-3 border border-stone-300 bg-stone-50 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={allowReversed}
                    onChange={(e) => setAllowReversed(e.target.checked)}
                    className="h-4 w-4 accent-stone-950"
                  />
                  <span className="text-sm font-medium">允许逆位</span>
                </label>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  onClick={onDraw}
                  disabled={loading}
                  className={cx(
                    "h-11 px-5 text-sm font-semibold text-white",
                    loading ? "bg-stone-400" : "bg-stone-950 hover:bg-stone-800"
                  )}
                >
                  {loading ? "正在生成洞察..." : "抽牌并生成洞察"}
                </button>
                <p className="text-xs leading-5 text-stone-500">AI 密钥只在服务端使用。没有密钥时仍可抽牌，并显示本地牌义摘要。</p>
              </div>
              {error ? <div className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
            </div>
          </section>

          {reading && insight ? (
            <section className="grid gap-5">
              <div className="border border-stone-300 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">Step 2</div>
                    <h2 className="mt-1 text-xl font-semibold">{reading.question || "没有具体问题的开放式阅读"}</h2>
                    <p className="mt-1 text-xs text-stone-500">
                      {reading.spread === "three" ? "三张牌" : "单张牌"} / seed {reading.seed}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        const nextSeed = randomSeedString();
                        setSeed(nextSeed);
                        void fetchReading({ question: question.trim(), spread, seed: nextSeed, allowReversed });
                      }}
                      className="h-10 border border-stone-300 bg-white px-3 text-sm font-medium hover:bg-stone-50"
                    >
                      重新抽牌
                    </button>
                    <button
                      onClick={onCopyLink}
                      className="h-10 bg-stone-950 px-3 text-sm font-medium text-white hover:bg-stone-800"
                    >
                      {copied ? "已复制" : "复制分享链接"}
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  {reading.cards.map((card) => (
                    <article
                      key={`${card.position}-${card.card.id}`}
                      className="flex min-h-[430px] flex-col border border-stone-300 bg-stone-50 p-4"
                    >
                      <div>
                        <div className="text-xs font-medium text-stone-500">{card.position}</div>
                        <h3 className="mt-1 text-lg font-semibold">{card.card.name}</h3>
                        <p className="mt-1 text-xs leading-5 text-stone-500">
                          {cardDirection(card)} / {card.card.keywords.join("、")}
                        </p>
                      </div>
                      <p className="mt-3 flex-1 text-sm leading-6 text-stone-700">{cardMeaning(card)}</p>
                      <details className="mt-4 border-t border-stone-300 pt-3 text-sm">
                        <summary className="cursor-pointer font-medium">展开反思与行动</summary>
                        <div className="mt-3 grid gap-3">
                          {card.card.reflectionQuestions?.length ? (
                            <div>
                              <div className="text-xs font-medium text-stone-500">反思问题</div>
                              <ul className="mt-1 list-disc pl-5 leading-6">
                                {card.card.reflectionQuestions.map((item) => (
                                  <li key={item}>{item}</li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                          {card.card.actionAdvice?.length ? (
                            <div>
                              <div className="text-xs font-medium text-stone-500">行动建议</div>
                              <ul className="mt-1 list-disc pl-5 leading-6">
                                {card.card.actionAdvice.map((item) => (
                                  <li key={item}>{item}</li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                        </div>
                      </details>
                    </article>
                  ))}
                </div>
              </div>

              <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
                <section className="border border-stone-300 bg-white p-4 shadow-sm">
                  <div className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">Step 3</div>
                  <h2 className="mt-1 text-lg font-semibold">洞察摘要</h2>
                  {aiUnavailable ? (
                    <div className="mt-3 border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                      AI 解读暂不可用，正在使用本地牌义摘要。请在 CloudBase 环境变量中配置 LLM_API_KEY 启用完整洞察。
                    </div>
                  ) : null}
                  <InsightPanel insight={insight} />
                </section>

                <aside className="grid content-start gap-4 border border-stone-300 bg-white p-4 shadow-sm">
                  <div>
                    <div className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">Step 4</div>
                    <h2 className="mt-1 text-lg font-semibold">下一步</h2>
                  </div>
                  <div className="grid gap-2">
                    <div className="text-sm font-semibold">定制引导问题</div>
                    <p className="text-sm leading-6 text-stone-700">{insight.guidancePrompt.question}</p>
                    <input
                      value={guidanceAnswer}
                      onChange={(e) => setGuidanceAnswer(e.target.value)}
                      placeholder={insight.guidancePrompt.placeholder}
                      className="h-11 w-full border border-stone-300 bg-stone-50 px-3 text-sm outline-none focus:border-stone-900"
                    />
                    <button
                      onClick={continueWithGuidance}
                      disabled={chatLoading || !guidanceAnswer.trim()}
                      className={cx(
                        "h-10 px-3 text-sm font-semibold text-white",
                        chatLoading || !guidanceAnswer.trim() ? "bg-stone-400" : "bg-stone-950 hover:bg-stone-800"
                      )}
                    >
                      {chatLoading ? "追问中..." : "继续追问"}
                    </button>
                  </div>
                  <div>
                    <div className="text-sm font-semibold">24 小时内的小行动</div>
                    <ul className="mt-2 list-disc pl-5 text-sm leading-6 text-stone-700">
                      {insight.actions.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </aside>
              </div>

              <section className="grid gap-5 lg:grid-cols-[1fr_320px]">
                <div className="border border-stone-300 bg-white p-4 shadow-sm">
                  <h2 className="text-lg font-semibold">围绕本次阅读继续追问</h2>
                  <div className="mt-3 max-h-[360px] overflow-auto border border-stone-200 bg-stone-50 p-3">
                    <div className="grid gap-3">
                      {chatMessages.map((message, index) => (
                        <div
                          key={`${message.role}-${index}`}
                          className={cx(
                            "max-w-[92%] px-3 py-2 text-sm leading-6",
                            message.role === "user"
                              ? "ml-auto bg-stone-950 text-white"
                              : "mr-auto border border-stone-300 bg-white text-stone-800"
                          )}
                        >
                          <p className="whitespace-pre-wrap">{message.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  {chatError ? (
                    <div className="mt-3 border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{chatError}</div>
                  ) : null}
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void sendChat();
                        }
                      }}
                      placeholder="继续问：这张牌和我的选择有什么关系？"
                      className="h-11 flex-1 border border-stone-300 bg-white px-3 text-sm outline-none focus:border-stone-900"
                    />
                    <button
                      onClick={() => sendChat()}
                      disabled={chatLoading}
                      className={cx(
                        "h-11 px-5 text-sm font-semibold text-white",
                        chatLoading ? "bg-stone-400" : "bg-stone-950 hover:bg-stone-800"
                      )}
                    >
                      {chatLoading ? "生成中..." : "发送"}
                    </button>
                  </div>
                </div>

                <div className="border border-stone-300 bg-white p-4 shadow-sm">
                  <h2 className="text-lg font-semibold">复盘备注</h2>
                  <textarea
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    rows={8}
                    placeholder="之后回来写：我采取了什么行动？结果如何？这次阅读哪里帮到了我？"
                    className="mt-3 w-full resize-none border border-stone-300 bg-stone-50 px-3 py-2 text-sm leading-6 outline-none focus:border-stone-900"
                  />
                  <button
                    onClick={persistCurrentReading}
                    className="mt-3 h-10 w-full bg-stone-950 px-3 text-sm font-semibold text-white hover:bg-stone-800"
                  >
                    保存到本地历史
                  </button>
                  <p className="mt-2 text-xs leading-5 text-stone-500">记录只保存在你的浏览器本地，不会上传到服务端。</p>
                </div>
              </section>
            </section>
          ) : null}
        </main>

        <aside className="grid content-start gap-4">
          <section className="border border-stone-300 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold">本地历史</h2>
            {journal.length ? (
              <div className="mt-3 grid gap-3">
                {journal.map((entry) => (
                  <article key={entry.id} className="border border-stone-200 bg-stone-50 p-3">
                    <Link href={`/history/${encodeURIComponent(entry.id)}`} className="block">
                      <div className="text-xs text-stone-500">{formatDate(entry.createdAt)}</div>
                      <div className="mt-1 line-clamp-2 text-sm font-medium">{entry.question || "没有具体问题的开放式阅读"}</div>
                      <div className="mt-1 text-xs leading-5 text-stone-500">
                        {entry.spread === "three" ? "三张牌" : "单张牌"} / {entry.cards.map((c) => c.card.name).join("、")}
                      </div>
                    </Link>
                    <button
                      onClick={() => deleteJournalEntry(entry.id)}
                      className="mt-2 text-xs font-medium text-stone-500 hover:text-red-700"
                    >
                      删除
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm leading-6 text-stone-500">保存一次阅读后，这里会出现完整记录，并可进入详情页复盘。</p>
            )}
          </section>

          <section className="border border-stone-300 bg-stone-950 p-4 text-white shadow-sm">
            <h2 className="text-lg font-semibold">使用边界</h2>
            <p className="mt-2 text-sm leading-6 text-stone-300">
              塔罗在这里被当作反思工具：帮助你组织感受、识别模式和选择小行动。它不替代医疗、法律、财务建议，也不替你做重大决定。
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}

function InsightPanel({ insight }: { insight: TarotInsight }) {
  return (
    <div className="mt-4 grid gap-5 text-sm leading-7 text-stone-700">
      <div className="border-l-2 border-stone-950 pl-4">
        <h3 className="text-base font-semibold text-stone-950">{insight.title}</h3>
        <p className="mt-2">{insight.core}</p>
        <p className="mt-2 text-stone-600">{insight.questionLink}</p>
      </div>
      <div className="grid gap-3">
        <h3 className="text-base font-semibold text-stone-950">每张牌如何回应你的问题</h3>
        {insight.cardReadings.map((item) => (
          <div key={`${item.position}-${item.card}`} className="border border-stone-200 bg-stone-50 p-3">
            <div className="text-xs font-medium text-stone-500">
              {item.position} / {item.direction}
            </div>
            <div className="mt-1 font-semibold text-stone-950">{item.card}</div>
            <p className="mt-1">{item.message}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <h3 className="text-base font-semibold text-stone-950">反思问题</h3>
          <ul className="mt-2 list-disc pl-5">
            {insight.reflections.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-base font-semibold text-stone-950">行动建议</h3>
          <ul className="mt-2 list-disc pl-5">
            {insight.actions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
