# VIP Card Admin API Endpoints Reference

## Overview

RESTful API endpoints for VIP card template, configuration, and teacher override management.

---

## Admin Endpoints

### Template Management

#### Create Template

```
POST /api/admin/vip-cards/templates
Authorization: Admin only
```

**Request Body**:

```json
{
	"id": "super-bonus",
	"name": "Super Bonus",
	"description": "Double gidouilles for one week",
	"rarity": "epic",
	"category": "bonus",
	"isEnabled": true,
	"imagePath": "/images/vip-cards/super-bonus@0.5x.webp",
	"action": {
		"type": "add_gidouilles",
		"amount": 50
	},
	"sortOrder": 10
}
```

**Response**: `201 Created`

```json
{
	"id": "super-bonus",
	"name": "Super Bonus",
	"description": "Double gidouilles for one week",
	"rarity": "epic",
	"category": "bonus",
	"isEnabled": true,
	"imagePath": "/images/vip-cards/super-bonus@0.5x.webp",
	"action": {
		"type": "add_gidouilles",
		"amount": 50
	},
	"sortOrder": 10,
	"createdAt": "2025-01-31T12:00:00Z"
}
```

---

#### List Templates

```
GET /api/admin/vip-cards/templates
Authorization: Admin only
```

**Response**: `200 OK`

```json
[
	{
		"id": "super-bonus",
		"name": "Super Bonus",
		"rarity": "epic",
		"category": "bonus",
		"isEnabled": true,
		"imagePath": "/images/vip-cards/super-bonus@0.5x.webp",
		"sortOrder": 10,
		"createdAt": "2025-01-31T12:00:00Z"
	}
]
```

---

#### Update Template

```
PATCH /api/admin/vip-cards/templates/{id}
Authorization: Admin only
```

**Request Body** (partial update):

```json
{
	"name": "Mega Bonus",
	"isEnabled": false,
	"sortOrder": 20
}
```

**Response**: `200 OK`

```json
{
  "id": "super-bonus",
  "name": "Mega Bonus",
  "isEnabled": false,
  "sortOrder": 20,
  ...
}
```

---

#### Delete Template

```
DELETE /api/admin/vip-cards/templates/{id}
Authorization: Admin only
```

**Response**: `200 OK`

```json
{
	"success": true,
	"message": "Template \"super-bonus\" deleted successfully"
}
```

**Error**: `409 Conflict` (if template has instances)

```json
{
	"message": "Cannot delete template with 15 existing instance(s). Disable it instead."
}
```

---

#### Upload Card Image

```
POST /api/admin/vip-cards/templates/{id}/image
Authorization: Admin only
Content-Type: multipart/form-data
```

**Request Body**:

```
image: <File> (WebP, max 2MB)
```

**Response**: `200 OK`

```json
{
	"publicUrl": "https://supabase.co/storage/v1/object/public/vip-card-images/super-bonus@0.5x.webp",
	"imagePath": "/images/vip-cards/super-bonus@0.5x.webp"
}
```

---

### Config Management

#### Create Config

```
POST /api/admin/vip-cards/configs
Authorization: Admin only
```

**Request Body**:

```json
{
	"configName": "Holiday Event",
	"commonProbability": 50,
	"rareProbability": 30,
	"epicProbability": 15,
	"legendaryProbability": 5,
	"description": "Special holiday card distribution",
	"validFrom": "2024-12-20T00:00:00Z",
	"validUntil": "2025-01-05T23:59:59Z"
}
```

**Note**: Probabilities must sum to exactly 100

**Response**: `201 Created`

```json
{
	"id": 1,
	"configName": "Holiday Event",
	"commonProbability": 50,
	"rareProbability": 30,
	"epicProbability": 15,
	"legendaryProbability": 5,
	"isActive": false,
	"description": "Special holiday card distribution",
	"validFrom": "2024-12-20T00:00:00Z",
	"validUntil": "2025-01-05T23:59:59Z",
	"createdAt": "2025-01-31T12:00:00Z",
	"updatedAt": "2025-01-31T12:00:00Z"
}
```

---

#### List Configs

```
GET /api/admin/vip-cards/configs
Authorization: Admin only
```

**Response**: `200 OK`

```json
[
  {
    "id": 1,
    "configName": "Holiday Event",
    "isActive": true,
    "commonProbability": 50,
    "rareProbability": 30,
    "epicProbability": 15,
    "legendaryProbability": 5,
    "createdAt": "2025-01-31T12:00:00Z"
  },
  {
    "id": 2,
    "configName": "Default",
    "isActive": false,
    ...
  }
]
```

---

#### Update Config

```
PATCH /api/admin/vip-cards/configs/{id}
Authorization: Admin only
```

**Request Body** (partial update):

```json
{
	"configName": "Extended Holiday Event",
	"validUntil": "2025-01-10T23:59:59Z"
}
```

**Note**: If updating probabilities, all four must be provided and sum to 100

**Response**: `200 OK`

```json
{
  "id": 1,
  "configName": "Extended Holiday Event",
  "validUntil": "2025-01-10T23:59:59Z",
  ...
}
```

---

#### Delete Config

```
DELETE /api/admin/vip-cards/configs/{id}
Authorization: Admin only
```

**Response**: `200 OK`

```json
{
	"success": true,
	"message": "Config \"Holiday Event\" deleted successfully"
}
```

**Error**: `400 Bad Request` (if config is active)

```json
{
	"message": "Cannot delete active config. Deactivate it first."
}
```

---

#### Activate Config

```
PATCH /api/admin/vip-cards/configs/{id}/activate
Authorization: Admin only
```

**Response**: `200 OK`

```json
{
  "id": 1,
  "configName": "Holiday Event",
  "isActive": true,
  ...
}
```

**Note**: Atomic operation - deactivates all other configs

---

## Teacher Endpoints

### Override Management

#### Get Teacher Overrides

```
GET /api/teacher/vip-cards/overrides
Authorization: Teacher or Admin
```

**Response**: `200 OK`

```json
{
  "overrides": [
    {
      "cardId": "super-bonus",
      "cardName": "Super Bonus",
      "isEnabled": true
    },
    {
      "cardId": "warning-remover",
      "cardName": "Warning Remover",
      "isEnabled": false
    }
  ],
  "templates": [
    {
      "id": "super-bonus",
      "name": "Super Bonus",
      "rarity": "epic",
      ...
    }
  ]
}
```

---

#### Update Teacher Overrides

```
PUT /api/teacher/vip-cards/overrides
Authorization: Teacher or Admin
```

**Request Body**:

```json
{
	"overrides": [
		{ "cardId": "super-bonus", "isEnabled": true },
		{ "cardId": "warning-remover", "isEnabled": false },
		{ "cardId": "extra-draw", "isEnabled": true }
	]
}
```

**Note**: 1-50 overrides at once

**Response**: `200 OK`

```json
{
	"success": true,
	"message": "3 override(s) updated successfully",
	"overrides": [
		{
			"cardId": "super-bonus",
			"cardName": "Super Bonus",
			"isEnabled": true
		},
		{
			"cardId": "warning-remover",
			"cardName": "Warning Remover",
			"isEnabled": false
		},
		{
			"cardId": "extra-draw",
			"cardName": "Extra Draw",
			"isEnabled": true
		}
	]
}
```

---

#### Get Global Config

```
GET /api/teacher/vip-cards/global-config
Authorization: Teacher or Admin
```

**Response**: `200 OK`

```json
{
	"id": 1,
	"configName": "Holiday Event",
	"commonProbability": 50,
	"rareProbability": 30,
	"epicProbability": 15,
	"legendaryProbability": 5,
	"isActive": true,
	"validFrom": "2024-12-20T00:00:00Z",
	"validUntil": "2025-01-05T23:59:59Z"
}
```

**Note**: Read-only - only admins can modify configs

---

## Error Responses

All endpoints return consistent error formats:

### 400 Bad Request

```json
{
	"message": "Name is required"
}
```

### 401 Unauthorized

```json
{
	"message": "Authentication required"
}
```

### 403 Forbidden

```json
{
	"message": "Admin access required"
}
```

### 404 Not Found

```json
{
	"message": "Template with ID \"super-bonus\" not found"
}
```

### 409 Conflict

```json
{
	"message": "Cannot delete template with 15 existing instance(s). Disable it instead."
}
```

### 500 Internal Server Error

```json
{
	"message": "Internal server error"
}
```

---

## Validation Rules

### Template ID

- Lowercase alphanumeric with hyphens (kebab-case)
- 1-50 characters
- Must be unique
- Example: `super-bonus`, `warning-remover-3x`

### Rarity

- Enum: `"common"`, `"rare"`, `"epic"`, `"legendary"`

### Category

- Enum: `"bonus"`, `"privilege"`, `"social"`, `"power"`

### Action Type

- Enum: `"draw_cards"`, `"remove_warnings"`, `"exchange_cards"`, `"add_gidouilles"`

### Probabilities

- Integer: 0-100
- Must sum to exactly 100%
- All four must be updated together

### Image Upload

- Format: WebP only (`image/webp`)
- Size: Max 2MB
- Filename: `{card-id}@0.5x.webp`

---

## Rate Limiting

**Recommended limits**:

- Admin endpoints: 100 requests/minute
- Teacher endpoints: 60 requests/minute
- Image upload: 10 requests/minute

---

## Authentication

All endpoints require authentication via Supabase Auth:

```
Authorization: Bearer <jwt-token>
```

Token obtained via Supabase client:

```typescript
const session = await supabase.auth.getSession();
const token = session.data.session?.access_token;
```

---

## Example Usage

### cURL Example

```bash
# Create a template
curl -X POST https://ubumaths.com/api/admin/vip-cards/templates \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "super-bonus",
    "name": "Super Bonus",
    "description": "Double gidouilles",
    "rarity": "epic",
    "category": "bonus",
    "isEnabled": true,
    "imagePath": "/images/vip-cards/super-bonus@0.5x.webp",
    "sortOrder": 10
  }'
```

### JavaScript/TypeScript Example

```typescript
// Using SvelteKit fetch
const response = await fetch('/api/admin/vip-cards/templates', {
	method: 'POST',
	headers: {
		'Content-Type': 'application/json'
	},
	body: JSON.stringify({
		id: 'super-bonus',
		name: 'Super Bonus',
		description: 'Double gidouilles',
		rarity: 'epic',
		category: 'bonus',
		isEnabled: true,
		imagePath: '/images/vip-cards/super-bonus@0.5x.webp',
		sortOrder: 10
	})
});

if (!response.ok) {
	const error = await response.json();
	console.error('Error:', error.message);
} else {
	const template = await response.json();
	console.log('Created:', template);
}
```

---

**Last Updated**: 2025-01-31
**API Version**: 1.0
**Base URL**: `/api`
