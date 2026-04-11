# API仕様

## POST `/api/openrouter`

OpenRouterのChat Completions APIへ中継し、フェーズに応じたAI応答を生成する。

### Request

```ts
type OpenRouterRequest = {
  apiKey: string;
  model: string;
  phase: "structuring" | "sampling" | "refining" | "drafting";
  persona: Persona;
  settings: NovelSettings;
  messages: ChatMessage[];
  currentManuscript: string;
  userInstruction: string;
  mode: "chat" | "scene" | "retake";
};
```

### Response

```ts
type Response = {
  content: string;
};
```

### フェーズとmode

```text
structuring -> chat
sampling    -> scene
refining    -> retake
drafting    -> scene
```

## POST `/api/board-update`

最新の会話をもとに創作ボードを更新する。

### Request

```ts
type BoardUpdateRequest = {
  apiKey: string;
  model: string;
  phase: NarrativePhase;
  persona: Persona;
  settings: NovelSettings;
  userInstruction: string;
  assistantResponse: string;
};
```

### Response

```ts
type Response = {
  settings: {
    title?: string;
    concept?: string;
    characters?: string;
    worldView?: string;
    plot?: string;
    referenceLinks?: string;
    writingRules?: string;
  };
};
```

### 方針

- 最新のユーザー指示を優先する
- 採用が明確でない候補は固定設定にしない
- 既存設定を破壊しない
- JSONのみを返すようOpenRouterへ依頼する
- 失敗しても通常の会話生成は失敗扱いにしない

## POST `/api/import-settings`

設定素材を取り込む。

### Request

```ts
type Request =
  | { text: string }
  | { url: string };
```

### Response

```ts
type Response = {
  importedText: string;
};
```

### URL取り込み

- `http` と `https` のみ許可
- HTMLの場合は `script` と `style` を除去
- タグを除去してテキスト化
- 最大6000文字まで返す

