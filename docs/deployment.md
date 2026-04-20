# デプロイ

## 前提

本アプリはCloud RunへRubyベースのDockerコンテナとしてデプロイする想定。

## Docker

`Dockerfile` は `ruby:4.0-alpine` をベースとし、Pumaサーバーを起動する。

Cloud Runでは `PORT=8080` を使う。

## ローカル起動

```bash
bundle install
bundle exec puma
```

## 本番ビルド確認

Sinatraアプリのためコンパイルステップは不要。
依存関係が正しく解決され、Pumaが起動することを確認する。

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
