import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { Button } from './ui/button';
import { useTheme } from '../contexts/ThemeContext';

export default function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === 'light';

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      onClick={toggleTheme}
      className={`h-11 w-11 rounded-lg border-amber-500/70 text-amber-600 hover:bg-amber-500/10 [&_svg]:h-5 [&_svg]:w-5 ${className}`}
    >
      {isLight ? <Moon /> : <Sun />}
    </Button>
  );
}
