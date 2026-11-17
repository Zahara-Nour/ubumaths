# Chantier questions-ttechno — couvrir la Terminale technologique (STMG)

Démarche : [couvrir-un-niveau.md](../pratiques/couvrir-un-niveau.md) · bornes :
[ttechno.md](../systeme/programmes/bornes/lycee/ttechno.md) (BO n° 14 du 2026-04-02).

## Reprendre ici

_Mis à jour le 2026-11-17, lot 2b écrit (§ 17), #2784 ouverte._

- **État** : lots 0, 1 et 2a en prod et publiés. Lot 2b (P1–P3, Python) écrit, PR des fichiers #2784 ouverte (CI à suivre).
- **Prochaine action** : CI verte → merge ; David lance `create-questions --publier` sur
  `scripts/questions/ttechno-2b-python` ; puis migration nœud + tag (030, 075, 076), page à cocher, publication.
- **`questions-1gen`** : lot 3 (aˣ) **publié** ; E1–E4 à lire contre nos bornes puis taguer (§ 15). Par défaut, un
  seul lot de tags avec T1 → 035 et T2 → 038 du lot 4 (pas encore écrit, ids promis par `questions-1gen`).
- **En attente de David** : tags E1–E4 maintenant (PR à part) ou avec le lot 4 (défaut) ?
- **Pièges en cours** : un point TTECHNO par modèle (trigger) ; `grades` en `array_append` seulement ;
  `publier-lot.ts`, `garde-niveaux-tags.ts`, `create-questions --publier` visent la prod : David les lance (`!`).
- **Worktree / branche** : `../ubumaths-wt-questions-ttechno-lot2b` · `feat/questions-ttechno-lot2b`.

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
