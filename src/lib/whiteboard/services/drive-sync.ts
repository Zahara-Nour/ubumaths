/**
 * Google Drive Sync Service
 * Client-side service for synchronizing whiteboard documents with Google Drive
 *
 * Features:
 * - Save/load documents to/from Drive
 * - Folder navigation and creation
 * - Auto-sync with debouncing
 * - Error handling with user feedback
 * - Sync state management
 */

import { toaster } from '$lib/stores/toaster.svelte';
import { AUTO_SYNC_DELAY } from '../utils/sync-state';
import type { WhiteboardDocument } from '../types/document';
import type { DriveFolder, ListFilesResponse } from '../types/drive';

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

export interface ListFilesResult {
	files: DriveFile[];
	folders: DriveFolder[];
	currentFolderId: string | null;
	parentFolderId: string | null;
	appFolderId: string;
}

export interface CreateFolderResult {
	success: boolean;
	folderId?: string;
	name?: string;
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
		/** Optional folder ID to save into (defaults to app root) */
		folderId?: string;
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
					folderId: options.folderId,
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
	 * List whiteboard files and folders from Google Drive
	 *
	 * @param folderId - Optional folder ID to list from (defaults to app root)
	 * @returns Files, folders, and navigation info
	 */
	async listFiles(folderId?: string): Promise<ListFilesResult> {
		const url = folderId
			? `/api/whiteboard/drive/list?folderId=${folderId}`
			: '/api/whiteboard/drive/list';

		const response = await fetch(url);

		if (!response.ok) {
			const error = await response.json().catch(() => ({ message: 'Erreur de chargement' }));
			throw new Error(error.message || `Erreur ${response.status}`);
		}

		const data: ListFilesResponse = await response.json();
		return {
			files: data.files,
			folders: data.folders,
			currentFolderId: data.currentFolderId,
			parentFolderId: data.parentFolderId,
			appFolderId: data.appFolderId
		};
	}

	/**
	 * Create a subfolder in Google Drive
	 *
	 * @param name - Folder name
	 * @param parentFolderId - Parent folder ID
	 * @returns Create folder result
	 */
	async createFolder(name: string, parentFolderId: string): Promise<CreateFolderResult> {
		try {
			const response = await fetch('/api/whiteboard/drive/folder', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name, parentFolderId })
			});

			if (!response.ok) {
				const error = await response.json().catch(() => ({ message: 'Erreur de création' }));
				throw new Error(error.message || `Erreur ${response.status}`);
			}

			const result = await response.json();
			return {
				success: true,
				folderId: result.folderId,
				name: result.name
			};
		} catch (e) {
			const errorMsg = e instanceof Error ? e.message : 'Erreur inconnue';
			return { success: false, error: errorMsg };
		}
	}

	/**
	 * Get or create a class folder
	 *
	 * @param joinCode - Class join code
	 * @param className - Class name
	 * @returns Folder ID
	 */
	async getOrCreateClassFolder(joinCode: string, className: string): Promise<string> {
		const folderName = `${joinCode} - ${className}`;

		// First, list files at root to get appFolderId
		const rootList = await this.listFiles();
		const appFolderId = rootList.appFolderId;

		// Check if class folder already exists
		const existingFolder = rootList.folders.find((f) => f.name === folderName);
		if (existingFolder) {
			return existingFolder.id;
		}

		// Create the class folder
		const result = await this.createFolder(folderName, appFolderId);
		if (!result.success || !result.folderId) {
			throw new Error(result.error || 'Failed to create class folder');
		}

		return result.folderId;
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
	 * @param folderId - Optional folder ID (not needed for updates - file stays in place)
	 * @param onSyncComplete - Callback when sync completes
	 */
	scheduleAutoSync(
		document: WhiteboardDocument,
		fileName: string,
		fileId: string | undefined,
		folderId: string | undefined,
		onSyncComplete?: (result: SyncResult) => void
	): void {
		this.cancelAutoSync();

		this.autoSyncTimeout = setTimeout(async () => {
			// Note: For existing files (fileId provided), we intentionally don't pass folderId
			// to prevent moving the file during auto-save. The file stays where it is.
			// folderId is only used for new files (no fileId) to specify initial location.
			const result = await this.saveToDrive({
				document,
				fileName,
				fileId,
				folderId: fileId ? undefined : folderId // Only pass folderId for new files
			});

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
