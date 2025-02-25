export function useThrottle<T extends (...args: any[]) => void>(
  func: T,
  limit: number
): T {
  let inThrottle: boolean;
  let lastResult: any;

  return ((...args: any[]) => {
    if (!inThrottle) {
      inThrottle = true;
      lastResult = func(...args);
      setTimeout(() => (inThrottle = false), limit);
    }
    return lastResult;
  }) as T;
}
