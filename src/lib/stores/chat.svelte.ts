import { browser } from '$app/environment';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { supabaseRealtimeManager } from './supabaseRealtime.svelte';
import { createLogger } from '$lib/utils/logger';
import { friendsManager } from './friends.svelte';

const logger = createLogger('chat.svelte.ts');

/**
 * Conversation type representing a chat conversation with metadata
 */
export interface Conversation {
	id: string;
	name: string | null;
	is_group: boolean;
	class_id: string | null;
	last_message_preview: string | null;
	last_message_at: string | null;
	unread_count: number;
	participant_count: number;
	other_user_id: string | null;
	other_user_firstname: string | null;
	other_user_lastname: string | null;
	other_user_avatar_url: string | null;
	is_muted: boolean;
	created_at: string | null;
	updated_at: string | null;
}

/**
 * Typing user with full profile information
 */
export interface TypingUser {
	id: string;
	firstname: string | null;
	lastname: string | null;
}

/**
 * Message attachment metadata
 */
export interface MessageAttachment {
	id: string;
	file_name: string;
	file_type: string;
	file_size: number;
	storage_path: string;
	public_url: string;
}

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
	sender_firstname?: string | null; // Flattened for convenience
	sender_lastname?: string | null; // Flattened for convenience
	sender_avatar_url?: string | null; // Flattened for convenience
	attachments?: MessageAttachment[];
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
	count?: number; // Aggregated count from grouped reactions
	user_reacted?: boolean; // Did the current user react with this emoji
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
	 * Typing users per conversation (user ID only)
	 */
	private typingUsers = $state<Map<string, Set<string>>>(new Map());

	/**
	 * Typing users with full profile information per conversation
	 */
	private typingUsersMap = $state<Map<string, Map<string, TypingUser>>>(new Map());

	/**
	 * Conversations list organized by ID
	 */
	private conversationsMap = $state<Map<string, Conversation>>(new Map());

	/**
	 * Loading state for conversations list
	 */
	private loadingConversations = $state<boolean>(false);

	/**
	 * Loading state for messages
	 */
	private loadingMessages = $state<boolean>(false);

	/**
	 * Pagination tracking - whether more messages exist
	 */
	private hasMore = $state<Map<string, boolean>>(new Map());

	/**
	 * General loading state (legacy, kept for backward compatibility)
	 */
	loading = $state<boolean>(false);

	/**
	 * Typing timeout timers per user per conversation
	 */
	private typingTimers = new Map<string, Map<string, ReturnType<typeof setTimeout>>>();

	/**
	 * Get all conversations sorted by last message timestamp
	 */
	get conversations(): Conversation[] {
		return Array.from(this.conversationsMap.values()).sort((a, b) => {
			const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
			const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
			return bTime - aTime;
		});
	}

	/**
	 * Get the currently active conversation
	 */
	get activeConversation(): Conversation | null {
		return this.activeConversationId
			? (this.conversationsMap.get(this.activeConversationId) ?? null)
			: null;
	}

	/**
	 * Get messages for the active conversation
	 */
	get activeMessages(): Message[] {
		return this.activeConversationId ? this.getMessages(this.activeConversationId) : [];
	}

	/**
	 * Get typing users with profile info for the active conversation
	 */
	get activeTypingUsers(): TypingUser[] {
		if (!this.activeConversationId) return [];
		const typingSet = this.typingUsersMap.get(this.activeConversationId);
		return typingSet ? Array.from(typingSet.values()) : [];
	}

	/**
	 * Check if messages are currently loading
	 */
	get isLoadingMessages(): boolean {
		return this.loadingMessages;
	}

	/**
	 * Check if conversations are currently loading
	 */
	get isLoadingConversations(): boolean {
		return this.loadingConversations;
	}

	/**
	 * Initialize the chat store
	 *
	 * @param client - Supabase client instance
	 * @param currentUserId - Current authenticated user ID
	 * @param user - Optional user profile info (will be fetched if not provided)
	 */
	init(
		client: SupabaseClient<Database>,
		currentUserId: string,
		user?: { full_name: string | null; avatar_url: string | null }
	): void {
		if (!browser) {
			logger.warn('Cannot initialize chat store on server');
			return;
		}

		// Guard against re-initialization
		if (this.supabase && this.userId) {
			logger.warn('Chat store already initialized. Call cleanup() first to re-initialize.');
			return;
		}

		this.supabase = client;
		this.userId = currentUserId;
		this.currentUser = user ?? null;

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

		this.loadingMessages = true;
		this.loading = true; // Keep for backward compatibility

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
						full_name: `${msg.sender_firstname} ${msg.sender_lastname}`.trim(),
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
			this.loadingMessages = false;
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

		this.loadingMessages = true;
		this.loading = true; // Keep for backward compatibility

		try {
			const { data, error } = await this.supabase.rpc('get_messages_paginated', {
				p_conversation_id: conversationId,
				p_before_id: oldestMessage.id,
				p_before_timestamp: oldestMessage.created_at ?? undefined,
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
						full_name: `${msg.sender_firstname} ${msg.sender_lastname}`.trim(),
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
			this.loadingMessages = false;
			this.loading = false;
		}
	}

	/**
	 * Send a message (Optimistic UI → Broadcast → DB → postgres_changes)
	 *
	 * @param conversationId - The conversation ID
	 * @param content - The message content (plain text or rich JSON)
	 * @param attachments - Optional array of attachment records (without IDs, will be generated)
	 * @returns The sent message or null if failed
	 */
	async sendMessage(
		conversationId: string,
		content: unknown,
		attachments?: Array<{
			file_name: string;
			file_type: string;
			file_size: number;
			storage_path: string;
			public_url: string;
		}>
	): Promise<Message | null> {
		if (!browser || !this.supabase || !this.userId || !this.currentUser) {
			logger.warn('Cannot send message: not initialized');

			// If currentUser is missing, try to fetch it
			if (this.supabase && this.userId && !this.currentUser) {
				const { data: profile } = await this.supabase
					.from('profiles')
					.select('full_name, avatar_url')
					.eq('id', this.userId)
					.single();
				this.currentUser = profile ?? { full_name: null, avatar_url: null };

				// If still no user, bail out
				if (!this.currentUser) {
					logger.error('Cannot send message: user profile not found');
					return null;
				}
			} else {
				return null;
			}
		}

		// Convert content to the expected format
		const messageContent =
			typeof content === 'string'
				? { text: content }
				: (content as Database['public']['Tables']['messages']['Row']['content']);

		// Extract plain text for preview
		const plainText =
			typeof content === 'string' ? content : ((content as { text?: string })?.text ?? null);

		// 1. Create optimistic message
		const optimisticId = crypto.randomUUID();

		// Transform attachments to include IDs
		const messageAttachments: MessageAttachment[] = attachments
			? attachments.map((att) => ({
					id: crypto.randomUUID(),
					...att
				}))
			: [];

		const optimisticMessage: Message = {
			id: optimisticId,
			conversation_id: conversationId,
			sender_id: this.userId,
			content: messageContent,
			plain_text: plainText,
			created_at: new Date().toISOString(),
			edited_at: null,
			deleted_at: null,
			is_flagged: false,
			flag_reason: null,
			attachments: messageAttachments,
			reactions: [],
			is_optimistic: true,
			sender: {
				id: this.userId,
				full_name: this.currentUser.full_name,
				avatar_url: this.currentUser.avatar_url
			}
		};

		// 2. Add to local state (optimistic UI)
		const existingMessages = this.messages.get(conversationId) || [];
		this.messages.set(conversationId, [optimisticMessage, ...existingMessages]);

		logger.info('Added optimistic message:', optimisticId);

		// 3. Broadcast to other participants (instant delivery, ~50ms)
		const channel = supabaseRealtimeManager.getChannel(`chat-${conversationId}`);
		if (channel) {
			channel
				.send({
					type: 'broadcast',
					event: 'new_message',
					payload: {
						type: 'new_message',
						message: {
							id: optimisticId,
							conversation_id: conversationId,
							sender_id: this.userId,
							content: messageContent as Database['public']['Tables']['messages']['Row']['content'],
							plain_text: plainText,
							created_at: optimisticMessage.created_at ?? new Date().toISOString(),
							sender: {
								id: this.userId,
								full_name: this.currentUser.full_name,
								avatar_url: this.currentUser.avatar_url
							}
						}
					} satisfies BroadcastMessagePayload
				})
				.catch((err) => logger.error('Failed to broadcast message:', err));
		}

		// 4. Insert to database (persistent, ~200ms)
		try {
			const { data: insertedMessage, error: insertError } = await this.supabase
				.from('messages')
				.insert({
					id: optimisticId,
					conversation_id: conversationId,
					sender_id: this.userId,
					content: messageContent,
					plain_text: plainText
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
				deleted_at,
				is_flagged,
				flag_reason,
				sender:profiles!sender_id (
					id,
					full_name,
					avatar_url
				)
			`
				)
				.single();

			if (insertError) {
				logger.error('Failed to insert message to DB:', insertError);
				// Remove optimistic message on failure
				const currentMessages = this.messages.get(conversationId) || [];
				const rollback = currentMessages.filter((msg) => msg.id !== optimisticId);
				this.messages.set(conversationId, rollback);
				return null;
			}

			// 5. Insert attachments if provided
			if (attachments && attachments.length > 0) {
				const attachmentRecords = attachments.map((att) => ({
					message_id: optimisticId,
					file_name: att.file_name,
					file_type: att.file_type,
					file_size: att.file_size,
					storage_path: att.storage_path,
					public_url: att.public_url,
					uploaded_by: this.userId! // Safe to assert non-null as we checked at function start
				}));

				const { error: attachError } = await this.supabase
					.from('message_attachments')
					.insert(attachmentRecords);

				if (attachError) {
					logger.error('Failed to insert attachments:', attachError);
				}
			}

			// 6. Update optimistic message with DB data
			const dbMessage: Message = {
				id: insertedMessage.id,
				conversation_id: insertedMessage.conversation_id,
				sender_id: insertedMessage.sender_id,
				content: insertedMessage.content,
				plain_text: insertedMessage.plain_text,
				created_at: insertedMessage.created_at,
				edited_at: insertedMessage.edited_at,
				deleted_at: insertedMessage.deleted_at,
				is_flagged: insertedMessage.is_flagged,
				flag_reason: insertedMessage.flag_reason,
				attachments: messageAttachments,
				reactions: [],
				is_optimistic: false,
				sender: Array.isArray(insertedMessage.sender)
					? undefined
					: insertedMessage.sender
						? {
								id: insertedMessage.sender.id,
								full_name: insertedMessage.sender.full_name,
								avatar_url: insertedMessage.sender.avatar_url
							}
						: undefined
			};

			const currentMessages = this.messages.get(conversationId) || [];
			const updated = currentMessages.map((msg) => (msg.id === optimisticId ? dbMessage : msg));
			this.messages.set(conversationId, updated);

			logger.info('Message sent successfully:', optimisticId);
			return dbMessage;
		} catch (error) {
			logger.error('Failed to send message:', error);
			const currentMessages = this.messages.get(conversationId) || [];
			const rollback = currentMessages.filter((msg) => msg.id !== optimisticId);
			this.messages.set(conversationId, rollback);
			return null;
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
						: undefined
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

	/**
	 * Set the active conversation ID and subscribe to it
	 * @param conversationId - Conversation ID or null to clear
	 */
	setActiveConversation(conversationId: string | null): void {
		if (!browser) {
			logger.warn('Cannot set active conversation on server');
			return;
		}

		// Unsubscribe from previous conversation
		if (this.activeConversationId && this.activeConversationId !== conversationId) {
			this.unsubscribeFromConversation(this.activeConversationId).catch((err) =>
				logger.error('Failed to unsubscribe:', err)
			);
		}

		// Set new active conversation
		this.activeConversationId = conversationId;

		// If setting to a conversation, subscribe to it
		if (conversationId) {
			this.subscribeToConversation(conversationId)
				.then(() => this.loadConversationHistory(conversationId))
				.catch((err) => logger.error('Failed to load conversation:', err));

			// Mark conversation as read
			this.markConversationAsRead(conversationId);
		}
	}

	/**
	 * Load all conversations for the current user
	 * Uses the get_user_conversations RPC which returns conversations with metadata
	 *
	 * @throws {Error} If RPC call fails - caller should handle gracefully
	 */
	async loadConversations(): Promise<void> {
		if (!browser || !this.supabase || !this.userId) {
			logger.warn('Cannot load conversations: not initialized');
			return;
		}

		this.loadingConversations = true;

		try {
			// Call get_user_conversations RPC (exists in migration 042)
			const { data, error } = await this.supabase.rpc('get_user_conversations', {
				p_user_id: this.userId
			});

			if (error) {
				throw error;
			}

			if (data) {
				// Clear existing conversations
				this.conversationsMap.clear();

				// Populate conversations map
				data.forEach((conv) => {
					this.conversationsMap.set(conv.conversation_id, {
						id: conv.conversation_id,
						name: conv.name,
						is_group: conv.is_group,
						class_id: conv.class_id,
						last_message_preview: conv.last_message_preview,
						last_message_at: conv.last_message_at,
						unread_count: conv.unread_count,
						participant_count: conv.participant_count,
						other_user_id: conv.other_user_id,
						other_user_firstname: conv.other_user_firstname,
						other_user_lastname: conv.other_user_lastname,
						other_user_avatar_url: conv.other_user_avatar_url,
						is_muted: conv.is_muted,
						created_at: null, // Not returned by RPC
						updated_at: null // Not returned by RPC
					});
				});

				logger.info(`Loaded ${data.length} conversations`);
			}
		} catch (error) {
			logger.error('Failed to load conversations:', error);
			throw error;
		} finally {
			this.loadingConversations = false;
		}
	}

	/**
	 * Mark a conversation as read (clears unread count)
	 * Uses optimistic update for instant UI feedback
	 *
	 * @param conversationId - Conversation ID
	 * @private
	 * @note Errors are logged but NOT thrown (non-critical operation)
	 * @note Uses optimistic update - unread count cleared immediately, rolled back on error
	 */
	private async markConversationAsRead(conversationId: string): Promise<void> {
		if (!browser || !this.supabase || !this.userId) {
			return;
		}

		// Get conversation for optimistic update and rollback
		const conv = this.conversationsMap.get(conversationId);
		if (!conv) {
			logger.warn('Cannot mark as read: conversation not found', conversationId);
			return;
		}

		// Store original unread count for potential rollback
		const originalUnreadCount = conv.unread_count;

		// Optimistic update: Set unread count to 0 immediately (instant UI feedback)
		this.conversationsMap.set(conversationId, {
			...conv,
			unread_count: 0
		});

		try {
			// Call mark_conversation_read RPC (exists in migration 037)
			const { error } = await this.supabase.rpc('mark_conversation_read', {
				p_conversation_id: conversationId,
				p_user_id: this.userId
			});

			if (error) {
				throw error;
			}

			logger.trace('Marked conversation as read:', conversationId);
		} catch (error) {
			logger.error('Failed to mark conversation as read:', error);

			// Rollback optimistic update on error
			this.conversationsMap.set(conversationId, {
				...conv,
				unread_count: originalUnreadCount
			});

			// Non-critical error, don't throw
		}
	}

	/**
	 * Create or find a 1-on-1 chat conversation with a friend
	 * RPC has built-in duplicate detection, returns existing conversation if found
	 * @param friendId - Friend's user ID
	 * @returns Conversation ID or null if failed
	 */
	async create1on1Chat(friendId: string): Promise<string | null> {
		if (!browser || !this.supabase || !this.userId) {
			logger.warn('Cannot create chat: not initialized');
			return null;
		}

		// Pre-check if users are friends (client-side validation for immediate feedback)
		const areFriends = friendsManager.friendships.some(
			(f) => f.friend_profile.id === friendId && f.status === 'accepted'
		);

		if (!areFriends) {
			logger.warn('Cannot create chat: users are not friends', { friendId });
			return null;
		}

		try {
			// Call create_1on1_chat RPC (exists in migration 037)
			// RPC has built-in duplicate detection, returns existing conversation if found
			const { data, error } = await this.supabase.rpc('create_1on1_chat', {
				p_user1_id: this.userId,
				p_user2_id: friendId
			});

			if (error) {
				throw error;
			}

			if (!data) {
				logger.error('create_1on1_chat RPC returned no data');
				throw new Error('No conversation ID returned');
			}

			logger.info('Created/found 1-on-1 chat:', data);

			// Reload conversations to get the new one
			await this.loadConversations();

			return data; // RPC returns UUID
		} catch (error) {
			logger.error('Failed to create 1-on-1 chat:', error);
			return null;
		}
	}

	/**
	 * Toggle reaction on a message (add or remove)
	 * Uses Broadcast API (ephemeral, not persisted to database)
	 *
	 * @param messageId - Message ID
	 * @param emoji - Emoji to toggle
	 */
	toggleReaction(messageId: string, emoji: string): void {
		if (!browser || !this.userId) {
			logger.warn('Cannot toggle reaction: not initialized');
			return;
		}

		// Find message across all conversations
		for (const [conversationId, messages] of this.messages.entries()) {
			const messageIndex = messages.findIndex((msg) => msg.id === messageId);

			if (messageIndex !== -1) {
				const message = messages[messageIndex];

				// Initialize reactions array if needed
				if (!message.reactions) {
					message.reactions = [];
				}

				// Check if user already reacted with this emoji
				const existingReactionIndex = message.reactions.findIndex(
					(r) => r.user_id === this.userId && r.emoji === emoji
				);

				if (existingReactionIndex !== -1) {
					// Remove reaction (toggle off)
					message.reactions.splice(existingReactionIndex, 1);

					// Broadcast removal
					const channel = supabaseRealtimeManager.getChannel(`chat-${conversationId}`);
					if (channel) {
						channel
							.send({
								type: 'broadcast',
								event: 'message_reaction',
								payload: {
									type: 'message_reaction',
									messageId,
									userId: this.userId,
									emoji,
									action: 'remove'
								} satisfies BroadcastReactionPayload
							})
							.catch((err) => logger.error('Failed to broadcast reaction removal:', err));
					}

					logger.trace('Reaction removed:', { messageId, emoji, userId: this.userId });
				} else {
					// Add reaction (toggle on)
					message.reactions.push({
						id: crypto.randomUUID(),
						message_id: messageId,
						user_id: this.userId,
						emoji,
						created_at: new Date().toISOString()
					});

					// Broadcast addition
					const channel = supabaseRealtimeManager.getChannel(`chat-${conversationId}`);
					if (channel) {
						channel
							.send({
								type: 'broadcast',
								event: 'message_reaction',
								payload: {
									type: 'message_reaction',
									messageId,
									userId: this.userId,
									emoji,
									action: 'add'
								} satisfies BroadcastReactionPayload
							})
							.catch((err) => logger.error('Failed to broadcast reaction:', err));
					}

					logger.trace('Reaction added:', { messageId, emoji, userId: this.userId });
				}

				// Trigger reactivity by replacing the messages array
				this.messages.set(conversationId, [...messages]);

				break;
			}
		}
	}

	/**
	 * Report a message as inappropriate
	 * Calls the /api/chat/reports endpoint
	 *
	 * @param messageId - Message ID to report
	 * @param reason - Report reason
	 * @param details - Additional details (optional)
	 * @returns True if successful, false otherwise
	 */
	async reportMessage(
		messageId: string,
		reason: 'spam' | 'harassment' | 'inappropriate' | 'other',
		details?: string
	): Promise<boolean> {
		if (!browser || !this.supabase) {
			logger.warn('Cannot report message: not initialized');
			return false;
		}

		try {
			const response = await fetch('/api/chat/reports', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					messageId,
					reason,
					details: details ?? undefined
				})
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
				throw new Error(errorData.message || 'Failed to report message');
			}

			logger.info('Message reported:', messageId, reason);
			return true;
		} catch (error) {
			logger.error('Failed to report message:', error);
			return false;
		}
	}

	/**
	 * Load messages for a conversation (convenience wrapper)
	 * @param conversationId - Conversation ID
	 * @param limit - Number of messages to load
	 * @param beforeId - Load messages before this ID (pagination)
	 * @param _beforeTimestamp - Load messages before this timestamp
	 */
	async loadMessages(
		conversationId: string,
		limit = 50,
		beforeId?: string,
		_beforeTimestamp?: string | null
	): Promise<void> {
		if (beforeId) {
			return this.loadMoreMessages(conversationId, limit);
		}
		return this.loadConversationHistory(conversationId, limit);
	}
}

export const chatStore = new ChatStore();
