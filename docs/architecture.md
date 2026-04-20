# アーキテクチャ

## 概要

本アプリは Ruby/Sinatra (Backend) と Alpine.js (Frontend) で構成する。

```text
Browser (Alpine.js)
  |
  | LocalStorage
  | - workspace
  | - OpenRouter API key
  |
Sinatra (Ruby)
  | 
  | -- LlmClient (RubyLLM) -- Extension point for MCP/Agents
  |
  | API Routes
  | - /api/openrouter
  | - /api/board-update
  | - /api/import-settings
  |
OpenRouter
```

## 技術スタック

- **Backend**: Ruby 3.4+ / Sinatra 4.2+ (Puma)
- **Frontend**: Alpine.js 3.x / Vanilla HTML / CSS
- **AI API**: OpenRouter Chat Completions API
- **永続化**: ブラウザ LocalStorage
- **コンテナ**: Docker (Alpine Ruby)
- **プラットフォーム**: Cloud Run (想定)

## 永続化

現時点ではブラウザLocalStorageに保存する。

- `aiwrite:workspace:v2`: 作品、話数、創作ボード、チャット、本文
- `aiwrite:openrouter-key`: OpenRouter APIキー

## BYOK方針

OpenRouter APIキーはユーザーのブラウザLocalStorageに保持する。サーバー環境変数やDBには保存しない。

API Routeはキーを受け取ってOpenRouterへ中継するだけである。

## API Routeの責務

### `/api/openrouter`

会話・試し書き・本稿執筆を行う。

入力:

- APIキー
- モデル
- フェーズ
- AI作家ペルソナ
- 創作ボード
- 話数のチャットログ
- 話数の現在本文
- ユーザー指示

出力:

- AI応答テキスト

### `/api/board-update`

最新のユーザー発言とAI応答をもとに、創作ボードを更新する。

出力はJSONのみを期待する。

更新対象:

- 作品タイトル
- コンセプト
- キャラクター
- 世界観・ルール
- プロット
- 参照リンク・素材メモ
- 文体・本稿ルール

### `/api/import-settings`

テキストまたはURLから素材を取り込む。

URLの場合はHTMLから読みやすいテキストを抽出し、創作ボードの参照リンク・素材メモへ追加する。
