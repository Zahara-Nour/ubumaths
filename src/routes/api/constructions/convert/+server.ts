/**
 * API Route: /api/constructions/convert
 * POST - Convert InstrumenPoche XML to UbuMaths JSON
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { requireRoles } from '$lib/server/middleware/auth';
import { convertInstrumenPoche } from '$lib/constructions/converter';

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

/**
 * Request body for converting InstrumenPoche XML
 */
const convertRequestSchema = z.object({
	xml: z
		.string()
		.min(1, 'Le contenu XML est requis')
		.max(5_000_000, 'Le fichier XML est trop volumineux (max 5MB)'),
	title: z.string().max(200, 'Le titre ne doit pas depasser 200 caracteres').optional(),
	description: z
		.string()
		.max(2000, 'La description ne doit pas depasser 2000 caracteres')
		.optional()
});

// =============================================================================
// HANDLERS
// =============================================================================

/**
 * POST /api/constructions/convert
 * Convert InstrumenPoche XML to UbuMaths JSON
 * Teachers and admins only
 */
export const POST: RequestHandler = async ({ locals, request }) => {
	// Check authentication and authorization (teachers and admins only)
	await requireRoles(locals, ['teacher', 'admin']);

	// Parse and validate request body
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Corps de requete JSON invalide');
	}

	const validation = convertRequestSchema.safeParse(body);

	if (!validation.success) {
		const errorMsg = validation.error.issues
			.map((e) => `${e.path.join('.')}: ${e.message}`)
			.join('; ');
		throw error(400, `Validation echouee: ${errorMsg}`);
	}

	const { xml, title, description } = validation.data;

	// Convert XML to UbuMaths JSON
	try {
		const result = await convertInstrumenPoche(xml, {
			title,
			description
		});

		if (!result.success) {
			// Conversion failed - return 400 with errors
			throw error(400, `Conversion echouee: ${result.errors.join('; ')}`);
		}

		// SECURITY: Validate step count to prevent DoS
		const MAX_STEPS = 1000;
		if (result.script && result.script.steps.length > MAX_STEPS) {
			throw error(
				400,
				`Le script converti contient trop d'etapes (${result.script.steps.length}). Maximum: ${MAX_STEPS}`
			);
		}

		// Return conversion result with warnings
		return json(
			{
				script: result.script,
				warnings: result.warnings
			},
			{ status: 200 }
		);
	} catch (err) {
		// Handle unexpected errors during conversion
		if (err && typeof err === 'object' && 'status' in err) {
			// Re-throw SvelteKit errors (like the 400 from conversion failure)
			throw err;
		}

		console.error('Error converting InstrumenPoche XML:', err);
		const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
		throw error(500, `Erreur lors de la conversion: ${errorMessage}`);
	}
};
