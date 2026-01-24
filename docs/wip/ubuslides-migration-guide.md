# Guide de Portage UbuSlides : reveal.js → Svelte 5 Native

> **Objectif** : Remplacer reveal.js par un système de slides 100% Svelte 5 pour permettre l'intégration flexible dans l'application UbuMaths.

> **IMPORTANT - Contrainte principale** : Le système doit fonctionner **à l'intérieur d'un composant** de taille quelconque, pas uniquement en pleine page. C'est la raison fondamentale de cette migration.

---

## Table des matières

1. [Contexte et Motivation](#1-contexte-et-motivation)
2. [Architecture Actuelle (reveal.js)](#2-architecture-actuelle-revealjs)
3. [Architecture Cible (Svelte 5 Native)](#3-architecture-cible-svelte-5-native)
4. [Fonctionnalités à Implémenter](#4-fonctionnalités-à-implémenter)
5. [Plan de Migration](#5-plan-de-migration)
6. [Spécifications Techniques](#6-spécifications-techniques)
7. [Composants à Migrer](#7-composants-à-migrer)
8. [Tests et Validation](#8-tests-et-validation)

---

## 1. Contexte et Motivation

### Problème actuel

reveal.js impose des contraintes incompatibles avec les besoins UbuMaths :

| Contrainte reveal.js             | Besoin UbuMaths                      |
| -------------------------------- | ------------------------------------ |
| Viewport 100% obligatoire        | Slides dans un container quelconque  |
| Layout isolé (`+layout@.svelte`) | Intégration dans le layout principal |
| Styles globaux sur html/body     | Coexistence avec l'UI de l'app       |
| Système autonome                 | Évaluation interactive liée à l'app  |

### Cas d'usage cibles

1. **Présentation plein écran** - Mode classique pour projection
2. **Composant embarqué** - Dans une leçon, aide exercice, widget
3. **Évaluation interactive** - Questions avec scoring, lié à la base de données

### Contrainte technique fondamentale

**Le système DOIT fonctionner dans un container de taille quelconque**, pas uniquement en pleine page :

```svelte
<!-- ✅ DOIT fonctionner : inline dans une leçon -->
<article class="lesson-content">
	<h2>Les fractions</h2>
	<Deck class="h-[400px] w-full">
		<Slide>Explication...</Slide>
	</Deck>
	<p>Suite du texte...</p>
</article>

<!-- ✅ DOIT fonctionner : widget d'aide -->
<aside class="h-[200px] w-[300px]">
	<Deck compact>
		<Slide>Aide contextuelle</Slide>
	</Deck>
</aside>

<!-- ✅ DOIT fonctionner : plein écran aussi -->
<Deck fullscreen>
	<Slide>Présentation</Slide>
</Deck>
```

**Implications techniques :**

- Pas de styles sur `html`/`body`
- Pas de `position: fixed` sur le container principal
- Scale calculé par rapport au container parent, pas au viewport
- Navigation clavier liée au focus du composant
- Coexistence avec d'autres composants sur la même page

### Bénéfices attendus

- **Slides inline** n'importe où dans l'app (leçons, exercices, aide)
- Réactivité Svelte 5 native (pas de bridge API)
- Intégration thème Shadcn
- Maintenance simplifiée (pas de dépendance externe)
- Flexibilité totale sur le comportement
- Multiples instances sur la même page

---

## 2. Architecture Actuelle (reveal.js)

### Dépendances

```json
{
	"reveal.js": "^5.2.1"
}
```

### Structure des fichiers

```
src/lib/slides/
├── core/
│   ├── Deck.svelte              # Wrapper reveal.js (lifecycle, events)
│   ├── Slide.svelte             # Wrapper <section> + data-attributes
│   ├── UbuMarkSlide.svelte      # Markdown + MathLive
│   ├── QuestionSlide.svelte     # Questions interactives
│   ├── WhiteboardSlide.svelte   # Whiteboard avec annotations
│   ├── AnnotatableSlide.svelte  # Wrapper annotations génériques
│   ├── types.ts                 # Types TypeScript
│   ├── config.ts                # Configuration par défaut
│   └── context.ts               # Svelte context
├── components/
│   ├── SlideAnnotationLayer.svelte   # Layer SVG dessin
│   └── SlideAnnotationToolbar.svelte # Barre d'outils
├── stores/
│   └── slideAnnotationStore.svelte.ts
└── index.ts
```

### API reveal.js utilisée

| Méthode                       | Usage                         |
| ----------------------------- | ----------------------------- |
| `new Reveal(element, config)` | Initialisation                |
| `.initialize()`               | Démarrage                     |
| `.destroy()`                  | Cleanup                       |
| `.slide(h, v, f)`             | Navigation programmée         |
| `.next()` / `.prev()`         | Navigation séquentielle       |
| `.getIndices()`               | Position actuelle `{h, v, f}` |
| `.getTotalSlides()`           | Nombre total                  |
| `.layout()`                   | Recalcul dimensions           |
| `.configure(config)`          | Mise à jour config            |
| `.on('slidechanged', fn)`     | Event navigation              |

### Configuration par défaut

```typescript
// src/lib/slides/core/config.ts
export const defaultConfig: DeckConfig = {
	width: 1920,
	height: 1080,
	margin: 0.04,
	minScale: 0.2,
	maxScale: 2.0,
	center: true,

	controls: true,
	controlsLayout: 'bottom-right',
	keyboard: true,
	touch: true,
	mouseWheel: false,

	progress: true,
	slideNumber: false,
	hash: true,

	transition: 'slide',
	transitionSpeed: 'default',
	backgroundTransition: 'fade',

	fragments: true,
	fragmentInURL: true,
	autoAnimate: true,
	autoAnimateDuration: 1.0
};
```

### Fonctionnalités reveal.js utilisées vs non utilisées

| Fonctionnalité     | Utilisée | Notes                    |
| ------------------ | -------- | ------------------------ |
| Navigation clavier | ✅       | Flèches, Espace, Entrée  |
| Navigation touch   | ✅       | Swipe                    |
| Transitions        | ✅       | slide, fade, zoom, etc.  |
| Fragments          | ✅       | Apparition progressive   |
| Backgrounds        | ✅       | Images, couleurs         |
| Auto-animate       | ✅       | Transitions automatiques |
| Progress bar       | ✅       | Barre de progression     |
| Hash navigation    | ✅       | URL avec #/h/v           |
| Overview mode      | ❌       | Non utilisé              |
| Speaker notes      | ❌       | Non utilisé              |
| PDF export         | ❌       | Non utilisé              |
| Plugins            | ❌       | Aucun plugin             |

### Points de couplage critiques

1. **Structure HTML** : `.reveal > .slides > section`
2. **Classe `.present`** : Détection slide courante via MutationObserver
3. **Classe `.fragment`** : Éléments à révéler progressivement
4. **Transforms CSS** : Scale/translate appliqués par reveal.js
5. **Data attributes** : `data-transition`, `data-background-*`, etc.

---

## 3. Architecture Cible (Svelte 5 Native)

### Nouvelle structure

```
src/lib/slides/
├── core/
│   ├── Deck.svelte              # Container flexible (fullscreen OU inline)
│   ├── Slide.svelte             # Slide avec transitions Svelte
│   ├── UbuMarkSlide.svelte      # Inchangé (contenu markdown)
│   ├── QuestionSlide.svelte     # Inchangé (questions)
│   ├── WhiteboardSlide.svelte   # Adapté (coordonnées simplifiées)
│   ├── AnnotatableSlide.svelte  # Adapté
│   ├── types.ts                 # Types étendus
│   ├── config.ts                # Config simplifiée
│   └── context.ts               # Context Svelte
├── navigation/
│   ├── keyboard.ts              # Gestion clavier
│   ├── touch.ts                 # Gestion touch/swipe
│   └── hash.ts                  # Navigation URL
├── transitions/
│   ├── slide.ts                 # Transition slide
│   ├── fade.ts                  # Transition fade
│   └── zoom.ts                  # Transition zoom
├── components/
│   ├── Controls.svelte          # Boutons navigation
│   ├── Progress.svelte          # Barre de progression
│   ├── SlideAnnotationLayer.svelte   # Simplifié
│   └── SlideAnnotationToolbar.svelte # Inchangé
├── stores/
│   ├── deckStore.svelte.ts      # État du deck
│   └── slideAnnotationStore.svelte.ts # Inchangé
├── actions/
│   ├── swipe.ts                 # use:swipe
│   └── keyboard.ts              # use:keyboard
└── index.ts
```

### Principes de conception

1. **Container flexible (CRITIQUE)** : Le Deck s'adapte à son parent, quelle que soit sa taille
   - Inline dans un container 400x300px ✅
   - Plein écran via `fullscreen` prop ✅
   - Multiples instances sur la même page ✅
2. **Aucun style global** : Pas de modification de `html`/`body`, tout scopé au composant
3. **Réactivité native** : `$state`, `$derived`, `$effect` pour tout l'état
4. **Transitions Svelte** : `transition:`, `in:`, `out:` natifs
5. **Actions réutilisables** : `use:swipe`, `use:keyboard` pour les interactions
6. **Focus scoped** : Navigation clavier active uniquement quand le Deck a le focus

### Usage cible

```svelte
<!-- Mode plein écran -->
<Deck fullscreen>
	<Slide>Contenu...</Slide>
	<QuestionSlide question={q} />
</Deck>

<!-- Mode inline dans une leçon -->
<article class="lesson">
	<h1>Introduction aux fractions</h1>
	<p>Voici une explication...</p>

	<Deck class="h-[400px] rounded-lg border">
		<UbuMarkSlide content={explication} />
		<QuestionSlide question={exercice} />
	</Deck>

	<p>Suite de la leçon...</p>
</article>

<!-- Mode widget compact -->
<aside class="help-widget">
	<Deck compact controls={false}>
		<Slide>Aide rapide...</Slide>
	</Deck>
</aside>
```

---

## 4. Fonctionnalités à Implémenter

### 4.1 Navigation

#### Clavier

| Touche                  | Action                   |
| ----------------------- | ------------------------ |
| `→` `↓` `Space` `Enter` | Slide/fragment suivant   |
| `←` `↑` `Backspace`     | Slide/fragment précédent |
| `Home`                  | Première slide           |
| `End`                   | Dernière slide           |
| `Escape`                | Quitter fullscreen       |
| `F`                     | Toggle fullscreen        |

#### Touch/Souris

- Swipe gauche/droite : navigation horizontale
- Swipe haut/bas : navigation verticale (si slides verticales)
- Click sur zones : navigation (optionnel)

#### URL Hash

Format : `#/h/v/f` où h=horizontal, v=vertical, f=fragment

### 4.2 Transitions

Transitions Svelte natives à créer :

```typescript
// slide : glissement horizontal/vertical
// fade : fondu
// zoom : zoom avant/arrière
// none : instantané
```

Paramètres :

- `duration` : durée en ms (défaut: 400)
- `easing` : fonction easing (défaut: cubicOut)

### 4.3 Fragments

Système de révélation progressive :

```svelte
<Slide>
	<h1>Titre</h1>
	<p class="fragment">Apparaît en 2ème</p>
	<p class="fragment">Apparaît en 3ème</p>
</Slide>
```

États : `hidden` → `visible` (avec transition)

### 4.4 Layout

- Ratio fixe (16:9 par défaut, configurable)
- Centrage automatique
- Scale pour s'adapter au container
- Marges configurables

### 4.5 Backgrounds

Support pour :

- Couleur : `background="#ff0000"`
- Image : `backgroundImage="/path/to/image.jpg"`
- Vidéo : `backgroundVideo="/path/to/video.mp4"` (optionnel)
- Gradient : `background="linear-gradient(...)"`

---

## 5. Plan de Migration

### Phase 1 : Core Engine (Priorité haute)

**Objectif** : Deck fonctionnel avec navigation basique

1. **DeckStore** : État réactif du deck

   - currentSlide, currentFragment
   - totalSlides, totalFragments
   - isFullscreen, isAnimating

2. **Deck.svelte** : Container flexible

   - Props : `fullscreen`, `class`, `config`
   - Layout responsive avec ratio
   - Context provider

3. **Slide.svelte** : Wrapper basique

   - Props minimales (background, transition)
   - Slot pour contenu

4. **Navigation clavier** : Actions Svelte
   - `use:keyboard` sur le Deck
   - Gestion des événements

**Livrables** : Navigation flèches fonctionnelle, slides basiques

### Phase 2 : Transitions et Fragments

1. **Transitions Svelte**

   - `slideTransition`, `fadeTransition`, `zoomTransition`
   - Paramètres configurables

2. **Système de fragments**

   - Détection `.fragment` dans le DOM
   - État fragment par slide
   - Révélation avec transitions

3. **Hash navigation**
   - Sync URL ↔ état
   - Deep linking

**Livrables** : Transitions fluides, fragments fonctionnels

### Phase 3 : Touch et Contrôles UI

1. **Navigation touch**

   - `use:swipe` action
   - Seuils et vélocité configurables

2. **Composants UI**

   - `Controls.svelte` : flèches de navigation
   - `Progress.svelte` : barre de progression

3. **Mode fullscreen**
   - API Fullscreen browser
   - Toggle avec touche F

**Livrables** : Support mobile, UI complète

### Phase 4 : Migration composants existants

1. **Adapter les composants slide**

   - `UbuMarkSlide` : quasi inchangé
   - `QuestionSlide` : quasi inchangé
   - `WhiteboardSlide` : simplifier calcul coordonnées
   - `AnnotatableSlide` : simplifier

2. **Annotations**
   - `SlideAnnotationLayer` : adapter au nouveau système de coordonnées
   - `SlideAnnotationToolbar` : inchangé

**Livrables** : Tous les types de slides fonctionnels

### Phase 5 : Fonctionnalités avancées

1. **Auto-animate** (optionnel)

   - Transitions automatiques entre slides
   - Morphing d'éléments

2. **Backgrounds avancés**

   - Vidéo
   - Parallax

3. **Overview mode** (optionnel)
   - Vue grille de toutes les slides

**Livrables** : Feature parity avec l'usage actuel

### Phase 6 : Cleanup

1. Supprimer reveal.js de package.json
2. Supprimer le layout isolé `+layout@.svelte`
3. Mettre à jour la documentation
4. Tests complets

---

## 6. Spécifications Techniques

### 6.1 DeckStore

```typescript
// src/lib/slides/stores/deckStore.svelte.ts

interface DeckState {
  // Navigation
  currentH: number;           // Index horizontal (0-based)
  currentV: number;           // Index vertical (0-based)
  currentFragment: number;    // Index fragment (-1 = none)

  // Metadata
  slides: SlideInfo[];        // Info sur chaque slide
  totalSlides: number;

  // UI state
  isFullscreen: boolean;
  isAnimating: boolean;
  controlsVisible: boolean;
}

interface SlideInfo {
  h: number;
  v: number;
  fragments: number;          // Nombre de fragments
  background?: string;
  transition?: SlideTransition;
}

// API
function createDeckStore() {
  let state = $state<DeckState>({...});

  return {
    // Getters
    get current() { return state; },
    get currentSlide() { return { h: state.currentH, v: state.currentV }; },
    get progress() { return (flatIndex + 1) / state.totalSlides; },

    // Navigation
    next(): void,
    prev(): void,
    goTo(h: number, v?: number, f?: number): void,

    // Fragments
    nextFragment(): boolean,   // true si fragment révélé, false si fin slide
    prevFragment(): boolean,

    // Registration (appelé par les Slides au mount)
    registerSlide(info: SlideInfo): void,
    unregisterSlide(h: number, v: number): void,

    // UI
    toggleFullscreen(): void,
    setControlsVisible(visible: boolean): void,
  };
}
```

### 6.2 Deck.svelte

> **IMPORTANT** : Le Deck doit fonctionner dans un container de taille quelconque, pas seulement en pleine page.

```svelte
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { setContext } from 'svelte';
	import { createDeckStore } from '../stores/deckStore.svelte';
	import { keyboard } from '../actions/keyboard';
	import { swipe } from '../actions/swipe';
	import Controls from '../components/Controls.svelte';
	import Progress from '../components/Progress.svelte';

	interface Props {
		children: Snippet;
		fullscreen?: boolean; // Mode plein écran (optionnel)
		class?: string; // Classes CSS additionnelles
		width?: number; // Largeur de référence (défaut: 1920)
		height?: number; // Hauteur de référence (défaut: 1080)
		controls?: boolean;
		progress?: boolean;
		keyboard?: boolean;
		touch?: boolean;
		transition?: SlideTransition;
		onslidechanged?: (event: SlideChangedEvent) => void;
	}

	let {
		children,
		fullscreen = false,
		class: className = '',
		width = 1920,
		height = 1080,
		controls = true,
		progress = true,
		keyboard: keyboardEnabled = true,
		touch: touchEnabled = true,
		transition = 'slide',
		onslidechanged
	}: Props = $props();

	const store = createDeckStore();
	setContext('deck', store);

	let containerRef: HTMLElement;
	let scale = $state(1);

	// CRITIQUE : Calcul du scale par rapport au CONTAINER PARENT
	// (pas le viewport comme reveal.js)
	$effect(() => {
		if (!containerRef) return;
		const observer = new ResizeObserver(([entry]) => {
			const { width: cw, height: ch } = entry.contentRect;
			// Scale pour s'adapter au container parent
			scale = Math.min(cw / width, ch / height);
		});
		observer.observe(containerRef);
		return () => observer.disconnect();
	});

	// Event slide changed
	$effect(() => {
		const { currentH, currentV, currentFragment } = store.current;
		onslidechanged?.({ h: currentH, v: currentV, f: currentFragment });
	});

	// Focus management pour navigation clavier
	function handleClick() {
		containerRef?.focus();
	}
</script>

<!--
  IMPORTANT: Le container utilise position: relative, pas fixed
  Cela permet l'intégration inline dans n'importe quel parent
-->
<div
	bind:this={containerRef}
	class="deck {className}"
	class:fullscreen
	use:keyboard={{ enabled: keyboardEnabled, store }}
	use:swipe={{ enabled: touchEnabled, store }}
	role="application"
	aria-roledescription="presentation"
	tabindex="0"
	onclick={handleClick}
>
	<div
		class="slides-container"
		style:width="{width}px"
		style:height="{height}px"
		style:transform="scale({scale})"
	>
		{@render children()}
	</div>

	{#if controls}
		<Controls {store} />
	{/if}

	{#if progress}
		<Progress {store} />
	{/if}
</div>

<style>
	.deck {
		/* Mode inline par défaut - s'adapte au container parent */
		position: relative;
		width: 100%;
		height: 100%;
		overflow: hidden;
		background: var(--slide-background, #000);
		/* Focus visible pour accessibilité */
		outline: none;
	}

	.deck:focus-visible {
		outline: 2px solid var(--ring);
		outline-offset: 2px;
	}

	/* Mode plein écran optionnel */
	.deck.fullscreen {
		position: fixed;
		inset: 0;
		z-index: 9999;
	}

	.slides-container {
		position: absolute;
		top: 50%;
		left: 50%;
		transform-origin: center center;
		translate: -50% -50%;
	}
</style>
```

**Différences clés avec reveal.js :**

| Aspect              | reveal.js                | UbuSlides natif                   |
| ------------------- | ------------------------ | --------------------------------- |
| Container           | `position: fixed`, 100vh | `position: relative`, 100% parent |
| Scale               | Par rapport au viewport  | Par rapport au container parent   |
| Focus               | Global (window)          | Scoped au composant               |
| Styles html/body    | Modifiés globalement     | Non touchés                       |
| Multiples instances | Impossible               | Supporté                          |

### 6.3 Slide.svelte

```svelte
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { getContext, onMount } from 'svelte';
	import { fade, slide as slideTransition } from '../transitions';

	interface Props {
		children: Snippet;
		background?: string;
		backgroundImage?: string;
		transition?: SlideTransition;
		transitionSpeed?: 'slow' | 'default' | 'fast';
	}

	let {
		children,
		background,
		backgroundImage,
		transition = 'slide',
		transitionSpeed = 'default'
	}: Props = $props();

	const store = getContext<DeckStore>('deck');
	const slideIndex = { h: 0, v: 0 }; // Déterminé au mount

	let isVisible = $derived(store.currentH === slideIndex.h && store.currentV === slideIndex.v);

	// Register slide au mount
	onMount(() => {
		// Déterminer l'index basé sur la position DOM
		const fragments = countFragments();
		store.registerSlide({ ...slideIndex, fragments, background, transition });
		return () => store.unregisterSlide(slideIndex.h, slideIndex.v);
	});

	function countFragments(): number {
		// Compter les éléments .fragment dans le contenu
		return 0; // Implémentation réelle compte les éléments
	}

	const durations = { slow: 600, default: 400, fast: 200 };
	const duration = durations[transitionSpeed];
</script>

{#if isVisible}
	<section
		class="slide"
		style:background
		style:background-image={backgroundImage ? `url(${backgroundImage})` : undefined}
		in:slideTransition={{ duration, direction: 'in' }}
		out:slideTransition={{ duration, direction: 'out' }}
	>
		{@render children()}
	</section>
{/if}

<style>
	.slide {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		background-size: cover;
		background-position: center;
	}
</style>
```

### 6.4 Actions

```typescript
// src/lib/slides/actions/keyboard.ts
import type { Action } from 'svelte/action';

interface KeyboardParams {
	enabled: boolean;
	store: DeckStore;
}

export const keyboard: Action<HTMLElement, KeyboardParams> = (node, params) => {
	function handleKeydown(e: KeyboardEvent) {
		if (!params.enabled) return;

		switch (e.key) {
			case 'ArrowRight':
			case 'ArrowDown':
			case ' ':
			case 'Enter':
				e.preventDefault();
				params.store.next();
				break;
			case 'ArrowLeft':
			case 'ArrowUp':
			case 'Backspace':
				e.preventDefault();
				params.store.prev();
				break;
			case 'Home':
				e.preventDefault();
				params.store.goTo(0, 0);
				break;
			case 'End':
				e.preventDefault();
				params.store.goTo(params.store.totalSlides - 1, 0);
				break;
			case 'f':
			case 'F':
				e.preventDefault();
				params.store.toggleFullscreen();
				break;
			case 'Escape':
				if (params.store.isFullscreen) {
					e.preventDefault();
					params.store.toggleFullscreen();
				}
				break;
		}
	}

	node.addEventListener('keydown', handleKeydown);
	node.setAttribute('tabindex', '0');
	node.focus();

	return {
		update(newParams) {
			params = newParams;
		},
		destroy() {
			node.removeEventListener('keydown', handleKeydown);
		}
	};
};
```

```typescript
// src/lib/slides/actions/swipe.ts
import type { Action } from 'svelte/action';

interface SwipeParams {
	enabled: boolean;
	store: DeckStore;
	threshold?: number; // Minimum distance (px)
}

export const swipe: Action<HTMLElement, SwipeParams> = (node, params) => {
	let startX = 0;
	let startY = 0;
	const threshold = params.threshold ?? 50;

	function handleTouchStart(e: TouchEvent) {
		if (!params.enabled) return;
		startX = e.touches[0].clientX;
		startY = e.touches[0].clientY;
	}

	function handleTouchEnd(e: TouchEvent) {
		if (!params.enabled) return;
		const endX = e.changedTouches[0].clientX;
		const endY = e.changedTouches[0].clientY;
		const deltaX = endX - startX;
		const deltaY = endY - startY;

		if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > threshold) {
			// Swipe horizontal
			if (deltaX > 0) {
				params.store.prev();
			} else {
				params.store.next();
			}
		} else if (Math.abs(deltaY) > threshold) {
			// Swipe vertical (pour slides verticales)
			if (deltaY > 0) {
				params.store.prev(); // ou navigation verticale
			} else {
				params.store.next();
			}
		}
	}

	node.addEventListener('touchstart', handleTouchStart, { passive: true });
	node.addEventListener('touchend', handleTouchEnd, { passive: true });

	return {
		update(newParams) {
			params = newParams;
		},
		destroy() {
			node.removeEventListener('touchstart', handleTouchStart);
			node.removeEventListener('touchend', handleTouchEnd);
		}
	};
};
```

### 6.5 Transitions

```typescript
// src/lib/slides/transitions/slide.ts
import { cubicOut } from 'svelte/easing';

interface SlideParams {
	duration?: number;
	easing?: (t: number) => number;
	direction: 'in' | 'out';
}

export function slide(node: Element, params: SlideParams) {
	const { duration = 400, easing = cubicOut, direction } = params;

	return {
		duration,
		easing,
		css: (t: number) => {
			const x = direction === 'in' ? (1 - t) * 100 : t * -100;
			return `transform: translateX(${x}%); opacity: ${t}`;
		}
	};
}
```

---

## 7. Composants à Migrer

### 7.1 Composants quasi inchangés

| Composant                        | Modifications                                           |
| -------------------------------- | ------------------------------------------------------- |
| `UbuMarkSlide.svelte`            | Retirer logique `.fragment` DOM, utiliser système natif |
| `QuestionSlide.svelte`           | Aucune modification majeure                             |
| `SlideAnnotationToolbar.svelte`  | Aucune modification                                     |
| `slideAnnotationStore.svelte.ts` | Aucune modification                                     |

### 7.2 Composants à adapter

#### WhiteboardSlide.svelte

**Avant (reveal.js)** :

```typescript
// Calcul complexe pour compenser les transforms reveal.js
const actualScaleX = rect.width / pageWidth;
const actualScaleY = rect.height / pageHeight;
const x = (e.clientX - rect.left) / actualScaleX;
```

**Après (Svelte native)** :

```typescript
// Le scale est connu et contrôlé par nous
const x = (e.clientX - rect.left) / scale;
const y = (e.clientY - rect.top) / scale;
```

**Changements** :

- Supprimer MutationObserver sur `.present`
- Utiliser `isVisible` du store directement
- Simplifier calcul coordonnées (scale connu)

#### AnnotatableSlide.svelte

Mêmes simplifications que WhiteboardSlide.

#### SlideAnnotationLayer.svelte

- Simplifier `getPointerPosition()` (pas de compensation transform reveal.js)
- Le reste reste identique

### 7.3 Composants à supprimer

- Logique de bridge avec l'API reveal.js dans `Deck.svelte`
- Import CSS reveal.js

---

## 8. Tests et Validation

### Tests unitaires

```typescript
// Navigation
describe('DeckStore', () => {
  it('should navigate to next slide', () => {...});
  it('should navigate to previous slide', () => {...});
  it('should handle fragments before slide change', () => {...});
  it('should wrap at boundaries (or not, configurable)', () => {...});
});

// Keyboard
describe('keyboard action', () => {
  it('should handle arrow keys', () => {...});
  it('should handle space/enter', () => {...});
  it('should toggle fullscreen with F', () => {...});
});

// Touch
describe('swipe action', () => {
  it('should detect horizontal swipe', () => {...});
  it('should respect threshold', () => {...});
});
```

### Tests d'intégration

```typescript
describe('Deck component', () => {
  it('should render slides', () => {...});
  it('should scale to container', () => {...});
  it('should work in fullscreen mode', () => {...});
  it('should work inline', () => {...});
});

describe('Slide transitions', () => {
  it('should animate slide transition', () => {...});
  it('should animate fade transition', () => {...});
});
```

### Checklist de validation manuelle

**Navigation :**

- [ ] Navigation clavier (flèches, espace, entrée)
- [ ] Navigation touch (swipe)
- [ ] Hash navigation (#/h/v/f)

**Transitions :**

- [ ] Transitions fluides entre slides
- [ ] Fragments révélés progressivement

**Mode inline (CRITIQUE) :**

- [ ] Fonctionne dans un container 400x300px
- [ ] Fonctionne dans un container 800x600px
- [ ] Scale correct par rapport au container parent
- [ ] Pas de débordement hors du container
- [ ] Navigation clavier active au focus du composant
- [ ] Navigation clavier inactive quand autre élément a le focus
- [ ] Multiples instances sur la même page
- [ ] Chaque instance indépendante (navigation séparée)

**Mode plein écran :**

- [ ] Toggle avec F
- [ ] Escape pour quitter
- [ ] Transition fluide inline ↔ fullscreen

**Composants spéciaux :**

- [ ] Annotations fonctionnelles
- [ ] Questions interactives fonctionnelles
- [ ] Whiteboard fonctionnel

**Responsive :**

- [ ] Redimensionnement dynamique du container
- [ ] Mobile, tablette, desktop
- [ ] Thème sombre/clair (si applicable)

### Comparaison reveal.js vs Svelte native

| Fonctionnalité              | reveal.js | Svelte native      |
| --------------------------- | --------- | ------------------ |
| Navigation clavier          | ✅        | ✅                 |
| Navigation touch            | ✅        | ✅                 |
| Transitions                 | ✅        | ✅                 |
| Fragments                   | ✅        | ✅                 |
| Fullscreen                  | ✅        | ✅                 |
| Hash navigation             | ✅        | ✅                 |
| Controls UI                 | ✅        | ✅                 |
| Progress bar                | ✅        | ✅                 |
| Auto-animate                | ✅        | ✅ (à implémenter) |
| Overview                    | ✅        | Optionnel          |
| **Mode inline (container)** | ❌        | ✅                 |
| **Multiples instances**     | ❌        | ✅                 |
| **Pas de styles globaux**   | ❌        | ✅                 |
| **Focus scoped**            | ❌        | ✅                 |

---

## Annexes

### A. Fichiers reveal.js à supprimer après migration

```
- package.json: supprimer "reveal.js": "^5.2.1"
- src/routes/slides/+layout@.svelte (layout isolé plus nécessaire)
- Imports reveal.js CSS dans Deck.svelte
```

### B. Estimation effort

| Phase                           | Effort estimé            |
| ------------------------------- | ------------------------ |
| Phase 1 : Core Engine           | ~400 LOC                 |
| Phase 2 : Transitions/Fragments | ~200 LOC                 |
| Phase 3 : Touch/Controls        | ~200 LOC                 |
| Phase 4 : Migration composants  | ~100 LOC (modifications) |
| Phase 5 : Avancé (optionnel)    | ~200 LOC                 |
| **Total**                       | **~900-1100 LOC**        |

### C. Risques et mitigations

| Risque                   | Mitigation                                     |
| ------------------------ | ---------------------------------------------- |
| Performance transitions  | Utiliser CSS transforms, GPU acceleration      |
| Compatibilité mobile     | Tests sur vrais appareils                      |
| Régression fonctionnelle | Tests comparatifs avec version reveal.js       |
| Complexité fragments     | Implémenter progressivement, tester chaque cas |

---

## 9. Analyse du Code Source reveal.js

> Cette section documente en détail le fonctionnement interne de reveal.js pour reproduire à l'identique le look and feel.

### 9.1 Architecture reveal.js

reveal.js est organisé en contrôleurs modulaires :

```
js/
├── reveal.js           # Point d'entrée principal, orchestre tout
├── config.js           # Configuration par défaut
├── controllers/
│   ├── autoanimate.js  # Animations automatiques entre slides
│   ├── backgrounds.js  # Gestion des backgrounds
│   ├── controls.js     # Boutons de navigation
│   ├── fragments.js    # Révélation progressive
│   ├── keyboard.js     # Navigation clavier
│   ├── location.js     # Hash URL
│   ├── overview.js     # Vue grille
│   ├── plugins.js      # Système de plugins
│   ├── pointer.js      # Laser pointer
│   ├── progress.js     # Barre de progression
│   ├── slidecontent.js # Contenu média (vidéo, iframe)
│   ├── slidenumber.js  # Numéro de slide
│   └── touch.js        # Navigation tactile
├── components/
│   └── playback.js     # Contrôle lecture vidéo
└── utils/
    ├── constants.js    # Sélecteurs CSS
    ├── device.js       # Détection appareil
    └── util.js         # Utilitaires DOM
```

### 9.2 Contrôleur Keyboard (keyboard.js)

**Touches gérées :**

| Touche                      | Action               | Condition        |
| --------------------------- | -------------------- | ---------------- |
| `→` `↓` `Page Down` `N` `L` | next()               | -                |
| `←` `↑` `Page Up` `P` `H`   | prev()               | -                |
| `Home`                      | slide(0)             | -                |
| `End`                       | slide(totalSlides-1) | -                |
| `Space`                     | next() ou prev()     | Shift = prev     |
| `Enter`                     | next()               | -                |
| `Escape` `O`                | toggleOverview()     | overview activé  |
| `B` `.`                     | togglePause()        | -                |
| `F`                         | enterFullscreen()    | -                |
| `A`                         | toggleAutoSlide()    | autoSlide activé |
| `G`                         | toggleJumpToSlide()  | -                |
| `?`                         | toggleHelp()         | -                |

**Code clé :**

```javascript
// Gestion du modificateur Shift pour navigation inversée
if (!event.shiftKey && event.keyCode === 32) {
	this.Reveal.next();
} else if (event.shiftKey && event.keyCode === 32) {
	this.Reveal.prev();
}
```

**Focus management :**

- Ne réagit pas si focus dans `<input>`, `<textarea>`, `<select>`, `[contenteditable]`
- Shortcut custom via `config.keyboard` (objet keyCode → action)

### 9.3 Contrôleur Touch (touch.js)

**Détection swipe :**

```javascript
// Seuils configurables
const SWIPE_THRESHOLD = 40; // Distance minimum en px
const touchSensitivity = config.touch; // true ou valeur numérique

// Calcul delta
deltaX = currentX - startX;
deltaY = currentY - startY;

// Direction déterminée par delta absolu le plus grand
if (Math.abs(deltaX) > Math.abs(deltaY)) {
	// Swipe horizontal
	if (deltaX > SWIPE_THRESHOLD) prev();
	if (deltaX < -SWIPE_THRESHOLD) next();
} else {
	// Swipe vertical
	if (deltaY > SWIPE_THRESHOLD) navigateUp();
	if (deltaY < -SWIPE_THRESHOLD) navigateDown();
}
```

**Pointer events :**

- `pointerdown` : Enregistre position initiale
- `pointermove` : Calcule delta, bloque scroll natif si swipe détecté
- `pointerup` : Déclenche navigation
- `pointercancel` : Reset état

**Touch-action CSS :**

```css
.reveal {
	touch-action: pinch-zoom;
}
.reveal.embedded {
	touch-action: pan-y;
}
.reveal.embedded.is-vertical-slide {
	touch-action: none;
}
```

### 9.4 Contrôleur Fragments (fragments.js)

**Algorithme de révélation :**

1. Collecte tous les `.fragment` de la slide courante
2. Trie par `data-fragment-index` (ou ordre DOM si absent)
3. Groupes les fragments avec le même index
4. Navigation : révèle/cache un groupe à la fois

**Classes CSS :**

- `.fragment` : État initial (caché)
- `.fragment.visible` : Révélé
- `.fragment.current-fragment` : Fragment actuel (dernier révélé)

**Types de fragments (classes CSS) :**

```scss
.fragment {
	opacity: 0;
	visibility: hidden;
}
.fragment.visible {
	opacity: 1;
	visibility: inherit;
}

// Variantes
.fragment.grow.visible {
	transform: scale(1.3);
}
.fragment.shrink.visible {
	transform: scale(0.7);
}
.fragment.fade-up {
	transform: translate(0, 40px);
}
.fragment.fade-down {
	transform: translate(0, -40px);
}
.fragment.fade-left {
	transform: translate(40px, 0);
}
.fragment.fade-right {
	transform: translate(-40px, 0);
}
.fragment.fade-in-then-out.current-fragment {
	opacity: 1;
}
.fragment.highlight-red.visible {
	color: #ff2c2d;
}
.fragment.highlight-green.visible {
	color: #17ff2e;
}
.fragment.highlight-blue.visible {
	color: #1b91ff;
}
.fragment.strike.visible {
	text-decoration: line-through;
}
```

**Événements :**

- `fragmentshown` : Fragment révélé
- `fragmenthidden` : Fragment caché

### 9.5 Contrôleur Controls (controls.js)

**Structure HTML générée :**

```html
<aside class="controls">
	<button class="navigate-left" aria-label="previous slide">
		<div class="controls-arrow"></div>
	</button>
	<button class="navigate-right" aria-label="next slide">
		<div class="controls-arrow"></div>
	</button>
	<button class="navigate-up" aria-label="above slide">
		<div class="controls-arrow"></div>
	</button>
	<button class="navigate-down" aria-label="below slide">
		<div class="controls-arrow"></div>
	</button>
</aside>
```

**Styles des flèches (SCSS) :**

```scss
$controlArrowSize: 3.6em;
$controlArrowSpacing: 1.4em;
$controlArrowLength: 2.6em;
$controlArrowThickness: 0.5em;
$controlsArrowAngle: 45deg;

.controls-arrow:before,
.controls-arrow:after {
	content: '';
	position: absolute;
	width: $controlArrowLength;
	height: $controlArrowThickness;
	border-radius: $controlArrowThickness * 0.5;
	background-color: currentColor;
	transform-origin: 0.25em 50%;
}

.controls-arrow:before {
	transform: translateX(0.5em) translateY(1.55em) rotate(45deg);
}
.controls-arrow:after {
	transform: translateX(0.5em) translateY(1.55em) rotate(-45deg);
}

// Hover effect
.controls-arrow:hover:before {
	transform: ... rotate(40deg);
}
.controls-arrow:hover:after {
	transform: ... rotate(-40deg);
}
```

**Layouts :**

- `bottom-right` (défaut) : Flèches groupées en bas à droite
- `edges` : Flèches sur les bords (gauche, droite, haut, bas)

**États :**

- `.enabled` : Visible, cliquable
- `.fragmented` : Opacité réduite (prochain clic = fragment, pas slide)
- `.highlight` : Animation bounce pour attirer l'attention

### 9.6 Contrôleur Progress (progress.js)

**Structure HTML :**

```html
<div class="progress">
	<span></span>
</div>
```

**Style :**

```scss
.reveal .progress {
	position: absolute;
	height: 3px;
	width: 100%;
	bottom: 0;
	left: 0;
	z-index: 10;
	background-color: rgba(0, 0, 0, 0.2);
	color: #fff;
}

.reveal .progress span {
	display: block;
	height: 100%;
	background-color: currentColor;
	transform-origin: 0 0;
	transform: scaleX(0);
	transition: transform 800ms cubic-bezier(0.26, 0.86, 0.44, 0.985);
}
```

**Calcul progression :**

```javascript
// Index linéaire de la slide courante parmi toutes les slides
const totalSlides = this.Reveal.getTotalSlides();
const currentIndex = this.Reveal.getSlidePastCount();
const progress = currentIndex / (totalSlides - 1);

// Application via transform
progressSpan.style.transform = `scaleX(${progress})`;
```

### 9.7 Contrôleur Location (location.js)

**Format hash :**

```
#/h/v          → Slide horizontale h, verticale v
#/h/v/f        → + fragment f
#/slide-id     → Navigation par ID
```

**Lecture du hash :**

```javascript
const bits = hash.slice(2).split('/');
let h = parseInt(bits[0], 10) || 0;
let v = parseInt(bits[1], 10) || 0;
let f = parseInt(bits[2], 10) || undefined;
```

**Écriture du hash :**

```javascript
let hash = '/';
hash += indices.h;
if (indices.v > 0) hash += '/' + indices.v;
if (indices.f !== undefined) hash += '/' + indices.f;
window.location.hash = hash;
```

### 9.8 Contrôleur Backgrounds (backgrounds.js)

**Structure HTML :**

```html
<div class="backgrounds">
	<div class="slide-background">
		<div class="slide-background-content"></div>
	</div>
	<!-- Un par slide -->
</div>
```

**Data attributes supportés :**

- `data-background` : Couleur ou image (auto-détection)
- `data-background-color` : Couleur explicite
- `data-background-image` : URL image
- `data-background-video` : URL vidéo
- `data-background-iframe` : URL iframe
- `data-background-gradient` : Gradient CSS
- `data-background-size` : cover, contain, etc.
- `data-background-position` : Position CSS
- `data-background-repeat` : Répétition
- `data-background-opacity` : Opacité (0-1)
- `data-background-transition` : Transition spécifique

**Détection contraste :**

```javascript
// Ajoute .has-dark-background ou .has-light-background
if (colorBrightness(backgroundColor) < 128) {
	slide.classList.add('has-dark-background');
} else {
	slide.classList.add('has-light-background');
}
```

### 9.9 Contrôleur AutoAnimate (autoanimate.js)

**Principe FLIP (First, Last, Invert, Play) :**

1. **First** : Mesure position/taille des éléments sur la slide source
2. **Last** : Mesure position/taille des éléments sur la slide cible
3. **Invert** : Applique transform pour que la cible ressemble à la source
4. **Play** : Transition vers position/taille finale

**Matching d'éléments :**

```javascript
// Par data-id (explicite)
'[data-id]' → node.getAttribute('data-id')

// Par contenu (implicite)
'h1, h2, h3, h4, h5, h6, p, li' → node.textContent
'img, video, iframe' → node.getAttribute('src')
'pre' → node.textContent (code)
```

**Propriétés animées par défaut :**

```javascript
config.autoAnimateStyles = [
	'opacity',
	'color',
	'background-color',
	'padding',
	'font-size',
	'line-height',
	'letter-spacing',
	'border-width',
	'border-color',
	'border-radius',
	'outline',
	'outline-offset'
];
```

**Data attributes :**

- `data-auto-animate` : Active l'animation
- `data-auto-animate-id` : Groupe les slides (même ID = même séquence)
- `data-auto-animate-restart` : Force nouvelle séquence
- `data-auto-animate-duration` : Durée personnalisée
- `data-auto-animate-easing` : Easing personnalisé
- `data-auto-animate-delay` : Délai personnalisé

### 9.10 Contrôleur Overview (overview.js)

**Activation :**

```javascript
// Touche O ou Escape
this.Reveal.getRevealElement().classList.add('overview');
```

**Layout grille :**

```javascript
const margin = 70;
const slideWidth = slideSize.width + margin;
const slideHeight = slideSize.height + margin;

// Position chaque slide
slides.forEach((slide, h) => {
	transformElement(slide, `translate3d(${h * slideWidth}px, 0, 0)`);

	// Slides verticales
	verticalSlides.forEach((vslide, v) => {
		transformElement(vslide, `translate3d(0, ${v * slideHeight}px, 0)`);
	});
});
```

**Scale global :**

```javascript
const vmin = Math.min(window.innerWidth, window.innerHeight);
const scale = Math.max(vmin / 5, 150) / vmin;

this.Reveal.transformSlides({
	overview: `scale(${scale}) translateX(${-h * slideWidth}px) translateY(${-v * slideHeight}px)`
});
```

**Styles overview :**

```scss
.reveal.overview .slides section {
	height: 100%;
	top: 0 !important;
	opacity: 1 !important;
	cursor: pointer;
}

.reveal.overview .slides section:hover,
.reveal.overview .slides section.present {
	outline: 10px solid rgba(150, 150, 150, 0.6);
	outline-offset: 10px;
}

.reveal.overview .slides section.present {
	outline-color: var(--r-link-color);
}
```

### 9.11 CSS Transitions reveal.js

**Easing par défaut :**

```scss
transition: transform 800ms cubic-bezier(0.26, 0.86, 0.44, 0.985);
```

**Vitesses :**

```scss
// Default: 800ms
[data-transition-speed='fast'] {
	transition-duration: 400ms;
}
[data-transition-speed='slow'] {
	transition-duration: 1200ms;
}
```

**Type "slide" :**

```scss
.slides > section.past {
	transform: translate(-150%, 0);
}
.slides > section.future {
	transform: translate(150%, 0);
}
// Vertical
.slides > section > section.past {
	transform: translate(0, -150%);
}
.slides > section > section.future {
	transform: translate(0, 150%);
}
```

**Type "fade" :**

```scss
.reveal.fade .slides section {
	transform: none;
	transition: opacity 0.5s;
}
```

**Type "convex" (3D) :**

```scss
.slides > section.past {
	transform: translate3d(-100%, 0, 0) rotateY(-90deg) translate3d(-100%, 0, 0);
}
.slides > section.future {
	transform: translate3d(100%, 0, 0) rotateY(90deg) translate3d(100%, 0, 0);
}
```

**Type "zoom" :**

```scss
.slides > section.past {
	transform: scale(16);
	visibility: hidden;
}
.slides > section.future {
	transform: scale(0.2);
	visibility: hidden;
}
```

### 9.12 Layout et Scaling reveal.js

> **⚠️ LIMITATION reveal.js** : Le layout reveal.js est conçu pour le viewport complet.
> Pour un mode inline (container de taille quelconque), il faut adapter cette logique
> pour calculer le scale par rapport au container parent, pas au viewport.

**Calcul du scale reveal.js (à adapter) :**

```javascript
function layout() {
	const size = getComputedSlideSize();
	const presentationWidth = size.width;
	const presentationHeight = size.height;

	// reveal.js utilise le viewport
	const viewportWidth = dom.wrapper.offsetWidth;
	const viewportHeight = dom.wrapper.offsetHeight;

	// Scale pour s'adapter au viewport
	let scale = Math.min(viewportWidth / presentationWidth, viewportHeight / presentationHeight);

	// Clamp entre minScale et maxScale
	scale = Math.max(scale, config.minScale);
	scale = Math.min(scale, config.maxScale);

	// Appliquer
	dom.slides.style.transform = `scale(${scale})`;
}
```

**Version adaptée pour mode inline :**

```javascript
// Utilise ResizeObserver sur le container parent au lieu du viewport
const observer = new ResizeObserver(([entry]) => {
	const { width: containerWidth, height: containerHeight } = entry.contentRect;

	let scale = Math.min(containerWidth / presentationWidth, containerHeight / presentationHeight);

	scale = Math.max(scale, config.minScale);
	scale = Math.min(scale, config.maxScale);

	slidesContainer.style.transform = `scale(${scale})`;
});

observer.observe(containerElement);
```

**Dimensions par défaut :**

```javascript
{
  width: 960,   // Largeur de référence
  height: 700,  // Hauteur de référence
  margin: 0.04, // Marge en % de la plus petite dimension
  minScale: 0.2,
  maxScale: 2.0
}
```

**Centrage :**

```scss
.reveal .slides {
	position: absolute;
	width: 100%;
	height: 100%;
	top: 0;
	left: 0;
	margin: auto;
	perspective: 600px;
	perspective-origin: 50% 40%;
}
```

### 9.13 Perspective et 3D

**Valeurs reveal.js :**

```scss
.reveal .slides {
	perspective: 600px;
	perspective-origin: 50% 40%; // Légèrement au-dessus du centre
}

.reveal .slides > section {
	perspective: 600px; // Pour les slides horizontales
}

.reveal.overview {
	perspective: 700px;
	perspective-origin: 50% 50%;
}
```

### 9.14 Variables CSS reveal.js

```scss
.reveal-viewport {
	--r-controls-spacing: 12px;
	--r-overlay-header-height: 40px;
	--r-overlay-margin: 0px;
	--r-overlay-padding: 6px;
	--r-overlay-gap: 5px;
}

// Mobile
@media screen and (max-width: 1024px), (max-height: 768px) {
	.reveal-viewport {
		--r-overlay-header-height: 26px;
	}
}

// Sur écrans > 500px
@media screen and (min-width: 500px) {
	.reveal-viewport {
		--r-controls-spacing: 0.8em;
	}
}
```

### 9.15 Configuration Complète reveal.js

```javascript
// Toutes les options avec valeurs par défaut
const defaultConfig = {
  // Dimensions
  width: 960,
  height: 700,
  margin: 0.04,
  minScale: 0.2,
  maxScale: 2.0,

  // Affichage
  controls: true,
  controlsTutorial: true,
  controlsLayout: 'bottom-right', // ou 'edges'
  controlsBackArrows: 'faded',    // 'faded', 'hidden', 'visible'
  progress: true,
  slideNumber: false,
  showSlideNumber: 'all',
  hashOneBasedIndex: false,
  hash: false,
  respondToHashChanges: true,
  history: false,

  // Navigation
  keyboard: true,
  keyboardCondition: null,
  disableLayout: false,
  overview: true,
  center: true,
  touch: true,
  loop: false,
  rtl: false,
  navigationMode: 'default', // 'default', 'linear', 'grid'
  shuffle: false,
  fragments: true,
  fragmentInURL: true,
  embedded: false,
  help: true,
  pause: true,
  showNotes: false,

  // Auto-slide
  autoSlide: 0,
  autoSlideStoppable: true,
  autoSlideMethod: null,

  // Transitions
  transition: 'slide', // 'none', 'fade', 'slide', 'convex', 'concave', 'zoom'
  transitionSpeed: 'default', // 'default', 'fast', 'slow'
  backgroundTransition: 'fade',

  // Auto-animate
  autoAnimate: true,
  autoAnimateMatcher: null,
  autoAnimateEasing: 'ease',
  autoAnimateDuration: 1.0,
  autoAnimateUnmatched: true,
  autoAnimateStyles: [...],

  // Autres
  viewDistance: 3,
  mobileViewDistance: 2,
  display: 'block',
  hideInactiveCursor: true,
  hideCursorTime: 5000,

  // Plugins
  plugins: []
};
```

---

## Conclusion

Ce guide fournit toutes les informations nécessaires pour migrer UbuSlides de reveal.js vers une solution 100% Svelte 5 native.

### Objectif principal atteint

**Le système fonctionne dans un container de taille quelconque**, pas uniquement en pleine page :

```svelte
<!-- Inline dans une leçon - LE CAS D'USAGE PRINCIPAL -->
<article class="lesson">
	<Deck class="h-[400px]">
		<Slide>...</Slide>
	</Deck>
</article>

<!-- Plein écran pour présentation -->
<Deck fullscreen>...</Deck>

<!-- Multiples instances -->
<div class="grid grid-cols-2">
	<Deck class="h-[300px]">...</Deck>
	<Deck class="h-[300px]">...</Deck>
</div>
```

### Bénéfices de la migration

1. **Mode inline** : Slides intégrées dans les leçons, exercices, aide contextuelle
2. **Multiples instances** : Plusieurs présentations sur la même page
3. **Pas de styles globaux** : Aucune modification de `html`/`body`
4. **Focus scoped** : Navigation clavier liée au focus du composant
5. **Réactivité Svelte** : État géré nativement, pas de bridge API
6. **Maintenabilité** : Pas de dépendance externe à maintenir

### Le plan en 6 phases

1. **Core Engine** : Navigation basique, scale par rapport au container
2. **Transitions/Fragments** : Animations et révélation progressive
3. **Touch/Controls** : Support mobile et UI
4. **Migration composants** : QuestionSlide, WhiteboardSlide, etc.
5. **Fonctionnalités avancées** : Auto-animate, overview (optionnel)
6. **Cleanup** : Suppression reveal.js

Chaque phase peut être validée indépendamment avec des tests spécifiques pour le mode inline.
