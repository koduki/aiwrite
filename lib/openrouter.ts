import type { ChatMessage, NarrativePhase, NovelSettings, Persona } from "./types";

export type OpenRouterRequest = {
  apiKey: string;
  model: string;
  phase: NarrativePhase;
  persona: Persona;
  settings: NovelSettings;
  messages: ChatMessage[];
  currentManuscript: string;
  userInstruction: string;
  mode: "chat" | "scene" | "retake";
};

const phaseGuides = {
  structuring:
    "フェーズ1: 構造化。あなたはリサーチもできる編集者です。ユーザーのテーマを、作品コンセプト、勢力図、キャラクター、歴史、制度、対立構造、プロット候補へ変換してください。必要な知識背景は短く補い、抽象論で終わらせず作品で使える型に落としてください。",
  sampling:
    "フェーズ2: サンプル執筆。あなたは試し書きに強い脚本家です。固まりきっていない設定をもとに、複数の短いサンプル本文、会話、冒頭、キャラ初登場案を出してください。完成度より、読み味、キャラの声、作品の温度を検証することを優先してください。",
  refining:
    "フェーズ3: 微調整と固定。あなたは共著者兼編集者です。サンプルを読んだユーザーの違和感、好み、悪ノリ、キャラ解釈を最優先し、プロット、世界観、キャラ造形、文体ルールを本稿前の仕様として固めてください。",
  drafting:
    "フェーズ4: 本格執筆。あなたはゴーストライターです。固定されたプロット、世界観、キャラ造形、文体ルールを踏まえ、章や話単位で読める本文を書いてください。説明より本文を優先し、軽快な読み味の奥に重い本質が残るようにしてください。",
} satisfies Record<NarrativePhase, string>;

export function buildSystemPrompt(
  persona: Persona,
  settings: NovelSettings,
  phase: NarrativePhase,
) {
  return [
    "あなたは小説執筆に伴走するAI作家です。",
    "ユーザーは監督兼プロデューサーです。あなたはリサーチャー、編集者、共著者、ゴーストライターをフェーズごとに切り替える脚本家チームです。",
    "ユーザーの主体性を尊重し、設定の矛盾や弱点は短く指摘しつつ、次のラリーにつながる具体案を返してください。",
    phaseGuides[phase],
    "",
    `作家名: ${persona.name || "無名のAI作家"}`,
    `文体: ${persona.style || "読みやすく、情景と感情を両立する"}`,
    `視点: ${persona.pointOfView || "三人称またはユーザー指定に従う"}`,
    `得意ジャンル: ${persona.genres || "青春、恋愛、ファンタジー、現代ドラマ"}`,
    "",
    `作品タイトル: ${settings.title || "未定"}`,
    `コンセプト: ${settings.concept || "未設定"}`,
    `世界観: ${settings.worldView || "未設定"}`,
    `プロット: ${settings.plot || "未設定"}`,
    `キャラクター設定: ${settings.characters || "未設定"}`,
    `参照リンクやメモ: ${settings.referenceLinks || "なし"}`,
    `文体・本稿ルール: ${settings.writingRules || "未設定"}`,
  ].join("\n");
}

export function buildOpenRouterMessages(input: OpenRouterRequest) {
  const recentMessages = input.messages.slice(-10).map((message) => ({
    role: message.role,
    content: message.content,
  }));

  const instructionByPhase = {
    structuring:
      "構造化として答えてください。テーマを作品コンセプト、対立構造、プロット、世界観、キャラ配置へ変換してください。必要な知識背景も短く補ってください。",
    sampling:
      "サンプル執筆として答えてください。短い本文サンプルを複数出し、読み味、キャラの声、テンポを比較できるようにしてください。",
    refining:
      "微調整と固定として答えてください。サンプルへの反応をもとに、プロット、世界観、キャラ造形、文体ルールを本稿用に固めてください。",
    drafting:
      "本格執筆として答えてください。固定済みの設定を反映し、すぐ読める小説本文を中心に出してください。",
  } satisfies Record<NarrativePhase, string>;

  const instructionByMode = {
    chat: "相談への返答を優先してください。",
    scene: "小説本文を優先してください。",
    retake: "既存原稿を踏まえ、修正後の本文または設定案を優先してください。",
  } satisfies Record<OpenRouterRequest["mode"], string>;

  return [
    { role: "system", content: buildSystemPrompt(input.persona, input.settings, input.phase) },
    ...recentMessages,
    {
      role: "user",
      content: [
        instructionByPhase[input.phase],
        instructionByMode[input.mode],
        "",
        "現在の原稿:",
        input.currentManuscript || "まだ本文はありません。",
        "",
        "ユーザー依頼:",
        input.userInstruction,
      ].join("\n"),
    },
  ];
}
