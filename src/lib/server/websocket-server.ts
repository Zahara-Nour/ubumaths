import { WebSocketServer, WebSocket } from 'ws';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const PORT = 3001;

// Initialize Supabase client (admin mode for server operations)
const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
	console.error('Missing Supabase environment variables');
	console.error('PUBLIC_SUPABASE_URL:', supabaseUrl);
	console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Set' : 'Not set');
	process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

// Connection store: Map<user_id, WebSocket>
const connections = new Map<string, WebSocket>();

// WebSocket message types
interface WSMessage {
	type:
		| 'heartbeat'
		| 'auth'
		| 'presence_update'
		| 'chat_message'
		| 'typing_indicator'
		| 'message_read'
		| 'message_reaction';
	userId?: string;
	token?: string;
	status?: 'online' | 'offline';
	// Chat-specific fields
	conversationId?: string;
	messageId?: string;
	content?: unknown;
	attachments?: unknown[];
	isTyping?: boolean;
	emoji?: string;
	action?: 'add' | 'remove';
}

interface PresenceUpdateMessage {
	type: 'presence_update';
	userId: string;
	status: 'online' | 'offline';
}

interface ChatMessageBroadcast {
	type: 'chat_message';
	conversationId: string;
	messageId: string;
	senderId: string;
	content: unknown;
	attachments?: unknown[];
	createdAt: string;
}

interface TypingIndicatorBroadcast {
	type: 'typing_indicator';
	conversationId: string;
	userId: string;
	isTyping: boolean;
}

interface MessageReadBroadcast {
	type: 'message_read';
	conversationId: string;
	userId: string;
	messageId: string;
	readAt: string;
}

interface MessageReactionBroadcast {
	type: 'message_reaction';
	messageId: string;
	userId: string;
	emoji: string;
	action: 'add' | 'remove';
}

// Get friend IDs for a user
async function getFriendIds(userId: string): Promise<string[]> {
	const { data, error } = await supabase.rpc('get_friend_ids', { p_user_id: userId });

	if (error) {
		console.error('Error fetching friend IDs:', error);
		return [];
	}

	return data?.map((row: { friend_id: string }) => row.friend_id) || [];
}

// Get conversation participant IDs
async function getConversationParticipantIds(conversationId: string): Promise<string[]> {
	const { data, error } = await supabase
		.from('conversation_participants')
		.select('user_id')
		.eq('conversation_id', conversationId);

	if (error) {
		console.error('Error fetching conversation participants:', error);
		return [];
	}

	return data?.map((row) => row.user_id) || [];
}

// Update user presence in database
async function updatePresence(userId: string, status: 'online' | 'offline'): Promise<void> {
	const { error } = await supabase.rpc('upsert_user_presence', {
		p_user_id: userId,
		p_status: status
	});

	if (error) {
		console.error('Error updating presence:', error);
	}
}

// Broadcast presence update to specific users
function broadcastToUsers(userIds: string[], message: PresenceUpdateMessage): void {
	userIds.forEach((userId) => {
		const ws = connections.get(userId);
		if (ws && ws.readyState === WebSocket.OPEN) {
			ws.send(JSON.stringify(message));
		}
	});
}

// Verify JWT token and extract user ID
async function verifyToken(token: string): Promise<string | null> {
	const {
		data: { user },
		error
	} = await supabase.auth.getUser(token);

	if (error || !user) {
		console.error('Token verification failed:', error);
		return null;
	}

	return user.id;
}

// Handle WebSocket connection
async function handleConnection(ws: WebSocket): Promise<void> {
	let userId: string | null = null;
	const heartbeatInterval: NodeJS.Timeout | null = null;

	ws.on('message', async (data: Buffer) => {
		try {
			const message: WSMessage = JSON.parse(data.toString());

			switch (message.type) {
				case 'auth': {
					// Authenticate user with JWT token
					if (!message.token) {
						ws.send(JSON.stringify({ type: 'error', message: 'Token required' }));
						ws.close();
						return;
					}

					const verifiedUserId = await verifyToken(message.token);
					if (!verifiedUserId) {
						ws.send(JSON.stringify({ type: 'error', message: 'Invalid token' }));
						ws.close();
						return;
					}

					userId = verifiedUserId;
					connections.set(userId, ws);

					// Update presence to online
					await updatePresence(userId, 'online');

					// Notify friends
					const friendIds = await getFriendIds(userId);
					broadcastToUsers(friendIds, {
						type: 'presence_update',
						userId,
						status: 'online'
					});

					// Send confirmation
					ws.send(JSON.stringify({ type: 'auth_success', userId }));

					console.log(`User ${userId} connected`);
					break;
				}

				case 'heartbeat': {
					// Update heartbeat timestamp
					if (userId) {
						await updatePresence(userId, 'online');
					}
					break;
				}

				case 'chat_message': {
					// Broadcast new message to conversation participants
					if (!userId || !message.conversationId || !message.messageId) {
						ws.send(JSON.stringify({ type: 'error', message: 'Invalid chat message payload' }));
						return;
					}

					const participantIds = await getConversationParticipantIds(message.conversationId);
					const broadcast: ChatMessageBroadcast = {
						type: 'chat_message',
						conversationId: message.conversationId,
						messageId: message.messageId,
						senderId: userId,
						content: message.content,
						attachments: message.attachments,
						createdAt: new Date().toISOString()
					};

					// Broadcast to all participants except sender
					broadcastToUsers(
						participantIds.filter((id) => id !== userId),
						broadcast
					);
					break;
				}

				case 'typing_indicator': {
					// Broadcast typing indicator to conversation participants
					if (!userId || !message.conversationId || message.isTyping === undefined) {
						return;
					}

					const participantIds = await getConversationParticipantIds(message.conversationId);
					const broadcast: TypingIndicatorBroadcast = {
						type: 'typing_indicator',
						conversationId: message.conversationId,
						userId,
						isTyping: message.isTyping
					};

					// Broadcast to all participants except sender
					broadcastToUsers(
						participantIds.filter((id) => id !== userId),
						broadcast
					);
					break;
				}

				case 'message_read': {
					// Broadcast read receipt to conversation participants
					if (!userId || !message.conversationId || !message.messageId) {
						return;
					}

					const participantIds = await getConversationParticipantIds(message.conversationId);
					const broadcast: MessageReadBroadcast = {
						type: 'message_read',
						conversationId: message.conversationId,
						userId,
						messageId: message.messageId,
						readAt: new Date().toISOString()
					};

					// Broadcast to all participants except reader
					broadcastToUsers(
						participantIds.filter((id) => id !== userId),
						broadcast
					);
					break;
				}

				case 'message_reaction': {
					// Broadcast reaction to conversation participants
					if (!userId || !message.messageId || !message.emoji || !message.action) {
						return;
					}

					// Get conversation ID from message
					const { data: msg } = await supabase
						.from('messages')
						.select('conversation_id')
						.eq('id', message.messageId)
						.single();

					if (!msg) {
						return;
					}

					const participantIds = await getConversationParticipantIds(msg.conversation_id);
					const broadcast: MessageReactionBroadcast = {
						type: 'message_reaction',
						messageId: message.messageId,
						userId,
						emoji: message.emoji,
						action: message.action
					};

					// Broadcast to all participants except reactor
					broadcastToUsers(
						participantIds.filter((id) => id !== userId),
						broadcast
					);
					break;
				}

				default:
					console.warn('Unknown message type:', message.type);
			}
		} catch (error) {
			console.error('Error handling message:', error);
		}
	});

	ws.on('close', async () => {
		if (userId) {
			console.log(`User ${userId} disconnected`);

			// Remove from connections
			connections.delete(userId);

			// Clear heartbeat interval
			if (heartbeatInterval) {
				clearInterval(heartbeatInterval);
			}

			// Update presence to offline
			await updatePresence(userId, 'offline');

			// Notify friends
			const friendIds = await getFriendIds(userId);
			broadcastToUsers(friendIds, {
				type: 'presence_update',
				userId,
				status: 'offline'
			});
		}
	});

	ws.on('error', (error) => {
		console.error('WebSocket error:', error);
	});
}

// Cleanup stale presence (every minute)
setInterval(async () => {
	const { error } = await supabase.rpc('cleanup_stale_presence');
	if (error) {
		console.error('Error cleaning up stale presence:', error);
	}
}, 60000); // 1 minute

// Create WebSocket server
const wss = new WebSocketServer({ port: PORT });

wss.on('connection', handleConnection);

wss.on('error', (error) => {
	console.error('WebSocket server error:', error);
});

console.log(`WebSocket server running on ws://localhost:${PORT}`);
