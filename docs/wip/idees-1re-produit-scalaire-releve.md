# Relevé « produit scalaire » de Première spécialité (2026-11-26)

Chantier [`idees-1re-produit-scalaire`](idees-1re-produit-scalaire-progress.md) · [fiches de phase 0](idees-1re-produit-scalaire-fiches.md).
Les 10 exercices de la rubrique 1G1 de l'autre plateforme ont été lus dans leur code source
(copie locale), puis comparés à nos modèles de 1re spé en prod (lecture seule) : 25 modèles publiés sur
les nœuds « expressions du produit scalaire », « propriétés », « angles et longueurs » et
« projeté orthogonal ». Les ids sont ceux de l'autre plateforme.

**Bilan** : 7 ✅, 10 🟡, 4 ❌ (21 cas, parce qu'un exercice en a souvent plusieurs). Le produit scalaire est déjà bien
couvert. Il manque des figures (parallélogramme, figure à points régulièrement espacés,
quadrillage), des vecteurs qui ne partent pas du même point, et deux exercices de synthèse dans
un repère.

| Id     | Cas                                | Ce qu'on demande                                                                                                                                    | Forme de réponse           | Modèle(s) Chiphre                                                   | Verdict                                                           |
| ------ | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 1G10-1 | 1 : formule                        | Triangle, AB et AC de 2 à 12, angle en A parmi 30°, 45°, 60°, 120°, 135°, 150°, 180° (ou en radians) : AB·AC                                        | saisie, valeur exacte      | ba8ae428 (v1 à v4, degrés et radians)                               | ✅                                                                |
| 1G10-1 | 2 : parallélogramme                | Parallélogramme ABCD (côtés 3 à 6 et 4 à 8, angle en A de 30°, 45° ou 60°) : 10 produits AB·AD, AB·BC, AB·CB, DC·BC, DA·DC, AD·DC…                  | saisie, valeur exacte      | aucun ; b73923a1 ne fait que carré, rectangle, triangle équilatéral | ❌ angle supplémentaire et vecteur opposé dans un parallélogramme |
| 1G10-2 | 1 : rectangle                      | Rectangle ABCD de centre O, I milieu de [AB] : AB·AC, AB·AO, CA·AI, AB·OD, CB·CI, OC·BI, ID·BC (le code ne tire que le dernier)                     | saisie                     | b73923a1 v3 (rectangle, sans centre ni milieu)                      | 🟡 rectangle avec centre et milieu                                |
| 1G10-2 | 2 : triangle et hauteur            | Triangle, H pied de la hauteur, AH, HB, HC donnés : AB·AC, AB·CA, BA·AC, HB·AC…                                                                     | saisie                     | 9c7f7ef0 (v1 à v4 : AB·AC avec H entre ou hors de [AB])             | 🟡 vecteurs de sens opposés (BA·AC, HB·CA)                        |
| 1G10-2 | 3 : figure complexe                | Points régulièrement espacés sur [AB], figure à 7 points : AB·DE, AD·CF, CE·DB, DC·BH par projection                                                | saisie                     | aucun                                                               | ❌ projection sur une figure graduée                              |
| 1G10-3 | —                                  | Quadrillage, unité = un carreau : AB·AC, AB horizontal, vertical ou penché ; C projeté de même sens, de sens opposé, ou angle droit (0)             | saisie                     | aucun ; 7bf472bc est un QCM de cours                                | ❌ projection lue sur un quadrillage                              |
| 1G10-4 | 1 : formule                        | ‖u‖, ‖v‖, ‖u − v‖ (ou ‖u + v‖) entiers : u·v                                                                                                        | saisie                     | d787d8c0 v1, v2 ; affe59f7                                          | ✅                                                                |
| 1G10-4 | 2 : triangle, même origine         | Triangle aux trois côtés donnés (figure) : AB·AC                                                                                                    | saisie                     | d787d8c0 v3                                                         | ✅                                                                |
| 1G10-4 | 3 : triangle, origines différentes | Même triangle : BA·AC (= −AB·AC) ou BA·CA                                                                                                           | saisie                     | d787d8c0 v3 (même origine seulement)                                | 🟡 signe quand les vecteurs ne partent pas du même point          |
| 1G10-5 | 1 : points                         | A, B, C (coordonnées de −10 à 10) : AB·AC                                                                                                           | saisie                     | fe407c88 v2                                                         | ✅                                                                |
| 1G10-5 | 2 : vecteurs                       | u, v (coordonnées de −10 à 10) : u·v                                                                                                                | saisie                     | fe407c88 v1                                                         | ✅                                                                |
| 1G10-5 | 3 : combinaisons                   | (k u)·v, u·(v + w), u·(v − w), coordonnées données                                                                                                  | saisie                     | fe407c88 (aucune combinaison) ; d520539a (sans coordonnées)         | 🟡 combinaisons linéaires en coordonnées                          |
| 1G10-5 | 4 : graphique                      | u et v dessinés dans un repère quadrillé : u·v                                                                                                      | saisie                     | aucun                                                               | 🟡 coordonnées lues sur la figure                                 |
| 1G11-1 | 1 : droites perpendiculaires       | A, B, C, D : montrer que (AB) ⊥ (CD)                                                                                                                | rédaction (non interactif) | f2cc01fc v4 (AB et AC, même origine)                                | 🟡 quatre points, deux droites                                    |
| 1G11-1 | 2 : triangle rectangle             | A, B, D : montrer que ABD est rectangle en A                                                                                                        | rédaction                  | f2cc01fc v4 ; 2bfbf2fc v3                                           | ✅                                                                |
| 1G11-1 | 3, 4 : rectangle                   | Rectangle ABCD (longueur, largeur données), AE = k·AD, AF = k′·AB : montrer (EC) ⊥ (DF), sans repère (Chasles) puis avec repère                     | rédaction                  | 6058963e (carré et milieux, diagonales d'un rectangle)              | 🟡 rectangle et points placés par une fraction                    |
| 1G11-2 | 1, 2 : angle                       | A, B, C (−5 à 5) : AB·AC, AB, AC, puis BAC au dixième de degré, avec ou sans questions intermédiaires                                               | saisie, arrondi au dixième | bf5dadf6 v2 (valeur remarquable exacte), v4 (vecteurs, au degré)    | 🟡 trois points et angle quelconque au dixième, en étapes         |
| 1G11-2 | 3 : graphique                      | Même chose, A, B, C lus sur la figure                                                                                                               | saisie                     | aucun                                                               | 🟡 points lus sur la figure                                       |
| 1G11-3 | —                                  | Al-Kashi : un côté à 0,1 près (deux côtés et l'angle compris, sur une figure)                                                                       | saisie, arrondi            | 721324f9 v3, v4 (angle multiple de 5°, au dixième)                  | ✅                                                                |
| 1G12-1 | synthèse                           | A, B, C dans un repère : AB·AC, AD (D projeté de C sur (AB)), hauteur CD, aire de ABC                                                               | 4 saisies, valeurs exactes | f6c423de v3 (distance de A à (BC) seule)                            | 🟡 chaîne produit scalaire → projeté → hauteur → aire             |
| 1G12-2 | synthèse                           | Triangle inscrit (points entiers d'un cercle de centre K) : AB·HC = AC·HB = 0, H orthocentre, K centre du cercle circonscrit, G, alignement G, H, K | rédaction, 1 saisie (G)    | d33f98d5 (démonstration de la concourance, sans coordonnées)        | ❌ droite d'Euler dans un repère                                  |

## Ce que leur format fait et que le nôtre ne fait pas

Rien. Les figures (parallélogramme, quadrillage, vecteurs dessinés, figure à points espacés)
s'écrivent avec le bloc `figure` (`grille: oui`, `vecteur(...)`, `polygone`, `angle`, `marque_segment`).
Leurs « montrer que » deviennent chez nous des calculs à saisir (le produit scalaire vaut 0, le rapport
de colinéarité), ce que nos modèles 6058963e et d33f98d5 font déjà.

## Programme

Toutes les idées sont au programme de 1re spé (BO, `1_SPE.md`, « Calcul vectoriel et produit
scalaire ») : projection, cosinus, normes, coordonnées, orthogonalité, angle, longueur, choix de la
méthode, problème géométrique. La droite d'Euler n'est pas citée par le BO : c'est un problème
géométrique (« Utiliser le produit scalaire pour résoudre un problème géométrique », 1SPE-436), comme
la concourance des hauteurs (1SPE-325).
