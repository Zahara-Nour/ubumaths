/**
 * Encryption utilities for Google OAuth tokens
 * Uses AES-256-GCM for secure token storage
 *
 * SECURITY NOTE:
 * - Tokens are encrypted before storing in database
 * - Encryption key must be stored securely (environment variable)
 * - Never log decrypted tokens
 * - Rotate encryption key periodically
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';
import { getEnv } from '$lib/server/env';

/**
 * Encryption algorithm configuration
 */
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits

/**
 * Derive a 256-bit key from the environment variable
 * Uses SHA-256 to ensure key is exactly 32 bytes
 *
 * @param key - Raw key from environment variable
 * @returns Buffer containing 32-byte key
 */
function deriveKey(key: string): Buffer {
	return createHash('sha256').update(key).digest();
}

/**
 * Get encryption key from environment
 * Validates key length and derives 256-bit key
 *
 * @throws {Error} If encryption key is not configured
 * @returns Derived 32-byte encryption key
 */
function getEncryptionKey(): Buffer {
	const env = getEnv();

	if (!env.GOOGLE_TOKEN_ENCRYPTION_KEY) {
		throw new Error(
			'GOOGLE_TOKEN_ENCRYPTION_KEY is not configured. ' +
				'Generate one with: openssl rand -base64 32'
		);
	}

	if (env.GOOGLE_TOKEN_ENCRYPTION_KEY.length < 32) {
		throw new Error(
			`GOOGLE_TOKEN_ENCRYPTION_KEY must be at least 32 characters. ` +
				`Current length: ${env.GOOGLE_TOKEN_ENCRYPTION_KEY.length}`
		);
	}

	return deriveKey(env.GOOGLE_TOKEN_ENCRYPTION_KEY);
}

/**
 * Encrypt OAuth token using AES-256-GCM
 *
 * @param token - Plain text token to encrypt
 * @returns Base64 encoded encrypted token with IV and auth tag
 *
 * @example
 * ```typescript
 * const encrypted = encryptToken('ya29.a0AfH6...');
 * // Store encrypted token in database
 * await supabase
 *   .from('google_integrations')
 *   .update({ access_token: encrypted })
 *   .eq('teacher_id', userId);
 * ```
 */
export function encryptToken(token: string): string {
	if (!token) {
		throw new Error('Token cannot be empty');
	}

	try {
		const key = getEncryptionKey();
		const iv = randomBytes(IV_LENGTH);
		const cipher = createCipheriv(ALGORITHM, key, iv);

		// Encrypt the token
		let encrypted = cipher.update(token, 'utf8', 'base64');
		encrypted += cipher.final('base64');

		// Get authentication tag
		const authTag = cipher.getAuthTag();

		// Combine IV + auth tag + encrypted data
		// Format: [IV (16 bytes)][Auth Tag (16 bytes)][Encrypted Data (variable)]
		const combined = Buffer.concat([iv, authTag, Buffer.from(encrypted, 'base64')]);

		return combined.toString('base64');
	} catch (error) {
		// Don't leak token in error message
		throw new Error(
			`Failed to encrypt token: ${error instanceof Error ? error.message : 'Unknown error'}`
		);
	}
}

/**
 * Decrypt OAuth token using AES-256-GCM
 *
 * @param encryptedToken - Base64 encoded encrypted token
 * @returns Plain text token
 *
 * @example
 * ```typescript
 * const { data } = await supabase
 *   .from('google_integrations')
 *   .select('access_token')
 *   .eq('teacher_id', userId)
 *   .single();
 *
 * const token = decryptToken(data.access_token);
 * // Use token for API requests
 * ```
 */
export function decryptToken(encryptedToken: string): string {
	if (!encryptedToken) {
		throw new Error('Encrypted token cannot be empty');
	}

	try {
		const key = getEncryptionKey();
		const combined = Buffer.from(encryptedToken, 'base64');

		// Extract IV, auth tag, and encrypted data
		if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH) {
			throw new Error('Invalid encrypted token format: too short');
		}

		const iv = combined.subarray(0, IV_LENGTH);
		const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
		const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

		// Decrypt the token
		const decipher = createDecipheriv(ALGORITHM, key, iv);
		decipher.setAuthTag(authTag);

		let decrypted = decipher.update(encrypted, undefined, 'utf8');
		decrypted += decipher.final('utf8');

		return decrypted;
	} catch (error) {
		// Don't leak encrypted token in error message
		throw new Error(
			`Failed to decrypt token: ${error instanceof Error ? error.message : 'Unknown error'}`
		);
	}
}

/**
 * Hash token for comparison purposes (one-way)
 * Useful for checking if token has changed without storing plain text
 *
 * @param token - Token to hash
 * @returns Hex string hash
 *
 * @example
 * ```typescript
 * const hash = hashToken('ya29.a0AfH6...');
 * // Store hash for comparison
 * ```
 */
export function hashToken(token: string): string {
	if (!token) {
		throw new Error('Token cannot be empty');
	}

	return createHash('sha256').update(token).digest('hex');
}

/**
 * Validate encryption key is properly configured
 * Useful for startup checks
 *
 * @returns true if encryption key is valid
 * @throws {Error} If encryption key is not configured or invalid
 */
export function validateEncryptionKey(): boolean {
	getEncryptionKey();
	return true;
}

/**
 * Test encryption/decryption roundtrip
 * Useful for validating configuration
 *
 * @returns true if encryption works correctly
 * @throws {Error} If encryption/decryption fails
 */
export function testEncryption(): boolean {
	const testToken = 'test-token-' + randomBytes(16).toString('hex');

	try {
		const encrypted = encryptToken(testToken);
		const decrypted = decryptToken(encrypted);

		if (decrypted !== testToken) {
			throw new Error('Decrypted token does not match original');
		}

		return true;
	} catch (error) {
		throw new Error(
			`Encryption test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
		);
	}
}
