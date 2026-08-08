# Agent Engineering Simulator

A hands-on, bilingual simulator for learning how to engineer reliable AI agents.

Play through 13 progressive scenarios covering Harness, Loop, and Graph engineering. Run baseline experiments, reveal hidden failures, inject capabilities, and export patterns to unlock the next stage.

Live: https://flingjie.github.io/AgentPlaygroud/

## Local Development

```bash
npm install
npm run dev
npm run test
npm run build
```

## Deployment

GitHub Actions builds and deploys the `dist` folder to GitHub Pages on every push to `main` or `feat/rebuild-simulator`.

## Tech Stack

- React 19 + TypeScript 5
- React Router 7 (HashRouter)
- Tailwind CSS 4
- Zustand (progress state)
- Vite 7
- Vitest + Testing Library

---

# Agent Engineering Simulator（中文）

一个用于学习如何构建可靠 AI Agent 的双语交互模拟器。

包含 13 个渐进式场景，涵盖 Harness、Loop、Graph 三阶段工程。运行基线实验、揭示隐藏失败、注入能力并导出 Pattern，解锁下一阶段。

在线预览：https://flingjie.github.io/AgentPlaygroud/

## 本地开发

```bash
npm install
npm run dev
npm run test
npm run build
```

## 部署

每次推送到 `main` 或 `feat/rebuild-simulator` 分支时，GitHub Actions 会自动构建 `dist` 并部署到 GitHub Pages。

## 技术栈

- React 19 + TypeScript 5
- React Router 7（HashRouter）
- Tailwind CSS 4
- Zustand（进度状态）
- Vite 7
- Vitest + Testing Library
