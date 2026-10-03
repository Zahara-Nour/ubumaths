---
title: Logique 1re SPE — questions
date: 2026-10-03
status: en cours (rédaction des modèles)
---

# Logique 1re SPE — point de reprise

## Commande de David (2026-10-03, « fais le thème logique », puis « oui »)

Décisions validées :

1. Nouveau thème « Logique » : domaines « Ensembles » (Appartenance et inclusion, Opérations sur
   les ensembles, Intervalles, Cardinal et produit cartésien) et « Logique et raisonnement »
   (Connecteurs et contre-exemples, Implication et équivalence, Quantificateurs et négation,
   Raisonnements) — déclaré dans `category-order.ts`.
2. Contre-exemple : case libre, `rulesSuffice: true` + règle `custom` (`answer^2 <= answer`) ; tout
   contre-exemple valable accepté (mesuré). Lot 0 en parallèle (`fix/regle-suffit-fraction`) : une
   fraction irréductible (`\frac{1}{2}`) acceptée, aujourd'hui « mauvaise forme ».
3. Quantificateurs en mots (« pour tout réel x », « il existe »), sans ∀ ni ∃ (non exigibles).
4. Raisonnements (absurde, contraposée, disjonction des cas) : reconnaissance par QCM seulement.
5. Ensembles : réponse `answerKind: "intervalles"`, séparateur point-virgule `\{1;3;5\}` annoncé
   dans l'énoncé (virgule refusée : virgule décimale). Mesuré : ordre et doublons indifférents,
   `\varnothing` = `\{\}`, `\{7\}\cup[2;5]` accepté.

## Modèles (`scripts/questions/logique-1spe/`)

À rédiger (~13).
