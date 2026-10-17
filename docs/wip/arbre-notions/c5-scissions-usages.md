# Usages en production des 137 points à scinder et de 3-002

> Relevé du 2026-10-17, prod (MCP Supabase, SELECT seulement). Phase 1, lecture : rien n'est écrit.

## 1. Tables qui pointent vers `curriculum_points`

Relevé par `pg_constraint` (toutes les clés étrangères vers `curriculum_points.id`) :

| Table                           | Colonne             | ON DELETE | Références aux 138 points |
| ------------------------------- | ------------------- | --------- | ------------------------- |
| `question_template_points`      | `point_id`          | RESTRICT  | **0**                     |
| `exercise_curriculum_points`    | `point_id`          | CASCADE   | **0**                     |
| `journal_entry_points`          | `point_id`          | CASCADE   | **0**                     |
| `student_point_state`           | `point_id`          | CASCADE   | **0**                     |
| `srs_anti_fraud_flags`          | `capacity_point_id` | CASCADE   | **0**                     |
| `curriculum_point_automatismes` | `point_id`          | CASCADE   | **151** (sur 41 points)   |

Aucune autre table n'a de clé étrangère vers `curriculum_points`. Les 138 codes existent tous en prod, aucun n'est archivé, et le libellé en base est exactement le `current` de la spec (pour CM1-035, CM1-036, CM2-035, CM2-036, le « ✂ » fait partie du libellé en base).

**3-002** (à archiver) : aucune référence, dans aucune table.

**Conséquence** : hors automatismes, aucun tag de modèle, aucun tag d'exercice, aucun état élève, aucune entrée de journal ni signalement ne s'accroche à ces points : la migration n'a rien à répartir pour eux, et aucune donnée d'élève n'est touchée.

## 2. Références d'automatismes : moitié cible proposée

`curriculum_point_automatismes` ne stocke que (point, grade) : le texte de la ligne vient des seeds (`docs/wip/arbre-notions/seed-*.md`). Une ligne de 1re (générale, spé, techno) hérite de la liste de 2de ; T_COMP et T_SPE héritent de la liste de 1re spé (qui contient celle de 2de) ; T_TECHNO n'hérite pas (décision T4). Quand plusieurs lignes mènent à la même (point, grade), la cible est l'union.

**151 références** ; **51** vont sur une seule moitié, **100** vont sur « les deux » (la référence est dupliquée : une ligne par moitié).

Notation : _origine_ = le point qui garde son code ; _2ᵉ_, _3ᵉ_ = les nouveaux points, dans l'ordre de `labels`.

### 3-014

- origine : Résoudre par le calcul une inéquation du premier degré (3x ⩾ 12).
- 2ᵉ (nouveau code) : Résoudre graphiquement une inéquation du premier degré.

| Grade    | Ligne(s) d'automatisme (seed)                                                                     | Cible proposée | Justification                                                                              |
| -------- | ------------------------------------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------ |
| 2        | Résoudre x² = a, ax + b = cx + d, a/x = b, une inéquation du premier degré (2de l.373)            | origine        | « résoudre une inéquation du premier degré » parmi des résolutions algébriques : le calcul |
| 1_GEN    | Résoudre x² = a, ax + b = cx + d, a/x = b, une inéquation du premier degré (2de l.373, reprise 2) | origine        | « résoudre une inéquation du premier degré » parmi des résolutions algébriques : le calcul |
| 1_SPE    | Résoudre x² = a, ax + b = cx + d, a/x = b, une inéquation du premier degré (2de l.373, reprise 2) | origine        | « résoudre une inéquation du premier degré » parmi des résolutions algébriques : le calcul |
| 1_TECHNO | Résoudre x² = a, ax + b = cx + d, a/x = b, une inéquation du premier degré (2de l.373, reprise 2) | origine        | « résoudre une inéquation du premier degré » parmi des résolutions algébriques : le calcul |
| T_COMP   | Résoudre x² = a, ax + b = cx + d, a/x = b, une inéquation du premier degré (2de l.373, reprise 2) | origine        | « résoudre une inéquation du premier degré » parmi des résolutions algébriques : le calcul |
| T_SPE    | Résoudre x² = a, ax + b = cx + d, a/x = b, une inéquation du premier degré (2de l.373, reprise 2) | origine        | « résoudre une inéquation du premier degré » parmi des résolutions algébriques : le calcul |

### 3-016

- origine : Développer avec les identités remarquables ((x + 3)² = ?).
- 2ᵉ (nouveau code) : Factoriser avec les identités remarquables (x² − 9 = ?).

| Grade    | Ligne(s) d'automatisme (seed)                                                                                                                                                                                        | Cible proposée                             | Justification                                            |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | -------------------------------------------------------- |
| 2        | Développer, factoriser, réduire (identités (a±b)², (a+b)(a−b) ; factorisations ax²+bx, ax+bx) (2de l.372)                                                                                                            | **les deux** : origine + 2ᵉ (nouveau code) | « développer, factoriser » : les deux gestes sont nommés |
| 1_GEN    | Développer, factoriser, réduire une expression algébrique simple (1gen l.96)<br>Développer, factoriser, réduire (identités (a±b)², (a+b)(a−b) ; factorisations ax²+bx, ax+bx) (2de l.372, reprise 2)                 | **les deux** : origine + 2ᵉ (nouveau code) | « développer, factoriser » : les deux gestes sont nommés |
| 1_SPE    | Développer, factoriser, réduire une expression algébrique simple (1spe l.400)<br>Développer, factoriser, réduire (identités (a±b)², (a+b)(a−b) ; factorisations ax²+bx, ax+bx) (2de l.372, reprise 2)                | **les deux** : origine + 2ᵉ (nouveau code) | « développer, factoriser » : les deux gestes sont nommés |
| 1_TECHNO | Développer, factoriser, réduire une expression algébrique simple (1techno l.94)<br>Développer, factoriser, réduire (identités (a±b)², (a+b)(a−b) ; factorisations ax²+bx, ax+bx) (2de l.372, reprise 2)              | **les deux** : origine + 2ᵉ (nouveau code) | « développer, factoriser » : les deux gestes sont nommés |
| T_COMP   | Développer, factoriser, réduire une expression algébrique simple (1spe l.400, reprise 1_SPE)<br>Développer, factoriser, réduire (identités (a±b)², (a+b)(a−b) ; factorisations ax²+bx, ax+bx) (2de l.372, reprise 2) | **les deux** : origine + 2ᵉ (nouveau code) | « développer, factoriser » : les deux gestes sont nommés |
| T_SPE    | Développer, factoriser, réduire une expression algébrique simple (1spe l.400, reprise 1_SPE)<br>Développer, factoriser, réduire (identités (a±b)², (a+b)(a−b) ; factorisations ax²+bx, ax+bx) (2de l.372, reprise 2) | **les deux** : origine + 2ᵉ (nouveau code) | « développer, factoriser » : les deux gestes sont nommés |
| T_TECHNO | Développer, factoriser, réduire une expression algébrique simple (ttechno l.103)                                                                                                                                     | **les deux** : origine + 2ᵉ (nouveau code) | « développer, factoriser » : les deux gestes sont nommés |

### 3-022

- origine : Reconnaître une configuration où le théorème de Thalès s'applique : triangles emboîtés ou papillon (les droites (BC) et (MN) sont-elles parallèles ? quelle configuration ?).
- 2ᵉ (nouveau code) : Écrire l'égalité des rapports du théorème de Thalès dans une configuration donnée (AM/AB = … = …).
- 3ᵉ (nouveau code) : Appliquer le théorème de Thalès pour calculer une longueur (AM = 3, AB = 5, BC = 7 : calcule MN).

| Grade    | Ligne(s) d'automatisme (seed)                                                     | Cible proposée    | Justification                                              |
| -------- | --------------------------------------------------------------------------------- | ----------------- | ---------------------------------------------------------- |
| 2        | Application simple des théorèmes de Pythagore et de Thalès (2de l.385)            | 3ᵉ (nouveau code) | « application simple » du théorème : calculer une longueur |
| 1_GEN    | Application simple des théorèmes de Pythagore et de Thalès (2de l.385, reprise 2) | 3ᵉ (nouveau code) | « application simple » du théorème : calculer une longueur |
| 1_SPE    | Application simple des théorèmes de Pythagore et de Thalès (2de l.385, reprise 2) | 3ᵉ (nouveau code) | « application simple » du théorème : calculer une longueur |
| 1_TECHNO | Application simple des théorèmes de Pythagore et de Thalès (2de l.385, reprise 2) | 3ᵉ (nouveau code) | « application simple » du théorème : calculer une longueur |
| T_COMP   | Application simple des théorèmes de Pythagore et de Thalès (2de l.385, reprise 2) | 3ᵉ (nouveau code) | « application simple » du théorème : calculer une longueur |
| T_SPE    | Application simple des théorèmes de Pythagore et de Thalès (2de l.385, reprise 2) | 3ᵉ (nouveau code) | « application simple » du théorème : calculer une longueur |

### 3-023

- origine : Connaître les lignes trigonométriques dans le triangle rectangle : écrire cosinus, sinus et tangente d'un angle (cos(B) = … / …).
- 2ᵉ (nouveau code) : Utiliser les lignes trigonométriques pour calculer une longueur ou un angle dans un triangle rectangle (BC = 6, angle B = 40° : calcule AB).

| Grade    | Ligne(s) d'automatisme (seed)                                                                        | Cible proposée                             | Justification                                                                                |
| -------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------- |
| 2        | Lignes trigonométriques dans le triangle rectangle : cosinus, sinus, tangente (2de l.386)            | **les deux** : origine + 2ᵉ (nouveau code) | la ligne nomme les rapports sans geste ; en 2de on les écrit ET on les utilise pour calculer |
| 1_GEN    | Lignes trigonométriques dans le triangle rectangle : cosinus, sinus, tangente (2de l.386, reprise 2) | **les deux** : origine + 2ᵉ (nouveau code) | la ligne nomme les rapports sans geste ; en 2de on les écrit ET on les utilise pour calculer |
| 1_SPE    | Lignes trigonométriques dans le triangle rectangle : cosinus, sinus, tangente (2de l.386, reprise 2) | **les deux** : origine + 2ᵉ (nouveau code) | la ligne nomme les rapports sans geste ; en 2de on les écrit ET on les utilise pour calculer |
| 1_TECHNO | Lignes trigonométriques dans le triangle rectangle : cosinus, sinus, tangente (2de l.386, reprise 2) | **les deux** : origine + 2ᵉ (nouveau code) | la ligne nomme les rapports sans geste ; en 2de on les écrit ET on les utilise pour calculer |
| T_COMP   | Lignes trigonométriques dans le triangle rectangle : cosinus, sinus, tangente (2de l.386, reprise 2) | **les deux** : origine + 2ᵉ (nouveau code) | la ligne nomme les rapports sans geste ; en 2de on les écrit ET on les utilise pour calculer |
| T_SPE    | Lignes trigonométriques dans le triangle rectangle : cosinus, sinus, tangente (2de l.386, reprise 2) | **les deux** : origine + 2ᵉ (nouveau code) | la ligne nomme les rapports sans geste ; en 2de on les écrit ET on les utilise pour calculer |

### 3-030

- origine : Construire la boîte à moustaches d'une série statistique.
- 2ᵉ (nouveau code) : Lire une boîte à moustaches (médiane, quartiles, étendue).

| Grade    | Ligne(s) d'automatisme (seed)                                                                                                                                                                       | Cible proposée    | Justification                                                                                                                        |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 2        | Comparer des distributions à l'aide de boites à moustaches (2de l.389)                                                                                                                              | 2ᵉ (nouveau code) | « comparer des distributions à l'aide de boites » : lire et exploiter une boîte donnée                                               |
| 1_GEN    | Lire un graphique, un histogramme, un diagramme en barres ou circulaire, en boite… (1gen l.102)<br>Comparer des distributions à l'aide de boites à moustaches (2de l.389, reprise 2)                | 2ᵉ (nouveau code) | « lire … une boite » : lire, pas construire ; « comparer des distributions à l'aide de boites » : lire et exploiter une boîte donnée |
| 1_SPE    | Lire un graphique, un histogramme, un diagramme en barres ou circulaire, en boite… (1spe l.406)<br>Comparer des distributions à l'aide de boites à moustaches (2de l.389, reprise 2)                | 2ᵉ (nouveau code) | « lire … une boite » : lire, pas construire ; « comparer des distributions à l'aide de boites » : lire et exploiter une boîte donnée |
| 1_TECHNO | Lire un graphique, un histogramme, un diagramme en barres ou circulaire, en boite… (1techno l.100)<br>Comparer des distributions à l'aide de boites à moustaches (2de l.389, reprise 2)             | 2ᵉ (nouveau code) | « lire … une boite » : lire, pas construire ; « comparer des distributions à l'aide de boites » : lire et exploiter une boîte donnée |
| T_COMP   | Lire un graphique, un histogramme, un diagramme en barres ou circulaire, en boite… (1spe l.406, reprise 1_SPE)<br>Comparer des distributions à l'aide de boites à moustaches (2de l.389, reprise 2) | 2ᵉ (nouveau code) | « lire … une boite » : lire, pas construire ; « comparer des distributions à l'aide de boites » : lire et exploiter une boîte donnée |
| T_SPE    | Lire un graphique, un histogramme, un diagramme en barres ou circulaire, en boite… (1spe l.406, reprise 1_SPE)<br>Comparer des distributions à l'aide de boites à moustaches (2de l.389, reprise 2) | 2ᵉ (nouveau code) | « lire … une boite » : lire, pas construire ; « comparer des distributions à l'aide de boites » : lire et exploiter une boîte donnée |
| T_TECHNO | Lire un graphique, un histogramme, un diagramme en barres ou circulaire, en boite… (ttechno l.115)                                                                                                  | 2ᵉ (nouveau code) | « lire … une boite » : lire, pas construire                                                                                          |

### 3-041

- origine : Reconnaître une fonction linéaire (expression ou droite passant par l'origine).
- 2ᵉ (nouveau code) : Utiliser une fonction linéaire donnée par son expression (calculer une image : f(3) = ?).

| Grade    | Ligne(s) d'automatisme (seed)                                                                                        | Cible proposée | Justification                                                                     |
| -------- | -------------------------------------------------------------------------------------------------------------------- | -------------- | --------------------------------------------------------------------------------- |
| 2        | Reconnaitre l'expression d'une fonction linéaire, affine ; leur représentation est une droite (2de l.381)            | origine        | « reconnaitre l'expression … ; leur représentation est une droite » : reconnaître |
| 1_GEN    | Reconnaitre l'expression d'une fonction linéaire, affine ; leur représentation est une droite (2de l.381, reprise 2) | origine        | « reconnaitre l'expression … ; leur représentation est une droite » : reconnaître |
| 1_SPE    | Reconnaitre l'expression d'une fonction linéaire, affine ; leur représentation est une droite (2de l.381, reprise 2) | origine        | « reconnaitre l'expression … ; leur représentation est une droite » : reconnaître |
| 1_TECHNO | Reconnaitre l'expression d'une fonction linéaire, affine ; leur représentation est une droite (2de l.381, reprise 2) | origine        | « reconnaitre l'expression … ; leur représentation est une droite » : reconnaître |
| T_COMP   | Reconnaitre l'expression d'une fonction linéaire, affine ; leur représentation est une droite (2de l.381, reprise 2) | origine        | « reconnaitre l'expression … ; leur représentation est une droite » : reconnaître |
| T_SPE    | Reconnaitre l'expression d'une fonction linéaire, affine ; leur représentation est une droite (2de l.381, reprise 2) | origine        | « reconnaitre l'expression … ; leur représentation est une droite » : reconnaître |

### 3-044

- origine : Reconnaître une fonction affine (expression ou droite).
- 2ᵉ (nouveau code) : Utiliser une fonction affine donnée par son expression (calculer une image : f(3) = ?).

| Grade    | Ligne(s) d'automatisme (seed)                                                                                        | Cible proposée | Justification                                                                     |
| -------- | -------------------------------------------------------------------------------------------------------------------- | -------------- | --------------------------------------------------------------------------------- |
| 2        | Reconnaitre l'expression d'une fonction linéaire, affine ; leur représentation est une droite (2de l.381)            | origine        | « reconnaitre l'expression … ; leur représentation est une droite » : reconnaître |
| 1_GEN    | Reconnaitre l'expression d'une fonction linéaire, affine ; leur représentation est une droite (2de l.381, reprise 2) | origine        | « reconnaitre l'expression … ; leur représentation est une droite » : reconnaître |
| 1_SPE    | Reconnaitre l'expression d'une fonction linéaire, affine ; leur représentation est une droite (2de l.381, reprise 2) | origine        | « reconnaitre l'expression … ; leur représentation est une droite » : reconnaître |
| 1_TECHNO | Reconnaitre l'expression d'une fonction linéaire, affine ; leur représentation est une droite (2de l.381, reprise 2) | origine        | « reconnaitre l'expression … ; leur représentation est une droite » : reconnaître |
| T_COMP   | Reconnaitre l'expression d'une fonction linéaire, affine ; leur représentation est une droite (2de l.381, reprise 2) | origine        | « reconnaitre l'expression … ; leur représentation est une droite » : reconnaître |
| T_SPE    | Reconnaitre l'expression d'une fonction linéaire, affine ; leur représentation est une droite (2de l.381, reprise 2) | origine        | « reconnaitre l'expression … ; leur représentation est une droite » : reconnaître |

### 4-029

- origine : Calculer le volume d'une pyramide (V = B × h / 3).
- 2ᵉ (nouveau code) : Calculer le volume d'un cône de révolution (V = π r² h / 3).

| Grade    | Ligne(s) d'automatisme (seed)                                                                                                                               | Cible proposée                             | Justification                                                               |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------- |
| 2        | Calculer périmètres (polygone, cercle), aires (rectangle, triangle, disque), volumes (pavé, prisme, cylindre, pyramide, cône, boule) (2de l.384)            | **les deux** : origine + 2ᵉ (nouveau code) | la ligne liste « pyramide, cône » : les deux solides                        |
| 1_GEN    | Calculer périmètres (polygone, cercle), aires (rectangle, triangle, disque), volumes (pavé, prisme, cylindre, pyramide, cône, boule) (2de l.384, reprise 2) | **les deux** : origine + 2ᵉ (nouveau code) | la ligne liste « pyramide, cône » : les deux solides                        |
| 1_SPE    | Calculer périmètres (polygone, cercle), aires (rectangle, triangle, disque), volumes (pavé, prisme, cylindre, pyramide, cône, boule) (2de l.384, reprise 2) | **les deux** : origine + 2ᵉ (nouveau code) | la ligne liste « pyramide, cône » : les deux solides                        |
| 1_TECHNO | Calculer périmètres (polygone, cercle), aires (rectangle, triangle, disque), volumes (pavé, prisme, cylindre, pyramide, cône, boule) (2de l.384, reprise 2) | **les deux** : origine + 2ᵉ (nouveau code) | la ligne liste « pyramide, cône » : les deux solides                        |
| T_COMP   | Calculer périmètres (polygone, cercle), aires (rectangle, triangle, disque), volumes (pavé, prisme, cylindre, pyramide, cône, boule) (2de l.384, reprise 2) | **les deux** : origine + 2ᵉ (nouveau code) | la ligne liste « pyramide, cône » : les deux solides                        |
| T_SPE    | Calculer périmètres (polygone, cercle), aires (rectangle, triangle, disque), volumes (pavé, prisme, cylindre, pyramide, cône, boule) (2de l.384, reprise 2) | **les deux** : origine + 2ᵉ (nouveau code) | la ligne liste « pyramide, cône » : les deux solides                        |
| 3        | Formules du volume d'une pyramide, d'un cône (cycle4 l.492)                                                                                                 | **les deux** : origine + 2ᵉ (nouveau code) | BO 3e « formules du volume d'une pyramide ou d'un cône » : les deux solides |

### 4-040

- origine : Déterminer la médiane d'une série de petit effectif présentée sous forme de données brutes (3, 7, 8, 12, 15 → ?).
- 2ᵉ (nouveau code) : Interpréter la médiane d'une série de petit effectif (que dire des valeurs si la médiane vaut 8 ?).

| Grade    | Ligne(s) d'automatisme (seed)                                                                                                                                                                    | Cible proposée                             | Justification                                                                                  |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| 2        | Calculer et interpréter moyenne, médiane, quartiles selon la présentation des données (2de l.388)                                                                                                | **les deux** : origine + 2ᵉ (nouveau code) | « calculer et interpréter » : déterminer ET interpréter                                        |
| 1_GEN    | Calculer et interpréter des indicateurs statistiques (1gen l.104)<br>Calculer et interpréter moyenne, médiane, quartiles selon la présentation des données (2de l.388, reprise 2)                | **les deux** : origine + 2ᵉ (nouveau code) | « calculer et interpréter » : déterminer ET interpréter                                        |
| 1_SPE    | Calculer et interpréter des indicateurs statistiques (1spe l.408)<br>Calculer et interpréter moyenne, médiane, quartiles selon la présentation des données (2de l.388, reprise 2)                | **les deux** : origine + 2ᵉ (nouveau code) | « calculer et interpréter » : déterminer ET interpréter                                        |
| 1_TECHNO | Calculer et interpréter des indicateurs statistiques (1techno l.102)<br>Calculer et interpréter moyenne, médiane, quartiles selon la présentation des données (2de l.388, reprise 2)             | **les deux** : origine + 2ᵉ (nouveau code) | « calculer et interpréter » : déterminer ET interpréter                                        |
| T_COMP   | Calculer et interpréter des indicateurs statistiques (1spe l.408, reprise 1_SPE)<br>Calculer et interpréter moyenne, médiane, quartiles selon la présentation des données (2de l.388, reprise 2) | **les deux** : origine + 2ᵉ (nouveau code) | « calculer et interpréter » : déterminer ET interpréter                                        |
| T_SPE    | Calculer et interpréter des indicateurs statistiques (1spe l.408, reprise 1_SPE)<br>Calculer et interpréter moyenne, médiane, quartiles selon la présentation des données (2de l.388, reprise 2) | **les deux** : origine + 2ᵉ (nouveau code) | « calculer et interpréter » : déterminer ET interpréter                                        |
| 3        | Moyenne ; médiane d'une petite série ; étendue (cycle4 l.498)                                                                                                                                    | origine                                    | BO 3e « donner une médiane pour une série comportant un petit nombre de valeurs » : déterminer |

### 4-041

- origine : Calculer l'étendue d'une série présentée sous forme de données brutes, d'un tableau ou d'un diagramme.
- 2ᵉ (nouveau code) : Interpréter l'étendue d'une série (laquelle des deux classes a les notes les plus dispersées ?).

| Grade | Ligne(s) d'automatisme (seed)                                 | Cible proposée | Justification                                       |
| ----- | ------------------------------------------------------------- | -------------- | --------------------------------------------------- |
| 3     | Moyenne ; médiane d'une petite série ; étendue (cycle4 l.498) | origine        | BO 3e « calculer l'étendue d'une série » : calculer |

### 4-048

- origine : Calculer la probabilité d'un évènement.
- 2ᵉ (nouveau code) : Calculer la probabilité de l'évènement contraire (P(non A) = 1 − P(A)).

| Grade    | Ligne(s) d'automatisme (seed)                                                                                                                                        | Cible proposée                             | Justification                                                                                                                                    |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2        | Calculer la probabilité de l'évènement contraire (2de l.391)<br>Probabilité d'un évènement comme somme des probabilités des issues (2de l.392)                       | **les deux** : origine + 2ᵉ (nouveau code) | « probabilité de l'évènement contraire » : la 2e moitié ; « probabilité d'un évènement comme somme des probabilités des issues » : la 1re moitié |
| 1_GEN    | Calculer la probabilité de l'évènement contraire (2de l.391, reprise 2)<br>Probabilité d'un évènement comme somme des probabilités des issues (2de l.392, reprise 2) | **les deux** : origine + 2ᵉ (nouveau code) | « probabilité de l'évènement contraire » : la 2e moitié ; « probabilité d'un évènement comme somme des probabilités des issues » : la 1re moitié |
| 1_SPE    | Calculer la probabilité de l'évènement contraire (2de l.391, reprise 2)<br>Probabilité d'un évènement comme somme des probabilités des issues (2de l.392, reprise 2) | **les deux** : origine + 2ᵉ (nouveau code) | « probabilité de l'évènement contraire » : la 2e moitié ; « probabilité d'un évènement comme somme des probabilités des issues » : la 1re moitié |
| 1_TECHNO | Calculer la probabilité de l'évènement contraire (2de l.391, reprise 2)<br>Probabilité d'un évènement comme somme des probabilités des issues (2de l.392, reprise 2) | **les deux** : origine + 2ᵉ (nouveau code) | « probabilité de l'évènement contraire » : la 2e moitié ; « probabilité d'un évènement comme somme des probabilités des issues » : la 1re moitié |
| T_COMP   | Calculer la probabilité de l'évènement contraire (2de l.391, reprise 2)<br>Probabilité d'un évènement comme somme des probabilités des issues (2de l.392, reprise 2) | **les deux** : origine + 2ᵉ (nouveau code) | « probabilité de l'évènement contraire » : la 2e moitié ; « probabilité d'un évènement comme somme des probabilités des issues » : la 1re moitié |
| T_SPE    | Calculer la probabilité de l'évènement contraire (2de l.391, reprise 2)<br>Probabilité d'un évènement comme somme des probabilités des issues (2de l.392, reprise 2) | **les deux** : origine + 2ᵉ (nouveau code) | « probabilité de l'évènement contraire » : la 2e moitié ; « probabilité d'un évènement comme somme des probabilités des issues » : la 1re moitié |

### 4-057

- origine : Traduire une augmentation de t % par un coefficient multiplicateur (+ 20 % → × 1,2).
- 2ᵉ (nouveau code) : Traduire une diminution de t % par un coefficient multiplicateur (− 20 % → × 0,8).

| Grade    | Ligne(s) d'automatisme (seed)                                                                                    | Cible proposée                             | Justification                                                                      |
| -------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------- |
| 2        | Passer d'une formulation additive (« augmenter de 5 % ») à une formulation multiplicative (2de l.378)            | **les deux** : origine + 2ᵉ (nouveau code) | « augmenter de t % » → × : vaut pour hausse et baisse                              |
| 1_GEN    | Passer d'une formulation additive (« augmenter de 5 % ») à une formulation multiplicative (2de l.378, reprise 2) | **les deux** : origine + 2ᵉ (nouveau code) | « augmenter de t % » → × : vaut pour hausse et baisse                              |
| 1_SPE    | Passer d'une formulation additive (« augmenter de 5 % ») à une formulation multiplicative (2de l.378, reprise 2) | **les deux** : origine + 2ᵉ (nouveau code) | « augmenter de t % » → × : vaut pour hausse et baisse                              |
| 1_TECHNO | Passer d'une formulation additive (« augmenter de 5 % ») à une formulation multiplicative (2de l.378, reprise 2) | **les deux** : origine + 2ᵉ (nouveau code) | « augmenter de t % » → × : vaut pour hausse et baisse                              |
| T_COMP   | Passer d'une formulation additive (« augmenter de 5 % ») à une formulation multiplicative (2de l.378, reprise 2) | **les deux** : origine + 2ᵉ (nouveau code) | « augmenter de t % » → × : vaut pour hausse et baisse                              |
| T_SPE    | Passer d'une formulation additive (« augmenter de 5 % ») à une formulation multiplicative (2de l.378, reprise 2) | **les deux** : origine + 2ᵉ (nouveau code) | « augmenter de t % » → × : vaut pour hausse et baisse                              |
| T_TECHNO | Passer d'une formulation additive à une formulation multiplicative (ttechno l.87)                                | **les deux** : origine + 2ᵉ (nouveau code) | « augmenter de t % » → × : vaut pour hausse et baisse                              |
| 3        | Augmentation/diminution en pourcentages, avec ou sans coefficient multiplicateur (cycle4 l.502)                  | **les deux** : origine + 2ᵉ (nouveau code) | BO 3e « une augmentation ou une diminution … avec ou sans coefficient » : les deux |

### 5-010

- origine : Connaître le critère de divisibilité par 3 (4 518 est-il divisible par 3 ?).
- 2ᵉ (nouveau code) : Connaître le critère de divisibilité par 9 (4 518 est-il divisible par 9 ?).

| Grade | Ligne(s) d'automatisme (seed)                          | Cible proposée                             | Justification                                                            |
| ----- | ------------------------------------------------------ | ------------------------------------------ | ------------------------------------------------------------------------ |
| 3     | Critères de divisibilité par 2, 3, 5, 9 (cycle4 l.483) | **les deux** : origine + 2ᵉ (nouveau code) | BO 3e « appliquer les critères de divisibilité par 2, 3, 5, 9 » : 3 et 9 |

### 5-013

- origine : Donner l'opposé d'un nombre relatif (opposé de −3 = ?).
- 2ᵉ (nouveau code) : Donner la valeur absolue d'un nombre relatif (valeur absolue de −3 = ?).

| Grade | Ligne(s) d'automatisme (seed)                        | Cible proposée | Justification                                                                    |
| ----- | ---------------------------------------------------- | -------------- | -------------------------------------------------------------------------------- |
| 4     | Opposé d'un nombre, somme des opposés (cycle4 l.439) | origine        | « opposé d'un nombre, somme des opposés » : l'opposé seul, pas la valeur absolue |

### 5-016

- origine : Lire l'abscisse d'un point sur une droite graduée (nombres relatifs).
- 2ᵉ (nouveau code) : Placer sur une droite graduée un point d'abscisse relative donnée.

| Grade    | Ligne(s) d'automatisme (seed)                                                                   | Cible proposée                             | Justification                          |
| -------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------ | -------------------------------------- |
| 2        | Sur une droite graduée, repérer ou placer un point d'abscisse un relatif (2de l.382)            | **les deux** : origine + 2ᵉ (nouveau code) | « repérer ou placer » : lire et placer |
| 1_GEN    | Sur une droite graduée, repérer ou placer un point d'abscisse un relatif (2de l.382, reprise 2) | **les deux** : origine + 2ᵉ (nouveau code) | « repérer ou placer » : lire et placer |
| 1_SPE    | Sur une droite graduée, repérer ou placer un point d'abscisse un relatif (2de l.382, reprise 2) | **les deux** : origine + 2ᵉ (nouveau code) | « repérer ou placer » : lire et placer |
| 1_TECHNO | Sur une droite graduée, repérer ou placer un point d'abscisse un relatif (2de l.382, reprise 2) | **les deux** : origine + 2ᵉ (nouveau code) | « repérer ou placer » : lire et placer |
| T_COMP   | Sur une droite graduée, repérer ou placer un point d'abscisse un relatif (2de l.382, reprise 2) | **les deux** : origine + 2ᵉ (nouveau code) | « repérer ou placer » : lire et placer |
| T_SPE    | Sur une droite graduée, repérer ou placer un point d'abscisse un relatif (2de l.382, reprise 2) | **les deux** : origine + 2ᵉ (nouveau code) | « repérer ou placer » : lire et placer |
| 3        | Placer / repérer un relatif ; coordonnées dans le plan (cycle4 l.490)                           | **les deux** : origine + 2ᵉ (nouveau code) | BO « placer … ; repérer … » : les deux |
| 4        | Placer / repérer un relatif sur une droite graduée ; coordonnées dans le plan (cycle4 l.459)    | **les deux** : origine + 2ᵉ (nouveau code) | BO « placer … ; repérer … » : les deux |

### 5-026

- origine : Additionner des fractions de dénominateurs quelconques (2/3 + 1/4 = ?).
- 2ᵉ (nouveau code) : Soustraire des fractions de dénominateurs quelconques (2/3 − 1/4 = ?).

| Grade | Ligne(s) d'automatisme (seed)                                                                  | Cible proposée                             | Justification                                                   |
| ----- | ---------------------------------------------------------------------------------------------- | ------------------------------------------ | --------------------------------------------------------------- |
| 3     | Dénominateur commun pour additionner, soustraire, comparer (cycle4 l.482)                      | **les deux** : origine + 2ᵉ (nouveau code) | « dénominateur commun pour additionner, soustraire » : les deux |
| 4     | Addition et soustraction de fractions de dénominateurs quelconques mais simples (cycle4 l.444) | **les deux** : origine + 2ᵉ (nouveau code) | « addition et soustraction de fractions » : les deux            |

### 5-045

- origine : Résoudre une équation du type x + b = c (x + 7 = 12).
- 2ᵉ (nouveau code) : Résoudre une équation du type ax = c (3x = 12).

| Grade | Ligne(s) d'automatisme (seed)                          | Cible proposée                             | Justification                                      |
| ----- | ------------------------------------------------------ | ------------------------------------------ | -------------------------------------------------- |
| 3     | Équations ax = c, x + b = c, ax + b = c (cycle4 l.484) | **les deux** : origine + 2ᵉ (nouveau code) | « équations ax = c et x + b = c » : les deux types |
| 4     | Équations ax = c et x + b = c (cycle4 l.454)           | **les deux** : origine + 2ᵉ (nouveau code) | « équations ax = c et x + b = c » : les deux types |

### 5-047

- origine : Lire les coordonnées d'un point dans un repère orthogonal.
- 2ᵉ (nouveau code) : Placer un point de coordonnées données dans un repère orthogonal.

| Grade    | Ligne(s) d'automatisme (seed)                                                                | Cible proposée                             | Justification                                            |
| -------- | -------------------------------------------------------------------------------------------- | ------------------------------------------ | -------------------------------------------------------- |
| 2        | Dans un repère orthogonal, lire ou placer les coordonnées d'un point (2de l.383)             | **les deux** : origine + 2ᵉ (nouveau code) | « lire ou placer les coordonnées » : les deux            |
| 1_GEN    | Dans un repère orthogonal, lire ou placer les coordonnées d'un point (2de l.383, reprise 2)  | **les deux** : origine + 2ᵉ (nouveau code) | « lire ou placer les coordonnées » : les deux            |
| 1_SPE    | Dans un repère orthogonal, lire ou placer les coordonnées d'un point (2de l.383, reprise 2)  | **les deux** : origine + 2ᵉ (nouveau code) | « lire ou placer les coordonnées » : les deux            |
| 1_TECHNO | Dans un repère orthogonal, lire ou placer les coordonnées d'un point (2de l.383, reprise 2)  | **les deux** : origine + 2ᵉ (nouveau code) | « lire ou placer les coordonnées » : les deux            |
| T_COMP   | Dans un repère orthogonal, lire ou placer les coordonnées d'un point (2de l.383, reprise 2)  | **les deux** : origine + 2ᵉ (nouveau code) | « lire ou placer les coordonnées » : les deux            |
| T_SPE    | Dans un repère orthogonal, lire ou placer les coordonnées d'un point (2de l.383, reprise 2)  | **les deux** : origine + 2ᵉ (nouveau code) | « lire ou placer les coordonnées » : les deux            |
| 3        | Placer / repérer un relatif ; coordonnées dans le plan (cycle4 l.490)                        | **les deux** : origine + 2ᵉ (nouveau code) | BO « lire les coordonnées ; placer un point » : les deux |
| 4        | Placer / repérer un relatif sur une droite graduée ; coordonnées dans le plan (cycle4 l.459) | **les deux** : origine + 2ᵉ (nouveau code) | BO « lire les coordonnées ; placer un point » : les deux |

### 5-051

- origine : Convertir des unités de volume (m³, dm³, cm³).
- 2ᵉ (nouveau code) : Convertir entre unités de volume et de contenance (1 L = 1 dm³).

| Grade    | Ligne(s) d'automatisme (seed)                                                                                  | Cible proposée                             | Justification                                     |
| -------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------- |
| 2        | Conversions d'unités : longueurs, aires, volumes, contenances, durées, vitesses, masses (2de l.370)            | **les deux** : origine + 2ᵉ (nouveau code) | « conversions … volumes, contenances » : les deux |
| 1_GEN    | Conversions d'unités : longueurs, aires, volumes, contenances, durées, vitesses, masses (2de l.370, reprise 2) | **les deux** : origine + 2ᵉ (nouveau code) | « conversions … volumes, contenances » : les deux |
| 1_SPE    | Conversions d'unités : longueurs, aires, volumes, contenances, durées, vitesses, masses (2de l.370, reprise 2) | **les deux** : origine + 2ᵉ (nouveau code) | « conversions … volumes, contenances » : les deux |
| 1_TECHNO | Conversions d'unités : longueurs, aires, volumes, contenances, durées, vitesses, masses (2de l.370, reprise 2) | **les deux** : origine + 2ᵉ (nouveau code) | « conversions … volumes, contenances » : les deux |
| T_COMP   | Conversions d'unités : longueurs, aires, volumes, contenances, durées, vitesses, masses (2de l.370, reprise 2) | **les deux** : origine + 2ᵉ (nouveau code) | « conversions … volumes, contenances » : les deux |
| T_SPE    | Conversions d'unités : longueurs, aires, volumes, contenances, durées, vitesses, masses (2de l.370, reprise 2) | **les deux** : origine + 2ᵉ (nouveau code) | « conversions … volumes, contenances » : les deux |
| T_TECHNO | Effectuer des conversions d'unités (ttechno l.98)                                                              | **les deux** : origine + 2ᵉ (nouveau code) | « effectuer des conversions d'unités » : les deux |

### 5-062

- origine : Définir une hauteur d'un triangle (quel segment est la hauteur issue de A ?).
- 2ᵉ (nouveau code) : Tracer une hauteur d'un triangle.

| Grade | Ligne(s) d'automatisme (seed)                                                                   | Cible proposée | Justification                                                                      |
| ----- | ----------------------------------------------------------------------------------------------- | -------------- | ---------------------------------------------------------------------------------- |
| 4     | Droites remarquables du triangle (médiatrices, médianes, hauteurs, bissectrices) (cycle4 l.467) | origine        | BO 4e « reconnaitre des droites remarquables » : reconnaître (définir), pas tracer |

### 5-064

- origine : Définir une médiane d'un triangle (quel segment est la médiane issue de A ?).
- 2ᵉ (nouveau code) : Tracer une médiane d'un triangle.

| Grade | Ligne(s) d'automatisme (seed)                                                                   | Cible proposée | Justification                                                                      |
| ----- | ----------------------------------------------------------------------------------------------- | -------------- | ---------------------------------------------------------------------------------- |
| 4     | Droites remarquables du triangle (médiatrices, médianes, hauteurs, bissectrices) (cycle4 l.467) | origine        | BO 4e « reconnaitre des droites remarquables » : reconnaître (définir), pas tracer |

### 5-070

- origine : Donner la nature d'un quadrilatère à l'aide d'une propriété de ses côtés ou de ses diagonales.
- 2ᵉ (nouveau code) : Construire un parallélogramme à l'aide d'une propriété de ses côtés ou de ses diagonales.

| Grade | Ligne(s) d'automatisme (seed)                                                  | Cible proposée | Justification                                                                   |
| ----- | ------------------------------------------------------------------------------ | -------------- | ------------------------------------------------------------------------------- |
| 4     | Reconnaitre un parallélogramme (définition, propriété, codages) (cycle4 l.465) | origine        | BO 4e « reconnaitre un parallélogramme … grâce aux codages » : donner la nature |

### 5-076

- origine : Calculer des effectifs à partir de données.
- 2ᵉ (nouveau code) : Calculer une fréquence (sous forme décimale, fractionnaire ou de pourcentage).

| Grade | Ligne(s) d'automatisme (seed)                                       | Cible proposée                             | Justification                                                  |
| ----- | ------------------------------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------- |
| 4     | Effectif manquant dans un tableau ; fréquence simple (cycle4 l.469) | **les deux** : origine + 2ᵉ (nouveau code) | BO 4e « effectif manquant » ET « fréquence simple » : les deux |

### 5-077

- origine : Lire une donnée sur un graphique (quelle est la valeur en 2020 ?).
- 2ᵉ (nouveau code) : Interpréter les données d'un graphique (entre quelles années la valeur a-t-elle le plus augmenté ?).

| Grade    | Ligne(s) d'automatisme (seed)                                                                                                                                                                                                                                                                     | Cible proposée                             | Justification                                                                                                    |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| 2        | Lire et commenter des graphiques usuels (barres, circulaire, courbe, nuage) (2de l.387)                                                                                                                                                                                                           | **les deux** : origine + 2ᵉ (nouveau code) | « lire ET commenter » : lire et interpréter                                                                      |
| 1_GEN    | Lire un graphique, un histogramme, un diagramme en barres ou circulaire, en boite… (1gen l.102)<br>Passer du graphique aux données et vice-versa (1gen l.103)<br>Lire et commenter des graphiques usuels (barres, circulaire, courbe, nuage) (2de l.387, reprise 2)                               | **les deux** : origine + 2ᵉ (nouveau code) | « lire un graphique » / « passer du graphique aux données » : lire ; « lire ET commenter » : lire et interpréter |
| 1_SPE    | Lire un graphique, un histogramme, un diagramme en barres ou circulaire, en boite… (1spe l.406)<br>Passer du graphique aux données et vice-versa (1spe l.407)<br>Lire et commenter des graphiques usuels (barres, circulaire, courbe, nuage) (2de l.387, reprise 2)                               | **les deux** : origine + 2ᵉ (nouveau code) | « lire un graphique » / « passer du graphique aux données » : lire ; « lire ET commenter » : lire et interpréter |
| 1_TECHNO | Lire un graphique, un histogramme, un diagramme en barres ou circulaire, en boite… (1techno l.100)<br>Passer du graphique aux données et vice-versa (1techno l.101)<br>Lire et commenter des graphiques usuels (barres, circulaire, courbe, nuage) (2de l.387, reprise 2)                         | **les deux** : origine + 2ᵉ (nouveau code) | « lire un graphique » / « passer du graphique aux données » : lire ; « lire ET commenter » : lire et interpréter |
| T_COMP   | Lire un graphique, un histogramme, un diagramme en barres ou circulaire, en boite… (1spe l.406, reprise 1_SPE)<br>Passer du graphique aux données et vice-versa (1spe l.407, reprise 1_SPE)<br>Lire et commenter des graphiques usuels (barres, circulaire, courbe, nuage) (2de l.387, reprise 2) | **les deux** : origine + 2ᵉ (nouveau code) | « lire un graphique » / « passer du graphique aux données » : lire ; « lire ET commenter » : lire et interpréter |
| T_SPE    | Lire un graphique, un histogramme, un diagramme en barres ou circulaire, en boite… (1spe l.406, reprise 1_SPE)<br>Passer du graphique aux données et vice-versa (1spe l.407, reprise 1_SPE)<br>Lire et commenter des graphiques usuels (barres, circulaire, courbe, nuage) (2de l.387, reprise 2) | **les deux** : origine + 2ᵉ (nouveau code) | « lire un graphique » / « passer du graphique aux données » : lire ; « lire ET commenter » : lire et interpréter |
| T_TECHNO | Lire un graphique, un histogramme, un diagramme en barres ou circulaire, en boite… (ttechno l.115)<br>Passer du graphique aux données et vice versa (ttechno l.116)                                                                                                                               | origine                                    | « lire un graphique » / « passer du graphique aux données » : lire                                               |

### 5-080

- origine : Calculer la moyenne simple d'une série de données (12, 15, 9, 14 → ?).
- 2ᵉ (nouveau code) : Interpréter la moyenne simple d'une série de données (une moyenne de 12 veut-elle dire que chacun a 12 ?).

| Grade | Ligne(s) d'automatisme (seed)                                 | Cible proposée | Justification                          |
| ----- | ------------------------------------------------------------- | -------------- | -------------------------------------- |
| 3     | Moyenne ; médiane d'une petite série ; étendue (cycle4 l.498) | origine        | BO « calculer une moyenne » : calculer |
| 4     | Moyenne d'un très petit nombre de valeurs (cycle4 l.468)      | origine        | BO « calculer une moyenne » : calculer |

### 5-096

- origine : Lire une donnée sur un graphique cartésien, courbe ou nuage de points (quelle est l'ordonnée du point d'abscisse 2 ?).
- 2ᵉ (nouveau code) : Interpréter les données d'un graphique cartésien, courbe ou nuage de points (pour quelles valeurs la grandeur dépasse-t-elle 10 ?).

| Grade    | Ligne(s) d'automatisme (seed)                                                                                                                                                   | Cible proposée                             | Justification                                                                                                    |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| 2        | Lire et commenter des graphiques usuels (barres, circulaire, courbe, nuage) (2de l.387)                                                                                         | **les deux** : origine + 2ᵉ (nouveau code) | « lire ET commenter » : lire et interpréter                                                                      |
| 1_GEN    | Passer du graphique aux données et vice-versa (1gen l.103)<br>Lire et commenter des graphiques usuels (barres, circulaire, courbe, nuage) (2de l.387, reprise 2)                | **les deux** : origine + 2ᵉ (nouveau code) | « lire un graphique » / « passer du graphique aux données » : lire ; « lire ET commenter » : lire et interpréter |
| 1_SPE    | Passer du graphique aux données et vice-versa (1spe l.407)<br>Lire et commenter des graphiques usuels (barres, circulaire, courbe, nuage) (2de l.387, reprise 2)                | **les deux** : origine + 2ᵉ (nouveau code) | « lire un graphique » / « passer du graphique aux données » : lire ; « lire ET commenter » : lire et interpréter |
| 1_TECHNO | Passer du graphique aux données et vice-versa (1techno l.101)<br>Lire et commenter des graphiques usuels (barres, circulaire, courbe, nuage) (2de l.387, reprise 2)             | **les deux** : origine + 2ᵉ (nouveau code) | « lire un graphique » / « passer du graphique aux données » : lire ; « lire ET commenter » : lire et interpréter |
| T_COMP   | Passer du graphique aux données et vice-versa (1spe l.407, reprise 1_SPE)<br>Lire et commenter des graphiques usuels (barres, circulaire, courbe, nuage) (2de l.387, reprise 2) | **les deux** : origine + 2ᵉ (nouveau code) | « lire un graphique » / « passer du graphique aux données » : lire ; « lire ET commenter » : lire et interpréter |
| T_SPE    | Passer du graphique aux données et vice-versa (1spe l.407, reprise 1_SPE)<br>Lire et commenter des graphiques usuels (barres, circulaire, courbe, nuage) (2de l.387, reprise 2) | **les deux** : origine + 2ᵉ (nouveau code) | « lire un graphique » / « passer du graphique aux données » : lire ; « lire ET commenter » : lire et interpréter |
| T_TECHNO | Passer du graphique aux données et vice versa (ttechno l.116)                                                                                                                   | origine                                    | « lire un graphique » / « passer du graphique aux données » : lire                                               |

### 5-110

- origine : Lire une donnée sur un diagramme en barres (combien d'élèves ont 12 ans ?).
- 2ᵉ (nouveau code) : Interpréter les données d'un diagramme en barres (quel âge est le plus fréquent ?).

| Grade    | Ligne(s) d'automatisme (seed)                                                                                                                                                                                                                                                                     | Cible proposée                             | Justification                                                                                                    |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| 2        | Lire et commenter des graphiques usuels (barres, circulaire, courbe, nuage) (2de l.387)                                                                                                                                                                                                           | **les deux** : origine + 2ᵉ (nouveau code) | « lire ET commenter » : lire et interpréter                                                                      |
| 1_GEN    | Lire un graphique, un histogramme, un diagramme en barres ou circulaire, en boite… (1gen l.102)<br>Passer du graphique aux données et vice-versa (1gen l.103)<br>Lire et commenter des graphiques usuels (barres, circulaire, courbe, nuage) (2de l.387, reprise 2)                               | **les deux** : origine + 2ᵉ (nouveau code) | « lire un graphique » / « passer du graphique aux données » : lire ; « lire ET commenter » : lire et interpréter |
| 1_SPE    | Lire un graphique, un histogramme, un diagramme en barres ou circulaire, en boite… (1spe l.406)<br>Passer du graphique aux données et vice-versa (1spe l.407)<br>Lire et commenter des graphiques usuels (barres, circulaire, courbe, nuage) (2de l.387, reprise 2)                               | **les deux** : origine + 2ᵉ (nouveau code) | « lire un graphique » / « passer du graphique aux données » : lire ; « lire ET commenter » : lire et interpréter |
| 1_TECHNO | Lire un graphique, un histogramme, un diagramme en barres ou circulaire, en boite… (1techno l.100)<br>Passer du graphique aux données et vice-versa (1techno l.101)<br>Lire et commenter des graphiques usuels (barres, circulaire, courbe, nuage) (2de l.387, reprise 2)                         | **les deux** : origine + 2ᵉ (nouveau code) | « lire un graphique » / « passer du graphique aux données » : lire ; « lire ET commenter » : lire et interpréter |
| T_COMP   | Lire un graphique, un histogramme, un diagramme en barres ou circulaire, en boite… (1spe l.406, reprise 1_SPE)<br>Passer du graphique aux données et vice-versa (1spe l.407, reprise 1_SPE)<br>Lire et commenter des graphiques usuels (barres, circulaire, courbe, nuage) (2de l.387, reprise 2) | **les deux** : origine + 2ᵉ (nouveau code) | « lire un graphique » / « passer du graphique aux données » : lire ; « lire ET commenter » : lire et interpréter |
| T_SPE    | Lire un graphique, un histogramme, un diagramme en barres ou circulaire, en boite… (1spe l.406, reprise 1_SPE)<br>Passer du graphique aux données et vice-versa (1spe l.407, reprise 1_SPE)<br>Lire et commenter des graphiques usuels (barres, circulaire, courbe, nuage) (2de l.387, reprise 2) | **les deux** : origine + 2ᵉ (nouveau code) | « lire un graphique » / « passer du graphique aux données » : lire ; « lire ET commenter » : lire et interpréter |
| T_TECHNO | Lire un graphique, un histogramme, un diagramme en barres ou circulaire, en boite… (ttechno l.115)<br>Passer du graphique aux données et vice versa (ttechno l.116)                                                                                                                               | origine                                    | « lire un graphique » / « passer du graphique aux données » : lire                                               |

### 5-111

- origine : Lire une donnée sur un diagramme circulaire (quelle part des élèves vient à vélo ?).
- 2ᵉ (nouveau code) : Interpréter les données d'un diagramme circulaire (quel moyen de transport est le plus utilisé ?).

| Grade    | Ligne(s) d'automatisme (seed)                                                                                                                                                                                                                                                                     | Cible proposée                             | Justification                                                                                                    |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| 2        | Lire et commenter des graphiques usuels (barres, circulaire, courbe, nuage) (2de l.387)                                                                                                                                                                                                           | **les deux** : origine + 2ᵉ (nouveau code) | « lire ET commenter » : lire et interpréter                                                                      |
| 1_GEN    | Lire un graphique, un histogramme, un diagramme en barres ou circulaire, en boite… (1gen l.102)<br>Passer du graphique aux données et vice-versa (1gen l.103)<br>Lire et commenter des graphiques usuels (barres, circulaire, courbe, nuage) (2de l.387, reprise 2)                               | **les deux** : origine + 2ᵉ (nouveau code) | « lire un graphique » / « passer du graphique aux données » : lire ; « lire ET commenter » : lire et interpréter |
| 1_SPE    | Lire un graphique, un histogramme, un diagramme en barres ou circulaire, en boite… (1spe l.406)<br>Passer du graphique aux données et vice-versa (1spe l.407)<br>Lire et commenter des graphiques usuels (barres, circulaire, courbe, nuage) (2de l.387, reprise 2)                               | **les deux** : origine + 2ᵉ (nouveau code) | « lire un graphique » / « passer du graphique aux données » : lire ; « lire ET commenter » : lire et interpréter |
| 1_TECHNO | Lire un graphique, un histogramme, un diagramme en barres ou circulaire, en boite… (1techno l.100)<br>Passer du graphique aux données et vice-versa (1techno l.101)<br>Lire et commenter des graphiques usuels (barres, circulaire, courbe, nuage) (2de l.387, reprise 2)                         | **les deux** : origine + 2ᵉ (nouveau code) | « lire un graphique » / « passer du graphique aux données » : lire ; « lire ET commenter » : lire et interpréter |
| T_COMP   | Lire un graphique, un histogramme, un diagramme en barres ou circulaire, en boite… (1spe l.406, reprise 1_SPE)<br>Passer du graphique aux données et vice-versa (1spe l.407, reprise 1_SPE)<br>Lire et commenter des graphiques usuels (barres, circulaire, courbe, nuage) (2de l.387, reprise 2) | **les deux** : origine + 2ᵉ (nouveau code) | « lire un graphique » / « passer du graphique aux données » : lire ; « lire ET commenter » : lire et interpréter |
| T_SPE    | Lire un graphique, un histogramme, un diagramme en barres ou circulaire, en boite… (1spe l.406, reprise 1_SPE)<br>Passer du graphique aux données et vice-versa (1spe l.407, reprise 1_SPE)<br>Lire et commenter des graphiques usuels (barres, circulaire, courbe, nuage) (2de l.387, reprise 2) | **les deux** : origine + 2ᵉ (nouveau code) | « lire un graphique » / « passer du graphique aux données » : lire ; « lire ET commenter » : lire et interpréter |
| T_TECHNO | Lire un graphique, un histogramme, un diagramme en barres ou circulaire, en boite… (ttechno l.115)<br>Passer du graphique aux données et vice versa (ttechno l.116)                                                                                                                               | origine                                    | « lire un graphique » / « passer du graphique aux données » : lire                                               |

### 6-133

- origine : Comparer deux fractions (3/4 … 5/6).
- 2ᵉ (nouveau code) : Encadrer une fraction par deux nombres entiers consécutifs (… < 7/3 < …).

| Grade | Ligne(s) d'automatisme (seed)          | Cible proposée | Justification                          |
| ----- | -------------------------------------- | -------------- | -------------------------------------- |
| 5     | Comparer deux fractions (cycle4 l.404) | origine        | « comparer deux fractions » : comparer |

### 6-135

- origine : Additionner des fractions (2/3 + 1/6 = ?).
- 2ᵉ (nouveau code) : Soustraire des fractions (2/3 − 1/6 = ?).

| Grade | Ligne(s) d'automatisme (seed)                                | Cible proposée                             | Justification                                                |
| ----- | ------------------------------------------------------------ | ------------------------------------------ | ------------------------------------------------------------ |
| 5     | Addition et soustraction de fractions simples (cycle4 l.406) | **les deux** : origine + 2ᵉ (nouveau code) | « addition et soustraction de fractions simples » : les deux |

### 6-178

- origine : Connaître le cercle circonscrit à un triangle (son centre est le point de concours des médiatrices).
- 2ᵉ (nouveau code) : Construire le cercle circonscrit à un triangle.

| Grade | Ligne(s) d'automatisme (seed)                           | Cible proposée | Justification                                                                  |
| ----- | ------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------ |
| 5     | Médiatrice, cercle circonscrit (notions) (cycle4 l.425) | origine        | BO 5e « connaitre la notion de médiatrice, de cercle circonscrit » : connaître |

### 6-181

- origine : Associer à un assemblage de cubes ses représentations planes (vue de dessus, de face…).
- 2ᵉ (nouveau code) : Retrouver un assemblage de cubes à partir de ses représentations planes.
- 3ᵉ (nouveau code) : Dénombrer les cubes d'un assemblage.

| Grade | Ligne(s) d'automatisme (seed)                                                            | Cible proposée                             | Justification                                                                            |
| ----- | ---------------------------------------------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------- |
| 5     | Vues et dénombrement d'empilements de cubes ; cube et pavé en perspective (cycle4 l.416) | **les deux** : origine + 3ᵉ (nouveau code) | BO 5e « reconnaitre des vues » (associer) et « dénombrer des cubes » : 1re et 3e parties |

### CE2-022

- origine : Connaître des faits multiplicatifs usuels : les doubles (double de 35 = ?).
- 2ᵉ (nouveau code) : Connaître des faits multiplicatifs usuels : les moitiés (moitié de 70 = ?).

| Grade | Ligne(s) d'automatisme (seed)                                                          | Cible proposée                             | Justification                                        |
| ----- | -------------------------------------------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------- |
| 4     | Double, triple, moitié, prédécesseur, successeur, carré d'un nombre (cycle4 l.456)     | **les deux** : origine + 2ᵉ (nouveau code) | « double, triple, moitié … » : doubles et moitiés    |
| 6     | Relations multiplicatives simples (double, quadruple, moitié, tiers, quart) (6e l.218) | **les deux** : origine + 2ᵉ (nouveau code) | « double, quadruple, moitié … » : doubles et moitiés |

### CM2-008

- origine : Déterminer si un nombre entier inférieur ou égal à 10 est un diviseur d'un nombre entier donné (7 est-il un diviseur de 56 ?).
- 2ᵉ (nouveau code) : Déterminer si un nombre entier donné est un multiple d'un nombre entier inférieur ou égal à 10 (56 est-il un multiple de 7 ?).

| Grade | Ligne(s) d'automatisme (seed)                                                                    | Cible proposée                             | Justification                       |
| ----- | ------------------------------------------------------------------------------------------------ | ------------------------------------------ | ----------------------------------- |
| 6     | Diviseurs, multiples et tables de multiplication réactivés (calcul sur les fractions) (6e l.195) | **les deux** : origine + 2ᵉ (nouveau code) | « diviseurs, multiples » : les deux |

### CM2-013

- origine : Lire et écrire une fraction en chiffres et en lettres (cinq tiers ↔ 5/3).
- 2ᵉ (nouveau code) : Représenter une fraction donnée par un partage (colorier les parts d'une figure).
- 3ᵉ (nouveau code) : Interpréter un partage par une fraction (quelle part de la figure est coloriée ?).

| Grade | Ligne(s) d'automatisme (seed)                                       | Cible proposée    | Justification                                                                         |
| ----- | ------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------- |
| 6     | Reconnaître une fraction sur des représentations variées (6e l.192) | 3ᵉ (nouveau code) | « reconnaître une fraction sur des représentations variées » : interpréter un partage |

### CM2-030

- origine : Écrire à virgule un nombre donné par une fraction décimale ou une somme de fractions décimales (237/100 = ? ou 2 + 3/10 + 7/100 = ?).
- 2ᵉ (nouveau code) : Écrire un nombre à virgule sous forme de fraction décimale ou de somme de fractions décimales (2,37 = ?/100).

| Grade | Ligne(s) d'automatisme (seed)                                                                                                                                                      | Cible proposée                             | Justification                                  |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ---------------------------------------------- |
| 6     | Équivalences d'écriture 1/10 = 0,1 ; 1/100 = 0,01 ; 1/1000 = 0,001 (6e l.188)<br>Passage fraction décimale / somme de fractions décimales ↔ écriture décimale (4,107…) (6e l.189) | **les deux** : origine + 2ᵉ (nouveau code) | équivalences et passage « ↔ » : les deux sens |

### CM2-036

- origine : Connaître le répertoire multiplicatif : donner le produit de deux nombres (7 × 8 = ?).
- 2ᵉ (nouveau code) : Connaître le répertoire multiplicatif : compléter une multiplication à trou (7 × ? = 56).

| Grade | Ligne(s) d'automatisme (seed)                                                           | Cible proposée                             | Justification                                                                |
| ----- | --------------------------------------------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------- |
| 4     | Entretien des tables de multiplication (cycle4 l.440)                                   | **les deux** : origine + 2ᵉ (nouveau code) | « entretien des tables » : les deux sens                                     |
| 5     | Tables pour factoriser un entier en produit de deux nombres (21 = 3 × 7) (cycle4 l.394) | 2ᵉ (nouveau code)                          | factoriser 21 = 3 × 7 : trouver les facteurs, c'est la multiplication à trou |

### CM2-107

- origine : Lire une donnée dans un tableau (quelle est la population de Lyon ?).
- 2ᵉ (nouveau code) : Interpréter les données d'un tableau (quelle ville est la plus peuplée ?).

| Grade | Ligne(s) d'automatisme (seed)                                                                                 | Cible proposée | Justification                         |
| ----- | ------------------------------------------------------------------------------------------------------------- | -------------- | ------------------------------------- |
| 6     | Lire un tableau, un diagramme en barres, un diagramme circulaire ou une courbe (lecture immédiate) (6e l.217) | origine        | « lire … (lecture immédiate) » : lire |

### CM2-123

- origine : Lire une donnée sur un diagramme en barres (combien de livres ont été prêtés en mars ?).
- 2ᵉ (nouveau code) : Interpréter les données d'un diagramme en barres (combien de livres de plus en mars qu'en février ?).

| Grade | Ligne(s) d'automatisme (seed)                                                                                 | Cible proposée | Justification                         |
| ----- | ------------------------------------------------------------------------------------------------------------- | -------------- | ------------------------------------- |
| 6     | Lire un tableau, un diagramme en barres, un diagramme circulaire ou une courbe (lecture immédiate) (6e l.217) | origine        | « lire … (lecture immédiate) » : lire |

### CM2-124

- origine : Lire une donnée sur un diagramme circulaire (quelle part des élèves vient à vélo ?).
- 2ᵉ (nouveau code) : Interpréter les données d'un diagramme circulaire (quel moyen de transport est le plus utilisé ?).

| Grade | Ligne(s) d'automatisme (seed)                                                                                 | Cible proposée | Justification                         |
| ----- | ------------------------------------------------------------------------------------------------------------- | -------------- | ------------------------------------- |
| 6     | Lire un tableau, un diagramme en barres, un diagramme circulaire ou une courbe (lecture immédiate) (6e l.217) | origine        | « lire … (lecture immédiate) » : lire |

### CM2-125

- origine : Lire une donnée sur une courbe (quelle température à 14 h ?).
- 2ᵉ (nouveau code) : Interpréter les données d'une courbe (entre quelles heures la température augmente-t-elle ?).

| Grade | Ligne(s) d'automatisme (seed)                                                                                 | Cible proposée | Justification                         |
| ----- | ------------------------------------------------------------------------------------------------------------- | -------------- | ------------------------------------- |
| 6     | Lire un tableau, un diagramme en barres, un diagramme circulaire ou une courbe (lecture immédiate) (6e l.217) | origine        | « lire … (lecture immédiate) » : lire |

## 3. Synthèse

| Cible                   | Références |
| ----------------------- | ---------- |
| origine seule           | 36         |
| les deux (origine + 2ᵉ) | 99         |
| origine + 3ᵉ            | 1          |
| 2ᵉ seule                | 8          |
| 3ᵉ seule                | 7          |

Après la migration, la table compterait **251** lignes pour ces points (au lieu de 151).

### Cas à trancher par David

- **5-077, 5-110, 5-111, 5-096 en 1re et en Tle (sauf T_TECHNO)** : les lignes propres de 1re (« lire un graphique », « passer du graphique aux données ») ne visent que la lecture, mais la liste de 2de reprise (« lire et commenter ») vise aussi l'interprétation → « les deux ». Si David préfère que la 1re ne suive que ses propres lignes, ces références passent sur l'origine seule.
- **3-023 (2de et reprises)** : « lignes trigonométriques » sans verbe ; proposé « les deux ». Alternative : l'utilisation seule (2ᵉ).
- **3-022 (2de et reprises)** : « application simple » → la 3ᵉ partie seule (calculer une longueur). Alternative : 2ᵉ + 3ᵉ (écrire l'égalité fait partie de l'application).
- **6-181 (5e)** : « reconnaitre des vues » et « dénombrer » → origine + 3ᵉ ; la 2ᵉ (retrouver l'assemblage depuis ses vues) n'est pas visée.
- **CM2-036 (5e)** : « tables pour factoriser 21 = 3 × 7 » → l'opération à trou seule, par analogie avec la décision de David sur « 2 + … = 7 » (option A du 2026-10-11).
