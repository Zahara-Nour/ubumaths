# Chantier `simplify-carte` — une intention, un nom

## Reprendre ici

_Mis à jour le 2026-10-22, recommandations S1-S4 écrites, rien de tranché._

- **État** : phase 0. Relevé fait (§ 1-4) ; David a répondu à Q1 et Q2 (§ 6) ; mon analyse et 4 questions de suite en § 6. Aucun code touché.
- **Prochaine action** : David tranche S1-S4 (recommandations en fin de § 6), puis table « contexte → forme cible » (§ 6, piste B).
- **En attente de David** : S1-S4 (fin de § 6 : registre décimal gardé, ordre des sommes en option, domaine prudent par défaut, 4e test « ne cache aucune leçon » qui sort les identités de `tidy` vers `réduire` avec étapes) ; § 5 Q4-Q7.
- **Pièges en cours** : ne pas re-proposer ce qui est figé (§ 0) ; les bugs du § 4 sont à confirmer par un test rouge, pas affirmés.
- **Worktree / branche** : aucun (doc seule, sur `main`).

---

## 0. Ce qui est déjà figé — ne pas re-proposer

- **ADR 0006** : réduire pour COMPARER, pas pour écrire. `equivalenceForm` décide l'équivalence ; `normalize` rend la forme **affichée**. (J'ai dit l'inverse le 2026-10-22 en séance, à tort : c'est corrigé ici.)
- **Fusion simplify / pedagogical-simplify (David, 2026-09-21)** : un seul moteur, quatre politiques sur UNE question, « faut-il développer ? » — `réduire` (jamais), `développer` (toujours), `auto` (si moins cher), `factoriser` (jamais, et factoriser). `auto` ne factorise jamais. Spec d'`auto` : `docs/systeme/mathast/tidy-spec.md` §C, colonne « attendu ».
- **ADR 0026** : pas de second calculateur des grandeurs (`evaluateWithUnits` retirée, `tidy` calcule les grandeurs).

## 1. Les quatre besoins réels des appelants

Ce que veulent les ~250 appels relevés, quel que soit le nom de la fonction appelée :

| Besoin                                                           | Exemple                                                                                            | Servi aujourd'hui par                                                                                                                                                                                |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. Comparer** (équivalence, nullité, égalité)                  | réponse d'élève, dédoublonner des solutions, parité                                                | `areEquivalent` / `equivalenceForm` ✅ — mais aussi `normalize` + égalité (5 lieux), `tidy` + égalité structurelle (`limits/one-sided.ts:199`), `simplify` (`atelier/calcul.ts:1433, 3096`)          |
| **B. Écrire un résultat final** (sans changer la forme demandée) | valeur exacte dans l'Atelier, borne d'intervalle, ordonnée d'un extremum, `{{eval:…}}` d'un énoncé | `tidy` (~45 appels) — mais aussi `simplify` (5 lieux), `denormalize(normalize())` (`evaluate` exact, solveurs), et ~20 enveloppes de `tidy` (§ 2.3)                                                  |
| **C. Appliquer une consigne, avec étapes**                       | développer, factoriser, réduire, simplifier                                                        | `generatePedagogicalSimplifySteps` (8 appels) — sauf « développer », raconté par un autre module (`expand-explained`/`expand-steps`)                                                                 |
| **D. Calculer en interne**                                       | coefficients d'un polynôme, discriminant, signe en un point                                        | `denormalize(normalize())` (~100 appels, solveurs/intégration/limites/matrices), `evaluate` décimal, `evaluateNodeToApproximatedNumber` (~50 fichiers), `compile`, deux évaluateurs flottants maison |

## 2. La carte, famille par famille

### 2.1 Mettre en forme et transformer

| Fonction                           | Ce qu'elle fait VRAIMENT                                                                                                                                     | Ce que son nom laisse croire                                                                                           |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `tidy`                             | range, regroupe, réduit l'arithmétique, calcule les grandeurs ; ne développe ni ne factorise ; **réordonne** ; réécrit les décimaux en fractions ; `x/x → 1` | « ranger » — mais il calcule aussi (unités, notation scientifique, décimaux)                                           |
| `tidyTerms`                        | `tidy` terme à terme, **ordre gardé** ; le `tidy` complet l'emporte s'il regroupe ou évite un négatif en tête                                                | « mettre une dérivée au propre » (titre) — appelé sur des primitives, des formules du tableur, des valeurs interdites  |
| `simplify`                         | `tidy` + quelques règles + « développer seulement si moins cher » (juge à coût) ; pas d'étapes                                                               | c'est la cible d'`auto`                                                                                                |
| `generatePedagogicalSimplifySteps` | règles par intention, étapes rédigées ; `réduire`, `développer` ET `auto` passent par `normalize`, qui développe (`intent-rules.ts:151-155`)                 | `réduire` « sans développer » (`types.ts:74`) — faux ; `auto` ≡ `réduire` sur 50/50 du panel                           |
| `normalize`                        | forme canonique **développée**, affichée après `denormalize` ; sert surtout de **moteur de développement générique** (§ 1 D)                                 | « normaliser » ; le getter `Exp.normal` dit encore « allows exact comparison » (`exp.ts:~590`), faux depuis l'ADR 0006 |
| `equivalenceForm`                  | `normalize` + réductions (trigo, log, puissances) : la forme qui décide l'équivalence                                                                        | ✅ nom juste, mais aucun appelant hors `mathAST`                                                                       |

### 2.2 Trois sens de « simplifier »

1. `simplify()` — `tidy` + juge à coût.
2. `Exp.simplify()` (`exp.ts:661`) et `simplifyExpression()` (`math/index.ts:191`) — `denormalize(normalize())`, qui **développe tout**. Aucun appelant produit (API exportée morte).
3. `.simplifier` de l'Atelier — `pedagogical-simplify` en `auto`. Son en-tête (`atelier/simplify-steps.ts:4`) raconte que `simplify()` rendait `x+x` et `sqrt(8)` inchangés.

Et `evaluate` en mode exact (le défaut) est un quatrième « simplifier » : `normalize` + `denormalize` + fonctions d'arrondi (`eval/evaluate.ts:1533`), qui peut rendre un nœud non numérique.

### 2.3 Les enveloppes de `tidy` (~20)

| Groupe                            | Fonctions                                                                                                                                                                                                                              | Constat                                                                                                                              |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| try/catch seul                    | `tidySafe` ×3 (identiques)                                                                                                                                                                                                             | avalent les bugs que `tidy` veut laisser remonter (`tidy/index.ts` : « toute autre exception est un bug »)                           |
| ordre gardé                       | `tidyTerms` (sommes), `tidyWithoutReordering` (produits)                                                                                                                                                                               | même geste, deux noms, deux nœuds                                                                                                    |
| « résultat exact lisible »        | `readable` (`atelier/render.ts:139`), `readableExact` ×2 (REPL web, CLI), `tidyKeepingValue`                                                                                                                                           | **gardes divergentes** : 4 gardes (décimal, scientifique, variable, unité) / 2 / 1 ; le CLI dit « sans variable » et ne la garde pas |
| valeur d'un tableau de variations | `tidyCriticalAbscissa`, `tidyExactValue` (passe par `normalize` !), `tidyValue` (CLI) ≡ `variationValueLatex`, `withTidyEndpoints`, `tidyPeriodicMember`, `tidyInterval`                                                               | 7 fonctions pour « écrire une valeur exacte » ; deux copies de la même séquence                                                      |
| étape                             | `withTidyStep`                                                                                                                                                                                                                         | ajoute « On simplifie » autour de `tidyTerms`                                                                                        |
| **homonymes trompeurs**           | `tidy` local de `solve/literal-parameter.ts:220` (= `denormalize(normalize())`, développe), `tidy` local de `pedagogical-integration/pipeline.ts:434`, `tidySumFactors` (`normalize`), 3 `readable` qui sont des prédicats ou du texte | portent le nom `tidy` sans appeler `tidy`                                                                                            |

**Gardes redéfinies à la main** autour de `tidy` (citations des commentaires) : « le réécrirait en fraction » (décimaux), « recalculerait `3 × 10²⁰` », « simplifierait `x/x` en 1 (faux en 0) », « recalculerait `2 h 30 min` », « développerait `(1+1/1000)^{1000}` », « remettre dans les ln les décimaux que `tidy` a changés », « range `(x+1)e^x` en `e^x(x+1)` ». → Le contrat « sans développer » ne dit pas ce que `tidy` **calcule**.

### 2.4 Évaluer

| Cœur                                                          | Arithmétique                                 | Erreur                                                                          | Appelants                       |
| ------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------- |
| `evaluate` → `evaluateToRational`                             | rationnel BigInt, transcendantes en flottant | `EvalResult` (ne lève pas) ; **ignore l'unité** (`5 km → 5`, `evaluate.ts:838`) | ~60 fichiers                    |
| `evaluateNodeToApproximatedNumber` / `evaluateNodeToRational` | même cœur, budgets de taille **différents**  | lève ; NaN/±∞ possibles                                                         | ~50 / 4                         |
| `compile`                                                     | flottant natif                               | NaN, ±∞                                                                         | ~20 (tracé, géométrie, solveur) |
| `evaluateNumeric` (`common/numeric.ts`)                       | **flottant maison**, ignore π et e           | `null`, x/0 → ±∞                                                                | limites                         |
| `evaluateAtPoint` (`pedagogical-limits/helpers.ts`)           | **clone** du précédent, autres fonctions     | `null`, x/0 → `null`                                                            | 15 appels                       |

Par-dessus : **≥ 8 enveloppes locales** « décimal → nombre fini ou `null` » (Atelier, domaine, solveur, CLI) qui diffèrent par NaN et l'infini ; `numericValue` défini **8 fois** ; `evaluateAtPoint` défini **4 fois** avec 4 comportements ; `approx` désigne à la fois un **constructeur de relation `≈`** (`factory.ts:1028`) et une évaluation (`reciprocal/image.ts:52`) ; `getNumericValue` ne calcule rien (lit un littéral).

Morts (aucun appelant hors tests) : `evaluateWithModifiers` (chaîne), `evaluateWithSubstitution`, `approximateValueLatex`, `simplifyExpression`, `Exp.simplify()`.

Spec périmée : `tidy-spec.md` §D.2 cite `evaluateWithUnits`, retirée.

## 3. Les confusions, en une liste

1. **« simplifier » a quatre sens** (§ 2.2), dont deux qui développent tout.
2. **`réduire` développe** (`useNormalize: true`) malgré son contrat ; c'est la cause d'`auto ≡ réduire`.
3. **`normalize` est le développeur générique du projet** (~100 appels `denormalize(normalize())`), sous un nom qui ne le dit pas, et que le getter `Exp.normal` présente encore comme forme de comparaison.
4. **Le besoin B (écrire un résultat)** est servi par `tidy`, `simplify`, `normalize` et ~20 enveloppes aux gardes divergentes : il n'a pas de fonction à lui.
5. **`tidy` calcule** (unités, décimaux, `x/x`) et chaque appelant d'affichage le bride à la main.
6. **« développer »** est fait par le pipeline pédagogique mais raconté par un autre module (`expand-steps`), qui jette la trace du premier.
7. **Trois cœurs d'évaluation et deux clones flottants** pour « un nombre depuis un arbre », dont les cas d'erreur divergent (NaN / `null` / ±∞ / exception).
8. **Homonymes** : `tidy`, `readable`, `numericValue`, `evaluateAtPoint`, `approx`, `evaluateConstant` désignent chacun plusieurs choses.

## 4. Bugs possibles levés en chemin — à confirmer par un test rouge

Pas des questions de nom : des comportements peut-être faux. Rien n'est affirmé avant le test.

- **Validation des vecteurs** : `isExactlyZero` (`questions/vectors/vector-answer.ts:208`) compare par `normalize`, pas par `equivalenceForm` → une coordonnée `sin²x+cos²x` attendue `1` serait refusée ? (réponse d'élève)
- **Comparaisons par `normalize`** au lieu d'`equivalenceForm` : dédoublonnage des solutions (`solve/solve.ts:335`), racine candidate (`solvers/polynomial.ts:599`), parité (`analysis/symmetry.ts:453`), égalité du REPL web (`cli/web/web-repl-engine.ts:764`).
- **`evaluate` ignore l'unité sans le dire** (`5 km → 5`).
- **`tidySafe` et consorts avalent les bugs de `tidy`** : un `tidy` qui plante affiche l'entrée brute sans que personne ne le voie.
- **`readableExact` du CLI** n'a pas la garde « variable » qu'annonce son commentaire.

## 5. Questions à trancher (David)

- **Q1 — Le besoin B a-t-il sa fonction ?** Une seule fonction « écrire un résultat final » (avec les gardes aujourd'hui recopiées : décimaux gardés, notation scientifique gardée, unités telles qu'écrites, pas de `x/x` avec variable), dont `readable`, `readableExact` ×2, `tidyKeepingValue` et les 7 fonctions des variations deviendraient des appels ? Ou `tidy` lui-même prend ces gardes par défaut ?
- **Q2 — Ce que `tidy` a le droit de calculer.** Aujourd'hui : décimaux → fractions, grandeurs, notation scientifique, `x/x`. Le garder dans `tidy` (et brider à l'affichage), ou le sortir de `tidy` ?
- **Q3 — `réduire` = `tidy` avec étapes ?** Lui retirer `normalize` (il cesserait de développer, conformément à son contrat) — c'est l'étape 2 de la fusion, appliquée aussi à `réduire`.
- **Q4 — Factorisation intermédiaire.** `(x²−1)/(x+1) → x−1` est dans la colonne « attendu » d'`auto` ; le raconter passe par `(x−1)(x+1)/(x+1)`. « `auto` ne factorise jamais » vise-t-il le résultat seulement ?
- **Q5 — `normalize` renommé ?** Son vrai rôle est « développer et réduire en forme canonique » (calcul interne, besoin D). Lui donner ce nom, et réserver « forme de comparaison » à `equivalenceForm` ?
- **Q6 — L'évaluation numérique.** Un seul « nombre approché depuis un arbre » avec UNE convention d'échec (`null` ? NaN ?) à la place de `evaluateNumeric`, `evaluateAtPoint`, `computeNumericValue`, `approx` (image), les 8 `numericValue` locaux ? `compile` reste à part (perf du tracé) ?
- **Q7 — Le code mort** (`Exp.simplify`, `simplifyExpression`, `evaluateWithModifiers`, `evaluateWithSubstitution`, `approximateValueLatex`) : supprimer dans un lot à part, avant tout renommage ?

Ordre que je proposerais une fois Q1-Q7 tranchées (à valider) : (1) tests rouges du § 4 et correctifs ; (2) code mort ; (3) `réduire`/`auto` cessent de développer (fusion, étapes 2-3) ; (4) fonction du besoin B ; (5) évaluateur numérique unique ; (6) renommages en dernier.

## Historique

- 2026-10-22 — relevé (4 agents en lecture seule, Sonnet) ; carte écrite. Vérifié à la main : `intent-rules.ts:151-155` (`useNormalize: true` pour `réduire`), `exp.ts:661`, `math/index.ts:191`, `eval/evaluate.ts:1533` et `:838`, `vector-answer.ts:208`, ADR 0006.

## 6. Réponses de David (2026-10-22) et suite

**Q1 — le besoin B.** « Les expressions que l'on retourne à l'utilisateur (Atelier, corrections des questions et des exercices) doivent être affichées proprement, pour montrer à l'élève de bonnes habitudes d'écriture. Mais "proprement" diffère selon le contexte et ce qu'on veut faire de l'expression : pour étudier une dérivée, elle doit être sous forme factorisée. »

**Q2 — `tidy`.** « Réécrire sans le superflu, le plus simplement possible : parenthèses et signes inutiles, neutres et absorbants, calculs numériques effectués, fractions simplifiées, simplifications dans les fractions littérales — sans transformation comme le développement ou la factorisation. C'est peut-être ce qu'on appelle réduire en maths. » Question ouverte de David : y mettre `ln(eˣ) = x` et d'autres simplifications littérales, en tenant compte du domaine ?

### Piste A — `tidy` = réduire, défini par « enlever, pas transformer »

Proposé (à valider) : une réécriture entre dans `tidy` si elle passe **trois tests** :

1. **elle enlève sans transformer** — ni développement, ni factorisation, ni changement de registre (décimal ↔ fraction, conversion d'unité) ;
2. **elle est préférée quel que soit le but** — aucun contexte ne voudrait garder l'autre forme ;
3. **elle garde le domaine** — même ensemble de définition des deux côtés ; sinon seulement sous hypothèse fournie par l'appelant (ADR 0012), ou avec la condition rendue (« pour x ≠ 0 »).

| réécriture                                             | 1                        | 2                 | 3                       | verdict proposé                                                      |
| ------------------------------------------------------ | ------------------------ | ----------------- | ----------------------- | -------------------------------------------------------------------- |
| `ln(eˣ) → x`, `eˣ·e^{2x} → e^{3x}`                     | ✓                        | ✓                 | ✓ (ℝ)                   | `tidy`                                                               |
| `sin²x+cos²x → 1`, `cos(−x) → cos x`, `\|−x\| → \|x\|` | ✓                        | ✓                 | ✓                       | `tidy`                                                               |
| `√(x²) → \|x\|`                                        | ✓                        | ✓                 | ✓                       | `tidy` ; `→ x` seulement si x ≥ 0 déclaré                            |
| `\|−3\| → 3`, `sin(0) → 0`, `cos(π/3) → 1/2`           | ✓ (calcul numérique)     | ✓                 | ✓                       | `tidy` (aujourd'hui non fait, §A.2 de la spec)                       |
| `e^{ln x} → x`, `(√x)² → x`                            | ✓                        | ✓                 | ✗ (x > 0 / x ≥ 0 perdu) | hypothèse ou condition (aujourd'hui refusé, décision du 2026-10-05)  |
| `x/x → 1`, `(2x)/(4x) → 1/2`, `x⁰ → 1`                 | ✓                        | ✓                 | ✗ (x ≠ 0 perdu)         | hypothèse ou condition (aujourd'hui `x/x → 1` sans condition)        |
| `1−sin²x → cos²x`                                      | ✓                        | ✗ (dépend du but) | ✓                       | forme cible, pas `tidy`                                              |
| `ln a + ln b → ln(ab)`, `(x²−1)/(x+1) → x−1`           | ✗ (transformation)       | —                 | ✗                       | forme cible                                                          |
| `ln(x²) → 2 ln x`                                      | —                        | —                 | ✗ (faux pour x < 0)     | jamais                                                               |
| `0,3 → 3/10`, `3×10²⁰ → 300…0`, `2 h 30 min → 2,5 h`   | ✗ (registre / plus long) | ✗                 | ✓                       | hors `tidy` — ce sont les gardes recopiées par les appelants (§ 2.3) |

Constat : les gardes que les appelants redéfinissent à la main sont **exactement** les écarts de `tidy` à cette définition. Un `tidy` qui la respecte rend inutile la plupart des ~20 enveloppes.

### Piste B — « proprement » = forme cible du contexte, puis `tidy`

La forme dépend du **but**, pas de l'objet : la même dérivée est factorisée pour étudier son signe, développée réduite pour répondre à « calculer f′(x) » (`3x²+2x`, chantier `tidy`, 2026-10-20). Donc le besoin B n'est pas une fonction mais une composition : **forme cible choisie par l'appelant** (réduite / développée / factorisée / la plus propre), **puis `tidy`**. L'appelant déclare le but ; le moteur ne le devine jamais. `cleanest` (`auto`) ne sert que quand le contexte n'a pas de but (calcul libre dans l'Atelier). Avec ou sans étapes est un axe orthogonal (un seul moteur, la fusion).

Livrable suivant : la table « contexte d'affichage → forme cible », dressée depuis le relevé (cartes de l'Atelier, corrections par type, variations, grapheur), à valider par David.

### Questions de suite

- **S1 — décimaux** : `0,5+0,25 → 0,75` (registre gardé) ou `3/4` (spec actuelle, §A.1) ?
- **S2 — ordre canonique** : fait-il partie de `tidy` (bonne habitude) ou de la forme cible (`u′v+uv′` gardé dans une dérivée, d'où `tidyTerms`) ?
- **S3 — perte de domaine** (`x/x`, `e^{ln x}`) : simplifier sous hypothèse déclarée, et sinon rendre la condition à l'appelant (qui l'affiche ou garde la forme) ?
- **S4 — les trois tests** et les verdicts du tableau : à valider ligne à ligne.

### Recommandations (2026-10-22), en attente de David

- **S1** : garder le registre — `0,5+0,25 → 0,75`, `x×0,5 → 0,5x` ; fraction seulement si un opérande est une fraction ou si le résultat n'a pas d'écriture décimale finie (`1/3+0,5 → 5/6`). ⚠️ Revient sur §A.1 de la spec (décision du 2026-09-20) ; vérifier l'interaction avec le mode décimal.
- **S2** : l'ordre dans un **produit** (`x·3 → 3x`) reste dans `tidy` ; l'ordre des termes d'une **somme** devient une option, `order: 'canonical' | 'kept'`, canonique par défaut (garde les décisions #893, #1195, #1559) ; `tidyTerms` et `tidyWithoutReordering` deviennent `tidy({ order: 'kept' })`.
- **S3** : par défaut, `tidy` ne fait aucune simplification qui perd le domaine (`x/x` reste) ; avec des hypothèses déclarées (énoncé, domaine de f, type de la variable), il la fait ; une variante explicite rend `{ result, conditions }` pour afficher « pour x ≠ 0 ».
- **S4** : ajouter un **4e test — ne cache aucune leçon**. `tidy` est appliqué en silence à chaque étape affichée : ce qu'il fait n'est jamais expliqué. Les identités (`ln(eˣ)`, `sin²+cos²`, `√(x²) = |x|`, valeurs remarquables) vont donc dans `réduire` **avec une étape nommée**, dépendant du niveau, pas dans `tidy`. `tidy` garde l'arithmétique et la structure : parenthèses, signes, neutres, absorbants, termes semblables, fractions numériques. Ça corrige le tableau de la piste A.
