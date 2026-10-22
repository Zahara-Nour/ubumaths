# Passe des points — Seconde (grade `2`)

Source : `bo/2de.txt` (relu en entier, Automatismes compris) · 201 points · détail ligne à ligne : [2de.tsv](2de.tsv).
Les numéros de ligne cités sont ceux de `bo/2de.txt`.

## Bilan chiffré

|                                                                          | Lignes | Points neufs |
| ------------------------------------------------------------------------ | ------ | ------------ |
| COUPER (au total)                                                        | 53     | +62          |
| dont 1a (plusieurs savoirs dans la puce, mixtes compris)                 | 46     |              |
| dont 1b seul (deux gestes) : 2-231, 2-331, 2-380, 2-381, 2-395           | 5      |              |
| dont famille (question 2 : jumeau du collège ou d'un autre programme)    | 15     |              |
| GARDER (non-coupe argumentée)                                            | 10     |              |
| Doublons du BO (question 3) : 2-373 ≈ 2-380, 2-374 ≈ 2-381, mot pour mot | 2      |              |
| ⚙ (question 4) : l. 320-333, l. 348, l. 357 (×2)                         | 3      | +4           |
| Références d'automatismes à ajouter (aucun point neuf) : l. 310, l. 347  | 2      |              |

Les points des autres programmes du lycée à couper de la même façon : 1TECHNO-059, TCOMP-237, TCOMP-238,
TTECHNO-043 (équation / inéquation), 1SPE-359 (espérance, variance, écart type), 1SPE-353 (langue naturelle ↔
symbolique). TCOMP-233/234 sont déjà séparés par le BO lui-même, ce qui appuie la coupe équation / inéquation.

Quand une coupe touche un point visé par des listes d'automatismes, la partie visée garde le code (2-214
réciproque, 2-279/2-280 forme générale, 2-314 « deux points », 2-315 lecture graphique, 2-316 équation réduite,
2-330 produit, 2-347 m, 2-372 histogramme). Quand une ligne énumère les deux parties (2-276, 2-331, 2-336, 2-380,
2-381), la seconde moitié est ajoutée aux mêmes listes, comme au collège (« les deux »).

## Questions pour David (avec ma recommandation)

1. **Équation / inéquation** (2-336 à 2-344, 2-337, 2-338 : 11 points, +11) : on coupe comme 3-042 au collège ?
   **Reco : oui.** Et « graphiquement ou algébriquement » ? **Reco : non.** Le « ou » dit un choix de méthode,
   alors que 3-014 disait « analytiquement **et** graphiquement ».
2. **2-315 pente / vecteur directeur × équation / graphique** : ×4 ou ×2 ? **Reco : ×4.** Ici le « ou » dit sous
   quelle forme la droite est donnée, pas une méthode à choisir : lire et calculer sont deux gestes.
3. **Doublons 2-373/2-380 et 2-374/2-381** : la règle archive le second, mais ce sont 2-380/2-381 qui portent
   les références (2, 1re, Tle). **Reco : archiver 2-373 et 2-374** (aucune référence, aucun modèle), puis
   couper 2-380 et 2-381 (1b).
4. **Produit / quotient** (2-268, 2-330, et 2-337 qui passerait à ×4) : on coupe ? **Reco : oui.** Le quotient
   ajoute la valeur interdite.
5. **2-279 / 2-280 en trois formes**, la forme générale en tête (c'est elle que visent les références), au
   motif que le collège en a fait trois points (5-045, 5-126, 4-025) ? **Reco : oui.**
6. **2-236** : ×2 (divisibilité / parité) ou ×3 (multiple / diviseur / parité, comme CM2-008) ? **Reco : ×2.**
   Le BO donne une seule définition, a = kb.
7. **2-382 en trois appuis** (moyenne–écart type, médiane–EIQ, graphiques) ? **Reco : oui.** Cela déplace la
   référence de la ligne l. 383 (boîtes à moustaches) vers la 3e moitié : c'est à toi de dire si c'est permis.
8. **Connecteurs « et » / « ou » (2-210) et quantification universelle / existentielle (2-215)** : 1a ou
   variantes d'un même geste ? **Reco : couper.** Leurs règles de vérité diffèrent.
9. **Automatismes** : ⚙ « expressions multiplicatives » (l. 323, mal extraite : à recopier du PDF), ⚙ « le tout
   connaissant une partie » (l. 348), ⚙ « déterminer graphiquement des images » et « des antécédents » (l. 357,
   3-040 ne fait que définir le vocabulaire) ; références à ajouter : l. 310 « directement » → 5-017, 5-025,
   6-133 et l. 347 « appliquer » → 5-086, 5-140. **Reco : tout accepter.**

## À vérifier avant la migration

- Points coupés qui ont des modèles tagués : 2-245 (5), 2-201, 2-261, 2-263, 2-340, 2-347, 2-395 (2 chacun),
  2-202, 2-210, 2-214, 2-339 (1 chacun). Il faut relire chaque modèle : il peut relever de la nouvelle moitié.
- Écarts code ↔ BO : le libellé de 2-380 a perdu le « cas particulier… centre de la classe » (l. 815) ; 2-280
  écrit ax ⩾ b où le BO (l. 517) a la coquille « a ⩾ b » ; l. 606-607 et l. 711 restent sans point (décisions
  du seed 2de et de la passe des points vagues).
