/**
 * Sync State Management
 *
 * Handles synchronization state between local and Google Drive storage.
 *
 * @module whiteboard/utils/sync-state
 */

import type { WhiteboardDocument } from '../types/document';

// =============================================================================
// Constants
// =============================================================================

/** MIME type for whiteboard documents on Drive */
export const DRIVE_MIME_TYPE = 'application/vnd.ubumaths.whiteboard+json';

/** Folder name for whiteboard documents on Drive */
export const DRIVE_FOLDER_NAME = 'UbuMaths Whiteboards';

/** Auto-sync debounce delay in milliseconds */
export const AUTO_SYNC_DELAY = 5000;

// =============================================================================
// Types
// =============================================================================

export type SyncStatus = 'synced' | 'modified' | 'syncing' | 'error' | 'disconnected';

export interface SyncState {
	status: SyncStatus;
	lastSyncAt: string | null;
	driveFileId: string | null;
	driveFolderId: string | null;
	error: string | null;
}

export interface DriveFileMetadata {
	id: string;
	name: string;
	mimeType: string;
	modifiedTime: string;
	createdTime: string;
	size: string;
	webViewLink?: string;
}

export interface DriveListResult {
	files: DriveFileMetadata[];
	nextPageToken?: string;
}

export interface DriveSaveResult {
	success: boolean;
	fileId?: string;
	error?: string;
}

export interface DriveLoadResult {
	success: boolean;
	document?: WhiteboardDocument;
	metadata?: DriveFileMetadata;
	error?: string;
}

// =============================================================================
// State Creation
// =============================================================================

/**
 * Create initial sync state (disconnected)
 */
export function createInitialSyncState(): SyncState {
	return {
		status: 'disconnected',
		lastSyncAt: null,
		driveFileId: null,
		driveFolderId: null,
		error: null
	};
}

/**
 * Create connected sync state
 */
export function createConnectedSyncState(
	fileId: string | null = null,
	folderId: string | null = null
): SyncState {
	return {
		status: fileId ? 'synced' : 'modified',
		lastSyncAt: fileId ? new Date().toISOString() : null,
		driveFileId: fileId,
		driveFolderId: folderId,
		error: null
	};
}

// =============================================================================
// State Updates
// =============================================================================

/**
 * Update sync state after successful sync
 */
export function updateSyncStateAfterSync(state: SyncState, fileId: string): SyncState {
	return {
		...state,
		status: 'synced',
		lastSyncAt: new Date().toISOString(),
		driveFileId: fileId,
		error: null
	};
}

/**
 * Update sync state to syncing
 */
export function updateSyncStateToSyncing(state: SyncState): SyncState {
	return {
		...state,
		status: 'syncing',
		error: null
	};
}

/**
 * Update sync state on error
 */
export function updateSyncStateOnError(state: SyncState, error: string): SyncState {
	return {
		...state,
		status: 'error',
		error
	};
}

/**
 * Mark as modified (local changes pending sync)
 */
export function markAsModified(state: SyncState): SyncState {
	if (state.status === 'disconnected') return state;
	return {
		...state,
		status: 'modified'
	};
}

/**
 * Disconnect from Drive
 */
export function disconnect(state: SyncState): SyncState {
	return {
		...state,
		status: 'disconnected',
		driveFileId: null,
		driveFolderId: null,
		error: null
	};
}

// =============================================================================
// State Queries
// =============================================================================

/**
 * Check if connected to Drive
 */
export function isConnectedToDrive(state: SyncState): boolean {
	return state.status !== 'disconnected';
}

/**
 * Check if sync is needed
 */
export function needsSync(document: WhiteboardDocument, lastSyncAt: string | null): boolean {
	if (!lastSyncAt) return true;
	return new Date(document.updatedAt) > new Date(lastSyncAt);
}

/**
 * Check if auto-sync should trigger
 */
export function shouldAutoSync(state: SyncState): boolean {
	return isConnectedToDrive(state) && state.status === 'modified';
}

/**
 * Check if currently syncing
 */
export function isSyncing(state: SyncState): boolean {
	return state.status === 'syncing';
}

/**
 * Check if there's a sync error
 */
export function hasSyncError(state: SyncState): boolean {
	return state.status === 'error';
}

// =============================================================================
// Drive Utilities
// =============================================================================

/**
 * Generate Drive filename from document
 */
export function generateDriveFilename(document: WhiteboardDocument): string {
	const sanitized = document.title.replace(/[<>:"/\\|?*]/g, '').trim();
	return `${sanitized || 'Sans titre'}.ubw`;
}

/**
 * Validate Drive file ID format
 */
export function isValidDriveFileId(fileId: string): boolean {
	return /^[a-zA-Z0-9_-]{10,50}$/.test(fileId);
}

/**
 * Parse Drive file metadata from API response
 */
export function parseDriveMetadata(apiResponse: Record<string, unknown>): DriveFileMetadata {
	return {
		id: String(apiResponse.id || ''),
		name: String(apiResponse.name || ''),
		mimeType: String(apiResponse.mimeType || ''),
		modifiedTime: String(apiResponse.modifiedTime || ''),
		createdTime: String(apiResponse.createdTime || ''),
		size: String(apiResponse.size || '0'),
		webViewLink: apiResponse.webViewLink ? String(apiResponse.webViewLink) : undefined
	};
}

/**
 * Filter .ubw files from Drive list
 */
export function filterUbwFiles(files: DriveFileMetadata[]): DriveFileMetadata[] {
	return files.filter((f) => f.mimeType === DRIVE_MIME_TYPE || f.name.endsWith('.ubw'));
}

// =============================================================================
// Status Display
// =============================================================================

/**
 * Get human-readable status label
 */
export function getSyncStatusLabel(state: SyncState): string {
	switch (state.status) {
		case 'synced':
			return 'Synchronisé';
		case 'modified':
			return 'Modifications non sauvegardées';
		case 'syncing':
			return 'Synchronisation en cours...';
		case 'error':
			return `Erreur: ${state.error || 'Inconnue'}`;
		case 'disconnected':
			return 'Non connecté à Drive';
	}
}

/**
 * Get status icon name
 */
export function getSyncStatusIcon(state: SyncState): string {
	switch (state.status) {
		case 'synced':
			return 'cloud-check';
		case 'modified':
			return 'cloud-upload';
		case 'syncing':
			return 'loader';
		case 'error':
			return 'cloud-off';
		case 'disconnected':
			return 'cloud';
	}
}

/**
 * Get status color class
 */
export function getSyncStatusColor(state: SyncState): string {
	switch (state.status) {
		case 'synced':
			return 'text-green-600';
		case 'modified':
			return 'text-yellow-600';
		case 'syncing':
			return 'text-blue-600';
		case 'error':
			return 'text-red-600';
		case 'disconnected':
			return 'text-muted-foreground';
	}
}
