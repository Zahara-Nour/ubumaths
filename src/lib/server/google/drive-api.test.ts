/**
 * Tests for Google Drive API Client
 *
 * Tests Drive API write operations using mocked fetch
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GoogleDriveClient } from './drive-api';
import {
	GoogleTokenExpiredError,
	GoogleInsufficientPermissionsError,
	GoogleNotFoundError,
	GoogleRateLimitError
} from './errors';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// =============================================================================
// Test Helpers
// =============================================================================

function createMockResponse(data: unknown, status = 200): Response {
	return {
		ok: status >= 200 && status < 300,
		status,
		statusText: status === 200 ? 'OK' : 'Error',
		json: vi.fn().mockResolvedValue(data),
		text: vi.fn().mockResolvedValue(typeof data === 'string' ? data : JSON.stringify(data)),
		headers: new Headers()
	} as unknown as Response;
}

function createErrorResponse(status: number, message: string, errorStatus = 'UNKNOWN'): Response {
	return createMockResponse(
		{
			error: {
				code: status,
				message,
				status: errorStatus
			}
		},
		status
	);
}

// =============================================================================
// Test Suite
// =============================================================================

describe('GoogleDriveClient', () => {
	let client: GoogleDriveClient;
	const TEST_TOKEN = 'test-access-token-123';

	beforeEach(() => {
		vi.clearAllMocks();
		client = new GoogleDriveClient(TEST_TOKEN);
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	// =========================================================================
	// Constructor Tests
	// =========================================================================

	describe('constructor', () => {
		it('should create client with valid token', () => {
			expect(() => new GoogleDriveClient('valid-token')).not.toThrow();
		});

		it('should throw error for empty token', () => {
			expect(() => new GoogleDriveClient('')).toThrow('Access token is required');
		});
	});

	// =========================================================================
	// findFolder Tests
	// =========================================================================

	describe('findFolder', () => {
		it('should find existing folder by name', async () => {
			mockFetch.mockResolvedValueOnce(
				createMockResponse({
					files: [{ id: 'folder-123', name: 'UbuMaths Whiteboards' }]
				})
			);

			const result = await client.findFolder('UbuMaths Whiteboards');

			expect(result).toBe('folder-123');
			expect(mockFetch).toHaveBeenCalledTimes(1);
			expect(mockFetch.mock.calls[0][0]).toContain('files?q=');
			expect(mockFetch.mock.calls[0][0]).toContain('UbuMaths%20Whiteboards');
		});

		it('should return null when folder not found', async () => {
			mockFetch.mockResolvedValueOnce(createMockResponse({ files: [] }));

			const result = await client.findFolder('NonExistent');

			expect(result).toBeNull();
		});

		it('should filter by parentId when provided', async () => {
			mockFetch.mockResolvedValueOnce(
				createMockResponse({
					files: [{ id: 'folder-456', name: 'Subfolder' }]
				})
			);

			await client.findFolder('Subfolder', 'parent-123');

			expect(mockFetch.mock.calls[0][0]).toContain('parent-123');
		});

		it('should throw error for empty name', async () => {
			await expect(client.findFolder('')).rejects.toThrow('Folder name is required');
		});
	});

	// =========================================================================
	// createFolder Tests
	// =========================================================================

	describe('createFolder', () => {
		it('should create folder and return ID', async () => {
			mockFetch.mockResolvedValueOnce(
				createMockResponse({
					id: 'new-folder-123',
					name: 'New Folder',
					mimeType: 'application/vnd.google-apps.folder'
				})
			);

			const result = await client.createFolder('New Folder');

			expect(result).toBe('new-folder-123');
			expect(mockFetch).toHaveBeenCalledTimes(1);

			const [, options] = mockFetch.mock.calls[0];
			expect(options.method).toBe('POST');
			expect(JSON.parse(options.body)).toEqual({
				name: 'New Folder',
				mimeType: 'application/vnd.google-apps.folder'
			});
		});

		it('should include parentId when provided', async () => {
			mockFetch.mockResolvedValueOnce(createMockResponse({ id: 'new-folder-456' }));

			await client.createFolder('Subfolder', 'parent-123');

			const [, options] = mockFetch.mock.calls[0];
			expect(JSON.parse(options.body).parents).toEqual(['parent-123']);
		});

		it('should throw error for empty name', async () => {
			await expect(client.createFolder('')).rejects.toThrow('Folder name is required');
		});
	});

	// =========================================================================
	// getOrCreateAppFolder Tests
	// =========================================================================

	describe('getOrCreateAppFolder', () => {
		it('should return existing folder if found', async () => {
			mockFetch.mockResolvedValueOnce(
				createMockResponse({
					files: [{ id: 'existing-folder', name: 'UbuMaths Whiteboards' }]
				})
			);

			const result = await client.getOrCreateAppFolder();

			expect(result).toBe('existing-folder');
			expect(mockFetch).toHaveBeenCalledTimes(1);
		});

		it('should create folder if not found', async () => {
			// First call: findFolder returns empty
			mockFetch.mockResolvedValueOnce(createMockResponse({ files: [] }));
			// Second call: createFolder
			mockFetch.mockResolvedValueOnce(createMockResponse({ id: 'new-folder-789' }));

			const result = await client.getOrCreateAppFolder();

			expect(result).toBe('new-folder-789');
			expect(mockFetch).toHaveBeenCalledTimes(2);
		});

		it('should be idempotent - always return same folder', async () => {
			mockFetch.mockResolvedValue(
				createMockResponse({
					files: [{ id: 'same-folder', name: 'UbuMaths Whiteboards' }]
				})
			);

			const result1 = await client.getOrCreateAppFolder();
			const result2 = await client.getOrCreateAppFolder();

			expect(result1).toBe('same-folder');
			expect(result2).toBe('same-folder');
		});
	});

	// =========================================================================
	// createFile Tests
	// =========================================================================

	describe('createFile', () => {
		const validOptions = {
			name: 'test.ubw',
			content: '{"version":1}',
			mimeType: 'application/vnd.ubumaths.whiteboard+json',
			folderId: 'folder-123'
		};

		it('should create file with multipart upload', async () => {
			mockFetch.mockResolvedValueOnce(
				createMockResponse({
					id: 'file-123',
					name: 'test.ubw',
					mimeType: 'application/vnd.ubumaths.whiteboard+json',
					modifiedTime: '2025-01-12T00:00:00Z',
					createdTime: '2025-01-12T00:00:00Z'
				})
			);

			const result = await client.createFile(validOptions);

			expect(result.id).toBe('file-123');
			expect(result.name).toBe('test.ubw');
			expect(mockFetch).toHaveBeenCalledTimes(1);

			const [url, options] = mockFetch.mock.calls[0];
			expect(url).toContain('upload/drive/v3/files');
			expect(url).toContain('uploadType=multipart');
			expect(options.method).toBe('POST');
			expect(options.headers['Content-Type']).toContain('multipart/related');
			expect(options.body).toContain(validOptions.content);
		});

		it('should include description when provided', async () => {
			mockFetch.mockResolvedValueOnce(createMockResponse({ id: 'file-456' }));

			await client.createFile({
				...validOptions,
				description: 'Test whiteboard'
			});

			const [, options] = mockFetch.mock.calls[0];
			expect(options.body).toContain('Test whiteboard');
		});

		it('should throw error for missing required fields', async () => {
			await expect(client.createFile({ ...validOptions, name: '' })).rejects.toThrow(
				'name, content, mimeType, and folderId are required'
			);

			await expect(client.createFile({ ...validOptions, content: '' })).rejects.toThrow(
				'name, content, mimeType, and folderId are required'
			);
		});
	});

	// =========================================================================
	// updateFile Tests
	// =========================================================================

	describe('updateFile', () => {
		it('should update file content', async () => {
			mockFetch.mockResolvedValueOnce(
				createMockResponse({
					id: 'file-123',
					name: 'test.ubw',
					mimeType: 'application/vnd.ubumaths.whiteboard+json',
					modifiedTime: '2025-01-12T01:00:00Z'
				})
			);

			const result = await client.updateFile('file-123', '{"version":2}');

			expect(result.id).toBe('file-123');
			expect(mockFetch).toHaveBeenCalledTimes(1);

			const [url, options] = mockFetch.mock.calls[0];
			expect(url).toContain('files/file-123');
			expect(url).toContain('uploadType=media');
			expect(options.method).toBe('PATCH');
		});

		it('should rename file when newName provided', async () => {
			mockFetch.mockResolvedValueOnce(
				createMockResponse({
					id: 'file-123',
					name: 'renamed.ubw',
					modifiedTime: '2025-01-12T01:00:00Z'
				})
			);

			await client.updateFile('file-123', '{"version":2}', 'renamed.ubw');

			const [url, options] = mockFetch.mock.calls[0];
			expect(url).toContain('uploadType=multipart');
			expect(options.body).toContain('renamed.ubw');
		});

		it('should throw error for missing required fields', async () => {
			await expect(client.updateFile('', 'content')).rejects.toThrow(
				'fileId and content are required'
			);
			await expect(client.updateFile('file-123', '')).rejects.toThrow(
				'fileId and content are required'
			);
		});
	});

	// =========================================================================
	// listFiles Tests
	// =========================================================================

	describe('listFiles', () => {
		it('should list files in folder', async () => {
			mockFetch.mockResolvedValueOnce(
				createMockResponse({
					files: [
						{ id: 'file-1', name: 'doc1.ubw', modifiedTime: '2025-01-12T00:00:00Z' },
						{ id: 'file-2', name: 'doc2.ubw', modifiedTime: '2025-01-11T00:00:00Z' }
					]
				})
			);

			const result = await client.listFiles('folder-123');

			expect(result).toHaveLength(2);
			expect(result[0].name).toBe('doc1.ubw');
			expect(mockFetch.mock.calls[0][0]).toContain('folder-123');
		});

		it('should filter by mimeType when provided', async () => {
			mockFetch.mockResolvedValueOnce(createMockResponse({ files: [] }));

			await client.listFiles('folder-123', 'application/vnd.ubumaths.whiteboard+json');

			expect(mockFetch.mock.calls[0][0]).toContain('mimeType');
		});

		it('should return empty array when no files', async () => {
			mockFetch.mockResolvedValueOnce(createMockResponse({ files: [] }));

			const result = await client.listFiles('folder-123');

			expect(result).toEqual([]);
		});

		it('should throw error for missing folderId', async () => {
			await expect(client.listFiles('')).rejects.toThrow('folderId is required');
		});
	});

	// =========================================================================
	// getFileContent Tests
	// =========================================================================

	describe('getFileContent', () => {
		it('should return file content as text', async () => {
			const content = '{"version":1,"pages":[]}';
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				text: vi.fn().mockResolvedValue(content),
				headers: new Headers()
			} as unknown as Response);

			const result = await client.getFileContent('file-123');

			expect(result).toBe(content);
			expect(mockFetch.mock.calls[0][0]).toContain('files/file-123');
			expect(mockFetch.mock.calls[0][0]).toContain('alt=media');
		});

		it('should throw error for missing fileId', async () => {
			await expect(client.getFileContent('')).rejects.toThrow('fileId is required');
		});
	});

	// =========================================================================
	// Error Handling Tests
	// =========================================================================

	describe('error handling', () => {
		it('should throw GoogleTokenExpiredError on 401', async () => {
			mockFetch.mockResolvedValueOnce(createErrorResponse(401, 'Token expired'));

			await expect(client.findFolder('test')).rejects.toThrow(GoogleTokenExpiredError);
		});

		it('should throw GoogleInsufficientPermissionsError on 403', async () => {
			mockFetch.mockResolvedValueOnce(createErrorResponse(403, 'Insufficient permissions'));

			await expect(client.findFolder('test')).rejects.toThrow(GoogleInsufficientPermissionsError);
		});

		it('should throw GoogleNotFoundError on 404', async () => {
			mockFetch.mockResolvedValueOnce(createErrorResponse(404, 'Not found'));

			await expect(client.getFileContent('nonexistent')).rejects.toThrow(GoogleNotFoundError);
		});

		it('should retry on 429 rate limit', async () => {
			// First call: rate limit
			mockFetch.mockResolvedValueOnce(createErrorResponse(429, 'Rate limit exceeded'));
			// Second call: success
			mockFetch.mockResolvedValueOnce(createMockResponse({ files: [{ id: 'folder-123' }] }));

			const result = await client.findFolder('test');

			expect(result).toBe('folder-123');
			expect(mockFetch).toHaveBeenCalledTimes(2);
		});

		it(
			'should throw GoogleRateLimitError after max retries',
			async () => {
				// All calls return rate limit
				mockFetch.mockResolvedValue(createErrorResponse(429, 'Rate limit exceeded'));

				await expect(client.findFolder('test')).rejects.toThrow(GoogleRateLimitError);
				// 1 initial + 3 retries = 4 calls
				expect(mockFetch).toHaveBeenCalledTimes(4);
			},
			{ timeout: 30000 }
		);
	});
});
