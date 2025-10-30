import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { checkChatbotRateLimit } from '$lib/server/rateLimiter';
import { getEnv } from '$lib/server/env';
import { chatRequestSchema } from '$lib/server/validation/chat';

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		// Get validated environment variables
		const env = getEnv();

		// ====================================================================
		// SECURITY: Authentication Check
		// ====================================================================
		const { user } = await locals.safeGetSession();
		if (!user) {
			throw error(401, { message: 'Authentication required' });
		}

		// ====================================================================
		// SECURITY: Rate Limiting (5 requests per 15 minutes per user)
		// ====================================================================
		const rateLimitResult = await checkChatbotRateLimit(user.id, locals.supabase);

		if (!rateLimitResult.allowed) {
			throw error(429, {
				message: rateLimitResult.message || 'Trop de requêtes. Veuillez réessayer plus tard.'
			});
		}

		// ====================================================================
		// SECURITY: Input Validation with Zod
		// ====================================================================
		const validation = chatRequestSchema.safeParse(await request.json());

		if (!validation.success) {
			throw error(400, { message: validation.error.issues[0].message });
		}

		const { messages } = validation.data;

		// Check if API key is configured (type-safe optional check)
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
		const model = hasImages
			? 'meta-llama/llama-4-scout-17b-16e-instruct'
			: 'llama-3.3-70b-versatile';

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

		// ====================================================================
		// SECURITY: Usage Logging
		// ====================================================================
		const responseMessage = data.choices[0].message.content;

		// Log usage to database (async, non-blocking)
		Promise.resolve().then(async () => {
			try {
				await locals.supabase.from('ai_chat_usage').insert({
					user_id: user.id,
					model: model,
					message_count: messages.length,
					tokens_used: data.usage?.total_tokens || 0,
					client_ip: null, // No longer tracking IP for chatbot (rate limit by user ID)
					response_length: responseMessage?.length || 0
				});
			} catch (logError) {
				// Non-blocking error - don't fail the request
				console.error('Failed to log AI chat usage:', logError);
			}
		});

		return json({
			message: responseMessage
		});
	} catch (err) {
		// Enhanced error logging
		const errorMessage = err instanceof Error ? err.message : String(err);
		console.error('AI Chat API Error:', {
			error: errorMessage,
			userId: (await locals.safeGetSession())?.user?.id,
			timestamp: new Date().toISOString()
		});

		// Return appropriate error response
		if (err && typeof err === 'object' && 'status' in err) {
			throw err; // Re-throw SvelteKit errors (401, 429, 400)
		}

		throw error(500, {
			message: "Erreur lors de la communication avec l'IA"
		});
	}
};
