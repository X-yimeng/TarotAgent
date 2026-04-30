"use client";

import { useEffect, useMemo, useState } from "react";
import { randomSeedString } from "@/lib/tarot/rng";
import type { DrawnCard, SpreadType } from "@/lib/tarot/types";

type ReadingResponse = {
  question: string;
  spread: SpreadType;
  seed: string;
  allowReversed: boolean;
  cards: DrawnCard[];
  summary: string;
  llmText?: string | null;
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function TarotClient() {
  const [question, setQuestion] = useState(() => {
    if (typeof window === "undefined") return "";
    const params = new URLSearchParams(window.location.search);
    return params.get("q") ?? "";
  });

  const [spread, setSpread] = useState<SpreadType>(() => {
    if (typeof window === "undefined") return "three";
    const params = new URLSearchParams(window.location.search);
    const s = params.get("s");
    return s === "one" || s === "three" ? s : "three";
  });

  const [allowReversed, setAllowReversed] = useState(() => {
    if (typeof window === "undefined") return true;
    const params = new URLSearchParams(window.location.search);
    return (params.get("rev") ?? "1") !== "0";
  });

  const [seed, setSeed] = useState(() => {
    if (typeof window === "undefined") return randomSeedString();
    const params = new URLSearchParams(window.location.search);
    return params.get("seed") ?? randomSeedString();
  });
  const [loading, setLoading] = useState(false);
  const [reading, setReading] = useState<ReadingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const shareUrl = useMemo(() => {
    if (!reading) return null;
    const params = new URLSearchParams();
    if (reading.question) params.set("q", reading.question);
    params.set("s", reading.spread);
    params.set("seed", reading.seed);
    params.set("rev", reading.allowReversed ? "1" : "0");
    return `${window.location.origin}/?${params.toString()}`;
  }, [reading]);

  useEffect(() => {
    // Auto-load when opened from a share link (state already initialized from URL)
    if (!question && !seed) return;
    void fetchReading({ question, spread, seed, allowReversed });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchReading(input: {
    question: string;
    spread: SpreadType;
    seed: string;
    allowReversed: boolean;
  }) {
    setLoading(true);
    setError(null);
    setCopied(false);
    try {
      const res = await fetch("/api/reading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error(`请求失败 (${res.status})`);
      const data = (await res.json()) as ReadingResponse;
      setReading(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "发生未知错误");
    } finally {
      setLoading(false);
    }
  }

  async function onDraw() {
    const newSeed = seed.trim() || randomSeedString();
    if (!seed.trim()) setSeed(newSeed);
    await fetchReading({ question, spread, seed: newSeed, allowReversed });
    const params = new URLSearchParams();
    if (question.trim()) params.set("q", question.trim());
    params.set("s", spread);
    params.set("seed", newSeed);
    params.set("rev", allowReversed ? "1" : "0");
    window.history.replaceState(null, "", `/?${params.toString()}`);
  }

  async function onCopyLink() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div className="min-h-full flex-1 bg-gradient-to-b from-zinc-50 via-white to-zinc-50 text-zinc-900 dark:from-zinc-950 dark:via-black dark:to-zinc-950 dark:text-zinc-50">
      <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
        <header className="flex flex-col gap-2">
          <div className="inline-flex items-center gap-2">
            <div className="h-10 w-10 rounded-2xl bg-zinc-900 text-white dark:bg-white dark:text-black grid place-items-center font-semibold">
              占
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">塔罗占卜</h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                输入问题 → 抽一张/三张牌 → 生成可分享链接
              </p>
            </div>
          </div>
        </header>

        <main className="mt-8 grid gap-6">
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="grid gap-4">
              <label className="grid gap-2">
                <div className="text-sm font-medium">你想问什么？</div>
                <input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="例如：我该不该选这门课？/ 这段关系接下来怎么走？"
                  className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-800 dark:bg-black dark:focus:ring-white/10"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-3">
                <label className="grid gap-2">
                  <div className="text-sm font-medium">牌阵</div>
                  <select
                    value={spread}
                    onChange={(e) => setSpread(e.target.value as SpreadType)}
                    className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-800 dark:bg-black dark:focus:ring-white/10"
                  >
                    <option value="one">一张（指引）</option>
                    <option value="three">三张（过去/现在/未来）</option>
                  </select>
                </label>

                <label className="grid gap-2">
                  <div className="text-sm font-medium">随机种子（用于分享复现）</div>
                  <input
                    value={seed}
                    onChange={(e) => setSeed(e.target.value)}
                    placeholder="留空会自动生成"
                    className="h-11 rounded-xl border border-zinc-200 bg-white px-4 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-800 dark:bg-black dark:focus:ring-white/10"
                  />
                </label>

                <label className="flex items-end gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/30">
                  <input
                    type="checkbox"
                    checked={allowReversed}
                    onChange={(e) => setAllowReversed(e.target.checked)}
                    className="h-4 w-4 accent-zinc-900 dark:accent-white"
                  />
                  <div className="grid">
                    <div className="text-sm font-medium leading-5">包含逆位</div>
                    <div className="text-xs text-zinc-600 dark:text-zinc-400">更细腻，但也更“拧巴”</div>
                  </div>
                </label>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  onClick={onDraw}
                  disabled={loading}
                  className={cx(
                    "h-11 rounded-xl px-5 text-sm font-medium transition",
                    loading
                      ? "bg-zinc-300 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                      : "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                  )}
                >
                  {loading ? "正在洗牌…" : "抽牌并解读"}
                </button>
                <div className="text-xs text-zinc-600 dark:text-zinc-400">
                  提醒：这是自我探索工具，不替代专业建议。
                </div>
              </div>

              {error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
                  {error}
                </div>
              ) : null}
            </div>
          </section>

          {reading ? (
            <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="grid gap-1">
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">你的问题</div>
                  <div className="text-lg font-semibold">{reading.question || "（未填写）"}</div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400">
                    牌阵：{reading.spread === "three" ? "三张（过去/现在/未来）" : "一张（指引）"} · seed：
                    <span className="font-mono"> {reading.seed}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const s = randomSeedString();
                      setSeed(s);
                      void fetchReading({ question, spread, seed: s, allowReversed });
                    }}
                    className="h-10 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:hover:bg-zinc-900"
                  >
                    再抽一次
                  </button>
                  <button
                    onClick={onCopyLink}
                    disabled={!shareUrl}
                    className={cx(
                      "h-10 rounded-xl px-4 text-sm font-medium transition",
                      copied
                        ? "bg-emerald-600 text-white"
                        : "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                    )}
                  >
                    {copied ? "已复制" : "复制分享链接"}
                  </button>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {reading.cards.map((c) => (
                  <div
                    key={`${c.card.id}-${c.position}`}
                    className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/30"
                  >
                    <div className="text-xs text-zinc-600 dark:text-zinc-400">{c.position}</div>
                    <div className="mt-1 text-base font-semibold">{c.card.name}</div>
                    <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                      {c.reversed ? "逆位" : "正位"} · {c.card.keywords.join(" · ")}
                    </div>
                    <details className="mt-3 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 dark:border-zinc-800 dark:bg-black dark:text-zinc-200">
                      <summary className="cursor-pointer select-none text-xs font-medium text-zinc-600 dark:text-zinc-400">
                        展开牌义
                      </summary>
                      <div className="mt-2 leading-6">{c.reversed ? c.card.reversed : c.card.upright}</div>
                    </details>
                  </div>
                ))}
              </div>

              <div className="mt-5 grid gap-3">
                <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-black">
                  <div className="text-sm font-medium">对你的问题的回应</div>
                  <pre className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-800 dark:text-zinc-200">
                    {reading.llmText?.trim() ? reading.llmText : reading.summary}
                  </pre>
                </div>
              </div>
            </section>
          ) : null}

          <footer className="pt-2 text-center text-xs text-zinc-500 dark:text-zinc-400">
            内置牌库：大阿尔克那 22 张（MVP）。要扩展 78 张或加图片资源也可以继续做。
          </footer>
        </main>
      </div>
    </div>
  );
}

