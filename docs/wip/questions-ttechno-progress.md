# Chantier questions-ttechno — couvrir la Terminale technologique (STMG)

Démarche : [couvrir-un-niveau.md](../pratiques/couvrir-un-niveau.md) · bornes :
[ttechno.md](../systeme/programmes/bornes/lycee/ttechno.md) (BO n° 14 du 2026-04-02).

## Reprendre ici

_Mis à jour le 2026-11-17, à l'ouverture (relevé fait, aucune PR)._

- **État** : relevé et classement faits (§ 1 à 4) ; rien d'écrit en base ni en fichiers de modèles.
- **Prochaine action** : réponses de David aux questions du § 5, puis phase 0 du lot 1.
- **En attente de David** : Q1 à Q6 (§ 5).
- **Pièges en cours** : aucun modèle « jumeau » n'est encore vérifié variation par variation contre les
  bornes de Tle techno (pas de e, pas de ln, pas de factorielle, pas de variance) ; le tag ne se pose
  qu'après cette vérification.
- **Worktree / branche** : aucun (journal sur `main`).

## 1. Périmètre

- STMG = niveau **`T_TECHNO`** : programme **commun** à toute la voie technologique (BO 2026), 92 points.
- Les 17 points « Activités géométriques (série STD2A) » sont **hors STMG** : TTECHNO-001 à 014, 070, 071,
  072 (coniques, perspective centrale). → **75 points** pour la STMG (sous réserve de Q1).

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
