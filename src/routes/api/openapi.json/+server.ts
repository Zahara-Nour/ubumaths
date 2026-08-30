/**
 * OpenAPI JSON Endpoint
 * Serves the generated OpenAPI 3.1 specification
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generateOpenAPISpec } from '$lib/server/openapi/generator';
import { requireAdmin } from '$lib/server/middleware/auth';

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

		return json(spec, {
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': 'private, no-store'
			}
		});
	} catch (error) {
		console.error('Failed to generate OpenAPI spec:', error);

		return json(
			{
				error: {
					message: 'Failed to generate OpenAPI specification',
					details: error instanceof Error ? error.message : 'Unknown error'
				}
			},
			{
				status: 500
			}
		);
	}
};
