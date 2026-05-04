import { NextResponse } from "next/server";
import { fallbackInsight, insightToPlainText, normalizeInsight, type TarotInsight } from "@/lib/tarot/insight";
import { cardDirection, cardMeaning, generateReading } from "@/lib/tarot/reading";
import type { SpreadType } from "@/lib/tarot/types";

type ReadingRequest = {
  question?: string;
  spread?: SpreadType;
  seed?: string;
  allowReversed?: boolean;
  useLLM?: boolean;
};

type ChatCompletionsResponse = {
  choices?: Array<{ message?: { content?: string } }>;
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
  const insight = body.useLLM === true ? await tryGenerateLLMReading(base).catch(() => null) : null;

  return NextResponse.json({
    ...base,
    insight,
    llmText: insight ? insightToPlainText(insight) : null,
  });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const base = generateReading({
    question: searchParams.get("q") ?? "",
    spread: parseSpread(searchParams.get("s")),
    seed: searchParams.get("seed") ?? "",
    allowReversed: (searchParams.get("rev") ?? "1") !== "0",
  });
  const insight = (searchParams.get("llm") ?? "0") === "1" ? await tryGenerateLLMReading(base).catch(() => null) : null;

  return NextResponse.json({
    ...base,
    insight,
    llmText: insight ? insightToPlainText(insight) : null,
  });
}

async function tryGenerateLLMReading(base: ReturnType<typeof generateReading>): Promise<TarotInsight | null> {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) return null;

  const baseUrl = (process.env.LLM_BASE_URL || "https://api.deepseek.com/v1").replace(/\/$/, "");
  const model = process.env.LLM_MODEL || "deepseek-v4-flash";
  const thinking = process.env.LLM_THINKING || "disabled";

  const resp = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.72,
      max_tokens: 1200,
      thinking: { type: thinking },
      messages: [
        {
          role: "system",
          content: [
            "你是一个轻量、专业、克制的塔罗洞察 Agent。",
            "你的任务是帮助用户澄清问题、连接牌面、提出反思问题和可执行的小行动。",
            "安全边界：不能做绝对化预测，不能恐吓，不能诊断，不能替用户做医疗、法律、财务或重大人生决定。",
            "输出必须是严格 JSON 对象，不要 Markdown，不要代码块，不要额外解释。",
          ].join("\n"),
        },
        {
          role: "user",
          content: buildInsightPrompt(base),
        },
      ],
    }),
  });

  if (!resp.ok) return null;

  const data = (await resp.json()) as ChatCompletionsResponse;
  const text = data.choices?.[0]?.message?.content;
  const parsed = parseJsonObject(text);
  return normalizeInsight(parsed, base) ?? fallbackInsight(base);
}

function buildInsightPrompt(base: ReturnType<typeof generateReading>): string {
  const cards = base.cards.map((c) => ({
    position: c.position,
    card: c.card.name,
    direction: cardDirection(c),
    keywords: c.card.keywords,
    meaning: cardMeaning(c),
    reflections: c.card.reflectionQuestions ?? [],
    actions: c.card.actionAdvice ?? [],
  }));

  return JSON.stringify({
    userQuestion: base.question || "用户还没有完整写出问题",
    spread: base.spread === "three" ? "过去的影响 / 现在的状态 / 下一步建议" : "单张牌核心提示",
    cards,
    requiredSchema: {
      title: "一句短标题",
      core: "2-3 句话，说明这组牌的核心洞察，要紧扣用户问题",
      questionLink: "1-2 句话，明确说明牌面如何回应用户原问题，不要泛泛而谈",
      cardReadings: [
        {
          position: "牌阵位置",
          card: "牌名",
          direction: "正位或逆位",
          message: "这张牌在本问题里的具体含义，1-2 句话",
        },
      ],
      reflections: ["2-4 个适合用户继续自问的问题"],
      actions: ["2-4 个 24 小时内可做的小行动"],
      guidancePrompt: {
        question: "一个最关键的定制追问，用来引导用户补充问题类型、当前处境、最担心的点或希望获得的帮助。只问一个问题。",
        placeholder: "一行输入示例，帮助用户知道怎么回答",
      },
    },
    style: [
      "直接、温和、具体",
      "不要使用 ##、---、**、列表符号等 Markdown 控制符",
      "不要说这是命运注定，只说这组牌提供的观察角度",
      "如果用户问题信息不足，guidancePrompt 要优先补足最缺的一块",
    ],
  });
}

function parseJsonObject(text: unknown): unknown {
  if (typeof text !== "string") return null;
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}
