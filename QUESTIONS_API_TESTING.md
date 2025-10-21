# Question Bank API - Testing Guide

This guide provides example API calls for testing all Question Bank endpoints.

## Prerequisites

1. **Dev server running**: `pnpm dev` (http://localhost:5174)
2. **Authenticated as admin**: Log in via UI first to get session cookie
3. **Tool**: Use Bruno, Postman, or curl with cookies

---

## Get Session Cookie (Login First)

Before testing API endpoints, you need to authenticate:

1. Open http://localhost:5174/auth/login
2. Log in with an admin account
3. Open DevTools → Application → Cookies
4. Copy the cookie value for future requests

Or use curl with cookie storage:

```bash
# Store cookies in a file
curl -c cookies.txt -X POST http://localhost:5174/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@voltairedoha.com","password":"your_password"}'
```

---

## 1. List Templates (GET /api/questions/templates)

### Get all templates

```bash
curl http://localhost:5174/api/questions/templates \
  -H "Cookie: $(cat cookies.txt)"
```

### Filter by type

```bash
curl "http://localhost:5174/api/questions/templates?type=numerical_exact" \
  -H "Cookie: $(cat cookies.txt)"
```

### Filter by grades

```bash
curl "http://localhost:5174/api/questions/templates?grades=6,5" \
  -H "Cookie: $(cat cookies.txt)"
```

### With pagination

```bash
curl "http://localhost:5174/api/questions/templates?limit=10&offset=0" \
  -H "Cookie: $(cat cookies.txt)"
```

**Expected Response**:

```json
{
	"templates": [
		{
			"id": "uuid",
			"type": "numerical_exact",
			"statement": [{ "type": "text", "content": "..." }],
			"variables": [],
			"answer": "42",
			"precision": { "type": "none" },
			"grades": ["6"],
			"created_at": "2025-10-19T...",
			"updated_at": "2025-10-19T...",
			"created_by": "uuid"
		}
	],
	"total": 1
}
```

---

## 2. Create Template (POST /api/questions/templates)

### Simple numerical question

```bash
curl -X POST http://localhost:5174/api/questions/templates \
  -H "Content-Type: application/json" \
  -H "Cookie: $(cat cookies.txt)" \
  -d '{
    "type": "numerical_exact",
    "statement": [
      {
        "type": "text",
        "content": "Calculate 2 + 3"
      }
    ],
    "variables": [],
    "answer": "5",
    "precision": {
      "type": "none"
    },
    "grades": ["6"]
  }'
```

### With variables and random generation

```bash
curl -X POST http://localhost:5174/api/questions/templates \
  -H "Content-Type: application/json" \
  -H "Cookie: $(cat cookies.txt)" \
  -d '{
    "type": "numerical_exact",
    "statement": [
      {
        "type": "text",
        "content": "Calculate {@:a} + {@:b}"
      }
    ],
    "variables": [
      {
        "name": "a",
        "expression": "{#:1-10}"
      },
      {
        "name": "b",
        "expression": "{#:1-10}"
      }
    ],
    "answer": "{eval:{@:a} + {@:b}}",
    "precision": {
      "type": "none"
    },
    "grades": ["6", "5"]
  }'
```

### Fraction addition with exclusions

```bash
curl -X POST http://localhost:5174/api/questions/templates \
  -H "Content-Type: application/json" \
  -H "Cookie: $(cat cookies.txt)" \
  -d '{
    "type": "numerical_exact",
    "statement": [
      {
        "type": "text",
        "content": "Calculer: $$\\frac{{@:num1}}{{@:den}} + \\frac{{@:num2}}{{@:den}}$$"
      }
    ],
    "variables": [
      {
        "name": "den",
        "expression": "{#:2-9}"
      },
      {
        "name": "num1",
        "expression": "{#:1-{@:den}-1}"
      },
      {
        "name": "num2",
        "expression": "{#:1-{@:den}-1!{@:num1}}"
      }
    ],
    "answer": "{eval:({@:num1}+{@:num2})/{@:den}}",
    "precision": {
      "type": "decimal",
      "digits": 3
    },
    "grades": ["6", "5"]
  }'
```

### Multiple choice question

```bash
curl -X POST http://localhost:5174/api/questions/templates \
  -H "Content-Type: application/json" \
  -H "Cookie: $(cat cookies.txt)" \
  -d '{
    "type": "multiple_choice",
    "statement": [
      {
        "type": "text",
        "content": "What is 2 + 2?"
      }
    ],
    "variables": [],
    "answer": "0",
    "choices": ["4", "5", "3", "6"],
    "multiple_answers": false,
    "grades": ["6"]
  }'
```

**Expected Response (Success)**:

```json
{
  "success": true,
  "template": {
    "id": "new-uuid",
    "type": "numerical_exact",
    "statement": [...],
    "variables": [...],
    "answer": "...",
    "created_at": "2025-10-19T...",
    "updated_at": "2025-10-19T...",
    "created_by": "admin-uuid"
  }
}
```

**Expected Response (Validation Error)**:

```json
{
	"success": false,
	"errors": ["Missing required field: statement", "Missing required field: answer"]
}
```

**Expected Response (Circular Dependency)**:

```json
{
	"success": false,
	"errors": ["Circular reference detected: a -> b -> a"]
}
```

---

## 3. Get Single Template (GET /api/questions/templates/[id])

```bash
# Replace TEMPLATE_ID with actual UUID
curl http://localhost:5174/api/questions/templates/TEMPLATE_ID \
  -H "Cookie: $(cat cookies.txt)"
```

**Expected Response**:

```json
{
  "id": "template-uuid",
  "type": "numerical_exact",
  "statement": [...],
  "variables": [...],
  "answer": "...",
  "precision": {...},
  "grades": [...],
  "created_at": "2025-10-19T...",
  "updated_at": "2025-10-19T...",
  "created_by": "admin-uuid"
}
```

**Expected Response (Not Found)**:

```
404 Not Found
Template not found
```

---

## 4. Update Template (PUT /api/questions/templates/[id])

```bash
# Replace TEMPLATE_ID with actual UUID
curl -X PUT http://localhost:5174/api/questions/templates/TEMPLATE_ID \
  -H "Content-Type: application/json" \
  -H "Cookie: $(cat cookies.txt)" \
  -d '{
    "type": "numerical_exact",
    "statement": [
      {
        "type": "text",
        "content": "Updated question: Calculate {@:a} × {@:b}"
      }
    ],
    "variables": [
      {
        "name": "a",
        "expression": "{#:1-10}"
      },
      {
        "name": "b",
        "expression": "{#:1-10}"
      }
    ],
    "answer": "{eval:{@:a} * {@:b}}",
    "precision": {
      "type": "none"
    },
    "grades": ["6", "5", "4"]
  }'
```

**Expected Response**:

```json
{
  "success": true,
  "template": {
    "id": "template-uuid",
    "type": "numerical_exact",
    "statement": [...],
    "updated_at": "2025-10-19T... (new timestamp)",
    ...
  }
}
```

---

## 5. Delete Template (DELETE /api/questions/templates/[id])

```bash
# Replace TEMPLATE_ID with actual UUID
curl -X DELETE http://localhost:5174/api/questions/templates/TEMPLATE_ID \
  -H "Cookie: $(cat cookies.txt)"
```

**Expected Response**:

```json
{
	"success": true
}
```

**Expected Response (Not Found)**:

```
404 Not Found
Template not found
```

---

## 6. Generate Instance (POST /api/questions/generate/[id])

### Generate with random seed

```bash
# Replace TEMPLATE_ID with actual UUID
curl -X POST http://localhost:5174/api/questions/generate/TEMPLATE_ID \
  -H "Content-Type: application/json" \
  -H "Cookie: $(cat cookies.txt)"
```

### Generate with specific seed (reproducible)

```bash
curl -X POST http://localhost:5174/api/questions/generate/TEMPLATE_ID \
  -H "Content-Type: application/json" \
  -H "Cookie: $(cat cookies.txt)" \
  -d '{
    "seed": 12345
  }'
```

**Expected Response (Success)**:

```json
{
	"success": true,
	"instance": {
		"id": "template-uuid",
		"type": "numerical_exact",
		"statement": [
			{
				"type": "text",
				"content": "Calculate 7 + 3" // Variables resolved
			}
		],
		"answer": 10, // Evaluated answer
		"resolvedVariables": {
			"a": 7,
			"b": 3
		},
		"precision": { "type": "none" },
		"grades": ["6"],
		"seed": 12345
	}
}
```

**Expected Response (Error)**:

```json
{
	"success": false,
	"errors": ["Circular reference detected: a -> b -> a"]
}
```

### Verify Seed Reproducibility

Generate the same instance twice:

```bash
# First generation
curl -X POST http://localhost:5174/api/questions/generate/TEMPLATE_ID \
  -H "Content-Type: application/json" \
  -H "Cookie: $(cat cookies.txt)" \
  -d '{"seed": 99999}' > instance1.json

# Second generation
curl -X POST http://localhost:5174/api/questions/generate/TEMPLATE_ID \
  -H "Content-Type: application/json" \
  -H "Cookie: $(cat cookies.txt)" \
  -d '{"seed": 99999}' > instance2.json

# Compare (should be identical)
diff instance1.json instance2.json
```

---

## Testing Checklist

### Authentication & Authorization

- [ ] GET templates as admin → Success
- [ ] GET templates as teacher → Success
- [ ] GET templates as student → 403 Forbidden
- [ ] POST template as admin → Success
- [ ] POST template as teacher → 403 Forbidden
- [ ] PUT template as admin → Success
- [ ] PUT template as teacher → 403 Forbidden
- [ ] DELETE template as admin → Success
- [ ] DELETE template as teacher → 403 Forbidden
- [ ] Generate instance as teacher → Success
- [ ] Generate instance as student → 403 Forbidden

### Validation

- [ ] Create template with missing statement → 400 + error list
- [ ] Create template with missing answer → 400 + error list
- [ ] Create template with empty grades → 400 + error list
- [ ] Create template with circular variables → 400 + error list
- [ ] Create algebraic_transform without transform_type → 400
- [ ] Create multiple_choice with <2 choices → 400
- [ ] Create fill_in_blanks without blanks → 400

### CRUD Operations

- [ ] Create template → Verify in database
- [ ] Get all templates → Contains new template
- [ ] Get single template → Returns correct template
- [ ] Update template → Changes persist
- [ ] Delete template → Template removed
- [ ] Get deleted template → 404

### Instance Generation

- [ ] Generate from numerical_exact template → Success
- [ ] Generate from algebraic_transform template → Success
- [ ] Generate from fill_in_blanks template → Success
- [ ] Generate from multiple_choice template → Choices shuffled
- [ ] Generate with seed 12345 twice → Identical instances
- [ ] Generate with different seeds → Different instances
- [ ] Generate from template with variables → Variables resolved
- [ ] Generate from template with eval → Expression evaluated
- [ ] Generate from template with exclusions → Exclusions respected

### Edge Cases

- [ ] List templates with pagination → Correct subset
- [ ] Filter by type=numerical_exact → Only numerical templates
- [ ] Filter by grades=6,5 → Templates for those grades
- [ ] Update non-existent template → 404
- [ ] Delete non-existent template → 404
- [ ] Generate from non-existent template → 404

---

## Using Bruno (Recommended)

Bruno is a modern API client similar to Postman but with Git-friendly text files.

### Install Bruno

```bash
brew install bruno  # macOS
```

### Import Collection

1. Create a new Bruno collection: `Questions API`
2. Add requests for each endpoint above
3. Set environment variable: `baseUrl=http://localhost:5174`
4. Use `{{baseUrl}}/api/questions/templates` in requests

### Example Bruno Request (Create Template)

```
POST {{baseUrl}}/api/questions/templates
Content-Type: application/json

{
  "type": "numerical_exact",
  "statement": [
    {"type": "text", "content": "Calculate {@:a} + {@:b}"}
  ],
  "variables": [
    {"name": "a", "expression": "{#:1-10}"},
    {"name": "b", "expression": "{#:1-10}"}
  ],
  "answer": "{eval:{@:a} + {@:b}}",
  "precision": {"type": "none"},
  "grades": ["6"]
}
```

---

## Troubleshooting

### "Unauthorized" Error

**Problem**: API returns 401 Unauthorized

**Solution**:

1. Make sure you're logged in at http://localhost:5174/auth/login
2. Copy session cookie from browser
3. Include cookie in curl: `-H "Cookie: your_cookie_here"`

### "Only admins can create question templates"

**Problem**: API returns 403 Forbidden

**Solution**:

1. Log in with an admin account (not teacher or student)
2. Check profile role in database: `SELECT role FROM profiles WHERE id = 'your-id'`

### Template Not Found (404)

**Problem**: GET/PUT/DELETE returns 404

**Solution**:

1. Verify template ID exists: `SELECT id FROM question_templates`
2. Check UUID format is correct (lowercase with hyphens)

### Validation Errors

**Problem**: POST/PUT returns 400 with errors

**Solution**:

1. Read error messages carefully
2. Check required fields are present (statement, answer, grades)
3. Verify types match (e.g., answer is string for numerical, array for fill-in-blanks)
4. Test variables don't have circular references

---

## Next Steps After Testing

Once all API endpoints are tested and working:

1. **Run unit tests**: `pnpm test:unit questions`
2. **Test admin UI**: Navigate to `/dashboard/admin/questions`
3. **Create real templates**: Add 5-10 templates for different question types
4. **Seed database**: Use migration 071 templates as starting point
5. **Build student interface**: Display and answer questions
6. **Create assignment system**: Assign questions to students

---

**Last Updated**: 2025-10-19
