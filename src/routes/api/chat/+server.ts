import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { checkChatbotRateLimit } from '$lib/server/rateLimiter';
import { checkTutorRateLimit, incrementTutorUsage } from '$lib/server/tutor/tutor-rate-limiter';
import { getEnv } from '$lib/server/env';
import { chatRequestSchema, tutorRequestSchema } from '$lib/server/validation/chat';
import { requireAuth } from '$lib/server/middleware/auth';
import { buildTutorPrompt, type HelpMethodId, type MathTopic } from '$lib/config/tutor-prompts';
import { selectHelpMethod } from '$lib/config/tutor-help-methods';
import { getAdaptationForGrade } from '$lib/config/tutor-grade-adaptations';
import { analyzeMessage } from '$lib/server/tutor/cheat-detector';
import { analyzeStudentMessages, calculateEffortScore } from '$lib/server/tutor/help-escalation';
import { hybridSearch, formatResultsForPrompt } from '$lib/server/rag';
import type { GradeCode } from '$lib/types/grades';

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		// Get validated environment variables
		const env = getEnv();

		// ====================================================================
		// SECURITY: Authentication Check
		// ====================================================================
		const { user } = await requireAuth(locals);

		// ====================================================================
		// SECURITY: Parse request body to determine mode
		// ====================================================================
		const rawBody = await request.json();
		const isTutorMode = rawBody.tutorMode === true;

		// ====================================================================
		// TUTOR MODE HANDLING
		// ====================================================================
		if (isTutorMode) {
			// Validate with tutor schema
			const validation = tutorRequestSchema.safeParse(rawBody);
			if (!validation.success) {
				throw error(400, { message: validation.error.issues[0].message });
			}

			const { messages, exerciseContext, conversationId, helpLevel } = validation.data;

			// 1. Tutor-specific rate limiting
			const rateLimitResult = await checkTutorRateLimit(user.id, exerciseContext?.exerciseId);
			if (!rateLimitResult.allowed) {
				throw error(429, {
					message: rateLimitResult.message || 'Limite de tuteur dépassée. Réessayez plus tard.'
				});
			}

			// 2. Get last user message for cheat detection
			const lastUserMessage = messages.filter((m) => m.role === 'user').pop();
			const userMessageContent =
				typeof lastUserMessage?.content === 'string'
					? lastUserMessage.content
					: Array.isArray(lastUserMessage?.content)
						? lastUserMessage.content.find((c) => c.type === 'text')?.text || ''
						: '';

			// 3. Analyze for cheat attempts
			const cheatAnalysis = analyzeMessage(userMessageContent);
			if (cheatAnalysis.recommendation === 'refuse') {
				return json({
					message: cheatAnalysis.isCheatAttempt.suggestedResponse,
					tutorMetadata: {
						cheatDetected: true,
						helpMethodUsed: null,
						helpLevel: helpLevel,
						remaining: rateLimitResult.remaining
					}
				});
			}

			// 4. Analyze student effort
			const userMessages = messages
				.filter((m) => m.role === 'user')
				.map((m, i, arr) => ({
					content:
						typeof m.content === 'string'
							? m.content
							: Array.isArray(m.content)
								? m.content.find((c) => c.type === 'text')?.text || ''
								: '',
					timestamp: Date.now() - (arr.length - i) * 30000 // Approximate timestamps
				}));
			const effortSignals = analyzeStudentMessages(userMessages);
			const effortScore = calculateEffortScore(effortSignals);

			// 5. Determine help context
			const gradeCode = (exerciseContext?.studentGrade || '6') as GradeCode;
			const gradeAdaptation = getAdaptationForGrade(gradeCode);

			// Map topic string to MathTopic or undefined
			const topicValue = exerciseContext?.topic as MathTopic | undefined;

			const helpContext = {
				isFirstMessage: messages.filter((m) => m.role === 'assistant').length === 0,
				lastAnswerWasWrong: exerciseContext?.attempts?.slice(-1)[0]?.isCorrect === false,
				frustrationLevel: effortScore < 30 ? 70 : 30, // Simple heuristic
				failureCount: exerciseContext?.attempts?.filter((a) => !a.isCorrect).length || 0,
				topic: topicValue,
				schoolYear: gradeAdaptation.maxSentenceComplexity + 5, // Approximate school year from grade
				currentHelpLevel: helpLevel,
				previousMethodsUsed: [] as string[] // Could be tracked in conversation
			};

			// 6. Select help method
			const selectedMethod = selectHelpMethod(helpContext);

			// 7. Build tutor system prompt
			const tutorSystemPrompt = buildTutorPrompt({
				helpMethod: selectedMethod as HelpMethodId,
				gradeCode,
				exerciseContext: exerciseContext
					? {
							statement: exerciseContext.statement,
							topic: topicValue,
							gradeCode,
							chapter: exerciseContext.domain,
							skills: []
						}
					: undefined,
				helpLevel,
				includeAntiCheat: true
			});

			// 7.5. RAG Search for relevant context (if enabled)
			let ragContext = '';
			if (env.ENABLE_RAG && userMessageContent.length > 10) {
				try {
					const ragResults = await hybridSearch(locals.supabase, userMessageContent, {
						limit: 3,
						gradeLevel: gradeCode,
						topics: topicValue ? [topicValue] : undefined
					});

					if (ragResults.length > 0) {
						ragContext = formatResultsForPrompt(ragResults, {
							maxLength: 1500,
							includeSource: true
						});
					}
				} catch (ragError) {
					// RAG failure is non-critical - continue without context
					console.warn('RAG search failed:', ragError);
				}
			}

			// Combine system prompt with RAG context
			const fullSystemPrompt = ragContext
				? `${tutorSystemPrompt}\n\n${ragContext}`
				: tutorSystemPrompt;

			// 8. Call Groq API with tutor prompt
			const apiMessages = [
				{ role: 'system', content: fullSystemPrompt },
				...messages.slice(-10).map(({ role, content }) => ({ role, content }))
			];

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

			// Use text-only model for tutor (no images in tutor mode)
			const model = 'llama-3.3-70b-versatile';

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
					temperature: 0.8,
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
			const responseMessage = data.choices[0].message.content;

			// 9. Increment usage AFTER successful response
			await incrementTutorUsage(user.id, exerciseContext?.exerciseId);

			// 10. Log to ai_chat_usage table (async, non-blocking)
			Promise.resolve().then(async () => {
				try {
					await locals.supabase.from('ai_chat_usage').insert({
						user_id: user.id,
						model: model,
						message_count: messages.length,
						tokens_used: data.usage?.total_tokens || 0,
						client_ip: null,
						response_length: responseMessage?.length || 0
					});
				} catch (logError) {
					console.error('Failed to log AI chat usage:', logError);
				}
			});

			// 11. Persist messages to tutor_messages if conversationId is provided
			if (conversationId) {
				try {
					// Insert user message and assistant response
					const messagesToInsert = [
						{
							conversation_id: conversationId,
							role: 'user',
							content: userMessageContent,
							help_level: helpLevel,
							cheat_detected: cheatAnalysis.isCheatAttempt?.detected ?? false
						},
						{
							conversation_id: conversationId,
							role: 'assistant',
							content: responseMessage,
							help_level: helpLevel,
							help_method_used: selectedMethod
						}
					];

					await locals.supabase.from('tutor_messages').insert(messagesToInsert);

					// Update conversation stats
					await locals.supabase
						.from('tutor_conversations')
						.update({
							message_count: messages.length + 1,
							max_help_level_reached: helpLevel
						})
						.eq('id', conversationId);
				} catch (persistError) {
					// Non-blocking - log but don't fail the request
					console.error('Failed to persist tutor messages:', persistError);
				}
			}

			return json({
				message: responseMessage,
				tutorMetadata: {
					cheatDetected: false,
					helpMethodUsed: selectedMethod,
					helpLevel: helpLevel,
					effortScore,
					remaining: rateLimitResult.remaining
				}
			});
		}

		// ====================================================================
		// REGULAR CHAT MODE (Original Logic)
		// ====================================================================
		// SECURITY: Rate Limiting (5 requests per 15 minutes per user)
		const rateLimitResult = await checkChatbotRateLimit(user.id);

		if (!rateLimitResult.allowed) {
			throw error(429, {
				message: rateLimitResult.message || 'Trop de requêtes. Veuillez réessayer plus tard.'
			});
		}

		// SECURITY: Input Validation with Zod
		const validation = chatRequestSchema.safeParse(rawBody);

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
		// Note: user might not be available if error occurred during auth
		console.error('AI Chat API Error:', {
			error: errorMessage,
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
