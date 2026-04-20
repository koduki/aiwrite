/* ─── app.js ─── Alpine.js component for aiwrite ─── */
/* eslint-disable no-unused-vars */

const STORAGE_KEY = 'aiwrite:workspace:v2';
const API_KEY_STORAGE_KEY = 'aiwrite:openrouter-key';

/* ─── Phase metadata (mirrors lib/prompts.rb on server) ─── */
const PHASES = [
  {
    id: 'structuring', label: '構造化', role: '編集者兼リサーチャー',
    intent: 'テーマをプロット、世界観、キャラ配置へ変換する',
    placeholder: '神話の名前の奪い合いをテーマに、勢力図、主人公、対立構造、第1章の方向性を作って。',
    starters: ['まず作品コンセプトと勢力図を作って', '主人公、敵対者、裏切り者を配置して', '第1章までのプロット候補を3案出して'],
  },
  {
    id: 'sampling', label: '試し書き', role: 'サンプル脚本家',
    intent: '短い本文を複数出して読み味を確かめる',
    placeholder: 'この設定で、メデューサ初登場のサンプルを3パターン書いて。会話多め、軽いけど奥は重く。',
    starters: ['冒頭サンプルを3パターン書いて', '主要キャラの会話サンプルを出して', 'ラノベ寄りと硬めの文体を比較して'],
  },
  {
    id: 'refining', label: '微調整', role: '共著者兼編集者',
    intent: 'サンプルの違和感を設定仕様へ反映する',
    placeholder: 'サンプルを読むとメデューサはもっと明るくていい。アテナは二重スパイ。ヘカテーは松明で殴る方向で固めて。',
    starters: ['この違和感をキャラ造形に反映して', '採用する文体ルールを固めて', '本稿前のプロット仕様にまとめて'],
  },
  {
    id: 'drafting', label: '本稿', role: 'ゴーストライター',
    intent: '固めた仕様から章単位で本文を書く',
    placeholder: '固めた仕様に従って、第1話を本稿として書いて。ラノベ調で、でも本質は重く。',
    starters: ['第1話を本稿として書いて', '会話多めで、奥に重さが残る本文にして', '直前の本文を踏まえて続きを書いて'],
  },
];

const DEFAULT_PERSONA = {
  name: '藍ライト',
  character: '知的で少し皮肉屋だが、創作には誰よりも熱い。プロとしての厳しい視点と、相棒としての親しみやすさを持つ。',
  userCall: '監督',
  style: '軽快に読めるが、設定の奥行きがにじむ文体。会話はテンポよく、地の文は短く刺す。',
  pointOfView: '三人称一元視点',
  genres: '神話再解釈、ライトノベル、群像劇、現代ファンタジー',
};

const BLANK_SETTINGS = {
  title: '新しい作品', concept: '', worldView: '', plot: '',
  characters: '', referenceLinks: '', writingRules: '',
};

/* ─── Helpers ─── */
function createId() { return crypto.randomUUID(); }

function createInitialEpisode() {
  return { id: createId(), title: '第1話', manuscript: '', chatLog: [], updatedAt: new Date().toISOString() };
}

function createInitialProject() {
  const ep = createInitialEpisode();
  return {
    id: createId(), activePhase: 'structuring',
    persona: { ...DEFAULT_PERSONA }, settings: { ...BLANK_SETTINGS },
    model: 'openai/gpt-4o-mini', episodes: [ep],
    activeEpisodeId: ep.id, updatedAt: new Date().toISOString(),
  };
}

function normalizeProject(value) {
  const base = createInitialProject();
  const episodes = value.episodes?.length ? value.episodes : [createInitialEpisode()];
  const activeEpisodeId = episodes.some(e => e.id === value.activeEpisodeId) ? value.activeEpisodeId : episodes[0].id;
  return {
    ...base, ...value,
    persona: { ...base.persona, ...value.persona },
    settings: { ...base.settings, ...value.settings },
    activePhase: value.activePhase || 'structuring',
    episodes, activeEpisodeId,
  };
}

function normalizeWorkspace(value) {
  const projects = value.projects?.length ? value.projects.map(normalizeProject) : [createInitialProject()];
  const activeProjectId = projects.some(p => p.id === value.activeProjectId) ? value.activeProjectId : projects[0].id;
  return { projects, activeProjectId };
}

function mergeBoardSettings(current, patch) {
  if (!patch) return current;
  return {
    title: patch.title?.trim() || current.title,
    concept: patch.concept?.trim() || current.concept,
    characters: patch.characters?.trim() || current.characters,
    worldView: patch.worldView?.trim() || current.worldView,
    plot: patch.plot?.trim() || current.plot,
    referenceLinks: patch.referenceLinks?.trim() || current.referenceLinks,
    writingRules: patch.writingRules?.trim() || current.writingRules,
  };
}

function extractScene(response) {
  return response.replace(/^```(?:text|markdown)?/i, '').replace(/```$/i, '').trim();
}

function escapeHtml(text) {
  const el = document.createElement('span');
  el.textContent = text;
  return el.innerHTML;
}

/* ─── Alpine.js component ─── */
function aiwriteApp() {
  return {
    /* ── State ── */
    workspace: null,
    apiKey: '',
    instruction: PHASES[0].placeholder,
    importSource: '',
    activeSheet: 'board',
    isLoading: false,
    notice: '',
    phases: PHASES,

    /* ── Lifecycle ── */
    init() {
      const savedWorkspace = localStorage.getItem(STORAGE_KEY);
      const savedKey = localStorage.getItem(API_KEY_STORAGE_KEY);

      if (savedWorkspace) {
        try { this.workspace = normalizeWorkspace(JSON.parse(savedWorkspace)); }
        catch { this.workspace = this._freshWorkspace(); }
      } else {
        this.workspace = this._freshWorkspace();
      }

      if (savedKey) this.apiKey = savedKey;

      // Debounced auto-save on any input/change event
      let timer;
      const debouncedSave = () => { clearTimeout(timer); timer = setTimeout(() => this.save(), 300); };
      this.$el.addEventListener('input', debouncedSave);
      this.$el.addEventListener('change', debouncedSave);
    },

    _freshWorkspace() {
      const p = createInitialProject();
      return { projects: [p], activeProjectId: p.id };
    },

    save() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.workspace));
      if (this.apiKey.trim()) localStorage.setItem(API_KEY_STORAGE_KEY, this.apiKey.trim());
    },

    /* ── Computed (getters) ── */
    get proj() {
      if (!this.workspace) return null;
      return this.workspace.projects.find(p => p.id === this.workspace.activeProjectId) || this.workspace.projects[0];
    },

    get ep() {
      const p = this.proj;
      if (!p) return null;
      return p.episodes.find(e => e.id === p.activeEpisodeId) || p.episodes[0];
    },

    get phase() {
      if (!this.proj) return PHASES[0];
      return PHASES.find(p => p.id === this.proj.activePhase) || PHASES[0];
    },

    get phaseIndex() {
      return PHASES.findIndex(p => p.id === this.phase.id);
    },

    get wordCount() {
      if (!this.ep) return 0;
      return this.ep.manuscript.replace(/\s/g, '').length;
    },

    get nextPhaseLabel() {
      return PHASES[Math.min(this.phaseIndex + 1, PHASES.length - 1)].label;
    },

    /* ── Actions ── */
    switchPhase(phaseId) {
      const ph = PHASES.find(p => p.id === phaseId) || PHASES[0];
      this.proj.activePhase = phaseId;
      this.proj.updatedAt = new Date().toISOString();
      this.instruction = ph.placeholder;
      this.save();
    },

    nextPhase() {
      const i = Math.min(this.phaseIndex + 1, PHASES.length - 1);
      this.switchPhase(PHASES[i].id);
    },

    createProject() {
      const p = createInitialProject();
      p.settings.title = `新しい作品 ${this.workspace.projects.length + 1}`;
      this.workspace.projects.push(p);
      this.workspace.activeProjectId = p.id;
      this.instruction = PHASES[0].placeholder;
      this.activeSheet = 'board';
      this.save();
    },

    createEpisode() {
      const ep = createInitialEpisode();
      ep.title = `第${this.proj.episodes.length + 1}話`;
      this.proj.episodes.push(ep);
      this.proj.activeEpisodeId = ep.id;
      this.proj.updatedAt = new Date().toISOString();
      this.instruction = this.phase.placeholder;
      this.save();
    },

    deleteProject() {
      if (!confirm(`「${this.proj.settings.title || '無題の小説'}」を削除しますか？`)) return;
      const idx = this.workspace.projects.findIndex(p => p.id === this.workspace.activeProjectId);
      this.workspace.projects.splice(idx, 1);
      if (this.workspace.projects.length === 0) {
        const p = createInitialProject();
        p.settings.title = '新しい作品';
        this.workspace.projects.push(p);
      }
      this.workspace.activeProjectId = this.workspace.projects[0].id;
      this.notice = '作品を削除しました。';
      this.save();
    },

    deleteEpisode() {
      if (!confirm(`「${this.ep.title}」を削除しますか？`)) return;
      const p = this.proj;
      const idx = p.episodes.findIndex(e => e.id === p.activeEpisodeId);
      p.episodes.splice(idx, 1);
      if (p.episodes.length === 0) p.episodes.push(createInitialEpisode());
      p.activeEpisodeId = p.episodes[0].id;
      p.updatedAt = new Date().toISOString();
      this.notice = '話数を削除しました。';
      this.save();
    },

    switchProject(id) {
      this.workspace.activeProjectId = id;
      this.save();
    },

    switchEpisode(id) {
      this.proj.activeEpisodeId = id;
      this.save();
    },

    async submitToAi() {
      this.notice = '';
      if (!this.apiKey.trim()) {
        this.notice = 'OpenRouter APIキーを入力してください。キーはこの端末のLocalStorageにだけ保存します。';
        return;
      }
      if (!this.instruction.trim()) { this.notice = 'AIへの依頼を入力してください。'; return; }

      const phaseId = this.proj.activePhase;
      const mode = (phaseId === 'drafting' || phaseId === 'sampling') ? 'scene'
                 : phaseId === 'refining' ? 'retake' : 'chat';

      this.save();
      this.isLoading = true;

      const userMsg = { id: createId(), role: 'user', content: this.instruction.trim(), phase: phaseId, createdAt: new Date().toISOString() };
      this.ep.chatLog.push(userMsg);
      this.ep.updatedAt = new Date().toISOString();

      const snapshot = this.ep.chatLog.map(m => ({ ...m }));

      try {
        const res = await fetch('/api/openrouter', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey: this.apiKey.trim(), model: this.proj.model, phase: phaseId,
            persona: this.proj.persona, settings: this.proj.settings,
            messages: snapshot, currentManuscript: this.ep.manuscript,
            userInstruction: this.instruction.trim(), mode,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.content) throw new Error([data.error, data.detail].filter(Boolean).join('\n') || '生成に失敗しました。');

        const generated = data.content;
        const asstMsg = { id: createId(), role: 'assistant', content: generated, phase: phaseId, createdAt: new Date().toISOString() };

        // Board update (fire & forget)
        let boardPatch = null;
        try {
          const bRes = await fetch('/api/board-update', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              apiKey: this.apiKey.trim(), model: this.proj.model, phase: phaseId,
              persona: this.proj.persona, settings: this.proj.settings,
              userInstruction: this.instruction.trim(), assistantResponse: generated,
            }),
          });
          if (bRes.ok) { boardPatch = (await bRes.json()).settings; }
        } catch { /* ignore */ }

        this.ep.chatLog.push(asstMsg);

        if (phaseId === 'drafting') {
          const extracted = extractScene(generated);
          this.ep.manuscript = [this.ep.manuscript, extracted].filter(Boolean).join('\n\n');
        }

        if (boardPatch) Object.assign(this.proj.settings, mergeBoardSettings(this.proj.settings, boardPatch));

        this.ep.updatedAt = new Date().toISOString();
        this.proj.updatedAt = new Date().toISOString();
        this.instruction = this.phase.starters[2] || this.phase.placeholder;
      } catch (err) {
        this.notice = err instanceof Error ? err.message : '生成に失敗しました。';
      } finally {
        this.isLoading = false;
        this.save();
      }
    },

    async importSettings() {
      this.notice = '';
      if (!this.importSource.trim()) { this.notice = '設定テキストまたはURLを入力してください。'; return; }
      this.isLoading = true;
      try {
        const isUrl = /^https?:\/\//i.test(this.importSource.trim());
        const res = await fetch('/api/import-settings', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(isUrl ? { url: this.importSource.trim() } : { text: this.importSource.trim() }),
        });
        const data = await res.json();
        if (!res.ok || !data.importedText) throw new Error(data.error || '設定を読み込めませんでした。');
        const cur = this.proj.settings.referenceLinks;
        this.proj.settings.referenceLinks = [cur, data.importedText].filter(Boolean).join('\n\n');
        this.importSource = '';
        this.notice = '設定を参照リンク・素材メモへ追加しました。';
      } catch (err) {
        this.notice = err instanceof Error ? err.message : '設定を読み込めませんでした。';
      } finally {
        this.isLoading = false;
        this.save();
      }
    },

    /* ── View helpers ── */
    phaseLabel(phaseId) {
      const p = PHASES.find(ph => ph.id === phaseId);
      return p ? p.label : '';
    },

    fmt(text) {
      if (!text) return '';
      return text.split('\n').map(line => `<p>${escapeHtml(line) || '\u00a0'}</p>`).join('');
    },
  };
}
