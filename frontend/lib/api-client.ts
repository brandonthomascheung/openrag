/**
 * Centralized API client utility for handling basePath-aware API requests.
 * 
 * This utility ensures API calls work correctly in both:
 * - Local development (no basePath prefix)
 * - CPD deployment (with /openrag-fe basePath prefix)
 * 
 * Usage:
 *   import { apiClient, getApiUrl } from "@/lib/api-client";
 * 
 *   // Option 1: Use apiClient wrapper
 *   const response = await apiClient("/api/tasks");
 * 
 *   // Option 2: Use getApiUrl for custom fetch
 *   const response = await fetch(getApiUrl("/api/tasks"), { method: "POST" });
 */

/**
 * Get the base path from runtime configuration or build-time environment.
 * Priority:
 * 1. Runtime config from window.__RUNTIME_CONFIG__ (set by entrypoint script)
 * 2. Build-time NEXT_PUBLIC_BASE_PATH environment variable
 * 3. Empty string (no basePath)
 */
function getBasePath(): string {
  // Runtime config (for containerized deployments)
  if (typeof window !== 'undefined' && (window as any).__RUNTIME_CONFIG__?.basePath) {
    return (window as any).__RUNTIME_CONFIG__.basePath;
  }
  
  // Build-time environment variable (for local dev)
  return process.env.NEXT_PUBLIC_BASE_PATH || '';
}

/**
 * Constructs the full API URL with basePath prefix when needed.
 * 
 * @param path - The API path (e.g., "/api/tasks")
 * @returns The full URL with basePath prefix if configured
 * 
 * @example
 * // Local dev (no basePath)
 * getApiUrl("/api/tasks") // => "/api/tasks"
 * 
 * // CPD deployment (with basePath)
 * getApiUrl("/api/tasks") // => "/openrag-fe/api/tasks"
 */
export function getApiUrl(path: string): string {
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  const basePath = getBasePath();
  
  // If no basePath configured, return path as-is
  if (!basePath) {
    return normalizedPath;
  }
  
  // Combine basePath with path
  return `${basePath}${normalizedPath}`;
}

/**
 * Fetch wrapper that automatically applies basePath prefix to API calls.
 * 
 * @param path - The API path (e.g., "/api/tasks")
 * @param init - Optional fetch init options
 * @returns Promise resolving to the fetch Response
 * 
 * @example
 * // GET request
 * const response = await apiClient("/api/tasks");
 * 
 * // POST request with body
 * const response = await apiClient("/api/tasks", {
 *   method: "POST",
 *   headers: { "Content-Type": "application/json" },
 *   body: JSON.stringify({ name: "My Task" })
 * });
 */
export async function apiClient(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const url = getApiUrl(path);
  return fetch(url, init);
}