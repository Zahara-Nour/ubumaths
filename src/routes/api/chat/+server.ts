import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

interface ChatMessage {
	role: 'system' | 'user' | 'assistant';
	content: string;
}

interface ChatRequest {
	messages: ChatMessage[];
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { messages } = (await request.json()) as ChatRequest;

		// Validation
		if (!messages || !Array.isArray(messages)) {
			return json({ error: 'Format de messages invalide' }, { status: 400 });
		}

		// Check if API key is configured
		if (!env.GROQ_API_KEY) {
			console.error('GROQ_API_KEY not configured');
			return json(
				{
					error: 'Service temporairement indisponible',
					details: 'API key not configured'
				},
				{ status: 503 }
			);
		}

		// Strip out any extra properties (like timestamp) and keep only role and content for API
		const apiMessages = messages.map(({ role, content }) => ({ role, content }));

		// Call Groq API
		const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${env.GROQ_API_KEY}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				model: 'llama-3.3-70b-versatile',
				messages: apiMessages,
				temperature: 0.8, // Higher temperature for more creative/absurd responses
				max_tokens: 1000,
				top_p: 1,
				stream: false
			})
		});

		if (!response.ok) {
			const errorData = await response.text();
			console.error('Groq API Error:', errorData);
			throw new Error(`API Error: ${response.status}`);
		}

		const data = await response.json();

		return json({
			message: data.choices[0].message.content
		});
	} catch (error) {
		console.error('Server error:', error);
		return json(
			{
				error: "Erreur lors de la communication avec l'IA",
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
