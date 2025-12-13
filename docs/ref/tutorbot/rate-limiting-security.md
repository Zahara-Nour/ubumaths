# Rate Limiting & Security

> Technical reference for rate limiting, anti-cheat, and security measures in the tutor system.

---

## Overview

The TutorBot system implements multiple layers of protection:

| Protection           | Purpose                                |
| -------------------- | -------------------------------------- |
| **Rate Limiting**    | Prevent API abuse and control costs    |
| **Cheat Detection**  | Detect attempts to get direct answers  |
| **Authentication**   | Ensure only logged-in users can access |
| **Input Validation** | Zod schemas on all inputs              |
| **Usage Logging**    | Track AI usage for auditing            |

---

## Rate Limiting

### Tutor Mode Limits

The AI tutor has three rate limit tiers:

| Limit Type       | Max | Window                   | Purpose                |
| ---------------- | --- | ------------------------ | ---------------------- |
| **Per Exercise** | 15  | Permanent (7-day expiry) | Encourage independence |
| **Per Hour**     | 30  | 60 minutes (sliding)     | Prevent session spam   |
| **Per Day**      | 100 | 24 hours (sliding)       | Control daily costs    |

### Regular Chat Limits

| Limit Type | Max | Window     |
| ---------- | --- | ---------- |
| Per User   | 5   | 15 minutes |

### Cost Control

```
Daily Budget Calculation:
- 100 messages/day/user × 1000 users = 100K messages/day max
- At ~$0.002/message (Groq pricing)
- Max daily cost ≈ $200
```

### Limit Messages (Pere Ubu Style)

```typescript
export const TUTOR_LIMIT_MESSAGES = {
	exercise:
		"Cornegidouille ! Tu as utilisé beaucoup d'aide sur cet exercice. " +
		'Essaie de le résoudre par toi-même ou demande à ton professeur.',

	hour:
		'Par ma chandelle verte ! Tu travailles beaucoup ! ' +
		'Fais une petite pause et reviens dans quelques minutes.',

	day:
		"Hornstrompe ! Tu as atteint ta limite quotidienne d'aide. " +
		'Le Père Ubu sera de retour demain !'
};
```

### Implementation

**Location**: `src/lib/server/tutor/tutor-rate-limiter.ts`

```typescript
// Check rate limits BEFORE processing
const rateLimit = await checkTutorRateLimit(userId, exerciseId);
if (!rateLimit.allowed) {
	throw error(429, { message: rateLimit.message });
}

// Process message with Groq API...

// Increment counters AFTER success
await incrementTutorUsage(userId, exerciseId);

// Return response with remaining counts
return json({
	message: response,
	tutorMetadata: {
		remaining: rateLimit.remaining
	}
});
```

### Database Storage

Rate limits are stored in the `rate_limits` table:

```sql
CREATE TABLE rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,           -- e.g., "tutor:hour:user-uuid"
  count integer DEFAULT 1,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Index for efficient queries
CREATE INDEX idx_rate_limits_key_expires ON rate_limits(key, expires_at);
```

### Key Format

| Limit Type   | Key Format                             |
| ------------ | -------------------------------------- |
| Per Exercise | `tutor:exercise:{userId}:{exerciseId}` |
| Per Hour     | `tutor:hour:{userId}`                  |
| Per Day      | `tutor:day:{userId}`                   |

### Fail-Open Strategy

```typescript
// In case of database error, ALLOW the request
try {
	const count = await getCurrentCount(key);
	// ... check limit
} catch (error) {
	logger.error('Rate limit check failed:', error);
	return { allowed: true, limitType: null }; // Fail open
}
```

**Rationale**: A database failure should not cause a DoS. Errors are logged for investigation.

---

## Cheat Detection

### Purpose

Detect when students try to get direct answers instead of learning.

**Location**: `src/lib/server/tutor/cheat-detector.ts`

### Detection Patterns

Patterns are organized by confidence level:

#### High Confidence (Explicit Requests)

```typescript
const HIGH_CONFIDENCE_PATTERNS = [
	/donne[- ]?moi (?:la |le )?r[eé](?:ponse|sultat)/i,
	/quelle? est (?:la |le )?r[eé](?:ponse|sultat)/i,
	/dis[- ]?moi (?:la |le )?r[eé](?:ponse|sultat)/i,
	/c['']?est quoi (?:la |le )?r[eé](?:ponse|sultat)/i,
	/r[eé]ponds? [àa] ma place/i,
	/fais[- ]?(?:le|la|les?) (?:pour|[àa]) moi/i,
	/r[eé]sous?[- ]?(?:le|la|les?)/i
	// ... more patterns
];
```

#### Medium Confidence (Indirect Requests)

```typescript
const MEDIUM_CONFIDENCE_PATTERNS = [
	/je veux (?:juste )?(?:la |le )?r[eé](?:ponse|sultat)/i,
	/j['']?ai besoin (?:de )?(?:la |le )?r[eé](?:ponse|sultat)/i,
	/peux[- ]?tu (?:me )?donner (?:la |le )?r[eé](?:ponse|sultat)/i
	// ... more patterns
];
```

#### Low Confidence (Potentially Legitimate)

```typescript
const LOW_CONFIDENCE_PATTERNS = [
	/aide[- ]?moi [àa] trouver (?:la |le )?r[eé](?:ponse|sultat)/i,
	/je (?:ne )?comprends? (?:pas|rien)/i,
	/je suis? (?:perdu|bloqu[eé]|coinc[eé])/i
	// ... more patterns
];
```

### Legitimate Request Indicators

The system also detects **legitimate learning indicators**:

```typescript
const LEGITIMATE_PATTERNS = [
	// Shows work
	/j['']?ai essaye/i,
	/j['']?ai fait/i,
	/mon calcul/i,
	/ma demarche/i,

	// Asks specific questions
	/pourquoi/i,
	/comment (?:on |dois[- ]je |faire |calculer)/i,

	// Expresses confusion about concept
	/je ne comprends? pas (?:pourquoi|comment|la notion)/i,
	/peux[- ]tu (?:m['']?)?expliquer/i,

	// Shows partial understanding
	/si je comprends? bien/i,
	/donc (?:si |c['']?est)/i
];
```

### Decision Logic

```typescript
function analyzeMessage(message: string): {
	recommendation: 'allow' | 'refuse' | 'gentle_redirect';
} {
	const cheatDetection = detectCheatAttempt(message);
	const legitimate = isLegitimateHelpRequest(message);

	if (legitimate) {
		return 'allow'; // Legitimate request always allowed
	} else if (cheatDetection.confidence === 'high') {
		return 'refuse'; // Clear cheat attempt - polite refusal
	} else if (cheatDetection.confidence === 'medium') {
		return 'gentle_redirect'; // Possible cheat - redirect
	} else {
		return 'allow'; // Low confidence - allow
	}
}
```

### Polite Refusal Responses

When cheat is detected, a random Pere Ubu response is returned:

```typescript
const POLITE_REFUSAL_RESPONSES = [
	'Cornegidouille ! Le Père Ubu ne donne jamais les réponses tout cuit ! ' +
		"Mais je peux t'aider à réfléchir... Dis-moi, qu'as-tu déjà essayé ?",

	"Par ma chandelle verte ! Si je te donnais la réponse, tu n'apprendrais rien ! " +
		'Allez, montre-moi ton raisonnement...',

	'Hornstrompe ! Un vrai mathématicien pataphysique trouve les réponses lui-même ! ' +
		"Je vais te poser une question pour t'aider..."

	// ... 9 more responses
];
```

---

## Authentication

### Middleware

All API endpoints use the `requireAuth` middleware:

```typescript
// src/routes/api/chat/+server.ts

export const POST: RequestHandler = async ({ request, locals }) => {
	// SECURITY: Authentication Check
	const { user } = await requireAuth(locals);

	// ... rest of handler
};
```

### Implementation

```typescript
// src/lib/server/middleware/auth.ts

export async function requireAuth(locals: App.Locals): Promise<{ user: User }> {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		throw error(401, 'Authentification requise');
	}

	return { user };
}
```

---

## Input Validation

### Zod Schemas

All inputs are validated with Zod:

**Location**: `src/lib/server/validation/chat.ts`

```typescript
// Regular chat request
export const chatRequestSchema = z.object({
	messages: z
		.array(chatMessageSchema)
		.min(1, 'Au moins un message requis')
		.max(50, 'Trop de messages dans la conversation (max 50)')
});

// Tutor request (extends chat)
export const tutorRequestSchema = chatRequestSchema.extend({
	tutorMode: z.boolean().default(false),
	exerciseContext: exerciseContextSchema.optional(),
	conversationId: z.string().uuid().optional(),
	helpLevel: z.number().int().min(0).max(7).default(0)
});

// Message schema
const chatMessageSchema = z.object({
	role: z.enum(['user', 'assistant', 'system']),
	content: z.union([
		z.string().min(1).max(10000),
		// Vision model support
		z.array(
			z.union([
				z.object({ type: z.literal('text'), text: z.string() }),
				z.object({
					type: z.literal('image_url'),
					image_url: z.object({ url: z.string().url() })
				})
			])
		)
	])
});

// Exercise context
const exerciseContextSchema = z.object({
	exerciseId: z.string().uuid().optional(),
	statement: z.string().max(5000),
	topic: z.string().max(100).optional(),
	domain: z.string().max(100).optional(),
	level: z.number().int().min(1).max(5).optional(),
	studentGrade: z.string().max(20).optional(),
	attempts: z
		.array(
			z.object({
				answer: z.string().max(1000),
				isCorrect: z.boolean(),
				timestamp: z.string().datetime().optional()
			})
		)
		.max(20)
		.optional()
});
```

### Validation in Handler

```typescript
// Parse and validate
const rawBody = await request.json();
const validation = tutorRequestSchema.safeParse(rawBody);

if (!validation.success) {
	throw error(400, { message: validation.error.issues[0].message });
}

const { messages, exerciseContext, helpLevel } = validation.data;
```

---

## Usage Logging

### ai_chat_usage Table

All AI interactions are logged:

```typescript
// After successful API call
await locals.supabase.from('ai_chat_usage').insert({
	user_id: user.id,
	model: model,
	message_count: messages.length,
	tokens_used: data.usage?.total_tokens || 0,
	client_ip: null,
	response_length: responseMessage?.length || 0
});
```

### Logged Fields

| Field           | Description                        |
| --------------- | ---------------------------------- |
| user_id         | Authenticated user UUID            |
| model           | LLM model used                     |
| message_count   | Number of messages in conversation |
| tokens_used     | Total tokens from API response     |
| response_length | Character count of response        |
| created_at      | Timestamp                          |

### Non-Blocking Logging

Logging is done asynchronously to not slow down response:

```typescript
// Fire and forget - don't await
Promise.resolve().then(async () => {
  try {
    await locals.supabase.from('ai_chat_usage').insert({...});
  } catch (logError) {
    console.error('Failed to log AI chat usage:', logError);
  }
});

// Return response immediately
return json({ message: responseMessage });
```

---

## Security Best Practices

### 1. Never Expose Secrets

```typescript
// WRONG
const response = { apiKey: process.env.GROQ_API_KEY };

// CORRECT
const env = getEnv(); // Server-only, validated
```

### 2. Service Role Client Isolation

```typescript
// Rate limiting uses service role client
// - Bypasses RLS (system operation)
// - Singleton to avoid connection pool exhaustion
// - Never exposed to client

const globalForSupabase = globalThis as unknown as {
	supabaseTutorServiceRoleClient: SupabaseClient | undefined;
};
```

### 3. PII Protection in Logs

```typescript
function maskKey(key: string): string {
	const parts = key.split(':');
	const value = parts[parts.length - 1];
	// Show only first 4 chars of UUIDs
	return `${parts.slice(0, -1).join(':')}:${value.substring(0, 4)}***`;
}

// Usage
logger.warn('Rate limit exceeded', {
	userId: maskKey(`user:${userId}`), // "user:123e***"
	exerciseId: maskKey(`exercise:${exerciseId}`)
});
```

### 4. Error Response Sanitization

```typescript
// Don't leak internal errors
try {
	// ... API call
} catch (err) {
	console.error('Internal error:', err); // Log full error
	throw error(500, {
		message: "Erreur lors de la communication avec l'IA" // Generic message
	});
}
```

---

## Configuration Summary

### Environment Variables

| Variable                    | Required | Purpose                      |
| --------------------------- | -------- | ---------------------------- |
| `GROQ_API_KEY`              | Yes      | LLM API authentication       |
| `PUBLIC_SUPABASE_URL`       | Yes      | Supabase project URL         |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes      | Bypass RLS for rate limiting |
| `ENABLE_RAG`                | No       | Enable RAG search            |

### Rate Limit Configuration

```typescript
// src/lib/server/tutor/tutor-rate-limiter.ts

export const TUTOR_RATE_LIMITS = {
	perExercise: { max: 15 },
	perHour: { max: 30, windowMinutes: 60 },
	perDay: { max: 100, windowMinutes: 1440 }
};
```

---

## See Also

- [Architecture](./architecture.md) - System architecture
- [Pere Ubu Tutor](./pere-ubu-tutor.md) - AI personality
- [Database Schema](./database-schema.md) - Tables and RLS
