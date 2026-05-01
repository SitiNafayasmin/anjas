'use client';

import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const storedTheme = localStorage.getItem('9router_theme');
    const initialTheme = storedTheme === 'dark' ? 'dark' : 'light';
    setTheme(initialTheme);
    document.documentElement.dataset.theme = initialTheme;
  }, []);

  function toggleTheme() {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('9router_theme', nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  }

  return (
    <button className="theme-toggle" onClick={toggleTheme} type="button">
      {theme === 'dark' ? '☀ Light' : '☾ Dark'}
    </button>
  );
}
