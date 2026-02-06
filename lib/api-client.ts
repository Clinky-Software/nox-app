/**
 * Secure API Client for Nox Chat
 * Handles all HTTP requests with authentication and security measures
 */

import { API_BASE_URL } from './api-config';
import { authClient } from './auth-client';
import { 
  generateRequestSignature, 
  getDeviceFingerprint,
  apiRateLimiter,
  validateAppIntegrity,
} from './security';

interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  status: number;
}

class ApiClient {
  private initialized = false;

  getBaseUrl(): string {
    return API_BASE_URL;
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    
    try {
      // Validate app integrity on init
      if (!validateAppIntegrity()) {
        console.error('App integrity check failed');
        return;
      }
      
      this.initialized = true;
    } catch (error) {
      // Don't log sensitive details in production
      if (__DEV__) {
        console.error('Failed to initialize:', error);
      }
    }
  }

  // These methods are kept for backwards compatibility but now use authClient
  async setSessionCookie(_cookie: string): Promise<void> {
    // No-op: cookies are now managed by authClient
  }

  async clearSession(): Promise<void> {
    // No-op: session is now managed by authClient
  }

  private async getSecureHeaders(method: string, endpoint: string): Promise<HeadersInit> {
    const timestamp = Date.now();
    const signature = await generateRequestSignature(method, endpoint, timestamp);
    const fingerprint = await getDeviceFingerprint();
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Request-Time': timestamp.toString(),
      'X-Request-Signature': signature,
      'X-Device-ID': fingerprint.substring(0, 32), // Truncated for privacy
      'X-App-Version': '1.0.0',
    };
    
    // Get cookies from authClient (managed by better-auth)
    const cookies = authClient.getCookie();
    if (__DEV__) {
      console.log('[ApiClient] Cookies from authClient:', cookies ? 'present' : 'null/empty');
    }
    if (cookies) {
      headers['Cookie'] = cookies;
    }
    
    return headers;
  }

  private async handleRequest<T>(
    method: string,
    endpoint: string,
    body?: object
  ): Promise<ApiResponse<T>> {
    // Rate limiting check
    if (!apiRateLimiter.canAttempt('api')) {
      return {
        status: 429,
        error: 'Too many requests. Please wait.',
      };
    }
    apiRateLimiter.recordAttempt('api');

    try {
      const headers = await this.getSecureHeaders(method, endpoint);
      
      const config: RequestInit = {
        method,
        headers,
        credentials: 'omit', // We handle cookies manually via authClient
      };

      if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        config.body = JSON.stringify(body);
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
      // Cookies are managed by authClient, no need to extract here

      const data = await response.json().catch(() => null);

      return {
        data,
        status: response.status,
        error: !response.ok ? (data?.error || 'Request failed') : undefined,
      };
    } catch (error) {
      // Don't expose detailed errors in production
      return {
        status: 0,
        error: __DEV__ && error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.handleRequest<T>('GET', endpoint);
  }

  async post<T>(endpoint: string, body?: object): Promise<ApiResponse<T>> {
    return this.handleRequest<T>('POST', endpoint, body);
  }

  async put<T>(endpoint: string, body?: object): Promise<ApiResponse<T>> {
    return this.handleRequest<T>('PUT', endpoint, body);
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.handleRequest<T>('DELETE', endpoint);
  }
}

export const apiClient = new ApiClient();
export default apiClient;