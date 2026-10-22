# Chantier `simplify-carte` — une intention, un nom

## Reprendre ici

_Mis à jour le 2026-10-22, après Q7 (§ 27) : les 12 questions sont tranchées._

- **État** : phase 0. Relevé (§ 1-4), S1-S4 validées (§ 6), table contexte → forme (§ 7), « comparer » a deux sens (§ 8), `normalize` pour afficher (§ 9, reformulé), validation ↔ `tidy` (§ 10), test « `tidy` passe le juge » mergé (#1609 : 67/70, seul écart = espaces dans les nombres, § 11), identités de `normalize` / `equivalenceForm` et `normalize` dans `evaluate` (§ 12). **Tranché : A** (§ 13), une fonction « valeur exacte à afficher », `evaluate` inchangé ; **E1 oui** (§ 14), toute correction passe le juge sans remarque, toutes règles actives ; **E2** (§ 15), espace facultative à 4 chiffres, obligatoire dès 5, des deux côtés de la virgule ; **§ 10 → module de règles partagé** (§ 16) ; **D1** (§ 17, révisée) : f′ finale réduite + exponentielle commune en facteur, sans passer par `auto` ; **D2** (§ 18) : f′ factorisée dans le tableau de variations ; **D3** (§ 19) : dans Calcul, numérique calculé, littéral mis au propre en gardant l'ordre ; **D4** (§ 20) : réglage facultatif « forme de la réponse finale » sur les modèles de dérivée et de primitive, + test « correction passe le juge » si `requiredForm` aussi ; **Q4** (§ 21) : « `auto` ne factorise jamais » vise le résultat, une étape peut factoriser pour simplifier une fraction, avec la condition affichée ; **§ 9** (§ 23) : `normalize` retiré de l'affichage des expressions avec variable (développer à l'écran = règles du moteur pédagogique), gardé pour comparer et calculer en interne ; `réduire` ne développe pas (contrat de fusion confirmé) ; **Q5** (§ 24) : `normalize` garde son nom ; **Q6** (§ 25-26) : trois fonctions numériques (valeur sûre `number | null` en rationnels, variante ±∞/échec, `compile` pour les boucles), aucun résultat changé ; bug `sin²` des limites trouvé ; **Q7** (§ 27) : code mort supprimé dans un premier lot à part, classe `Exp` entière comprise.
- **Page de synthèse pour David** : https://claude.ai/artifact/R58U2RADzLk3AMZYZ4TEJs — 12 questions détaillées, 12 tranchées sur 12. Pour la modifier : `Artifact read` (la source locale ne survit pas au `/clear`), Edit du fichier rendu, puis republier sur la même `url`. Toute nouvelle section du journal doit y être reportée.
- **Prochaine action** (demandée par David pour la session suivante) : lot « code mort » (Q7, § 27), dans un worktree `ubumaths-wt-simplify-carte`, branche `refactor/simplify-carte-code-mort` ; puis faire valider l'ordre des lots (fin de la page).
- **En attente de David** : validation de l'ordre des lots (après le lot code mort).
- **Pièges en cours** : ne pas re-proposer ce qui est figé (§ 0, et la convention de domaine du 2026-09-20 : élargir est permis pour comparer) ; bugs du § 4 et du § 10 à confirmer par un test rouge ; ne pas affirmer qu'une étape est « muette » sans l'avoir vu à l'écran (`exp-ln-inverse` est enregistrée).
- **Worktree / branche** : aucun pour l'instant (à créer pour le lot code mort).

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
