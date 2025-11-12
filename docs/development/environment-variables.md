# Environment Variables

All environment variables are validated on application startup using Zod schemas. This ensures the application fails fast with clear error messages if critical configuration is missing or invalid.

## Overview

Environment variables are validated in `src/lib/server/env.ts` using a Zod schema. The validation runs automatically when the application starts (in `src/hooks.server.ts`).

**Benefits:**

- Type-safe access to environment variables
- Fails fast if configuration is invalid
- Clear error messages for missing/invalid variables
- No runtime `undefined` errors for required variables
- Automatic type inference from schema

## Required Variables

These variables **must** be set for the application to function:

### Supabase

| Variable                    | Description                         | Example                                   |
| --------------------------- | ----------------------------------- | ----------------------------------------- |
| `PUBLIC_SUPABASE_URL`       | Supabase project URL                | `https://your-project.supabase.co`        |
| `PUBLIC_SUPABASE_ANON_KEY`  | Public anonymous key                | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-side only) | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

**Security Warning:** Never expose `SUPABASE_SERVICE_ROLE_KEY` to client-side code. It has full database access.

## Optional Variables

### Authentication

| Variable                                      | Description                | Default | Required For   |
| --------------------------------------------- | -------------------------- | ------- | -------------- |
| `PUBLIC_GOOGLE_CLIENT_ID`                     | Google OAuth client ID     | -       | Google sign-in |
| `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET` | Google OAuth client secret | -       | Google sign-in |

### AI Chatbot

| Variable         | Description                     | Default                   | Required For   |
| ---------------- | ------------------------------- | ------------------------- | -------------- |
| `GROQ_API_KEY`   | Groq API key (Père Ubu chatbot) | -                         | AI chatbot     |
| `GROQ_MODEL`     | Groq model to use               | `llama-3.3-70b-versatile` | -              |
| `OPENAI_API_KEY` | OpenAI API key (legacy support) | -                         | OpenAI chatbot |
| `OPENAI_MODEL`   | OpenAI model to use             | `gpt-4-turbo-preview`     | -              |

### Feature Flags

| Variable               | Description                  | Default | Type    |
| ---------------------- | ---------------------------- | ------- | ------- |
| `ENABLE_AI_CHATBOT`    | Enable/disable AI chatbot    | `true`  | boolean |
| `ENABLE_WEBSOCKET`     | Enable/disable WebSocket     | `true`  | boolean |
| `ENABLE_ERROR_LOGGING` | Enable/disable error logging | `true`  | boolean |

### Rate Limiting

| Variable                  | Description                      | Default  | Notes      |
| ------------------------- | -------------------------------- | -------- | ---------- |
| `RATE_LIMIT_WINDOW_MS`    | Rate limit window (milliseconds) | `900000` | 15 minutes |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window          | `5`      | -          |

**Note**: Rate limiting uses database-backed storage (Supabase `rate_limits` table) as of 2025-10-30. No external Redis/Upstash configuration required.

### Security

| Variable         | Description                        | Min Length | Notes                        |
| ---------------- | ---------------------------------- | ---------- | ---------------------------- |
| `SESSION_SECRET` | Secret for session encryption      | 32 chars   | Generate with `openssl rand` |
| `CSRF_SECRET`    | Secret for CSRF token encryption   | 32 chars   | Generate with `openssl rand` |
| `CRON_SECRET`    | Secret for cron job authentication | 16 chars   | Protects cron endpoints      |

**Generate secrets:**

```bash
# Generate a 32-character secret
openssl rand -base64 32
```

### External Services

| Variable                | Description               | Notes                   |
| ----------------------- | ------------------------- | ----------------------- |
| `LATEX_COMPILER_URL`    | LaTeX compilation service | For PDF generation      |
| `TYPST_COMPILER_URL`    | Typst compilation service | For modern PDF gen      |
| `EMAIL_FROM`            | Email sender address      | For email notifications |
| `EMAIL_SERVICE_API_KEY` | Email service API key     | SendGrid, etc.          |

### Monitoring

| Variable     | Description               | Notes                            |
| ------------ | ------------------------- | -------------------------------- |
| `SENTRY_DSN` | Sentry error tracking DSN | For production errors            |
| `LOG_LEVEL`  | Logging level             | `debug`, `info`, `warn`, `error` |

### Vercel Deployment

These are automatically set by Vercel - no need to configure manually:

| Variable     | Description            | Values                                 |
| ------------ | ---------------------- | -------------------------------------- |
| `VERCEL`     | Running on Vercel      | `1` (set by Vercel)                    |
| `VERCEL_ENV` | Deployment environment | `production`, `preview`, `development` |
| `VERCEL_URL` | Deployment URL         | Auto-generated by Vercel               |

## Usage

### Type-Safe Access

Always use `getEnv()` for type-safe environment variable access:

```typescript
import { getEnv } from '$lib/server/env';

// ✅ Type-safe, guaranteed to exist if required
const env = getEnv();
console.log(env.GROQ_API_KEY); // Type: string | undefined (correctly typed)
console.log(env.PUBLIC_SUPABASE_URL); // Type: string (guaranteed to exist)

// ❌ Don't use process.env directly (not type-safe)
const apiKey = process.env.GROQ_API_KEY; // Type: string | undefined (no validation)
```

### Helper Functions

```typescript
import { isProduction, isDevelopment, isTest, isFeatureEnabled } from '$lib/server/env';

// Environment checks
if (isProduction()) {
	console.log('Running in production');
}

// Feature flags
if (isFeatureEnabled('ai_chatbot')) {
	// Initialize chatbot
}
```

### Example: API Endpoint

```typescript
// src/routes/api/example/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getEnv } from '$lib/server/env';

export const POST: RequestHandler = async ({ request }) => {
	const env = getEnv();

	// Type-safe access to validated env vars
	if (!env.GROQ_API_KEY) {
		throw error(503, { message: 'Service unavailable' });
	}

	const response = await fetch('https://api.groq.com/...', {
		headers: {
			Authorization: `Bearer ${env.GROQ_API_KEY}` // Type: string
		}
	});

	return json({ success: true });
};
```

## Validation

Environment variables are validated using Zod on application startup. The validation schema is in `src/lib/server/env.ts`.

### Validation Rules

- **URLs**: Must be valid URLs (http/https)
- **Secrets**: Minimum length requirements (16-32 chars)
- **Enums**: Must match allowed values
- **Numbers**: Parsed from strings, must be positive
- **Booleans**: Parsed from strings (`'true'` → `true`)

### Error Handling

**In Production:**

- Application exits immediately if validation fails
- Clear error messages logged to console
- Prevents starting with invalid configuration

**In Development:**

- Warnings logged to console
- Application continues (for easier development)
- Some features may not work correctly

### Example Validation Error

```
❌ Environment variable validation failed:

  - PUBLIC_SUPABASE_URL: Invalid Supabase URL
  - SUPABASE_SERVICE_ROLE_KEY: Supabase service role key required
  - SESSION_SECRET: Session secret must be at least 32 characters

Please check your .env file and ensure all required variables are set.
See .env.example for a complete list of available variables.
```

## Setup

### 1. Create .env File

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

### 2. Configure Required Variables

At minimum, set these variables:

```bash
# Supabase (required)
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### 3. Start Development Server

The validation runs automatically on startup:

```bash
pnpm dev -- --port 5175
```

You'll see validation output:

```
✅ Environment variables validated successfully

   Configuration:
   - Environment: development
   - Supabase URL: https://your-project.supabase.co
   - AI Chatbot: enabled
     - API Key: configured
     - Model: llama-3.3-70b-versatile
   - WebSocket: enabled
   - Error Logging: enabled
   - Rate Limiting: 5 req/900000ms
```

## Vercel Deployment

### Required Environment Variables

Configure these in Vercel dashboard (Settings → Environment Variables):

1. `PUBLIC_SUPABASE_URL` - Your Supabase project URL
2. `PUBLIC_SUPABASE_ANON_KEY` - Public anonymous key
3. `SUPABASE_SERVICE_ROLE_KEY` - Service role key
4. `GROQ_API_KEY` - Groq API key (if using AI chatbot)
5. `SESSION_SECRET` - Session encryption secret (32+ chars)
6. `CSRF_SECRET` - CSRF token secret (32+ chars)

### Production Validation

All variables are validated on build/startup. Deployment will fail with clear error messages if configuration is invalid.

## Troubleshooting

### "Environment not initialized" Error

**Cause:** Trying to use `getEnv()` before `initEnv()` was called.

**Solution:** `initEnv()` is called automatically in `hooks.server.ts`. This error usually means:

- Server-side code is running before hooks are initialized (rare)
- Running code outside normal SvelteKit request lifecycle

**Fix:** Ensure you're only calling `getEnv()` in:

- Server load functions (`+page.server.ts`)
- API endpoints (`+server.ts`)
- Server-side hooks (`hooks.server.ts`)

### Validation Fails in Development

**Cause:** Missing or invalid environment variables in `.env`.

**Solution:**

1. Check `.env.example` for required variables
2. Ensure URLs are valid (must start with `http://` or `https://`)
3. Ensure secrets meet minimum length requirements
4. Check for typos in variable names

### Feature Not Working

**Cause:** Feature flag disabled or API key missing.

**Solution:** Check environment variables for the feature:

- **AI Chatbot:** `ENABLE_AI_CHATBOT=true` and `GROQ_API_KEY` set
- **WebSocket:** `ENABLE_WEBSOCKET=true`
- **Error Logging:** `ENABLE_ERROR_LOGGING=true`

## Security Best Practices

1. **Never commit .env** - Already in `.gitignore`
2. **Use strong secrets** - Generate with `openssl rand -base64 32`
3. **Rotate secrets regularly** - Especially after team member changes
4. **Limit access** - Only share secrets with authorized team members
5. **Use Vercel environment variables** - Don't store production secrets in code
6. **Different secrets per environment** - Dev, preview, and production should have different secrets

## Migration Guide

### From process.env to getEnv()

**Before:**

```typescript
const apiKey = process.env.GROQ_API_KEY; // Type: string | undefined
if (!apiKey) {
	throw new Error('Missing API key');
}
// Use apiKey (type narrowed to string)
```

**After:**

```typescript
import { getEnv } from '$lib/server/env';

const env = getEnv();
const apiKey = env.GROQ_API_KEY; // Type: string | undefined (validated)
// No manual check needed if it's required in schema
```

### From $env/dynamic/private to getEnv()

**Before:**

```typescript
import { env } from '$env/dynamic/private';

if (!env.GROQ_API_KEY) {
	throw new Error('Missing API key');
}
```

**After:**

```typescript
import { getEnv } from '$lib/server/env';

const env = getEnv();
if (!env.GROQ_API_KEY) {
	throw new Error('Missing API key');
}
```

## Reference

- **Schema:** `src/lib/server/env.ts`
- **Initialization:** `src/hooks.server.ts`
- **Example:** `.env.example`
- **Total Variables:** 40+ (20+ required/optional, 20+ test/deployment)

## CRON_SECRET (Required for Production)

**Purpose**: Protects CRON job endpoints from unauthorized execution.

**Format**: Minimum 16 characters (recommendation: 32+ characters, hex string)

**Affected Endpoints**:

- `/api/cleanup/all` - Daily at 2 AM UTC (unified cache + notifications cleanup)

### Generation

Generate a secure secret using one of these methods:

```bash
# Option 1: OpenSSL (recommended)
openssl rand -hex 16  # Generates 32 characters

# Option 2: Node.js crypto
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"

# Option 3: Using built-in generator
node -e "const { generateCronSecret } = require('./src/lib/server/auth/cron.js'); console.log(generateCronSecret())"
```

### Local Development Setup

Add to your `.env` file:

```env
CRON_SECRET=your-generated-32-character-secret-here
```

**Important**: Use different secrets for development vs. production.

### Vercel Production Setup

1. Generate a production secret (see methods above)
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Select your project → Settings → Environment Variables
4. Add new variable:
   - **Name**: `CRON_SECRET`
   - **Value**: Your generated secret
   - **Environments**: Select all (Production, Preview, Development)
5. Click "Save"
6. Redeploy your application for changes to take effect

### How It Works

CRON jobs configured in `vercel.json` are automatically authenticated:

```json
{
	"crons": [
		{
			"path": "/api/cleanup/all",
			"schedule": "0 2 * * *"
		}
	]
}
```

Vercel automatically adds the `x-vercel-cron: 1` header when executing scheduled jobs. For manual testing, use `Authorization: Bearer ${CRON_SECRET}` instead.

### Security Features

- ✅ **Constant-time comparison**: Prevents timing attacks
- ✅ **Fail-secure**: Rejects all requests if `CRON_SECRET` not configured
- ✅ **Comprehensive logging**: All authentication attempts logged for monitoring
- ✅ **Minimum entropy**: Enforced by Zod validation (16+ characters)

### Testing Locally

Test your CRON endpoints locally with curl:

```bash
# Get secret from .env
export CRON_SECRET=$(grep CRON_SECRET .env | cut -d '=' -f2)

# Test unified cleanup
curl -X POST http://localhost:5175/api/cleanup/all \
  -H "Authorization: Bearer $CRON_SECRET" -v

# Expected: 200 OK with cleanup results for both cache and notifications
```

### Troubleshooting

#### Error: "CRON endpoints disabled: CRON_SECRET not configured"

**Status Code**: 503 (Service Unavailable)

**Cause**: `CRON_SECRET` environment variable is not set.

**Solution**:

1. Add `CRON_SECRET` to your `.env` file (local) or Vercel environment variables (production)
2. Restart your development server or redeploy to Vercel
3. Verify the variable is loaded: Check startup logs for "Environment variables validated successfully"

#### Error: "Unauthorized: Missing Authorization header"

**Status Code**: 401 (Unauthorized)

**Cause**: Request doesn't include the Authorization header.

**Solution**:

- For manual testing: Add `-H "Authorization: Bearer $CRON_SECRET"` to your curl command
- For Vercel CRON: Verify `vercel.json` includes the `headers` configuration (see example above)

#### Error: "Unauthorized: Invalid token"

**Status Code**: 401 (Unauthorized)

**Cause**: Token in Authorization header doesn't match `CRON_SECRET`.

**Solutions**:

1. **For Vercel CRON jobs**: This should not happen - Vercel uses `x-vercel-cron: 1` header authentication
2. **For manual testing**: Ensure you're using the correct secret from `.env`
3. **Check for typos**: Secret is case-sensitive and must match exactly
4. **Verify environment**: Ensure you're using the correct environment's secret (dev vs. production)

#### Vercel CRON Jobs Not Executing

**Symptoms**: No logs, no cleanup happening

**Possible causes**:

1. **Invalid schedule**: Check cron expression syntax in `vercel.json`
2. **Authorization failure**: Check Vercel function logs for 401 errors
3. **Secret not configured**: Verify `CRON_SECRET` is set in Vercel dashboard

**Debug steps**:

1. Go to Vercel Dashboard → Deployments → Select latest deployment
2. Click "Functions" tab → Find cleanup function → View logs
3. Look for "[CRON AUTH]" log entries
4. If you see "Invalid token", verify secret matches between Vercel env vars and `vercel.json`

### Security Best Practices

1. **Use strong secrets**: Always use 32+ character hex strings
2. **Rotate regularly**: Change `CRON_SECRET` every 90 days (recommended)
3. **Never commit secrets**: Ensure `.env` is in `.gitignore`
4. **Use different secrets per environment**: Dev, preview, and production should have unique secrets
5. **Monitor authentication logs**: Review logs weekly for suspicious 401 errors

### Secret Rotation Procedure

When rotating the CRON secret:

1. Generate new secret (see Generation section above)
2. Update in Vercel Dashboard (Settings → Environment Variables)
3. Redeploy application (triggers Vercel to update CRON job headers)
4. Monitor logs for first successful CRON execution with new secret
5. Document rotation date for compliance/audit purposes

**Important**: Update the secret in Vercel BEFORE the next scheduled CRON job runs to avoid service disruption.

---

## Related Documentation

- [Git Workflow](git-workflow.md) - Version control practices
- [Testing](../testing/README.md) - Test configuration
- [Deployment](../deployment/README.md) - Production deployment guide
- [CRON Endpoints API Reference](../api/cron-endpoints.md) - Complete CRON endpoint documentation
- [CRON Authentication Implementation](../security/cron-authentication.md) - Technical implementation details
