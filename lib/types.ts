export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  phase?: NarrativePhase;
};

export type NarrativePhase = "structuring" | "sampling" | "refining" | "drafting";

export type Persona = {
  name: string;
  character: string;
  userCall: string;
  style: string;
  pointOfView: string;
  genres: string;
};

export type NovelSettings = {
  title: string;
  concept: string;
  worldView: string;
  plot: string;
  characters: string;
  referenceLinks: string;
  writingRules: string;
};

export type AiwriteEpisode = {
  id: string;
  title: string;
  manuscript: string;
  chatLog: ChatMessage[];
  updatedAt: string;
};

export type AiwriteProject = {
  id: string;
  activePhase: NarrativePhase;
  persona: Persona;
  settings: NovelSettings;
  model: string;
  episodes: AiwriteEpisode[];
  activeEpisodeId: string;
  updatedAt: string;
};

export type AiwriteWorkspace = {
  projects: AiwriteProject[];
  activeProjectId: string;
};
