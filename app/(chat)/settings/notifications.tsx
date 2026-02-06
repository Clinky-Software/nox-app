/**
 * Notifications Settings Screen for Nox Chat
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
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import { useChat } from '@/lib/chat-context';
import { notificationService, NotificationSettings } from '@/lib/notification-service';

export default function NotificationsScreen() {
  const router = useRouter();
  const { groups } = useChat();
  
  const [settings, setSettings] = useState<NotificationSettings>({
    enabled: true,
    sound: true,
    vibration: true,
    dmNotifications: true,
    groupNotifications: true,
    mentionNotifications: true,
    mutedGroups: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await notificationService.getSettings();
      setSettings(savedSettings);
    } catch (err) {
      // Use defaults
    } finally {
      setIsLoading(false);
    }
  };

  const updateSetting = async (key: keyof NotificationSettings, value: boolean) => {
    const updatedSettings = { ...settings, [key]: value };
    setSettings(updatedSettings);
    await notificationService.saveSettings(updatedSettings);
  };

  const toggleGroupMute = async (groupId: string) => {
    const isMuted = settings.mutedGroups.includes(groupId);
    let updatedMutedGroups: string[];
    
    if (isMuted) {
      await notificationService.unmuteGroup(groupId);
      updatedMutedGroups = settings.mutedGroups.filter(id => id !== groupId);
    } else {
      await notificationService.muteGroup(groupId);
      updatedMutedGroups = [...settings.mutedGroups, groupId];
    }
    
    setSettings(prev => ({
      ...prev,
      mutedGroups: updatedMutedGroups,
    }));
  };

  const handleEnableNotifications = async () => {
    const success = await notificationService.registerForPushNotifications();
    if (success) {
      updateSetting('enabled', true);
      Alert.alert('Success', 'Push notifications enabled');
    } else {
      Alert.alert('Error', 'Failed to enable notifications. Please check your device settings.');
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          <View style={styles.headerButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* General Settings */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>General</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Push Notifications</Text>
              <Text style={styles.settingDescription}>
                Receive push notifications for new messages
              </Text>
            </View>
            {settings.enabled ? (
              <Switch
                value={settings.enabled}
                onValueChange={(value) => updateSetting('enabled', value)}
                trackColor={{ false: Colors.surfaceHover, true: Colors.primaryMuted }}
                thumbColor={settings.enabled ? Colors.primary : Colors.textMuted}
              />
            ) : (
              <TouchableOpacity 
                style={styles.enableButton}
                onPress={handleEnableNotifications}
              >
                <Text style={styles.enableButtonText}>Enable</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Sound</Text>
              <Text style={styles.settingDescription}>
                Play a sound for notifications
              </Text>
            </View>
            <Switch
              value={settings.sound}
              onValueChange={(value) => updateSetting('sound', value)}
              trackColor={{ false: Colors.surfaceHover, true: Colors.primaryMuted }}
              thumbColor={settings.sound ? Colors.primary : Colors.textMuted}
              disabled={!settings.enabled}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Vibration</Text>
              <Text style={styles.settingDescription}>
                Vibrate for notifications
              </Text>
            </View>
            <Switch
              value={settings.vibration}
              onValueChange={(value) => updateSetting('vibration', value)}
              trackColor={{ false: Colors.surfaceHover, true: Colors.primaryMuted }}
              thumbColor={settings.vibration ? Colors.primary : Colors.textMuted}
              disabled={!settings.enabled}
            />
          </View>
        </Card>

        {/* Message Types */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Message Types</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Direct Messages</Text>
              <Text style={styles.settingDescription}>
                Notifications for private messages
              </Text>
            </View>
            <Switch
              value={settings.dmNotifications}
              onValueChange={(value) => updateSetting('dmNotifications', value)}
              trackColor={{ false: Colors.surfaceHover, true: Colors.primaryMuted }}
              thumbColor={settings.dmNotifications ? Colors.primary : Colors.textMuted}
              disabled={!settings.enabled}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Group Messages</Text>
              <Text style={styles.settingDescription}>
                Notifications for group chats
              </Text>
            </View>
            <Switch
              value={settings.groupNotifications}
              onValueChange={(value) => updateSetting('groupNotifications', value)}
              trackColor={{ false: Colors.surfaceHover, true: Colors.primaryMuted }}
              thumbColor={settings.groupNotifications ? Colors.primary : Colors.textMuted}
              disabled={!settings.enabled}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Mentions Only</Text>
              <Text style={styles.settingDescription}>
                Only notify when you're mentioned
              </Text>
            </View>
            <Switch
              value={settings.mentionNotifications}
              onValueChange={(value) => updateSetting('mentionNotifications', value)}
              trackColor={{ false: Colors.surfaceHover, true: Colors.primaryMuted }}
              thumbColor={settings.mentionNotifications ? Colors.primary : Colors.textMuted}
              disabled={!settings.enabled}
            />
          </View>
        </Card>

        {/* Muted Groups */}
        {groups.length > 0 && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Muted Groups</Text>
            <Text style={styles.sectionDescription}>
              Toggle notifications for specific groups
            </Text>
            
            {groups.map((group) => {
              const isMuted = settings.mutedGroups.includes(group.id);
              return (
                <View key={group.id} style={styles.groupRow}>
                  <View style={styles.groupInfo}>
                    <Text style={styles.groupName}>{group.name}</Text>
                    {isMuted && (
                      <View style={styles.mutedBadge}>
                        <Ionicons name="notifications-off" size={12} color={Colors.textMuted} />
                        <Text style={styles.mutedText}>Muted</Text>
                      </View>
                    )}
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.muteButton,
                      isMuted && styles.unmuteButton,
                    ]}
                    onPress={() => toggleGroupMute(group.id)}
                  >
                    <Ionicons
                      name={isMuted ? 'notifications' : 'notifications-off'}
                      size={16}
                      color={isMuted ? Colors.primary : Colors.text}
                    />
                    <Text style={[
                      styles.muteButtonText,
                      isMuted && styles.unmuteButtonText,
                    ]}>
                      {isMuted ? 'Unmute' : 'Mute'}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </Card>
        )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: Spacing.md,
  },
  sectionDescription: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
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
  enableButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
  },
  enableButtonText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.background,
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  groupInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  groupName: {
    fontSize: FontSizes.md,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  mutedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  mutedText: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
  muteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surfaceHover,
    borderRadius: BorderRadius.md,
  },
  unmuteButton: {
    backgroundColor: Colors.primaryMuted,
  },
  muteButtonText: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
    color: Colors.text,
  },
  unmuteButtonText: {
    color: Colors.primary,
  },
});
