/**
 * OpenAPI JSON Endpoint
 * Serves the generated OpenAPI 3.1 specification
 */

import type { RequestHandler } from './$types';
import { generateOpenAPISpec } from '#lib/server/openapi/generator.ts';
import { requireAdmin } from '#lib/server/middleware/auth.ts';
import { createServerLogger } from '#lib/utils/logger.ts';

const logger = createServerLogger('api/openapi.json/+server');

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
		logger.error('Failed to generate OpenAPI spec:', error);

		return Response.json(
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
