import React, { useState, useEffect } from 'react';
import { Compass, Moon, Sun, Activity, Menu, X, ShieldCheck, CheckCircle2, ChevronRight, Building2, Sparkles } from 'lucide-react';
import { CanopusLogo } from './CanopusLogo';

interface NavbarProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  isInteractiveSandboxMode?: boolean;
  onToggleSandboxMode?: () => void;
}

export function Navbar({ theme, onToggleTheme, isInteractiveSandboxMode, onToggleSandboxMode }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sandboxStatus, setSandboxStatus] = useState<{
    connected: boolean;
    source: string;
    engine: string;
  }>({
    connected: false,
    source: 'checking...',
    engine: 'Canopus Care v1.2'
  });

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        setSandboxStatus({
          connected: data.status === 'ok' || !!data.sandboxConnected,
          source: data.source || (data.status === 'ok' || data.sandboxConnected ? 'live-engine' : 'offline-snapshot'),
          engine: data.engine || 'Canopus Care v1.2'
        });
      })
      .catch(() => {
        setSandboxStatus({
          connected: false,
          source: 'offline-snapshot',
          engine: 'Canopus Care v1.2'
        });
      });
  }, []);

  const landingNavLinks = [
    { name: 'Product', href: '#products' },
    { name: 'Demo', href: '#product-demo' },
    { name: 'Technology', href: '#architecture' },
    { name: 'About Us', href: '#about' },
    { name: 'Contact', href: '#contact' },
    { name: 'YC Deck', href: '#yc-application' },
  ];

  const sandboxNavLinks = [
    { name: 'Stakeholder Views', href: '#stakeholder-perspectives' },
    { name: 'Hospital Portal', href: '#hospital-portal' },
    { name: 'Journey Library', href: '#complex-journeys' },
    { name: 'Live Journey', href: '#live-orchestrator' },
    { name: 'Agent Workflows', href: '#agents' },
  ];

  const currentLinks = isInteractiveSandboxMode ? sandboxNavLinks : landingNavLinks;

  return (
    <nav className="border-b border-slate-800 bg-[#0A1626]/95 backdrop-blur-md transition-colors shadow-lg text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">

        {/* Left: Brand Identity */}
        <div className="flex items-center gap-3 shrink-0">
          <a
            href="/"
            aria-label="Canopus Care home"
            className="flex items-center gap-3 group text-left"
          >
            <div className="w-10 h-10 rounded-2xl bg-[#0A1A2E] border border-teal-500/30 flex items-center justify-center p-1.5 shadow-sm group-hover:border-teal-400 group-hover:scale-105 transition-all">
              <CanopusLogo className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-white font-['Plus_Jakarta_Sans']">
                  Canopus Care
                </span>
              </div>
              <span className="text-[11px] text-slate-300 font-sans hidden xl:block font-medium tracking-wide">
                Coordinate. Care. Connect.
              </span>
            </div>
          </a>
        </div>

        {/* Center: Navigation Links */}
        <div className="hidden lg:flex items-center justify-center gap-1 xl:gap-2 text-xs font-semibold text-slate-300">
          {currentLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="px-3 py-1.5 rounded-xl hover:text-[#0FB8A6] hover:bg-slate-800/60 font-medium transition-all"
            >
              <span>{link.name}</span>
            </a>
          ))}
        </div>

        {/* Right: Actions & Status */}
        <div className="flex items-center gap-2.5 shrink-0">

          {/* Interactive Sandbox Toggle CTA */}
          <button
            onClick={() => onToggleSandboxMode?.()}
            className="hidden sm:inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#0FB8A6] hover:bg-[#0A8C7E] text-white text-xs font-mono font-bold transition-all shadow-xs"
          >
            {isInteractiveSandboxMode ? (
              <>
                <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                <span>Landing Page</span>
              </>
            ) : (
              <>
                <Building2 className="w-3.5 h-3.5" />
                <span>Reviewer Login</span>
              </>
            )}
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-xl bg-slate-900 text-slate-300 hover:text-[#0FB8A6] border border-slate-800 transition-colors"
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-300" />}
          </button>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 rounded-xl bg-slate-900 text-slate-300 border border-slate-800 hover:text-white"
            aria-label="Toggle Menu"
          >
            {mobileOpen ? <X className="w-5 h-5 text-[#0FB8A6]" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileOpen && (
        <div className="lg:hidden bg-[#0A1626] border-b border-slate-800 px-4 pt-3 pb-6 space-y-2 text-xs font-mono">
          <div className="grid grid-cols-2 gap-2 pt-2">
            {currentLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 hover:text-[#0FB8A6] flex items-center justify-between"
              >
                <span>{link.name}</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
              </a>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Engine: <strong className="text-[#0FB8A6]">{sandboxStatus.engine}</strong></span>
            <button
              onClick={() => {
                setMobileOpen(false);
                onToggleSandboxMode?.();
              }}
              className="text-[#0FB8A6] font-bold underline"
            >
              {isInteractiveSandboxMode ? 'View Landing Page' : 'Reviewer Login'}
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
