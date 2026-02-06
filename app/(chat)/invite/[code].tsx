/**
 * Group Invite Screen
 * Handles group invite deep links and allows user to join groups
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Avatar, Button } from '@/components/ui';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import { API_BASE_URL } from '@/lib/api-config';
import apiClient from '@/lib/api-client';

interface GroupPreview {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  memberCount: number;
  isAlreadyMember: boolean;
}

export default function InviteScreen() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code: string }>();
  
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [group, setGroup] = useState<GroupPreview | null>(null);

  // Fetch group preview
  useEffect(() => {
    const fetchGroupPreview = async () => {
      if (!code) {
        setError('Invalid invite link');
        setLoading(false);
        return;
      }

      try {
        const response = await apiClient.get<GroupPreview>(`/api/groups/preview?code=${encodeURIComponent(code)}`);
        
        if (response.data) {
          setGroup(response.data);
        } else {
          setError('Invalid or expired invite link');
        }
      } catch (err) {
        console.error('Failed to fetch group preview:', err);
        setError('Failed to load invite details');
      } finally {
        setLoading(false);
      }
    };

    fetchGroupPreview();
  }, [code]);

  const handleJoinGroup = async () => {
    if (!code) return;

    setJoining(true);
    setError(null);

    try {
      const response = await apiClient.post('/api/groups/join', { inviteCode: code });
      
      if (response.data) {
        setJoined(true);
        // Navigate to chat after a short delay
        setTimeout(() => {
          router.replace('/(chat)');
        }, 1500);
      } else {
        setError('Failed to join group');
      }
    } catch (err: any) {
      console.error('Failed to join group:', err);
      setError(err?.message || 'Failed to join group');
    } finally {
      setJoining(false);
    }
  };

  const handleGoToGroup = () => {
    router.replace('/(chat)');
  };

  const handleGoBack = () => {
    router.back();
  };

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading invite...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error && !group) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <View style={styles.errorIcon}>
            <Ionicons name="close-circle" size={64} color={Colors.error} />
          </View>
          <Text style={styles.errorTitle}>Invalid Invite</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Button 
            variant="primary" 
            onPress={handleGoBack}
            style={styles.button}
          >
            Go Back
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  // Successfully joined state
  if (joined) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={64} color={Colors.primary} />
          </View>
          <Text style={styles.successTitle}>You're In!</Text>
          <Text style={styles.successText}>
            Welcome to <Text style={styles.groupName}>{group?.name}</Text>
          </Text>
          <Text style={styles.redirectText}>Redirecting to chat...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Already a member state
  if (group?.isAlreadyMember) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <View style={styles.card}>
            {group.image ? (
              <Image
                source={{ uri: group.image.startsWith('http') ? group.image : `${API_BASE_URL}${group.image}` }}
                style={styles.groupImage}
                contentFit="cover"
              />
            ) : (
              <View style={styles.groupImagePlaceholder}>
                <Ionicons name="people" size={48} color={Colors.textMuted} />
              </View>
            )}
            
            <Text style={styles.inviteLabel}>You're already a member of</Text>
            <Text style={styles.groupTitle}>{group.name}</Text>
            
            <View style={styles.memberCount}>
              <Ionicons name="people-outline" size={16} color={Colors.textMuted} />
              <Text style={styles.memberCountText}>{group.memberCount} members</Text>
            </View>

            <Button 
              variant="primary" 
              onPress={handleGoToGroup}
              style={styles.button}
            >
              Go to Group
            </Button>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Normal invite view
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.centered}>
        <View style={styles.card}>
          {group?.image ? (
            <Image
              source={{ uri: group.image.startsWith('http') ? group.image : `${API_BASE_URL}${group.image}` }}
              style={styles.groupImage}
              contentFit="cover"
            />
          ) : (
            <View style={styles.groupImagePlaceholder}>
              <Ionicons name="people" size={48} color={Colors.textMuted} />
            </View>
          )}
          
          <Text style={styles.inviteLabel}>You've been invited to join</Text>
          <Text style={styles.groupTitle}>{group?.name}</Text>
          
          {group?.description && (
            <Text style={styles.groupDescription}>{group.description}</Text>
          )}
          
          <View style={styles.memberCount}>
            <Ionicons name="people-outline" size={16} color={Colors.textMuted} />
            <Text style={styles.memberCountText}>{group?.memberCount} members</Text>
          </View>

          {error && (
            <Text style={styles.inlineError}>{error}</Text>
          )}

          <Button 
            variant="primary" 
            onPress={handleJoinGroup}
            loading={joining}
            style={styles.button}
          >
            {joining ? 'Joining...' : 'Join Group'}
          </Button>
          
          <Button 
            variant="outline" 
            onPress={handleGoBack}
            style={styles.cancelButton}
          >
            Cancel
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  loadingText: {
    color: Colors.textMuted,
    fontSize: FontSizes.md,
    marginTop: Spacing.md,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  groupImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: Spacing.md,
  },
  groupImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  inviteLabel: {
    color: Colors.textMuted,
    fontSize: FontSizes.sm,
    marginBottom: Spacing.xs,
  },
  groupTitle: {
    color: Colors.text,
    fontSize: FontSizes.xl,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  groupDescription: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  memberCount: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  memberCountText: {
    color: Colors.textMuted,
    fontSize: FontSizes.sm,
    marginLeft: Spacing.xs,
  },
  button: {
    width: '100%',
    marginBottom: Spacing.sm,
  },
  cancelButton: {
    width: '100%',
  },
  errorIcon: {
    marginBottom: Spacing.md,
  },
  errorTitle: {
    color: Colors.text,
    fontSize: FontSizes.xl,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  errorText: {
    color: Colors.textMuted,
    fontSize: FontSizes.md,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  inlineError: {
    color: Colors.error,
    fontSize: FontSizes.sm,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  successIcon: {
    marginBottom: Spacing.md,
  },
  successTitle: {
    color: Colors.text,
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  successText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
    textAlign: 'center',
  },
  groupName: {
    color: Colors.text,
    fontWeight: '600',
  },
  redirectText: {
    color: Colors.textMuted,
    fontSize: FontSizes.sm,
    marginTop: Spacing.md,
  },
});
