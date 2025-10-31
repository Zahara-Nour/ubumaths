import { toaster } from '$lib/stores/toaster.svelte';
import type { Database } from '$lib/types/database';

/**
 * Private Messages Store
 * Manages private messaging state and operations
 */

// Database types
type MessageDraftRow = Database['public']['Tables']['message_drafts']['Row'];

// Types
export interface PrivateMessage {
	message_id: string;
	sender_id: string;
	sender_name: string;
	sender_avatar_url: string | null;
	subject: string;
	content: unknown; // TipTap JSON
	plain_text: string;
	sent_at: string;
	read_at: string | null;
	is_starred: boolean;
	status: 'inbox' | 'archived' | 'trash';
	is_group_message: boolean;
	recipient_count: number;
	has_attachments: boolean;
	attachment_count: number;
}

export interface SentMessage {
	message_id: string;
	subject: string;
	content: unknown;
	plain_text: string;
	sent_at: string;
	is_group_message: boolean;
	recipient_count: number;
	has_attachments: boolean;
	recipients: Array<{
		id: string;
		name: string;
		avatar_url: string | null;
	}>;
}

export interface MessageRecipient {
	user_id: string;
	full_name: string;
	avatar_url: string | null;
	role: string;
	relationship: string;
}

export interface TeacherClass {
	class_id: string;
	class_name: string;
	student_count: number;
}

export interface MessageRecipientDisplay {
	id: string;
	name: string;
	avatar_url: string | null;
}

export interface MessageAttachment {
	id: string;
	file_name: string;
	file_type: string;
	file_size: number;
	public_url: string;
}

export interface MessageDetails {
	message_id: string;
	sender_id: string;
	sender_name: string;
	sender_avatar_url: string | null;
	sender_role: string;
	subject: string;
	content: unknown;
	plain_text: string;
	sent_at: string;
	edited_at: string | null;
	is_group_message: boolean;
	recipient_count: number;
	parent_message_id: string | null;
	thread_root_id: string | null;
	read_at: string | null;
	is_starred: boolean;
	status: string;
	attachments: MessageAttachment[] | null;
	recipients: MessageRecipientDisplay[] | null;
}

class PrivateMessagesStore {
	// State
	inbox = $state<PrivateMessage[]>([]);
	sent = $state<SentMessage[]>([]);
	currentMessage = $state<MessageDetails | null>(null);
	currentThread = $state<MessageDetails[]>([]);
	drafts = $state<MessageDraftRow[]>([]);

	recipients = $state<MessageRecipient[]>([]);
	classes = $state<TeacherClass[]>([]);
	userRole = $state<string | null>(null);

	unreadCount = $state<number>(0);

	isLoading = $state<boolean>(false);
	isLoadingRecipients = $state<boolean>(false);

	// Actions

	/**
	 * Load inbox messages
	 */
	async loadInbox(status: 'inbox' | 'archived' | 'trash' = 'inbox', folderId?: string) {
		this.isLoading = true;
		try {
			const params = new URLSearchParams({
				status,
				...(folderId && { folderId })
			});

			const response = await fetch(`/api/messages/inbox?${params}`);
			if (!response.ok) {
				throw new Error('Erreur lors du chargement de la boîte de réception');
			}

			const data = await response.json();
			this.inbox = data.messages;
		} catch (error) {
			console.error('Error loading inbox:', error);
			toaster.error('Impossible de charger la boîte de réception');
		} finally {
			this.isLoading = false;
		}
	}

	/**
	 * Load sent messages
	 */
	async loadSent() {
		this.isLoading = true;
		try {
			const response = await fetch('/api/messages/sent');
			if (!response.ok) {
				throw new Error('Erreur lors du chargement des messages envoyés');
			}

			const data = await response.json();
			this.sent = data.messages;
		} catch (error) {
			console.error('Error loading sent messages:', error);
			toaster.error('Impossible de charger les messages envoyés');
		} finally {
			this.isLoading = false;
		}
	}

	/**
	 * Load allowed recipients
	 */
	async loadRecipients() {
		this.isLoadingRecipients = true;
		try {
			const response = await fetch('/api/messages/recipients');
			if (!response.ok) {
				throw new Error('Erreur lors du chargement des destinataires');
			}

			const data = await response.json();
			this.recipients = data.recipients;
			this.classes = data.classes;
			this.userRole = data.userRole;
		} catch (error) {
			console.error('Error loading recipients:', error);
			toaster.error('Impossible de charger les destinataires');
		} finally {
			this.isLoadingRecipients = false;
		}
	}

	/**
	 * Send a message
	 */
	async sendMessage(params: {
		recipientIds?: string[];
		subject: string;
		content: unknown;
		isGroupMessage?: boolean;
		classId?: string;
		parentMessageId?: string;
	}) {
		try {
			const response = await fetch('/api/messages/send', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(params)
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || "Erreur lors de l'envoi du message");
			}

			const data = await response.json();
			toaster.success('Message envoyé avec succès');

			// Reload sent messages
			await this.loadSent();

			return data.messageId;
		} catch (error) {
			console.error('Error sending message:', error);
			toaster.error(error instanceof Error ? error.message : "Impossible d'envoyer le message");
			throw error;
		}
	}

	/**
	 * Get message details
	 */
	async loadMessage(messageId: string) {
		this.isLoading = true;
		try {
			const response = await fetch(`/api/messages/${messageId}`);
			if (!response.ok) {
				throw new Error('Message non trouvé');
			}

			const data = await response.json();
			this.currentMessage = data.message;

			// Reload inbox to update read status
			await this.loadInbox();
			await this.loadUnreadCount();

			return data.message;
		} catch (error) {
			console.error('Error loading message:', error);
			toaster.error('Impossible de charger le message');
			throw error;
		} finally {
			this.isLoading = false;
		}
	}

	/**
	 * Load message thread
	 */
	async loadThread(rootId: string) {
		this.isLoading = true;
		try {
			const response = await fetch(`/api/messages/thread?rootId=${rootId}`);
			if (!response.ok) {
				throw new Error('Fil de discussion non trouvé');
			}

			const data = await response.json();
			this.currentThread = data.messages;
		} catch (error) {
			console.error('Error loading thread:', error);
			toaster.error('Impossible de charger le fil de discussion');
		} finally {
			this.isLoading = false;
		}
	}

	/**
	 * Toggle star status
	 */
	async toggleStar(messageId: string) {
		try {
			const response = await fetch(`/api/messages/${messageId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'toggleStar' })
			});

			if (!response.ok) {
				throw new Error('Erreur lors de la mise à jour du favori');
			}

			const data = await response.json();

			// Update local state
			const message = this.inbox.find((m) => m.message_id === messageId);
			if (message) {
				message.is_starred = data.isStarred;
			}

			if (this.currentMessage && this.currentMessage.message_id === messageId) {
				this.currentMessage.is_starred = data.isStarred;
			}
		} catch (error) {
			console.error('Error toggling star:', error);
			toaster.error('Impossible de mettre à jour le favori');
		}
	}

	/**
	 * Toggle read/unread status
	 */
	async toggleRead(messageId: string) {
		try {
			const response = await fetch(`/api/messages/${messageId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'toggleRead' })
			});

			if (!response.ok) {
				throw new Error('Erreur lors de la mise à jour du statut de lecture');
			}

			const data = await response.json();

			// Update local state
			const message = this.inbox.find((m) => m.message_id === messageId);
			if (message) {
				message.read_at = data.isRead ? new Date().toISOString() : null;
			}

			if (this.currentMessage && this.currentMessage.message_id === messageId) {
				this.currentMessage.read_at = data.isRead ? new Date().toISOString() : null;
			}

			// Update unread count
			await this.loadUnreadCount();
		} catch (error) {
			console.error('Error toggling read status:', error);
			toaster.error('Impossible de mettre à jour le statut de lecture');
		}
	}

	/**
	 * Update message status (archive, trash, etc.)
	 */
	async updateStatus(messageId: string, status: 'inbox' | 'archived' | 'trash') {
		try {
			const response = await fetch(`/api/messages/${messageId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'updateStatus', status })
			});

			if (!response.ok) {
				throw new Error('Erreur lors de la mise à jour du statut');
			}

			// Remove from current inbox view
			this.inbox = this.inbox.filter((m) => m.message_id !== messageId);

			const statusText =
				status === 'archived' ? 'archivé' : status === 'trash' ? 'supprimé' : 'déplacé';
			toaster.success(`Message ${statusText}`);
		} catch (error) {
			console.error('Error updating status:', error);
			toaster.error('Impossible de mettre à jour le message');
		}
	}

	/**
	 * Move message to folder
	 */
	async moveToFolder(messageId: string, folderId: string) {
		try {
			const response = await fetch(`/api/messages/${messageId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'moveToFolder', folderId })
			});

			if (!response.ok) {
				throw new Error('Erreur lors du déplacement vers le dossier');
			}

			toaster.success('Message déplacé vers le dossier');
			await this.loadInbox();
		} catch (error) {
			console.error('Error moving to folder:', error);
			toaster.error('Impossible de déplacer le message');
		}
	}

	/**
	 * Delete message
	 */
	async deleteMessage(messageId: string) {
		try {
			const response = await fetch(`/api/messages/${messageId}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				throw new Error('Erreur lors de la suppression du message');
			}

			this.inbox = this.inbox.filter((m) => m.message_id !== messageId);
			this.sent = this.sent.filter((m) => m.message_id !== messageId);

			toaster.success('Message supprimé');
		} catch (error) {
			console.error('Error deleting message:', error);
			toaster.error('Impossible de supprimer le message');
		}
	}

	/**
	 * Load unread count
	 */
	async loadUnreadCount() {
		try {
			const response = await fetch('/api/messages/unread-count');
			if (!response.ok) {
				throw new Error('Erreur lors du chargement du compteur');
			}

			const data = await response.json();
			this.unreadCount = data.unreadCount;
		} catch (error) {
			console.error('Error loading unread count:', error);
		}
	}

	/**
	 * Search messages
	 */
	async searchMessages(params: {
		query: string;
		searchIn?: 'inbox' | 'sent' | 'all';
		hasAttachments?: boolean;
		senderName?: string;
		dateFrom?: string;
		dateTo?: string;
	}) {
		this.isLoading = true;
		try {
			const searchParams = new URLSearchParams({
				q: params.query,
				...(params.searchIn && { searchIn: params.searchIn }),
				...(params.hasAttachments !== undefined && {
					hasAttachments: String(params.hasAttachments)
				}),
				...(params.senderName && { senderName: params.senderName }),
				...(params.dateFrom && { dateFrom: params.dateFrom }),
				...(params.dateTo && { dateTo: params.dateTo })
			});

			const response = await fetch(`/api/messages/search?${searchParams}`);
			if (!response.ok) {
				throw new Error('Erreur lors de la recherche');
			}

			const data = await response.json();
			return data.messages;
		} catch (error) {
			console.error('Error searching messages:', error);
			toaster.error('Erreur lors de la recherche');
			return [];
		} finally {
			this.isLoading = false;
		}
	}

	/**
	 * Load drafts
	 */
	async loadDrafts() {
		try {
			const response = await fetch('/api/messages/drafts');
			if (!response.ok) {
				throw new Error('Erreur lors du chargement des brouillons');
			}

			const data = await response.json();
			this.drafts = data.drafts;
		} catch (error) {
			console.error('Error loading drafts:', error);
			toaster.error('Impossible de charger les brouillons');
		}
	}

	/**
	 * Save draft (create or update)
	 */
	async saveDraft(params: {
		id?: string;
		subject?: string;
		content?: unknown;
		recipientIds?: string[];
		isGroupMessage?: boolean;
		classId?: string;
		replyingToMessageId?: string;
	}) {
		try {
			const response = await fetch('/api/messages/drafts', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(params)
			});

			if (!response.ok) {
				throw new Error('Erreur lors de la sauvegarde du brouillon');
			}

			const data = await response.json();

			// Update drafts list
			if (params.id) {
				this.drafts = this.drafts.map((d) => (d.id === params.id ? data.draft : d));
			} else {
				this.drafts = [data.draft, ...this.drafts];
			}

			return data.draft;
		} catch (error) {
			console.error('Error saving draft:', error);
			toaster.error('Impossible de sauvegarder le brouillon');
			throw error;
		}
	}

	/**
	 * Delete draft
	 */
	async deleteDraft(draftId: string) {
		try {
			const response = await fetch(`/api/messages/drafts/${draftId}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				throw new Error('Erreur lors de la suppression du brouillon');
			}

			this.drafts = this.drafts.filter((d) => d.id !== draftId);
			toaster.success('Brouillon supprimé');
		} catch (error) {
			console.error('Error deleting draft:', error);
			toaster.error('Impossible de supprimer le brouillon');
		}
	}

	/**
	 * Reset state
	 */
	reset() {
		this.inbox = [];
		this.sent = [];
		this.currentMessage = null;
		this.currentThread = [];
		this.drafts = [];
		this.recipients = [];
		this.classes = [];
		this.userRole = null;
		this.unreadCount = 0;
	}
}

// Export singleton instance
export const privateMessages = new PrivateMessagesStore();
