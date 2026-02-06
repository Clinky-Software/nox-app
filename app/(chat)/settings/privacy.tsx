/**
 * Privacy & Security Settings Screen for Nox Chat
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import apiClient from '@/lib/api-client';

interface PrivacySettings {
  showOnlineStatus: boolean;
  showLastSeen: boolean;
  allowDMs: boolean;
  allowGroupInvites: boolean;
}

export default function PrivacyScreen() {
  const router = useRouter();
  const [settings, setSettings] = useState<PrivacySettings>({
    showOnlineStatus: true,
    showLastSeen: true,
    allowDMs: true,
    allowGroupInvites: true,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await apiClient.get('/api/user/privacy-settings');
      if (response.status === 200 && response.data) {
        setSettings({
          showOnlineStatus: response.data.showOnlineStatus ?? true,
          showLastSeen: response.data.showLastSeen ?? true,
          allowDMs: response.data.allowDMs ?? true,
          allowGroupInvites: response.data.allowGroupInvites ?? true,
        });
      }
    } catch (err) {
      // Use defaults if fetch fails
    } finally {
      setIsLoading(false);
    }
  };

  const updateSetting = async (key: keyof PrivacySettings, value: boolean) => {
    const previousValue = settings[key];
    setSettings(prev => ({ ...prev, [key]: value }));

    try {
      const response = await apiClient.put('/api/user/privacy-settings', {
        [key]: value,
      });

      if (response.status !== 200) {
        // Revert on failure
        setSettings(prev => ({ ...prev, [key]: previousValue }));
        Alert.alert('Error', 'Failed to update setting');
      }
    } catch (err) {
      setSettings(prev => ({ ...prev, [key]: previousValue }));
      Alert.alert('Error', 'Failed to update setting');
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirm Deletion',
              'Please type DELETE to confirm account deletion. This will permanently remove all your data.',
              [
                { text: 'Cancel', style: 'cancel' },
              ]
            );
          }
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy & Security</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Online Status */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Online Status</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Show Online Status</Text>
              <Text style={styles.settingDescription}>
                Let others see when you're online
              </Text>
            </View>
            <Switch
              value={settings.showOnlineStatus}
              onValueChange={(value) => updateSetting('showOnlineStatus', value)}
              trackColor={{ false: Colors.surfaceHover, true: Colors.primaryMuted }}
              thumbColor={settings.showOnlineStatus ? Colors.primary : Colors.textMuted}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Show Last Seen</Text>
              <Text style={styles.settingDescription}>
                Let others see when you were last active
              </Text>
            </View>
            <Switch
              value={settings.showLastSeen}
              onValueChange={(value) => updateSetting('showLastSeen', value)}
              trackColor={{ false: Colors.surfaceHover, true: Colors.primaryMuted }}
              thumbColor={settings.showLastSeen ? Colors.primary : Colors.textMuted}
            />
          </View>
        </Card>

        {/* Messages */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Messages</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Allow Direct Messages</Text>
              <Text style={styles.settingDescription}>
                Let anyone send you direct messages
              </Text>
            </View>
            <Switch
              value={settings.allowDMs}
              onValueChange={(value) => updateSetting('allowDMs', value)}
              trackColor={{ false: Colors.surfaceHover, true: Colors.primaryMuted }}
              thumbColor={settings.allowDMs ? Colors.primary : Colors.textMuted}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Allow Group Invites</Text>
              <Text style={styles.settingDescription}>
                Let others invite you to groups
              </Text>
            </View>
            <Switch
              value={settings.allowGroupInvites}
              onValueChange={(value) => updateSetting('allowGroupInvites', value)}
              trackColor={{ false: Colors.surfaceHover, true: Colors.primaryMuted }}
              thumbColor={settings.allowGroupInvites ? Colors.primary : Colors.textMuted}
            />
          </View>
        </Card>

        {/* Blocked Users */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Blocked Users</Text>
          
          <TouchableOpacity style={styles.linkRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Manage Blocked Users</Text>
              <Text style={styles.settingDescription}>
                View and unblock users you've blocked
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        </Card>

        {/* Danger Zone */}
        <Card style={[styles.section, styles.dangerSection]}>
          <Text style={styles.dangerTitle}>Danger Zone</Text>
          
          <TouchableOpacity style={styles.dangerButton} onPress={handleDeleteAccount}>
            <Ionicons name="trash-outline" size={20} color={Colors.error} />
            <Text style={styles.dangerButtonText}>Delete Account</Text>
          </TouchableOpacity>
          
          <Text style={styles.dangerWarning}>
            This action is irreversible. All your data, messages, and group memberships will be permanently deleted.
          </Text>
        </Card>
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
    width: 60,
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
    paddingTop: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: Spacing.lg,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  settingInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  settingLabel: {
    fontSize: FontSizes.md,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  settingDescription: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
  },
  dangerSection: {
    borderWidth: 1,
    borderColor: 'rgba(255, 92, 92, 0.2)',
    marginBottom: Spacing.xxl,
  },
  dangerTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.error,
    marginBottom: Spacing.lg,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  dangerButtonText: {
    fontSize: FontSizes.md,
    fontWeight: '500',
    color: Colors.error,
  },
  dangerWarning: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    marginTop: Spacing.md,
    lineHeight: 18,
  },
});
