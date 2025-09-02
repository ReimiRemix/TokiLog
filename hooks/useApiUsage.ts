import { useState, useEffect, useCallback } from 'react';

const API_USAGE_KEY = 'geminiApiUsage';
const QUOTA_LIMIT = 250; // Free tier limit per day

interface ApiUsage {
  date: string;
  count: number;
}

export const useApiUsage = () => {
  const [usage, setUsage] = useState<ApiUsage>({ date: '', count: 0 });

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    try {
      const storedUsage = localStorage.getItem(API_USAGE_KEY);
      if (storedUsage) {
        const parsedUsage: ApiUsage = JSON.parse(storedUsage);
        if (parsedUsage.date === today) {
          setUsage(parsedUsage);
        } else {
          // Date has changed, reset the counter
          setUsage({ date: today, count: 0 });
          localStorage.setItem(API_USAGE_KEY, JSON.stringify({ date: today, count: 0 }));
        }
      } else {
        // No usage stored yet for today
        setUsage({ date: today, count: 0 });
      }
    } catch (error) {
      console.error("Failed to access localStorage for API usage:", error);
      // Fallback to in-memory state if localStorage is unavailable
      setUsage({ date: today, count: 0 });
    }
  }, []);

  const incrementUsage = useCallback(() => {
    setUsage(prevUsage => {
      const newCount = prevUsage.count + 1;
      const newUsage = { ...prevUsage, count: newCount };
      try {
        localStorage.setItem(API_USAGE_KEY, JSON.stringify(newUsage));
      } catch (error) {
        console.error("Failed to save API usage to localStorage:", error);
      }
      return newUsage;
    });
  }, []);

  const isQuotaExceeded = usage.count >= QUOTA_LIMIT;

  return {
    usageCount: usage.count,
    isQuotaExceeded,
    incrementUsage,
    QUOTA_LIMIT
  };
};
