import React, { useState, useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Modal,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useChat } from '@/lib/chat-context';
import { useAuth } from '@/lib/auth-context';
import { Avatar, Badge, Button, Input, Card } from '@/components/ui';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import { Group, DM } from '@/lib/types';

export default function ChatListScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { groups, dms, isLoading, refreshAll, joinGroup, createGroup, startDM, setActiveChat } = useChat();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'dms' | 'groups'>('dms');
  const [refreshing, setRefreshing] = useState(false);
  
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [dmModalVisible, setDMModalVisible] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [dmUsername, setDMUsername] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  /** Refreshes groups and DMs list */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
  }, [refreshAll]);

  /** Navigates to selected group conversation */
  const handleSelectGroup = useCallback((group: Group) => {
    setActiveChat({ type: 'group', id: group.id, data: group });
    router.push(`/(chat)/conversation/${group.id}`);
  }, [setActiveChat, router]);

  /** Navigates to selected DM conversation */
  const handleSelectDM = useCallback((dm: DM) => {
    setActiveChat({ type: 'dm', id: dm.id, data: dm });
    router.push(`/(chat)/conversation/${dm.id}`);
  }, [setActiveChat, router]);

  /** Joins group using invite code */
  const handleJoinGroup = async () => {
    if (!inviteCode.trim()) return;
    
    setActionLoading(true);
    const result = await joinGroup(inviteCode.trim());
    setActionLoading(false);
    
    if (result.success) {
      setJoinModalVisible(false);
      setInviteCode('');
    } else {
      Alert.alert('Error', result.error || 'Failed to join group');
    }
  };

  /** Creates new group with name and optional description */
  const handleCreateGroup = async () => {
    if (!groupName.trim()) return;
    
    setActionLoading(true);
    const result = await createGroup(groupName.trim(), groupDescription.trim());
    setActionLoading(false);
    
    if (result.success) {
      setCreateModalVisible(false);
      setGroupName('');
      setGroupDescription('');
    } else {
      Alert.alert('Error', result.error || 'Failed to create group');
    }
  };

  /** Starts DM with specified username */
  const handleStartDM = async () => {
    if (!dmUsername.trim()) return;
    
    setActionLoading(true);
    const result = await startDM(dmUsername.trim());
    setActionLoading(false);
    
    if (result.success) {
      setDMModalVisible(false);
      setDMUsername('');
    } else {
      Alert.alert('Error', result.error || 'Failed to start conversation');
    }
  };

  /** Filters groups by search query */
  const filteredGroups = useMemo(() => 
    groups.filter(g =>
      g.name.toLowerCase().includes(searchQuery.toLowerCase())
    ), [groups, searchQuery]);

  /** Filters DMs by search query, handles deleted users */
  const filteredDMs = useMemo(() => 
    dms.filter(d => {
      const name = d.otherUser?.name || 'Deleted User';
      const username = d.otherUser?.username || '';
      return name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        username.toLowerCase().includes(searchQuery.toLowerCase());
    }), [dms, searchQuery]);

  const totalUnread = useMemo(() => 
    groups.reduce((acc, g) => acc + g.unreadCount, 0) +
    dms.reduce((acc, d) => acc + d.unreadCount, 0),
    [groups, dms]);

  /** Renders DM list item with deleted user fallback */
  const renderDMItem = useCallback(({ item }: { item: DM }) => {
    const otherUser = item.otherUser || {
      id: 'deleted',
      name: `Deleted User (${item.id.slice(-8)})`,
      username: null,
      displayUsername: null,
      image: null,
    };
    
    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() => handleSelectDM(item)}
        activeOpacity={0.7}
      >
        <Avatar
          source={otherUser.image}
          name={otherUser.name}
          size="lg"
        />
        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatName} numberOfLines={1}>
              {otherUser.displayUsername || otherUser.username || otherUser.name}
            </Text>
            {item.isPinned && (
              <Ionicons name="pin" size={14} color={Colors.primary} />
            )}
          </View>
          {item.lastMessage && (
            <Text style={styles.lastMessage} numberOfLines={1}>
              {item.lastMessage.content}
            </Text>
          )}
        </View>
        {item.unreadCount > 0 && (
          <Badge variant="primary">{item.unreadCount}</Badge>
        )}
      </TouchableOpacity>
    );
  }, [handleSelectDM]);

  /** Renders group list item */
  const renderGroupItem = useCallback(({ item }: { item: Group }) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() => handleSelectGroup(item)}
      activeOpacity={0.7}
    >
      <Avatar
        source={item.image}
        name={item.name}
        size="lg"
      />
      <View style={styles.chatInfo}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatName} numberOfLines={1}>
            {item.name}
          </Text>
          {item.isPinned && (
            <Ionicons name="pin" size={14} color={Colors.primary} />
          )}
        </View>
        {item.lastMessage && (
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage.sender.name}: {item.lastMessage.content}
          </Text>
        )}
        <Text style={styles.memberCount}>
          {item.memberCount} member{item.memberCount !== 1 ? 's' : ''}
        </Text>
      </View>
      {item.unreadCount > 0 && (
        <Badge variant="primary">{item.unreadCount}</Badge>
      )}
    </TouchableOpacity>
  ), [handleSelectGroup]);

  const keyExtractorDM = useCallback((item: DM) => item.id, []);
  const keyExtractorGroup = useCallback((item: Group) => item.id, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerTitle}>
            <Text style={styles.title}>Messages</Text>
            {totalUnread > 0 && (
              <Badge variant="primary">{totalUnread}</Badge>
            )}
          </View>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => router.push('/(chat)/settings')}
          >
            <Ionicons name="settings-outline" size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={Colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search conversations..."
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'dms' && styles.tabActive]}
          onPress={() => setActiveTab('dms')}
        >
          <Text style={[styles.tabText, activeTab === 'dms' && styles.tabTextActive]}>
            Direct Messages
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'groups' && styles.tabActive]}
          onPress={() => setActiveTab('groups')}
        >
          <Text style={[styles.tabText, activeTab === 'groups' && styles.tabTextActive]}>
            Groups
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actions}>
        {activeTab === 'dms' ? (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setDMModalVisible(true)}
          >
            <Ionicons name="person-add-outline" size={18} color={Colors.primary} />
            <Text style={styles.actionText}>New Message</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setJoinModalVisible(true)}
            >
              <Ionicons name="enter-outline" size={18} color={Colors.primary} />
              <Text style={styles.actionText}>Join</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setCreateModalVisible(true)}
            >
              <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
              <Text style={styles.actionText}>Create</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <FlatList<DM | Group>
        data={activeTab === 'dms' ? filteredDMs : filteredGroups}
        renderItem={activeTab === 'dms' ? renderDMItem as any : renderGroupItem as any}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={15}
        updateCellsBatchingPeriod={50}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name={activeTab === 'dms' ? 'chatbubbles-outline' : 'people-outline'}
              size={48}
              color={Colors.textMuted}
            />
            <Text style={styles.emptyText}>
              {activeTab === 'dms' ? 'No direct messages yet' : 'No groups yet'}
            </Text>
            <Text style={styles.emptySubtext}>
              {activeTab === 'dms'
                ? 'Start a conversation with someone'
                : 'Create or join a group to get started'}
            </Text>
          </View>
        }
      />

      <Modal
        visible={joinModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setJoinModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard}>
            <Text style={styles.modalTitle}>Join a Group</Text>
            <Text style={styles.modalSubtitle}>Enter the invite code to join</Text>
            
            <Input
              placeholder="Invite code"
              value={inviteCode}
              onChangeText={setInviteCode}
              autoCapitalize="none"
              containerStyle={styles.modalInput}
            />
            
            <View style={styles.modalButtons}>
              <Button
                variant="ghost"
                onPress={() => setJoinModalVisible(false)}
                style={styles.modalButton}
              >
                Cancel
              </Button>
              <Button
                onPress={handleJoinGroup}
                loading={actionLoading}
                disabled={!inviteCode.trim()}
                style={styles.modalButton}
              >
                Join
              </Button>
            </View>
          </Card>
        </View>
      </Modal>

      <Modal
        visible={createModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard}>
            <Text style={styles.modalTitle}>Create a Group</Text>
            <Text style={styles.modalSubtitle}>Start a new group chat</Text>
            
            <Input
              label="Group Name"
              placeholder="My awesome group"
              value={groupName}
              onChangeText={setGroupName}
              containerStyle={styles.modalInput}
            />
            
            <Input
              label="Description (optional)"
              placeholder="What's this group about?"
              value={groupDescription}
              onChangeText={setGroupDescription}
              multiline
              containerStyle={styles.modalInput}
            />
            
            <View style={styles.modalButtons}>
              <Button
                variant="ghost"
                onPress={() => setCreateModalVisible(false)}
                style={styles.modalButton}
              >
                Cancel
              </Button>
              <Button
                onPress={handleCreateGroup}
                loading={actionLoading}
                disabled={!groupName.trim()}
                style={styles.modalButton}
              >
                Create
              </Button>
            </View>
          </Card>
        </View>
      </Modal>

      <Modal
        visible={dmModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDMModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard}>
            <Text style={styles.modalTitle}>Start a Conversation</Text>
            <Text style={styles.modalSubtitle}>Enter a username to message</Text>
            
            <Input
              placeholder="Username"
              value={dmUsername}
              onChangeText={setDMUsername}
              autoCapitalize="none"
              containerStyle={styles.modalInput}
            />
            
            <View style={styles.modalButtons}>
              <Button
                variant="ghost"
                onPress={() => setDMModalVisible(false)}
                style={styles.modalButton}
              >
                Cancel
              </Button>
              <Button
                onPress={handleStartDM}
                loading={actionLoading}
                disabled={!dmUsername.trim()}
                style={styles.modalButton}
              >
                Start Chat
              </Button>
            </View>
          </Card>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  settingsButton: {
    padding: Spacing.sm,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.input,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.md,
  },
  tab: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  tabActive: {
    backgroundColor: Colors.primary + '20',
  },
  tabText: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.primary,
  },
  actions: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.primary + '20',
    borderRadius: BorderRadius.full,
  },
  actionText: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
    color: Colors.primary,
  },
  list: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  chatInfo: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  chatName: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  lastMessage: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  memberCount: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxxl * 2,
  },
  emptyText: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: Spacing.lg,
  },
  emptySubtext: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  modalSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  modalInput: {
    marginBottom: Spacing.md,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  modalButton: {
    flex: 1,
  },
});
