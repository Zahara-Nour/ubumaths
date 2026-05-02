# Phase D — Intégration piecewise dans geometry-core

**Date** : 2026-05-02
**Statut** : ✅ Terminé (V1)
**Plan** : `docs/wip/geometry/piecewise-functions-plan.md`
**Commits précédents** :

- Phase A : `4e50d1597 refactor(intervals): use ';' as French interval bound separator`
- Phase B : `9d397a26f feat(geometry-core): domain restriction on function curves`
- Phase C : `b954cd8f4 feat(mathAST): native PiecewiseNode AST type`

---

## Objectif

Permettre dans le DSL geometry-core :

```
courbe("y = { -x si x < 0, x^2 si x >= 0 }")
courbe("y = { -x sur ]-infini ; 0[, x^2 sur [0 ; +infini[ }")
courbe("y = { -x si x < 0, x } sur [-5 ; 5]")
```

avec :

- Bornes ouvertes/fermées (`[`/`]`)
- Bornes infinies (`+infini`/`-infini`)
- Bornes réactives (sliders/scalaires)
- Sérialisation round-trip
- Combinaison avec restriction de domaine globale (Phase B)

## Comportements implémentés et testés

### Forme `si` (condition)

```dsl
courbe("y = { -x si x < 0, x si x >= 0 }")
courbe("y = { -1 si x < 0, 0 si x = 0, 1 si x > 0 }")
courbe("y = { 1 si 0 < x < 5, 0 }")  # avec chaîne de relations
```

### Forme `sur` (intervalle)

```dsl
courbe("y = { -x sur ]-infini ; 0[, x^2 sur [0 ; +infini[ }")
courbe("y = { -1 sur ]-infini ; 0[, 0 sur [0 ; 1], 1 sur ]1 ; +infini[ }")
```

### Cas par défaut (else implicite)

Le dernier morceau sans `si`/`sur` est le `otherwise` :

```dsl
courbe("y = { -x si x < 0, x }")  # x est la valeur par défaut
```

### Restriction de domaine sur piecewise : interdite (redondante)

Un piecewise définit DÉJÀ la fonction par cas — combiner avec `sur`/`avec`
en suffixe est conceptuellement redondant et rejeté avec un message clair.
L'utilisateur encode la restriction directement dans les conditions :

```dsl
# Au lieu de :  y = { -x si x < 0, x } sur [-5 ; 5]   (ERREUR)
# On écrit :
courbe("y = { -x si -5 <= x < 0, x si 0 <= x <= 5 }")
```

### Erreurs détectées

- Mélange `si`+`sur` → erreur (un seul mode par piecewise)
- Piecewise vide `{}` → erreur
- Cas par défaut au milieu (pas en dernier) → erreur
- Intervalle avec `,` comme séparateur de bornes → erreur (forcer `;`)
- Piecewise imbriqué → erreur claire (non supporté en V1)
- Intervalle non borné `]-infini ; +infini[` → erreur
- **Piecewise + suffixe `sur`/`avec`** → erreur claire (redondance conceptuelle)

## Modifications

### Nouveaux fichiers

- `src/lib/geometry-core/dsl/piecewise-parser.ts` — parser DSL piecewise
  - `splitDomainSuffix` n'est PAS la même chose que `splitPieces` ici (pieces séparés par `,` au top-level d'un `{...}`)
  - `parsePiecewise(body, symbols, line)` — produit `PiecewiseNode` mathAST + dependencies
  - `splitOnPieceKeyword` — trouve `si` ou `sur` au top-level d'un piece
  - `parseIntervalAsCondition` — désucre `]a ; b]` en `(a < x) AND (x <= b)` AST
  - `isPiecewiseRhs(rhs)` — détecteur léger pour le routage

### Fichiers modifiés

- `src/lib/mathAST/index.ts` — exports `piecewise`, `piecewisePiece`, `isPiecewise`
- `src/lib/geometry-core/dsl/builtins.ts` :
  - `createCurveFromEquation` — détection `y = { ... }` AVANT le parse mathAST, route vers `createPiecewiseFunctionFromAst`
  - `createPiecewiseFunctionFromAst` — nouveau builder pour GeoFunction avec PiecewiseNode
- `src/lib/geometry-core/rendering/svg-primitives.ts` — `functionToSVG` collecte `scalarBindings` et les passe à `compiledFn`/`compiledDerivative` (essentiel pour les sliders dans piecewise)

### Tests

- `src/lib/geometry-core/dsl/__tests__/piecewise-parser.test.ts` — 23 tests unitaires
- `src/lib/geometry-core/dsl/__tests__/courbe-piecewise.test.ts` — 18 tests E2E (piecewise, sliders, sérialisation, erreurs, domain combiné)

**Total Phase D** : 41 tests. **Total geometry-core** : 2802 tests verts, 0 régression.

## Bugs trouvés par le code-reviewer et corrigés

1. **🔴 `splitPieces` ne trackait pas `[]`** : avec virgule comme séparateur d'intervalle (rétro-compat Phase A), `{ x sur [0, 5], -x sur [5, 10] }` aurait été splitté à la virgule INTÉRIEURE de l'intervalle. **Solution adoptée** : forcer `;` comme séparateur dans les intervalles à l'intérieur d'un piecewise (cohérent convention scolaire FR), avec message d'erreur explicite si l'utilisateur écrit `[0,5]` directement. Note : cette restriction ne s'applique qu'au piecewise — Phase B `courbe(... sur [a, b])` continue d'accepter les deux séparateurs.
2. **🟡 Piecewise imbriqué silencieusement broken** : `{ x si x>0, { y si ... } }` aurait fait planter `parseCustom` avec un message obscur. **Fix** : `parseExpression` détecte `{` initial et lève « Piecewise imbriqué non supporté » clairement.
3. **🟡 `_internals` re-export inutile** : retiré + imports `mathNumber`/`mathInfinity` nettoyés.

## Limitations connues (Phase D V1, à reporter)

1. **Marqueurs ouverts/fermés aux ruptures internes** : le sampler détecte numériquement les sauts (variation soudaine du y) et split le path, mais aucun cercle n'est dessiné aux frontières des conditions internes. Un saut de `0` à `1` à `x = 0` est correctement représenté par deux segments disjoints, sans toutefois indiquer visuellement laquelle est `f(0)` (closed bound) vs ouverte. **Acceptable pour V1**, à enrichir en post-D.
2. ~~**Différentiation symbolique** : `derivative` placeholder = `ZERO_NODE`, `compiledDerivative` = `() => 0`. Le sampler avec dérivée constante 0 dégrade vers un sampling quasi-uniforme. Acceptable visuellement pour V1 ; améliorable via différentiation par branche en post-D.~~ **Levée en Phase G** : différentiation par branche implémentée (`feat(mathAST): symbolic differentiation of PiecewiseNode`), le sampler reçoit une vraie dérivée et `tangente(f, x0)` fonctionne sur piecewise.
3. ~~**Tangente sur piecewise** : `tangente(f, x0)` produirait une tangente horizontale (dérivée placeholder = 0). Non testé. À ajouter à la liste de "ne pas mélanger piecewise et tangente() en V1".~~ **Levée en Phase G**.
4. **Sliders dans branches symboliques `2*a`** : la valeur de la borne symbolique est résolue lors de la compilation initiale via `parseCustom`, qui produit un `MathNode` avec variables libres. Le rendu passe les `scalarBindings` au compiledFn donc ça marche. ✓
5. **Renommage de slider** : la `equation` originale est sérialisée avec les noms textuels — round-trip cassé si l'utilisateur renomme un slider entre save/load. Limitation inhérite Phase B.
6. **Piecewise imbriqué** : non supporté (message clair). Future si besoin pédagogique.
7. **Nested piecewise dans le 2ème argument de `courbe()`** : seuls les courbes cartésiennes y=f(x) acceptent piecewise. Les paramétriques (x=…, y=…) non testées avec piecewise.
8. **Tests visuels manuels** : non lancés en CI. À valider par l'utilisateur (port 5175).
9. **Exports TikZ/Typst** : function curves ne sont toujours pas exportées (gap pré-Phase B). Le piecewise hérite de cette limitation.

## Briques posées (utilisables ailleurs)

- `parsePiecewise` est isolé dans son propre module — réutilisable depuis n'importe où dans geometry-core (par exemple, futurs builtins de validation d'expression élève piecewise).
- `compileCondition` (mathAST/eval/compile.ts) gère relations + chains + logical, peut être utilisée standalone pour autre chose que piecewise.
- `scalarBindings` dans `functionToSVG` peut être étendu à n'importe quelle expression GeoFunction qui dépend de scalaires (pas seulement piecewise).

## Récapitulatif global du plan complet

| Phase | Description                         | Tests              | Commit      |
| ----- | ----------------------------------- | ------------------ | ----------- |
| A     | Migration `,` → `;` mathAST         | ~50 (+13 nouveaux) | `4e50d1597` |
| B     | Domain restriction sur GeoFunction  | 72 nouveaux        | `9d397a26f` |
| C     | PiecewiseNode mathAST               | 14 nouveaux        | `b954cd8f4` |
| D     | Intégration piecewise geometry-core | 41 nouveaux        | (en cours)  |
| E     | Quality checks finaux               | —                  | (suit)      |

**Total nouveaux tests** : ~140. **Total geometry-core** : 2802 tests verts, 0 régression.

## Documents produits

- `docs/wip/geometry/piecewise-functions-plan.md`
- `docs/wip/geometry/phase-a-interval-separator-progress.md`
- `docs/wip/geometry/phase-b-domain-restriction-progress.md`
- `docs/wip/geometry/phase-c-piecewise-node-progress.md`
- `docs/wip/geometry/phase-d-geometry-piecewise-progress.md` (ce document)
- Mémoire : `dsl-piecewise-syntax.md`

## Prochaine phase

**Phase E** : Quality checks finaux (`pnpm format`, `pnpm check:incremental`, `mcp__svelte__svelte-autofixer` sur les `.svelte` modifiés, `npx eslint`).
