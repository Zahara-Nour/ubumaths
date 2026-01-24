# Debug: Fragment Flash dans UbuSlides

## Probleme

Les fragments (elements avec classe `.fragment`) flashent brievement quand on navigue vers une slide qui en contient. Le flash est visible sur la slide "Liste avec Fragments" de la demo (`/slides/demo`).

## Contexte technique

UbuSlides est un systeme de presentation 100% Svelte 5 (sans reveal.js). L'architecture suit le pattern de reveal.js pour les fragments :

- Les fragments sont des elements avec la classe `.fragment`
- Ils sont caches par defaut (`opacity: 0`)
- Quand on appuie sur "next", on ajoute la classe `.visible` pour les reveler un par un
- Le comptage des fragments se fait via `querySelectorAll('.fragment')` au moment ou on en a besoin (pas de stockage en state)

## Fichiers cles

### Slide.svelte (src/lib/slides/core/Slide.svelte)

- Composant de base pour les slides
- Gere les transitions Svelte (`in:slideIn`, `out:slideOut`, etc.)
- CSS pour fragments : `.slide .fragment { opacity: 0 !important; visibility: hidden !important; }`
- Action `use:initFragments` pour initialiser la visibilite des fragments

### UbuMarkSlide.svelte (src/lib/slides/core/UbuMarkSlide.svelte)

- Slide avec contenu Markdown (UbuMark)
- Les fragments sont crees dynamiquement via `processFragmentMarkers()` qui cherche ` ->` dans le texte
- Delai de 50ms pour attendre le rendu de MarkdownRenderer
- Le contenu est cache (`opacity: 0`) jusqu'a `fragmentsReady = true`

### deckStore.svelte.ts (src/lib/slides/stores/deckStore.svelte.ts)

- Store de navigation (h, v, f pour horizontal, vertical, fragment)
- `getTotalFragments()` query le DOM pour compter les fragments
- `next()` incremente `f` avant de passer a la slide suivante

## Ce qu'on a essaye (sans succes)

1. **CSS plus specifique** : `.slide .fragment:not(.visible) { opacity: 0 !important }`
2. **Action Svelte** : `use:initFragments` pour traiter les fragments de maniere synchrone
3. **Transition sur .visible seulement** : Enlever la transition du state cache
4. **Cacher UbuMarkSlide** : `opacity: 0` jusqu'a `fragmentsReady = true`

## Hypotheses restantes

1. **Timing du rendu Svelte** : Le flash pourrait se produire entre le moment ou le DOM est cree et le moment ou le CSS/JS s'applique
2. **Transition de slide** : La transition `in:slideIn` anime l'opacite de 0 a 1, peut-etre conflit avec le CSS
3. **MarkdownRenderer async** : Le rendu Markdown pourrait etre asynchrone et creer les elements apres le check initial
4. **Browser paint** : Le navigateur pourrait faire un paint avant que les styles soient appliques

## Pour reproduire

1. `pnpm dev -- --port 5175`
2. Aller sur `http://localhost:5175/slides/demo`
3. Naviguer jusqu'a la slide "Liste avec Fragments" (slide 4)
4. Observer le flash des items de liste

## Code de la slide problematique

```svelte
<!-- Dans +page.svelte -->
const listSlideContent = ` ## Liste avec fragments - Premier point -> - Deuxieme point -> - Troisieme
point -> `;

<UbuMarkSlide content={listSlideContent} background="#16213e" />
```

## Pistes de solution

1. **Pre-traiter le Markdown** : Ajouter les classes `.fragment` directement dans le HTML genere par MarkdownRenderer, avant le rendu
2. **Utiliser `display: none`** au lieu de `opacity: 0` pour les fragments non-ready
3. **Retarder la transition de slide** jusqu'a ce que les fragments soient prets
4. **Utiliser `requestAnimationFrame`** ou `queueMicrotask` pour synchroniser avec le paint du navigateur
