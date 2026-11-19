# Chantier « questions-1techno » — couvrir la 1re STMG en modèles de questions

> Démarche : [couvrir-un-niveau.md](../../pratiques/couvrir-un-niveau.md) (skill `couvrir-niveau`).
> Bornes : `docs/systeme/programmes/bornes/lycee/1techno.md` (décisions l1t-1 à l1t-8). En base, la
> 1re STMG n'a pas de niveau propre : c'est le programme commun de 1re technologique, niveau `1_TECHNO`
> (points `1TECHNO-*`). Pour la STMG, tout ce programme **sauf** la rubrique « Activités géométriques
> (série STD2A) » (26 points).

## Reprendre ici

_Mis à jour le 2026-11-19 : **chantier clos**._

- **État** : lots T1, T2, 0, G, R, 1 à 6 mergés et publiés ; relevé MCP de clôture : 151 modèles publiés contenant
  `1_TECHNO`, **115 points STMG sur 117** avec au moins un modèle publié (012 et 143 sans modèle, Q8) (§ 32).
- **Durable versé** dans `docs/systeme/programmes/bornes/lycee/1techno.md`, « Couverture en modèles de questions ».
- Fichiers des lots laissés dans `scripts/questions/1techno-*` (ids des modèles, corrections futures).

## 1. Relevé (prod, 2026-11-17)

- **143 points** `1_TECHNO` : 26 STD2A (hors STMG), **117 pour la STMG**. **35** ont au moins un modèle
  (tous dans le périmètre STMG), **82** aucun.
- **64 modèles** portent `1_TECHNO` ou un tag 1TECHNO ; tous rangés sur un nœud. 3 brouillons (0495289a,
  c90fa022, d2067413 — ce dernier publié le 2026-11-18 par questions-1gen, Q24), le reste publié. Presque tous sont des modèles de 1re spé / 1re générale tagués
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

## 7. Décisions (David, 2026-11-17)

« Je suis tes recos ; le nom est questions-1techno. »

- **Q1** : STD2A (26 points) hors du chantier.
- **Q2** : chantier `questions-1techno`.
- **Q3** : (a) retirer tag 1TECHNO et `1_TECHNO` des 4 modèles partagés qui débordent ; jumeaux techno écrits
  dans les lots.
- **Q4** : c90fa022 v3 gardée telle quelle. **83b1f614 : non tranché** (la reco hésitait : corriger un modèle
  publié et partagé avec la 1re spé) → Q4 bis.
- **Q5** : tags posés, modèles de 2de et de 3e compris. **Page à cocher avant ou après la migration : non
  tranché** (pas de reco) → Q5 bis.
- **Q6** : uₙ accepté dans les modèles réutilisés ; les modèles neufs écrivent u(n).
- **Q7** : ordre du § 5.
- **Q8** : 012 et 143 hors appli, sans modèle propre.

**Complété le 2026-11-17 (David, « je te suis »)** : **Q4 bis** = (a), ajouter au corrigé de 83b1f614 v3 la
racine évidente de f′ (modèle publié et partagé : correction par migration de contenu, § 7 de la doc) ;
**Q5 bis** = page à cocher **avant** la migration de tags, tag posé sur les seuls « OK ».

## 8. Lot T1 : page à cocher (2026-11-17)

19 modèles exportés de la prod (`export-question-templates.ts`) dans `scripts/questions/1techno-t1/` ; page
publiée avec la capacité `db`, collection `verdicts` vide au départ. Point visé par modèle : intro de la page
(= § 3).

Proposition (non validée) pour le lot 0 : retirer maintenant 1TECHNO-118 de 1239554b et 79d69593 (118 garde
f36ce3ff) ; retirer 057 de 1acb6d47 et 137 de 97b3a376 dans la PR qui publie leurs jumeaux (lots 2 et 5).

## 9. Règle « un point par programme » et passe anti-doublons (2026-11-17)

**Erreur du § 3** : le trigger `question_template_points_check_rules` refuse un 2e point du même programme
sur un modèle (ADR 0020). Refusés : 5cb7f6ce → 039, 8d4e5302 → 041, a430a698 → 034 (déjà un point
1TECHNO) ; T2 / T3 : 05387201, f52395d1 (071), 1666b8e9 (074, 130, 131), cda8e0d2 (131), 17f64f63 (076),
18e26873 (058), 1c65d58e (084), 5ba712bc (090), 6fbc355c (096), 83b1f614 (132) ; un seul point pour
4f8f420a (034 / 117), 3020b065 (068 / 128), afe51ac4 (066 / 126), a181f10b et a16a9bba (072 / 073 / 129).
Et le trigger est plus étroit qu'écrit au § 3 : point sur une **sous-notion** → seuls les modèles rangés
sur cette sous-notion ; point sur une **notion** → la notion et ses sous-notions.

**Passe anti-doublons** (David : « as-tu regardé les modèles de 1re spé et 1_GEN ? ») : 333 couples
(point, modèle publié sans point 1TECHNO) posables, lus.

- **Conviennent tels quels (9 points)** : 034 4f8f420a ; 047 d1010214 ; 054 42c19a19, ddc60d24 ; 058
  aab8e41c ; 076 03b3d9b3 ; 096 8354a0e7, ad555cb1, bc59d5ce ; 100 77498f1b (⚠ la 1re passe l'avait
  écarté pour ses leurres 𝒢(p), ℬ(100 ; p) : à trancher sur la page à cocher) ; 132 b7b0c27b ; 007
  8d46dd50, 4ce02817, e4784c78.
- **En partie (16 points)** : une ou plusieurs variations hors bornes (surtout u0 / q signés en
  géométrique, discriminant, forme canonique, 1/x) : 036 (cea65372, ab4d55f7, 279cf28f, 349e1be5,
  85afd455), 047 (84114cb2, fcf1057e), 038 (e67b1cbd, 727fb88a, cf51cb93, eca755e6, fc921674, 95c38330,
  acaeb02a), 040 / 049 (5042401b), 056 (7f82d15a, 93bc8b5e), 058 (eae2ff6a), 059 (406fd9a8), 061
  (8a7e39b7), 064 (604f83b7), 124 (56b1803f), 126 (568c7bee, b48d72dd), 071 (9e377c97), 072 (a86442c1,
  b05ec37a), 130 (74d77343), 076 (3fa3af6c), 081 (2b382069), 132 (47843e39), 090 (2c116f4d, a9c71276,
  69a05f98), 103 (5192e88a), 013 (82101744, 89e928a4).
- **Sans modèle (27 points)**, avec le « presque » d'où partir : 039 (55bb8507), 040 (5042401b), 041 /
  044 / 051 / 121 (4f8f420a v0, 55bb8507), 117 (4f8f420a v1-v2, d1010214 v2-v3), 123 et 062 (9f00da01),
  125 (0113c53d, 8a7e39b7 v1), 069 (9e377c97 v0), 074 / 131 (74d77343, a86442c1), 128 (b05ec37a), 067
  (66cd841d), 097 (77498f1b), 136 (1043c29e), 101 / 104 (5192e88a), 107 (bcc687bb), 122 (eb9517ed) ;
  sans rien : 003, 105, 082, 084, 085, 087.
- Écartés : baefb288 (escalier u(n+1) = f(u(n)), hors STMG), 9f00da01, db7bb314, f8ccc8b6, 0113c53d (rangé
  ailleurs), 4ff9d049 (binomiale n ≥ 5), 1043c29e, e0520082 et ecf4d46b (partition en trois), 006fce09,
  eb9517ed, bcc687bb, 7652fee6, e05ecec7.

Coordination : chantier `questions-1gen` (session voisine) — chacun ne touche que son niveau dans
`grades` ; un modèle neuf commun 1GEN-022 + 1TECHNO-057 (sommet sans formule), écrit par le premier qui
arrive au second degré ; je préviens avant de corriger 83b1f614 ou de retirer des tags.

**Questions à David (posées le 2026-11-17)** :

- **Q9 — 4f8f420a** : 034 (toutes ses variations conviennent) ou 117 (seules v1, v2) ? Reco révisée : **034**.
- **Q10 — Les 9 « conviennent »** : page à cocher T2 / T3 (avec les candidats du § 3 encore posables) avant
  la migration, comme T1 ?
- **Q11 — Les « en partie »** : jumeau techno copié du modèle de 1re spé en ne gardant que les variations
  dans les bornes (comme Q3), ou resserrer le modèle de 1re spé ? Reco : jumeau.
- **Q12 — Connaissances couvertes de fait** (question 2 du message précédent : un modèle court par point,
  ou rien) : toujours ouverte.

**Décisions (David, 2026-11-17, « je suis tes recos »)** : **Q9** 4f8f420a → 034 ; **Q10** page à cocher
avant la migration ; **Q11** jumeaux techno (le modèle de 1re spé n'est pas touché) ; **Q12** un modèle
court par connaissance (lot « connaissances »).

## 10. Lot T2 : page à cocher (2026-11-17)

T2 et T3 réunis en une page : 33 modèles, tous publiés, tous posables, aucun avec un point 1TECHNO
(vérifié en prod) — les candidats du § 3 encore libres, 4f8f420a → 034, et les 9 points « conviennent » du
§ 9. Page : https://claude.ai/artifact/Wnh4bDD9e4wjzC3GJuTMTZ ; instantanés hors dépôt (scratchpad) jusqu'à
la branche T2. 77498f1b (100) signalé dans l'intro (leurres 𝒢(p), ℬ(100 ; p)).

## 11. Lot T2 : données pour la migration (prod, 2026-11-17)

33 modèles, 24 points, tous publiés, aucun point 1TECHNO. `id | grades actuels | point | rangement`
(`sous` = modèle rangé sur une sous-notion fille du nœud du point, à reproduire dans le test) :

```
03b3d9b3-2d38-4062-a70b-c9b31839444b | 1_SPE | 1TECHNO-076 | noeud
21f42c7f-82bc-4204-b294-cb9658bcfd8e | 1_SPE | 1TECHNO-089 | noeud
286a68a8-49c1-4d7d-b845-452457e8dab8 | 1_SPE | 1TECHNO-055 | noeud
3020b065-2be5-4541-beda-1115718121c5 | 1_SPE | 1TECHNO-068 | noeud
3bd19f82-85f7-4828-8cac-2a2281642f86 | 1_SPE | 1TECHNO-098 | noeud
42bb2d66-4559-4a1b-8124-de6977fbb0b1 | 1_SPE | 1TECHNO-094 | noeud
42c19a19-4533-4dc5-81a3-2dba70b5cdb4 | 2 | 1TECHNO-054 | sous
49fac266-f622-4ef5-8a2b-5638ca5a4c99 | T_COMP | 1TECHNO-083 | noeud
4ce02817-c5b4-4500-9d0c-0bbf7be0a662 | 2 | 1TECHNO-007 | sous
4f8f420a-c93b-4d99-8fe2-acfac2d38cbe | 1_SPE | 1TECHNO-034 | noeud
5397c20f-7b3a-4d56-b441-644607e0138a | 1_SPE,1_GEN,1_TECHNO | 1TECHNO-139 | noeud
6ad254b4-69c3-49db-9541-fa921964cefc | 3 | 1TECHNO-053 | noeud
77498f1b-3625-4701-aa9c-f6132eb3b4ba | T_SPE,T_COMP | 1TECHNO-100 | noeud
7953dcfc-bedc-465e-9abe-b8db19647d7e | 2 | 1TECHNO-102 | noeud
8354a0e7-f707-48e0-ac3d-f43cc5b2e2fa | 1_SPE | 1TECHNO-096 | noeud
8a384698-1367-4a12-a995-b6cd4df9cfe1 | 1_SPE | 1TECHNO-060 | noeud
8d46dd50-34ea-4504-b92f-d269a84f0179 | 2 | 1TECHNO-007 | sous
95ee57c8-4e16-4554-add5-cb8f72ee6f28 | 1_SPE,1_GEN,1_TECHNO | 1TECHNO-127 | noeud
9c04693a-33f3-4c4c-bf1a-ff801b8b15c4 | 1_SPE | 1TECHNO-098 | noeud
9f072622-9ce5-4e76-b02e-a738bf6ea39a | 1_SPE | 1TECHNO-060 | noeud
a16a9bba-2cc5-48d8-b98b-eb4fee6ded3d | 1_SPE | 1TECHNO-129 | noeud
a181f10b-1b9c-436c-8f8c-51cce68352db | 1_SPE | 1TECHNO-073 | noeud
aab8e41c-4539-4c90-9c1d-6ee41dc7a1cb | 1_SPE | 1TECHNO-058 | sous
ad555cb1-c4a2-4390-ad14-6a626b39e0fb | 1_SPE | 1TECHNO-096 | noeud
afe51ac4-8552-454e-b45e-46f0edbd9416 | 1_SPE | 1TECHNO-066 | noeud
b7b0c27b-0c30-4297-b707-53f328d36f7a | 1_SPE | 1TECHNO-132 | noeud
bc59d5ce-a696-4460-91a3-ad8614de25a7 | 1_SPE | 1TECHNO-096 | noeud
d1010214-1537-4b3d-9b99-1b3718a5d981 | 1_SPE | 1TECHNO-047 | noeud
d8c9cb60-e9c5-4f38-a8d9-b5c2b83de908 | 1_SPE | 1TECHNO-093 | noeud
ddc60d24-ddce-473b-8e23-58af62ec8b78 | 2 | 1TECHNO-054 | sous
de73e71d-031b-4f9a-b3c9-a1cc6f970a0e | 1_SPE | 1TECHNO-055 | noeud
e4784c78-13d5-49ac-b50b-b07efca03d19 | 2 | 1TECHNO-007 | sous
f2ed0ea0-e285-49fc-93df-9e388cc36eb0 | 1_SPE | 1TECHNO-093 | noeud
```

Les grades sont à relever de nouveau juste avant d'écrire la migration (la session `questions-1gen` peut
avoir ajouté `1_GEN` entre-temps : sans effet sur `array_append`, mais la garde du rollback doit le tolérer,
comme en T1). Instantanés de la page : hors dépôt (scratchpad, perdus au redémarrage) ; à réexporter dans
`scripts/questions/1techno-t2/` sur la branche T2 (`export-question-templates.ts --ids …`).

Après T2 : lot 0 (retrait 1TECHNO-118 sur 1239554b et 79d69593, destructif, accord de David), correction
de 83b1f614 v3 (prévenir `questions-1gen` avant), puis les lots d'écriture (jumeaux, connaissances, § 5 et 9).

## 12. Lot T1 mergé et migré (2026-11-17)

PR #2743 : CI verte après une relance (« Client Tests browser, shard 1/2 », `wrapDynamicImport`, sans lien) ;
`check:migrations --pr 2743` vert ; merge ; `db:migrate` depuis le dépôt principal (4 conditions réunies).
Prod vérifiée (MCP) : 15 modèles, 15 tags 1TECHNO (001, 004, 005, 006, 008, 009, 010, 011, 032, 046, 106,
108, 120, 142), 15 avec `1_TECHNO`, 15 publiés. `garde-niveaux-tags` : aucun niveau manquant. Worktree et
branche retirés.

## 13. Lot T2 : branche (2026-11-17)

Relevé prod refait (MCP) : identique au § 11 (33 publiés, aucun point 1TECHNO, 6 sur sous-notion : 007, 054,
058). Instantanés : `scripts/questions/1techno-t2/` (33). Migration `20261117131417_questions_1techno_t2_tags`
sur le gabarit de T1, plus la colonne `deja` (5397c20f, 95ee57c8 ont déjà `1_TECHNO` : pas d'ajout, pas de
retrait au rollback) ; garde « niveau 1_TECHNO différent du relevé ». Test
`tests/integration/questions-1techno-t2-tags.test.ts` : 13 verts ; corps de la migration retiré → 8 rouges,
5 ignorés (rollback refusé : 2 sur 33 conformes). Cas ajouté : état d'après questions-1gen (95ee57c8 sans
`1_GEN`) → `['1_SPE', '1_TECHNO']`, 1_TECHNO conservé au rollback. NB : la base locale `db:seed-riche` porte
les modèles de prod ; le cas « base sans les modèles » y rejoue donc la vraie migration.

Revues (2026-11-17) : `code-reviewer` et `security-auditor` sans bloquant. Retenu : cas « base sans les
modèles » rendu probant (modèles retirés dans la transaction, 0 tag vérifié). À savoir pour le `db:migrate` :
un `db push` jouerait aussi `20261117124605_questions_1gen_tags` si elle n'est pas en prod → **attendre que
questions-1gen l'ait migrée** ; après un `db push` en échec, relire `tgenabled` de
`update_question_templates_updated_at` (attendu `O`) ; `set local lock_timeout` sans effet hors transaction
(risque d'attente seulement).

## 14. Lot T2 mergé et migré ; Q11 de questions-1gen (2026-11-17)

PR #2748 : relevé refait après le `db:migrate` de #2744 (6 modèles + `1_GEN`, 95ee57c8 − `1_GEN`) ; test à
12 cas. CI : cliquet coupé à 20 min (annulé, sans erreur), vert à la relance ; `check:migrations --pr 2748`
vert ; merge ; `db:migrate` depuis le dépôt principal (4 conditions). Prod vérifiée (MCP) : 33 publiés, 33 avec
`1_TECHNO` (aucun doublon), 33 tags sur 24 points, `updated_at` inchangé, trigger `O`. `garde-niveaux-tags` :
aucun niveau manquant. Worktree et branche retirés.

Q11 (journal questions-1gen § 9, commit 1029a04775, David « je te suis tes recos ») : G1 « raison » (1GEN-028
→ notre 036), G4 « terme général » (1GEN-029 → 038), G5 « sens de variation » (1GEN-030 → 040 ou 049, à
choisir) sont des modèles communs ; questions-1gen les écrit avec `grades` `1_GEN` ; nous posons `1_TECHNO`
et nos tags par notre propre migration, après création des brouillons. G2 (forme explicite, 039) et G3
(récurrence, 057) sont sur la notion « Suites géométriques ». Notre lot 1 n'écrit que 047.

## 15. Lot 0 : retrait de 1TECHNO-118 sur 1239554b et 79d69593 (2026-11-17)

Go de David (2026-11-17, « go » en réponse à la demande d'accord sur le lot 0). Relevé prod (MCP) : les deux
modèles « Calculer un terme » ont `{1_SPE,1_TECHNO}`, tags 1SPE-377 et 1TECHNO-118, rangés sur le nœud du point
(sous-notion) ; 0 tentative, 0 carte SRS, 0 entrée de journal, 0 question d'évaluation. f36ce3ff garde 118.

Migration `20261117140233_questions_1techno_lot0_retrait_118` (gabarit de T1, en miroir) : `delete` du tag 118 et
`array_remove` de `1_TECHNO` ; gardes tout ou rien (2 modèles, `1_TECHNO` et tag présents, 118 garde au moins un
modèle publié hors lot) ; rollback en commentaire (repose tag et niveau). Test
`tests/integration/questions-1techno-lot0-retrait-118.test.ts` : 15 verts ; corps retiré → 8 rouges, 6 ignorés.

Revues : `code-reviewer` et `security-auditor` sans bloquant. Retenus : f36ce3ff verrouillé (`for update`),
`archived_at is null` partout, trigger de date coupé avant toute écriture, insertion du rollback comptée, garde
« aucune tentative ni carte d'élève sur le lot », tests du trigger réactivé et des nouvelles branches. Laissé :
le brouillon 0495289a garde 118 (hors lot, mentionné en en-tête).

**Ce qui est perdu** (destructive) : ces deux modèles sortent du catalogue et du cahier de texte de 1re techno et
ne comptent plus pour 1TECHNO-118. Ils restent publiés en 1re spé, contenu inchangé. Aucune donnée d'élève.
**`db:migrate` jamais autonome** (condition 4 non réunie) : go explicite de David après le merge.

Message de questions-1gen (2026-11-17) : modèles communs en prod, **brouillons**, `grades = ['1_GEN']`, sans
nœud ni tag — G1 « raison » `0b5c3db6-cb37-40fc-8247-12e3ace03a46` (→ 036), G4 « terme général »
`c4887e49-2337-4ac7-a2c9-369434868b65` (→ 038), G5 « sens de variation » `569e0140-d5da-440f-a4c3-07bae4e6b30b`
(→ 040 ou 049). Non communs : G2 `f15045ec`, G3 `e0f3ac2f`. Ils posent nœud + tags 1GEN par leur migration
(branche `feat/questions-1gen-lot1-tags`), sans toucher `grades` ; à nous `array_append('1_TECHNO')` et nos tags,
après la leur (le trigger exige le nœud). Fichiers : `scripts/questions/1gen-1-suites-geometriques/`.

**Lot 0 migré (2026-11-17)** : `20261117140233` jouée en prod par le `pnpm db:migrate` de la session
tortue-variables (son `db push` a poussé toutes les migrations de `main` en attente), avant le go de David ;
David prévenu par cette session. Prod vérifiée (MCP) : 1239554b et 79d69593 → `{1_SPE}`, seul tag 1SPE-377,
publiés, `updated_at` inchangé ; f36ce3ff garde `{1_SPE,1_TECHNO}` et 118 ; brouillon 0495289a inchangé ;
trigger de date `O`. Leçon : une migration destructive mergée part au prochain `db push` de n'importe quelle
session ; la garder hors de `main` (PR non mergée) tant que le go n'est pas donné.

Message de questions-1gen (2026-11-17) : nœuds et tags 1GEN posés en prod (`20261117142038`, #2754) — G1
`0b5c3db6` sur la sous-notion « définition » (1GEN-028), G4 `c4887e49` sur « terme général » (1GEN-029), G5
`569e0140` sur la notion « Suites géométriques » (1GEN-030) ; G2, G3 sur la notion (039, 057). Brouillons,
`grades = ['1_GEN']`. À vérifier pour nos tags : le trigger exige que le point 1TECHNO soit sur le nœud du modèle
ou sur sa notion.

## 16. Lot G (modèles communs de questions-1gen) : décisions et page à cocher (2026-11-17)

Décisions (David, « je te suis ») :

- **G5 → 1TECHNO-049** (capacité « à l'aide de la raison », mot pour mot) ; 040 (connaissance) aura son modèle
  court dans le lot « connaissances » (Q12).
- **uₙ accepté** dans G1, G4, G5 (communs avec la 1re générale ; la borne dit « u(n) précède uₙ », pas une
  exclusion). Exception à Q6, limitée aux modèles communs.
- **Ordre** : page à cocher G1 (→ 036), G4 (→ 038), G5 (→ 049) puis migration `array_append('1_TECHNO')` + tags ;
  ensuite 83b1f614 v3. Les trois restent brouillons : leur publication revient à questions-1gen.

Page à cocher : https://claude.ai/artifact/4FS9xTHryEFuPPpbdASNCs (capacité `db`, collection `verdicts` vide au
départ). Instantanés prod (`export-question-templates.ts`) dans le scratchpad, à copier dans
`scripts/questions/1techno-g/` sur la branche de la migration. Relecture préalable : premier terme et raison
strictement positifs partout, ni somme ni limite. Points 036, 038, 049 sur le même nœud que le point 1GEN de
G1, G4, G5.

## 17. Lot G : migration (2026-11-17)

Verdicts de la page à cocher : 3 « ok » sur 3 (0b5c3db6, c4887e49, 569e0140), sans commentaire. Relevé prod
(MCP) : les trois sont désormais **publiés** par questions-1gen (`updated_at` 15:05), `grades = {1_GEN}`, chacun
sur le nœud de son point 1GEN, qui est aussi celui du point 1TECHNO visé (028/036, 029/038, 030/049). Même nature
que T1/T2 (modèles publiés) : la question d'accès du chantier s'applique.
Migration `20261117164821_questions_1techno_lot_g_tags` sur le gabarit de T2 (sans `deja` : aucun n'a
`1_TECHNO`) ; test `tests/integration/questions-1techno-lot-g-tags.test.ts` (décor avec le tag 1GEN posé,
12 tests verts ; migration vidée → 6 rouges et le bloc nominal ne démarre pas). Instantanés prod :
`scripts/questions/1techno-g/`.

PR #2758 : audit de sécurité sans finding bloquant ; CI verte ; `check:migrations --pr 2758` vert ; merge ;
`migration list --linked` : seule `20261117164821` en attente ; `db:migrate` depuis le dépôt principal (4 conditions
réunies). Prod vérifiée (MCP) : les 3 modèles `{1_GEN,1_TECHNO}`, publiés, tags 1GEN-028 + 1TECHNO-036, 1GEN-029 +
1TECHNO-038, 1GEN-030 + 1TECHNO-049 ; `updated_at` inchangé (15:05:51) ; trigger de date `O`.

## 18. Lot 2 de questions-1gen : modèles communs « représentation graphique » (2026-11-17)

Message de questions-1gen (journal questions-1gen § 15, lot 2 validé par David) : R2 placer les termes d'une suite
arithmétique, R3 placer les termes d'une suite géométrique > 0, R4 lire sur le nuage d'une suite géométrique > 0,
écrits en `['1_GEN']` sur le nœud « Suites > Généralités sur les suites > représentation graphique ». Réponse :
d'accord, aucune objection sur les plages (termes > 0, q = 1/2 ou 1/3 = fractions simples, seuil lu sur le nuage
sans logarithme, uₙ accepté pour les communs). Points : **R2 → 044, R3 → 117, R4 → 119**, tous trois sur ce nœud
(`320aaed2`). **Retirés de notre lot 4 « graphiques »**, qui garde 121, 085, 082, 059, 104. Suite : leurs ids après
leur migration nœud + tags, puis page à cocher et migration `array_append('1_TECHNO')` + tags (gabarit du lot G).

## 19. 83b1f614 v3 : racines évidentes au corrigé (2026-11-17)

Q4 bis (a). Prévenus avant : questions-1gen (« aucune modification en cours, tu peux continuer ») et
questions-ttechno (« sans effet chez nous » : 83b1f614 classé « non » pour 049/087 à leur lot 0). Relevé prod
(MCP) : publié, `{1_SPE,1_TECHNO}`, 3 variations, md5(variations::text) `d2ee6195…` ; instantané
`scripts/questions/1techno-83b1f614/` = les sources `1spe-0-variations/83b1f614.json` et
`derivation-1spe/C-03-…json` (au statut et aux niveaux près).

Variation 3 (index 2), seules les étapes du corrigé changent (2 → 3) : f′(x) développée ; « On cherche des racines
évidentes parmi les petits entiers : f′(p) = … = 0 et f′(q) = … = 0 » (calculs affichés) ; « Donc f′(x) =
6(x − p)(x − q) : … signe de son coefficient de x² à l'extérieur des racines ». Tableau et étape finale
inchangés. `checkTemplate` vert (900 tirages, specs vertes) ; rendu relu sur 6 tirages.

Migration `20261117171928_questions_1techno_83b1f614_contenu`, générée par
`docs/wip/questions-1techno/83b1f614-contenu.py` (garde : variations EXACTEMENT celles de la prod, sinon rien ;
modèle absent : rien) ; test `tests/integration/questions-1techno-83b1f614-contenu.test.ts` : 9 verts (décor au
md5 de la prod) ; migration vidée → 2 rouges et le bloc nominal ne démarre pas. Accès : aucune règle ne change
(même nature que le lot G : contenu d'un modèle publié).

PR #2764 : audit de sécurité sans finding bloquant (non bloquant : modèle absent en prod → migration muette ; couvert
par la vérification prod après `db:migrate`). CI : Lint rouge sur la garde de doc (`Doc-inchangée:` dans la PR
seulement, pas dans le commit) → commit de journal qui porte la ligne.

Mergée (48e3cad4bc). `migration list --linked` : seule 20261117171928 en attente ; `db:migrate` refusé
(« inserted before », une migration plus récente déjà en prod) → `db push --dry-run --include-all` (seule la
nôtre) puis `--include-all`. Prod vérifiée (MCP) : v3 en 5 étapes, la 2e = racines évidentes ; publié,
`{1_SPE,1_TECHNO}`, 2 tags inchangés. Vérification visuelle notée dans `verifications-manuelles.md`.

## 20. Lot 2 commun de questions-1gen : ids reçus (2026-11-17)

Message de questions-1gen : migration `20261117174437` appliquée en prod (vérifiée par eux, MCP) ; les trois sont
sur « Suites > Généralités sur les suites > représentation graphique », en **brouillon**, `grades = {1_GEN}` :

| Modèle                                        | id                                     | tag 1GEN | à poser     |
| --------------------------------------------- | -------------------------------------- | -------- | ----------- |
| R2 Placer les termes d'une suite arithmétique | `96668141-c1a7-4996-bb59-b39f6c106b45` | 1GEN-019 | 1TECHNO-044 |
| R3 Placer les termes d'une suite géométrique  | `13388e8f-e662-4f28-97b6-934afaeead31` | 1GEN-041 | 1TECHNO-117 |
| R4 Lire sur le nuage d'une suite géométrique  | `e8f08a19-b417-4183-9cd3-fab7f3810211` | 1GEN-058 | 1TECHNO-119 |

Écarts acceptés par David (chez eux) : R3 et R4 sur u₀ à u₃ seulement, graduation verticale = plus petit terme
(1 à 4). R3 : 5 variations (explicite, récurrence, croissante / décroissante, bactéries) ; R4 : 6 (u₀ et q, u_k,
sens croissante, sens décroissante, dépasse, passe sous). Ordre convenu : **page à cocher d'abord**, puis notre
migration. Leur rollback n'est valable qu'avant nos tags.

## 21. Lot 2 commun : page à cocher (2026-11-17)

Relevé prod (MCP) : 96668141, 13388e8f, e8f08a19 en **brouillon**, `grades = {1_GEN}` (3, 5 et 6 variations).
Instantanés (`export-question-templates.ts`) dans le scratchpad, à copier dans `scripts/questions/1techno-r/` sur la
branche de la migration. Page à cocher : https://claude.ai/artifact/LbvfzTA9MAxfVfQsfyyJUF (capacité `db`,
collection `verdicts` vide au départ ; 14 exemples, chacun avec son nuage dessiné ; aucune alerte). Point affiché =
le point 1GEN ; le point 1TECHNO visé est dans l'intro (R2 → 044, R3 → 117, R4 → 119).

## 22. Lot R (lot 2 commun) : migration (2026-11-17)

Verdicts de la page à cocher : 3 « ok » sur 3 (96668141, 13388e8f, e8f08a19), sans commentaire. Relevé prod (MCP) :
les trois sont désormais **publiés** par questions-1gen, `grades = {1_GEN}`, seul tag le point 1GEN (019, 041, 058),
tous sur le nœud `320aaed2` qui porte aussi 1TECHNO-044, 117 et 119. Même nature que le lot G (modèles publiés) : la
question d'accès du chantier s'applique.
Migration `20261117181914_questions_1techno_lot_r_tags`, générée du lot G par substitution (ids, codes, nom de table
temporaire `_q1tr_`) ; test `tests/integration/questions-1techno-lot-r-tags.test.ts`. Instantanés prod (publiés) :
`scripts/questions/1techno-r/`.
12 tests verts ; migration vidée → 7 rouges et le bloc nominal (5) ne démarre pas.

PR #2772 : audit de sécurité sans finding bloquant (non bloquants, comme le lot G : `set local lock_timeout` sans
effet sous `db push` ; la garde ne vérifie que l'absence de `1_TECHNO`) ; CI verte ; `check:migrations --pr 2772`
vert ; mergée (f18b1afd42). `migration list --linked` : seule `20261117181914` en attente ; « inserted before » →
`db push --dry-run --include-all` (seule la nôtre) puis `--include-all`, joué depuis le worktree (dépôt principal
non tirable : modifications d'une autre session ; `supabase/.temp` copié pour le lien). Prod vérifiée (MCP) : les 3
`{1_GEN,1_TECHNO}`, publiés, tags 1GEN-019 + 1TECHNO-044, 1GEN-041 + 1TECHNO-117, 1GEN-058 + 1TECHNO-119 ;
`updated_at` inchangé (18:18:12, publication par questions-1gen).

## 23. Lot 1 vidé, découpage des lots refait (2026-11-17)

Relevé prod (MCP) : les cinq points du lot 1 « suites géométriques » sont couverts ou renvoyés — 036 0b5c3db6,
038 c4887e49, 049 569e0140 (lot G), 047 d1010214 (T2) ; 040 renvoyé aux connaissances (§ 16). **38 points STMG
sans modèle** (hors D 012, 143), plus les jumeaux de 1acb6d47 (057) et 97b3a376 (137). Le § 5 datait d'avant la
passe anti-doublons (§ 9) : la dérivation, 126, 090, 084 n'étaient dans aucun lot.

Décision (David, « je suis tes recos ») : lot 1 = connaissances des suites (039, 040, 041) ; découpage refait.

| Lot | Thème                                       | Points                                                           |
| --- | ------------------------------------------- | ---------------------------------------------------------------- |
| 1   | Connaissances des suites                    | 039, 040, 041                                                    |
| 2   | Second degré sans formule                   | 123, 124, 061, 062, 064, 125, 126 + jumeau 057 (commun 1GEN-022) |
| 3   | Dérivation                                  | 128, 069, 071, 072, 074, 130, 131, 081, 056                      |
| 4   | Algorithmique (` ```python `)               | 003, 107, 051, 122, 067, 103, 105, 101                           |
| 5   | Graphiques et statistiques à deux variables | 121, 059, 082, 085, 104, 084, 087                                |
| 6   | Probabilités                                | 090, 097, 136, 013 + jumeau 137                                  |

Total 40 = 38 + 057 + 137. Avant chaque lot : demander à questions-1gen s'il a un modèle commun en cours (lot 2 :
1GEN-022 ↔ 057 déjà convenu, § 9).

### Lot 1 — phase 0 (proposée, à valider)

Points (connaissances) et nœuds (relevé MCP) : 039 et 1GEN-015 sur la notion « Suites arithmétiques »
(`7ed1251c`) ; 040 et 1GEN-030 sur « Suites géométriques » (`c90700c5`) ; 041 et 1GEN-016 sur la sous-notion
« représentation graphique » (`320aaed2`). Les exercices du sens de variation ont déjà leurs modèles (5cb7f6ce
sur 048, 569e0140 sur 049) : pour 039 et 040, des modèles **de cours**, courts.

Candidats écartés : brouillons 1re spé du chantier `cours-suites` (B10 24b7e5dc, C17 93f113af, C18 97088e3d,
B12 b0992067) — en relecture chez David, notation uₙ ; C17 et C18 tirent u0 ou q négatifs (hors borne de 040).

- **M1 « Cours : sens de variation d'une suite arithmétique »** → 039, nœud `7ed1251c`, niveau 1,
  `grades = ['1_TECHNO']`, réponse ` ```choix ` (`melanger: non`), notation u(n). Leurres communs : « croissante »,
  « décroissante », « constante », « on ne peut pas savoir ».
  - v1 « (u(n)) est arithmétique de raison r > 0. Alors elle est… » → croissante.
  - v2 raison r < 0 → décroissante. v3 raison 0 → constante.
  - v4 « Le sens de variation d'une suite arithmétique dépend… » : du signe de sa raison seulement / de son premier
    terme seulement / de son premier terme et de sa raison.
  - v5 vrai ou faux : « La suite arithmétique de premier terme u(0) = −a et de raison r est décroissante »,
    a ∈ 1..20, r ∈ 1..9 → faux (erreur visée : lire le signe de u(0)).
  - Corrigé : u(n+1) − u(n) = r, le signe de r décide, quel que soit u(0).
- **M2 « Cours : sens de variation d'une suite géométrique »** → 040, nœud `c90700c5`, niveau 1, même forme ;
  premier terme et raison **strictement positifs partout** (borne).
  - v1 « u(0) > 0 et q > 1 : la suite est… » → croissante. v2 u(0) > 0 et 0 < q < 1 → décroissante. v3 q = 1 →
    constante.
  - v4 « Pour une suite géométrique de premier terme et de raison strictement positifs, le sens de variation se lit… »
    : en comparant q à 1 / en comparant q à 0 / sur le premier terme (erreur visée : q > 0 ⇒ croissante, comme r > 0).
  - Corrigé : u(n+1) − u(n) = u(n) × (q − 1), avec u(n) > 0 : signe de q − 1.
- **041 → tag de 817d257f** « Associer un nuage de points à une suite arithmétique » (questions-1gen R1, publié,
  `grades = {1_GEN}`, tag 1GEN-016, nœud `320aaed2`) : 2 variations (forme explicite, récurrence), u0 de −3 à 8,
  r de −2 à 3, dans les bornes générales ; uₙ (modèle commun, comme G et R). Page à cocher, puis migration
  `array_append('1_TECHNO')` + tag 1TECHNO-041 (gabarit du lot R). Prévenir questions-1gen (rien à faire chez lui).

Livraison : PR des fichiers M1, M2 (contenu, sans revue) ; David lance `create-questions --publier` (brouillons) ;
migration nœud + tags de M1, M2, et tag + `1_TECHNO` de 817d257f, une seule PR ; page à cocher (M1, M2, 817d257f)
**avant** la migration ; publication de M1, M2.

**Question d'accès** : M1 et M2 naissent brouillons (personne d'autre que le prof ne les voit) ; la migration range
et tague, et met 817d257f (déjà publié pour tous) au catalogue de 1re techno — aucune règle d'accès ne change, comme
les lots G et R.

### Lot 1 — écriture (2026-11-17)

Phase 0 validée par David (« oui »). Script `docs/wip/questions/lot-1techno-1.py` → `scripts/questions/1techno-1/`
(M1 5 variations, 11 specs ; M2 4 variations, 8 specs). `create-questions` en simulation : tout vert. Essai en base
locale (copie dans le scratchpad, ids locaux hors dépôt) : deux brouillons créés ; M1 joué dans l'aperçu admin (choix
faux marqué faux, bonne réponse montrée) ; aperçus `question:specs --apercu 12` relus pour les deux.

### Lot 1 — brouillons en prod, page à cocher, migration (2026-11-17)

PR #2779 (fichiers) mergée. David a lancé `create-questions --publier` : M1 `0e64a8b0-92c1-4c74-be3f-5894d7b7eba6`, M2
`28d1c03e-add8-46d1-affe-87ae04598041`, brouillons `{1_TECHNO}`, sans nœud ni tag (vérifié MCP). Page à cocher
https://claude.ai/artifact/MxXrLSyDNPEozMGpM7zp3m (capacité `db`) : 3 « ok » sur 3 (M1, M2, 817d257f), sans
commentaire. Instantanés prod : `scripts/questions/1techno-1-tags/`.

questions-1gen (message du 2026-11-17) : d'accord pour 817d257f → 041, aucune modification en cours ; le rollback de
sa migration du lot 2 (20261117174437) ne sera plus joué une fois notre tag posé (il retire le nœud de R1).

Migration `20261117192425_questions_1techno_lot1_rangement_tags` : (A) M1, M2 rangés sur le nœud de leur point (lu
sur `node_id`) et tagués 039, 040 ; (B) 817d257f `array_append('1_TECHNO')` + 041. Gardes : tout ou rien (3),
brouillons sans nœud ni tag avec `1_TECHNO`, 817d257f sans `1_TECHNO` et sur le nœud de 041, aucun point 1TECHNO
déjà posé. Test `tests/integration/questions-1techno-lot1-rangement-tags.test.ts` : 14 verts ; corps retiré → 6
rouges et le bloc nominal ne démarre pas.

PR #2783 mergée. Migration appliquée en prod le 2026-11-17 par le `db:migrate` de David (avec celle du lot 8 de
questions-cm2). Vérifié MCP : M1 sur 7ed1251c + 1TECHNO-039, M2 sur c90700c5 + 1TECHNO-040 (point sur le nœud) ;
817d257f `{1_GEN,1_TECHNO}`, publié, tags 1GEN-016 + 1TECHNO-041, `updated_at` inchangé ; trigger de date `O`.
Publication : `publier-lot.ts` en simulation (2 brouillons) puis lancé par David avec `--publier` : 2/2 publiés,
relu en base. **Lot 1 clos.**

## 24. Lot 2 « second degré sans formule » (2026-11-17)

Relevé prod (MCP) : les 7 points techno ont chacun un point **identique** en 1re générale, même sous-notion :
057↔1GEN-022, 061↔024, 123↔052, 124↔053, 062↔025, 125↔054 (nœud « parabole »), 126↔027 (« signe » ; afe51ac4
porte déjà 1GEN-055 + 1TECHNO-066, d'où le croisement). C'est tout le lot 5 de questions-1gen. 064 → « formes ».

**Décisions (David, « je suis tes recos »)** : Q1 modèles communs `{1_GEN,1_TECHNO}` pour les 7 points, deux tags ;
Q2 les 8 modèles ci-dessous, racines entières (borne 1GEN, plus stricte), tableau de variation depuis la forme
factorisée ou ax² + c seulement. questions-1gen d'accord (message du 2026-11-17), retire son lot 5, attend les ids.

| Modèle                  | Points             | Niveau | Variations                                                               |
| ----------------------- | ------------------ | ------ | ------------------------------------------------------------------------ |
| M1 allure               | 057 + 1GEN-022     | 1      | ax², ax² + c, a(x−r)(x−s), ax² + bx + c, piège k(u−x)(x+v)               |
| M2 associer             | 061 + 1GEN-024     | 2      | 4 courbes pour ax², ax² + c, a(x−r)(x−s) ; 4 expressions pour une courbe |
| M3 axe                  | 123 + 1GEN-052     | 2      | milieu des racines, x = 0 pour ax² + c, piège                            |
| M4 sommet               | 124 + 1GEN-053     | 3      | forme factorisée (milieu puis image), ax² + c                            |
| M5 f(x) = c             | 062 + 1GEN-025     | 3      | guidé (solutions, axe, sommet), axe seul                                 |
| M6 tableau de variation | 125 + 1GEN-054     | 3      | ` ```variation ` à compléter (abscisse, valeur, 2 flèches)               |
| M7 signe                | 126 + 1GEN-027     | 2      | règle (choix), tableau de signes à compléter, piège                      |
| M8 factoriser           | 064 (techno seule) | 3      | racines données (forme imposée), une racine connue, racine 0 évidente    |

Écriture : `docs/wip/questions/lot-1techno-2.py` → `scripts/questions/1techno-2/` (59 specs). `create-questions` en
simulation : 8 « à créer », tout vert. Essai en base locale (copie scratchpad) : 8 brouillons ; M6 joué dans
l'aperçu admin (juste, corrigé avec flèches), M2 rendu (4 courbes). Question d'accès : brouillons ; la migration
range et tague ; 1acb6d47 quitte le catalogue de 1re techno (M1 le remplace).

### Lot 2 — brouillons en prod, page à cocher, migration (2026-11-17)

PR #2787 (fichiers) mergée (un shard de la CI bloqué au checkout, relancé). David a lancé `create-questions --publier` :
M1 `129067e4-e97c-458c-9bd7-540383a5dac6`, M2 `7efa9e79-e985-407d-bdec-73dce30ef283`, M3
`f81b8735-9b8f-41aa-ada0-08b7415a6076`, M4 `493adeb4-7eb9-4156-bd1b-79996f54c5e4`, M5
`f95f05a0-4c66-409f-9ea3-0f9fcdd98759`, M6 `e539088a-1eee-4259-8e61-b0f6fa514eaf`, M7
`82e40d16-6069-4bea-b7e6-df3344d26bd3`, M8 `9adefa88-5d73-4fea-b64e-538323a3f45f` ; brouillons sans nœud ni tag
(vérifié MCP). Ids envoyés à questions-1gen : aucune objection, rien en cours sur les 7 points 1GEN, « pose les deux
tags ». Page à cocher https://claude.ai/artifact/FrRt7ig4wuX6mLsY9dP5Q3 (capacité `db`, collection `verdicts`).

1acb6d47 (« Déterminer la nature de l'extremum », 1re spé, publié, tags 1SPE-402 + 1TECHNO-057) : 0 carte, 0
tentative, 0 évaluation, 0 entrée de cahier de texte, 0 état de point sur 1TECHNO-057 (MCP).

Migration `20261117222845_questions_1techno_lot2_rangement_tags` : (A) 8 brouillons rangés sur le nœud de leur point
1TECHNO, 15 tags (8 × 1TECHNO, 7 × 1GEN, le point 1GEN exigé sur le même nœud) ; (B) 1acb6d47 perd 1TECHNO-057 et
`1_TECHNO`. **Partie destructive** (une ligne de tag, une valeur de niveau), rendue par le rollback. Gardes : tout ou
rien (9), brouillons sans nœud ni tag avec les niveaux du relevé, 1acb6d47 avec `1_TECHNO` et 057 pour seul point
1TECHNO. Test `tests/integration/questions-1techno-lot2-rangement-tags.test.ts` : 14 verts ; corps retiré → 7 rouges
et le bloc nominal ne démarre pas. `security-auditor` : aucun bloquant (note : 1acb6d47 reste rangé sur le nœud
« parabole », son tag 1SPE-402 étant sur sa notion ; seul l'arbre de l'admin en est touché). Page à cocher : 8 « ok »
sur 8, sans commentaire.

PR #2796 mergée (go de David sur la partie destructive). `db:migrate` refusé (« inserted before » : la migration
`20261117222600` de carnet-heatmap, horodatée avant la dernière appliquée) ; David a lancé `db push --include-all` le
2026-11-18 : carnet-heatmap, la nôtre et `20261117222938` (questions-cm2 lot 9) appliquées ensemble. Vérifié MCP : les
8 rangés (parabole ×6, signe, formes) avec leurs 15 tags, niveaux et `updated_at` inchangés ; 1acb6d47 `{1_SPE}`, seul
tag 1SPE-402 ; triggers de `question_templates` actifs. Publication : `publier-lot.ts` en simulation (8 brouillons)
puis lancé par David avec `--publier` : 8/8 publiés, relu en base. **Lot 2 clos.**

## 25. Lot 3 « dérivation » — phase 0 (validée par David, « oui », 2026-11-18)

Relevé prod (MCP) : les 9 points ont 0 modèle. questions-1gen : rien en cours, **aucun jumeau** (le module 1GEN n'a
ni dérivée ni taux en un point ; ses « taux moyen » 037, 040, 043 portent sur aˣ, pas sur 056). Modèles 1re spé
libres sur ces nœuds, tous hors bornes : a86442c1 (1/x, xⁿ jusqu'à 5), 74d77343 (1/x, √x, xⁿ jusqu'à 6), 2b382069
(discriminant), 9e377c97 (démonstration). 080 ↔ 131 et 079 ↔ 071 sont des points voisins déjà couverts d'un côté
(1666b8e9, f52395d1…) : un point par programme et par modèle (§ 9), donc un modèle neuf de l'autre côté, distinct.
Règles appliquées : Q11 (jumeaux techno, le modèle de 1re spé n'est pas touché), Q12 (un modèle court par
connaissance). Tous `grades = ['1_TECHNO']`, entiers sauf mention, réponse en case ou ` ```choix ` (`melanger: non`).

- **M1 taux en un point** → 128 (taux de variation), niv. 2 : f(x) = x², a ∈ 1..5 ; f(a+h) − f(a) développé ; taux
  simplifié (6 + h) ; valeur pour h = 0,1 ; f(x) = x² + bx. Jumeau de b05ec37a, l1t-7.
- **M2 tangente, position limite** → 069 (tangente), niv. 1 : choix « quand M se rapproche de A, la sécante (AM)
  se rapproche de… » ; pentes des sécantes pour h = 1 ; 0,1 ; 0,01 → pente de la tangente ; piège « la tangente ne
  touche la courbe qu'en A ».
- **M3 équation réduite (cours)** → 071 (tangente), niv. 1 : choix de la formule y = f′(a)(x − a) + f(a) (leurres :
  f et f′ échangés, f′(a)x + f(a)) ; « y = 4x − 3 est la tangente en a : f′(a) = ? ».
- **M4 fonction dérivée (cours)** → 072 (fonctions dérivées), niv. 1 : f′ associe à x le nombre dérivé f′(x) ;
  f′(x) = 2x + 1 donné, f′(3) = ? ; piège f(x) = x², f′(3) = 6 et non 9 ; dérivées de x ↦ k et x ↦ x.
- **M5 dérivée d'une somme** → 074 (opérations), niv. 2 : x³ + x², x² + x, x³ + x + c (coefficients 1) ; choix
  « (u + v)′ = u′ + v′ » ; erreur visée : constante dérivée non nulle.
- **M6 dérivée de kf** → 130 (opérations), niv. 2 : kx, kx², kx³ avec k ∈ ±2..9 ; k fraction simple (x³/3 → x²,
  ½x² → x).
- **M7 dérivée d'un polynôme** → 131 (opérations), niv. 3, distinct de 1666b8e9 (forme ordonnée en x) : variable t ;
  termes dans le désordre (5 − 2x + 4x³) ; termes manquants (x³ − 12x) ; contexte coût C(q) = 0,5q² + 3q + 100 ;
  degré de f′.
- **M8 sens de variation** → 081 (variations et extremums), niv. 3 : f de degré 2 (f′ affine) ; f de degré 3 avec
  f′(x) = 3(x − p)(x − q) donné ; f′ = 3x² − 3p² (racines ±p) ; ` ```variation ` à compléter. Réponse : intervalles
  de croissance. Jumeau de 2b382069 sans discriminant (l1t-2).
- **M9 monotonie et taux (cours)** → 056 (variations), niv. 1 : choix « f croissante sur I : le taux entre deux réels
  de I est… » ; f monotone, f(2) = 7, f(5) = 1 → décroissante ; piège f(0) = 1, f(4) = 9 ⇒ croissante ? → on ne
  peut pas savoir.

**Question d'accès** : les 9 modèles naissent brouillons ; la migration les range et les tague (9 tags 1TECHNO) ;
aucun modèle existant n'est touché, rien n'est retiré. Aucune règle d'accès ne change.

Lot 5 : questions-1gen ouvre son lot 6 (stats à deux variables, 1GEN-001 à 007) et propose des modèles communs
(082 / 085 ↔ 1GEN-002, 084 ↔ 1GEN-004, 087 ↔ 1GEN-007 et 003) ; réponse : rien en cours ici, d'accord sur le
principe, David tranchera au lot 5.

### Lot 3 — écriture (2026-11-18)

Script `docs/wip/questions/lot-1techno-3.py` → `scripts/questions/1techno-3/` (9 modèles, 88 specs). M2, M3, M4, M9 en
question de cours (`courseQuestion`, délai 30). M8 : réponse `intervalles` avec `openableBounds` (intervalle de
croissance), v4 tableau de variation à compléter. `create-questions` en simulation : 9 « à créer », tout vert. 640
formules des aperçus passées à `validateLatex` + compte d'accolades : 0 problème. Corrigés relus : « h + (−3) »
(M1), « 1q + 6 » (M7), fractions 7/7 (M9, conditions ajoutées) corrigés. Essai en base locale (copie scratchpad) :
9 brouillons ; aperçu admin : M1 et M7 rendus, tableau de M8 rendu avec ses cases.

Lot 5 : questions-1gen a fait valider sa phase 0 (son journal, § 23) : S2 → 085, S3 → 082, S4 → 084, S6 → 087, et
49fac266 reçoit 1GEN-003 + `1_GEN` dans sa migration (ni mes niveaux ni mon tag touchés). Plages à vérifier contre
mes bornes avant le lot 5 ; ids à recevoir.

### Lot 3 — brouillons en prod, page à cocher (2026-11-18)

PR #2801 (fichiers) mergée. David a lancé `create-questions --publier` : M1 `06bee149-e006-4b9f-8f0b-1e21ace0a1cf`, M2
`5643abd0-1454-4b03-b612-3fd3b1a1ca33`, M3 `382171b6-f5b5-490d-97c1-e0e9db592ac4`, M4
`9b89e676-8833-4b2e-aa44-ef34c8655785`, M5 `531a7080-9b20-46be-a614-7104d5401451`, M6
`8efb084c-aefe-41f2-a8b5-50167d6f7257`, M7 `77a599ef-2cee-4ac2-b1cc-f0036d56b9d7`, M8
`14b60caa-e18e-46d8-9ff6-3889fd9de40e`, M9 `936b7e76-74eb-4c82-a3b8-bdccb3682cfc` ; brouillons `{1_TECHNO}`, sans
nœud ni tag, niveaux du script (vérifié MCP). Page à cocher https://claude.ai/artifact/VszQXF6HbQ9VZbvgHZFLro
(capacité `db`, collection `verdicts`, vide à la publication) ; décimaux écrits « 0{,}1 » dans la page.

### Lot 3 — verdicts et migration (2026-11-18)

Page à cocher : 9 « ok » sur 9, sans commentaire (collection `verdicts`, lue). Migration
`20261118055440_questions_1techno_lot3_rangement_tags` : 9 brouillons rangés sur le nœud de leur point (lu sur
`node_id`) et tagués de leur point 1TECHNO. Gardes : tout ou rien (9), brouillons sans nœud ni tag avec `1_TECHNO`.
Additive (rollback écrit et éprouvé). Test `tests/integration/questions-1techno-lot3-rangement-tags.test.ts` : 10 verts ;
corps retiré → 4 rouges et le bloc nominal ne démarre pas.

### Lot 3 — migré et publié (2026-11-18)

`security-auditor` : aucun bloquant (deux faibles : commentaire sur la transaction de `db push`, nœud non revérifié au
rollback, garde des tags suffisante). PR #2805 mergée (CI verte, `check:migrations` OK). `db push` lancé par David
pour trois migrations en attente (questions-1gen lot 6 `054706`, la nôtre `055440`, navadra `060323`), coordonné par
questions-1gen après réponse de navadra. Vérifié MCP : les 9 rangés (variations, tangente ×2, fonctions dérivées,
opérations ×3, variations et extremums, taux de variation), chacun avec son seul point 1TECHNO, point sur le nœud,
`updated_at` inchangé, triggers actifs. Publication : `publier-lot.ts` en simulation (9 brouillons) puis lancé par
David avec `--publier` : 9/9 publiés, relu en base. **Lot 3 clos.**

## 26. Lot 4 « algorithmique » — phase 0 (validée par David, « je te suis », 2026-11-18)

Relevé prod (MCP) : les 8 points (003, 107, 051, 122, 067, 103, 105, 101) ont 0 modèle. questions-1gen : rien en
cours ni prévu (le module 1GEN n'a ni Python, ni liste, ni simulation). Passe anti-doublons (contenu lu, 1re spé,
1GEN, 2de) :

- **Quasi-doublons non posables** → jumeaux techno (Q11) : `ff3a3a15` factorielle (1SPE, nœud « factorielle ») pour
  M5 ; `66cd841d` balayage de √2 (2de, nœud « boucle bornée ») pour M8 ; `5192e88a` moyenne d'un échantillon (1SPE,
  posable sur 103 mais variable à deux valeurs, pas Bernoulli 0/1) pour M2 — modèle de 1re spé non touché.
- Voisins sans doublon : `4a51f887`, `81322162`, `025ad9fa` (terme ou suite d'un programme ; M6 renvoie la liste) ;
  `19961e67` (seuil d'une suite, déjà 1TECHNO-052 ; M7 compare deux suites).
- Rien d'équivalent : 003, 101, 105.
- **Modèle commun** : M2 porte aussi **1SPE-362** « Simuler une variable aléatoire avec Python » (0 modèle, même
  nœud « simulation ») : `grades = ['1_TECHNO', '1_SPE']`. 1SPE-365 ↔ 105 écarté (moyennes et σ/√n, pas fréquences
  et s observé) : M4 seul.

Tous en Python (` ```python `), réponse en case ou ` ```choix `, notation u(n) ; `grades = ['1_TECHNO']` sauf M2.

- **M1 simuler une loi de Bernoulli** → 003, niv. 1 : `random() < 0.p` → P(1) = p ; `random() > 0.p` → 1 − p ;
  choisir la bonne fonction (leurres `< 1−p`, `== p`, `randint(0, 1)`) ; random() a donné 0,27 → valeur renvoyée.
- **M2 échantillon de taille n** → 103 + 1SPE-362, niv. 2 : compter les 1 d'après six valeurs de random() données ;
  compléter `return c / n` (fréquence) ; sens de `echantillon(100, 0.3)` (leurre « exactement 30 »).
- **M3 N échantillons et histogramme** → 101, niv. 3 : liste `freqs` de 500 fréquences (taille 100) et histogramme ;
  effectif d'une classe ; effectif sous un seuil ; p le plus plausible ; contenu de `freqs`.
- **M4 compter dans [p − ks ; p + ks]** → 105, niv. 3 : compter sur une liste de 8 fréquences (k = 1 ou 2, aucune
  sur une borne) ; compléter la condition (leurre k oublié) ; pourcentage sur 500 ; effet de k sur le compte.
- **M5 accumulateur produit** → 107, niv. 2 : produit des entiers de 1 à n ; initialisation `p = 1` (leurre 0) ;
  coefficient multiplicateur global d'évolutions successives ; produit des éléments d'une liste.
- **M6 liste des termes d'une suite** → 051, niv. 2 : `termes(4)` arithmétique et géométrique (q > 0, u(0) > 0)
  parmi quatre listes (leurres : commence à u(1), un terme de trop) ; `L[3]` ; liste en compréhension.
- **M7 rang où une suite dépasse l'autre** → 122, niv. 3 : u arithmétique, v géométrique de raison 2 ; valeur
  renvoyée par la boucle `while v <= u` ; lecture d'un tableau de valeurs ; condition à compléter.
- **M8 valeur approchée par balayage** → 067, niv. 3 : f(x) = x² + x sur [0 ; +∞[, f(x) = k ; encadrement par
  `balayage(k, 1)` ; encadrement au dixième d'après un tableau de valeurs ; condition `f(x + pas) <= k` ; sens de
  `balayage(k, 0.01)`.

**Question d'accès** : les 8 modèles naissent brouillons ; la migration les range sur le nœud de leur point et les
tague (8 tags 1TECHNO + 1SPE-362 sur M2) ; aucun modèle existant n'est touché. Aucune règle d'accès ne change.

### Lot 4 — rendu validé (2026-11-18)

Base locale réinitialisée entre-temps par une autre session : 8 brouillons recréés (copie scratchpad, ids locaux
hors dépôt). David : « ok pour les rendus ». Aperçu fermé (`tailscale serve --https=443 off` et `--https=8443 off`
seulement : le :10000 → 5175 n'est pas à ce chantier), 5176 arrêté. `origin/main` fusionnée ; re-simulation contre
la base locale avec `--malgre-homonyme` (les brouillons locaux portent les mêmes titres) : 8 ✓, 0 ⛔.

## 27. Lot 4 — brouillons en prod, migration (2026-11-18)

David a lancé `create-questions --publier` : M1 `fba4bd3c-0888-4ce1-a4a3-70be99b68987`, M2
`2bf630e5-d983-4123-a5b8-17a9a0eddbe6`, M3 `dfeed66c-f7fb-4a28-b8d8-80d5bf61a3e7`, M4
`a14d1b12-505f-492c-8f72-35efa16ab3be`, M5 `ecba4038-e4f2-4861-835b-2b2d3beab467`, M6
`b916ab0f-73d5-4c3d-80d6-5300f4594f91`, M7 `92120570-1a05-4caa-a0da-5e4d3e20e897`, M8
`3263f8f6-44af-4952-9cf0-45fdc0d8e344` ; brouillons sans nœud ni tag, M2 `{1_TECHNO,1_SPE}`, les autres
`{1_TECHNO}` (vérifié MCP). Les 9 points visés : 0 modèle ; 1SPE-362 et 1TECHNO-103 sur le même nœud « simulation ».

Migration `20261118190129_questions_1techno_lot4_rangement_tags` (gabarit du lot 2 : point 1TECHNO + point jumeau
sur le même nœud) : 8 rangés sur le nœud de leur point 1TECHNO, 9 tags. Gardes : tout ou rien (8), brouillons sans
nœud ni tag, niveaux du relevé. Additive, rollback écrit et éprouvé. Test
`tests/integration/questions-1techno-lot4-rangement-tags.test.ts` : rouge sans la migration (ENOENT, 6 échecs), puis
10 verts. `security-auditor` : aucun bloquant (deux faibles, déjà connus aux lots 2-3 : nœud non revérifié au
rollback, `lock_timeout` sous `db push`).

### Lot 4 — migré, page à cocher (2026-11-18)

PR #2836 mergée (CI verte, `check:migrations` OK). `migration list --linked` : seule `20261118190129` en attente ;
`db:migrate` lancé depuis le dépôt principal. Vérifié MCP : les 8 rangés (Variables et instructions, simulation ×2,
fluctuation, Boucles, représentation graphique, seuil, équations et inéquations f(x) = k), chacun avec son point
1TECHNO (M2 : 1SPE-362 en plus), point sur le nœud, brouillons, `updated_at` = création. Page à cocher
(`page-a-cocher.ts`, 0 alerte sur 8 fiches) publiée avec la capacité `db` :
https://claude.ai/artifact/3J8hZfstwcX15X7hToDERh ; `verdicts` vide à la publication.

### Lot 4 — publié (2026-11-18)

Verdicts : 8 « ok » sur 8, sans commentaire ; les 8 ids sont ceux de `scripts/questions/1techno-4`. La simulation
`publier-lot.ts` a été refusée par le classifieur (écriture prod) : David a lancé simulation et `--publier`. Vérifié
MCP : les 8 `published`. **Lot 4 clos.**

## 28. Lot 5 « graphiques et statistiques à deux variables » — phase 0 (validée par David, « je valide », 2026-11-18)

Relevé prod (MCP) : les 7 points (121, 059, 082, 085, 104, 084, 087) n'ont aucun modèle.

**Modèles communs de questions-1gen à poser** : ils sont publiés, `grades = {1_GEN}`, et chacun est déjà rangé sur
**le nœud du point 1TECHNO visé**. Je les ai relus contre mes bornes (082-087 : « ajustements au jugé, droite de
Mayer, moindres carrés ; aucune connaissance théorique », BO p.9) : ni covariance ni formule, toutes les
variations conviennent.

| Modèle   | Titre                                               | Variations                                                                       | → point |
| -------- | --------------------------------------------------- | -------------------------------------------------------------------------------- | ------- |
| 7461bb44 | Lire un nuage de points                             | 4 : lire une valeur, tendance, ajustement affine adapté ou non (×2)              | 082     |
| f3cb0c7a | Représenter une série à deux variables par un nuage | 3 : placer les points (série brute, pommes, club)                                | 085     |
| 4f328c8c | Le point moyen d'un nuage                           | 3 : placer G, b par G, reconnaître G                                             | 084     |
| 3fec6b41 | Déterminer un ajustement affine                     | 6 : Mayer (6 et 8 points), au jugé (×3), moindres carrés (calculatrice, arrondi) | 087     |

Comme au lot G (§ 16-17) : page à cocher, puis migration `array_append('1_TECHNO')` et tag, sans toucher au contenu.

**Modèles neufs** (`grades = ['1_TECHNO']`, notation u(n)) :

- **N1 Résoudre graphiquement f(x) = k** → 059, niv. 1-2. C'est le jumeau en équation de 95ee57c8 (inéquation, déjà
  tagué 1TECHNO-127, même nœud). Les modèles de 2de et de 3e (2a249385, 75fe996a, eb04ebf7) sont sur d'autres nœuds,
  ou n'ont que des images figées. Variations : une solution (courbe monotone) ; deux (parabole) ; trois (degré 3) ;
  aucune (k au-dessus du maximum, en ` ```choix `) ; leurre image / antécédent (« f(k) » contre « x tel que f(x) = k »).
  Courbes de degré ≤ 3, solutions entières.
- **N2 Représenter une liste de termes d'une suite** → 121, niv. 2, ` ```python ` (BO p.4 : Python ou tableur). Le
  programme construit `rangs` et `termes` puis `plt.plot(rangs, termes, 'o')` ; quel nuage obtient-on (trois nuages
  A, B, C, leurres : décalé d'un rang, axes inversés) ; combien de points sont affichés pour `range(n)` ; compléter
  l'appel (leurre `plt.plot(termes, rangs)`). Suites arithmétiques et géométriques (q > 0, u(0) > 0). Sans doublon :
  b916ab0f (M6) renvoie la liste, il ne la représente pas ; les modèles graphiques du nœud n'ont pas de programme.
- **N3 Représenter les fréquences de N échantillons** → 104, niv. 3, ` ```python `, N de plusieurs centaines.
  Nuage (k ; f_k) des 500 fréquences : autour de quelle valeur les points se concentrent-ils (p, leurre 1 − p) ;
  quel code produit ce nuage ou cet histogramme (`plt.scatter(range(N), freqs)`, `plt.hist(freqs)`, leurre
  `plt.hist(echantillon)`) ; effet d'un n plus grand (nuage plus resserré).

**Questions à David** :

- **Q-L5a** : M3 (dfeed66c, sur 101) lit déjà un histogramme de fréquences (effectif d'une classe, p plausible).
  N3 se limite au **nuage** et au **code qui produit la représentation**, sans relire l'histogramme. Reco : oui.
- **Q-L5b** : N2 en Python seulement, comme au lot 4 (le tableur n'a pas de bloc de rendu). Reco : oui.

**Question d'accès** : les 4 modèles communs sont publiés ; avec `1_TECHNO` et le tag, les élèves de 1re
technologique pourront les recevoir, ce qui n'était pas possible avant. Leur contenu n'est pas modifié. N1-N3
naissent brouillons. Aucune règle d'accès ne change.

## 29. Lot 5 — écriture (2026-11-18)

questions-1gen n'a pas de session ouverte (`ListAgents`) : elle n'a pas été prévenue, à faire avant la migration des
communs. Script `docs/wip/questions/lot-1techno-5.py` → `scripts/questions/1techno-5/` (N1 5 variations, N2 4, N3 4 ;
26 specs). `create-questions` en simulation : 3 « à créer », tout vert. D'abord refusé : variable `e` dans N1 (réservée
à la constante d'Euler, rappelée aussi par David) → `h`. Sonde des courbes : 0 problème (550 blocs). Les blocs `nuage`
et `histogramme` n'ont pas de sonde : passés à `parseStatChartContent` par un script jetable (200 tirages). D'abord 3
erreurs : `{{eval:…/100}}` rend une fraction LaTeX (`\dfrac{9}{25}`) dans un `nuage` → ordonnées écrites
`0,{{eval:10*pt+e}}` (centièmes entiers), ensuite 0 problème. N3 : le nuage montre 100 des 500 points (plafond
`scatterPoints` = 100), et l'énoncé le dit.

Essai en base locale (copie scratchpad, ids locaux hors dépôt) : N1 `7ebcc9f0`, N2 `59dfe41a`, N3 `db6800b2`. Chrome
n'ouvre ni `[::1]` ni `127.0.0.1` (Vite écoute sur `::1`) : aperçu par Tailscale pour David.

Communs : instantanés prod dans `scripts/questions/1techno-5-communs/` ; page à cocher
https://claude.ai/artifact/CVjnD1cXJukRJRcxujjtry (`db`, `verdicts` vide) ; alerte : le `nuage` de 7461bb44 n'est pas
dessiné par la page, à jouer dans l'aperçu.

Verdicts des communs : 4 « ok » sur 4, sans commentaire (collection `verdicts`, lue).

Rendus de N1-N3 (aperçu Tailscale) : David, « je valide les rendus ». Aperçu fermé (`tailscale serve --https=443 off` et
`--https=8443 off` ; le :10000 → 5175 n'est pas à ce chantier), 5176 arrêté.

### Lot 5 — fichiers mergés, migration des communs (2026-11-18)

PR #2843 (fichiers) mergée, CI verte. Le dépôt principal porte 6 fichiers modifiés de
`scripts/questions/ttechno-5a-logarithme/` (pas à ce chantier) : `git pull` impossible, David prévenu ; la suite se fait
dans le worktree, branche `feat/questions-1techno-lot5-migration`. Migration
`20261118202805_questions_1techno_lot5_communs_tags` (gabarit du lot G) : `1_TECHNO` ajouté + tag 1TECHNO sur 7461bb44
(082), f3cb0c7a (085), 4f328c8c (084), 3fec6b41 (087). Test
`tests/integration/questions-1techno-lot5-communs-tags.test.ts` : corps vidé → 6 rouges et le bloc nominal ne démarre
pas ; migration rendue → 12 verts. Reste : ids de N1-N3 (David, `create-questions --publier` depuis le worktree), leur
migration de rangement, audit de sécurité.

### Lot 5 — brouillons en prod, migration de rangement, audit (2026-11-18)

David a lancé `create-questions --publier` depuis le worktree : N1 `d0eb1666-9852-4bc5-8f7f-a0b4db23dcc3`, N2
`fc84a1c8-f0fd-45c5-bf58-40009ac00efa`, N3 `8d2047fe-91f1-47fa-888e-aeb296f2434b` ; brouillons `{1_TECHNO}`, sans nœud
ni tag (vérifié MCP), les 7 points visés à 0 modèle. Migration `20261118203102_questions_1techno_lot5_rangement_tags`
(gabarit du lot 4, sans point jumeau) ; test `questions-1techno-lot5-rangement-tags.test.ts` : corps vidé → 4 rouges et le
bloc nominal ne démarre pas ; migration rendue → 10 verts. `security-auditor` sur les deux migrations : aucun bloquant
(faible : `lock_timeout` sans effet sous `db push`, comme les gabarits ; info : pas de verrou consultatif dans celle des
communs, fidèle au lot G).

CI de #2844 : garde « doc à jour » rouge (`Doc-inchangée:` doit être dans un commit, pas dans la PR) → commit avec la ligne.

### Lot 5 — migré, page à cocher des neufs (2026-11-18)

PR #2844 : garde « doc à jour » rouge (ligne `Doc-inchangée:` dans la PR seulement ; puis refusée par commitlint, ligne de
plus de 100 caractères) → commit avec la ligne raccourcie ; CI verte, `check:migrations --pr 2844` OK, merge. Le dépôt
principal était redevenu propre. `migration list --linked` : seules `202805` et `203102` en attente ; `db push` refusé
(« inserted before the last migration on remote ») → `--dry-run --include-all` (les deux seules) puis `--include-all`.
Vérifié MCP : 7461bb44, f3cb0c7a, 4f328c8c, 3fec6b41 `{1_GEN,1_TECHNO}`, publiés, tag 1GEN + 1TECHNO (082, 085, 084,
087), `updated_at` inchangé (07:13:28) ; N1-N3 brouillons sur le nœud de leur point, tag 059, 121, 104. Page à cocher
des neufs publiée (`db`) : https://claude.ai/artifact/J6RYqzmQ9nrqviUoQXVBYn ; alertes : `nuage` non dessiné par la page
(N2, N3), déjà vus dans l'aperçu.

## 30. Lot 6 « probabilités » — phase 0 (proposée, à valider)

Verdicts des neufs du lot 5 (page J6RYqzmQ…) : collection vide au 2026-11-18, en attente de David. questions-1gen n'a
pas de session ouverte (`ListAgents`) : le prévenir des 4 communs dès qu'elle rouvre ; rien de 1GEN sur les nœuds
du lot 6.

Relevé prod (MCP) : 090, 097, 136, 013 à 0 modèle ; 137 n'a que 97b3a376 (déborde, Q3 : jumeau). Nœuds : 090
« probabilités totales » (5ba712bc y porte déjà 092 : un seul point 1TECHNO par modèle) ; 097, 136 « schéma de
Bernoulli » ; 137 « loi d'une variable aléatoire » ; 013 « tableau croisé d'effectifs ». Passe anti-doublons (contenu
lu) : 77498f1b (sur 100, une variation, leurres de Tle), 1043c29e (variance, hors borne), 4ff9d049 (binomiale n ⩾ 5),
2c116f4d, a9c71276, 69a05f98 (probabilité inverse, Tle) écartés ; 89e928a4, eb0dcd85 (2de) complètent un tableau par
sommes, sans données brutes ; 97b3a376 v1-v2 conviennent, v3-v4 tirent P(lo ⩽ X ⩽ hi) (hors point, l1t-6).

Modèles neufs, `grades = ['1_TECHNO']`, brouillons :

- **P1 « Cours : formule des probabilités totales »** → 090, niv. 1, ` ```choix `. Partition {A, Ā} seulement
  (l1t-1). P(B) = P(A ∩ B) + P(Ā ∩ B) (leurres : P_A(B) + P_Ā(B), P(A) + P(B)) ; sur un arbre à deux niveaux,
  quels chemins additionner ; vrai ou faux « P(B) = P(A) × P_A(B) + P(Ā) × P_Ā(B) ».
- **P2 « Cours : loi de Bernoulli »** → 097, niv. 1. X vaut 1 (succès) ou 0 (échec) ; p donné → P(X = 0) ; tableau
  de la loi à compléter (bloc `loi`) ; reconnaître le paramètre en contexte (leurre 1 − p) ; X prend-elle d'autres
  valeurs que 0 et 1 ?
- **P3 « Espérance d'une loi de Bernoulli »** → 136, niv. 1-2. E(X) = p (leurres 1 − p, 1/2) ; en contexte
  (t % de pièces défectueuses → E(X) = 0,0t) ; d'après le tableau de la loi. Sans variance.
- **P4 « Calculer P(X = a), P(X ⩽ a) »** → 137, niv. 2, jumeau de 97b3a376. Loi donnée (bloc `loi`) : P(X = a),
  P(X ⩽ a), P(X > a) par le contraire (l1t-6) ; d'après un énoncé (urne, dé : v1-v2 de 97b3a376 reprises). Jamais
  a ⩽ X ⩽ b.
- **P5 « Tableau croisé d'après des données brutes »** → 013, niv. 2. Liste de 12 à 20 individus (tableau à deux
  critères : sexe / régime, filière / option…) ; compter et compléter le ` ```tableau-croise ` (cases masquées,
  totaux compris).

**Partie destructive (comme 1acb6d47 au lot 2)** : 97b3a376 perd 1TECHNO-137 et `1_TECHNO` dans la migration de
rangement ; usage à mesurer avant (cartes, tentatives, évaluations sur ce point).

**Question d'accès** : P1-P5 naissent brouillons ; rien d'autre ne s'ouvre. En miroir : les élèves de 1re
technologique ne recevront plus 97b3a376, remplacé par P4.

**Question à David** :

- **Q-L6a** : P5 montre les données brutes dans un tableau simple (une ligne par individu). Reco : oui, 12 à 20
  lignes, pour que le comptage reste faisable.

## 31. Lot 6 — écriture (2026-11-18)

David : « je suis tes recos » (phase 0 et Q-L6a validées). Script `docs/wip/questions/lot-1techno-6.py` →
`scripts/questions/1techno-6/` (P1 5 variations, P2 4, P3 4, P4 5 dont v4-v5 = v1-v2 de 97b3a376 reprises telles
quelles, P5 3 ; 43 specs). Le bloc `loi` n'est utilisé par aucun modèle en prod : tableaux Markdown (comme 448894f3).
P5 : 12 individus tirés par deux variables 0/1 chacun, effectifs par produits, texte par `{{if:x == 1|…|…}}`.
`create-questions` en simulation : 5 « à créer », tout vert. `question:specs --apercu 40` : d'abord `\textcolor` hors
`$` (P1 v3-v4) corrigé, et décimaux « 0.4 » du corrigé de P1 v2 écrits `0{,}4` ; ensuite tous importables. 1288
formules passées à `validateLatex` + compte d'accolades : 0 problème. 80 blocs `tableau-croise` passés à
`parseStatChartContent` : 0 erreur, cases masquées lues. Essai en base locale (copie scratchpad, ids locaux hors
dépôt) ; aperçu Tailscale sur 5179 (5176-5178 pris par d'autres worktrees).

### Lot 5 — publié (2026-11-18)

Verdicts des neufs : 3 « ok » sur 3, sans commentaire (N1, N2, N3). David a lancé `publier-lot.ts` (simulation puis
`--publier`). Vérifié MCP : d0eb1666, fc84a1c8, 8d2047fe `published`, `{1_TECHNO}`, rangés. **Lot 5 clos.**

### Lot 6 — rendus (2026-11-18)

David a choisi que je vérifie les rendus moi-même (Chrome, `127.0.0.1:5179` sur la base locale, sans Tailscale ;
graines par variation calculées par `generateInstance`). Vus : P1 (choix, arbre, valeur numérique), P2 (tableau de la
loi), P4 (tableau à quatre valeurs et sa correction), P5 (données brutes, tableau croisé masqué, correction). La frappe
dans MathLive ne passe pas par l'automate : validation des réponses laissée aux specs. **Défaut corrigé** : le coin du
tableau croisé s'écrit avec **une** barre oblique inverse (`coin: Sexe \ Régime`, cf. `cross-table.test.ts`) ;
deux affichent « Sexe \\ Régime ». Le modèle de 2de 89e928a4 (en prod, recopié) a ce défaut : signalé à David.
Aperçu fermé, serveur 5179 arrêté, Tailscale :443/:8443 retirés.

### Lot 6 — fichiers mergés (2026-11-18)

PR #2856 mergée (CI verte : 7 réussis, 7 ignorés). Usage de 97b3a376 mesuré (MCP) : 0 carte, 0 tentative, 0 évaluation,
0 réponse de test, 0 activité de cahier de texte ; sur 1TECHNO-137 : 0 entrée de cahier de texte, 0 état de point,
0 exercice, 0 automatisme. Le retrait ne coupe rien à personne.

### Lot 6 — brouillons en prod (2026-11-18)

David a lancé `create-questions --publier` depuis le worktree : P1 `699b1aae-eada-468e-af95-25f74aede343`, P2
`ef34cc66-8aac-4e06-8cb0-d6c4acf93997`, P3 `4ccf75c2-eae2-4d85-8045-50bdf26add73`, P4
`b342c534-4dfd-4a37-ba06-0c48e7d50ae2`, P5 `2405ca31-d856-454d-9e1e-682ec371e088` ; brouillons `{1_TECHNO}`, sans nœud
ni tag (vérifié MCP). 97b3a376 inchangé : publié, `{1_SPE,1_TECHNO}`, 2 tags (1SPE-353, 1TECHNO-137).

### Lot 6 — migration de rangement (2026-11-19)

Relevé prod (MCP, 2026-11-19) : P1-P5 brouillons `{1_TECHNO}`, sans nœud ni tag ; 97b3a376 publié `{1_SPE,1_TECHNO}`,
rangé sur 4e871e12 (nœud de 1SPE-353 et 1TECHNO-137), tags 1SPE-353 + 1TECHNO-137. Migration
`20261119052352_questions_1techno_lot6_rangement_tags` (gabarit du lot 2, sans point 1GEN) : (A) 5 brouillons rangés
sur le nœud de leur point, 5 tags (090, 097, 136, 137, 013) ; (B) 97b3a376 perd 1TECHNO-137 et `1_TECHNO`. Test
`questions-1techno-lot6-rangement-tags.test.ts` : corps vidé → 7 rouges et le bloc nominal ne démarre pas ; migration
rendue → 14 verts.
`security-auditor` : aucun bloquant. Faible (hérité du gabarit) : la garde du rollback ne vérifiait pas que les 5 sont
encore des brouillons (un P4 publié aurait perdu son nœud et son tag) → garde ajoutée, test de plus : 15 verts.
Info : 1TECHNO-137 sans modèle publié de 1re techno tant que P4 n'est pas publié.

### Lot 6 — migré, page à cocher (2026-11-19)

PR #2861 mergée (go de David sur la partie destructive ; CI verte, `check:migrations --pr 2861` OK). `migration list
--linked` : seule `20261119052352` en attente → `db:migrate`. Vérifié MCP : P1-P5 brouillons `{1_TECHNO}` sur le nœud de
leur point, tag 090, 097, 136, 137, 013 ; 97b3a376 publié `{1_SPE}`, seul tag 1SPE-353, nœud inchangé ; `updated_at`
inchangés. Page à cocher (`db`, collection `verdicts`) : https://claude.ai/artifact/Suw63yXmSoVJwy2NTCfS9Y

### Lot 6 — publié (2026-11-19)

Verdicts P1-P5 : 5 « ok » sur 5, sans commentaire. David a lancé `publier-lot.ts` (simulation puis `--publier`).
Vérifié MCP : les 5 `published`. **Lot 6 clos ; découpage du § 23 terminé.**
Relevé prod (2026-11-19) : 117 points STMG, 3 sans modèle publié — 012, 143 (Q8) et 042 (c90fa022 brouillon,
`{1_SPE,1_TECHNO,1_GEN}`, créé le 2026-10-01, jamais publié).

## 32. Clôture (2026-11-19)

- Découpage du § 23 recompté contre les PR : lots 1 (#2779, #2783), 2 (#2787, #2796), 3 (#2801, #2805), 4 (#2833,
  #2836), 5 (#2843, #2844), 6 (#2856, #2861) mergés ; avant lui T1 (#2743), T2 (#2748), lot 0 (#2753), G (#2758),
  83b1f614 (#2764), R (#2772).
- c90fa022 (042) : relu (3 variations, corrigés justes, specs), publié par David (`publier-lot.ts` sur un export du
  modèle). Vérifié MCP : `published`.
- Relevé MCP : 117 points STMG actifs, 115 avec un modèle publié ; 012 et 143 sans modèle (Q8). 151 modèles publiés
  contenant `1_TECHNO` (27 de 1re techno seule). Brouillon restant : 0495289a (D11 de questions-1spe).
- Défaut signalé au lot 6 sur 89e928a4 (coin du tableau croisé) : relu en prod, une seule barre oblique, comme P5 ;
  rien à corriger.
- questions-1gen, clos le 2026-11-18, n'est plus à prévenir des communs du lot 5 (sa couverture les cite déjà).
- Commentaires des tests d'intégration et des migrations laissés sur l'ancien chemin du journal (comme questions-1gen).
