import { describe, it, expect } from 'vitest';
import en from '../en';
import zh from '../zh';
import { ALL_EXPERIMENTS } from '../../../experiments/registry';

const SCENARIO_IDS = ['000', '001', '002', '003', '004'];

describe('Stage 0 content integrity', () => {
  // ── Content completeness ──

  it('all 5 scenarios exist in both en and zh', () => {
    for (const id of SCENARIO_IDS) {
      expect(en.scenarios[id], `en missing scenario ${id}`).toBeDefined();
      expect(zh.scenarios[id], `zh missing scenario ${id}`).toBeDefined();
    }
  });

  it('both en and zh have dashboard content', () => {
    expect(en.dashboard).toBeDefined();
    expect(en.dashboard.title).toBeTruthy();
    expect(en.dashboard.verifyButton).toBeTruthy();
    expect(en.dashboard.cta).toBeTruthy();
    expect(zh.dashboard).toBeDefined();
    expect(zh.dashboard.title).toBeTruthy();
  });

  it('every scenario has required fields in both locales', () => {
    for (const id of SCENARIO_IDS) {
      for (const locale of [en, zh]) {
        const s = locale.scenarios[id];
        expect(s.id).toBe(id);
        expect(s.title).toBeTruthy();
        expect(s.subtitle).toBeTruthy();
        expect(s.leftPanel.label).toBeTruthy();
        expect(s.leftPanel.steps.length).toBeGreaterThan(0);
        expect(s.rightPanel.label).toBeTruthy();
        expect(s.rightPanel.insight).toBeTruthy();
        expect(s.rightPanel.explanation).toBeTruthy();
        expect(s.takeaway).toBeTruthy();
        expect(s.teaser.text).toBeTruthy();
        expect(s.teaser.targetConcept).toBeTruthy();
        expect(s.teaser.targetStage).toBeTruthy();
      }
    }
  });

  it('en and zh scenarios have matching structure', () => {
    for (const id of SCENARIO_IDS) {
      const enScenario = en.scenarios[id];
      const zhScenario = zh.scenarios[id];
      // Same number of left panel steps
      expect(zhScenario.leftPanel.steps.length).toBe(
        enScenario.leftPanel.steps.length,
      );
      // Same step modes
      for (let i = 0; i < enScenario.leftPanel.steps.length; i++) {
        expect(zhScenario.leftPanel.steps[i].mode).toBe(
          enScenario.leftPanel.steps[i].mode,
        );
      }
    }
  });

  // ── Registry ↔ Content alignment ──

  it('every Stage 0 experiment has matching content entry', () => {
    const stage0Exps = ALL_EXPERIMENTS.filter((e) => e.stage === 0);
    expect(stage0Exps.length).toBe(5);

    for (const exp of stage0Exps) {
      const scenarioId = exp.id.split('-')[0];
      expect(
        en.scenarios[scenarioId],
        `No en content for experiment ${exp.id}`,
      ).toBeDefined();
      expect(
        zh.scenarios[scenarioId],
        `No zh content for experiment ${exp.id}`,
      ).toBeDefined();
    }
  });

  // ── i18n key coverage ──

  it('all experiment title/description keys follow the expected naming convention', () => {
    const stage0Exps = ALL_EXPERIMENTS.filter((e) => e.stage === 0);
    for (const exp of stage0Exps) {
      expect(exp.titleKey).toMatch(/^exp\.\d{3}/);
      expect(exp.descriptionKey).toMatch(/^exp\.\d{3}/);
    }
  });
});
