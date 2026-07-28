import { useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { PersistentBanner } from './components/PersistentBanner';
import { YCLandingPage } from './components/YCLandingPage';

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>('light');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.body.classList.toggle('dark-theme', theme === 'dark');
    document.body.classList.toggle('light-theme', theme === 'light');
  }, [theme]);

  const openProduct = () => {
    window.location.assign('/demo');
  };

  return (
    <div className={theme === 'dark' ? 'min-h-screen bg-[#070F1E] text-slate-100' : 'min-h-screen bg-[#F7FAF9] text-slate-900'}>
      <header className="sticky top-0 z-50 shadow-md">
        <PersistentBanner />
        <Navbar
          theme={theme}
          onToggleTheme={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}
          isInteractiveSandboxMode={false}
          onToggleSandboxMode={openProduct}
        />
      </header>
      <YCLandingPage theme={theme} onOpenInteractiveDemo={openProduct} />
    </div>
  );
}
