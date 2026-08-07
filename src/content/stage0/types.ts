// ── Stage 0 Content Types ────────────────────────────────────────────────────

export type VisualMode = 'chat' | 'code' | 'terminal' | 'text';

export interface ContentStep {
  /** Visual presentation mode */
  mode: VisualMode;
  /** Speaker label for 'chat' mode */
  speaker?: 'user' | 'model' | 'system';
  /** The displayed text / code / terminal output */
  content: string;
  /** Optional caption below the content block */
  caption?: string;
}

export interface ScenarioContent {
  id: string; // '000' | '001' | '002' | '003' | '004'
  title: string;
  subtitle: string; // one-line hook shown on the dashboard card
  /** Left panel: "What the model does" — the surface appearance */
  leftPanel: {
    label: string; // e.g. "表面现象" / "Surface Appearance"
    steps: ContentStep[];
  };
  /** Right panel: "What's actually happening" — the teaching insight */
  rightPanel: {
    label: string; // e.g. "真相" / "The Truth"
    insight: string; // core insight in one sentence
    explanation: string; // detailed explanation (supports basic markdown)
  };
  /** 💡 Takeaway — the single lesson the user should remember */
  takeaway: string;
  /** 🔗 Teaser — what engineering concept this leads to */
  teaser: {
    text: string; // e.g. "This is why agents need Grounding →"
    targetConcept: string; // concept id in concepts.ts
    targetStage: string; // human-readable, e.g. "Harness Engineering"
  };
}

export interface Stage0Content {
  dashboard: {
    title: string;
    subtitle: string;
    question: string; // "Why don't industrial agents just call an LLM?"
    stats: {
      successRate: { label: string; detail: string; why: string };
      hallucinationRate: { label: string; detail: string; why: string };
      executionCapability: { label: string; detail: string; why: string };
      statePersistence: { label: string; detail: string; why: string };
    };
    cta: string; // "Enter Harness Engineering →"
    verifyButton: string; // "🔬 Verify in Simulator"
  };
  scenarios: Record<string, ScenarioContent>; // keyed by scenario id
}
