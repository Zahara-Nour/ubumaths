import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { compileLatexSchema } from '$lib/server/validation/latex';

/**
 * Server-side proxy for LaTeX compilation via TeXLive.net
 * This avoids CORS issues by making the request from the server
 */
export const POST: RequestHandler = async ({ request }) => {
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
		console.error('LaTeX compilation error:', err);
		throw error(500, `Compilation failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
	}
};
