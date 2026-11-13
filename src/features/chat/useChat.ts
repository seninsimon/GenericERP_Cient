import { useQuery } from "@tanstack/react-query";

import api from "../../api/api";

// Team chat and comments (the API: /chat, /table/:t/:id/comments).

export type ChatChannel = {
  _id: string;
  kind: "everyone" | "department" | "group" | "dm";
  name: string;
  otherUserId: string | null;
  otherActive: boolean | null;
  mine: boolean;
  memberCount: number;
  lastMessageAt: string | null;
  unread: number;
  mentions: number;
};
export type ChatOverview = { enabled: boolean; directMessages: boolean; channels: ChatChannel[]; unread: number };

export type ChatMessage = {
  _id: string;
  channelId: string;
  userId: string | null;
  name: string;
  kind: "text" | "call";
  body: string;
  attachments: { url: string; name: string }[];
  createdAt: string;
  editedAt: string | null;
  deleted: boolean;
  reactions: { emoji: string; count: number; mine: boolean }[];
};

export type Comment = { _id: string; userId: string | null; name: string; body: string; createdAt: string; editedAt: string | null };

export const REACTIONS = ["👍", "❤️", "😂", "🎉", "👀", "✅"];

export const useChatOverview = () =>
  useQuery({
    queryKey: ["chat"],
    queryFn: async () => (await api.get<ChatOverview>("/chat")).data,
    staleTime: 30_000,
  });

export const useMessages = (channel: string | null) =>
  useQuery({
    queryKey: ["chatMessages", channel],
    queryFn: async () => (await api.get<{ messages: ChatMessage[]; more: boolean }>(`/chat/${channel}/messages`, { params: { limit: 60 } })).data,
    enabled: Boolean(channel),
  });

export const useComments = (table: string, id: string, enabled: boolean) =>
  useQuery({
    queryKey: ["comments", table, id],
    queryFn: async () => (await api.get<Comment[]>(`/table/${encodeURIComponent(table)}/${encodeURIComponent(id)}/comments`)).data,
    enabled,
    retry: false,
  });
