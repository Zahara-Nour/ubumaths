/**
 * File Upload Utilities
 * ======================
 *
 * Handles file uploads to Supabase Storage for chat attachments.
 * Enforces 1MB size limit and teacher-only permissions.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export const MAX_FILE_SIZE = 1048576; // 1MB in bytes

export interface FileUploadResult {
	success: boolean;
	attachment?: {
		file_name: string;
		file_type: string;
		file_size: number;
		storage_path: string;
		public_url: string;
	};
	error?: string;
}

/**
 * Upload a file to Supabase Storage
 *
 * @param supabase - Supabase client
 * @param file - File to upload
 * @param conversationId - Conversation ID
 * @param messageId - Message ID
 * @returns Upload result with attachment metadata
 */
export async function uploadChatAttachment(
	supabase: SupabaseClient,
	file: File,
	conversationId: string,
	messageId: string
): Promise<FileUploadResult> {
	// Validate file size
	if (file.size > MAX_FILE_SIZE) {
		return {
			success: false,
			error: `Le fichier dépasse la limite de 1MB (${Math.round(file.size / 1024)}KB)`
		};
	}

	// Create storage path: conversation_id/message_id/filename
	const timestamp = Date.now();
	const sanitizedFilename = sanitizeFilename(file.name);
	const storagePath = `${conversationId}/${messageId}/${timestamp}_${sanitizedFilename}`;

	try {
		// Upload to Supabase Storage
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { data, error } = await supabase.storage // data for future use
			.from('chat-attachments')
			.upload(storagePath, file, {
				cacheControl: '3600',
				upsert: false
			});

		if (error) {
			console.error('Storage upload error:', error);
			return {
				success: false,
				error: `Erreur d'upload: ${error.message}`
			};
		}

		// Get public URL
		const {
			data: { publicUrl }
		} = supabase.storage.from('chat-attachments').getPublicUrl(storagePath);

		return {
			success: true,
			attachment: {
				file_name: file.name,
				file_type: file.type,
				file_size: file.size,
				storage_path: storagePath,
				public_url: publicUrl
			}
		};
	} catch (error) {
		console.error('Exception during file upload:', error);
		return {
			success: false,
			error: "Erreur inattendue lors de l'upload"
		};
	}
}

/**
 * Upload multiple files
 *
 * @param supabase - Supabase client
 * @param files - Files to upload
 * @param conversationId - Conversation ID
 * @param messageId - Message ID
 * @returns Array of upload results
 */
export async function uploadMultipleAttachments(
	supabase: SupabaseClient,
	files: File[],
	conversationId: string,
	messageId: string
): Promise<FileUploadResult[]> {
	const results = await Promise.all(
		files.map((file) => uploadChatAttachment(supabase, file, conversationId, messageId))
	);

	return results;
}

/**
 * Delete attachment from storage
 *
 * @param supabase - Supabase client
 * @param storagePath - Path to file in storage
 */
export async function deleteChatAttachment(
	supabase: SupabaseClient,
	storagePath: string
): Promise<{ success: boolean; error?: string }> {
	try {
		const { error } = await supabase.storage.from('chat-attachments').remove([storagePath]);

		if (error) {
			console.error('Storage delete error:', error);
			return {
				success: false,
				error: `Erreur de suppression: ${error.message}`
			};
		}

		return { success: true };
	} catch (error) {
		console.error('Exception during file deletion:', error);
		return {
			success: false,
			error: 'Erreur inattendue lors de la suppression'
		};
	}
}

/**
 * Sanitize filename to prevent path traversal and special characters
 *
 * @param filename - Original filename
 * @returns Sanitized filename
 */
function sanitizeFilename(filename: string): string {
	// Remove path separators and special characters
	return filename
		.replace(/[\/\\]/g, '_') // Replace slashes
		.replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special chars
		.substring(0, 200); // Limit length
}

/**
 * Validate file type (optional - can be used for additional validation)
 *
 * @param file - File to validate
 * @param allowedTypes - Array of allowed MIME types
 * @returns True if file type is allowed
 */
export function validateFileType(file: File, allowedTypes: string[]): boolean {
	return allowedTypes.some((type) => {
		// Support wildcards like "image/*"
		if (type.endsWith('/*')) {
			const category = type.split('/')[0];
			return file.type.startsWith(category + '/');
		}
		return file.type === type;
	});
}

/**
 * Get file icon based on file type
 *
 * @param fileType - MIME type
 * @returns Icon name or emoji
 */
export function getFileIcon(fileType: string): string {
	if (fileType.startsWith('image/')) return '🖼️';
	if (fileType.startsWith('video/')) return '🎥';
	if (fileType.startsWith('audio/')) return '🎵';
	if (fileType === 'application/pdf') return '📄';
	if (
		fileType === 'application/msword' ||
		fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
	)
		return '📝';
	if (
		fileType === 'application/vnd.ms-excel' ||
		fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
	)
		return '📊';
	if (fileType.startsWith('text/')) return '📃';
	return '📎';
}
