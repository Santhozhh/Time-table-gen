import { useState, useEffect } from 'react';

/**
 * Persist a state value to localStorage so the component can restore it
 * across navigations / reloads.
 *
 * @param key Storage key (must be unique per component/usage)
 * @param defaultValue Fallback value when nothing is stored
 */
export function usePersistedState<T>(key: string, defaultValue: T | (() => T)) {
  const [state, setState] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        return JSON.parse(stored) as T;
      }
    } catch (err) {
      console.warn('Failed to parse localStorage for', key, err);
    }
    return typeof defaultValue === 'function' ? (defaultValue as () => T)() : defaultValue;
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (err) {
      console.warn('Failed to save to localStorage for', key, err);
    }
  }, [key, state]);

  return [state, setState] as const;
} 