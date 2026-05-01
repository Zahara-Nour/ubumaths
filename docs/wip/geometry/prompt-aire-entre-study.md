# Étude : ajout du builtin `aire_entre(f, g, a, b)` à geometry-core

## Objet

Concevoir un nouveau builtin DSL `aire_entre(f, g, a, b)` qui :

1. Calcule l'**aire géométrique entre deux courbes** `f` et `g` sur
   `[a, b]`, c.-à-d. `∫ₐᵇ |f(x) − g(x)| dx` — toujours positive.
2. Trace la zone correspondante **entre les deux courbes** (et non
   entre une courbe et l'axe des x comme `aire`/`integrale`).
3. Réagit aux changements de bornes (sliders, scalaires dérivés).

**C'est une étude / Phase 0** : pas de code de production cette session.
Livrable = plan TDD validé + ≤ 5 questions ouvertes.

> **Cas pédagogique classique de Terminale spé maths** :
>
> - Calculer l'aire entre `y = x²` et `y = x` sur `[0, 1]` (paraboles
>   et droites).
> - Aire entre `y = sin(x)` et `y = cos(x)` entre deux intersections
>   consécutives.
> - Mise en évidence de la formule
>   `aire = ∫_{f∩g} |f − g|` quand les courbes se croisent.

---

## Contexte amont (acquis V1 + V2 d'`integrale`/`aire`)

V1/V2 commits livrés (à parcourir avant de proposer) :

```
6e808d0e..1e6aa6b0  integrale V1 (6 commits + fix LaTeX + fix canvas)
ef6ab0ad..ac487ad6  aire V2 (5 commits)
e00c84b2..1789a730  singularity-warn V2 (3 commits + bonus parser)
```

Documents amont :

- `docs/wip/geometry/integrale-study.md` — étude/spec V1, 5 décisions
  clés (sémantique, type d'élément paire, label, etc.).
- `docs/wip/geometry/integrale-progress.md` — journal V1.
- `docs/wip/geometry/aire-study.md` (et progress) — étude V2 d'`aire`,
  introduit le flag `signed: boolean` sur `GeoIntegralArea`
  (option α retenue).
- `docs/wip/geometry/singularity-rigorous-study.md` (et progress) —
  V2 du `singularity-warn`, désormais basé sur `analyzeContinuity`.
- `docs/ref/geometry-dsl/integrale.md` et `aire.md` — docs utilisateur.

**Acquis directement utilisables pour `aire_entre`** :

1. Le **pattern paire** (option C V1 d'`integrale`) : `GeoScalar` réactif
   exposé au DSL + élément visuel dédié, lien interne via
   `_visualAreaId`/`_scalarId`.
2. Le **cache symbolique** : `integrateDefinite` à la création avec
   `allowNumeric: false`, `compiledF` stocké pour évaluations rapides
   `F(b) − F(a)`. Pour `aire_entre`, on appliquerait sur `h = f − g`.
3. Le helper `splitOnZeros(samples)` — utilisable directement pour
   trouver les intersections (zéros de `f − g`).
4. Le module `singularity-warn` V2 (basé sur `analyzeContinuity`) —
   appelé sur `f`, `g`, et probablement aussi sur `f − g` pour
   détecter les divergences.
5. Le NaN guard V2 sur intégrales divergentes.
6. La factory `figure.createIntegralArea(...)` avec flag `signed` —
   point d'extension naturel.
7. `integralAreaToSVG` (rendering) — base à étendre pour le path
   "entre deux courbes".

---

## Inventaire ciblé

### Sémantique mathématique

`aire_entre(f, g, a, b)` :

```
aire = Σ |∫_{[xᵢ, xᵢ₊₁]} (f − g)|
```

où `x₀ = a < x₁ < ... < xₙ < xₙ₊₁ = b` et les `xᵢ` sont les
intersections de `f` et `g` dans `(a, b)` (zéros de `f − g`).

C'est **mathématiquement identique** à `aire(f − g, a, b)` (déjà
livré). Donc le **compute** peut reposer sur l'infra `aire` en
construisant en interne `h = f − g`.

Le **visuel** en revanche diffère fondamentalement :

- `aire(h, a, b)` peint entre `h` et l'axe des x.
- `aire_entre(f, g, a, b)` peint entre `f` et `g`. Les chemins SVG sont
  qualitativement différents.

### Algorithme de rendu (path SVG)

Pour chaque sous-région `[xᵢ, xᵢ₊₁]` (où `f − g` garde un signe
constant) :

1. Sample `f` et `g` sur `[xᵢ, xᵢ₊₁]`.
2. Path : `M(xᵢ, f(xᵢ)) → curve(f) → L(xᵢ₊₁, f(xᵢ₊₁)) →
L(xᵢ₊₁, g(xᵢ₊₁)) → curve_reverse(g) → L(xᵢ, g(xᵢ)) → Z`.
3. La courbe de `g` est parcourue **dans le sens inverse** (de
   `xᵢ₊₁` vers `xᵢ`) pour fermer correctement le polygone.

Différence majeure avec `aire`/`integrale` qui ferment via l'axe `y=0`.

---

## Périmètre de l'étude (Phase 0)

### Décisions à prendre

1. **API DSL** :

   ```
   A = aire_entre(f, g, 0, 1)                        # nominal
   A = aire_entre(f, g, a, b, couleur="orange")      # avec style
   ```

   - Nom : `aire_entre` ? ou `aire2` (court) ? ou `aire_inter` ?
     Reco : `aire_entre` — explicite, lisible en français.
   - Mêmes args nommés que `aire` (couleur, opacite_fond, etc.).
   - Retourne un scalaire (la valeur, toujours ≥ 0).

2. **Type d'élément** — choisir entre :

   - **Option α** : étendre `GeoIntegralArea` avec un champ optionnel
     `secondFunctionId?: string`. Signifie : si présent, on est en mode
     `aire_entre` ; sinon mode classique. Le compute et le rendu
     branchent dessus. Réutilise toute l'infra existante.
   - **Option β** : nouveau type dédié `GeoBetweenArea` avec
     `firstFunctionId`, `secondFunctionId`, bornes, et son propre
     compute/renderer. Plus propre architecturalement, plus de code
     dupliqué.
   - **Option γ** : sub-discriminant (`kind: 'integral' | 'unsigned' |
'between'`) sur `GeoIntegralArea`. Variante d'α plus explicite.

   **Recommandation à argumenter dans l'étude** : option α avec
   `secondFunctionId?` — pattern minimal qui complète naturellement le
   flag `signed` ajouté en V2 d'`aire`. Coût : un branchement de plus
   dans le compute et le renderer.

3. **Compute** :

   - Construire en interne `h: MathNode = subtract(f.expression, g.expression)`.
   - Appeler `integrateDefinite(h, a, b, { allowNumeric: false })` pour
     obtenir l'antidérivée H(x).
   - Trouver les zéros de `h = f − g` dans `(a, b)` (numérique via
     `splitOnZeros` ou exact via `mathAST/analysis/roots`).
   - Calculer `aire = Σ |H(xᵢ₊₁) − H(xᵢ)|` (cache symbolique).
   - Si `status !== 'exact'` → fallback Simpson sur chaque
     sous-intervalle de `h`.

4. **Cas où `f` et `g` ne se croisent pas** sur `[a, b]` (l'une
   toujours au-dessus de l'autre) :

   - Une seule sous-région.
   - Path simple, pas de splittage.
   - Comportement à valider.

5. **Cas dégénéré : `f === g`** :

   - `aire_entre = 0`, zone vide.
   - Comportement attendu : retourner 0, ne rien dessiner ?
     Ou dessiner une zone d'épaisseur nulle (invisible) ?
     Reco : retourner 0, pas de path.

6. **Singularités et discontinuités** :

   - Réutilise le module `singularity-warn` V2 sur `f`, `g`, ET
     `h = f − g`. Si l'une des trois a une discontinuité divergente
     dans `[a, b]` → NaN + warn.
   - Cas pédagogique : `f = 1/x`, `g = 0` sur `[-1, 1]` → divergent.
     Warn explicite + NaN.

7. **Couleur par défaut** :

   - `integrale` : violet.
   - `aire` : vert.
   - `aire_entre` : ? Reco : **orange** (distinct des deux autres pour
     visualiser les trois sur la même figure si on veut comparer).
     **Question pour l'utilisateur**.

8. **Performance** :

   - Compute : à peu près 2× le coût d'`aire` (sample 2 fonctions au
     lieu d'une, mais Simpson reste sub-ms).
   - Cible : < 1 ms / éval symbolique, < 5 ms / éval numérique.
     Bench requis.

9. **Cas pédagogiques à tester** :

   - `f = courbe("y = x^2")`, `g = courbe("y = x")` sur `[0, 1]` →
     aire = 1/6.
   - `f = courbe("y = sin(x)")`, `g = courbe("y = cos(x)")` sur
     `[π/4, 5π/4]` → aire = `2√2`.
   - `f = courbe("y = x^3")`, `g = courbe("y = x")` sur `[-1, 1]` →
     les deux courbes se croisent à `x = -1, 0, 1`. Aire = 1/2
     (somme sur 2 sous-régions).
   - `f` et `g` qui ne se croisent pas : `f = courbe("y = x^2 + 2")`,
     `g = courbe("y = x^2")` sur `[0, 1]` → aire = 2 (rectangle vertical
     de hauteur 2 et largeur 1).

### Hors scope V1 (à confirmer)

- ❌ Bornes infinies.
- ❌ `aire_entre(f, g, P1, P2)` avec bornes-points.
- ❌ Aire entre 3+ courbes (`aire_intersection(...)`).
- ❌ Détection automatique du domaine d'intersection (l'utilisateur
  fournit `[a, b]` explicitement).
- ❌ Export TikZ/Typst (item séparé V2).

---

## Plan TDD attendu

L'étude doit produire `docs/wip/geometry/aire-entre-study.md` avec :

1. **Inventaire confirmé** par lecture des modules V1/V2 :
   - `figure.createIntegralArea` avec flag `signed`.
   - `integralAreaToSVG` (et son helper `splitOnZeros`).
   - `singularity-warn` V2.
2. **Recommandations argumentées** pour les 9 questions.
3. **API DSL finale** avec 4-5 exemples.
4. **Plan TDD détaillé** :
   - Phases (probablement 4-5 : type/factory → DSL builtin → compute →
     rendu → démo/doc).
   - Estimation effort (probablement 5-6 h).
   - Agents à utiliser (`code-reviewer` proactif, `frontend-developer`
     pour le rendu SVG, `test-automator` pour la couverture).
5. **Liste finale de questions ouvertes** (≤ 5).

### Contraintes

- **NE PAS écrire de code de production** dans cette session.
- Lire intégralement :
  - `src/lib/geometry-core/types/elements.ts` (`GeoIntegralArea`).
  - `src/lib/geometry-core/graph/figure.ts` (`createIntegralArea` —
    doit avoir le flag `signed` post-V2).
  - `src/lib/geometry-core/dsl/builtins.ts` (case `'integrale'` et
    `'aire'`).
  - `src/lib/geometry-core/rendering/svg-primitives.ts`
    (`integralAreaToSVG`, `splitOnZeros`).
  - `src/lib/geometry-core/dsl/singularity-warn.ts` (V2).
- Vérifier expérimentalement (test temporaire jetable autorisé) sur
  les 4 cas pédagogiques (§9). Documenter les valeurs attendues.
- Suivre le workflow TDD obligatoire de `CLAUDE.md` :
  proposer comportements en français → valider avec l'utilisateur →
  tests rouges → implémentation → review → checks → commit.

---

## Références code (chemins absolus)

À consulter en priorité :

```
src/lib/geometry-core/types/elements.ts          # GeoIntegralArea (avec signed)
src/lib/geometry-core/graph/figure.ts            # createIntegralArea
src/lib/geometry-core/dsl/builtins.ts            # case 'integrale' et 'aire'
src/lib/geometry-core/rendering/svg-primitives.ts # integralAreaToSVG, splitOnZeros
src/lib/geometry-core/dsl/singularity-warn.ts    # V2 rigoureux

src/lib/mathAST/integration/integrate.ts          # integrateDefinite (déjà connu)
src/lib/mathAST/integration/numeric.ts            # numericIntegrate
src/lib/mathAST/factory.ts                        # subtract() pour h = f - g
src/lib/mathAST/analysis/roots.ts                 # findRoots (option exacte)

src/routes/(public)/geometry-demo/sliders/integrale/+page.svelte  # pattern démo
src/routes/(public)/geometry-demo/sliders/aire/+page.svelte       # à confirmer
docs/ref/geometry-dsl/integrale.md                # doc V1 (modèle)
docs/ref/geometry-dsl/aire.md                     # doc V2 (modèle plus proche)
```

---

## Critère de succès de l'étude

L'étude est terminée quand l'utilisateur peut, en lisant
`docs/wip/geometry/aire-entre-study.md` seul, prendre une décision
GO/NO-GO sur l'implémentation et savoir précisément :

- L'API DSL exposée.
- Quel type d'élément (option α/β/γ retenue) et quelles modifs sur
  `GeoIntegralArea`.
- Quelles fonctions `mathAST` sont appelées et où.
- L'effort V1 chiffré (probablement 5-6 h).
- Les cas couverts V1 vs V2/V3 (bornes infinies, aire 3+ courbes, etc.).

Une fois les questions ouvertes tranchées, le plan TDD est exécutable
en suivant les patterns V1/V2 (4-5 phases : type/factory → DSL →
compute → rendu → démo/doc, plus quality checks finaux).
