# Chantier `tidy` — journal

## Reprendre ici

_Mis à jour le 2026-10-20, PR #1559 ouverte, règle d'ordre codée, revue opus à faire._

- **État** : #1559 (`feat/tidy-fractions`). Livré : fraction de sommes irréductible ; produit sans dénominateur réduit ; deux termes : le positif devant ; signe sorti d'un facteur à tout degré ; − d'une fraction absorbé par un numérateur de deux termes, y compris opérande d'une somme (restriction `90f5ece78` annulée) ; ordre : dans chaque groupe de signe, termes simples d'abord puis ceux qui contiennent une somme, le degré après (`1+(1−2x)/3`, `2x+3(x+1)`, `x²+3+2(x+1)`, `−x²+1+x(x+1)`) — validé par David. Suite serveur verte, aucun test existant changé.
- **Prochaine action** : revue opus, CI, merge.
- **Chantiers suivants (phase 0)** : (1) **dérivée finale en mode auto** : David veut `3x²+2x` et non `2x(x+1)+x²` en fin de dérivation (`tidyTerms` ne développe jamais ; Atelier carte f′, `withTidyStep`, variations — affichage seulement, le calcul du signe garde la forme factorisée —, `.diff`) : « on verra plus tard » ; (2) complexes en a+ib via `evaluate` exact — décidé : `i²` → `−1`, `|1+i|` → `√2`, garder `e^{iπ/3}` ; (3) option de domaine de `tidy` (`AnswerAssumptions`, ADR 0012) — 4 questions ouvertes ; (4) grapheur : `simplify` perd-il trou / domaine ? ; (5) relevé : quels appelants affichant un résultat final devraient appeler `simplify` plutôt que `tidy` ?
- **Worktree / branche** : `../ubumaths-wt-tidy` · `feat/tidy-fractions`.

## Historique

- 2026-10-20 : but de `tidy` clarifié avec David (mise au propre d'un calcul, jamais de développement ; `simplify` développe si moins cher) ; restriction annulée ; ordre « termes simples d'abord » codé (recos 1 et 2 validées).
- 2026-10-20 : décisions a/b implémentées ; 3e tour sur le signe et l'ordre (deux termes, facteur, fraction) ; revue opus : collision de signe corrigée, `1−(2x−1)/3` réordonné → restreint à tort (voir en tête).
- 2026-10-20 : inventaire de `tidy` (fait / ne fait pas), constat : la validation passe par `checkForm`, jamais par `tidy`. Décisions de David : `(2x+1)/3` (une seule barre), `(1−2x)/3` pour le signe, `(x+2)/6` pour les fractions internes, tableau d'exemples validé.
- 2026-10-20 : revue opus de la 1re version — 2 bloquants (annulation par une somme, non-idempotence) + un développement (`(x+1)/(1/2) → 2x+2`) ; réécrite au niveau du terme, cas de la revue ajoutés aux tests.
- 2026-10-20 : 2e revue opus — aucun bug ; corrigé : deux sommes égales du même côté se multiplient (`(6x+3)(4x+2)/12 → (2x+1)²/2`), dénominateur nul = pas de réduction.
- 2026-10-20 : `tidy` ne simplifie pas `e^{ln x}` (identité + domaine, décision du 2026-10-05) ; `simplify` le fait sans condition.
