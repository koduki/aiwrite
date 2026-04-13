/**
 * APIリクエストのランタイムバリデーション
 */

import type { NarrativePhase } from "./types";

const VALID_PHASES: ReadonlySet<string> = new Set<NarrativePhase>([
  "structuring",
  "sampling",
  "refining",
  "drafting",
]);

const VALID_MODES: ReadonlySet<string> = new Set(["chat", "scene", "retake"]);

const MAX_FIELD_LENGTH = 50_000;
const MAX_MODEL_LENGTH = 200;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringOrEmpty(value: unknown): value is string {
  return typeof value === "string";
}

function truncate(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value;
}

export type OpenRouterValidationResult =
  | { ok: true }
  | { ok: false; error: string };

export function validateOpenRouterPayload(payload: Record<string, unknown>): OpenRouterValidationResult {
  if (!isNonEmptyString(payload.apiKey)) {
    return { ok: false, error: "OpenRouter APIキーを入力してください。" };
  }

  if (!isNonEmptyString(payload.userInstruction)) {
    return { ok: false, error: "AI作家への依頼を入力してください。" };
  }

  if (payload.model !== undefined && !isStringOrEmpty(payload.model)) {
    return { ok: false, error: "モデル名が不正です。" };
  }

  if (typeof payload.model === "string" && payload.model.length > MAX_MODEL_LENGTH) {
    return { ok: false, error: "モデル名が長すぎます。" };
  }

  if (payload.phase !== undefined && !VALID_PHASES.has(payload.phase as string)) {
    return { ok: false, error: "不正なフェーズです。" };
  }

  if (payload.mode !== undefined && !VALID_MODES.has(payload.mode as string)) {
    return { ok: false, error: "不正なモードです。" };
  }

  if (!Array.isArray(payload.messages)) {
    return { ok: false, error: "メッセージが不正です。" };
  }

  for (const msg of payload.messages) {
    if (typeof msg !== "object" || msg === null) {
      return { ok: false, error: "メッセージが不正です。" };
    }
    const m = msg as Record<string, unknown>;
    if (!isStringOrEmpty(m.role) || !isStringOrEmpty(m.content)) {
      return { ok: false, error: "メッセージが不正です。" };
    }
  }

  return { ok: true };
}

export type BoardUpdateValidationResult =
  | { ok: true }
  | { ok: false; error: string };

export function validateBoardUpdatePayload(payload: Record<string, unknown>): BoardUpdateValidationResult {
  if (!isNonEmptyString(payload.apiKey)) {
    return { ok: false, error: "OpenRouter APIキーを入力してください。" };
  }

  if (payload.model !== undefined && !isStringOrEmpty(payload.model)) {
    return { ok: false, error: "モデル名が不正です。" };
  }

  if (typeof payload.model === "string" && payload.model.length > MAX_MODEL_LENGTH) {
    return { ok: false, error: "モデル名が長すぎます。" };
  }

  if (payload.phase !== undefined && !VALID_PHASES.has(payload.phase as string)) {
    return { ok: false, error: "不正なフェーズです。" };
  }

  if (!isStringOrEmpty(payload.userInstruction)) {
    return { ok: false, error: "ユーザー指示が不正です。" };
  }

  if (!isStringOrEmpty(payload.assistantResponse)) {
    return { ok: false, error: "AI応答が不正です。" };
  }

  return { ok: true };
}

export { truncate, MAX_FIELD_LENGTH };
