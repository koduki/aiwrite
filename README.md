# アイライト - 私好みの小説を書いてもらうハイパーノベル

アイライトは、AIとI（私）の二人のアイが一緒に小説を書くためのツールです。ChatGPTのように対話を進めながら、作家AIに執筆を依頼して小説を書いてもらいます。

基本的には、まず初期コンセプトやキャラクターや世界観を一緒に決め、そこからサンプルを書いて設定や書き味のすり合わせをした上で、本稿を書いてもらいます。あなたが見たい「こんなシーンを見たい！」という願望をAIに伝えて、そのエピソードを書いてもらっちゃいましょう！

## 技術スタック

- **バックエンド**: Ruby 3.4 + Sinatra 4.2 + Puma
- **ライブラリ**: RubyLLM (LLM 抽象化レイヤー)
- **フロントエンド**: Vanilla HTML + Alpine.js 3.x
- **AI API**: OpenRouter（BYOK: Bring Your Own Key）

## アーキテクチャ

現在はAIはOpenRouterのみに対応しており、利用にはユーザー自身のAPIキーが必要です（BYOK）。APIキーや、作成した作品・話数・創作ボードなどの情報はすべてブラウザのLocalStorage（ローカルストレージ）に保存されます。

サーバーサイドのデータベース機能を持たない完全なスタンドアローン設計となっているため、ユーザーの作品データやAPIキーがサーバーに送信・蓄積されることはありません。

## 詳細ドキュメント

- [サービス仕様](./docs/service-spec.md)
- [UX仕様](./docs/ux-spec.md)
- [アーキテクチャ](./docs/architecture.md)
- [データ構造](./docs/data-model.md)
- [API仕様](./docs/api-spec.md)
- [プロンプト設計](./docs/prompt-design.md)
- [デプロイ](./docs/deployment.md)
- [今後の拡張](./docs/roadmap.md)

## 起動

```bash
bundle install
bundle exec puma
```

http://localhost:9292 を開きます。

## 環境変数

環境変数は基本的に不要です。
OpenRouter APIキーはBYOK前提のためサーバー側には保存せず、ブラウザのLocalStorageにのみ保持します。

## Cloud Run

```bash
gcloud builds submit --tag REGION-docker.pkg.dev/PROJECT_ID/aiwrite/aiwrite:latest
gcloud run deploy aiwrite \
  --image REGION-docker.pkg.dev/PROJECT_ID/aiwrite/aiwrite:latest \
  --region REGION \
  --platform managed \
  --allow-unauthenticated
```
