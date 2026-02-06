export interface Group {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  inviteCode: string;
  role: 'ADMIN' | 'MEMBER';
  memberCount: number;
  lastMessage: Message | null;
  unreadCount: number;
  isPinned: boolean;
  anonymousMode?: boolean;
}

export interface DM {
  id: string;
  otherUser?: {
    id: string;
    name: string;
    username: string | null;
    displayUsername: string | null;
    image: string | null;
  };
  lastMessage: Message | null;
  unreadCount: number;
  isPinned: boolean;
}

export interface Message {
  id: string;
  content: string;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    username: string | null;
    displayUsername?: string | null;
    image: string | null;
    role?: string;
    nameColor?: string | null;
    isBanned?: boolean;
    isDeleted?: boolean;
  };
  isNsfw?: boolean;
  attachments?: Attachment[] | null;
}

export interface Attachment {
  type: 'image' | 'file' | 'video' | 'gif';
  url: string;
  name: string;
  size: number;
}

export type ActiveChat =
  | { type: 'group'; id: string; data: Group }
  | { type: 'dm'; id: string; data: DM }
  | null;

export interface ChatUser {
  id: string;
  name: string;
  email: string;
  username?: string | null;
  displayUsername?: string | null;
  image?: string | null;
  role?: string;
  nameColor?: string | null;
  twoFactorEnabled?: boolean | null;
}
