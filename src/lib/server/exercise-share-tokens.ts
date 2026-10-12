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
	// SECURITY (finding H8): use a CSPRNG, not Math.random() (V8 xorshift128+ is
	// predictable — a couple of issued tokens let an attacker recover the state).
	// Rejection sampling avoids modulo bias over the 54-char alphabet.
	const n = TOKEN_CHARS.length;
	const max = Math.floor(256 / n) * n;
	let result = '';
	while (result.length < TOKEN_LENGTH) {
		const buf = new Uint8Array(TOKEN_LENGTH);
		crypto.getRandomValues(buf);
		for (let i = 0; i < buf.length && result.length < TOKEN_LENGTH; i++) {
			if (buf[i] < max) {
				result += TOKEN_CHARS.charAt(buf[i] % n);
			}
		}
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
	// SECURITY (finding H8): resolve the token through the SECURITY DEFINER RPC,
	// which requires the exact token and bypasses RLS. The old direct reads of
	// exercise_share_tokens + exercises relied on two PUBLIC blanket policies that
	// let anon dump every shared exercise (solution included) and every live token;
	// those policies are dropped. Access accounting (access_count, last_accessed_at)
	// is done inside the RPC.
	// A single generic error is returned (never leak whether a token is revoked vs
	// expired vs unknown).
	const { data, error: rpcError } = await supabase
		.rpc('get_exercise_by_share_token', { p_token: token })
		.maybeSingle();

	if (rpcError) {
		return { data: null, error: rpcError.message };
	}
	if (!data) {
		return { data: null, error: 'Token invalide' };
	}
	return { data: data as Exercise, error: null };
}

/** Erreur de `revokeShareToken` quand aucun jeton de cet exercice ne porte cet identifiant. */
export const SHARE_TOKEN_NOT_FOUND = 'Token not found';

/**
 * Revoke a share token
 *
 * Passe `is_active` à false. Le jeton doit appartenir à l'exercice nommé par
 * l'adresse ; la RLS réserve l'écriture à l'auteur.
 *
 * `.select()` sans `.single()` : 0 ligne (jeton inconnu, d'un autre exercice, ou
 * refus RLS silencieux) rend `SHARE_TOKEN_NOT_FOUND`, pas une erreur PGRST116.
 *
 * @param supabase - Supabase client
 * @param tokenId - ID of the token to revoke
 * @param exerciseId - Exercice auquel le jeton doit appartenir
 * @returns Error message if failed
 */
export async function revokeShareToken(
	supabase: SupabaseClient,
	tokenId: string,
	exerciseId: string
): Promise<{ error: string | null }> {
	const { data, error } = await supabase
		.from('exercise_share_tokens')
		.update({ is_active: false })
		.eq('id', tokenId)
		.eq('exercise_id', exerciseId)
		.select('id');

	if (error) {
		return { error: error.message };
	}

	if (!data || data.length === 0) {
		return { error: SHARE_TOKEN_NOT_FOUND };
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
