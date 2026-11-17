# Chantier « questions-1techno » — couvrir la 1re STMG en modèles de questions

> Démarche : [couvrir-un-niveau.md](../pratiques/couvrir-un-niveau.md) (skill `couvrir-niveau`).
> Bornes : `docs/systeme/programmes/bornes/lycee/1techno.md` (décisions l1t-1 à l1t-8). En base, la
> 1re STMG n'a pas de niveau propre : c'est le programme commun de 1re technologique, niveau `1_TECHNO`
> (points `1TECHNO-*`). Pour la STMG, tout ce programme **sauf** la rubrique « Activités géométriques
> (série STD2A) » (26 points).

## Reprendre ici

_Mis à jour le 2026-11-17, après #2758 (lot G en prod)._

- **État** : T1, T2, lot 0, **lot G** en prod (#2743, #2748, #2753, #2758). Lot G : 0b5c3db6 → 036, c4887e49 → 038,
  569e0140 → 049, `{1_GEN,1_TECHNO}`, vérifié en prod (§ 17).
- **Prochaine action** : 83b1f614 v3 (Q4 bis (a) : « x = p est racine évidente » au corrigé ; prévenir questions-1gen
  avant) ; puis lots d'écriture (§ 5, 9). Lot 2 commun de questions-1gen (R2 → 044, R3 → 117, R4 → 119) : attendre
  leurs ids, puis page à cocher + migration (§ 18).
- **En attente de David** : rien.
- **Pièges en cours** : un point par programme (trigger) ; `grades` en `array_append`/`array_remove` seulement ;
  worktree neuf → `pnpm exec svelte-kit sync` avant un script `tsx` ; export prod : `env $(grep … .env)` (sinon
  `.env.local` = base locale) ; commitlint refuse « T1 » en début de sujet ; CI : le cliquet peut être coupé à 20 min.
- **Worktree / branche** : aucun (lot G nettoyé).

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
