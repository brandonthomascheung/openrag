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
 * Get the base path from environment variable.
 * Defaults to /openrag-fe for CPD deployments.
 * Set NEXT_PUBLIC_BASE_PATH="" to disable the prefix.
 */
function getBasePath(): string {
  // Check if explicitly set to empty string (disabled)
  if (process.env.NEXT_PUBLIC_BASE_PATH === '') {
    return '';
  }
  
  // Use environment variable or default to /openrag-fe
  return process.env.NEXT_PUBLIC_BASE_PATH || '/openrag-fe';
}

/**
 * Constructs the full API URL with basePath prefix when needed.
 * 
 * @param path - The API path (e.g., "/api/tasks")
 * @returns The full URL with basePath prefix if configured
 * 
 * @example
 * // With default basePath
 * getApiUrl("/api/tasks") // => "/openrag-fe/api/tasks"
 * 
 * // With NEXT_PUBLIC_BASE_PATH=""
 * getApiUrl("/api/tasks") // => "/api/tasks"
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
