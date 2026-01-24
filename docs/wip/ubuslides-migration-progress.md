# UbuSlides Migration Progress

## Status: Phase 1 - Core Engine

### Completed

- [x] Exploration du code existant
- [x] Compréhension de l'architecture actuelle (reveal.js)

### In Progress

- [x] 1.1 Créer `deckStore.svelte.ts`
- [x] 1.2 Mettre à jour `types.ts`
- [x] 1.3 Créer transitions
- [x] 1.4 Créer `navigation/hash.ts`
- [x] 1.5 Réécrire `Deck.svelte`
- [x] 1.6 Réécrire `Slide.svelte`
- [x] 1.7 Simplifier `WhiteboardSlide.svelte`
- [x] 1.8 Simplifier `AnnotatableSlide.svelte`
- [x] 1.9 Tests unitaires (51 tests)
- [x] 1.10 Code Review + fixes
- [ ] 1.11 Commit

### Decisions

- DeckStore: Instance par Deck via Context (pas singleton)
- Slides verticales: Slot nommé `vertical`
- Fragments: Detection `.fragment` via querySelectorAll au mount
- Scale: ResizeObserver sur container parent
- Focus clavier: tabindex="0" + événements scopés au focus
- Thème: Variables CSS Shadcn

### Files Modified

- `src/lib/slides/stores/deckStore.svelte.ts` - NOUVEAU
- `src/lib/slides/core/types.ts` - MIS À JOUR (suppression reveal.js)
- `src/lib/slides/core/config.ts` - SIMPLIFIÉ
- `src/lib/slides/core/context.ts` - MIS À JOUR (nouvelles clés)
- `src/lib/slides/transitions/slide.ts` - NOUVEAU
- `src/lib/slides/transitions/fade.ts` - NOUVEAU
- `src/lib/slides/navigation/hash.ts` - NOUVEAU
- `src/lib/slides/actions/keyboard.ts` - NOUVEAU
- `src/lib/slides/core/Deck.svelte` - RÉÉCRIT
- `src/lib/slides/core/Slide.svelte` - RÉÉCRIT
- `src/lib/slides/core/WhiteboardSlide.svelte` - SIMPLIFIÉ
- `src/lib/slides/core/AnnotatableSlide.svelte` - SIMPLIFIÉ
- `src/lib/slides/index.ts` - MIS À JOUR (exports)
- `src/routes/slides/demo/+page.svelte` - MIS À JOUR

---

## Architecture Cible

```
src/lib/slides/
├── core/
│   ├── Deck.svelte        # RÉÉCRIT
│   ├── Slide.svelte       # RÉÉCRIT
│   ├── types.ts           # MIS À JOUR
│   ├── config.ts          # SIMPLIFIÉ
│   └── context.ts         # Clés context
├── navigation/
│   └── hash.ts            # NOUVEAU
├── transitions/
│   ├── slide.ts           # NOUVEAU
│   ├── fade.ts            # NOUVEAU
│   ├── zoom.ts            # Phase 2
│   └── convex.ts          # Phase 2
├── components/
│   ├── Controls.svelte    # Phase 3
│   └── Progress.svelte    # Phase 3
├── stores/
│   └── deckStore.svelte.ts  # NOUVEAU
├── actions/
│   ├── keyboard.ts        # NOUVEAU
│   └── swipe.ts           # Phase 3
└── index.ts
```
