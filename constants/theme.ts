/**
 * Nox Chat Color Scheme
 * Inspired by the SecureChat logo - security, anonymity, and clarity
 */

import { Platform } from 'react-native';

export const Colors = {
  // Primary accent color - Neon Green
  primary: '#00FF9A',
  primaryDark: '#00D084',
  
  // Core backgrounds (Dark theme)
  background: '#0B0F0D',      // Deep black
  surface: '#111816',          // Dark charcoal (cards)
  surfaceElevated: '#17211D',  // Graphite (elevated surfaces)
  
  // Text colors
  text: '#FFFFFF',             // Primary text - Pure white
  textSecondary: '#9FB5AD',    // Secondary text - Soft gray
  textMuted: '#6B7D75',        // Muted text
  
  // Borders and dividers
  border: 'rgba(255, 255, 255, 0.08)',
  borderLight: 'rgba(255, 255, 255, 0.12)',
  divider: '#1E2B26',
  
  // Input fields
  input: 'rgba(255, 255, 255, 0.12)',
  inputBorder: 'rgba(255, 255, 255, 0.08)',
  inputFocused: '#00FF9A',
  
  // Status colors
  success: '#00FF9A',
  error: '#FF5C5C',
  warning: '#FFB84D',
  info: '#4DA6FF',
  
  // Online status
  online: '#00FF9A',
  offline: '#6B7D75',
  away: '#FFB84D',
  
  // Misc
  overlay: 'rgba(0, 0, 0, 0.5)',
  shadow: 'rgba(0, 0, 0, 0.3)',
  
  // Message bubbles
  messageSent: '#00FF9A',
  messageReceived: '#1E2B26',
  messageSentText: '#0B0F0D',
  messageReceivedText: '#FFFFFF',
};

// Light theme (for reference, but app is dark-first)
export const ColorsLight = {
  primary: '#00FF9A',
  primaryDark: '#00D084',
  
  background: '#F5FFFA',       // Soft Mint White
  surface: '#E6EDE9',          // Light Gray
  surfaceElevated: '#FFFFFF',
  
  text: '#0A0F0D',             // Almost Black
  textSecondary: '#4B5C55',    // Dark Gray
  textMuted: '#7A8A84',
  
  border: 'rgba(0, 0, 0, 0.08)',
  borderLight: 'rgba(0, 0, 0, 0.12)',
  divider: '#C3DAD1',
  
  input: 'rgba(0, 0, 0, 0.05)',
  inputBorder: 'rgba(0, 0, 0, 0.12)',
  inputFocused: '#00D084',
  
  success: '#00D084',
  error: '#E5533D',
  warning: '#E5A02D',
  info: '#3D8CE5',
  
  online: '#00D084',
  offline: '#9FB5AD',
  away: '#E5A02D',
  
  overlay: 'rgba(0, 0, 0, 0.3)',
  shadow: 'rgba(0, 0, 0, 0.1)',
  
  messageSent: '#00D084',
  messageReceived: '#E6EDE9',
  messageSentText: '#FFFFFF',
  messageReceivedText: '#0A0F0D',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  full: 9999,
};

export const FontSizes = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 20,
  xxxl: 24,
  heading: 28,
  title: 32,
};

export const FontWeights = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const Fonts = Platform.select({
  ios: {
    sans: 'System',
    mono: 'Menlo',
  },
  android: {
    sans: 'Roboto',
    mono: 'monospace',
  },
  default: {
    sans: 'System',
    mono: 'monospace',
  },
});

export default Colors;
