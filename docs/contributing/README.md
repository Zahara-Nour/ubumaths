# 🤝 Contribution

Guide pour contribuer à UbuMaths.

---

## 📚 Documents essentiels

### [⭐ Guide de documentation](documentation-guide.md)

**À LIRE EN PREMIER** : Comment écrire et organiser la documentation.

### [Implémentation de features](feature-implementation.md)

Process complet pour ajouter une nouvelle fonctionnalité.

### [Checklist code review](code-review-checklist.md)

Points à vérifier avant de soumettre une PR.

---

## 🚀 Quick Start

### 1. Fork & Clone

```bash
# Fork sur GitHub, puis clone
git clone https://github.com/votre-username/ubumaths.git
cd ubumaths
pnpm install
```

### 2. Créer une branche

```bash
# Nommer la branche selon le type de travail
git checkout -b feat/nom-feature
git checkout -b fix/nom-bug
git checkout -b docs/nom-doc
```

### 3. Développer

- Suivre les [standards de code](../development/code-style.md)
- Écrire tests pour nouvelle logique
- Mettre à jour documentation si nécessaire

### 4. Commiter

```bash
# Format: <type>: <subject>
git commit -m "feat: ajouter système X"
git commit -m "fix: corriger bug Y"
git commit -m "docs: mettre à jour guide Z"
```

### 5. Pull Request

- Titre clair et descriptif
- Description détaillée des changements
- Référencer issues si applicable
- S'assurer que tests passent

---

## 📝 Types de commits

| Type       | Description                                | Bump version |
| ---------- | ------------------------------------------ | ------------ |
| `feat`     | Nouvelle fonctionnalité                    | Minor        |
| `fix`      | Correction de bug                          | Patch        |
| `docs`     | Documentation seulement                    | -            |
| `style`    | Formatage, pas de changement de code       | -            |
| `refactor` | Refactoring, pas de changement fonctionnel | -            |
| `test`     | Ajout/modification tests                   | -            |
| `chore`    | Maintenance, config, dépendances           | -            |
| `perf`     | Amélioration performance                   | Patch        |

---

## 📖 Écrire de la documentation

**Règles d'or** :

1. **Un feature = un dossier** dans `/docs/features/`
2. **README.md obligatoire** : Vue d'ensemble + quick start
3. **Pas de redondance** : Un concept = un seul endroit
4. **Status visible** : ✅ Complete | 🔄 In Progress | 📝 Planned

Voir le [guide complet de documentation](documentation-guide.md).

---

## 🧪 Tests

### Avant de commiter

```bash
# Format + lint
pnpm format

# Type checking
pnpm check

# Tests unitaires
pnpm test:unit
```

### Coverage

Priorité sur :

- Logique métier (utils, generators, parsers)
- API endpoints
- Validations

### Testing Cache Modules

Cache modules have comprehensive unit tests (107 tests, 100% pass rate):

```bash
# Run all cache tests
pnpm test:unit tests/unit/cache/

# Run specific cache module tests
pnpm test:unit tests/unit/cache/memory-cache.test.ts
pnpm test:unit tests/unit/cache/profile-cache.test.ts
pnpm test:unit tests/unit/cache/schools-cache.test.ts
pnpm test:unit tests/unit/cache/templates-cache.test.ts
pnpm test:unit tests/unit/api/admin-cache-invalidation.test.ts
```

**When to add cache tests**:

- New cache module created
- Cache invalidation logic changed
- TTL values modified
- New cache helper function added

**Cache test structure**:

```typescript
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { memoryCache } from '$lib/server/cache/memory';

describe('MyCache Module', () => {
	beforeEach(() => {
		memoryCache.clear(); // Reset cache between tests
	});

	afterAll(() => {
		memoryCache.destroy(); // Prevent memory leaks
	});

	it('caches data on first access', async () => {
		// Test cache miss → DB query → cache store
	});

	it('returns cached data on subsequent access', async () => {
		// Test cache hit
	});

	it('invalidates cache correctly', async () => {
		// Test invalidation
	});

	it('handles TTL expiration', async () => {
		// Test TTL behavior
	});
});
```

---

## ❓ Questions ?

- Consulter la [documentation](../README.md)
- Ouvrir une issue sur GitHub
- Contacter l'équipe

---

[← Retour à l'index principal](../README.md)
