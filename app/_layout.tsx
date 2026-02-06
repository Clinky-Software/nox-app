import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet, Platform, Linking } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/lib/auth-context';
import { Colors } from '@/constants/theme';
import { notificationService } from '@/lib/notification-service';

// Subscription type for notifications
interface NotificationSubscription {
  remove: () => void;
}

function RootLayoutNav() {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const notificationListener = useRef<NotificationSubscription | null>(null);
  const responseListener = useRef<NotificationSubscription | null>(null);

  // Initialize notifications when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      notificationService.init();
      
      // Listen for notifications received while app is foregrounded
      notificationListener.current = notificationService.addNotificationReceivedListener(notification => {
        // Handle notification in foreground
        console.log('Notification received:', notification);
      });

      // Listen for notification interactions
      responseListener.current = notificationService.addNotificationResponseReceivedListener(response => {
        const data = response.notification.request.content.data;
        
        // Navigate based on notification data
        if (data?.type === 'dm' && data?.chatId) {
          router.push(`/(chat)/conversation/${data.chatId}`);
        } else if (data?.type === 'group' && data?.chatId) {
          router.push(`/(chat)/conversation/${data.chatId}`);
        }
      });

      return () => {
        if (notificationListener.current) {
          notificationListener.current.remove();
        }
        if (responseListener.current) {
          responseListener.current.remove();
        }
      };
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    
    if (!isAuthenticated && !inAuthGroup) {
      // Redirect to login if not authenticated
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Redirect to chat if authenticated
      router.replace('/(chat)');
    }
  }, [isAuthenticated, isLoading, segments]);

  // Handle deep links for invite URLs
  useEffect(() => {
    // Function to handle deep link URLs
    const handleDeepLink = (url: string | null) => {
      if (!url) return;
      
      try {
        const parsedUrl = new URL(url);
        
        // Check for invite links: /groups/invite/:code
        const inviteMatch = parsedUrl.pathname.match(/\/groups\/invite\/([^/]+)/);
        if (inviteMatch && inviteMatch[1]) {
          const inviteCode = inviteMatch[1];
          console.log('[DeepLink] Invite code detected:', inviteCode);
          
          // Navigate to invite screen if authenticated, or save for after login
          if (isAuthenticated) {
            router.push(`/(chat)/invite/${inviteCode}`);
          } else {
            // Store the invite code to handle after login
            // The invite will be processed after authentication
            console.log('[DeepLink] User not authenticated, invite will be processed after login');
          }
        }
      } catch (error) {
        console.error('[DeepLink] Error parsing URL:', error);
      }
    };

    // Handle initial URL (app opened via deep link)
    Linking.getInitialURL().then(handleDeepLink);

    // Listen for deep links while app is running
    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated, router]);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(chat)" options={{ headerShown: false }} />
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <RootLayoutNav />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
