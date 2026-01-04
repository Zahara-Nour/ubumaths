# Authentification CRON

> Securisation des endpoints CRON contre les appels non autorises.

## Fichier Principal

`src/lib/server/auth/cron.ts`

## Methodes d'Authentification

### 1. Vercel CRON (Automatique)

Vercel ajoute automatiquement le header `x-vercel-cron: 1` lors des appels planifies.

```typescript
// Detection automatique
if (request.headers.get('x-vercel-cron') === '1') {
	// Verifier qu'on est bien sur Vercel
	if (process.env.VERCEL === '1') {
		return; // Authentifie
	}
}
```

**Avantage** : Pas de secret a configurer pour les jobs automatiques.

### 2. Bearer Token (Triggers Manuels)

Pour les declenchements manuels via l'interface admin ou curl.

```typescript
// Header: Authorization: Bearer <CRON_SECRET>
const authHeader = request.headers.get('authorization');
const token = authHeader?.replace('Bearer ', '');

if (token && timingSafeEqual(token, CRON_SECRET)) {
	return; // Authentifie
}
```

---

## Implementation Complete

```typescript
// src/lib/server/auth/cron.ts
import { error } from '@sveltejs/kit';
import { timingSafeEqual } from 'crypto';
import { getEnv } from '$lib/server/env';

/**
 * Verifies CRON authentication using either:
 * 1. Vercel's automatic x-vercel-cron header (for scheduled jobs)
 * 2. Bearer token with CRON_SECRET (for manual triggers)
 *
 * @throws 401 if authentication fails
 * @throws 503 if CRON_SECRET is not configured
 */
export function verifyCronAuth(request: Request): void {
	// Method 1: Vercel automatic cron header
	const isVercelCron = request.headers.get('x-vercel-cron') === '1';
	const isVercelPlatform = process.env.VERCEL === '1';

	if (isVercelCron && isVercelPlatform) {
		return; // Authenticated via Vercel
	}

	// Method 2: Bearer token
	const authHeader = request.headers.get('authorization');
	const token = authHeader?.replace('Bearer ', '');

	if (!token) {
		throw error(401, 'Missing authentication');
	}

	const env = getEnv();
	if (!env.CRON_SECRET) {
		throw error(503, 'CRON authentication not configured');
	}

	// Constant-time comparison to prevent timing attacks
	if (!safeCompare(token, env.CRON_SECRET)) {
		throw error(401, 'Invalid CRON token');
	}
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function safeCompare(a: string, b: string): boolean {
	if (a.length !== b.length) {
		// Still do comparison to maintain constant time
		timingSafeEqual(Buffer.from(a), Buffer.from(a));
		return false;
	}
	return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
```

---

## Configuration

### Variable d'Environnement

```bash
# .env.local (developpement)
CRON_SECRET=your-secret-token-here

# Vercel Dashboard (production)
# Settings > Environment Variables > CRON_SECRET
```

### Generation d'un Secret Securise

```bash
# Option 1: OpenSSL
openssl rand -base64 32

# Option 2: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Exemple de resultat
# k7Hj9mP2xQr5tYvN8wE3aF6bC1dG4hI0jK2lM5nO7pR=
```

---

## Usage dans les Endpoints

### Endpoint CRON Standard

```typescript
// src/routes/api/cron/my-job/+server.ts
import { json } from '@sveltejs/kit';
import { verifyCronAuth } from '$lib/server/auth/cron';

export const GET: RequestHandler = async ({ request }) => {
	// TOUJOURS en premier
	verifyCronAuth(request);

	// Suite de la logique...
	return json({ success: true });
};

export const POST: RequestHandler = async ({ request }) => {
	verifyCronAuth(request);
	// ...
};
```

### Test Local

```bash
# Avec curl
curl -X POST http://localhost:5175/api/cron/my-job \
  -H "Authorization: Bearer your-secret-token-here"

# Simuler Vercel (ne fonctionne qu'en prod)
curl -X GET http://localhost:5175/api/cron/my-job \
  -H "x-vercel-cron: 1"
```

---

## Securite

### Timing Attack Prevention

La fonction `timingSafeEqual` est utilisee pour eviter les attaques par timing :

```typescript
// MAUVAIS - vulnerable aux timing attacks
if (token === CRON_SECRET) { ... }

// BON - temps constant
if (timingSafeEqual(Buffer.from(token), Buffer.from(CRON_SECRET))) { ... }
```

### Fail-Secure

Si `CRON_SECRET` n'est pas configure, l'endpoint retourne 503 (Service Unavailable) plutot que d'autoriser l'acces.

### Validation du Secret

Recommandations pour le secret :

- Minimum 32 caracteres
- Genere aleatoirement
- Unique par environnement
- Rotate regulierement

---

## Erreurs Possibles

| Code | Message                            | Cause                       |
| ---- | ---------------------------------- | --------------------------- |
| 401  | Missing authentication             | Pas de header Authorization |
| 401  | Invalid CRON token                 | Token incorrect             |
| 503  | CRON authentication not configured | CRON_SECRET non defini      |

---

## Flow Complet

```
┌─────────────────────────────────────────────────────────────────┐
│                       REQUEST ARRIVES                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │  x-vercel-cron: 1 header?     │
              └───────────────────────────────┘
                     │               │
                    YES              NO
                     │               │
                     ▼               ▼
        ┌────────────────────┐  ┌────────────────────┐
        │ VERCEL === '1' ?   │  │ Authorization      │
        │                    │  │ header present?    │
        └────────────────────┘  └────────────────────┘
           │          │            │          │
          YES         NO          YES         NO
           │          │            │          │
           ▼          │            ▼          ▼
    ┌──────────┐      │     ┌──────────┐  ┌──────────┐
    │ ALLOW    │      │     │ Compare  │  │ 401      │
    │          │      │     │ token    │  │ Missing  │
    └──────────┘      │     └──────────┘  └──────────┘
                      │          │
                      │     ┌────┴────┐
                      │    MATCH    NO MATCH
                      │     │          │
                      │     ▼          ▼
                      │ ┌──────────┐ ┌──────────┐
                      │ │ ALLOW    │ │ 401      │
                      │ │          │ │ Invalid  │
                      │ └──────────┘ └──────────┘
                      │
                      ▼
              ┌──────────────┐
              │ 401 Unauth   │
              │ (not Vercel) │
              └──────────────┘
```
