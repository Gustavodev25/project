/**
 * API Configuration
 * Centralizes API endpoint configuration and fetch wrapper
 */

// Get backend URL from environment variable
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';

// Log configuration on initialization (client-side only)
if (typeof window !== 'undefined') {
    console.log('[API_CONFIG] Backend URL:', BACKEND_URL || '(vazio - usando proxy local)');
    console.log('[API_CONFIG] NEXT_PUBLIC_BACKEND_URL:', process.env.NEXT_PUBLIC_BACKEND_URL);
    console.log('[API_CONFIG] NODE_ENV:', process.env.NODE_ENV);
}

/**
 * API Configuration object
 */
export const API_CONFIG = {
    /**
     * Base URL for API requests
     * Empty string means use relative URLs (local Next.js API routes)
     */
    baseURL: BACKEND_URL,

    /**
     * Get full API URL for a given path
     * @param path - API path (e.g., '/api/auth/login')
     * @returns Full URL or relative path
     */
    getApiUrl(path: string): string {
        // Remove leading slash if present to avoid double slashes
        const cleanPath = path.startsWith('/') ? path.slice(1) : path;

        if (this.baseURL) {
            // Use external backend URL
            return `${this.baseURL}/${cleanPath}`;
        }

        // Use local Next.js API routes (relative path)
        return `/${cleanPath}`;
    },

    /**
     * Wrapper around fetch that automatically uses the correct base URL
     * @param path - API path
     * @param options - Fetch options
     * @returns Fetch response
     */
    async fetch(path: string, options: RequestInit = {}): Promise<Response> {
        const url = this.getApiUrl(path);

        // Always include credentials for cookie-based auth
        const fetchOptions: RequestInit = {
            ...options,
            credentials: options.credentials || 'include',
        };

        // If using external backend, ensure proper headers
        if (this.baseURL) {
            fetchOptions.headers = {
                ...fetchOptions.headers,
            };
        }

        return fetch(url, fetchOptions);
    },
};
