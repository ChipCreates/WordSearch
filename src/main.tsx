import '@fontsource/quicksand/600.css';
import '@fontsource/quicksand/700.css';
import '@fontsource/work-sans/400.css';
import '@fontsource/work-sans/500.css';
import '@fontsource/space-grotesk/700.css';
import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './App.css'
import App from './App.tsx'
import AssetSplash from './components/AssetSplash.tsx'

const CRITICAL_ASSETS = [
  'branding/word-sprout-logo.webp', 'seed.png',
  'navigation/play.webp', 'navigation/levels.webp', 'navigation/garden.webp',
  'navigation/trophies.webp', 'navigation/field-kit.webp', 'navigation/settings.webp',
  'backgrounds/playing-portrait.webp', 'backgrounds/playing-landscape.webp',
];

function Bootstrap() {
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let completed = 0;
    let active = true;
    let assetsReady = false;
    let displayedProgress = 0;
    let measuredProgress = 0;
    const startedAt = performance.now();
    const minimumSplashMs = 3400;
    const update = () => {
      completed += 1;
      measuredProgress = completed / CRITICAL_ASSETS.length * 100;
    };
    const progressTimer = window.setInterval(() => {
      if (!active) return;
      const elapsed = performance.now() - startedAt;
      const timeProgress = Math.min(96, elapsed / minimumSplashMs * 100);
      const target = assetsReady ? timeProgress : Math.min(timeProgress, Math.max(8, measuredProgress));
      displayedProgress = Math.min(target, displayedProgress + 2);
      setProgress(displayedProgress);
      if (assetsReady && elapsed >= minimumSplashMs && displayedProgress >= 96) {
        window.clearInterval(progressTimer);
        setProgress(100);
        window.setTimeout(() => active && setReady(true), 500);
      }
    }, 50);
    Promise.allSettled(CRITICAL_ASSETS.map(path => new Promise<void>(resolve => {
      const image = new Image();
      image.onload = () => { update(); resolve(); };
      image.onerror = () => { update(); resolve(); };
      image.src = `${import.meta.env.BASE_URL}${path}`;
    }))).then(() => {
      if (!active) return;
      assetsReady = true;
      measuredProgress = 100;
    });
    return () => { active = false; window.clearInterval(progressTimer); };
  }, []);
  return ready ? <App /> : <AssetSplash progress={progress} />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Bootstrap />
  </StrictMode>,
)
