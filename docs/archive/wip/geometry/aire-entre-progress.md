# aire_entre — journal de progression

> Implémentation du builtin DSL `aire_entre(f, g, a, b)` selon
> `docs/wip/geometry/aire-entre-study.md` (étude validée 2026-05-01).

---

## Phase 0 — Étude (close)

- ✅ `docs/wip/geometry/aire-entre-study.md` rédigée et validée.
- ✅ 5 questions ouvertes tranchées (couleur orange, [lo, hi], f≡g→0,
  2 warns au lieu de 3, refactor des cases reporté en V4).
- ✅ 10 comportements TDD validés par l'utilisateur.
- ✅ Q-A (pas de simplify(h)) et Q-B (secondFunctionId dans dependsOn) validés.

---

## Phase 1 — Extension type + factory `createIntegralArea` (✅ close)

### Fichiers modifiés

| Fichier                                                                      | Changement                                                                                                        |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `src/lib/geometry-core/types/elements.ts`                                    | + 3 champs optionnels sur `GeoIntegralArea` : `secondFunctionId?`, `differenceExpression?`, `compiledDifference?` |
| `src/lib/geometry-core/graph/figure.ts`                                      | + branche dans `createIntegralArea` pour mode V3 (aire_entre)                                                     |
| `src/lib/geometry-core/graph/__tests__/figure-integral-area-between.test.ts` | Nouveau fichier — 16 tests sur le mode V3                                                                         |

### Décisions implémentées

1. **Champ optionnel** `secondFunctionId?: string` : quand présent → mode V3 ;
   `signed` est forcé à `false` (aire_entre toujours ≥ 0) ; `dependsOn` inclut g.
2. **Cache `differenceExpression`** = `subtract(f.expression, g.expression)`,
   sans `simplify` (Q-A validée). `compiledDifference = compile(h)`.
3. **Substitution interne** de la « working expression » dans le compute closure :
   `workingExpression` pointe vers `f.expression` en V1/V2, vers `h` en V3.
   Le branchement existant `signed=false` gère V3 transparentement (findRoots
   et numericIntegrate travaillent sur h sans modification).
4. **Antidérivée** : `integrateDefinite(workingExpression, ...)` — calcule
   directement H(x), primitive de h, en V3 mode.
5. **Validation** : throw `createIntegralArea: secondFunctionId "<id>" is not
a function element` si l'id ne référence pas un `GeoFunction`.

### Tests Phase 1 — 16/16 verts

Catégories couvertes :

| Tests   | Description                                                                |
| ------- | -------------------------------------------------------------------------- |
| A1-A3   | Création : champs `signed=false`, `secondFunctionId`, `dependsOn` corrects |
| B4-B7   | Calcul correct sur 4 cas pédagogiques (1/12, 2√2, 2 avec sign change, 2)   |
| C8-C9   | Invariances : symétrie (f, g) ↔ (g, f) ; bornes inversées                 |
| D10-D11 | Cas dégénérés : a===b → 0 ; f≡g → 0                                        |
| E12     | Réactivité slider sur la borne basse                                       |
| F13-F14 | Validation : rejet d'un id non-fonction et d'un id inexistant              |
| G15     | NaN-on-divergence avec cache discontinuités de h                           |
| H16     | Coexistence sur même figure : `integrale` + `aire` + `aire_entre`          |

### Régression V1/V2

- 55/55 tests V1 + V2 d'`integralArea` continuent de passer.
- 456/458 tests `figure/__tests__/` verts (2 skipped pré-existants).

### Notes techniques

- **`y = x` parsé en GeoLine** : les tests utilisent `y = x^3` ou des paires
  non-affines pour rester sur le chemin `GeoFunction`. Documenté en haut du
  fichier de tests, comme `figure-integral-area-unsigned.test.ts`.
- **Parser custom et la division** : `y = x^2 / 2` ne parse pas (limitation
  observée). Les tests évitent `/` après `^`.
- **G15 (NaN-on-divergence)** : sans cache, le compute peut retourner une
  valeur finie (Simpson par morceaux peut "contourner" la singularité).
  Le test passe le cache `discontinuities` calculé via
  `getAllDiscontinuities(h, 'x')` — exactement ce que fera le DSL Phase 2.

### Commit Phase 1

À faire après code review.

---

## Phase 2 — DSL builtin `case 'aire_entre'` (✅ close)

### Fichiers modifiés

| Fichier                                                              | Changement                                                                                         |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `src/lib/geometry-core/dsl/builtins.ts`                              | + `case 'aire_entre'` après `case 'integrale'` (~95 lignes) ; +`'aire_entre'` dans `BUILTIN_NAMES` |
| `src/lib/geometry-core/graph/figure.ts`                              | Fix bug B4 : dedupe `dependsOn` quand `secondFnId === functionId` (Q-C autorisée)                  |
| `src/lib/geometry-core/dsl/__tests__/interpreter-aire-entre.test.ts` | Nouveau fichier — 20 tests sur le builtin                                                          |

### Pipeline implémenté

1. Validation `pos.length === 4` ; sinon erreur DSL claire.
2. Validation `pos[0]` et `pos[1]` sont des `GeoFunction` (sinon `requireElement` ou type-check).
3. Résolution des bornes `pos[2]` et `pos[3]` (nombres ou refs scalaires/sliders).
4. Construction `h = subtract(f.expression, g.expression)` puis
   `getAllDiscontinuities(h, 'x')` (fail-open en cas de null — Q-D validée).
5. Appel `figure.createIntegralArea(fId, lower, upper, { secondFunctionId: gId, discontinuities, color: '#fb923c' })`.
6. **2 appels** à `warnIfSingularitySuspected` : sur `f.expression` et `g.expression` (préfixe `'aire_entre'`),
   pas sur `h` (cf §2.8 de l'étude).
7. Retourne `{ figureId: scalarId, symbolType: 'scalar', styleTargetId: areaId }`.

### Tests Phase 2 — 20/20 verts

| Tests | Description                                                               |
| ----- | ------------------------------------------------------------------------- |
| A1-A2 | Parsing nominal + création GeoIntegralArea V3                             |
| B1-B4 | Compute correctness (1/12, 2√2, slider drag, f≡f autorisé)                |
| C1-C4 | Style : couleur orange par défaut, override couleur, opacite_fond, triade |
| D1-D6 | Validations : args count, arg 1/2 type, bornes type                       |
| E1-E4 | Singularité : warn déclenché, préfixe `aire_entre`, NaN-on-divergence     |

### Régression

- 1205/1205 tests verts (DSL + figure tests). 0 régression.

### Notes techniques

- **`pi` non exposé dans le DSL** : les tests utilisant des bornes en radians
  injectent la valeur numérique via interpolation JS du template
  (cohérent avec `aire-undercurve.test.ts`).
- **Dedupe `dependsOn`** : quand `secondFnId === functionId` (cas
  `aire_entre(f, f, ...)`), on ne pousse pas g dans deps pour éviter
  l'erreur « duplicate parent IDs » du graphe. Comportement conforme
  à Q-C (autoriser `aire_entre(f, f) = 0`).
- **Fail-open singularité** : si `getAllDiscontinuities(h)` retourne `null`
  (analyse échoue silencieusement), le compute fonctionne sans cache —
  cohérent avec `aire`/`integrale` V1/V2.

### Commit Phase 2

À faire après code review.

---

## Phase 3 — Rendu SVG `integralAreaBetweenToSVG` + dispatcher (✅ close)

### Fichiers modifiés

| Fichier                                                                  | Changement                                                                  |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| `src/lib/geometry-core/rendering/svg-primitives.ts`                      | + `integralAreaBetweenToSVG(...)` (~110 lignes, après `integralAreaToSVG`)  |
| `src/lib/geometry-core/rendering/__tests__/integral-svg-between.test.ts` | Nouveau fichier — 11 tests sur le helper                                    |
| `src/lib/components/geometry/GeometryCanvas.svelte`                      | + import du nouveau helper + ternaire de dispatch sur `el.secondFunctionId` |

### Algorithme implémenté

1. **Sampling unifié** : `f` est échantillonnée adaptativement (master grid). `g` est
   évaluée aux mêmes x-points pour aligner les samples. Coût ~ 2× sampling de `aire`.
2. **Construction de la courbe `h = f − g`** : point-par-point sur le master grid.
   Les indices où `g` est non-finie sont ajoutés aux `discontinuityIndices` de `h`.
3. **`splitOnZeros(h)`** réutilisé tel quel : retourne les sous-régions de signe constant
   avec les zéros interpolés en bordure.
4. **Pour chaque sous-région** (sign != 'zero'), on :
   - Re-évalue `f` et `g` à chaque point de la région (les zéros interpolés ne sont
     pas dans le master grid). Au zéro, `f(x_z) = g(x_z)` par définition → fermeture
     naturelle du polygone.
   - Construit le path : `f(forward)` via `curveToSVGPath`, puis `g(reversed)` via
     `curveToSVGPath` sur la liste inversée, stitché avec `'L' + g_path.slice(1)`
     (remplace le `M` initial par `L` pour relier f.end → g.end), suivi de `Z`.
5. **Sign mapping** : `region.sign` (de splitOnZeros) propagé tel quel.
   `'positive'` ⇔ `f > g` ; `'negative'` ⇔ `f < g`. Le dispatcher peut s'en servir
   pour différencier visuellement (V3 garde teinte uniforme par défaut, l'API
   reste cohérente avec V2).

### Dispatcher dans `GeometryCanvas.svelte`

```svelte
{:else if el.type === 'integralArea'}
    {@const svg = el.secondFunctionId
        ? integralAreaBetweenToSVG(el.id, figure, transformer, dims)
        : integralAreaToSVG(el.id, figure, transformer, dims)}
    {#if svg}
        ...
    {/if}
```

V1/V2 (sans `secondFunctionId`) → `integralAreaToSVG` inchangé.
V3 (avec `secondFunctionId`) → `integralAreaBetweenToSVG`. Le rendu utilise la même
boucle SVG, le même styling (`fill`, `stroke`, opacité), juste un helper différent
en amont.

### Tests Phase 3 — 11/11 verts

| Tests | Description                                                                             |
| ----- | --------------------------------------------------------------------------------------- |
| A1    | Curves non-intersectantes → exactement 1 path (h ≡ 2)                                   |
| A2    | Curves avec sign change → ≥ 2 paths (positive + negative)                               |
| A3    | Chaque path est fermé (M ... Z)                                                         |
| A4    | Path structure correcte (M, ≥ 1 L, Z, longueur > seuil)                                 |
| A5    | Sign correct selon f > g ou f < g                                                       |
| B6-B9 | Cas null : id inexistant, mauvais type, mode V1/V2 sans secondFunctionId, bornes égales |
| B10   | f ≡ g → null ou paths vides                                                             |
| C11   | Réactivité slider (path change quand borne bouge)                                       |

### Régression

- 2393/2395 tests geometry-core verts (2 skipped pré-existants). 0 régression sur 101 fichiers.

### Notes techniques

- **Master grid f** : choix d'utiliser le sampling adaptatif de `f` comme grille
  maître plutôt que de sampler les deux indépendamment (qui produirait des grilles
  désalignées). Coût négligeable : on évalue `g` une fois par point de `f` (~300
  évaluations).
- **Stitching `M` → `L`** : `curveToSVGPath(g_reversed)` produit un path qui démarre
  par `M(g(lastX))`. On remplace ce `M` par `L` pour relier proprement le
  `f(lastX)` au `g(lastX)`. La closure `Z` ramène à `f(firstX)` (point initial du
  `M` de `f_path`).
- **Zéro de h aux bornes intérieures** : par définition `h(x_z) = 0 ⇔ f(x_z) = g(x_z)`.
  Le polygone se ferme naturellement à ces points (les courbes se touchent), pas
  besoin de jonction explicite.
- **Svelte autofixer** : `GeometryCanvas.svelte` (1955 lignes) est trop volumineux
  pour passer dans le MCP autofixer en une passe. Modifs textuellement triviales
  (2 lignes alignées sur le pattern existant). Validation déférée à Phase 5
  (`pnpm check:incremental`).

### Commit Phase 3

À faire après code review.

---

## Phase 4 — Démo + doc utilisateur (✅ close)

### Fichiers ajoutés / modifiés

| Fichier                                                             | Action                                                           |
| ------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `src/routes/(public)/geometry-demo/sliders/aire-entre/+page.svelte` | Nouveau — page démo `sin(x)` vs `cos(x)` sur `[π/4, 5π/4] = 2√2` |
| `src/routes/(public)/geometry-demo/sliders/aire-entre/+page.ts`     | Nouveau — `export const ssr = false;`                            |
| `src/routes/(public)/geometry-demo/sliders/+page.svelte`            | + carte de navigation vers la nouvelle démo                      |
| `docs/ref/geometry-dsl/aire_entre.md`                               | Nouveau — doc utilisateur complète                               |
| `docs/ref/geometry-dsl/aire.md`                                     | Note "Prévu en V3" remplacée par lien vers `aire_entre`          |

### Démo

URL : `/geometry-demo/sliders/aire-entre`

- Cas pédagogique : aire entre `sin(x)` et `cos(x)` sur `[π/4, 5π/4]` = `2√2 ≈ 2.828`.
- Sliders pour `a` et `b` (initialisés aux intersections naturelles).
- Affichage `mtexte` de la valeur courante et de la cible 2√2.
- Section explicative en bas : pourquoi `aire_entre` ≠ `aire(f) − aire(g)`,
  triade pédagogique bleu/vert/orange.

### Doc utilisateur

`aire_entre.md` couvre :

- Syntaxe (4 args positionnels + args nommés).
- Couleur orange par défaut (cohérente avec la triade).
- 6 exemples pédagogiques (cas Terminale, sliders, équivalence avec `aire(f-g)`,
  cas dégénéré, bornes inversées).
- Sémantique formelle (`Σ |H(x_{i+1}) − H(x_i)|`).
- Calcul interne (cache symbolique, fallback Simpson).
- NaN-on-divergence avec exemple `1/x` vs `sin(x)`.
- Cas limites V1 (bornes infinies, 3+ courbes, intersections auto).
- Voir aussi : `aire`, `integrale`, `courbe`, `mesure`, `slider`.

### Notes techniques

- **Svelte autofixer sur `+page.svelte`** : émet un warning sur `href="/..."`
  sans `resolve()`. Tous les autres pages de démo utilisent ce même pattern
  (5+ fichiers identiques). Garder l'uniformité du codebase plutôt que de
  diverger sur 1 fichier.

### Commit Phase 4

À faire après ce commit.

---

## Phase 5 — Quality checks finaux (✅ close)

### Vérifications effectuées

| Check                                          | Résultat                                                                                                                        |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check:incremental` (TypeScript + Svelte) | ✅ Aucune nouvelle erreur (les 9 listées sont pré-existantes hors scope, filtrées par le script via `slides/demo` et `extern/`) |
| ESLint sur fichiers modifiés                   | ✅ Passé en lint-staged à chaque commit                                                                                         |
| Svelte autofixer sur `+page.svelte` (nouveau)  | ⚠️ Warning `href` sans `resolve()` — cohérent avec 5+ démos existantes, gardé pour uniformité                                   |
| Svelte autofixer sur `GeometryCanvas.svelte`   | ⏭️ Skipped (fichier 1955 lignes trop gros pour le MCP en une passe ; modifs textuellement triviales validées par les tests)     |
| Tests : geometry-core complet                  | ✅ 2393/2395 verts (2 skipped pré-existants), 0 régression                                                                      |

---

## Récapitulatif final — feature `aire_entre(f, g, a, b)`

### 5 commits livrés

| Phase | Commit     | Description                                    | Files | Lignes        |
| ----- | ---------- | ---------------------------------------------- | ----- | ------------- |
| 1     | `a2e6a52f` | Type + factory branch                          | 5     | +1171 / -19   |
| 2     | `4b8c3388` | DSL builtin + dedupe fix                       | 4     | +494 / -15    |
| 3     | `5763e80c` | SVG renderer + dispatcher + corrections review | 4     | +407 / -2     |
| 4     | `0a112334` | Démo `/sliders/aire-entre` + doc utilisateur   | 6     | +403 / -4     |
| 5     | (à faire)  | Doc de progression finalisée + clôture         | 1     | (this commit) |

### Couverture tests

| Niveau                   | Tests verts | Régression |
| ------------------------ | ----------- | ---------- |
| Phase 1 (factory)        | 16/16       | 0          |
| Phase 2 (DSL builtin)    | 21/21       | 0          |
| Phase 3 (SVG renderer)   | 11/11       | 0          |
| **Total nouveaux tests** | **48**      | **0**      |
| Régression geometry-core | 2393/2395   | 0          |

### Documents produits

1. **`docs/wip/geometry/aire-entre-study.md`** — étude de conception complète,
   décisions tranchées 2026-05-01.
2. **`docs/wip/geometry/aire-entre-progress.md`** — journal détaillé phase par phase
   (ce document).
3. **`docs/ref/geometry-dsl/aire_entre.md`** — doc utilisateur publique.
4. **`docs/ref/geometry-dsl/aire.md`** (modifié) — note "Prévu en V3" remplacée
   par lien vers le nouveau builtin.

### Effort réel vs estimé

- **Estimé** : 5-7 h (cf. étude §4).
- **Réel** : ~5-6 h sur 5 phases avec TDD strict (tests rouges → impl → review →
  commit). Conforme.

### Points d'extension reportés (V4+)

- Refactor des 3 cases DSL `integrale`/`aire`/`aire_entre` en helper commun
  `interpretAreaBuiltin(...)` (Q5 reportée).
- Test E5 dans `integral-svg-between.test.ts` pour discontinuité dans `f` ou `g`
  (suggestion code review Phase 3, non-bloquant).
- Logging conditionnel `console.warn` quand une sous-région est entièrement NaN
  (suggestion code review Phase 3, non-bloquant).
- Couverture tests numeric fallback en V3 mode (suggestion code review Phase 1).
- Détection automatique du domaine d'intersection (`aire_entre(f, g)` sans bornes).

**→ Feature complète et stable. Prête pour usage pédagogique en production.**
