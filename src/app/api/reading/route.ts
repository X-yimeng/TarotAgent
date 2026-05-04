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
  return value === "one" ? "one" : "three";
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as ReadingRequest;
  const base = generateReading({
    question: typeof body.question === "string" ? body.question : "",
    spread: parseSpread(body.spread),
    seed: typeof body.seed === "string" ? body.seed : "",
    allowReversed: body.allowReversed !== false,
  });
  const llmText = body.useLLM === true ? await tryGenerateLLMReading(base).catch(() => null) : null;

  return NextResponse.json({ ...base, llmText });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const base = generateReading({
    question: searchParams.get("q") ?? "",
    spread: parseSpread(searchParams.get("s")),
    seed: searchParams.get("seed") ?? "",
    allowReversed: (searchParams.get("rev") ?? "1") !== "0",
  });
  const llmText = (searchParams.get("llm") ?? "0") === "1" ? await tryGenerateLLMReading(base).catch(() => null) : null;

  return NextResponse.json({ ...base, llmText });
}

async function tryGenerateLLMReading(base: ReturnType<typeof generateReading>) {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) return null;

  const baseUrl = (process.env.LLM_BASE_URL || "https://api.deepseek.com/v1").replace(/\/$/, "");
  const model = process.env.LLM_MODEL || "deepseek-v4-flash";
  const thinking = process.env.LLM_THINKING || "disabled";

  const cardsText = base.cards
    .map((c) => {
      const direction = c.reversed ? "逆位" : "正位";
      const meaning = c.reversed ? c.card.reversed : c.card.upright;
      const questions = c.card.reflectionQuestions?.map((q) => `  - ${q}`).join("\n") || "";
      const actions = c.card.actionAdvice?.map((a) => `  - ${a}`).join("\n") || "";
      return [
        `${c.position}：${c.card.name}（${direction}）`,
        `关键词：${c.card.keywords.join("、")}`,
        `牌义：${meaning}`,
        questions ? `反思问题：\n${questions}` : null,
        actions ? `行动建议：\n${actions}` : null,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");

  const resp = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.78,
      max_tokens: 900,
      thinking: { type: thinking },
      messages: [
        {
          role: "system",
          content: [
            "你是一个温和、清醒的塔罗洞察 Agent。",
            "你的任务是帮助用户整理问题、看见情绪和行动线索，而不是做绝对预言。",
            "禁止恐吓用户，禁止声称一定会发生，禁止替用户做医疗、法律、财务等重大决定。",
            "输出要具体、克制、可执行，语言使用简体中文。",
          ].join("\n"),
        },
        {
          role: "user",
          content: [
            `用户问题：${base.question || "暂未输入具体问题"}`,
            `牌阵：${base.spread === "three" ? "过去 / 现在 / 下一步建议" : "单张核心提醒"}`,
            "",
            "牌面：",
            cardsText,
            "",
            "请输出四段：1）核心洞察；2）每张牌如何回应问题；3）给用户的反思问题；4）未来 24 小时可做的 1-3 个小行动。",
          ].join("\n"),
        },
      ],
    }),
  });

  if (!resp.ok) return null;

  type ChatCompletionsResponse = {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const data = (await resp.json()) as ChatCompletionsResponse;
  const text = data.choices?.[0]?.message?.content;

  return typeof text === "string" && text.trim() ? text.trim() : null;
}
