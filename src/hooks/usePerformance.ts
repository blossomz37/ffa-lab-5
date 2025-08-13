import { useEffect, useRef, useState } from 'react';

interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  memoryUsage?: number;
  isOptimized: boolean;
}

/**
 * Custom hook for monitoring component performance
 * Tracks load times, render times, and memory usage
 */
export function usePerformance(componentName: string) {
  const startTime = useRef<number>(Date.now());
  const renderCount = useRef<number>(0);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    loadTime: 0,
    renderTime: 0,
    isOptimized: true
  });

  useEffect(() => {
    const endTime = Date.now();
    const loadTime = endTime - startTime.current;
    renderCount.current += 1;

    // Get memory usage if available
    const memoryUsage = (performance as any).memory?.usedJSHeapSize;

    const newMetrics: PerformanceMetrics = {
      loadTime,
      renderTime: loadTime / renderCount.current,
      memoryUsage,
      isOptimized: loadTime < 1000 && renderCount.current < 10 // Arbitrary thresholds
    };

    setMetrics(newMetrics);

    // Log performance warnings in development
    if (process.env.NODE_ENV === 'development') {
      if (loadTime > 2000) {
        console.warn(`⚠️ Slow component load: ${componentName} took ${loadTime}ms`);
      }
      if (renderCount.current > 20) {
        console.warn(`⚠️ Excessive renders: ${componentName} rendered ${renderCount.current} times`);
      }
    }
  }, [componentName]);

  return metrics;
}

/**
 * Hook for debouncing values to reduce API calls
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook for optimizing API calls with caching
 */
export function useApiCache<T>(key: string, fetcher: () => Promise<T>, deps: any[] = []) {
  const cache = useRef<Map<string, { data: T; timestamp: number }>>(new Map());
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    
    const fetchData = async () => {
      // Check cache first (5 minute TTL)
      const cached = cache.current.get(key);
      if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
        setData(cached.data);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await fetcher();
        if (!cancelled) {
          setData(result);
          cache.current.set(key, { data: result, timestamp: Date.now() });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Unknown error'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [key, ...deps]);

  const invalidateCache = () => {
    cache.current.delete(key);
  };

  return { data, loading, error, invalidateCache };
}