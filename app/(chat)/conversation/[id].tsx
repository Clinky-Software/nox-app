/**
 * Conversation Screen for Nox Chat
 * Shows messages and allows sending
 */

import React, { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Pressable,
  Dimensions,
  Alert,
  Linking,
  Share,
  ScrollView,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Video, ResizeMode } from 'expo-av';
import { useChat } from '@/lib/chat-context';
import { useAuth } from '@/lib/auth-context';
import { authClient } from '@/lib/auth-client';
import { Avatar, Badge, LinkText } from '@/components/ui';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import { Message, Attachment } from '@/lib/types';
import { API_BASE_URL } from '@/lib/api-config';
import { notificationService } from '@/lib/notification-service';
import apiClient from '@/lib/api-client';

// Extended types for group settings
interface GroupSettings {
  isNsfw?: boolean;
  adminOnlyChat?: boolean;
  messageCooldown?: number;
  nuditySensor?: boolean;
  anonymousMode?: boolean;
}

interface GroupMember {
  id: string;
  role: 'ADMIN' | 'MEMBER';
  user: {
    id: string;
    name: string;
    username: string | null;
    displayUsername: string | null;
    image: string | null;
  };
}

export default function ConversationScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { activeChat, messages, messagesLoading, sendMessage, fetchMessages, refreshAll } = useChat();
  
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const screenWidth = Dimensions.get('window').width;
  
  // New state for enhanced features
  const [groupSettings, setGroupSettings] = useState<GroupSettings | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [showUserInfo, setShowUserInfo] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Message['sender'] | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMediaViewer, setShowMediaViewer] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<{ type: 'image' | 'video' | 'gif'; url: string; name: string } | null>(null);
  const [showMessageActions, setShowMessageActions] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [editingGroupSettings, setEditingGroupSettings] = useState<GroupSettings>({});

  // Load mute state
  useEffect(() => {
    const loadMuteState = async () => {
      if (activeChat?.type === 'group') {
        const muted = await notificationService.isGroupMuted(activeChat.id);
        setIsMuted(muted);
      }
    };
    loadMuteState();
  }, [activeChat]);

  // Fetch group settings
  useEffect(() => {
    const fetchGroupSettings = async () => {
      if (activeChat?.type === 'group') {
        try {
          const res = await apiClient.get<{ group: GroupSettings; isAdmin: boolean }>(`/api/groups/${activeChat.id}/settings`);
          if (res.data) {
            setGroupSettings(res.data.group);
            setIsAdmin(res.data.isAdmin);
            setEditingGroupSettings(res.data.group);
          }
        } catch (error) {
          console.error('Failed to fetch group settings:', error);
        }
      } else {
        setGroupSettings(null);
        setIsAdmin(false);
      }
    };
    fetchGroupSettings();
  }, [activeChat?.id, activeChat?.type]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // Fetch group members
  const fetchGroupMembers = async () => {
    if (activeChat?.type === 'group') {
      try {
        const res = await apiClient.get<{ members: GroupMember[] }>(`/api/groups/${activeChat.id}/members`);
        if (res.data?.members) {
          setGroupMembers(res.data.members);
        }
      } catch (error) {
        console.error('Failed to fetch group members:', error);
      }
    }
  };

  // Handle file upload
  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadFile(result.assets[0].uri, result.assets[0].name, result.assets[0].mimeType || 'application/octet-stream');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick file');
    }
  };

  // Handle image/video pick
  const handlePickMedia = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant access to your photo library.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: 5 - pendingAttachments.length,
      });

      if (!result.canceled && result.assets) {
        for (const asset of result.assets) {
          const isVideo = asset.type === 'video';
          const filename = asset.uri.split('/').pop() || (isVideo ? 'video.mp4' : 'image.jpg');
          const type = isVideo ? 'video/mp4' : 'image/jpeg';
          await uploadFile(asset.uri, filename, type);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick media');
    }
  };

  // Upload file to server
  const uploadFile = async (uri: string, name: string, type: string) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', {
        uri,
        name,
        type,
      } as any);

      // Get auth cookies from authClient
      const cookies = authClient.getCookie();
      const headers: Record<string, string> = {
        'Content-Type': 'multipart/form-data',
      };
      if (cookies) {
        headers['Cookie'] = cookies;
      }

      const response = await fetch(`${API_BASE_URL}/api/uploads`, {
        method: 'POST',
        body: formData,
        headers,
      });

      if (response.ok) {
        const attachment = await response.json();
        setPendingAttachments(prev => [...prev, attachment]);
      } else {
        const error = await response.json().catch(() => ({}));
        Alert.alert('Error', error.error || 'Failed to upload file');
      }
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', 'Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  // Remove pending attachment
  const removeAttachment = (index: number) => {
    setPendingAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Copy message text
  const handleCopyMessage = async (text: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Copied', 'Message copied to clipboard');
    setShowMessageActions(false);
    setSelectedMessage(null);
  };

  // Handle long press on message
  const handleMessageLongPress = (message: Message) => {
    setSelectedMessage(message);
    setShowMessageActions(true);
  };

  // Open user profile
  const handleUserPress = (sender: Message['sender']) => {
    if (groupSettings?.anonymousMode) return;
    setSelectedUser(sender);
    setShowUserInfo(true);
  };

  // Open media fullscreen
  const handleMediaPress = (type: 'image' | 'video' | 'gif', url: string, name: string) => {
    setSelectedMedia({ type, url, name });
    setShowMediaViewer(true);
  };

  // Save group settings
  const handleSaveGroupSettings = async () => {
    if (!activeChat || activeChat.type !== 'group') return;
    
    try {
      const res = await apiClient.put(`/api/groups/${activeChat.id}/settings`, editingGroupSettings);
      if (res.status === 200) {
        setGroupSettings(editingGroupSettings);
        setShowGroupSettings(false);
        Alert.alert('Success', 'Group settings updated');
        refreshAll();
      } else {
        Alert.alert('Error', res.error || 'Failed to save settings');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  // Filter messages for search - memoized for performance
  const filteredMessages = useMemo(() => 
    searchQuery.trim()
      ? messages.filter(m => m.content?.toLowerCase().includes(searchQuery.toLowerCase()))
      : messages,
    [messages, searchQuery]
  );

  // Key extractor - memoized for performance
  const keyExtractor = useCallback((item: Message) => item.id, []);

  const handleSend = async () => {
    if ((!newMessage.trim() && pendingAttachments.length === 0) || isSending) return;
    
    const messageText = newMessage.trim();
    setNewMessage('');
    const attachmentsToSend = [...pendingAttachments];
    setPendingAttachments([]);
    setIsSending(true);
    
    try {
      // TODO: Add attachment support to sendMessage
      await sendMessage(messageText);
    } catch (error) {
      console.error('Failed to send message:', error);
      setNewMessage(messageText);
      setPendingAttachments(attachmentsToSend);
    } finally {
      setIsSending(false);
    }
  };

  const handleToggleMute = async () => {
    if (activeChat?.type === 'group') {
      const newMuteState = await notificationService.toggleGroupMute(activeChat.id);
      setIsMuted(newMuteState);
      setShowOptionsMenu(false);
    }
  };

  const getImageUrl = (url: string | null | undefined): string | undefined => {
    if (!url) return undefined;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const getChatTitle = () => {
    if (!activeChat) return 'Chat';
    
    if (activeChat.type === 'group') {
      return activeChat.data.name;
    } else {
      return activeChat.data.otherUser.displayUsername || 
             activeChat.data.otherUser.username || 
             activeChat.data.otherUser.name;
    }
  };

  const getChatImage = () => {
    if (!activeChat) return null;
    
    if (activeChat.type === 'group') {
      return activeChat.data.image;
    } else {
      return activeChat.data.otherUser.image;
    }
  };

  const getChatSubtitle = () => {
    if (!activeChat) return '';
    
    if (activeChat.type === 'group') {
      return `${activeChat.data.memberCount} members`;
    } else {
      return 'Direct Message';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const renderAttachment = (attachment: Attachment, index: number, isOwn: boolean) => {
    const imageUrl = getImageUrl(attachment.url);
    const maxWidth = screenWidth * 0.65;
    
    switch (attachment.type) {
      case 'image':
        return (
          <TouchableOpacity 
            key={index} 
            style={[styles.mediaContainer, isOwn && styles.mediaContainerOwn]}
            onPress={() => handleMediaPress('image', imageUrl!, attachment.name)}
            activeOpacity={0.9}
          >
            <Image
              source={{ uri: imageUrl }}
              style={[styles.mediaImage, { width: maxWidth, height: maxWidth * 0.75 }]}
              contentFit="cover"
              transition={200}
            />
          </TouchableOpacity>
        );
      
      case 'gif':
        return (
          <TouchableOpacity 
            key={index} 
            style={[styles.mediaContainer, isOwn && styles.mediaContainerOwn]}
            onPress={() => handleMediaPress('gif', imageUrl!, attachment.name)}
            activeOpacity={0.9}
          >
            <Image
              source={{ uri: imageUrl }}
              style={[styles.mediaImage, { width: maxWidth, height: maxWidth * 0.75 }]}
              contentFit="cover"
              transition={200}
              autoplay
            />
            <View style={styles.gifBadge}>
              <Text style={styles.gifBadgeText}>GIF</Text>
            </View>
          </TouchableOpacity>
        );
      
      case 'video':
        return (
          <TouchableOpacity 
            key={index} 
            style={[styles.mediaContainer, isOwn && styles.mediaContainerOwn]}
            onPress={() => handleMediaPress('video', imageUrl!, attachment.name)}
            activeOpacity={0.9}
          >
            <View style={[styles.videoContainer, { width: maxWidth, height: maxWidth * 0.6 }]}>
              <Video
                source={{ uri: imageUrl! }}
                style={styles.videoPreview}
                resizeMode={ResizeMode.COVER}
                shouldPlay={false}
                isMuted={true}
              />
              <View style={styles.playButton}>
                <Ionicons name="play" size={32} color={Colors.background} />
              </View>
            </View>
          </TouchableOpacity>
        );
      
      case 'file':
        return (
          <TouchableOpacity 
            key={index} 
            style={[styles.fileAttachment, isOwn && styles.fileAttachmentOwn]}
            onPress={() => Linking.openURL(imageUrl!)}
          >
            <Ionicons name="document-outline" size={24} color={isOwn ? Colors.messageSentText : Colors.primary} />
            <View style={styles.fileInfo}>
              <Text style={[styles.fileName, isOwn && styles.fileNameOwn]} numberOfLines={1}>{attachment.name}</Text>
              <Text style={[styles.fileSize, isOwn && styles.fileSizeOwn]}>
                {attachment.size >= 1024 * 1024 
                  ? `${(attachment.size / (1024 * 1024)).toFixed(1)} MB`
                  : `${(attachment.size / 1024).toFixed(1)} KB`}
              </Text>
            </View>
            <Ionicons name="download-outline" size={20} color={isOwn ? Colors.messageSentText : Colors.textMuted} />
          </TouchableOpacity>
        );
      
      default:
        return null;
    }
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isOwn = item.sender.id === user?.id;
    const showDate = index === 0 || 
      formatDate(filteredMessages[index - 1]?.createdAt) !== formatDate(item.createdAt);
    const showAvatar = !isOwn && (
      index === filteredMessages.length - 1 || 
      filteredMessages[index + 1]?.sender.id !== item.sender.id
    );

    // Anonymous mode handling
    const isAnonymous = groupSettings?.anonymousMode && activeChat?.type === 'group';
    const displayName = isAnonymous ? 'Anonymous' : 
      (item.sender.displayUsername || item.sender.username || item.sender.name);
    const displayColor = isAnonymous ? Colors.textSecondary : item.sender.nameColor;
    const displayImage = isAnonymous ? null : item.sender.image;

    const hasAttachments = item.attachments && item.attachments.length > 0;
    const hasMediaAttachments = hasAttachments && 
      item.attachments!.some(a => a.type === 'image' || a.type === 'video' || a.type === 'gif');
    const hasFileAttachments = hasAttachments && 
      item.attachments!.some(a => a.type === 'file');

    return (
      <View>
        {showDate && (
          <View style={styles.dateContainer}>
            <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
          </View>
        )}
        
        <TouchableOpacity 
          style={[styles.messageContainer, isOwn && styles.messageContainerOwn]}
          onLongPress={() => handleMessageLongPress(item)}
          delayLongPress={500}
          activeOpacity={0.8}
        >
          {!isOwn && activeChat?.type === 'group' && (
            <TouchableOpacity 
              style={styles.avatarContainer}
              onPress={() => handleUserPress(item.sender)}
              disabled={isAnonymous}
            >
              {showAvatar ? (
                <Avatar
                  source={displayImage}
                  name={isAnonymous ? '?' : item.sender.name}
                  size="sm"
                />
              ) : (
                <View style={styles.avatarPlaceholder} />
              )}
            </TouchableOpacity>
          )}
          
          <View style={styles.messageContent}>
            {/* Sender name */}
            {!isOwn && activeChat?.type === 'group' && showAvatar && (
              <TouchableOpacity onPress={() => handleUserPress(item.sender)} disabled={isAnonymous}>
                <Text style={[styles.senderName, displayColor && { color: displayColor }]}>
                  {displayName}
                </Text>
              </TouchableOpacity>
            )}

            {/* Media attachments (outside bubble) */}
            {hasMediaAttachments && (
              <View style={[styles.mediaAttachments, isOwn && styles.mediaAttachmentsOwn]}>
                {item.attachments!
                  .filter(a => a.type === 'image' || a.type === 'video' || a.type === 'gif')
                  .map((attachment, idx) => renderAttachment(attachment, idx, isOwn))}
              </View>
            )}

            {/* File attachments */}
            {hasFileAttachments && (
              <View style={[styles.fileAttachments, isOwn && styles.fileAttachmentsOwn]}>
                {item.attachments!
                  .filter(a => a.type === 'file')
                  .map((attachment, idx) => renderAttachment(attachment, idx, isOwn))}
              </View>
            )}
            
            {/* Text content in bubble */}
            {item.content && (
              <View style={[styles.messageBubble, isOwn ? styles.messageBubbleOwn : styles.messageBubbleOther]}>
                <LinkText 
                  style={[styles.messageText, isOwn && styles.messageTextOwn]}
                  linkStyle={isOwn ? { color: '#FFFFFF', textDecorationColor: '#FFFFFF' } : undefined}
                >
                  {item.content}
                </LinkText>
                <Text style={[styles.messageTime, isOwn && styles.messageTimeOwn]}>
                  {formatTime(item.createdAt)}
                </Text>
              </View>
            )}

            {/* Time only if no text content */}
            {!item.content && hasAttachments && (
              <Text style={[styles.mediaTime, isOwn && styles.mediaTimeOwn]}>
                {formatTime(item.createdAt)}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  if (!activeChat) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.noChat}>
          <Ionicons name="chatbubbles-outline" size={64} color={Colors.textMuted} />
          <Text style={styles.noChatText}>Select a conversation</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        
        <Avatar
          source={getChatImage()}
          name={getChatTitle()}
          size="md"
        />
        
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {getChatTitle()}
          </Text>
          <Text style={styles.headerSubtitle}>{getChatSubtitle()}</Text>
        </View>
        
        <TouchableOpacity style={styles.headerAction} onPress={() => setShowOptionsMenu(true)}>
          <Ionicons name="ellipsis-vertical" size={20} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {/* Options Menu Modal */}
      <Modal
        visible={showOptionsMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOptionsMenu(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowOptionsMenu(false)}>
          <View style={styles.optionsMenu}>
            {activeChat?.type === 'group' && (
              <TouchableOpacity style={styles.optionItem} onPress={handleToggleMute}>
                <Ionicons
                  name={isMuted ? 'notifications' : 'notifications-off'}
                  size={20}
                  color={Colors.text}
                />
                <Text style={styles.optionText}>
                  {isMuted ? 'Unmute Notifications' : 'Mute Notifications'}
                </Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={styles.optionItem}
              onPress={() => {
                setShowOptionsMenu(false);
                if (activeChat?.type === 'group') {
                  fetchGroupMembers();
                  setShowGroupSettings(true);
                } else {
                  setSelectedUser(activeChat?.data.otherUser as Message['sender']);
                  setShowUserInfo(true);
                }
              }}
            >
              <Ionicons name="information-circle-outline" size={20} color={Colors.text} />
              <Text style={styles.optionText}>
                {activeChat?.type === 'group' ? 'Group Info' : 'User Info'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.optionItem}
              onPress={() => {
                setShowOptionsMenu(false);
                setShowSearch(true);
              }}
            >
              <Ionicons name="search-outline" size={20} color={Colors.text} />
              <Text style={styles.optionText}>Search Messages</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.optionItem, styles.optionItemDanger]}>
              <Ionicons name="exit-outline" size={20} color={Colors.error} />
              <Text style={[styles.optionText, styles.optionTextDanger]}>
                {activeChat?.type === 'group' ? 'Leave Group' : 'Delete Chat'}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {messagesLoading && messages.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={filteredMessages}
            renderItem={renderMessage}
            keyExtractor={keyExtractor}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            // Performance optimizations
            removeClippedSubviews={Platform.OS === 'android'}
            maxToRenderPerBatch={15}
            windowSize={21}
            initialNumToRender={20}
            updateCellsBatchingPeriod={50}
            getItemLayout={undefined}
            maintainVisibleContentPosition={{
              minIndexForVisible: 0,
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="chatbubble-outline" size={48} color={Colors.textMuted} />
                <Text style={styles.emptyText}>
                  {searchQuery ? 'No messages found' : 'No messages yet'}
                </Text>
                <Text style={styles.emptySubtext}>
                  {searchQuery ? 'Try a different search term' : 'Send a message to start the conversation'}
                </Text>
              </View>
            }
          />
        )}

        {/* Pending attachments preview */}
        {pendingAttachments.length > 0 && (
          <View style={styles.attachmentPreview}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {pendingAttachments.map((attachment, index) => (
                <View key={index} style={styles.attachmentPreviewItem}>
                  {attachment.type === 'image' || attachment.type === 'gif' ? (
                    <Image
                      source={{ uri: getImageUrl(attachment.url) }}
                      style={styles.attachmentPreviewImage}
                      contentFit="cover"
                    />
                  ) : attachment.type === 'video' ? (
                    <View style={styles.attachmentPreviewVideo}>
                      <Ionicons name="videocam" size={20} color={Colors.text} />
                    </View>
                  ) : (
                    <View style={styles.attachmentPreviewFile}>
                      <Ionicons name="document" size={20} color={Colors.text} />
                    </View>
                  )}
                  <TouchableOpacity 
                    style={styles.removeAttachment}
                    onPress={() => removeAttachment(index)}
                  >
                    <Ionicons name="close-circle" size={20} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Input */}
        <View style={styles.inputContainer}>
          <TouchableOpacity 
            style={styles.attachButton}
            onPress={handlePickMedia}
            disabled={isUploading}
          >
            {isUploading ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Ionicons name="image-outline" size={24} color={Colors.primary} />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.attachButton}
            onPress={handlePickFile}
            disabled={isUploading}
          >
            <Ionicons name="attach-outline" size={24} color={Colors.primary} />
          </TouchableOpacity>
          
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor={Colors.textMuted}
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              maxLength={2000}
            />
          </View>
          
          <TouchableOpacity
            style={[styles.sendButton, ((!newMessage.trim() && pendingAttachments.length === 0) || isSending) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={(!newMessage.trim() && pendingAttachments.length === 0) || isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color={Colors.background} />
            ) : (
              <Ionicons name="send" size={20} color={Colors.background} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Search Modal */}
      <Modal
        visible={showSearch}
        animationType="slide"
        onRequestClose={() => {
          setShowSearch(false);
          setSearchQuery('');
        }}
      >
        <SafeAreaView style={styles.searchModal}>
          <View style={styles.searchHeader}>
            <TouchableOpacity onPress={() => {
              setShowSearch(false);
              setSearchQuery('');
            }}>
              <Ionicons name="arrow-back" size={24} color={Colors.text} />
            </TouchableOpacity>
            <TextInput
              style={styles.searchInput}
              placeholder="Search messages..."
              placeholderTextColor={Colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={24} color={Colors.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>
          <FlatList
            data={filteredMessages}
            renderItem={renderMessage}
            keyExtractor={keyExtractor}
            contentContainerStyle={styles.messagesList}
            removeClippedSubviews={Platform.OS === 'android'}
            maxToRenderPerBatch={15}
            windowSize={15}
            initialNumToRender={20}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {searchQuery ? 'No messages found' : 'Type to search'}
                </Text>
              </View>
            }
          />
        </SafeAreaView>
      </Modal>

      {/* Message Actions Modal */}
      <Modal
        visible={showMessageActions}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowMessageActions(false);
          setSelectedMessage(null);
        }}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => {
            setShowMessageActions(false);
            setSelectedMessage(null);
          }}
        >
          <View style={styles.messageActionsMenu}>
            {selectedMessage?.content && (
              <TouchableOpacity 
                style={styles.optionItem}
                onPress={() => handleCopyMessage(selectedMessage.content)}
              >
                <Ionicons name="copy-outline" size={20} color={Colors.text} />
                <Text style={styles.optionText}>Copy Text</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              style={styles.optionItem}
              onPress={async () => {
                if (selectedMessage?.content) {
                  await Share.share({ message: selectedMessage.content });
                }
                setShowMessageActions(false);
                setSelectedMessage(null);
              }}
            >
              <Ionicons name="share-outline" size={20} color={Colors.text} />
              <Text style={styles.optionText}>Share</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* User Info Modal */}
      <Modal
        visible={showUserInfo}
        animationType="slide"
        onRequestClose={() => {
          setShowUserInfo(false);
          setSelectedUser(null);
        }}
      >
        <SafeAreaView style={styles.userInfoModal}>
          <View style={styles.userInfoHeader}>
            <TouchableOpacity onPress={() => {
              setShowUserInfo(false);
              setSelectedUser(null);
            }}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.userInfoTitle}>User Info</Text>
            <View style={{ width: 24 }} />
          </View>
          {selectedUser && (
            <ScrollView style={styles.userInfoContent}>
              <View style={styles.userInfoProfile}>
                <Avatar
                  source={selectedUser.image}
                  name={selectedUser.name}
                  size="xl"
                />
                <Text style={[styles.userInfoName, selectedUser.nameColor && { color: selectedUser.nameColor }]}>
                  {selectedUser.displayUsername || selectedUser.username || selectedUser.name}
                </Text>
                {selectedUser.username && (
                  <Text style={styles.userInfoUsername}>@{selectedUser.username}</Text>
                )}
                {selectedUser.role && selectedUser.role !== 'USER' && (
                  <Badge variant="primary" style={styles.userInfoBadge}>
                    {selectedUser.role}
                  </Badge>
                )}
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* Media Viewer Modal */}
      <Modal
        visible={showMediaViewer}
        animationType="fade"
        onRequestClose={() => {
          setShowMediaViewer(false);
          setSelectedMedia(null);
        }}
      >
        <View style={styles.mediaViewerContainer}>
          <View style={styles.mediaViewerHeader}>
            <TouchableOpacity onPress={() => {
              setShowMediaViewer(false);
              setSelectedMedia(null);
            }}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.mediaViewerTitle} numberOfLines={1}>
              {selectedMedia?.name || 'Media'}
            </Text>
            <TouchableOpacity onPress={() => {
              if (selectedMedia?.url) {
                Linking.openURL(selectedMedia.url);
              }
            }}>
              <Ionicons name="download-outline" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={styles.mediaViewerContent}>
            {selectedMedia?.type === 'video' ? (
              <Video
                source={{ uri: selectedMedia.url }}
                style={styles.fullscreenVideo}
                useNativeControls
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay
                isLooping={false}
              />
            ) : (
              <Image
                source={{ uri: selectedMedia?.url }}
                style={styles.fullscreenImage}
                contentFit="contain"
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Group Settings Modal */}
      <Modal
        visible={showGroupSettings}
        animationType="slide"
        onRequestClose={() => setShowGroupSettings(false)}
      >
        <SafeAreaView style={styles.groupSettingsModal}>
          <View style={styles.groupSettingsHeader}>
            <TouchableOpacity onPress={() => setShowGroupSettings(false)}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.groupSettingsTitle}>Group Settings</Text>
            {isAdmin && (
              <TouchableOpacity onPress={handleSaveGroupSettings}>
                <Text style={styles.saveButton}>Save</Text>
              </TouchableOpacity>
            )}
            {!isAdmin && <View style={{ width: 40 }} />}
          </View>
          
          <ScrollView style={styles.groupSettingsContent}>
            {/* Group Info */}
            <View style={styles.groupInfoSection}>
              <Avatar
                source={activeChat?.type === 'group' ? activeChat.data.image : null}
                name={activeChat?.type === 'group' ? activeChat.data.name : ''}
                size="xl"
              />
              <Text style={styles.groupName}>
                {activeChat?.type === 'group' ? activeChat.data.name : ''}
              </Text>
              <Text style={styles.groupMemberCount}>
                {activeChat?.type === 'group' ? `${activeChat.data.memberCount} members` : ''}
              </Text>
            </View>

            {/* Settings Toggles (admin only) */}
            {isAdmin && (
              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionTitle}>Settings</Text>
                
                <View style={styles.settingItem}>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>Anonymous Mode</Text>
                    <Text style={styles.settingDescription}>Hide member identities</Text>
                  </View>
                  <TouchableOpacity 
                    style={[styles.toggle, editingGroupSettings.anonymousMode && styles.toggleOn]}
                    onPress={() => setEditingGroupSettings(prev => ({ ...prev, anonymousMode: !prev.anonymousMode }))}
                  >
                    <View style={[styles.toggleKnob, editingGroupSettings.anonymousMode && styles.toggleKnobOn]} />
                  </TouchableOpacity>
                </View>

                <View style={styles.settingItem}>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>Admin Only Chat</Text>
                    <Text style={styles.settingDescription}>Only admins can send messages</Text>
                  </View>
                  <TouchableOpacity 
                    style={[styles.toggle, editingGroupSettings.adminOnlyChat && styles.toggleOn]}
                    onPress={() => setEditingGroupSettings(prev => ({ ...prev, adminOnlyChat: !prev.adminOnlyChat }))}
                  >
                    <View style={[styles.toggleKnob, editingGroupSettings.adminOnlyChat && styles.toggleKnobOn]} />
                  </TouchableOpacity>
                </View>

                <View style={styles.settingItem}>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>NSFW Content</Text>
                    <Text style={styles.settingDescription}>Mark group as NSFW</Text>
                  </View>
                  <TouchableOpacity 
                    style={[styles.toggle, editingGroupSettings.isNsfw && styles.toggleOn]}
                    onPress={() => setEditingGroupSettings(prev => ({ ...prev, isNsfw: !prev.isNsfw }))}
                  >
                    <View style={[styles.toggleKnob, editingGroupSettings.isNsfw && styles.toggleKnobOn]} />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Members List */}
            <View style={styles.membersSection}>
              <Text style={styles.settingsSectionTitle}>Members</Text>
              {groupMembers.map(member => (
                <View key={member.id} style={styles.memberItem}>
                  <Avatar
                    source={member.user.image}
                    name={member.user.name}
                    size="md"
                  />
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>
                      {member.user.displayUsername || member.user.username || member.user.name}
                    </Text>
                    {member.role === 'ADMIN' && (
                      <Badge variant="secondary">Admin</Badge>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </SafeAreaView>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.md,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  headerAction: {
    padding: Spacing.sm,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  dateContainer: {
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  dateText: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
    maxWidth: '85%',
  },
  messageContainerOwn: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  avatarContainer: {
    marginRight: Spacing.sm,
    alignSelf: 'flex-end',
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
  },
  messageBubble: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    maxWidth: '100%',
  },
  messageBubbleOwn: {
    backgroundColor: Colors.messageSent,
    borderBottomRightRadius: BorderRadius.sm,
  },
  messageBubbleOther: {
    backgroundColor: Colors.messageReceived,
    borderBottomLeftRadius: BorderRadius.sm,
  },
  senderName: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  messageText: {
    fontSize: FontSizes.md,
    color: Colors.messageReceivedText,
    lineHeight: 20,
  },
  messageTextOwn: {
    color: Colors.messageSentText,
  },
  messageTime: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
    alignSelf: 'flex-end',
  },
  messageTimeOwn: {
    color: 'rgba(11, 15, 13, 0.6)',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xxxl * 3,
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
  },
  noChat: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noChatText: {
    fontSize: FontSizes.lg,
    color: Colors.textSecondary,
    marginTop: Spacing.lg,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.sm,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: Colors.input,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Platform.OS === 'ios' ? Spacing.md : Spacing.sm,
    maxHeight: 120,
  },
  input: {
    fontSize: FontSizes.md,
    color: Colors.text,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  // Attachment styles
  attachmentsContainer: {
    marginBottom: Spacing.xs,
  },
  attachmentContainer: {
    marginBottom: Spacing.xs,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  attachmentImage: {
    width: '100%',
    height: 200,
    borderRadius: BorderRadius.md,
  },
  attachmentVideo: {
    width: '100%',
    height: 200,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
  },
  fileAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  fileAttachmentOwn: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    fontWeight: '500',
  },
  fileNameOwn: {
    color: Colors.messageSentText,
  },
  fileSize: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
  fileSizeOwn: {
    color: 'rgba(11, 15, 13, 0.6)',
  },
  // Message content structure
  messageContent: {
    flex: 1,
    maxWidth: '100%',
  },
  mediaAttachments: {
    marginBottom: Spacing.xs,
    alignItems: 'flex-start',
  },
  mediaAttachmentsOwn: {
    alignItems: 'flex-end',
  },
  fileAttachments: {
    marginBottom: Spacing.xs,
    alignItems: 'flex-start',
  },
  fileAttachmentsOwn: {
    alignItems: 'flex-end',
  },
  mediaContainer: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.xs,
  },
  mediaContainerOwn: {
    alignSelf: 'flex-end',
  },
  mediaImage: {
    borderRadius: BorderRadius.lg,
  },
  videoContainer: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    position: 'relative',
  },
  videoPreview: {
    width: '100%',
    height: '100%',
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -25 }, { translateY: -25 }],
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 4,
  },
  gifBadge: {
    position: 'absolute',
    bottom: Spacing.xs,
    left: Spacing.xs,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  gifBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  mediaTime: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  mediaTimeOwn: {
    textAlign: 'right',
  },
  // Attachment button
  attachButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Attachment preview
  attachmentPreview: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  attachmentPreviewItem: {
    position: 'relative',
    marginRight: Spacing.sm,
  },
  attachmentPreviewImage: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.md,
  },
  attachmentPreviewVideo: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachmentPreviewFile: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeAttachment: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: Colors.background,
    borderRadius: 10,
  },
  // Options menu styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 80,
    paddingRight: Spacing.md,
  },
  optionsMenu: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm,
    minWidth: 200,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  messageActionsMenu: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm,
    minWidth: 180,
    borderWidth: 1,
    borderColor: Colors.border,
    position: 'absolute',
    top: '40%',
    left: '50%',
    transform: [{ translateX: -90 }],
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  optionItemDanger: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  optionText: {
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  optionTextDanger: {
    color: Colors.error,
  },
  // Search Modal
  searchModal: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSizes.md,
    color: Colors.text,
    paddingVertical: Spacing.sm,
  },
  // User Info Modal
  userInfoModal: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  userInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  userInfoTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  userInfoContent: {
    flex: 1,
  },
  userInfoProfile: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  userInfoName: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.text,
    marginTop: Spacing.md,
  },
  userInfoUsername: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  userInfoBadge: {
    marginTop: Spacing.md,
  },
  // Media Viewer
  mediaViewerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  mediaViewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  mediaViewerTitle: {
    flex: 1,
    fontSize: FontSizes.md,
    color: '#fff',
    textAlign: 'center',
    marginHorizontal: Spacing.md,
  },
  mediaViewerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    width: '100%',
    height: '100%',
  },
  fullscreenVideo: {
    width: '100%',
    height: '100%',
  },
  // Group Settings Modal
  groupSettingsModal: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  groupSettingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  groupSettingsTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  saveButton: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.primary,
  },
  groupSettingsContent: {
    flex: 1,
  },
  groupInfoSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  groupName: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.text,
    marginTop: Spacing.md,
  },
  groupMemberCount: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  settingsSection: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  settingsSectionTitle: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: FontSizes.md,
    color: Colors.text,
    fontWeight: '500',
  },
  settingDescription: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.surface,
    padding: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  toggleOn: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  toggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.textMuted,
  },
  toggleKnobOn: {
    backgroundColor: Colors.background,
    transform: [{ translateX: 20 }],
  },
  membersSection: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  memberInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  memberName: {
    fontSize: FontSizes.md,
    color: Colors.text,
    fontWeight: '500',
  },
});
