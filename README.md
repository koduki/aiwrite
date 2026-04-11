# アイライト

アイライトは、ユーザー自身のOpenRouter APIキーを使ってAI作家と対話しながら小説を書くMVPです。スマホ中心のUIで、ChatGPTのような対話を読み進めながら、構造化、試し書き、微調整、本稿執筆をループできます。

## 実装範囲

- OpenRouter `/api/v1/chat/completions` へのNext.js API Route中継
- 設定パネルでのOpenRouter APIキー、モデル名、AI作家ペルソナ編集
- 複数作品と作品ごとの複数話管理
- 創作ボードでの作品タイトル、コンセプト、キャラクター、世界観、プロット、参照素材、文体・本稿ルール編集
- AIとの会話内容に応じたキャラクター設定、世界観、プロットの自動更新
- テキストまたはURLからの設定インポート
- 構造化、試し書き、微調整、本稿の4フェーズ
- フェーズ別にAIの役割とプロンプトを切り替えるライターズルーム体験
- 会話から現在採用している作品設定へ整理される創作ボード
- 本稿フェーズの生成本文だけを積み上げる原稿プレビュー
- Cloud Run向けDockerfile
- Firestore導入時のセキュリティルール雛形

## 詳細ドキュメント

- [サービス仕様](./docs/service-spec.md)
- [UX仕様](./docs/ux-spec.md)
- [アーキテクチャ](./docs/architecture.md)
- [データ構造](./docs/data-model.md)
- [API仕様](./docs/api-spec.md)
- [デプロイ](./docs/deployment.md)
- [今後の拡張](./docs/roadmap.md)

## 起動

```bash
npm install
npm run dev
```

http://localhost:3000 を開きます。

## 環境変数

`.env.example` を参考に `.env.local` を作成します。Firebaseを使わないプロトタイプでは未設定でも動作します。

```bash
NEXT_PUBLIC_FIREBASE_CONFIG='{"apiKey":"","authDomain":"","projectId":"","appId":""}'
```

OpenRouter APIキーはBYOK前提のためサーバー環境変数には保存せず、ブラウザのLocalStorageに保持します。本番でDB保存へ切り替える場合は、Secret ManagerまたはCloud KMSで暗号化してからFirestoreへ保存してください。

## データモデル

```text
users/{uid}
  openrouter_key_encrypted
  profile.name
  profile.bio

novels/{novelId}
  author_id
  title
  settings.concept
  settings.characters
  settings.world_view
  settings.plot
  settings.reference_links
  settings.writing_rules

novels/{novelId}/episodes/{episodeId}
  title
  content
  chat_log
  created_at
  updated_at
```

現状の画面はLocalStorage永続化です。Firestoreへ移す場合は、`lib/firebase.ts` の初期化を使い、`aiwrite:workspace:v2` に保存している作品と話数を `users`、`novels`、`episodes` へ分割して保存します。

## Cloud Run

```bash
gcloud builds submit --tag REGION-docker.pkg.dev/PROJECT_ID/aiwrite/aiwrite:latest
gcloud run deploy aiwrite \
  --image REGION-docker.pkg.dev/PROJECT_ID/aiwrite/aiwrite:latest \
  --region REGION \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars NEXT_PUBLIC_FIREBASE_CONFIG='{"apiKey":"","authDomain":"","projectId":"","appId":""}'
```

## 次に足すべきもの

- Firebase AuthenticationのGoogleログイン
- Firestoreへの作品保存
- OpenRouterモデル一覧の取得
- URLインポート後のAI要約
- 原稿差分を見ながらリテイクを採用するUI
