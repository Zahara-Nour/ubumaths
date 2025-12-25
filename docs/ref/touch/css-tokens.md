# Tokens CSS Touch-Friendly

## Tokens disponibles

Definis dans `src/app.css` :

```css
@theme {
	/* Touch-friendly sizing tokens */
	--min-touch-target: 44px;
	--touch-padding: 12px;
	--touch-gap: 12px;
}
```

---

## Description des tokens

### `--min-touch-target: 44px`

Taille minimale recommandee pour les cibles tactiles.

**Origine** : Apple Human Interface Guidelines et WCAG 2.1 recommandent 44x44px minimum.

```css
.interactive-element {
	min-width: var(--min-touch-target);
	min-height: var(--min-touch-target);
}
```

### `--touch-padding: 12px`

Padding adequat pour les elements interactifs sur touch.

```css
.button {
	padding: var(--touch-padding);
}
```

### `--touch-gap: 12px`

Espacement minimum entre les elements interactifs pour eviter les tap accidentels.

```css
.button-group {
	gap: var(--touch-gap);
}
```

---

## Utilisation dans les composants

### Pattern recommande

```svelte
<style>
	.my-button {
		/* Valeurs desktop par defaut */
		height: 36px;
		padding: 8px 16px;
	}

	@media (pointer: coarse) {
		.my-button {
			/* Valeurs touch via tokens */
			min-height: var(--min-touch-target, 44px);
			padding: var(--touch-padding, 12px) 16px;
		}
	}
</style>
```

### Fallback

Toujours fournir une valeur de fallback :

```css
/* Bon - avec fallback */
min-height: var(--min-touch-target, 44px);

/* Risque - sans fallback (si le token n'est pas defini) */
min-height: var(--min-touch-target);
```

---

## Comparaison des tailles

### Standards de l'industrie

| Platform               | Minimum recommande | Notre implementation |
| ---------------------- | ------------------ | -------------------- |
| Apple (iOS/macOS)      | 44x44px            | 44px                 |
| Google Material Design | 48x48dp            | 44px (compromis)     |
| WCAG 2.1 (AAA)         | 44x44px            | 44px                 |
| Microsoft Fluent       | 40x40px            | 44px                 |

### Tailles dans UbuMaths

| Element       | Desktop | Touch | Token utilise        |
| ------------- | ------- | ----- | -------------------- |
| Button        | 40px    | 44px  | `--min-touch-target` |
| Button sm     | 36px    | 40px  | Custom               |
| Checkbox zone | 16px    | 44px  | `--min-touch-target` |
| Switch zone   | 18px    | 44px  | `--min-touch-target` |
| Slider thumb  | 16px    | 24px  | Custom               |
| Select item   | 36px    | 44px  | `--min-touch-target` |

---

## Creer ses propres tokens

Si besoin de tokens supplementaires :

```css
/* Dans app.css, section @theme */
@theme {
	/* Tokens existants */
	--min-touch-target: 44px;
	--touch-padding: 12px;
	--touch-gap: 12px;

	/* Nouveaux tokens personnalises */
	--touch-icon-size: 24px;
	--touch-input-height: 48px;
}
```

---

## Media queries et tokens

### Combiner tokens et media queries

```css
.form-input {
	height: 36px;
	padding: 8px 12px;
}

@media (pointer: coarse) {
	.form-input {
		min-height: var(--min-touch-target, 44px);
		padding: var(--touch-padding, 12px);
	}
}
```

### Pattern avec gap

```css
.button-row {
	display: flex;
	gap: 8px;
}

@media (pointer: coarse) {
	.button-row {
		gap: var(--touch-gap, 12px);
	}
}
```

---

## Cas speciaux

### Elements inline

Pour les elements inline (liens, badges), utiliser le padding plutot que min-height :

```css
.inline-link {
	padding: 4px 8px;
}

@media (pointer: coarse) {
	.inline-link {
		padding: var(--touch-padding, 12px);
	}
}
```

### Grilles denses

Dans les grilles avec beaucoup d'elements, accepter un compromis :

```css
.dense-grid {
	gap: 4px;
}

@media (pointer: coarse) {
	.dense-grid {
		gap: 8px; /* Moins que --touch-gap pour la densite */
	}
}
```

### Elements avec contenu variable

Utiliser `min-height` plutot que `height` pour permettre l'expansion :

```css
.card {
	min-height: var(--min-touch-target, 44px);
	/* Pas height: 44px - le contenu peut deborder */
}
```
