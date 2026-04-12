"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type {
  AiwriteEpisode,
  AiwriteProject,
  AiwriteWorkspace,
  ChatMessage,
  NarrativePhase,
  NovelSettings,
  Persona,
} from "@/lib/types";

const STORAGE_KEY = "aiwrite:workspace:v2";
const API_KEY_STORAGE_KEY = "aiwrite:openrouter-key";

import {
  BLANK_SETTINGS as blankSettings,
  DEFAULT_PERSONA as defaultPersona,
  PHASE_METADATA as phases,
} from "@/lib/prompts";

const initialEpisode: AiwriteEpisode = {
  id: "episode-1",
  title: "第1話",
  manuscript: "",
  chatLog: [],
  updatedAt: new Date().toISOString(),
};

const initialProject: AiwriteProject = {
  id: "project-1",
  activePhase: "structuring",
  persona: defaultPersona,
  settings: blankSettings,
  model: "openai/gpt-4o-mini",
  episodes: [initialEpisode],
  activeEpisodeId: initialEpisode.id,
  updatedAt: new Date().toISOString(),
};

const initialWorkspace: AiwriteWorkspace = {
  projects: [initialProject],
  activeProjectId: initialProject.id,
};

function createMessage(role: ChatMessage["role"], content: string, phase: NarrativePhase): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    phase,
    createdAt: new Date().toISOString(),
  };
}

function extractScene(response: string) {
  return response
    .replace(/^```(?:text|markdown)?/i, "")
    .replace(/```$/i, "")
    .trim();
}

function normalizeProject(value: AiwriteProject): AiwriteProject {
  const episodes = value.episodes?.length ? value.episodes : [initialEpisode];
  const activeEpisodeId = episodes.some((episode) => episode.id === value.activeEpisodeId)
    ? value.activeEpisodeId
    : episodes[0].id;

  return {
    ...initialProject,
    ...value,
    persona: { ...initialProject.persona, ...value.persona },
    settings: {
      ...initialProject.settings,
      ...value.settings,
    },
    activePhase: value.activePhase || "structuring",
    episodes,
    activeEpisodeId,
  };
}

function normalizeWorkspace(value: AiwriteWorkspace): AiwriteWorkspace {
  const projects = value.projects?.length ? value.projects.map((project) => normalizeProject(project)) : [initialProject];
  const activeProjectId = projects.some((project) => project.id === value.activeProjectId)
    ? value.activeProjectId
    : projects[0].id;

  return { projects, activeProjectId };
}

function mergeBoardSettings(current: NovelSettings, patch?: Partial<NovelSettings>): NovelSettings {
  if (!patch) {
    return current;
  }

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

export default function Home() {
  const [workspace, setWorkspace] = useState<AiwriteWorkspace>(initialWorkspace);
  const [apiKey, setApiKey] = useState("");
  const [instruction, setInstruction] = useState(phases[0].placeholder);
  const [importSource, setImportSource] = useState("");
  const [activeSheet, setActiveSheet] = useState<"board" | "manuscript" | "settings" | "none">("board");
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState("");

  const activeProject = workspace.projects.find((project) => project.id === workspace.activeProjectId) || workspace.projects[0];
  const activeEpisode =
    activeProject.episodes.find((episode) => episode.id === activeProject.activeEpisodeId) || activeProject.episodes[0];
  const activePhase = phases.find((phase) => phase.id === activeProject.activePhase) || phases[0];
  const activePhaseIndex = phases.findIndex((phase) => phase.id === activePhase.id);

  useEffect(() => {
    const savedWorkspace = localStorage.getItem(STORAGE_KEY);
    const savedKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (savedWorkspace) {
      setWorkspace(normalizeWorkspace(JSON.parse(savedWorkspace) as AiwriteWorkspace));
    }
    if (savedKey) {
      setApiKey(savedKey);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
  }, [workspace]);

  useEffect(() => {
    if (apiKey.trim()) {
      localStorage.setItem(API_KEY_STORAGE_KEY, apiKey.trim());
    }
  }, [apiKey]);

  const wordCount = useMemo(() => activeEpisode.manuscript.replace(/\s/g, "").length, [activeEpisode.manuscript]);

  function updateActiveProject(updater: (project: AiwriteProject) => AiwriteProject) {
    setWorkspace((current) => ({
      ...current,
      projects: current.projects.map((project) =>
        project.id === current.activeProjectId ? updater(project) : project,
      ),
    }));
  }

  function updateActiveEpisode(updater: (episode: AiwriteEpisode) => AiwriteEpisode) {
    updateActiveProject((project) => ({
      ...project,
      episodes: project.episodes.map((episode) =>
        episode.id === project.activeEpisodeId ? updater(episode) : episode,
      ),
      updatedAt: new Date().toISOString(),
    }));
  }

  function updatePersona(field: keyof Persona, value: string) {
    updateActiveProject((current) => ({
      ...current,
      persona: { ...current.persona, [field]: value },
      updatedAt: new Date().toISOString(),
    }));
  }

  function updateSettings(field: keyof NovelSettings, value: string) {
    updateActiveProject((current) => ({
      ...current,
      settings: { ...current.settings, [field]: value },
      updatedAt: new Date().toISOString(),
    }));
  }

  function switchPhase(phase: NarrativePhase) {
    const nextPhase = phases.find((item) => item.id === phase) || phases[0];
    updateActiveProject((current) => ({ ...current, activePhase: phase, updatedAt: new Date().toISOString() }));
    setInstruction(nextPhase.placeholder);
  }

  function createProject() {
    const now = new Date().toISOString();
    const projectId = crypto.randomUUID();
    const episodeId = crypto.randomUUID();
    const nextProject: AiwriteProject = {
      ...initialProject,
      id: projectId,
      activeEpisodeId: episodeId,
      settings: { ...blankSettings, title: `新しい作品 ${workspace.projects.length + 1}` },
      episodes: [{ ...initialEpisode, id: episodeId, title: "第1話", updatedAt: now }],
      updatedAt: now,
    };

    setWorkspace((current) => ({
      projects: [...current.projects, nextProject],
      activeProjectId: projectId,
    }));
    setInstruction(phases[0].placeholder);
    setActiveSheet("board");
  }

  function createEpisode() {
    const now = new Date().toISOString();
    const episode: AiwriteEpisode = {
      id: crypto.randomUUID(),
      title: `第${activeProject.episodes.length + 1}話`,
      manuscript: "",
      chatLog: [],
      updatedAt: now,
    };

    updateActiveProject((project) => ({
      ...project,
      episodes: [...project.episodes, episode],
      activeEpisodeId: episode.id,
      updatedAt: now,
    }));
    setInstruction(activePhase.placeholder);
  }

  function switchProject(projectId: string) {
    setWorkspace((current) => ({ ...current, activeProjectId: projectId }));
  }

  function switchEpisode(episodeId: string) {
    updateActiveProject((project) => ({ ...project, activeEpisodeId: episodeId }));
  }

  function deleteProject() {
    if (!confirm(`「${activeProject.settings.title || "無題の小説"}」を削除しますか？`)) {
      return;
    }

    setWorkspace((current) => {
      const projects = current.projects.filter((project) => project.id !== current.activeProjectId);
      if (projects.length === 0) {
        const now = new Date().toISOString();
        const newEpisodeId = crypto.randomUUID();
        const newProject: AiwriteProject = {
          ...initialProject,
          id: crypto.randomUUID(),
          activeEpisodeId: newEpisodeId,
          settings: { ...blankSettings, title: "新しい作品" },
          episodes: [{ ...initialEpisode, id: newEpisodeId, updatedAt: now }],
          updatedAt: now,
        };
        return { projects: [newProject], activeProjectId: newProject.id };
      }
      return { projects, activeProjectId: projects[0].id };
    });
    setNotice("作品を削除しました。");
  }

  function deleteEpisode() {
    if (!confirm(`「${activeEpisode.title}」を削除しますか？`)) {
      return;
    }

    updateActiveProject((project) => {
      const episodes = project.episodes.filter((episode) => episode.id !== project.activeEpisodeId);
      if (episodes.length === 0) {
        const newEpisode: AiwriteEpisode = {
          id: crypto.randomUUID(),
          title: "第1話",
          manuscript: "",
          chatLog: [],
          updatedAt: new Date().toISOString(),
        };
        return {
          ...project,
          episodes: [newEpisode],
          activeEpisodeId: newEpisode.id,
          updatedAt: new Date().toISOString(),
        };
      }
      return {
        ...project,
        episodes,
        activeEpisodeId: episodes[0].id,
        updatedAt: new Date().toISOString(),
      };
    });
    setNotice("話数を削除しました。");
  }

  async function submitToAi(event: FormEvent) {
    event.preventDefault();
    setNotice("");

    if (!apiKey.trim()) {
      setNotice("OpenRouter APIキーを入力してください。キーはこの端末のLocalStorageにだけ保存します。");
      return;
    }

    if (!instruction.trim()) {
      setNotice("AIへの依頼を入力してください。");
      return;
    }

    const phase = activeProject.activePhase;
    const requestMode = phase === "drafting" || phase === "sampling" ? "scene" : phase === "refining" ? "retake" : "chat";

    localStorage.setItem(API_KEY_STORAGE_KEY, apiKey.trim());
    setIsLoading(true);

    try {
      let targetEpisodeId = activeEpisode.id;
      let targetChatLog = activeEpisode.chatLog;
      let targetManuscript = activeEpisode.manuscript;

      if (phase === "drafting") {
        // 「続き」「次」などのニュアンスがあるか判定
        const intentResponse = await fetch("/api/intent-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            apiKey: apiKey.trim(),
            model: activeProject.model,
            userInstruction: instruction.trim(),
          }),
        });

        if (intentResponse.ok) {
          const intentData = await intentResponse.json();
          if (intentData.isNextEpisode) {
            // 次の話を作成
            targetEpisodeId = crypto.randomUUID();
            const newEpisodeTitle = `第${activeProject.episodes.length + 1}話`;
            targetChatLog = [];
            targetManuscript = "";

            const newEpisode: AiwriteEpisode = {
              id: targetEpisodeId,
              title: newEpisodeTitle,
              manuscript: targetManuscript,
              chatLog: targetChatLog,
              updatedAt: new Date().toISOString(),
            };

            updateActiveProject((project) => ({
              ...project,
              episodes: [...project.episodes, newEpisode],
              activeEpisodeId: targetEpisodeId,
              updatedAt: new Date().toISOString(),
            }));

            // UIへの反映を待つため少し待機
            await new Promise((resolve) => setTimeout(resolve, 50));
          }
        }
      }

      const userMessage = createMessage("user", instruction.trim(), phase);
      const nextLog = [...targetChatLog, userMessage];

      // 送信メッセージを対象のエピソードに反映
      updateActiveProject((project) => ({
        ...project,
        episodes: project.episodes.map((episode) =>
          episode.id === targetEpisodeId
            ? { ...episode, chatLog: nextLog, updatedAt: new Date().toISOString() }
            : episode,
        ),
      }));

      const response = await fetch("/api/openrouter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: apiKey.trim(),
          model: activeProject.model,
          phase,
          persona: activeProject.persona,
          settings: activeProject.settings,
          messages: nextLog,
          currentManuscript: targetManuscript,
          userInstruction: instruction.trim(),
          mode: requestMode,
        }),
      });

      const data = (await response.json()) as { content?: string; error?: string; detail?: string };
      if (!response.ok || !data.content) {
        throw new Error([data.error, data.detail].filter(Boolean).join("\n") || "生成に失敗しました。");
      }

      const generatedContent = data.content;
      const assistantMessage = createMessage("assistant", generatedContent, phase);
      let boardSettingsPatch: Partial<NovelSettings> | undefined;

      try {
        const boardResponse = await fetch("/api/board-update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            apiKey: apiKey.trim(),
            model: activeProject.model,
            phase,
            persona: activeProject.persona,
            settings: activeProject.settings,
            userInstruction: instruction.trim(),
            assistantResponse: generatedContent,
          }),
        });

        if (boardResponse.ok) {
          const boardData = (await boardResponse.json()) as { settings?: Partial<NovelSettings> };
          boardSettingsPatch = boardData.settings;
        }
      } catch {
        boardSettingsPatch = undefined;
      }

      updateActiveProject((current) => ({
        ...current,
        settings: mergeBoardSettings(current.settings, boardSettingsPatch),
        episodes: current.episodes.map((episode) =>
          episode.id === targetEpisodeId
            ? {
                ...episode,
                chatLog: [...nextLog, assistantMessage],
                manuscript:
                  phase === "drafting"
                    ? [targetManuscript, extractScene(generatedContent)].filter(Boolean).join("\n\n")
                    : episode.manuscript,
                updatedAt: new Date().toISOString(),
              }
            : episode,
        ),
        updatedAt: new Date().toISOString(),
      }));
      setInstruction(activePhase.starters[2] || activePhase.placeholder);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "生成に失敗しました。");
    } finally {
      setIsLoading(false);
    }
  }

  async function importSettings() {
    setNotice("");
    if (!importSource.trim()) {
      setNotice("設定テキストまたはURLを入力してください。");
      return;
    }

    setIsLoading(true);
    try {
      const looksLikeUrl = /^https?:\/\//i.test(importSource.trim());
      const response = await fetch("/api/import-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(looksLikeUrl ? { url: importSource.trim() } : { text: importSource.trim() }),
      });
      const data = (await response.json()) as { importedText?: string; error?: string };
      if (!response.ok || !data.importedText) {
        throw new Error(data.error || "設定を読み込めませんでした。");
      }
      updateSettings(
        "referenceLinks",
        [activeProject.settings.referenceLinks, data.importedText].filter(Boolean).join("\n\n"),
      );
      setImportSource("");
      setNotice("設定を参照リンク・素材メモへ追加しました。");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "設定を読み込めませんでした。");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="chat-app">
      <header className="chat-header">
        <a className="brand" href="/">
          <span>aiwrite</span>
          <strong>{activeProject.settings.title || "無題の小説"} / {activeEpisode.title}</strong>
        </a>
        <nav className="header-actions" aria-label="作品操作">
          <button type="button" onClick={() => setActiveSheet(activeSheet === "board" ? "none" : "board")}>
            ボード
          </button>
          <button
            type="button"
            onClick={() => setActiveSheet(activeSheet === "manuscript" ? "none" : "manuscript")}
          >
            本文
          </button>
          <button type="button" onClick={() => setActiveSheet(activeSheet === "settings" ? "none" : "settings")}>
            設定
          </button>
        </nav>
      </header>

      <section className="work-switcher" aria-label="作品と話数">
        <select value={activeProject.id} onChange={(event) => switchProject(event.target.value)}>
          {workspace.projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.settings.title || "無題の小説"}
            </option>
          ))}
        </select>
        <select value={activeEpisode.id} onChange={(event) => switchEpisode(event.target.value)}>
          {activeProject.episodes.map((episode) => (
            <option key={episode.id} value={episode.id}>
              {episode.title}
            </option>
          ))}
        </select>
        <button type="button" onClick={createProject}>
          新規作品
        </button>
        <button type="button" onClick={deleteProject}>
          作品削除
        </button>
        <button type="button" onClick={createEpisode}>
          新規話
        </button>
        <button type="button" onClick={deleteEpisode}>
          話削除
        </button>
      </section>

      <section className="phase-strip" aria-label="執筆フェーズ">
        {phases.map((phase, index) => (
          <button
            key={phase.id}
            type="button"
            className={phase.id === activeProject.activePhase ? "is-active" : ""}
            onClick={() => switchPhase(phase.id)}
          >
            <span>{index + 1}</span>
            {phase.label}
          </button>
        ))}
      </section>

      <section className="chat-thread" aria-label="AIとのライターズルーム">
        {activeEpisode.chatLog.length === 0 ? (
          <div className="welcome-message">
            <img
              src="https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=900&q=80"
              alt=""
            />
            <p className="eyebrow">フェーズ{activePhaseIndex + 1}: {activePhase.label}</p>
            <h1>{activePhase.role}と始める</h1>
            <p>
              {activePhase.intent}。ボードにキャラクター、世界観、プロットを貯めながら、会話で試して固めます。
            </p>
          </div>
        ) : null}

        {activeEpisode.chatLog.map((message) => {
          const messagePhase = phases.find((phase) => phase.id === message.phase);
          return (
            <article key={message.id} className={`message-row ${message.role}`}>
              <div className="avatar">{message.role === "user" ? "私" : "AI"}</div>
              <div className="message-body">
                <div className="speaker-row">
                  <p className="speaker">{message.role === "user" ? "私" : activeProject.persona.name}</p>
                  {messagePhase ? <span>{messagePhase.label}</span> : null}
                </div>
                <div className={message.role === "assistant" && message.phase === "drafting" ? "story-message" : ""}>
                  {message.content.split("\n").map((line, index) => (
                    <p key={`${message.id}-${index}`}>{line || "\u00a0"}</p>
                  ))}
                </div>
              </div>
            </article>
          );
        })}

        {isLoading ? (
          <article className="message-row assistant">
            <div className="avatar">AI</div>
            <div className="message-body">
              <div className="speaker-row">
                <p className="speaker">{activeProject.persona.name}</p>
                <span>{activePhase.label}</span>
              </div>
              <p className="typing">{activePhase.role}として考えています</p>
            </div>
          </article>
        ) : null}
      </section>

      <form className="composer" onSubmit={submitToAi}>
        <div className="starter-grid" aria-label="入力例">
          {activePhase.starters.map((starter) => (
            <button type="button" key={starter} onClick={() => setInstruction(starter)}>
              {starter}
            </button>
          ))}
        </div>

        <div className="composer-box">
          <textarea
            value={instruction}
            onChange={(event) => setInstruction(event.target.value)}
            rows={1}
            placeholder={activePhase.placeholder}
          />
          <button className="send-button" disabled={isLoading} type="submit" aria-label="送信">
            {isLoading ? "..." : "送信"}
          </button>
        </div>
        <div className="composer-meta">
          <span>{activePhase.role}</span>
          <button
            type="button"
            onClick={() => {
              const nextPhase = phases[Math.min(activePhaseIndex + 1, phases.length - 1)];
              switchPhase(nextPhase.id);
            }}
          >
            次へ: {phases[Math.min(activePhaseIndex + 1, phases.length - 1)].label}
          </button>
          <span>{wordCount}字</span>
          <button type="button" onClick={() => setActiveSheet(activeSheet === "manuscript" ? "none" : "manuscript")}>
            本文
          </button>
        </div>
        {notice ? <p className="notice">{notice}</p> : null}
      </form>

      {activeSheet !== "none" ? (
        <aside className="side-panel" aria-label="創作パネル">
          <div className="panel-header">
            <strong>
              {activeSheet === "board" ? "創作ボード" : activeSheet === "settings" ? "作品設定" : "本文プレビュー"}
            </strong>
            <button type="button" onClick={() => setActiveSheet("none")}>
              閉じる
            </button>
          </div>

          {activeSheet === "board" ? (
            <div className="board-grid">
              <p className="board-hint">
                会話の内容からAIが自動で更新します。違うと感じた部分はここで直接直せます。
              </p>
              <label>
                作品タイトル
                <input
                  value={activeProject.settings.title}
                  onChange={(event) => updateSettings("title", event.target.value)}
                />
              </label>
              <label>
                話タイトル
                <input
                  value={activeEpisode.title}
                  onChange={(event) =>
                    updateActiveEpisode((episode) => ({
                      ...episode,
                      title: event.target.value,
                      updatedAt: new Date().toISOString(),
                    }))
                  }
                />
              </label>
              <label>
                コンセプト
                <textarea
                  value={activeProject.settings.concept}
                  onChange={(event) => updateSettings("concept", event.target.value)}
                  placeholder="何が面白い作品か。読者に約束する体験。"
                />
              </label>
              <label>
                キャラクター
                <textarea
                  value={activeProject.settings.characters}
                  onChange={(event) => updateSettings("characters", event.target.value)}
                  placeholder="人物名、欲望、弱点、口調、関係性など"
                />
              </label>
              <label>
                世界観・ルール
                <textarea
                  value={activeProject.settings.worldView}
                  onChange={(event) => updateSettings("worldView", event.target.value)}
                  placeholder="世界のルール、歴史、制度、神話、制約など"
                />
              </label>
              <label>
                プロット
                <textarea
                  value={activeProject.settings.plot}
                  onChange={(event) => updateSettings("plot", event.target.value)}
                  placeholder="章立て、事件年表、対立構造、次に書く場面など"
                />
              </label>
              <label>
                参照リンク・素材メモ
                <textarea
                  value={activeProject.settings.referenceLinks}
                  onChange={(event) => updateSettings("referenceLinks", event.target.value)}
                  placeholder="URL、資料名、使いたい断片など"
                />
              </label>
              <label>
                文体・本稿ルール
                <textarea
                  value={activeProject.settings.writingRules}
                  onChange={(event) => updateSettings("writingRules", event.target.value)}
                  placeholder="地の文、会話、視点、NG表現、採用した読み味など"
                />
              </label>
              <label>
                設定インポート
                <textarea
                  value={importSource}
                  onChange={(event) => setImportSource(event.target.value)}
                  placeholder="設定テキスト、または https:// から始まるURL"
                />
              </label>
              <button type="button" className="secondary-action" onClick={importSettings} disabled={isLoading}>
                素材メモへ読み込む
              </button>
            </div>
          ) : null}

          {activeSheet === "manuscript" ? (
            <article className="manuscript">
              {activeEpisode.manuscript ? (
                activeEpisode.manuscript.split("\n").map((line, index) => (
                  <p key={`${line}-${index}`}>{line || "\u00a0"}</p>
                ))
              ) : (
                <div className="empty-manuscript">
                  <p>本文はまだありません。</p>
                  <p>{activeEpisode.title} の本稿本文だけがここにまとまります。</p>
                </div>
              )}
            </article>
          ) : null}

          {activeSheet === "settings" ? (
            <div className="settings-grid">
              <label>
                OpenRouter APIキー
                <input
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  type="password"
                  placeholder="sk-or-v1-..."
                  autoComplete="off"
                />
              </label>
              <label>
                モデル
                <input
                  value={activeProject.model}
                  onChange={(event) =>
                    updateActiveProject((current) => ({
                      ...current,
                      model: event.target.value,
                      updatedAt: new Date().toISOString(),
                    }))
                  }
                  placeholder="anthropic/claude-3.5-sonnet"
                />
              </label>
              <label>
                AI作家名
                <input value={activeProject.persona.name || ""} onChange={(event) => updatePersona("name", event.target.value)} />
              </label>
              <label>
                AIのキャラクター性・トーク
                <textarea
                  value={activeProject.persona.character || ""}
                  onChange={(event) => updatePersona("character", event.target.value)}
                  placeholder="知的で冷静、熱血、皮肉屋など"
                />
              </label>
              <label>
                こちらの呼び方
                <input
                  value={activeProject.persona.userCall || ""}
                  onChange={(event) => updatePersona("userCall", event.target.value)}
                  placeholder="プロデューサー、監督、あなたなど"
                />
              </label>
              <label>
                執筆する文体・ペルソナ
                <textarea
                  value={activeProject.persona.style}
                  onChange={(event) => updatePersona("style", event.target.value)}
                />
              </label>
              <label>
                視点
                <input
                  value={activeProject.persona.pointOfView}
                  onChange={(event) => updatePersona("pointOfView", event.target.value)}
                />
              </label>
              <label>
                得意ジャンル
                <input
                  value={activeProject.persona.genres}
                  onChange={(event) => updatePersona("genres", event.target.value)}
                />
              </label>
            </div>
          ) : null}
        </aside>
      ) : null}
    </main>
  );
}
