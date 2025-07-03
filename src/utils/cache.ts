/**
 * Memoizes an async function, caching results by arguments
 *
 * @param fn - The async function to memoize
 * @returns Memoized function that caches results
 */
export function memoize<T>(fn: (...args: any[]) => Promise<T>) {
  const cache = new Map<string, Promise<T>>()

  return async (...args: any[]): Promise<T> => {
    const key = JSON.stringify(args) ?? 'default'
    if (cache.has(key)) {
      return cache.get(key)!
    }

    const promise = fn(...args)
    cache.set(key, promise)

    return promise
  }
}
