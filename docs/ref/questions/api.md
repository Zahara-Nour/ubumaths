# API Endpoints

> Endpoints REST pour la gestion des templates et la generation d'instances.

---

## Vue d'ensemble

**Base URL** : `/api/questions/`

| Methode | Endpoint          | Description            |
| ------- | ----------------- | ---------------------- |
| GET     | `/templates`      | Liste paginee          |
| POST    | `/templates`      | Creer template         |
| GET     | `/templates/all`  | Tous (sans pagination) |
| GET     | `/templates/[id]` | Obtenir un template    |
| PUT     | `/templates/[id]` | Mettre a jour          |
| DELETE  | `/templates/[id]` | Supprimer              |
| POST    | `/generate/[id]`  | Generer instance       |
| GET     | `/categories`     | Liste categories       |
| GET     | `/categories/all` | Toutes categories      |

---

## Authentification

Tous les endpoints necessitent une authentification.

### Roles requis

| Endpoint          | Roles              |
| ----------------- | ------------------ |
| GET (lecture)     | `teacher`, `admin` |
| POST, PUT, DELETE | `admin`            |

### Verification

```typescript
// Dans +server.ts
import { requireRoles } from '$lib/server/auth';

export const GET: RequestHandler = async ({ locals }) => {
	requireRoles(locals, ['teacher', 'admin']);
	// ...
};
```

---

## Templates CRUD

### GET /templates

Liste paginee des templates.

**Query Parameters** :

| Param    | Type   | Description                          |
| -------- | ------ | ------------------------------------ |
| `page`   | number | Page (defaut: 1)                     |
| `limit`  | number | Elements/page (defaut: 20, max: 100) |
| `type`   | string | Filtrer par type                     |
| `grade`  | string | Filtrer par niveau                   |
| `theme`  | string | Filtrer par theme                    |
| `domain` | string | Filtrer par domaine                  |
| `status` | string | draft \| published                   |
| `search` | string | Recherche titre/description          |

**Response** :

```typescript
{
  templates: QuestionTemplate[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }
}
```

**Exemple** :

```bash
GET /api/questions/templates?page=1&limit=10&grade=6&theme=Arithmetique
```

---

### POST /templates

Creer un nouveau template.

**Request Body** :

```typescript
{
  type: QuestionType;
  title: string;
  description?: string;
  variations: QuestionVariation[];
  shared?: SharedVariationDefaults;
  grades: GradeLevel[];
  theme: string;
  domain: string;
  subdomain?: string;
  level: number;
  status?: 'draft' | 'published';
  options?: QuestionOptions;
  precision?: PrecisionType;
  // Type-specifique
  transformType?: AlgebraicTransformType;
  multipleAnswers?: boolean;
  delay?: number;
}
```

**Response** (201 Created) :

```typescript
{
	id: string;
	// ... template complet
}
```

**Validation Zod** :

```typescript
const createSchema = z.object({
	type: z.enum([
		'numerical_exact',
		'numerical_decimal',
		'numerical_rounded',
		'numerical_with_unit',
		'algebraic_transform',
		'multiple_choice',
		'fill_in_blanks'
	]),
	title: z.string().min(1).max(200),
	description: z.string().max(1000).optional(),
	variations: z.array(variationSchema).min(1),
	grades: z.array(z.enum(['6', '5', '4', '3', '2', '1', 'T'])).min(1),
	theme: z.string().min(1).max(100),
	domain: z.string().min(1).max(100),
	subdomain: z.string().max(100).optional(),
	level: z.number().int().min(1).max(10),
	status: z.enum(['draft', 'published']).default('draft')
	// ...
});
```

---

### GET /templates/all

Tous les templates sans pagination.

**Query Parameters** :

| Param    | Type   | Description                            |
| -------- | ------ | -------------------------------------- |
| `status` | string | draft \| published (defaut: published) |

**Response** :

```typescript
{
  templates: QuestionTemplate[];
}
```

**Usage** : Pour l'interface admin ou le cache client.

---

### GET /templates/[id]

Obtenir un template par ID.

**Response** :

```typescript
QuestionTemplate;
```

**Erreurs** :

| Code | Description            |
| ---- | ---------------------- |
| 404  | Template non trouve    |
| 400  | ID invalide (non-UUID) |

---

### PUT /templates/[id]

Mettre a jour un template.

**Request Body** : Partiel (seuls les champs a modifier)

```typescript
{
  title?: string;
  variations?: QuestionVariation[];
  status?: 'draft' | 'published';
  // ...
}
```

**Response** :

```typescript
QuestionTemplate; // Template mis a jour
```

---

### DELETE /templates/[id]

Supprimer un template.

**Response** (204 No Content) : Succes sans body

**Verification** : Verifie qu'aucune carte SRS n'utilise ce template.

---

## Generation

### POST /generate/[id]

Generer une instance a partir d'un template.

**Request Body** :

```typescript
{
  seed?: number;  // Optionnel, pour generation deterministe
}
```

**Response** :

```typescript
// Succes
{
  success: true;
  instance: QuestionInstance;
}

// Echec
{
  success: false;
  errors: string[];
}
```

**Exemple** :

```bash
# Aleatoire
POST /api/questions/generate/abc123
{}

# Deterministe
POST /api/questions/generate/abc123
{ "seed": 42 }
```

---

## Categories

### GET /categories

Liste des categories avec comptage.

**Response** :

```typescript
{
  categories: {
    theme: string;
    domains: {
      name: string;
      subdomains: string[];
      count: number;
    }[];
    totalCount: number;
  }[];
}
```

### GET /categories/all

Structure hierarchique complete.

**Response** :

```typescript
{
  themes: string[];
  domains: Record<string, string[]>;  // theme -> domains
  subdomains: Record<string, string[]>;  // domain -> subdomains
}
```

---

## Codes d'erreur

| Code | Description                   |
| ---- | ----------------------------- |
| 200  | Succes                        |
| 201  | Cree                          |
| 204  | Succes sans contenu           |
| 400  | Requete invalide (validation) |
| 401  | Non authentifie               |
| 403  | Non autorise (role)           |
| 404  | Non trouve                    |
| 500  | Erreur serveur                |

### Format erreur

```typescript
{
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}
```

---

## Exemples TypeScript

### Fetch templates

```typescript
async function fetchTemplates(filters: { grade?: string; theme?: string; page?: number }) {
	const params = new URLSearchParams();
	if (filters.grade) params.set('grade', filters.grade);
	if (filters.theme) params.set('theme', filters.theme);
	if (filters.page) params.set('page', String(filters.page));

	const response = await fetch(`/api/questions/templates?${params}`);
	if (!response.ok) throw new Error('Failed to fetch templates');

	return response.json();
}
```

### Creer template

```typescript
async function createTemplate(template: Omit<QuestionTemplate, 'id'>) {
	const response = await fetch('/api/questions/templates', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(template)
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message);
	}

	return response.json();
}
```

### Generer instance

```typescript
async function generateInstance(templateId: string, seed?: number) {
	const response = await fetch(`/api/questions/generate/${templateId}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ seed })
	});

	const result = await response.json();

	if (!result.success) {
		throw new Error(result.errors.join(', '));
	}

	return result.instance;
}
```

---

## Validation Zod (serveur)

**Fichier** : `src/lib/server/validation/question-schemas.ts`

```typescript
import { z } from 'zod';

// Variation
const variationSchema = z.object({
  statement: z.string().min(1),
  variables: z.array(z.object({
    name: z.string().min(1).max(50),
    expression: z.string().min(1)
  })).optional(),
  solution: z.union([z.string(), z.array(z.string())]),
  correction: z.object({
    feedback: z.object({
      correct: z.string().optional(),
      incorrect: z.string().optional(),
      partial: z.string().optional()
    }).optional(),
    steps: z.array(z.string()).optional()
  }).optional(),
  choices: z.array(z.object({
    content: z.string(),
    isCorrect: z.boolean()
  })).optional(),
  blanks: z.array(z.object({
    position: z.number().int().min(0),
    expectedAnswer: z.string()
  })).optional()
});

// Template complet
export const questionTemplateSchema = z.object({
  type: z.enum([...]),
  title: z.string().min(1).max(200),
  variations: z.array(variationSchema).min(1),
  grades: z.array(gradeSchema).min(1),
  theme: z.string().min(1).max(100),
  domain: z.string().min(1).max(100),
  level: z.number().int().min(1).max(10),
  // ...
});
```

---

## Rate Limiting

| Endpoint  | Limite      |
| --------- | ----------- |
| GET       | 100 req/min |
| POST      | 20 req/min  |
| PUT       | 20 req/min  |
| DELETE    | 10 req/min  |
| /generate | 50 req/min  |

---

## Fichiers source

| Fichier                                              | Description      |
| ---------------------------------------------------- | ---------------- |
| `src/routes/api/questions/templates/+server.ts`      | GET, POST        |
| `src/routes/api/questions/templates/all/+server.ts`  | GET all          |
| `src/routes/api/questions/templates/[id]/+server.ts` | GET, PUT, DELETE |
| `src/routes/api/questions/generate/[id]/+server.ts`  | POST generate    |
| `src/routes/api/questions/categories/+server.ts`     | GET categories   |
| `src/lib/server/validation/question-schemas.ts`      | Schemas Zod      |

---

## Voir aussi

- [templates.md](templates.md) - Structure templates
- [generation.md](generation.md) - Pipeline generation
- [../../claude/database.md](../../claude/database.md) - Supabase
