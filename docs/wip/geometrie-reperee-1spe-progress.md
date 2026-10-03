---
title: Géométrie repérée 1re SPE — questions
date: 2026-10-03
status: en cours (rédaction des modèles)
---

# Géométrie repérée 1re SPE — point de reprise

## Commande de David (2026-10-03, « oui »)

Décisions validées :

1. « Une équation cartésienne » : toute équation de la droite est juste (`y=2x+1` compris) ; seule
   « l'équation réduite » impose une forme (`requiredForm: "reduite"`).
2. Cercle : multiple de l'équation → `unoptimal_form` ; forme développée, membres échangés → juste.
3. Lot 0 livré avant la rédaction : réponse `answerKind: "equation"` (#683) ; axes, grille et
   graduations du bloc ```figure (#681 : `axes: oui`, `grille: 1`, `graduations: …`).
4. Thème « Géométrie », domaine « Géométrie repérée » : Vecteur normal et équation de droite,
   Projeté orthogonal, Équation de cercle (déclaré dans `category-order.ts`).
5. Exclus : approfondissements (points équidistants d'un axe et d'un point, intersection avec une
   parabole).

Limites connues des figures : au PDF, les objets ne sont pas découpés à la fenêtre (garder cercles
et points dans le cadre) ; `e` est une constante réservée du DSL.

## Modèles (`scripts/questions/geometrie-reperee-1spe/`)

À rédiger (~11-12).
