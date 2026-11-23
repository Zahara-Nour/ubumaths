---
title: Géométrie repérée 1re SPE — questions
date: 2026-10-03
status: 12 modèles en brouillon (2026-10-03)
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

| Sous-domaine                         | Fichiers                                                                                                                      |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Vecteur normal et équation de droite | A-01 lire un vecteur normal, A-02 point + vecteur normal, A-03 perpendiculaire, A-04 médiatrice, A-05 hauteur                 |
| Projeté orthogonal                   | B-01 coordonnées du projeté, B-02 distance point-droite                                                                       |
| Équation de cercle                   | C-01 centre + rayon, C-02 centre + point / diamètre, C-03 forme développée, C-04 est-ce un cercle ?, C-05 point sur le cercle |

**12 modèles créés en BROUILLON en production le 2026-10-03.** `question:specs` 170/170 ;
150 tirages par variation (5 850) recalculés en Python, 0 écart ; figures en repère sans erreur
sur tous les tirages, tout dans la fenêtre ; PDF compilés (prod), pages relues.

Limites et points à relire :

- Vecteur normal : un vecteur colinéaire est refusé (pas de réponse « vecteur ») → consigne « le
  vecteur lu sur l'équation » ou coordonnée imposée.
- Réduite exigée : pentes entières seulement (A-02, A-04, A-05 ; A-05 v1 : dy = −1).
- B-02 : distances toujours irrationnelles. C-03 v3 : r = 1/2 possible (petit cercle).
- C-05 v2 (intérieur / extérieur) : dans l'esprit du programme, pas une capacité listée.
- Moteur : coefficients « 1x » dans un `expectedAnswer` à variables (pas de modificateur
  « coefficient ») ; `Ω` refusé comme nom de point ; `\iff\ &` casse le PDF ; « n⃗ » en texte de
  figure illisible au PDF.

## cleanCoefficients activé (2026-10-03)

`shared.cleanCoefficients: true` (`1x` → `x`, `+0` retiré, `+-` → `-`) ; exclusions de ±1 / 0 qui ne servaient qu'à l'affichage levées. Vérifié : specs vertes (150 tirages), 300 tirages par variation sans `1x`, `0x`, `+-`, `--` dans le rendu (les `4+0`, `-1-0` restants sont des étapes de calcul voulues).

- A-02 à A-05 : coefficients et écarts dès 1 ; retirées `c != 0` / `cp != 0` (droite par l'origine possible) ; A-03 v1 : `abs(m) == 1 || q != 0`.
- C-01 v1, C-02 v3 : cercle passant par l'origine permis (terme constant nul). C-03, C-04, C-05 : `c != 0` retirée ; C-03 v3 : `abs(al) > 1`, `g != 0` retirées.
- Gardé : vecteur normal non nul, triangle non dégénéré.
