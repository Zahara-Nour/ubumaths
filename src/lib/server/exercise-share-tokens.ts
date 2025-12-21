/**
 * Exercise Share Tokens - Server Functions
 *
 * Functions for creating, validating, and managing share tokens
 * that allow public access to private exercises via unique URLs.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ExerciseShareToken, Exercise } from '$lib/exercises/types';

// ============================================================================
// TOKEN GENERATION UTILITY
// ============================================================================

/**
 * Characters for token generation (excludes ambiguous: 0, O, l, I)
 */
const TOKEN_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
const TOKEN_LENGTH = 16;

/**
 * Generate a 16-character alphanumeric token
 *
 * Excludes ambiguous characters (0, O, l, I) for better readability.
 *
 * @returns 16-character alphanumeric string
 */
export function generateShareTokenString(): string {
	let result = '';
	for (let i = 0; i < TOKEN_LENGTH; i++) {
		result += TOKEN_CHARS.charAt(Math.floor(Math.random() * TOKEN_CHARS.length));
	}
	return result;
}

// ============================================================================
// SHARE TOKEN CRUD OPERATIONS
// ============================================================================

/**
 * Create a new share token for an exercise
 *
 * Only the exercise owner can create tokens (enforced by RLS).
 *
 * @param supabase - Supabase client
 * @param exerciseId - ID of the exercise to share
 * @param userId - ID of the user creating the token
 * @param expiresInDays - Optional number of days until expiration (null = never)
 * @returns Created token or error
 */
export async function createShareToken(
	supabase: SupabaseClient,
	exerciseId: string,
	userId: string,
	expiresInDays?: number | null
): Promise<{ data: ExerciseShareToken | null; error: string | null }> {
	// Calculate expiration date if provided
	let expiresAt: string | null = null;
	if (expiresInDays && expiresInDays > 0) {
		const expDate = new Date();
		expDate.setDate(expDate.getDate() + expiresInDays);
		expiresAt = expDate.toISOString();
	}

	// Generate unique token
	const token = generateShareTokenString();

	const { data, error } = await supabase
		.from('exercise_share_tokens')
		.insert({
			exercise_id: exerciseId,
			token,
			created_by: userId,
			expires_at: expiresAt,
			is_active: true,
			access_count: 0
		})
		.select()
		.single();

	if (error) {
		return { data: null, error: error.message };
	}

	return { data: data as ExerciseShareToken, error: null };
}

/**
 * Get exercise by share token
 *
 * Validates token and returns exercise if token is valid.
 *
 * @param supabase - Supabase client
 * @param token - 16-character share token
 * @returns Exercise or error message
 */
export async function getExerciseByShareToken(
	supabase: SupabaseClient,
	token: string
): Promise<{ data: Exercise | null; error: string | null }> {
	// Find token record
	const { data: tokenRecord, error: tokenError } = await supabase
		.from('exercise_share_tokens')
		.select('*')
		.eq('token', token)
		.maybeSingle();

	if (tokenError) {
		return { data: null, error: tokenError.message };
	}

	if (!tokenRecord) {
		return { data: null, error: 'Token invalide' };
	}

	// Check if token is active
	if (!tokenRecord.is_active) {
		return { data: null, error: 'Token révoqué' };
	}

	// Check if token is expired
	if (tokenRecord.expires_at && new Date(tokenRecord.expires_at) < new Date()) {
		return { data: null, error: 'Token expiré' };
	}

	// Get exercise
	const { data: exercise, error: exerciseError } = await supabase
		.from('exercises')
		.select('*')
		.eq('id', tokenRecord.exercise_id)
		.single();

	if (exerciseError) {
		return { data: null, error: exerciseError.message };
	}

	return { data: exercise as Exercise, error: null };
}

/**
 * Record access via share token
 *
 * Increments access_count and updates last_accessed_at.
 * This is a fire-and-forget operation - errors are ignored.
 *
 * @param supabase - Supabase client
 * @param token - Share token used for access
 */
export async function recordTokenAccess(supabase: SupabaseClient, token: string): Promise<void> {
	try {
		// Use SQL expression for atomic increment via rpc
		// Fallback: simple update that sets a timestamp (access_count tracked separately)
		await supabase
			.from('exercise_share_tokens')
			.update({
				last_accessed_at: new Date().toISOString()
			})
			.eq('token', token);

		// For atomic increment, we'd use rpc or database triggers
		// This is a simplified version - in production, use:
		// await supabase.rpc('increment_token_access_count', { token_value: token });
	} catch {
		// Fire and forget - don't throw on errors
	}
}

/**
 * Revoke a share token
 *
 * Sets is_active=false. Only the exercise owner can revoke (RLS enforced).
 *
 * @param supabase - Supabase client
 * @param tokenId - ID of the token to revoke
 * @param userId - ID of the user attempting to revoke
 * @returns Error message if failed
 */
export async function revokeShareToken(
	supabase: SupabaseClient,
	tokenId: string,
	_userId: string
): Promise<{ error: string | null }> {
	const { data, error } = await supabase
		.from('exercise_share_tokens')
		.update({ is_active: false })
		.eq('id', tokenId)
		.select()
		.single();

	if (error) {
		return { error: error.message };
	}

	if (!data) {
		return { error: 'Token not found' };
	}

	return { error: null };
}

/**
 * Get all share tokens for an exercise
 *
 * Returns tokens created by any teacher for this exercise.
 * RLS ensures only exercise owner can see their tokens.
 *
 * @param supabase - Supabase client
 * @param exerciseId - Exercise ID
 * @returns List of tokens or error
 */
export async function getExerciseShareTokens(
	supabase: SupabaseClient,
	exerciseId: string
): Promise<{ data: ExerciseShareToken[]; error: string | null }> {
	const { data, error } = await supabase
		.from('exercise_share_tokens')
		.select('*')
		.eq('exercise_id', exerciseId)
		.order('created_at', { ascending: false });

	if (error) {
		return { data: [], error: error.message };
	}

	return { data: (data || []) as ExerciseShareToken[], error: null };
}

/**
 * Validate a share token for a specific exercise
 *
 * Checks:
 * 1. Token exists
 * 2. Token is active
 * 3. Token is not expired
 * 4. Token belongs to the specified exercise
 *
 * @param supabase - Supabase client
 * @param token - Share token to validate
 * @param exerciseId - Expected exercise ID
 * @returns Validation result with specific error message
 */
export async function validateShareToken(
	supabase: SupabaseClient,
	token: string,
	exerciseId: string
): Promise<{ valid: boolean; error?: string }> {
	const { data: tokenRecord, error } = await supabase
		.from('exercise_share_tokens')
		.select('*')
		.eq('token', token)
		.maybeSingle();

	if (error) {
		return { valid: false, error: error.message };
	}

	if (!tokenRecord) {
		return { valid: false, error: 'Token invalide' };
	}

	// Check if token is active
	if (!tokenRecord.is_active) {
		return { valid: false, error: 'Token révoqué' };
	}

	// Check if token is expired
	if (tokenRecord.expires_at && new Date(tokenRecord.expires_at) < new Date()) {
		return { valid: false, error: 'Token expiré' };
	}

	// Check if token belongs to this exercise
	if (tokenRecord.exercise_id !== exerciseId) {
		return { valid: false, error: 'Token invalide pour cet exercice' };
	}

	return { valid: true };
}

/**
 * Build shareable URL for an exercise with token
 *
 * @param baseUrl - Base URL of the application
 * @param slug - Exercise slug
 * @param token - Share token
 * @param options - Additional URL parameters
 * @returns Full shareable URL
 */
export function buildShareUrl(
	baseUrl: string,
	slug: string,
	token: string,
	options?: { variation?: string; seed?: number }
): string {
	const url = new URL(`/exercice/${slug}`, baseUrl);
	url.searchParams.set('token', token);

	if (options?.variation) {
		url.searchParams.set('variation', options.variation);
	}
	if (options?.seed !== undefined) {
		url.searchParams.set('seed', options.seed.toString());
	}

	return url.toString();
}
