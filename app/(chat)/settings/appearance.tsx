/**
 * Appearance Settings Screen for Nox Chat
 * Theme selection and display preferences
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';

type ThemeOption = 'system' | 'light' | 'dark';

interface ThemeItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  selected: boolean;
  onPress: () => void;
}

function ThemeItem({ icon, label, description, selected, onPress }: ThemeItemProps) {
  return (
    <TouchableOpacity 
      style={[styles.themeItem, selected && styles.themeItemSelected]} 
      onPress={onPress}
    >
      <View style={[styles.themeIcon, selected && styles.themeIconSelected]}>
        <Ionicons
          name={icon}
          size={24}
          color={selected ? Colors.primary : Colors.textSecondary}
        />
      </View>
      <View style={styles.themeInfo}>
        <Text style={[styles.themeLabel, selected && styles.themeLabelSelected]}>
          {label}
        </Text>
        <Text style={styles.themeDescription}>{description}</Text>
      </View>
      {selected && (
        <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
      )}
    </TouchableOpacity>
  );
}

export default function AppearanceScreen() {
  const router = useRouter();
  const systemColorScheme = useColorScheme();
  // For now, we store this locally. In a full implementation, you'd use AsyncStorage
  const [theme, setTheme] = useState<ThemeOption>('system');

  const handleThemeChange = (newTheme: ThemeOption) => {
    setTheme(newTheme);
    // In a full implementation, you would:
    // 1. Save to AsyncStorage
    // 2. Update a global theme context
    // For now, the app follows the system theme
  };

  const getCurrentThemeDescription = () => {
    if (theme === 'system') {
      return `Currently using ${systemColorScheme === 'dark' ? 'dark' : 'light'} mode`;
    }
    return '';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Appearance</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Theme</Text>
          <Text style={styles.sectionDescription}>
            Choose how Nox looks on your device.
            {theme === 'system' && ` ${getCurrentThemeDescription()}`}
          </Text>
          
          <View style={styles.themeList}>
            <ThemeItem
              icon="phone-portrait-outline"
              label="System"
              description="Match your device settings"
              selected={theme === 'system'}
              onPress={() => handleThemeChange('system')}
            />
            <ThemeItem
              icon="sunny-outline"
              label="Light"
              description="Light background with dark text"
              selected={theme === 'light'}
              onPress={() => handleThemeChange('light')}
            />
            <ThemeItem
              icon="moon-outline"
              label="Dark"
              description="Dark background with light text"
              selected={theme === 'dark'}
              onPress={() => handleThemeChange('dark')}
            />
          </View>
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={18} color={Colors.textMuted} />
          <Text style={styles.infoText}>
            The app currently uses the dark theme. Theme switching will be available in a future update.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  section: {
    paddingVertical: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  sectionDescription: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  themeList: {
    gap: Spacing.sm,
  },
  themeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  themeItemSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  themeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  themeIconSelected: {
    backgroundColor: Colors.primary + '20',
  },
  themeInfo: {
    flex: 1,
  },
  themeLabel: {
    fontSize: FontSizes.md,
    fontWeight: '500',
    color: Colors.text,
  },
  themeLabelSelected: {
    color: Colors.primary,
  },
  themeDescription: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xl,
  },
  infoText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    lineHeight: 18,
  },
});
