import { z } from 'zod';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('server/env');

/**
 * Environment variable validation schema
 * Validates all required environment variables on application startup
 *
 * This ensures the application fails fast with clear error messages
 * if critical configuration is missing or invalid.
 */
const envSchema = z
	.object({
		// ====================================================================
		// Node Environment
		// ====================================================================
		NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

		// ====================================================================
		// Supabase Configuration
		// ====================================================================
		PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
		PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key required'),
		PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
			.string()
			.min(1, 'Supabase publishable key required')
			.optional(),
		SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Supabase service role key required'),
		SUPABASE_ACCESS_TOKEN: z.string().min(1, 'Supabase access token required').optional(),

		// ====================================================================
		// Database Configuration (for direct connections)
		// ====================================================================
		DATABASE_URL: z.string().url('Invalid database URL').optional(),

		// ====================================================================
		// Google OAuth Configuration
		// ====================================================================
		PUBLIC_GOOGLE_CLIENT_ID: z.string().min(1, 'Google client ID required').optional(),
		SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET: z.string().optional(),

		// ====================================================================
		// Google Classroom Integration
		// ====================================================================
		GOOGLE_CLASSROOM_CLIENT_ID: z.string().min(1, 'Google Classroom client ID required').optional(),
		GOOGLE_CLASSROOM_CLIENT_SECRET: z
			.string()
			.min(1, 'Google Classroom client secret required')
			.optional(),
		GOOGLE_CLASSROOM_REDIRECT_URI: z
			.string()
			.url('Invalid Google Classroom redirect URI')
			.optional(),
		GOOGLE_TOKEN_ENCRYPTION_KEY: z
			.string()
			.min(32, 'Token encryption key must be at least 32 characters')
			.optional(),

		// ====================================================================
		// AI Chatbot Configuration (Groq API)
		// ====================================================================
		GROQ_API_KEY: z.string().min(1, 'Groq API key required').optional(),
		GROQ_API_URL: z
			.string()
			.url('Invalid Groq API URL')
			.default('https://api.groq.com/openai/v1/chat/completions'),
		GROQ_MODEL: z.string().default('llama-3.3-70b-versatile'),

		// Legacy OpenAI support (optional, if migrating)
		OPENAI_API_KEY: z.string().min(1, 'OpenAI API key required').optional(),
		OPENAI_MODEL: z.string().default('gpt-4-turbo-preview'),

		// ====================================================================
		// RAG Embeddings Configuration (HuggingFace API)
		// ====================================================================
		HF_API_KEY: z.string().min(1, 'HuggingFace API key required').optional(),
		ENABLE_RAG: z
			.string()
			.optional()
			.default('true')
			.transform((val) => val === 'true'),

		// ====================================================================
		// App URLs
		// ====================================================================
		PUBLIC_APP_URL: z.string().url('Invalid app URL').optional(),

		// ====================================================================
		// Feature Flags
		// ====================================================================
		ENABLE_AI_CHATBOT: z
			.string()
			.optional()
			.default('true')
			.transform((val) => val === 'true'),
		ENABLE_WEBSOCKET: z
			.string()
			.optional()
			.default('true')
			.transform((val) => val === 'true'),
		ENABLE_ERROR_LOGGING: z
			.string()
			.optional()
			.default('true')
			.transform((val) => val === 'true'),

		// ====================================================================
		// Rate Limiting Configuration
		// ====================================================================
		RATE_LIMIT_WINDOW_MS: z
			.string()
			.optional()
			.default('900000')
			.transform(Number)
			.pipe(z.number().positive()), // 15 minutes
		RATE_LIMIT_MAX_REQUESTS: z
			.string()
			.optional()
			.default('5')
			.transform(Number)
			.pipe(z.number().positive()),

		// ====================================================================
		// Security Configuration
		// ====================================================================
		SESSION_SECRET: z.string().min(32, 'Session secret must be at least 32 characters').optional(),
		CSRF_SECRET: z.string().min(32, 'CSRF secret must be at least 32 characters').optional(),

		// Cron job authentication
		CRON_SECRET: z.string().min(16, 'Cron secret must be at least 16 characters').optional(),

		// ====================================================================
		// File Uploads Configuration
		// ====================================================================
		MAX_FILE_SIZE_MB: z
			.string()
			.optional()
			.default('5')
			.transform(Number)
			.pipe(z.number().positive()),
		ALLOWED_FILE_TYPES: z.string().default('image/png,image/jpeg,application/pdf'),

		// ====================================================================
		// Logging Configuration
		// ====================================================================
		LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

		// ====================================================================
		// External Services (Optional)
		// ====================================================================

		// LaTeX/Typst compilation
		LATEX_COMPILER_URL: z.string().url('Invalid LaTeX compiler URL').optional(),
		TYPST_COMPILER_URL: z.string().url('Invalid Typst compiler URL').optional(),

		// Email service (if using)
		EMAIL_FROM: z.string().email('Invalid from email').optional(),
		EMAIL_SERVICE_API_KEY: z.string().optional(),

		// ====================================================================
		// Monitoring & Error Tracking
		// ====================================================================
		SENTRY_DSN: z.string().url('Invalid Sentry DSN').optional(),

		// ====================================================================
		// Vercel Deployment (auto-populated by Vercel)
		// ====================================================================
		VERCEL: z.string().optional(),
		VERCEL_ENV: z.enum(['production', 'preview', 'development']).optional(),
		VERCEL_URL: z.string().optional(),

		// ====================================================================
		// Test Configuration
		// ====================================================================
		VITE_TEST_API_BASE: z.string().url('Invalid test API base URL').optional(),
		TEST_SKIP_INTEGRATION: z
			.string()
			.optional()
			.transform((val) => val === 'true'),
		TEST_CLASS_ID: z.string().optional(),
		TEST_EMPTY_CLASS_ID: z.string().optional(),
		TEST_OTHER_CLASS_ID: z.string().optional()
	})
	.superRefine((data, ctx) => {
		// Validate Google Classroom configuration dependencies
		const hasAnyGoogleVar = !!(
			data.GOOGLE_CLASSROOM_CLIENT_ID ||
			data.GOOGLE_CLASSROOM_CLIENT_SECRET ||
			data.GOOGLE_CLASSROOM_REDIRECT_URI
		);

		if (hasAnyGoogleVar) {
			if (!data.GOOGLE_CLASSROOM_CLIENT_ID) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'GOOGLE_CLASSROOM_CLIENT_ID required when using Google Classroom integration',
					path: ['GOOGLE_CLASSROOM_CLIENT_ID']
				});
			}
			if (!data.GOOGLE_CLASSROOM_CLIENT_SECRET) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message:
						'GOOGLE_CLASSROOM_CLIENT_SECRET required when using Google Classroom integration',
					path: ['GOOGLE_CLASSROOM_CLIENT_SECRET']
				});
			}
			if (!data.GOOGLE_TOKEN_ENCRYPTION_KEY) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message:
						'GOOGLE_TOKEN_ENCRYPTION_KEY required when using Google Classroom integration (generate with: openssl rand -base64 32)',
					path: ['GOOGLE_TOKEN_ENCRYPTION_KEY']
				});
			}
		}
	});

// Infer TypeScript type from schema
export type Env = z.infer<typeof envSchema>;

/**
 * Validated environment variables
 * Cached after first validation
 */
let env: Env | null = null;

/**
 * Initialize and validate environment variables
 * Call this once on application startup (in hooks.server.ts)
 *
 * @throws {Error} If validation fails in production mode
 * @returns {Env} Validated environment variables
 */
export function initEnv(): Env {
	if (env) {
		return env; // Already validated
	}

	const validation = envSchema.safeParse(process.env);

	if (!validation.success) {
		logger.error('❌ Environment variable validation failed:');

		// Group errors by category
		const errors = validation.error.issues;
		errors.forEach((issue) => {
			const path = issue.path.join('.');
			logger.error(`  - ${path}: ${issue.message}`);
		});

		logger.error('Please check your .env file and ensure all required variables are set.');
		logger.error('See .env.example for a complete list of available variables.');

		// In production, fail hard - don't start with invalid config
		if (process.env.NODE_ENV === 'production') {
			logger.error('🚨 Cannot start in production with invalid environment variables');
			process.exit(1);
		}

		// In development/test, warn but continue (for easier development)
		logger.warn('⚠️  Continuing in development mode with invalid env vars');
		logger.warn('   Some features may not work correctly.');

		// Throw error to notify but don't exit
		throw new Error('Invalid environment variables');
	}

	env = validation.data;

	// Log successful validation
	logger.info('✅ Environment variables validated successfully');
	logger.info('   Configuration:');
	logger.info(`   - Environment: ${env.NODE_ENV}`);
	logger.info(`   - Supabase URL: ${env.PUBLIC_SUPABASE_URL}`);
	logger.info(`   - AI Chatbot: ${env.ENABLE_AI_CHATBOT ? 'enabled' : 'disabled'}`);
	if (env.ENABLE_AI_CHATBOT) {
		logger.info(`     - API Key: ${env.GROQ_API_KEY ? 'configured' : 'MISSING'}`);
		logger.info(`     - Model: ${env.GROQ_MODEL}`);
	}
	logger.info(`   - WebSocket: ${env.ENABLE_WEBSOCKET ? 'enabled' : 'disabled'}`);
	logger.info(`   - Error Logging: ${env.ENABLE_ERROR_LOGGING ? 'enabled' : 'disabled'}`);
	logger.info(
		`   - Rate Limiting: ${env.RATE_LIMIT_MAX_REQUESTS} req/${env.RATE_LIMIT_WINDOW_MS}ms`
	);

	return env;
}

/**
 * Get validated environment variables
 *
 * @throws {Error} If environment not yet initialized
 * @returns {Env} Validated environment variables
 *
 * @example
 * ```typescript
 * import { getEnv } from '$lib/server/env';
 *
 * const env = getEnv();
 * console.log(env.GROQ_API_KEY); // Type-safe, guaranteed to exist if required
 * ```
 */
export function getEnv(): Env {
	if (!env) {
		throw new Error(
			'Environment not initialized. Call initEnv() first (should be done in hooks.server.ts)'
		);
	}
	return env;
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
	return getEnv().NODE_ENV === 'production';
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
	return getEnv().NODE_ENV === 'development';
}

/**
 * Check if running in test mode
 */
export function isTest(): boolean {
	return getEnv().NODE_ENV === 'test';
}

/**
 * Get feature flag status
 */
export function isFeatureEnabled(feature: 'ai_chatbot' | 'websocket' | 'error_logging'): boolean {
	const env = getEnv();
	switch (feature) {
		case 'ai_chatbot':
			return env.ENABLE_AI_CHATBOT;
		case 'websocket':
			return env.ENABLE_WEBSOCKET;
		case 'error_logging':
			return env.ENABLE_ERROR_LOGGING;
		default:
			return false;
	}
}
