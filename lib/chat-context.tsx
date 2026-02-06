/**
 * Chat Context for Nox Chat
 * Manages chat state (groups, DMs, active chat)
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import apiClient from './api-client';
import { API_ENDPOINTS } from './api-config';
import { Group, DM, ActiveChat, Message } from './types';
import { useAuth } from './auth-context';

interface ChatContextType {
  groups: Group[];
  dms: DM[];
  activeChat: ActiveChat;
  isLoading: boolean;
  messages: Message[];
  messagesLoading: boolean;
  setActiveChat: (chat: ActiveChat) => void;
  fetchGroups: () => Promise<void>;
  fetchDMs: () => Promise<void>;
  fetchMessages: () => Promise<void>;
  sendMessage: (content: string) => Promise<{ success: boolean; error?: string }>;
  refreshAll: () => Promise<void>;
  joinGroup: (inviteCode: string) => Promise<{ success: boolean; error?: string }>;
  createGroup: (name: string, description?: string) => Promise<{ success: boolean; error?: string }>;
  startDM: (username: string) => Promise<{ success: boolean; error?: string }>;
  togglePin: (type: 'group' | 'dm', id: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [dms, setDMs] = useState<DM[]>([]);
  const [activeChat, setActiveChat] = useState<ActiveChat>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  const fetchGroups = useCallback(async () => {
    try {
      console.log('[ChatContext] Fetching groups...');
      const res = await apiClient.get<{ groups: Group[] }>(API_ENDPOINTS.groups);
      console.log('[ChatContext] Groups response:', JSON.stringify(res, null, 2));
      if (res.data?.groups) {
        setGroups(res.data.groups);
      } else if (res.error) {
        console.error('[ChatContext] Groups error:', res.error, 'Status:', res.status);
      }
    } catch (error) {
      console.error('Failed to fetch groups:', error);
    }
  }, []);

  const fetchDMs = useCallback(async () => {
    try {
      console.log('[ChatContext] Fetching DMs...');
      const res = await apiClient.get<{ dms: DM[] }>(API_ENDPOINTS.dms);
      console.log('[ChatContext] DMs response:', JSON.stringify(res, null, 2));
      if (res.data?.dms) {
        setDMs(res.data.dms);
      } else if (res.error) {
        console.error('[ChatContext] DMs error:', res.error, 'Status:', res.status);
      }
    } catch (error) {
      console.error('Failed to fetch DMs:', error);
    }
  }, []);

  const fetchMessages = useCallback(async () => {
    if (!activeChat) return;

    setMessagesLoading(true);
    try {
      const param = activeChat.type === 'group'
        ? `groupId=${activeChat.id}`
        : `dmId=${activeChat.id}`;
      
      const res = await apiClient.get<{ messages: Message[] }>(`${API_ENDPOINTS.messages}?${param}`);
      if (res.data?.messages) {
        setMessages(res.data.messages);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setMessagesLoading(false);
    }
  }, [activeChat]);

  const sendMessage = useCallback(async (content: string): Promise<{ success: boolean; error?: string }> => {
    if (!activeChat || !content.trim()) {
      return { success: false, error: 'No active chat or empty message' };
    }

    try {
      const body = activeChat.type === 'group'
        ? { groupId: activeChat.id, content }
        : { dmId: activeChat.id, content };
      
      const res = await apiClient.post<{ message: Message }>(API_ENDPOINTS.messages, body);
      
      if (res.data?.message) {
        setMessages(prev => [...prev, res.data!.message]);
        return { success: true };
      }
      
      return { success: false, error: res.error || 'Failed to send message' };
    } catch (error) {
      return { success: false, error: 'Failed to send message' };
    }
  }, [activeChat]);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchGroups(), fetchDMs()]);
  }, [fetchGroups, fetchDMs]);

  const joinGroup = useCallback(async (inviteCode: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await apiClient.post<{ error?: string }>(API_ENDPOINTS.joinGroup, { inviteCode });
      
      if (res.status === 200) {
        await fetchGroups();
        return { success: true };
      }
      
      return { success: false, error: res.error || 'Failed to join group' };
    } catch (error) {
      return { success: false, error: 'Failed to join group' };
    }
  }, [fetchGroups]);

  const createGroup = useCallback(async (name: string, description?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await apiClient.post<{ error?: string }>(API_ENDPOINTS.groups, { name, description });
      
      if (res.status === 200 || res.status === 201) {
        await fetchGroups();
        return { success: true };
      }
      
      return { success: false, error: res.error || 'Failed to create group' };
    } catch (error) {
      return { success: false, error: 'Failed to create group' };
    }
  }, [fetchGroups]);

  const startDM = useCallback(async (username: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await apiClient.post<{ dm: DM; error?: string }>(API_ENDPOINTS.dms, { username });
      
      if (res.status === 200 && res.data?.dm) {
        await fetchDMs();
        setActiveChat({ type: 'dm', id: res.data.dm.id, data: res.data.dm });
        return { success: true };
      }
      
      return { success: false, error: res.error || 'Failed to start conversation' };
    } catch (error) {
      return { success: false, error: 'Failed to start conversation' };
    }
  }, [fetchDMs]);

  const togglePin = useCallback(async (type: 'group' | 'dm', id: string) => {
    try {
      const body = type === 'group' ? { groupId: id } : { dmId: id };
      const res = await apiClient.post<{ pinned: boolean }>(API_ENDPOINTS.pin, body);
      
      if (res.data) {
        if (type === 'group') {
          setGroups(prev => {
            const updated = prev.map(g =>
              g.id === id ? { ...g, isPinned: res.data!.pinned } : g
            );
            return updated.sort((a, b) => {
              if (a.isPinned && !b.isPinned) return -1;
              if (!a.isPinned && b.isPinned) return 1;
              return 0;
            });
          });
        } else {
          setDMs(prev => {
            const updated = prev.map(d =>
              d.id === id ? { ...d, isPinned: res.data!.pinned } : d
            );
            return updated.sort((a, b) => {
              if (a.isPinned && !b.isPinned) return -1;
              if (!a.isPinned && b.isPinned) return 1;
              return 0;
            });
          });
        }
      }
    } catch (error) {
      console.error('Failed to toggle pin:', error);
    }
  }, []);

  // Initial data load
  useEffect(() => {
    if (isAuthenticated) {
      setIsLoading(true);
      refreshAll().finally(() => setIsLoading(false));
    }
  }, [isAuthenticated, refreshAll]);

  // Fetch messages when active chat changes
  useEffect(() => {
    if (activeChat) {
      setMessages([]);
      fetchMessages();
    }
  }, [activeChat?.id, activeChat?.type]);

  // Polling for new messages
  useEffect(() => {
    if (activeChat) {
      pollingInterval.current = setInterval(() => {
        fetchMessages();
      }, 5000);
    }

    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, [activeChat?.id, fetchMessages]);

  return (
    <ChatContext.Provider
      value={{
        groups,
        dms,
        activeChat,
        isLoading,
        messages,
        messagesLoading,
        setActiveChat,
        fetchGroups,
        fetchDMs,
        fetchMessages,
        sendMessage,
        refreshAll,
        joinGroup,
        createGroup,
        startDM,
        togglePin,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}

export default ChatContext;
