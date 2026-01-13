/**
 * Google Drive Sync Service
 * Client-side service for synchronizing whiteboard documents with Google Drive
 *
 * Features:
 * - Save/load documents to/from Drive
 * - Auto-sync with debouncing
 * - Error handling with user feedback
 * - Sync state management
 */

import { toaster } from '$lib/stores/toaster.svelte';
import { AUTO_SYNC_DELAY } from '../utils/sync-state';
import type { WhiteboardDocument } from '../types/document';

// ============================================================================
// Types
// ============================================================================

export interface SyncResult {
	success: boolean;
	fileId?: string;
	modifiedTime?: string;
	error?: string;
}

export interface DriveFile {
	id: string;
	name: string;
	modifiedTime: string;
	/** Thumbnail data URL (WebP or JPEG) */
	thumbnailUrl?: string;
}

export interface LoadResult {
	success: boolean;
	document?: WhiteboardDocument;
	fileId?: string;
	name?: string;
	modifiedTime?: string;
	error?: string;
}

// ============================================================================
// Drive Sync Service
// ============================================================================

class DriveSyncService {
	private autoSyncTimeout: ReturnType<typeof setTimeout> | null = null;
	private isSyncing = false;

	/**
	 * Save whiteboard document to Google Drive
	 *
	 * @param options - Save options
	 * @returns Sync result with file ID and timestamp
	 */
	async saveToDrive(options: {
		document: WhiteboardDocument;
		fileName: string;
		fileId?: string;
		/** Optional thumbnail data URL (WebP/JPEG) to save alongside the document */
		thumbnail?: string;
	}): Promise<SyncResult> {
		if (this.isSyncing) {
			return { success: false, error: 'Synchronisation déjà en cours' };
		}

		this.isSyncing = true;

		try {
			const response = await fetch('/api/whiteboard/drive/save', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					document: options.document,
					fileName: options.fileName,
					fileId: options.fileId,
					thumbnail: options.thumbnail
				})
			});

			if (!response.ok) {
				const error = await response.json().catch(() => ({ message: 'Erreur de sauvegarde' }));
				throw new Error(error.message || `Erreur ${response.status}`);
			}

			const result = await response.json();
			return {
				success: true,
				fileId: result.fileId,
				modifiedTime: result.modifiedTime
			};
		} catch (e) {
			const errorMsg = e instanceof Error ? e.message : 'Erreur inconnue';
			return { success: false, error: errorMsg };
		} finally {
			this.isSyncing = false;
		}
	}

	/**
	 * List whiteboard files from Google Drive
	 *
	 * @returns Array of file metadata
	 */
	async listFiles(): Promise<DriveFile[]> {
		const response = await fetch('/api/whiteboard/drive/list');

		if (!response.ok) {
			const error = await response.json().catch(() => ({ message: 'Erreur de chargement' }));
			throw new Error(error.message || `Erreur ${response.status}`);
		}

		const data = await response.json();
		return data.files;
	}

	/**
	 * Load whiteboard document from Google Drive
	 *
	 * @param fileId - Google Drive file ID
	 * @returns Load result with document and metadata
	 */
	async loadFromDrive(fileId: string): Promise<LoadResult> {
		try {
			const response = await fetch(`/api/whiteboard/drive/load/${fileId}`);

			if (!response.ok) {
				const error = await response.json().catch(() => ({ message: 'Erreur de chargement' }));
				throw new Error(error.message || `Erreur ${response.status}`);
			}

			const data = await response.json();
			return {
				success: true,
				document: data.document as WhiteboardDocument,
				fileId: data.fileId,
				name: data.name,
				modifiedTime: data.modifiedTime
			};
		} catch (e) {
			const errorMsg = e instanceof Error ? e.message : 'Erreur inconnue';
			return { success: false, error: errorMsg };
		}
	}

	/**
	 * Schedule auto-sync with debouncing
	 * Cancels any pending auto-sync and schedules a new one
	 *
	 * @param document - Document to save
	 * @param fileName - File name
	 * @param fileId - Existing file ID (for updates)
	 * @param onSyncComplete - Callback when sync completes
	 */
	scheduleAutoSync(
		document: WhiteboardDocument,
		fileName: string,
		fileId: string | undefined,
		onSyncComplete?: (result: SyncResult) => void
	): void {
		this.cancelAutoSync();

		this.autoSyncTimeout = setTimeout(async () => {
			const result = await this.saveToDrive({ document, fileName, fileId });

			if (result.success) {
				// Silent success for auto-sync
				console.log('[DriveSyncService] Auto-sync completed:', result.fileId);
			} else {
				// Show error toast for auto-sync failures
				toaster.error(`Erreur de synchronisation: ${result.error}`);
			}

			onSyncComplete?.(result);
		}, AUTO_SYNC_DELAY);
	}

	/**
	 * Cancel any pending auto-sync
	 */
	cancelAutoSync(): void {
		if (this.autoSyncTimeout) {
			clearTimeout(this.autoSyncTimeout);
			this.autoSyncTimeout = null;
		}
	}

	/**
	 * Check if sync is currently in progress
	 */
	get syncing(): boolean {
		return this.isSyncing;
	}

	/**
	 * Check if auto-sync is pending
	 */
	get autoSyncPending(): boolean {
		return this.autoSyncTimeout !== null;
	}
}

// Export singleton instance
export const driveSyncService = new DriveSyncService();
