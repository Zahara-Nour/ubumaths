---
title: Produit scalaire 1re SPE — questions
date: 2026-10-02
status: 13 modèles en brouillon (2026-10-02)
---

# Produit scalaire 1re SPE — point de reprise

## Commande de David (2026-10-02)

« go pour le produit scalaire ». Aucun modèle de géométrie n'existait. Décisions validées (« ok ») :

1. Pas de repère : coordonnées données dans le texte ; bloc `figure (sans axes ni grille) pour
illustrer. Un repère pour `figure = chantier séparé éventuel (géométrie repérée).
2. `\lVert … \rVert` interdit (sort « lVert » en PDF) ; `\|\vec u\|` fonctionne.
3. Étiquettes de points qui se chevauchent sur une petite figure : l'agent cherche l'option de
   position du DSL ; si elle ne suffit pas, il RAPPORTE avant de toucher geometry-core.
4. Réponses : forme exacte simplifiée (`a\sqrt b`, dénominateur rationnel) annoncée dans l'énoncé ;
   `acceptDecimal` ; `precision` pour les arrondis (longueur au dixième, angle au degré) ; angles en
   degrés (`45`, `45^\circ`, `45°` acceptés ; `\frac{\pi}{4}` refusé).
   Mesuré : `\sqrt{20}` et `\frac{1}{\sqrt2}` = mauvaise forme ; `\frac{-7}{2}`, `\sqrt5\times2` = non optimal.
5. Nouveau thème « Géométrie », domaine « Produit scalaire » : Calculer un produit scalaire,
   Propriétés, Angles et longueurs, Lieux de points (déclaré dans `category-order.ts`).
6. Exclus : loi des sinus, concourance des hauteurs / médianes (approfondissements).

## Modèles (`scripts/questions/produit-scalaire-1spe/`)

| Sous-domaine                 | Fichiers                                                                                                               |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Calculer un produit scalaire | A-01 coordonnées, A-02 normes et angle, A-03 projection (figure), A-04 normes seules, A-05 choisir la méthode (figure) |
| Propriétés                   | B-01 bilinéarité, B-02 ‖u+v‖² et ‖u−v‖², B-03 orthogonalité                                                            |
| Angles et longueurs          | C-01 angle de deux vecteurs, C-02 Al-Kashi longueur (figure), C-03 Al-Kashi angle (figure)                             |
| Lieux de points              | D-01 cercle de diamètre [AB], D-02 MA·MB = k                                                                           |

**13 modèles créés en BROUILLON en production le 2026-10-02.** `question:specs` 190/190 ;
150 tirages par variation (7 350 instances) recalculés en Python, 0 écart ; 1 200 + 2 400 figures
passées par `buildFigureScene` sans erreur, longueurs/angles tracés conformes à l'énoncé ; PDF
compilés (compilateur de prod), pages relues.

Figures : le DSL ne règle pas la position du nom d'un point → noms posés par `texte()` (droits,
pas en italique ; ancrage écran ≠ PDF). Ajout possible à geometry-core (non fait) :
`point(…, etiquette="haut-gauche")`, `texte(…, ancre=…)` aligné écran/PDF.

Points à relire : A-02 sans 90° ; C-01 n'atteint pas 30/60/120/150° par coordonnées entières
(travaillés par normes et u·v) ; C-03 v 120° : 4 triangles distincts ; B-03 v3 ne contrôle que u·v.
