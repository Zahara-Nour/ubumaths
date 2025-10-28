import { z } from 'zod';

/**
 * Environment variable validation schema
 * Validates all required environment variables on application startup
 *
 * This ensures the application fails fast with clear error messages
 * if critical configuration is missing or invalid.
 */
const envSchema = z.object({
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
	// AI Chatbot Configuration (Groq API)
	// ====================================================================
	GROQ_API_KEY: z.string().min(1, 'Groq API key required').optional(),
	GROQ_MODEL: z.string().default('llama-3.3-70b-versatile'),

	// Legacy OpenAI support (optional, if migrating)
	OPENAI_API_KEY: z.string().min(1, 'OpenAI API key required').optional(),
	OPENAI_MODEL: z.string().default('gpt-4-turbo-preview'),

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

	// Upstash Redis (optional, for distributed rate limiting)
	UPSTASH_REDIS_URL: z.string().url('Invalid Upstash Redis URL').optional(),
	UPSTASH_REDIS_TOKEN: z.string().optional(),

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

	// MathGraph32 (for geometry features)
	MATHGRAPH32_API_URL: z.string().url('Invalid MathGraph32 API URL').optional(),

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
		console.error('❌ Environment variable validation failed:');
		console.error('');

		// Group errors by category
		const errors = validation.error.issues;
		errors.forEach((issue) => {
			const path = issue.path.join('.');
			console.error(`  - ${path}: ${issue.message}`);
		});

		console.error('');
		console.error('Please check your .env file and ensure all required variables are set.');
		console.error('See .env.example for a complete list of available variables.');
		console.error('');

		// In production, fail hard - don't start with invalid config
		if (process.env.NODE_ENV === 'production') {
			console.error('🚨 Cannot start in production with invalid environment variables');
			process.exit(1);
		}

		// In development/test, warn but continue (for easier development)
		console.warn('⚠️  Continuing in development mode with invalid env vars');
		console.warn('   Some features may not work correctly.');
		console.warn('');

		// Throw error to notify but don't exit
		throw new Error('Invalid environment variables');
	}

	env = validation.data;

	// Log successful validation
	console.log('✅ Environment variables validated successfully');
	console.log('');
	console.log('   Configuration:');
	console.log(`   - Environment: ${env.NODE_ENV}`);
	console.log(`   - Supabase URL: ${env.PUBLIC_SUPABASE_URL}`);
	console.log(`   - AI Chatbot: ${env.ENABLE_AI_CHATBOT ? 'enabled' : 'disabled'}`);
	if (env.ENABLE_AI_CHATBOT) {
		console.log(`     - API Key: ${env.GROQ_API_KEY ? 'configured' : 'MISSING'}`);
		console.log(`     - Model: ${env.GROQ_MODEL}`);
	}
	console.log(`   - WebSocket: ${env.ENABLE_WEBSOCKET ? 'enabled' : 'disabled'}`);
	console.log(`   - Error Logging: ${env.ENABLE_ERROR_LOGGING ? 'enabled' : 'disabled'}`);
	console.log(
		`   - Rate Limiting: ${env.RATE_LIMIT_MAX_REQUESTS} req/${env.RATE_LIMIT_WINDOW_MS}ms`
	);
	console.log('');

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
