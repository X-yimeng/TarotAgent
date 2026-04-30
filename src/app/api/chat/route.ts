import { NextResponse } from "next/server";
import { generateReading } from "@/lib/tarot/reading";
import type { SpreadType } from "@/lib/tarot/types";

type ChatRole = "system" | "user" | "assistant";

type ChatMessage = {
  role: Exclude<ChatRole, "system">;
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
  return value === "three" ? "three" : "one";
}

function normalizeMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];
  const out: ChatMessage[] = [];
  for (const m of value) {
    if (!m || typeof m !== "object") continue;
    const role = (m as { role?: unknown }).role;
    const content = (m as { content?: unknown }).content;
    if ((role === "user" || role === "assistant") && typeof content === "string" && content.trim()) {
      out.push({ role, content: content.trim() });
    }
  }
  return out.slice(-20);
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as ChatRequest;

  const question = typeof body.question === "string" ? body.question : "";
  const spread = parseSpread(body.spread);
  const seed = typeof body.seed === "string" ? body.seed : "";
  const allowReversed = body.allowReversed !== false;
  const messages = normalizeMessages(body.messages);

  const reading = generateReading({ question, spread, seed, allowReversed });

  // API key strategy:
  // - Prefer server-side env key (recommended for public apps)
  // - Fallback to user-provided key passed via header (BYOK), so end-users can bring their own key.
  const headerKey = req.headers.get("x-llm-api-key") || req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const apiKey = process.env.LLM_API_KEY || headerKey || "";
  if (!apiKey) {
    return NextResponse.json(
      { error: "未配置 LLM_API_KEY，也未提供 x-llm-api-key。请在服务端配置或让用户输入自己的 key。" },
      { status: 400 }
    );
  }

  const baseUrl = (process.env.LLM_BASE_URL || "https://api.deepseek.com/v1").replace(/\/$/, "");
  const model = process.env.LLM_MODEL || "deepseek-v4-flash";
  const thinking = process.env.LLM_THINKING || "disabled";

  const system = buildTarotChatSystemPrompt();
  const context = buildTarotChatContextPrompt(reading);

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
        { role: "system", content: context },
        ...messages,
      ],
      temperature: 0.85,
      max_tokens: 900,
      thinking: { type: thinking },
    }),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    return NextResponse.json({ error: `LLM 请求失败 (${resp.status})`, detail: text.slice(0, 800) }, { status: 502 });
  }

  type ChatCompletionsResponse = {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };
  const data = (await resp.json()) as ChatCompletionsResponse;
  const content = data.choices?.[0]?.message?.content;
  const reply = typeof content === "string" ? content.trim() : "";

  return NextResponse.json({
    reply: reply || "我现在有点走神了。你愿意把问题再具体一点吗？（例如：你最在意的是什么、你最害怕的是什么）",
  });
}

function buildTarotChatSystemPrompt(): string {
  return [
    "你是一位高级塔罗占卜师：温柔、有边界、直觉敏锐但逻辑清晰。",
    "你的工作是把塔罗当作“问题分析 + 自我探索 + 可执行建议”的工具，而不是宿命预言。",
    "",
    "原则：",
    "- 先抓住提问者的核心问题与情绪，再解释牌面；不要复述牌义原文。",
    "- 解读要连起来讲故事：看出过去→现在→未来的因果链与转折点；若是一张牌，则聚焦“当下的阻碍/资源/建议”。",
    "- 正位通常代表能量顺畅/外显；逆位常见为能量受阻、内化、过度或不足、需要调整与整合（不要把逆位当坏牌）。",
    "- 用“可能/倾向/如果…那么…”表达，不用绝对化断言（避免‘一定会’‘注定’）。",
    "",
    "伦理与安全边界（必须遵守）：",
    "- 不提供医疗/法律/财务等专业结论；遇到此类问题给出温和提醒并建议寻求专业人士。",
    "- 不做第三方窥探：对“TA 在想什么/TA 会不会怎样”类问题，转回到提问者可控的行动与沟通。",
    "- 不制造恐惧、不诱导依赖。鼓励提问者独立决策与行动。",
    "",
    "对话风格：",
    "- 输出简体中文，语气像资深占卜师但不玄乎，结构清晰。",
    "- 每次回答尽量包含：1) 核心结论（2-4 句） 2) 结合牌的推理（分位置/要点） 3) 追问 1-2 个关键澄清问题 或 给出 2-3 条可执行建议。",
  ].join("\n");
}

function buildTarotChatContextPrompt(reading: {
  question: string;
  spread: SpreadType;
  seed: string;
  allowReversed: boolean;
  cards: {
    position: string;
    reversed: boolean;
    card: {
      name: string;
      keywords: string[];
      upright: string;
      reversed: string;
      element?: string;
      archetype?: string;
      light?: string;
      shadow?: string;
      reflectionQuestions?: string[];
      actionAdvice?: string[];
    };
  }[];
}): string {
  const cardsText = reading.cards
    .map((c) => {
      const dir = c.reversed ? "逆位" : "正位";
      const meaning = c.reversed ? c.card.reversed : c.card.upright;
      const lightShadow = c.reversed ? c.card.shadow || "" : c.card.light || "";
      const qs = c.card.reflectionQuestions?.slice(0, 2).map((x) => `- ${x}`).join("\n") || "";
      const acts = c.card.actionAdvice?.slice(0, 2).map((x) => `- ${x}`).join("\n") || "";
      return [
        `位置：${c.position}`,
        `牌：${c.card.name}（${dir}）`,
        c.card.element ? `元素：${c.card.element}` : null,
        c.card.archetype ? `原型：${c.card.archetype}` : null,
        `关键词：${c.card.keywords.join("、")}`,
        lightShadow ? `光/影提示：${lightShadow}` : null,
        `参考牌义：${meaning}`,
        qs ? `自我提问：\n${qs}` : null,
        acts ? `行动建议：\n${acts}` : null,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");

  return [
    "以下是本次抽牌的“固定上下文”，你必须始终基于这些牌回应（不要重新抽牌，不要改牌）。",
    "",
    `问题：${reading.question || "（未填写问题）"}`,
    `牌阵：${reading.spread === "three" ? "三张（过去/现在/未来）" : "一张（指引）"}`,
    `seed：${reading.seed}`,
    `是否允许逆位：${reading.allowReversed ? "是" : "否"}`,
    "",
    "抽到的牌：",
    cardsText,
    "",
    "注意：参考牌义只是材料，你的输出必须“针对问题”，并将牌与现实行动连接起来。",
  ].join("\n");
}

