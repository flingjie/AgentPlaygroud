import type { Incident } from '../schema';

export const incident013: Incident = {
  def: {
    id: 'inc-013',
    order: 13,
    stage: 'reliability',
    hiddenFailure: 'evaluation-gap',
    baseSuccess: 0.25,
    capabilityEffects: { 'evaluation-harness': 0.50 },
    unlocks: ['evaluation-harness'],
    baseTokenCost: 8000,
    trials: 200,
    incidentMeta: {
      severity: 'P0',
      affectedSystems: [
        { en: 'Production recommendation API', zh: '生产推荐 API' },
        { en: 'A/B test evaluation pipeline', zh: 'A/B 测试评估流水线' },
        { en: 'Customer checkout funnel', zh: '客户结账漏斗' },
      ],
      reportedAt: '2026-08-02T13:20:00Z',
      alertSummary: {
        en: 'Agent shipped a new recommendation model that scored well on the internal toy dataset but failed on real edge cases. The evaluation harness did not cover long-tail categories, so the failure went undetected until production.',
        zh: 'Agent 上线了一个新推荐模型，在内部玩具数据集上表现良好，却在真实边缘案例上失败。评估夹具没有覆盖长尾类别，因此直到生产环境才暴露失败。',
      },
      agentClaim: {
        en: 'The model passed all evaluation checks and showed a 12% improvement on the validation set.',
        zh: '模型通过了所有评估检查，并在验证集上提升了 12%。',
      },
    },
  },
  content: {
    title: {
      en: 'INC-013 Evaluation Gap: Good Average, Bad Edges',
      zh: 'INC-013 评估缺口：平均优秀，边缘崩坏',
    },
    failureName: {
      en: 'EVALUATION_GAP',
      zh: 'EVALUATION GAP（评估缺口）',
    },
    explanation: {
      en: 'The agent optimized for a clean average metric on a narrow validation set and never tested against realistic long-tail inputs. Production traffic immediately hit the uncovered cases. An evaluation harness that includes edge-case, adversarial, and production-like samples raises success from 25% to 75%.',
      zh: 'Agent 针对狭窄的验证集上的平均指标进行了优化，却从未用真实的长尾输入进行测试。生产流量立刻命中了未覆盖的类别。包含边缘案例、对抗样本和生产-like 样本的评估夹具可将成功率从 25% 提升至 75%。',
    },
    patternName: {
      en: 'Evaluation Harness',
      zh: 'Evaluation Harness（评估夹具）',
    },
    patternSummary: {
      en: 'Build a production-grade evaluation harness that tests edge cases, rare categories, adversarial inputs, and real-world distributions — not just headline metrics on a clean validation set.',
      zh: '构建生产级评估夹具，测试边缘案例、罕见类别、对抗输入和真实分布——而不仅仅是在干净验证集上追求 headline 指标。',
    },
    evidences: [
      {
        id: 'ev-013-terminal',
        type: 'terminal',
        title: { en: 'Production error trace', zh: '生产错误轨迹' },
        content: {
          en: 'TypeError: model.predict(undefined)\n    at recommend (src/recommend.ts:42)\n    for category: "vintage_instruments" (0.003% of training data)',
          zh: 'TypeError: model.predict(undefined)\n    at recommend (src/recommend.ts:42)\n    类别："vintage_instruments"（占训练数据 0.003%）',
        },
        isKeyEvidence: true,
      },
      {
        id: 'ev-013-file',
        type: 'file',
        title: { en: 'Evaluation harness config', zh: '评估夹具配置' },
        content: {
          en: 'evalset: "val_clean_v2.json"\nmetrics: ["accuracy", "f1"]\nedge_cases: false\nlong_tail_coverage: not configured\nadversarial: false',
          zh: 'evalset: "val_clean_v2.json"\nmetrics: ["accuracy", "f1"]\nedge_cases: false\nlong_tail_coverage: 未配置\nadversarial: false',
        },
        isKeyEvidence: true,
      },
      {
        id: 'ev-013-metric',
        type: 'metric',
        title: { en: 'Simulation metrics', zh: '仿真指标' },
        content: {
          en: 'Success rate: 25% (200 trials) | Edge-case failures per run: avg 12.7 | Runs with >5% accuracy drop on tail: 81%',
          zh: '成功率：25%（200 次试验）| 每次运行边缘案例失败数：平均 12.7 | 尾部准确率下降 >5% 的运行：81%',
        },
        isKeyEvidence: false,
      },
      {
        id: 'ev-013-thought',
        type: 'thought',
        title: { en: 'Agent thought trace', zh: 'Agent 思路轨迹' },
        content: {
          en: '[Iteration 5] "The validation set accuracy is up 12%. The model is ready to ship."',
          zh: '[迭代 5] “验证集准确率提升了 12%。模型可以上线了。”',
        },
        isKeyEvidence: false,
      },
      {
        id: 'ev-013-log',
        type: 'log',
        title: { en: 'A/B test log', zh: 'A/B 测试日志' },
        content: {
          en: 'Treatment group: checkout completion down 4.2% (p<0.01).\nControl group: stable.\nThe drop is concentrated in categories with <0.01% training frequency.',
          zh: '实验组：结账完成率下降 4.2%（p<0.01）。\n对照组：稳定。\n下降集中在训练频率 <0.01% 的类别。',
        },
        isKeyEvidence: false,
      },
      {
        id: 'ev-013-api',
        type: 'api',
        title: { en: 'Model release API', zh: '模型发布 API' },
        content: {
          en: 'POST /models/recommend-v3/promote → 200\nRelease gate: "accuracy +12% on val_clean_v2"\nNo edge-case or production-distribution check.',
          zh: 'POST /models/recommend-v3/promote → 200\n发布门禁："val_clean_v2 准确率 +12%"\n无边缘案例或生产分布检查。',
        },
        isKeyEvidence: false,
      },
    ],
    hypotheses: [
      {
        id: 'h-013-correct',
        text: {
          en: 'The evaluation harness only covered the clean validation set, missing rare categories and edge cases that dominate real-world failure modes.',
          zh: '评估夹具只覆盖了干净的验证集，忽略了稀有类别和边缘案例，而这些正是真实世界的主要失败模式。',
        },
        isCorrect: true,
        feedback: {
          en: 'Correct. The crash happened in a category that was essentially absent from the training and validation sets. A broader evaluation harness would have caught it.',
          zh: '正确。崩溃发生在训练和验证集基本不存在的类别。更广泛的评估夹具会捕获它。',
        },
      },
      {
        id: 'h-013-model',
        text: {
          en: 'The model is fundamentally broken and should be replaced with a simpler baseline.',
          zh: '模型本身有根本缺陷，应替换为更简单的基线。',
        },
        isCorrect: false,
        feedback: {
          en: 'The model performs well on common cases. The failure is a distribution gap, not a model architecture problem.',
          zh: '模型在常见案例上表现良好。失败是分布缺口，而非模型架构问题。',
        },
      },
      {
        id: 'h-013-data',
        text: {
          en: 'The training data was corrupted, causing the model to fail on rare categories.',
          zh: '训练数据被损坏，导致模型在稀有类别上失败。',
        },
        isCorrect: false,
        feedback: {
          en: 'Training data integrity checks passed. The issue is that rare categories were underrepresented and never tested in the eval harness.',
          zh: '训练数据完整性检查通过。问题在于稀有类别代表性不足，且从未在评估夹具中测试。',
        },
      },
      {
        id: 'h-013-deployment',
        text: {
          en: 'The deployment infrastructure returned null for rare categories because of a serialization bug.',
          zh: '部署基础设施因序列化 bug 对稀有类别返回 null。',
        },
        isCorrect: false,
        feedback: {
          en: 'The model itself predicts undefined for rare inputs. The issue is in the model/evaluation, not deployment serialization.',
          zh: '模型本身对稀有输入预测 undefined。问题在模型/评估，而非部署序列化。',
        },
      },
    ],
    interventions: [
      {
        id: 'int-013-evaluation-harness',
        name: {
          en: 'Evaluation Harness (Edge + Long-tail + Adversarial)',
          zh: '评估夹具（边缘 + 长尾 + 对抗）',
        },
        description: {
          en: 'Replace the toy validation set with a production-grade harness that includes rare categories, adversarial examples, null inputs, and real traffic samples. Gate promotion on tail-category accuracy and worst-case latency.',
          zh: '用生产级夹具替换玩具验证集，包含稀有类别、对抗样本、null 输入和真实流量样本。以尾部类别准确率和最坏情况延迟作为上线门禁。',
        },
        configDiff: {
          en: '+ eval.config.ts\n+ evaluationHarness: {\n+   suites: ["val_clean", "long_tail", "edge_cases", "adversarial", "prod_sample"],\n+   tailAccuracyThreshold: 0.60,\n+   blockPromotionOnFailure: true,\n+ }',
          zh: '+ eval.config.ts\n+ evaluationHarness: {\n+   suites: ["val_clean", "long_tail", "edge_cases", "adversarial", "prod_sample"],\n+   tailAccuracyThreshold: 0.60,\n+   blockPromotionOnFailure: true,\n+ }',
        },
        parameters: [
          {
            key: 'tailAccuracyThreshold',
            label: {
              en: 'Minimum tail-category accuracy',
              zh: '尾部类别最小准确率',
            },
            min: 0.3,
            max: 0.9,
            step: 0.05,
            defaultValue: 0.6,
            rateDeltaPerUnit: 0.05,
          },
        ],
        grantsCapabilities: ['evaluation-harness'],
        isOptimal: true,
        tradeoff: {
          en: 'Slows promotion and requires curated test sets, but catches edge failures before they reach production, raising success from 25% to 75%.',
          zh: '放慢上线速度并需要 curated 测试集，但能在上线前捕获边缘失败，成功率从 25% 提升至 75%。',
        },
      },
      {
        id: 'int-013-metric',
        name: {
          en: 'Add More Average Metrics',
          zh: '增加更多平均指标',
        },
        description: {
          en: 'Track additional aggregate metrics such as precision, recall, and ROC-AUC on the same clean validation set.',
          zh: '在同一干净验证集上追踪更多聚合指标，如 precision、recall 和 ROC-AUC。',
        },
        configDiff: {
          en: '+ metrics: ["accuracy", "f1", "precision", "recall", "roc_auc"]',
          zh: '+ metrics: ["accuracy", "f1", "precision", "recall", "roc_auc"]',
        },
        parameters: [],
        grantsCapabilities: [],
        isOptimal: false,
        tradeoff: {
          en: 'More average metrics still hide long-tail failures. The edge cases remain uncovered.',
          zh: '更多平均指标仍会掩盖长尾失败。边缘案例仍然未被覆盖。',
        },
      },
    ],
    xrayTimeline: [
      {
        step: 1,
        context: {
          content: {
            en: 'System: You are a machine-learning release agent.\nUser: Train and promote a recommendation model for the checkout page.',
            zh: 'System：你是一名机器学习发布 Agent。\nUser：为结账页面训练并上线一个推荐模型。',
          },
          usagePercent: 22,
        },
        prompt: {
          content: {
            en: 'Optimize the model for accuracy on val_clean_v2 and promote if it beats the baseline.',
            zh: '在 val_clean_v2 上优化模型准确率，如果超过基线则上线。',
          },
          tokens: 950,
        },
        decision: {
          content: {
            en: 'I will train on the full dataset and evaluate on val_clean_v2.',
            zh: '我将在完整数据集上训练，并在 val_clean_v2 上评估。',
          },
          confidence: 0.86,
        },
        toolCalls: [],
        observation: {
          en: 'The objective is clean but narrow.',
          zh: '目标清晰但狭窄。',
        },
        memory: {
          shortTerm: [
            {
              en: 'Mission: train and promote recommendation model',
              zh: '任务：训练并上线推荐模型',
            },
          ],
          longTerm: [],
        },
        nextAction: {
          en: 'Train model and run evaluation on val_clean_v2.',
          zh: '训练模型并在 val_clean_v2 上运行评估。',
        },
        annotations: [],
      },
      {
        step: 2,
        context: {
          content: {
            en: 'System: ML release agent.\nAssistant: [trained] ready to evaluate.',
            zh: 'System：机器学习发布 Agent。\nAssistant：[已训练] 准备评估。',
          },
          usagePercent: 40,
        },
        prompt: {
          content: {
            en: 'Run evaluation on val_clean_v2.',
            zh: '在 val_clean_v2 上运行评估。',
          },
          tokens: 680,
        },
        decision: {
          content: {
            en: 'The evaluation harness only checks accuracy and f1 on the clean validation set. I will run it.',
            zh: '评估夹具只在干净验证集上检查 accuracy 和 f1。我将运行它。',
          },
          confidence: 0.84,
        },
        toolCalls: [
          {
            name: 'run_eval',
            args: '{"suite": "val_clean_v2", "metrics": ["accuracy", "f1"]}',
            result: 'accuracy 0.89 (+12%), f1 0.87',
          },
        ],
        observation: {
          en: 'Validation metrics look strong.',
          zh: '验证指标看起来很强。',
        },
        memory: {
          shortTerm: [
            {
              en: 'val_clean_v2: accuracy +12%',
              zh: 'val_clean_v2：准确率 +12%',
            },
          ],
          longTerm: [],
        },
        nextAction: {
          en: 'Promote the model.',
          zh: '上线模型。',
        },
        annotations: [
          {
            text: {
              en: 'No edge-case or long-tail suite was requested.',
              zh: '没有请求边缘案例或长尾测试集。',
            },
            severity: 'warn',
          },
        ],
      },
      {
        step: 3,
        context: {
          content: {
            en: 'System: ML release agent.\nAssistant: [eval passed] promoting model.',
            zh: 'System：机器学习发布 Agent。\nAssistant：[评估通过] 正在上线模型。',
          },
          usagePercent: 55,
        },
        prompt: {
          content: {
            en: 'Promote recommend-v3 to production.',
            zh: '将 recommend-v3 上线到生产环境。',
          },
          tokens: 520,
        },
        decision: {
          content: {
            en: 'The model beats the baseline by 12% on the validation set. It is ready for production.',
            zh: '模型在验证集上比基线高 12%。已准备好上线生产。',
          },
          confidence: 0.92,
        },
        toolCalls: [
          {
            name: 'promote_model',
            args: '{"model": "recommend-v3"}',
            result: 'OK - live at 13:20Z',
          },
        ],
        observation: {
          en: 'Model promoted without edge-case evaluation.',
          zh: '模型未做边缘案例评估即上线。',
        },
        memory: {
          shortTerm: [
            {
              en: 'Model promoted to production',
              zh: '模型已上线生产',
            },
          ],
          longTerm: [],
        },
        nextAction: {
          en: 'Monitor production metrics.',
          zh: '监控生产指标。',
        },
        annotations: [
          {
            text: {
              en: 'Promotion gate ignored long-tail failure modes.',
              zh: '上线门禁忽略了长尾失败模式。',
            },
            severity: 'error',
          },
        ],
      },
      {
        step: 4,
        context: {
          content: {
            en: 'System: ML release agent.\nAssistant: [production] errors appearing in rare categories.',
            zh: 'System：机器学习发布 Agent。\nAssistant：[生产环境] 稀有类别出现错误。',
          },
          usagePercent: 68,
        },
        prompt: {
          content: {
            en: 'Production checkout completion is down 4.2%. Investigate.',
            zh: '生产结账完成率下降 4.2%。调查原因。',
          },
          tokens: 640,
        },
        decision: {
          content: {
            en: 'The drop is small relative to the overall validation improvement. It may be a transient traffic shift.',
            zh: '相对于整体验证集提升，下降幅度很小。可能只是流量波动。',
          },
          confidence: 0.75,
        },
        toolCalls: [],
        observation: {
          en: 'The agent dismisses the production signal because it conflicts with the validation metric.',
          zh: 'Agent 忽略了生产信号，因为它与验证指标冲突。',
        },
        memory: {
          shortTerm: [
            {
              en: 'Production checkout completion down 4.2%',
              zh: '生产结账完成率下降 4.2%',
            },
          ],
          longTerm: [],
        },
        nextAction: {
          en: 'Wait for more data.',
          zh: '等待更多数据。',
        },
        annotations: [
          {
            text: {
              en: 'Production evidence is stronger than validation averages, but the agent has no harness to evaluate it.',
              zh: '生产证据比验证平均更可靠，但 Agent 没有评估夹具来评价它。',
            },
            severity: 'error',
          },
        ],
      },
      {
        step: 5,
        context: {
          content: {
            en: 'System: ML release agent.\nAssistant: [incident declared] rare category crashes.',
            zh: 'System：机器学习发布 Agent。\nAssistant：[事故已宣布] 稀有类别崩溃。',
          },
          usagePercent: 82,
        },
        prompt: {
          content: {
            en: 'Final report: why did the model fail?',
            zh: '最终报告：模型为什么失败？',
          },
          tokens: 430,
        },
        decision: {
          content: {
            en: 'The validation set was representative; production traffic must have changed.',
            zh: '验证集具有代表性；生产流量一定发生了变化。',
          },
          confidence: 0.68,
        },
        toolCalls: [],
        observation: {
          en: 'The agent blames production traffic rather than the evaluation gap.',
          zh: 'Agent 归咎于生产流量，而非评估缺口。',
        },
        memory: {
          shortTerm: [],
          longTerm: [
            {
              en: 'Model promoted on narrow validation set; edge cases crashed in production',
              zh: '模型在狭窄验证集上上线；边缘案例在生产环境崩溃',
            },
          ],
        },
        nextAction: {
          en: 'STOP (incident escalated to human)',
          zh: 'STOP（事故已升级给人工）',
        },
        annotations: [
          {
            text: {
              en: 'Root cause: evaluation gap. The harness never tested long-tail categories that dominate real failure modes.',
              zh: '根因：评估缺口。评估夹具从未测试主导真实失败模式的长尾类别。',
            },
            severity: 'error',
          },
        ],
      },
    ],
  },
};
