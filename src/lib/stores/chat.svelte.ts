import { browser } from '$app/environment';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { supabaseRealtimeManager } from './supabaseRealtime.svelte';
import { createLogger } from '$lib/utils/logger';

const logger = createLogger('chat.svelte.ts');

/**
 * Message type with client-side flags for optimistic updates and broadcast tracking
 */
export interface Message {
	id: string;
	conversation_id: string;
	sender_id: string | null;
	content: Database['public']['Tables']['messages']['Row']['content'];
	plain_text: string | null;
	created_at: string | null;
	edited_at: string | null;
	deleted_at: string | null;
	is_flagged: boolean | null;
	flag_reason: string | null;
	is_optimistic?: boolean; // Temporary message, not yet saved to DB
	is_broadcast?: boolean; // From broadcast channel, awaiting DB confirmation
	sender?: {
		id: string;
		full_name: string | null;
		avatar_url: string | null;
	};
	reactions?: MessageReaction[];
}

/**
 * Message reaction type
 */
export interface MessageReaction {
	id: string;
	message_id: string;
	user_id: string;
	emoji: string;
	created_at: string | null;
}

/**
 * Broadcast message payload for new messages
 */
interface BroadcastMessagePayload {
	type: 'new_message';
	message: {
		id: string;
		conversation_id: string;
		sender_id: string;
		content: Database['public']['Tables']['messages']['Row']['content'];
		plain_text: string | null;
		created_at: string;
		sender: {
			id: string;
			full_name: string | null;
			avatar_url: string | null;
		};
	};
}

/**
 * Broadcast typing indicator payload
 */
interface BroadcastTypingPayload {
	type: 'typing_indicator';
	userId: string;
	isTyping: boolean;
}

/**
 * Broadcast message reaction payload
 */
interface BroadcastReactionPayload {
	type: 'message_reaction';
	messageId: string;
	userId: string;
	emoji: string;
	action: 'add' | 'remove';
}

/**
 * Broadcast read receipt payload
 */
interface BroadcastReadReceiptPayload {
	type: 'message_read';
	userId: string;
	messageId: string;
	conversationId: string;
}

/**
 * Union type for all broadcast payloads (unused, kept for reference)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type BroadcastPayload =
	| BroadcastMessagePayload
	| BroadcastTypingPayload
	| BroadcastReactionPayload
	| BroadcastReadReceiptPayload;

/**
 * Hybrid Chat Store - Uses DUAL subscription strategy for optimal UX and quota management
 *
 * Strategy:
 * 1. Broadcast Channel (FREE, ephemeral, 50ms latency) - Ultra-fast UX
 * 2. postgres_changes (COUNTS toward quota, 300ms latency) - Source of truth with JOINs
 *
 * Flow:
 * - Send: Optimistic UI → Broadcast (50ms) → DB insert (200ms) → postgres_changes (300ms)
 * - Receive: Broadcast (50ms, show immediately) → postgres_changes (300ms, replace with DB version)
 *
 * Benefits:
 * - Instant UX (50ms via Broadcast)
 * - Reliable persistence (DB source of truth)
 * - Quota optimization (Broadcast is FREE)
 * - Full message data (postgres_changes includes JOINs)
 *
 * @example
 * ```ts
 * import { chatStore } from '$lib/stores/chat.svelte';
 *
 * // Initialize with Supabase client and user info
 * chatStore.init(supabase, userId, { full_name: 'John Doe', avatar_url: 'https://...' });
 *
 * // Subscribe to a conversation
 * await chatStore.subscribeToConversation('conv-123');
 *
 * // Load conversation history
 * await chatStore.loadConversationHistory('conv-123');
 *
 * // Send a message
 * await chatStore.sendMessage('conv-123', 'Hello world!');
 *
 * // Access messages
 * const messages = chatStore.getMessages('conv-123');
 *
 * // Send typing indicator
 * chatStore.sendTypingIndicator('conv-123', true);
 *
 * // Cleanup
 * await chatStore.unsubscribeFromConversation('conv-123');
 * ```
 */
class ChatStore {
	private supabase: SupabaseClient<Database> | null = null;
	private userId: string | null = null;
	private currentUser: {
		full_name: string | null;
		avatar_url: string | null;
	} | null = null;

	/**
	 * Messages organized by conversation ID
	 */
	private messages = $state<Map<string, Message[]>>(new Map());

	/**
	 * Currently active conversation ID
	 */
	activeConversationId = $state<string | null>(null);

	/**
	 * Typing users per conversation
	 */
	private typingUsers = $state<Map<string, Set<string>>>(new Map());

	/**
	 * Pagination tracking - whether more messages exist
	 */
	private hasMore = $state<Map<string, boolean>>(new Map());

	/**
	 * Loading state
	 */
	loading = $state<boolean>(false);

	/**
	 * Typing timeout timers per user per conversation
	 */
	private typingTimers = new Map<string, Map<string, ReturnType<typeof setTimeout>>>();

	/**
	 * Initialize the chat store
	 *
	 * @param client - Supabase client instance
	 * @param currentUserId - Current authenticated user ID
	 * @param user - Current user profile info (for optimistic updates)
	 */
	init(
		client: SupabaseClient<Database>,
		currentUserId: string,
		user: { full_name: string | null; avatar_url: string | null }
	): void {
		if (!browser) {
			logger.warn('Cannot initialize chat store on server');
			return;
		}

		this.supabase = client;
		this.userId = currentUserId;
		this.currentUser = user;

		logger.info('Chat store initialized for user:', currentUserId);
	}

	/**
	 * Subscribe to a conversation (Broadcast + postgres_changes)
	 *
	 * @param conversationId - The conversation ID to subscribe to
	 */
	async subscribeToConversation(conversationId: string): Promise<void> {
		if (!browser || !this.supabase || !this.userId) {
			logger.warn('Cannot subscribe: not initialized or not in browser');
			return;
		}

		const channelName = `chat-${conversationId}`;

		try {
			// Create channel via realtime manager
			const channel = supabaseRealtimeManager.createChannel(channelName);

			// Subscribe to Broadcast events (FREE, ephemeral, fast)
			channel.on('broadcast', { event: 'new_message' }, ({ payload }) => {
				this.handleBroadcastMessage(payload as BroadcastMessagePayload);
			});

			channel.on('broadcast', { event: 'typing_indicator' }, ({ payload }) => {
				this.handleTypingIndicator(payload as BroadcastTypingPayload);
			});

			channel.on('broadcast', { event: 'message_reaction' }, ({ payload }) => {
				this.handleReaction(payload as BroadcastReactionPayload);
			});

			channel.on('broadcast', { event: 'message_read' }, ({ payload }) => {
				this.handleReadReceipt(payload as BroadcastReadReceiptPayload);
			});

			// Subscribe to postgres_changes (COUNTS toward quota, has JOINs)
			channel.on(
				'postgres_changes',
				{
					event: 'INSERT',
					schema: 'public',
					table: 'messages',
					filter: `conversation_id=eq.${conversationId}`
				},
				(payload) => {
					this.handlePostgresMessage(
						payload.new as Database['public']['Tables']['messages']['Row']
					);
				}
			);

			// Subscribe to the channel
			await supabaseRealtimeManager.subscribeChannel(channelName);

			logger.info(`Subscribed to conversation: ${conversationId}`);
		} catch (error) {
			logger.error(`Failed to subscribe to conversation ${conversationId}:`, error);
			throw error;
		}
	}

	/**
	 * Unsubscribe from a conversation
	 *
	 * @param conversationId - The conversation ID to unsubscribe from
	 */
	async unsubscribeFromConversation(conversationId: string): Promise<void> {
		if (!browser) {
			logger.warn('Cannot unsubscribe on server');
			return;
		}

		const channelName = `chat-${conversationId}`;

		try {
			await supabaseRealtimeManager.unsubscribeChannel(channelName);

			// Clear typing indicators for this conversation
			this.typingUsers.delete(conversationId);
			this.typingTimers.delete(conversationId);

			logger.info(`Unsubscribed from conversation: ${conversationId}`);
		} catch (error) {
			logger.error(`Failed to unsubscribe from conversation ${conversationId}:`, error);
		}
	}

	/**
	 * Load conversation history (initial load)
	 *
	 * @param conversationId - The conversation ID
	 * @param limit - Number of messages to load (default: 50)
	 */
	async loadConversationHistory(conversationId: string, limit = 50): Promise<void> {
		if (!browser || !this.supabase) {
			logger.warn('Cannot load history: not initialized or not in browser');
			return;
		}

		this.loading = true;

		try {
			// Use the paginated function which includes JOINs
			const { data, error } = await this.supabase.rpc('get_messages_paginated', {
				p_conversation_id: conversationId,
				p_limit: limit
			});

			if (error) {
				throw error;
			}

			if (data) {
				// Transform DB messages to our Message type
				const transformedMessages: Message[] = data.map((msg) => ({
					id: msg.id,
					conversation_id: msg.conversation_id,
					sender_id: msg.sender_id,
					content: msg.content,
					plain_text: msg.plain_text,
					created_at: msg.created_at,
					edited_at: msg.edited_at,
					deleted_at: null, // Not returned by function
					is_flagged: msg.is_flagged,
					flag_reason: null, // Not returned by function
					sender: {
						id: msg.sender_id,
						full_name: msg.sender_full_name,
						avatar_url: msg.sender_avatar_url
					}
				}));

				// Store messages (newest first in array, but we'll reverse for display)
				this.messages.set(conversationId, transformedMessages);

				// Update hasMore flag
				this.hasMore.set(conversationId, data.length === limit);

				logger.info(`Loaded ${data.length} messages for conversation ${conversationId}`);
			}
		} catch (error) {
			logger.error(`Failed to load conversation history for ${conversationId}:`, error);
			throw error;
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Load more messages (pagination)
	 *
	 * @param conversationId - The conversation ID
	 * @param limit - Number of messages to load (default: 50)
	 */
	async loadMoreMessages(conversationId: string, limit = 50): Promise<void> {
		if (!browser || !this.supabase) {
			logger.warn('Cannot load more messages: not initialized or not in browser');
			return;
		}

		const existingMessages = this.messages.get(conversationId);
		if (!existingMessages || existingMessages.length === 0) {
			logger.warn('No existing messages to paginate from');
			return;
		}

		// Get the oldest message to use as pagination cursor
		const oldestMessage = existingMessages[existingMessages.length - 1];

		this.loading = true;

		try {
			const { data, error } = await this.supabase.rpc('get_messages_paginated', {
				p_conversation_id: conversationId,
				p_before_id: oldestMessage.id,
				p_before_timestamp: oldestMessage.created_at,
				p_limit: limit
			});

			if (error) {
				throw error;
			}

			if (data && data.length > 0) {
				// Transform DB messages
				const transformedMessages: Message[] = data.map((msg) => ({
					id: msg.id,
					conversation_id: msg.conversation_id,
					sender_id: msg.sender_id,
					content: msg.content,
					plain_text: msg.plain_text,
					created_at: msg.created_at,
					edited_at: msg.edited_at,
					deleted_at: null,
					is_flagged: msg.is_flagged,
					flag_reason: null,
					sender: {
						id: msg.sender_id,
						full_name: msg.sender_full_name,
						avatar_url: msg.sender_avatar_url
					}
				}));

				// Append older messages
				const updated = [...existingMessages, ...transformedMessages];
				this.messages.set(conversationId, updated);

				// Update hasMore flag
				this.hasMore.set(conversationId, data.length === limit);

				logger.info(`Loaded ${data.length} more messages for conversation ${conversationId}`);
			} else {
				// No more messages
				this.hasMore.set(conversationId, false);
				logger.info(`No more messages to load for conversation ${conversationId}`);
			}
		} catch (error) {
			logger.error(`Failed to load more messages for ${conversationId}:`, error);
			throw error;
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Send a message (Optimistic UI → Broadcast → DB → postgres_changes)
	 *
	 * @param conversationId - The conversation ID
	 * @param plainText - The plain text message content
	 */
	async sendMessage(conversationId: string, plainText: string): Promise<void> {
		if (!browser || !this.supabase || !this.userId || !this.currentUser) {
			logger.warn('Cannot send message: not initialized or not in browser');
			return;
		}

		// Generate temporary ID for optimistic update
		const tempId = `temp-${crypto.randomUUID()}`;
		const now = new Date().toISOString();

		// Create optimistic message
		const optimisticMessage: Message = {
			id: tempId,
			conversation_id: conversationId,
			sender_id: this.userId,
			content: { text: plainText }, // Simple JSON content
			plain_text: plainText,
			created_at: now,
			edited_at: null,
			deleted_at: null,
			is_flagged: false,
			flag_reason: null,
			is_optimistic: true,
			sender: {
				id: this.userId,
				full_name: this.currentUser.full_name,
				avatar_url: this.currentUser.avatar_url
			}
		};

		// Add optimistic message to state
		const existingMessages = this.messages.get(conversationId) || [];
		this.messages.set(conversationId, [optimisticMessage, ...existingMessages]);

		logger.info('Added optimistic message:', tempId);

		try {
			// Step 1: Broadcast to other users (50ms, ephemeral, FREE)
			const channel = supabaseRealtimeManager.getChannel(`chat-${conversationId}`);
			if (channel) {
				await channel.send({
					type: 'broadcast',
					event: 'new_message',
					payload: {
						type: 'new_message',
						message: {
							id: tempId, // Use temp ID so others can deduplicate later
							conversation_id: conversationId,
							sender_id: this.userId,
							content: { text: plainText },
							plain_text: plainText,
							created_at: now,
							sender: {
								id: this.userId,
								full_name: this.currentUser.full_name,
								avatar_url: this.currentUser.avatar_url
							}
						}
					} satisfies BroadcastMessagePayload
				});

				logger.info('Broadcasted message to peers');
			}

			// Step 2: Insert to database (200ms, persists)
			const { data, error } = await this.supabase
				.from('messages')
				.insert({
					conversation_id: conversationId,
					sender_id: this.userId,
					content: { text: plainText },
					plain_text: plainText
				})
				.select()
				.single();

			if (error) {
				throw error;
			}

			logger.info('Message inserted to DB:', data.id);

			// Step 3: Replace optimistic message with DB version
			// postgres_changes will fire and handlePostgresMessage will replace it with full JOIN data
			// For now, just update the ID to match the DB version
			const currentMessages = this.messages.get(conversationId) || [];
			const updated = currentMessages.map((msg) =>
				msg.id === tempId ? { ...msg, id: data.id, is_optimistic: false } : msg
			);
			this.messages.set(conversationId, updated);

			logger.info('Optimistic message updated with DB ID:', data.id);
		} catch (error) {
			logger.error('Failed to send message, rolling back optimistic update:', error);

			// Rollback: Remove optimistic message
			const currentMessages = this.messages.get(conversationId) || [];
			const rollback = currentMessages.filter((msg) => msg.id !== tempId);
			this.messages.set(conversationId, rollback);

			throw error;
		}
	}

	/**
	 * Handle incoming broadcast message (50ms, ephemeral)
	 *
	 * @param payload - Broadcast message payload
	 */
	private handleBroadcastMessage(payload: BroadcastMessagePayload): void {
		const { message } = payload;

		// Ignore if from current user (we already have optimistic update)
		if (message.sender_id === this.userId) {
			logger.info('Ignoring broadcast message from self:', message.id);
			return;
		}

		// Add message with is_broadcast flag (will be replaced by postgres_changes)
		const broadcastMessage: Message = {
			id: message.id,
			conversation_id: message.conversation_id,
			sender_id: message.sender_id,
			content: message.content,
			plain_text: message.plain_text,
			created_at: message.created_at,
			edited_at: null,
			deleted_at: null,
			is_flagged: false,
			flag_reason: null,
			is_broadcast: true,
			sender: message.sender
		};

		const existingMessages = this.messages.get(message.conversation_id) || [];
		this.messages.set(message.conversation_id, [broadcastMessage, ...existingMessages]);

		logger.info('Received broadcast message:', message.id);
	}

	/**
	 * Handle incoming postgres_changes message (300ms, source of truth with JOINs)
	 *
	 * @param newMessage - The raw message row from postgres_changes
	 */
	private async handlePostgresMessage(
		newMessage: Database['public']['Tables']['messages']['Row']
	): Promise<void> {
		if (!this.supabase) {
			logger.warn('Cannot handle postgres message: not initialized');
			return;
		}

		try {
			// Fetch full message with JOINs (sender profile)
			const { data, error } = await this.supabase
				.from('messages')
				.select(
					`
					*,
					sender:profiles!sender_id(id, full_name, avatar_url)
				`
				)
				.eq('id', newMessage.id)
				.single();

			if (error) {
				throw error;
			}

			if (!data) {
				logger.warn('Message not found after postgres_changes:', newMessage.id);
				return;
			}

			// Transform to Message type
			const fullMessage: Message = {
				id: data.id,
				conversation_id: data.conversation_id,
				sender_id: data.sender_id,
				content: data.content,
				plain_text: data.plain_text,
				created_at: data.created_at,
				edited_at: data.edited_at,
				deleted_at: data.deleted_at,
				is_flagged: data.is_flagged,
				flag_reason: data.flag_reason,
				sender: Array.isArray(data.sender)
					? {
							id: data.sender[0]?.id ?? '',
							full_name: data.sender[0]?.full_name ?? null,
							avatar_url: data.sender[0]?.avatar_url ?? null
						}
					: data.sender
						? {
								id: data.sender.id,
								full_name: data.sender.full_name,
								avatar_url: data.sender.avatar_url
							}
						: null
			};

			const existingMessages = this.messages.get(data.conversation_id) || [];

			// Find existing message to replace
			// Match by ID first (if already updated from optimistic -> DB ID)
			// OR by created_at timestamp (for broadcast messages or pre-update optimistic messages)
			const existingIndex = existingMessages.findIndex(
				(msg) => msg.id === data.id || msg.created_at === data.created_at
			);

			if (existingIndex !== -1) {
				// Replace existing message with full DB version (with JOINs)
				const updated = [...existingMessages];
				updated[existingIndex] = fullMessage;
				this.messages.set(data.conversation_id, updated);

				logger.info('Replaced broadcast/optimistic message with DB version:', data.id);
			} else {
				// Message not found (from other device?), append
				this.messages.set(data.conversation_id, [fullMessage, ...existingMessages]);

				logger.info('Added new message from postgres_changes:', data.id);
			}
		} catch (error) {
			logger.error('Failed to handle postgres_changes message:', error);
		}
	}

	/**
	 * Send typing indicator (Broadcast only, ephemeral)
	 *
	 * @param conversationId - The conversation ID
	 * @param isTyping - Whether the user is typing
	 */
	sendTypingIndicator(conversationId: string, isTyping: boolean): void {
		if (!browser || !this.userId) {
			return;
		}

		const channel = supabaseRealtimeManager.getChannel(`chat-${conversationId}`);
		if (!channel) {
			logger.warn('Channel not found for typing indicator:', conversationId);
			return;
		}

		channel
			.send({
				type: 'broadcast',
				event: 'typing_indicator',
				payload: {
					type: 'typing_indicator',
					userId: this.userId,
					isTyping
				} satisfies BroadcastTypingPayload
			})
			.catch((error) => {
				logger.error('Failed to send typing indicator:', error);
			});
	}

	/**
	 * Handle incoming typing indicator
	 *
	 * @param payload - Typing indicator payload
	 */
	private handleTypingIndicator(payload: BroadcastTypingPayload): void {
		// Ignore self
		if (payload.userId === this.userId) {
			return;
		}

		// Get or create typing users set for this conversation
		const conversationId = this.activeConversationId;
		if (!conversationId) {
			return;
		}

		let typingSet = this.typingUsers.get(conversationId);
		if (!typingSet) {
			// eslint-disable-next-line svelte/prefer-svelte-reactivity
			typingSet = new Set();
			this.typingUsers.set(conversationId, typingSet);
		}

		// Get or create timer map for this conversation
		let timerMap = this.typingTimers.get(conversationId);
		if (!timerMap) {
			// eslint-disable-next-line svelte/prefer-svelte-reactivity
			timerMap = new Map();
			this.typingTimers.set(conversationId, timerMap);
		}

		if (payload.isTyping) {
			// Add user to typing set
			typingSet.add(payload.userId);

			// Clear existing timer
			const existingTimer = timerMap.get(payload.userId);
			if (existingTimer) {
				clearTimeout(existingTimer);
			}

			// Auto-clear after 3 seconds
			const timer = setTimeout(() => {
				typingSet.delete(payload.userId);
				timerMap.delete(payload.userId);
			}, 3000);

			timerMap.set(payload.userId, timer);
		} else {
			// Remove user from typing set
			typingSet.delete(payload.userId);

			// Clear timer
			const timer = timerMap.get(payload.userId);
			if (timer) {
				clearTimeout(timer);
				timerMap.delete(payload.userId);
			}
		}

		logger.info('Typing indicator updated for user:', payload.userId, payload.isTyping);
	}

	/**
	 * Handle incoming message reaction
	 *
	 * @param payload - Reaction payload
	 */
	private handleReaction(payload: BroadcastReactionPayload): void {
		// Find the message across all conversations
		for (const [conversationId, messages] of this.messages.entries()) {
			const messageIndex = messages.findIndex((msg) => msg.id === payload.messageId);

			if (messageIndex !== -1) {
				const message = messages[messageIndex];

				if (!message.reactions) {
					message.reactions = [];
				}

				if (payload.action === 'add') {
					// Add reaction
					message.reactions.push({
						id: crypto.randomUUID(),
						message_id: payload.messageId,
						user_id: payload.userId,
						emoji: payload.emoji,
						created_at: new Date().toISOString()
					});
				} else {
					// Remove reaction
					message.reactions = message.reactions.filter(
						(r) => !(r.user_id === payload.userId && r.emoji === payload.emoji)
					);
				}

				// Trigger reactivity
				this.messages.set(conversationId, [...messages]);

				logger.info('Reaction updated:', payload);
				break;
			}
		}
	}

	/**
	 * Handle incoming read receipt
	 *
	 * @param payload - Read receipt payload
	 */
	private handleReadReceipt(payload: BroadcastReadReceiptPayload): void {
		// This would update read status UI - implement as needed
		logger.info('Read receipt received:', payload);
	}

	/**
	 * Get messages for a conversation
	 *
	 * @param conversationId - The conversation ID
	 * @returns Array of messages (newest first)
	 */
	getMessages(conversationId: string): Message[] {
		return this.messages.get(conversationId) || [];
	}

	/**
	 * Get typing users for a conversation
	 *
	 * @param conversationId - The conversation ID
	 * @returns Set of user IDs who are currently typing
	 */
	getTypingUsers(conversationId: string): Set<string> {
		return this.typingUsers.get(conversationId) || new Set();
	}

	/**
	 * Check if more messages can be loaded
	 *
	 * @param conversationId - The conversation ID
	 * @returns True if more messages exist
	 */
	canLoadMore(conversationId: string): boolean {
		return this.hasMore.get(conversationId) ?? false;
	}
}

export const chatStore = new ChatStore();
