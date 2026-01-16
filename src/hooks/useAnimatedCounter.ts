import { useState, useEffect, useRef } from "react";

interface UseAnimatedCounterOptions {
  duration?: number;
  delay?: number;
}

export function useAnimatedCounter(
  endValue: number,
  options: UseAnimatedCounterOptions = {}
) {
  const { duration = 1500, delay = 0 } = options;
  const [count, setCount] = useState(0);
  const countRef = useRef(0);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const animate = (timestamp: number) => {
        if (startTimeRef.current === null) {
          startTimeRef.current = timestamp;
        }

        const progress = Math.min(
          (timestamp - startTimeRef.current) / duration,
          1
        );

        // Easing function for smooth animation
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const currentValue = Math.floor(easeOutQuart * endValue);

        if (currentValue !== countRef.current) {
          countRef.current = currentValue;
          setCount(currentValue);
        }

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setCount(endValue);
        }
      };

      requestAnimationFrame(animate);
    }, delay);

    return () => clearTimeout(timeout);
  }, [endValue, duration, delay]);

  return count;
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toLocaleString();
}

export function formatCurrency(num: number): string {
  if (num >= 1000000) {
    return "$" + (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return "$" + (num / 1000).toFixed(1) + "K";
  }
  return "$" + num.toLocaleString();
}