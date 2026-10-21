import { lazy, Suspense, useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { TimerController } from './components/Timer';
import { ProjectFormProvider } from './components/ProjectForm';
import { Today } from './pages/Today';
import { ProjectPage } from './pages/ProjectPage';
import { Hours } from './pages/Hours';
import { TasksPage } from './pages/TasksPage';
import { Settings } from './pages/Settings';
import { ensureSeed } from './db/seed';
import { useSetting } from './lib/hooks';
import type { Theme } from './db/actions';

// De kaart (met wereldkaart) wordt pas geladen als je Footprint opent.
const Footprint = lazy(() => import('./pages/Footprint'));

export const THEME_KEY = 'wr-theme';

/** Zet het thema op <html>; "systeem" volgt Windows live. */
function useThemeSync() {
  const theme = useSetting<Theme>('theme', (localStorageGet(THEME_KEY) as Theme) ?? 'donker');
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: light)');
    const apply = () => {
      const effective = theme === 'systeem' ? (media.matches ? 'licht' : 'donker') : theme;
      document.documentElement.dataset.theme = effective;
    };
    apply();
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // Geen opslag beschikbaar; het thema komt dan uit de database.
    }
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);
}

export function localStorageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export default function App() {
  useEffect(() => {
    void ensureSeed();
  }, []);
  useThemeSync();

  return (
    <HashRouter>
      <ProjectFormProvider>
        <div className="app">
          <Sidebar />
          <div className="main">
            <Topbar />
            <Routes>
              <Route path="/" element={<Today />} />
              <Route path="/taken" element={<TasksPage />} />
              <Route path="/uren" element={<Hours />} />
              <Route path="/project/:id" element={<ProjectPage />} />
              <Route path="/footprint" element={<Suspense fallback={<div className="page quiet">Footprint laden…</div>}><Footprint /></Suspense>} />
              <Route path="/instellingen" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </div>
        <TimerController />
      </ProjectFormProvider>
    </HashRouter>
  );
}
