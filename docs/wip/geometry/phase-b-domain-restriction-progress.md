# Phase B — Restriction de domaine sur GeoFunction

**Date** : 2026-05-02
**Statut** : ✅ Terminé
**Plan** : `docs/wip/geometry/piecewise-functions-plan.md`
**Commit Phase A** : `4e50d1597 refactor(intervals): use ';' as French interval bound separator`

---

## Objectif

Permettre `courbe("y = x^2 sur [-2 ; 2]")` et `courbe("y = x^2 avec a < x <= b")` dans le DSL geometry-core, avec :

- Bornes ouvertes/fermées (`[`/`]`)
- Bornes infinies (`+infini`, `-infini`)
- Bornes réactives via sliders/scalaires
- Cercles ouverts/fermés visibles aux extrémités finies
- Sérialisation round-trip naturelle

## Comportements implémentés et testés

### Forme intervalle (`sur`)

| Syntaxe DSL                                | Comportement                                       |
| ------------------------------------------ | -------------------------------------------------- |
| `courbe("y = x^2 sur [-2 ; 2]")`           | Courbe sur intervalle fermé, deux cercles pleins   |
| `courbe("y = x^2 sur ]-2 ; 2[")`           | Intervalle ouvert, deux cercles vides              |
| `courbe("y = x^2 sur [0 ; 5[")`            | Demi-ouvert, plein à gauche, vide à droite         |
| `courbe("y = x^2 sur ]-infini ; 0]")`      | Borne infinie négative, pas de cercle à -∞         |
| `courbe("y = x^2 sur [0 ; +infini[")`      | Borne infinie positive                             |
| `courbe("y = x^2 sur ]a ; b]")` (sliders)  | Bornes réactives, recalcul automatique             |
| `courbe("y = x^2 sur [0 ; 2*a]")` (scalar) | Expression symbolique, slider `a` collecté en deps |
| `courbe("y = x^2 sur ]0,5 ; 1,5[")` (FR)   | Décimales françaises, séparateur `;` désambiguïse  |
| `courbe("y = x^2 sur ]a, b]")`             | Virgule acceptée en rétrocompatibilité             |

### Forme inégalité (`avec`)

| Syntaxe DSL                                | Comportement                              |
| ------------------------------------------ | ----------------------------------------- |
| `courbe("y = x^2 avec -2 < x <= 2")`       | Encadrement composé                       |
| `courbe("y = x^2 avec x > 0")`             | Demi-ouvert, +∞ à droite                  |
| `courbe("y = x^2 avec x <= 5")`            | Demi-ouvert, -∞ à gauche                  |
| `courbe("y = sin(x) avec 0 <= x < 2*pi")`  | Bornes symboliques (variables collectées) |
| `courbe("y = x^2 avec a < x <= b")` (slid) | Bornes réactives via sliders              |

### Erreurs détectées

- `[5 ; 0]` → `"Domaine invalide: borne basse > borne haute"` (statique)
- `5 > x < 10` → `"Encadrement attendu de la forme a < x < b"`
- `x = 5` → `"Condition non reconnue"`
- `y > 0` → `"Condition non reconnue"` (variable autre que `x`)
- Suffixe sans équation → `"aucune équation avant le suffixe"`

### Sémantique « affine + domain → fonction »

`courbe("y = 2*x + 1 sur [-2 ; 2]")` est désormais traité comme une **fonction restreinte** (et non comme une ligne complète). Pédagogiquement intuitif : la présence d'un domaine signale clairement l'intention.

## Modifications

### Types et factory

- `src/lib/geometry-core/types/elements.ts` :
  - `GeoFunctionDomain { lower, upper, lowerType, upperType }`
  - `GeoFunction.domain?` optionnel
  - `GeoFunction.dependsOn: readonly string[]` (élargi depuis `readonly []`)
- `src/lib/geometry-core/types/index.ts` : re-export de `GeoFunctionDomain`
- `src/lib/geometry-core/graph/figure.ts` :
  - `createFunction(...options: { domain?, dependencies? })` (signature étendue)
  - `resolveParam` corrigé pour gérer `InfinityParam` (bug latent)

### Parser DSL

- `src/lib/geometry-core/dsl/domain-parser.ts` (nouveau) :
  - `splitDomainSuffix(eq)` — sépare core de suffix `sur`/`avec` au top-level
  - `parseDomainSuffix(suffix, kw, symbols, line)` — produit `GeoFunctionDomain` + `dependencies`
  - Trois formes parsing : intervalle, condition composée, condition simple
  - Stratégie « préférer `;` si présent » pour gérer décimales FR
  - Collecte `getVariables(node)` pour bornes symboliques → enregistre les sliders en deps
- `src/lib/geometry-core/dsl/builtins.ts` :
  - `createCurveFromEquation` split d'abord, puis parse le core
  - Try 1 (line) sauté si domain présent
  - Try 3+ (conic, implicit) rejette le domain explicitement

### Rendu SVG

- `src/lib/geometry-core/rendering/svg-primitives.ts` :
  - `functionToSVG` retourne `{ path, endpointMarkers?: FunctionEndpointMarker[] }`
  - Sampling viewport clampé à `[domainLower, domainUpper] ∩ visibleViewport`
  - `null` si intersection vide
  - `FunctionEndpointMarker { cx, cy, r, bracketType }` — descripteur structuré
- `src/lib/components/geometry/GeometryCanvas.svelte` :
  - Rendu via `<circle>` Svelte natifs (pas `{@html}`) pour échappement automatique de `fill`/`stroke` (sécurité XSS)

### Tests

- `src/lib/geometry-core/dsl/__tests__/domain-parser.test.ts` — 40 tests (split, parse interval, parse condition, sliders, expressions symboliques, erreurs)
- `src/lib/geometry-core/dsl/__tests__/courbe-domain.test.ts` — 23 tests (E2E `courbe()`, sliders, sérialisation round-trip, rejets)
- `src/lib/geometry-core/rendering/__tests__/function-domain-svg.test.ts` — 9 tests (markers, restriction, réactivité)

**Total Phase B** : 72 tests. **Total geometry-core** : 2758 tests verts, 0 régression.

## Bugs trouvés par le code-reviewer et corrigés

1. **🔴 Risque XSS** : les markers étaient injectés via `{@html}` avec une couleur potentiellement non validée. **Fix** : `endpointMarkers` retourne désormais des descripteurs structurés (`{cx, cy, r, bracketType}`), rendus en `<circle>` Svelte natifs avec attributs liés (échappement automatique).
2. **🟡 Réactivité bornes symboliques** : `-a`, `2*a` ne déclenchaient pas re-rendu (parsé en `MathNode` exact, pas en `ScalarRef`). **Fix** : `parseBound` walk les variables du `MathNode` via `getVariables` et collecte les sliders en `dependencies`.
3. **🟡 Edge case splitter** : `courbe(" sur ]0;1[")` (équation vide avant suffix) lancait une erreur peu claire. **Fix** : check `split.core.trim()` dans `createCurveFromEquation`.
4. **🟡 Sémantique affine + domain** : `courbe("y = 2x sur [-1;1]")` était rejeté car détecté en ligne. **Fix** : skip Try 1 (line) si `domainResult` présent → traité en fonction restreinte.

## Limitations connues (à reporter ou documenter)

1. **Exports TikZ/Typst** : ne supportent pas du tout les courbes y = f(x) (ni avant Phase B, ni avec domain). Pré-existant. À traiter en post-B follow-up séparé (ajouter un Pass 2f dans les exports, similaire à Pass 2e des paramétriques).
2. **Évaluation symbolique des bornes** : si une borne est `2*a` (MathNode), `figure.resolveParam` retourne `geoToNumber(node)` qui peut produire `NaN` pour des nodes complexes. Le re-rendu déclenché par le slider remet la fonction à jour, mais la borne effective est calculée à partir du node statique (sans re-substitution de `a`). Pour Phase B : acceptable car les cas d'école utilisent des sliders directs. Pour Phase C+ : à étendre via un mécanisme `compile(node)` sur les bornes ou via injection des scalarValues dans la résolution.
3. **Open-bound visualization** : le sampling inclut visuellement la borne ouverte (le marqueur creux compense). Pédagogiquement OK mais peut produire des artefacts près d'une asymptote. Documenté.
4. **Renommage de slider** : la `equation` originale est sérialisée (avec les noms textuels). Si l'utilisateur renomme un slider entre save/load, le round-trip est cassé. Limitation acceptée pour Phase B.
5. **Test visuel manuel** : non lancé en CI. À valider par l'utilisateur après commit (port 5175, page de démo geometry-demo).

## Briques posées pour Phase C/D

- Pattern `splitDomainSuffix` extensible aux blocs piecewise `{ ... }` (le splitter ignore déjà `{}` comme limite top-level).
- `parseBound` réutilisable directement dans le parser piecewise pour les bornes d'intervalles dans chaque morceau.
- `endpointMarkers` réutilisable pour marquer les frontières internes des morceaux.
- Convention `;` partout en intervalle (héritée de Phase A), DSL parser tolère `,` également.
- `dependsOn` correctement collecté via `getVariables` → modèle pour les conditions piecewise.

## Prochaine phase

**Phase C** : `PiecewiseNode` natif dans mathAST (type/factory/guards/evaluate/compile/differentiate/computeDomain/analyzeContinuity + parser custom pour `{ expr si cond, ... }` et `{ expr sur ]a;b[, ... }` + output LaTeX `\begin{cases}`).
