/**
 * Chat Store (Svelte 5 Runes)
 * =============================
 *
 * Manages real-time chat state including:
 * - Conversations list
 * - Messages for each conversation
 * - Typing indicators
 * - Real-time WebSocket integration
 * - Optimistic UI updates
 *
 * Architecture:
 * - Uses Svelte 5 runes ($state, $derived, $effect)
 * - Integrates with websocketManager for real-time updates
 * - Communicates with Supabase for persistence
 */

import { browser } from '$app/environment';
import { websocketManager } from './websocket.svelte';
import type { SupabaseClient } from '@supabase/supabase-js';

// =============================================
// Types
// =============================================

export interface Conversation {
	id: string;
	name: string | null;
	is_group: boolean;
	class_id: string | null;
	last_message_preview: string | null;
	last_message_at: string | null;
	unread_count: number;
	participant_count: number;
	// For 1-on-1 chats
	other_user_id: string | null;
	other_user_firstname: string | null;
	other_user_lastname: string | null;
	other_user_avatar_url: string | null;
	is_muted: boolean;
}

export interface Message {
	id: string;
	conversation_id: string;
	sender_id: string | null;
	sender_firstname: string | null;
	sender_lastname: string | null;
	sender_avatar_url: string | null;
	content: any; // TipTap JSON
	plain_text: string;
	created_at: string;
	edited_at: string | null;
	is_flagged: boolean;
	attachments?: MessageAttachment[];
	reactions?: MessageReaction[];
}

export interface MessageAttachment {
	id: string;
	file_name: string;
	file_type: string;
	file_size: number;
	public_url: string;
	uploaded_by: string;
}

export interface MessageReaction {
	emoji: string;
	count: number;
	user_reacted: boolean;
	users?: {
		id: string;
		firstname: string;
		lastname: string;
		avatar_url: string;
	}[];
}

export interface TypingUser {
	userId: string;
	firstname: string;
	lastname: string;
	timestamp: number;
}

// =============================================
// Chat Store Class
// =============================================

class ChatStore {
	// Reactive state
	conversations = $state<Conversation[]>([]);
	messages = $state<Map<string, Message[]>>(new Map());
	typingUsers = $state<Map<string, TypingUser[]>>(new Map());
	activeConversationId = $state<string | null>(null);
	isLoadingConversations = $state(false);
	isLoadingMessages = $state(false);

	private supabase: SupabaseClient | null = null;
	private userId: string | null = null;
	private typingTimeouts = new Map<string, number>();

	/**
	 * Initialize chat store with Supabase client and user ID
	 */
	init(supabase: SupabaseClient, userId: string): void {
		if (!browser) return;

		this.supabase = supabase;
		this.userId = userId;

		// Subscribe to WebSocket messages
		this.subscribeToWebSocket();

		// Load initial conversations
		this.loadConversations();
	}

	/**
	 * Subscribe to WebSocket messages for real-time updates
	 */
	private subscribeToWebSocket(): void {
		if (!browser) return;

		// Listen for WebSocket messages using $effect
		$effect(() => {
			// Note: In a real implementation, we'd subscribe to websocketManager events
			// For now, this is a placeholder for the integration point
			console.log('Chat store: Subscribed to WebSocket');
		});
	}

	/**
	 * Load user's conversations from database
	 */
	async loadConversations(): Promise<void> {
		if (!this.supabase || !this.userId) return;

		this.isLoadingConversations = true;

		try {
			const { data, error } = await this.supabase.rpc('get_user_conversations', {
				p_user_id: this.userId
			});

			if (error) {
				console.error('Error loading conversations:', error);
				return;
			}

			this.conversations = (data || []).map((conv: any) => ({
				id: conv.conversation_id,
				name: conv.name,
				is_group: conv.is_group,
				class_id: conv.class_id,
				last_message_preview: conv.last_message_preview,
				last_message_at: conv.last_message_at,
				unread_count: conv.unread_count || 0,
				participant_count: conv.participant_count || 0,
				other_user_id: conv.other_user_id,
				other_user_firstname: conv.other_user_firstname,
				other_user_lastname: conv.other_user_lastname,
				other_user_avatar_url: conv.other_user_avatar_url,
				is_muted: conv.is_muted || false
			}));
		} catch (error) {
			console.error('Exception loading conversations:', error);
		} finally {
			this.isLoadingConversations = false;
		}
	}

	/**
	 * Load messages for a conversation
	 */
	async loadMessages(
		conversationId: string,
		limit: number = 50,
		beforeId?: string,
		beforeTimestamp?: string
	): Promise<void> {
		if (!this.supabase) return;

		this.isLoadingMessages = true;

		try {
			const { data, error } = await this.supabase.rpc('get_messages_paginated', {
				p_conversation_id: conversationId,
				p_limit: limit,
				p_before_id: beforeId || null,
				p_before_timestamp: beforeTimestamp || null
			});

			if (error) {
				console.error('Error loading messages:', error);
				return;
			}

			const messages: Message[] = (data || []).map((msg: any) => ({
				id: msg.id,
				conversation_id: msg.conversation_id,
				sender_id: msg.sender_id,
				sender_firstname: msg.sender_firstname,
				sender_lastname: msg.sender_lastname,
				sender_avatar_url: msg.sender_avatar_url,
				content: msg.content,
				plain_text: msg.plain_text,
				created_at: msg.created_at,
				edited_at: msg.edited_at,
				is_flagged: msg.is_flagged,
				attachments: [],
				reactions: []
			}));

			// Reverse to show oldest first
			messages.reverse();

			// If loading more (pagination), prepend to existing messages
			if (beforeId && this.messages.has(conversationId)) {
				const existing = this.messages.get(conversationId) || [];
				this.messages.set(conversationId, [...messages, ...existing]);
			} else {
				// First load or refresh
				this.messages.set(conversationId, messages);
			}
		} catch (error) {
			console.error('Exception loading messages:', error);
		} finally {
			this.isLoadingMessages = false;
		}
	}

	/**
	 * Send a message to a conversation
	 */
	async sendMessage(
		conversationId: string,
		content: any,
		attachmentRecords?: Array<{
			file_name: string;
			file_type: string;
			file_size: number;
			storage_path: string;
			public_url: string;
		}>
	): Promise<Message | null> {
		if (!this.supabase || !this.userId) return null;

		try {
			// Insert message into database
			const { data, error } = await this.supabase
				.from('messages')
				.insert({
					conversation_id: conversationId,
					sender_id: this.userId,
					content: content
				})
				.select(
					`
					id,
					conversation_id,
					sender_id,
					content,
					plain_text,
					created_at,
					edited_at,
					is_flagged
				`
				)
				.single();

			if (error) {
				console.error('Error sending message:', error);
				return null;
			}

			// Insert attachments if any
			if (attachmentRecords && attachmentRecords.length > 0) {
				const attachmentsToInsert = attachmentRecords.map((att) => ({
					message_id: data.id,
					file_name: att.file_name,
					file_type: att.file_type,
					file_size: att.file_size,
					storage_path: att.storage_path,
					public_url: att.public_url,
					uploaded_by: this.userId
				}));

				const { error: attachError } = await this.supabase
					.from('message_attachments')
					.insert(attachmentsToInsert);

				if (attachError) {
					console.error('Error inserting attachments:', attachError);
				}
			}

			// Create message object
			const message: Message = {
				id: data.id,
				conversation_id: data.conversation_id,
				sender_id: data.sender_id,
				sender_firstname: null, // Will be populated by optimistic update
				sender_lastname: null,
				sender_avatar_url: null,
				content: data.content,
				plain_text: data.plain_text,
				created_at: data.created_at,
				edited_at: data.edited_at,
				is_flagged: data.is_flagged,
				attachments: attachmentRecords || [],
				reactions: []
			};

			// Optimistic UI update
			const existing = this.messages.get(conversationId) || [];
			this.messages.set(conversationId, [...existing, message]);

			// Broadcast via WebSocket
			websocketManager.send({
				type: 'chat_message',
				conversationId,
				messageId: message.id,
				content: message.content,
				attachments: attachmentRecords
			});

			// Update conversation list (move to top)
			await this.loadConversations();

			return message;
		} catch (error) {
			console.error('Exception sending message:', error);
			return null;
		}
	}

	/**
	 * Send typing indicator
	 */
	sendTypingIndicator(conversationId: string, isTyping: boolean): void {
		websocketManager.send({
			type: 'typing_indicator',
			conversationId,
			isTyping
		});
	}

	/**
	 * Mark conversation as read
	 */
	async markAsRead(conversationId: string, messageId?: string): Promise<void> {
		if (!this.supabase || !this.userId) return;

		try {
			await this.supabase.rpc('mark_conversation_read', {
				p_conversation_id: conversationId,
				p_user_id: this.userId,
				p_message_id: messageId || null
			});

			// Update local state
			const conversation = this.conversations.find((c) => c.id === conversationId);
			if (conversation) {
				conversation.unread_count = 0;
			}

			// Broadcast read receipt
			if (messageId) {
				websocketManager.send({
					type: 'message_read',
					conversationId,
					messageId
				});
			}
		} catch (error) {
			console.error('Error marking conversation as read:', error);
		}
	}

	/**
	 * Toggle message reaction
	 */
	async toggleReaction(messageId: string, emoji: string): Promise<void> {
		if (!this.supabase) return;

		try {
			const { data, error } = await this.supabase.rpc('toggle_reaction', {
				p_message_id: messageId,
				p_emoji: emoji
			});

			if (error) {
				console.error('Error toggling reaction:', error);
				return;
			}

			const action = data ? 'add' : 'remove';

			// Broadcast via WebSocket
			websocketManager.send({
				type: 'message_reaction',
				messageId,
				emoji,
				action
			});

			// Reload reactions for the message
			await this.loadMessageReactions(messageId);
		} catch (error) {
			console.error('Exception toggling reaction:', error);
		}
	}

	/**
	 * Load reactions for a message
	 */
	async loadMessageReactions(messageId: string): Promise<void> {
		if (!this.supabase) return;

		try {
			const { data, error } = await this.supabase.rpc('get_message_reaction_counts', {
				p_message_id: messageId
			});

			if (error) {
				console.error('Error loading reactions:', error);
				return;
			}

			// Find message in messages map and update reactions
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			for (const [conversationId, msgs] of this.messages.entries()) {
				const message = msgs.find((m) => m.id === messageId);
				if (message) {
					message.reactions = (data || []).map((r: any) => ({
						emoji: r.emoji,
						count: r.count,
						user_reacted: r.user_reacted
					}));
					break;
				}
			}
		} catch (error) {
			console.error('Exception loading reactions:', error);
		}
	}

	/**
	 * Report a message
	 */
	async reportMessage(
		messageId: string,
		reason: 'spam' | 'harassment' | 'inappropriate' | 'other',
		details?: string
	): Promise<boolean> {
		if (!this.supabase) return false;

		try {
			const { error } = await this.supabase.rpc('report_message', {
				p_message_id: messageId,
				p_reason: reason,
				p_details: details || null
			});

			if (error) {
				console.error('Error reporting message:', error);
				return false;
			}

			return true;
		} catch (error) {
			console.error('Exception reporting message:', error);
			return false;
		}
	}

	/**
	 * Create a 1-on-1 chat with a friend
	 */
	async create1on1Chat(friendId: string): Promise<string | null> {
		if (!this.supabase || !this.userId) return null;

		try {
			const { data, error } = await this.supabase.rpc('create_1on1_chat', {
				p_user1_id: this.userId,
				p_user2_id: friendId
			});

			if (error) {
				console.error('Error creating 1-on-1 chat:', error);
				return null;
			}

			// Reload conversations to include new chat
			await this.loadConversations();

			return data;
		} catch (error) {
			console.error('Exception creating 1-on-1 chat:', error);
			return null;
		}
	}

	/**
	 * Set active conversation
	 */
	setActiveConversation(conversationId: string | null): void {
		this.activeConversationId = conversationId;

		// Load messages if not already loaded
		if (conversationId && !this.messages.has(conversationId)) {
			this.loadMessages(conversationId);
		}

		// Mark as read
		if (conversationId) {
			this.markAsRead(conversationId);
		}
	}

	/**
	 * Get active conversation
	 */
	get activeConversation(): Conversation | null {
		if (!this.activeConversationId) return null;
		return this.conversations.find((c) => c.id === this.activeConversationId) || null;
	}

	/**
	 * Get messages for active conversation
	 */
	get activeMessages(): Message[] {
		if (!this.activeConversationId) return [];
		return this.messages.get(this.activeConversationId) || [];
	}

	/**
	 * Get typing users for active conversation
	 */
	get activeTypingUsers(): TypingUser[] {
		if (!this.activeConversationId) return [];
		return this.typingUsers.get(this.activeConversationId) || [];
	}

	/**
	 * Handle incoming WebSocket messages
	 * (Called by WebSocket manager)
	 */
	handleWebSocketMessage(message: any): void {
		switch (message.type) {
			case 'chat_message':
				this.handleIncomingMessage(message);
				break;
			case 'typing_indicator':
				this.handleTypingIndicator(message);
				break;
			case 'message_read':
				this.handleMessageRead(message);
				break;
			case 'message_reaction':
				this.handleMessageReaction(message);
				break;
		}
	}

	private handleIncomingMessage(message: any): void {
		// Fetch full message details and add to conversation
		if (this.activeConversationId === message.conversationId) {
			this.loadMessages(message.conversationId, 1);
		}

		// Update conversation list
		this.loadConversations();
	}

	private handleTypingIndicator(message: any): void {
		const { conversationId, userId, isTyping } = message;

		if (!this.typingUsers.has(conversationId)) {
			this.typingUsers.set(conversationId, []);
		}

		const users = this.typingUsers.get(conversationId)!;

		if (isTyping) {
			// Add user if not already typing
			if (!users.find((u) => u.userId === userId)) {
				users.push({
					userId,
					firstname: '', // Would be populated from profiles
					lastname: '',
					timestamp: Date.now()
				});
			}

			// Clear after 3 seconds
			if (this.typingTimeouts.has(userId)) {
				clearTimeout(this.typingTimeouts.get(userId)!);
			}
			const timeout = setTimeout(() => {
				const index = users.findIndex((u) => u.userId === userId);
				if (index !== -1) {
					users.splice(index, 1);
				}
			}, 3000);
			this.typingTimeouts.set(userId, timeout as unknown as number);
		} else {
			// Remove user from typing
			const index = users.findIndex((u) => u.userId === userId);
			if (index !== -1) {
				users.splice(index, 1);
			}
		}
	}

	private handleMessageRead(message: any): void {
		// Update read receipts (implementation depends on UI requirements)
		console.log('Message read:', message);
	}

	private handleMessageReaction(message: any): void {
		// Reload reactions for the message
		this.loadMessageReactions(message.messageId);
	}
}

// Export singleton instance
export const chatStore = new ChatStore();
