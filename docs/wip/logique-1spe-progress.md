---
title: Logique 1re SPE — questions
date: 2026-10-03
status: 14 modèles en brouillon (2026-10-03)
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

| Domaine                 | Fichiers                                                                                                                                                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Ensembles               | A-01 appartenance (QCM multiple), A-02 inclusion (Vrai/Faux), A-03 ∩ ∪ complémentaire, A-04 intervalles, A-05 cardinal, A-06 couple et produit cartésien                                                                 |
| Logique et raisonnement | B-01 et/ou (Vrai/Faux), B-02 contre-exemple (rulesSuffice), B-03 implication, réciproque, contraposée, B-04 et/ou → intervalle, B-05 CN/CS, B-06 négation, B-07 identité / statut des lettres, B-08 type de raisonnement |

**14 modèles créés en BROUILLON en production le 2026-10-03.** `question:specs` 252/252 ;
150 tirages par variation recalculés en Python (vérité des propositions relue sur l'énoncé
rendu), 0 désaccord ; B-02 soumis au vrai validateur avec 65 réponses candidates par tirage ;
PDF fr/en compilés (prod).

Points à relire : A-01 (ℝ toujours juste et dernier, sans mélange) ; A-03 (rôles des éléments
fixes) ; A-06 (consigne « Coche toutes les bonnes réponses » même s'il n'y en a qu'une) ;
B-02 v0 (16 énoncés distincts) ; B-06 v3 (négation d'une implication quantifiée, limite du
programme ?) ; B-07 v1 (x de f(x) « variable », f_k « paramètre ») ; B-05 v1 (famille « ni CN ni
CS » artificielle) ; message de B-02 : l'élève voit « faux » sans la description de la règle.
À ajouter après le lot 0 (#706) : « pour tout x > 0, 1/x ≤ a » (contre-exemple naturel en fraction).
Non faisable : « n² + n + p premier » (pas de test de primalité dans une règle custom).
