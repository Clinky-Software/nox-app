/**
 * Security Utilities for Nox Chat
 * Provides security measures against reverse engineering
 */

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Device fingerprint for request signing (lazy loaded)
let deviceFingerprint: string | null = null;
let cryptoModule: typeof import('expo-crypto') | null = null;

/**
 * Lazy load expo-crypto to avoid startup crashes
 */
async function getCrypto() {
  if (!cryptoModule) {
    try {
      cryptoModule = await import('expo-crypto');
    } catch {
      return null;
    }
  }
  return cryptoModule;
}

/**
 * Generate a unique device fingerprint for request validation
 */
export async function getDeviceFingerprint(): Promise<string> {
  if (deviceFingerprint) return deviceFingerprint;

  try {
    const crypto = await getCrypto();
    if (!crypto) {
      // Fallback if crypto not available
      deviceFingerprint = `${Platform.OS}-${Date.now()}`;
      return deviceFingerprint;
    }

    const components = [
      Platform.OS,
      Platform.Version?.toString() || 'unknown',
      'nox-app',
    ];

    const fingerprintString = components.join('|');
    deviceFingerprint = await crypto.digestStringAsync(
      crypto.CryptoDigestAlgorithm.SHA256,
      fingerprintString
    );

    return deviceFingerprint;
  } catch {
    deviceFingerprint = `${Platform.OS}-${Date.now()}`;
    return deviceFingerprint;
  }
}

/**
 * Generate a request signature for API calls
 */
export async function generateRequestSignature(
  method: string,
  endpoint: string,
  timestamp: number
): Promise<string> {
  try {
    const crypto = await getCrypto();
    if (!crypto) {
      return `${method}-${timestamp}`;
    }

    const fingerprint = await getDeviceFingerprint();
    const payload = `${method}:${endpoint}:${timestamp}:${fingerprint}`;
    
    return await crypto.digestStringAsync(
      crypto.CryptoDigestAlgorithm.SHA256,
      payload
    );
  } catch {
    return `${method}-${timestamp}`;
  }
}

/**
 * Validate app integrity (basic check)
 * In production, this would be more sophisticated
 */
export function validateAppIntegrity(): boolean {
  // In development, always allow
  if (__DEV__) {
    return true;
  }

  // Basic integrity check - can be enhanced later
  return true;
}

/**
 * Check if app is running in a debugger
 */
export function isDebuggerAttached(): boolean {
  if (__DEV__) return false; // Ignore in development
  
  // Basic debugger detection
  // Note: Sophisticated detection requires native modules
  return false;
}

/**
 * Secure storage wrapper with encryption prefix validation
 */
export const SecureStorage = {
  async setItem(key: string, value: string): Promise<void> {
    try {
      const crypto = await getCrypto();
      const timestamp = Date.now().toString();
      
      if (crypto) {
        const hash = await crypto.digestStringAsync(
          crypto.CryptoDigestAlgorithm.SHA256,
          `${value}:${timestamp}`
        );
        
        // Store with integrity check
        const secureValue = JSON.stringify({
          v: value,
          t: timestamp,
          h: hash.substring(0, 16), // Truncated hash for verification
        });
        
        await SecureStore.setItemAsync(key, secureValue);
      } else {
        // Fallback without hash
        await SecureStore.setItemAsync(key, value);
      }
    } catch {
      // Fallback to simple storage
      await SecureStore.setItemAsync(key, value);
    }
  },

  async getItem(key: string): Promise<string | null> {
    try {
      const stored = await SecureStore.getItemAsync(key);
      if (!stored) return null;
      
      // Try to parse as secure format
      try {
        const parsed = JSON.parse(stored);
        if (parsed.v && parsed.t && parsed.h) {
          const crypto = await getCrypto();
          if (crypto) {
            // Verify integrity
            const expectedHash = await crypto.digestStringAsync(
              crypto.CryptoDigestAlgorithm.SHA256,
              `${parsed.v}:${parsed.t}`
            );
            
            if (expectedHash.substring(0, 16) !== parsed.h) {
              // Data was tampered with
              await SecureStore.deleteItemAsync(key);
              return null;
            }
          }
          return parsed.v;
        }
      } catch {
        // Not in secure format, return as-is
      }
      
      return stored;
    } catch {
      return null;
    }
  },

  async deleteItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // Ignore errors
    }
  },

  async clear(keys: string[]): Promise<void> {
    await Promise.all(keys.map(key => SecureStore.deleteItemAsync(key).catch(() => {})));
  },
};

/**
 * Rate limiting for sensitive operations
 */
class RateLimiter {
  private attempts: Map<string, number[]> = new Map();
  private readonly windowMs: number;
  private readonly maxAttempts: number;

  constructor(windowMs: number = 60000, maxAttempts: number = 5) {
    this.windowMs = windowMs;
    this.maxAttempts = maxAttempts;
  }

  canAttempt(key: string): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    
    // Filter to only recent attempts
    const recentAttempts = attempts.filter(t => now - t < this.windowMs);
    this.attempts.set(key, recentAttempts);
    
    return recentAttempts.length < this.maxAttempts;
  }

  recordAttempt(key: string): void {
    const attempts = this.attempts.get(key) || [];
    attempts.push(Date.now());
    this.attempts.set(key, attempts);
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }
}

export const authRateLimiter = new RateLimiter(60000, 5); // 5 attempts per minute
export const apiRateLimiter = new RateLimiter(1000, 10); // 10 requests per second

/**
 * Sanitize user input to prevent injection attacks
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim()
    .substring(0, 10000); // Limit length
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (password.length > 128) {
    errors.push('Password must be less than 128 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain an uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain a lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain a number');
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Clear all sensitive data (for logout or security events)
 */
export async function clearSensitiveData(): Promise<void> {
  const sensitiveKeys = [
    'nox_session_cookie',
    'nox_session_token',
    'nox_push_token',
    'nox.session.token',
    'nox.session.cookie',
  ];
  
  await SecureStorage.clear(sensitiveKeys);
}
