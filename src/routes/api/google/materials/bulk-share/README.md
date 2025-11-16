# Bulk Material Sharing API

## Endpoint

`POST /api/google/materials/bulk-share`

## Purpose

Share multiple Google Classroom course work materials with multiple UbuMaths classes in a single request. This is useful for operations like "Share all materials in a topic" or "Share selected materials with multiple classes".

## Authentication

Requires teacher role (verified via `requireRole(locals, 'teacher')`)

## Request Body

```typescript
{
  materialIds: string[],           // Array of material UUIDs (min: 1, max: 50)
  classIds: string[],              // Array of class UUIDs (min: 1, max: 50)
  categoryId?: string | null,      // Optional UbuMaths category UUID
  topicId?: string | null,         // Optional Google Classroom topic UUID
  descriptionOverride?: string | null,  // Optional custom description (max 5000 chars)
  visible: boolean                 // Whether students can see the materials (default: true)
}
```

## Response

### Success (200)

```typescript
{
  success: true,
  materialsShared: number,    // Number of unique materials shared
  sharesCreated: number       // Total number of share records created (materials × classes)
}
```

### Error Responses

- `400 Bad Request` - Invalid request body (Zod validation failed)
- `403 Forbidden` - User doesn't own all materials or classes
- `404 Not Found` - One or more materials not found
- `500 Internal Server Error` - Database operation failed

## Security Features

1. **Teacher Role Required**: Only teachers can share materials
2. **Material Ownership Verification**: All materials must belong to the teacher
3. **Class Ownership Verification**: All classes must belong to the teacher
4. **Input Validation**: All inputs validated with Zod schema
5. **DoS Prevention**: Maximum 50 materials and 50 classes per request
6. **Audit Logging**: Unauthorized access attempts are logged

## Implementation Details

### Bulk Operations

The endpoint creates a Cartesian product of materials and classes:

- 3 materials × 2 classes = 6 share records
- Uses Supabase `.upsert()` with `onConflict: 'material_id,class_id'` to handle duplicates

### Query Optimization

- Single query to fetch all materials (using `.in()`)
- Single query to verify all classes (using `.in()`)
- Bulk insert using `.upsert()` for all combinations

### Fail-Fast Behavior

- If ANY material doesn't exist → 404 error (no partial success)
- If ANY material isn't owned by teacher → 403 error
- If ANY class doesn't exist or is archived → 400 error
- If ANY class isn't owned by teacher → 403 error

## Example Usage

### Share 3 materials with 2 classes

```typescript
const response = await fetch('/api/google/materials/bulk-share', {
	method: 'POST',
	headers: { 'Content-Type': 'application/json' },
	body: JSON.stringify({
		materialIds: ['a1b2c3d4-...', 'e5f6g7h8-...', 'i9j0k1l2-...'],
		classIds: ['m3n4o5p6-...', 'q7r8s9t0-...'],
		categoryId: 'u1v2w3x4-...',
		topicId: 'y5z6a7b8-...',
		descriptionOverride: 'These materials are for homework review',
		visible: true
	})
});

const result = await response.json();
// { success: true, materialsShared: 3, sharesCreated: 6 }
```

## Related Endpoints

- `POST /api/google/materials/[id]/share` - Share a single material with multiple classes
- `DELETE /api/google/materials/[id]/share` - Unshare a single material from classes
- `GET /api/student/shared-materials` - List materials shared with student

## Database Schema

Uses the `shared_materials` table with unique constraint on `(material_id, class_id)`.

See [docs/architecture/database-schema.md](../../../../../docs/architecture/database-schema.md#shared_materials) for details.
