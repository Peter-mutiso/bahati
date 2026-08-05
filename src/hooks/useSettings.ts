import { useState, useEffect } from 'react';

interface Settings {
  notificationsEnabled: boolean;
  performanceMode: boolean;
  theme: 'dark' | 'light';
}

export const useSettings = () => {
  const [settings, setSettings] = useState<Settings>(() => ({
    notificationsEnabled: localStorage.getItem('notificationsEnabled') !== 'false',
    performanceMode: localStorage.getItem('performanceMode') === 'true',
    theme: (localStorage.getItem('theme') || 'dark') as 'dark' | 'light',
  }));

  useEffect(() => {
    const handleSettingsChange = () => {
      setSettings({
        notificationsEnabled: localStorage.getItem('notificationsEnabled') !== 'false',
        performanceMode: localStorage.getItem('performanceMode') === 'true',
        theme: (localStorage.getItem('theme') || 'dark') as 'dark' | 'light',
      });
    };

    window.addEventListener('settingsChanged', handleSettingsChange);
    return () => window.removeEventListener('settingsChanged', handleSettingsChange);
  }, []);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(settings.theme);
  }, [settings.theme]);

  // Apply performance mode
  useEffect(() => {
    if (settings.performanceMode) {
      document.documentElement.classList.add('performance-mode');
    } else {
      document.documentElement.classList.remove('performance-mode');
    }
  }, [settings.performanceMode]);

  return settings;
};
