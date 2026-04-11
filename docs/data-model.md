# データ構造

## LocalStorage

### `aiwrite:workspace:v2`

```ts
type AiwriteWorkspace = {
  projects: AiwriteProject[];
  activeProjectId: string;
};
```

### Project

```ts
type AiwriteProject = {
  id: string;
  activePhase: "structuring" | "sampling" | "refining" | "drafting";
  persona: Persona;
  settings: NovelSettings;
  model: string;
  episodes: AiwriteEpisode[];
  activeEpisodeId: string;
  updatedAt: string;
};
```

作品単位で持つもの:

- AI作家ペルソナ
- モデル
- 創作ボード
- 話数一覧
- 現在のフェーズ
- 現在の話数

### Episode

```ts
type AiwriteEpisode = {
  id: string;
  title: string;
  manuscript: string;
  chatLog: ChatMessage[];
  updatedAt: string;
};
```

話数単位で持つもの:

- 話タイトル
- チャットログ
- 本稿本文

### NovelSettings

```ts
type NovelSettings = {
  title: string;
  concept: string;
  worldView: string;
  plot: string;
  characters: string;
  referenceLinks: string;
  writingRules: string;
};
```

これは創作ボードの実体である。

### Persona

```ts
type Persona = {
  name: string;
  style: string;
  pointOfView: string;
  genres: string;
};
```

### ChatMessage

```ts
type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  phase?: NarrativePhase;
};
```

## Firestore想定

```text
users/{uid}
  openrouter_key_encrypted
  profile.name
  profile.bio

novels/{novelId}
  author_id
  title
  active_phase
  active_episode_id
  model
  persona.name
  persona.style
  persona.point_of_view
  persona.genres
  settings.concept
  settings.characters
  settings.world_view
  settings.plot
  settings.reference_links
  settings.writing_rules
  created_at
  updated_at

novels/{novelId}/episodes/{episodeId}
  title
  content
  chat_log
  created_at
  updated_at
```
