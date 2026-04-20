function aiwriteApp() {
  return {
    apiKey: localStorage.getItem("aiwrite:openrouter-key") || "",
    model: "openai/gpt-4o-mini",
    phase: "structuring",
    instruction: "",
    importUrl: "",
    importText: "",
    notice: "",
    lastResponse: "",
    settings: {
      title: "新しい作品",
      concept: "",
      characters: "",
      worldView: "",
      plot: "",
      referenceLinks: "",
      writingRules: "",
    },
    persona: {
      name: "藍ライト",
      character: "知的で少し皮肉屋だが、創作には誰よりも熱い。",
      userCall: "監督",
      style: "軽快に読めるが、設定の奥行きがにじむ文体。",
      pointOfView: "三人称一元視点",
      genres: "神話再解釈、ライトノベル、群像劇、現代ファンタジー",
    },
    messages: [],
    currentManuscript: "",

    async generate(mode) {
      this.notice = "生成中...";
      localStorage.setItem("aiwrite:openrouter-key", this.apiKey);
      const payload = {
        apiKey: this.apiKey,
        model: this.model,
        phase: this.phase,
        persona: this.persona,
        settings: this.settings,
        messages: this.messages,
        currentManuscript: this.currentManuscript,
        userInstruction: this.instruction,
        mode,
      };

      const response = await fetch("/api/openrouter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        this.notice = data.error || "生成に失敗しました";
        return;
      }

      this.lastResponse = data.content;
      this.messages.push({ role: "user", content: this.instruction });
      this.messages.push({ role: "assistant", content: data.content });
      this.currentManuscript = data.content;
      this.notice = "生成完了";
    },

    async detectIntent() {
      const response = await fetch("/api/intent-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: this.apiKey, model: this.model, userInstruction: this.instruction }),
      });
      const data = await response.json();
      this.notice = data.isNextEpisode ? "次話意図あり" : "次話意図なし";
    },

    async updateBoard() {
      const response = await fetch("/api/board-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: this.apiKey,
          model: this.model,
          phase: this.phase,
          persona: this.persona,
          settings: this.settings,
          userInstruction: this.instruction,
          assistantResponse: this.lastResponse,
        }),
      });
      const data = await response.json();
      if (response.ok && data.settings) {
        this.settings = { ...this.settings, ...data.settings };
        this.notice = "ボードを更新しました";
      } else {
        this.notice = data.error || "ボード更新に失敗しました";
      }
    },

    async importSettings() {
      const response = await fetch("/api/import-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: this.importUrl, text: this.importText }),
      });
      const data = await response.json();
      if (response.ok) {
        this.importText = data.importedText || "";
        this.notice = "テキストを取り込みました";
      } else {
        this.notice = data.error || "取り込みに失敗しました";
      }
    },
  };
}
