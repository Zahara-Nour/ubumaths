import { throwServerError } from '#lib/server/utils/error-handler.ts';
import { error, isHttpError } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { compileLatexSchema } from '#lib/server/validation/latex.ts';
import { requireAuth } from '#lib/server/middleware/auth.ts';

/**
 * Server-side proxy for LaTeX compilation via TeXLive.net
 * This avoids CORS issues by making the request from the server
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	// SECURITY (finding H13): this endpoint proxies arbitrary payloads to
	// texlive.net under the app's IP. It was the only endpoint with no auth marker
	// (an open proxy). Require authentication so abuse needs an account.
	await requireAuth(locals);

	try {
		// Get the form data from the client
		const formData = await request.formData();

		// Extract and validate fields
		const latex = formData.get('latex');
		const format = formData.get('format');
		const fontSize = formData.get('fontSize');
		const displayMode = formData.get('displayMode');

		// Validate input using Zod schema
		const validation = compileLatexSchema.safeParse({
			latex: latex?.toString(),
			format: format?.toString(),
			fontSize: fontSize ? Number(fontSize) : undefined,
			displayMode: displayMode === 'true' || displayMode === '1'
		});

		if (!validation.success) {
			throw error(400, validation.error.issues[0].message);
		}

		// Create validated FormData to forward
		const validatedFormData = new FormData();
		validatedFormData.append('latex', validation.data.latex);
		validatedFormData.append('format', validation.data.format);
		if (validation.data.fontSize) {
			validatedFormData.append('fontSize', validation.data.fontSize.toString());
		}
		validatedFormData.append('displayMode', validation.data.displayMode.toString());

		// Forward the request to texlive.net
		const response = await fetch('https://texlive.net/cgi-bin/latexcgi', {
			method: 'POST',
			body: validatedFormData
		});

		if (!response.ok) {
			throw error(response.status, `LaTeX compilation service error: ${response.statusText}`);
		}

		// Get the content type to determine if it's a PDF or log file
		const contentType = response.headers.get('content-type') || '';

		// Get the response data
		const data = await response.arrayBuffer();

		// Return the response with the same content type
		return new Response(data, {
			status: 200,
			headers: {
				'Content-Type': contentType
			}
		});
	} catch (err) {
		// Refus de la validation (400) ou du service : rendu tel quel, jamais changé en 500
		if (isHttpError(err)) throw err;
		throwServerError('api/latex/compile', err, 'La compilation du document a échoué');
	}
};
