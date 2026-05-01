# Étude : ajout du builtin `aire(f, a, b)` à geometry-core

## Objet

Concevoir un nouveau builtin DSL `aire(f, a, b)` qui :

1. Calcule l'**aire géométrique** entre la courbe `f` et l'axe des x sur
   `[a, b]`, c.-à-d. `∫ₐᵇ |f(x)| dx` — toujours **positive**.
2. Trace la zone correspondante avec une **teinte uniforme** sur toutes
   les sous-régions (pas de distinction positive/négative comme
   `integrale()`).
3. Réagit aux changements de bornes (sliders, scalaires dérivés).

**C'est une étude / Phase 0** : pas de code de production cette session.
Livrable = plan TDD validé + ≤ 5 questions ouvertes.

> **Distinction sémantique cruciale** :
>
> - `integrale(f, a, b)` (déjà livré V1) calcule **l'intégrale** signée
>   `F(b) − F(a)` qui peut être négative.
> - `aire(f, a, b)` (cette étude) calcule l'**aire géométrique** = somme
>   des aires absolues des sous-régions, toujours positive.
> - Les deux coïncident si `f ≥ 0` sur `[a, b]`.
>
> En programme Terminale spé, l'enseignant fait explicitement la
> distinction. Avoir les deux builtins permet de visualiser la
> différence sur la même figure.

---

## Contexte amont (V1 d'`integrale` déjà livrée)

V1 commits (lire avant de proposer) :

```
6e808d0e  feat(geometry-core): add GeoIntegralArea type and createIntegralArea factory
acec320e  feat(geometry-core): add integrale() DSL builtin and singularity warning
b26f8eb8  test(geometry-core): consolidate integrale reactivity
4ab8c699  feat(geometry-core): render GeoIntegralArea as signed sub-region paths
42e7dea7  docs(geometry-core): add integrale demo page and user DSL reference
1e6aa6b0  fix(GeometryCanvas): widen mathText foreignObject for tall LaTeX
```

Documents amont :

- `docs/wip/geometry/integrale-study.md` — étude/spec V1, validée
  utilisateur, 5 décisions clés.
- `docs/wip/geometry/integrale-progress.md` — journal des 6 phases V1
  avec récap des livrables et limitations connues.
- `docs/ref/geometry-dsl/integrale.md` — doc utilisateur V1.

**Acquis V1 réutilisables pour `aire`** :

1. Le **pattern paire** (option C) : `GeoScalar` réactif + élément
   visuel dédié, retourne le scalaire au DSL, lien interne via
   `_visualAreaId`/`_scalarId`. Précédent dans le code.
2. La factory `figure.createIntegralArea(...)` : pourrait être étendue
   ou dupliquée (voir §Périmètre).
3. Le **cache symbolique** : `integrateDefinite` appelé une fois à la
   création avec `allowNumeric: false`, `compiledF` stocké pour
   évaluation rapide F(b) − F(a). Pattern à reproduire.
4. Le helper `splitOnZeros(samples)` dans `svg-primitives.ts` qui
   découpe par signe — directement réutilisable au rendu (pour `aire`,
   on ignore la teinte différente, on prend tous les sous-intervalles).
5. La heuristique `singularity-warn.ts` — applicable telle quelle.
6. Le rendu SVG `integralAreaToSVG` peut servir de base ; `aire` veut
   une version qui ne distingue pas le signe au fillOpacity.
7. La page démo (`/geometry-demo/sliders/integrale`) montre le pattern
   d'intégration.

---

## Inventaire `mathAST/analysis` utiles à `aire`

Localisation : `src/lib/mathAST/analysis/`

- `roots.ts` — `findRoots(expr, variable, options?)` ou similaire pour
  trouver les zéros de `f` sur un intervalle. À lire intégralement pour
  comprendre l'API exacte. **Pertinent pour le calcul exact** : aire =
  `Σ |F(z_{i+1}) − F(z_i)|` où `z_0 = a < z_1 < ... < z_n < z_{n+1} = b`
  et `z_1..z_n` sont les zéros de `f` dans `(a, b)`.
- `continuity.ts` — non requis pour V1 d'`aire` (on garde l'heuristique
  V1 de singularité).

**Décision implicite à valider** : pour V1 d'`aire`, on utilise une
détection numérique des zéros (échantillonnage + sign-change
interpolation, comme `splitOnZeros`). Si `mathAST/analysis/roots`
fournit une API simple et robuste, on peut basculer dessus pour plus de
précision. Reposera la question lors de l'étude effective.

---

## Périmètre de l'étude (Phase 0)

### À analyser et documenter

1. **Sémantique de calcul** :

   - `aire(f, a, b)` = `Σ |∫_{[z_i, z_{i+1}]} f|` sur les sous-intervalles
     délimités par les zéros de `f` dans `[a, b]`. Confirmer la formule.
   - Bornes inversées (`a > b`) : on prend `[min(a,b), max(a,b)]` (l'aire
     géométrique ne dépend pas de l'orientation algébrique). À valider.
   - Bornes égales : retourne 0.
   - Singularités : même heuristique V1 (warn console).

2. **API DSL proposée** :

   ```
   A = aire(f, 0, 1)                                 # bornes nombres
   A = aire(f, a, b, couleur="vert", opacite_fond=0.4)  # avec style
   ```

   Mêmes args nommés que `integrale`. Retourne un scalaire (la valeur,
   toujours ≥ 0).

3. **Type d'élément** — choisir entre :

   - **Option α** : étendre `GeoIntegralArea` avec un flag
     `signed: boolean` (défaut true pour `integrale`, false pour `aire`).
     Les fonctions de calcul et de rendu branchent sur ce flag.
   - **Option β** : nouveau type dédié `GeoArea` (ou `GeoUnsignedArea`)
     avec son propre renderer. Plus propre mais ajoute du code
     dupliqué.
   - **Option γ** : sub-discriminant : `GeoIntegralArea` reste, mais
     ajoute `kind: 'integral' | 'unsigned'` sur le type. Variante de α.

   **Recommandation à argumenter dans l'étude** : option α (flag
   booléen) — réutilise la factory, le compute et le renderer, avec
   branchement minimal. Mais cette préférence est à challenger avec
   l'utilisateur.

4. **Compute** :

   - À la création, appeler `integrateDefinite(f.expression, a, b, { allowNumeric: false })`.
   - Si `status === 'exact'` → stocker `antiderivative` et `compiledF`.
     Trouver les zéros de `f` dans `(a, b)` (numérique ou via
     `mathAST/analysis/roots`). Calculer
     `aire = Σ |F(z_{i+1}) − F(z_i)|`.
   - Si `status === 'unsupported'` → fallback : trouver les zéros par
     échantillonnage de `f` (50 points, sign-change), puis pour chaque
     sous-intervalle appeler `numericIntegrate(f, 'x', z_i, z_{i+1})` et
     prendre `Math.abs`. Sommer.
   - Bench attendu : un peu plus cher que `integrale` (multiple Simpson
     calls), mais < 5 ms/éval pour des cas typiques.

5. **Rendu visuel** :

   - Même algorithme `splitOnZeros`, mais **ignorer le `sign`** au
     niveau du `fill-opacity` — utiliser `fillOpacity` uniforme pour
     tous les sub-paths.
   - Réutiliser `integralAreaToSVG` (option α) avec un paramètre, ou
     créer `unsignedAreaToSVG` (option β).
   - Couleur par défaut : différente d'`integrale` ? Bleu vs vert pour
     distinguer visuellement quand les deux sont sur la même figure ?
     **Question pour l'utilisateur**.

6. **Pédagogie / cas d'usage** :

   - Démo proposée : `f = courbe("y = x^3 - x")`, sur `[-1, 1]` :
     - `I = integrale(f, -1, 1)` → 0 (annulation des deux régions).
     - `A = aire(f, -1, 1)` → 0.5 (somme des deux aires).
   - Affichage côte-à-côte : pédagogiquement très clair.

7. **Cas limites à tester** :

   - `f` toujours positive → `aire = integrale` (= F(b) − F(a)).
   - `f` toujours négative → `aire = -integrale` (= F(a) − F(b)).
   - `f` change de signe → splitter et sommer les |·|.
   - `f` non-élémentaire (`exp(-x²)`) → fallback Simpson par
     sous-intervalle.
   - Zéro tangent à l'axe (`f(x) = (x-1)² ≥ 0`) → `aire = integrale`,
     mais le zéro à `x=1` ne doit pas créer de splittage parasite.
     C'est subtil : un zéro **simple** (avec changement de signe) doit
     splitter ; un zéro **double** (tangent) ne doit pas. À discuter.

8. **Hors scope V1 (`aire`)** — à confirmer :
   - Singularités rigoureuses (V3, mutualisé avec V2 d'`integrale`).
   - Bornes infinies.
   - Export TikZ/Typst.

### Comment livrer l'étude

Produire `docs/wip/geometry/aire-study.md` avec :

1. **Inventaire confirmé** de `mathAST/analysis/roots` (signatures à
   jour) et des fonctions V1 réutilisables.
2. **Recommandations argumentées** pour les 8 questions ci-dessus, avec
   alternatives envisagées et justifications.
3. **API DSL finale proposée** avec 3-5 exemples concrets.
4. **Plan TDD détaillé** (phases : spec → tests rouges → impl → review
   → checks → commit) avec fichiers à modifier/créer, estimation
   d'effort, et agents à utiliser.
5. **Liste finale de questions ouvertes** pour l'utilisateur (≤ 5
   questions ciblées).

### Contraintes

- **NE PAS écrire de code de production** dans cette session.
- Lire le code de Phase 1-4 d'`integrale` pour bien comprendre les
  patterns à réutiliser. Notamment :
  - `src/lib/geometry-core/graph/figure.ts` — méthode
    `createIntegralArea`.
  - `src/lib/geometry-core/dsl/builtins.ts` — `case 'integrale'`
    (~ligne 1614).
  - `src/lib/geometry-core/rendering/svg-primitives.ts` —
    `integralAreaToSVG` et `splitOnZeros`.
- Lire `src/lib/mathAST/analysis/roots.ts` (intégralement).
- Vérifier expérimentalement (test temporaire jetable autorisé) sur
  3-5 cas types : `x^2` sur `[0, 1]` (= integrale), `x^3 - x` sur
  `[-1, 1]` (= 0.5), `sin(x)` sur `[0, 2π]` (= 4), `(x-1)^2` sur
  `[0, 2]` (= 2/3, zéro tangent).
- Ne pas rouvrir les décisions tranchées pour `integrale` V1 (sémantique
  intégrale signée, pattern paire, warn singularité, etc.).
- Suivre le workflow TDD obligatoire de `CLAUDE.md` :
  proposer comportements en français → valider avec l'utilisateur →
  tests rouges → implémentation.

---

## Références code (chemins absolus)

À consulter en priorité :

```
src/lib/mathAST/analysis/roots.ts                  # API findRoots ?
src/lib/mathAST/integration/integrate.ts           # integrateDefinite (déjà connu)
src/lib/mathAST/integration/numeric.ts             # numericIntegrate

src/lib/geometry-core/types/elements.ts:426        # GeoIntegralArea (à étendre ?)
src/lib/geometry-core/graph/figure.ts:~2840        # createIntegralArea (modèle)
src/lib/geometry-core/dsl/builtins.ts:~1614        # case 'integrale' (modèle)
src/lib/geometry-core/dsl/singularity-warn.ts      # heuristique V1 (réutilisable)
src/lib/geometry-core/rendering/svg-primitives.ts  # splitOnZeros, integralAreaToSVG

src/routes/(public)/geometry-demo/sliders/integrale/+page.svelte  # pattern démo
docs/ref/geometry-dsl/integrale.md                 # doc V1 (à dupliquer pour aire)
```

---

## Critère de succès de l'étude

L'étude est terminée quand l'utilisateur peut, en lisant
`docs/wip/geometry/aire-study.md` seul, prendre une décision GO/NO-GO
sur l'implémentation et savoir précisément :

- L'API DSL exposée (signatures, args nommés).
- Quel type d'élément (option α/β/γ retenue).
- Quelles fonctions de `mathAST` seront appelées et où.
- L'effort V1 chiffré (probablement 4-6 h).
- Les cas couverts V1 vs V2 (bornes infinies, etc.).

Une fois les questions ouvertes tranchées, le plan TDD est exécutable
en suivant le pattern V1 d'`integrale` (6 phases : type/factory → DSL
builtin → compute → rendu → démo/doc → quality checks).
