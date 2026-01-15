/**
 * Google Drive API Client
 * Provides methods to interact with Google Drive API v3
 *
 * Features:
 * - Fetch file metadata
 * - Get file thumbnails
 * - Get shareable URLs
 * - Automatic retry logic
 * - Zod validation
 *
 * Reference: https://developers.google.com/drive/api/v3/reference
 */

import { googleDriveFileMetadataSchema, googleAPIErrorSchema } from './schemas';
import {
	GoogleAPIError,
	GoogleTokenExpiredError,
	GoogleRateLimitError,
	GoogleInsufficientPermissionsError,
	GoogleNotFoundError
} from './errors';
import { sleep, calculateBackoff } from './utils';

/**
 * Google Drive API base URL
 */
const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';

/**
 * Google Drive Upload API base URL
 */
const DRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';

/**
 * MIME type for Google Drive folders
 */
const DRIVE_FOLDER_MIME = 'application/vnd.google-apps.folder';

/**
 * Default folder name for whiteboard documents
 */
const WHITEBOARD_FOLDER_NAME = 'UbuMaths Whiteboards';

/**
 * Escape single quotes for Google Drive API queries
 * Prevents query failures and injection issues with special characters
 */
function escapeQueryValue(value: string): string {
	return value.replace(/'/g, "\\'");
}

/**
 * Maximum number of retry attempts for rate limit errors
 */
const MAX_RETRIES = 3;

/**
 * Maximum number of retry attempts for server errors (5xx)
 */
const MAX_SERVER_ERROR_RETRIES = 2;

/**
 * Google Drive file metadata interface
 */
export interface DriveFileMetadata {
	/** File ID */
	id: string;
	/** File name */
	name: string;
	/** MIME type */
	mimeType: string;
	/** Web view link (for viewing in browser) */
	webViewLink?: string;
	/** Web content link (for downloading) */
	webContentLink?: string;
	/** Thumbnail link */
	thumbnailLink?: string;
	/** Icon link */
	iconLink?: string;
	/** Last modified time (ISO 8601) */
	modifiedTime?: string;
	/** Created time (ISO 8601) */
	createdTime?: string;
}

/**
 * Options for creating a file on Google Drive
 */
export interface CreateFileOptions {
	/** File name */
	name: string;
	/** File content as string (or base64 if isBase64 is true) */
	content: string;
	/** MIME type of the content */
	mimeType: string;
	/** Parent folder ID */
	folderId: string;
	/** Optional description */
	description?: string;
	/** If true, content is base64 encoded and will use Content-Transfer-Encoding: base64 */
	isBase64?: boolean;
	/** Custom app properties (key-value pairs, max 124 chars each) */
	appProperties?: Record<string, string>;
}

/**
 * Response from Drive API files.list
 */
interface DriveListResponse {
	files: DriveFileMetadata[];
	nextPageToken?: string;
}

/**
 * Google Drive API Client
 * Handles all interactions with Google Drive API
 */
export class GoogleDriveClient {
	private accessToken: string;

	/**
	 * Create a new Google Drive API client
	 *
	 * @param accessToken - Decrypted Google OAuth access token
	 *
	 * @example
	 * ```typescript
	 * const client = new GoogleDriveClient(decryptedToken);
	 * const metadata = await client.getFileMetadata('1a2b3c4d5e');
	 * ```
	 */
	constructor(accessToken: string) {
		if (!accessToken) {
			throw new Error('Access token is required');
		}

		this.accessToken = accessToken;
	}

	/**
	 * Make a request to Google Drive API with error handling and retries
	 *
	 * @param endpoint - API endpoint path (e.g., "/files/123")
	 * @param options - Fetch options
	 * @returns Response data
	 * @throws {GoogleAPIError} on API errors
	 */
	private async request<T>(
		endpoint: string,
		options: RequestInit = {},
		retryCount = 0
	): Promise<T> {
		const url = `${DRIVE_API_BASE}${endpoint}`;

		try {
			const response = await fetch(url, {
				...options,
				headers: {
					Authorization: `Bearer ${this.accessToken}`,
					'Content-Type': 'application/json',
					...options.headers
				}
			});

			// Handle successful response
			if (response.ok) {
				const data = await response.json();
				return data as T;
			}

			// Handle error responses
			const errorData = await response.json();
			const errorValidation = googleAPIErrorSchema.safeParse(errorData);

			if (errorValidation.success) {
				const error = errorValidation.data.error;

				// Handle specific error codes
				switch (response.status) {
					case 401:
						// Token expired or invalid
						throw new GoogleTokenExpiredError();

					case 403:
						// Insufficient permissions or file not accessible
						throw new GoogleInsufficientPermissionsError(error.message);

					case 404:
						// File not found
						throw new GoogleNotFoundError(error.message);

					case 429: {
						// Rate limit exceeded - retry with exponential backoff
						if (retryCount < MAX_RETRIES) {
							const retryAfter = this.getRetryAfter(response);
							const delay = retryAfter || calculateBackoff(retryCount);

							console.warn(
								`[GoogleDriveClient] Rate limit hit. ` +
									`Retrying in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`
							);

							await sleep(delay);
							return this.request<T>(endpoint, options, retryCount + 1);
						}

						// Max retries exceeded
						throw new GoogleRateLimitError(this.getRetryAfter(response));
					}

					case 500:
					case 502:
					case 503:
					case 504:
						// Server errors - retry with backoff
						if (retryCount < MAX_SERVER_ERROR_RETRIES) {
							const delay = calculateBackoff(retryCount);
							console.warn(
								`[GoogleDriveClient] Server error ${response.status}. ` +
									`Retrying in ${delay}ms (attempt ${retryCount + 1}/${MAX_SERVER_ERROR_RETRIES}). ` +
									`Endpoint: ${endpoint.substring(0, 100)}...`
							);
							await sleep(delay);
							return this.request<T>(endpoint, options, retryCount + 1);
						}
						console.error(
							`[GoogleDriveClient] Server error ${response.status} after ${MAX_SERVER_ERROR_RETRIES} retries. ` +
								`Endpoint: ${endpoint.substring(0, 100)}...`
						);
						throw new GoogleAPIError(error.message, response.status, error.status);

					default:
						throw new GoogleAPIError(error.message, response.status, error.status);
				}
			}

			// Fallback for non-standard error format
			throw new GoogleAPIError(
				`Google API error: ${response.statusText}`,
				response.status,
				'UNKNOWN_ERROR'
			);
		} catch (error) {
			// Re-throw GoogleAPIError instances
			if (error instanceof GoogleAPIError) {
				throw error;
			}

			// Wrap network errors
			if (error instanceof Error) {
				throw new GoogleAPIError(`Network error: ${error.message}`, 0, 'NETWORK_ERROR');
			}

			throw new GoogleAPIError('Unknown error occurred', 0, 'UNKNOWN_ERROR');
		}
	}

	/**
	 * Extract Retry-After header from response
	 *
	 * @param response - Fetch response
	 * @returns Retry delay in milliseconds or undefined
	 */
	private getRetryAfter(response: Response): number | undefined {
		const retryAfter = response.headers.get('Retry-After');
		if (retryAfter) {
			const seconds = parseInt(retryAfter, 10);
			if (!isNaN(seconds)) {
				return seconds * 1000;
			}
		}
		return undefined;
	}

	/**
	 * Make a request to Google Drive Upload API
	 *
	 * @param endpoint - API endpoint path
	 * @param body - Request body
	 * @param contentType - Content-Type header
	 * @param retryCount - Current retry attempt
	 * @returns Response data
	 */
	private async requestUpload<T>(
		endpoint: string,
		body: string,
		contentType: string,
		retryCount = 0
	): Promise<T> {
		const url = `${DRIVE_UPLOAD_BASE}${endpoint}`;

		try {
			const response = await fetch(url, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${this.accessToken}`,
					'Content-Type': contentType
				},
				body
			});

			if (response.ok) {
				return (await response.json()) as T;
			}

			// Handle errors similar to request()
			const errorData = await response.json();
			const errorValidation = googleAPIErrorSchema.safeParse(errorData);

			if (errorValidation.success) {
				const error = errorValidation.data.error;

				switch (response.status) {
					case 401:
						throw new GoogleTokenExpiredError();
					case 403:
						throw new GoogleInsufficientPermissionsError(error.message);
					case 404:
						throw new GoogleNotFoundError(error.message);
					case 429: {
						if (retryCount < MAX_RETRIES) {
							const retryAfter = this.getRetryAfter(response);
							const delay = retryAfter || calculateBackoff(retryCount);
							console.warn(
								`[GoogleDriveClient] Rate limit hit. Retrying in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`
							);
							await sleep(delay);
							return this.requestUpload<T>(endpoint, body, contentType, retryCount + 1);
						}
						throw new GoogleRateLimitError(this.getRetryAfter(response));
					}
					default:
						throw new GoogleAPIError(error.message, response.status, error.status);
				}
			}

			throw new GoogleAPIError(
				`Google API error: ${response.statusText}`,
				response.status,
				'UNKNOWN_ERROR'
			);
		} catch (error) {
			if (error instanceof GoogleAPIError) {
				throw error;
			}
			if (error instanceof Error) {
				throw new GoogleAPIError(`Network error: ${error.message}`, 0, 'NETWORK_ERROR');
			}
			throw new GoogleAPIError('Unknown error occurred', 0, 'UNKNOWN_ERROR');
		}
	}

	/**
	 * Make a request that returns text content (for file downloads)
	 *
	 * @param endpoint - API endpoint path
	 * @returns Response text
	 */
	private async requestText(endpoint: string, retryCount = 0): Promise<string> {
		const url = `${DRIVE_API_BASE}${endpoint}`;

		try {
			const response = await fetch(url, {
				headers: {
					Authorization: `Bearer ${this.accessToken}`
				}
			});

			if (response.ok) {
				return await response.text();
			}

			// Handle errors
			const errorData = await response.json();
			const errorValidation = googleAPIErrorSchema.safeParse(errorData);

			if (errorValidation.success) {
				const error = errorValidation.data.error;

				switch (response.status) {
					case 401:
						throw new GoogleTokenExpiredError();
					case 403:
						throw new GoogleInsufficientPermissionsError(error.message);
					case 404:
						throw new GoogleNotFoundError(error.message);
					case 429: {
						if (retryCount < MAX_RETRIES) {
							const retryAfter = this.getRetryAfter(response);
							const delay = retryAfter || calculateBackoff(retryCount);
							console.warn(
								`[GoogleDriveClient] Rate limit hit. Retrying in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`
							);
							await sleep(delay);
							return this.requestText(endpoint, retryCount + 1);
						}
						throw new GoogleRateLimitError(this.getRetryAfter(response));
					}
					default:
						throw new GoogleAPIError(error.message, response.status, error.status);
				}
			}

			throw new GoogleAPIError(
				`Google API error: ${response.statusText}`,
				response.status,
				'UNKNOWN_ERROR'
			);
		} catch (error) {
			if (error instanceof GoogleAPIError) {
				throw error;
			}
			if (error instanceof Error) {
				throw new GoogleAPIError(`Network error: ${error.message}`, 0, 'NETWORK_ERROR');
			}
			throw new GoogleAPIError('Unknown error occurred', 0, 'UNKNOWN_ERROR');
		}
	}

	/**
	 * Make a PATCH request to Google Drive Upload API
	 *
	 * @param endpoint - API endpoint path
	 * @param body - Request body
	 * @param contentType - Content-Type header
	 * @returns Response data
	 */
	private async requestPatch<T>(
		endpoint: string,
		body: string,
		contentType: string,
		retryCount = 0
	): Promise<T> {
		const url = `${DRIVE_UPLOAD_BASE}${endpoint}`;

		try {
			const response = await fetch(url, {
				method: 'PATCH',
				headers: {
					Authorization: `Bearer ${this.accessToken}`,
					'Content-Type': contentType
				},
				body
			});

			if (response.ok) {
				return (await response.json()) as T;
			}

			const errorData = await response.json();
			const errorValidation = googleAPIErrorSchema.safeParse(errorData);

			if (errorValidation.success) {
				const error = errorValidation.data.error;

				switch (response.status) {
					case 401:
						throw new GoogleTokenExpiredError();
					case 403:
						throw new GoogleInsufficientPermissionsError(error.message);
					case 404:
						throw new GoogleNotFoundError(error.message);
					case 429: {
						if (retryCount < MAX_RETRIES) {
							const retryAfter = this.getRetryAfter(response);
							const delay = retryAfter || calculateBackoff(retryCount);
							console.warn(
								`[GoogleDriveClient] Rate limit hit. Retrying in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`
							);
							await sleep(delay);
							return this.requestPatch<T>(endpoint, body, contentType, retryCount + 1);
						}
						throw new GoogleRateLimitError(this.getRetryAfter(response));
					}
					default:
						throw new GoogleAPIError(error.message, response.status, error.status);
				}
			}

			throw new GoogleAPIError(
				`Google API error: ${response.statusText}`,
				response.status,
				'UNKNOWN_ERROR'
			);
		} catch (error) {
			if (error instanceof GoogleAPIError) {
				throw error;
			}
			if (error instanceof Error) {
				throw new GoogleAPIError(`Network error: ${error.message}`, 0, 'NETWORK_ERROR');
			}
			throw new GoogleAPIError('Unknown error occurred', 0, 'UNKNOWN_ERROR');
		}
	}

	/**
	 * Get file metadata from Google Drive
	 *
	 * @param fileId - Google Drive file ID
	 * @returns File metadata including name, MIME type, and links
	 *
	 * @example
	 * ```typescript
	 * const metadata = await client.getFileMetadata('1a2b3c4d5e');
	 * console.log(metadata.name); // "Assignment.pdf"
	 * console.log(metadata.mimeType); // "application/pdf"
	 * console.log(metadata.webViewLink); // "https://drive.google.com/..."
	 * ```
	 */
	async getFileMetadata(fileId: string): Promise<DriveFileMetadata> {
		if (!fileId) {
			throw new Error('File ID is required');
		}

		// Request specific fields to minimize data transfer
		const fields = 'id,name,mimeType,webViewLink,webContentLink,thumbnailLink,iconLink';
		const endpoint = `/files/${fileId}?fields=${fields}`;

		const data = await this.request<DriveFileMetadata>(endpoint);

		// Validate response
		const validation = googleDriveFileMetadataSchema.safeParse(data);
		if (!validation.success) {
			throw new GoogleAPIError(
				`Invalid file metadata response: ${validation.error.message}`,
				0,
				'VALIDATION_ERROR'
			);
		}

		return validation.data;
	}

	/**
	 * Get file thumbnail URL
	 * Returns null if thumbnail is not available
	 *
	 * @param fileId - Google Drive file ID
	 * @returns Thumbnail URL or null
	 *
	 * @example
	 * ```typescript
	 * const thumbnailUrl = await client.getFileThumbnail('1a2b3c4d5e');
	 * if (thumbnailUrl) {
	 *   console.log(`<img src="${thumbnailUrl}" alt="Thumbnail">`);
	 * }
	 * ```
	 */
	async getFileThumbnail(fileId: string): Promise<string | null> {
		try {
			const metadata = await this.getFileMetadata(fileId);
			return metadata.thumbnailLink || null;
		} catch (error) {
			// If file doesn't exist or can't be accessed, return null
			if (
				error instanceof GoogleNotFoundError ||
				error instanceof GoogleInsufficientPermissionsError
			) {
				return null;
			}
			throw error;
		}
	}

	/**
	 * Get shareable URL for viewing file in browser
	 *
	 * @param fileId - Google Drive file ID
	 * @returns Web view link
	 *
	 * @example
	 * ```typescript
	 * const url = await client.getFileUrl('1a2b3c4d5e');
	 * // Returns: "https://drive.google.com/file/d/1a2b3c4d5e/view"
	 * ```
	 */
	async getFileUrl(fileId: string): Promise<string> {
		const metadata = await this.getFileMetadata(fileId);
		if (!metadata.webViewLink) {
			// Construct default URL if not provided
			return `https://drive.google.com/file/d/${fileId}/view`;
		}
		return metadata.webViewLink;
	}

	/**
	 * Get multiple file metadata in batch (convenience method)
	 * Fetches metadata for multiple files sequentially
	 *
	 * Note: For large batches, consider using Google's batch API
	 * https://developers.google.com/drive/api/guides/performance#batch-requests
	 *
	 * @param fileIds - Array of Google Drive file IDs
	 * @returns Map of file ID to metadata (excludes files that failed)
	 *
	 * @example
	 * ```typescript
	 * const metadata = await client.getBatchFileMetadata(['id1', 'id2', 'id3']);
	 * metadata.forEach((meta, fileId) => {
	 *   console.log(`${fileId}: ${meta.name}`);
	 * });
	 * ```
	 */
	async getBatchFileMetadata(fileIds: string[]): Promise<Map<string, DriveFileMetadata>> {
		const result = new Map<string, DriveFileMetadata>();

		for (const fileId of fileIds) {
			try {
				const metadata = await this.getFileMetadata(fileId);
				result.set(fileId, metadata);
			} catch (error) {
				// Log error but continue with other files
				console.warn(`[GoogleDriveClient] Failed to fetch metadata for file ${fileId}:`, error);
			}
		}

		return result;
	}

	/**
	 * Check if file is accessible
	 * Useful for validating file permissions before syncing
	 *
	 * @param fileId - Google Drive file ID
	 * @returns true if file is accessible, false otherwise
	 *
	 * @example
	 * ```typescript
	 * if (await client.isFileAccessible('1a2b3c4d5e')) {
	 *   // Proceed with file processing
	 * } else {
	 *   // Show error to user
	 * }
	 * ```
	 */
	async isFileAccessible(fileId: string): Promise<boolean> {
		try {
			await this.getFileMetadata(fileId);
			return true;
		} catch (error) {
			if (
				error instanceof GoogleNotFoundError ||
				error instanceof GoogleInsufficientPermissionsError
			) {
				return false;
			}
			// Re-throw unexpected errors
			throw error;
		}
	}

	// =========================================================================
	// Write Operations (require drive.file scope)
	// =========================================================================

	/**
	 * Find a folder by name
	 *
	 * @param name - Folder name to search for
	 * @param parentId - Optional parent folder ID (defaults to root)
	 * @returns Folder ID if found, null otherwise
	 *
	 * @example
	 * ```typescript
	 * const folderId = await client.findFolder('UbuMaths Whiteboards');
	 * if (folderId) {
	 *   console.log('Found folder:', folderId);
	 * }
	 * ```
	 */
	async findFolder(name: string, parentId?: string): Promise<string | null> {
		if (!name) {
			throw new Error('Folder name is required');
		}

		// Build query: find folder by name, not trashed
		let query = `name='${escapeQueryValue(name)}' and mimeType='${DRIVE_FOLDER_MIME}' and trashed=false`;
		if (parentId) {
			query += ` and '${parentId}' in parents`;
		}

		const endpoint = `/files?q=${encodeURIComponent(query)}&fields=files(id,name)`;
		const response = await this.request<DriveListResponse>(endpoint);

		if (response.files && response.files.length > 0) {
			return response.files[0].id;
		}

		return null;
	}

	/**
	 * Create a new folder
	 *
	 * @param name - Folder name
	 * @param parentId - Optional parent folder ID (defaults to root)
	 * @returns Created folder ID
	 *
	 * @example
	 * ```typescript
	 * const folderId = await client.createFolder('My Documents');
	 * console.log('Created folder:', folderId);
	 * ```
	 */
	async createFolder(name: string, parentId?: string): Promise<string> {
		if (!name) {
			throw new Error('Folder name is required');
		}

		const metadata: Record<string, unknown> = {
			name,
			mimeType: DRIVE_FOLDER_MIME
		};

		if (parentId) {
			metadata.parents = [parentId];
		}

		const response = await this.request<DriveFileMetadata>('/files', {
			method: 'POST',
			body: JSON.stringify(metadata)
		});

		return response.id;
	}

	/**
	 * Get or create the app's whiteboard folder
	 * Creates "UbuMaths Whiteboards" folder if it doesn't exist
	 *
	 * @returns Folder ID
	 *
	 * @example
	 * ```typescript
	 * const folderId = await client.getOrCreateAppFolder();
	 * // Always returns a valid folder ID
	 * ```
	 */
	async getOrCreateAppFolder(): Promise<string> {
		// First, try to find existing folder
		const existingId = await this.findFolder(WHITEBOARD_FOLDER_NAME);
		if (existingId) {
			return existingId;
		}

		// Create new folder
		return this.createFolder(WHITEBOARD_FOLDER_NAME);
	}

	/**
	 * Create a new file on Google Drive
	 *
	 * @param options - File creation options
	 * @returns Created file metadata
	 *
	 * @example
	 * ```typescript
	 * const file = await client.createFile({
	 *   name: 'whiteboard.ubw',
	 *   content: JSON.stringify(document),
	 *   mimeType: 'application/vnd.ubumaths.whiteboard+json',
	 *   folderId: 'folder123'
	 * });
	 * console.log('Created file:', file.id);
	 * ```
	 */
	async createFile(options: CreateFileOptions): Promise<DriveFileMetadata> {
		const { name, content, mimeType, folderId, description, isBase64, appProperties } = options;

		if (!name || !content || !mimeType || !folderId) {
			throw new Error('name, content, mimeType, and folderId are required');
		}

		// Build multipart request
		const boundary = '-------ubumaths-multipart-boundary';
		const metadata: Record<string, unknown> = {
			name,
			mimeType,
			parents: [folderId]
		};

		if (description) {
			metadata.description = description;
		}

		if (appProperties) {
			metadata.appProperties = appProperties;
		}

		// Build content part with optional base64 encoding header
		const contentPart = isBase64
			? [
					`--${boundary}`,
					`Content-Type: ${mimeType}`,
					'Content-Transfer-Encoding: base64',
					'',
					content
				]
			: [`--${boundary}`, `Content-Type: ${mimeType}`, '', content];

		const body = [
			`--${boundary}`,
			'Content-Type: application/json; charset=UTF-8',
			'',
			JSON.stringify(metadata),
			...contentPart,
			`--${boundary}--`
		].join('\r\n');

		const endpoint = `/files?uploadType=multipart&fields=id,name,mimeType,modifiedTime,createdTime`;

		return this.requestUpload<DriveFileMetadata>(
			endpoint,
			body,
			`multipart/related; boundary=${boundary}`
		);
	}

	/**
	 * Update an existing file's content
	 *
	 * @param fileId - File ID to update
	 * @param content - New file content
	 * @param newName - Optional new name for the file
	 * @returns Updated file metadata
	 *
	 * @example
	 * ```typescript
	 * const file = await client.updateFile('file123', JSON.stringify(document));
	 * console.log('Updated at:', file.modifiedTime);
	 * ```
	 */
	async updateFile(fileId: string, content: string, newName?: string): Promise<DriveFileMetadata> {
		if (!fileId || !content) {
			throw new Error('fileId and content are required');
		}

		let endpoint = `/files/${fileId}?uploadType=media&fields=id,name,mimeType,modifiedTime`;

		// If renaming, we need to use multipart upload
		if (newName) {
			const boundary = '-------ubumaths-multipart-boundary';
			const metadata = { name: newName };

			const body = [
				`--${boundary}`,
				'Content-Type: application/json; charset=UTF-8',
				'',
				JSON.stringify(metadata),
				`--${boundary}`,
				'Content-Type: application/octet-stream',
				'',
				content,
				`--${boundary}--`
			].join('\r\n');

			endpoint = `/files/${fileId}?uploadType=multipart&fields=id,name,mimeType,modifiedTime`;
			return this.requestPatch<DriveFileMetadata>(
				endpoint,
				body,
				`multipart/related; boundary=${boundary}`
			);
		}

		// Simple media upload for content-only update
		return this.requestPatch<DriveFileMetadata>(endpoint, content, 'application/octet-stream');
	}

	/**
	 * List files in a folder
	 *
	 * @param folderId - Parent folder ID
	 * @param mimeType - Optional MIME type filter
	 * @param includeAppProperties - Include appProperties in response
	 * @returns Array of file metadata
	 *
	 * @example
	 * ```typescript
	 * const files = await client.listFiles(folderId, 'application/vnd.ubumaths.whiteboard+json');
	 * files.forEach(f => console.log(f.name, f.modifiedTime));
	 * ```
	 */
	async listFiles(
		folderId: string,
		mimeType?: string,
		includeAppProperties = false
	): Promise<(DriveFileMetadata & { appProperties?: Record<string, string> })[]> {
		if (!folderId) {
			throw new Error('folderId is required');
		}

		// Build query
		let query = `'${folderId}' in parents and trashed=false`;
		if (mimeType) {
			query += ` and mimeType='${mimeType}'`;
		}

		let fields = 'files(id,name,mimeType,modifiedTime,createdTime)';
		if (includeAppProperties) {
			fields = 'files(id,name,mimeType,modifiedTime,createdTime,appProperties)';
		}
		const endpoint = `/files?q=${encodeURIComponent(query)}&fields=${fields}&orderBy=modifiedTime desc`;

		const response = await this.request<
			DriveListResponse & {
				files: (DriveFileMetadata & { appProperties?: Record<string, string> })[];
			}
		>(endpoint);
		return response.files || [];
	}

	/**
	 * Update file metadata (appProperties only)
	 *
	 * @param fileId - File ID to update
	 * @param appProperties - New appProperties (merged with existing)
	 * @returns Updated file metadata
	 */
	async updateFileMetadata(
		fileId: string,
		appProperties: Record<string, string>
	): Promise<DriveFileMetadata> {
		if (!fileId) {
			throw new Error('fileId is required');
		}

		const endpoint = `/files/${fileId}?fields=id,name,mimeType,modifiedTime,appProperties`;
		return this.request<DriveFileMetadata>(endpoint, {
			method: 'PATCH',
			body: JSON.stringify({ appProperties })
		});
	}

	/**
	 * Get file content as text
	 *
	 * @param fileId - File ID to download
	 * @returns File content as string
	 *
	 * @example
	 * ```typescript
	 * const content = await client.getFileContent('file123');
	 * const document = JSON.parse(content);
	 * ```
	 */
	async getFileContent(fileId: string): Promise<string> {
		if (!fileId) {
			throw new Error('fileId is required');
		}

		const endpoint = `/files/${fileId}?alt=media`;
		return this.requestText(endpoint);
	}

	/**
	 * List subfolders in a folder
	 *
	 * @param folderId - Parent folder ID
	 * @returns Array of folder metadata
	 *
	 * @example
	 * ```typescript
	 * const folders = await client.listFolders(parentFolderId);
	 * folders.forEach(f => console.log(f.name));
	 * ```
	 */
	async listFolders(folderId: string): Promise<DriveFileMetadata[]> {
		if (!folderId) {
			throw new Error('folderId is required');
		}

		const query = `'${folderId}' in parents and mimeType='${DRIVE_FOLDER_MIME}' and trashed=false`;
		const fields = 'files(id,name,mimeType,modifiedTime,createdTime)';
		const endpoint = `/files?q=${encodeURIComponent(query)}&fields=${fields}&orderBy=name`;

		const response = await this.request<DriveListResponse>(endpoint);
		return response.files || [];
	}

	/**
	 * Get or create a class folder inside the app folder
	 *
	 * @param folderName - Full folder name (e.g., "6AWB - Mathematiques 6A")
	 * @returns Folder ID
	 *
	 * @example
	 * ```typescript
	 * const folderId = await client.getOrCreateClassFolder('6AWB - Math 6A');
	 * ```
	 */
	async getOrCreateClassFolder(folderName: string): Promise<string> {
		if (!folderName) {
			throw new Error('Folder name is required');
		}

		// Get app folder first
		const appFolderId = await this.getOrCreateAppFolder();

		// Try to find existing class folder
		const existingId = await this.findFolder(folderName, appFolderId);
		if (existingId) {
			return existingId;
		}

		// Create new class folder
		return this.createFolder(folderName, appFolderId);
	}

	/**
	 * Get parent folder ID for a given folder
	 *
	 * @param folderId - Folder ID to get parent of
	 * @returns Parent folder ID or null if root
	 */
	async getParentFolderId(folderId: string): Promise<string | null> {
		if (!folderId) {
			throw new Error('folderId is required');
		}

		const endpoint = `/files/${folderId}?fields=parents`;
		const response = await this.request<{ parents?: string[] }>(endpoint);

		if (response.parents && response.parents.length > 0) {
			return response.parents[0];
		}

		return null;
	}

	/**
	 * Move a file to a different folder
	 *
	 * @param fileId - File ID to move
	 * @param newFolderId - Destination folder ID
	 * @returns Updated file metadata
	 *
	 * @example
	 * ```typescript
	 * // Move file to a different folder
	 * await client.moveFile('file123', 'newFolder456');
	 * ```
	 */
	async moveFile(fileId: string, newFolderId: string): Promise<DriveFileMetadata> {
		if (!fileId || !newFolderId) {
			throw new Error('fileId and newFolderId are required');
		}

		// Get current parent(s)
		const currentParent = await this.getParentFolderId(fileId);

		if (currentParent === newFolderId) {
			// Already in the right folder, just return current metadata
			const endpoint = `/files/${fileId}?fields=id,name,mimeType,modifiedTime`;
			return this.request<DriveFileMetadata>(endpoint);
		}

		// Move file by updating parents
		let endpoint = `/files/${fileId}?addParents=${newFolderId}&fields=id,name,mimeType,modifiedTime`;
		if (currentParent) {
			endpoint += `&removeParents=${currentParent}`;
		}

		return this.request<DriveFileMetadata>(endpoint, {
			method: 'PATCH'
		});
	}
}
