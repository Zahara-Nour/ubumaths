/**
 * Filename Sanitization Utilities
 * =================================
 *
 * Functions for sanitizing strings to be used as filenames.
 * Two variants: slug-style (for markdown exports) and storage-safe (for file uploads).
 *
 * @module utils/filename
 */

/**
 * Sanitize string for use as URL slug or markdown filename
 *
 * - Converts to lowercase
 * - Replaces accented characters with ASCII equivalents
 * - Replaces non-alphanumeric characters with hyphens
 * - Removes leading/trailing hyphens
 * - Limits length to 50 characters
 *
 * @param name - Original name
 * @returns Sanitized slug-safe string
 *
 * @example
 * ```typescript
 * sanitizeForSlug('Théorème de Pythagore') // 'theoreme-de-pythagore'
 * sanitizeForSlug('Équations du 2ème degré') // 'equations-du-2eme-degre'
 * ```
 */
export function sanitizeForSlug(name: string): string {
	return name
		.toLowerCase()
		.replace(/[àáâäã]/g, 'a')
		.replace(/[èéêë]/g, 'e')
		.replace(/[ìíîï]/g, 'i')
		.replace(/[òóôöõ]/g, 'o')
		.replace(/[ùúûü]/g, 'u')
		.replace(/[ç]/g, 'c')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.substring(0, 50);
}

/**
 * Sanitize filename for storage (prevents path traversal and special characters)
 *
 * - Replaces path separators (/ and \) with underscores
 * - Replaces all special characters (except dots, hyphens, underscores) with underscores
 * - Limits length to 200 characters
 * - Preserves file extension
 * - Does NOT convert to lowercase (preserves original case)
 *
 * @param filename - Original filename
 * @returns Storage-safe filename
 *
 * @example
 * ```typescript
 * sanitizeForStorage('Document Important.pdf') // 'Document_Important.pdf'
 * sanitizeForStorage('../../../etc/passwd') // '______etc_passwd'
 * sanitizeForStorage('fichier@test#2024.docx') // 'fichier_test_2024.docx'
 * ```
 */
export function sanitizeForStorage(filename: string): string {
	return filename
		.replace(/[/\\]/g, '_') // Replace path separators
		.replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special chars (preserve .-_)
		.substring(0, 200); // Limit length
}

/**
 * Generate unique filename with timestamp
 *
 * Useful for avoiding filename collisions in storage.
 *
 * @param filename - Original filename
 * @returns Timestamped filename
 *
 * @example
 * ```typescript
 * generateUniqueFilename('report.pdf') // '1704556789123_report.pdf'
 * generateUniqueFilename('image.png') // '1704556789456_image.png'
 * ```
 */
export function generateUniqueFilename(filename: string): string {
	const timestamp = Date.now();
	const sanitized = sanitizeForStorage(filename);
	return `${timestamp}_${sanitized}`;
}

/**
 * Extract file extension from filename
 *
 * @param filename - Filename with extension
 * @returns File extension (including dot) or empty string
 *
 * @example
 * ```typescript
 * getFileExtension('document.pdf') // '.pdf'
 * getFileExtension('archive.tar.gz') // '.gz'
 * getFileExtension('noextension') // ''
 * ```
 */
export function getFileExtension(filename: string): string {
	const lastDot = filename.lastIndexOf('.');
	return lastDot > 0 ? filename.substring(lastDot) : '';
}

/**
 * Get filename without extension
 *
 * @param filename - Filename with extension
 * @returns Filename without extension
 *
 * @example
 * ```typescript
 * getFilenameWithoutExtension('document.pdf') // 'document'
 * getFilenameWithoutExtension('archive.tar.gz') // 'archive.tar'
 * getFilenameWithoutExtension('noextension') // 'noextension'
 * ```
 */
export function getFilenameWithoutExtension(filename: string): string {
	const lastDot = filename.lastIndexOf('.');
	return lastDot > 0 ? filename.substring(0, lastDot) : filename;
}
