# API Reference

> REST API endpoints for querying audit trail data.

## Table of Contents

- [Student Journal API](#student-journal-api)
- [Teacher Student Journal API](#teacher-student-journal-api)
- [Bonus History API](#bonus-history-api)
- [Admin API](#admin-api)
  - [Bulk Query](#bulk-query)
  - [Export Endpoints](#export-endpoints)
  - [Search API](#search-api)
- [Database RPC Functions](#database-rpc-functions)
- [Zod Validation Schemas](#zod-validation-schemas)
- [Error Responses](#error-responses-reference)

---

## Student Journal API

### GET /api/rewards/journal

Returns paginated reward events for the authenticated student.

**File**: `src/routes/api/rewards/journal/+server.ts`

#### Authentication

Requires authenticated student session.

#### Query Parameters

| Parameter     | Type              | Default | Description               |
| ------------- | ----------------- | ------- | ------------------------- |
| `reward_type` | `RewardType`      | -       | Filter by reward type     |
| `event_type`  | `RewardEventType` | -       | Filter by event type      |
| `from`        | `ISO 8601 string` | -       | Start date (inclusive)    |
| `to`          | `ISO 8601 string` | -       | End date (inclusive)      |
| `page`        | `integer`         | `1`     | Page number (1-indexed)   |
| `limit`       | `integer`         | `20`    | Items per page (max: 100) |

#### Response

```typescript
interface RewardJournalResponse {
	events: RewardEvent[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
		hasMore: boolean;
	};
}

interface RewardEvent {
	id: string;
	student_id: string;
	reward_type: RewardType;
	event_type: RewardEventType;
	amount: number | null;
	item_name: string | null;
	description: string;
	metadata: Record<string, unknown>;
	source_table: string;
	source_id: string | null;
	class_id: string | null;
	created_by: string | null;
	created_at: string; // ISO 8601
}
```

#### Example Request

```bash
curl -X GET "https://ubumaths.com/api/rewards/journal?reward_type=gidouilles&limit=10" \
  -H "Authorization: Bearer <token>"
```

#### Example Response

```json
{
	"events": [
		{
			"id": "550e8400-e29b-41d4-a716-446655440000",
			"student_id": "123e4567-e89b-12d3-a456-426614174000",
			"reward_type": "gidouilles",
			"event_type": "earned",
			"amount": 5,
			"item_name": null,
			"description": "Tu as gagné 5 gidouilles : Exercice de fractions",
			"metadata": {
				"reason": "Exercice de fractions",
				"delta": 5
			},
			"source_table": "gidouilles_history",
			"source_id": "660e8400-e29b-41d4-a716-446655440001",
			"class_id": "770e8400-e29b-41d4-a716-446655440002",
			"created_by": null,
			"created_at": "2024-01-15T10:30:00.000Z"
		}
	],
	"pagination": {
		"page": 1,
		"limit": 10,
		"total": 156,
		"totalPages": 16,
		"hasMore": true
	}
}
```

#### Error Responses

| Status | Description                                      |
| ------ | ------------------------------------------------ |
| `400`  | Invalid query parameters (Zod validation failed) |
| `401`  | Not authenticated                                |
| `403`  | Not a student                                    |
| `500`  | Server error                                     |

---

## Teacher Student Journal API

### GET /api/rewards/journal/[studentId]

Returns paginated reward events for a specific student. Teachers can only view students in their classes.

**File**: `src/routes/api/rewards/journal/[studentId]/+server.ts`

#### Authentication

Requires authenticated teacher session with access to the student.

#### Path Parameters

| Parameter   | Type   | Description          |
| ----------- | ------ | -------------------- |
| `studentId` | `UUID` | Student's profile ID |

#### Query Parameters

Same as [Student Journal API](#query-parameters).

#### Response

Same as [Student Journal API](#response).

#### Authorization Rules

1. Teacher must have an active class containing the student
2. Student must be a member of teacher's class via `class_members` table
3. RLS policy: `is_class_teacher(class_id)` must return `true`

#### Error Responses

| Status | Description                                       |
| ------ | ------------------------------------------------- |
| `400`  | Invalid studentId or query parameters             |
| `401`  | Not authenticated                                 |
| `403`  | Not a teacher or student not in teacher's classes |
| `404`  | Student not found                                 |
| `500`  | Server error                                      |

---

## Bonus History API

### GET /api/student/bonus-history

Returns bonus point history for the authenticated student.

**File**: `src/routes/api/student/bonus-history/+server.ts`

#### Authentication

Requires authenticated student session.

#### Query Parameters

| Parameter | Type      | Default | Description         |
| --------- | --------- | ------- | ------------------- |
| `limit`   | `integer` | `50`    | Max items to return |

#### Response

```typescript
interface BonusHistoryResponse {
	history: BonusHistoryEntry[];
}

interface BonusHistoryEntry {
	id: string;
	delta: number;
	reason: string | null;
	created_at: string;
	created_by: string | null;
}
```

---

## Admin API

Admin-only endpoints for bulk operations, exports, and advanced queries.

### Bulk Query

#### GET /api/admin/rewards/events

Returns all reward events with advanced filtering. Admin only.

**File**: `src/routes/api/admin/rewards/events/+server.ts`

##### Authentication

Requires authenticated admin session.

##### Query Parameters

| Parameter      | Type              | Default | Description                |
| -------------- | ----------------- | ------- | -------------------------- |
| `student_id`   | `UUID`            | -       | Filter by specific student |
| `class_id`     | `UUID`            | -       | Filter by class            |
| `reward_type`  | `RewardType`      | -       | Filter by reward type      |
| `event_type`   | `RewardEventType` | -       | Filter by event type       |
| `from`         | `ISO 8601 string` | -       | Start date (inclusive)     |
| `to`           | `ISO 8601 string` | -       | End date (inclusive)       |
| `source_table` | `string`          | -       | Filter by source table     |
| `page`         | `integer`         | `1`     | Page number                |
| `limit`        | `integer`         | `100`   | Items per page (max: 1000) |

##### Example Request

```bash
curl -X GET "https://ubumaths.com/api/admin/rewards/events?class_id=<uuid>&from=2024-01-01&limit=500" \
  -H "Authorization: Bearer <admin-token>"
```

##### Response

```typescript
interface AdminBulkResponse {
	events: RewardEvent[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
	summary: {
		totalEvents: number;
		byRewardType: Record<RewardType, number>;
		byEventType: Record<RewardEventType, number>;
		dateRange: { from: string; to: string };
	};
}
```

---

### Export Endpoints

#### GET /api/admin/rewards/export

Exports reward events in CSV or JSON format.

**File**: `src/routes/api/admin/rewards/export/+server.ts`

##### Query Parameters

| Parameter    | Type              | Default     | Description                  |
| ------------ | ----------------- | ----------- | ---------------------------- |
| `format`     | `'csv' \| 'json'` | `json`      | Export format                |
| `student_id` | `UUID`            | -           | Filter by student            |
| `class_id`   | `UUID`            | -           | Filter by class              |
| `from`       | `ISO 8601 string` | 30 days ago | Start date                   |
| `to`         | `ISO 8601 string` | now         | End date                     |
| `columns`    | `string`          | all         | Comma-separated column names |

##### Example: CSV Export

```bash
curl -X GET "https://ubumaths.com/api/admin/rewards/export?format=csv&class_id=<uuid>" \
  -H "Authorization: Bearer <admin-token>" \
  -o rewards_export.csv
```

##### CSV Response

```csv
id,student_id,reward_type,event_type,amount,description,created_at
550e8400-...,123e4567-...,gidouilles,earned,5,"Tu as gagné 5 gidouilles",2024-01-15T10:30:00Z
```

##### Example: JSON Export

```bash
curl -X GET "https://ubumaths.com/api/admin/rewards/export?format=json&student_id=<uuid>" \
  -H "Authorization: Bearer <admin-token>"
```

##### JSON Response

```json
{
    "export_date": "2024-01-20T12:00:00Z",
    "filters": {
        "student_id": "123e4567-...",
        "from": "2023-12-21T00:00:00Z",
        "to": "2024-01-20T12:00:00Z"
    },
    "total_records": 156,
    "data": [
        { "id": "...", "reward_type": "gidouilles", ... }
    ]
}
```

#### GET /api/admin/rewards/export/student/[studentId]

GDPR-compliant full data export for a specific student.

##### Response

```json
{
    "export_date": "2024-01-20T12:00:00Z",
    "student_id": "123e4567-...",
    "gdpr_compliant": true,
    "data": {
        "reward_events": [...],
        "gidouilles_history": [...],
        "bonus_history": [...],
        "vip_cards_activity": [...],
        "shop_purchases": [...],
        "item_usage": [...]
    }
}
```

---

### Search API

#### GET /api/admin/rewards/search

Full-text search across reward events.

**File**: `src/routes/api/admin/rewards/search/+server.ts`

##### Query Parameters

| Parameter    | Type      | Default       | Description                                         |
| ------------ | --------- | ------------- | --------------------------------------------------- |
| `q`          | `string`  | **required**  | Search query                                        |
| `fields`     | `string`  | `description` | Fields to search: `description`, `metadata`, `both` |
| `student_id` | `UUID`    | -             | Limit to specific student                           |
| `limit`      | `integer` | `50`          | Max results                                         |

##### Example Request

```bash
curl -X GET "https://ubumaths.com/api/admin/rewards/search?q=fractions&fields=both&limit=20" \
  -H "Authorization: Bearer <admin-token>"
```

##### Response

```json
{
	"query": "fractions",
	"total": 45,
	"results": [
		{
			"id": "550e8400-...",
			"description": "Tu as gagné 5 gidouilles : Exercice de fractions",
			"reward_type": "gidouilles",
			"event_type": "earned",
			"created_at": "2024-01-15T10:30:00Z",
			"highlight": "Exercice de <mark>fractions</mark>",
			"score": 0.95
		}
	]
}
```

##### Search in Metadata

```bash
# Search for events related to a specific exercise
curl -X GET "https://ubumaths.com/api/admin/rewards/search?q=exercise_id:math-101&fields=metadata"
```

##### Zod Schema

```typescript
export const searchQuerySchema = z.object({
	q: z.string().min(2).max(100),
	fields: z.enum(['description', 'metadata', 'both']).default('description'),
	student_id: z.string().uuid().nullish(),
	limit: z.coerce.number().int().positive().max(200).default(50)
});
```

---

## Database RPC Functions

These functions can be called via Supabase client.

### log_moderation_action

Logs a moderation action to `moderation_logs`.

```typescript
const { data: logId, error } = await supabase.rpc('log_moderation_action', {
	p_action: 'mute_user',
	p_target_type: 'user',
	p_target_id: '550e8400-e29b-41d4-a716-446655440000',
	p_reason: 'Inappropriate language in chat',
	p_metadata: { duration_hours: 24, chat_room: 'math-6e' }
});
```

#### Parameters

| Parameter       | Type    | Required | Description                                                                                                                            |
| --------------- | ------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `p_action`      | `TEXT`  | Yes      | One of: `delete_message`, `mute_user`, `unmute_user`, `timeout_user`, `ban_user`, `unban_user`, `review_report`, `export_conversation` |
| `p_target_type` | `TEXT`  | Yes      | One of: `message`, `user`, `conversation`, `report`                                                                                    |
| `p_target_id`   | `UUID`  | Yes      | ID of affected entity                                                                                                                  |
| `p_reason`      | `TEXT`  | No       | Reason for action                                                                                                                      |
| `p_metadata`    | `JSONB` | No       | Additional context                                                                                                                     |

#### Returns

`UUID` - The ID of the created log entry.

---

### get_user_moderation_history

Retrieves moderation history for a user.

```typescript
const { data: history, error } = await supabase.rpc('get_user_moderation_history', {
	p_user_id: '550e8400-e29b-41d4-a716-446655440000',
	p_limit: 20
});
```

#### Parameters

| Parameter   | Type      | Required | Default | Description     |
| ----------- | --------- | -------- | ------- | --------------- |
| `p_user_id` | `UUID`    | Yes      | -       | User to look up |
| `p_limit`   | `INTEGER` | No       | `50`    | Max results     |

#### Returns

```typescript
interface ModerationHistoryEntry {
	id: string;
	action: string;
	reason: string | null;
	moderator_name: string;
	created_at: string;
	metadata: Record<string, unknown>;
}
```

---

### log_template_action

Logs a message template action.

```typescript
const { data: logId, error } = await supabase.rpc('log_template_action', {
	p_template_id: '550e8400-e29b-41d4-a716-446655440000',
	p_action: 'used',
	p_performed_by: auth.uid(),
	p_changes: null,
	p_metadata: { recipient_count: 25 }
});
```

#### Parameters

| Parameter        | Type    | Required | Description                |
| ---------------- | ------- | -------- | -------------------------- |
| `p_template_id`  | `UUID`  | Yes      | Template ID                |
| `p_action`       | `TEXT`  | Yes      | Action type                |
| `p_performed_by` | `UUID`  | Yes      | Actor's profile ID         |
| `p_changes`      | `JSONB` | No       | Old/new values for updates |
| `p_metadata`     | `JSONB` | No       | Additional context         |

---

## Zod Validation Schemas

### Reward Journal Query Schema

**File**: `src/lib/server/validation/reward-journal.ts`

```typescript
import { z } from 'zod';

export const rewardTypeSchema = z.enum(['gidouilles', 'bonus', 'vip_card', 'achievement', 'item']);

export const rewardEventTypeSchema = z.enum([
	'earned',
	'spent',
	'traded',
	'used',
	'expired',
	'unlocked',
	'purchased',
	'awarded',
	'removed'
]);

export const rewardJournalQuerySchema = z.object({
	reward_type: rewardTypeSchema.nullish(),
	event_type: rewardEventTypeSchema.nullish(),
	from: z.string().datetime().nullish(),
	to: z.string().datetime().nullish(),
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(20)
});

export type RewardJournalQuery = z.infer<typeof rewardJournalQuerySchema>;
```

### Student ID Path Schema

```typescript
export const studentIdSchema = z.object({
	studentId: z.string().uuid()
});
```

### Usage in API Endpoint

```typescript
// src/routes/api/rewards/journal/+server.ts
import { rewardJournalQuerySchema } from '$lib/server/validation/reward-journal';

export const GET: RequestHandler = async ({ url, locals }) => {
	const params = Object.fromEntries(url.searchParams);
	const validation = rewardJournalQuerySchema.safeParse(params);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { reward_type, event_type, from, to, page, limit } = validation.data;

	// Build query...
};
```

---

## Rate Limiting

API endpoints are subject to Supabase's default rate limits:

| Tier | Requests/minute |
| ---- | --------------- |
| Free | 500             |
| Pro  | 3,000           |

For high-traffic scenarios (e.g., real-time journal updates), consider using Supabase Realtime subscriptions instead of polling.

---

## TypeScript Integration

### Using the API with Type Safety

```typescript
// src/lib/api/rewards.ts
import type { RewardJournalResponse, RewardEvent } from '$lib/types/reward-journal';

export async function fetchStudentJournal(
	options: {
		rewardType?: string;
		eventType?: string;
		page?: number;
		limit?: number;
	} = {}
): Promise<RewardJournalResponse> {
	const params = new URLSearchParams();

	if (options.rewardType) params.set('reward_type', options.rewardType);
	if (options.eventType) params.set('event_type', options.eventType);
	if (options.page) params.set('page', options.page.toString());
	if (options.limit) params.set('limit', options.limit.toString());

	const response = await fetch(`/api/rewards/journal?${params}`);

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message);
	}

	return response.json();
}
```

---

## Error Responses Reference

All API endpoints return consistent error responses. Here are concrete examples for each error type.

### 400 Bad Request - Validation Errors

#### Invalid reward_type

```json
{
	"error": "Validation failed",
	"message": "Invalid enum value. Expected 'gidouilles' | 'bonus' | 'vip_card' | 'achievement' | 'item', received 'invalid'",
	"field": "reward_type",
	"code": "invalid_enum_value"
}
```

#### Invalid event_type

```json
{
	"error": "Validation failed",
	"message": "Invalid enum value. Expected 'earned' | 'spent' | 'traded' | 'used' | 'expired' | 'unlocked' | 'purchased' | 'awarded' | 'removed', received 'unknown'",
	"field": "event_type",
	"code": "invalid_enum_value"
}
```

#### Invalid UUID format

```json
{
	"error": "Validation failed",
	"message": "Invalid uuid",
	"field": "studentId",
	"code": "invalid_string"
}
```

#### Invalid date format

```json
{
	"error": "Validation failed",
	"message": "Invalid datetime string. Must be ISO 8601 format (e.g., 2024-01-15T10:30:00Z)",
	"field": "from",
	"code": "invalid_string"
}
```

#### Pagination out of bounds

```json
{
	"error": "Validation failed",
	"message": "Number must be less than or equal to 100",
	"field": "limit",
	"code": "too_big"
}
```

#### Missing required field

```json
{
	"error": "Validation failed",
	"message": "Required",
	"field": "q",
	"code": "invalid_type"
}
```

### 401 Unauthorized

#### No authentication token

```json
{
	"error": "Unauthorized",
	"message": "Authentication required. Please provide a valid Bearer token.",
	"code": "auth_required"
}
```

#### Expired token

```json
{
	"error": "Unauthorized",
	"message": "Token has expired. Please log in again.",
	"code": "token_expired"
}
```

#### Invalid token

```json
{
	"error": "Unauthorized",
	"message": "Invalid authentication token.",
	"code": "invalid_token"
}
```

### 403 Forbidden

#### Student accessing other student's data

```json
{
	"error": "Forbidden",
	"message": "You can only access your own reward journal.",
	"code": "access_denied"
}
```

#### Teacher accessing student not in their class

```json
{
	"error": "Forbidden",
	"message": "This student is not in any of your classes.",
	"code": "not_class_teacher",
	"details": {
		"student_id": "123e4567-e89b-12d3-a456-426614174000",
		"required_role": "class_teacher"
	}
}
```

#### Non-admin accessing admin endpoint

```json
{
	"error": "Forbidden",
	"message": "This endpoint requires admin privileges.",
	"code": "admin_required",
	"details": {
		"current_role": "teacher",
		"required_role": "admin"
	}
}
```

### 404 Not Found

#### Student not found

```json
{
	"error": "Not found",
	"message": "Student with ID '123e4567-e89b-12d3-a456-426614174000' not found.",
	"code": "student_not_found"
}
```

#### Event not found

```json
{
	"error": "Not found",
	"message": "Reward event not found.",
	"code": "event_not_found"
}
```

### 429 Too Many Requests

```json
{
	"error": "Too many requests",
	"message": "Rate limit exceeded. Please wait before making more requests.",
	"code": "rate_limited",
	"details": {
		"limit": 500,
		"window": "1 minute",
		"retry_after": 45
	}
}
```

### 500 Internal Server Error

```json
{
	"error": "Internal server error",
	"message": "An unexpected error occurred. Please try again later.",
	"code": "internal_error",
	"request_id": "req_abc123xyz"
}
```

### Error Response TypeScript Interface

```typescript
interface ApiError {
	error: string;
	message: string;
	code: string;
	field?: string; // For validation errors
	details?: {
		[key: string]: unknown;
	};
	request_id?: string; // For server errors (debugging)
}
```

### Handling Errors in Client Code

```typescript
import { toaster } from '$lib/stores/toaster.svelte';

async function fetchJournal() {
	try {
		const response = await fetch('/api/rewards/journal');

		if (!response.ok) {
			const error = await response.json();

			switch (response.status) {
				case 400:
					toaster.error(`Paramètre invalide: ${error.message}`);
					break;
				case 401:
					// Redirect to login
					goto('/login');
					break;
				case 403:
					toaster.error('Accès non autorisé');
					break;
				case 404:
					toaster.error('Ressource non trouvée');
					break;
				case 429:
					toaster.warning(`Trop de requêtes. Réessayez dans ${error.details?.retry_after}s`);
					break;
				default:
					toaster.error('Une erreur est survenue');
					console.error('API Error:', error);
			}

			return null;
		}

		return await response.json();
	} catch (e) {
		toaster.error('Erreur de connexion');
		return null;
	}
}
```

### Zod Error Formatting

```typescript
// src/lib/server/utils/format-zod-error.ts
import { ZodError } from 'zod';

export function formatZodError(error: ZodError): ApiError {
	const firstIssue = error.issues[0];

	return {
		error: 'Validation failed',
		message: firstIssue.message,
		field: firstIssue.path.join('.'),
		code: firstIssue.code
	};
}

// Usage in endpoint
export const GET: RequestHandler = async ({ url }) => {
	const validation = schema.safeParse(Object.fromEntries(url.searchParams));

	if (!validation.success) {
		return json(formatZodError(validation.error), { status: 400 });
	}

	// Continue with valid data...
};
```
