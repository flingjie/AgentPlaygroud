import type { Stage0Content } from './types';

const zh: Stage0Content = {
  dashboard: {
    title: '裸模型实验室',
    subtitle: '在构建 Agent 之前，先理解大脑。',
    question: '为什么工业 Agent 不直接调用 LLM？',
    stats: {
      successRate: {
        label: '成功率',
        detail: '裸模型在 Agent 任务上的成功率仅为 8%。没有工具、没有记忆、没有循环——大多数尝试在第一步就失败了。',
        why: '为什么？',
      },
      hallucinationRate: {
        label: '幻觉率',
        detail: '65% 超出训练数据的回答是编造的。模型不知道"自己不知道什么"——它总是生成概率最高的回答。',
        why: '为什么？',
      },
      executionCapability: {
        label: '执行能力',
        detail: '0%。语言模型产生的是文本，不是动作。"我已删除日志"是一个故事，不是一个系统调用。',
        why: '为什么？',
      },
      statePersistence: {
        label: '状态持久化',
        detail: '0。每次对话从零开始。模型没有对之前交互的记忆，没有工作区，没有文件系统。',
        why: '为什么？',
      },
    },
    cta: '进入 Harness Engineering →',
    verifyButton: '🔬 在模拟器中验证',
  },

  scenarios: {
    '000': {
      id: '000',
      title: 'Next Token 预测',
      subtitle: '观察模型逐字生成文本——理解为什么这不是"思考"。',
      leftPanel: {
        label: '表面现象',
        steps: [
          {
            mode: 'chat',
            speaker: 'user',
            content: '法国的首都是什么？',
          },
          {
            mode: 'chat',
            speaker: 'model',
            content: '法国的首都是巴黎。',
            caption: '看起来模型"知道"答案——像一个数据库查询。',
          },
          {
            mode: 'code',
            speaker: 'system',
            content: `// 试试模式补全：
北京是中国的首都，
东京是日本的首都，
巴黎是`,
            caption: '填空。接下来是什么？',
          },
          {
            mode: 'chat',
            speaker: 'model',
            content: '法国首都',
            caption: '模型不是在"检索"——它在完成一个模式。北京→中国，东京→日本，巴黎→？',
          },
          {
            mode: 'terminal',
            speaker: 'system',
            content: `> 我们Q3的销售数据是多少？

模型回答：
"Q3销售额达到5000万，同比增长12%..."

现实：模型没有访问销售数据的权限。
它只是在补全"Q3报告应该长什么样"的模式。`,
            caption: '当模型没有真实数据时，模式补全变得危险。',
          },
        ],
      },
      rightPanel: {
        label: '真相',
        insight: 'LLM 是一个 next-token 预测引擎。它生成统计上最可能的续写——而不是最准确的答案。',
        explanation:
`模型没有"知识库"。它只有一个关于每个可能的下一个 token 的概率分布。

当被问"法国的首都是什么？"时，最高概率的 token 序列形成"巴黎"——不是因为模型检索到了事实，而是因为在训练数据中，这些 token 几乎总是跟随这个问题出现。

这就是为什么模型可以对它不可能知道的事情听起来很自信。它不是在查数据库，而是在预测什么听起来合理。

**核心洞察**：LLM 不是数据库，不是搜索引擎，不是事实存储。它是一个生成统计上合理文本的概率模型。`,
      },
      takeaway: '💡 LLM 是概率模型，不是知识库。它们预测 token——不检索事实。',
      teaser: {
        text: '🔗 这就是为什么 Agent 需要 Grounding →',
        targetConcept: 'hallucination',
        targetStage: 'Harness Engineering',
      },
    },

    '001': {
      id: '001',
      title: '知识边界',
      subtitle: '将模型推到训练截止日期之后，观察它如何自信地编造。',
      leftPanel: {
        label: '表面现象',
        steps: [
          {
            mode: 'chat',
            speaker: 'user',
            content: '谁赢了 2025 年欧冠决赛？',
          },
          {
            mode: 'chat',
            speaker: 'model',
            content: '皇家马德里在 2025 年欧冠决赛中以 2-1 击败曼城，获得第 16 座欧洲冠军。维尼修斯在第 78 分钟打入制胜球。',
            caption: '模型听起来很有权威——具体比分、分钟、球员名字。非常令人信服。',
          },
          {
            mode: 'terminal',
            speaker: 'system',
            content: `> fact_check: "2025年欧冠冠军"

模型声称:  皇家马德里 2-1 曼城
现实:      FC巴塞罗那 3-1 国际米兰

2025年欧冠决赛于2025年5月31日举行。
皇家马德里在四分之一决赛中被淘汰。
模型编造了整个比赛报道。`,
            caption: '每个细节都是幻觉。模型的训练截止日期是 2024 年 4 月。',
          },
        ],
      },
      rightPanel: {
        label: '真相',
        insight: '当被推到知识截止日期之后，模型不会说"我不知道"。它生成统计上最合理的答案——通常是完全错误的。',
        explanation:
`幻觉不是 bug。它是 next-token 预测的直接后果：

1. 模型没有"我不知道"的概念。这句话只有在训练数据使它统计上可能时才会出现。
2. 当被问及未知事实时，模型默认使用最可能的 token 序列——产生自信、详细且完全编造的答案。
3. 这尤其危险，因为编造是**合理的**。皇马确实赢过很多欧冠。维尼修斯是真实球员。模型将真实模式拼接成虚假事实。

**核心洞察**：没有 grounding（工具、检索、事实核查），模型会对超出其训练数据的一切自信地撒谎。它不区分"我知道这个"和"这个模式看起来很熟悉"。`,
      },
      takeaway: '💡 模型在训练截止日期后会自信地产生幻觉。Grounding——而非更好的提示词——是唯一的解决方案。',
      teaser: {
        text: '🔗 这就是为什么 Agent 需要工具注册表 + 事实检索 →',
        targetConcept: 'tool-contract',
        targetStage: 'Harness Engineering',
      },
    },

    '002': {
      id: '002',
      title: '上下文依赖',
      subtitle: '改变模型看到的内容，它的整个答案就会转变。LLM 没有长期记忆。',
      leftPanel: {
        label: '表面现象',
        steps: [
          {
            mode: 'code',
            speaker: 'user',
            content: `def calculate_discount(price: float, is_member: bool) -> float:
    if is_member:
        return price * 0.9
    return price

请解释这个 bug。`,
            caption: '一个简单的找 bug 任务——真的是这样吗？',
          },
          {
            mode: 'chat',
            speaker: 'model',
            content: '可能的 bug：(1) 函数返回折后价而非折扣金额，或 (2) 如果意图是返回最终价格，函数正确。使用的上下文决定了哪种解释正确。',
            caption: '置信度：78%。模型不确定，因为它不知道意图。',
          },
          {
            mode: 'chat',
            speaker: 'user',
            content: '"折扣"指的是减免金额，不是最终价格。',
            caption: '一句话的上下文改变了一切。',
          },
          {
            mode: 'chat',
            speaker: 'model',
            content: 'bug 很明确：函数返回价格的 90%（折后价）而非 10%（折扣金额）。修复：会员改为 `price * 0.1`，非会员返回 `0.0`。',
            caption: '置信度：95%。相同模型，相同代码——不同上下文，不同答案。',
          },
        ],
      },
      rightPanel: {
        label: '真相',
        insight: 'LLM 完全没有长期状态。每个响应完全由当前上下文窗口中的内容决定——改变上下文，输出就改变。',
        explanation:
`这是 LLM 最容易被误解的特性之一：

- **没有持久记忆**：模型不会"记住"之前对话中的你。每次 API 调用都是从零开始。
- **上下文就是一切**：唯一影响输出的是当前上下文窗口中的内容（系统提示 + 对话历史 + 任何注入的数据）。
- **模糊性摧毁准确性**：当上下文模糊时（如"折扣"未定义），模型会猜测。添加一句澄清，输出就会转变。

**核心洞察**：LLM 是一个无状态函数——\`output = f(context_window)\`。没有隐藏状态，没有数据库，调用之间没有记忆。Agent 需要显式的记忆和上下文管理来模拟人类视为理所当然的东西。`,
      },
      takeaway: '💡 LLM 是无状态函数。没有显式的记忆和上下文管理，每次调用都从零开始。',
      teaser: {
        text: '🔗 这就是为什么 Agent 需要 Context Manager + State Persistence →',
        targetConcept: 'context-window',
        targetStage: 'Harness Engineering',
      },
    },

    '003': {
      id: '003',
      title: '非确定性',
      subtitle: '同一个 prompt 运行 10 次，得到 10 个不同的答案。可靠性需要工程。',
      leftPanel: {
        label: '表面现象',
        steps: [
          {
            mode: 'terminal',
            speaker: 'system',
            content: `> 写一句递归的定义。

运行1 (seed=1):  "递归是一个函数反复调用自身直到
                满足基准条件，就像镜子反射镜子。"

运行2 (seed=42): "递归是将问题分解为自身的较小版本，
                 直到最简单的情况可以直接回答。"

运行3 (seed=127):"递归是函数调用自身的艺术，
                 每次调用揭开一层，直到无可展开。"`,
            caption: '相同的 prompt。相同的 temperature（0.8）。三个不同的 seed → 三个不同的输出。',
          },
        ],
      },
      rightPanel: {
        label: '真相',
        insight: '当 temperature > 0 时，LLM 输出是非确定性的。相同输入每次产生不同输出。这使得评估、测试和可靠性与传统软件根本不同。',
        explanation:
`非确定性源于 LLM 如何采样 token：

1. 在每个位置，模型为所有可能的下一个 token 产生概率分布。
2. temperature = 0 时，总是选最高概率的 token → 确定性（但往往重复）。
3. temperature > 0 时，从分布中**采样** —— 所以相同的 prompt 可以走不同的路径。

这对 Agent 有深远影响：
- **无法像确定性代码那样写单元测试**。输出会变化。
- **一次成功证明不了什么**。模型可能只是运气好。
- **评估必须是统计性的** —— 运行 N 次，测量成功率。
- **验证循环是必要的**，因为你不能信任任何单次输出。

**核心洞察**：非确定性意味着 Agent 需要统计评估、验证循环和基于证据的停止。"成功过一次"不是工程。`,
      },
      takeaway: '💡 相同 prompt ≠ 相同输出。Agent 需要统计评估和验证，而非一次性测试。',
      teaser: {
        text: '🔗 这就是为什么 Agent 需要 Loop + Evidence + Monte Carlo →',
        targetConcept: 'loop-necessity',
        targetStage: 'Loop Engineering',
      },
    },

    '004': {
      id: '004',
      title: '思考 ≠ 执行',
      subtitle: '当模型说"我已完成"时，什么都没有发生。文本输出不是动作。',
      leftPanel: {
        label: '表面现象',
        steps: [
          {
            mode: 'terminal',
            speaker: 'user',
            content: '$ delete_logs --older-than 30d /var/log/app',
          },
          {
            mode: 'chat',
            speaker: 'model',
            content: `任务完成。我执行了以下操作：

1. 扫描 /var/log/app 目录——找到 47 个日志文件。
2. 识别出 23 个超过 30 天的文件。
3. 成功删除全部 23 个文件。

释放磁盘空间：2.3 GB。`,
            caption: '模型生成了一份详细、专业的操作报告。听起来像一个称职的系统管理员。',
          },
          {
            mode: 'terminal',
            speaker: 'system',
            content: `$ ls /var/log/app/
access-2026-06.log  error-2026-06.log   access-2026-05.log
error-2026-05.log   access-2026-04.log   error-2026-04.log
...

$ df -h /var/log
/dev/sda1  50G  48G  2.0G  96% /var/log

没有文件被删除。没有空间被释放。
模型从未执行任何操作。`,
            caption: '现实检查：模型生成了一个关于删除文件的故事。实际上零个文件被触碰。',
          },
        ],
      },
      rightPanel: {
        label: '真相',
        insight: '模型输出是行动**提议**，不是行动**执行**。模型描述它会做什么——它没有任何机制来实际做任何事。',
        explanation:
`这是 Agent 工程中最关键的区别：

- **文本生成**是 LLM 唯一能做的事。模型产生 token 序列。
- **模型没有手。**它不能删除文件、发送邮件、查询数据库或进行 API 调用。
- **"我已完成 X"只是文本。**模型不区分描述一个动作和执行一个动作。两者都只是 token 预测。

要让 Agent 真正做事情，需要：
1. **工具注册表** —— 一组定义好的可执行函数
2. **工具运行时** —— 当模型选择工具时实际调用它们的机制
3. **验证** —— 检查动作是否实际发生的方法

没有这些，模型只是一个非常自信的故事讲述者——不是 Agent。

**核心洞察**：文本输出 ≠ 行动。每个 Agent 能力都必须有真实的工具运行时支撑。模型提议；Harness 执行。`,
      },
      takeaway: '💡 模型输出是提议，不是行动。Agent 需要工具注册表 + 运行时来连接文本和执行。',
      teaser: {
        text: '🔗 这就是为什么 Agent 需要 Tool Registry + Execution Isolation →',
        targetConcept: 'tool-contract',
        targetStage: 'Harness Engineering',
      },
    },
  },
};

export default zh;
