---
description: Creer un nouvel endpoint API avec validation Zod, types, et tests
allowed-tools: Bash, Read, Write, Edit, Grep, Glob, Task, TodoWrite
argument-hint: [chemin-api] [GET|POST|PUT|PATCH|DELETE]
---

# Creer l'endpoint : $2 /api/$1

Tu crees un nouvel endpoint API en respectant TOUS les standards UbuMaths.

## Phase 1 : Preparation

### Etape 1 : Structure des fichiers

```
src/routes/api/$1/
├── +server.ts           # Endpoint principal
├── schema.ts            # Schemas Zod (optionnel, si complexe)
└── __tests__/
    └── $1.test.ts       # Tests
```

### Etape 2 : Verifier les patterns existants

Recherche des endpoints similaires :

```bash
# Trouver des patterns similaires
```

---

## Phase 2 : Schema Zod (OBLIGATOIRE)

### Pour les requetes

```typescript
// src/routes/api/$1/+server.ts (ou schema.ts si complexe)
import { z } from 'zod';

// Schema de la requete
const requestSchema = z.object({
  // Champs avec validation stricte
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  count: z.number().int().positive().max(1000),
  email: z.string().email(),
  // Optionnels
  description: z.string().max(500).optional(),
  // Enums
  status: z.enum(['active', 'inactive', 'pending']),
  // Arrays avec limites
  items: z.array(z.string()).max(50),
});

// Schema de la reponse (pour documentation/types)
const responseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    // ...
  }),
});

// Types derives
type RequestBody = z.infer<typeof requestSchema>;
type ResponseBody = z.infer<typeof responseSchema>;
```

### Pour les query params (GET)

```typescript
const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  sort: z.enum(['asc', 'desc']).default('desc'),
});
```

---

## Phase 3 : Endpoint Implementation

### Template complet

```typescript
// src/routes/api/$1/+server.ts
import { json, error } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types';

// ============================================
// SCHEMAS
// ============================================
const requestSchema = z.object({
  // Definir les champs
});

// ============================================
// HANDLER
// ============================================
export const $2: RequestHandler = async ({ request, locals, url }) => {
  // 1. AUTHENTIFICATION
  if (!locals.user) {
    throw error(401, 'Non authentifie');
  }

  // 2. AUTORISATION (si necessaire)
  // Verifier que l'utilisateur a le droit d'acceder a cette ressource

  // 3. VALIDATION DES ENTREES
  // Pour POST/PUT/PATCH :
  const body = await request.json().catch(() => null);
  if (!body) {
    throw error(400, 'Corps de requete invalide');
  }

  const validation = requestSchema.safeParse(body);
  if (!validation.success) {
    throw error(400, validation.error.issues[0].message);
  }
  const data = validation.data;

  // Pour GET (query params) :
  // const params = Object.fromEntries(url.searchParams);
  // const validation = querySchema.safeParse(params);

  // 4. LOGIQUE METIER
  try {
    // Appels Supabase, traitements, etc.
    const result = await processData(data);

    // 5. REPONSE
    return json({
      success: true,
      data: result
    });

  } catch (err) {
    console.error('API Error:', err);
    throw error(500, 'Erreur serveur');
  }
};

// ============================================
// HELPERS (si necessaire)
// ============================================
async function processData(data: z.infer<typeof requestSchema>) {
  // Implementation
}
```

---

## Phase 4 : Tests

### Fichier de test

```typescript
// src/routes/api/$1/__tests__/$1.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { $2 } from '../+server';

// Mock Supabase si necessaire
vi.mock('$lib/server/supabase', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({ data: [], error: null }),
      insert: () => ({ data: null, error: null }),
    }),
  }),
}));

describe('$2 /api/$1', () => {
  // Helper pour creer une requete mock
  function createMockRequest(body: unknown) {
    return {
      json: () => Promise.resolve(body),
    } as Request;
  }

  function createMockLocals(user: { id: string } | null = { id: 'test-user' }) {
    return { user };
  }

  describe('Authentication', () => {
    it('should return 401 if not authenticated', async () => {
      const request = createMockRequest({});
      const locals = createMockLocals(null);

      await expect($2({ request, locals } as any))
        .rejects.toThrow('Non authentifie');
    });
  });

  describe('Validation', () => {
    it('should return 400 for invalid body', async () => {
      const request = createMockRequest({ invalid: 'data' });
      const locals = createMockLocals();

      await expect($2({ request, locals } as any))
        .rejects.toThrow(); // Message de validation Zod
    });

    it('should accept valid body', async () => {
      const request = createMockRequest({
        // Corps valide selon le schema
      });
      const locals = createMockLocals();

      const response = await $2({ request, locals } as any);
      const data = await response.json();

      expect(data.success).toBe(true);
    });
  });

  describe('Business Logic', () => {
    it('should [comportement attendu]', async () => {
      // Test de la logique metier
    });
  });
});
```

---

## Phase 5 : Verification Securite

### Checklist OBLIGATOIRE

- [ ] **Auth** : `locals.user` verifie
- [ ] **Authz** : Utilisateur autorise pour cette ressource
- [ ] **Validation** : Toutes entrees validees avec Zod
- [ ] **Limites** : Nombres bornes (.min/.max), arrays limites (.max(N))
- [ ] **UUID** : Tous les IDs valides avec .uuid()
- [ ] **Injection** : Pas de concatenation SQL (utiliser Supabase client)
- [ ] **Erreurs** : Messages generiques (pas d'info sensible)

---

## Phase 6 : Documentation (optionnel)

Si l'API est complexe, ajoute de la documentation :

```typescript
/**
 * $2 /api/$1
 *
 * @description [Description de l'endpoint]
 *
 * @authentication Required
 * @authorization [Roles autorises]
 *
 * @param {RequestBody} body
 * @returns {ResponseBody}
 *
 * @example
 * // Request
 * fetch('/api/$1', {
 *   method: '$2',
 *   body: JSON.stringify({ ... })
 * })
 *
 * // Response
 * { success: true, data: { ... } }
 */
```

---

## Checklist Finale

- [ ] Schema Zod complet avec limites
- [ ] Auth verifie (401)
- [ ] Validation avec safeParse (400)
- [ ] Erreurs gerees proprement (500)
- [ ] Tests : auth, validation, logique metier
- [ ] Pas de `any`
- [ ] Types inferes de Zod
