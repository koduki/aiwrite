import { NextResponse } from "next/server";
import { isBlockedHost } from "@/lib/url-guard";

function extractReadableText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 6000);
}

export async function POST(request: Request) {
  let body: { url?: string; text?: string };
  try {
    body = (await request.json()) as { url?: string; text?: string };
  } catch {
    return NextResponse.json({ error: "JSONを読み取れませんでした。" }, { status: 400 });
  }

  const { url, text } = body;

  if (text?.trim()) {
    return NextResponse.json({ importedText: text.trim().slice(0, 6000) });
  }

  if (!url?.trim()) {
    return NextResponse.json({ error: "URLまたはテキストを入力してください。" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "URLの形式が正しくありません。" }, { status: 400 });
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return NextResponse.json({ error: "httpまたはhttpsのURLのみ読み込めます。" }, { status: 400 });
  }

  if (isBlockedHost(parsed.hostname)) {
    return NextResponse.json({ error: "内部ネットワークへのアクセスは許可されていません。" }, { status: 403 });
  }

  let response: Response;
  try {
    response = await fetch(parsed.toString(), {
      headers: {
        "User-Agent": "aiwrite-settings-importer/0.1",
      },
      signal: AbortSignal.timeout(10_000),
      redirect: "error",
    });
  } catch {
    return NextResponse.json({ error: "URLを読み込めませんでした。" }, { status: 502 });
  }

  if (!response.ok) {
    return NextResponse.json({ error: `URLを読み込めませんでした: ${response.status}` }, { status: 502 });
  }

  const contentType = response.headers.get("content-type") || "";
  const responseBody = await response.text();
  const importedText = contentType.includes("text/html") ? extractReadableText(responseBody) : responseBody.slice(0, 6000);

  return NextResponse.json({ importedText });
}
