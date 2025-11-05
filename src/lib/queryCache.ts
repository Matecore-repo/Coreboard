/**
 * Sistema de caché compartido para consultas a Supabase
 * Evita consultas duplicadas cuando múltiples componentes solicitan los mismos datos
 */

type CacheEntry<T> = {
  data: T;
  timestamp: number;
  promise?: Promise<T>;
};

type CacheStore = Map<string, CacheEntry<any>>;

// Store global fuera de React
const cache: CacheStore = new Map();

// Tiempo de expiración del caché (5 segundos)
const CACHE_TTL = 5000;

/**
 * Obtiene datos del caché si son válidos, o null si no hay caché o está expirado
 */
function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  
  const age = Date.now() - entry.timestamp;
  if (age > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  
  return entry.data as T;
}

/**
 * Guarda datos en el caché
 */
function setCached<T>(key: string, data: T): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
  });
}

/**
 * Obtiene o espera una promesa pendiente para la misma clave
 * Esto deduplica consultas simultáneas
 */
function getPendingPromise<T>(key: string): Promise<T> | null {
  const entry = cache.get(key);
  return entry?.promise || null;
}

/**
 * Guarda una promesa pendiente para deduplicar consultas simultáneas
 */
function setPendingPromise<T>(key: string, promise: Promise<T>): void {
  const existing = cache.get(key);
  cache.set(key, {
    data: existing?.data || null,
    timestamp: existing?.timestamp || Date.now(),
    promise,
  });
}

/**
 * Elimina la promesa pendiente después de que se resuelve
 */
function clearPendingPromise(key: string): void {
  const entry = cache.get(key);
  if (entry) {
    entry.promise = undefined;
  }
}

/**
 * Invalida el caché para una clave específica
 */
export function invalidateCache(key: string): void {
  cache.delete(key);
}

/**
 * Invalida todas las entradas del caché que coincidan con un patrón
 */
export function invalidateCachePattern(pattern: string): void {
  const keysToDelete: string[] = [];
  for (const key of cache.keys()) {
    if (key.startsWith(pattern)) {
      keysToDelete.push(key);
    }
  }
  keysToDelete.forEach(key => cache.delete(key));
}

/**
 * Obtiene o ejecuta una consulta con caché y deduplicación
 * Si hay datos válidos en caché, los retorna inmediatamente
 * Si hay una consulta pendiente, espera a esa promesa
 * Si no hay caché ni consulta pendiente, ejecuta la función y guarda el resultado
 */
export async function queryWithCache<T>(
  key: string,
  queryFn: () => Promise<T>
): Promise<T> {
  // 1. Verificar si hay datos válidos en caché
  const cached = getCached<T>(key);
  if (cached !== null) {
    return cached;
  }
  
  // 2. Verificar si hay una consulta pendiente para la misma clave
  const pending = getPendingPromise<T>(key);
  if (pending) {
    return pending;
  }
  
  // 3. Ejecutar la consulta y guardar la promesa
  const promise = queryFn().then((data) => {
    setCached(key, data);
    clearPendingPromise(key);
    return data;
  }).catch((error) => {
    clearPendingPromise(key);
    throw error;
  });
  
  setPendingPromise(key, promise);
  return promise;
}

/**
 * Limpia todo el caché
 */
export function clearCache(): void {
  cache.clear();
}

