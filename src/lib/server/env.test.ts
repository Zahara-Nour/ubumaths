import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';

describe('Environment validation', () => {
	// Store original env to restore after tests
	const originalEnv = { ...process.env };

	beforeEach(() => {
		// Reset process.env before each test
		process.env = { ...originalEnv };
	});

	afterEach(() => {
		// Restore original env after each test
		process.env = originalEnv;
	});

	describe('Schema validation', () => {
		it('should reject missing required variables', () => {
			const schema = z.object({
				REQUIRED_VAR: z.string().min(1, 'Required variable missing')
			});

			const result = schema.safeParse({});

			expect(result.success).toBe(false);
			if (!result.success) {
				// Zod's default error message for missing required string
				expect(result.error.issues[0].message).toBeDefined();
				expect(result.error.issues.length).toBeGreaterThan(0);
			}
		});

		it('should accept valid environment variables', () => {
			const schema = z.object({
				PUBLIC_SUPABASE_URL: z.string().url(),
				NODE_ENV: z.enum(['development', 'production', 'test'])
			});

			const result = schema.safeParse({
				PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
				NODE_ENV: 'development'
			});

			expect(result.success).toBe(true);
		});

		it('should reject invalid URLs', () => {
			const schema = z.object({
				API_URL: z.string().url()
			});

			const result = schema.safeParse({
				API_URL: 'not-a-url'
			});

			expect(result.success).toBe(false);
		});

		it('should validate minimum string length', () => {
			const schema = z.object({
				SECRET: z.string().min(32, 'Secret must be at least 32 characters')
			});

			const tooShort = schema.safeParse({ SECRET: 'short' });
			expect(tooShort.success).toBe(false);

			const validLength = schema.safeParse({
				SECRET: 'a'.repeat(32)
			});
			expect(validLength.success).toBe(true);
		});

		it('should validate enum values', () => {
			const schema = z.object({
				LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error'])
			});

			const validResult = schema.safeParse({ LOG_LEVEL: 'info' });
			expect(validResult.success).toBe(true);

			const invalidResult = schema.safeParse({ LOG_LEVEL: 'invalid' });
			expect(invalidResult.success).toBe(false);
		});

		it('should transform string to boolean', () => {
			const schema = z.object({
				FEATURE_ENABLED: z
					.string()
					.transform((val) => val === 'true')
					.pipe(z.boolean())
			});

			const trueResult = schema.safeParse({ FEATURE_ENABLED: 'true' });
			expect(trueResult.success).toBe(true);
			if (trueResult.success) {
				expect(trueResult.data.FEATURE_ENABLED).toBe(true);
			}

			const falseResult = schema.safeParse({ FEATURE_ENABLED: 'false' });
			expect(falseResult.success).toBe(true);
			if (falseResult.success) {
				expect(falseResult.data.FEATURE_ENABLED).toBe(false);
			}
		});

		it('should transform string to number', () => {
			const schema = z.object({
				PORT: z.string().transform(Number).pipe(z.number().positive())
			});

			const result = schema.safeParse({ PORT: '3000' });
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.PORT).toBe(3000);
				expect(typeof result.data.PORT).toBe('number');
			}

			const invalidResult = schema.safeParse({ PORT: '-1' });
			expect(invalidResult.success).toBe(false);
		});

		it('should handle optional variables', () => {
			const schema = z.object({
				REQUIRED: z.string(),
				OPTIONAL: z.string().optional()
			});

			const withoutOptional = schema.safeParse({ REQUIRED: 'value' });
			expect(withoutOptional.success).toBe(true);

			const withOptional = schema.safeParse({
				REQUIRED: 'value',
				OPTIONAL: 'optional-value'
			});
			expect(withOptional.success).toBe(true);
		});

		it('should provide default values', () => {
			const schema = z.object({
				VALUE_WITH_DEFAULT: z.string().default('default-value')
			});

			const result = schema.safeParse({});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.VALUE_WITH_DEFAULT).toBe('default-value');
			}
		});
	});

	describe('Supabase configuration validation', () => {
		it('should require valid Supabase URL', () => {
			const schema = z.object({
				PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL')
			});

			const valid = schema.safeParse({
				PUBLIC_SUPABASE_URL: 'https://myproject.supabase.co'
			});
			expect(valid.success).toBe(true);

			const invalid = schema.safeParse({
				PUBLIC_SUPABASE_URL: 'not-a-url'
			});
			expect(invalid.success).toBe(false);
		});

		it('should require Supabase keys', () => {
			const schema = z.object({
				PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
				SUPABASE_SERVICE_ROLE_KEY: z.string().min(1)
			});

			const valid = schema.safeParse({
				PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
				SUPABASE_SERVICE_ROLE_KEY: 'service-role-key'
			});
			expect(valid.success).toBe(true);

			const missingKeys = schema.safeParse({});
			expect(missingKeys.success).toBe(false);
		});
	});

	describe('Security configuration validation', () => {
		it('should enforce minimum secret length', () => {
			const schema = z.object({
				SESSION_SECRET: z.string().min(32, 'Session secret must be at least 32 characters')
			});

			const tooShort = schema.safeParse({ SESSION_SECRET: 'short-secret' });
			expect(tooShort.success).toBe(false);

			const validLength = schema.safeParse({
				SESSION_SECRET: 'a'.repeat(32)
			});
			expect(validLength.success).toBe(true);
		});

		it('should validate CSRF secret length', () => {
			const schema = z.object({
				CSRF_SECRET: z.string().min(32, 'CSRF secret must be at least 32 characters').optional()
			});

			const valid = schema.safeParse({
				CSRF_SECRET: 'b'.repeat(32)
			});
			expect(valid.success).toBe(true);

			const tooShort = schema.safeParse({ CSRF_SECRET: 'short' });
			expect(tooShort.success).toBe(false);
		});
	});

	describe('Feature flag validation', () => {
		it('should parse feature flags as booleans', () => {
			// Corrected schema: optional().default().transform() - transforms apply to defaults
			const schema = z.object({
				ENABLE_AI_CHATBOT: z
					.string()
					.optional()
					.default('true')
					.transform((val) => val === 'true')
			});

			const enabled = schema.safeParse({ ENABLE_AI_CHATBOT: 'true' });
			expect(enabled.success).toBe(true);
			if (enabled.success) {
				expect(enabled.data.ENABLE_AI_CHATBOT).toBe(true);
			}

			const disabled = schema.safeParse({ ENABLE_AI_CHATBOT: 'false' });
			expect(disabled.success).toBe(true);
			if (disabled.success) {
				expect(disabled.data.ENABLE_AI_CHATBOT).toBe(false);
			}

			// When no value provided, default 'true' is transformed to boolean true
			const defaultValue = schema.safeParse({});
			expect(defaultValue.success).toBe(true);
			if (defaultValue.success) {
				expect(defaultValue.data.ENABLE_AI_CHATBOT).toBe(true);
				expect(typeof defaultValue.data.ENABLE_AI_CHATBOT).toBe('boolean');
			}
		});
	});

	describe('Rate limiting configuration', () => {
		it('should parse rate limit values as positive numbers', () => {
			const schema = z.object({
				RATE_LIMIT_WINDOW_MS: z
					.string()
					.transform(Number)
					.pipe(z.number().positive())
					.default(900000),
				RATE_LIMIT_MAX_REQUESTS: z
					.string()
					.transform(Number)
					.pipe(z.number().positive())
					.default(5)
			});

			const result = schema.safeParse({
				RATE_LIMIT_WINDOW_MS: '60000',
				RATE_LIMIT_MAX_REQUESTS: '10'
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.RATE_LIMIT_WINDOW_MS).toBe(60000);
				expect(result.data.RATE_LIMIT_MAX_REQUESTS).toBe(10);
			}
		});

		it('should reject negative rate limit values', () => {
			const schema = z.object({
				RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).pipe(z.number().positive())
			});

			const result = schema.safeParse({ RATE_LIMIT_MAX_REQUESTS: '-5' });
			expect(result.success).toBe(false);
		});
	});

	describe('Email validation', () => {
		it('should validate email addresses', () => {
			const schema = z.object({
				EMAIL_FROM: z.string().email('Invalid from email').optional()
			});

			const valid = schema.safeParse({ EMAIL_FROM: 'noreply@ubumaths.com' });
			expect(valid.success).toBe(true);

			const invalid = schema.safeParse({ EMAIL_FROM: 'not-an-email' });
			expect(invalid.success).toBe(false);
		});
	});

	describe('Complete environment validation', () => {
		it('should validate a complete valid environment', () => {
			const schema = z.object({
				NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
				PUBLIC_SUPABASE_URL: z.string().url(),
				PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
				SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
				ENABLE_AI_CHATBOT: z
					.string()
					.transform((val) => val === 'true')
					.pipe(z.boolean())
					.default(true)
			});

			const result = schema.safeParse({
				NODE_ENV: 'development',
				PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
				PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
				SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
				ENABLE_AI_CHATBOT: 'true'
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.NODE_ENV).toBe('development');
				expect(result.data.PUBLIC_SUPABASE_URL).toBe('https://example.supabase.co');
				expect(result.data.ENABLE_AI_CHATBOT).toBe(true);
			}
		});

		it('should fail with multiple validation errors', () => {
			const schema = z.object({
				PUBLIC_SUPABASE_URL: z.string().url(),
				PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
				SESSION_SECRET: z.string().min(32)
			});

			const result = schema.safeParse({
				PUBLIC_SUPABASE_URL: 'invalid-url',
				// Missing PUBLIC_SUPABASE_ANON_KEY
				SESSION_SECRET: 'short'
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				// Should have multiple validation errors
				expect(result.error.issues.length).toBeGreaterThan(1);
			}
		});
	});
});
