# frozen_string_literal: true

require "json"
require "sinatra/base"
require "open-uri"
require_relative "lib/aiwrite/prompt_builder"
require_relative "lib/aiwrite/validators"
require_relative "lib/aiwrite/url_guard"
require_relative "lib/aiwrite/ruby_llm_client"

class AiwriteApp < Sinatra::Base
  set :root, File.dirname(__FILE__)
  set :public_folder, File.join(root, "public")
  set :views, File.join(root, "views")

  before do
    content_type :json if request.path.start_with?("/api/")
  end

  get "/" do
    content_type :html
    erb :index
  end

  post "/api/openrouter" do
    payload = parse_json_body!
    validation = Aiwrite::Validators.validate_openrouter_payload(payload)
    halt_json 400, { error: validation[:error] } unless validation[:ok]

    messages = Aiwrite::PromptBuilder.build_openrouter_messages(payload)
    content = llm_client.chat_completion(
      api_key: payload["apiKey"],
      model: payload["model"],
      messages: messages,
      temperature: 0.85
    )

    json_response content: content
  rescue JSON::ParserError
    halt_json 400, { error: "JSONを読み取れませんでした。" }
  rescue StandardError => e
    halt_json 502, { error: e.message }
  end

  post "/api/intent-check" do
    payload = parse_json_body!
    api_key = payload["apiKey"].to_s
    user_instruction = payload["userInstruction"].to_s
    model = payload["model"].to_s.empty? ? "openai/gpt-4o-mini" : payload["model"]

    halt_json 400, { error: "OpenRouter APIキーを入力してください。" } if api_key.strip.empty?
    return json_response(isNextEpisode: false) if user_instruction.strip.empty?

    system_prompt = [
      "あなたはユーザーの指示の意図を分類するアシスタントです。",
      "ユーザーの入力が『次の話を書いて』『続きを書いて』『次の章へ進もう』など、新しいエピソードへの移行を求めるか判定してください。",
      "単なる描写追加や設定相談なら false にしてください。",
      "出力はJSONのみ: {\"isNextEpisode\": true} または {\"isNextEpisode\": false}"
    ].join("\n")

    content = llm_client.chat_completion(
      api_key: api_key,
      model: model,
      messages: [
        { role: "system", content: system_prompt },
        { role: "user", content: user_instruction }
      ],
      temperature: 0.1,
      json_response: true
    )

    clean = content.sub(/^```(?:json)?/i, "").sub(/```$/, "").strip
    parsed = JSON.parse(clean)
    json_response isNextEpisode: !!parsed["isNextEpisode"]
  rescue JSON::ParserError
    json_response isNextEpisode: false
  rescue StandardError
    json_response isNextEpisode: false
  end

  post "/api/board-update" do
    payload = parse_json_body!
    validation = Aiwrite::Validators.validate_board_update_payload(payload)
    halt_json 400, { error: validation[:error] } unless validation[:ok]

    messages = Aiwrite::PromptBuilder.build_board_update_messages(payload)
    content = llm_client.chat_completion(
      api_key: payload["apiKey"],
      model: payload["model"],
      messages: messages,
      temperature: 0.2,
      json_response: true
    )

    settings = Aiwrite::PromptBuilder.parse_board_update(content)
    json_response settings: settings
  rescue JSON::ParserError
    halt_json 502, { error: "ボード更新JSONを解析できませんでした。" }
  rescue StandardError => e
    halt_json 502, { error: e.message }
  end

  post "/api/import-settings" do
    payload = parse_json_body!
    url = payload["url"].to_s
    text = payload["text"].to_s

    unless text.strip.empty?
      return json_response importedText: text.strip[0, 6000]
    end

    halt_json 400, { error: "URLまたはテキストを入力してください。" } if url.strip.empty?

    uri = URI.parse(url)
    halt_json 400, { error: "httpまたはhttpsのURLのみ読み込めます。" } unless %w[http https].include?(uri.scheme)
    halt_json 403, { error: "内部ネットワークへのアクセスは許可されていません。" } if Aiwrite::UrlGuard.blocked_host?(uri.host)

    body, content_type = fetch_remote_text(uri)
    imported_text = if content_type.include?("text/html")
                      extract_readable_text(body)
                    else
                      body.to_s[0, 6000]
                    end

    json_response importedText: imported_text
  rescue URI::InvalidURIError
    halt_json 400, { error: "URLの形式が正しくありません。" }
  rescue JSON::ParserError
    halt_json 400, { error: "JSONを読み取れませんでした。" }
  rescue StandardError => e
    halt_json 502, { error: "URLを読み込めませんでした: #{e.message}" }
  end

  helpers do
    def llm_client
      @llm_client ||= Aiwrite::RubyLlmClient.new
    end

    def parse_json_body!
      JSON.parse(request.body.read)
    end

    def json_response(hash)
      JSON.generate(hash)
    end

    def halt_json(status, hash)
      halt status, JSON.generate(hash)
    end

    def fetch_remote_text(uri)
      response_body = nil
      content_type = ""

      URI.open(uri.to_s, "User-Agent" => "aiwrite-settings-importer/0.1", read_timeout: 10, redirect: false) do |f|
        raise "レスポンスが大きすぎます。" if f.meta["content-length"].to_i > 1_000_000

        response_body = f.read(1_000_001)
        raise "レスポンスが大きすぎます。" if response_body.bytesize > 1_000_000

        content_type = f.content_type.to_s
      end

      [response_body, content_type]
    end

    def extract_readable_text(html)
      html
        .gsub(/<script[\s\S]*?<\/script>/i, " ")
        .gsub(/<style[\s\S]*?<\/style>/i, " ")
        .gsub(/<[^>]+>/, " ")
        .gsub("&nbsp;", " ")
        .gsub("&amp;", "&")
        .gsub("&lt;", "<")
        .gsub("&gt;", ">")
        .gsub(/\s+/, " ")
        .strip[0, 6000]
    end
  end
end

AiwriteApp.run! if $PROGRAM_NAME == __FILE__
