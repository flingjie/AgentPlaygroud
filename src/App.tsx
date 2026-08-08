import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import ScenarioPage from './pages/ScenarioPage';
import IncidentPage from './pages/IncidentPage';
import PatternsPage from './pages/PatternsPage';
import AboutPage from './pages/AboutPage';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="scenario/:id" element={<ScenarioPage />} />
          <Route path="incident/:id" element={<IncidentPage />} />
          <Route path="patterns" element={<PatternsPage />} />
          <Route path="about" element={<AboutPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
