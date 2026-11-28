# Relevé « Espace » de 3e (2026-11-27)

Chantier [`idees-3e-espace`](idees-3e-espace-progress.md). Les 6 exercices de la rubrique « Espace »
de 3e d'une autre plateforme (codes 3G4), lus dans le code source de la copie locale, classe de base
de 5e comprise pour 3G43 (les `-old` et `Old` sont ignorés). Ils sont comparés à nos modèles de tous
les niveaux, relevés en prod. Les ids sont ceux de la plateforme. La phase 0 tirée de ce relevé est
dans le journal.

## Nos modèles (prod, 2026-11-27)

Notion « Solides » :

- **6bcb3535** « Boule ou sphère ? » (3-018), QCM : position d'un point (OM comparé à r), ensemble
  des points tels que OM = r ou OM ⩽ r.
- **cd756e21** « Grands cercles et diamètre d'une sphère » (3-019) : rayon ↔ diamètre, rayon d'un
  grand cercle, grands cercles de la Terre (QCM à plusieurs réponses : équateur, méridien).
- **7bb95104** « Sections de solides » (3-020), sous-notion « sections planes » : v1 pavé parallèle
  à une face (QCM sur la nature et les dimensions), v2 cylindre perpendiculaire à l'axe (QCM), v3
  cylindre parallèle à l'axe (QCM), v4 boule : **rayon de la section** depuis R et la distance au
  centre (saisie).

Notion « Volumes » :

- **87f79961** « Volume d'une boule » (3-021), sous-notion « boule » : valeur exacte depuis r (v1,
  v2), arrondi au cm³ (v3), depuis le diamètre (v4), demi-boule (v5).
- **35002b15** « Volume d'un cône » (4-076), **6a770d04** « Volume d'une pyramide » (4-029),
  **0761124d** cube et pavé (5-050), **47971d3d** et **55b26d32** cylindre (5-053), **9dea9199**
  prisme droit (5-108). Toutes les dimensions d'un énoncé sont dans la **même unité**.

Notion « Théorème de Pythagore », sous-notion « calcul de longueurs » : **22d947f4** « Calculer une
longueur avec Pythagore » (4-034), figures planes seulement. **Aucun modèle, à aucun niveau, ne fait
appliquer Pythagore dans un solide** (diagonale d'un cube ou d'un pavé, génératrice d'un cône, arête
d'une pyramide).

## Bornes

- 3-018 à 3-021 (`docs/systeme/programmes/bornes/cycle4.md`, Troisième) : sections du pavé
  parallèlement à une face, du cylindre parallèlement ou perpendiculairement à l'axe, de la boule
  (décision c4-4 : liste du BO seulement) ; volume d'une boule **de rayon donné**, V = 4/3 πr³.
- **Absent du BO en vigueur** (bornes générales de 3e) : « repérage sur la sphère », présent dans
  les Attendus 3e 2019 seulement. L'aire de la sphère (4πr²) ne figure pas non plus dans le BO
  (`src/lib/server/programmes/transcriptions/cycle-4/3-espace.md`) ; le cylindre qui contient la
  boule y est cité en prolongement (Archimède, 2/3 du cylindre).
- Pythagore (4-034) : « calculer un côté connaissant les deux autres ». Point de 4e : un modèle tagué
  4-034 a `grades` = 4 (un point d'un niveau précédent est interdit, ADR 0020). Le cône et la
  pyramide sont au programme de 4e (4-027, 4-028).

## Relevé

| Id     | Ce qu'on demande                                                                                                                                                                                                                                                                                     | Forme de réponse chez eux                      | Nos modèles                                                                 | Verdict                                                                                                       |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 3G40   | Sphère terrestre en perspective (parallèles et méridiens de 10° en 10°) : lire les coordonnées d'un point marqué, ou placer un point de coordonnées données. Latitude de −30° à 60°, longitude de −60° à 40°                                                                                         | Papier seulement (aucune saisie)               | Aucun                                                                       | ⛔ hors programme (repérage sur la sphère absent du BO) → **F4**                                              |
| 3G40-1 | Globe 3D réaliste avec des villes réelles : latitude ou longitude d'une ville, à 2° près, avec N/S ou E/O                                                                                                                                                                                            | Deux champs : angle (intervalle ±2°) et lettre | Aucun                                                                       | ⛔ hors programme → **F4**                                                                                    |
| 3G41-1 | Reproduire un pavé en perspective et tracer sa section par un plan passant par deux points d'arêtes, **parallèle à une arête** (le seul cas tiré coupe le pavé en biais, pas parallèlement à une face)                                                                                               | Figure à tracer, pas de saisie                 | 7bb95104 v1 : section parallèle à une face (QCM)                            | ⛔ hors bornes (section parallèle à une arête, décision c4-4) → **F2**                                        |
| 3G42   | Volume d'une boule arrondi au dixième, unité tirée (km à mm) : (1) depuis le rayon, (2) depuis le diamètre, (3) depuis l'aire de la sphère, (4) boule dans une boîte cylindrique de même diamètre et de hauteur 2r : volume laissé libre. r de 2 à 30                                                | Grandeur avec unité                            | 87f79961 : rayon (v1 à v3), diamètre (v4), demi-boule (v5)                  | 🟡 (1) (2) ✅ ; (3) ⛔ aire de la sphère hors BO ; (4) manque → **F3**                                        |
| 3G43   | Reprise de leur exercice de 5e « Calculer des volumes » : cube, pavé, cylindre, prisme, cône, pyramides, boule ; option « avec des conversions » : les dimensions d'un même solide en **unités différentes** (longueur en dm, hauteur en mm…), option « avec des décimaux »                          | Grandeur avec unité, ou QCM                    | Un modèle par solide (5-050, 5-053, 5-108, 4-029, 4-076, 3-021), même unité | 🟡 manquent les unités mélangées → **F5**                                                                     |
| 3G44   | Longueurs dans l'espace par Pythagore, arrondies au dixième : diagonale d'une face puis du cube ; idem du pavé ; cylindre (centre d'une base à un point du cercle de l'autre) ; arête latérale d'une pyramide régulière ; génératrice d'un cône ; rayon d'une sphère ; rayon d'une section de sphère | Grandeur avec unité (unité tirée de km à mm)   | 7bb95104 v4 (rayon de la section) ; rien pour les autres                    | 🟡 rayon de la section ✅ ; Pythagore dans un solide → **F1** ; rayon de la sphère depuis la section → **F2** |

## Ce que leur format fait et que le nôtre ne fait pas

- **3G40, 3G40-1** : une sphère avec parallèles et méridiens, des points à lire ou à placer. Notre
  bloc ` ```solide ` dessine une boule sans graduations. Hors programme : pas noté en outil manquant,
  sauf si David veut le modèle (F4).
- **3G44** : la diagonale [AG] tracée dans le cube ou le pavé, et le triangle rectangle qui sert
  (angle droit codé). Notre bloc ` ```solide ` sait marquer une arête, une face, des points, des
  droites (qui dépassent du solide) et des vecteurs, **pas un segment entre deux sommets** ni un
  angle droit. → proposé en outil manquant (Q1 du journal).
- **3G41-1** : tracer une section sur le dessin. Notre `section:` est un affichage ; hors bornes ici,
  pas noté.

## Anomalies relevées chez eux (pour mémoire, sans suite)

- 3G42, cas 2 : la variable nommée `d` est en fait le rayon (le diamètre affiché est `2 * d`) ; le
  résultat est juste.
- 3G41-1 : le tirage du cas est forcé (`choix = 3`) juste après `randint(1, 3)`.
- 3G40-1 : Oran figure deux fois dans la liste des villes, Sydney aussi ; Kampala a les coordonnées
  de Phnom Penh, Berlin une latitude de 55,8° (celle de Moscou).
