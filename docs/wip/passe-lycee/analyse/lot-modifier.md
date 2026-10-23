# Lot MODIFIER + TAG_PAR_VARIATION — liste modèle par modèle (phase 0)

_Source : les CSV de verdicts de `analyse/` (recos reportées), décisions de principe du 2026-10-23 (journal).
Plan des scissions : `scissions-plan.csv` et `scissions-notes.md`._

## Décisions de principe (David, 2026-10-23)

- MODIFIER ou TAG_PAR_VARIATION pour **un autre programme** que celui du modèle → pas de tag (le modèle ne
  s'appauvrit pas à son niveau). **Exception à trancher** : § 4.
- TAG_PAR_VARIATION au niveau du modèle → **scission** (lot D) ; QCM de cours et vrai/faux à 4 points ou plus →
  sans tag.

## 1. MODIFIER au niveau du modèle (18 modèles)

Méthode du collège : une migration par lot ; chaque modification vérifie l'ancienne valeur ; corrigés et specs de
test suivent ; puis le modèle reçoit le tag de son point.

### Lot A — resserrer les nombres ou changer une fonction (2)

| Modèle     | Point     | Modification                                                                                       |
| ---------- | --------- | -------------------------------------------------------------------------------------------------- |
| `9f00da01` | 1SPE-384  | V2 : b/(2a) entier ou demi-entier (et lot B : retirer V3, forme factorisée)                        |
| `95ee8348` | TCOMP-272 | V2 : intégrande √(t² + c) → 1/(t² + c) ou ln(t² + c), F′(2) exact (modèle aussi scindé en Tle spé) |

### Lot B — retirer des variations (6)

| Modèle     | Point    | Modification                                                                                      |
| ---------- | -------- | ------------------------------------------------------------------------------------------------- |
| `f3e68e4b` | 2-396    | Retirer V2 (tableau en pourcentages)                                                              |
| `0ab3faa5` | 1SPE-204 | Retirer V3 (négation sans quantificateur, relève de la 2de)                                       |
| `9f00da01` | 1SPE-384 | Retirer V3 (cf. lot A)                                                                            |
| `a69dfde7` | TSPE-325 | Retirer V2 (couples i ≠ j) et V4 (toutes les parties) ; **V5 (ligne du triangle de Pascal) : B1** |
| `f2133048` | TEXP-264 | Retirer V5 (rotation nommée) et « rotation » des distracteurs ; **V4 (image de z̄) : B2**          |
| `6be786ef` | TEXP-315 | Retirer V2 (cycle) et les distracteurs « C'est un cycle » ; **V4 (connexité) : B3**               |

### Lot C — consigne, énoncé ou corrigé (10)

| Modèle     | Point    | Modification                                                                                                              |
| ---------- | -------- | ------------------------------------------------------------------------------------------------------------------------- |
| `849aabbc` | 1SPE-231 | « Détermine la limite » → « Quelle semble être la limite » (conjecture)                                                   |
| `bb554c62` | 1SPE-283 | Retirer « limites aux bornes de l'ensemble de définition » du verso                                                       |
| `227f2c9c` | 1SPE-295 | **C1**                                                                                                                    |
| `f7194c9d` | 1SPE-304 | « angle orienté de mesure x » → « réel x » ; « mesure principale » → « réel de ]−π ; π] associé au même point du cercle » |
| `f2cc01fc` | 1SPE-318 | V3 : « une mesure en radians de l'angle (u, v) », sans « orienté »                                                        |
| `293f8225` | TEXP-246 | V1 : l'énoncé rappelle « on admet que le conjugué d'une racine est racine »                                               |
| `6ff00846` | TEXP-246 | V1 : « à coefficients réels » ; V3-V4 : même rappel                                                                       |
| `8d69e3a9` | TEXP-323 | **C2**                                                                                                                    |
| `93539700` | TEXP-323 | V2 : donner la matrice de la rotation, comme V3                                                                           |
| `cd4f9fb3` | TEXP-338 | **C3**                                                                                                                    |

Plus `646b4cd3` (TSPE-376) : **C4**.

### Choix à faire

- **B1** `a69dfde7` V5 → (a) modèle neuf tagué TSPE-323 (reco, comme les scissions) ; (b) retirer V5.
- **B2** `f2133048` V4 → (a) modèle neuf tagué TEXP-357 (reco) ; (b) retirer V4.
- **B3** `6be786ef` V4 → (a) modèle neuf tagué TEXP-316 (reco) ; (b) la garder sur TEXP-315 (connexité définie par
  les chaînes).
- **C1** `227f2c9c` → (a) corrigé par e^(ax+b) = e^b·e^(ax), sans énoncer (e^u)′ = u′e^u (reco, rien n'est perdu) ;
  (b) retirer b (e^(ax) seulement).
- **C2** `8d69e3a9` V3 → (a) définir l'homothétie dans l'énoncé, comme V1 pour la rotation (reco) ; (b) retirer V3.
- **C3** `cd4f9fb3` V1, V2, V4 → (a) donner la formule de l'inverse dans l'énoncé (reco, comme V3) ; (b) demander de
  vérifier AB = I.
- **C4** `646b4cd3` V4 (centre et rayon par complétion des carrés) → (a) l'accepter comme lecture inverse du même
  savoir : pas de modification, simple TAG (reco) ; (b) retirer V4.

## 4. Modèles hors programme à leur niveau (10) — à trancher

Ma reco « pas de tag pour un autre programme » supposait que le modèle s'appauvrirait à son niveau. Ces 10 modèles
de 1re spé sont **HORS_PROGRAMME en 1re spé** : rien à appauvrir, et sans traitement ils restent sans aucun tag.

| Modèle     | Programme | Verdict           | Points              | Titre                                            |
| ---------- | --------- | ----------------- | ------------------- | ------------------------------------------------ |
| `463f483e` | T_SPE     | MODIFIER          | TSPE-458            | Résoudre cos x ≥ a ou cos x < a sur un tour      |
| `fccd570b` | T_SPE     | MODIFIER          | TSPE-458            | Résoudre sin x > a sur un tour                   |
| `99c772c0` | T_SPE     | MODIFIER          | TSPE-457            | Équations trigonométriques : aucune solution     |
| `7eec7032` | T_SPE     | TAG_PAR_VARIATION | TSPE-597, TSPE-598  | Parité et périodicité de cosinus et sinus        |
| `68db64b0` | 2         | TAG_PAR_VARIATION | 2-491, 2-350        | Lecture graphique sur la courbe d'une fonction   |
| `9724dc3d` | 2         | TAG_PAR_VARIATION | 2-404, 2-405, 2-406 | Intersection, réunion et complémentaire          |
| `0a1ff14f` | 2         | TAG_PAR_VARIATION | 2-207, 2-205        | Cardinal d'une réunion et d'un produit cartésien |
| `219c9470` | 2         | TAG_PAR_VARIATION | 2-210, 2-408        | « Et » et « ou » : vrai ou faux ?                |
| `6c3ee9e6` | 2         | TAG_PAR_VARIATION | 2-210, 2-408        | « Et », « ou » et intervalles                    |
| `5426cead` | 2         | TAG_PAR_VARIATION | 2-410, 2-214, 2-411 | Implication, réciproque, contraposée             |

Options : (a) les traiter dans leur vrai programme, comme s'il était le leur (modifier, scinder) — reco ; (b) pas de
tag, liste gardée. Le niveau (`grades`) de ces modèles reste une question à part (au collège : 3 changements de
niveau, #1563).
