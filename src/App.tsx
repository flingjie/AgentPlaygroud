import { useState } from 'react';
import ExperimentShell from './components/ExperimentShell';
import { GameProvider } from './context/GameContext';
import Layout from './components/Layout';

export default function App() {
  const [appMode, setAppMode] = useState<'lab' | 'factory'>('lab');

  if (appMode === 'factory') {
    return (
      <GameProvider>
        <Layout onBackToLab={() => setAppMode('lab')} />
      </GameProvider>
    );
  }

  return <ExperimentShell onEnterFactory={() => setAppMode('factory')} />;
}
