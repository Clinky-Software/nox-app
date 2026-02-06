/**
 * API Configuration for Nox Chat
 * Configuration is environment-aware and minimizes exposed endpoints
 */

// Production URL
export const API_BASE_URL = 'https://noxchat.xyz';

// Endpoint paths
const AUTH_PREFIX = '/api/auth';
const API_PREFIX = '/api';

export const API_ENDPOINTS = {
  // Auth - paths constructed to avoid easy string searching
  signIn: `${AUTH_PREFIX}/sign-in/email`,
  signUp: `${AUTH_PREFIX}/sign-up/email`,
  signOut: `${AUTH_PREFIX}/sign-out`,
  session: `${AUTH_PREFIX}/get-session`,
  
  // User
  profile: `${API_PREFIX}/user/profile`,
  updateProfile: `${API_PREFIX}/user/profile`,
  nickname: `${API_PREFIX}/user/nickname`,
  
  // Groups
  groups: `${API_PREFIX}/groups`,
  joinGroup: `${API_PREFIX}/groups/join`,
  groupPreview: `${API_PREFIX}/groups/preview`,
  
  // DMs
  dms: `${API_PREFIX}/dms`,
  
  // Messages
  messages: `${API_PREFIX}/messages`,
  
  // Pin
  pin: `${API_PREFIX}/pin`,
  
  // SSE
  sse: `${API_PREFIX}/sse`,
} as const;

// Freeze to prevent modification
Object.freeze(API_ENDPOINTS);

export const getApiUrl = (endpoint: string): string => `${API_BASE_URL}${endpoint}`;

