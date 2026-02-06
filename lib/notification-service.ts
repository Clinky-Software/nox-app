/**
 * Notification Service for Nox Chat
 * Handles push notifications setup and management
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from './api-client';

// Lazy load expo-notifications to prevent crashes
let Notifications: typeof import('expo-notifications') | null = null;
let Device: typeof import('expo-device') | null = null;

const NOTIFICATION_SETTINGS_KEY = 'nox_notification_settings';
const MUTED_GROUPS_KEY = 'nox_muted_groups';
const PUSH_TOKEN_KEY = 'nox_push_token';

export interface NotificationSettings {
  enabled: boolean;
  sound: boolean;
  vibration: boolean;
  dmNotifications: boolean;
  groupNotifications: boolean;
  mentionNotifications: boolean;
  mutedGroups: string[];
}

class NotificationService {
  private expoPushToken: string | null = null;
  private initialized = false;
  private settings: NotificationSettings = {
    enabled: true,
    sound: true,
    vibration: true,
    dmNotifications: true,
    groupNotifications: true,
    mentionNotifications: true,
    mutedGroups: [],
  };
  private mutedGroups: Set<string> = new Set();

  private async loadModules() {
    if (!Notifications) {
      try {
        Notifications = await import('expo-notifications');
        Device = await import('expo-device');
        
        // Configure notification behavior after loading
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
          }),
        });
      } catch (error) {
        if (__DEV__) {
          console.log('Failed to load notification modules:', error);
        }
        return false;
      }
    }
    return true;
  }

  async init() {
    if (this.initialized) return;
    
    try {
      const loaded = await this.loadModules();
      if (!loaded) return;
      
      await this.loadSettings();
      await this.loadMutedGroups();
      
      if (this.settings.enabled) {
        await this.registerForPushNotifications();
      }
      
      this.initialized = true;
    } catch (error) {
      if (__DEV__) {
        console.error('Notification init failed:', error);
      }
    }
  }

  async registerForPushNotifications(): Promise<string | null> {
    if (!Notifications || !Device) {
      await this.loadModules();
    }
    
    if (!Notifications || !Device) {
      return null;
    }
    
    if (!Device.isDevice) {
      if (__DEV__) {
        console.log('Push notifications require a physical device');
      }
      return null;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        if (__DEV__) {
          console.log('Failed to get push token for push notification!');
        }
        return null;
      }

      // Get the Expo push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: '72361c25-d3e6-4fc0-b012-ac2685914284',
      });
      
      this.expoPushToken = tokenData.data;
      
      // Save token locally
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, this.expoPushToken);
      
      // Send token to server
      await this.sendTokenToServer(this.expoPushToken);
      
      // Android specific channel setup
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#00FF9A',
        });
        
        await Notifications.setNotificationChannelAsync('messages', {
          name: 'Messages',
          description: 'New message notifications',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#00FF9A',
        });
      }

      return this.expoPushToken;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  private async sendTokenToServer(token: string) {
    try {
      await apiClient.post('/api/user/push-token', { token, platform: Platform.OS });
    } catch (error) {
      console.error('Failed to send push token to server:', error);
    }
  }

  async getSettings(): Promise<NotificationSettings> {
    return {
      ...this.settings,
      mutedGroups: Array.from(this.mutedGroups),
    };
  }

  async saveSettings(newSettings: NotificationSettings) {
    this.settings = { ...newSettings };
    this.mutedGroups = new Set(newSettings.mutedGroups);
    await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(this.settings));
    await AsyncStorage.setItem(MUTED_GROUPS_KEY, JSON.stringify(newSettings.mutedGroups));
    
    if (!this.settings.enabled) {
      await this.unregisterFromPushNotifications();
    } else if (!this.expoPushToken) {
      await this.registerForPushNotifications();
    }
  }

  async updateSettings(newSettings: Partial<NotificationSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(this.settings));
    
    if (!this.settings.enabled) {
      // Unregister from push notifications
      await this.unregisterFromPushNotifications();
    } else if (!this.expoPushToken) {
      // Re-register if enabled but no token
      await this.registerForPushNotifications();
    }
  }

  private async loadSettings() {
    try {
      const stored = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
      if (stored) {
        this.settings = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error);
    }
  }

  private async unregisterFromPushNotifications() {
    try {
      if (this.expoPushToken) {
        await apiClient.delete('/api/user/push-token');
        await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
        this.expoPushToken = null;
      }
    } catch (error) {
      console.error('Failed to unregister from push notifications:', error);
    }
  }

  // Muted groups management
  async loadMutedGroups() {
    try {
      const stored = await AsyncStorage.getItem(MUTED_GROUPS_KEY);
      if (stored) {
        this.mutedGroups = new Set(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load muted groups:', error);
    }
  }

  async isGroupMuted(groupId: string): Promise<boolean> {
    return this.mutedGroups.has(groupId);
  }

  async getMutedGroups(): Promise<string[]> {
    return Array.from(this.mutedGroups);
  }

  async muteGroup(groupId: string) {
    this.mutedGroups.add(groupId);
    await AsyncStorage.setItem(MUTED_GROUPS_KEY, JSON.stringify(Array.from(this.mutedGroups)));
    
    // Notify server
    try {
      await apiClient.post('/api/groups/mute', { groupId, muted: true });
    } catch (error) {
      console.error('Failed to sync mute status with server:', error);
    }
  }

  async unmuteGroup(groupId: string) {
    this.mutedGroups.delete(groupId);
    await AsyncStorage.setItem(MUTED_GROUPS_KEY, JSON.stringify(Array.from(this.mutedGroups)));
    
    // Notify server
    try {
      await apiClient.post('/api/groups/mute', { groupId, muted: false });
    } catch (error) {
      console.error('Failed to sync mute status with server:', error);
    }
  }

  async toggleGroupMute(groupId: string): Promise<boolean> {
    if (this.mutedGroups.has(groupId)) {
      await this.unmuteGroup(groupId);
      return false;
    } else {
      await this.muteGroup(groupId);
      return true;
    }
  }

  // Local notification for testing
  async sendLocalNotification(title: string, body: string, data?: object) {
    if (!Notifications) {
      await this.loadModules();
    }
    if (!Notifications) return;
    
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: this.settings.sound,
        },
        trigger: null, // Show immediately
      });
    } catch (error) {
      if (__DEV__) {
        console.error('Failed to send local notification:', error);
      }
    }
  }

  // Add notification listener
  addNotificationReceivedListener(callback: (notification: any) => void) {
    if (!Notifications) {
      // Return a dummy subscription that does nothing
      return { remove: () => {} };
    }
    return Notifications.addNotificationReceivedListener(callback);
  }

  addNotificationResponseReceivedListener(callback: (response: any) => void) {
    if (!Notifications) {
      // Return a dummy subscription that does nothing
      return { remove: () => {} };
    }
    return Notifications.addNotificationResponseReceivedListener(callback);
  }
}

export const notificationService = new NotificationService();
export default notificationService;
