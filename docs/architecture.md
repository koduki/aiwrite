# アーキテクチャ

## 概要

MVPはNext.js単体で構成する。

```text
Browser
  |
  | LocalStorage
  | - workspace
  | - OpenRouter API key
  |
Next.js App Router
  |
  | API Routes
  | - /api/openrouter
  | - /api/board-update
  | - /api/import-settings
  |
OpenRouter
```

## 技術スタック

- Next.js App Router
- React
- TypeScript
- OpenRouter Chat Completions API
- LocalStorage
- Docker
- Cloud Run想定

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

## 将来のFirestore移行

Firestoreへ移行する場合は、LocalStorageの `workspace` を以下へ分割する。

- `users`
- `novels`
- `episodes`

OpenRouter APIキーをDBに保存する場合は、Secret ManagerまたはCloud KMSで暗号化する。
