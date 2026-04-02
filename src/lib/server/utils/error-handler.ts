import { error } from '@sveltejs/kit';
import type { PostgrestError } from '@supabase/supabase-js';

/**
 * Semantic error codes for RPC errors.
 * Fixed codes identify the error type without needing Vercel logs.
 * UNKNOWN errors also include a random trace code for log lookup.
 *
 * Catalog:
 *   SCHEMA_CACHE  — PostgREST schema cache stale after migration
 *   UNAUTH        — Not authenticated
 *   NOT_FOUND     — Resource not found or not owned
 *   HINT_LIMIT    — Maximum hints reached
 *   ALREADY_USED  — Action already used in this game
 *   NO_FUNDS      — Insufficient gidouilles
 *   GRID          — Grid/game state validation failed
 *   DEADLOCK      — PostgreSQL deadlock
 *   TIMEOUT       — Statement or lock timeout
 *   UNKNOWN       — Unmapped error (includes random trace code for Vercel logs)
 */
export const RPC_ERROR_CODES = {
	SCHEMA_CACHE: 'SCHEMA_CACHE',
	UNAUTH: 'UNAUTH',
	NOT_FOUND: 'NOT_FOUND',
	HINT_LIMIT: 'HINT_LIMIT',
	ALREADY_USED: 'ALREADY_USED',
	NO_FUNDS: 'NO_FUNDS',
	GRID: 'GRID',
	DEADLOCK: 'DEADLOCK',
	TIMEOUT: 'TIMEOUT',
	UNKNOWN: 'UNKNOWN'
} as const;

function generateTraceCode(): string {
	return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function withCode(message: string, code: string, traceCode?: string): string {
	return traceCode ? `${message} [${code}·${traceCode}]` : `${message} [${code}]`;
}

/**
 * Maps PostgreSQL constraint names to user-friendly error messages
 */
const CONSTRAINT_MESSAGES: Record<string, string> = {
	// Minesweeper constraints
	valid_hints_used: "Limite d'indices atteinte",
	reasonable_time_bounds: 'Temps de jeu invalide',
	grid_state_size_limit: 'Grille trop volumineuse',
	valid_difficulty: 'Difficulté invalide',
	valid_status: 'Statut de jeu invalide',

	// Profile constraints
	firstname_no_html: 'Le prénom contient des caractères invalides',
	lastname_no_html: 'Le nom contient des caractères invalides',

	// Generic constraints
	profiles_pkey: 'Profil déjà existant',
	unique_constraint: 'Cette valeur existe déjà',
	foreign_key: 'Référence invalide',
	check_constraint: 'Validation échouée'
};

/**
 * Maps PostgreSQL error codes to user-friendly messages
 */
const ERROR_CODE_MESSAGES: Record<string, string> = {
	'23505': 'Cette valeur existe déjà', // unique_violation
	'23503': 'Référence invalide', // foreign_key_violation
	'23514': 'Validation échouée', // check_violation
	'42P01': 'Ressource introuvable', // undefined_table
	PGRST116: 'Ressource introuvable' // Postgrest: no rows returned
};

/**
 * Sanitizes PostgreSQL errors for safe display to users
 * Logs full error details server-side for debugging
 */
export function sanitizePostgresError(err: unknown, context: string): never {
	// Log full error server-side for debugging
	console.error(`[${context}]`, {
		error: err,
		timestamp: new Date().toISOString()
	});

	// Handle Supabase Postgrest errors
	if (err && typeof err === 'object' && 'code' in err) {
		const pgError = err as PostgrestError;

		// Map error code to user message
		if (pgError.code && ERROR_CODE_MESSAGES[pgError.code]) {
			throw error(400, ERROR_CODE_MESSAGES[pgError.code]);
		}

		// Check for constraint violation
		if (pgError.message) {
			const constraintMatch = pgError.message.match(/constraint "(\w+)"/);
			if (constraintMatch && CONSTRAINT_MESSAGES[constraintMatch[1]]) {
				throw error(400, CONSTRAINT_MESSAGES[constraintMatch[1]]);
			}
		}

		// Generic Postgrest error
		throw error(400, 'Requête invalide');
	}

	// Handle SvelteKit errors (pass through)
	if (err && typeof err === 'object' && 'status' in err) {
		throw err;
	}

	// Unknown error - return generic message
	throw error(500, 'Une erreur est survenue');
}

/**
 * Sanitizes RPC errors from Supabase functions
 */
export function sanitizeRPCError(err: unknown, functionName: string): never {
	console.error(`[RPC:${functionName}]`, {
		error: err,
		timestamp: new Date().toISOString()
	});

	if (err && typeof err === 'object' && 'message' in err) {
		const rpcError = err as { message: string; code?: string };
		const msg = rpcError.message ?? '';
		const code = rpcError.code ?? '';

		// PostgREST: schema cache stale (function not found after migration)
		if (code === 'PGRST202' || msg.includes('Could not find the function')) {
			throw error(
				503,
				withCode('Service temporairement indisponible, réessayez', RPC_ERROR_CODES.SCHEMA_CACHE)
			);
		}

		// Authentication
		if (msg.includes('non authentifié') || msg.includes('Not authenticated')) {
			throw error(401, withCode('Non authentifié', RPC_ERROR_CODES.UNAUTH));
		}

		// Not found / not owned
		if (
			msg.includes('introuvable') ||
			msg.includes('not found') ||
			msg.includes('not owned') ||
			msg.includes('not in progress')
		) {
			throw error(404, withCode('Ressource introuvable', RPC_ERROR_CODES.NOT_FOUND));
		}

		// Hint limit
		if (msg.includes('Maximum hints reached')) {
			throw error(400, withCode("Limite d'indices atteinte", RPC_ERROR_CODES.HINT_LIMIT));
		}

		// Undo already used
		if (msg.includes('already used') || msg.includes('déjà utilisé')) {
			throw error(
				400,
				withCode('Action déjà utilisée dans cette partie', RPC_ERROR_CODES.ALREADY_USED)
			);
		}

		// Insufficient gidouilles
		if (msg.includes('Insufficient gidouilles') || msg.includes('pas assez de gidouilles')) {
			throw error(400, withCode('Gidouilles insuffisants', RPC_ERROR_CODES.NO_FUNDS));
		}

		// Grid / game state validation
		if (msg.includes('grille') || msg.includes('grid') || msg.includes('victoire')) {
			throw error(400, withCode('Validation de la grille échouée', RPC_ERROR_CODES.GRID));
		}

		// PostgreSQL infrastructure errors
		if (msg.includes('deadlock detected')) {
			throw error(503, withCode('Conflit temporaire, réessayez', RPC_ERROR_CODES.DEADLOCK));
		}

		if (msg.includes('canceling statement') || msg.includes('timeout')) {
			throw error(503, withCode('Délai dépassé, réessayez', RPC_ERROR_CODES.TIMEOUT));
		}

		// Unknown — generate a trace code and log the real message for Vercel lookup
		const traceCode = generateTraceCode();
		console.error(`[RPC:${functionName}] ${traceCode}·UNKNOWN — "${msg}" (code: "${code}")`);
		throw error(400, withCode('Opération invalide', RPC_ERROR_CODES.UNKNOWN, traceCode));
	}

	throw error(500, 'Une erreur est survenue');
}
