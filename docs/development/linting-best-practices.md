# 🔍 Linting Best Practices

Guide complet sur la stratégie de linting et les outils automatisés pour UbuMaths.

**Dernière mise à jour** : 2025-10-26

---

## 🎯 Objectif

Maintenir un code de haute qualité avec **0 erreurs ESLint** en tout temps, tout en automatisant les vérifications pour une expérience développeur optimale.

---

## 📊 Statut actuel

### Métriques de qualité (Updated: 2025-10-27)

**Production Code** (Main Priority):

- **ESLint Errors** : 0 ✅
- **TypeScript Errors** : 0 ✅
- **ESLint Warnings** : 20 (acceptables, built-in classes)
- **Build** : ✅ Passing
- **Prettier** : ✅ Passing
- **TypeScript** : ✅ Strict mode

**Test Files** (Acceptable):

- **ESLint Errors** : 0 ✅
- **TypeScript Errors** : ~60 (type assertions for mocks, acceptable)
- **ESLint Warnings** : ~114 (@typescript-eslint/no-explicit-any in test mocks)

**Test Suite Health**:

- **Total Tests** : 2,088
- **Passing** : 2,063 (100% of non-skipped tests)
- **Skipped** : 24 (integration tests, intentional)
- **Flaky Tests** : 0 ✅

### Progression historique

| Date       | Erreurs | Réduction | Milestone                                 |
| ---------- | ------- | --------- | ----------------------------------------- |
| 2025-01-15 | ~853    | 0%        | État initial du projet                    |
| 2025-02-20 | ~58     | 93%       | Phase 1: Nettoyage ESLint                 |
| 2025-10-26 | 0       | 100%      | Phase 2: Exercise feature fixed           |
| 2025-10-27 | 0       | 100%      | Phase 3: Test suite 100% + critical fixes |

---

## 🛠️ Architecture de linting

### 1. Outils utilisés

#### ESLint

**Version** : 9.36.0
**Plugins** :

- `eslint-plugin-svelte` - Règles spécifiques Svelte
- `typescript-eslint` - Vérifications TypeScript
- `eslint-config-prettier` - Désactive les règles conflictuelles

**Configuration** : `eslint.config.js`

```javascript
import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import typescript from 'typescript-eslint';

export default [
	js.configs.recommended,
	...typescript.configs.recommended,
	...svelte.configs.recommended,
	{
		rules: {
			// Règles personnalisées
		}
	}
];
```

#### Prettier

**Version** : 3.6.2
**Plugins** :

- `prettier-plugin-svelte` - Formatage Svelte
- `prettier-plugin-tailwindcss` - Tri des classes Tailwind

**Configuration** : `.prettierrc`

```json
{
	"semi": true,
	"singleQuote": true,
	"tabWidth": 2,
	"useTabs": true,
	"plugins": ["prettier-plugin-svelte", "prettier-plugin-tailwindcss"]
}
```

#### Husky + lint-staged

**Husky** : Hook Git pre-commit
**lint-staged** : Lint uniquement les fichiers modifiés

---

## ⚡ Stratégie d'optimisation

### 1. ESLint Cache

**Activation** : Flag `--cache` dans `package.json`

```json
{
	"scripts": {
		"lint": "prettier --check . && eslint . --cache"
	}
}
```

**Avantages** :

- Réduit le temps de linting de ~30 secondes à ~5 secondes
- Ne re-vérifie que les fichiers modifiés
- Cache stocké dans `.eslintcache` (git-ignored)

**Performance** :

- Premier run : ~30s (tous les fichiers)
- Runs suivants : ~3-5s (fichiers modifiés uniquement)

### 2. lint-staged

**Configuration** : `package.json`

```json
{
	"lint-staged": {
		"*.{js,ts,svelte}": ["eslint --cache --fix", "prettier --write"],
		"*.{json,md,css,html}": "prettier --write"
	}
}
```

**Workflow** :

1. Developer fait `git add`
2. Developer fait `git commit`
3. Husky intercepte via pre-commit hook
4. lint-staged exécute ESLint + Prettier sur fichiers staged
5. Erreurs → Commit bloqué, Succès → Commit continue

**Avantages** :

- Lint uniquement les fichiers modifiés (ultra rapide)
- Auto-fix des erreurs simples
- Formatage automatique
- Impossible de commit du code non-linté

**Temps d'exécution** :

- 1-3 fichiers modifiés : ~1-2s
- 5-10 fichiers modifiés : ~3-5s
- 20+ fichiers modifiés : ~8-10s

### 3. Husky

**Installation** : `pnpm prepare` (automatique après `pnpm install`)

**Hooks configurés** :

`.husky/pre-commit` :

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
```

`.husky/commit-msg` :

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx --no -- commitlint --edit ${1}
```

---

## 🚀 Workflow développeur

### Développement quotidien

```bash
# 1. Développer normalement
vim src/lib/components/MyComponent.svelte

# 2. Vérifier manuellement (optionnel)
pnpm lint

# 3. Commit (lint-staged s'exécute automatiquement)
git add .
git commit -m "feat: add new component"

# ✅ Si lint passe → Commit créé
# ❌ Si lint échoue → Commit bloqué, erreurs affichées
```

### Fix automatique

```bash
# Auto-fix des erreurs simples
pnpm lint -- --fix

# OU via lint-staged (recommandé)
git add .
git commit  # Auto-fix lors du pre-commit
```

### Bypass (urgence uniquement)

```bash
# ⚠️ À utiliser UNIQUEMENT en cas d'urgence
git commit --no-verify -m "fix: emergency hotfix"

# IMPORTANT : Corriger les erreurs immédiatement après
```

---

## 📋 Règles ESLint personnalisées

### Règles désactivées

```javascript
rules: {
  // ❌ Désactivé : Nécessaire pour canvas/WebGL (MathLive)
  'svelte/no-dom-manipulating': 'off',

  // ❌ Désactivé : Nécessaire pour le rendu Markdown sanitisé
  'svelte/no-at-html-tags': 'off',

  // ❌ Désactivé : On utilise des string literals statiques (safe)
  'svelte/no-navigation-without-resolve': 'off'
}
```

### Règles en warning

```javascript
rules: {
  // ⚠️ Warning : Parfois $state est plus approprié que les wrappers Svelte
  'svelte/prefer-svelte-reactivity': 'warn',

  // ⚠️ Warning : Parfois $state + $effect est plus clair que $derived
  'svelte/prefer-writable-derived': 'warn'
}
```

**Justification** : Ces patterns sont légitimes dans certains cas :

- Performance critique (Map, Set natifs plus rapides)
- Objets temporaires locaux au composant
- Intégration avec bibliothèques externes

---

## 🎯 Standards de qualité

### Zéro tolérance

**Erreurs ESLint** : 0 accepté ❌

Tout nouveau code DOIT passer ESLint sans erreurs. Les commits sont bloqués si des erreurs existent.

### Warnings acceptables

**Warnings ESLint** : ~20 acceptés ⚠️

Les warnings suivants sont acceptés pour patterns légitimes :

1. **Built-in classes** (15 warnings) :
   - `Date`, `Map`, `Set`, `URLSearchParams` avec `$state`
   - Accepté pour performance et compatibilité

2. **prefer-writable-derived** (1 warning) :
   - Parfois `$state` + `$effect` est plus clair que `$derived`

3. **Unused directives** (4 warnings) :
   - À nettoyer progressivement

---

## 📚 Exemples concrets

### ✅ Bon : Code conforme

```svelte
<script lang="ts">
	import { Button } from '$lib/components/ui/button';

	// Props typées
	let { student }: { student: Student } = $props();

	// State réactif
	let count = $state(0);

	// Derived values
	let doubled = $derived(count * 2);

	// Event handlers préfixés
	function handleClick() {
		count++;
	}
</script>

<Button onclick={handleClick}>
	{student.name}: {doubled}
</Button>
```

### ❌ Mauvais : Erreurs courantes

```svelte
<script lang="ts">
	// ❌ export let (Svelte 4)
	export let student: any;

	// ❌ Type 'any'
	let count: any = 0;

	// ❌ $: reactive (Svelte 4)
	$: doubled = count * 2;

	// ❌ Handler non préfixé
	function onClick() {
		count++;
	}
</script>

<!-- ❌ onclick majuscule (Svelte 4) -->
<!-- ❌ Missing key in each -->
{#each items as item}
	<div>{item.name}</div>
{/each}
```

### ✅ Fix : Corrections appliquées

```svelte
<script lang="ts">
	// ✅ $props() (Svelte 5)
	let { student }: { student: Student } = $props();

	// ✅ Type explicite
	let count = $state(0);

	// ✅ $derived (Svelte 5)
	let doubled = $derived(count * 2);

	// ✅ Handler préfixé
	function handleClick() {
		count++;
	}
</script>

<!-- ✅ onclick minuscule (Svelte 5) -->
<!-- ✅ Key présente -->
{#each items as item (item.id)}
	<div>{item.name}</div>
{/each}
```

---

## 🔧 Commandes utiles

### Vérifications

```bash
# Lint complet (Prettier + ESLint)
pnpm lint

# Prettier seul
pnpm format

# ESLint seul avec cache
npx eslint . --cache

# Type checking TypeScript
pnpm check

# Tests unitaires
pnpm test:unit
```

### Corrections

```bash
# Format automatique Prettier
pnpm format

# Fix ESLint automatique
npx eslint . --cache --fix

# Fix des fichiers staged (recommandé)
npx lint-staged
```

### Debugging

```bash
# Voir les règles ESLint actives
npx eslint --print-config src/lib/components/MyComponent.svelte

# Vérifier la configuration ESLint
npx eslint --inspect-config

# Nettoyer le cache ESLint
rm .eslintcache

# Voir les fichiers ignorés
npx eslint --debug src/
```

---

## 🎓 Guide de migration

### Migrer un fichier existant

1. **Identifier les erreurs** :

   ```bash
   npx eslint src/path/to/file.svelte
   ```

2. **Auto-fix ce qui peut l'être** :

   ```bash
   npx eslint src/path/to/file.svelte --fix
   ```

3. **Corriger manuellement** :
   - Types `any` → `unknown` ou types spécifiques
   - `export let` → `$props()`
   - `$:` → `$derived()` ou `$effect()`
   - Ajouter `key` aux `{#each}`
   - Préfixer handlers avec `handle`

4. **Vérifier** :
   ```bash
   npx eslint src/path/to/file.svelte
   # Doit afficher : 0 errors, X warnings
   ```

### Priorisation

**Phase 1** (Critique) :

- Erreurs de sécurité de type (`any` → `unknown`)
- Erreurs de runtime (missing keys, undefined vars)
- Violations de patterns Svelte 5

**Phase 2** (Important) :

- Patterns deprecated Svelte 4
- Handlers non préfixés
- Types manquants

**Phase 3** (Nice-to-have) :

- Warnings SvelteMap/SvelteSet
- Optimisations de performance

---

## 📖 Ressources

### Documentation officielle

- **ESLint** : https://eslint.org/docs/latest/
- **eslint-plugin-svelte** : https://sveltejs.github.io/eslint-plugin-svelte/
- **Prettier** : https://prettier.io/docs/en/
- **Husky** : https://typicode.github.io/husky/
- **lint-staged** : https://github.com/okonet/lint-staged

### Documentation interne

- [Code Style Guide](./code-style.md) - Standards de code
- [Git Workflow](./git-workflow.md) - Workflow Git et commits
- [Contributing Guide](../contributing/README.md) - Guide de contribution

---

## 🏆 Achievements

### Milestones atteints

- ✅ **2025-01 → 2025-02** : Réduction de 93% des erreurs (853 → 58)
- ✅ **2025-10-26** : Réduction de 100% des erreurs (58 → 0)
- ✅ **2025-10-27** : Test suite 100% pass rate + critical production fixes
  - Fixed 13 critical TypeScript errors in production server code
    - `src/lib/server/notifications.ts` (4 errors): enum corrections, type assertions
    - `src/lib/server/errorMonitoring.ts` (9 errors): Json types, null handling
  - Fixed 1 flaky test (timestamp comparison)
  - Improved 251 type safety issues in test files (null checks, mock interfaces)
  - Achieved 100% test pass rate (2,063/2,063 non-skipped tests)
- ✅ **Exercise Feature** : 45 erreurs corrigées, production-ready
- ✅ **Automation** : lint-staged + Husky configurés

### Patterns établis

**Type Safety Patterns** (2025-10-27):

- Database enum type assertions: `as Database['public']['Enums']['notification_type']`
- Json type assertions for flexible data: `errors: error_details as Json`
- Null-safe result checking: `if (result.success && result.instance)`
- Mock interface typing: `MockSupabaseWithChain` for chainable mocks

### Prochaines étapes

- 🔄 Réduire les warnings de 20 à <10 (migration vers Svelte wrappers)
- 🔄 Nettoyer les ~60 warnings TypeScript dans les tests (optimisation, non-bloquant)
- 🔄 Ajouter pre-push hook pour tests unitaires
- 🔄 Intégrer ESLint dans CI/CD Vercel

---

**Maintenu par** : L'équipe UbuMaths
**Dernière révision** : 2025-10-27

[← Retour au développement](README.md)
