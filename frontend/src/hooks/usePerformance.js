import { useEffect, useCallback, useMemo, useState } from 'react';

// Performance monitoring hook
export const usePerformance = (componentName) => {
  const startTime = useMemo(() => performance.now(), []);

  useEffect(() => {
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    if (renderTime > 100) { // Log slow renders (>100ms)
      console.warn(`🐌 Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`);
    }
    
    // Mark component render in performance timeline
    if (performance.mark) {
      performance.mark(`${componentName}-render-complete`);
    }
  }, [componentName, startTime]);

  return {
    startTime,
    markEvent: useCallback((eventName) => {
      if (performance.mark) {
        performance.mark(`${componentName}-${eventName}`);
      }
    }, [componentName])
  };
};

// Debounce hook for search inputs
export const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Intersection Observer hook for lazy loading
export const useIntersectionObserver = (options = {}) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [ref, setRef] = useState(null);

  useEffect(() => {
    if (!ref || !('IntersectionObserver' in window)) {
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, {
      threshold: 0.1,
      rootMargin: '50px',
      ...options
    });

    observer.observe(ref);

    return () => {
      observer.disconnect();
    };
  }, [ref, options]);

  return [setRef, isIntersecting];
};

// Virtual scrolling hook for large lists
export const useVirtualScroll = (items, itemHeight, containerHeight) => {
  const [scrollTop, setScrollTop] = useState(0);
  
  const visibleItems = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + 1,
      items.length
    );
    
    return items.slice(startIndex, endIndex).map((item, index) => ({
      ...item,
      index: startIndex + index,
      top: (startIndex + index) * itemHeight
    }));
  }, [items, itemHeight, containerHeight, scrollTop]);
  
  const totalHeight = items.length * itemHeight;
  
  const onScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);
  
  return {
    visibleItems,
    totalHeight,
    onScroll
  };
};

// Image lazy loading with blur effect
export const useImageLazyLoading = (src) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  
  useEffect(() => {
    if (!src) return;
    
    const img = new Image();
    img.onload = () => setLoaded(true);
    img.onerror = () => setError(true);
    img.src = src;
  }, [src]);
  
  return { loaded, error };
};

// Memory usage monitoring (development only)
export const useMemoryMonitor = (componentName) => {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development' || !performance.memory) {
      return;
    }
    
    const checkMemory = () => {
      const memory = performance.memory;
      const usedMB = Math.round(memory.usedJSHeapSize / 1048576);
      const limitMB = Math.round(memory.jsHeapSizeLimit / 1048576);
      
      if (usedMB > limitMB * 0.8) { // Warn at 80% memory usage
        console.warn(`🧠 High memory usage in ${componentName}: ${usedMB}MB / ${limitMB}MB`);
      }
    };
    
    const interval = setInterval(checkMemory, 5000); // Check every 5 seconds
    
    return () => clearInterval(interval);
  }, [componentName]);
};