import { NextResponse } from "next/server";
import { generateReading } from "@/lib/tarot/reading";
import type { SpreadType } from "@/lib/tarot/types";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatRequest = {
  question?: string;
  spread?: SpreadType;
  seed?: string;
  allowReversed?: boolean;
  messages?: ChatMessage[];
};

function parseSpread(value: unknown): SpreadType {
  return value === "one" ? "one" : "three";
}

function normalizeMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];

  return value
    .flatMap((m): ChatMessage[] => {
      if (!m || typeof m !== "object") return [];
      const role = (m as { role?: unknown }).role;
      const content = (m as { content?: unknown }).content;
      if ((role === "user" || role === "assistant") && typeof content === "string" && content.trim()) {
        return [{ role, content: content.trim().slice(0, 2000) }];
      }
      return [];
    })
    .slice(-16);
}

export async function POST(req: Request) {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error: "服务端尚未配置 LLM_API_KEY。基础抽牌仍可使用，AI 追问暂不可用。",
      },
      { status: 400 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as ChatRequest;
  const reading = generateReading({
    question: typeof body.question === "string" ? body.question : "",
    spread: parseSpread(body.spread),
    seed: typeof body.seed === "string" ? body.seed : "",
    allowReversed: body.allowReversed !== false,
  });
  const messages = normalizeMessages(body.messages);

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
      temperature: 0.82,
      max_tokens: 800,
      thinking: { type: thinking },
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "system", content: buildReadingContext(reading) },
        ...messages,
      ],
    }),
  });

  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    return NextResponse.json(
      {
        error: `模型服务暂时不可用（${resp.status}）。请稍后再试。`,
        detail: detail.slice(0, 800),
      },
      { status: 502 }
    );
  }

  type ChatCompletionsResponse = {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const data = (await resp.json()) as ChatCompletionsResponse;
  const reply = data.choices?.[0]?.message?.content?.trim();

  return NextResponse.json({
    reply:
      reply ||
      "我暂时没有生成清晰回应。你可以换一种更具体的问法，例如：这张牌在提醒我注意什么？我下一步可以做什么？",
  });
}

function buildSystemPrompt(): string {
  return [
    "你是一个塔罗洞察 Agent，专注于围绕本次抽牌做澄清、反思和行动建议。",
    "你不是算命师，不做绝对预言，不恐吓用户，不声称任何结果一定发生。",
    "当用户询问医疗、法律、财务等高风险问题时，提醒其咨询专业人士，并只提供自我反思角度。",
    "回复要温和、具体、简洁，优先帮助用户分辨事实、情绪、假设和下一步行动。",
  ].join("\n");
}

function buildReadingContext(reading: ReturnType<typeof generateReading>): string {
  const cards = reading.cards
    .map((c) => {
      const direction = c.reversed ? "逆位" : "正位";
      const meaning = c.reversed ? c.card.reversed : c.card.upright;
      return `${c.position}：${c.card.name}（${direction}）。关键词：${c.card.keywords.join("、")}。牌义：${meaning}`;
    })
    .join("\n");

  return [
    "当前阅读上下文：",
    `用户问题：${reading.question || "暂未输入具体问题"}`,
    `牌阵：${reading.spread === "three" ? "过去 / 现在 / 下一步建议" : "单张核心提醒"}`,
    `seed：${reading.seed}`,
    "",
    cards,
    "",
    "请始终围绕以上牌面回答，不要编造新的抽牌结果。",
  ].join("\n");
}
