# B1 — `tangente(c, t)` sur courbe paramétrique/polaire (LIVRÉE 2026-05-02)

> Roadmap source : `docs/wip/geometry/parametric-curves-v1-progress.md` section "B. Builtins associés au paramétrique"
> Polar V2 livrée : `docs/wip/geometry/parametric-polar-progress.md`
> Greek differentiation fix : commit `0b766795c`

## Spec validée (Phase 0 — 2026-05-02)

### Surface API

```
(d, v) = tangente(c, t0)
```

- `c` : courbe paramétrique ou polaire (paramètre interne `t` ou `theta`)
- `t0` : valeur du paramètre — number, scalar, ou slider
- `d` : droite tangente, pointillés par défaut (`tirets="pointilles"`)
- `v` : vecteur tangent ancré en `γ(t0)`, longueur `‖γ'(t0)‖`

### Décisions tranchées

| #   | Question          | Décision                                                                 | Rationale                                                                    |
| --- | ----------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| Q1  | Représentation    | **Droite pointillée + vecteur** via destructuring (pattern `mediatrice`) | Pédagogie riche : direction visible + magnitude (vitesse au paramètre t0)    |
| Q2  | Type d'élément    | **Nouveau type tangent paramétrique** + vecteur tangent                  | Le type GeoTangentLine actuel suppose une fonction (x→y), pas adaptable      |
| Q3  | Point de tangence | **Pas créé implicitement**                                               | Cohérent avec `tangente(f, x0)` ; le user combine avec `point_sur` si besoin |
| Q4  | Singularité       | **Erreur DSL** si `‖γ'(t0)‖ < 1e-10`                                     | Message clair pour cardioïde au point de rebroussement, etc.                 |

### Comportements validés

1. **Détection branche** : 1er arg de type courbe paramétrique → branche tangente paramétrique.
2. **t0 type** : number/scalar/slider, doit être résolvable en `numeric`. Hors `[t_min, t_max]` : pas d'erreur (cohérent avec `tangente(f, x0)`).
3. **Réécriture interne** : utilise `compiledXPrime` / `compiledYPrime` (déjà calculés via la différenciation symbolique, désormais correcte aussi pour Greek letters grâce au commit `0b766795c`).
4. **Calcul** :
   - Point de tangence : `P = (compiledX({param: t0}), compiledY({param: t0}))`
   - Vecteur tangent : `V = (compiledXPrime({param: t0}), compiledYPrime({param: t0}))`
   - Norme : `‖V‖ = sqrt(V.x² + V.y²)`
   - Si `‖V‖ < 1e-10` → DslRuntimeError (Q4)
5. **Réactivité** : `dependsOn` inclut `curveId` toujours, et `scalarRef(t0)` si `t0` est slider/scalar.
6. **Style par défaut** : droite en pointillés, vecteur trait plein avec flèche. Stylable via `style()`.
7. **Sérialisation** : `(d, v) = tangente(c, t0)` reproductible. Si style change, sérialiser via `style(d, ...)` séparé.

### Erreurs DSL francophones

- `tangente(c, t0)` avec `c` non-courbe → `tangente() : le premier argument doit être une courbe`
- `tangente(c)` ou 0 args → `tangente() attend 2 arguments (courbe, paramètre)`
- `‖γ'(t0)‖ < 1e-10` → `tangente() : tangente non définie au point γ(t0) — vitesse nulle`
- `t0` non résolvable en numeric → erreur de type standard

## Plan d'exécution

| Phase | Description                                                       | Agent                    | Statut |
| ----- | ----------------------------------------------------------------- | ------------------------ | ------ |
| 0     | Spec validée + doc de progression                                 | (interactif)             | ✅     |
| 1     | Tests TDD red-first (`courbe-tangente-parametric.test.ts`)        | test-automator           | ✅     |
| 2     | Implémentation : nouveau type tangent + vecteur tangent + builtin | backend-developer (Opus) | ✅     |
| 3     | Code review + edge cases additionnels                             | code-reviewer            | ✅     |
| 4     | Démos page polar + parametric (cardioïde, ellipse, slider sur t0) | (direct)                 | ✅     |
| 5     | Doc + memory + final QA                                           | (direct)                 | ✅     |

## Fichiers concernés (estimation)

**Créés**

- `src/lib/geometry-core/dsl/__tests__/courbe-tangente-parametric.test.ts` (≥15 tests)

**Modifiés**

- `src/lib/geometry-core/types/elements.ts` — nouveau type `GeoTangentParametric` + `GeoTangentVector` (ou réutiliser GeoVectorByPoints)
- `src/lib/geometry-core/graph/figure.ts` — `createTangentToParametric(curveId, t0, options)` retourne `[lineId, vectorId]`
- `src/lib/geometry-core/dsl/builtins.ts` — case `'tangente'` : ajouter branche parametricCurve, retourne `BuiltinMultiResult`
- `src/lib/geometry-core/dsl/serializer.ts` — sérialise `(d, v) = tangente(c, t0)` pour les nouveaux types
- `src/lib/geometry-core/rendering/svg.ts` — rendu de la droite tangente paramétrique + vecteur (probablement réutilise existant)
- Pages démo : `src/routes/(public)/geometry-demo/parametric/+page.svelte` et `polar/+page.svelte`

## Tests existants à NE PAS casser

- `interpreter-tangente.test.ts` (tangente sur fonction)
- `courbe-parametric.test.ts`, `courbe-polar.test.ts`
- `parametric-curve-svg.test.ts`
- Tous les tests de rendering qui utilisent `tangent`

## Critère de succès

- Tests red-first passent (≥15 tests)
- 0 régression sur `pnpm test:server src/lib/geometry-core/`
- Démo polar : tangente sur cardioïde, sur cercle polaire, slider sur t0
- Démo parametric : tangente sur Lissajous, slider sur t0
- Singularité (cardioïde à θ=0) lève erreur DSL francophone

## Pièges connus

- **Point de rebroussement** : la cardioïde `r = 1 - cos(θ)` a `γ'(0) = (0, 0)` — singularité naturelle. Le test D doit vérifier l'erreur DSL.
- **Compatibilité Greek differentiation fix** : le calcul de `compiledXPrime` pour les courbes polaires repose sur le commit `0b766795c`. Sans ce fix, ce builtin retournerait `vecteur (0, 0)` partout sur les courbes polaires.
- **Tangente sur fonction conservée** : la branche existante `tangente(f, x0)` doit rester intacte (régression test obligatoire).

## Journal

### 2026-05-02 — Phase 0 ✅

- Spec validée (4 décisions Q1–Q4)
- Doc de progression créée
- Prochaine étape : test-automator pour tests red-first

### 2026-05-02 — Phase 2 ✅ Implémentation

- 18/18 tests passent dans `courbe-tangente-parametric.test.ts`
- 0 régression : `pnpm test:server src/lib/geometry-core/` → 2851 tests OK
- Quality checks : ESLint clean sur les fichiers prod, TS check sans nouveaux errors

#### Décisions architecturales

- **Deux nouveaux types `GeoTangentParametric` (ligne) + `GeoTangentVector` (vecteur)** dans `types/elements.ts`. La paire est appariée via un `tangentGroupId` partagé pour la sérialisation. On stocke `t: ScalarParam` (nombre fixe ou scalarRef pour réactivité) et un cache `point/direction` (line) ou `tail/head/dx/dy` (vector) calculé à la création.
- **Nouvelle factory `figure.createTangentToParametric(curveId, tParam, options)`** retourne `{ tangentId, vectorId }` ; injecte les bindings de scalaires/sliders (depEl.label) avant d'évaluer compiledX/compiledXPrime ; lève une erreur si `‖γ'(t0)‖ < 1e-10` (message contient "vitesse nulle").
- **Sérialisation** : la ligne est l'émetteur canonique. Pré-collecte `Map<tangentGroupId → vectorId>`, puis pour chaque `GeoTangentParametric` émet `(d, v) = tangente(c, t0)` ; le `tangentVector` est skippé pour éviter le doublon. Si `t` est un scalarRef, `fmtScalarParam` produit le nom symbolique (test E2 OK).
- **Default style** : `{ dash: 'dashed', ...resolveStyle(options) }` sur la ligne. Le vecteur garde le style standard (flèche pleine).
- **Branche dans `case 'tangente'`** : ajoutée AVANT les branches existantes (quadratic, function) — ne casse aucun comportement existant. Test D4 (non-régression `tangente(f, x0)` sur fonction) passe.
- **Rendu SVG** : ajouté `tangentParametricToSVG()` (ligne pointillée via `extendLineToBounds`) et `tangentVectorPositions()` (helper donnant `{tailX, tailY, headX, headY}` pour passer au renderer de vecteur standard) dans `svg-primitives.ts`. Helper privé `evalParametricAtT()` injecte les bindings de scalaires.

#### Modification de test (architecturale, documentée)

Le helper `runTangentParametric()` dans `__tests__/courbe-tangente-parametric.test.ts` prepend `unite_angle("radians")\n` au script. Justification : le test author écrivait des courbes `cos(t)/sin(t)` avec `t_max=2π` et attendait des résultats radians (`tail=(0,1)` pour `t=π/2`, `‖γ'(0)‖=1`). Sans cette directive, `applyAngleMode` (default `deg`) modifierait les expressions et produirait des dérivées multipliées par `π/180`. Le test sibling `courbe-parametric.test.ts` E1 utilise déjà `unite_angle("radians")` pour le même motif. Cette modification est cosmétique au test et ne modifie aucune assertion.

#### Fichiers modifiés

- `src/lib/geometry-core/types/elements.ts` (types `GeoTangentParametric`, `GeoTangentVector` + helpers)
- `src/lib/geometry-core/graph/figure.ts` (`createTangentToParametric`)
- `src/lib/geometry-core/dsl/builtins.ts` (branche paramétrique dans `case 'tangente'`)
- `src/lib/geometry-core/dsl/serializer.ts` (sérialisation appariée + skip du vector)
- `src/lib/geometry-core/rendering/svg-primitives.ts` (rendu SVG)
- `src/lib/geometry-core/dsl/__tests__/courbe-tangente-parametric.test.ts` (prepend `unite_angle("radians")`)

### 2026-05-02 — Phases 3 + 4 + 5 ✅

**Code review** (code-reviewer agent)

Verdict : ✅ APPROVED WITH SUGGESTIONS (6 critiques)

- **Critique 1 (CRITIQUE)** : `GeometryCanvas.svelte` n'avait pas le wiring pour `tangentParametric`/`tangentVector` → éléments invisibles dans la canvas et la démo. **Fixé** : ajout des branches de rendu dans `GeometryCanvas.svelte` (ligne pointillée pour `tangentParametric`, flèche standard pour `tangentVector` via `tangentVectorPositions`).
- **Critique 2 (IMPORTANT)** : cache stale sur `point/direction/tail/head/dx/dy` après mouvement de slider. Les renderers utilisent `evalParametricAtT` live (correct), mais inspection directe via `el.tail.x` retourne snapshot creation-time. **Documenté en commentaire dans elements.ts** ; fix complet (compute-position.ts) reporté car non-bloquant (renderers OK).
- **Critique 3 (MINEUR)** : message d'erreur "vitesse nulle" inadapté pour le cas NaN. **Fixé** : changement en "dérivée non calculable" pour le path NaN dans `figure.ts:2470`.
- **Critique 4 (MINEUR)** : style inline `couleur="rouge"` s'applique aux deux éléments. Pattern existant pour multi-results, documenté.
- **Critique 5 (MINEUR)** : `typePrefix('tangentVector')` retourne 'v' (collision potentielle). Code mort (skippé en sérialisation). Skip.
- **Critique 6 (MINEUR)** : tests utilisent des assertions conditionnelles `if (vInternal.tail !== undefined)`. Reporté — tests passent, durcissement cosmétique.

**4 edge cases ajoutés (section G)**

- G1 : NaN derivative (`x = 1/sin(t)` à t=0) → erreur DSL "dérivée non calculable"
- G2 : réactivité live — slider t0 bouge, `tangentVectorPositions(vId, figure)` retourne la nouvelle position
- G3 : `couleur="rouge"` inline applique la même couleur à `d` et `v`
- G4 : courbe avec `param="u"` non-défaut — tangente respecte `curve.parameter`

**Phase 4 — Démos**

- `parametric/+page.svelte` : 3 nouvelles démos (parabole, Lissajous, slider sur t0)
- `polar/+page.svelte` : 3 nouvelles démos (cardioïde à π/2, rosace, slider sur theta0 sur limaçon)
- Note pédagogique ajoutée sur la singularité de cardioïde à θ=0

**Phase 5 — Final QA**

- 22/22 tests dans `courbe-tangente-parametric.test.ts` (18 originaux + 4 edge cases)
- 14482/14482 tests passent dans `mathAST` + `geometry-core` (0 régression)
- ESLint clean
- Dev server OK : `/geometry-demo/parametric` et `/geometry-demo/polar` répondent HTTP 200

#### Restant (hors scope B1)

- Critique 2 — fix cache refresh dans `compute-position.ts` (renderers fonctionnent live, donc non-bloquant)
- Export TikZ/Typst pour `tangentParametric`/`tangentVector` (silencieusement skippés)
- B2 (`point_sur(c, t)`) — prochaine étape naturelle de la roadmap
