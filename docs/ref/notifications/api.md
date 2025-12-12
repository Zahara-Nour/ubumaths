# Notification API Reference

REST API endpoints for the notification system.

## Endpoints Overview

| Method | Endpoint                           | Description                    |
| ------ | ---------------------------------- | ------------------------------ |
| GET    | `/api/notifications/unread`        | Paginated unread notifications |
| GET    | `/api/notifications/unread-count`  | Unread count only              |
| POST   | `/api/notifications/mark-read`     | Mark single notification read  |
| POST   | `/api/notifications/mark-all-read` | Mark all notifications read    |

## Authentication

All endpoints require authentication via `requireAuth()` middleware:

```typescript
const { user } = await requireAuth(locals);
```

Returns `401 Unauthorized` if not authenticated.

---

## GET /api/notifications/unread

Fetch paginated unread notifications for the current user.

### Request

```http
GET /api/notifications/unread?page=1&limit=20
```

### Query Parameters

| Parameter | Type   | Default | Min | Max | Description    |
| --------- | ------ | ------- | --- | --- | -------------- |
| `page`    | number | 1       | 1   | -   | Page number    |
| `limit`   | number | 20      | 1   | 100 | Items per page |

### Response

```typescript
interface Response {
	notifications: NotificationWithDetails[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
		hasMore: boolean;
	};
}
```

### Example Response

```json
{
	"notifications": [
		{
			"id": "550e8400-e29b-41d4-a716-446655440000",
			"created_at": "2025-01-15T10:30:00Z",
			"created_by": "user-uuid",
			"title": "Nouvelle evaluation",
			"message": "<p>Une evaluation a ete assignee</p>",
			"type": "info",
			"priority": "important",
			"action_label": "Voir l'evaluation",
			"action_url": "/dashboard/student/assessments",
			"target_type": "classes",
			"expires_at": "2025-02-14T10:30:00Z",
			"is_system": true,
			"system_event_type": "assessment_assigned",
			"creator": {
				"firstname": "Jean",
				"lastname": "Dupont",
				"full_name": "Jean Dupont"
			},
			"is_read": false
		}
	],
	"pagination": {
		"page": 1,
		"limit": 20,
		"total": 45,
		"totalPages": 3,
		"hasMore": true
	}
}
```

### Validation Schema

```typescript
// src/routes/api/notifications/unread/+server.ts
const paginationSchema = z.object({
	page: z.preprocess(
		(val) => (val === null ? undefined : val),
		z.coerce.number().int().positive().default(1)
	),
	limit: z.preprocess(
		(val) => (val === null ? undefined : val),
		z.coerce.number().int().positive().min(1).max(100).default(20)
	)
});
```

### Error Responses

| Status | Description                   |
| ------ | ----------------------------- |
| 400    | Invalid pagination parameters |
| 401    | Not authenticated             |

---

## GET /api/notifications/unread-count

Lightweight endpoint to fetch only the unread count.

### Request

```http
GET /api/notifications/unread-count
```

### Response

```typescript
interface Response {
	count: number;
}
```

### Example Response

```json
{
	"count": 12
}
```

### Error Responses

| Status | Description       |
| ------ | ----------------- |
| 401    | Not authenticated |

---

## POST /api/notifications/mark-read

Mark a single notification as read.

### Request

```http
POST /api/notifications/mark-read
Content-Type: application/json

{
  "notificationId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Request Body

| Field            | Type | Required | Description                  |
| ---------------- | ---- | -------- | ---------------------------- |
| `notificationId` | UUID | Yes      | Notification ID to mark read |

### Validation Schema

```typescript
// src/lib/server/validation/notifications.ts
const markNotificationReadSchema = z.object({
	notificationId: uuidSchema // z.string().uuid()
});
```

### Response

```typescript
interface Response {
	success: true;
}
```

### Example Response

```json
{
	"success": true
}
```

### Rate Limiting

- **Limit**: 100 requests per 15 minutes per user
- **Header**: `Retry-After` returned on 429

### Error Responses

| Status | Description                    |
| ------ | ------------------------------ |
| 400    | Invalid notification ID format |
| 401    | Not authenticated              |
| 429    | Rate limit exceeded            |
| 500    | Server error                   |

---

## POST /api/notifications/mark-all-read

Mark all unread notifications as read for the current user.

### Request

```http
POST /api/notifications/mark-all-read
```

### Response

```typescript
interface Response {
	success: true;
}
```

### Example Response

```json
{
	"success": true
}
```

### Error Responses

| Status | Description       |
| ------ | ----------------- |
| 401    | Not authenticated |
| 500    | Server error      |

---

## Server-Side Functions

These functions are used internally by the API endpoints and form actions.

### createNotification

Create a manual notification (teacher/admin).

```typescript
import { createNotification } from '$lib/server/notifications';

const result = await createNotification(
	supabase,
	{
		title: 'Nouveau devoir',
		message: '<p>Un devoir a ete assigne</p>',
		type: 'info', // 'info' | 'alert' | 'announcement' | 'reminder'
		priority: 'normal', // 'normal' | 'important' | 'urgent'
		target_type: 'classes', // 'all' | 'role' | 'classes' | 'users'
		target_class_ids: ['uuid-1', 'uuid-2'],
		action_label: 'Voir le devoir',
		action_url: '/dashboard/student/devoirs/123',
		expires_at: '2025-02-01T00:00:00Z' // Optional, default +30 days
	},
	createdByUserId
);

// Returns: { success: true, id: 'uuid' } or { success: false, error: 'message' }
```

**Permission Validation**:

- Teachers can only target their own classes/students
- Admins can target anyone

### createSystemNotification

Create an automatic system notification.

```typescript
import { createSystemNotification } from '$lib/server/notifications';

const result = await createSystemNotification(supabase, {
	title: 'Evaluation assignee',
	message: '<p>Une nouvelle evaluation vous attend</p>',
	type: 'info',
	priority: 'important',
	system_event_type: 'assessment_assigned',
	target_type: 'users',
	target_user_ids: ['student-uuid'],
	action_label: "Voir l'evaluation",
	action_url: '/dashboard/student/assessments'
});
```

**Note**: No permission check - used by system only.

### getUnreadNotifications

Fetch paginated unread notifications for a user.

```typescript
import { getUnreadNotifications } from '$lib/server/notifications';

const result = await getUnreadNotifications(supabase, userId, {
	page: 1,
	limit: 20
});

// Returns: {
//   notifications: NotificationWithDetails[],
//   pagination: { page, limit, total, totalPages, hasMore }
// }
```

### markAsRead

Mark a single notification as read.

```typescript
import { markAsRead } from '$lib/server/notifications';

const result = await markAsRead(supabase, notificationId, userId);
// Returns: { success: boolean, error?: string }
```

### markAllAsRead

Mark all notifications as read for a user.

```typescript
import { markAllAsRead } from '$lib/server/notifications';

const result = await markAllAsRead(supabase, userId);
// Returns: { success: boolean, error?: string }
```

---

## Auto-Notification Helpers

Pre-built functions for common notification scenarios.

### notifyNewAssignment

```typescript
import { notifyNewAssignment } from '$lib/server/auto-notifications';

await notifyNewAssignment(supabase, {
	assignmentId: 'uuid',
	assignmentTitle: 'Exercices Chapitre 3',
	classId: 'class-uuid',
	teacherName: 'M. Dupont'
});
```

### notifyNewAssessment

```typescript
import { notifyNewAssessment } from '$lib/server/auto-notifications';

await notifyNewAssessment(supabase, {
	assessmentId: 'uuid',
	assessmentTitle: 'Controle Mathematiques',
	teacherName: 'Mme Martin',
	classIds: ['class-1', 'class-2'], // OR
	studentIds: ['student-1', 'student-2']
});
```

### notifyRewardEarned

```typescript
import { notifyRewardEarned } from '$lib/server/auto-notifications';

await notifyRewardEarned(supabase, {
	studentId: 'uuid',
	amount: 50,
	reason: 'Excellent travail sur l exercice!' // Optional
});
```

### notifyVipCardEarned

```typescript
import { notifyVipCardEarned } from '$lib/server/auto-notifications';

await notifyVipCardEarned(supabase, {
	studentId: 'uuid',
	cardType: 'gold',
	cardName: 'Carte Or Mathematiques'
});
```

### notifyBadgeUnlocked

```typescript
import { notifyBadgeUnlocked } from '$lib/server/auto-notifications';

await notifyBadgeUnlocked(supabase, {
	studentId: 'uuid',
	badgeName: 'Explorateur',
	badgeDescription: 'A complete 10 exercices' // Optional
});
```

### notifyMaintenance

```typescript
import { notifyMaintenance } from '$lib/server/auto-notifications';

await notifyMaintenance(supabase, {
	date: '15 janvier 2025 a 18h',
	duration: '2 heures',
	description: 'Mise a jour du systeme'
});
```

### notifyFeatureRelease

```typescript
import { notifyFeatureRelease } from '$lib/server/auto-notifications';

await notifyFeatureRelease(supabase, {
	featureName: 'Mode Sombre',
	description: 'Le mode sombre est maintenant disponible!',
	targetRoles: ['student', 'teacher'], // Optional, default: all
	actionUrl: '/settings' // Optional
});
```

---

## TypeScript Types

### NotificationWithDetails

```typescript
interface NotificationWithDetails {
	id: string;
	created_at: string;
	created_by: string | null;
	title: string;
	message: string; // HTML content (sanitized)
	type: 'info' | 'alert' | 'announcement' | 'reminder';
	priority: 'normal' | 'important' | 'urgent';
	action_label: string | null;
	action_url: string | null;
	target_type: 'all' | 'role' | 'classes' | 'users';
	expires_at: string;
	is_system: boolean;
	system_event_type: string | null;
	creator?: {
		firstname: string | null;
		lastname: string | null;
		full_name?: string | null;
	};
	is_read: boolean;
	read_at?: string;
}
```

### CreateNotificationData

```typescript
interface CreateNotificationData {
	title: string;
	message: string; // Rich text HTML
	type: 'info' | 'alert' | 'announcement' | 'reminder';
	priority: 'normal' | 'important' | 'urgent';
	action_label?: string;
	action_url?: string;
	target_type: 'all' | 'role' | 'classes' | 'users';
	target_roles?: string[];
	target_class_ids?: string[];
	target_user_ids?: string[];
	expires_at?: string; // ISO date, defaults to +30 days
}
```

### CreateSystemNotificationData

```typescript
interface CreateSystemNotificationData {
	title: string;
	message: string;
	type: 'info' | 'alert' | 'announcement' | 'reminder';
	priority: 'normal' | 'important' | 'urgent';
	system_event_type: string;
	target_type: 'all' | 'role' | 'classes' | 'users';
	target_roles?: string[];
	target_class_ids?: string[];
	target_user_ids?: string[];
	action_label?: string;
	action_url?: string;
}
```
