"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { fallbackInsight, type TarotInsight } from "@/lib/tarot/insight";
import { loadJournal, updateJournalEntry, type JournalEntry } from "@/lib/tarot/journal";
import { getTarotImageUrl } from "@/lib/tarot/images";
import type { DrawnCard } from "@/lib/tarot/types";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
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

export function HistoryDetailClient({ id }: { id: string }) {
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [reviewNote, setReviewNote] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const decoded = decodeURIComponent(id);
      const item = loadJournal().find((candidate) => candidate.id === decoded) ?? null;
      setEntry(item);
      setReviewNote(item?.reviewNote ?? "");
      setLoaded(true);
    }, 0);

    return () => window.clearTimeout(handle);
  }, [id]);

  const insight = useMemo<TarotInsight | null>(() => {
    if (!entry) return null;
    return entry.insight ?? fallbackInsight(entry);
  }, [entry]);

  function saveReview() {
    if (!entry) return;
    const updated = updateJournalEntry(entry.id, { reviewNote });
    if (updated) setEntry(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 1400);
  }

  if (!loaded) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f7f3ee] text-sm text-stone-600">
        正在读取本地历史...
      </main>
    );
  }

  if (!entry || !insight) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f7f3ee] px-4">
        <div className="max-w-md border border-stone-300 bg-white p-5 shadow-sm">
          <h1 className="text-xl font-semibold">没有找到这条记录</h1>
          <p className="mt-2 text-sm leading-6 text-stone-600">历史只保存在当前浏览器本地。如果换了设备、清理了浏览器数据，记录不会同步。</p>
          <Link href="/" className="mt-4 inline-block bg-stone-950 px-4 py-2 text-sm font-semibold text-white">
            返回首页
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f3ee] px-4 py-6 text-stone-950 lg:px-6">
      <div className="mx-auto grid max-w-5xl gap-5">
        <header className="flex flex-col gap-3 border-b border-stone-300 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link href="/" className="text-sm font-medium text-stone-600 hover:text-stone-950">
              返回首页
            </Link>
            <h1 className="mt-2 text-2xl font-semibold">历史详情</h1>
            <p className="mt-1 text-sm text-stone-600">{formatDate(entry.createdAt)}</p>
          </div>
          <div className="text-sm text-stone-600">
            {entry.spread === "three" ? "三张牌" : "单张牌"} / seed {entry.seed}
          </div>
        </header>

        <section className="border border-stone-300 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">Question</div>
          <h2 className="mt-2 text-xl font-semibold">{entry.question || "没有具体问题的开放式阅读"}</h2>
          {entry.guidanceAnswer ? (
            <p className="mt-3 border-l-2 border-stone-900 pl-3 text-sm leading-6 text-stone-700">
              Step 4 补充：{entry.guidanceAnswer}
            </p>
          ) : null}
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          {entry.cards.map((card) => (
            <article key={`${card.position}-${card.card.id}`} className="border border-stone-300 bg-white p-4 shadow-sm">
              <TarotCardImage card={card} />
              <div className="text-xs font-medium text-stone-500">{card.position}</div>
              <h3 className="mt-1 text-lg font-semibold">{card.card.name}</h3>
              <p className="mt-1 text-xs leading-5 text-stone-500">
                {cardDirection(card)} / {card.card.keywords.join("、")}
              </p>
              <p className="mt-3 text-sm leading-6 text-stone-700">{cardMeaning(card)}</p>
            </article>
          ))}
        </section>

        <section className="border border-stone-300 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">Insight</div>
          <InsightDetail insight={insight} />
        </section>

        <section className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="border border-stone-300 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold">追问记录</h2>
            {entry.chatMessages.length ? (
              <div className="mt-3 grid gap-3">
                {entry.chatMessages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={message.role === "user" ? "ml-auto max-w-[92%] bg-stone-950 px-3 py-2 text-sm leading-6 text-white" : "mr-auto max-w-[92%] border border-stone-300 bg-stone-50 px-3 py-2 text-sm leading-6 text-stone-800"}
                  >
                    {message.content}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm leading-6 text-stone-600">这条记录还没有追问内容。</p>
            )}
          </div>

          <div className="border border-stone-300 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold">复盘备注</h2>
            <textarea
              value={reviewNote}
              onChange={(event) => setReviewNote(event.target.value)}
              rows={10}
              className="mt-3 w-full resize-none border border-stone-300 bg-stone-50 px-3 py-2 text-sm leading-6 outline-none focus:border-stone-900"
              placeholder="写下这次阅读之后的行动、结果和新的理解。"
            />
            <button onClick={saveReview} className="mt-3 h-10 w-full bg-stone-950 px-3 text-sm font-semibold text-white hover:bg-stone-800">
              {saved ? "已保存" : "保存复盘"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

function TarotCardImage({ card }: { card: DrawnCard }) {
  const imageUrl = getTarotImageUrl(card.card);

  if (!imageUrl) {
    return (
      <div className="mb-4 grid aspect-[2/3] w-full place-items-center border border-stone-300 bg-stone-100 text-xs text-stone-500">
        暂无牌图
      </div>
    );
  }

  return (
    <div className="relative mx-auto mb-4 aspect-[2/3] h-72 max-h-72 w-full max-w-48 overflow-hidden border border-stone-300 bg-stone-50 p-2">
      <Image
        src={imageUrl}
        alt={`${card.card.name} ${cardDirection(card)}`}
        fill
        sizes="(max-width: 768px) 45vw, 190px"
        loading="lazy"
        className={`object-contain p-2 ${card.reversed ? "rotate-180" : ""}`}
      />
    </div>
  );
}

function InsightDetail({ insight }: { insight: TarotInsight }) {
  return (
    <div className="mt-3 grid gap-5 text-sm leading-7 text-stone-700">
      <div>
        <h2 className="text-lg font-semibold text-stone-950">{insight.title}</h2>
        <p className="mt-2">{insight.core}</p>
        <p className="mt-2 text-stone-600">{insight.questionLink}</p>
      </div>
      <div className="grid gap-3">
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
          <h3 className="font-semibold text-stone-950">反思问题</h3>
          <ul className="mt-2 list-disc pl-5">
            {insight.reflections.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-stone-950">行动建议</h3>
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
