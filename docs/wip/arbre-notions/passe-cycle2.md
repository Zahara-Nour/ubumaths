# Passe « puces et points » sur le cycle 2 (seed en prod) — règles du lycée

> **Statut : VALIDÉ par David le 2026-10-08 (« je valide cycle 2 », doutes = recos). EN PROD
> (PR #974, `db:migrate` le 2026-10-09, vérifié : 72 CP, 89 CE1, 83 CE2, 34 en fluence).**
> Demande de David (2026-10-08) : « la passe que l'on vient de faire pour la 2nde il faut le
> faire pour le cycle 2, le cycle 3 et le cycle 4. Je veux le même soin à traiter les puces
> et points du programme que ce qu'on a fait pour le lycée. »
> Source relue **en entier** : « Annexe 4 — Programme de mathématiques du cycle 2 » (BO n° 41
> du 31 octobre 2024, texte en vigueur en 2026 : CP depuis 2025, CE1 en 2026 ; aucun texte
> plus récent), 38 p., **colonne « Exemples de réussite » comprise** — elle n'est pas
> exigible, mais elle donne les mots du BO pour spécifier un point vague.
> Points relus : les **227 points** du seed cycle 2 (`seed-cycle2.md`, CP-001…069,
> CE1-001…082, CE2-001…076). Rien n'est modifié : ce document propose, David tranche.

## Pourquoi cette passe

Le cycle 2 a été seedé avec une règle **plus lâche** que le lycée : « une puce couvrant
plusieurs sous-notions d'une même notion → point sur la **notion** », et **aucune scission**.
Le lycée applique la règle de la 2de : **deux gestes réussissables séparément, sur des nœuds
différents = deux points** (« Ajustement affine, point moyen » → ×2 ; « représentation
graphique d'une suite arithmétique ou d'une fonction affine » → ×2…). Et la règle « points
vagues » : un point trop vague se spécifie **avec les mots du BO** ; un point qui relève de
l'évaluation par compétence n'est pas un point.

## Bilan

|                           | CP  | CE1 | CE2 | Total                                                                                |
| ------------------------- | --- | --- | --- | ------------------------------------------------------------------------------------ |
| Puces scindées            | 3   | 7   | 6   | **16 puces → +17 points**                                                            |
| Points spécifiés (vagues) | 5   | 2   | 1   | **8** (+ les faits multiplicatifs, spécifiés par leur scission ; + CE1-012, doute 3) |
| Retraits                  | 0   | 0   | 0   | **0**                                                                                |
| Points après la passe     | 72  | 89  | 83  | **244** (227 + 17)                                                                   |

**Aucune suppression.** Une scission garde le point d'origine (son code, ses usages) pour la
**première partie**, et ajoute les autres parties avec un code neuf en fin de série
(CP-070…, CE1-083…, CE2-077…), rangées juste après la première dans l'ordre d'affichage.

**Références d'automatismes** : un seul point touché est visé — **CE2-022** (« faits
multiplicatifs usuels »), par la 6e (« Relations multiplicatives simples : double,
quadruple, moitié, tiers, quart ») et la 4e (« Double, triple, moitié… »). Les deux lignes
portent sur les doubles et les moitiés : elles restent **justes** sur la première partie,
qui garde le code CE2-022. Aucune référence à déplacer.

---

## 1. Puces scindées (16 → +17 points)

| Point       | Puce du BO                                                                                                                           | Parties proposées (libellé → nœud)                                                                                                                                                                                                                                                | Pourquoi                                                                                                                                                         |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **CP-001**  | « Comparer et dénombrer des collections en les organisant. »                                                                         | CP-001 « Dénombrer des collections en les organisant » → `Entiers : numération > dénombrer` · **CP-070** « Comparer des collections en les organisant » → `> comparer`                                                                                                            | Deux gestes (le BO : « facilite la comparaison et le dénombrement ») ; au CE1 le BO ne garde que « Dénombrer… ».                                                 |
| **CP-045**  | « Simuler des achats en manipulant des pièces et des billets fictifs. Rendre la monnaie. »                                           | CP-045 « Simuler des achats en manipulant des pièces et des billets fictifs » → `Monnaie > pièces et billets` · **CP-071** « Rendre la monnaie » → `Monnaie > rendre la monnaie`                                                                                                  | Deux phrases, deux gestes, deux sous-notions.                                                                                                                    |
| **CP-068**  | « Collecter des données et présenter ces données sous forme d'un tableau ou d'un diagramme en barres. »                              | CP-068 « Collecter des données et présenter ces données sous forme d'un tableau » → `Représenter des données > tableaux` · **CP-072** « Présenter des données collectées sous forme d'un diagramme en barres » → `> diagrammes en barres`                                         | Deux productions, deux sous-notions (aujourd'hui : la notion).                                                                                                   |
| **CE1-028** | « Connaitre des faits multiplicatifs usuels. » (vague seul)                                                                          | CE1-028 « Connaitre des faits multiplicatifs usuels : les doubles et les moitiés » → `Entiers : multiplication > double et moitié` · **CE1-083** « Connaitre des faits multiplicatifs usuels : les multiples de 25 (1 × 25, 2 × 25, 3 × 25, 4 × 25) » → `> produits particuliers` | Les « Exemples de réussite » (l. 920-928) disent ce que recouvre la puce : doubles, moitiés, multiples de 25 — deux familles, deux sous-notions.                 |
| **CE1-029** | « Ajouter ou soustraire un nombre entier de dizaines à un nombre. Ajouter ou soustraire un nombre entier de centaines à un nombre. » | CE1-029 « …de dizaines à un nombre » · **CE1-084** « Ajouter ou soustraire un nombre entier de centaines à un nombre » — tous deux `> calcul astucieux`, `fluence`                                                                                                                | Deux phrases du BO, deux faits réussissables séparément (même nœud : c'est la règle des deux phrases, pas celle des nœuds — voir doute 1).                       |
| **CE1-052** | « Disposer de quelques masses de référence. Estimer la masse d'objets du quotidien en gramme ou en kilogramme. »                     | CE1-052 « Disposer de quelques masses de référence » (**conn.**) · **CE1-085** « Estimer la masse d'objets du quotidien en gramme ou en kilogramme » (s-f) — tous deux `Masses > comparer et mesurer`                                                                             | Deux phrases ; le BO de CE2 en fait **deux puces** (CE2-049 conn., CE2-050 s-f). La première partie passe en connaissance, comme CE2-049.                        |
| **CE1-057** | « Simuler des achats… Rendre la monnaie. »                                                                                           | comme CP-045 → **CE1-086** « Rendre la monnaie »                                                                                                                                                                                                                                  | idem                                                                                                                                                             |
| **CE1-073** | « Utiliser la règle pour vérifier des alignements et l'équerre pour vérifier qu'un angle est droit. »                                | CE1-073 « Utiliser la règle pour vérifier des alignements » → `Figures planes > reconnaître et décrire` (comme CP-058) · **CE1-087** « Utiliser l'équerre pour vérifier qu'un angle est droit » → `> angles droits`                                                               | Deux instruments, deux gestes, deux sous-notions (aujourd'hui : la notion).                                                                                      |
| **CE1-081** | « Produire un tableau ou un diagramme en barres pour présenter des données recueillies. »                                            | CE1-081 « Produire un tableau pour présenter des données recueillies » → `> tableaux` · **CE1-088** « Produire un diagramme en barres pour présenter des données recueillies » → `> diagrammes en barres`                                                                         | Deux productions, deux sous-notions.                                                                                                                             |
| **CE1-082** | « Lire et interpréter les données d'un diagramme en barres. Lire et interpréter les données d'un tableau à double entrée. »          | CE1-082 « …d'un diagramme en barres » → `> diagrammes en barres` · **CE1-089** « Lire et interpréter les données d'un tableau à double entrée » → `> tableau à double entrée`                                                                                                     | Deux phrases, deux sous-notions.                                                                                                                                 |
| **CE2-022** | « Connaitre des faits multiplicatifs usuels. »                                                                                       | CE2-022 « …: les doubles et les moitiés » → `double et moitié` · **CE2-077** « …: les multiples de 25 (1 × 25, 2 × 25, 3 × 25, 4 × 25) » → `produits particuliers` · **CE2-078** « …: les décompositions multiplicatives de 60 » → `Entiers : multiplication > décomposition`     | Exemples de réussite l. 1435-1445 ; le CE2 ajoute les décompositions de 60. **Les 2 références (6e, 4e) restent sur CE2-022** : elles visent doubles et moitiés. |
| **CE2-029** | « Résoudre des problèmes additifs en une étape de types parties-tout et comparaison. »                                               | CE2-029 « Résoudre des problèmes additifs en une étape de type parties-tout » → `Problèmes arithmétiques > parties-tout` · **CE2-079** « Résoudre des problèmes additifs de comparaison en une étape » → `> comparaison`                                                          | Deux types de problèmes que le CE1 sépare (CE1-036, CE1-037) ; aujourd'hui : la notion.                                                                          |
| **CE2-054** | « Simuler des achats… Rendre la monnaie. »                                                                                           | comme CP-045 → **CE2-080** « Rendre la monnaie »                                                                                                                                                                                                                                  | idem                                                                                                                                                             |
| **CE2-071** | « Connaitre et utiliser le codage d'un angle droit et celui qui indique que des segments ont la même longueur. »                     | CE2-071 « Connaitre et utiliser le codage d'un angle droit » → `Figures planes > angles droits` · **CE2-081** « Connaitre et utiliser le codage qui indique que des segments ont la même longueur » → `> reconnaître et décrire`                                                  | Deux codages, deux sous-notions (aujourd'hui : la notion).                                                                                                       |
| **CE2-074** | « Produire un tableau ou un diagramme en barres… »                                                                                   | comme CE1-081 → **CE2-082**                                                                                                                                                                                                                                                       | idem                                                                                                                                                             |
| **CE2-075** | « Lire et interpréter les données d'un tableau à double entrée ou d'un diagramme en barres. »                                        | CE2-075 « …d'un tableau à double entrée » → `> tableau à double entrée` · **CE2-083** « Lire et interpréter les données d'un diagramme en barres » → `> diagrammes en barres`                                                                                                     | Deux supports, deux sous-notions.                                                                                                                                |

Chaque partie garde le kind et le régime de la puce (sauf CE1-052, signalé).

## 2. Points vagues spécifiés avec les mots du BO (8)

| Point       | Libellé actuel                                                    | Nouveau libellé                                                                                                                                                                                                                                                                                                                                                                                   | Passage du BO |
| ----------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| **CP-032**  | Utiliser le lexique spécifique associé aux longueurs.             | Utiliser le lexique spécifique associé aux longueurs : long, court, près, loin                                                                                                                                                                                                                                                                                                                    | l. 1654       |
| **CP-039**  | Utiliser le lexique associé aux masses.                           | Utiliser le lexique associé aux masses : lourd, léger                                                                                                                                                                                                                                                                                                                                             | l. 1677       |
| **CP-041**  | Utiliser le lexique spécifique lié à la monnaie.                  | Utiliser le lexique spécifique lié à la monnaie : plus cher, moins cher, rendre la monnaie, billet, pièce, somme, reste, euros                                                                                                                                                                                                                                                                    | l. 1700-1701  |
| **CP-061**  | Connaitre et utiliser le vocabulaire lié aux positions relatives. | Connaitre et utiliser le vocabulaire lié aux positions relatives : gauche, droite ; sur, sous, entre, devant, derrière, au-dessus, en dessous                                                                                                                                                                                                                                                     | l. 2135-2137  |
| **CE1-076** | (même puce)                                                       | …: à gauche, à droite ; sur, sous, entre, devant, derrière, au-dessus, en dessous ; près, loin                                                                                                                                                                                                                                                                                                    | l. 2269-2272  |
| **CE1-069** | Utiliser le vocabulaire géométrique approprié.                    | Utiliser le vocabulaire géométrique usuel : carré, rectangle, triangle, triangle rectangle, côté, sommet, angle, disque, cercle, centre ; point, droite, segment, milieu d'un segment ; angle droit, angle aigu, angle obtus                                                                                                                                                                      | l. 2223-2227  |
| **CE2-067** | Utiliser le vocabulaire géométrique approprié.                    | Utiliser le vocabulaire géométrique usuel : polygone, triangle, quadrilatère, pentagone et hexagone ; carré, rectangle, losange, triangle, triangle rectangle, côté, sommet, angle ; diagonale (pour un quadrilatère), longueur du rectangle, largeur du rectangle ; disque, cercle, centre, rayon, diamètre ; point, droite, segment, milieu d'un segment ; angle droit, angle aigu, angle obtus | l. 2349-2356  |
| **CP-010**  | Comprendre et utiliser les nombres ordinaux.                      | Utiliser les nombres ordinaux pour indiquer une position dans une liste ou dans une suite                                                                                                                                                                                                                                                                                                         | l. 260-261    |

Ces libellés sont longs, mais c'est exactement ce qu'un modèle de question doit savoir :
quels mots, quelles positions. Le lexique reste **un** point (un seul geste : employer le
mot juste) — même règle que les puces de vocabulaire du lycée.

## 3. Examinés et gardés (avec la raison)

- **Un seul nœud, un seul geste** (règle du lycée : on garde) : « Comparer, encadrer,
  intercaler des nombres entiers » (CP-006, CE1-007, CE2-007 — l'arbre n'a que `comparer`) ;
  « Savoir interpréter, représenter, écrire et lire les fractions… » (CE1-016, 017 →
  `définition`) ; « Partager une unité de longueur en fractions d'unité et mesurer… »
  (CE2-012 → `droite graduée`, un seul procédé) ; « Comparer et mesurer des durées
  écoulées » (CE1-063, CE2-059 → `calculer`) ; « Reconnaitre, nommer et décrire… »,
  « Reproduire ou construire… », « Utiliser la règle graduée, l'équerre et le compas comme
  instruments de tracé » (une sous-notion chacun).
- **Vocabulaire ou sens d'une famille d'opérations** (un seul geste, sur la notion) :
  « Comprendre le sens de l'addition et de la soustraction » (CP-014 — le BO les lie :
  « la soustraction est comprise comme l'opération inverse de l'addition », l. 300) ;
  symboles « + », « - », « = » (CP-015) ; mots « terme, somme, différence » (CE2-015) ;
  « facteur, produit, multiple » (CE2-017, discutable 4 déjà tranché).
- **Questionnables tels quels** : les longueurs et masses de référence (le BO les
  questionne : « une trousse, plutôt 2 cm, 20 cm ou 2 m ? », l. 1762) ; le repérage et les
  déplacements (plans, instructions « avancer, reculer, tourner… », l. 2154) ; les
  constructions de solides et d'assemblages ; toutes les puces de calcul mental (déjà au
  grain du fait numérique) ; toutes les puces de problèmes (chacune nomme son type).
- **Problèmes à partir de données** : « Résoudre des problèmes en utilisant les données d'un
  tableau à double entrée ou d'un diagramme en barre » (CE2-076) reste **sur la notion** —
  le geste évalué est la résolution, la représentation n'est que la source des données, et
  sa lecture est déjà portée par les points scindés CE2-075 / CE2-083. Même décision au
  cycle 3 (CM1-122, CM2-108), par cohérence. Alternative : scinder (voir doute 4).
- **Rattachements déjà tranchés** (discutables 1-8 du seed) : non rouverts, sauf le 1 et
  le 8 que les scissions de CE1-028/CE2-022, CE1-073 et CE2-071 rendent caducs (les parties
  ont chacune leur sous-notion).

## 4. Doutes (avec reco)

1. **CE1-029 et CE1-052 : scinder sur un même nœud ?** La règle du lycée scinde quand les
   parties visent des nœuds différents ; ici les deux parties restent sur le même nœud.
   Mais le BO écrit **deux phrases**, et pour CE1-052 le BO de CE2 sépare lui-même les deux
   puces. Reco : **scinder** (deux faits, deux questions). Alternative : garder en un point.
2. **« Connaitre et utiliser diverses représentations d'un nombre et passer de l'une à
   l'autre »** (CP-004, CE1-005, CE2-005) : les Exemples de réussite listent les
   représentations « notamment » (matériel, chiffres, oral, unités de numération,
   décompositions, lettres). Reco : **garder** — le geste (passer d'une représentation à
   l'autre) est clair et questionnable ; lister ferait croire la liste fermée.
   Alternative : spécifier avec la liste.
3. **CE1-012** (« Comprendre et utiliser les nombres ordinaux », CE1) : le BO de CE1 ne
   donne pas d'exemple propre à cette puce. Reco : la spécifier **comme CP-010** (même puce,
   mêmes mots du BO de CP). Alternative : la laisser telle quelle.

4. **CE2-076** (« Résoudre des problèmes en utilisant les données d'un tableau à double
   entrée ou d'un diagramme en barre ») : reco **garder sur la notion** (voir ci-dessus).
   Alternative : scinder en deux, comme la lecture des données (CE2-075).

## Questions

- **Validation d'ensemble** : les 16 scissions, les 8 spécifications, les cas gardés, et
  les 4 doutes ci-dessus.

## Après validation (plan de livraison)

Une PR dédiée (ou une PR par cycle, selon ce que tu préfères) : migration **additive**
(`update` du libellé, du nœud, et du kind pour CE1-052 ; `insert` des 17 parties neuves ;
décalage de l'ordre d'affichage), aucune suppression ; mise à jour de `seed-cycle2.md`, de
la fixture et du test intégral du cycle 2 (244 points) ; preuve rouge, suite d'intégration,
audit, CI, merge, `db:migrate`, vérification en prod.
