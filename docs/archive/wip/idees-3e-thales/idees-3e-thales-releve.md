# Relevé « Théorème de Thalès » de 3e (2026-11-27)

Chantier [`idees-3e-thales`](idees-3e-thales-progress.md). Les 10 exercices de la rubrique
« Théorème de Thalès » de 3e d'une autre plateforme (codes 3G2), lus dans le code source de la copie
locale, classes de base de 4e comprises (les `-old` et `Old` sont ignorés). Ils sont comparés à nos
modèles de tous les niveaux, relevés en prod. Les ids sont ceux de la plateforme. La phase 0 tirée
de ce relevé est dans le journal.

## Nos modèles (prod, 2026-11-27)

Notion « Géométrie > Théorème de Thalès ». Sous-notion « calcul de longueurs » :

- **f55d07b0** « Calculer une longueur avec Thalès » (3-060), saisie d'un nombre. v1 MN (emboîtés) ;
  v2 AN ; v3 MN (papillon) ; v4 AB depuis AM, AN, AC (côté du grand triangle, emboîtés) ; v5 MN
  depuis AM et MB (AB = AM + MB). Longueurs entières (AB 4 à 12, AM 2 à 11, BC 3 à 15), résultat
  au centième au plus.
- **034e6b74** « Écrire l'égalité de Thalès » (3-059), QCM : emboîtés, papillon, emboîtés
  autrement orientés.
- **16478dab** « Reconnaître une configuration de Thalès » (3-022), QCM : nom de la configuration,
  triangles à utiliser, droites qui doivent être parallèles.

Sous-notion « réciproque » :

- **37c13d51** « Réciproque et contraposée de Thalès » (3-055), QCM oui / non. v1 emboîtés, v2
  papillon. On donne AM, AB, AN, AC ; dans le cas non parallèle, AN est faussé de 0,1 à 0,3.
  Correction par les produits en croix.

Ailleurs : **19889310** « Proportionnalité, graphique et Thalès » (3-037) ; **bdcc75c5** « Droite
des milieux » (4e). Aucun modèle, à aucun niveau, sur l'agrandissement ou la réduction (k, k², k³),
les triangles semblables ou les triangles égaux.

## Bornes

- 3-022, 3-055, 3-059, 3-060 : configurations des triangles emboîtés et du papillon seulement
  (`docs/systeme/programmes/bornes/cycle4.md`).
- **Absents du BO en vigueur** (bornes générales, n° 13) : rotation, homothétie, triangles
  semblables. « Aucun point ne doit les générer. » L'agrandissement et la réduction de figures ne
  figurent pas non plus dans le BO de cycle 4 (`outils-manquants.md` § 2). En 3e, les sections se
  limitent au pavé, au cylindre et à la boule (3-020) : pas de section de pyramide ni de cône. Les
  triangles égaux (cas d'égalité) ne figurent dans aucun programme du dépôt
  (`src/lib/server/programmes/transcriptions/`, grep « semblab|égaux|agrandi » : rien en cycle 4 ni
  au lycée).

## Relevé

| Id       | Ce qu'on demande                                                                                                                                                                                                                                                                                                                                                      | Forme de réponse chez eux                                                                       | Nos modèles                                                                                  | Verdict                                                                         |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 3G20     | Calculer MN et CB avec une figure. Le papillon est tiré par défaut, emboîtés en option. On donne AC, AB, CM, CN : CB (côté du **grand** triangle) se calcule depuis le petit. AB et AC entiers de 5 à 10, k ∈ {0,3 ; 0,4 ; 0,6 ; 0,7 ; 0,8}                                                                                                                           | Deux cases, grandeur avec unité (cm attendu), tout ou rien                                      | f55d07b0 : MN en papillon (v3) ; côté du grand triangle en emboîtés seulement (v4)           | 🟡 manque le côté du grand triangle en papillon → **F1**                        |
| 3G20-1   | Problèmes en deux temps. (1) Triangles rectangles imbriqués : (EB) et (DC) perpendiculaires à (AD), donc parallèles, puis Thalès pour DC. (2) Rectangle ABCD, (MN) parallèle à la diagonale (BD) : Thalès dans ABD donne AN, puis DN = AD − AN (AD = BC, propriété du rectangle)                                                                                      | Une case numérique                                                                              | Aucun : nos énoncés donnent toujours le parallélisme, et la longueur cherchée sort de Thalès | ❌ → **F2**                                                                     |
| 3G20-2   | Écrire la double égalité de Thalès (emboîtés ou papillon), sans longueur                                                                                                                                                                                                                                                                                              | Texte saisi, comparé à une liste de chaînes (permutations des lettres, des rapports, inversion) | 034e6b74 (QCM)                                                                               | ✅ (écrire plutôt que choisir : noté en outil manquant, **F4**)                 |
| 3G20DNB0 | Sujet de brevet (Métropole 2024) : cercle et diamètre, triangle rectangle par le cercle, réciproque de Pythagore, AF par Thalès, aires, pourcentage                                                                                                                                                                                                                   | Pas de saisie                                                                                   | Chaque étape a son modèle (4-036, 4-072, 3-060, aires)                                       | ✅ rien : rubrique « Sujets de brevet » (3Z1), à faire en dernier               |
| 3G21     | Les droites sont-elles parallèles ? Niveau 1 : AB, AC, AM, AN donnés. Niveau 2 : AB, AC, **BM, CN** donnés, donc AM et AN à calculer d'abord (soustraction en emboîtés, addition en papillon). Niveau 3 : sans figure. Écart de 10 % entre les rapports dans le cas non parallèle. Correction par les deux rapports mis au même dénominateur, puis l'ordre des points | Texte « oui » / « non »                                                                         | 37c13d51 : niveau 1 seulement (v1 emboîtés, v2 papillon)                                     | 🟡 manque le niveau 2 → **F3**                                                  |
| 3G22     | Section d'une pyramide ou d'un cône par un plan parallèle à la base : aire de la base, volume, aire de la section (k²), volume de la petite pyramide (k³), volume du tronc. Problème du cône de glace (racine cubique de 1 − k³)                                                                                                                                      | Cinq cases numériques, arrondis imposés                                                         | Volumes de la pyramide (6a770d04) et du cône (35002b15) en 4e ; rien sur k² ni k³            | ⛔ hors programme (section de pyramide ou de cône, agrandissement) → **F5**     |
| 3G22-1   | Agrandissement ou réduction de rapport k : aire ou volume de l'image (k², k³), aire ou volume de départ, k depuis deux longueurs, deux aires, deux volumes ; conservation des angles. k = n/10, n de 1 à 20, n ≠ 10                                                                                                                                                   | Grandeur avec unité, ou k seul                                                                  | Aucun                                                                                        | ⛔ hors programme (agrandissement absent du BO) → **F5**                        |
| 3G23     | Où placer M pour que ABC et DEM soient égaux ? Quadrillage, quatre points proposés, deux bonnes réponses (M et son symétrique par rapport au milieu de [DE])                                                                                                                                                                                                          | Cases à cocher                                                                                  | Aucun                                                                                        | ⛔ hors programme (triangles égaux absents du BO) → **F6**                      |
| 3G24-1   | Triangles semblables : côtés et sommets homologues (listes déroulantes) ; semblables ou non, par les angles, par les longueurs, triangles rectangles imbriqués, configuration de Thalès                                                                                                                                                                               | Listes déroulantes, oui / non                                                                   | Aucun                                                                                        | ⛔ hors programme (bornes n° 13 : « aucun point ne doit les générer ») → **F6** |
| 3G24-2   | Deux triangles semblables codés par leurs angles : calculer les deux longueurs inconnues du second (k entier, 0,5 ou décimal)                                                                                                                                                                                                                                         | Deux cases numériques                                                                           | Aucun                                                                                        | ⛔ hors programme (bornes n° 13) → **F6**                                       |

## Ce que leur format fait et que le nôtre ne fait pas

- **3G20-2** : saisir une égalité de rapports de longueurs, jugée juste à l'ordre des lettres d'un
  segment, à l'ordre des rapports et à l'inversion de tous les rapports près. Nous la faisons
  choisir dans un QCM (034e6b74). → `outils-manquants.md`, si David le veut (Q3 du journal).
- **3G20** : deux cases jugées « tout ou rien ». Notre règle est « une case par question » : pas
  d'outil manquant, notre forme est voulue.

## Anomalies relevées chez eux (pour mémoire, sans suite)

- 3G22, cas 3 : le volume de la pyramide utilise `c × c` au lieu de `c × c2`.
- 3G22, cas 5 : l'unité affichée est « cm » alors que la valeur attendue est en mm.
- 3G24-1, type 4 : « non » peut être attendu alors que la figure est toujours semblable.
