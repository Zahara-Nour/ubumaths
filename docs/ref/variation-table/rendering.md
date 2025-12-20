# Rendu HTML (Composant Svelte)

Documentation du composant de rendu des tableaux de variation.

**Fichier source** : `src/lib/components/markdown/nodes/VariationTable.svelte`

## Vue d'ensemble

Le composant `VariationTable.svelte` rend un `VariationTableNode` en HTML semantique avec :

- Tableau HTML avec structure header/body
- Expressions mathematiques via MathLive (`<math-span>`)
- Fleches SVG pour les variations
- Support du mode sombre
- Accessibilite (ARIA, lecteurs d'ecran)

## Interface

```typescript
interface Props {
	node: VariationTableNode;
	class?: string;
}
```

## Utilisation

```svelte
<script>
	import VariationTable from '$lib/components/markdown/nodes/VariationTable.svelte';
	import type { VariationTableNode } from '$lib/ubumark/types/variation-table';

	let node: VariationTableNode = $props();
</script>

<VariationTable {node} class="my-custom-class" />
```

## Structure HTML

```html
<div class="variation-table">
	<table class="vt-grid" role="table" aria-label="Tableau de variations de x">
		<caption class="sr-only">
			Tableau de variations de la fonction x
		</caption>

		<thead class="vt-header">
			<tr>
				<th class="vt-variable-cell"><!-- Variable --></th>
				<th class="vt-domain-cell"><!-- Point du domaine --></th>
				<th class="vt-interval-header"><!-- Espace intervalle --></th>
				<!-- ... autres points ... -->
			</tr>
		</thead>

		<tbody>
			<!-- Lignes de signe -->
			<tr class="vt-sign-row">
				<td class="vt-label-cell"><!-- Label --></td>
				<td class="vt-sign-point-cell"><!-- Marqueur point --></td>
				<td class="vt-sign-interval-cell"><!-- Signe intervalle --></td>
				<!-- ... -->
			</tr>

			<!-- Lignes de variation -->
			<tr class="vt-variation-row">
				<td class="vt-label-cell"><!-- Label --></td>
				<td class="vt-variation-value-cell"><!-- Valeur --></td>
				<td class="vt-arrow-cell"><!-- Fleche --></td>
				<!-- ... -->
			</tr>
		</tbody>
	</table>
</div>
```

## Variables CSS

Le composant utilise des variables CSS pour la personnalisation :

```css
.variation-table {
	--vt-border-color: var(--border, #e5e7eb);
	--vt-header-bg: var(--muted, #f3f4f6);
	--vt-text-color: var(--foreground, #1f2937);
	--vt-plus-color: #16a34a;
	--vt-minus-color: #dc2626;
	--vt-arrow-color: var(--foreground, #1f2937);
	--vt-hatch-color: var(--muted-foreground, #6b7280);
	--vt-cell-padding: 0.5em;
	--vt-row-height: 3em;
	--vt-variation-row-height: 4em;
}
```

### Mode sombre

```css
:global(.dark) .variation-table {
	--vt-border-color: var(--border, #374151);
	--vt-header-bg: var(--muted, #1f2937);
	--vt-text-color: var(--foreground, #f3f4f6);
	--vt-plus-color: #22c55e;
	--vt-minus-color: #f87171;
	--vt-arrow-color: var(--foreground, #f3f4f6);
	--vt-hatch-color: var(--muted-foreground, #9ca3af);
}
```

## Rendu des marqueurs

### Zero (`z`)

```svelte
<span class="vt-zero">0</span>
```

### Asymptote (`||`)

Double barre verticale via CSS gradient :

```css
.vt-asymptote-bar {
	width: 5px;
	background: linear-gradient(
		to right,
		var(--vt-text-color) 0px,
		var(--vt-text-color) 1px,
		transparent 1px,
		transparent 4px,
		var(--vt-text-color) 4px,
		var(--vt-text-color) 5px
	);
}
```

### Zone interdite (`|h|`)

Hachures diagonales :

```css
.vt-hatch {
	background: repeating-linear-gradient(
		45deg,
		transparent,
		transparent 2px,
		var(--vt-hatch-color) 2px,
		var(--vt-hatch-color) 4px
	);
}
```

### Discontinuite (`d`)

```svelte
<span class="vt-discontinuity">d</span>
```

```css
.vt-discontinuity {
	font-style: italic;
	font-weight: bold;
}
```

## Fleches SVG

Les fleches de variation sont rendues en SVG :

```svelte
<svg class="vt-arrow" viewBox="0 0 100 60" preserveAspectRatio="none">
	<!-- Fleche ascendante -->
	{#if direction === 'up'}
		<line x1="5" y1="55" x2="95" y2="5" class="vt-arrow-line" />
		<polygon points="95,5 80,5 95,20" class="vt-arrow-head" />
		<!-- Fleche descendante -->
	{:else if direction === 'down'}
		<line x1="5" y1="5" x2="95" y2="55" class="vt-arrow-line" />
		<polygon points="95,55 80,55 95,40" class="vt-arrow-head" />
	{/if}
</svg>
```

## Positionnement des valeurs

Les valeurs sont positionnees verticalement via flexbox :

```css
.vt-pos-top {
	align-items: flex-start;
	padding-top: 0.25em;
}

.vt-pos-bottom {
	align-items: flex-end;
	padding-bottom: 0.25em;
}

.vt-pos-center {
	align-items: center;
}
```

## Asymptotes avec limites

Structure speciale pour les asymptotes avec limites gauche/droite :

```svelte
<div class="vt-asymptote-limits">
	<span class="vt-limit vt-limit-left vt-pos-top">
		<math-span>{leftLimit}</math-span>
	</span>
	<span class="vt-asymptote-bar"></span>
	<span class="vt-limit vt-limit-right vt-pos-bottom">
		<math-span>{rightLimit}</math-span>
	</span>
</div>
```

## Direction des fleches

La direction est determinee par comparaison des positions :

```typescript
function getArrowDirection(
	row: VariationRow,
	fromPoint: DomainPoint,
	toPoint: DomainPoint
): 'up' | 'down' | null {
	const fromValue = getVariationValue(row, fromPoint);
	const toValue = getVariationValue(row, toPoint);

	// Position order: top > center > bottom
	const positionOrder = {
		top: 3,
		'limit-top': 3,
		center: 2,
		bottom: 1,
		'limit-bottom': 1
	};

	// Cas special : asymptotes avec limites
	if (fromValue?.marker === 'asymptote' && fromValue?.limits) {
		// Sortie d'asymptote : utiliser limite droite
		fromOrder = getExpressionOrder(fromValue.limits[1]);
	}
	if (toValue?.marker === 'asymptote' && toValue?.limits) {
		// Approche d'asymptote : utiliser limite gauche
		toOrder = getExpressionOrder(toValue.limits[0]);
	}

	return toOrder > fromOrder ? 'up' : 'down';
}
```

## Accessibilite

- `role="table"` sur l'element `<table>`
- `aria-label` descriptif
- `<caption class="sr-only">` pour lecteurs d'ecran
- `aria-label` sur les fleches SVG ("Fonction croissante/decroissante")

```css
.sr-only {
	position: absolute;
	width: 1px;
	height: 1px;
	padding: 0;
	margin: -1px;
	overflow: hidden;
	clip: rect(0, 0, 0, 0);
	white-space: nowrap;
	border-width: 0;
}
```

## Responsive

```css
@media (max-width: 640px) {
	.variation-table {
		font-size: 0.9em;
	}

	.vt-arrow-cell {
		min-width: 3em;
	}
}
```

## Conversion des expressions

Les expressions sont converties pour MathLive :

```typescript
function toLatex(expr: string): string {
	return expr
		.replace(/\+inf/g, '+\\infty')
		.replace(/-inf/g, '-\\infty')
		.replace(/^inf$/g, '\\infty');
}
```

## Tests

```bash
pnpm test:client src/lib/components/markdown/__tests__/VariationTable.svelte.test.ts
```

**Couverture** :

- Rendu des lignes de signe
- Rendu des lignes de variation
- Direction des fleches
- Zones interdites
- Asymptotes avec limites
