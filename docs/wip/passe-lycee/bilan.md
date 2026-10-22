# Passe lycée — bilan chiffré de la consolidation

Source : [propositions.tsv](propositions.tsv). « Après » = points actifs si tout le `DECIDE` passe ; « avec recos » =
en plus, les questions de [questions.md](questions.md) tranchées selon la reco. Une coupe ×n compte n − 1 points neufs.

| Programme | Avant | Coupes (points neufs) | Réduits (T4) |   ⚙ | Rétablis | Archivés | Après | Avec recos | À trancher |
| --------- | ----: | --------------------: | -----------: | --: | -------: | -------: | ----: | ---------: | ---------: |
| 2de       |   201 |              57 (+82) |            0 |   4 |        3 |        2 |   288 |        292 |          4 |
| 1SPE      |   165 |              50 (+65) |            0 |   2 |        3 |        0 |   235 |        237 |         10 |
| 1GEN      |    44 |              13 (+16) |            0 |   2 |        0 |        0 |    62 |         64 |          4 |
| 1TECHNO   |   105 |              27 (+32) |            1 |   2 |        2 |        0 |   141 |        143 |          4 |
| TSPE      |   239 |              56 (+85) |            0 |   0 |   0 (+1) |        0 |   324 |        325 |          5 |
| TCOMP     |   129 |              31 (+47) |            1 |   0 |        2 |        0 |   178 |        178 |          3 |
| TEXP      |   153 |              17 (+23) |            1 |   0 |        0 |        0 |   176 |        176 |          0 |
| TTECHNO   |    69 |              16 (+21) |            1 |   1 |        0 |        0 |    91 |         92 |          2 |
| **Total** |  1105 |            267 (+371) |            4 |  11 |  10 (+1) |        2 |  1495 |       1507 |         32 |

- Coupes décidées : 267 lignes ; 6 coupes de plus à trancher (2-236, 2-382 et la famille « afin de », +8 points).
- ⚙ : 11 points décidés (2de ×4 : multiplicatives, le tout connaissant une partie, images, antécédents ; signe lu graphiquement et droite par un point et sa pente dans
  chacune des trois 1res, T5 ; inégalité en Tle techno) ; 3 à trancher (coefficient directeur, ×3).
- Rétablis (T6) : 10 décidés (2de ex-2-099, ex-2-100, ex-2-332 ; 1SPE ex-033, ex-129, ex-142 ; 1TECHNO ×2 ;
  TCOMP ex-007, ex-030) + Tle spé l. 421 (un point, reco). Autres retraits : 8, reco ne pas rétablir.
- Archivés : 2-373, 2-374 (T4). Réduits sans créer le doublon (T4) : 1TECHNO-087, TCOMP-225, TEXP-331, TTECHNO-019
  (et TTECHNO-015 perd sa 3e partie).
- Non-coupes montrées : 56 `GARDE` (42 décidées, 14 à trancher).
- Tags de prod : 85 points coupés portent 167 modèles tagués, à répartir à l'étape c.
- Contrôles par script : 366 citations `ligne_bo` retrouvées dans `bo/<prog>.txt` (1 sans citation : ex-1SPE-062,
  absent du BO en vigueur) ; tous les codes non neufs existent dans `points-lycee.csv`.
