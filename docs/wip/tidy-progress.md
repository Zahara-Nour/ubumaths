# Chantier `tidy` — journal

## Reprendre ici

_Mis à jour le 2026-10-20, PR #1559 ouverte, NE PAS MERGER (décision d'ordre en attente)._

- **État** : #1559 (`feat/tidy-fractions`), dernier commit `90f5ece78`. Livré : fraction de sommes irréductible ; produit sans dénominateur réduit (`4(x/2+1)` → `2(x+2)`) ; deux termes : le positif devant, partout (`3x−x²`, `1−x²`, sauf complexe : `−1+1/i`) ; signe sorti d'un facteur dont le terme de gauche est négatif, à tout degré (`(−x²−1)²` → `(x²+1)²`) ; − d'une fraction absorbé par un numérateur de deux termes (`−(2x−1)/3` → `(1−2x)/3`). Révise la règle du 2026-10-06 (validé par David).
- ⚠️ **Erreur à défaire** : `90f5ece78` restreint l'absorption à une fraction SEULE (`1−(2x−1)/3` inchangé) — décidé sans David, qui veut `1 + (1−2x)/3`. À retirer.
- **En attente de David** : règle d'ordre. Ma recommandation (B généralisé) : dans chaque groupe de signe, les termes simples d'abord, puis ceux qui contiennent une somme — `1+(1−2x)/3`, `2x+3(x+1)` (aujourd'hui `3(x+1)+2x`), `x²+x(x+1)`, `3+(x+1)/2` ; `(2x+1)/3−1` reste. Écartée : A (place écrite gardée, dépend de l'écriture). Aussi : la faire dans #1559 (recommandé) ou après.
- **Prochaine action** : après la réponse, retirer la restriction, coder l'ordre, mesurer les tests qui changent et MONTRER la liste à David avant de commiter, revue opus, CI, merge.
- **Chantiers suivants (phase 0)** : (1) complexes en a+ib via `evaluate` exact sur les sous-expressions sans variable — décidé : `i²` → `−1`, `|1+i|` → `√2` (compléter `evaluate`), garder `e^{iπ/3}` ; (2) option de domaine de `tidy` (`AnswerAssumptions`, ADR 0012) — 4 questions ouvertes : vocabulaire (5 hypothèses ou intervalles), `(2x+2)/(4(x+1))` → `1/2` si x>0, qui transmet le domaine, PR à part ; (3) grapheur : `simplify` perd-il trou / domaine ?
- **Worktree / branche** : `../ubumaths-wt-tidy` · `feat/tidy-fractions`.

## Historique

- 2026-10-20 : décisions a/b implémentées ; 3e tour sur le signe et l'ordre (deux termes, facteur, fraction) ; revue opus : collision de signe corrigée, `1−(2x−1)/3` réordonné → restreint à tort (voir en tête).
- 2026-10-20 : inventaire de `tidy` (fait / ne fait pas), constat : la validation passe par `checkForm`, jamais par `tidy`. Décisions de David : `(2x+1)/3` (une seule barre), `(1−2x)/3` pour le signe, `(x+2)/6` pour les fractions internes, tableau d'exemples validé.
- 2026-10-20 : revue opus de la 1re version — 2 bloquants (annulation par une somme, non-idempotence) + un développement (`(x+1)/(1/2) → 2x+2`) ; réécrite au niveau du terme, cas de la revue ajoutés aux tests.
- 2026-10-20 : 2e revue opus — aucun bug ; corrigé : deux sommes égales du même côté se multiplient (`(6x+3)(4x+2)/12 → (2x+1)²/2`), dénominateur nul = pas de réduction.
- 2026-10-20 : `tidy` ne simplifie pas `e^{ln x}` (identité + domaine, décision du 2026-10-05) ; `simplify` le fait sans condition.
