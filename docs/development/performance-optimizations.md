# Performance Optimizations Guide

Guide des optimisations de performance implémentées dans UbuMaths.

---

## Vue d'ensemble

Ce document décrit les stratégies d'optimisation de performance appliquées à UbuMaths pour améliorer les temps de chargement et l'expérience utilisateur.

## Optimisations implémentées (v0.0.9)

### 1. Code Splitting - QuestionTemplateForm

**Problème** : Le composant QuestionTemplateForm générait un chunk de 200.80 kB, chargé dans le bundle initial.

**Solution** : Lazy loading avec dynamic imports

**Implémentation** :

```typescript
// Avant (static import)
import QuestionTemplateForm from '$lib/components/QuestionTemplateForm.svelte';

// Après (dynamic import)
let QuestionTemplateForm = $state<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
let isLoading = $state(true);

onMount(async () => {
	const module = await import('$lib/components/QuestionTemplateForm.svelte');
	QuestionTemplateForm = module.default;
	isLoading = false;
});
```

**Résultats** :

- Chunk QuestionTemplateForm : 200.80 kB → 0 kB (éliminé du bundle initial)
- Pages admin : réduction de 32-37%

**Fichiers modifiés** :

- `src/routes/(protected)/dashboard/admin/questions/create/+page.svelte`
- `src/routes/(protected)/dashboard/admin/questions/[id]/edit/+page.svelte`

### 2. Progressive Loading - Composants lourds

**Problème** : Sous-composants volumineux chargés même si non utilisés.

**Solution** : Lazy loading déclenché par interactions utilisateur

**Implémentation** :

```typescript
// Lazy-loaded components
let FormRichTextEditor = $state<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
let QuestionPreview = $state<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
let JsonViewer = $state<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any

// Load on demand
async function loadFormRichTextEditor() {
  if (!loadedComponents.richText) {
    const module = await import('./rich-text/FormRichTextEditor.svelte');
    FormRichTextEditor = module.default;
    loadedComponents.richText = true;
  }
}

// Trigger on user interaction
<Collapsible.Root
  bind:open={descriptionOpen}
  onOpenChange={async (open) => {
    if (open) await loadFormRichTextEditor();
  }}
>
```

**Résultats** :

- FormRichTextEditor (1104 lignes) : chargé uniquement si description ouverte
- QuestionPreview : chargé uniquement sur l'onglet Preview
- JsonViewer : chargé uniquement sur l'onglet JSON

**Fichiers modifiés** :

- `src/lib/components/QuestionTemplateForm.svelte`

### 3. Build Performance

**Résultats** :

- Client build : 1m 32s → 28.02s (**70% plus rapide**)
- Server build : 2m 22s → 49.16s (**65% plus rapide**)

---

## Patterns d'optimisation

### Pattern 1 : Route-Level Code Splitting

**Quand l'utiliser** :

- Pages admin volumineuses
- Features spécifiques à certains rôles
- Composants rarement utilisés

**Exemple** :

```svelte
<script lang="ts">
	import { onMount } from 'svelte';

	let Component = $state<any>(null);
	let isLoading = $state(true);

	onMount(async () => {
		const module = await import('$lib/components/HeavyComponent.svelte');
		Component = module.default;
		isLoading = false;
	});
</script>

{#if isLoading}
	<div class="flex items-center justify-center p-8">
		<div class="animate-spin">⏳</div>
	</div>
{:else if Component}
	<Component {...props} />
{/if}
```

### Pattern 2 : User Interaction-Based Loading

**Quand l'utiliser** :

- Composants dans des collapsibles/tabs
- Modals/dialogs
- Features optionnelles

**Exemple** :

```svelte
<script lang="ts">
	let HeavyComponent = $state<any>(null);
	let isOpen = $state(false);

	async function loadComponent() {
		if (!HeavyComponent) {
			const module = await import('./HeavyComponent.svelte');
			HeavyComponent = module.default;
		}
	}

	async function handleOpen() {
		isOpen = true;
		await loadComponent();
	}
</script>

<Collapsible.Root bind:open={isOpen} onOpenChange={handleOpen}>
	<Collapsible.Content>
		{#if HeavyComponent}
			<HeavyComponent />
		{/if}
	</Collapsible.Content>
</Collapsible.Root>
```

### Pattern 3 : Preloading

**Quand l'utiliser** :

- Composants probablement nécessaires bientôt
- Améliorer la perception de performance

**Exemple** :

```svelte
<script lang="ts">
	let Component = $state<any>(null);

	// Preload on hover
	function handleMouseEnter() {
		if (!Component) {
			import('./Component.svelte').then((module) => {
				Component = module.default;
			});
		}
	}
</script>

<button onmouseenter={handleMouseEnter} onclick={handleClick}> Open Dialog </button>
```

---

## Recommandations futures

### High Priority

1. **Autres sections admin** :
   - Import students page
   - Message templates page
   - Error monitoring pages

2. **Service Worker** :
   - Caching des chunks lazy-loaded
   - Stratégie de cache intelligent

### Medium Priority

3. **Route-Level Splitting** :
   - Séparer complètement la section admin
   - Lazy load par route

4. **Image Optimization** :
   - Lazy loading des images
   - Formats modernes (WebP, AVIF)
   - Responsive images

### Low Priority

5. **Preloading stratégique** :
   - Link prefetch pour pages probables
   - Intelligent preloading basé sur navigation patterns

6. **Bundle Analysis** :
   - Analyse régulière avec `vite-bundle-visualizer`
   - Identifier nouvelles opportunités

---

## Mesures de performance

### Avant optimisations (v0.0.8)

```
Server Chunks:
- QuestionTemplateForm.js: 200.80 kB
- Create page: 3.37 kB
- Edit page: 3.50 kB

Client Chunks:
- DCvuw9_P.js: 112.31 kB (28.30 kB gzipped)

Build Time:
- Client: 1m 32s
- Server: 2m 22s
```

### Après optimisations (v0.0.9)

```
Server Chunks:
- QuestionTemplateForm.js: ELIMINATED ✅
- Create page: 2.12 kB (-37%)
- Edit page: 2.38 kB (-32%)

Client Chunks:
- DCvuw9_P.js: ELIMINATED ✅

Build Time:
- Client: 28.02s (-70%)
- Server: 49.16s (-65%)
```

### Impact utilisateurs

**Tous les utilisateurs** :

- Bundle initial réduit de ~200-300 kB
- Chargement initial plus rapide
- Moins de JavaScript à parser

**Utilisateurs non-admin** :

- Ne chargent plus le code admin
- Expérience optimale

**Administrateurs** :

- Chargement progressif des composants
- Loading states pour meilleure perception
- Fonctionnalités complètes maintenues

---

## Outils de mesure

### 1. Build Analysis

```bash
# Analyser le build Vite
pnpm build

# Comparer tailles de chunks
ls -lh .svelte-kit/output/server/chunks/
ls -lh .svelte-kit/output/client/_app/immutable/
```

### 2. Bundle Visualizer

```bash
# Installer le visualizer
pnpm add -D vite-bundle-visualizer

# Ajouter au vite.config.ts
import { visualizer } from 'vite-bundle-visualizer';

export default defineConfig({
  plugins: [
    sveltekit(),
    visualizer({ open: true })
  ]
});
```

### 3. Chrome DevTools

- **Performance tab** : Analyser le chargement initial
- **Network tab** : Vérifier tailles des chunks
- **Coverage tab** : Identifier code non utilisé

### 4. Lighthouse

```bash
# Audit performance
npx lighthouse https://ubumaths-6op8.vercel.app --view
```

---

## Checklist pour nouvelles optimisations

- [ ] Identifier le composant volumineux (>100 kB)
- [ ] Vérifier qu'il n'est pas toujours nécessaire
- [ ] Implémenter dynamic import
- [ ] Ajouter loading state
- [ ] Tester fonctionnalité complète
- [ ] Mesurer impact sur bundle
- [ ] Vérifier ESLint (0 errors)
- [ ] Documenter le changement
- [ ] Commit et release

---

## Références

- [SvelteKit Code Splitting](https://kit.svelte.dev/docs/modules#$app-navigation)
- [Vite Code Splitting](https://vitejs.dev/guide/features.html#code-splitting)
- [Web.dev Performance](https://web.dev/performance/)
- [Bundle Size Best Practices](https://web.dev/reduce-javascript-payloads-with-code-splitting/)

---

**Last Updated**: October 27, 2025 (v0.0.9)
