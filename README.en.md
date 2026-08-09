# Agent Incident Simulator

[中文](./README.md)

A hands-on simulator for learning how to respond to AI agent incidents.

![Agent Incident Simulator](./docs/assets/agent-playground.png)

Play through 16 progressive incident tickets (INC-000…015) across five engineering layers: LLM, Harness, Loop, Graph, and Reliability. Investigate the scene, diagnose the root cause, choose interventions, run a deterministic Monte Carlo verification, and close the ticket to unlock the next stage.

**Live:** https://flingjie.github.io/AgentPlaygroud/

## Local Development

```bash
npm install
npm run dev
npm run test
npm run build
```

## Deployment

GitHub Actions builds and deploys the `dist` folder to GitHub Pages on every push to `main`.

## Tech Stack

- React 19 + TypeScript 5
- React Router 7 (HashRouter)
- Tailwind CSS 4
- Zustand (progress state)
- Vite 7
- Vitest + Testing Library
