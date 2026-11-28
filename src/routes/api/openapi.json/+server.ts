/**
 * OpenAPI JSON Endpoint
 * Serves the generated OpenAPI 3.1 specification
 */

import { serverErrorResponse } from '#lib/server/utils/error-handler.ts';
import type { RequestHandler } from './$types';
import { generateOpenAPISpec } from '#lib/server/openapi/generator.ts';
import { requireAdmin } from '#lib/server/middleware/auth.ts';

/**
 * GET /api/openapi.json
 * Returns the OpenAPI 3.1 specification
 */
export const GET: RequestHandler = async ({ locals }) => {
	// SECURITY (finding L2): the full API surface (every endpoint, parameter and
	// schema of an app holding minors' data) was public with `Cache-Control: public`
	// — free reconnaissance. Gate it to admins and never cache it.
	await requireAdmin(locals);
	try {
		const spec = generateOpenAPISpec();

		return Response.json(spec, {
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': 'private, no-store'
			}
		});
	} catch (error) {
		return serverErrorResponse(
			'api/openapi.json',
			error,
			'Impossible de générer la spécification OpenAPI'
		);
	}
};
