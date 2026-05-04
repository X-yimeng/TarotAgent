import { NextResponse } from "next/server";
import { cleanModelText, type TarotInsight } from "@/lib/tarot/insight";
import type { ChatMessage } from "@/lib/tarot/messages";
import { cardDirection, cardMeaning, generateReading } from "@/lib/tarot/reading";
import type { SpreadType } from "@/lib/tarot/types";

type ChatRequest = {
  question?: string;
  spread?: SpreadType;
  seed?: string;
  allowReversed?: boolean;
  messages?: ChatMessage[];
  guidanceAnswer?: string;
  insight?: TarotInsight | null;
};

type ChatCompletionsResponse = {
  choices?: Array<{ message?: { content?: string } }>;
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
        error: "服务端还没有配置 LLM_API_KEY，所以 AI 追问暂不可用。请在 CloudBase 服务环境变量中配置后重新部署或更新服务。",
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
      temperature: 0.76,
      max_tokens: 850,
      thinking: { type: thinking },
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "system", content: buildReadingContext(reading, body.insight, body.guidanceAnswer) },
        ...messages,
      ],
    }),
  });

  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    return NextResponse.json(
      {
        error: `模型服务调用失败（${resp.status}）。请检查 LLM_BASE_URL、LLM_MODEL 和 API Key 是否匹配。`,
        detail: detail.slice(0, 800),
      },
      { status: 502 }
    );
  }

  const data = (await resp.json()) as ChatCompletionsResponse;
  const reply = cleanModelText(
    data.choices?.[0]?.message?.content,
    "我暂时没有生成新的建议。你可以补充：问题类型、当前处境、最担心的点，或你希望我帮你判断什么。"
  );

  return NextResponse.json({ reply });
}

function buildSystemPrompt(): string {
  return [
    "你是一个围绕本次塔罗阅读继续澄清的洞察 Agent，不重新抽牌。",
    "你要把用户的新补充连接回原问题和牌面，给出更具体的建议。",
    "输出使用自然中文段落，最多 4 段；不要 Markdown 标题、分隔线、粗体符号或代码块。",
    "不要做绝对预测，不要恐吓，不要诊断，不要替用户做重大决定。",
  ].join("\n");
}

function buildReadingContext(reading: ReturnType<typeof generateReading>, insight?: TarotInsight | null, guidanceAnswer?: string): string {
  const cards = reading.cards
    .map((c) => {
      return `${c.position}: ${c.card.name}（${cardDirection(c)}），关键词：${c.card.keywords.join("、")}。牌义：${cardMeaning(c)}`;
    })
    .join("\n");

  return [
    "本次阅读上下文：",
    `用户原问题：${reading.question || "用户没有完整写出问题"}`,
    `牌阵：${reading.spread === "three" ? "过去的影响 / 现在的状态 / 下一步建议" : "单张牌核心提示"}`,
    `seed：${reading.seed}`,
    "",
    cards,
    insight ? `\n已生成的核心洞察：${insight.core}\n问题关联：${insight.questionLink}` : "",
    guidanceAnswer ? `\n用户对 Step 4 引导问题的补充：${guidanceAnswer}` : "",
    "",
    "请基于这些上下文回答用户最新追问；如果用户补充了 Step 4 信息，要优先回应这条补充。",
  ].join("\n");
}
