# Chantier « questions-1techno » — couvrir la 1re STMG en modèles de questions

> Démarche : [couvrir-un-niveau.md](../pratiques/couvrir-un-niveau.md) (skill `couvrir-niveau`).
> Bornes : `docs/systeme/programmes/bornes/lycee/1techno.md` (décisions l1t-1 à l1t-8). En base, la
> 1re STMG n'a pas de niveau propre : c'est le programme commun de 1re technologique, niveau `1_TECHNO`
> (points `1TECHNO-*`). Pour la STMG, tout ce programme **sauf** la rubrique « Activités géométriques
> (série STD2A) » (26 points).

## Reprendre ici

_Mis à jour le 2026-11-17, relevé et classement (§ 1 à 4)._

- **État** : relevé fait ; existant vérifié contre les bornes ; 82 points sans modèle classés. Aucun fichier,
  aucune migration.
- **Prochaine action** : réponses de David aux questions du § 6, puis phase 0 du premier lot (§ 5).
- **En attente de David** : Q1 à Q8 (§ 6).
- **Pièges en cours** : deux nœuds s'appellent « définition » (arithmétique, géométrique) → les résoudre par
  leur chemin dans les migrations ; les modèles réutilisés sont partagés avec la 1re spé (toute correction de
  contenu les change aussi).
- **Worktree / branche** : aucun (relevé en lecture seule).

## 1. Relevé (prod, 2026-11-17)

- **143 points** `1_TECHNO` : 26 STD2A (hors STMG), **117 pour la STMG**. **35** ont au moins un modèle
  (tous dans le périmètre STMG), **82** aucun.
- **64 modèles** portent `1_TECHNO` ou un tag 1TECHNO ; tous rangés sur un nœud. 3 brouillons (0495289a,
  c90fa022, d2067413), le reste publié. Presque tous sont des modèles de 1re spé / 1re générale tagués
  d'un point jumeau (ADR 0020, un tag par programme).
- 7 modèles ont `1_TECHNO` dans `grades` sans aucun tag 1TECHNO : 5397c20f (1SPE-432), f5585668 (2-314),
  0f673c27 (2-328), 7f82d15a (2-349), 95ee57c8 (2-448), 9852d62c (5-113), 1c86d122 (5-135).

Points couverts (modèles) : 002, 033 (3), 035 (3), 037 (5), 042 (1 brouillon), 043, 045 (1 brouillon),
048, 050, 052 (2), 057, 063 (2), 065 (2), 070, 075 (2), 077, 078, 079 (3), 080 (2), 086, 088, 091, 092 (2),
095, 099 (2), 118 (4 dont 1 brouillon), 119 (2), 133, 134, 135, 137, 138 (2), 139, 140, 141.

## 2. L'existant contre les bornes (2026-11-17, lecture seule)

Toutes les variations des 64 modèles lues en base ; recherche des notions exclues (Δ, discriminant, ln,
exp, trigo, √, variance, σ, forme canonique, Σ) dans tout le contenu ; `question:specs` sur 18e26873.

### 2.1 Hors bornes ou à voir

| Modèle               | Point | Écart                                                                                                                                                                                          |
| -------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1acb6d47**         | 057   | v1 : corrigé « α = −b/2a » (borne : aucune formule −b/2a) ; v3 : énoncé en forme canonique `a(x+b)²+c` (hors des 3 formes du 061). v2, v4, v5 OK. **Seul modèle du 057.**                      |
| **97b3a376**         | 137   | v3 et v4, tirage `t = 4` (≈ 2 sur 7) : `P(lo ⩽ X ⩽ hi)`, hors point (décision l1t-6). **Seul modèle du 137.**                                                                                  |
| 1239554b, 79d69593   | 118   | v1 : `u(n+1) = b·u(n) + c`, `b` et `u0` signés, seule garde `b ≠ 1 ou c ≠ 0` → `c = 0` tire une suite géométrique de raison ou de premier terme négatif (borne : termes strictement positifs). |
| 83b1f614             | 133   | v3 : `f′(x) = 6x² − 6(p+q)x + 6pq` ; racines entières (évidentes, l1t-2) mais le corrigé factorise d'emblée sans chercher la racine évidente.                                                  |
| c90fa022 (brouillon) | 042   | v3 attend « ni arithmétique, ni géométrique » ; la borne ne parle que de deux modèles (linéaire, exponentiel).                                                                                 |

### 2.2 OK

Suites 337d31c3, 7247dbb0, 1315d326, a8b51d16, c23840b6, 0af4bf32, 373fc5b4, 65e96f31, 5cb7f6ce, 1bbfa5f2,
bf3e3211, ecba8a9e, 7703e625, 31a77ba9, 0495289a, f36ce3ff, 8d4e5302, a430a698, d2067413 ; seuil 0b686e01,
19961e67 (u0 > 0, q > 0) ; second degré 18e26873, 1b1a6d7b, 2dd2b712, a0089728 ; dérivation 46913a48,
cda8e0d2, 1666b8e9, ed8444bb, f52395d1, 05387201, d58208eb, edb094bd, 17f64f63, 782bf7f8 ; graphiques et
droites 33dffa7a, dc5d7cb6, 7d6cf480, e5205176 ; statistiques 1c65d58e, a573d517 ; probabilités 36010981,
ebe7e788, 6dd2f133, 5ba712bc (partition en deux), d5780995, d683e906, 6fbc355c, eafd17a1, a3f92832, 0718f490.
Les 7 modèles sans tag 1TECHNO restent dans les bornes.

Ces modèles de 1re spé écrivent uₙ, jamais u(n) (borne : « u(n) précède uₙ », pas une exclusion) → Q6.

## 3. Modèles existants posables sur un point sans modèle

Candidats lus (variations et corrigé) contre les bornes ; posabilité vérifiée en base (point sur le nœud du
modèle ou sur sa notion) : **54 couples sur 54**. `7f82d15a` → 076 n'est pas posable (autre nœud).

| Point | Modèle(s)          | Point | Modèle(s)             |
| ----- | ------------------ | ----- | --------------------- |
| 001   | 536c01bb           | 066   | afe51ac4              |
| 106   | fb3b536c           | 127   | 95ee57c8              |
| 004   | 3cacefc5 (2de)     | 060   | 8a384698, 9f072622    |
| 005   | 2ffa6d80 (2de)     | 068   | 3020b065              |
| 006   | da04078f (2de)     | 128   | 3020b065              |
| 008   | 344a2248           | 071   | 05387201, f52395d1    |
| 108   | 63849c41           | 072   | a181f10b, a16a9bba    |
| 009   | 5d17692b           | 073   | a181f10b              |
| 010   | de42b303           | 129   | a16a9bba              |
| 011   | 051ff81f           | 074   | 1666b8e9              |
| 032   | 45da9678           | 130   | 1666b8e9              |
| 034   | a430a698, 4f8f420a | 131   | 1666b8e9, cda8e0d2    |
| 039   | 5cb7f6ce           | 076   | 17f64f63              |
| 041   | 8d4e5302           | 132   | 83b1f614 (voir § 2.1) |
| 117   | 4f8f420a           | 083   | 49fac266 (T comp.)    |
| 142   | aeb1389d, f3100c29 | 084   | 1c65d58e              |
| 046   | d2943133           | 089   | 21f42c7f              |
| 120   | e4eaaf16 (Python)  | 090   | 5ba712bc              |
| 053   | 6ad254b4 (3e)      | 093   | d8c9cb60, f2ed0ea0    |
| 055   | 286a68a8, de73e71d | 094   | 42bb2d66              |
| 058   | 18e26873           | 096   | 6fbc355c              |
| 126   | afe51ac4           | 098   | 9c04693a, 3bd19f82    |
|       |                    | 102   | 7953dcfc (2de)        |

Et 5397c20f (grade `1_TECHNO`, tagué 1SPE-432 seul) → **139**, jumeau de 1SPE-432.

## 4. Points sans modèle, classés (82, hors STD2A)

**T = tag d'un modèle existant (§ 3) : 45** · **A : 17** · **B : 18** · **C : 0** · **D : 2**.

- **A** (texte, formule) : suites géométriques à termes positifs 036, 038, 040, 047, 049 (tous les
  modèles de 1re spé tirent u0 ou q signés : 5042401b n'irait que pour ses v0 et v2) ; second degré sans
  formule 123 (axe par f(x) = c ou milieu des racines), 124 (sommet), 061 (parabole des 3 formes), 062,
  064 (factoriser connaissant une racine ; 604f83b7 v1 passe par le discriminant) ; probabilités 097,
  100 (77498f1b a des leurres 𝒢(p), ℬ(100 ; p) hors 1re techno), 136 (1043c29e parle de variance), 087
  (Mayer) ; notions 054 (notations), 056 (monotonie et signe du taux), 069 (tangente, position limite).
- **B** (outil existant) : ` ```python ` 003, 007, 107, 051, 122, 067, 103, 105 ; ` ```python ` +
  ` ```histogramme ` 101 ; ` ```courbe ` + `placer:` 044, 121, 085 ; ` ```courbe ` lecture 059 ;
  ` ```nuage ` 082 ; ` ```histogramme ` / ` ```nuage ` 104 ; ` ```variation ` à compléter 125, 081 ;
  ` ```tableau-croise ` à trous d'après des données brutes 013.
- **C** : aucun (les gestes existent : `variation` à compléter, `courbe placer:`, `tableau-croise` à trous).
- **D** : 012 (traiter un fichier de données réelles), 143 (modéliser par une fonction) : points-compétences.

Couverts de fait par un savoir-faire voisin (le tag est quand même proposé au § 3) : 058 par 065, 066 = 126,
032 par 043 / 118, 039 par 048, 071 par 079, 090 par 092, 093 par 135, 096 par 099, 084 par 086.

## 5. Lots proposés (ordre)

1. **Lot 0 « corrections »** : § 2.1 (selon Q3, Q4).
2. **Lots T1 à T3 « tags »** (migrations seules, page à cocher des modèles d'abord) : T1 logique, algorithmique,
   suites (18 points) ; T2 fonctions, dérivation (18 points, plus 5397c20f sur 139) ; T3 statistiques, probabilités
   (9 points).
3. **Lot 1 « suites géométriques à termes positifs »** (036, 038, 040, 047, 049) — A.
4. **Lot 2 « second degré sans formule »** (123, 124, 061, 062, 064 ; 125, 081 en ` ```variation `) — A + B,
   plus les remplaçants de 1acb6d47 (057) si Q3 = jumeaux.
5. **Lot 3 « algorithmique »** (003, 007, 107, 051, 122, 067, 103, 105, 101) — B ` ```python `.
6. **Lot 4 « graphiques »** (044, 121, 085, 082, 059, 104) — B.
7. **Lot 5 « probabilités et notions »** (097, 100, 136, 087, 054, 056, 069, 013) — A / B, plus le
   remplaçant de 97b3a376 (137) si Q3 = jumeaux.

## 6. Questions à David

- **Q1 — Périmètre** : la STMG = programme 1TECHNO **sans** les 26 points STD2A. Les laisser hors de ce
  chantier ? (reco : oui ; ils sont déjà notés dans `outils-manquants.md` § 2.)
- **Q2 — Nom** : chantier `questions-1techno` (le niveau en base est commun à toutes les séries techno) ou
  `questions-1stmg` ? (reco : `1techno`.)
- **Q3 — Modèles partagés qui débordent** (1acb6d47, 97b3a376, 1239554b, 79d69593) : (a) retirer leur tag 1TECHNO
  et `1_TECHNO` de `grades`, et écrire des jumeaux techno dans les lots ; (b) resserrer le modèle, ce qui
  change aussi la 1re spé. (reco : a ; sinon 057 et 137 perdent leur seul modèle → jumeaux dans les lots 2 et 5.)
- **Q4 — 83b1f614 v3** (factorisation d'emblée) et **c90fa022 v3** (« ni l'un ni l'autre ») : garder tels
  quels ? (reco : garder c90fa022 v3, distracteur utile ; 83b1f614 : ajouter au corrigé « x = p est racine
  évidente de f′ » — mais il est publié et partagé avec la 1re spé.)
- **Q5 — Tags en masse** (§ 3, 54 couples + 5397c20f) : d'accord pour poser ces tags (et `1_TECHNO` dans
  `grades`), y compris sur des modèles de 2de (3cacefc5, 2ffa6d80, da04078f, 7953dcfc) et de 3e (6ad254b4) ?
  Relecture sur une page à cocher **avant** la migration ?
- **Q6 — Notation** : les modèles de 1re spé réutilisés écrivent uₙ ; accepté pour la 1re techno ? (reco :
  oui, la borne dit « u(n) d'abord », pas « jamais uₙ » ; les modèles neufs écriront u(n).)
- **Q7 — Ordre des lots** du § 5 ? (reco : tel quel, les tags d'abord : 45 points pour trois migrations.)
- **Q8 — D** : 012 et 143 hors appli, sans modèle propre ? (reco : oui.)
