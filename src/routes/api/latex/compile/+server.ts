import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Server-side proxy for LaTeX compilation via TeXLive.net
 * This avoids CORS issues by making the request from the server
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		// Get the form data from the client
		const formData = await request.formData();

		// Forward the request to texlive.net
		const response = await fetch('https://texlive.net/cgi-bin/latexcgi', {
			method: 'POST',
			body: formData
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
