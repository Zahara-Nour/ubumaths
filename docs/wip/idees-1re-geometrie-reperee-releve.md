# Relevé « géométrie repérée » de Première spécialité (2026-11-27)

Chantier [`idees-1re-geometrie-reperee`](idees-1re-geometrie-reperee-progress.md) · [fiches de phase 0](idees-1re-geometrie-reperee-fiches.md).
Les 5 exercices de la rubrique 1G2 de l'autre plateforme (sans les `Old`) ont été lus dans leur code
source (copie locale), puis comparés à nos modèles en prod (lecture seule) : les 16 modèles publiés
tagués sur les points de géométrie repérée de 1re spé (1SPE-327 à 335, 417 à 420, 437), et les
modèles d'équation de droite de 2de. Les ids sont ceux de l'autre plateforme.

**Bilan** : 7 ✅, 0 🟡, 2 ❌ (9 cas). La géométrie repérée est déjà bien couverte, pièce par pièce. Il
manque les deux **problèmes de synthèse**, qui enchaînent ces pièces sur une même figure.

| Id     | Cas                         | Ce qu'on demande                                                                                                                                                                                                                       | Forme de réponse                   | Modèle(s) Chiphre                                                                                          | Verdict                                 |
| ------ | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| 1G20-1 | 1 : vecteur normal          | A (−5 à 5), n (−5 à 5, non nuls) : équation cartésienne de d                                                                                                                                                                           | saisie, équation jugée équivalente | e710f32f v1, v2 (figure) ; 71d10661                                                                        | ✅                                      |
| 1G20-1 | 2 : deux points             | A, B (−5 à 5) : équation cartésienne de (AB)                                                                                                                                                                                           | saisie                             | 6e074f0e (2de)                                                                                             | ✅ (2de)                                |
| 1G20-1 | 3 : vecteur directeur       | A, u : équation cartésienne                                                                                                                                                                                                            | saisie                             | d8a958ba (2de)                                                                                             | ✅ (2de)                                |
| 1G20-1 | 4 : coefficient directeur   | A, m (±1 à ±5) : équation cartésienne                                                                                                                                                                                                  | saisie                             | e6552232 (2de) ; 7c0f1c1a v3 (réduite → cartésienne)                                                       | ✅ (2de)                                |
| 1G20-2 | 1 : médiatrice              | A, B (milieu entier, AB² ⩾ 8) : équation cartésienne de la médiatrice de [AB]                                                                                                                                                          | saisie                             | c2add21a v1, v2 (MA = MB), v3 (figure)                                                                     | ✅                                      |
| 1G20-2 | 2 : hauteur                 | A, B, C non alignés : équation cartésienne de la hauteur issue de A                                                                                                                                                                    | saisie                             | 81811b59 v1 à v3                                                                                           | ✅                                      |
| 1G20-3 | —                           | d : ax + by + c = 0 et A (H entier par construction) : coordonnées du projeté H de A sur d                                                                                                                                             | 2 cases                            | 9bea5ec2 v1 à v3 ; f6c423de (distance)                                                                     | ✅                                      |
| 1G21-1 | synthèse                    | A, B, C entiers (−5 à 5) non alignés : 1. équation de (AB) ; 2. équation de la perpendiculaire d à (AB) par C ; 3. H = (AB) ∩ d ; 4. AB ; 5. milieu Ω de [AB] ; 6. équation du cercle de diamètre [AB]                                 | 6 saisies, fractions irréductibles | les pièces séparées : 6e074f0e, 518f7f0b, 9bea5ec2, a6d7b414 v2 ; aucune chaîne                            | ❌ problème de synthèse en repère       |
| 1G21-2 | synthèse (produit scalaire) | Carré OABC de côté 4 à 10, I(xA ; yI), H projeté de C sur (OI), cercle ε de centre D(xA/2 ; xA/2) : 1. OI, OC, OI·OC ; 2. OI·OC = OI × OH, OI, OH ; 3. équation de (CH) (OI normal), équation développée de ε, M ∈ ε ∩ (CH) ? (O ou N) | 8 cases, dont un O / N             | 9f4c4a19 (configuration, carré sans produit scalaire) ; ed2c1c0b (synthèse produit scalaire, autre figure) | ❌ problème de synthèse avec projection |

## Ce que leur format fait et que le nôtre ne fait pas

Rien. Leurs équations sont jugées « équivalentes » (multiples acceptés), comme nos cases
`answerKind: equation`. Leurs problèmes de synthèse à 6 ou 8 champs s'écrivent chez nous en une
variation à plusieurs cases numérotées, comme ed2c1c0b (7 cases, choix compris). Leur « Répondre O ou
N » devient un choix à quatre réponses (fiche F2), pour ne pas laisser un Oui / Non au hasard.

## Programme

Tout est au programme de 1re spé (BO, `1_SPE.md`, « Géométrie repérée ») : vecteur normal et
équation de droite (1SPE-330), projeté orthogonal (1SPE-331), équation de cercle (1SPE-332, 418),
« Utiliser un repère pour étudier une configuration » (1SPE-437). Les cas 2 à 4 de 1G20-1 sont du
programme de 2de, déjà couverts par nos modèles de 2de. Les bornes (`docs/systeme/programmes/bornes/lycee/1spe.md`)
ne demandent qu'un repère orthonormé.
