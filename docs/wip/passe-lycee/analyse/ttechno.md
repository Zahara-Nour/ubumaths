# Passe des points — Terminale technologique (`T_TECHNO`, 69 points)

Source : `bo/ttechno.txt` (696 lignes, relu en entier, Automatismes compris). Détail : [ttechno.tsv](ttechno.tsv)
(26 lignes ; citations vérifiées par script). Aucun point `TTECHNO-*` n'est tagué en prod. Le Vocabulaire et
l'Algorithmique ne créent aucun point en Tle (tout renvoie à la 2de et à la 1re techno) : leurs coupes viennent de
la 1re (1TECHNO-001, 008) et de la 2de (2-214).

## Bilan

- **Coupes fermes : 15 points → +16 points neufs**, dont 1 aussitôt archivé (doublon « notation Σ », voir Q3).
  10 en 1a (008, 009, 014, 015, 017, 019, 030, 043 ×3, 048, 067), 5 en 1b (036, 037, 049, 062, 069).
- **À trancher : 3** (034, 042 : propriétés algébriques ; 052 : « afin de »).
- **Familles** : 3-023 (connaître / utiliser, coupé en 3e) pour 036 et 037 ; 3-042 / 3-065 pour 043 ; TCOMP-237,
  238, 239 (équations, inéquations, seuil) ; 2-335 (courbe de la fonction inverse) ; 1SPE-241 (sommes de carrés,
  de cubes) ; TSPE-439, 1SPE-290 (propriétés algébriques) ; 1TECHNO-029 et 044 ; TCOMP-295.
- **Non-coupes argumentées : 6** (003, 005, 031, 040, 064, 068).
- **Doublon du BO (question 3) : 1.** « ; notation Σ » est écrit sous les suites arithmétiques (l. 456) **et** sous
  les suites géométriques (l. 461) : la moitié « notation Σ » de 019 répète celle de 017.
- **Points ⚙ (question 4) : 1 en Tle + 1 en 2de.**
  - l. 415 « Isoler une variable dans une égalité ou une inégalité » : l'inégalité n'a pas de point (2-273 / 2-274 :
    égalité ; la liste de 2de, l. 342, ne dit qu'« égalité ») → ⚙ `T_TECHNO`.
  - l. 423 « Déterminer graphiquement des images et des antécédents » : la cible 3-040 n'est que du vocabulaire. La
    même ligne est dans la liste de 2de (l. 357) : le ⚙ va en 2de (déjà proposé dans `2de.tsv`), la Tle le référence.
  - l. 427 (signe lu sur un graphique) et l. 429 (droite par un point et son coefficient directeur) : référencer
    les ⚙ proposés en 1re techno (`1techno.tsv`).

## Automatismes : références à corriger (pas de point)

- l. 402 (indice) : TTECHNO-015 coupé en « interpréter » / « calculer un indice » ; « calculer le taux d'évolution
  entre deux valeurs » a déjà ses points (2-367, 2-377 : cibles de la ligne l. 401).
- l. 405 « … par une suite géométrique dont on identifie la raison » → 1TECHNO-042, 036. Ajouter **TTECHNO-023**
  (« Déterminer la raison d'une suite géométrique modélisant une évolution »), cible exacte de « identifie la raison ».
- l. 395 « Calculer, appliquer, exprimer une proportion » → 6-140, 4-056. Ajouter **5-086 / 5-140** (calculer /
  appliquer une proportion, coupés en 5e) ; même ligne dans la liste de 2de (l. 347), à aligner avec la passe 2de.
- l. 430 « Lire graphiquement l'équation réduite d'une droite » → ajouter **3-045 / 3-067** (comme en 1re techno).
- l. 650 « Calculer l'espérance … et l'interpréter » (entretien) → les deux moitiés de 1TECHNO-099.
- l. 249 « distinguer une proposition de sa réciproque » → seulement la moitié « réciproque » de 2-214 (passe 2de).

## Questions pour David (recommandation en tête)

1. **034 et 042, « Propriétés algébriques : » suivies de trois formules.** Reco : couper en trois chacune (trois
   opérations, comme l'exemple « dérivée de xⁿ, de 1/x ») et passer les points sur les nœuds plus justes
   `… > propriétés algébriques`. Le seed les avait gardées comme « une famille de formules ».
2. **TTECHNO-015 (point ⚙)** : retirer du libellé « calculer le taux d'évolution entre deux valeurs », déjà porté
   par 2-367 / 2-377 ? Reco : oui (rien d'ajouté, rien de perdu : la ligne garde ses cibles).
3. **Doublon « notation Σ »** : créer puis archiver la moitié de 019 (règle des doublons), ou ne pas la créer ?
   Reco : ne pas la créer, 019 garde seulement « Somme des n premiers termes d'une suite géométrique ».
4. **052 « … afin de conjecturer une relation de linéarité »** : même question que 1TECHNO-094. Reco : couper.
5. **043 : trois points ou deux ?** Reco : trois (équation ; inéquation en x réel ; inéquation en n entier, qui
   est un problème de seuil, famille TCOMP-239). Option : équation / inéquation.
6. **l. 432 « Déterminer graphiquement le coefficient directeur d'une tangente »** → 1TECHNO-077 (« Interpréter
   géométriquement le nombre dérivé comme coefficient directeur de la tangente »). Je le tiens pour couvert ; sinon ⚙.
7. **⚙ « isoler une variable dans une inégalité »** : confirmer (2-263, règles de calcul sur les inégalités, n'est
   qu'une technique voisine).
