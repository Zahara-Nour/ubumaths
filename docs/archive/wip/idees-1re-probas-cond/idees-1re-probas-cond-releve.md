# Relevé « probabilités conditionnelles » de Première spécialité (2026-11-24)

Chantier [`idees-1re-probas-cond`](idees-1re-probas-cond-progress.md). Les 8 exercices de la rubrique
1P1 de l'autre plateforme (1P10-1, 1P10-2, 1P11-1, 1P11-2, 1P12-1, 1P13-1, 1P14-1, 1P14-2) ont été lus
dans leur code source (copie locale, sans les `old`), puis comparés à nos modèles publiés en prod (MCP
en lecture seule : énoncés et cases des variations, points). Les ids sont ceux de la plateforme.

**Leur forme** : une saisie au clavier (un nombre décimal ou une fraction, parfois irréductible), de
une à six cases. 1P10-1 fait taper la notation (`P_A(B)`), 1P12-1 fait compléter l'arbre dans la
figure, et 1P13-1 conclut avec deux menus (« = / ≠ », « Oui / Non »). 1P14-1 et 1P14-2 sont des
problèmes d'E3C rédigés, sans saisie.

**Bornes** :

- [2de](../../../systeme/programmes/bornes/lycee/2de.md) : P_A(B), arbres et tableaux croisés
  d'effectifs ; **pas de probabilités totales**. Sur un arbre, on calcule un chemin et on lit les
  probabilités conditionnelles (décision l2-4).
- [1re spé](../../../systeme/programmes/bornes/lycee/1spe.md) : la formule des probabilités totales sur
  toute partition finie lisible sur un arbre, en calcul direct (décision l1s-4), et l'indépendance de
  deux évènements au plus.

## Nos modèles (prod, publiés)

| Id court | Titre                                                       | Var. | Point(s)                   |
| -------- | ----------------------------------------------------------- | ---- | -------------------------- |
| 31096bae | Traduire un énoncé en notations de probabilités (QCM)       | 4    | 2-395                      |
| 77d6fedc | Parmi les… : modéliser un tableau croisé ou un sondage      | 3    | 2-390 (+ TCOMP)            |
| 1cfc575d | Probabilité d'un chemin dans un arbre pondéré               | 3    | 2-399 (+ TSPE, TCOMP)      |
| d7507e78 | Probabilité conditionnelle sur un arbre                     | 2    | 2-397                      |
| 9d7c4d98 | Compléter une branche d'un arbre pondéré                    | 3    | 2-398 (+ TCOMP)            |
| cf548ea1 | Tableau croisé : intersection et probabilité d'un événement | 2    | 2-488                      |
| f3e68e4b | Tableau croisé : probabilité de A sachant B                 | 1    | 2-396 (+ TCOMP)            |
| 4016b05c | Tableau croisé : probabilités conditionnelles sachant A     | 2    | 2-396 (+ TCOMP)            |
| 94b22887 | Faux positifs : P_M(T) ou P_T(M)                            | 2    | 2-400                      |
| 5ba712bc | Formule des probabilités totales                            | 3    | 1SPE-340 (+ 1TECHNO, TTEC) |
| 69a05f98 | Probabilité « inverse » à partir d'un arbre                 | 3    | 1SPE-340 (+ TTECHNO)       |
| 6dd2f133 | Construire un arbre pondéré à partir d'un énoncé            | 2    | 1SPE-340 (+ 1TEC, TTEC)    |
| 2c116f4d | Contrôle qualité : d'où vient la pièce défectueuse ?        | 3    | 1SPE-340 (+ TTECHNO)       |
| a9c71276 | Test de dépistage                                           | 2    | 1SPE-340 (+ TTECHNO)       |
| e0520082 | Partition de l'univers                                      | 4    | 1SPE-337                   |
| 21f42c7f | Indépendance de deux événements (QCM de cours)              | 2    | 1SPE-336 (+ 1GEN, 1TEC)    |
| ebe7e788 | Tester l'indépendance de deux événements (QCM)              | 3    | 1SPE-424 (+ 1GEN, 1TEC)    |
| 36010981 | Probabilité d'une réunion d'événements indépendants         | 2    | 1SPE-341 (+ 1GEN, 1TEC)    |
| d5780995 | Deux épreuves indépendantes : « au moins une fois »         | 2    | 1SPE-338 (+ 1GEN, 1TEC)    |
| ea48f760 | Calculer avec des probabilités conditionnelles              | 3    | TSPE-616                   |

Aucun brouillon sur ces points. **1SPE-421** (formule des probabilités totales relative à une
partition) n'a aucun modèle. Côté Terminale, la session `idees-tle-probas` prépare une variation de
ecf4d46b (TSPE-617), les probabilités totales « à l'envers » : P_B(G) connaissant P(G). C'est une
autre idée que F5 ci-dessous, qui retrouve P(A).

## Relevé

| Id     | Ce qu'on demande                                                                                                                                                                           | Forme chez eux                                       | Nos modèles                              | Verdict                                                                                                       |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 1P10-1 | Énoncé à six informations en % (valises, club de judo, bons de réduction, test) : (1) écrire la notation de trois valeurs ; (2) donner la valeur de P_A(B), P(B), P_Ā(B), P_B(Ā), P(A ∩ B) | 3 cases : notation tapée, ou valeur                  | 31096bae (phrase → notation, QCM)        | 🟡 le sens « notation → valeur lue dans un énoncé chargé » manque : variation de 31096bae (F1)                |
| 1P10-2 | P(A ∩ B) à partir de P(A) et P_A(B), et P_A(B) à partir de P(A) et P(A ∩ B) : dixièmes, fractions (résultat irréductible) ou en situation (spams, %)                                       | 1 case                                               | d7507e78 v2 (sur un arbre), ea48f760 (T) | ❌ en 2de, rien **sans arbre** sur la définition P_A(B) = P(A ∩ B)/P(A) : modèle neuf (F2)                    |
| 1P11-1 | Arbre complet donné (dixièmes ou fractions) : P(A ∩ B) (4 chemins), P(B) ou P(B̄), P_B(A), P_B̄(A), P_B(Ā), P_B̄(Ā)                                                                           | 1 case ; fraction irréductible pour l'inversion      | 1cfc575d, 5ba712bc, 69a05f98             | ✅ ; seule P_B̄(A) (condition contraire, évènement direct) manque à 69a05f98 : variation (F3)                  |
| 1P11-2 | Tableau croisé d'effectifs complet : une probabilité simple, une intersection et une conditionnelle (contraires compris)                                                                   | 3 cases, fractions non simplifiées                   | cf548ea1, f3e68e4b, 4016b05c             | ✅ rien (F4)                                                                                                  |
| 1P12-1 | P(B), P_A(B) et P_Ā(B̄) donnés : retrouver **P(A)** (équation du 1er degré par les probabilités totales) ; option : compléter l'arbre (6 cases dans la figure)                              | 1 case (dixièmes) ou 6 cases dans l'arbre            | aucun                                    | ❌ modèle neuf (F5)                                                                                           |
| 1P13-1 | Tableau croisé d'effectifs **en situation** (festival, ateliers, salle de sport) : A et B sont-ils indépendants ? Par P(A ∩ B) = P(A)P(B) ou par P_A(B) = P(B)                             | 5 cases : 3 fractions + menu « = / ≠ » + « Oui/Non » | ebe7e788 (probabilités données, QCM)     | 🟡 manque l'indépendance **lue sur un tableau d'effectifs** : modèle neuf (F6)                                |
| 1P14-1 | Sept problèmes d'E3C (dépistage, snack, fléchettes, camping, agence de voyage, coiffure, portique) : arbre, chemin, P(B), inversion arrondie, indépendance                                 | rédigé, sans saisie                                  | a9c71276, 2c116f4d, 6dd2f133             | 🟡 l'idée neuve : des **données mélangées** (P(A), P(A ∩ B) et P_Ā(B)), il faut d'abord retrouver P_A(B) (F7) |
| 1P14-2 | Les deux sujets E3C « agence de voyage » et « salon de coiffure » de 1P14-1 (pourcentages entiers) ; plus « deux clients indépendants, aucun ne prend l'option »                           | rédigé, sans saisie                                  | idem ; d5780995 (« au moins une fois »)  | 🟡 versé dans F7 ; « aucun des deux » est couvert par d5780995 (contraire de « au moins une fois »)           |

## Ce que leur format fait et pas le nôtre

- **Taper une notation** (`P_A(B)`) comme réponse (1P10-1). Nous n'avons pas de case qui juge une
  notation de probabilité, mais notre QCM 31096bae fait le même travail, avec des leurres choisis.
  Ce n'est pas un manque.
- **Menu déroulant au milieu d'une phrase** (« = / ≠ » de 1P13-1). Notre ` ```choix ` le remplace :
  voir F6, où les propositions portent la justification.
- **Arbre à compléter dans la figure** (1P12-1) : notre ` ```probtree ` accepte déjà les branches
  `?` (9d7c4d98, fe6f5606). Aucun outil ne manque.
