# v2 lot 2, PR (c) — `.filtrer`

Branche `feat/atelier-filtrer`. Décision Q90 (`outils-statistiques-v2-progress.md`).

- `.filtrer <critère>` compte les individus ; `.filtrer N si <critère>` crée la liste des valeurs
  de N (entrées recopiées telles que tapées). Critère : `=`, `≠`/`!=`, `<`, `>`, `≤`/`<=`, `≥`/`>=`,
  `et`, `ou`, `non`, parenthèses (ET avant OU) ; analyseur descendant dans atelier/filter.ts.
- `.croiser` se termine par une piste « Pour filtrer : … » quand les modalités se citent telles quelles.
- Revue : une liste TROUÉE (`12 ; ; 15`, `1/0`) décalait les individus en silence (la note d'un
  autre élève rendue) → refusée avec la place du trou, par `.filtrer` et `.croiser`
  (`individualEntries`) ; `and` s'affichait au lieu de « et » ; garde du catalogue limitée à
  `.filtrer` et à sa forme de comptage ; « pour le seul individu ».
- Limite : une modalité qui contient « et », « ou » ou une parenthèse ne se cite pas dans un critère.
