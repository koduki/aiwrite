import type { NarrativePhase, NovelSettings, Persona } from "./types";
import { BOARD_UPDATE_PROMPTS } from "./prompts";

export type BoardUpdateRequest = {
  apiKey: string;
  model: string;
  phase: NarrativePhase;
  persona: Persona;
  settings: NovelSettings;
  userInstruction: string;
  assistantResponse: string;
};

export type BoardUpdateResult = {
  title?: string;
  concept?: string;
  characters?: string;
  worldView?: string;
  plot?: string;
  referenceLinks?: string;
  writingRules?: string;
};

export function buildBoardUpdateMessages(input: BoardUpdateRequest) {
  return [
    {
      role: "system",
      content: BOARD_UPDATE_PROMPTS.SYSTEM,
    },
    {
      role: "user",
      content: [
        `現在フェーズ: ${input.phase}`,
        "",
        "AI作家ペルソナ:",
        `${input.persona.name}: ${input.persona.style}`,
        "",
        "現在のボード:",
        `タイトル: ${input.settings.title}`,
        "",
        "コンセプト:",
        input.settings.concept || "未設定",
        "",
        "キャラクター設定:",
        input.settings.characters || "未設定",
        "",
        "世界観・ルール:",
        input.settings.worldView || "未設定",
        "",
        "プロット:",
        input.settings.plot || "未設定",
        "",
        "参照リンク・素材メモ:",
        input.settings.referenceLinks || "なし",
        "",
        "文体・本稿ルール:",
        input.settings.writingRules || "未設定",
        "",
        "最新のユーザー発言:",
        input.userInstruction,
        "",
        "最新のAI応答:",
        input.assistantResponse,
        "",
        BOARD_UPDATE_PROMPTS.USER_FOOTER,
      ].join("\n"),
    },
  ];
}

export function parseBoardUpdate(raw: string): BoardUpdateResult {
  const trimmed = raw.trim();
  const jsonText = trimmed.startsWith("{")
    ? trimmed
    : trimmed.match(/\{[\s\S]*\}/)?.[0] || "{}";
  const parsed = JSON.parse(jsonText) as BoardUpdateResult;

  return {
    title: typeof parsed.title === "string" ? parsed.title.trim() : undefined,
    concept: typeof parsed.concept === "string" ? parsed.concept.trim() : undefined,
    characters: typeof parsed.characters === "string" ? parsed.characters.trim() : undefined,
    worldView: typeof parsed.worldView === "string" ? parsed.worldView.trim() : undefined,
    plot: typeof parsed.plot === "string" ? parsed.plot.trim() : undefined,
    referenceLinks: typeof parsed.referenceLinks === "string" ? parsed.referenceLinks.trim() : undefined,
    writingRules: typeof parsed.writingRules === "string" ? parsed.writingRules.trim() : undefined,
  };
}
