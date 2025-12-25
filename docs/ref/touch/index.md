# Touch Detection & Adaptive UI

Guide technique pour la detection des capacites d'input et l'adaptation de l'interface aux appareils tactiles.

## Vue d'ensemble

Ce systeme permet a UbuMaths de s'adapter automatiquement aux capacites d'input de l'utilisateur :

- **Detection fiable** : Utilise les CSS media queries (`pointer`, `hover`) plutot que le user-agent
- **Reactif** : S'adapte en temps reel si l'utilisateur connecte/deconnecte une souris
- **Non-intrusif** : Les composants sont touch-friendly par defaut sur appareils tactiles
- **Design defensif** : Base touch-friendly, ameliorations pour souris

---

## Table des matieres

| Document                               | Description                                |
| -------------------------------------- | ------------------------------------------ |
| [detection.md](detection.md)           | Store inputCapability et media queries     |
| [css-tokens.md](css-tokens.md)         | Tokens CSS pour les tailles touch-friendly |
| [components.md](components.md)         | Patterns d'adaptation des composants       |
| [best-practices.md](best-practices.md) | Bonnes pratiques et anti-patterns          |
| [testing.md](testing.md)               | Comment tester les comportements touch     |

---

## Concepts cles

### Difference entre taille d'ecran et capacite d'input

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   mobileStore (taille d'ecran)    inputCapability (input)       │
│   ────────────────────────────    ─────────────────────────     │
│                                                                 │
│   < 768px  = isMobile             any-pointer: coarse = touch   │
│   < 1024px = isTablet             any-pointer: fine   = mouse   │
│   >= 1024px = isDesktop           any-hover: hover    = hover   │
│                                                                 │
│   Usage: Layout responsive        Usage: Taille des cibles      │
│          Navigation                      Comportements          │
│          Colonnes                        Tooltips vs popover    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Exemple concret** :

- Un iPad en mode paysage (1024px) : `isDesktop=true` mais `hasTouch=true`
- Un laptop avec ecran tactile : `isDesktop=true`, `hasTouch=true`, `hasMouse=true`

### Les 4 media queries d'interaction

| Query                   | Detecte                                   | Exemple           |
| ----------------------- | ----------------------------------------- | ----------------- |
| `(pointer: coarse)`     | Input **primaire** = doigt/stylet large   | Smartphone        |
| `(pointer: fine)`       | Input **primaire** = souris/stylet precis | Desktop           |
| `(any-pointer: coarse)` | **Au moins un** input grossier disponible | Laptop tactile    |
| `(any-pointer: fine)`   | **Au moins un** input precis disponible   | Tablette + souris |
| `(hover: none)`         | Input **primaire** ne peut pas hover      | Smartphone        |
| `(hover: hover)`        | Input **primaire** peut hover             | Desktop           |
| `(any-hover: hover)`    | **Au moins un** input peut hover          | Tablette + souris |

---

## Quick Start

### Utiliser le store JavaScript

```svelte
<script>
	import { inputCapability } from '$lib/stores/input-capability.svelte';
</script>

{#if inputCapability.hasTouch && !inputCapability.canHover}
	<p>Appuyez longuement pour plus d'options</p>
{:else}
	<p>Clic droit pour plus d'options</p>
{/if}
```

### Utiliser les media queries CSS

```svelte
<button class="action-btn">Valider</button>

<style>
	.action-btn {
		height: 40px; /* Desktop */
	}

	@media (pointer: coarse) {
		.action-btn {
			min-height: 44px; /* Touch - minimum recommande */
		}
	}
</style>
```

### Utiliser les tokens CSS

```css
.touch-target {
	min-height: var(--min-touch-target, 44px);
	padding: var(--touch-padding, 12px);
	gap: var(--touch-gap, 12px);
}
```

---

## Architecture

```
src/
├── lib/
│   ├── stores/
│   │   ├── input-capability.svelte.ts  # Detection des capacites d'input
│   │   └── mobile.svelte.ts            # Detection de la taille d'ecran
│   └── components/
│       ├── ui/
│       │   ├── button/button.svelte    # Adaptatif touch/mouse
│       │   ├── checkbox/checkbox.svelte
│       │   ├── switch/switch.svelte
│       │   └── slider/slider.svelte
│       ├── MyCheckbox.svelte           # Wrapper touch-friendly
│       └── MySelect.svelte             # Wrapper touch-friendly
└── app.css                             # Tokens CSS globaux
```

---

## Ressources externes

- [W3C Pointer Media Queries](https://www.w3.org/TR/mediaqueries-4/#mf-interaction)
- [Apple Human Interface Guidelines - Touch Targets](https://developer.apple.com/design/human-interface-guidelines/accessibility#Touch-targets)
- [Smashing Magazine - Guide to Hover and Pointer Media Queries](https://www.smashingmagazine.com/2022/03/guide-hover-pointer-media-queries/)
- [CSS-Tricks - Interaction Media Features](https://css-tricks.com/interaction-media-features-and-their-potential-for-incorrect-assumptions/)
