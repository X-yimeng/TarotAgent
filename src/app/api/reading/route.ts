import { NextResponse } from "next/server";
import { generateReading } from "@/lib/tarot/reading";
import type { SpreadType } from "@/lib/tarot/types";

type ReadingRequest = {
  question?: string;
  spread?: SpreadType;
  seed?: string;
  allowReversed?: boolean;
  useLLM?: boolean;
};

function parseSpread(value: unknown): SpreadType {
  return value === "three" ? "three" : "one";
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as ReadingRequest;

  const question = typeof body.question === "string" ? body.question : "";
  const spread = parseSpread(body.spread);
  const seed = typeof body.seed === "string" ? body.seed : "";
  const allowReversed = body.allowReversed !== false;
  const useLLM = body.useLLM === true;

  const base = generateReading({ question, spread, seed, allowReversed });

  const llmText = useLLM ? await tryGenerateLLMReading(base).catch(() => null) : null;
  return NextResponse.json({ ...base, llmText });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const question = searchParams.get("q") ?? "";
  const spread = parseSpread(searchParams.get("s"));
  const seed = searchParams.get("seed") ?? "";
  const allowReversed = (searchParams.get("rev") ?? "1") !== "0";
  const useLLM = (searchParams.get("llm") ?? "0") === "1";

  const base = generateReading({ question, spread, seed, allowReversed });
  const llmText = useLLM ? await tryGenerateLLMReading(base).catch(() => null) : null;
  return NextResponse.json({ ...base, llmText });
}

async function tryGenerateLLMReading(base: {
  question: string;
  spread: SpreadType;
  cards: { position: string; reversed: boolean; card: { name: string; keywords: string[]; upright: string; reversed: string } }[];
}) {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) return null;
  const baseUrl = (process.env.LLM_BASE_URL || "https://api.deepseek.com/v1").replace(/\/$/, "");
  const model = process.env.LLM_MODEL || "deepseek-v4-flash";
  const thinking = process.env.LLM_THINKING || "disabled";

  const system = [
    "你是一位温柔、理性但富有想象力的塔罗解读者。",
    "你要避免绝对化断言，不要诱导用户做危险决定（例如医学、法律、财务等）。",
    "输出用简体中文，结构清晰，尽量具体到可执行的小建议。",
  ].join("\n");

  const cardsText = base.cards
    .map((c) => {
      const dir = c.reversed ? "逆位" : "正位";
      const meaning = c.reversed ? c.card.reversed : c.card.upright;
      return `- 位置：${c.position}\n  牌：${c.card.name}（${dir}）\n  关键词：${c.card.keywords.join("、")}\n  含义要点：${meaning}`;
    })
    .join("\n");

  const user = [
    `问题：${base.question || "（未填写问题）"}`,
    `牌阵：${base.spread === "three" ? "三张牌（过去/现在/未来）" : "一张牌（指引）"}`,
    "",
    "抽到的牌：",
    cardsText,
    "",
    "请给出：",
    "1) 一段 3-6 句的整体解读；",
    "2) 分位置逐条解读（每条 2-4 句）；",
    "3) 3 条可执行的小建议（具体到行为）；",
    "4) 一句温柔的收尾。",
  ].join("\n");

  // Best-effort OpenAI-compatible Chat Completions (DeepSeek compatible).
  // If it fails we return null and UI falls back to base.summary.
  const resp = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.8,
      max_tokens: 800,
      thinking: { type: thinking },
    }),
  });

  if (!resp.ok) return null;
  type ChatCompletionsResponse = {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };

  const data = (await resp.json()) as ChatCompletionsResponse;
  const text = data.choices?.[0]?.message?.content;

  return typeof text === "string" && text.trim() ? text.trim() : null;
}

