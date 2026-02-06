/**
 * Avatar Component for Nox Chat
 * User avatar with fallback to initials
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Colors, BorderRadius, FontSizes } from '@/constants/theme';
import { API_BASE_URL } from '@/lib/api-config';

interface AvatarProps {
  source?: string | null;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  style?: ViewStyle;
  showOnline?: boolean;
  isOnline?: boolean;
}

const SIZES = {
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
};

const FONT_SIZES = {
  sm: FontSizes.xs,
  md: FontSizes.sm,
  lg: FontSizes.md,
  xl: FontSizes.lg,
};

// Helper to get the full image URL
const getImageUrl = (source?: string | null): string | null => {
  if (!source) return null;
  
  // If it's already a full URL, return as-is
  if (source.startsWith('http://') || source.startsWith('https://')) {
    return source;
  }
  
  // If it starts with /, prepend the API base URL
  if (source.startsWith('/')) {
    return `${API_BASE_URL}${source}`;
  }
  
  // Otherwise, assume it's a relative path
  return `${API_BASE_URL}/${source}`;
};

export function Avatar({ source, name, size = 'md', style, showOnline, isOnline }: AvatarProps) {
  const dimension = SIZES[size];
  const fontSize = FONT_SIZES[size];
  const imageUrl = getImageUrl(source);
  
  const getInitials = (name?: string) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  return (
    <View style={[styles.container, { width: dimension, height: dimension }, style]}>
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={[
            styles.image,
            { width: dimension, height: dimension, borderRadius: dimension / 2 },
          ]}
          contentFit="cover"
          transition={200}
          placeholder={null}
          onError={() => {
            // Image failed to load, will show fallback
          }}
        />
      ) : (
        <View
          style={[
            styles.fallback,
            { width: dimension, height: dimension, borderRadius: dimension / 2 },
          ]}
        >
          <Text style={[styles.initials, { fontSize }]}>{getInitials(name)}</Text>
        </View>
      )}
      
      {showOnline && (
        <View
          style={[
            styles.status,
            { backgroundColor: isOnline ? Colors.online : Colors.offline },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  image: {
    backgroundColor: Colors.surface,
  },
  fallback: {
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  initials: {
    color: Colors.primary,
    fontWeight: '600',
  },
  status: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.background,
  },
});

export default Avatar;
