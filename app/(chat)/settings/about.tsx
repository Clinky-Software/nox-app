/**
 * About Screen for Nox Chat
 * App information and credits
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import Constants from 'expo-constants';

interface AboutItemProps {
  label: string;
  value: string;
  onPress?: () => void;
}

function AboutItem({ label, value, onPress }: AboutItemProps) {
  const Container = onPress ? TouchableOpacity : View;
  return (
    <Container style={styles.aboutItem} onPress={onPress}>
      <Text style={styles.aboutLabel}>{label}</Text>
      <View style={styles.aboutValueContainer}>
        <Text style={[styles.aboutValue, onPress && styles.aboutValueLink]}>
          {value}
        </Text>
        {onPress && (
          <Ionicons name="open-outline" size={16} color={Colors.primary} />
        )}
      </View>
    </Container>
  );
}

interface LinkItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  url: string;
}

function LinkItem({ icon, label, url }: LinkItemProps) {
  return (
    <TouchableOpacity 
      style={styles.linkItem}
      onPress={() => Linking.openURL(url)}
    >
      <View style={styles.linkIcon}>
        <Ionicons name={icon} size={20} color={Colors.textSecondary} />
      </View>
      <Text style={styles.linkLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}

export default function AboutScreen() {
  const router = useRouter();
  
  const appVersion = Constants.expoConfig?.version || '1.0.0';
  const buildNumber = Constants.expoConfig?.ios?.buildNumber || 
                      Constants.expoConfig?.android?.versionCode?.toString() || '1';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* App Logo and Name */}
        <View style={styles.logoSection}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>N</Text>
          </View>
          <Text style={styles.appName}>Nox Chat</Text>
          <Text style={styles.appTagline}>Secure Messaging</Text>
        </View>

        {/* Version Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Information</Text>
          <View style={styles.infoCard}>
            <AboutItem label="Version" value={appVersion} />
            <View style={styles.divider} />
            <AboutItem label="Build" value={buildNumber} />
            <View style={styles.divider} />
            <AboutItem label="Platform" value="React Native + Expo" />
          </View>
        </View>

        {/* Links */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resources</Text>
          <View style={styles.linksCard}>
            <LinkItem
              icon="globe-outline"
              label="Website"
              url="https://noxchat.xyz"
            />
            <View style={styles.divider} />
            <LinkItem
              icon="document-text-outline"
              label="Terms of Service"
              url="https://noxchat.xyz/terms"
            />
            <View style={styles.divider} />
            <LinkItem
              icon="shield-checkmark-outline"
              label="Privacy Policy"
              url="https://noxchat.xyz/privacy"
            />
          </View>
        </View>

        {/* Credits */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Credits</Text>
          <View style={styles.creditsCard}>
            <Text style={styles.creditsText}>
              Nox Chat is built with love using React Native, Expo, and modern web technologies.
            </Text>
            <Text style={styles.creditsText}>
              Special thanks to the open-source community and all our users.
            </Text>
          </View>
        </View>

        {/* Copyright */}
        <View style={styles.copyright}>
          <Text style={styles.copyrightText}>
            © {new Date().getFullYear()} Nox Chat
          </Text>
          <Text style={styles.copyrightText}>
            All rights reserved.
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
  },
  logoSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  logoText: {
    fontSize: 40,
    fontWeight: '800',
    color: Colors.background,
  },
  appName: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    color: Colors.text,
  },
  appTagline: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  infoCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  linksCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  creditsCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  creditsText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  aboutItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  aboutLabel: {
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  aboutValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  aboutValue: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  aboutValueLink: {
    color: Colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: Spacing.lg,
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  linkIcon: {
    width: 32,
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  linkLabel: {
    flex: 1,
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  copyright: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },
  copyrightText: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
  },
});
