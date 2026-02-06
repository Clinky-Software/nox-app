/**
 * Badge Component for Nox Chat
 * Small label for notifications and status
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, BorderRadius, FontSizes, Spacing } from '@/constants/theme';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'destructive' | 'outline';
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export function Badge({ children, variant = 'default', size = 'sm', style }: BadgeProps) {
  return (
    <View style={[styles.badge, styles[variant], styles[`size_${size}`], style]}>
      <Text style={[styles.text, styles[`text_${variant}`], styles[`textSize_${size}`]]}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  
  // Variants
  default: {
    backgroundColor: Colors.surface,
  },
  primary: {
    backgroundColor: Colors.primary,
  },
  destructive: {
    backgroundColor: Colors.error,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  
  // Sizes
  size_sm: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    minWidth: 18,
  },
  size_md: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  
  // Text
  text: {
    textAlign: 'center',
    fontWeight: '600',
  },
  text_default: {
    color: Colors.text,
  },
  text_primary: {
    color: Colors.background,
  },
  text_destructive: {
    color: Colors.text,
  },
  text_outline: {
    color: Colors.text,
  },
  textSize_sm: {
    fontSize: FontSizes.xs,
  },
  textSize_md: {
    fontSize: FontSizes.sm,
  },
});

export default Badge;
