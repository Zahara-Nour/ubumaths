import { browser } from '$app/environment';

const WS_URL = 'ws://localhost:3001';
const HEARTBEAT_INTERVAL = 60000; // 60 seconds
const RECONNECT_BASE_DELAY = 1000; // 1 second
const RECONNECT_MAX_DELAY = 30000; // 30 seconds

interface PresenceUpdate {
	type: 'presence_update';
	userId: string;
	status: 'online' | 'offline';
}

interface AuthSuccess {
	type: 'auth_success';
	userId: string;
}

interface ErrorMessage {
	type: 'error';
	message: string;
}

type WSMessage = PresenceUpdate | AuthSuccess | ErrorMessage;

class WebSocketManager {
	private ws: WebSocket | null = null;
	private heartbeatInterval: number | null = null;
	private reconnectTimeout: number | null = null;
	private reconnectAttempts = 0;
	private token: string | null = null;
	private userId: string | null = null;
	private shouldReconnect = true;

	friendsPresence = $state<Map<string, 'online' | 'offline'>>(new Map());
	connectionStatus = $state<'connected' | 'disconnected' | 'connecting'>('disconnected');

	/**
	 * Connect to WebSocket server with authentication
	 */
	connect(userId: string, token: string): void {
		if (!browser) return;

		this.userId = userId;
		this.token = token;
		this.shouldReconnect = true;
		this.reconnectAttempts = 0;

		this.establishConnection();
	}

	/**
	 * Disconnect from WebSocket server
	 */
	disconnect(): void {
		this.shouldReconnect = false;

		if (this.heartbeatInterval) {
			clearInterval(this.heartbeatInterval);
			this.heartbeatInterval = null;
		}

		if (this.reconnectTimeout) {
			clearTimeout(this.reconnectTimeout);
			this.reconnectTimeout = null;
		}

		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}

		this.connectionStatus = 'disconnected';
		this.friendsPresence.clear();
	}

	/**
	 * Establish WebSocket connection
	 */
	private establishConnection(): void {
		if (!browser || !this.token) return;

		this.connectionStatus = 'connecting';

		try {
			this.ws = new WebSocket(WS_URL);

			this.ws.onopen = () => {
				console.log('WebSocket connected');
				this.connectionStatus = 'connected';
				this.reconnectAttempts = 0;

				// Send authentication message
				this.send({
					type: 'auth',
					token: this.token!
				});

				// Start heartbeat
				this.startHeartbeat();
			};

			this.ws.onmessage = (event) => {
				this.handleMessage(event);
			};

			this.ws.onerror = (error) => {
				console.error('WebSocket error:', error);
			};

			this.ws.onclose = () => {
				console.log('WebSocket disconnected');
				this.connectionStatus = 'disconnected';

				// Clear heartbeat
				if (this.heartbeatInterval) {
					clearInterval(this.heartbeatInterval);
					this.heartbeatInterval = null;
				}

				// Attempt reconnection if needed
				if (this.shouldReconnect) {
					this.scheduleReconnect();
				}
			};
		} catch (error) {
			console.error('Failed to create WebSocket:', error);
			this.connectionStatus = 'disconnected';

			if (this.shouldReconnect) {
				this.scheduleReconnect();
			}
		}
	}

	/**
	 * Handle incoming WebSocket messages
	 */
	private handleMessage(event: MessageEvent): void {
		try {
			const message: WSMessage = JSON.parse(event.data);

			switch (message.type) {
				case 'auth_success':
					console.log('WebSocket authentication successful');
					break;

				case 'presence_update':
					// Update friend presence in map
					this.friendsPresence.set(message.userId, message.status);
					console.log(`Friend ${message.userId} is now ${message.status}`);
					break;

				case 'error':
					console.error('WebSocket error:', message.message);
					break;

				default:
					console.warn('Unknown message type:', message);
			}
		} catch (error) {
			console.error('Error parsing WebSocket message:', error);
		}
	}

	/**
	 * Send message to WebSocket server
	 */
	send(message: object): void {
		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			this.ws.send(JSON.stringify(message));
		}
	}

	/**
	 * Start periodic heartbeat
	 */
	private startHeartbeat(): void {
		if (this.heartbeatInterval) {
			clearInterval(this.heartbeatInterval);
		}

		this.heartbeatInterval = setInterval(() => {
			this.send({ type: 'heartbeat' });
		}, HEARTBEAT_INTERVAL) as unknown as number;
	}

	/**
	 * Schedule reconnection with exponential backoff
	 */
	private scheduleReconnect(): void {
		if (this.reconnectTimeout) {
			clearTimeout(this.reconnectTimeout);
		}

		const delay = Math.min(
			RECONNECT_BASE_DELAY * Math.pow(2, this.reconnectAttempts),
			RECONNECT_MAX_DELAY
		);

		console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);

		this.reconnectTimeout = setTimeout(() => {
			this.reconnectAttempts++;
			this.establishConnection();
		}, delay) as unknown as number;
	}

	/**
	 * Get presence status for a specific friend
	 */
	getFriendPresence(friendId: string): 'online' | 'offline' {
		return this.friendsPresence.get(friendId) ?? 'offline';
	}
}

export const websocketManager = new WebSocketManager();
