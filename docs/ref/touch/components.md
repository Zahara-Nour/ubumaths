# Patterns d'adaptation des composants

Ce document decrit les patterns utilises pour rendre les composants touch-friendly.

---

## Pattern 1 : Media query dans le style

Le plus simple. Utilise quand seule la taille change.

### Exemple : Button

```svelte
<button class="btn" {disabled}>
	{@render children?.()}
</button>

<style>
	.btn {
		height: 40px;
		padding: 8px 16px;
	}

	@media (pointer: coarse) {
		.btn {
			min-height: var(--min-touch-target, 44px);
		}
	}
</style>
```

### Quand l'utiliser

- Le composant a une taille fixe a augmenter
- Pas de changement structurel
- Simple et lisible

### Implementation dans UbuMaths

**Fichier** : `src/lib/components/ui/button/button.svelte`

```svelte
<style>
	@media (pointer: coarse) {
		:global([data-slot='button'].touch-target) {
			min-height: var(--min-touch-target, 44px);
		}

		:global([data-slot='button'].touch-target.h-9) {
			min-height: 40px;
		}
	}
</style>
```

---

## Pattern 2 : Wrapper avec zone etendue

Pour les petits elements (checkbox, switch) dont la taille visuelle doit rester petite mais la zone cliquable doit etre grande.

### Exemple : Checkbox

```svelte
<span class="checkbox-wrapper">
	<input type="checkbox" class="checkbox" />
</span>

<style>
	.checkbox {
		width: 16px;
		height: 16px;
	}

	.checkbox-wrapper {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		position: relative;
	}

	@media (pointer: coarse) {
		.checkbox-wrapper {
			min-width: var(--min-touch-target, 44px);
			min-height: var(--min-touch-target, 44px);
		}
	}
</style>
```

### Principe

```
┌─────────────────────────────────────┐
│                                     │
│   Zone cliquable (44x44)            │
│                                     │
│         ┌───────────┐               │
│         │  Checkbox │               │
│         │  (16x16)  │               │
│         └───────────┘               │
│                                     │
└─────────────────────────────────────┘
```

### Quand l'utiliser

- Element visuellement petit (< 24px)
- La taille visuelle ne doit pas changer
- Besoin d'une grande zone de tap

### Implementation dans UbuMaths

**Fichier** : `src/lib/components/ui/checkbox/checkbox.svelte`

```svelte
<span class="checkbox-touch-wrapper">
	<CheckboxPrimitive.Root ... />
</span>

<style>
	.checkbox-touch-wrapper {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		position: relative;
	}

	@media (pointer: coarse) {
		.checkbox-touch-wrapper {
			min-width: var(--min-touch-target, 44px);
			min-height: var(--min-touch-target, 44px);
		}
	}
</style>
```

---

## Pattern 3 : Wrapper avec pseudo-element

Variante du pattern 2 avec un pseudo-element pour etendre la zone cliquable sans affecter le layout.

### Exemple : Switch

```svelte
<div class="switch-wrapper">
	<Switch ... />
</div>

<style>
	.switch-wrapper {
		display: inline-flex;
		align-items: center;
		position: relative;
	}

	@media (pointer: coarse) {
		.switch-wrapper {
			min-height: var(--min-touch-target, 44px);
			padding-inline: 0.5rem;
		}

		/* Zone de tap invisible etendue */
		.switch-wrapper::before {
			content: '';
			position: absolute;
			inset: -0.75rem;
			z-index: -1;
		}
	}
</style>
```

### Quand l'utiliser

- Le wrapper ne doit pas prendre de place supplementaire visuellement
- Elements inline qui ne doivent pas casser le flow

---

## Pattern 4 : Classe conditionnelle avec store

Pour des adaptations plus complexes qui necessitent JavaScript.

### Exemple : Custom component

```svelte
<script>
	import { inputCapability } from '$lib/stores/input-capability.svelte';
</script>

<div class="container" class:touch-mode={inputCapability.hasTouch}>
	<slot />
</div>

<style>
	.container {
		padding: 8px;
	}

	.container.touch-mode {
		padding: 12px;
	}
</style>
```

### Quand l'utiliser

- Logique conditionnelle complexe
- Plusieurs styles dependants
- Besoin de connaitre l'etat dans le script

---

## Composants adaptes dans UbuMaths

### Button

| Variante | Desktop | Touch |
| -------- | ------- | ----- |
| default  | 40px    | 44px  |
| sm       | 36px    | 40px  |
| lg       | 44px    | 44px  |
| icon     | 40px    | 44px  |
| icon-sm  | 36px    | 40px  |

### MyCheckbox

- Checkbox visuel : 16x16px (inchange)
- Zone cliquable : 16x16px (desktop) → 44x44px (touch)
- Le label fait partie de la zone cliquable

### MySelect

- Trigger : 36px (desktop) → 44px (touch)
- Items du dropdown : 36px → 44px
- Padding vertical augmente sur touch

### Switch

- Switch visuel : 18x32px (inchange)
- Zone cliquable : augmentee a 44px via wrapper

### Slider

- Thumb : 16px (desktop) → 24px (touch)
- Track : epaisseur augmentee sur touch

### Checkbox primitif

- Checkbox visuel : 16x16px (inchange)
- Zone cliquable : wrapper 44x44px sur touch

---

## Creer un nouveau composant touch-friendly

### Checklist

1. **Identifier le type d'element**

   - Element de taille variable → Pattern 1 (media query)
   - Element visuellement petit → Pattern 2 ou 3 (wrapper)
   - Logique complexe → Pattern 4 (store)

2. **Definir les tailles**

   - Desktop : selon le design
   - Touch : minimum 44px ou proportionnel

3. **Choisir la media query**

   - `(pointer: coarse)` : input primaire est tactile
   - `(any-pointer: coarse)` : au moins un input tactile

4. **Tester**
   - Chrome DevTools → Toggle device toolbar
   - Ou vrai appareil tactile

### Template

```svelte
<script>
	// Props...
</script>

<div class="my-component">
	<!-- Contenu -->
</div>

<style>
	.my-component {
		/* Styles desktop */
		height: 36px;
	}

	@media (pointer: coarse) {
		.my-component {
			/* Styles touch */
			min-height: var(--min-touch-target, 44px);
		}
	}
</style>
```

---

## Considerations de layout

### Espacement entre elements

```css
.button-group {
	display: flex;
	gap: 8px;
}

@media (pointer: coarse) {
	.button-group {
		gap: var(--touch-gap, 12px);
	}
}
```

### Grilles responsives

```css
.grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
	gap: 8px;
}

@media (pointer: coarse) {
	.grid {
		/* Colonnes plus larges, moins nombreuses */
		grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
		gap: 12px;
	}
}
```

### Formulaires

```css
.form-field {
	margin-bottom: 16px;
}

.form-input {
	height: 36px;
}

@media (pointer: coarse) {
	.form-field {
		margin-bottom: 20px;
	}

	.form-input {
		min-height: 44px;
	}
}
```
