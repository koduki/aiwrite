# frozen_string_literal: true

module Aiwrite
  module PromptBuilder
    PHASES = {
      "structuring" => {
        guide: "フェーズ1: 構造化。あなたはリサーチもできる編集者です。ユーザーのテーマを、作品コンセプト、勢力図、キャラクター、歴史、制度、対立構造、プロット候補へ変換してください。必要な知識背景は短く補い、抽象論で終わらせず作品で使える型に落としてください。",
        instruction: "構造化として答えてください。テーマを作品コンセプト、対立構造、プロット、世界観、キャラ配置へ変換してください。必要な知識背景も短く補ってください。"
      },
      "sampling" => {
        guide: "フェーズ2: サンプル執筆。あなたは試し書きに強い脚本家です。固まりきっていない設定をもとに、複数の短いサンプル本文、会話、冒頭、キャラ初登場案を出してください。完成度より、読み味、キャラの声、作品の温度を検証することを優先してください。",
        instruction: "サンプル執筆として答えてください。短い本文サンプルを複数出し、読み味、キャラの声、テンポを比較できるようにしてください。"
      },
      "refining" => {
        guide: "フェーズ3: 微調整と固定。あなたは共著者兼編集者です。サンプルを読んだユーザーの違和感、好み、悪ノリ、キャラ解釈を最優先し、プロット、世界観、キャラ造形、文体ルールを本稿前の仕様として固めてください。",
        instruction: "微調整と固定として答えてください。サンプルへの反応をもとに、プロット、世界観、キャラ造形、文体ルールを本稿用に固めてください。"
      },
      "drafting" => {
        guide: "フェーズ4: 本格執筆。あなたはゴーストライターです。固定されたプロット、世界観、キャラ造形、文体ルールを踏まえ、章や話単位で読める本文を書いてください。説明より本文を優先し、軽快な読み味の奥に重い本質が残るようにしてください。",
        instruction: "本格執筆として答えてください。固定済みの設定を反映し、すぐ読める小説本文を中心に出してください。"
      }
    }.freeze

    MODE_INSTRUCTIONS = {
      "chat" => "相談への返答を優先してください。",
      "scene" => "小説本文を優先してください。",
      "retake" => "既存原稿を踏まえ、修正後の本文または設定案を優先してください。"
    }.freeze

    SYSTEM_PROMPT_HEADER = [
      "あなたは小説執筆に伴走するAI作家です。",
      "ユーザーは監督兼プロデューサーです。あなたはリサーチャー、編集者、共著者、ゴーストライターをフェーズごとに切り替える脚本家チームです。",
      "ユーザーの主体性を尊重し、設定の矛盾や弱点は短く指摘しつつ、次のラリーにつながる具体案を返してください。"
    ].join("\n")

    BOARD_UPDATE_SYSTEM_PROMPT = [
      "あなたは小説制作ボードを更新する編集アシスタントです。",
      "ユーザーとAIの最新の会話から、作品の現在設定として採用すべき内容を抽出し、既存のボードへ統合してください。",
      "特にコンセプト、キャラクター設定、世界観、プロット、勢力図、文体判断に影響する内容を反映してください。",
      "会話内の単なる候補、却下された案、本文だけの一時表現は、採用が明確でない限り固定設定にしないでください。",
      "既存設定を破壊せず、矛盾する場合は最新のユーザー指示を優先して自然に更新してください。",
      "出力はJSONのみ。Markdownや説明文は禁止です。",
      "",
      "JSON形式:",
      '{"title":"...","concept":"...","characters":"...","worldView":"...","plot":"...","referenceLinks":"...","writingRules":"..."}'
    ].join("\n")

    module_function

    def build_system_prompt(persona:, settings:, phase:)
      phase_meta = PHASES[phase] || {}

      [
        SYSTEM_PROMPT_HEADER,
        phase_meta[:guide].to_s,
        "",
        "AIのキャラクター・トーク: #{persona["character"].to_s.strip.empty? ? "知的で協力的、創作に熱心なAIアシスタント" : persona["character"]}",
        "ユーザーの呼び方: #{persona["userCall"].to_s.strip.empty? ? "ユーザー" : persona["userCall"]}",
        "作家名: #{persona["name"].to_s.strip.empty? ? "無名のAI作家" : persona["name"]}",
        "執筆する文体: #{persona["style"].to_s.strip.empty? ? "読みやすく、情景と感情を両立する" : persona["style"]}",
        "執筆する視点: #{persona["pointOfView"].to_s.strip.empty? ? "三人称またはユーザー指定に従う" : persona["pointOfView"]}",
        "執筆の得意ジャンル: #{persona["genres"].to_s.strip.empty? ? "青春、恋愛、ファンタジー、現代ドラマ" : persona["genres"]}",
        "",
        "作品タイトル: #{settings["title"].to_s.strip.empty? ? "未定" : settings["title"]}",
        "コンセプト: #{settings["concept"].to_s.strip.empty? ? "未設定" : settings["concept"]}",
        "世界観: #{settings["worldView"].to_s.strip.empty? ? "未設定" : settings["worldView"]}",
        "プロット: #{settings["plot"].to_s.strip.empty? ? "未設定" : settings["plot"]}",
        "キャラクター設定: #{settings["characters"].to_s.strip.empty? ? "未設定" : settings["characters"]}",
        "参照リンクやメモ: #{settings["referenceLinks"].to_s.strip.empty? ? "なし" : settings["referenceLinks"]}",
        "文体・本稿ルール: #{settings["writingRules"].to_s.strip.empty? ? "未設定" : settings["writingRules"]}"
      ].join("\n")
    end

    def build_openrouter_messages(payload)
      recent_messages = Array(payload["messages"]).last(10).map do |message|
        { role: message["role"], content: message["content"] }
      end

      phase_meta = PHASES[payload["phase"]] || {}
      mode_instruction = MODE_INSTRUCTIONS[payload["mode"]] || MODE_INSTRUCTIONS["chat"]

      [
        { role: "system", content: build_system_prompt(persona: payload["persona"], settings: payload["settings"], phase: payload["phase"]) },
        *recent_messages,
        {
          role: "user",
          content: [
            phase_meta[:instruction].to_s,
            mode_instruction,
            "",
            "現在の原稿:",
            payload["currentManuscript"].to_s.strip.empty? ? "まだ本文はありません。" : payload["currentManuscript"],
            "",
            "ユーザー依頼:",
            payload["userInstruction"].to_s
          ].join("\n")
        }
      ]
    end

    def build_board_update_messages(payload)
      [
        { role: "system", content: BOARD_UPDATE_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            "現在フェーズ: #{payload["phase"]}",
            "",
            "AI作家ペルソナ:",
            "#{payload.dig("persona", "name")}: #{payload.dig("persona", "style")}",
            "",
            "現在のボード:",
            "タイトル: #{payload.dig("settings", "title")}",
            "",
            "コンセプト:",
            payload.dig("settings", "concept").to_s.strip.empty? ? "未設定" : payload.dig("settings", "concept"),
            "",
            "キャラクター設定:",
            payload.dig("settings", "characters").to_s.strip.empty? ? "未設定" : payload.dig("settings", "characters"),
            "",
            "世界観・ルール:",
            payload.dig("settings", "worldView").to_s.strip.empty? ? "未設定" : payload.dig("settings", "worldView"),
            "",
            "プロット:",
            payload.dig("settings", "plot").to_s.strip.empty? ? "未設定" : payload.dig("settings", "plot"),
            "",
            "参照リンク・素材メモ:",
            payload.dig("settings", "referenceLinks").to_s.strip.empty? ? "なし" : payload.dig("settings", "referenceLinks"),
            "",
            "文体・本稿ルール:",
            payload.dig("settings", "writingRules").to_s.strip.empty? ? "未設定" : payload.dig("settings", "writingRules"),
            "",
            "最新のユーザー発言:",
            payload["userInstruction"].to_s,
            "",
            "最新のAI応答:",
            payload["assistantResponse"].to_s,
            "",
            "上記を反映した最新ボードをJSONだけで返してください。"
          ].join("\n")
        }
      ]
    end

    def parse_board_update(raw)
      text = raw.to_s.strip
      json_text = text.start_with?("{") ? text : text[/\{[\s\S]*\}/] || "{}"
      parsed = JSON.parse(json_text)

      {
        "title" => normalize_nullable_text(parsed["title"]),
        "concept" => normalize_nullable_text(parsed["concept"]),
        "characters" => normalize_nullable_text(parsed["characters"]),
        "worldView" => normalize_nullable_text(parsed["worldView"]),
        "plot" => normalize_nullable_text(parsed["plot"]),
        "referenceLinks" => normalize_nullable_text(parsed["referenceLinks"]),
        "writingRules" => normalize_nullable_text(parsed["writingRules"])
      }.compact
    end

    def normalize_nullable_text(value)
      return nil unless value.is_a?(String)

      trimmed = value.strip
      trimmed.empty? ? nil : trimmed
    end
  end
end
