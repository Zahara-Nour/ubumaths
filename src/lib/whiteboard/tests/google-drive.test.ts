/**
 * Tests for Google Drive Integration
 *
 * Tests Drive file operations, sync state, and error handling
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { WhiteboardDocument } from '../types/document';
import { createEmptyDocument } from '../types/document';

// =============================================================================
// Constants
// =============================================================================

/** MIME type for whiteboard documents on Drive */
const DRIVE_MIME_TYPE = 'application/vnd.ubumaths.whiteboard+json';

/** Folder name for whiteboard documents */
const DRIVE_FOLDER_NAME = 'UbuMaths Whiteboards';

// =============================================================================
// Helper Types
// =============================================================================

interface DriveFileMetadata {
	id: string;
	name: string;
	mimeType: string;
	modifiedTime: string;
	createdTime: string;
	size: string;
	webViewLink?: string;
}

interface _DriveListResult {
	files: DriveFileMetadata[];
	nextPageToken?: string;
}

interface _DriveSaveResult {
	success: boolean;
	fileId?: string;
	error?: string;
}

interface _DriveLoadResult {
	success: boolean;
	document?: WhiteboardDocument;
	metadata?: DriveFileMetadata;
	error?: string;
}

type SyncStatus = 'synced' | 'modified' | 'syncing' | 'error' | 'disconnected';

interface SyncState {
	status: SyncStatus;
	lastSyncAt: string | null;
	driveFileId: string | null;
	driveFolderId: string | null;
	error: string | null;
}

// =============================================================================
// Helper Functions (to be implemented)
// =============================================================================

/**
 * Check if document needs sync (has local changes since last sync)
 */
function needsSync(document: WhiteboardDocument, lastSyncAt: string | null): boolean {
	if (!lastSyncAt) return true;
	return new Date(document.updatedAt) > new Date(lastSyncAt);
}

/**
 * Parse Drive file metadata from API response
 */
function parseDriveMetadata(apiResponse: Record<string, unknown>): DriveFileMetadata {
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
function filterUbwFiles(files: DriveFileMetadata[]): DriveFileMetadata[] {
	return files.filter((f) => f.mimeType === DRIVE_MIME_TYPE || f.name.endsWith('.ubw'));
}

/**
 * Create initial sync state
 */
function createInitialSyncState(): SyncState {
	return {
		status: 'disconnected',
		lastSyncAt: null,
		driveFileId: null,
		driveFolderId: null,
		error: null
	};
}

/**
 * Update sync state after successful sync
 */
function updateSyncStateAfterSync(state: SyncState, fileId: string): SyncState {
	return {
		...state,
		status: 'synced',
		lastSyncAt: new Date().toISOString(),
		driveFileId: fileId,
		error: null
	};
}

/**
 * Update sync state on error
 */
function updateSyncStateOnError(state: SyncState, error: string): SyncState {
	return {
		...state,
		status: 'error',
		error
	};
}

/**
 * Update sync state to modified (local changes)
 */
function markAsModified(state: SyncState): SyncState {
	if (state.status === 'disconnected') return state;
	return {
		...state,
		status: 'modified'
	};
}

/**
 * Check if user is connected to Drive
 */
function isConnectedToDrive(state: SyncState): boolean {
	return state.status !== 'disconnected';
}

/**
 * Generate Drive filename from document
 */
function generateDriveFilename(document: WhiteboardDocument): string {
	const sanitized = document.title.replace(/[<>:"/\\|?*]/g, '').trim();
	return `${sanitized || 'Sans titre'}.ubw`;
}

/**
 * Validate Drive file ID format
 */
function isValidDriveFileId(fileId: string): boolean {
	// Google Drive file IDs are typically 25-44 characters of alphanumeric + _-
	return /^[a-zA-Z0-9_-]{10,50}$/.test(fileId);
}

// =============================================================================
// Tests: Sync State Management
// =============================================================================

describe('Sync State Management', () => {
	describe('Initial State', () => {
		it('creates disconnected initial state', () => {
			const state = createInitialSyncState();
			expect(state.status).toBe('disconnected');
		});

		it('initial state has no file ID', () => {
			const state = createInitialSyncState();
			expect(state.driveFileId).toBeNull();
		});

		it('initial state has no last sync time', () => {
			const state = createInitialSyncState();
			expect(state.lastSyncAt).toBeNull();
		});

		it('initial state has no error', () => {
			const state = createInitialSyncState();
			expect(state.error).toBeNull();
		});
	});

	describe('After Sync', () => {
		it('updates status to synced', () => {
			const state = createInitialSyncState();
			const updated = updateSyncStateAfterSync(state, 'file123');
			expect(updated.status).toBe('synced');
		});

		it('stores file ID', () => {
			const state = createInitialSyncState();
			const updated = updateSyncStateAfterSync(state, 'abc123def456');
			expect(updated.driveFileId).toBe('abc123def456');
		});

		it('records sync timestamp', () => {
			const state = createInitialSyncState();
			const before = new Date().toISOString();
			const updated = updateSyncStateAfterSync(state, 'file123');
			const after = new Date().toISOString();

			expect(updated.lastSyncAt).toBeDefined();
			expect(updated.lastSyncAt! >= before).toBe(true);
			expect(updated.lastSyncAt! <= after).toBe(true);
		});

		it('clears any previous error', () => {
			let state = createInitialSyncState();
			state = updateSyncStateOnError(state, 'Previous error');
			state = updateSyncStateAfterSync(state, 'file123');
			expect(state.error).toBeNull();
		});
	});

	describe('On Error', () => {
		it('sets error status', () => {
			const state = createInitialSyncState();
			const updated = updateSyncStateOnError(state, 'Connection failed');
			expect(updated.status).toBe('error');
		});

		it('stores error message', () => {
			const state = createInitialSyncState();
			const updated = updateSyncStateOnError(state, 'Rate limit exceeded');
			expect(updated.error).toBe('Rate limit exceeded');
		});

		it('preserves file ID on error', () => {
			let state = createInitialSyncState();
			state = updateSyncStateAfterSync(state, 'file123');
			state = updateSyncStateOnError(state, 'Network error');
			expect(state.driveFileId).toBe('file123');
		});
	});

	describe('Mark as Modified', () => {
		it('changes synced to modified', () => {
			let state = createInitialSyncState();
			state = updateSyncStateAfterSync(state, 'file123');
			state = markAsModified(state);
			expect(state.status).toBe('modified');
		});

		it('does not change disconnected state', () => {
			const state = createInitialSyncState();
			const updated = markAsModified(state);
			expect(updated.status).toBe('disconnected');
		});

		it('preserves file ID when marking modified', () => {
			let state = createInitialSyncState();
			state = updateSyncStateAfterSync(state, 'file123');
			state = markAsModified(state);
			expect(state.driveFileId).toBe('file123');
		});
	});
});

// =============================================================================
// Tests: Needs Sync Check
// =============================================================================

describe('Needs Sync Check', () => {
	let document: WhiteboardDocument;

	beforeEach(() => {
		document = createEmptyDocument('Test');
	});

	it('needs sync if never synced', () => {
		expect(needsSync(document, null)).toBe(true);
	});

	it('needs sync if document updated after last sync', () => {
		const oldSyncTime = '2024-01-01T00:00:00.000Z';
		document.updatedAt = '2024-01-02T00:00:00.000Z';
		expect(needsSync(document, oldSyncTime)).toBe(true);
	});

	it('does not need sync if synced after last update', () => {
		document.updatedAt = '2024-01-01T00:00:00.000Z';
		const recentSyncTime = '2024-01-02T00:00:00.000Z';
		expect(needsSync(document, recentSyncTime)).toBe(false);
	});

	it('does not need sync if synced at same time as update', () => {
		const timestamp = '2024-01-01T12:00:00.000Z';
		document.updatedAt = timestamp;
		expect(needsSync(document, timestamp)).toBe(false);
	});
});

// =============================================================================
// Tests: Drive Connection State
// =============================================================================

describe('Drive Connection State', () => {
	it('disconnected state is not connected', () => {
		const state = createInitialSyncState();
		expect(isConnectedToDrive(state)).toBe(false);
	});

	it('synced state is connected', () => {
		let state = createInitialSyncState();
		state = updateSyncStateAfterSync(state, 'file123');
		expect(isConnectedToDrive(state)).toBe(true);
	});

	it('modified state is connected', () => {
		let state = createInitialSyncState();
		state = updateSyncStateAfterSync(state, 'file123');
		state = markAsModified(state);
		expect(isConnectedToDrive(state)).toBe(true);
	});

	it('error state is still connected', () => {
		let state = createInitialSyncState();
		state = updateSyncStateAfterSync(state, 'file123');
		state = updateSyncStateOnError(state, 'Network error');
		expect(isConnectedToDrive(state)).toBe(true);
	});
});

// =============================================================================
// Tests: Drive Filename Generation
// =============================================================================

describe('Drive Filename Generation', () => {
	it('uses document title', () => {
		const doc = createEmptyDocument('Mon Document');
		const filename = generateDriveFilename(doc);
		expect(filename).toBe('Mon Document.ubw');
	});

	it('removes invalid characters', () => {
		const doc = createEmptyDocument('Test<>:"/\\|?*Doc');
		const filename = generateDriveFilename(doc);
		expect(filename).toBe('TestDoc.ubw');
	});

	it('uses default for empty title', () => {
		const doc = createEmptyDocument('');
		const filename = generateDriveFilename(doc);
		expect(filename).toBe('Sans titre.ubw');
	});

	it('trims whitespace', () => {
		const doc = createEmptyDocument('  Mon Document  ');
		const filename = generateDriveFilename(doc);
		expect(filename).toBe('Mon Document.ubw');
	});
});

// =============================================================================
// Tests: Drive File ID Validation
// =============================================================================

describe('Drive File ID Validation', () => {
	it('accepts valid file ID', () => {
		expect(isValidDriveFileId('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms')).toBe(true);
	});

	it('accepts short valid ID', () => {
		expect(isValidDriveFileId('0B7_4c-5_wWdJYWNqNGpDVUxWRUk')).toBe(true);
	});

	it('accepts ID with underscores and dashes', () => {
		expect(isValidDriveFileId('abc_def-123_456')).toBe(true);
	});

	it('rejects empty string', () => {
		expect(isValidDriveFileId('')).toBe(false);
	});

	it('rejects too short ID', () => {
		expect(isValidDriveFileId('abc123')).toBe(false);
	});

	it('rejects ID with invalid characters', () => {
		expect(isValidDriveFileId('abc123!@#$%')).toBe(false);
	});

	it('rejects ID with spaces', () => {
		expect(isValidDriveFileId('abc 123 def')).toBe(false);
	});
});

// =============================================================================
// Tests: Drive Metadata Parsing
// =============================================================================

describe('Drive Metadata Parsing', () => {
	it('parses complete metadata', () => {
		const response = {
			id: 'file123',
			name: 'document.ubw',
			mimeType: DRIVE_MIME_TYPE,
			modifiedTime: '2024-01-15T10:30:00.000Z',
			createdTime: '2024-01-10T08:00:00.000Z',
			size: '12345',
			webViewLink: 'https://drive.google.com/file/d/file123/view'
		};

		const metadata = parseDriveMetadata(response);

		expect(metadata.id).toBe('file123');
		expect(metadata.name).toBe('document.ubw');
		expect(metadata.mimeType).toBe(DRIVE_MIME_TYPE);
		expect(metadata.modifiedTime).toBe('2024-01-15T10:30:00.000Z');
		expect(metadata.size).toBe('12345');
		expect(metadata.webViewLink).toBe('https://drive.google.com/file/d/file123/view');
	});

	it('handles missing optional fields', () => {
		const response = {
			id: 'file123',
			name: 'document.ubw',
			mimeType: DRIVE_MIME_TYPE,
			modifiedTime: '2024-01-15T10:30:00.000Z',
			createdTime: '2024-01-10T08:00:00.000Z'
		};

		const metadata = parseDriveMetadata(response);

		expect(metadata.size).toBe('0');
		expect(metadata.webViewLink).toBeUndefined();
	});

	it('converts all values to strings', () => {
		const response = {
			id: 123, // number instead of string
			name: 'document.ubw',
			mimeType: DRIVE_MIME_TYPE,
			modifiedTime: '2024-01-15T10:30:00.000Z',
			createdTime: '2024-01-10T08:00:00.000Z',
			size: 12345 // number instead of string
		};

		const metadata = parseDriveMetadata(response);

		expect(metadata.id).toBe('123');
		expect(metadata.size).toBe('12345');
	});
});

// =============================================================================
// Tests: UBW File Filtering
// =============================================================================

describe('UBW File Filtering', () => {
	it('filters files by MIME type', () => {
		const files: DriveFileMetadata[] = [
			{
				id: '1',
				name: 'doc.ubw',
				mimeType: DRIVE_MIME_TYPE,
				modifiedTime: '',
				createdTime: '',
				size: '0'
			},
			{
				id: '2',
				name: 'image.png',
				mimeType: 'image/png',
				modifiedTime: '',
				createdTime: '',
				size: '0'
			},
			{
				id: '3',
				name: 'other.ubw',
				mimeType: DRIVE_MIME_TYPE,
				modifiedTime: '',
				createdTime: '',
				size: '0'
			}
		];

		const filtered = filterUbwFiles(files);

		expect(filtered).toHaveLength(2);
		expect(filtered.map((f) => f.id)).toEqual(['1', '3']);
	});

	it('includes files by extension even with wrong MIME type', () => {
		const files: DriveFileMetadata[] = [
			{
				id: '1',
				name: 'doc.ubw',
				mimeType: 'application/octet-stream', // Generic MIME
				modifiedTime: '',
				createdTime: '',
				size: '0'
			}
		];

		const filtered = filterUbwFiles(files);

		expect(filtered).toHaveLength(1);
	});

	it('returns empty array for no matches', () => {
		const files: DriveFileMetadata[] = [
			{
				id: '1',
				name: 'image.png',
				mimeType: 'image/png',
				modifiedTime: '',
				createdTime: '',
				size: '0'
			}
		];

		const filtered = filterUbwFiles(files);

		expect(filtered).toHaveLength(0);
	});

	it('handles empty input', () => {
		const filtered = filterUbwFiles([]);
		expect(filtered).toHaveLength(0);
	});
});

// =============================================================================
// Tests: Sync Status Types
// =============================================================================

describe('Sync Status Types', () => {
	it('all status types are valid', () => {
		const statuses: SyncStatus[] = ['synced', 'modified', 'syncing', 'error', 'disconnected'];

		statuses.forEach((status) => {
			const state: SyncState = {
				status,
				lastSyncAt: null,
				driveFileId: null,
				driveFolderId: null,
				error: null
			};
			expect(state.status).toBe(status);
		});
	});
});

// =============================================================================
// Tests: Auto-Sync Logic
// =============================================================================

describe('Auto-Sync Logic', () => {
	let _document: WhiteboardDocument;
	let syncState: SyncState;

	beforeEach(() => {
		_document = createEmptyDocument('Test');
		syncState = createInitialSyncState();
	});

	it('auto-sync triggers when connected and modified', () => {
		syncState = updateSyncStateAfterSync(syncState, 'file123');
		syncState = markAsModified(syncState);

		const shouldAutoSync = isConnectedToDrive(syncState) && syncState.status === 'modified';
		expect(shouldAutoSync).toBe(true);
	});

	it('auto-sync does not trigger when disconnected', () => {
		// Still disconnected
		const shouldAutoSync = isConnectedToDrive(syncState) && syncState.status === 'modified';
		expect(shouldAutoSync).toBe(false);
	});

	it('auto-sync does not trigger when already synced', () => {
		syncState = updateSyncStateAfterSync(syncState, 'file123');

		const shouldAutoSync = isConnectedToDrive(syncState) && syncState.status === 'modified';
		expect(shouldAutoSync).toBe(false);
	});

	it('auto-sync does not trigger during syncing', () => {
		syncState = {
			...syncState,
			status: 'syncing',
			driveFileId: 'file123'
		};

		const shouldAutoSync = isConnectedToDrive(syncState) && syncState.status === 'modified';
		expect(shouldAutoSync).toBe(false);
	});
});

// =============================================================================
// Tests: Constants
// =============================================================================

describe('Drive Constants', () => {
	it('uses correct MIME type', () => {
		expect(DRIVE_MIME_TYPE).toBe('application/vnd.ubumaths.whiteboard+json');
	});

	it('uses correct folder name', () => {
		expect(DRIVE_FOLDER_NAME).toBe('UbuMaths Whiteboards');
	});
});
