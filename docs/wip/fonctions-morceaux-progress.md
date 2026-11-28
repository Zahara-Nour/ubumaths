# Chantier `fonctions-morceaux` — intervalle à paramètre dans l'Atelier

## Reprendre ici

_Mis à jour le 2026-11-28, avant la PR._

- **État** : phase 0 validée ; tests (`intervalle-parametre.test.ts`, 18) et code écrits, verts ; suites atelier + domaines + grapheur vertes (8 532) ; `check:incremental` 0 erreur.
- **Prochaine action** : vérifier le rendu à l'écran (curseur qui déplace la borne, Playwright sur le serveur 5177 du worktree), `types:cliquet`, doc `docs/systeme/atelier.md` (§ intervalle), revue `code-reviewer` en `model: opus` (le parseur de mathAST est touché), puis PR.
- **En attente de David** : rien.
- **Pièges en cours** : `recomputeAll` lit les ensembles à paramètre avec les valeurs du passage d'avant et repasse UNE fois s'ils changent (`#recomputingAgain`).
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
