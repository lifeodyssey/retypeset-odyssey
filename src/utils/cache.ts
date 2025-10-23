/**
 * Memoizes an async function, caching results by arguments
 *
 * @param fn - The async function to memoize
 * @returns Memoized function that caches results
 */
export function memoize<F extends (...args: any[]) => Promise<any>>(fn: F): (...args: Parameters<F>) => ReturnType<F> {
  const cache = new Map<string, ReturnType<F>>()

  return (...args: Parameters<F>): ReturnType<F> => {
    // Generate cache key from function arguments
    const key = JSON.stringify(args)

    // Return cached promise if it exists
    if (cache.has(key)) {
      return cache.get(key)!
    }

    // Execute the original function and cache the promise
    const promise = fn(...args) as ReturnType<F>
    cache.set(key, promise)

    // Remove failed promises from cache to allow retry
    promise.catch(() => {
      cache.delete(key)
    })

    return promise
  }
}
