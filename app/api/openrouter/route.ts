import { NextResponse } from "next/server";
import { buildOpenRouterMessages, type OpenRouterRequest } from "@/lib/openrouter";

type OpenRouterChoice = {
  message?: {
    content?: string;
  };
};

export async function POST(request: Request) {
  let payload: OpenRouterRequest;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "JSONを読み取れませんでした。" }, { status: 400 });
  }

  if (!payload.apiKey) {
    return NextResponse.json({ error: "OpenRouter APIキーを入力してください。" }, { status: 400 });
  }

  if (!payload.userInstruction?.trim()) {
    return NextResponse.json({ error: "AI作家への依頼を入力してください。" }, { status: 400 });
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${payload.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://aiwrite.local",
      "X-Title": "aiwrite",
    },
    body: JSON.stringify({
      model: payload.model || "openai/gpt-4o-mini",
      messages: buildOpenRouterMessages(payload),
      temperature: 0.85,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    return NextResponse.json(
      { error: `OpenRouterエラー: ${response.status}`, detail: errorBody.slice(0, 1200) },
      { status: response.status },
    );
  }

  const data = (await response.json()) as { choices?: OpenRouterChoice[] };
  const content = data.choices?.[0]?.message?.content?.trim();

  if (!content) {
    return NextResponse.json({ error: "AIの応答が空でした。" }, { status: 502 });
  }

  return NextResponse.json({ content });
}
