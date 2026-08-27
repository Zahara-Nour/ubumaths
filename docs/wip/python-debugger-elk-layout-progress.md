# Débogueur Python — Layout du diagramme via elkjs (#5)

> Amélioration **#5** de la [roadmap](./python-debugger-improvements-roadmap.md). Branche :
> `feat/python-debugger-elk-layout`. On fait #5 **avant** #2 (animation) pour que l'animation
> soit « gratuite » sur une géométrie déclarative. **Rien ne se merge sans accord explicite.**

## Décisions (validées)

1. **Modèle full-graph « layered »** : nœuds = frames (un _port_ par variable-référence) + objets
   heap ; arêtes = références. ELK `layered` (direction RIGHT) → frames à gauche, heap à droite,
   arêtes orthogonales, croisements minimisés.
2. **Two-pass** : rendre pour **mesurer** les cartes (taille variable) → donner les tailles à ELK →
   **positionner**.
3. **elkjs en Web Worker, lazy-load** (pas dans le root layout).
4. **Rendu** : nœuds en position absolue (coords ELK) + arêtes = polylignes SVG depuis les bend
   points ELK. On **abandonne `getBoundingClientRect`**.
5. **Fallback** : si le worker ELK échoue/timeout → repli sur le rendu actuel.

## Découpage

### Étape 1 — Constructeur de graphe (pur) ⏳ EN COURS

`src/lib/components/python/debug/diagram-graph.ts` : `buildDiagramGraph(callStack, heap)` →
`{ nodes, edges }` (structure indépendante d'ELK et du DOM). Réfs frame→heap via ports, heap→heap,
aliases → 2 arêtes, réfs pendantes ignorées. Tests node (TDD).

### Étape 2 — Intégration elkjs (worker, two-pass) ⏳

Ajouter `elkjs` ; worker lazy ; mesure des nœuds → layout → géométrie (coords + bend points).

### Étape 2 — layout ELK ✅ FAIT (`diagram-layout.ts`, 3 tests ELK réelle)

### Étape 3 — Rendu `MemoryDiagramView` ✅ FAIT + vérifié visuellement

`FrameCard.svelte` / `HeapCard.svelte` extraits (cartes unitaires). `MemoryDiagramView` réécrit :
graphe → mesure des cartes → `layoutDiagram` (ELK) → cartes en position absolue + arêtes SVG
orthogonales depuis les points ELK. `getBoundingClientRect`/`computeArrows` retirés. **Fallback** sur
l'ancien rendu 2 colonnes (`FramesPanel`/`HeapPanel`) si ELK KO. Vue accessible via l'onglet
**« Diagramme mémoire »** du `DebugPanel`. Vérifié OK sur `/python` (ELK a bien pris, arêtes
orthogonales).

> ⚠️ **Écart flagué à la décision #3** : ELK tourne **en-thread** (lazy import de `elk.bundled.js`),
> PAS en Web Worker (V1). Rapide sur ces petits graphes ; passage au worker = follow-up (échanger
> l'instance dans `getElk`). Bonus : le positionnement absolu est le **socle prêt pour l'animation
> #2** (tween des coords entre pas).

## DoD

- [x] Tests graphe + layout verts (10) · `check:incremental` 0 erreur · `svelte-autofixer` 0 issue
- [x] Vérif visuelle sur `/python` (arêtes orthogonales, ELK actif)
- [ ] MAJ roadmap (#5 → livré) + `docs/ref/python/` (au commit/merge)
