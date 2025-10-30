/**
 * OpenAPI JSON Endpoint
 * Serves the generated OpenAPI 3.1 specification
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generateOpenAPISpec } from '$lib/server/openapi/generator';

/**
 * GET /api/openapi.json
 * Returns the OpenAPI 3.1 specification
 */
export const GET: RequestHandler = async () => {
	try {
		const spec = generateOpenAPISpec();

		return json(spec, {
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
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
