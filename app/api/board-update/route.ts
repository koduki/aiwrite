import { NextResponse } from "next/server";
import { buildBoardUpdateMessages, parseBoardUpdate, type BoardUpdateRequest } from "@/lib/board-update";
import { validateBoardUpdatePayload } from "@/lib/validation";

type OpenRouterChoice = {
  message?: {
    content?: string;
  };
};

export async function POST(request: Request) {
  let payload: BoardUpdateRequest;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "JSONを読み取れませんでした。" }, { status: 400 });
  }

  const validation = validateBoardUpdatePayload(payload as unknown as Record<string, unknown>);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
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
      messages: buildBoardUpdateMessages(payload),
      temperature: 0.2,
      response_format: { type: "json_object" },
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
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    return NextResponse.json({ error: "ボード更新の応答が空でした。" }, { status: 502 });
  }

  try {
    return NextResponse.json({ settings: parseBoardUpdate(content) });
  } catch {
    return NextResponse.json({ error: "ボード更新JSONを解析できませんでした。" }, { status: 502 });
  }
}
