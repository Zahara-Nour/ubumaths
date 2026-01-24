# Prompt de Migration UbuSlides : reveal.js → Svelte 5 Native

> Copier ce prompt dans un nouveau contexte Claude pour effectuer la migration.

---

## Prompt

````
Tu vas migrer le système de slides UbuSlides de reveal.js vers une implémentation 100% Svelte 5 native.

## Contexte

UbuSlides est un système de présentation intégré à UbuMaths (application éducative de mathématiques). Actuellement basé sur reveal.js, il doit être réécrit en Svelte 5 natif.

## Contrainte principale (CRITIQUE)

Le système DOIT fonctionner **à l'intérieur d'un composant** de taille quelconque, pas uniquement en pleine page :

```svelte
<!-- Inline dans une leçon - CAS D'USAGE PRINCIPAL -->
<article class="lesson">
  <h2>Les fractions</h2>
  <Deck class="h-[400px]">
    <Slide>Explication...</Slide>
    <QuestionSlide question={q} />
  </Deck>
  <p>Suite du texte...</p>
</article>

<!-- Widget d'aide contextuelle -->
<aside class="w-[300px] h-[200px]">
  <Deck compact controls={false}>
    <Slide>Aide</Slide>
  </Deck>
</aside>

<!-- Plein écran (optionnel) -->
<Deck fullscreen>
  <Slide>Présentation</Slide>
</Deck>
````

Implications techniques :

- Pas de styles sur html/body
- Pas de position: fixed sur le container principal (sauf mode fullscreen)
- Scale calculé par rapport au container parent, pas au viewport
- Navigation clavier liée au focus du composant
- Multiples instances sur la même page supportées

## Documentation

Lis attentivement le guide de migration complet :
docs/wip/ubuslides-migration-guide.md

Ce guide contient :

- L'analyse complète du code source reveal.js
- Les spécifications techniques détaillées
- Le plan de migration en 6 phases
- Les transitions CSS exactes à reproduire
- Les contrôleurs à implémenter (keyboard, touch, fragments, etc.)

## Code existant à analyser

Structure actuelle :
src/lib/slides/
├── core/
│ ├── Deck.svelte # Wrapper reveal.js (à réécrire)
│ ├── Slide.svelte # Wrapper section (à adapter)
│ ├── UbuMarkSlide.svelte # Markdown + MathLive (quasi inchangé)
│ ├── QuestionSlide.svelte # Questions interactives (quasi inchangé)
│ ├── WhiteboardSlide.svelte # Whiteboard (simplifier coordonnées)
│ ├── AnnotatableSlide.svelte # Annotations (simplifier)
│ ├── types.ts
│ ├── config.ts
│ └── context.ts
├── components/
│ ├── SlideAnnotationLayer.svelte
│ └── SlideAnnotationToolbar.svelte
├── stores/
│ └── slideAnnotationStore.svelte.ts
└── index.ts

Page de démo : src/routes/slides/demo/+page.svelte

## Méthodologie

### Phase 1 : Core Engine

1. Créer deckStore.svelte.ts (état réactif Svelte 5)
2. Réécrire Deck.svelte (container flexible, scale par container parent)
3. Réécrire Slide.svelte (transitions Svelte natives)
4. Implémenter navigation clavier (action use:keyboard)

### Phase 2 : Transitions et Fragments

1. Créer transitions/ (slide, fade, zoom, convex)
2. Implémenter système de fragments
3. Hash navigation (#/h/v/f)

### Phase 3 : Touch et Controls UI

1. Navigation touch (action use:swipe)
2. Composant Controls.svelte (flèches)
3. Composant Progress.svelte (barre)

### Phase 4 : Migration composants existants

1. Adapter WhiteboardSlide (simplifier calcul coordonnées)
2. Adapter AnnotatableSlide
3. Adapter SlideAnnotationLayer
4. UbuMarkSlide et QuestionSlide : quasi inchangés

### Phase 5 : Fonctionnalités avancées

1. Auto-animate (FLIP algorithm)
2. Overview mode (grille)

### Phase 6 : Cleanup

1. Supprimer reveal.js de package.json
2. Supprimer src/routes/slides/+layout@.svelte
3. Tests complets

## Règles à suivre

1. **Svelte 5 runes** : $state, $derived, $effect, $props (pas de stores legacy)
2. **Pas de any** : Types stricts partout
3. **Actions Svelte** : use:keyboard, use:swipe pour les interactions
4. **Transitions natives** : transition:, in:, out: de Svelte
5. **CSS scopé** : Pas de styles globaux, tout dans <style>
6. **Tests** : Valider chaque phase avant de passer à la suivante

## Validation mode inline

À chaque phase, vérifier :

- [ ] Fonctionne dans un container 400x300px
- [ ] Scale correct par rapport au container parent
- [ ] Pas de débordement hors du container
- [ ] Navigation clavier active au focus uniquement
- [ ] Multiples instances indépendantes sur la même page

## Commandes utiles

pnpm dev -- --port 5175 # Dev server
pnpm check:fast # Type checking
pnpm test:client <path> # Tests composants

## Début

Commence par lire le guide de migration :
docs/wip/ubuslides-migration-guide.md

Puis analyse le code existant dans src/lib/slides/.

Propose un plan d'implémentation détaillé pour la Phase 1 avant de coder.

````

---

## Notes d'utilisation

1. **Copier le prompt** ci-dessus (entre les balises ```)
2. **Coller dans un nouveau contexte** Claude
3. Claude lira le guide et proposera un plan pour la Phase 1
4. **Valider le plan** avant de lancer l'implémentation
5. **Tester chaque phase** avant de passer à la suivante

## Fichiers référencés

| Fichier | Contenu |
|---------|---------|
| `docs/wip/ubuslides-migration-guide.md` | Guide complet (ce fichier) |
| `src/lib/slides/` | Code actuel à migrer |
| `src/routes/slides/demo/+page.svelte` | Page de démo pour tester |
| `extern/reveal.js/` | Code source reveal.js (référence) |

## Durée estimée

| Phase | Estimation |
|-------|------------|
| Phase 1 | 1-2 sessions |
| Phase 2 | 1 session |
| Phase 3 | 1 session |
| Phase 4 | 1 session |
| Phase 5 | 1-2 sessions (optionnel) |
| Phase 6 | 0.5 session |
| **Total** | **5-8 sessions** |

## Points d'attention

1. **Mode inline est CRITIQUE** - C'est la raison de la migration
2. **Tester avec plusieurs tailles de container** avant de valider
3. **Ne pas toucher à QuestionSlide** sauf si nécessaire (il fonctionne)
4. **Garder reveal.js fonctionnel** jusqu'à la Phase 6 (rollback possible)
````
