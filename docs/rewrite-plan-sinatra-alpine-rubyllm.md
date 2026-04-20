# Next.js版「アイライト」を Sinatra + Alpine.js + RubyLLM へ移行する計画

## 1. 目的と前提

- 既存の Next.js 実装（UI/API/ローカル保存設計）を、**Sinatra（バックエンド）** + **Alpine.js（フロント）** + **RubyLLM（LLM連携）** で再実装する。
- 現行の価値（BYOK、ローカル保存中心、創作ボード駆動の執筆体験）を保ちながら、技術スタックを Ruby 中心に置き換える。
- まずは機能同等（MVP parity）を優先し、UIの高級化は後段で行う。

## 2. スコープ

### 2.1 移行対象（今回）

1. 画面
   - メイン画面（設定入力、会話・生成、ボード更新の基本導線）
2. API 相当
   - `openrouter` 呼び出し
   - `intent-check`
   - `board-update`
   - `import-settings`
3. データ
   - LocalStorage に保持している各種設定・作品情報の互換性維持（可能な範囲）
4. プロンプト
   - 既存 `lib/prompts.ts` の責務を Ruby 側へ移植

### 2.2 非対象（後続）

- デザインの全面刷新
- サーバーDB導入
- マルチユーザー認証
- OpenRouter 以外の複数プロバイダ同時対応

## 3. 全体アーキテクチャ（移行後）

- **Sinatra**: ルーティング、API エンドポイント、プロンプト組み立て、RubyLLM 呼び出し
- **RubyLLM**: OpenRouter へのモデル実行抽象
- **Alpine.js**: 画面状態管理（軽量なリアクティブUI）
- **ERB + Tailwind(既存CSS資産の再利用検討)**: 画面テンプレート
- **LocalStorage**: 既存同様、ユーザー作品・設定・APIキー（BYOK）をブラウザ保持

## 4. 実装フェーズ

### Phase 0: 設計確定

- 既存 API/データ構造/画面イベントを棚卸し
- 既存 JSON スキーマ（実質仕様）を Ruby 側 DTO/バリデーションへ対応付け
- ルート設計（`GET /`, `POST /api/...`）を決定

**成果物**
- ルート一覧
- データ構造マッピング表
- プロンプト責務分解メモ

### Phase 1: Sinatra 骨組み

- `config.ru` / `app.rb` / `views` / `public` の雛形作成
- ヘルスチェックとトップページ表示
- 共通エラーハンドリング（JSONエラー形式）

**完了条件**
- サーバー起動、トップページ表示、JSON APIの雛形応答

### Phase 2: RubyLLM 統合（OpenRouter）

- RubyLLM 経由で OpenRouter モデルを呼び出すサービス層を作成
- APIキー取り扱い方針を確定（クライアント送信 or セッション一時保持）
- タイムアウト、再試行、モデル未指定時のフォールバック実装

**完了条件**
- 単体の `POST /api/openrouter` でテキスト生成が可能

### Phase 3: API エンドポイント移植

- `intent-check` 実装
- `board-update` 実装
- `import-settings` 実装
- 既存と同等の入力バリデーション・エラー応答へ調整

**完了条件**
- 現行フロントからの主要ユースケースが API レベルで通る

### Phase 4: Alpine.js フロント実装

- 既存 `app/page.tsx` の機能を ERB + Alpine コンポーネントに再構成
- 状態管理（会話履歴、設定、生成中フラグ、エラー）を `x-data` で整理
- LocalStorage 永続化ロジックを移植

**完了条件**
- 主要操作（設定、生成、保存、再読込）がブラウザ上で完結

### Phase 5: 互換性・品質

- 既存データの読み込み互換（キー名/JSON構造）テスト
- E2E 的シナリオ（初期設定→試し書き→本稿→ボード更新）確認
- 例外ケース（APIキー欠落、レート制限、モデルエラー）確認

**完了条件**
- 現行主要導線と同等以上の操作性を確認

## 5. ディレクトリ案

```text
aiwrite-ruby/
  app.rb
  config.ru
  Gemfile
  lib/
    aiwrite/
      openrouter_client.rb
      prompt_builder.rb
      validators.rb
      serializers.rb
  views/
    layout.erb
    index.erb
  public/
    app.js        # Alpine.js 初期化・状態管理
    app.css
  spec/
    api/
    unit/
```

> 既存リポジトリ内で段階移行する場合は、`ruby_app/` サブディレクトリとして並行配置し、機能完成後に切替する。

## 6. 技術選定メモ

- **Sinatra**: 小規模・中規模 API/UI 一体構成に適し、移植コストが低い
- **Alpine.js**: Next.js ほどの複雑性を持たず、フォーム中心 UI と相性が良い
- **RubyLLM**: OpenRouter 呼び出し抽象化と今後のモデル差し替え容易性

## 6.1 バージョン方針（追記）

- **Ruby は 4 系の最新安定版**を採用する（例: `ruby 4.x.y` の最新パッチ）。
- Sinatra / Puma / RubyLLM / Rack / RSpec など主要ライブラリも、**Ruby 4 系に正式対応した最新安定版**へ揃える。
- Alpine.js も最新安定版を採用し、ブラウザ互換性要件（主要モダンブラウザ）を満たす。
- バージョン固定は `Gemfile.lock` とフロント依存管理（必要時）で行い、再現可能ビルドを担保する。
- 依存更新ポリシー: メジャー更新は互換性検証（APIレスポンス・LocalStorage互換）を通過してから反映する。

**Phase 0 の追加成果物**
- Ruby 4 系前提の依存関係マトリクス（採用バージョン、最小要件、代替候補）
- ランタイム検証手順（`ruby -v`, `bundle exec` の実行確認、主要API疎通）

## 7. リスクと対策

1. RubyLLM と OpenRouter の機能差
   - 対策: 先に最小リクエストを検証し、未対応機能は直接HTTPフォールバックを許容
2. LocalStorage 互換崩れ
   - 対策: 既存キーを変更しない。移行関数（旧→新）を実装
3. UI 操作感の劣化
   - 対策: 先に主要導線の操作時間を計測し、遅延箇所を最適化
4. Ruby 4 系での依存非互換
   - 対策: Phase 0で互換性マトリクスを作成し、互換未確定ライブラリは代替候補を準備

## 8. 受け入れ基準（Done）

- 既存の主要ユースケースが Sinatra + Alpine.js 構成で再現できる
- OpenRouter 生成が RubyLLM 経由で動作する
- BYOK + LocalStorage 中心設計を維持できる
- 主要 API の入出力が既存仕様と同等である
- README に起動方法・環境変数・運用手順が更新されている

## 9. 作業順（実行時）

1. Sinatra プロジェクト骨組み追加
2. RubyLLM 接続確認（疎通テスト）
3. API 4本を順次移植
4. Alpine.js UI 実装
5. 互換性テスト + ドキュメント更新

## 10. 承認ポイント

以下の点をご承認ください（修正歓迎）。

- この計画で **Phase 0→5** の順に進めること
- まずは **機能同等優先**（デザイン刷新は後回し）とすること
- 実装場所を既存リポジトリ配下の `ruby_app/`（並行配置）とすること
- Ruby 4 系最新 + 主要ライブラリ最新安定版（Ruby 4 対応済み）で固定すること
