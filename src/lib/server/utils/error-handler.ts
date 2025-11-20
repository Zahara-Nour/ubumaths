import { error } from '@sveltejs/kit';
import type { PostgrestError } from '@supabase/supabase-js';

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

		// Map common RPC error messages (in French from our functions)
		if (
			rpcError.message?.includes('non authentifié') ||
			rpcError.message?.includes('Not authenticated')
		) {
			throw error(401, 'Non authentifié');
		}

		if (rpcError.message?.includes('introuvable') || rpcError.message?.includes('not found')) {
			throw error(404, 'Ressource introuvable');
		}

		if (rpcError.message?.includes('Maximum hints reached')) {
			throw error(400, "Limite d'indices atteinte");
		}

		if (
			rpcError.message?.includes('Insufficient gidouilles') ||
			rpcError.message?.includes('pas assez de gidouilles')
		) {
			throw error(400, 'Gidouilles insuffisants');
		}

		if (
			rpcError.message?.includes('grille') ||
			rpcError.message?.includes('grid') ||
			rpcError.message?.includes('victoire')
		) {
			throw error(400, 'Validation de la grille échouée');
		}

		// Generic RPC error
		throw error(400, 'Opération invalide');
	}

	throw error(500, 'Une erreur est survenue');
}
