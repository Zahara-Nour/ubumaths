# Chantier `tidy` — journal

## Reprendre ici

_Mis à jour le 2026-10-20, PR #1559 ouverte (CI en cours), deux décisions à implémenter._

- **État** : PR #1559 (`feat/tidy-fractions`) ouverte : `tidy` rend irréductible une fraction de sommes (`reduceFractionOfSums`, collect.ts, sur le terme ACCUMULÉ) ; spec `tidy-spec.md` réécrite ; 2 revues opus, la 2e sans bug ; suite serveur verte.
- **Prochaine action** : implémenter dans la MÊME PR les 2 décisions de David (2026-10-20), tests rouges d'abord, puis spec §A.1, CI, merge : (1) `(x/2+1/2)/(1/2)` → `x+1` — terme sans dénominateur (`2(x/2+1/2)`) : réduire si le PGCD commun > 1 (piste : `hasDenominator` faux → ne déclencher que si `common > 1`, ce qui garde `3(x/2+1)` ; effets : `4(x/2+1)` → `2(x+2)`, `6(x/2+1/3)` → `3x+2`, à montrer à David) ; (2) `(−6x²+3)/(−9)` → `(2x²−1)/3` (David avait écrit `(1−2x²)/3`, de valeur fausse — corrigé et signalé, à lui faire confirmer) : passage du signe étendu au-delà du degré 1 (piste : distribuer si le nombre total de signes − ne croît pas).
- **En attente de David** : confirmer `(2x²−1)/3` ; plus tard, le grapheur.
- **Pièges en cours** : la réduction se fait sur le terme ACCUMULÉ (`reduceFractionOfSums`), jamais sur la fraction écrite — la 1re version (sur l'écriture) cassait l'idempotence et simplifiait `(2x+2)/(4(x+1))` en `1/2` (revue).
- **À faire ensuite** : grapheur — `simplify` fait `(x²−1)/(x+1) → x−1` et `e^{ln x} → x` sans garder le domaine (valeur interdite −1, x > 0) ; la courbe (`simplifyExact`) perd-elle son trou / sa partie x ≤ 0 ?
- **Worktree / branche** : `../ubumaths-wt-tidy` · `feat/tidy-fractions`.

## Historique

- 2026-10-20 : inventaire de `tidy` (fait / ne fait pas), constat : la validation passe par `checkForm`, jamais par `tidy`. Décisions de David : `(2x+1)/3` (une seule barre), `(1−2x)/3` pour le signe, `(x+2)/6` pour les fractions internes, tableau d'exemples validé.
- 2026-10-20 : revue opus de la 1re version — 2 bloquants (annulation par une somme, non-idempotence) + un développement (`(x+1)/(1/2) → 2x+2`) ; réécrite au niveau du terme, cas de la revue ajoutés aux tests.
- 2026-10-20 : 2e revue opus — aucun bug ; corrigé : deux sommes égales du même côté se multiplient (`(6x+3)(4x+2)/12 → (2x+1)²/2`), dénominateur nul = pas de réduction.
- 2026-10-20 : `tidy` ne simplifie pas `e^{ln x}` (identité + domaine, décision du 2026-10-05) ; `simplify` le fait sans condition.
