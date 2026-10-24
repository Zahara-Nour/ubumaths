# Chantier `simplify-carte` — une intention, un nom

## Reprendre ici

_Mis à jour le 2026-10-24, après #1673 (Q30 mergé, pas en prod)._

- **État** : lot 5. ~~Q19~~, ~~5a~~, ~~5b~~, ~~5c~~ (#1663), ~~5c-bis~~ (#1670) et ~~Q30~~ (#1673, § 62 : `2√2 x`, `ln(2) x`, corpus des dérivées mis à jour) mergés. Phase 0 de 5d au § 61, Q27-Q30 au § 62. Code pas en prod.
- **Page de synthèse pour David** : https://claude.ai/artifact/R58U2RADzLk3AMZYZ4TEJs — à republier **à chaque merge, avant le `/clear`**.
- **Ordre des lots** : … → **5** (~~Q19~~ → ~~5a~~ → ~~5b~~ → ~~5c~~ → ~~5c-bis~~ → ~~Q30~~ → ~~Q29~~ → **5d D3** → 5e D4 → 5f restes) → 6 valeurs approchées → 7 renommages.
- **Prochaine action** : merger la PR de Q29 (`fix/simplify-carte-exponentielles`), puis 5d (« Garder » range l'affiché, Q27).
- **En attente de David** : vérifications manuelles de #1670, #1663, #1642, #1656, #1658/#1660 ; choix pour `pnpm math` (§ 54) ; futur chantier : LaTeX dans le TEXTE d'une étiquette de figure (§ 60).
- **Pièges en cours** : Q28 était déjà tranchée (§ 35 Q1, `x⁰ → 1`) — relire les décisions du lot 4a avant de proposer sur `tidy` ; ne plus sonder avec `pnpm math` ; banc des modèles : script jetable dans le scratchpad (prod en lecture, base contre branche en échangeant le fichier depuis une copie) ; l'oracle des dérivées ignore l'ordre des facteurs ; worktree neuf : `pnpm exec svelte-kit sync` avant `pnpm tsx` ; **pas de `Claude-Session:` ni de lien `claude.ai/code`**.
- **Worktree / branche** : `ubumaths-wt-simplify-carte`, `fix/simplify-carte-exponentielles` (rebasée sur #1673).

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
- **`simplify` factorise** (sondé le 2026-10-22, § 21) : `x²+2x+1 → (x+1)²`, contraire à l'ADR 0007 (« `auto` ne factorise jamais »).
- **Le moteur pédagogique développe `(x+1)²`** en `auto` comme en `réduire` (sondé le 2026-10-22, § 21) : `(x+1)² → x²+2x+1` (étape `expand-power`), alors que la spec (`tidy-spec.md` §C) garde `(x+1)²` ; sur `x²+2x+1`, `auto` enchaîne `perfect-square-trinomial` puis `expand-power` (aller-retour affiché). La table de règles d'`auto` (`intent-rules.ts:157`) contient d'ailleurs les factorisations symboliques.

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

### Recommandations (2026-10-22) — validées par David le 2026-10-22

- **S1** : garder le registre — `0,5+0,25 → 0,75`, `x×0,5 → 0,5x` ; fraction seulement si un opérande est une fraction ou si le résultat n'a pas d'écriture décimale finie (`1/3+0,5 → 5/6`). ⚠️ Revient sur §A.1 de la spec (décision du 2026-09-20) ; vérifier l'interaction avec le mode décimal.
- **S2** : l'ordre dans un **produit** (`x·3 → 3x`) reste dans `tidy` ; l'ordre des termes d'une **somme** devient une option, `order: 'canonical' | 'kept'`, canonique par défaut (garde les décisions #893, #1195, #1559) ; `tidyTerms` et `tidyWithoutReordering` deviennent `tidy({ order: 'kept' })`.
- **S3** : par défaut, `tidy` ne fait aucune simplification qui perd le domaine (`x/x` reste) ; avec des hypothèses déclarées (énoncé, domaine de f, type de la variable), il la fait ; une variante explicite rend `{ result, conditions }` pour afficher « pour x ≠ 0 ».
- **S4** : ajouter un **4e test — ne cache aucune leçon**. `tidy` est appliqué en silence à chaque étape affichée : ce qu'il fait n'est jamais expliqué. Les identités (`ln(eˣ)`, `sin²+cos²`, `√(x²) = |x|`, valeurs remarquables) vont donc dans `réduire` **avec une étape nommée**, dépendant du niveau, pas dans `tidy`. `tidy` garde l'arithmétique et la structure : parenthèses, signes, neutres, absorbants, termes semblables, fractions numériques. Ça corrige le tableau de la piste A.

### Décisions S1-S4 (David, 2026-10-22)

David valide les quatre recommandations telles quelles. Contrat de `tidy` qui en découle :

- **Ce que `tidy` fait** : arithmétique et structure — parenthèses et signes inutiles, neutres et absorbants, termes semblables, calculs numériques, fractions numériques simplifiées, ordre dans un produit (`x·3 → 3x`).
- **Ce qu'il ne fait pas** : développer, factoriser, changer de registre (décimal gardé, S1 ; unités et notation scientifique gardées), perdre le domaine sans hypothèse (S3), appliquer une identité qu'on enseigne (S4).
- **Options** : `order: 'canonical' | 'kept'` pour les termes d'une somme, canonique par défaut (S2) ; hypothèses déclarées (S3) ; variante `{ result, conditions }` (S3).
- **Les identités** (`ln(eˣ) → x`, `sin²+cos²`, `√(x²) = |x|`, valeurs remarquables `cos(π/3)`) : dans `réduire`, avec une étape nommée et selon le niveau (S4).

Tableau de la piste A corrigé par S4 : les lignes `ln(eˣ)`, `sin²+cos²`, `cos(−x)`, `√(x²)`, valeurs remarquables passent de « `tidy` » à « `réduire` avec étape » ; `|−3| → 3` et `sin(0)` (calcul numérique pur) restent à trancher dans la table de la piste B selon le niveau.

À vérifier avant de coder S1 : l'interaction avec le mode décimal (`project_mode-decimal`) et les tests qui assertent `0,5+0,25 → 3/4` (§A.1 de `tidy-spec.md`, décision du 2026-09-20 renversée).

## 7. Table « contexte d'affichage → forme cible » (2026-10-22, à valider par David)

Relevé : 25 contextes (agent en lecture seule, Sonnet) ; vérifié à la main : `atelier/render.ts:139` (`readable`), `mathAST/variations/display.ts:23` (`reducedDerivative`), `grapheur/analysis.ts:1495` (`simplifyExact`), `{{eval}}` → `evaluateAstWithModifiers` (`ubumark/parameterization/resolver/variable-resolver.ts:735`).

Vocabulaire, d'après S1-S4 : **`tidy`** = mise au propre silencieuse (arithmétique et structure, appliquée à chaque étape) ; **réduite** = politique `réduire` = `tidy` + identités et valeurs remarquables (avec étapes quand il y en a) ; **ordre gardé** = `tidy({ order: 'kept' })`.

⚠️ Précision (2026-10-22, question de David) : ces mots nomment l'**écriture visée**, pas le moteur qui calcule. `tidy` ne calcule que fractions, puissances entières et racines carrées (mesuré : `cos(π/3)`, `e^{ln 2}`, `|−3|`, `∛8`, `1/(1+√2)`, `√2·√3` ressortent tels quels). Une valeur exacte est calculée avant lui par `evaluate` (`normalize`/`denormalize`, `eval/evaluate.ts:1535`) ; `readable` (`atelier/render.ts:139`) ne fait que mettre ce résultat au propre.

| Contexte                                                                                                        | Aujourd'hui                                                                                                            | Forme cible proposée                                      | Écart                                                                                  |
| --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **Valeur exacte** : Atelier, `.eval`, `{{eval}}`, limite, image de la réciproque, solutions, valeurs interdites | calcul `evaluate` (`normalize`), écriture `tidy` + 4 gardes (`readable`) / `tidyKeepingValue` / `simplify` (solutions) | réduite (`cos(π/3) → 1/2`, décimal gardé)                 | les gardes disparaissent (S1, S3) ; `simplify` → réduite                               |
| **Valeur d'un tableau de variations** (extremums, bornes)                                                       | `tidy` après `toEulerPowers`, le plus court                                                                            | réduite                                                   | 7 fonctions → une                                                                      |
| **Ordonnée d'un extremum, grapheur**                                                                            | `simplify` (sans `tidy`)                                                                                               | réduite                                                   | même valeur que dans le tableau de variations                                          |
| **Expression tapée avec variable** (Atelier, « Garder »)                                                        | laissée brute (`readable` refuse `tidy`)                                                                               | `tidy`, ordre gardé                                       | ⚠️ D3                                                                                  |
| **Case de grille de l'Atelier**                                                                                 | `tidyTerms`, `\frac`                                                                                                   | réduite, ordre gardé, `\frac`                             | —                                                                                      |
| **Grandeur** (unités)                                                                                           | `tidy({ unitChoice: 'written' })`                                                                                      | `tidy`, unités telles qu'écrites                          | devient le défaut (S1, registre gardé)                                                 |
| **Dérivée, étapes** (`.dériver`, carte f′, `.diff`, corrections)                                                | `tidyTerms` + étape « On simplifie »                                                                                   | `tidy`, ordre gardé (`u′v+uv′` lisible)                   | —                                                                                      |
| **Dérivée, réponse finale** (« calculer f′(x) »)                                                                | la même que les étapes, ordre gardé                                                                                    | ⚠️ D1                                                     | la note du 2026-10-20 dit `3x²+2x` développée réduite                                  |
| **f′ dans un tableau de variations**                                                                            | numérateur d'un quotient développé (`simplify`, `display.ts:38`) ; aucune factorisation                                | **factorisée** (David, Q1 : « pour étudier une dérivée ») | ⚠️ D2 : aucun code ne factorise f′ aujourd'hui                                         |
| **Primitive, étapes et réponse**                                                                                | `tidyTerms` (+ `factoriser` si exponentielle commune) ; `simplify` avec paramètre                                      | `tidy`, ordre gardé ; exponentielle commune factorisée    | `simplify` (`atelier/calcul.ts:2709`) → `tidy`                                         |
| **Limite, étapes**                                                                                              | `denormalize(normalize())` (développe)                                                                                 | `tidy`, ordre gardé                                       | à confirmer par un test : une étape de limite développée en silence est-elle visible ? |
| **`.développer`** (Atelier et corrections)                                                                      | `explainExpansion`, puissances décroissantes                                                                           | développée réduite                                        | — (déjà partagé, 2026-10-14)                                                           |
| **`.factoriser`**                                                                                               | intention `factoriser` + `tidyWithoutReordering`                                                                       | factorisée, `tidy` ordre gardé dans les produits          | `tidyWithoutReordering` → `tidy({ order: 'kept' })`                                    |
| **`.simplifier`** (Atelier, calcul libre)                                                                       | intention `auto`                                                                                                       | la plus propre (`auto`)                                   | seul contexte sans but : le seul `auto`                                                |
| **Corrections « réduire / développer / factoriser / simplifier »**                                              | `intent` déclaré par le modèle de question                                                                             | forme déclarée par l'énoncé                               | —                                                                                      |
| **Corrections dérivée, primitive**                                                                              | forme fixée par le pipeline, aucune déclaration                                                                        | ⚠️ D4                                                     | l'énoncé ne peut pas demander « sous forme factorisée »                                |
| **Corrections arithmétiques**                                                                                   | `generatePedagogicalArithmeticSteps`                                                                                   | réduite, décimal gardé                                    | à vérifier avec S1                                                                     |

### Questions D1-D4 et recommandations

- **D1 — réponse finale de « calculer f′(x) »** : ordre gardé (`3·x²+…` tel que la règle le donne), développée réduite, ou `auto` ? **Recommandation** : étapes en ordre gardé, puis une dernière étape « On réduit » vers la forme `auto` (`3x²+2x` ; une forme que développer allongerait reste telle quelle — `auto` ne factorise jamais). L'énoncé peut la remplacer (D4).
- **D2 — f′ du tableau de variations** : factoriser f′ (entièrement, pour lire le signe facteur par facteur), ou seulement son numérateur quand c'est un quotient ? **Recommandation** : factoriser le numérateur (les dénominateurs des fonctions du lycée sont déjà des produits ou des carrés), et le garder développé quand il ne se factorise pas sur ℚ, avec une étape nommée « On factorise pour étudier le signe ».
- **D3 — expression tapée avec variable dans l'Atelier** : la garder telle quelle (aujourd'hui), ou passer `tidy` en ordre gardé (`3+2·x → 3+2x`, `x/x` gardé par S3) ? **Recommandation** : `tidy` en ordre gardé. Avec S1 et S3, la seule raison de l'interdire tombe : `x/x → 1` et les décimaux réécrits n'arrivent plus.
- **D4 — forme cible déclarée par l'énoncé pour dérivée et primitive** : ajouter à ces modèles de question le même `intent` que la famille « simplifier » ? **Recommandation** : oui. Le champ est facultatif ; sans lui, le défaut de D1 s'applique.

## 8. Correction de David (2026-10-22) : « comparer » a deux sens

Le besoin A du § 1 mélangeait deux choses :

- **A1. Équivalence algébrique** : deux expressions sont-elles égales mathématiquement (sous le domaine, ADR 0006/0012) ? → `areEquivalent` / `equivalenceForm`. C'est de ce sens que relèvent les comparaisons par `normalize` du § 4 (dédoublonnage, parité, vecteurs).
- **A2. Juger la réponse d'un élève** : équivalente à l'attendu, **et** bien écrite, **et** sous la forme demandée. Une réponse équivalente peut être mal écrite (`bad_form` / `unoptimal_form`) ou ne pas respecter la forme exigée. → chaîne de `utils/answer-validator.ts` décrite dans `docs/systeme/questions.md` § validation : `validationRules` → valeur (A1) → `requiredForm` → forme (`checkFormUnified`, `mathAST/cosmetic-transforms.ts`, contraintes réglables `signs`, `brackets`, `nullTerms`, `factorOne`, `factorZero`, `reducedFractions`, `reducedRadicals`…).

**Ce que ça change pour le chantier** : « bien écrit » est défini **deux fois** — par `tidy` pour écrire (corrections, Atelier), par `cosmetic-transforms` pour juger l'élève. La liste des contraintes réglables recoupe presque mot pour mot la définition de `tidy` donnée par David en Q2 (signes et parenthèses inutiles, neutres, absorbants, fractions simplifiées). `cosmetic-transforms.ts` n'appelle pas `tidy` (vérifié : aucune occurrence).

Risque, **non vérifié** : une correction écrite par `tidy` qui serait jugée mal écrite si l'élève la tapait, ou l'inverse. À confirmer par des tests avant de l'affirmer.

Question **E1** pour David : faut-il qu'il y ait **une seule définition** de « bien écrit », partagée par les deux (écrire la correction, juger l'élève) — l'écriture de la correction devant passer sans remarque le juge de forme ? Le juge garde ses réglages (strict / warn / off) et son retour à l'élève (« Simplifie la fraction ») ; seule la liste de ce qui est « superflu » serait commune.

## 9. `normalize` pour développer ? (David, 2026-10-22 : « à réfléchir »)

La forme normale est développée **pour être comparée** (base d'`equivalenceForm`). Sondé le 2026-10-22, `toLatex(denormalize(normalize(…)))` :

| Entrée                                        | Sortie             | Ce que ça fait en plus de développer                                                                                |
| --------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `(x+1)(x-2)`                                  | `x^2 - x - 2`      | — (développement pur)                                                                                               |
| `0,5x(x+0,2)`                                 | `1/2 x^2 + 1/10 x` | change de registre (décimal → fraction)                                                                             |
| `(x+1)/2`                                     | `1/2 x + 1/2`      | éclate la fraction                                                                                                  |
| `1/(x+1) + 1`                                 | `(x+2)/(x+1)`      | met au même dénominateur (une transformation, pas développer)                                                       |
| `(x²−1)/(x+1)`                                | `x - 1`            | simplifie une fraction rationnelle ; élargit le domaine (permis pour comparer), mais l'affichage ne dit plus x ≠ −1 |
| `√2(x+√8)`, `(x+1)^5`, `(x+1)e^x`, `3x−(2−x)` | développés réduits | —                                                                                                                   |

Analyse proposée (à valider) — trois usages, trois réponses :

1. **Comparer** (A1) : oui, c'est son rôle ; ce qu'il fait en plus (registre, dénominateur commun, `x−1`) est justement voulu pour une forme canonique.
2. **Calculer en interne** (D : coefficients, discriminant, degré) : oui, rien n'est montré. Mais par des fonctions nommées (`polynomialCoefficients`…), pas ~100 `denormalize(normalize())` à la main.
3. **Montrer un développement à l'élève** (`.développer`, corrections, `réduire` et `auto` aujourd'hui) : **non**. Il fait plus que la consigne (dénominateur commun, simplification de fraction avec perte de domaine, décimaux réécrits) et ne sait pas raconter d'étapes. Développer pour l'affichage = la politique `développer` du moteur pédagogique (règles de distributivité et identités remarquables, puis `tidy`). C'est l'étape 2 de la fusion, étendue à `développer` : aujourd'hui `expand-steps.ts` part de `orderExpanded(denormalize(normalize()))` pour le résultat.

**Reformulé le 2026-10-22 (page de synthèse)** : la question n'est pas de réserver `normalize` à la comparaison ; on garde comparer et calculer en interne, on retire seulement l'affichage — et seulement pour les expressions **avec variable** (nuance « `normalize` dans `evaluate` », § 12).

À vérifier avant de conclure : les corrections « développer » des questions ont-elles un cas où `normalize` sort un dénominateur commun ou un `x−1` montré à l'élève ?

## 10. Chaîne de validation ↔ `tidy` : que peut-on mettre en commun ? (2026-10-22, à valider)

Demande de David : étudier **toute** la chaîne de validation avant de parler de factoriser avec `tidy`. Deux relevés en lecture seule (validation : agent `pedagogy-expert` ; `tidy` : agent `mathast-expert`). Vérifié à la main : `buildASTPipeline` (`mathAST/cosmetic-transforms.ts:1504`), la boucle de détection (`:1858`), `stripUnnecessaryBrackets` partagé (`mathAST/transforms.ts:1635`, importé par `tidy/index.ts:17` et `cosmetic-transforms.ts:57`), `x/x → 1` asserté (`tidy/__tests__/tidy.test.ts:197`), l'appel QCM (`utils/answer-validator.ts:521-532`).

### Ce que fait la chaîne de validation, en quatre familles

1. **Le superflu, règle par règle** — `buildASTPipeline` : une liste ordonnée de transformations d'arbre, chacune avec un identifiant (`reducedRadicals`, `reducedFractions`, `factorZero`, `nullTerms`, `brackets`, `signs`, `factorOne`, `products`) ; une violation = l'étape change le `toLatex`. Plus, sur la chaîne tapée : `zeros`, `spaces`. Chaque violation porte un message et une sévérité réglable (strict / warn / off).
2. **Les notations équivalentes** (identifiant `null`, jamais une faute) : `BA ≡ AB`, `e`/`\exp`, `+∞`, `π` dans les fractions, `\frac13x^3 ≡ \frac{x^3}3`, complexes, `\ln 9 ≡ 2\ln 3`, `\frac1{e^a} ≡ e^{-a}`, **ordre des termes et des facteurs** (tri), `|u| → u` sous hypothèse.
3. **La comparaison à l'attendu** — contrainte `form` (strict, ADR 0013) : réponse et attendu passent les mêmes étapes, puis égalité des `toLatex`. C'est elle qui refuse `400+80` pour `480` : la validation ne calcule pas, elle compare.
4. **Ce qui dépend de la consigne** : `requiredForm` (motifs), `precision` / arrondi, grandeurs et unités, durées, intervalles, chaînes `equation` / `vecteur` / `matrice` / `primitive`, `rulesSuffice`, `acceptDecimal`, `angleModulo`, garde de complexité, pourcentage, nom de figure.

### Comparaison avec `tidy`

|                 | `tidy`                                                                                                                                                             | validation                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| Rôle            | **réécrire** en une forme                                                                                                                                          | **juger** une forme, et dire laquelle est fautive                                   |
| Grain           | monolithique : pipeline fixe, aucune option par règle ; sa trace (`TidyStepRecorder`) donne une étape par phase, sans localisation, souvent étiquetée `tidy-terms` | une règle = une étape nommée, un message, une sévérité                              |
| Superflu commun | parenthèses, signes, neutres, absorbants, fractions numériques, radicaux                                                                                           | les mêmes (famille 1) — **`brackets` est déjà la même fonction**                    |
| En plus         | calcule (`2·3 → 6`, termes semblables, `x/x → 1`, unités, décimaux → fractions), **ordonne** (l'ordre est une correction)                                          | typographie (`zeros`, `spaces`, `×`), notations équivalentes, **ordre indifférent** |
| Attendu         | —                                                                                                                                                                  | nettoyé en silence par les mêmes étapes                                             |

### Conclusion proposée

- **`tidy` entier ne peut pas servir de juge.** Il ne sait pas dire _quel_ superflu ni _où_ ; il compte un mauvais ordre comme une faute (`3+x`) ; il « corrige » ce que la validation accepte (`1/√2`, décimaux, `x/x`) ; il calcule, alors que la validation compare (famille 3).
- **Ce qui se met en commun : les règles élémentaires de la famille 1.** Un seul module de règles « superflu », chacune `{ id, transformation, message }` ; `tidy` les applique toutes en silence (plus son calcul, son regroupement, son ordre) ; la validation les rejoue une à une pour détecter et nommer. Précédents : `brackets` déjà partagée, `coefficientCleanupSteps` (`cosmetic-transforms.ts:1545`) qui réutilise 4 étapes côté génération.
- **Ne se met pas en commun** : familles 2, 3, 4 (propres au jugement), et le calcul / l'ordre de `tidy` (propres à l'écriture).
- **Premier pas, sans rien refactorer : un test d'invariant** (E1) — sur le panel de `tidy`, `checkForm(toLatex(tidy(e)), toLatex(tidy(e)))` ne rend aucune violation. Rouge → on a trouvé une correction que l'élève se verrait reprocher ; vert → la mise en commun n'est qu'un ménage, pas un correctif.

### Trouvés en chemin (à confirmer par un test, rien d'affirmé)

- **QCM** (`answer-validator.ts:521-532`) : `applyConstraints` reçoit `correctChoiceIndex` comme attendu de forme — on compare le LaTeX de l'élève à un indice de choix ?
- **Attendu illisible** → `bad_form` « Parse error on expected » à une réponse juste, si `form` est strict.
- **Attendu non nettoyé** (`2\times3`) → la réponse `6` est `bad_form`.
- **`tidy` : `x/x → 1` asserté** (`tidy.test.ts:197`) alors que `tidy-spec.md` §A dit « jamais de changement de domaine » : la spec se contredit (étape 6), et S3 tranche contre le code actuel.
- **Code mort** : dans `questions/constraint-validators.ts`, `checkSpaces`, `checkProducts`, `checkBrackets`, `checkZeros`, `checkForm`, `checkNullTerms`, `checkFactorOne`, `checkFactorZero`, `checkSigns` n'ont aucun appelant hors tests (seuls `checkUnit` et `checkReducedFractions` servent) — à ajouter à Q7.
- `docs/systeme/questions.md` § validation ne liste ni les notations équivalentes, ni le `×` final, ni le refus de nom de figure.

## 11. Test d'invariant E1 « `tidy` passe le juge » (2026-10-22)

`src/lib/mathAST/tidy/__tests__/tidy-passe-le-juge.test.ts` : sur 70 entrées (panel des invariants de `tidy` + une par réécriture de l'inventaire du § 10 + écritures courantes), `checkForm(toLatex(tidy(e)), même chose, {})` ne rend aucune violation.

Résultat : **67 / 70 sans remarque.** Les 3 écarts sont tous la contrainte `spaces` : `toLatex` écrit `1024`, `30000`, `\dfrac{2469}{20}` sans espacer les chiffres, et le juge exige l'espace fine dès 4 chiffres (`cosmetic-transforms.ts:151`). Marqués `it.fails` (le test passera au rouge quand l'écart sera réglé). Ce n'est pas un défaut de `tidy` mais de l'écriture des nombres.

Conclusion : sur le superflu, écrire et juger sont **d'accord** aujourd'hui → la mise en commun des règles (§ 10) est un ménage, pas un correctif. Le seul désaccord est typographique.

Question **E2** pour David : un nombre de 4 chiffres (`1024`, `2469`) — espace obligatoire (juge actuel) ou facultative (usage BIPM : « pour un nombre de quatre chiffres, l'espace n'est en général pas utilisée ») ? Et `toLatex` doit-il espacer les nombres de 5 chiffres et plus (`30\,000`) dans les corrections ? Recommandation : 4 chiffres facultatif côté juge ; `toLatex` espace à partir de 5 chiffres.

Limite du test : il mesure `toLatex`, pas le rendu final d'une correction (une couche d'affichage pourrait espacer après coup — aucune trouvée dans les tests de corrections, à confirmer).

## 12. `normalize` et `equivalenceForm` : qui gère les identités (sondé le 2026-10-22)

Question de David sur l'ADR 0006. `toCustom(denormalize(·))` des deux formes :

| Entrée                 | `normalize`                    | `equivalenceForm` |
| ---------------------- | ------------------------------ | ----------------- |
| `ln(e^x)`              | `x`                            | `x`               |
| `e^x*e^(2x)`           | `e^{3x}`                       | `exp(3x)`         |
| `log(100)`             | `2`                            | `2`               |
| `sin(x)^2+cos(x)^2`    | `cos(x)^2+sin(x)^2`            | `1`               |
| `tan(x)-sin(x)/cos(x)` | `{cos(x)tan(x)-sin(x)}/cos(x)` | `0`               |
| `2^(x+1)-2*2^x`        | inchangé                       | `0`               |

`equivalenceForm` (`normal/normalize.ts:2164`) = réécritures de notation (`e^x`→`exp`, `log_b`, Euler, `2^x`→`exp(x ln 2)`, puissances fractionnaires → radicaux), définitions trigo, puis `normalize`, puis `sin²+cos² = 1`. Les identités simples sont déjà dans `normalize` (liste ci-dessous) ; elles passent donc dans tout ce qui affiche la sortie de `normalize` (§ 9).

**Où est géré `exp(ln x) = x`** (question de David, 2026-10-22) — trois endroits : `normalize` pour `exp(ln u)` (`normal/normalize.ts:4817`, étape `exp-ln-inverse` enregistrée) ; `normal/rules/euler-identities.ts` pour `e^{ln u}` (chemin d'écriture de `normalize`, sans étape) ; règle `exp-ln` du moteur pédagogique (`pattern/rule-sets/log-exp.ts:35`, famille `identites-log-exp`, avec étape). `tidy` ne l'applique pas (décision du 2026-10-05, option A). Les trois simplifient **sans condition x > 0** (« le domaine est celui de l'expression de départ ») : écart avec S3.

**Identités présentes dans `normalize`** (sondé le 2026-10-22, `normalize` et `equivalenceForm` donnent la même chose sur toutes) : log/exp (`ln(e^x)`, `ln 1`, `ln e`, `e^0`, `ln 8 → 3 ln 2`, `ln(x²) → 2ln|x|`, ⚠️ `e^{ln x} → x` perd x > 0, ⚠️ `ln(xy) → ln x + ln y` et `ln(x/y)` changent le domaine) ; racines (`√(x²) → |x|`, `√(4x²) → 2|x|`, `√(x²+2x+1) → |x+1|`, `√8`, ⚠️ `(√x)² → x` perd x ≥ 0) ; valeur absolue (`|−3|`, `|x²|`, `||x||`) ; trigo (valeurs remarquables, `arcsin(1/2)`, parité, décalages de π et 2π, `cos(π/2−x) → sin x`) ; arrondis. Réservées à `equivalenceForm` : `sin²+cos²`, `tan = sin/cos`, exposants symboliques, `log_b`.

Pourquoi : historique — `normalize` était la forme de comparaison ; l'ADR 0006 a créé `equivalenceForm` pour les nouvelles identités lourdes sans rien déplacer ; la décision du 2026-10-05 (option A) a ajouté les identités de `e^…` à `normalize` pour l'affichage. Correction : l'étape `exp-ln-inverse` est enregistrée (résumée) et rangée dans `identites-log-exp` (`intent-rules.ts:309`) — « appliquée sans l'expliquer » était affirmé trop vite ; non vérifié si l'élève la voit.

**Rectification (David, 2026-10-22)** : ces identités étaient autorisées dans `normalize` par la convention du 2026-09-20 (`docs/systeme/mathast/convention-equivalence.md` § « La règle » et « Conséquence pratique ») : équivalence sur l'**intersection des domaines** ; une règle qui **élargit** le domaine est permise (`e^{ln x} → x`, `(√x)² → x`, `x/x → 1`), une règle qui le **restreint** est probablement fausse. `ln(xy) → ln x + ln y` et `ln(x/y)` restreignent : connus, laissés tels quels (décision du 2026-10-08, même doc § `\ln(x^2)`). Mes marques « ⚠️ perd x > 0 » ci-dessus sont donc à lire : juste pour **comparer** ; le problème n'est que pour **afficher** (S3 : dire « pour x > 0 » ou hypothèse déclarée). L'argument du § 9 tient, sur ce seul terrain.

**`normalize` dans `evaluate` ?** (question de David, 2026-10-22, sondé) — `evaluate` exact ne traite que les expressions sans variable (`eval/evaluate.ts:1489`). Là, le surplus de `normalize` est du calcul exact voulu : `1/(1+√2) → √2−1`, `(√2+1)² → 3+2√2`, `√2·√3 → √6`, `cos(π/3) → 1/2`, `e^{ln 2} → 2` (`tidy` ne fait rien de tout ça) ; ni domaine ni étapes en jeu. Défauts d'écriture seulement : `½√2`, `⅔π` (d'où les `readable` / `tidyKeepingValue` derrière), `0,5+0,25 → 3/4` (contraire à S1), aucune borne (`(1+1/1000)^{1000}` → fraction de 6 012 caractères). Proposé : `normalize` calcule, une écriture finale commune met au propre (style `tidy`, décimal gardé, renoncement au-delà d'une taille). **Nuance au § 9** : retirer `normalize` de l'affichage des expressions **avec variable** ; pour une valeur exacte constante, il calcule, seule l'écriture change.

## 13. Où mettre au propre une valeur exacte (David, 2026-10-22 : « ok pour A »)

Question de David : appeler `tidy` à la fin d'`evaluate` plutôt que d'enchaîner deux fonctions ?

Constat : `evaluate` (mode exact) calcule par `normalize`/`denormalize` et rend une forme de calcul (`(1/3)·π`, `(1/2)·√2`) ; chaque affichage la remet au propre à sa façon (Atelier : `readable`, `atelier/render.ts:139`, `tidy` + 4 gardes — décimal, notation scientifique, variable, unité — plus le résultat trop long). `evaluate` a ≈ 40 fichiers appelants, dont beaucoup de calculs internes (solveur, racines, domaines, limites, intégration, tableur) ; leur dépendance à la forme rendue n'est PAS mesurée.

Options : **A** une seule fonction « valeur exacte à afficher » (`evaluate` puis mise au propre), appelée par tous les affichages, `evaluate` inchangé pour les calculs internes ; **B** `tidy` dans `evaluate` lui-même, après le nouveau contrat (S1, S3), appelant par appelant.

**Décision : A.** B reste possible plus tard. Les 4 gardes de `readable` disparaissent avec S1 et S3.

## 14. E1 : une seule définition de « bien écrit » (David, 2026-10-22 : « oui, mais le juge est paramétrable »)

**Décision : oui.** Toute correction (écriture produite par `tidy`) passe le juge de l'élève (`checkForm`, `cosmetic-transforms.ts:1809`) sans aucune remarque. Le test #1609 devient une règle permanente ; ses 3 écarts (`spaces`) restent en `it.fails` jusqu'à E2.

Précision de David : le juge est paramétrable, chaque règle vaut `strict`, `warn` ou `off` selon la question. Vérifié dans le code : les 10 règles (`zeros`, `spaces`, `brackets`, `signs`, `nullTerms`, `factorOne`, `factorZero`, `products`, `reducedFractions`, `reducedRadicals`) valent `warn` par défaut (`constraints[id] ?? 'warn'`), aucune n'est désactivée par défaut. Le test appelle `checkForm(…, {})`, donc **toutes les règles actives** : c'est le réglage le plus exigeant. `off` ne fait que retirer une règle et `strict`/`warn` ne changent que la conséquence ; une correction sans remarque à ce réglage passe donc tous les réglages d'une question. **Confirmé par David** (« oui c'est ça ») : la règle vise ce réglage-là, une correction est exemplaire quel que soit le niveau de contrainte de la question.

## 15. E2 : l'espace dans les nombres (David, 2026-10-22 : « comme tu proposes »)

**Décision** : à 4 chiffres, l'espace est **facultative** (`1024` et `1 024` acceptés par le juge) ; dès 5 chiffres elle est **obligatoire** (`30000` reçoit une remarque). Les corrections écrivent `1024` et `30 000`. Usage du BIPM.

Effets prévus : `hasIntegerSpacingViolation` (`cosmetic-transforms.ts:142`) ne signale plus un nombre de 4 chiffres sans espace (une espace mal placée reste une faute) ; `toLatex` espace les entiers dès 5 chiffres ; les 3 `it.fails` de `tidy-passe-le-juge.test.ts` doivent alors passer : `1024` et `2469/20` (4 chiffres) sont acceptés tels quels, `30000` est écrit `30 000`.

**Partie décimale** (David : « oui pour les décimales ») : même règle, chaque côté de la virgule compté à part. `hasDecimalSpacingViolation` (`:164`) n'exige plus l'espace à 4 décimales : `0,1234` et `0,123 4` acceptés, `0,12 34` reste une faute, `0,12345` reçoit une remarque ; les corrections écrivent `0,1234` et `0,123 45`. Source : brochure SI du BIPM, « lorsqu'il n'y a que quatre chiffres avant ou après le séparateur décimal, il est d'usage de ne pas isoler un chiffre par une espace ».

## 16. § 10 : où vit la définition commune (David, 2026-10-22 : « module partagé »)

**Décision : un module de règles partagé.** Chaque règle de superflu (parenthèses, signes, neutres, absorbants, fractions, radicaux) est écrite une fois, avec son identifiant de contrainte et son message. `tidy` les applique toutes en silence, puis fait ses calculs et son rangement ; le juge les rejoue une à une pour nommer la faute. Restent propres à `tidy` : calculs et rangement. Restent propres au juge : écritures équivalentes (`BA` = `AB`), comparaison à l'attendu, contraintes de consigne. Rejeté : « `tidy` sert de juge » (signalerait `3+x`, réécrirait `400+80`, ne nomme pas la faute). Précédents : `brackets` déjà commun ; la génération des questions réutilise quatre règles du juge.

## 17. D1 : réponse finale de « calculer f′(x) » (David, 2026-10-22 : « comme tu proposes »)

**Décision : politique `auto`, en dernière étape « On réduit ».** Les étapes gardent l'ordre de la règle (`2x(x+1) + x²`), la dernière étape développe seulement si l'écriture raccourcit (`3x² + 2x`), et ne factorise jamais (décision de fusion) : `5(x+1)⁴` reste tel quel. Quotient : le numérateur est réduit, le dénominateur n'est pas développé (`((x+1) − x)/(x+1)²` → `1/(x+1)²`). Une autre forme se demande par l'énoncé (D4).

À vérifier par un test avant de s'appuyer dessus : qu'`auto` donne bien ces trois résultats aujourd'hui (il partage le défaut de `réduire`, qui développe, § 3).

**Révision de D1 (même jour).** Sondé : `tidy` additionne `xeˣ + 2xeˣ → 3xeˣ` mais laisse `eˣ + xeˣ` (mettre `eˣ` en facteur = factoriser, interdit à `tidy`) ; avec `auto` (qui ne factorise jamais, décision de fusion du 2026-09-21, ADR 0007), `f = xeˣ` aurait pour réponse finale `eˣ + xeˣ`. David : « je ne trouve pas normal que f′ affiche eˣ + xeˣ ». Il a choisi l'option (a) : « je veux un minimum de réduction ».

**Décision D1 révisée** : la réponse finale de f′ n'utilise PAS la politique `auto` (dont la règle reste intacte : elle vise le calcul sans but, f′ en a un). Forme propre à la dérivée : réduite (développer seulement si plus court, numérateur d'un quotient réduit, dénominateur gardé) **+ exponentielle commune mise en facteur**, rien d'autre de factorisé. `xeˣ → (x + 1)eˣ`, `x²eˣ → (x² + 2x)eˣ`, `(x² − 3)eˣ → (x² + 2x − 3)eˣ`, `x²(x + 1) → 3x² + 2x`. Même règle que celle prévue pour la primitive (§ 7).

## 18. D2 : f′ dans un tableau de variations (David, 2026-10-22 : « comme tu proposes »)

Sondé avant décision (test jetable, supprimé) : `reducedDerivative` (`variations/display.ts:23`) affiche `eˣ + xeˣ` pour `xeˣ`, `2xeˣ + eˣ(x² − 3)` pour `(x² − 3)eˣ`, `(1 − x²)/(x²+1)²` pour `x/(x²+1)`. La politique `factoriser` au lycée (ADR 0024) donne `(x + 1)eˣ`, `(x − 1)(x + 3)eˣ`, `(1 − x)(1 + x)`, et factorise les racines irrationnelles : `x² − 2 → (x − √2)(x + √2)`. Laisse `x² + 1`, `x² − 2x + 5` (Δ < 0). Ma première version de D2 (« coefficients rationnels seulement ») était fausse.

**Décision** : dans le tableau de variations, f′ passe par `factoriser` (lycée) ; quotient → numérateur factorisé, dénominateur tel quel ; étape « On factorise pour étudier le signe ». Rien ne se factorise (Δ < 0) → reste développé, signe de a. Ordre des facteurs : celui du noyau (décision du 2026-10-11), ordre interne d'un facteur gardé (`x(2 + x)eˣ`) — accepté tel quel.

## 19. D3 : expression tapée dans Calcul (David, 2026-10-22 : « numérique calculé, littéral mis au propre en gardant l'ordre »)

⚠️ Une première version de ce paragraphe (commit `b29d1d119`) consignait D3 comme décidée : erreur, David avait écrit « go pour D3 » pour qu'on la lui présente, pas pour la valider.

**Réserve levée (sondé, test jetable supprimé).** Pour une expression avec variable, `engine.execute` rend l'entrée telle quelle : `3+2*x`, `x/x`, `3-2x+x^2`, `0.5x+1` ressortent identiques. `readable` (`atelier/render.ts:139`) reçoit donc ce que l'élève a tapé, pas un résultat passé par `normalize`.

**Aucune variante actuelle ne « met au propre en gardant l'ordre »** : `tidy` et `tidyWithoutReordering` rangent (`2x+3`, `x^2-2x+3`) ; `tidyTerms` garde l'ordre de la somme mais donne encore `x/x → 1` et `0.5x → x/2`. Toute option autre que « telle quelle » attend le lot du contrat de `tidy` (S1-S3 + option d'ordre). Détail : `sqrt(8)x` → `2x√2` par `tidyTerms`, `2√2x` par `tidyWithoutReordering`.

Question de David en retour (2026-10-22) : qu'attend-on de l'Atelier pour une expression numérique, pour une expression littérale ?

**Mesuré (22 saisies par `runInput`, test jetable supprimé).** Numérique : calculé, exact (`1/3+1/6 → 1/2`, `1/(1+√2) → √2−1`, `e^{ln 2} → 2`), mais `0.1+0.2 → 3/10` (la garde décimale de `readable` regarde le résultat, déjà fraction : écart à S1). Littéral : rendu tel que tapé, rien de mis au propre (`2x+3x`, `x*2`, `x+0`, `ln(eˣ)`, `(x²−1)/(x+1)` inchangés). `docs/systeme/atelier.md` ne dit rien du but ; seul le commentaire de `readable` le justifie (protection contre `tidy`).

**Comparaison donnée à David (de mémoire, non vérifiée en ligne).** Mathematica, Maple, SymPy : simplification automatique minimale à la saisie (termes semblables, neutres, `x/x → 1`), le reste sur commande (`Simplify`, `Cancel`). GeoGebra CAS, TI-Nspire : simplifient beaucoup plus (rationalisation, fractions, identités) ; GeoGebra a un bouton « Garder la saisie ». Aucun ne laisse `2x+3x` tel quel.

**Décision** :

- **expression numérique** : calculée (valeur exacte), décimal tapé → résultat décimal (S1 : `0,1+0,2 → 0,3`), garde « résultat trop long » conservée ;
- **expression littérale** : mise au propre (`tidy`), **ordre de l'élève gardé** : `3+2*x → 3 + 2x`, `2x+3x → 5x`, `x*2 → 2x`, `x+0 → x` ; `x/x` reste (S3), `0,5x` reste décimal (S1), aucune identité ni simplification de fraction (`ln(eˣ)`, `(x²−1)/(x+1)` inchangés : c'est le rôle de `.simplifier`, `.développer`, `.factoriser`).
- Réalisable après le lot du contrat de `tidy` (S1-S3 + option d'ordre) ; la garde « variable » de `readable` saute alors.

## 20. D4 : forme demandée par l'énoncé, pour dérivée et primitive (David, 2026-10-22 : « oui, D4 avec le réglage »)

Vérifié avant de présenter (`questions/generator/correction-generator.ts`) : la correction `simplify` reçoit `intent` (réduire / développer / factoriser) ; `differentiate` et `integrate` n'en reçoivent aucune, la forme finale est fixée par le code (`withTidyStep` pour la dérivée). Le modèle peut déjà exiger une forme de l'élève par `requiredForm` de la case (`'product'`, `{ pattern }`), que la correction ignore : élève jugé sur une forme, correction affichée sous une autre (contraire à E1).

**Décision** : un réglage facultatif « forme de la réponse finale » (réduite / développée / factorisée) sur les modèles de dérivée et de primitive, même mécanisme que l'`intent` des questions de simplification. Vide → forme par défaut (D1 pour la dérivée, § 7 pour la primitive). Rempli → la dernière étape passe par la politique demandée. Garde-fou accepté avec : quand un modèle a à la fois ce réglage et un `requiredForm`, un test vérifie que la correction passe le juge sous cette forme (E1). Écartée : déduire la forme de `requiredForm` (motif d'acceptation, pas politique de calcul).

## 21. Q4 : factoriser au milieu d'un calcul (David, 2026-10-22 : « ok pour 1 »)

Sondé avant de présenter (test jetable, supprimé) : `(x²−1)/(x+1) → x−1` par `simplify` et par le moteur pédagogique (`auto` et `réduire`), en **une seule étape `simplify-fraction`** venue de `normalize` : ni factorisation montrée, ni `x ≠ −1`. Idem `(x²−4)/(x−2) → x+2`, `(2x+2)/(x+1) → 2`, `(x²−x)/x → x−1`. Deux écarts relevés au passage, ajoutés au § 4 (`simplify` factorise `x²+2x+1` ; le moteur pédagogique développe `(x+1)²`).

**Décision : la règle de l'ADR 0007 « `auto` ne factorise jamais » vise le résultat, pas les étapes.** Une étape peut factoriser pour simplifier une fraction, si le facteur commun disparaît ensuite : `(x²−1)/(x+1) = (x−1)(x+1)/(x+1) = x−1`, pour `x ≠ −1` (condition affichée, S3). Le résultat final n'est jamais une forme factorisée choisie par `auto` : `x²+2x+1` reste développé. Rejetée : interdire aussi les étapes (`auto` laisserait la fraction telle quelle). Précision d'ADR, pas renversement : à reporter dans l'ADR 0007 au lot concerné.

## 22. § 9 : sonde avant présentation (2026-10-22, pas encore présenté à David)

Moteur pédagogique, lycée, test jetable supprimé. Ce que voit l'élève avec `développer` et `réduire` (résultats identiques, sauf les noms d'étapes) :

- `0,5x(x+0,2)` → `(1/2)x² + (1/10)x` : décimaux réécrits en fractions (contraire à S1), étapes « combine-like-terms » ×3 ;
- `(x+1)/2·(x−1)` → `(1/2)x² − 1/2` ;
- `(x+1)(x−2) + 1/(x+1)` → `(x³−3x−1)/(x+1)` : même dénominateur imposé, y compris en `réduire` ;
- `(x²−1)/(x+1)` → `x−1`, étape unique `simplify-fraction`, `x ≠ −1` perdu ;
- `e^(ln x)·(x+1)` → `x² + x` (`exp-ln`, sans `x > 0`) ; `(√x)²·(x+1)` → `x² + x` (sans `x ≥ 0`) ;
- `réduire` développe : `(x+1)² → x²+2x+1`, `2(x+3) → 2x+6`.

Toutes les étapes `combine-like-terms` / `simplify-fraction` viennent de `normalize` (`useNormalize: true`, `intent-rules.ts`). À présenter à David avec ces exemples, en langage simple (il a trouvé les options de D4 trop abstraites au premier jet : partir d'un exemple concret).

## 23. § 9 tranché (David, 2026-10-22 : « 2 »)

Présenté avec les exemples du § 22. Réponse : option 2, « oui, mais `réduire` ne doit pas développer non plus ».

- `normalize` **retiré de l'affichage des expressions avec variable** : développer à l'écran (`.développer`, corrections, politiques `développer` / `réduire`) passe par les règles du moteur pédagogique (distributivité, identités remarquables, puis `tidy`) ; décimaux gardés, pas de dénominateur commun ni de simplification de fraction en chemin, chaque étape nommée.
- `normalize` **gardé** pour comparer (A1) et pour les calculs internes (D), ceux-ci par des fonctions nommées (`polynomialCoefficients`…) au lieu de `denormalize(normalize())` à la main.
- Sans variable (`evaluate`) : `normalize` calcule toujours, seule l'écriture du résultat change (§ 12, décision A).
- **`réduire` ne développe pas** : ce n'est pas une décision nouvelle, c'est le contrat de la fusion (§ 0) ; le comportement actuel (`(x+1)² → x²+2x+1`, `2(x+3) → 2x+6`) est un écart au contrat, déjà prévu au lot 3. Ma présentation l'avait dit « à trancher à part » à tort.
- Non mesuré : combien d'exercices existants tombent sur ces cas (à faire avant le plan de lots).

## 24. Q5 : on ne renomme pas `normalize` (David, 2026-10-22)

« Je ne veux pas changer le nom car `normalize` fait exactement ce qu'elle dit : rendre une forme normale (forme canonique). »

Le nom est juste : le problème relevé au § 3 n'était pas le nom mais l'usage (sa sortie montrée à l'élève), réglé par le § 9. Le lot « renommages » ne touche pas `normalize`.

## 25. Q6 : sonde en profondeur avant de trancher (2026-10-22, pas tranché)

David : « point sensible, explore en profondeur ». Deux agents (évaluateurs ; appelants de `evaluateNodeToApproximatedNumber`), points critiques revérifiés à la main.

- **5 moteurs** : rationnels exacts (`evaluateNodeToApproximatedNumber`, lève ; `evaluateNodeToRational`, budget plus large), `evaluate` mode décimal (`status` + `reason` en français), `compile` (flottant, NaN/±∞, ~100× plus rapide en boucle), et deux évaluateurs maison flottants (`evaluateNumeric` `common/numeric.ts:249`, `evaluateAtPoint` `pedagogical-limits/helpers.ts:92`). Autour : ~40 copies (≈ 25 `try/catch + isFinite` identiques, dont `computeNumericValue` `solve/numeric-value.ts:20`).
- **`precision`** : un seul appelant (`evaluate.ts:1580`).
- **Exactitude requise** (mesuré : `0,1+0,2−0,3` = 0 en rationnel, 5,55e-17 en `compile`) : `isZeroTerm` `transforms.ts:1694` et `factorZero` `cosmetic-transforms.ts:442` (**juge de l'élève**, `=== 0`), `foldIntegerExponents` `evaluate-with-modifiers.ts:335`, `isSafeFactor` `limits/evaluate.ts:1403`.
- **Message d'erreur lu** : `outOfDomainNear` `limits/evaluate.ts:307` (`/argument must be/`) ; `reason` d'`evaluate` affichée dans l'Atelier.
- **±∞ comme résultat** : `evaluateNumeric` (`1/0 → +∞`, pôles des limites, `indeterminate.ts:119`, `sign-tracking.ts:280`), `inequality/index.ts:248`, `reciprocal/image.ts:52`, `integration/forbidden-value.ts:46`.
- Mesuré : `e^1000 → Infinity` mais `e^1001` lève (« hors d'échelle ») en rationnel ; `ln(−1)` lève vs NaN ; `1/0` lève vs Infinity en `compile`.
- **Bug trouvé (mesuré, à confirmer par un test rouge dans les limites)** : `evaluateNumeric` ignore `power` et `isInverse` des fonctions : `\sin^2(1)` → 0,841 (= sin 1) au lieu de 0,708 ; `\cos^{-1}(0,5)` → 0,878 au lieu de 1,047. Utilisé par le moteur des limites.
- ~20 appels laissent l'erreur remonter sans capture (ex. `solve.ts:1133`, `:1817`, `periodicity.ts`, ubumark `number-line-parser.ts:159`).

Conclusion : **une seule fonction `number | null` ne suffit pas** ; ma proposition initiale est retirée. Proposition révisée présentée à David (voir la page).

## 26. Q6 tranchée (David, 2026-10-22 : « 1 »)

Trois fonctions, une par besoin, **sans changer aucun résultat** :

- **(a) valeur sûre** : rationnels exacts, nombre fini ou `null` ; remplace les ~25 copies `try/catch + isFinite` (base : `computeNumericValue`).
- **(b) variante** qui rend +∞, −∞ ou échec : limites, inéquations (`inequality/index.ts:248`), réciproque (`reciprocal/image.ts:52`), `forbidden-value`.
- **(c) `compile`** pour les boucles (grapheur, échantillonnage).
- Restent tels quels : décisions exactes sur les rationnels (« vaut 0 », juge de l'élève) ; version qui lève pour `evaluate` et les endroits où le message compte.
- Les évaluateurs maison (`evaluateNumeric`, `evaluateAtPoint` des limites pédagogiques) sont remplacés **après** un test rouge sur le bug `sin²` / `cos⁻¹` (§ 25).

## 27. Q7 tranchée (David, 2026-10-22 : « 1, mais après une reprise de session »)

Premier lot à part, à faire **dans la session suivante**. Liste revérifiée le 2026-10-22 (grep hors tests) :

- **classe `Exp` entière** (`mathAST/exp.ts`, ~1 000 lignes, réexport `mathAST/index.ts:443`) : aucun importeur en production, ni Web REPL ni CLI. **5 fichiers de tests** l'utilisent comme raccourci : `__tests__/exp.test.ts` (supprimé avec elle), `normal/__tests__/{parity-normalization,trig-decider-robustness,equivalence}.test.ts`, `pattern/__tests__/integration.test.ts` → réécrire avec `parseLatex` / `areEquivalent` en gardant exactement ce que chaque test vérifie.
- `simplifyExpression` (`math/index.ts:191`, réexport `questions/index.ts:28`).
- `evaluateWithModifiers` (`eval/evaluate-with-modifiers.ts:740`, réexports `eval/index.ts`, `math/index.ts:28`) : enveloppe morte depuis `adec59b90` (2026-02-14), remplacée par `evaluateAstWithModifiers` (vivante, `variable-resolver.ts`). **Garder le reste du fichier** (`evalResultToNumber`… utilisés par la validation).
- `evaluateWithSubstitution` (`common/numeric.ts:363`, réexport `common/index.ts`), `approximateValueLatex` (`cli/approximation.ts:256`).
- Dans `questions/constraint-validators.ts` : `checkSpaces`, `checkProducts`, `checkBrackets`, `checkZeros`, `checkForm`, `checkNullTerms`, `checkFactorOne`, `checkFactorZero`, `checkSigns`. **Garder `checkUnit` et `checkReducedFractions`** (vivants). ⚠️ Ne pas confondre avec le `checkForm` de `cosmetic-transforms.ts:1809`, juge actuel, vivant.
- Avant chaque suppression : `grep -rn` collé dans la PR. Revue : `code-reviewer` (Sonnet).

## 28. Lot code mort (2026-10-22, branche `refactor/simplify-carte-code-mort`)

Fait comme listé au § 27, greps refaits avant chaque suppression (zéro appelant hors tests). Ce qui n'était pas prévu :

- **`checkSpaces` n'était qu'une enveloppe** de `checkSpacesViolation` (`cosmetic-transforms.ts`, vivant, utilisé par le juge `checkForm`) : ses 42 assertions étaient la seule couverture fine de la détection. Déplacées dans `mathAST/__tests__/spaces-violation.test.ts`, branchées directement (17 tests ; les cas « plusieurs réponses » testaient l'enveloppe et partent avec elle). Les autres vérificateurs avaient leur propre logique, morte : leurs tests partent avec eux (513 → 94 tests, `checkReducedFractions` gardé).
- **`evaluateWithModifiers`** : son fichier de tests (87 tests) testait en fait `evaluateAstWithModifiers` à travers l'enveloppe ; gardé, avec un helper local `parseLatex` + `evaluateAstWithModifiers`. Idem `approximateValueLatex` : helper local de même composition que la Web REPL (37 tests).
- **Classe `Exp`** : 4 fichiers de tests réécrits par l'agent mathast avec les constructeurs bas niveau (arbres gardés tels quels, pas de `parseLatex`) ; comptes identiques (32, 26, 40, 149). Deux tests retirés : « hash is cached » et « normal form is cached », qui vérifiaient le cache privé de la classe.
- Docs système mises à jour : `questions.md` (écart connu retiré), `grandeurs.md`, `mathast/README.md`, `mathast/pattern-matching.md`.

## 29. Ordre des lots validé (David, 2026-10-22 : « je te suis »)

Lot 2 (code mort) déjà fait (#1610). Reste, dans l'ordre :

1. **Bugs, test rouge d'abord, en deux PR.** Un bug qui ne se reproduit pas sort de la liste.
   - **1a — juge de l'élève** (revue `code-reviewer` opus, correction des réponses) : vecteurs (`isExactlyZero` par `normalize`, § 4), QCM (la vérification de forme reçoit le numéro du bon choix, § 10), attendu mal écrit dans le modèle (§ 10).
   - **1b — moteur** : comparaisons par `normalize` au lieu d'`areEquivalent` (§ 4), `sin²` des limites (§ 26), `evaluate` ignore l'unité, plantages de `tidy` masqués par `tidySafe`.
   - **Déplacés** : `simplify` factorise et `(x+1)²` développé → lot 3 ; `tidy` simplifie `x/x` → lot 4. Leur test rouge ouvre le lot qui les corrige (corriger avant le contrat, c'était le faire deux fois).
2. ~~Code mort~~ (#1610).
3. `réduire` et `auto` cessent de développer ; identités dans `réduire` avec étapes (S4, Q4, § 9).
4. Contrat de `tidy` (S1-S4) + module de règles partagé avec la validation (E1, E2, § 10).
5. Forme cible par contexte d'affichage (D1-D4, A) — dépend du lot 4 (D3).
6. Valeurs approchées (Q6) — indépendant, peut être avancé.
7. Renommages (`normalize` garde son nom, Q5).

## 30. Lot 1a sondé : rien pour l'élève, fondu dans 1b (David, 2026-10-22 : « je te suis »)

Sondé en local (test jetable) et en prod (MCP lecture seule) :

- **Vecteurs** : bug réel dans le code — `(sin²x+cos²x ; 0)` refusé pour `(1 ; 0)`, idem `tan x` / `sin x/cos x`, `2^(x+1)` / `2·2^x` (`√8` / `2√2` et `cos(π/3)` / `1/2` acceptés). Mais **4 modèles vecteurs sur 1 008**, aucun avec trigo, exp ou ln. → lot 1b, avec les autres comparaisons par `normalize` (ADR 0006).
- **QCM** : **code mort**, pas un bug. Les blocs `requiredForm` et `applyConstraints` de la branche QCM de `validateAnswer` ne tournent qu'avec un LaTeX de réponse ; `QuestionCard` et `FlashCard` passent `undefined` hors texte à trous, et les réponses QCM enregistrées n'ont que `choiceIndexes`. En prod : 117 QCM, 0 `requiredForm`, 28 avec des `constraints` jamais appliquées (laissées en base : un QCM n'a pas d'écriture à juger). → suppression dans le lot 1b.
- **Attendu mal écrit** : **voulu** (ADR 0013, comparaison stricte : `2×3` attendu → `6` en `bad_form`, comme `400+80` contre `480`). Les 7 attendus littéraux non réduits de la prod sont tous voulus (« Décomposer un entier en produit », `2*16`…). Les attendus calculés relèvent d'E1 / lot 4. → retiré de la liste.

**Lot 1b** (branche `fix/simplify-carte-moteur`), test rouge d'abord pour chaque bug : (1) comparaisons par `normalize` au lieu d'`areEquivalent` (solutions, racine candidate, parité, REPL) + vecteurs ; (2) `sin²` des limites ; (3) `evaluate` ignore l'unité ; (4) `tidySafe` masque les plantages ; (5) code mort QCM. Comportements à faire valider avant les correctifs.

## 31. Lot 1b sondé (2026-10-22, tests jetables retirés)

- **Atelier, test d'égalité `a = b` — bug confirmé, visible par l'élève.** `runInput` → `WebReplEngine.executeEquality` (`cli/web/web-repl-engine.ts:764`), repli par `normalize` : `\sin^2(x)+\cos^2(x) = 1` → `false`, idem `sin(x)^2+cos(x)^2=1`, `tan x = sin x/cos x`, `2^{x+1} = 2·2^x`, `1/cos²x = 1+tan²x`, et même `\sin^2(2)+\cos^2(2)=1` (exact non numérique). `(x+1)^2 = x^2+2x+1` et `\ln(e^x) = x` → `true`.
- **Vecteurs** (§ 30) : confirmé, aucun modèle concerné.
- **Parité `detectSymmetry`** — bug confirmé, **aucun appelant en production** (réexporté seulement) : `e^x+e^{-x}`, `2^x+2^{-x}`, `2^x−2^{-x}` → « aucune, prouvé ». Cause : `normalize` ne simplifie pas `e^{-(-x)}` ; `areEquivalent` répond juste.
- **Dédoublonnage des solutions** (`solve.ts:335`) : repli seulement sans valeur approchée ; aucun cas trouvé. **Racine candidate** (`polynomial.ts:599`) : numérique pur, `normalize` suffit. → pas de bug montré.
- **`sin²` des limites** : `evaluateNumeric` faux (`sin²(1)` → 0,841, `cos⁻¹(0,5)` → 0,878), mais 15 limites sondées (`1/sin²x` en 0, `1/cos²x` en π/2, `x/sin²x` en 0, `arccos` en 1…) donnent toutes le bon résultat : pas d'effet visible trouvé.
- **`evaluate` et l'unité** : non reproduit, `5~\unit{km}` → `5000 m`, `2 h + 30 min` → `9000 s` (seul `evaluateToRational` interne lit l'expression sans l'unité).
- **`tidySafe`** : aucun plantage de `tidy` connu à montrer.

## 32. Lot 1b fait (branche `fix/simplify-carte-moteur`)

- Tests rouges (14) puis correctif : égalité `a = b` de la console / Atelier, `isExactlyZero` des vecteurs (et des matrices, qui le réutilisent), parité, tous par `equivalenceForms` (ADR 0006). **Pas `areEquivalent`** dans la console : il ne lève jamais et retombe sur des flottants ; on garde le message d'erreur.
- Code mort QCM retiré de `validateAnswer` (50 lignes), aucun test n'en dépendait.
- Revue `code-reviewer` opus : rien de bloquant. 49 égalités comparées ancien / nouveau : aucun `true` devenu `false`, aucun faux positif (`\sqrt{x^2}=x`, `\ln(x^2)=2\ln x`… restent faux). Effet de bord juste, fixé par un test : `e^{iπ}` accepté pour −1, `e^{i}` refusé comme non réel.
- **Écart connu laissé (hors périmètre, sur `main` aussi)** : `detectSymmetry` conclut « none, proven » pour `\sqrt[3]{x}`, `x^{1/3}`, `x^{2/3}`, `\ln(x+\sqrt{x^2+1})` (impaires ou paires). Sans appelant en production.

## 33. Lot 3 : `réduire` et `auto` cessent de développer (David, 2026-10-23 : « je valide »)

Branche `refactor/simplify-carte-reduire`, worktree `ubumaths-wt-simplify-carte`.

**Mesuré avant** (sonde jetable, supprimée) : en prod, **aucun** modèle de question n'a de correction générée `simplify` (0 / 1 008, ni `réduire` ni `auto`) ; le seul effet visible est le `.simplifier` de l'Atelier (`auto`). Couper les identités remarquables de `simplify` ne rougit que 2 tests, tous deux sur `x²+2x+1 → (x+1)²` (panel de référence, `segment-length-sans-option`).

**Comportements validés :**

- **`réduire`** = règles d'identités, de puissances et de racines (étapes nommées), puis `tidy` qui raconte (`tidy-*`) à la place de `normalize`. `2(x+3)`, `(x+1)²`, `−(x+2)`, `(x+1)(x−2)+1/(x+1)` restent ; `2(x+1)²+3(x+1)² → 5(x+1)²` ; `(x²−1)/(x+1)` reste (simplifier demande de factoriser).
- **`auto`** = `réduire`, puis fractions (Q4), puis « développer seulement si plus court » (règle de `simplify` : coût strictement inférieur, ou égal sans plus de termes). Jamais de factorisation dans le résultat : `x²+2x+1` reste sans aller-retour. `(x+1)²−x² → 2x+1`, `x(x+1) → x²+x`.
- **Q1** : les étapes du développement dans `auto` sont celles de `.développer` (`writeExpandSteps`, « une intention, une rédaction »), détaillées et résumées ; rédaction impossible → on ne développe pas.
- **Q2** : dans `auto`, une fraction de polynômes se simplifie en montrant la factorisation : `(x²−1)/(x+1) = (x−1)(x+1)/(x+1) = x−1`, pour `x ≠ −1` (condition dans le titre de l'étape). Précision à reporter dans l'ADR 0007.
- **Q3** : valeurs remarquables (`cos(π/3) → 1/2`) reportées à un lot à part.
- **`simplify`** ne factorise plus (règles `algebraicSimplifyRules` retirées) ; panel de référence mis à jour.
- **Hors lot** (lot 4, contrat de `tidy`) : décimaux (S1), `x/x` et `e^{ln x}` sans condition (S3). `développer` inchangé (sa rédaction passe déjà par `explainExpansion`).

## 34. Lot 3 fait (branche `refactor/simplify-carte-reduire`)

- Tests rouges (29, commit `ed4aa8682`) puis correctif (`b7601e400`). Nouveau module `pedagogical-simplify/reduce-steps.ts` : `tidyAsSteps` (étapes `tidy-*`, celles qui ne retirent que des parenthèses de groupement sont tues), `simplifyPolynomialFractions` (Q4, une et plusieurs lettres), `expandIfShorter` (garde : une somme à développer doit exister, sinon `normalize` ferait passer `cos(−x) → cos(x)` sous « On réduit »).
- Ce que `normalize` faisait en silence et qu'il a fallu rendre en règles nommées : `ln(exp(x))`, `exp(ln(x))`, `exp(a)·exp(b)` (`expFunctionRules`), parité et période trig (`trigNegativeAngleRules`, `trigPeriodicRules`), `|−x|`, `||x||` (`absReduceRules`).
- Mesuré sur le panel : `auto` rend ce que rend `simplify` sur 46 lignes sur 49 (avant : 38) ; restent 3 écarts de capacité (`√(x²)`, `(eˣ)³`, `xᵃxᵇ`). Écritures changées, voulues : `1/√2 → √2/2` et `(6/8)x → 3x/4` (celles de `tidy`, comme `simplify`).
- `segment-length-sans-option` : l'empreinte d'avant les longueurs garde sa valeur, l'écart voulu (`simplify x²+2x+1`) est déclaré dans le test.
- Docs : panel (tables + section des divergences 11 → 3), README mathAST, `pattern-matching.md`, ADR 0007 (précision Q4).
- Serveur de test : `http://localhost:5177/atelier` (worktree `ubumaths-wt-simplify-carte`).
- **Revue `code-reviewer` opus** (~330 entrées, aucune étape fausse, aucune exception). Corrigés, test rouge d'abord : (1) `expFunctionRules` limitées à `réduire`/`auto` (dans `factoriser`, `exp-product` détruisait le facteur commun de `exp(x)exp(x)+exp(x)`) ; (2) le reste d'une fraction simplifiée est développé (`fraction-develop` : `(x³+6x²+11x+6)/(x+3) → x²+3x+2`, jamais de forme factorisée produite par `auto`) ; (3) `tidy` raconté après les fractions (`(x²−1)/(x+1)+1 → x`) ; (4) `x−(x−1)` vu comme à développer ; (5) `réduire` ne range plus `1+(x+1)(x−1)` « par degré ». Aussi : condition « y ≠ −1 » d'un facteur à une lettre dans une fraction à plusieurs lettres, conditions dédoublonnées, `factorise` sous `try`, description de `pow-neg-one`, titres `abs-*` sans `|` en tête (ubumark), commentaire de `questions/types.ts`.
- **Laissés (mineurs, connus)** : `tidy` simplifie `(x+1)²/(x+1)³` et `(−x−1)/(x+1)` sans condition (S3, lot 4) ; facteurs opposés non reconnus (`(x²−1)/(1−x)` reste, juste mais non simplifié) ; `MAX_FRACTIONS = 8` coupe en silence au-delà ; `|−(x−1)|` → `|(x−1)|` (parenthèse en trop).

## 35. Lot 4 : découpage et comportements (David, 2026-10-23 : « je valide »)

Sondé sur `main` avant d'écrire (sorties mesurées, sonde jetable retirée). Lot 4 découpé en cinq PR : **4a** domaine (S3) · **4b** décimaux (S1), avec le retrait des gardes recopiées par les appelants (`readable`, console, limites, `solve-latex`) · **4c** `order: 'kept'` (S2) · **4d** espaces (E2) · **4e** module de règles partagé (§ 16).

**4a — S3.** `tidy` ne simplifie une base que si elle reste au dénominateur ou ne peut pas s'annuler. `x/x`, `3x/x`, `x²/x`, `x³/x`, `xy/(xz)` inchangés ; `(2x)/(4x) → x/(2x)` ; `(−x−1)/(x+1) → −(x+1)/(x+1)` ; gardés : `x/x² → 1/x`, `(x+1)²/(x+1)³ → 1/(x+1)` (même domaine — le « piège » du § 34 n'en est pas un), `eˣ/eˣ`, `2ˣ/2ˣ`, `(x²+1)/(x²+1) → 1` ; `√x/√x` inchangé. Avec l'hypothèse « x non nul » / « x > 0 » (ADR 0012) : `x/x → 1`. **Q1** : `x⁰ → 1` gardé (convention des polynômes). **Q2** : la variante `{ result, conditions }` est écrite au lot 5, avec son premier appelant.

**4b — S1.** Un décimal reste décimal ; fraction si un opérande est une fraction ou si le résultat n'a pas d'écriture décimale finie. `0,5+0,25 → 0,75`, `x×0,5 → 0,5x`, `1,5² → 2,25`, `0,3x+1/2` inchangé, `0,5(x+1)` inchangé ; `1/2+0,5 → 1`, `1/3+0,5 → 5/6`. **Q3** : une barre de fraction compte comme opérande fraction — `0,5/2 → 1/4`, `2,5x/5 → x/2`, `(0,5x+1)/3 → (x+2)/6` (table A.1 gardée).

## 36. Lot 4a fait (branche `refactor/simplify-carte-tidy`)

- Tests rouges (`tidy-domaine.test.ts`) puis correctif. `tidy` garde la part de l'exposant venue du dénominateur (`MutableFactor.denominator`) ; `keepDomain` écrit la base des deux côtés si elle peut s'annuler (`tidy/sign.ts` : `cannotVanish`, lecture de structure, `numtype` pour les feuilles — il ignore que `x²` ≥ 0 et `eˣ` > 0, mesuré).
- Options `typeCtx` (hypothèses, ADR 0012) et **`domain`** : des expressions dont le domaine est acquis. Né des dérivées : sans lui, la correction de `(x ln x)′` finissait sur `ln(x) + x/x`, celle de `ln(kx)` sur `k/(kx)`. Les six chemins de dérivée passent f (`withTidyStep`, `tidyTerms`, `reducedDerivative`, `.diff`, carte f′, `cleanDerivative` de l'intégration). Oracle des dérivées : formes inchangées.
- `factoriser` simplifie une fraction factorisée par l'étape de `auto` (`simplifyPolynomialFractions`, condition écrite) : `(x²−1)/(x+1) → x−1` comme avant, mais plus en silence. `réduire` garde `x/x` (panel mis à jour).
- **Revue `code-reviewer` opus** : corrigés, test rouge d'abord — (B1) `(x−1)/(x−1)` sortait `−(1−x)/(x−1)` (`flipNumerator` retournait une base gardée) ; (C1) `factoriser` rendait `3·1` ; (C2) narration « on regroupe les facteurs » sans regroupement.
- **Laissés (connus, déjà sur `main` ou sans cas réel)** : `1/(1/x) → x` (un `x⁻¹` sous une barre échappe au suivi) ; `domain: [x^n]` dit x ≠ 0 même si n est un paramètre entier ; puissance paire déclarée ≥ 0 même pour une variable complexe ; `reduceFractionOfSums` ignore `domain` (`(2x−2)/(x−1)` reste) ; `1/(2x+2)` dans `domain` ne dit pas `x+1 ≠ 0`.
- Suite client : deux passages locaux interrompus par le navigateur de test (`rpc is closed`, `wrapDynamicImport`), 0 test rouge ; la CI tranche.

## 37. Lot 4b fait (#1624, branche `feat/simplify-carte-decimaux`)

- Tests rouges (`tidy-decimaux.test.ts`, 22 rouges sur 54) puis correctif. Registre suivi terme par terme : `Accumulator.decimal` (un littéral non entier lu, ou sous un radical) et `.fraction` (une `division` lue, Q3) ; `TidyTerm.decimal` = décimal lu, aucune fraction, écriture finie ; recalculé par groupe dans `collectLikeTerms` (un terme à coefficient fractionnaire rend le groupe fraction). Rendu dans `buildTermMagnitude`.
- Sans barre, un coefficient décimal ne déclenche ni `reduceFractionOfSums` (`0,5(x+1)` inchangé) ni `flipNumerator` (`−0,5(x−1)` inchangé) : `hasFractionBar`. Un nombre commun qui laisse un entier se simplifie toujours (`0,5(2x+4) → x+2`).
- Choix pris en chemin, cohérents avec S1 : une puissance négative n'est pas une barre (`0,4^{−1} → 2,5`, `1,5×10^{−2} → 0,015`) ; `√0,25 → 0,5`. **Laissé** : un exposant décimal devient fraction (`x^{0,5} → x^{1/2}`), l'exposant d'un facteur ne porte pas de registre (spec § A.3).
- Gardes retirées : `readable` (atelier), `readableExact` ×2 (REPL web, `.eval`), `writeLimitValue`, `keepLogDecimals` (solve-latex, mort : les tests des seuils `\ln(0{,}8)` passent sans lui). **Gardées**, elles protègent d'autre chose que `tidy` : flottants des limites (`evaluate.ts`, `containsFloatArtifact`), développement par `normalize` (`expand-explained`, `reduce-steps`), `evaluate-steps`, `evaluate-with-modifiers`, l'affichage décimal de `.eval`.
- Mesures : suite serveur complète verte (un test d'énoncé adapté : `(−0,5)ⁿ` au lieu de `(−1/2)ⁿ`) ; oracle des dérivées : `poly-11` et `exp-22` @ carte rejoignent la forme de classe (`x−1,5`, `e^{0,5x}`), les trois autres chemins restent au lot 5 ; **1 008 modèles de prod × 8 tirages : 0 différence** (énoncé, choix, réponse, corrigé ; témoin fabriqué vu changer). Limites sondées : inchangées.
- **Revue `code-reviewer` opus** : corrigés, test rouge d'abord — (B1, bloquant) `tidy` non idempotent si une puissance négative porte un coefficient décimal (`0,5·x⁻¹ → 0,5/x → 1/(2x)`) : `writesDecimal` exige aucun facteur au dénominateur ; (A1) l'atelier en mode décimal perdait le zéro final (`√26 → ≈ 5,099` au lieu de `5,0990`) : la garde retirée de `readable` protégeait aussi les 4 décimales — un nombre seul n'y passe plus par `tidy`. **Questions ouvertes pour David** : (Q8) `√0,5 → 0,5√2` (lettre de S1) ou `√2/2` ? (Q9) `(0,5x+0,5)/(x+1)` reste tel quel alors que `(0,5x+1)/(x+1) → (x+2)/(2(x+1))` — la barre de Q3 ne chasse pas les décimaux quand rien ne se simplifie ; aligner ?

## 38. Q8 et Q9 tranchées (David, 2026-10-23 : « je valide »)

- **Q8** : `√0,5 → √2/2`, pas `0,5√2`. Le résultat est irrationnel, sans écriture décimale finie : exception de S1, donc fraction. `√0,25 → 0,5` inchangé.
- **Q9** : Q3 (« une barre compte comme opérande fraction ») ne vaut que pour un dénominateur **numérique**. Dénominateur avec variable → décimaux gardés : `(0,5x+1)/(x+1)` et `(0,5x+0,5)/(x+1)` inchangés. Restent : `0,5/2 → 1/4`, `2,5x/5 → x/2`, `(0,5x+1)/3 → (x+2)/6`. Raison : `(x+2)/(2(x+1))` transforme (piste A) ; l'autre alignement `(x+1)/(2(x+1))` montre une simplification interdite par S3.
- Livrées en **lot 4b-bis**, avant le 4c, tests rouges d'abord.

## 39. Lot 4b-bis fait (branche `fix/simplify-carte-q8-q9`)

- Portée tranchée par David avant les tests (sonde) : **Q8** = un décimal **sous** la racine (`√0,2 → √5/5`, `√1,5 → √6/2`, `√0,5·x → x√2/2`), un décimal **devant** reste (`0,5√2`, `0,5π`) ; **Q9** = tous les dénominateurs avec variable gardent les décimaux (`0,5/x`, `1,5/x`, `0,5/(x+1)`, `(x+0,5)/(x−1)`, `x/(0,5x+1)`, `0,5x/x`), pas seulement `(0,5x+1)/(x+1)`.
- Tests rouges (17) puis correctif dans `collect.ts` : `Accumulator.bar` (barre lue) distinct de `.fraction` ; `readsFraction` ne compte la barre que si aucun facteur n'est dessous ; `isRationalRoot` décide le registre du radicande ; `reduceFractionOfSums` ne chasse pas les décimaux d'une somme sous un dénominateur à variable. `writesDecimal` ne regarde plus les facteurs : `0,5·x⁻¹ → 0,5/x`, relu `0,5/x` (idempotent, cas B1 du 4b gardé dans les invariants).
- **Bug trouvé en chemin, hors lot** : `areEquivalent` dit faux `√(1/2) ≡ √2/2`, `√(1/3) ≡ √3/3`, `√(3/2) ≡ √6/2`, `√(1/2) ≡ 1/√2` (vrais : `√(1/8) ≡ √2/4`, `√(3/4) ≡ √3/2`, `1/√2 ≡ √2/2`). Touche le juge : un élève qui tape `√(1/3)` pour `√3/3` est refusé. D'où l'invariant « valeur conservée » non testé sur les cas Q8 (idempotence seulement).
- **Revue `code-reviewer` opus** : corrigés, test rouge d'abord — (1) `√0,5·√0,5` donnait `1/2` : le registre d'une racine se décide sur le terme fini (`Accumulator.decimalRoot`, `hasRootFactor`), plus racine par racine ; (2) `(x/3+0,5)/x` gardait `x/3` sous la barre : une somme qui contient aussi une division se chasse. **Laissé** (mineur, sans cas réel) : `0,5/x·x/2 → 0,25x/x` (les bases `x` gardées des deux côtés, S3, comptent comme dénominateur à variable).
- Mesures : suite serveur complète verte (59 701 après revue) ; `check:incremental` 0 ; cliquet tenu ; **1 008 modèles de prod × 8 tirages (banc du 4b) : 0 différence**. Témoin non construit : `{{eval}}` d'un décimal sous racine rend une valeur approchée et les variables sont évaluées, donc Q8/Q9 n'atteignent pas les modèles par ces chemins.

## 40. Équivalence des racines de fractions (David, 2026-10-23 : « corrige le » ; branche `fix/simplify-carte-equivalence-racines`)

- Cause : `normalize.ts`, branche B4 de `sqrt` — `√(n/d)` n'était développé que si un carré sortait du numérateur ou du dénominateur ; sinon, nœud opaque. Correctif : une fraction numérique (`ratValue.d ≠ 1`, sans monôme) passe aussi par l'extraction, et `√n · 1/√d` se rationalise par le coefficient algébrique.
- Tests rouges (12 sur 20, `equivalence-racine-de-fraction.test.ts`) puis verts ; l'invariant « valeur conservée » des cas Q8 rétabli dans `tidy-decimaux.test.ts`.
- **Effet d'écriture** (normalize calcule les valeurs exactes, § 9) : `{{eval:(2/3)^(1/2)}}` → `√6/3` au lieu de `√(2/3)` ; test de non-régression du 2026-10-04 mis à jour (il enregistrait l'écriture, pas une décision). Cohérent avec Q8 et `1/√2 → √2/2`.
- **Verdicts du juge, mesurés (main → branche)** : `√(1/3)` pour `√3/3`, `√(1/2)` et `√0,5` pour `√2/2`, `√(3/2)` pour `√6/2` : `incorrect` → `bad_form` (comme `1/√3` déjà) ; `√3/3` pour `√(1/3)` : `incorrect` → `bad_form` ; `√3` pour `√3/3` : `incorrect` inchangé.
- Mesures : suite serveur complète verte ; `check:incremental` 0 ; 1 008 modèles × 8 tirages : 0 différence (témoin `{{eval:(2/3)^(1/2)}}` vu changer). Reste opaque : `√(x/2)` (monôme à coefficient fractionnaire), sans cas réel connu.
- **Revue `code-reviewer` opus** : aucun faux positif, plantage ni valeur fausse (36 paires, 15 valeurs exactes). Mineur corrigé : rationaliser factorise `n·d` par divisions (`√(100000007/99999989)` : 0,45 s pour le juge) → borne `MAX_RATIONALIZED_RADICAND` = 10¹², au-delà la racine reste opaque comme avant.

## 41. Lot 4c : `order: 'kept'` (David, 2026-10-23 : « je valide » ; branche `feat/simplify-carte-ordre-garde`)

**Sonde (main)** : `tidyTerms` garde l'ordre des termes de la somme du haut seulement (`3+2x`, `3+x²−2x`), mais regrouper rend tout l'ordre canonique (`1+2x+3x → 5x+1`), un négatif en tête passe derrière (`−6x+2 → 2−6x`), les sommes en parenthèse sont rangées (`3(1+x) → 3(x+1)`). `tidyWithoutReordering` garde l'ordre des **facteurs** d'une factorisation (`(x+1)eˣ`), pas celui des termes : ce n'est pas le même axe, S2 les confondait.

**Comportements validés** :

- `tidy({ order: 'kept' })` : les termes de **chaque** somme gardent l'ordre écrit, parenthèses comprises (`3+2x`, `3(1+x)`) ; les termes semblables se regroupent à la place du premier (`1+2x+3x → 1+5x`, `2−x+3x → 2+2x`, `x+1+x → 2x+1`) ; la comparaison se fait sur la forme rangée (`2(1+x)+3(x+1) → 5(1+x)`). L'ordre des facteurs reste canonique (`x·2+1 → 2x+1`, `(x+1)eˣ → eˣ(x+1)`). Défaut inchangé : `'canonical'`.
- **Q10** : `tidyWithoutReordering` sort du lot 4c (axe des facteurs), revu au lot 7.
- **Q11** : avec `kept`, `−6x+2` reste ; `tidyTerms` garde par-dessus la règle des dérivées du 2026-10-06 (`2−6x`).
- **Q12** : `tidyTerms` reconstruit sur `kept` dans ce lot ; oracle des dérivées et banc des 1 008 modèles mesurés avant le merge, différences montrées à David.
- Brancher l'Atelier (D3) reste au lot 5.
- **Q13 — ordre canonique des facteurs (David, 2026-10-23 : « je valide l'ordre »)**. Mesuré sur `main` : catégorie (constantes `e`/`i`/`π` < lettres < fonctions < reste) puis ordre alphabétique, d'où `(x+1)eˣ → eˣ(x+1)`, `(x+1)ln x → ln(x)(x+1)`, `(x−1)(x+2)eˣ → eˣ(x+2)(x−1)`, mais `(2x−1)e^{2x}` gardé (incohérent). Ordre validé : nombre, lettres et leurs puissances (`x`, `x²`, `π`), parenthèses (sommes), fonctions et exponentielles (`eˣ`, `ln x`, `sin x`, `√x`) → `(x+1)eˣ`, `x(x+1)eˣ`, `(x+1)ln x`. Entre deux parenthèses : l'ordre écrit si l'idempotence le permet (à vérifier). Lot à part (4c-bis, après 4c) — **découpage confirmé par David le 2026-10-23** ; `tidyWithoutReordering` probablement inutile ensuite (Q10).
- **Fait (branche)** : option `order: TermOrder` dans `TidyOptions` (`collect.ts` : `ordered()` saute `sortTerms` ; la clé d'un facteur qui contient une somme est celle de sa forme rangée, `factorKey`, d'où `2(1+x)+3(x+1) → 5(1+x)` ; en mode `kept`, pas d'étape « On range »). Tests : `tidy-ordre-garde.test.ts` (15 rouges sur 30 avant correctif).
- **`tidyTerms` reconstruit** sur `kept` : le quotient garde son traitement à part (numérateur, signe compris, sinon `tidy` sortait le − : `−(cos²+sin²)/sin²`) ; règle « négatif en tête » (Q11) gardée.
- **Bug de `tidy` trouvé en chemin, pas corrigé dans `tidy`** : un arbre construit par le moteur porte `u′v − (uv′)` SANS nœud de parenthèse ; `flattenSumShallow` distribue alors le −, alors que le contrat l'interdit pour `−(x+2)` écrit (`x(2x+1) − x² − x − 1`). L'ancien `tidyTerms` le masquait (terme à terme). Contourné dans `tidyTerms` (`withImpliedParentheses`), avec la règle « ouvrir seulement si ça regroupe » (`x − 1 − (x + 1) → −2`). À corriger dans `tidy` au lot 4e ou 5 (mesurer avant : change le canonique).
- **Oracle des dérivées** : valeurs identiques (WRONG/RESIDUE inchangés). Formes : `lit-28` (commande, latex-péda) et `rat-22` (4 chemins) rejoignent la forme de classe ; `comp-12` écrit `eˣ/(1+(eˣ)²)` (ordre de la formule) ; `rat-19` garde le `1+x` de l'énoncé ; **`rat-04 @ carte` quitte la forme de classe** (`−2/(x−1)²` → `(x−1−(x+1))/(x−1)²`, comme bouton et commande sur `main` : il n'y arrivait que par le bug ci-dessus, joué deux fois) — lot 5 (D1). Atelier : `.dériver cos(3x+π/4)` → `−3 sin(3x + π/4)` (ordre tapé) au lieu de `sin(π/4 + 3x)`.
- **Banc des 1 008 modèles × 8 tirages : 0 différence, mais aveugle** : le témoin (`tidyTerms` remplacé par `tidy` rangé) ne change rien non plus, les modèles ne passent pas par `tidyTerms`.
- **Suite serveur complète** (59 882 tests) : 1 rouge, `∫(1/x + 1/(x+1) + 1/x)` → `2 ln|x| + ln|x+1|` (regroupé à la place du premier, ordre de l'énoncé) au lieu de `ln|x+1| + 2 ln|x|` : attendu mis à jour, **différence à montrer à David (Q12)**. Docs : `tidy-spec.md` (§A.2 écart connu, §G.1 `order` et `tidyTerms`, §H) et `mathast/README.md` mis à jour ; garde `docs:check-a-jour` verte.
- **Revue `code-reviewer` (opus)** : aucune valeur fausse (signe, coefficient, idempotence). **Régression corrigée** : en `kept`, `eˣ(1+x) − eˣ(x+1)` restait tel quel (défaut : `0`) — `compareFactors` départage `(1+x)` et `eˣ` (même catégorie) sur l'écriture gardée, et la clé de regroupement enchaînait les facteurs dans l'ordre trié. Clé désormais **triée** (`factorsKey`, partagée par `collectLikeTerms` et `collectWithSigns`) ; `flipNumerator` et `withoutDoubleSign` passent par `factorKey`. 4 tests ajoutés (rouges avant), suite serveur verte (59 870). Laissé en l'état (mineur) : la branche « négatif en tête » de `tidyTerms` (`terms.ts`) n'applique pas `withImpliedParentheses` — valeur juste, ira avec le bug de `tidy` (lot 4e/5). `(1+x)eˣ` en `kept` ≠ `eˣ(x+1)` du défaut : réglé par 4c-bis (Q13).

## 42. Lot 4c-bis : ordre des facteurs (Q13, David, 2026-10-23 : « je valide Q14 et Q15 » ; branche `feat/simplify-carte-ordre-facteurs`)

**Sonde (prototype jetable, suite serveur complète)** : 9 rouges sur 59 980. Idempotence vérifiée sur 42 cas dans les deux modes, l'ordre écrit gardé entre deux parenthèses compris.

**Comportements validés** :

- Catégories, dans cet ordre : constantes (`e`, `i`, `π`) ; lettres et leurs puissances (`x`, `x²`, `xⁿ`, `x^x`) ; parenthèses (sommes, `(x+1)²`, `(x+1)ⁿ`) ; fonctions (`ln x`, `sin x`, `√x`, `|x|`, `ln 2`) ; exponentielles (`eˣ`, `e^{2x}`, `2ˣ`) ; le reste. `(x+1)eˣ`, `x(x+1)eˣ`, `(x+1)ln x`, `(2x+1)cos x`, `(x+1)√x`.
- **Entre deux parenthèses : l'ordre écrit** (idempotent, regroupement par clé triée) : `(x−1)(x+2)` reste, `(1−i)(−2+i)` reste, `2(x−1)(x+1)+3(x+1)(x−1) → 5(x−1)(x+1)`. Ordre de `factoriser` (Q3) inchangé.
- **Q14** : dans le groupe « fonctions et exponentielles », les fonctions d'abord (ordre alphabétique), les exponentielles ensuite : `ln(2)·2ˣ`, `2cos(x)e^{sin x}`, `ln(x)eˣ`.
- **Q15** : bug du générateur LaTeX (déjà sur `main`) : `x·3ˣ` s'écrivait `x 3^x`, illisible à la relecture. Corrigé dans ce lot : `\times` devant une puissance de base numérique.
- **Fait (branche)** : `order.ts` — catégories `CATEGORY_SUM` et `CATEGORY_EXPONENTIAL`, `powerCategory` (puissance d'exposant non rationnel : lettre ou somme → sa catégorie, base numérique ou constante → exponentielle) ; deux sommes → `compareFactors` rend 0 (tri stable, ordre écrit). `latex-generator.ts` — `startsWithNumericPower` dans `juxtaposesDigits` (Q15). Tests : `tidy-ordre-facteurs.test.ts` (34 rouges sur 86 avant correctif).
- **Suite serveur complète** (60 066 tests) : 2 rouges attendus, mis à jour — `(1−i)(−2+i)` garde l'ordre écrit (`tidy-sum-lead`), `∫(2x+1)sin x` → `2 sin x − (2x+1)cos x` (`primitive-ecriture`). **Oracle des dérivées** : inchangé (valeurs et formes, Q14 garde `ln(2)·2ˣ`, `2cos(x)e^{sin x}`, `2x ln(2)·2^{x²}`).
- **Banc des 1 008 modèles × 8 tirages** (relancé avec `tsx`, sonde dans le scratchpad de la session) : **26 tirages sur 25 392 changent**, tous la forme factorisée `a(x−x₁)(x−x₂)` de 6 modèles (racines, forme d'un trinôme, développer, sommet, factoriser avec les racines, axe de symétrie). L'ordre des parenthèses suit désormais l'écriture du modèle, donc **le x₁, x₂ de la correction** (« x₁ = −5 et x₂ = −1, donc P(x) = −2(x+5)(x+1) » ; sur `main` : `−2(x+1)(x+5)`, à l'inverse du texte). À montrer à David.
- **Revue `code-reviewer` (opus)** : idempotence et regroupement vérifiés sur environ 65 entrées, aucune valeur fausse ; le `\times` répare aussi `x 0.5^x`, `2 x 3^x`, refusés sur `main`. **Important, corrigé** : `limits/one-sided.ts` (`sameValue`) comparait `tidy(a)` et `tidy(b)` par leur écriture et comptait sur le tri alphabétique entre deux sommes : une limite `(a−1)(a+1)` et une valeur au point `(a+1)(a−1)` donnaient « discontinuité par trou ». Il compare désormais aussi la différence mise au propre à 0 (test rouge sans le correctif). Même famille signalée dans `reduce-steps.ts` (`sameFactor`) : sondé, sans effet observable (même sortie avec ou sans garde, et identique à `main`), donc non modifié. **Mineurs, corrigés** : tri transitif (rang de première apparition de la base au lieu de « rendre 0 ») ; `(1/2)ˣ`, `(−2)ˣ` rangés en exponentielles (base sans inconnue).
- **Bug trouvé en chemin, déjà sur `main`, hors lot** : `factoriser` sur `(a+b)(a−b)/((a−b)(a+b))` rend `(a+b)·1/(a+b)`. À montrer à David. Hors lot aussi : `toCustom` écrit `(1/2)^xe^x`, illisible en syntaxe maison (exposant `xe`).

## 43. Lot 4d : espaces de groupement (E2, § 15 ; David, 2026-10-23 : « je valide pour les espaces avec la même règle partout », « oui inclus le » [tableur])

**Sonde** : les espaces ne sont pas posées par `toLatex` mais à l'affichage, par `toLocaleDecimal` (`utils/french-math.ts`, seuil 4) : énoncés, corrections, cartes flash, PDF Typst et LaTeX. Les 3 `it.fails` de `tidy-passe-le-juge` venaient du test, qui jugeait `toLatex` brut et non l'écriture affichée.

**Comportements validés** : une règle, du juge au tableur — espace facultative jusqu'à 4 chiffres, exigée dès 5, chaque côté de la virgule à part. Juge : `1024`, `1 024`, `0,1234`, `0,123 4`, `1234,5678` acceptés ; `30000`, `0,12345`, `12345,6` remarqués ; `10 24`, `0,12 34` restent des fautes. Affichage : `1024`, `2024`, `0,1234`, `30 000`, `0,123 45`. Portée (David) : formules affichées, Atelier Calcul (note « trop long »), simulations (`statistics/simulation.ts`, `atelier/simulate.ts`), termes de suites (`desk.svelte.ts`) **et tableur** (`cell-format.ts`). Inchangés : `toLatex`, l'option `removeSpaces`, les entrées déjà espacées ; hors lot : les compteurs de l'UI hors maths (`toLocaleString('fr-FR')` des gidouilles, scores…) et les champs de saisie de l'Atelier (`ValueSlider`, `CurveSettings`, déjà sans groupement).

**Fait (branche `feat/simplify-carte-espaces`)** : module `mathAST/digit-grouping.ts` (`MIN_DIGITS_FOR_GROUPING = 5`, `groupIntegerDigits`, `groupDecimalDigits`, `groupNumberText`) ; `mathAST` n'importe rien de `$lib`, donc le juge, `french-math` et l'Atelier le partagent. Juge (`cosmetic-transforms.ts`) : sans espace, faute dès 5 chiffres seulement. Tableur : `Intl` en `useGrouping: false` puis `groupNumberText`. Tests : `digit-grouping.test.ts`, `spaces-violation.test.ts`, `french-math.test.ts`, `tidy-passe-le-juge.test.ts` (invariant sur l'écriture affichée, `it.fails` retirés), `mise-en-forme`, `exact-trop-long-calcul`, `suites-trace`, textes `1 000` → `1000` des simulations ; 21 rouges avant le correctif.

**Suite serveur complète (règle du BIPM seule)** : 63 rouges, dont **70 specs du corpus `data/relecture/`** (63 fichiers) qui attendent une remarque sur un nombre de 4 chiffres en numération (`7900`, `1234`, `3456 recopié sans espace`) : la règle de l'école. La raison d'E2 (« les corrections écrivent `1024` ») ne tenait pas : l'affichage (`toLocaleDecimal`) espaçait déjà ; seul le test d'invariant jugeait `toLatex` brut. Trois options présentées (A revenir à 4, B BIPM partout, C BIPM + réglage) : **David : « C »**.

**Option C — comportements validés (David, 2026-10-23 : « je valide »)** : BIPM par défaut ; case « Espaces dès 4 chiffres » dans l'éditeur, stockée `options.constraints.spacesFromFourDigits` (rangée à côté de `allowBracketsInFirstNegativeTerm`, précédent du même genre) ; pour un modèle réglé, le juge exige `7 900` ET l'affichage de la question l'écrit (énoncé, correction, carte flash, préremplis, séries figées). Modèles marqués : ceux dont une spec attend une remarque que seule la règle de l'école produit. Livraison : PR de code → `deploy:prod` → script de marquage aussitôt après.

**Fait (2e commit)** : seuil `minDigits` dans `digit-grouping.ts` (`SCHOOL_MIN_DIGITS_FOR_GROUPING = 4`), `checkSpacesViolation(latex, minDigits)`, `CheckFormOptions.spacesFromFourDigits` (via `formOptionsOf`) ; `toLocaleDecimal` option `minDigits`, `withDigitGrouping` (espaces sans toucher au séparateur, séries figées) ; contexte `content-digit-grouping.ts` posé par les 4 cartes, lu par `MathInline`, `MathBlock`, `MathPrompt`, `ParagraphNode`, `FillBlanksInput` ; schéma, types, `ValidationOptionsEditor`, `QuestionTemplateForm`. Corpus : **53 fichiers marqués** (insertion de 5 lignes, rien d'autre) — les 10 autres specs `spaces` visent 5 chiffres ou plus. Oracle des cases à unité réécrit (`ORACLE_MAJ=1`) : 35 verdicts, `1600 dam²` n'est plus remarqué (7 modèles sans spec `spaces`). Garde des retouches : `58f7a8dd` marqué dans le test. **Suite serveur complète verte (60 112)**, `check:incremental` 0, `types:cliquet` tenu. Docs : `mathast/README.md`, `questions.md`, `ubumark.md`, `atelier.md`, `statistiques.md`, `fiches-et-pdf.md`, `utilitaires-et-demos.md`.

**Prod (lecture seule, 2026-10-23)** : 66 modèles ont une spec `spaces` (62 publiés) ; **55 ont besoin du marquage**, dont 51 de primaire/collège (publiés) et **4 brouillons de 1re spé** (`245b4eb1` Décroissance exponentielle, `ef807ee9` Somme des premiers entiers, `e7cfe442` Somme des puissances de q, `27d77564` Placement) : **David : ne pas les marquer, corriger leurs specs** (BIPM au lycée). Le mécanisme des retouches ne convient pas (il rejoue les anciennes retouches, refus du lot entier) : script dédié en PR 2.

**Mergé : #1642** (2026-10-23, CI verte). Revue `code-reviewer` (opus) : rien de bloquant ; traités dans le dernier commit — test de rendu `CorrectionCard-espaces.svelte.test.ts` (rouge sans le fournisseur, vérifié), graphiques de simulation (`simulation-scene.ts`, `stat-chart-scene.ts`, message de `stat-chart-parser.ts`) et `\np` à l'import LaTeX (`importers/latex/converters/`) passés à la règle, codes couleur ignorés par le juge (défaut antérieur), seuil 5 explicite pour une carte non réglée (pas d'héritage du seuil de l'école), commentaire de `display-options.ts`. Suite serveur 60 161 verte, client (questions, markdown, question-inputs) 525 verts.

## 44. Lot 4d, PR 2 : script de marquage (branche `chore/simplify-carte-marquage-espaces`)

**Fait** : `pnpm corrections:marquage-espaces` (`scripts/corrections/marquage-espaces.ts`, lib `lib/marquage-espaces.ts`, 12 tests). Sélection par la règle : une spec attend `spaces` sur une réponse remarquée à 4 chiffres et pas à 5. Listes **figées** (51 modèles à marquer, 4 brouillons de lycée), que la règle doit retrouver exactement sur la prod courante, sinon refus. Marquage : seule la colonne `options` (`constraints.spacesFromFourDigits: true`, refus si déjà marqué). Lycée : seule `test_specs` ; la remarque `spaces` disparaît, la spec devient `correct` (une autre remarque attendue serait gardée ; une réponse encore remarquée au BIPM fait refuser). Garde-fous repris de `retouches.ts` : simulation par défaut, `checkTemplate` sur la ligne modifiée, refus du lot entier, sauvegarde, garde `updated_at`, relecture de la colonne écrite.

**Simulation sur la prod (lecture, 2026-10-23)** : 66 modèles avec une spec `spaces`, 55 à traiter, sélection conforme aux listes, **55/55 `checkTemplate` verts** (51 marqués, 4 brouillons : 6 specs passées à `correct`). Doc : `docs/pratiques/corrections-redaction.md`.

**Revue `code-reviewer`** : rien de bloquant ; traités — relance après une écriture interrompue (un modèle déjà marqué ou un brouillon déjà corrigé est sauté au lieu de bloquer le lot ; les modèles des listes sont relus par identifiant), description générée limitée aux réponses concernées, preuve rouge/verte sur un modèle réel du corpus (`grandeurs/426.json` : `checkTemplate` rouge sans le réglage, vert avec). 15 tests ; simulation prod relancée : 55/55 verts, 0 déjà traité. `marquage-sonde.mts` supprimé (accord de David).

**Ordre de livraison** : merge de cette PR → `deploy:prod` (David) → `pnpm corrections:marquage-espaces --publier` depuis le dépôt principal, sur le feu vert de David, aussitôt après.

**Mergé : #1645** (2026-10-23, CI verte).

## 45. Lot 4d en prod (2026-10-23)

`deploy:prod` → v0.45.0 (#1642, #1645, avec #1646 et #1647 d'autres sessions). Simulation du marquage aussitôt après : **refus**, un 56e modèle sélectionné hors liste, `103cf8d9` « Valeur d'un placement à intérêts simples » (brouillon 1re spé créé à 14 h 09 par la scission de `27d77564`, #1646), même spec `2300` sans espace. Même traitement que les brouillons de lycée : **#1648** (liste à 5 brouillons), CI verte, mergée ; simulation 56/56. `--publier` lancé par David : 56 écrits (51 `options`, 5 `test_specs`), vérifié en base (51 marqués, 5 brouillons sans spec `spaces`) et par relance (56 déjà traités, rien à écrire). La garde des listes figées a servi : sans elle, le brouillon scindé serait resté avec une spec rouge.

## 46. Lot 4e, phase 0 : sonde (2026-10-23, à valider par David)

Sondé sur `main` (sonde jetable retirée). **Découverte qui révise le § 16** : `tidy` n'applique aucune règle une à une. Il décompose en termes (`collect.ts` : coefficient rationnel + facteurs), puis reconstruit (`build.ts`). Les signes doubles, `1·x`, `0·x`, `+0`, fractions et racines non réduites disparaissent **par construction** : il n'y a rien à « appliquer en silence ». Seule `stripUnnecessaryBrackets` est appelée, et elle est déjà commune.

Mesuré : 29 écritures fautives, au moins une par règle (`0x+3`, `--x`, `x+(-3)`, `\frac{-x}{-2}`, `\frac{4}{6}`, `\sqrt{12}`, `3\sqrt8`, `2\times x`, `((x+1))`, `\frac{\sqrt8}{2}`…) : le juge nomme la bonne faute, et ce que `tidy` en fait passe le juge sans remarque, **29 / 29**.

Ce qui est vraiment écrit en double :

- **Une règle du juge vit à 5 endroits** : identifiant (`constraint-constants.ts`, `types.ts`, `template-schema.ts` ×2), libellé (`CONSTRAINT_LABELS`), message (`feedback.ts`), transformation (`buildASTPipeline`, `cosmetic-transforms.ts:1516`).
- **« Extraire un carré d'une racine » est écrit deux fois** : `squareFactorOf` (juge, boucle, plafond 10⁹) et `extractPerfectPower` (`normal/radical.ts`, utilisé par `tidy`, plafond 10¹²).

Proposition (comportement élève : **aucun changement**) :

1. **Registre unique des règles de superflu** (`mathAST/superflu/`) : `{ id, libellé, message, transformation }` pour les 8 règles AST (`reducedRadicals`, `reducedFractions`, `factorZero`, `nullTerms`, `brackets`, `signs`, `factorOne`, `products`). `buildASTPipeline`, `coefficientCleanupSteps`, les libellés, les messages et le schéma Zod lisent ce registre.
2. **`tidy` n'appelle pas le registre** : le lien écrire ↔ juger est un **test**, pas un appel. Le test E1 devient une garde par règle : pour chaque règle du registre, au moins un cas fautif ; le juge nomme cette règle, et `tidy` de ce cas passe le juge. Une règle ajoutée sans cas → test rouge.
3. Le juge extrait les carrés avec `extractPerfectPower`.

Questions :

- **Q16** : accepter la révision du § 16, c'est-à-dire que `tidy` reste structurel et que la garde est le test ? Recommandation : oui. Le faire appeler les règles ajouterait 8 passes qui ne changent rien.
- **Q17** : `zeros` et `spaces` (règles sur la chaîne tapée, pas sur l'arbre) entrent-elles dans le registre (libellé + message seulement) ? Recommandation : oui, pour qu'une règle n'ait qu'une seule fiche.

## 47. Q16 et Q17 tranchées (David, 2026-10-23 : « je suis tes recos » ; branche `refactor/simplify-carte-registre`)

Option 1 retenue :

- **Q16 : oui.** `tidy` ne passe pas par les règles. La garde écrire ↔ juger est un test : chaque règle du registre a au moins un cas fautif ; le juge nomme cette règle, et `tidy` du même cas passe le juge.
- **Q17 : oui.** `zeros` et `spaces` ont leur fiche (libellé et message, sans transformation).

Plan : `mathAST/superflu/` contient `transforms.ts` (les 8 transformations, retirées de `cosmetic-transforms.ts`, qui les réexporte) et `rules.ts` (le registre, ordonné comme le pipeline). `buildASTPipeline`, `CONSTRAINT_IDS`, `CONSTRAINT_LABELS`, `CONSTRAINT_FEEDBACK`, `ConfigurableConstraintId` et le schéma Zod lisent le registre. Les racines passent par `extractPerfectPower`. Comportement élève inchangé. Seul effet visible : l'ordre des réglages dans l'éditeur de modèle suit désormais le registre.

## 48. Lot 4e mergé (#1652, 2026-10-23)

Revue `code-reviewer` (opus) : aucun finding bloquant ; seul le nouvel ordre des réglages dans l'éditeur, annoncé dans la PR. CI verte (16/16).

## 49. Lot 5, phase 0 : sonde (2026-10-23, à valider par David ; worktree `ubumaths-wt-simplify-carte`, branche `fix/simplify-carte-derivee-decimaux`)

Sondé sur `main` (4 sondes jetables, retirées). Mesure de référence : l'oracle des dérivées (`differentiation/__tests__/oracle/`), dont le corpus porte la forme écrite en classe (`expected`) ; 73 fonctions y sont en `KNOWN_FORM_DIFF`.

**D1 — réponse finale de f′ (corrections et Atelier).** Aujourd'hui `withTidyStep` (`tidyTerms`) ne réduit pas le numérateur d'un quotient (`(2(x−3) − (2x+1))/(x−3)²`) et laisse `eˣ + xeˣ`. Candidat mesuré sur 33 cas : `auto` sur le numérateur, et pour une exponentielle commune « développer puis factoriser ». `auto` donne la forme de classe pour tous les quotients rationnels (`−7/(x−3)²`, `(x²+2x)/(x+1)²`, `17/(2x+5)²`, `4x/(x²+1)²`, `(−2x²−18)/(x²−9)²`, `(x²−1)/x²`, `(x²−2x−3)/(x−1)²`) et pour `4x(x−3) → 8x−12`. Mais `factoriser` va trop loin : `x(2−x)e^{−x}`, `3(1−2x)e^{−2x}`, `2(x²+x+1)e^{2x}`, `x²(x+3)eˣ`. Il faut donc mettre en facteur **la seule exponentielle**, comme le prévoit D1. Ordre « canonique + pas de − en tête (Q11) » : il rend toutes les formes du corpus (`(2x−x²)e^{−x}`, `(3−6x)e^{−2x}`, `(1−t)e^{−t}`, `(2−x)/x³`).

Trouvés en chemin :

- **Bug** : `auto` ne regroupe pas `(eˣ)²` et `e^{2x}` (quot-04 : `((eˣ)² − e^{2x} + eˣ)/(eˣ+1)²`, pire qu'aujourd'hui).
- **Écart S1 dans le moteur de dérivation** : `0,5x² − 1,5x → x − 3/2`, `−4,9t² + 20t → 20 − 49t/5`.
- La forme de classe simplifie le quotient par un facteur commun (quot-02 `(1−x)/eˣ`, quot-05 `(1−2 ln x)/x³`, quot-10 `(2−x)/x³`). D1 dit « dénominateur gardé ».
- quot-07 (`sin² + cos²`) demande une identité : relève de S4, hors lot 5.
- Les ~40 autres écarts (`x^{−2/3}/3`, `ln 2 × 2ˣ`, `√x³`…) sont des conventions d'écriture, hors lot 5.

**D2 — f′ du tableau de variations.** `factoriser` (lycée) sur le numérateur donne `x(x+2)/(x+1)²`, `(x+1)(x−3)/(x−1)²`, `−2(x²+9)/(x²−9)²`, `x(2−x)e^{−x}`, `x²(x+3)eˣ`, `(x−1)eˣ/x²`, `(x+1)eˣ` ; `x(1−2 ln x)/x⁴` pose la même question de simplification que D1.

**Valeur exacte (§ 13, A).** Le tableau de variations (`tidyExactValue`) et le grapheur (`simplify`) donnent la même valeur sur 11 cas sur 12. Le 12e diffère : `cos x + x/2` en π/6 donne `π/12 + cos(π/6)` dans le tableau et `π/12 + √3/2` dans le grapheur. Atelier : `0,1+0,2 → 3/10` et `2,50 → 5/2` (écarts à S1) ; `3·10^20` est écrit en entier.

**D3 — expression littérale de l'Atelier.** Aujourd'hui tout est rendu tel que tapé. `tidy({ order: 'kept' })` est prêt : `3+2*x → 3 + 2x`, `2x+3x → 5x`, `x*2 → 2x`, `x+0 → x`, `1+2x+3x → 1 + 5x`, `2(1+x)+3(x+1) → 5(1+x)`. Restent inchangés : `x/x`, `0,5x + 1`, `3 − 2x + x²`, `ln(eˣ)`, `(x²−1)/(x+1)` et `x − 1 − (x+1)`.

**D4.** Le schéma a `intent` pour les questions de simplification seulement (`template-schema.ts:220, 493`).

**Découpage proposé (une PR chacun)** :

- **5a — D1** : dernière étape « On réduit » de f′ (`withTidyStep`, partagée par les corrections, `.dériver`, le bouton et la carte). Pour un quotient : numérateur `auto`, dénominateur gardé. Exponentielle commune : elle seule en facteur, le reste développé réduit. Sinon `auto` : `5(x+1)⁴` reste. Ordre canonique sans − en tête. Bug quot-04 corrigé (test rouge d'abord). L'oracle mesure le résultat : ≈ 25 fonctions sortent de `KNOWN_FORM_DIFF`.
- **5b — D2** : `reducedDerivative` passe par `factoriser` (lycée) sur le numérateur, avec l'étape « On factorise pour étudier le signe » (`.variations` et carte).
- **5c — valeur exacte à afficher (§ 13 A)** : une seule fonction pour `readable`, `tidyKeepingValue` (`{{eval}}`), `tidyExactValue` (tableau), `simplifyExact` (grapheur), limites et solutions. Elle donne `0,1+0,2 → 0,3`, `2,50 → 2,5` et `cos(π/6)` calculé partout ; les gardes de `readable` deviennent son comportement. `evaluate` est inchangé pour les calculs internes.
- **5d — D3** : expression littérale de l'Atelier → `tidy({ order: 'kept' })` ; la garde « variable » de `readable` saute.
- **5e — D4** : réglage facultatif « forme de la réponse finale » sur les modèles de dérivée et de primitive (Zod, éditeur `MySelect`, `correction-generator`), avec garde E1 si un `requiredForm` est présent.
- **5f — restes** : primitive (`simplify` de `atelier/calcul.ts:2709` → `tidy`) ; étapes de limite (`tidy` ordre gardé, test d'abord) ; bug `u′v − (uv′)` sans nœud de parenthèse (§ 41).

**Questions** :

- **Q18** — diviser numérateur et dénominateur de f′ par leur facteur commun quand le domaine de f le permet : `(2x − x²)/x⁴ → (2 − x)/x³` (f = `(x−1)/x²`), `(x − 2x ln x)/x⁴ → (1 − 2 ln x)/x³` (f = `ln x/x²`), `(1 − x)eˣ/(eˣ)² → (1 − x)/eˣ` (f = `x/eˣ`) ? Reco : oui, en 5a et en 5b. La règle du quotient laisse ce facteur ; x ≠ 0 est déjà dans le domaine de f et eˣ ne s’annule pas (S3) ; D1 disait « dénominateur gardé » sans avoir vu ces cas. (Première version : les exemples donnaient le résultat au lieu de l’écriture à simplifier, relevé par David.)
- **Q19** — le décimal perdu par le moteur de dérivation (`x − 3/2` pour `0,5x² − 1,5x`) ? Reco : PR à part avant 5a (test rouge, `mathast-expert`), pour que l'oracle de 5a mesure D1 seul.
- **Q20** — la variante `{ result, conditions }` de `tidy` (Q2 du lot 4a, « écrite au lot 5 avec son premier appelant ») : aucun appelant trouvé, les conditions de Q4 viennent du moteur pédagogique, pas de `tidy`. Reco : la reporter jusqu'à un vrai appelant.
- **Q21** — l'ordre : Q19 → 5a → 5b → 5c → 5d → 5e → 5f ? Reco : oui. D1 et D2 sont vus par les élèves dans les corrections ; 5c est le plus large (6 appelants) ; 5e dépend de 5a (forme par défaut).

## 50. Q18-Q21 tranchées (David, 2026-10-23 : « je suis tes recos »)

- **Q18 : oui.** f′ est divisée par le facteur commun quand le domaine de f le permet (5a et 5b).
- **Q19 : oui.** PR à part avant 5a (branche `fix/simplify-carte-derivee-decimaux`) : le moteur de dérivation garde le décimal (S1).
- **Q20 : reportée.** Pas de variante `{ result, conditions }` sans appelant.
- **Q21 : ordre** Q19 → 5a → 5b → 5c → 5d → 5e → 5f.

## 51. Q19 codé (branche `fix/simplify-carte-derivee-decimaux`, 2026-10-23)

Cause : `foldNumericSubtrees` (`pedagogical-differentiation/pipeline.ts`) repliait les sous-arbres numériques de la dérivée brute par `evaluate` exact, nombre seul compris (`0.5 → 1/2`). Correctif : repli par `tidy` (S1). Test `decimaux-gardes.test.ts` : 6 rouges sur 8 avant. Oracle : poly-11, t-02, exp-22 rejoignent la forme de classe (8 entrées retirées) ; 3 faux résidus `lit-16/17/22 @ bouton` (`0{,}1 \cos` lu « coefficient 1 ») : la règle de l'oracle ignore désormais le `1` final d'un décimal à virgule. Doc : `mathast/README.md`.

## 52. Q19 mergé (#1655, 2026-10-23)

Revue `code-reviewer` (opus) : aucune valeur fausse. Corrigés avant le merge : `tidyTerms` gardait `2x/1,5` (même nombre de nœuds que `4x/3`) — un décimal sous la barre suit maintenant Q3 ; `4^{1/2}x²` donnait `2x × 4^{1/2}` — si `tidy` laisse une puissance numérique, l'ancien repli par `evaluate` reprend. Laissé : `(x^{0,5})′ = 0,5/x^{1/2}`. Au passage : `template-fact-sheet.test.ts`, rouge sur `main` (croisement #1650 / #1652), mis à l'ordre du registre. CI verte (16/16).

## 53. Lot 5a lancé (branche `feat/simplify-carte-5a-d1`, 2026-10-23)

D1 révisée (§ 17) + Q18 (§ 50) dans `withTidyStep` ; bug quot-04 d'abord en test rouge. Codé par `mathast-expert`.

## 54. Lot 5a mergé (#1656, 2026-10-23)

`finalDerivative` (`final-form.ts`) : quotient → facteur commun cherché sur le numérateur BRUT (Q18, domaine de f), puis `auto`, gardé si plus court ; exponentielle commune seule en facteur (`\exp` compris) ; sinon `auto` ; signe d'un quotient par `tidy` (David : « oui », cohérence avec la règle du 2026-10-20) ; un coefficient devant un quotient tapé (`2x/(x²−9)` lu `2·(x/(x²−9))`) entre au numérateur. La carte f′ (`derivativeAstOf`) la calcule une fois, après substitution : même forme que le bouton.

Décisions de David en route : `8x + 4`, `18x + 6`, `−sin x`, `e^{eˣ+x}` acceptées (« les formes ont l'air bien » ; corpus mis à jour) ; exponentielles différentes laissées (`eˣ + 2e^{2x}`) ; `.diff` de `pnpm math` NON aligné (`/calc` à supprimer) ; ne plus sonder avec `pnpm math` — à trancher plus tard : la supprimer avec `/calc`, ou la brancher sur l'Atelier (console Calcul en CLI).

Corrigés en route (rouges d'abord) : `auto` regroupe `(eˣ)²` et `e^{2x}` (identités d'Euler repassées après développement, `normalize.ts`) ; valeur fausse `sqrt-square`/`square-sqrt`/`sqrt-quotient` sur une racine n-ième (`∛(x²) → |x|`). Revue `code-reviewer` (opus) : aucune valeur fausse (41 fonctions sondées) ; ses 3 points traités. Oracle : 0 faux, ~35 fonctions rejoignent la forme de classe, aucune ajoutée. Carte : 3 ms au pire sur le corpus. CI verte (16/16).

## 55. Lot 5b lancé (branche `feat/simplify-carte-5b-d2`, 2026-10-23)

D2 (§ 18) + Q18 (§ 50) dans `reducedDerivative` (`variations/display.ts`) : on part de `finalDerivative` (5a), puis numérateur par `factoriser` (lycée), dénominateur gardé ; rien de factorisable (Δ < 0) → forme de 5a. `.variations` et le bouton « Variations » : étape « Dérivée » (forme de 5a, celle de `.dériver`), puis « On factorise pour étudier le signe » quand l'écriture change ; la ligne de réponse montre la forme factorisée. Appelants : `atelier/variations-steps.ts`, CLI `variations.command.ts` (aucune correction d'exercice ne l'appelle). Codé par `mathast-expert`, tests rouges d'abord.

Revue `code-reviewer` (opus, 82 fonctions comparées numériquement) : aucune forme fausse. Corrigés (rouges d'abord) : `factoriser` touchait l'exposant (`2x e^{(x−1)(x+1)}`) → exponentielles gardées telles qu'écrites ; un nombre seul devant une somme non polynomiale ou de degré 1 refusé (`2(e^{2x} − 2eˣ)`, `4(x − 2)` → forme de 5a ; `−2(x² + 9)/(x² − 9)²` gardé, forme de la phase 0) ; décimal tapé gardé (`x(3x − 4,8)`, S1) ; **bug de 5a** : `(−x²/(x+2))′` gardait le numérateur `x² − 2x(x+2)` (− devant le quotient), corrigé dans `final-form.ts` (`withOppositeInNumerator`) → `−(x² + 4x)/(x+2)²`, `.dériver` compris.

Laissés, à montrer à David : `x e^{−x²}` → `−2(x − √2/2)(x + √2/2)e^{−x²}` (juste, lourd ; `(1 − 2x²)e^{−x²}` se lit mieux) ; `(x² − 3x + 2)/(x² + 1)` → `3(x − 1/3 − √10/3)(x − 1/3 + √10/3)/(x²+1)²`. Pas factorisés (forme de 5a) : `x − 1/x`, `2e^{2x} − 3eˣ`, bicarrés à racines irrationnelles.

## 56. Lot 5b mergé (#1658, #1660, 2026-10-24) ; racines avec fraction (David : « je te suis »)

CI verte. Suite (branche `fix/simplify-carte-5b-racines`) : un facteur qui mêle racine et fraction n'est pas affiché, la forme de 5a reste — `x e^{−x²}` → `(1 − 2x²)e^{−x²}`, `(x² − 3x + 2)/(x² + 1)` → `(3x² − 2x − 3)/(x² + 1)²` ; `(x − √2)(x + √2)`, `x²(x − 2√3)(x + 2√3)` gardées. 2 tests rouges avant.

**#1661 (2026-10-24)** : main était rouge depuis #1656 — le `beforeAll` de l'oracle des dérivées (`derivatives-oracle.test.ts`) dépassait en CI les 10 s par défaut ; délai explicite de 120 s. Signalé par la session `passe-lycee` (bloquait #1657), prévenue au merge.

## 57. Lot 5c, phase 0 : sonde (2026-10-24, à valider par David)

Sondé sur `main` (2 sondes jetables, retirées) : 24 valeurs exactes passées par les 5 écritures actuelles, plus `.résoudre` et `.limite` par l'Atelier. Colonnes : Atelier (`readable`, `atelier/render.ts:138`), `{{eval}}` (`evaluateAstWithModifiers` → `schoolExactWriting`/`tidyKeepingValue`, `eval/evaluate-with-modifiers.ts:269`), tableau (`tidyExactValue`, `variations/critical-points.ts:250`), grapheur (`simplifyExact`, `grapheur/analysis.ts:1495` — pas celui de `geometry-core`), limite (`writeLimitValue`, `limits/exact-evaluation.ts:429`).

**D'accord partout (17/24)** : `1/3+1/6 → 1/2`, `√8 → 2√2`, `√(21/25) → √21/5`, `√2·√3 → √6`, `cos(π/6) → √3/2`, `cos(5π/6)`, `5π/6`, `π/3+π/6 → π/2`, `e^{ln 2} → 2`, `ln(e^{−1/2}) → −1/2`, `ln 8/ln 2 → 3`, `|−3| → 3`, `2^{10} → 1024` ; `ln 2 + ln 3` gardé (identité : S4).

**Écarts** :

| Valeur            | Atelier                         | `{{eval}}`         | tableau             | grapheur    | Cible proposée |
| ----------------- | ------------------------------- | ------------------ | ------------------- | ----------- | -------------- |
| `0,1+0,2`         | 3/10                            | 0,3                | 0,3                 | 0,3         | 0,3 (S1)       |
| `2,50`            | 5/2                             | 2,5                | 2,5                 | 2,5         | 2,5 (S1)       |
| `1/3+0,5`         | 5/6                             | **0,833333333333** | 5/6                 | 5/6         | 5/6 (S1)       |
| `0,5√2`           | √2/2                            | 0,7071…            | 0,5√2               | √2/2        | ⚠️ Q22         |
| `π/12 + cos(π/6)` | π/12 + √3/2                     | π/12 + √3/2        | **π/12 + cos(π/6)** | π/12 + √3/2 | π/12 + √3/2    |
| `sin(π/5)`        | sin(π/5)                        | **sin(1/5 π)**     | sin(π/5)            | sin(π/5)    | sin(π/5)       |
| `1/(1+√2)`        | √2 − 1                          | **−1 + √2**        | √2 − 1              | √2 − 1      | √2 − 1 (Q11)   |
| `−1/2·e^{−1}`     | −1/(2e)                         | **(−1)/(2e)**      | −1/(2e)             | −1/(2e)     | −1/(2e)        |
| `(1+√5)/2`        | 1/2 + √5/2                      | 1/2 + √5/2         | (1+√5)/2            | (1+√5)/2    | ⚠️ Q23         |
| `3×10^{20}`       | 300000000000000000000 (partout) |                    |                     |             | ⚠️ Q24         |

`.résoudre` (Atelier) : `x² = 0,5` → `S = {−1/2√2 ; 1/2√2}` (forme de calcul : `toLatex` sans mise au propre, `cli/commands/solve.command.ts:1329`, `solve-latex.ts:339`, `atelier/solve-steps.ts:309`) ; `x² = 3/4` → `−1/2√3` ; `x² − x − 1 = 0` → `1/2 − 1/2√5` ; `2x = 0,6` → `3/10` ; `0,5x + 1 = 0,2` → `−8/5` (S1). `.limite` : déjà juste (`0,5`, `(1+√5)/2`, `2√2`, `√3/2`) — `writeLikeInput` remet le décimal ; ma colonne « limite » de la première sonde le court-circuitait.

**Comportements proposés** — une fonction `exactValueToShow(source, evaluated)` (nom à l'usage), `evaluate` inchangé :

- _Nominal_ : registre de l'entrée gardé (S1) ; valeurs remarquables calculées partout, angle quelconque gardé en `sin(π/5)` ; produits écrits comme au tableau (`√2/2`, `5π/6`, `−1/(2e)`) ; pas de − en tête d'une somme (Q11) ; parmi les écritures candidates (évaluée, normale, source), la moins chère (règle actuelle du tableau).
- _Limites_ : résultat trop long (`exactTooLong`) montré tel quel ; tidy ou normalize qui lèvent → l'écriture évaluée ; évaluation exacte en échec → la source mise au propre.
- _Hors fonction, inchangés_ : grandeurs (`quantities.ts`), mode décimal (`5,0990`, notation scientifique approchée), expression à variable (5d), calculs internes.
- _Appelants_ : `readable` (ses gardes nombre/notation scientifique/unité deviennent des cas de la fonction, la garde « variable » reste jusqu'à 5d), `{{eval}}` chemin exact, `tidyExactValue` et `tidyCriticalAbscissa`, `simplifyExact` du grapheur, `writeLimitValue`, ligne `S = …` de `.résoudre`.

**Questions** :

- **Q22** — `0,5√2` : garder `0,5√2` (registre de l'entrée, comme `0,5x`) ou écrire `√2/2` ? Reco : `√2/2`. S1 garde le décimal quand le résultat a une écriture décimale finie ; un irrationnel n'en a pas, comme `1/3+0,5 → 5/6`.
- **Q23** — `(1+√5)/2` : une seule fraction quand les termes ont le même dénominateur (`(1−√5)/2`, solutions `(1 ± √5)/2`), ou `1/2 + √5/2` ? Reco : une seule fraction, l'écriture de la formule du discriminant en classe ; c'est déjà celle du tableau, du grapheur et des limites.
- **Q24** — `3×10^{20}` tapé en mode exact : garder la notation scientifique (registre, S1) ou écrire l'entier ? Reco : la garder quand l'entrée est déjà écrite `a × 10ⁿ` ; `2^{10}`, `10^3·7` se calculent.
- **Q25** — `{{eval}}` : `1/3+0,5` rend aujourd'hui `0.833333333333333` dans un énoncé. Le passer à `5/6` (S1) change des énoncés existants. Reco : oui, avec un relevé avant (modèles qui mêlent fraction et décimal dans un `{{eval}}` sans modificateur `decimal`), liste montrée avant merge.
- **Q26** — `.résoudre` : la ligne `S = …` passe par la fonction (`±√2/2`, `x = 0,3`, `x = −1,6`) ; les étapes du solveur (« On divise les deux membres par 2 : x = 3/10 ») restent en 5f ? Reco : oui, S seule en 5c.

## 58. Q22-Q26 tranchées (David, 2026-10-24 : « je suis tes recos »)

- **Q22 : `√2/2`.** Le décimal n'est gardé que si le résultat a une écriture décimale finie.
- **Q23 : une seule fraction** quand les termes ont le même dénominateur : `(1+√5)/2`, solutions `(1 ± √5)/2`.
- **Q24 : notation scientifique gardée** quand l'entrée est écrite `a × 10ⁿ` ; `2^{10}` se calcule.
- **Q25 : `{{eval}}` passe à `5/6`**, avec un relevé des modèles touchés montré avant le merge.
- **Q26 : `.résoudre`** : la ligne `S = …` seule en 5c, les étapes du solveur en 5f.

## 59. Lot 5c codé (branche `feat/simplify-carte-5c-valeur-exacte`, 2026-10-24)

`exactValueToShow` (`eval/exact-value.ts`) ; branchés : tableau (`tidyExactValue`), grapheur (`simplifyExact`), limites (`writeLimitValue`), Atelier (`readableExact` du moteur avec la saisie pour source, `render.ts`, `.eval`), `{{eval}}` (`formatExact` ; `schoolExactWriting`/`tidyKeepingValue` retirés), `S = …` de `.résoudre` (`solve-steps.ts` `shownAnswer`, `solve-latex.ts`, `solve.command.ts`). Tests rouges d'abord pour chaque lieu.

Trouvés en route :

- S1 n'est pas « décimal si l'écriture est finie » : un opérande fraction ou une division donne une fraction (`1/4+0,5 → 3/4`, `1,5/3 → 1/2`). La fonction délègue ce choix à `tidy` sur la source.
- La saisie gagnait sur la valeur calculée (`(1+√2)^{100}` moins cher que sa valeur développée) : critère « la plus calculée » avant le coût (appels de fonction, puis puissances entières d'une somme). `√3` n'est pas un appel à calculer.
- Un rationnel s'écrit depuis la valeur seule : `normalize` sur une grosse saisie coûtait 2,7 s (`exact-trop-long.test.ts`).
- `{{eval:cos(π/2)}}` écrivait le flottant `6·10⁻¹⁷` (le nombre se formatait depuis le flottant, pas depuis la valeur exacte) : corrigé.
- **Écart à Q22, pour `{{eval}}` seulement** : un irrationnel calculé avec un décimal garde la valeur décimale. `A-03-perpendiculaire-passant-par-un-point` calcule ainsi les coordonnées d'une étiquette de figure (`texte({{eval:P1x}}, …)`) ; un radical en LaTeX y cassait la figure. **À confirmer par David.**
- Tests qui assertaient l'ancien comportement, mis à jour : décimaux de l'Atelier (`0,5+1 → 1,5`, `f(1,5) → 2,25`, `max(2,5 ; x)` → `2,5`, `B(1,5 ; 2/3)`), notation scientifique retapée (`8.77*10^9`), `{{eval}}` (`1 + 3π/2`, `π²/6`, `ln(2)/3`), solutions (`2π/3`, `(1 − √5)/2`).

**Relevé Q25** (corpus `data/relecture/` + `scripts/questions/`, 1 031 modèles, 6 graines par variation, 19 830 instances, base `3ded253a0` contre la branche) : 4 modèles changent.

| Modèle                                          | Ce qui change                                                                                                                                                         |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fonctions/597`                                 | réponse attendue `−1 + √2` → `√2 − 1` (4 instances)                                                                                                                   |
| `D-05-ajustement-par-changement-de-variable-ln` | variables internes : `\exp(127/100)` → `e^{127/100}` ; `150/13 ln 2 + 150/13 ln 5 − 61/13` → `(50 ln(1000) − 61)/13` (la saisie est `ln(1000)`) ; réponses inchangées |
| `C-02-al-kashi-longueur`                        | variable interne : `√(−24 cos(5/18 π) + 25)` → `√(25 − 24 cos(5π/18))`                                                                                                |
| `C-01-seuil-par-le-logarithme`                  | variable interne : `(ln 2 + ln 5)/ln 2` → `ln(1/10)/ln(1/2)` ; réponses inchangées                                                                                    |

Aucun énoncé ne change. Limite : instantané du corpus, pas les modèles modifiés depuis en base.

**Revue `code-reviewer` (opus)** : aucune valeur fausse (~100 saisies sondées). Traités : candidates comparées APRÈS le regroupement sur dénominateur commun, et radical au dénominateur compté comme « à calculer » (`1/(√3 − 1)` restait tel quel, `(1 + √3)/2` désormais) ; notation scientifique gardée seulement pour l'Atelier (`keepScientific`) — dans `{{eval}}`, `a × 10⁻³` aurait changé de forme selon la mantisse tirée ; exposant 0 exclu. Laissés : `ln 8` reste `ln 8` (main écrivait `3 ln 2`, identité appliquée par `evaluate`) ; `2^{0,5}` s'écrit `2^{1/2}` (ni `√2` ni décimal), à 5f. Relevé rejoué : les mêmes 4 modèles.

**Logarithmes (David, 2026-10-24)** : question « pourquoi `ln 8` reste `ln 8` ? » — c'était le coût qui départageait (`ln 4 + ln 2 → 3 ln 2` mais `ln 8 → ln 8`), main décomposait tout en facteurs premiers via `evaluate`. Options A (facteurs premiers), B (puissance d'un seul entier → `n ln p`, sinon tel quel), C (aucune propriété). **David : « B »**, puis pour la borne d'un seuil (`2ⁿ > 1000`), **« b »** : un quotient de deux logarithmes garde l'écriture de l'énoncé (`ln 1000 / ln 2`). Décimal dans le logarithme gardé (`ln(0,1)`, règle des seuils du 2026-10-09). Relevé rejoué : les mêmes 4 modèles.

**Écart Q22 de `{{eval}}`** : vérifié — un radical en LaTeX dans `texte(x, y, "d")` fait disparaître toute la figure (« Séquence `\dfrac` inconnue »). David (2026-10-24) : « je préférerai qu'on gère l'affichage latex dans les étiquettes » — à préciser (le LaTeX est dans la POSITION de l'étiquette, pas dans son texte).

## 60. Lot 5c-bis : coordonnées de figure avec `;d` (branche `feat/simplify-carte-5c-bis-figures`, 2026-10-24)

**Décision (David, 2026-10-24)** : phase 0 « le langage des figures lit le LaTeX » abandonnée, « solution simple ». Un seul modèle concerné ; un auteur qui veut une coordonnée exacte écrit déjà `sqrt(2)/2`. Son « affichage latex dans les étiquettes » visait le **texte** affiché d'une étiquette (`"$\sqrt{2}$"`) : futur chantier, hors simplify-carte.

- `formatExact` : exception retirée — un irrationnel calculé avec un décimal s'écrit exact (`0.5\sqrt{2}` → `\dfrac{\sqrt{2}}{2}`), Q22 sans écart. Test rouge vérifié sans le correctif.
- A-03 (`518f7f0b`, brouillon en prod) : `{{eval:P1x;d}}` etc. dans `texte(…)`. **Trouvé en route** : A-03 cassait déjà en prod avec l'exception (v2 graine 16) — quand a² + b² est un carré, `P1x` est rationnel → `\dfrac` → figure disparue. `;d` corrige les deux.
- **Banc figures** (18 modèles de la prod avec ```figure, 20 graines par variation, 1 160 tirages, `runDsl` sur chaque figure) : base = 1 erreur (A-03 v2 s16) ; sans l'exception, sans `;d` = 20 (A-03 v2) ; aucun autre modèle.
- **Relevé des textes** (tous les modèles de la prod, 6 graines, 19 254 tirages, base contre branche) : 6 tirages changent, tous A-03 v2. Aucun autre énoncé.
- JSON du dépôt identique à la prod avant `;d` (simulation `create-questions` : « déjà en base », sans différence).
- Doc : `docs/systeme/mathast/README.md` (registre décimal), `docs/pratiques/fiches-exercices.md` (bloc figure : `{{eval:x;d}}`).

## 61. Lot 5d (D3), phase 0 : sonde (2026-10-24, à valider par David ; worktree `ubumaths-wt-simplify-carte`, branche `feat/simplify-carte-5d-d3`)

Décision déjà prise au § 19 : une expression littérale tapée dans Calcul est mise au propre, ordre de l'élève gardé. Sondé par le moteur de l'Atelier (`runInput`, 36 saisies, sonde jetable retirée) : aujourd'hui tout ressort tel que tapé (`readable`, `atelier/render.ts:141`, garde « variable »). Candidat : `tidy(ast, { order: 'kept' })` à la place de cette garde.

**Comportements (nominal)** : `3+2*x → 3 + 2x` · `2x+3x → 5x` · `x*2 → 2x` · `x+0`, `1*x`, `x^1`, `-(-x)` → `x` · `1+2x+3x → 1 + 5x` · `2(1+x)+3(x+1) → 5(1+x)` · `3x²+2x²−x → 5x² − x` · `a+b+a → 2a + b` · `2*3x → 6x` · `x*x → x²` · `x²·x³ → x⁵` · `sin x + sin x → 2 sin x` · `x−(−3) → x + 3` · `x/2+x/3 → 5x/6` · `(2x)/2 → x` · `x+1/3+1/6 → x + 1/2`.

**Restent tels que tapés (limites)** : `x/x` (S3) · `0,5x + 1` (S1) · `3 − 2x + x²` (ordre gardé) · `2x − (x+1)` et `2(x+1)` (on ne développe pas) · `x − 1 − (x+1)` · `ln(eˣ)` (identité, S4) · `(x²−1)/(x+1)` (rôle de `.simplifier`/`.factoriser`) · une grandeur (garde « unité » conservée) · un résultat trop long (garde `exactTooLong` conservée).

**Conséquences des règles déjà validées** : `√8·x → 2x√2` (ordre des facteurs, Q13 : lettres avant fonctions) ; le bouton « Copier » part du LaTeX, il suit donc l'affichage.

**Questions** :

- **Q27** — « Garder » range aujourd'hui l'arbre TAPÉ (`promote`, `atelier/calcul.ts:4278`) : après 5d, la ligne afficherait `5x` et l'objet gardé serait `2x+3x`. Reco : ranger ce qui est affiché (même valeur partout, `x/x` restant `x/x`, le domaine n'est pas perdu).
- **Q28** — `x^0 → 1` (faux en 0 si on tient 0⁰ pour indéfini) : même famille que `x/x` (S3). Reco : garder `x^0` tel quel, comme `x/x`. Le changement serait dans `tidy`, donc pour tous ses appelants. Je vérifie d'abord qui en dépend ; si c'est large, cas reporté en 5f.
- **Q29** — `eˣ·eˣ → (eˣ)²` (règle `x·x → x²`), alors qu'en classe on écrit `e^{2x}`. Reco : `e^{2x}` (règle des exposants pour une exponentielle). Change aussi `tidy` pour tous : même traitement que Q28 (vérifié d'abord, sinon 5f).

**Plan (une PR)** : tests rouges dans `affichage-calcul.test.ts` (nominal + limites ci-dessus), garde « variable » de `readable` remplacée par `tidy` ordre gardé, « Garder » selon Q27, `docs/systeme/atelier.md` mis à jour. Revue `code-reviewer` (Sonnet).

## 62. Q27-Q30 (David, 2026-10-24)

- **Q27 : oui.** « Garder » range ce qui est affiché (lot 5d).
- **Q28 : retirée.** Déjà tranchée au lot 4a (§ 35, Q1 : `x⁰ → 1` gardé, convention des polynômes) ; reproposée par erreur, David a suivi la reco sans le rappel. Prototype mesuré (2 tests seulement en dépendaient, `tidy-domaine`, `tidy-review`) puis retiré.
- **Q29** : reco suivie (`eˣ·eˣ → e^{2x}`) ; précision en attente — seulement quand des facteurs se regroupent, un `(eˣ)²` tapé restant tel quel (`tidy` ne distingue pas les deux aujourd'hui).
- **Q30 : b** (David, maintenu après le relevé). Une fonction usuelle en un nombre (`√2`, `ln 2`, `sin 1`, `|−3|`) se range comme un coefficient, devant les lettres : `2√2 x`, `√2 (x+1)`, `ln(2) x`, `1/(ln(2) x)`, `2 ln(2) x·2^{x²}`. Une fonction de l'énoncé (`f(2)`) reste une inconnue. Branche `fix/simplify-carte-ordre-valeurs`, PR avant 5d. `order.ts` : catégorie `CATEGORY_VALUE`. Tests : 20 rouges sur 128 sans le correctif (`tidy-ordre-facteurs`). Suite serveur : 4 rouges, tous des attentes de l'ancien ordre, mises à jour. **Corpus des dérivées mis à jour** (David : « il faudra mettre à jour le corpus ») : 4 formes (`log₂`, `log` ×2, `2^{x²}`) — l'oracle compare sans l'ordre des facteurs, il ne l'avait pas vu.

## 63. Q29 codé, Q31 tranchée (David, 2026-10-24 : « je valide tes recos » ; branche `fix/simplify-carte-exponentielles`)

- **Q31 : non.** `tidy` ne regroupe pas deux exponentielles d'exposants différents (`eˣ·e^{2x}`, `eˣ·e^{−x}`, `e^{2x}/eˣ`, `eˣ·e` restent) : propriété enseignée, rôle de `réduire` (S4). À vérifier en 5f : `réduire` le fait-il, avec son étape ?
- **Q29** : `collect.ts` — drapeau `grouped` sur un facteur rejoint par un autre de même base ; `withExponentRule` réécrit une exponentielle (base sans inconnue, exposant non rationnel) d'exposant entier |k| ≥ 2 en `base^{k·u}` mis au propre. `eˣ·eˣ → e^{2x}`, `3eˣ·2eˣ → 6e^{2x}`, `(eˣ)²·eˣ → e^{3x}`, `e^{x+1}·e^{x+1} → e^{2(x+1)}`, `2ˣ·2ˣ → 2^{2x}`, `(eˣ)³/eˣ → e^{2x}`, `1/(eˣ·eˣ) → 1/e^{2x}` ; gardés : `(eˣ)²` tapé, `x^x·x^x → (x^x)²`, `(eˣ+1)(eˣ+1) → (eˣ+1)²`. Tests : 18 rouges sur 45 sans le correctif (`tidy-exponentielles-regroupees`). Suite serveur complète : verte (60 621), aucune attente ne dépendait de `(eˣ)²`. Banc des modèles de la prod (19 254 tirages, base contre branche) : aucun changement.
