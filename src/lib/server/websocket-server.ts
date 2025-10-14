import { WebSocketServer, WebSocket } from 'ws';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

const PORT = 3001;

// Initialize Supabase client (admin mode for server operations)
const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
	console.error('Missing Supabase environment variables');
	process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

// Connection store: Map<user_id, WebSocket>
const connections = new Map<string, WebSocket>();

// WebSocket message types
interface WSMessage {
	type: 'heartbeat' | 'auth' | 'presence_update';
	userId?: string;
	token?: string;
	status?: 'online' | 'offline';
}

interface PresenceUpdateMessage {
	type: 'presence_update';
	userId: string;
	status: 'online' | 'offline';
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
	let heartbeatInterval: NodeJS.Timeout | null = null;

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
