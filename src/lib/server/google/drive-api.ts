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
 * Maximum number of retry attempts for rate limit errors
 */
const MAX_RETRIES = 3;

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
	webViewLink: string;
	/** Web content link (for downloading) */
	webContentLink?: string;
	/** Thumbnail link */
	thumbnailLink?: string;
	/** Icon link */
	iconLink: string;
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
						// Server errors - retry once
						if (retryCount === 0) {
							console.warn(`[GoogleDriveClient] Server error ${response.status}. Retrying once...`);
							await sleep(2000);
							return this.request<T>(endpoint, options, retryCount + 1);
						}
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
}
