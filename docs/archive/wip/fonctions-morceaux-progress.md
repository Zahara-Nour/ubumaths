# Chantier `fonctions-morceaux` — intervalle à paramètre dans l'Atelier

## Reprendre ici

_Mis à jour le 2026-11-28, après #3298 (chantier clos, journal archivé)._

- **État** : `origin/main` fusionné ; rendu vérifié à l'écran (`e2e/verifs/atelier-intervalle-parametre.spec.ts`, vert sur les 5 navigateurs de `test:verifs:tout`) ; revue `code-reviewer` (Opus) faite, findings 1, 2, 6 corrigés (22 tests) ; `check:incremental` 0, cliquet tenu ; #3298 mergée.
- **Prochaine action** : aucune ; doc durable dans `docs/systeme/atelier.md`. Une réponse « oui » de David à (a) ou (b) ouvre un nouveau chantier.
- **En attente de David** : (a) `j = f(3)` reste juste quand le curseur sort 3 de l'ensemble de f (trou d'avant la PR, contrôle seulement à la création) : à corriger ? (b) `ℝ \ {k}` refusé (la phase 0 parle de bornes) : à couvrir ?
- **Pièges en cours** : `recomputeAll` repasse UNE fois si les ensembles à paramètre changent (`#recomputingAgain`) ; une relecture (`#restoringObjects`) ou un ensemble gardé par `update` n'est pas jugé sur les valeurs du moment.
- **Worktree / branche** : `../ubumaths-wt-fonctions-morceaux` · `feat/fonctions-morceaux`.

## Demande

« f(x)=x sur [k;5] » : un paramètre dans le domaine de définition ; changer le curseur de k
redessine la courbe.

## Phase 0 (validée par David le 2026-11-28, « ok » à mes recommandations)

- **Nominal** : `k = 2`, `f(x)=x sur [k;5]` → tracée de 2 à 5 ; curseur à 3,5 → de 3,5 à 5.
  `.résoudre`, `.variations`, le refus de `f(1)`, les fonctions qui citent f suivent la valeur du moment.
  Le champ garde l'écriture `[k;5]`.
- **Limites** : k absent → f attend k (offre de curseur) ; bornes calculées acceptées dès cette PR
  (`[k+1;5]`, `[-a;a]`, `[0;2k]`, `\frac{k}{2}`).
- **Q1 tranchée** : curseur qui rend l'ensemble impossible → **carte en erreur + courbe effacée**,
  message avec la valeur (« L'intervalle est vide (k = 6). », « réduit à un point (k = 5) »,
  « √x n'est pas défini sur tout [−1 ; 5] … (k = −1) ») ; retour automatique quand k revient.
  À la création avec une valeur déjà impossible : refus, rien de créé.
- **Q2 tranchée** : bornes calculées acceptées tout de suite.

## Ce qui est fait

- `parseStudentDomain` : option `bound` (borne lue → valeur), passée le long des intervalles et
  des points exclus.
- `interval.ts` : `intervalNamesOf`, `readInterval(…, values)`, `checkInterval(…, values)` (refus
  suffixé « (k = 6) »), `renamedInInterval`, `intervalDomainOf` lit `parameterInterval`,
  `intervalFieldLatex` rend l'écriture.
- `atelier.svelte.ts` : les noms des bornes sont des références de f (attente, dépendance,
  cycle), `#intervalValues`, `#parameterIntervalsNow` / `#applyParameterIntervals` dans
  `recomputeAll`, refus en erreur propre, renommage de k suivi dans l'intervalle.
- `FunctionObject.parameterInterval` (transitoire, jamais sauvegardé) ; mémos `engine.ts` et
  `formula.ts` le comptent.

## Revue (2026-11-28, `code-reviewer` Opus)

- **Corrigé** : (1) Annuler / rechargement avec k qui rend l'ensemble impossible effaçait `sur [k;5]` → `#restoringObjects`, l'écriture fait foi ; (6) formule de f non modifiable dans ce cas → ensemble gardé par `update` non rejugé ; (2) le champ de la carte écrivait `]0;k]\{1}`, illisible → mêmes réécritures que l'ensemble numérique (`\setminus`, `\{ \}`, `\pi`).
- **Laissé, question à David** : (3) `ℝ \ {k}` refusé (points exclus de `parseSetNotation` sans l'option `bound`) ; (4) `j = f(3)` reste juste quand le curseur sort 3 de l'ensemble (existait avant).
- **Laissé, mineur** : (5) borne non calculable (`[1/k;5]`, k = 0) → refus générique « Je n'ai pas su lire l'intervalle », sans la valeur.
