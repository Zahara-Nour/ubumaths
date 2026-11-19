# Chantier questions-ttechno — couvrir la Terminale technologique (STMG)

Démarche : [couvrir-un-niveau.md](../../pratiques/couvrir-un-niveau.md) · bornes :
[ttechno.md](../../systeme/programmes/bornes/lycee/ttechno.md) (BO n° 14 du 2026-04-02).

## Reprendre ici

_Mis à jour le 2026-11-19 : **chantier clos**._

- **État** : lots 0 à 8 mergés et publiés ; relevé MCP de clôture : 91 modèles publiés contenant `T_TECHNO` (52
  neufs, 39 existants tagués), **75 points STMG sur 75** couverts (017, 019 de fait, Q17) ; aucun brouillon `T_TECHNO`
  (§ 58).
- **Durable versé** dans `docs/systeme/programmes/bornes/lycee/ttechno.md`, « Couverture en modèles de questions ».
- Fichiers des lots laissés dans `scripts/questions/ttechno-*` (ids des modèles, corrections futures) ; outil
  manquant n° 42 (log et 1/√ dans ` ```nuage `) reste « plus tard » dans `docs/wip/outils-manquants.md`.

## 1. Périmètre

- STMG = niveau **`T_TECHNO`** : programme **commun** à toute la voie technologique (BO 2026), 92 points.
- Les 17 points « Activités géométriques (série STD2A) » sont **hors STMG** : TTECHNO-001 à 014, 070, 071,
  072 (coniques, perspective centrale). → **75 points** pour la STMG (Q1 tranchée).

## 2. Relevé MCP prod (2026-11-17, lecture seule)

- Points `T_TECHNO` tagués : **1 sur 92** — TTECHNO-089 (paramètres n et p), modèle `4ff9d049`, publié,
  `grades = [T_SPE, T_COMP, T_TECHNO]`.
- Modèles dont `grades` contient `T_TECHNO` : ce seul `4ff9d049`.
- Une classe de Tle techno ne voit donc qu'un modèle aujourd'hui (le cahier de texte filtre `grades`).

### Modèles publiés sur la même sous-notion qu'un point STMG (points d'autres programmes)

« Jumeau » = modèle publié rangé sur le nœud d'un point TTECHNO, tagué d'un point 1SPE / 1TECHNO / TCOMP /
TSPE / 2de. Lecture **sur le titre seulement** ; verdict « a priori » à confirmer variation par variation.

| Points TTECHNO      | Jumeaux a priori réutilisables (tag + niveau `T_TECHNO`)                                               | Jumeaux hors bornes (ne pas taguer)                                      |
| ------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| 020, 022            | `61e2ac1f` (reconnaître : premiers termes) → 020 ; `1315d326` (raison) → 022                           | `d2943133`, `f63408c5` (récurrence, forme explicite : à juger)           |
| 021, 023            | `fcf1057e` (reconnaître : premiers termes) → 021 ; `349e1be5`, `85afd455` (raison) → 023               | —                                                                        |
| 024                 | `65e96f31`, `373fc5b4` (terme général arithm.)                                                         | `a81c4c9f` (démonstration)                                               |
| 025                 | `e67b1cbd`, `eca755e6` (terme général géom.)                                                           | `acaeb02a` (démonstration)                                               |
| 017, 026, 028       | `44b32cad` (somme de termes consécutifs arithm.)                                                       | `5fbb9a04` (démonstration)                                               |
| 019, 027, 029       | `b72fae4a` (somme de termes consécutifs géom. ; vérifier raison > 0)                                   | `b554a47f` (démonstration)                                               |
| 030, 075            | `96d19805` (somme des n premiers carrés), `9eac8754` (cubes) : à vérifier qu'ils sont en Python        | `025ad9fa` (Syracuse, Fibonacci)                                         |
| 046                 | `7201f3b2` (dérivée de la fonction inverse)                                                            | `ff36ebdf` (racine), `b05ec37a`, `e2908d60` (démonstrations)             |
| 045, 048, 086       | `1048e462` (la fonction inverse, 2de) : à juger                                                        | —                                                                        |
| 049, 087            | `17f64f63`, `782bf7f8`, `83b1f614` (déjà 1TECHNO), `2b382069`, `bb554c62`, `318ea542`, `03b3d9b3`      | tout ce qui a eˣ ou ln (`a86fc757`, `9a04eb9f`, `c7b5130d`, `7f13ca89`)  |
| 055, 056            | `5ba712bc`, `6dd2f133` (déjà 1TECHNO), `2c116f4d`, `a9c71276`, `69a05f98`, `e0520082`                  | —                                                                        |
| 057, 062            | `30b597c3` (loi binomiale ou non) → 062                                                                | `a29488bc` (Galton, Tle spé)                                             |
| 058                 | `dbee4649` (espérance de la loi binomiale)                                                             | `38001c3f`, `1043c29e` (variance), `040b57c3`, `3e797f0a` (démos)        |
| 059, 061            | `07ebdcbe` (chemins à k succès), `4dcbae71` (particuliers), `970dab52` (symétrie) : sans factorielle ? | `7d9d9b81` (formule à factorielles)                                      |
| 060, 066            | `ef3c495c` (relation et triangle de Pascal) → 060 ; `96be181c` (Python : ligne du triangle) → 066      | `3ca56be0`, `185496e9` (démonstrations)                                  |
| 064, 065            | `a95a9c0d` (P(X = k), P(X = 0), P(X ⩾ 1) à la main, n ⩽ 5)                                             | les trois « avec une table », `4ee9a359` (seuil), `e56be9b5`, `a4b9281f` |
| 068                 | `8354a0e7`, `6fbc355c`, `eafd17a1`, `a3f92832`, `0718f490` (espérance)                                 | `0417223e` (linéarité : hors 1re techno ?)                               |
| 042, 082, 083, 043… | —                                                                                                      | `ffd5c051`, `7c8b341b`, `d3301f2d`, `14036c68` (ln, pas log)             |
| 034, 078, 079       | —                                                                                                      | tous (exponentielle de base e)                                           |
| 050–052, 088        | —                                                                                                      | `17f35a67` (z = ln y)                                                    |

Réutiliser un jumeau = migration « tag TTECHNO + `T_TECHNO` dans `grades` » (même forme que
`questions-1techno-grades`, archivé) ; **question d'accès** : les classes de Tle techno voient des modèles
déjà publiés ; personne ne perd rien.

## 3. Classement des 75 points

**Couverts par un jumeau a priori** (§ 2, à confirmer) — 31 points : 017, 019, 020, 021, 022, 023, 024,
025, 026, 027, 028, 029, 030, 045, 046, 048, 049, 055, 056, 057, 058, 059, 060, 061, 062, 064, 065, 066,
068, 075, 087. (089 déjà couvert.)

**A — texte / formule, modèles neufs** — 26 points :

- Automatismes : 015, 073 (indice base 100), 092 (isoler une variable dans une inégalité).
- Suites : 016 (moyenne arithmétique), 018 (moyenne géométrique), 074 (notation Σ).
- Python : 076 (somme des inverses), 077 (lien Σ ↔ boucle).
- Exponentielles aˣ : 031 (définition, a⁻ˣ = 1/aˣ), 034, 078, 079 (propriétés algébriques), 035, 038
  (taux moyen par l'exposant 1/n), 037, 081 (transformer des écritures).
- Logarithme décimal : 040 (définition), 042, 082, 083, 044 (propriétés), 043, 084 (aˣ = b, xᵃ = b et
  inéquations), 085 (aⁿ < b, n entier).
- Binomiale : 063 (sur l'arbre, aussi B avec ` ```probtree `).

**B — outil existant** — 14 points :

- ` ```courbe ` / ` ```variation ` : 032, 033, 036, 080 (sens de variation et allure de k·aˣ), 041
  (variations de log), 047 (variations de l'inverse), 086 (asymptotes, lecture), 049/087 complétés par
  des fonctions « inverse + polynôme ».
- Repère, `placer:` : 039 (intercaler un point de coordonnées moyenne arithm. / géom.), 052 (nuage après
  changement de variable donné : placer les points transformés), 050, 051, 088 (lire / conjecturer sur un
  nuage ` ```nuage `).
- Statistiques : 067 (diagramme en bâtons de B(n, p) : ` ```barres ` à lire, ou barres à construire).
- Tableau à trous : 053 (Σ(yᵢ − (axᵢ + b))² dans un tableau), 054 (choisir le couple qui minimise parmi
  quelques couples donnés).

**D — difficilement évaluable** (à trancher, Q4) — 3 points : 069 (représenter graphiquement l'espérance
quand n ou p varie), 090 (lien avec l'histogramme des fréquences d'une simulation), 091 (lien avec
l'expression admise de l'espérance). Pistes : lecture d'un graphique fourni (B) plutôt que « représenter ».

**C — outil neuf** : aucun repéré pour la STMG (les seuls besoins d'outil neuf seraient la perspective
centrale STD2A, hors périmètre ; elle n'est pas dans `outils-manquants.md`).

## 4. Découpage proposé (sous réserve des réponses)

| Lot | Thème                                                       | Nature                                     |
| --- | ----------------------------------------------------------- | ------------------------------------------ |
| 0   | Jumeaux : vérification contre les bornes, puis tags         | migration seule (tags + `grades`)          |
| 1   | Automatismes : indices base 100, isoler dans une inégalité  | 3–4 modèles neufs (A)                      |
| 2   | Suites : moyennes, Σ, sommes, Python (inverses, Σ ↔ boucle) | 5–6 modèles neufs (A)                      |
| 3   | Fonctions aˣ et k·aˣ : propriétés, variations, allure       | 6–8 modèles (A + B ` ```courbe `)          |
| 4   | Taux d'évolution moyen, intercaler un point                 | 3–4 modèles (A + B `placer:`)              |
| 5   | Logarithme décimal : définition, propriétés, équations      | 7–8 modèles (A + B ` ```courbe `)          |
| 6   | Fonction inverse et combinaisons « inverse + polynôme »     | 5–6 modèles (B ` ```courbe `, `variation`) |
| 7   | Ajustements par changement de variable, moindres carrés     | 5–6 modèles (B ` ```nuage `, tableau)      |
| 8   | Loi binomiale : arbre, Pascal (n ⩽ 10), bâtons, espérance   | 5–7 modèles (A + B)                        |

## 5. Questions à David

- **Q1 — Périmètre** : je laisse de côté les 17 points STD2A (coniques, perspective) ; d'accord ? (reco :
  oui — ils demanderaient un outil de perspective, chantier à part si un jour une classe STD2A arrive.)
- **Q2 — Jumeaux** : on réutilise les modèles publiés de 1re spé / Tle complémentaires qui tiennent dans
  les bornes de Tle techno (tag TTECHNO + niveau `T_TECHNO`, lot 0), plutôt que d'en réécrire ? (reco :
  oui, comme le chantier 1techno-grades ; question d'accès : les classes de Tle techno voient ces modèles
  publiés, personne ne perd rien.)
- **Q3 — Exponentielle et logarithme** : les modèles ln / eˣ existants ne servent pas (base e hors
  programme). Je les **réécris** en base 10 / base a pour la Tle techno (modèles neufs), sans toucher aux
  originaux ? (reco : oui.)
- **Q4 — Points D (069, 090, 091)** : modèles de lecture d'un graphique ou d'un histogramme fourni, ou on
  les laisse sans modèle ? (reco : lecture d'un graphique fourni.)
- **Q5 — Python / tableur** (030, 075, 076, 077, 053, 054, 066) : même forme que les modèles Python de
  1re spé (compléter ou lire un programme, réponse en case) ? (reco : oui.)
- **Q6 — Ordre des lots** : celui du § 4 (lot 0 d'abord, il couvre 31 points sans écrire un modèle) ?

### Décisions (David, 2026-11-17)

« Je te suis » : **Q1 à Q6 tranchées selon les recommandations** — STD2A hors périmètre ; jumeaux réutilisés
par tag + niveau `T_TECHNO` (accès élargi aux classes de Tle techno, personne ne perd rien) ; eˣ / ln
réécrits en base a / log dans des modèles neufs, originaux intacts ; points 069, 090, 091 en lecture d'un
graphique fourni ; Python et tableur sous la forme des modèles Python de 1re spé ; ordre du § 4, lot 0
d'abord.

## 6. Recherche de doublons hors des sous-notions (2026-11-17)

David : « as-tu regardé les modèles déjà faits pour les 1re, terminales spécialités maths ? ». Le § 2 ne
regardait que les modèles rangés sur le **nœud** d'un point TTECHNO. Recherche élargie : **tous** les
modèles (publiés et brouillons, tous niveaux), par mots-clés du titre (indice, base 100, log, moyenne
géométrique / arithmétique, taux moyen, évolutions successives, puissance, exponentielle, inverse,
asymptote, Pascal, binomiale, bâtons, changement de variable, ajustement, somme, Σ, inégalité, inéquation,
isoler, intercaler, taux, pourcentage, coefficient multiplicateur), puis contenu (variations + parties
communes) sondé pour e / ln, log, Python.

Résultats :

- **Aucun modèle** en logarithme décimal (`\log` absent partout), sur l'indice base 100, la moyenne
  géométrique de deux nombres, le taux d'évolution moyen, Σ, la fonction aˣ de base quelconque. Les lots
  1 à 5 du § 4 ne doublonnent rien.
- **Contenu en e / ln** (donc hors bornes, non réutilisables) : `f1963ef2` (seuil qⁿ par le logarithme,
  TCOMP-239 — même idée que TTECHNO-085, à réécrire en log), `22141fa4` (évolution exponentielle et suite
  géométrique), `f40e8a4a` (reconnaître la courbe d'une exponentielle), `245b4eb1` (décroissance
  exponentielle), `8ce83078` (inégalité arithmético-géométrique, TSPE).
- **Corrections du § 2** : `96d19805` (somme des n premiers carrés) et `9eac8754` (cubes) n'ont **pas** de
  Python → ils ne couvrent pas TTECHNO-030 / 075 (formules seules) ; retirés des jumeaux. `e4eaaf16`
  (calculer une somme de termes avec Python, 1SPE-380) est, lui, en Python → candidat pour 030 / 077.
- **Voisins utiles, pas des doublons** (2de, à citer comme prérequis, pas à taguer) : évolutions
  successives et coefficient multiplicateur (`36abc642`, `8b59ca4b`, `bbd511cb`…), première puissance qui
  dépasse un seuil en Python (`bcc687bb`), inéquation graphique 1/x < k (`2d4c0b35`), ajouter / multiplier
  des inégalités (`57585d68`, `d15b096f`).
- **Brouillons 1re spé** : `252e85d9`, `e2743a04`, `7f63ea6b` (questions de cours sur les sommes) —
  non publiés, à ne pas doublonner si le lot 2 fait des questions de cours.
- Sonde « factorielle » trop bruitée (le `!` du texte) : la vérification des coefficients binomiaux sans
  factorielle se fait variation par variation au lot 0.

## 7. Ce que les chantiers voisins ont appris (2026-11-17)

- `questions-1gen` (§ 2.3 de son journal) : une passe **par mots-clés ne suffit pas** — leur deuxième passe a
  lu en entier 49 modèles de tous niveaux (plages, conditions, corrigés) et a trouvé des modèles taguables que
  les titres cachaient. Le § 6 ci-dessus est une passe par mots-clés : **à refaire de la même façon** au lot 0
  (lecture complète des candidats, tous niveaux).
- `questions-1techno` : les jumeaux passent par une **page à cocher** (instantanés exportés) avant la
  migration de tags (lot T1). Même démarche ici pour le lot 0.
- **Chevauchement entre chantiers** : les fonctions aˣ et le taux d'évolution moyen sont aussi à écrire en
  1re générale (1GEN-032 à 037, 040, 059 : même nœud que TTECHNO-031 à 039, 080, 081), les suites en 1re
  techno. Avant d'écrire les lots 3 et 4, relire le journal `questions-1gen` : un modèle écrit là-bas peut
  porter le tag TTECHNO (un tag par programme, ADR 0020) si ses plages tiennent dans les deux bornes —
  sinon deux modèles écrits en parallèle seraient des doublons.

## 8. Coordination avec `questions-1gen` (2026-11-17)

Message de la session `questions-1gen` ; réponse envoyée :

- **`grades`** : chaque chantier ne touche que son niveau (`array_append` / `array_remove` ciblés, jamais
  d'affectation complète). Ici : `array_append(grades, 'T_TECHNO')` sous garde « `T_TECHNO` absent ».
- Liste des ids candidats du lot 0 transmise (§ 2) ; aucun modèle existant corrigé ni scindé ici sans
  prévenir `questions-1gen` avant.
- **Partage** : aˣ (TTECHNO-031 à 037, 080, 081 ↔ 1GEN-032 à 036, 042, 059) et taux moyen (TTECHNO-035, 038 ↔
  1GEN-037, 040) — `questions-1gen` écrit ; on tague TTECHNO ce qui tient dans nos bornes ; on n'écrit que
  les compléments (x < 0, k·aˣ, propriétés algébriques). **Lots 3 et 4 ici après les siens.**
- Seuils : 1GEN sans logarithme, TTECHNO-085 par le logarithme décimal → modèles distincts.
- Points 1 et 2 du message (7 modèles sans point, `1acb6d47`) : chantier `questions-1techno`, pas celui-ci.

## 8 bis. Phase 0 des lots 3 et 4 de `questions-1gen` (2026-11-17)

Leur § 14 (commit e4cab938cf), validé par David : 14 modèles 1GEN (a > 0, x ⩾ 0, ni log, ni eˣ, ni dérivée).
Lot 3, nœud « fonctions x ↦ aˣ » : E1 calculer aˣ · E2 propriétés algébriques · E3 sens de variation · E4 courbes ↔
aˣ · E5 exposant 1/n · E6 placer des points · E7 lecture sur k·aˣ. Lot 4 : T1, T2 taux moyen · T3–T5 phénomènes
exponentiels · T6, T7 seuils (sans log). Ordre chez eux : lot 2, puis 3, puis 4 ; ils envoient ids et plages.

- **Q15 (David)** : E2 est un modèle **commun**, écrit par eux à exposants positifs (`grades ['1_GEN']`) ; après
  leur migration nœud + tags, on fait `array_append('T_TECHNO')` + tag. On n'écrit que le complément à exposants
  négatifs, **sans réécrire les calques eˣ** (6137a555, bd45ed7f, c24d21e1, e6b429b4). Même règle Q11 ailleurs.
- **Rattachements TTECHNO prévus** (un point par modèle, trigger ; réponse envoyée, aucune objection) : E2 → 081 ·
  E1 → 031 · E3 → 032 · E4 → 033 · T1 → 035 · T2 → 038. E5, E6, E7, T3–T7 : aucun point.
- **Restent à écrire ici (lot 3)** : 034, 078, 079 (trois compléments à exposants négatifs, un par propriété ;
  079 avec n relatif) ; a⁻ˣ = 1/aˣ (031) ; allure / sens sur ℝ (x < 0) si E3 / E4 ne suffisent pas ; 036, 080
  (k·aˣ, k < 0). Lot 5 : 085 (seuil par le log), distinct de T6.

## 9. Lot 0 : lecture complète des candidats (2026-11-17)

Relevé prod (MCP) : tous les couples (point TTECHNO STMG, modèle **publié** rangé sur le nœud du point ou une
sous-notion fille) = **157 modèles**, 60 points, 448 couples libres. Tous exportés et lus en entier (variations,
plages, corrigés, testSpecs) par trois lectures parallèles (suites et Python ; aˣ, log, inverse ; probabilités),
contre `bornes/lycee/ttechno.md`. Verdicts : 31 OK (dont 4ff9d049, déjà posé sur 089), 13 en partie, 113 non.

**OK, point visé** (30 à taguer) : 024 0af4bf32, 373fc5b4, 65e96f31 · 026 44b32cad, ef807ee9 · 027 e7cfe442 ·
077 e4eaaf16 ⚠ · 046 7201f3b2, e2908d60 · 047 b0a94f05 ⚠ · 048 1048e462 · 055 5ba712bc · 056 2c116f4d,
69a05f98, 6dd2f133, a9c71276, ecf4d46b · 058 dbee4649 · 059 07ebdcbe · 062 a29488bc ⚠ · 063 a4b9281f ⚠ · 064
a95a9c0d · 065 e56be9b5 · 066 96be181c · 068 0718f490, 6fbc355c, 8354a0e7, ad555cb1, bc59d5ce, eafd17a1.
⚠ = à trancher sur la page : e4eaaf16 (somme écrite « + ⋯ + », jamais Σ), b0a94f05 (démonstration de 2de, pas
le signe de −1/x²), a29488bc (distracteur « loi uniforme »), a4b9281f (démonstration littérale en n, k, p).

**Corrections du § 2 / § 3** (la lecture par titre se trompait) :

- Non : 61e2ac1f, fcf1057e (« semble-t-elle… » sur 5 termes : conjecture, pas la preuve sur trois nombres de
  020 / 021) ; 1315d326, 349e1be5, 85afd455 (calcul nu de la raison, pas « modélisant une évolution » ; termes ±) ;
  tous les modèles eˣ / ln des puissances (13) et du log (7) ; 17f64f63, 782bf7f8, 83b1f614 et les cartes
  « étude de fonction » (polynômes seuls ou génériques : 049 / 087 forcés) ; 30b597c3, 77498f1b (loi géométrique
  en distracteur) ; e0520082 (formalisme de partition) ; 0417223e (linéarité) ; a3f92832 (dans les bornes,
  mais sans point TTECHNO : 1TECHNO-138).
- Hors couples posables mais proches : 98c3f740 (accroissement constant → 022) et b6753dff (taux constant →
  023), rangés sous les moyennes (016 / 018) : le trigger refuse 022 / 023 ; à reprendre aux lots d'écriture.

**En partie** (une variation hors bornes ; jumeaux techno à écrire, ou plage à resserrer — Q11 de 1techno :
jumeau) : 025 ← 95c38330, e67b1cbd, eca755e6, fc921674 (raison ou termes ±) ; 027 ← b72fae4a (q < 0) ; 046 ←
a86442c1 (x⁴, x⁵), d2bca2d8 (√x, 1/x²) ; 049 ← 3fa3af6c (eˣ ⩾ 1 + x ; v2 x + a²/x est le bon exemple) ; 058 ←
040b57c3 (démonstrations de E = np) ; 085 ← 4ee9a359 (seuil corrigé par ln) ; 059 / 061 ← 4dcbae71, 970dab52,
ef3c495c (n > 10 calculé par l'élève, contre ltt-3).
**Calques à réécrire** (lots 3 et 5) : ~~6137a555, bd45ed7f, c24d21e1, e6b429b4 (eˣ → aˣ : 034, 078, 079)~~
(annulé par Q15 de `questions-1gen`, § 8 bis) ;
7c8b341b (ln → log : 042, 082, 083) ; 17f35a67 (ln y → log y : 052).

**Points couverts après le lot 0** : 024, 026, 027, 046, 047, 048, 055, 056, 058, 059, 062–066, 068, 077 (+ 089).
Sans modèle : 016–023, 025, 028–030, 034–045, 049–054, 057, 060, 061, 067, 069, 073–076, 078–088, 090–092.
Page à cocher : https://claude.ai/artifact/DXvJnW815iBaxJcf54b3Eh (30 fiches, collection `verdicts` vide au
départ ; 3 fiches au bloc « ranger » non dessiné, à jouer dans l'aperçu : a4b9281f, b0a94f05, e2908d60).

## 10. Lot 0 : migration des tags (2026-11-17)

- Page à cocher : 30 « OK » sur 30 (dont les 4 ⚠ : e4eaaf16, b0a94f05, a29488bc, a4b9281f), aucun
  commentaire. Les 13 « en partie » et les « non » ne sont pas tagués (jumeaux / plages aux lots d'écriture).
- Relevé prod (MCP) : les 30 sont publiés, aucun n'a `T_TECHNO` ni de point TTECHNO, tous rangés sur le
  nœud du point visé, sauf e4eaaf16 sur une sous-notion fille de TTECHNO-077. Aucune migration d'une autre
  branche ne touche ces 30 identifiants.
- Migration `20261117145436_questions_ttechno_lot0_tags` (gabarit 1techno T2) : 30 tags sur 17 points +
  `array_append(T_TECHNO)`, `updated_at` préservé, tout ou rien ; rollback en commentaire, éprouvé.
- Test `tests/integration/questions-ttechno-lot0-tags.test.ts` : 12 verts ; corps retiré → 5 rouges et la
  suite principale tombe (rollback refusé : 0 tag sur 30) ; fichier restauré d'une copie, identique.
- Instantanés : `scripts/questions/ttechno-t0/` (30 fichiers, export en lecture seule de la prod).
- Question d'accès : celle du § 3 (Q2), tranchée par David.
- Revues : `code-reviewer` et `security-auditor` sans bloquant (prod rejouée : gardes passent, codes
  uniques, trigger `updated_at` réactivé après le gabarit). Retenus : décor avec un tag d'un autre programme
  (1TECHNO-120 sur e4eaaf16, sinon « ne bougent pas » comparait du vide) ; tests des gardes « point archivé »
  et « rollback : tag retiré » → 14 verts.
- Mergé (#2756) après la fin d'un `deploy:prod` voisin ; `db:migrate` depuis le worktree à `origin/main`
  (dépôt principal occupé par une autre session) : seule cette migration en attente (`--dry-run`), jouée ;
  prod vérifiée (30 publiés, 30 `T_TECHNO`, 30 tags TTECHNO, trigger `updated_at` réactivé).

## 11. Lot 1 : automatismes (2026-11-17)

**Décisions (David, 2026-11-17, « je valide »)** — 4 modèles neufs, `grades ['T_TECHNO']`, brouillons :

| #   | Modèle                                       | Point | Nœud                                  | Niveau |
| --- | -------------------------------------------- | ----- | ------------------------------------- | ------ |
| I1  | Calculer un indice de base 100               | 073   | Évolutions › indices (0 modèle avant) | 1      |
| I2  | Interpréter un indice de base 100            | 015   | Évolutions › indices                  | 1      |
| I3  | Taux d'évolution entre deux années (indices) | 015   | Évolutions › indices                  | 2      |
| I4  | Isoler une variable dans une inégalité       | 092   | Calcul littéral › isoler une variable | 2      |

- Relevé : aucun modèle d'indice en prod (tous niveaux) ; ec690625 et d7aa3f33 (2de, nœud de 092) isolent
  dans une **égalité** → pas réutilisables.
- Question d'accès : modèles neufs en brouillon, personne ne lit rien de nouveau ; à la publication, les
  classes de Tle techno les voient.

**Écriture** : `docs/wip/questions/lot-ttechno-1.py` → `scripts/questions/ttechno-1-automatismes/`.

- Simulation : 54 specs vertes, 2 200 tirages, 1 408 formules aux accolades équilibrées.
- I3 v2 : l'affirmation fausse (« d % », l'écart en points) tombait parfois à 1 point du vrai taux, ambiguë
  → a ∈ 118..140, d ∈ 8..20, condition d − 100d/a ⩾ 1,5.
- I4 : le moteur accepte `\le` et les termes dans l'autre ordre ; refuse sens non changé, second membre non
  divisé ; forme non réduite et écriture à l'envers (`… ⩾ y`) = forme à améliorer.
- Base locale : joués dans l'aperçu (I1 tableau, I3 choix + corrigé, I4) : virgule décimale, tableau à case,
  choix, corrigé OK ; U, P, I en romain droit (comme le modèle de la loi d'Ohm en prod).
- Message de `questions-1techno` : corrigé de 83b1f614 réécrit (racines évidentes de f′) ; sans effet ici,
  83b1f614 est « non » au § 9.

**Prod (2026-11-17)** : #2763 mergée ; David a créé les 4 brouillons (a37968c5 I1, 4950a32e I2, 4131bd94 I3,
3909b24a I4), vérifiés par MCP (`draft`, `T_TECHNO`, sans nœud ni tag) ; ids écrits dans les fichiers.

- Migration `20261117172627_questions_ttechno_lot1_rangement_tags` (gabarit 1gen lot 1) : nœud + tag, tout ou
  rien, `updated_at` préservé, rollback en commentaire. Test
  `tests/integration/questions-ttechno-lot1-rangement-tags.test.ts` : 9 verts ; corps retiré → 5 rouges ;
  fichier restauré d'une copie, identique.
- `security-auditor` : aucun bloquant (ids, codes, chemins revérifiés en prod ; écart avec le gabarit = données
  seules ; rollback symétrique ; accès : personne). Note : `migration list --linked` juste avant `db:migrate`.
- #2766 mergée (CI verte ; job « Garde SECURITY DEFINER » relancé une fois : clone git bloqué 15 min) ;
  `migration list --linked` : seule `20261117172627` en attente ; `db:migrate` depuis le dépôt principal ; prod
  vérifiée (4 nœuds, 4 tags, `updated_at` = création, trigger réactivé).
- Page à cocher : https://claude.ai/artifact/TJCp41QzxCSUjjiKRjpgej (4 fiches, aucune alerte ; `verdicts` vide).

**Publication (2026-11-17)** : page à cocher relue, 4 verdicts sur 4 « ok » ; `publier-lot.ts` en simulation (4
passent) ; `garde-niveaux-tags.ts` vert ; David a lancé `--publier` ; 4 `published`, `grades ['T_TECHNO']`,
vérifiés par MCP. **Lot 1 clos.**

## 12. Lot 2 : suites, phase 0 (2026-11-17)

**Points du lot** (sans modèle après le lot 0, § 9) : 016, 017, 018, 019, 020, 021, 022, 023, 025, 028, 029,
030, 074, 075, 076 — 15 points (le bloc « Reprendre ici » n'en citait que 5 : la lecture complète du lot 0 avait
déclassé les jumeaux de 017–023, 025, 028–030). 077 reste couvert par e4eaaf16 (Σ jamais écrit, accepté au lot 0).

**Relevé prod (MCP, lecture seule)**, tous les modèles rangés sur le nœud de ces points ou une sous-notion fille,
plus une passe par contenu (`\sum`, Σ, moyenne, trois nombres, termes consécutifs, inverses) :

- **Nouveaux depuis le lot 0** (modèles communs de `questions-1gen`, publiés, `{1_GEN,1_TECHNO}`, instantanés
  `scripts/questions/1techno-g/`, lus en entier) :
  - **c4887e49** « Terme général d'une suite géométrique à termes positifs » (sous-notion « terme général », celle
    de 025) : u₀ ou u₁ ∈ 2..9, q ∈ 2..5, v2 intérêts composés → **tout dans les bornes de 025**.
  - **0b5c3db6** « Déterminer la raison d'une suite géométrique à termes positifs » (sous-notion « définition »,
    celle de 023) : v2, v3 = évolution en % (abonnement, voiture) → la raison **modélise une évolution** ; v0, v1 =
    calcul nu u(k+1)/u(k), termes positifs (dans les bornes, mais pas le grain de 023).
  - f15045ec, e0f3ac2f (calculer un terme, `1_GEN` seul, non communs), 96668141, 13388e8f, e8f08a19, 817d257f
    (graphiques, notion « Généralités ») : aucun point du lot.
- **Toujours rien** sur Σ, la moyenne arithmétique ou géométrique de deux nombres, « trois nombres consécutifs »,
  les sommes en situation, la somme des inverses ; les sommes de carrés / cubes (96d19805, 9eac8754) restent sans
  Python ; 31a77ba9 (Python, terme d'une suite) ne somme rien.
- 98c3f740 (accroissement constant), b6753dff (taux constant) : rangés sur la **notion**, 022 / 023 sur la
  sous-notion « définition » → trigger refuse (§ 9) ; les déplacer toucherait le rangement de 1re spé : non.
- Brouillons 1re spé « Cours » (`scripts/questions/1spe-cours-suites/` D20–D23 : 9bfe6c4c, 53facec2, e2743a04,
  7f63ea6b, 252e85d9) : questions de cours à réponse libre sur les sommes ; ne pas les doublonner.
- Chantiers voisins : aucun point 1GEN / 1TECHNO sur moyennes, trois nombres, Σ, sommes en situation, Python des
  sommes (seuls 1TECHNO-005 et 120, déjà servis) → pas de modèle commun à prévoir.

**Proposition** (modèles neufs `grades ['T_TECHNO']`, brouillons, un point TTECHNO chacun, sur le nœud du point) :

| #   | Modèle                                                   | Point | Contenu (variations)                                                                        | Niv. |
| --- | -------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------- | ---- |
| M1  | Moyenne arithmétique de deux nombres                     | 016   | calcul (entiers, décimaux, relatifs) ; terme manquant u₁ entre u₀ et u₂ d'une suite arithm. | 1    |
| M2  | Moyenne géométrique de deux nombres positifs             | 018   | √(ab) à produit carré parfait ; arrondi ; terme manquant d'une suite géométrique > 0        | 1    |
| M3  | Trois nombres consécutifs d'une suite arithmétique ?     | 020   | choix « sont / ne sont pas » + écart b − a, c − b en cases ; un cas en situation            | 2    |
| M4  | Trois nombres consécutifs d'une suite géométrique ?      | 021   | même forme par les quotients b/a, c/b (nombres > 0)                                         | 2    |
| M5  | Raison d'une suite arithmétique modélisant une évolution | 022   | « augmente de r par an » ; tableau de relevés ; deux valeurs non consécutives (années)      | 1–2  |
| M6  | Somme arithmétique en situation                          | 028   | total sur n périodes (production, épargne qui augmente de r) : reconnaître puis calculer    | 3    |
| M7  | Somme géométrique en situation                           | 029   | versements réguliers à intérêts composés (exemple du BO), production qui baisse de t %      | 3    |
| M8  | Notation Σ                                               | 074   | développer Σ (carrés, cubes, inverses) ; nombre de termes ; écrire une somme avec Σ (choix) | 2    |
| P1  | Fonction Python : somme des n premiers carrés            | 030   | compléter l'accumulateur (choix) ; bornes de `range` (choix) ; valeur renvoyée (case)       | 2    |
| P2  | Fonction Python : somme des n premiers cubes             | 075   | idem                                                                                        | 2    |
| P3  | Fonction Python : somme des n premiers inverses          | 076   | idem, valeur exacte en fraction ; piège `1/k` avec k = 0 au départ de `range(n)`            | 2    |

**Tags** (migration, page à cocher d'abord, comme le lot 0) : c4887e49 → 025 ; 0b5c3db6 → 023 (Q16).

**Questions à David** :

- **Q16 — 0b5c3db6 → 023** : 2 variations sur 4 modélisent une évolution, les 2 autres sont le calcul nu (dans
  les bornes). Le taguer 023, ou écrire un modèle « raison géométrique modélisant une évolution » (jumeau de M5) ?
  Reco : **taguer** (le grain y est, rien n'est hors bornes ; 349e1be5 était refusé aussi pour ses termes ±).
- **Q17 — Connaissances 017, 019** (« somme des n premiers termes », formules) : couvertes de fait par 026 / 027
  (44b32cad, e7cfe442). Un modèle court par connaissance (formule à compléter), ou rien ? Reco : **rien** pour
  l'instant (les brouillons « Cours » D20–D22 de 1re spé font ce travail une fois publiés).
- **Q18 — Découpage** : lot 2a « suites » (M1–M8 + tags) puis lot 2b « Python » (P1–P3), ou un seul lot ?
  Reco : **2a puis 2b** (11 modèles d'un coup font une page à cocher trop longue).

**Décisions (David, 2026-11-17, « je suis tes recos »)** : **Q16** 0b5c3db6 tagué 023 ; **Q17** rien pour 017,
019 ; **Q18** lot 2a « suites » (M1–M8 + tags c4887e49 → 025, 0b5c3db6 → 023), puis lot 2b « Python » (P1–P3).

## 13. Lot 2a : écriture (2026-11-17)

`docs/wip/questions/lot-ttechno-2a.py` → `scripts/questions/ttechno-2a-suites/` (8 fichiers, 112 specs), nœuds et
points du § 12.

- Simulation `create-questions` verte contre la prod (aucun homonyme) ; `question:specs` 8 / 8 importables ;
  3 584 formules de 40 tirages par modèle passées à `validateLatex` + compte des accolades : 0 problème.
- Corrigé en route : `u_{{n}}` rendait `u_24` (u₂ puis 4) → `u_{ {{n}} }` ; « n-ième » → « nᵉ » ; somme de M8
  écrite en entier (n ⩽ 5). Moteur : `19/2` pour 9,5 = `bad_form` (décimal attendu, M1) ; `16380` sans espace =
  `unoptimal_form` « spaces » (M7), comme le reste du site.
- M4 : le « non » de v1 est une progression **arithmétique** (piège : « oui, car b − a = c − b ») ; v0 perturbe c
  (jamais arithmétique : il faudrait d < 0) ; v2 prix +t % contre +t € par an.
- Base locale (copie des fichiers, ids locaux) : 8 brouillons créés ; aperçu admin joué (Chrome du Mac mini,
  serveur `--host 127.0.0.1`) : M4 v2, réponse fausse refusée, correction à virgules ; M7 v0, `10203` → ½ point
  « chiffres mal espacés », `10 203` attendu.
- #2774 mergée (CI verte). Suite : après merge, David lance `create-questions --publier` ; puis migration
  nœud + tag des 8 et tags c4887e49 → 025, 0b5c3db6 → 023 (`array_append('T_TECHNO')`), page à cocher d'abord.

## 14. Lot 2a : prod, rangement et tags (2026-11-17)

David a lancé `create-questions --publier` : 8 brouillons (45ea676f M1, 72b876d7 M2, 6336ae4d M3, a46e60cf M4,
292f865b M5, 65e0e9f5 M6, 5ec00b89 M7, 752d26c9 M8), vérifiés par MCP (`draft`, `{T_TECHNO}`, niveaux du fichier,
sans nœud ni tag) ; ids commités sur la branche de la migration (copie retirée de `main` par `git stash`, à jeter
après le merge une fois `main` égal).

- Relevé MCP des communs : c4887e49 et 0b5c3db6 publiés, `{1_GEN,1_TECHNO}`, chacun sur le nœud de son point
  TTECHNO (025 « terme général », 023 « définition »), tags 1GEN-029 + 1TECHNO-038 / 1GEN-028 + 1TECHNO-036, aucun
  point TTECHNO.
- Migration `20261117190410_questions_ttechno_lot2a_rangement_tags` : partie A sur le gabarit du lot 1 (nœud par
  chemin strict = nœud du point, tout ou rien, sans nœud ni tag), partie B sur celui du lot 0 (tag +
  `array_append('T_TECHNO')`, garde « sur le nœud du point »), `updated_at` préservé, rollback en commentaire.
- Test `tests/integration/questions-ttechno-lot2a-rangement-tags.test.ts` : 14 verts (décor avec les 4 tags 1GEN /
  1TECHNO, gardes des deux parties) ; corps retiré → 10 rouges ; fichier restauré d'une copie, identique.
- Question d'accès : partie A personne (brouillons) ; partie B Q2 du chantier (classes de Tle techno, personne ne
  perd rien).

**Migré (2026-11-17)** : #2776 mergée (CI verte, `check:migrations --pr 2776` vert ; `security-auditor` sans
bloquant : ids, chemins, points revérifiés en prod, rollback miroir, aucune table d'élève) ; `migration list
--linked` : seule `20261117190410` en attente ; `db:migrate` depuis le dépôt principal (4 conditions). Prod vérifiée
(MCP) : 8 brouillons sur le nœud de leur point, un tag TTECHNO chacun ; c4887e49 et 0b5c3db6
`{1_GEN,1_TECHNO,T_TECHNO}`, tags 1GEN / 1TECHNO intacts + TTECHNO-025 / 023 ; `updated_at` inchangés ; trigger `O`.
Copie des ids mise de côté sur `main` jetée (identique). `garde-niveaux-tags` : aucun niveau manquant.

- Page à cocher : https://claude.ai/artifact/4fCZW4x4Y5yKuZDwmt7v2Z (8 fiches, aucune alerte ; `verdicts` vide).

## 15. Message de `questions-1gen` : lot 3 (aˣ) en prod (2026-11-17)

7 brouillons rangés et tagués 1GEN (migration `20261117191427`, #2778), tous sur « Fonctions > Fonction exponentielle >
fonctions x ↦ aˣ », `grades ['1_GEN']`, encore brouillons (leur page à cocher d'abord). Candidats TTECHNO (§ 8 bis) :

- **E1** `e4e65a69-2710-45d1-9592-1edd100d9067` « Calculer une valeur de a^x » → 031 : a ∈ {1,5 ; 2 ; 3 ; 0,5 ;
  0,8}, x ∈ {0,5 ; 1,5 ; 2,5 ; 3,2} ; capital 1000 / 2000 / 5000 € à 2–4 %, x ∈ {1,5 ; 2,5 ; 3,5} ; 1000 / 8000 ×
  0,5ˣ, x ∈ {0,5 ; 1,5 ; 2,5}.
- **E2** `60971c9a-82e7-4ed5-a18a-7520b40c38b2` « Une seule puissance » (commun, Q15) → 081 : exposants positifs
  seulement (a ∈ {2 ; 3 ; 5 ; 1,5}, exposants 0,5…4,5, k ∈ 2..4, b ∈ {2 ; 3 ; 4}) ; complément à exposants
  négatifs à écrire ici.
- **E3** `2a9c316a-ee3d-44dc-89be-8b3b5c00ac2c` « Sens de variation de x ↦ a^x » → 032 : a > 1, 0 < a < 1, a = 1,
  comparaison sans calcul, médicament (−p %/h), sur [0 ; +∞[.
- **E4** `065eea60-1d6d-4404-9015-f4624e661ab2` « Associer une courbe à sa fonction » → 033 : courbes sur [0 ; 4],
  a ∈ {1,2 ; 1,5 ; 2 ; 2,5 ; 0,5 ; 0,6 ; 0,8}, a = 1 en v2.
- E5 3a8ef5f7, E6 9ead685c, E7 fc27769e : sans point TTECHNO.
- ⚠ Le rollback commenté de leur migration retire le nœud : ils ne le joueront plus une fois nos tags posés.

À faire au lot 3 ici : lire les 4 en entier contre nos bornes (031 parle aussi de a⁻ˣ = 1/aˣ ; 032 / 033 sur ℝ
chez nous, [0 ; +∞[ chez eux → complément x < 0 si besoin), puis tags + `array_append('T_TECHNO')`.

## 16. Lot 2a : publication (2026-11-17)

- Page à cocher : 8/8 « OK », aucun commentaire (base de l'artefact lue et comptée).
- `garde-niveaux-tags.ts` (David) : 2 400 modèles tagués, aucun niveau manquant (12 écarts voulus, hors lot).
- `publier-lot.ts --dir scripts/questions/ttechno-2a-suites` : simulation verte, puis `--publier` par David :
  **8/8 publiés**, statut relu en base.
- `questions-1gen` : lot 3 publié (7/7) ; ids E1–E4 confirmés (031, 081, 032, 033), lot 4 à venir.

## 17. Lot 2b : écriture (2026-11-17)

`docs/wip/questions/lot-ttechno-2b.py` → `scripts/questions/ttechno-2b-python/` (3 fichiers, 44 specs).

- P1 (030) carrés, P2 (075) cubes : accumulateur (choix), bornes de `range` (choix), valeur renvoyée (case).
  `range(n + 1)` est **juste** pour les carrés et les cubes (0² = 0³ = 0) → jamais proposé en distracteur.
- P3 (076) inverses : idem, valeur **exacte** en fraction (Python affiche un décimal, la correction le dit) ;
  v3 « Lucas » : `range(n + 1)` → division par zéro au premier tour (`ZeroDivisionError`).
- Rang de la bonne proposition varié (1, 2, 2, 0, 3, 1, 2) ; `melanger: non`.
- Simulation `create-questions` verte (base locale) ; `question:specs` 3/3 importables, 0 `\textcolor` hors `$` ;
  32 formules distinctes de 40 aperçus par modèle à `validateLatex` + accolades : 0 problème.
- Corrigé en route : `\textcolor` hors `$` (P3 v3) → gras ; « 1, …, 2 » pour n = 2 → « de 1 à n ».
- Base locale : 3 brouillons créés (copie des fichiers) ; aperçu admin (Chrome, `127.0.0.1:5176`) : bloc Python
  rendu, P3 v2 `5/6` refusé « Faux » (11/6 attendu), P3 v0 choix D « coché, juste ».

**#2784 mergée (2026-11-17)**, CI verte sur le dernier commit.

## 18. Lot 2b : prod, rangement et tags (2026-11-17)

David a lancé `create-questions --publier` : 3 brouillons (2327bbef P1, fe576c5b P2, e1f5fa4d P3), vérifiés par
MCP (`draft`, `{T_TECHNO}`, niveau 2, sans nœud ni tag) ; ids commités sur la branche de la migration.

- Points 030, 075, 076 : tous sur la notion « Suites > Généralités sur les suites » (relevé MCP).
- Question d'accès posée avant le SQL, tranchée par David : **personne** (brouillons).
- Migration `20261117215645_questions_ttechno_lot2b_rangement_tags` sur le gabarit du lot 1 (partie A seule).
- Test `tests/integration/questions-ttechno-lot2b-rangement-tags.test.ts` : 9 verts ; corps retiré → 5 rouges ;
  fichier restauré d'une copie, identique. `types:cliquet` tenu.
- `security-auditor` : aucun finding bloquant (diff avec le lot 1 = ids, codes, chemins, compteurs ; rollback
  miroir ; trigger `updated_at` actif en prod ; aucune policy, aucune table d'élève).

**Migré (2026-11-17)** : #2790 mergée (CI verte, `check:migrations --pr 2790` vert) ; `migration list --linked` :
seule `20261117215645` en attente ; `db:migrate` depuis le dépôt principal (4 conditions). Prod vérifiée (MCP) : 3
brouillons sur « Suites > Généralités sur les suites », un tag chacun (030, 075, 076), `updated_at` inchangés.
Copie des ids mise de côté sur `main` jetée (identique).

- Page à cocher : https://claude.ai/artifact/VgyVMezCt3FqJM1wqZZXZE (3 fiches, `verdicts` vide).

## 19. Lot 2b : publication (2026-11-17)

- Page à cocher relue : 3 verdicts sur 3 « ok », sans commentaire.
- `garde-niveaux-tags.ts` (David) : 2 408 modèles tagués, aucun niveau manquant (12 écarts voulus, hors lot).
- `publier-lot.ts --dir scripts/questions/ttechno-2b-python` : simulation verte (3 brouillons), puis `--publier` par
  David : 3/3 publiés, statut relu en base (2327bbef, fe576c5b, e1f5fa4d).

## 20. Lot 3 : lecture de E1–E4 contre nos bornes (2026-11-17)

Lus en entier par MCP (lecture seule) : énoncés, variables, corrigés, `test_specs`. Les 4 sont **publiés** (le § 15
disait brouillons), `grades ['1_GEN']`, un seul tag chacun (1GEN-032 à 035), aucun tag TTECHNO.

- **E1** e4e65a69 → **031 : OK**. Calcul de aˣ à la calculatrice, x > 0 non entier ; capital à intérêts
  composés ; 0,5ˣ en demi-vies. Partie x ⩾ 0 seulement : a⁻ˣ = 1/aˣ reste à écrire ici (prévu, § 8 bis).
- **E2** 60971c9a → **081 : OK ⚠**. Var. 0 (produit, 034), 1 (quotient, 078), 2 ((aᵐ)ᵏ, k ∈ 2..4 entier : 079) dans nos bornes. ⚠ Var. 3 : aˣ × bˣ = (ab)ˣ, deux bases différentes : propriété absente de 034 / 078 /
  079 (le BO dit « par extension des puissances entières », sans la nommer). Corrigé de la var. 2 écrit
  « (aˣ)ʸ = aˣʸ pour tous réels positifs » : plus large que 079 (n entier), vrai.
- **E3** 2a9c316a → **032 : OK**. a > 1, 0 < a < 1, a = 1, comparaison sans calcul, médicament (parallèle
  avec la suite géométrique écrit au corrigé). Sur [0 ; +∞[ : vrai sur ce domaine, complément x < 0 à décider.
- **E4** 065eea60 → **033 : OK**. Courbes sur [0 ; 4], point (1 ; a), a = 1 en var. 1.

Tags : avec ceux de T1 / T2 (lot 4), défaut retenu. Les 4 étant publiés, le tag les rend visibles aux élèves de
Tle STMG dès `db:migrate` (même cas que le lot 0, question d'accès Q2). Page à cocher : E2 marqué ⚠.

**T1 / T2 reçus** (message de `questions-1gen`, migration `20261117222809`, #2793 jouée) : brouillons, `grades
['1_GEN']`, nœud « Proportionnalité > Évolutions > taux d'évolution moyen ». Lus en entier :

- **T1** a439df84 (1GEN-037) → **035 : OK**. 2, 3 ou 4 évolutions données une à une, (1 + tₘ)ⁿ = CM, exposant 1/n.
- **T2** f84e23a3 (1GEN-040) → **038 : OK**. Taux annuel moyen entre deux valeurs, à partir d'un taux global,
  taux mensuel équivalent : les deux contextes du BO.

Prochaine étape : une migration de tags pour les 6 (E1–E4 publiés, T1–T2 brouillons), gabarit lot 0. Avant le
SQL : question d'accès et verdict sur E2 var. 3, posés à David.

**T1 / T2 publiés** (message de `questions-1gen`, statut relu par MCP le 2026-11-18).

## 21. Lot 3 : tags sur les 6 modèles de `questions-1gen` (2026-11-18)

- Décisions de David : les 6 ouverts aux élèves de Tle techno (question d'accès) ; E2 var. 3 (aˣ × bˣ = (ab)ˣ)
  taguée telle quelle (« par extension des puissances entières »).
- Relevé MCP : les 6 rangés sur le nœud même de leur point TTECHNO, `grades ['1_GEN']`, un tag 1GEN chacun.
- Migration `20261118052320_questions_ttechno_lot3_tags` (gabarit lot 0) : 6 tags + `array_append('T_TECHNO')`,
  `updated_at` préservé. Test `tests/integration/questions-ttechno-lot3-tags.test.ts` : 14 verts ; corps retiré → 7
  rouges, suite principale bloquée ; restauré d'une copie, identique. `security-auditor` : aucun bloquant.
- CI : garde « doc à jour » rouge (la ligne `Doc-inchangée:` n'était que dans la PR) → commit vide qui la porte.
- #2800 mergée, `check:migrations` vert, `migration list --linked` : seule 20261118052320 en attente ; `db:migrate`
  depuis le dépôt principal. Prod vérifiée : 6 publiés, `{1_GEN,T_TECHNO}`, tags 1GEN + TTECHNO, `updated_at`
  inchangés, trigger réactivé.

## 22. Compléments du lot 3 : phase 0 (2026-11-18)

**Relevé prod (MCP, lecture seule)** :

- Nœud « fonctions x ↦ aˣ » (c185c955, celui de 031, 032, 033, 036, 080, 081) : les 4 modèles taggés au lot 3
  (E1–E4), plus 3a8ef5f7 (exposant 1/n), 9ead685c (placer des points de k·aˣ) et fc27769e (lire sur la courbe de
  k·aˣ), `1_GEN` seul. Tous sur x ⩾ 0 et k > 0 : rien sur a⁻ˣ, sur x < 0 ni sur k < 0.
- Nœud « propriétés algébriques » (44206987, celui de 034, 078, 079) : seulement les modèles eˣ de 1re / Tle spé
  (calques à ne pas réécrire, Q15). ⚠ E2 est rangé sur le nœud aˣ : nos trois compléments iront sur 44206987,
  seul nœud où le trigger accepte 034 / 078 / 079.
- Recherche par contenu (exposants négatifs, k·aˣ, a⁻ˣ) sur tous les modèles : seulement des puissances entières
  (2nde 2-270, 3e 3-004). Rien à réutiliser.

**Proposition** (modèles neufs, `grades ['T_TECHNO']` seul : les bornes 1GEN arrêtent x à 0 ; brouillons ; un
point TTECHNO chacun ; a > 0 partout) :

| #   | Modèle                                      | Point | Contenu (variations)                                                                             | Niv. |
| --- | ------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------ | ---- |
| C1  | Produit de puissances, exposants relatifs   | 034   | aᵐ × aᵖ, un exposant négatif ; somme négative ; exposant manquant (aᵐ × a^? = aʳ)                | 1    |
| C2  | Quotient de puissances, exposants relatifs  | 078   | aᵐ / aᵖ avec p > m ; p négatif (on soustrait un négatif) ; 1 / aᵖ = a⁻ᵖ                          | 1    |
| C3  | Puissance d'une puissance, n entier relatif | 079   | (aˣ)ⁿ avec n ∈ −3..−1 ; x négatif, n négatif ; a^(nx) à écrire (a^?)ⁿ                            | 1–2  |
| C4  | Exposant négatif : a⁻ˣ = 1/aˣ               | 031   | a⁻ˣ en fraction 1/aˣ ; 2⁻³ = 1/8 exact ; 1,5⁻²·³ à la calculatrice ; « il y a x ans » (C × a⁻ˣ)  | 1–2  |
| C5  | Sens de variation de x ↦ aˣ sur ℝ           | 032   | sens sur ℝ (choix) ; comparer a⁻² et a⁻¹·⁵ sans calcul ; aˣ > 0 pour tout x                      | 1    |
| C6  | Courbe de x ↦ aˣ sur ℝ                      | 033   | associer courbes tracées sur [−3 ; 3] ; points (0 ; 1) et (−1 ; 1/a) ; courbe au-dessus de l'axe | 1    |
| C7  | Sens de variation de x ↦ k·aˣ               | 036   | choix croissante / décroissante selon k > 0 ou k < 0, a > 1 ou 0 < a < 1 (les 4 cas)             | 1    |
| C8  | Utiliser le sens de variation de x ↦ k·aˣ   | 080   | comparer f(x₁) et f(x₂) sans calcul (k < 0 compris) ; maximum sur [0 ; 5] ; retrouver k ou a     | 2    |

Plages : a ∈ {2 ; 3 ; 5 ; 1,5 ; 0,5 ; 0,8} ; exposants dans {−3 ; −2,5 ; … ; 2,5 ; 3} (pas 0,5), réponse jamais a⁰ ;
k ∈ {−5..−1, 1..5}. Réponses : forme « une seule puissance » (`requiredForm: power`, comme E2), fraction exacte,
décimal arrondi, choix.

**Questions à David** :

- **Q19 — C5, C6 (x < 0)** : E3 et E4 s'arrêtent à x ⩾ 0, le BO de Tle techno étend à ℝ. Écrire C5 et C6, ou s'en
  tenir à E3 / E4 ? Reco : **les écrire** (sinon a⁻ˣ n'a jamais de courbe ni de sens de variation).
- **Q20 — Découpage** : lot 3a « propriétés » (C1–C4), puis lot 3b « fonctions » (C5–C8), ou un seul lot ?
  Reco : **3a puis 3b** (pages à cocher courtes, comme 2a / 2b).
- **Question d'accès** (migration de tags, après écriture) : modèles en brouillon, personne ne les voit avant la
  publication ; publiés, ils apparaissent au catalogue et au cahier de texte de Tle techno seulement. Personne ne
  perd rien.

**Décisions (David, 2026-11-18, « je suis tes recos »)** : **Q19** C5 et C6 écrits (x < 0) ; **Q20** lot 3a
« propriétés » (C1–C4), puis lot 3b « fonctions » (C5–C8) ; question d'accès : personne pour les brouillons, Tle
techno à la publication.

## 23. Lot 3a : écriture (2026-11-18)

`docs/wip/questions/lot-ttechno-3a.py` → `scripts/questions/ttechno-3a-proprietes/` (4 fichiers, 49 specs).

- C1 (034) produit, C2 (078) quotient, C3 (079) (aˣ)ⁿ avec n relatif : réponse « une seule puissance »
  (`requiredForm: power`, comme E2) ; `2^{-1}` accepté, `\frac{1}{2}` en `bad_form` (specs). Exposant manquant
  (C1 v2, C3 v2) demandé par une case nombre (« quel réel x … »). Résultat jamais a⁰ ni a¹.
- C4 (031) a⁻ˣ = 1/aˣ : exposant du dénominateur ; 2⁻³ exact (1/8 ou 0,125) ; 0,5⁻ⁿ = 2ⁿ ; calculatrice ;
  valeur passée d'un placement V(−y) (erreur typique « on retire t % par an » refusée).
- Simulation `create-questions` verte (base locale, aucun homonyme) ; `question:specs` 4 / 4 importables, 700
  tirages ; 295 formules distinctes de 40 aperçus par modèle à `validateLatex` + accolades : 0 problème.
- Corrigé en route : « (−2,5) × (3) » → parenthèses seulement si n < 0 ; x = 3 / (−3) en fraction → « 3 ÷ (−3) ».
- Base locale : 4 brouillons (copie des fichiers) ; aperçu admin (Chrome, `127.0.0.1:5177`) : C4 v0 `−3,2`
  refusé « l'opposé du résultat » ; C1 v2 `1,5^−4,5` saisi au clavier → juste.
  **#2809 mergée (2026-11-18)**, CI verte.

- Rangement prévu (migration après création en prod) : C1–C3 sur « propriétés algébriques » (44206987), C4 sur
  « fonctions x ↦ aˣ » (c185c955).

## 24. Lot 3a : prod, rangement et tags (2026-11-18)

David a lancé `create-questions --publier` : 4 brouillons (a5b2c4fa C1, ebefd0a9 C2, e52d93b4 C3, b14f7169 C4),
vérifiés par MCP (`draft`, `{T_TECHNO}`, sans nœud ni tag) ; ids commités sur la branche de la migration.

- Points (MCP) : 034, 078, 079 sur « Fonctions > Fonction exponentielle > propriétés algébriques » (44206987) ;
  031 sur « fonctions x ↦ aˣ » (c185c955).
- Question d'accès tranchée au § 22 : **personne** (brouillons), Tle techno à la publication.
- Migration `20261118071439_questions_ttechno_lot3a_rangement_tags` sur le gabarit du lot 2b.
- Test `tests/integration/questions-ttechno-lot3a-rangement-tags.test.ts` : 9 verts ; corps retiré (en-tête et
  rollback gardés) → 5 rouges ; fichier restauré d'une copie, identique. `types:cliquet` tenu.
- `security-auditor` : aucun finding bloquant (diff avec le lot 2b = ids, chemins, codes, compteurs ; rollback
  miroir ; aucune policy, aucune table d'élève ; chemins résolus en prod sur un seul nœud chacun).

**Migré (2026-11-18)** : #2811 mergée (CI verte, `check:migrations --pr 2811` vert) ; `migration list --linked` :
seule `20261118071439` en attente ; `db:migrate` depuis le dépôt principal (4 conditions). Prod vérifiée (MCP) : C1–C3
sur « propriétés algébriques » (034, 078, 079), C4 sur « fonctions x ↦ aˣ » (031), un tag chacun, `draft`,
`updated_at` inchangés.

- Page à cocher : https://claude.ai/artifact/APGco4p8HR7FuviYRBuqXe (4 fiches, 14 exemples, aucune alerte,
  `verdicts` vide). Rendu à 390 px non vérifié cette fois.

## 25. Lot 3a : publication (2026-11-18)

- Page à cocher relue : 4 verdicts sur 4 « ok », sans commentaire.
- `publier-lot.ts --dir scripts/questions/ttechno-3a-proprietes` : simulation verte (4 brouillons), puis
  `--publier` par David (premier essai hors du dépôt principal : ENOENT, relancé avec `cd`) ; statut relu en base
  (MCP) : 4/4 `published` (a5b2c4fa, ebefd0a9, e52d93b4, b14f7169).

## 26. Lot 3b : écriture (2026-11-18)

`docs/wip/questions/lot-ttechno-3b.py` → `scripts/questions/ttechno-3b-fonctions/` (4 fichiers, 46 specs),
`grades ['T_TECHNO']`, brouillons, tous pour le nœud « fonctions x ↦ aˣ » (c185c955).

- C5 (032, niv. 1) : sens sur ℝ (a > 1, 0 < a < 1) ; comparer deux puissances d'exposants négatifs ; signe de aˣ
  (x < 0) ; aˣ par rapport à 1 pour x < 0. Cases choix.
- C6 (033, niv. 1) : associer trois courbes sur [−3 ; 3] (gabarit E4) ; aˣ, 1ˣ, (1/a)ˣ et la symétrie par rapport
  à l'axe des ordonnées ; f(−1) = 1/a exact (0,5 accepté) ; courbe au-dessus de l'axe (choix).
- C7 (036, niv. 1) : sens de k·aˣ dans les quatre cas (k ⩾ 2 ou k ⩽ −2, jamais ±1), une variation par cas.
- C8 (080, niv. 2) : comparer f(x₁) et f(x₂) sans calcul ; abscisse du maximum sur [0 ; 5] ; k et a à partir de
  f(0) et f(1). Pas de choix mêlé aux cases (piège § 9) : le sens de variation y est dans le corrigé seulement.
- Simulation `create-questions` verte (aucun homonyme en prod) ; `question:specs` 4 / 4 importables, 3 200
  tirages ; `sonde-courbes` 0 problème ; 332 formules distinctes des aperçus à `validateLatex` + accolades : 0.
- Corrigé en route : couleur posée hors `$` (C5, C6, C7) ; `a3 = eval:1/a1` rendu `\dfrac` dans le bloc courbe
  → `a1 = 1/a3` (a3 ∈ {0,5 ; 0,25}) ; « croissante sur ℝ » dans la variation définie sur [0 ; 5] → sans domaine.
- Base locale : 4 brouillons (copie des fichiers) ; aperçu admin (Chrome, `127.0.0.1:5177`) : C6 associer
  (4ˣ, 1ˣ, 0,25ˣ) relié → juste, correction lue ; C8 max de −2 × 0,8ˣ sur [0 ; 5], `5` → juste.
- **#2815 mergée (2026-11-18)**, CI verte. Premier `create-questions --publier` lancé avant le merge : ENOENT,
  rien écrit.

## 27. Lot 3b : prod, rangement et tags (2026-11-18)

David a lancé `create-questions --publier` : 4 brouillons (5d8a7865 C5, 94b1dbf6 C6, f6805041 C7, 069c1a53 C8),
vérifiés par MCP (`draft`, `{T_TECHNO}`, sans nœud ni tag) ; ids commités sur la branche de la migration.

- Points (MCP) : 032, 033, 036, 080 sur « Fonctions > Fonction exponentielle > fonctions x ↦ aˣ » (c185c955).
- Question d'accès tranchée au § 22 : **personne** (brouillons), Tle techno à la publication.
- Migration `20261118080905_questions_ttechno_lot3b_rangement_tags` sur le gabarit du lot 3a (ids, codes, nœud,
  table temporaire).
- Test `tests/integration/questions-ttechno-lot3b-rangement-tags.test.ts` : 9 verts ; corps retiré (en-tête et
  rollback gardés) → 5 rouges ; fichier restauré d'une copie, identique. `types:cliquet` tenu.
- `security-auditor` : aucun finding bloquant (diff avec le lot 3a = ids, codes, sous-notion, table temporaire ;
  rollback miroir ; aucune policy, aucune table d'élève).
- **#2818 mergée (2026-11-18)**, CI verte, `check:migrations --pr 2818` vert. `migration list --linked` : deux en
  attente, `20261118071618` (questions-cm1 lot 8b) et la nôtre → `db:migrate` NON lancé (il pousserait les deux).

**Migré (2026-11-18)** : la migration cm1 jouée entre-temps, `migration list --linked` : seule `20261118080905` en
attente ; `db:migrate` depuis le dépôt principal (4 conditions). Prod vérifiée (MCP) : C5–C8 sur « fonctions x ↦ aˣ »
(032, 033, 036, 080), un tag chacun, `draft`, `updated_at` inchangés.

- Page à cocher : https://claude.ai/artifact/GDznUQpPDffxKACVVUEH7h (4 fiches, 16 exemples ; une alerte attendue :
  bloc associer de C6 non dessiné, joué dans l'aperçu au § 26 ; `verdicts` vide). Rendu à 390 px non vérifié.

## 28. Lot 3b : publication (2026-11-18)

- Page à cocher relue : 4 verdicts sur 4 « ok », sans commentaire.
- `publier-lot.ts --dir scripts/questions/ttechno-3b-fonctions` : simulation verte (4 brouillons), puis
  `--publier` par David ; statut relu en base (MCP) : 4/4 `published` (5d8a7865, 94b1dbf6, f6805041, 069c1a53).
- Bilan MCP des nœuds « fonctions x ↦ aˣ » et « propriétés algébriques » (modèles publiés par point TTECHNO) :
  031, 032, 033 : 2 ; 034, 036, 078, 079, 080, 081 : 1. Sans modèle : **037** (point chapeau, question à David),
  039 (lot 4), 042, 082, 083 (lot 5, logarithme).

## 29. Lot 4 : phase 0 (2026-11-18)

**Décision (David, 2026-11-18, « tes recos »)** : 037 (point chapeau « connaître les propriétés algébriques ») reçoit
un modèle à lui, ajouté au lot 4.

**Relevé prod (MCP, lecture seule)** :

- 035 et 038 : T1 a439df84 et T2 f84e23a3 publiés, `T_TECHNO` et tags posés (§ 21) → rien à écrire.
- 039 (BO p. 5, « situations algorithmiques » de la partie aˣ, « Python ou tableur ») : aucun modèle. Voisins :
  E6 9ead685c (placer des points de k·aˣ, 1GEN-042) ; 72b876d7 moyenne géométrique de deux nombres (TTECHNO-018,
  suites). Rien à réutiliser tel quel.
- 037 : aucun modèle. Gabarit de forme : 7c8b341b « Propriétés algébriques du logarithme » (TSPE-439, à savoir
  parmi des erreurs typiques). Nœud du point : « propriétés algébriques » (44206987).

**Proposition** (modèles neufs, `grades ['T_TECHNO']`, brouillons, un point chacun) :

| #   | Modèle                                     | Point | Contenu (variations)                                                                                                                           | Niv. |
| --- | ------------------------------------------ | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| M1  | Propriétés des exponentielles : laquelle ? | 037   | aˣ × aʸ, aˣ ÷ aʸ, (aˣ)ⁿ : la bonne écriture parmi des erreurs typiques ; vrai / faux aˣ + aʸ = a^(x+y) ; a⁰, a⁻ˣ                               | 1    |
| M2  | Intercaler un point sur la courbe de aˣ    | 039   | coordonnées du point intercalé (moyennes arithm. / géom.) ; est-il sur la courbe ? ; Python à trous ; formule de tableur ; deux intercalations | 1–2  |

Plages M2 : a ∈ {2 ; 3 ; 4 ; 5 ; 0,5} ; x₁, x₂ entiers d'écart 2 (milieu entier, ordonnée exacte) ; la seconde
intercalation donne une racine (arrondi au centième). M1 : toutes cases choix, aucun calcul.

**Questions à David** :

- **Q21 — M1** : seulement les propriétés du BO (produit, quotient, puissance, a⁰, a⁻ˣ), sans (ab)ˣ = aˣbˣ ?
  Reco : **oui, celles du BO**.
- **Q22 — M2, Python et tableur** : le BO dit « Python ou tableur » ; une variation de chaque ? Reco : **oui**
  (forme des modèles Python du lot 2 : compléter une ligne, réponse en choix).
- **Q23 — M2, placer le point** : faire placer le point intercalé dans un repère (`placer:`), ou les coordonnées
  suffisent ? Reco : **les coordonnées suffisent** (le BO parle d'algorithme, pas de tracé).
- **Question d'accès** (migration de tags, après écriture) : brouillons, personne ne les voit avant la publication ;
  publiés, ils apparaissent au catalogue et au cahier de texte de Tle techno seulement. Personne ne perd rien.

**Décisions (David, 2026-11-18, « je te suis »)** : **Q21** M1 sur les propriétés du BO seulement (produit,
quotient, puissance, a⁰, a⁻ˣ ; pas (ab)ˣ) ; **Q22** M2 avec une variation Python et une variation tableur ;
**Q23** pas de `placer:`, les coordonnées suffisent ; question d'accès : personne pour les brouillons, Tle techno
à la publication.

## 30. Lot 4 : écriture (2026-11-18)

`docs/wip/questions/lot-ttechno-4.py` → `scripts/questions/ttechno-4-fonctions/` (2 fichiers, 45 specs),
`grades ['T_TECHNO']`, brouillons.

- M1 (037, niv. 1, nœud « propriétés algébriques ») : aˣ × aʸ, aˣ ÷ aʸ, (aˣ)ʸ, a⁰, a⁻ˣ parmi des erreurs typiques ;
  vrai / faux aˣ + aʸ = aˣ⁺ʸ (contre-exemple x = y = 0). Cases choix, bonne réponse à des rangs variés.
- M2 (039, niv. 2, nœud « fonctions x ↦ aˣ ») : coordonnées du point C intercalé ; position du point des moyennes
  arithmétiques (au-dessus de la courbe) ; Python à trous (`sqrt(yA * yB)`) ; tableur (`=RACINE(B2*B3)`) ; deux
  intercalations (ordonnée au centième). a ∈ {2 ; 3 ; 4 ; 5 ; 0,5}, x₁ ∈ {−1 ; 0 ; 1 ; 2}, x₂ = x₁ + 2.
- Simulation `create-questions` verte contre la prod (aucun homonyme) ; `question:specs` 2 / 2 importables,
  2 200 tirages, 0 `\textcolor` hors `$` ; 221 formules distinctes de 120 aperçus : accolades 0 problème,
  `validateLatex` 0 problème hors coordonnées, `\mapsto`, `\mathbb{R}` (notations que le parseur de calcul ne lit pas).
- Vu en route : « 5,20 » pour 5,2 rend `unoptimal_form` (`zeros`), spec alignée sur le moteur ; nombres du tableau
  du tableur passés en `$` (virgule décimale).
- Base locale (copie des fichiers) : 2 brouillons ; aperçu admin (Chrome, `127.0.0.1:5177`) : M2 tableur
  (a = 4) C → juste, correction lue ; M2 deux intercalations (a = 0,5, x₁ = 2) `2,5` et `0,18` → juste.
- **#2819 mergée (2026-11-18)**, CI verte ; worktree retiré.

## 31. Lot 4 : prod, rangement et tags (2026-11-18)

David a lancé `create-questions --publier` : 2 brouillons (5e810e16 M1, 7a37a3e1 M2), vérifiés par MCP (`draft`,
`{T_TECHNO}`, sans nœud ni tag) ; ids commités sur la branche de la migration.

- Points (MCP) : **037 et 039 sur « Fonctions > Fonction exponentielle > fonctions x ↦ aˣ » (c185c955)**. Le § 29
  plaçait 037 sur « propriétés algébriques » (44206987) : faux, M1 va sur le nœud du point.
- Question d'accès tranchée au § 29 : **personne** (brouillons), Tle techno à la publication.
- Migration `20261118104421_questions_ttechno_lot4_rangement_tags` sur le gabarit du lot 3b (ids, codes, 2 modèles,
  table temporaire).
- Test `tests/integration/questions-ttechno-lot4-rangement-tags.test.ts` : 9 verts (encore 9 après le commit) ;
  corps retiré (en-tête et rollback gardés) → 5 rouges ; fichier restauré d'une copie, identique.
  `types:cliquet` tenu.
- `security-auditor` : aucun finding (diff avec le lot 3b = en-tête, ids, codes, gardes « 0 ou 2 », table
  temporaire ; rollback miroir ; aucune policy, aucun GRANT, aucune table d'élève ; état prod mesuré conforme).
- **#2820 mergée (2026-11-18)**, CI verte après `Doc-inchangée:` (garde doc), `check:migrations --pr 2820` vert.
  `migration list --linked` : seule `20261118104421` en attente → `db:migrate` depuis le dépôt principal
  (4 conditions). Prod vérifiée (MCP) : M1 et M2 sur « fonctions x ↦ aˣ », un tag chacun (037, 039), `draft`,
  `updated_at` inchangés. Worktree retiré.

## 32. Lot 4 : page à cocher (2026-11-18)

- Page à cocher : https://claude.ai/artifact/4sxC6vTuygGLBECtmuznzv (2 fiches : 5e810e16 TTECHNO-037, 6 exemples ;
  7a37a3e1 TTECHNO-039, 5 exemples ; aucune alerte ; nœud lu en base : « fonctions x ↦ aˣ » ; `verdicts` vide).
  Rendu à 390 px non vérifié.

## 33. Lot 4 : publication et bilan (2026-11-18)

- Page à cocher relue : 2 verdicts sur 2 « ok », sans commentaire.
- `publier-lot.ts --dir scripts/questions/ttechno-4-fonctions` : simulation verte (2 brouillons), puis `--publier`
  par David ; statut relu en base (MCP) : 2/2 `published`, `{T_TECHNO}` (5e810e16, 7a37a3e1).
- **Bilan MCP** (points TTECHNO non archivés sans aucun modèle publié tagué) : 45 sur 92, dont les 17 STD2A hors
  périmètre (001–014, 070–072). Restent **28 points STMG** :
  - 017, 019 : rien à écrire (Q17, couverts de fait par 026 / 027) ;
  - **lot 5, logarithme décimal** (9) : 040, 041, 042, 082, 083, 043, 084, 085, 044 ;
  - **lot 6, fonction inverse** (4) : 045, 086, 049, 087 ;
  - **lot 7, deux variables** (6) : 050, 051, 052, 088, 053, 054 ;
  - **lot 8, loi binomiale** (7) : 057, 060, 061, 067, 069, 090, 091.
- 045, 049, 057, 060, 061, 087 étaient des jumeaux « a priori » (§ 3) que le lot 0 n'a pas retenus.

## 34. Lot 5 : phase 0, logarithme décimal (2026-11-18)

**Relevé prod (MCP, lecture seule)** — trois nœuds (sous-notions de « Logarithmes ») :

| Nœud                                    | Points        | Modèles rangés aujourd'hui                                                                               |
| --------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------- |
| « logarithme décimal » (217d0af1)       | 040, 041, 044 | aucun                                                                                                    |
| « propriétés algébriques » (dae7b3f1)   | 042, 082, 083 | `ffd5c051`, `7c8b341b` (propriétés de ln), `f455700a` (Briggs, Python), `97309b20` (xᵃ, dérivée) : T_SPE |
| « équations et inéquations » (ee6b005b) | 043, 084, 085 | `d3301f2d` (équation ln), `14036c68` (inéquation ln), `28ede1b8` (demi-vie, exp et ln) : T_SPE / T_COMP  |

- Recherche par contenu sur **tous** les modèles (`\log` dans les variations, « logarithme décimal » ou « log »
  dans le titre) : **aucun modèle en log décimal**. Rien à taguer.
- Autres sous-notions de « Logarithmes » (courbe, dérivée, réciproque) : 7 modèles ln de Tle spé / compl.,
  dont `86c59a05` (variations de ln : comparer, signe) et `74b103a8` (reconnaître la courbe de ln).
- Calques utiles (idées reprises, **originaux intacts**, Q3) : `7c8b341b` (formules en QCM), `ffd5c051`
  (écrire en fonction de ln 2 et ln 3, regrouper en ln n), `d3301f2d`, `14036c68`, `f1963ef2` (seuil qⁿ par le
  logarithme, TCOMP-239), `86c59a05`, `74b103a8`. Hors bornes, non repris : Briggs, xᵃ dérivée, demi-vie,
  réciproque de exp, limites.
- Moteur : `log` sans base = **décimal** dans l'évaluation (`mathAST/eval/evaluate.ts`, `common/numeric.ts`) et
  la dérivation ; donc `{{eval:log(…)}}` et la correction des réponses comprennent `\log`. À sonder à
  l'écriture : `f(x) = log(x)` dans un bloc ` ```courbe ` (décimal ou népérien ?), et l'équivalence
  `\dfrac{\log 5}{\log 2}` ↔ `\log(5)/\log(2)`.
- Bornes (ttechno.md, ltt-1) : log(aⁿ) = n·log(a) avec n entier naturel dans les **transformations** (082, 044) ;
  x réel admis dans les **résolutions** (043, 084, 085). Pas de base e, pas de log_a, pas de dérivée de log.

**Proposition** (9 modèles neufs, un point chacun, `grades ['T_TECHNO']` seul, brouillons) :

| #   | Modèle                               | Point | Contenu (variations)                                                                                                                                | Niv. |
| --- | ------------------------------------ | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| L1  | Définition du logarithme décimal     | 040   | log(10ⁿ) = n sans calculatrice (n ∈ −3..6) ; « 10ˣ = 1000, donc x = ? » ; 10^(log b) = b ; nombre de chiffres de N connaissant log N ≈ 5,3          | 1    |
| L2  | Sens de variation de log             | 041   | sens (choix) ; comparer log 0,7 et log 1,3 sans calcul ; signe de log x ; encadrer : 100 < x < 1000 ⇒ 2 < log x < 3 ; courbe (si le bloc trace log) | 1    |
| L3  | log(ab) = log a + log b              | 042   | formule (choix) ; log 2 + log 5 = 1 ; log a + log b = log(?) ; log 200 = log 2 + ?                                                                  | 1    |
| L4  | log(aⁿ) = n log a                    | 082   | formule (choix) ; log(2⁵) = ? × log 2 ; log 8 en fonction de log 2 ; valeur de log(aⁿ) avec log a ≈ 0,301 donné                                     | 1    |
| L5  | log(a/b) = log a − log b             | 083   | formule (choix) ; log(1/b) = −log b ; log a − log b = log(?) ; log 0,5 avec log 2 donné                                                             | 1    |
| L6  | Transformer des expressions avec log | 044   | log 72 en fonction de log 2 et log 3 ; log a + log b − log c = log n ; log(100x) = 2 + log x ; log(1000/x²) littéral                                | 2    |
| L7  | Résoudre aˣ = b ou xᵃ = b            | 043   | 10ˣ = b ⇒ x = log b ; aˣ = b ⇒ x = log b / log a ; annuités (capital doublé, x réel) ; xᵃ = b (x > 0), taux moyen                                   | 2    |
| L8  | Résoudre aˣ < b ou xᵃ < b            | 084   | a > 1 ; 0 < a < 1 (log a < 0 : le sens change) ; xᵃ ⩽ b, x > 0 ; réponse en intervalle                                                              | 2–3  |
| L9  | Seuil aⁿ < b, n entier naturel       | 085   | plus petit n (0,8ⁿ < 0,01 ; capital qui dépasse un montant ; dépréciation d'une machine) — calque `f1963ef2` en log                                 | 2    |

Plages : a ∈ {0,5 ; 0,8 ; 0,9 ; 1,02 … 1,08 ; 2 ; 3 ; 5} ; b > 0 ; réponses en valeur exacte ou arrondie selon
la variation (Q25). L9 distinct de T6 (`questions-1gen`, seuil sans log, par tableau ou Python).

**Questions à David** :

- **Q24 — Découpage** : lot 5a « définition, variations, propriétés » (L1–L6), puis lot 5b « équations,
  inéquations, seuils » (L7–L9) ? Reco : **5a puis 5b**, pages à cocher courtes comme 3a / 3b.
- **Q25 — Forme des réponses aux équations** : exemple 2ˣ = 5. Reco : **valeur exacte** (x = log 5 / log 2) quand
  l'énoncé est purement algébrique, **arrondi** (« au centième », « nombre d'années ») quand il y a un contexte.
- **Q26 — Nombre de chiffres** (commentaire du BO : log N donne l'ordre de grandeur et le nombre de chiffres
  d'un entier) : une variation dans L1 ? Reco : **oui**. Le repère semi-logarithmique (STI2D / STL) : non, hors STMG.
- **Question d'accès** (migration de tags, après écriture) : brouillons, personne ne les voit ; publiés, ils
  apparaissent au catalogue et au cahier de texte de Tle techno seulement. Personne ne perd rien.

**Décisions (David, 2026-11-18, « je suis tes recos »)** : **Q24** lot 5a (L1–L6), puis lot 5b (L7–L9) ;
**Q25** valeur exacte pour une équation purement algébrique (2ˣ = 5 ⇒ x = log 5 / log 2), arrondi quand il y a un
contexte ; **Q26** une variation « nombre de chiffres » dans L1, pas de repère semi-logarithmique ; question
d'accès : personne pour les brouillons, Tle techno à la publication.

## 35. Lot 5a : écriture (2026-11-18)

`docs/wip/questions/lot-ttechno-5a.py` → `scripts/questions/ttechno-5a-logarithme/` (6 fichiers, 76 specs),
`grades ['T_TECHNO']`, brouillons. Worktree `ubumaths-wt-questions-ttechno`, branche `feat/questions-ttechno-lot5a`.

- L1 (040) : log(10ⁿ), log 0,01…, 10ˣ = b (choix), 10^(log b), calculatrice, nombre de chiffres. L2 (041) : sens
  (choix), comparer, signe, encadrer, courbe parmi 4 (` ```courbe ` dans un ````choix). L3 (042), L4 (082), L5 (083) :
  formule (choix mélangé), calculs sans calculatrice, valeurs approchées à partir de log 2 ≈ 0,301… ; L4 : nombre
  de chiffres de 2ⁿ. L6 (044) : log 72 en log 2 / log 3, regrouper en log n, expressions littérales en x.
- Simulation `create-questions` verte contre la prod (aucun homonyme) ; `question:specs` 6 / 6 importables,
  1 200 tirages chacun ; 558 formules distinctes de 240 aperçus : accolades et `validateLatex` 0 problème ;
  `sonde-courbes` 200 blocs, 0 problème.
- **Sonde des courbes corrigée** : elle ne lisait pas les courbes d'un ````choix (« 0 blocs », donc « 0 problème »
  sans rien lire) ; `scripts/questions/sonde-courbes.ts` retire maintenant le décalage dans un choix comme dans un
  associer (lot 3b relu : inchangé).
- Moteur : `log` = décimal dans `{{eval:…}}`, la correction et le bloc courbe (`eval/compile.ts`) : vérifié à
  l'écran (courbe par (1 ; 0) et (10 ; 1)).
- ⚠ **Saisie de log au clavier** : MathLive change « log » en `\log_{#?}` (case de base, défaut de la bibliothèque) ;
  « log(7) » tapé donne `\log_{(7)}`, jugé **faux** ; seul `\log(7)` passe (`\log_{10}(7)` → `bad_form`). L1 v2
  passée en choix. Ligne 39 de `outils-manquants.md`. **Bloque Q25 au lot 5b** (réponses exactes log 5 / log 2).
- Corrigés en route (aperçus, pas les specs) : `{{la}}` s'affichait « 301/1000 » → `{{eval:la;d}}` ; tirage
  log 2 + log 5 → log 10 exclu.
- Base locale : 6 brouillons ; aperçu admin (Chrome, `127.0.0.1:5176`) : L2 courbes, A coché → juste ; L2 signe de
  log(8,5), rendu à virgule ; L3 v4 `1,322` tapé → juste.

**Q27 tranchée (David, 2026-11-18, « je te suis »)** : petite PR à part, raccourci « log » → `\log` (sans case de
base) dans les champs de réponse ; à merger avant l'écriture du lot 5b (réponses exactes, Q25).

## 36. Saisie de log au clavier, Q27 (2026-11-18)

Branche `fix/saisie-log` (worktree `ubumaths-wt-questions-ttechno`). `MathPrompt.svelte` (toutes les cases de
réponse à trous) : raccourci `log` → `\log`, posé avant le filtre des majuscules collées (qui garde et remet les
raccourcis). Test `markdown/nodes/__tests__/saisie-log.svelte.test.ts` : rouge sans le correctif
(`\log_{#?}`, « log(7) » → `\log_{\left(7\right)}`), vert avec ; `ln` inchangé. Moteur : `\log\left(7\right)`,
`\log(7)`, `\log 7` jugés justes. Le lot 5b peut demander des réponses exactes en log (Q25).

- CI : le test de frappe réelle (`userEvent.keyboard`) passait en local et échouait en CI (frappes perdues ou hors de
  la case, 3 essais) ; retiré. Reste le test du raccourci (rouge sans le correctif). Frappe réelle vérifiée à la main
  (aperçu admin local, Chrome, L1 v1) : « log(7) » → `\log\left(7\right)`.

## 37. Lot 5a : prod, rangement et tags (2026-11-18)

David a lancé `create-questions --publier` : 6 brouillons (dc269779 L1, fa2ade8a L2, 9834f4cd L3, 22bbd82a L4,
ceeba3f8 L5, af24839d L6), vérifiés par MCP (`draft`, `{T_TECHNO}`, sans nœud ni tag) ; ids écrits par le script
dans le dépôt principal, reportés et commités sur la branche de la migration.

- Points (MCP) : 040, 041, 044 sur « Fonctions > Logarithmes > logarithme décimal » (217d0af1) ; 042, 082, 083 sur
  « propriétés algébriques » (dae7b3f1). Conforme au § 34.
- Question d'accès tranchée au § 34 : **personne** (brouillons), Tle techno à la publication.
- Migration `20261118203301_questions_ttechno_lot5a_rangement_tags` sur le gabarit du lot 4 (ids, codes, nœuds,
  garde « 0 ou 6 », table temporaire `_qtt5a_modeles`).
- Test `tests/integration/questions-ttechno-lot5a-rangement-tags.test.ts` : 9 verts ; corps retiré (en-tête et
  rollback gardés) → 5 rouges ; fichier restauré d'une copie, identique, 9 verts.
  `types:cliquet` tenu.
- `security-auditor` : aucun finding (diff avec le lot 4 = en-tête, ids, codes, nœuds, garde « 0 ou 6 », table
  temporaire ; rollback miroir ; aucune policy, aucun GRANT, aucune table d'élève ; état prod mesuré conforme).
- **#2845 mergée (2026-11-18)**, CI verte, `check:migrations --pr 2845` vert. `migration list --linked` : seule
  `20261118203301` en attente → `db:migrate` depuis le dépôt principal (4 conditions). Prod vérifiée (MCP) : 6
  modèles sur leur nœud, un tag chacun (040, 041, 044 / 042, 082, 083), `draft`, `updated_at` inchangés. Worktree
  retiré.

## 38. Lot 5a : page à cocher (2026-11-18)

- Page à cocher : https://claude.ai/artifact/5ZCuRYYE2N3wLnsSnvQioG (6 fiches : dc269779 TTECHNO-040, 6 exemples ;
  fa2ade8a 041, 9834f4cd 042, 22bbd82a 082, ceeba3f8 083, af24839d 044, 5 exemples chacun ; aucune alerte ; tous
  `draft` ; `verdicts` vide). Rendu à 390 px non vérifié.

## 39. Lot 5a : publication (2026-11-18)

- Page à cocher relue : 6 verdicts sur 6 « ok », sans commentaire.
- `publier-lot.ts --dir scripts/questions/ttechno-5a-logarithme` : simulation verte (6 brouillons) ; garde des
  niveaux : aucun niveau manquant ; `--publier` par David ; statut relu en base (MCP) : 6/6 `published`,
  `{T_TECHNO}` (dc269779, fa2ade8a, 9834f4cd, 22bbd82a, ceeba3f8, af24839d).

## 40. Lot 5b : écriture (2026-11-18)

`docs/wip/questions/lot-ttechno-5b.py` → `scripts/questions/ttechno-5b-log-resolutions/` (3 fichiers, 36 specs),
`grades ['T_TECHNO']`, brouillons. Worktree `ubumaths-wt-questions-ttechno`, branche `feat/questions-ttechno-lot5b`.

- L7 (043, niv. 2) : 10ˣ = b et aˣ = b en **valeur exacte** (Q25 : log b, log b / log a) ; k·aˣ = b, capital doublé
  (durée réelle), xᵃ = b (x > 0), taux annuel moyen : **arrondis**. L8 (084, niv. 3) : aˣ < b, aˣ ⩾ b (a > 1),
  aˣ > b avec 0 < a < 1 (le sens change), xᵃ ⩽ cᵃ (x > 0) ; réponse en intervalle (`answerKind: intervalles`),
  bornes exactes. L9 (085, niv. 2) : plus petit n (qⁿ < 10⁻ᵗ, capital qui double, machine qui se déprécie,
  aⁿ > 10ᵏ), calque `f1963ef2` passé en log.
- Moteur : une valeur approchée (2,32 pour log 5 / log 2) est jugée **fausse** quand la valeur exacte est demandée
  (specs d'erreur) ; `\log(5)/\log(2)` en ligne → `bad_form`, mais au clavier « / » fait une fraction.
- Simulation `create-questions` verte contre la prod (aucun homonyme) ; `question:specs` 3 / 3 importables,
  200 tirages par variation ; 428 formules distinctes des aperçus : accolades et `validateLatex` 0 problème.
  Corrigé en route : capital à 2 % (35,003 ans → « 35 ») exclu.
- Base locale (3 brouillons) ; aperçu admin (Chrome, `[::1]:5179`), frappe réelle : L7 7ˣ = 5, « log(5)/log(7) »
  → fraction, **juste** ; L8 0,5ˣ > 0,3, « ]-oo;log(0,3)/log(0,5)[ » → **juste**, corrigé rendu ; L9 machine
  8000 € → 7, juste. « inf » tapé reste « inf » (raccourci `oo` ou touche ∞), comme dans tous les modèles à
  intervalles.
- ⚠ #2839 (saisie de log) **pas encore en prod** : L7 et L8 restent en brouillon jusqu'au `deploy:prod` qui le
  livre ; L9 n'en dépend pas.
- **#2849 mergée (2026-11-18)**, CI verte. Worktree retiré.

## 41. Lot 5b : création en prod et rangement (2026-11-18)

- `create-questions --publier` lancé par David : 3 brouillons, ids reportés dans les JSON (commités sur la branche
  de la migration) et relus par MCP (`draft`, `{T_TECHNO}`, sans nœud ni tag) : L7 `52b884ee` (043, niv. 2),
  L8 `10bd7075` (084, niv. 3), L9 `becf24bc` (085, niv. 2).
- Relevé MCP : 043, 084, 085 sur « Fonctions > Logarithmes > équations et inéquations » (ee6b005b).
- Migration `20261118214049_questions_ttechno_lot5b_rangement_tags` (gabarit lot 5a ; garde sans nœud ni tag, TOUT
  ou RIEN sur 3, rollback commenté). Accès : tranché § 34 (personne pour les brouillons). Test d'intégration
  `questions-ttechno-lot5b-rangement-tags` : **rouge sans la migration** (4 échecs + suite principale), **9 / 9
  vert** avec.
- **#2851 mergée (2026-11-18)**, CI verte, `check:migrations --pr 2851` vert ; `security-auditor` sans finding.
  `migration list --linked` : seule `20261118214049` en attente ; `db:migrate` depuis le dépôt principal. Relu par
  MCP : 3 / 3 sur ee6b005b, un tag chacun (043, 084, 085), `draft`, `updated_at` inchangé. Worktree retiré.

## 42. Lot 5b : page à cocher (2026-11-18)

- Page à cocher : https://claude.ai/artifact/APGycPrWV53fLcHSp4zD1c (3 fiches : 52b884ee TTECHNO-043, 6 exemples ;
  10bd7075 084, 4 exemples ; becf24bc 085, 4 exemples ; aucune alerte ; tous `draft` ; `verdicts` vide). Rendu à
  390 px non vérifié.

## 43. Lot 5b : publication de L9 (2026-11-18)

- Page à cocher relue : 3 verdicts sur 3 « ok », sans commentaire.
- L9 seule : `publier-lot.ts --dir <scratchpad>/ttechno-5b-l9` (copie du seul `03-logarithme-seuil-entier.json`,
  le script ne filtre pas par fichier) ; simulation puis `--publier` par David. Relu en base (MCP) : `becf24bc`
  `published`, `{T_TECHNO}` ; L7 `52b884ee` et L8 `10bd7075` toujours `draft`.
- **À faire après le `deploy:prod` qui livre #2839** : publier L7 et L8 (même geste, dossier avec leurs deux
  fichiers, ou `--dir scripts/questions/ttechno-5b-log-resolutions` : L9 déjà publiée est laissée telle quelle).

## 44. Lot 6 : phase 0, fonction inverse (2026-11-19)

**Relevé prod (MCP, lecture seule)** :

| Point | Nœud (sous-notion)                                    | Modèles rangés aujourd'hui                                                                      |
| ----- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 045   | « définition et courbe » (96c8b0bd, Fonction inverse) | 1048e462 « La fonction inverse » (2de + T_TECHNO, tagué 048 : un seul point TTECHNO par modèle) |
| 086   | idem                                                  | idem                                                                                            |
| 049   | « variations et extremums » (2e77d4d9, Dérivation)    | 17 modèles 1re spé / 1re techno / Tle spé : polynômes, eˣ, ln ; aucun avec 1/x                  |
| 087   | idem                                                  | idem                                                                                            |

- Recherche par contenu sur tous les modèles (« coût moyen », « prix unitaire », « asymptote », « inverse »,
  `\frac{…}{x}`) : asymptotes de Tle spé (b4f3142b, a4d8dc52, 6248e597 : limites, hors bornes) ; 9755a856
  (dériver une somme avec 1/x **et √x**, 1re spé : √x hors bornes) ; 2de « 1/x = k, 1/x < k ». **Rien à taguer.**
- 1048e462 couvre déjà la courbe et l'ensemble de définition (048) ; rien sur les bornes ni les asymptotes.
- Bornes : 045 et 086 en approche intuitive, notation lim admise pour 1/x, k/x, a + k/x (ltt-6) ; 049 / 087 :
  P(x) + k/x avec deg P ⩽ 3, forme quotient (x² + 2x + 100)/x admise (ltt-4) ; dérivées : polynômes et 1/x
  seulement.
- Outils : ` ```courbe ` trace 1/x (1048e462) ; ` ```variation ` a la double barre (`||`) ; `placer:` dans un repère.
  À sonder à l'écriture : double barre dans une ligne `variation:` entre deux branches, courbe de x + 1/x sans
  trait vertical en 0.

**Proposition** (5 modèles neufs, un point chacun, `grades ['T_TECHNO']`, brouillons) :

| #   | Modèle                                 | Point | Contenu (variations)                                                                                                                                   | Niv. |
| --- | -------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---- |
| I1  | 1/x pour x très grand ou proche de 0   | 045   | inverses de 0,001, 10⁶, −0,0001 ; « quand x devient très grand, 1/x… » (choix) ; x proche de 0 à droite / à gauche ; notation lim (1/x, k/x, a + k/x)  | 1–2  |
| I2  | Asymptotes de l'hyperbole, par lecture | 086   | courbe de 1/x, k/x ou a + k/x tracée : droites dont la courbe se rapproche (choix : y = 0, x = 0, y = a) ; équation de l'asymptote horizontale         | 1    |
| I3  | Étudier f(x) = ax + b + k/x            | 049   | dérivée a − k/x² ; même dénominateur (ax² − k)/x² ; signe de f′ sur ]0 ; +∞[ ; sens de variation ; minimum (valeur et abscisse)                        | 2    |
| I4  | Coût moyen, prix unitaire              | 049   | CM(x) = C(x)/x écrit (x² + 2x + 100)/x puis x + 2 + 100/x ; production qui rend le coût moyen minimal ; ce coût minimal ; prix unitaire                | 2–3  |
| I5  | Représenter P(x) + k/x                 | 087   | tableau de valeurs à compléter puis points à placer (`placer:`) ; quelle courbe pour quelle fonction (choix) ; allure tirée d'un tableau de variations | 1–2  |

Plages : a ∈ {1 ; 2 ; 0,5} ; k ∈ {4 ; 9 ; 16 ; 25 ; 100} (carrés : minimum en x = √(k/a) entier) ; contextes x en
centaines d'unités, x ∈ [1 ; 20].

**Questions à David** :

- **Q28 — Ensemble d'étude** : ]0 ; +∞[ partout (les contextes l'imposent), plus une variation sur ℝ privé de 0
  avec la double barre dans I3 ? Reco : **oui**.
- **Q29 — Polynôme de degré 2 ou 3** : une variation x² + k/x dans I3 (f′ = (2x³ − k)/x², k = 16 ou 54, racine
  cubique entière) ? Reco : **oui, une seule**, le reste en ax + b + k/x.
- **Q30 — « Représenter » (087)** : faire placer des points dans un repère et choisir l'allure, ou seulement
  choisir l'allure ? Reco : **les deux** (c'est le verbe du point).
- **Q31 — Découpage** : un seul lot de 5 modèles ? Reco : **oui** (une page à cocher de 5 fiches).
- **Question d'accès** (migration de tags, après écriture) : brouillons, personne ne les voit ; publiés, ils
  apparaissent au catalogue et au cahier de texte de Tle techno seulement. Personne ne perd rien.

**Décisions (David, 2026-11-19, « je te suis »)** : **Q28** ]0 ; +∞[ partout, plus une variation sur ℝ privé de 0
avec la double barre (I3) ; **Q29** une seule variation x² + k/x (I3) ; **Q30** I5 fait placer des points ET choisir
l'allure ; **Q31** un seul lot de 5 modèles ; question d'accès : personne pour les brouillons, Tle techno à la
publication.

## 45. Lot 6 : écriture (2026-11-19)

`docs/wip/questions/lot-ttechno-6.py` → `scripts/questions/ttechno-6-inverse/` (5 fichiers, 69 specs),
`grades ['T_TECHNO']`, brouillons. Worktree `ubumaths-wt-questions-ttechno`, branche `feat/questions-ttechno-lot6`.

- I1 (045) : inverses de ±10⁻ⁿ et de 10ⁿ ; x très grand, x proche de 0 (choix) ; lim de a ± k/x en +∞ (nombre),
  de ±k/x en 0 avec x > 0 (choix −∞ / 0 / +∞). I2 (086) : courbe de ±k/x (les deux axes), de a ± k/x (y = a, axe des
  ordonnées), équation de l'asymptote horizontale sans courbe. I3 (049) : dérivée, même dénominateur, intervalle
  où f′ ⩾ 0, minimum ; x + k/x sur ℝ privé de 0 (choix, tableau de signes à double barre) ; x² + k/x
  (k = 2c³). I4 (049) : C_M(x) = x + p + q/x, production et coût moyen minimaux (q = m², x ∈ [1 ; 20]) ; prix
  unitaire c + F/n : valeur limite, seuil n ⩾ F/d. I5 (087) : 5 points de x + 12/x + b à placer ; courbe de x + 4/x
  parmi 4 ; courbe d'après un tableau de variations (maximum 6 en 2).
- Simulation `create-questions` verte contre la prod (aucun homonyme) ; `question:specs` 5 / 5 importables,
  300 tirages par variation, 0 `\textcolor` hors `$` ; 490 formules distinctes : accolades et `validateLatex`
  0 problème ; `sonde-courbes` 0 problème.
- Vu en route : `{{eval:10^(-n)}}` rend `\dfrac{1}{100}` → `;d` ; `\substack` et `\limits` inconnus de MathLive →
  `\lim_{x\to0,\ x>0}` ; `x\mapsto{{if…}}x` collait `\mapstox` ; un `?` dans `$…$` d'une variation à choix crée
  une 2e case (« aucune bonne réponse ») ; forme quotient de f′ en `bad_form` (spec retirée, la question demande
  f′(x)) ; ligne `variation:` avec `||` exige des valeurs (limites) → tableau de SIGNES seul sur ℝ privé de 0.
- Base locale : 5 brouillons ; aperçu admin (Chrome, `[::1]:5179`) : I3 tableau ]0 ; 3] ‖ − 0 + et minimum 13 ;
  I5 tableau → courbes, 4 courbes sans points d'extrémité (fenêtre x ⩾ 0, plus de `sur […]`) ; I5 placer
  (b = −3) 5 points → juste ; I2 courbe de −2 − 3/x. Deux brouillons de sonde locaux supprimés.
- **#2862 mergée (2026-11-19)**, CI verte.

## 46. Lot 6 : prod, rangement et tags (2026-11-19)

David a lancé `create-questions --publier` : 5 brouillons (a6fa11c8 I1, b34c8c9b I2, 912caf72 I3, bb7bcab6 I4,
9d6896cc I5), vérifiés par MCP (`draft`, `{T_TECHNO}`, sans nœud ni tag) ; ids commités avec la migration.

- Migration `20261119060317_questions_ttechno_lot6_rangement_tags` (gabarit lot 5b ; 045, 086 sur « Fonction
  inverse > définition et courbe », 049 ×2 et 087 sur « Dérivation > variations et extremums »).
- Test `tests/integration/questions-ttechno-lot6-rangement-tags.test.ts` : 9 verts ; corps retiré → 5 rouges ;
  fichier restauré d'une copie, identique. `types:cliquet` tenu.
- `security-auditor` : aucun finding (diff avec le lot 5b = en-tête, ids, chemins, codes, compte, table temporaire ;
  doublon 049 sans effet sur gardes, vérification et rollback ; état prod conforme).
- **#2868 mergée (2026-11-19)**, CI verte, `check:migrations --pr 2868` vert. `migration list --linked` : seule
  `20261119060317` en attente → `db:migrate` depuis le dépôt principal (4 conditions). Prod vérifiée (MCP) : les 5 sur
  leur nœud, un tag chacun, `draft`, `updated_at` inchangés. Worktree retiré.

## 47. Lot 6 : page à cocher (2026-11-19)

- Page à cocher : https://claude.ai/artifact/W3RrCufGJ6wqLqF3EgSM5q (5 fiches, 24 exemples ; aucune alerte ; nœuds
  et points lus en base ; `verdicts` vide). Rendu à 390 px non vérifié (fenêtre de Chrome non réduite).

## 48. Lot 6 : publication (2026-11-19)

- Page à cocher relue : 5 verdicts sur 5 « ok », sans commentaire.
- `publier-lot.ts --dir scripts/questions/ttechno-6-inverse` : simulation puis `--publier`, lancées par David (le
  classifieur refuse aussi la simulation, qui lit la prod). Statut relu en base (MCP) : 5/5 `published`,
  `{T_TECHNO}` (a6fa11c8, b34c8c9b, 912caf72, bb7bcab6, 9d6896cc).

## 49. Lot 7 : phase 0, deux variables (2026-11-19)

**Relevé prod (MCP, lecture seule)** :

| Point              | Nœud (sous-notion)                                                  | Modèles rangés aujourd'hui                                                                                  |
| ------------------ | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 050, 051, 052, 088 | « changement de variable » (aed5064f, Statistique à deux variables) | 17f35a67 « z = ln(y) » (T_COMP) : ln et e hors programme STMG (Q3) → rien à taguer                          |
| 053, 054           | « ajustement affine » (61aaeaa9, Statistique à deux variables)      | a573d517, 3fec6b41, 49fac266, ef8ade24 : droite donnée, interpréter, interpoler ; aucun Σ des carrés → rien |

- Bornes : ajustements au jugé, droite de Mayer, moindres carrés, sans théorie (051) ; changements donnés (u², 1/t,
  1/√n, log(y)) (052) ; Python ou tableur (053, 054) ; couples en nombre fini (054).
- Outils : ` ```nuage ` avec `ajustement: z = 1/y` (ou `t = x²`, `√`, `ln`) et `nuage: z` (nuage transformé,
  droite) ; **ni log décimal ni 1/√n** dans le bloc. ` ```courbe ` + `placer:` + `axes:` pour placer des points
  (lot 6, I5). Python : forme des modèles du lot 2b (compléter une ligne, choix).

**Proposition** (6 modèles neufs, un point chacun, `grades ['T_TECHNO']`, brouillons) :

| #   | Modèle                                        | Point | Contenu (variations)                                                                                                                                     | Niv. |
| --- | --------------------------------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| D1  | Quel changement de variable redresse le nuage | 050   | nuage (x ; y) courbé ; nuages (x ; z) pour deux ou trois changements proposés (`nuage: z`) : lequel donne des points presque alignés (choix)             | 1    |
| D2  | Représenter le nuage transformé               | 052   | tableau x, y : compléter t = x² (ou z = 1/y, z = log(y) avec y puissance de 10) ; placer les points transformés dans un repère (`placer:`, `axes:`)      | 1–2  |
| D3  | Conjecturer une relation linéaire             | 088   | nuage transformé et tableau (u ; v) presque proportionnels ou affines : quelle relation semble lier les nouvelles variables (choix) ; coefficient (case) | 1–2  |
| D4  | Ajustement par changement de variable         | 051   | z = 1/y (ou t = x², z = log(y)) et droite z = ax + b donnée ; droite de Mayer sur 4 à 6 points (deux points moyens) ; en déduire y ; estimer y pour x₀   | 2–3  |
| D5  | Somme des carrés des écarts (Python, tableur) | 053   | 3 ou 4 points, a et b donnés : calculer Σ(yᵢ − (axᵢ + b))² (case) ; ligne Python de la boucle (choix) ; formule de tableur d'une colonne (choix)         | 2    |
| D6  | Chercher le couple (a ; b) qui minimise       | 054   | tableau de S pour quelques couples : lequel garder (choix) ; deux couples à départager par le calcul (case) ; balayage Python : la ligne de comparaison  | 2    |

Plages : 4 à 6 points ; valeurs transformées exactes (1/y décimal fini, x² entiers, log(y) avec y = 10ᵏ ou donné
arrondi) ; a, b décimaux à un chiffre après la virgule.

**Questions à David** :

- **Q32 — log(y)** (l'exemple du BO) : le bloc ` ```nuage ` ne connaît que ln, carré, √, inverse. Je mets
  z = log(y) **en texte seulement** (tableaux, calculs, sans tracé du bloc) et je note l'outil manquant
  (« log et 1/√n dans ` ```nuage ` ») dans `outils-manquants.md` ? Reco : **oui**.
- **Q33 — Droite de Mayer** (D4) : la faire calculer (deux points moyens, puis la droite), ou la donner comme les
  calculatrices et ne faire que la suite (en déduire y, estimer) ? Reco : **les deux**, une variation chacune.
- **Q34 — Python et tableur** (D5, D6) : une variation de chaque, comme M2 (lot 4) ? Reco : **oui**.
- **Q35 — Découpage** : un seul lot de 6 modèles (une page à cocher) ? Reco : **oui**.
- **Question d'accès** (migration de tags, après écriture) : brouillons, personne ne les voit ; publiés, ils
  apparaissent au catalogue et au cahier de texte de Tle techno seulement. Personne ne perd rien.

**Décisions (David, 2026-11-19, « je te suis »)** : **Q32** log(y) en texte seulement (y = 10ᵏ, sans tracé du bloc),
outil manquant « log et 1/√n dans ` ```nuage ` » noté dans `outils-manquants.md` ; **Q33** droite de Mayer
calculée ET donnée, une variation chacune (D4) ; **Q34** une variation Python et une tableur (D5, D6) ; **Q35** un
seul lot de 6 modèles ; question d'accès : personne pour les brouillons, Tle techno à la publication.

## 50. Lot 7 : écriture (2026-11-19)

`docs/wip/questions/lot-ttechno-7.py` → `scripts/questions/ttechno-7-deux-variables/` (6 fichiers, 71 specs),
`grades ['T_TECHNO']`, brouillons. Worktree `ubumaths-wt-questions-ttechno`, branche `feat/questions-ttechno-lot7`.

- D1 (050) : trois nuages (x ; y), (t ; y), (x ; z), valeurs transformées calculées (`nuage` sans `ajustement:`) ;
  y = ax² + b → t = x² ; y = 100/(ax + b) → z = 1/y ; log(y) affine → z = log(y). D2 (052) : compléter t = x²,
  z = 1/y (décimaux finis), z = log(10ᵏ) ; placer 4 points (t ; y) (` ```courbe ` + `placer:` + `axes:`). D3 (088) :
  y = kt (k), z = ax + b lu dans un tableau (a, b), conjecture « log(y) affine en x » (choix). D4 (051) : z = 1/y,
  t = x², z = log(y) avec droite donnée (estimer y ; y = 10ᶻ exact) ; droite de Mayer (G₁, G₂, a et b entiers). D5
  (053) : S sur 3 points ; ligne Python `(Y[i] - (a*X[i] + b))**2` ; formule de tableur à références absolues.
  D6 (054) : couple de plus petite S (tableau) ; S₁, S₂ pour deux droites ; balayage Python `s < smin` ; `=MIN`.
- Simulation `create-questions` verte contre la prod (aucun homonyme) ; `question:specs` 6 / 6 importables ;
  `sonde-courbes` 0 problème ; sonde des ` ```nuage ` (script jetable, `parseStatChartContent`, 300 tirages) :
  1 200 blocs, 0 problème ; 449 formules distinctes des aperçus : accolades et `validateLatex` 0 problème.
- Vu en route : `$F$1` entre accents graves est lu comme une formule (rendu « 1 ») → `\$F\$1` sans accents
  graves ; une réponse 1/2 pour 0,5 est `bad_form` (spec retirée).
- Base locale : 6 brouillons ; aperçu admin (Chrome, `[::1]:5180`) : D1 trois nuages titrés ; D5 tableur
  `$F$1` affiché, réponse juste ; D2 repère t / y à 4 points.
- **#2874 mergée (2026-11-19)**, CI verte. Worktree retiré.

## 51. Lot 7 : prod, rangement et tags (2026-11-19)

David a lancé `create-questions --publier` : 6 brouillons (50bf587d D1, 007822c5 D2, 68ee10e5 D3, 80850db7 D4,
f88cc70d D5, 43f1fd84 D6), vérifiés par MCP (`draft`, `{T_TECHNO}`, sans nœud ni tag). Le script ne les a pas écrits
dans les fichiers du dépôt principal (lancé d'ailleurs) : ids reportés à la main dans
`scripts/questions/ttechno-7-deux-variables/`, d'après les titres.

- Migration `20261119100631_questions_ttechno_lot7_rangement_tags` (gabarit lot 6 ; 050, 051, 052, 088 sur
  « Statistiques > Statistique à deux variables > changement de variable », 053 et 054 sur « … > ajustement
  affine »).
- Test `tests/integration/questions-ttechno-lot7-rangement-tags.test.ts` : 9 verts ; corps retiré → 5 rouges ;
  fichier restauré d'une copie, identique. `types:cliquet` tenu.
- `security-auditor` : aucun finding (diff avec le lot 6 = en-tête, ids, codes, chemins, table temporaire, compte ;
  prod relue en lecture : 6 points non archivés sur les nœuds attendus, 6 brouillons sans nœud ni tag).
- **#2876 mergée (2026-11-19)**, CI verte (conflit du journal avec main : la version de la branche le contenait), `check:migrations --pr 2876` vert. `migration list --linked` : seule `20261119100631` en attente → `db:migrate` depuis le dépôt principal (4 conditions). Prod vérifiée (MCP) : les 6 sur leur nœud, un tag chacun, `draft`, `updated_at` inchangés. Worktree retiré.

## 52. Lot 7 : page à cocher (2026-11-19)

- Page à cocher : https://claude.ai/artifact/NG5nfwbeMXwSwCNhTXuNS9 (6 fiches, 21 exemples ; nœuds et points lus en
  base ; `verdicts` vide). Deux alertes attendues : bloc ` ```nuage ` non dessiné par la page (D1, D3), à jouer dans
  l'aperçu. Rendu à 390 px non vérifié.

## 53. Lot 7 : publication (2026-11-19)

- Page à cocher relue : 6 verdicts sur 6 « ok », sans commentaire.
- `publier-lot.ts --dir scripts/questions/ttechno-7-deux-variables` : simulation puis `--publier`, lancées par David.
  Statut relu en base (MCP) : 6/6 `published`, `{T_TECHNO}` (50bf587d, 007822c5, 68ee10e5, 80850db7, f88cc70d,
  43f1fd84).

## 54. Lot 8 : phase 0, loi binomiale (2026-11-19)

**Relevé prod (MCP, lecture seule)** :

| Point         | Nœud                                                 | Modèles rangés aujourd'hui                                                                                                   |
| ------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 057, 067, 090 | notion « Probabilités > Loi binomiale » (7f0932c3)   | aucun sur la notion ; ses sous-notions portent déjà 089, 062, 063, 064, 065, 058 (un seul point TTECHNO par modèle) → rien   |
| 060           | « Combinaisons > triangle de Pascal » (d78d5a6b)     | ef3c495c (relation et triangle, n jusqu'à 15 : « en partie », § 9), deux démonstrations, 96be181c (déjà 066) → rien à taguer |
| 061           | « Combinaisons > coefficients binomiaux » (49cafc5f) | 4dcbae71 (n jusqu'à 40), 970dab52 (n jusqu'à 20) : « en partie », § 9 ; 7d9d9b81 (factorielles) ; 07ebdcbe (déjà 059) → rien |
| 069, 091      | « Loi binomiale > espérance et variance » (aa1217ed) | dbee4649 (déjà 058), variance et démonstrations (hors bornes) → rien                                                         |

- Bornes : coefficients au triangle pour n ⩽ 10, pas de factorielle ; espérance admise, pas de variance ; 066, 067,
  068, 069, 090, 091 « Python ou tableur ».
- Outils : ` ```loi ` `X ~ B(n ; p)` + `diagramme: oui` (bâtons, n ⩽ 29) ; ` ```simulation ` `X ~ B(n ; p)` en mode
  `tirages` (tableau des effectifs observés à côté des probabilités) et `moyenne` (courbe des moyennes et droite
  E(X) = np), `graine:` fixe ; ` ```courbe ` + `placer:` + `axes:` ; Python et tableur sous la forme du lot 2b.

**Proposition** (7 modèles neufs, un point chacun, `grades ['T_TECHNO']`, brouillons) :

| #   | Modèle                                      | Point | Contenu (variations)                                                                                                                                                                                                                                 | Niv. |
| --- | ------------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| B1  | La loi binomiale B(n ; p)                   | 057   | situation (n épreuves, succès p) : ce que compte X (choix) ; valeurs prises, de 0 à n (case) ; traduire « exactement 2 », « au moins un », « aucun » (choix)                                                                                         | 1    |
| B2  | Triangle de Pascal                          | 060   | compléter la ligne suivante d'une ligne donnée (n ⩽ 10) ; relation de Pascal sur deux coefficients donnés ; repérer le nombre faux d'une ligne (choix)                                                                                               | 1–2  |
| B3  | Coefficients binomiaux au triangle (n ⩽ 10) | 061   | triangle donné jusqu'à n : lire un coefficient ; construire jusqu'à n = 6 puis lire ; valeurs (n ; 0), (n ; 1), (n ; n) et symétrie, n ⩽ 10                                                                                                          | 1–2  |
| B4  | Diagramme en bâtons de B(n ; p)             | 067   | ` ```loi ` en bâtons : valeur la plus probable ; comparer deux bâtons ; quel diagramme pour p = 0,2 / 0,5 / 0,8 (choix) ; Python : ligne de la hauteur                                                                                               | 2    |
| B5  | Simulation et loi binomiale                 | 090   | ` ```simulation ` de N échantillons de taille n (graine fixe) à côté de la loi : ce que compte la simulation, quel tableau est la loi, la fréquence observée de k est proche de quelle probabilité (choix) ; Python : compter les 1 d'un échantillon | 2    |
| B6  | Représenter l'espérance quand n ou p varie  | 069   | placer les points (n ; np) pour n = 1 à 5, p fixé, puis (p ; np), n fixé (`placer:`) ; ils sont alignés sur une droite passant par l'origine, de coefficient p (ou n) (choix) ; tableur : formule de la colonne E                                    | 2    |
| B7  | Espérance : le lien avec np                 | 091   | loi de B(3 ou 4 ; p) donnée : calculer Σ k·P(X = k) (case) et comparer à np ; ` ```simulation ` en mode `moyenne` : vers quelle valeur va la moyenne (case) ; Python : la boucle `E = E + k*P[k]`                                                    | 2    |

Plages : coefficients n ⩽ 10 ; diagrammes et simulations n de 5 à 20 (l'élève ne calcule rien, le bloc le fait) ;
p à un chiffre après la virgule ; calcul exact de Σ k·P(X = k) seulement pour n ⩽ 4 et p ∈ {0,5 ; 0,2 ; 0,1}.

**Questions à David** :

- **Q36 — 057 (« Loi binomiale B(n ; p) »)** : le point est un simple titre du BO. Je fais un modèle de définition
  (B1 : ce que compte X, ses valeurs, traduire « au moins un » en {X ⩾ 1}), sans refaire 062 (reconnaître) ni 089
  (paramètres) ? Reco : **oui**.
- **Q37 — 060 et 061** : les modèles de Tle spé (ef3c495c, 4dcbae71, 970dab52) vont jusqu'à n = 40. J'écris deux
  modèles neufs limités à n ⩽ 10 (B2, B3), sans toucher aux originaux, comme pour les autres jumeaux ? Reco : **oui**.
- **Q38 — Simulation (B5, B7)** : le bloc tire au hasard, mais avec une graine fixe le tirage est toujours le même.
  Je ne pose que des questions dont la réponse ne dépend pas du tirage (par exemple : « la moyenne semble se
  rapprocher de quelle valeur ? » → np), ou je fixe les effectifs observés à la main dans le modèle (tableau en dur) ?
  Reco : **le bloc avec graine fixe, et des questions qui ne dépendent pas du tirage**.
- **Q39 — Python / tableur** : une variation Python ou tableur dans B4, B5, B6, B7 (le BO le demande pour ces
  points) ? Reco : **oui** (B4, B5, B7 en Python ; B6 en tableur).
- **Q40 — Découpage** : un seul lot de 7 modèles, une page à cocher ? Reco : **oui**.
- **Question d'accès** (migration de tags, après écriture) : personne ne voit les brouillons ; une fois publiés, ils
  apparaissent au catalogue et au cahier de texte de Tle techno seulement. Personne ne perd rien.

**Décisions (David, 2026-11-19, « je suis tes recos »)** : **Q36** B1 modèle de définition (ni 062 ni 089) ; **Q37**
B2, B3 neufs, n ⩽ 10, originaux intacts ; **Q38** ` ```simulation ` à graine fixe, questions indépendantes du
tirage ; **Q39** Python dans B4, B5, B7, tableur dans B6 ; **Q40** un seul lot de 7 ; question d'accès : personne
pour les brouillons, Tle techno à la publication.

## 55. Lot 8 : écriture (2026-11-19)

`docs/wip/questions/lot-ttechno-8.py` → `scripts/questions/ttechno-8-loi-binomiale/` (7 fichiers, 88 specs),
`grades ['T_TECHNO']`, brouillons. Worktree `ubumaths-wt-questions-ttechno`, branche `feat/questions-ttechno-lot8`.

- B1 (057) : pièces défectueuses, X ~ B(n ; p) : valeurs 0 à n (choix), « au moins une » → {X ⩾ 1}, « toutes en bon
  état » → {X = 0}, plus grande valeur et nombre de valeurs (n, n + 1). B2 (060) : ligne n (5 à 9) donnée, trois
  coefficients de la ligne n + 1 ; relation de Pascal sur deux coefficients donnés ; la relation (choix). B3 (061) :
  triangle donné jusqu'à n = 8, lire C(n ; k) ; C(9 ou 10 ; 2 à 4) en construisant le triangle ; symétrie, C(n ; 0),
  C(n ; 1) pour n ⩽ 10. B4 (067) : ` ```barres ` de B(10 ; p) en % (sans tableau) : valeur la plus probable ;
  p = 0,2 / 0,5 / 0,8 d'après la forme ; Python `C[k] * p**k * (1-p)**(10-k)`. B5 (090) : ` ```simulation ` de N
  échantillons (graine 1 à 30) : la loi du nombre de 1, fréquences → probabilités quand N grandit, `random() < p`.
  B6 (069) : placer (n ; np) pour n = 10 à 50, p ∈ {0,1 ; … ; 0,4} ; droite par l'origine de coefficient p
  (choix) ; n fixé : coefficient n, espérance pour p donné ; tableur `=A2*\$D\$1`. B7 (091) : ` ```loi `
  B(3 ou 4 ; 0,1 / 0,2 / 0,5), `arrondi: 4` (probabilités exactes) : Σ k·P(X = k) et np ; ` ```simulation ` en
  mode `moyenne` (n ⩽ 25) : la moyenne se rapproche de n × p ; Python `s + k*L[k]`.
- Simulation `create-questions` verte contre la prod (aucun homonyme) ; `question:specs` 7 / 7 importables ;
  `sonde-courbes` 0 problème ; sonde jetable des ` ```barres ` / ` ```loi ` / ` ```simulation ` (300 tirages) :
  633 blocs, 0 problème ; 611 formules distinctes : accolades et `validateLatex` 0 problème.
- Vu en route : `p^floor(11*p)` refusé par eval (« Expected exponent ») → variable `m` ; une simulation de B(n ; p)
  est bornée à n ⩽ 29 (B7 : n = 30 retiré) ; ` ```barres ` refuse un effectif décimal → probabilités en %.
- Base locale : 7 brouillons ; aperçu admin (Chrome, `127.0.0.1:5182`) : B4 bâtons et corrigé, B5 tableau
  effectif / fréquence / probabilité, B6 5 points placés jugés justes, B7 courbe des moyennes et droite de
  l'espérance, Python.
- **#2882 mergée (2026-11-19)**, CI verte. Worktree retiré.

## 56. Lot 8 : prod, rangement et tags (2026-11-19)

David a lancé `create-questions --publier` : 7 brouillons (9fa1b0e9 B1, 98ce1795 B2, 04e65a91 B3, bacd052e B4,
ae383e7c B5, 82a0e909 B6, 8ad50484 B7), vérifiés par MCP (`draft`, `{T_TECHNO}`, sans nœud ni tag). Ids non écrits
dans le dépôt principal : reportés à la main dans `scripts/questions/ttechno-8-loi-binomiale/`, d'après les titres.

- Migration `20261119144747_questions_ttechno_lot8_rangement_tags` (gabarit lot 7 ; 057, 067, 090 sur la notion
  « Probabilités > Loi binomiale », 060 sur « Dénombrement > Combinaisons > triangle de Pascal », 061 sur
  « … > coefficients binomiaux », 069 et 091 sur « Probabilités > Loi binomiale > espérance et variance »).
- Test `tests/integration/questions-ttechno-lot8-rangement-tags.test.ts` : 9 verts ; corps retiré → 5 rouges ;
  fichier restauré d'une copie, identique. `types:cliquet` tenu.
- `security-auditor` : aucun finding (diff avec le lot 7 = en-tête, ids, codes, chemins, table temporaire, compte ; 057,
  067, 090 résolus au niveau notion par le premier `update`, déjà dans le gabarit ; prod relue en lecture : 7 brouillons
  sans nœud ni tag, points sur les nœuds attendus, chemins sans doublon).
- CI de #2886 : garde « doc à jour » rouge (ligne `Doc-inchangée:` attendue dans un commit, pas dans la PR) → commit du journal avec la ligne.
- **#2886 mergée (2026-11-19)**, CI verte, `check:migrations --pr 2886` vert. `migration list --linked` : seule
  `20261119144747` en attente ; `db push` refusé (« inserted before ») → `--include-all --dry-run` (elle seule), puis
  `--include-all`, depuis le dépôt principal (4 conditions). Prod vérifiée (MCP) : les 7 sur leur nœud, un tag chacun,
  `draft`, `updated_at` inchangés. Worktree retiré.

## 57. Lot 8 : page à cocher (2026-11-19)

- `deploy:prod` de #2839 (L7, L8) : fait (commit présent sur `production`).
- Page à cocher : https://claude.ai/artifact/Bj4AcBkkpiPnZ9Z25tmtfv (7 fiches, 23 exemples ; nœuds et points lus en
  base ; `verdicts` vide). Une alerte attendue (B7) : bloc ` ```loi ` et scène « moyenne-selon-n » de la
  ` ```simulation ` non dessinés par la page, à jouer dans l'aperçu. Rendu à 390 px non vérifié.

## 58. Lot 8 : publication et bilan (2026-11-19)

- Page à cocher relue : 7 verdicts sur 7 « ok », sans commentaire.
- `publier-lot.ts --dir scripts/questions/ttechno-8-loi-binomiale` : simulation verte, puis `--publier` par David
  (le premier essai n'avait rien écrit, relancé avec `!`). Relu en base (MCP) : 7/7 `published`, `{T_TECHNO}`
  (9fa1b0e9, 98ce1795, 04e65a91, bacd052e, ae383e7c, 82a0e909, 8ad50484).
- **Bilan MCP** (points TTECHNO non archivés sans modèle publié tagué) : 21 sur 92, dont les 17 STD2A hors
  périmètre. Restent 4 points STMG : 017, 019 (rien à écrire, Q17) ; **043, 084** = L7 `52b884ee` et L8
  `10bd7075` du lot 5b, en brouillon en attendant le `deploy:prod` de #2839, fait depuis.
- L7, L8 : simulation `publier-lot.ts --dir scripts/questions/ttechno-5b-log-resolutions` verte (2 brouillons ; L9
  déjà publiée, laissée telle quelle). `--publier` : David.
- David a lancé `--publier` : relu en base (MCP), L7 `52b884ee` et L8 `10bd7075` `published`, `{T_TECHNO}` (L9
  `becf24bc` inchangée). **Les 75 points STMG sont couverts** (017, 019 de fait, Q17) ; seuls les 17 STD2A restent
  sans modèle, hors périmètre.

## 59. Clôture (2026-11-19)

- Versement dans `ttechno.md` (« Couverture en modèles de questions ») ; journal archivé ; renvois des
  `lot-ttechno-*.py` et de `outils-manquants.md` mis à jour.
