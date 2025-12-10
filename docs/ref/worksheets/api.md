# Worksheets API Reference

REST API endpoints for the worksheets system.

**Base path:** `/api/worksheets`
**Validation:** `src/lib/server/validation/worksheets.ts`

---

## Authentication

All endpoints require authentication. Teachers and admins can manage worksheets.

```typescript
await requireRoles(locals, ['teacher', 'admin']);
```

---

## Worksheets

### List Worksheets

`GET /api/worksheets`

List worksheets with filters and pagination.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number (1-1000) |
| `limit` | number | 50 | Items per page (1-100) |
| `status` | string | - | Filter by status |
| `type` | string | - | Filter by type |
| `search` | string | - | Search title/description |

**Response:**

```json
{
  "worksheets": [
    {
      "id": "uuid",
      "title": "Equations",
      "description": "...",
      "type": "worksheet",
      "status": "draft",
      "config": {...},
      "exercise_count": 5,
      "created_at": "2025-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 42,
    "totalPages": 1
  }
}
```

### Create Worksheet

`POST /api/worksheets`

**Request Body:**

```json
{
	"title": "Equations du premier degre",
	"description": "Exercices de base",
	"type": "worksheet",
	"config": {
		"show_title": true,
		"show_points": true,
		"numbering_style": "numeric"
	},
	"template_id": "00000000-0000-4000-8000-000000000001",
	"estimated_duration_minutes": 45,
	"grade_levels": ["6", "5"],
	"tags": ["algebre", "equations"]
}
```

**Validation:**

- `title`: 1-200 characters, required
- `description`: max 5000 characters
- `type`: worksheet|assessment|exam|quiz|homework
- `estimated_duration_minutes`: 1-600
- `grade_levels`: max 20 items
- `tags`: max 30 items, each max 50 chars

**Response:** `201 Created`

```json
{
  "worksheet": {
    "id": "uuid",
    "title": "Equations du premier degre",
    "status": "draft",
    "version": 1,
    ...
  }
}
```

### Get Worksheet

`GET /api/worksheets/[id]`

Get worksheet with sections, exercises, and template.

**Response:**

```json
{
	"worksheet": {
		"id": "uuid",
		"title": "Equations",
		"sections": [{ "id": "uuid", "title": "Partie 1", "position": 0 }],
		"exercises": [
			{
				"id": "uuid",
				"exercise_id": "uuid",
				"position": 0,
				"variant_mode": "individual",
				"exercise": {
					"title": "Addition simple",
					"statement_md": "Calculer {{a}} + {{b}}"
				}
			}
		],
		"template": {
			"id": "uuid",
			"name": "Standard"
		}
	}
}
```

### Update Worksheet

`PUT /api/worksheets/[id]`

Partial update of worksheet properties.

**Request Body (all fields optional):**

```json
{
	"title": "New Title",
	"status": "published",
	"config": {
		"shuffle_exercises": true
	}
}
```

### Delete Worksheet

`DELETE /api/worksheets/[id]`

Delete a draft worksheet.

**Constraints:**

- Only draft worksheets can be deleted
- Owner or admin only

**Response:**

```json
{
	"success": true,
	"message": "Worksheet deleted successfully"
}
```

### Duplicate Worksheet

`POST /api/worksheets/[id]/duplicate`

Create a copy of an existing worksheet.

**Response:** New worksheet with "(copie)" suffix

---

## Sections

### List Sections

`GET /api/worksheets/[id]/sections`

**Response:**

```json
{
	"sections": [
		{
			"id": "uuid",
			"worksheet_id": "uuid",
			"title": "Partie 1 - Calcul mental",
			"instructions": "Repondre sans calculatrice",
			"position": 0,
			"points_total": 10
		}
	]
}
```

### Create Section

`POST /api/worksheets/[id]/sections`

**Request Body:**

```json
{
	"title": "Partie 1",
	"instructions": "Instructions specifiques",
	"position": 0,
	"points_total": 10
}
```

**Validation:**

- `title`: 1-200 characters, required
- `instructions`: max 5000 characters
- `position`: 0-100, must be unique within worksheet

### Update Section

`PUT /api/worksheets/[id]/sections/[sectionId]`

### Delete Section

`DELETE /api/worksheets/[id]/sections/[sectionId]`

Exercises in deleted section have `section_id` set to null.

---

## Exercises

### List Exercises

`GET /api/worksheets/[id]/exercises`

Get exercises with joined exercise data.

**Response:**

```json
{
	"exercises": [
		{
			"id": "uuid",
			"worksheet_id": "uuid",
			"exercise_id": "uuid",
			"section_id": "uuid",
			"position": 0,
			"points": 5,
			"variant_mode": "individual",
			"variant_config": {
				"mode": "individual"
			},
			"exercise": {
				"id": "uuid",
				"title": "Addition",
				"statement_md": "{{a}} + {{b}} = ?",
				"solution_md": "{{a}} + {{b}} = {{c}}",
				"difficulty": 2,
				"variables": [
					{ "name": "a", "expression": "random(1,10)" },
					{ "name": "b", "expression": "random(1,10)" },
					{ "name": "c", "expression": "a+b" }
				]
			}
		}
	]
}
```

### Add Exercise

`POST /api/worksheets/[id]/exercises`

**Request Body:**

```json
{
	"exercise_id": "uuid",
	"section_id": "uuid",
	"position": 0,
	"points": 5,
	"variant_mode": "individual",
	"variant_config": {
		"mode": "individual"
	},
	"custom_instructions": "Montrer le calcul"
}
```

**Validation:**

- `exercise_id`: valid UUID, required
- `position`: 0-1000, required
- `points`: 0-1000
- `variant_mode`: none|individual|n_versions|group
- `variant_config.n_versions`: 1-50
- `variant_config.group_size`: 1-100

### Reorder Exercises

`PUT /api/worksheets/[id]/exercises`

Batch update positions and sections.

**Request Body:**

```json
{
	"exercises": [
		{ "id": "uuid1", "position": 0, "section_id": "uuid-section" },
		{ "id": "uuid2", "position": 1, "section_id": null },
		{ "id": "uuid3", "position": 2, "section_id": null }
	]
}
```

**Response:**

```json
{
	"success": true,
	"message": "Exercises reordered",
	"updated_count": 3
}
```

### Update Exercise

`PUT /api/worksheets/[id]/exercises/[exerciseId]`

Update single exercise configuration.

### Remove Exercise

`DELETE /api/worksheets/[id]/exercises/[exerciseId]`

Remove exercise from worksheet (does not delete the exercise itself).

---

## Instances

### Create Instances

`POST /api/worksheets/[id]/instances`

Generate instances for students.

**Request Body:**

```json
{
	"student_ids": ["uuid1", "uuid2"],
	"class_id": "uuid"
}
```

---

## Assignments

### Create Assignment

`POST /api/worksheets/[id]/assignments`

**Request Body:**

```json
{
	"class_id": "uuid",
	"title": "Devoir semaine 5",
	"instructions": "A faire pour lundi",
	"individualized": true,
	"available_from": "2025-01-20T08:00:00Z",
	"due_at": "2025-01-27T18:00:00Z",
	"closes_at": "2025-01-28T23:59:00Z",
	"correction_release_mode": "after_due",
	"allow_late_submission": true,
	"max_attempts": 1,
	"time_limit_minutes": 60
}
```

**Validation:**

- `due_at` must be after `available_from`
- `closes_at` must be after `due_at`
- `max_attempts`: positive integer
- `correction_release_mode`: manual|immediate|scheduled|after_due

### Get Assignment

`GET /api/worksheets/assignments/[assignmentId]`

### Update Assignment

`PUT /api/worksheets/assignments/[assignmentId]`

### Release Corrections

`POST /api/worksheets/assignments/[assignmentId]/correction`

Manually release corrections for an assignment.

---

## Templates

### List Templates

`GET /api/worksheets/templates`

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 50 | Items per page |
| `include_public` | boolean | true | Include public templates |
| `search` | string | - | Search name/description |

### Create Template

`POST /api/worksheets/templates`

**Request Body:**

```json
{
	"name": "Mon template",
	"description": "Template personnalise",
	"template_content": "#set page(paper: \"a4\")\n{{title}}\n{{exercises}}",
	"placeholders": [
		{ "key": "title", "type": "text", "label": "Titre" },
		{ "key": "exercises", "type": "dynamic" }
	],
	"is_public": false
}
```

**Validation:**

- `name`: 1-255 characters, required
- `description`: max 2000 characters
- `template_content`: 1-50000 characters, required
- `placeholders`: max 50 items

### Get Template

`GET /api/worksheets/templates/[id]`

### Update Template

`PUT /api/worksheets/templates/[id]`

### Delete Template

`DELETE /api/worksheets/templates/[id]`

System templates cannot be deleted.

---

## PDF Generation

### Preview Data

`GET /api/worksheets/[id]/preview`

Get worksheet data for client-side PDF preview.

### Generate PDF (Legacy)

`POST /api/worksheets/[id]/pdf`

Server-side PDF generation (legacy, prefer client-side).

### Batch PDF (Legacy)

`POST /api/worksheets/[id]/pdf/batch`

Server-side batch PDF generation.

---

## Error Responses

### 400 Bad Request

Validation error:

```json
{
	"message": "Validation failed: title: String must contain at least 1 character(s)"
}
```

### 401 Unauthorized

Not authenticated.

### 403 Forbidden

Insufficient permissions.

### 404 Not Found

Resource not found:

```json
{
	"message": "Worksheet not found"
}
```

### 500 Internal Server Error

Server error:

```json
{
	"message": "Failed to create worksheet"
}
```

---

## Validation Schemas

Key Zod schemas from `src/lib/server/validation/worksheets.ts`:

```typescript
// Create worksheet
export const createWorksheetSchema = z.object({
	title: z.string().trim().min(1).max(200),
	description: z.string().trim().max(5000).optional().nullable(),
	type: worksheetTypeSchema.default('worksheet'),
	config: worksheetConfigSchema,
	template_id: uuidSchema.optional().nullable(),
	estimated_duration_minutes: z.number().int().positive().max(600).optional().nullable(),
	grade_levels: z.array(z.string().trim().min(1).max(10)).max(20).optional().default([]),
	tags: z.array(z.string().trim().min(1).max(50)).max(30).optional().default([])
});

// Variant config
export const variantConfigSchema = z
	.object({
		mode: variantModeSchema.optional(),
		n_versions: z.number().int().positive().max(50).optional(),
		group_size: z.number().int().positive().max(100).optional(),
		seed_base: z.number().int().optional(),
		parameter_overrides: z.record(z.string(), z.unknown()).optional()
	})
	.optional()
	.default({});
```

---

## Rate Limits

No specific rate limits beyond standard API limits.

---

## Examples

### Create and Configure Worksheet

```typescript
// 1. Create worksheet
const { worksheet } = await fetch('/api/worksheets', {
	method: 'POST',
	body: JSON.stringify({
		title: 'Controle algebre',
		type: 'assessment',
		estimated_duration_minutes: 45
	})
}).then((r) => r.json());

// 2. Create section
await fetch(`/api/worksheets/${worksheet.id}/sections`, {
	method: 'POST',
	body: JSON.stringify({
		title: 'Equations',
		position: 0
	})
});

// 3. Add exercises
await fetch(`/api/worksheets/${worksheet.id}/exercises`, {
	method: 'POST',
	body: JSON.stringify({
		exercise_id: 'exercise-uuid',
		position: 0,
		points: 5,
		variant_mode: 'individual'
	})
});

// 4. Publish
await fetch(`/api/worksheets/${worksheet.id}`, {
	method: 'PUT',
	body: JSON.stringify({ status: 'published' })
});
```
