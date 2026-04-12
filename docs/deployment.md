# デプロイ

## 前提

本アプリはCloud RunへNext.js standalone出力をDockerコンテナとしてデプロイする想定。

## Docker

`Dockerfile` は以下の3段構成。

1. `deps`: npm依存関係のインストール
2. `builder`: `next build`
3. `runner`: `.next/standalone` を起動

Cloud Runでは `PORT=8080` を使う。

## ローカル起動

```bash
npm install
npm run dev
```

## 本番ビルド確認

```bash
npm run typecheck
npm run build
```

## Cloud Runデプロイ例

```bash
gcloud builds submit --tag REGION-docker.pkg.dev/PROJECT_ID/aiwrite/aiwrite:latest

gcloud run deploy aiwrite \
  --image REGION-docker.pkg.dev/PROJECT_ID/aiwrite/aiwrite:latest \
  --region REGION \
  --platform managed \
  --allow-unauthenticated
```

## 環境変数

OpenRouter APIキーはBYOKのためサーバー環境変数には保存しない。
