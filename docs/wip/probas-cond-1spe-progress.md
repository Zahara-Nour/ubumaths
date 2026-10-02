---
title: Probabilités conditionnelles 1re SPE — questions
date: 2026-10-02
status: 14 modèles en brouillon (2026-10-02)
---

# Probabilités conditionnelles 1re SPE — point de reprise

## Commande de David (2026-10-02)

Thème suivant après suites, exponentielle, trigonométrie, dérivation. Aucun modèle de 1re n'existait
(2 modèles de 6e dans « Probabilités › Apprivoiser »). Décisions (« je te suis ») :

1. Réponses attendues écrites en FRACTION avec `acceptDecimal` (fraction et décimal exacts justes ;
   arrondi refusé). `acceptDecimal` ne marche que dans ce sens (décimal attendu → fraction = mauvaise forme).
2. Pourcentage refusé comme réponse (`18\%` pour 0,18 : mauvaise forme) ; il reste dans l'énoncé.
3. Pas de lot 0 : bloc ```probtree prêt (une branche « ? » s'affiche sans compter comme une case),
   tableaux croisés affichés (#607) et à cellules tirées (#609).
4. Thème « Probabilités », domaine « Probabilités conditionnelles » : Tableaux croisés, Arbres
   pondérés, Indépendance, Problèmes en contexte.

## Modèles (`scripts/questions/probas-cond-1spe/`)

| Lot | Contenu                                                                                       |
| --- | --------------------------------------------------------------------------------------------- |
| A   | Tableaux croisés (P(A∩B), P_A(B), P_B(A)) ; Indépendance (test, épreuves successives, P(A∪B)) |
| B   | Arbres pondérés (branche, chemin, probabilités totales, P_B(A), construire l'arbre)           |
| C   | Problèmes en contexte (dépistage, contrôle qualité)                                           |

**14 modèles créés en BROUILLON en production le 2026-10-02** (A : 6, B : 5, C : 3). Chacun :
`question:specs` vert, 150 tirages par variation, réponses recalculées en Python (fractions exactes,
arrondi « moitié loin de zéro ») ; arbres : 200 tirages par variation lus comme `probability-tree`,
branches de somme 1 ; PDF compilés 4/4, pages relues.

Décisions ajoutées (« je te suis », 2026-10-02) :

- `spaces: off` sur les 14 modèles : `0,0925` ou `\frac{29}{1000}` sans espace des milliers étaient
  « non optimaux » (plus de la moitié des tirages de dépistage) ; la règle reste active ailleurs.
- `0,30` pour un arrondi au centième reste « non optimal » (zéro inutile) ; tirages concernés exclus.

Pièges relevés :

- Bloc ```probtree : une ligne `root:` SANS étiquette rend tout l'arbre invalide (affiché en code brut).
- Dans un `$…$`, préférer `P_{F}(C)` (accolades) ; `P_A(B)` vérifié correct à l'écran et en Typst.
- Arrondi : `precision: {type: decimal, digits: 2}` ; tirages à moins de 0,01 d'un demi exclus.
- Espaces insécables dans « … » (évitent un guillemet seul en fin de ligne dans le PDF).
