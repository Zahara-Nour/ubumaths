import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

interface TextContent {
	type: 'text';
	text: string;
}

interface ImageUrlContent {
	type: 'image_url';
	image_url: {
		url: string;
	};
}

type MessageContent = string | Array<TextContent | ImageUrlContent>;

interface ChatMessage {
	role: 'system' | 'user' | 'assistant';
	content: MessageContent;
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

		// Detect if any message contains images (array content with image_url type)
		const hasImages = apiMessages.some(
			(msg) =>
				Array.isArray(msg.content) &&
				msg.content.some((item) => typeof item === 'object' && item.type === 'image_url')
		);

		// Use vision model if images are present, otherwise use standard text model
		const model = hasImages ? 'meta-llama/llama-4-scout-17b-16e-instruct' : 'llama-3.3-70b-versatile';

		// Call Groq API
		const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${env.GROQ_API_KEY}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				model,
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
