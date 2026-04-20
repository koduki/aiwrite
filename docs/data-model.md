# データ構造

## LocalStorage

### `aiwrite:workspace:v2`

```json
{
  "projects": [ /* AiwriteProject array */ ],
  "activeProjectId": "string"
}
```

### Project

```json
{
  "id": "string",
  "activePhase": "structuring | sampling | refining | drafting",
  "persona": { /* Persona object */ },
  "settings": { /* NovelSettings object */ },
  "model": "string",
  "episodes": [ /* AiwriteEpisode array */ ],
  "activeEpisodeId": "string",
  "updatedAt": "string (ISO8601)"
}
```

作品単位で持つもの:

- AI作家ペルソナ
- モデル
- 創作ボード
- 話数一覧
- 現在のフェーズ
- 現在の話数

### Episode

```json
{
  "id": "string",
  "title": "string",
  "manuscript": "string",
  "chatLog": [ /* ChatMessage array */ ],
  "updatedAt": "string (ISO8601)"
}
```

話数単位で持つもの:

- 話タイトル
- チャットログ
- 本稿本文

### NovelSettings

```json
{
  "title": "string",
  "concept": "string",
  "worldView": "string",
  "plot": "string",
  "characters": "string",
  "referenceLinks": "string",
  "writingRules": "string"
}
```

これは創作ボードの実体である。

### Persona

```json
{
  "name": "string",
  "character": "string",
  "userCall": "string",
  "style": "string",
  "pointOfView": "string",
  "genres": "string"
}
```

### ChatMessage

```json
{
  "id": "string",
  "role": "user | assistant",
  "content": "string",
  "createdAt": "string (ISO8601)",
  "phase": "NarrativePhase (optional)"
}
```
