# Automatismes de 1re — point de reprise

> Mis à jour le 2026-09-28. Pour reprendre dans une nouvelle session : lire ce fichier, puis
> [ADR 0011](../adr/0011-fiche-d-automatismes-figee-par-graine.md) et
> [`docs/pratiques/fiches-exercices.md`](../pratiques/fiches-exercices.md) § 2 bis.

## Reprendre ici

_Mis à jour le 2026-11-06, PR du rangement du modèle neuf ouverte._

- **État** : modèle neuf `0f673c27` et fiche `5210e1d7` écrits par David (brouillons) ; fiche
  vérifiée depuis la base (1 + 1 + 3 p., 0 débord) ; PR #2416 : `id` dans le JSON + migration
  nœud/point (2-328, validés) + 6 exceptions de la garde des niveaux (décision du 2026-11-06) ;
  `security-auditor` : 0 bloquant · **Prochaine action** : CI verte → merge → `db:migrate` depuis
  la branche mergée ; vérifier en prod nœud, tag, `updated_at` ET `tgenabled = 'O'` du trigger
  `update_question_templates_updated_at` ; puis David peut publier (`publier-lot.ts`) ·
  **En attente de David** : publication des brouillons ; questions ouvertes 1 à 4 · **Pièges en
  cours** : écritures en prod lancées par David ; worktree neuf → `pnpm exec svelte-kit sync`
  avant `pnpm tsx` ; job CI navigateur 2/2 qui plante → `gh run rerun --failed` ·
  **Worktree / branche** : `../ubumaths-wt-automatismes-1spe`,
  `feat/automatismes-1spe-rangement-affine`.
- Brouillons à publier : `0f673c27`, `f5585668`, `95ee57c8`, `5397c20f`, `7f82d15a`, `1c86d122`,
  `9852d62c` (+ `1bd7378d`, `9a9026fc`) ; fiches `5210e1d7`, `9217dfaa`, `0f98be04`, `7ff081db`,
  `d37413a3`, `84b512df`. Hors chantier : 18 fiches de 1re spé en brouillon depuis septembre.

## Décisions de David (figées)

- Les **automatismes** de 1re (partie « Automatismes » du nouveau programme) passent par le
  **système de questions** (modèles paramétrés, corrigés automatiquement, Automaths), puis on en
  tire des fiches.
- Fiche = exercices ordinaires (« séries ») faits d'**instances figées par une graine** : même copie
  pour toute la classe. Lien vivant (une copie par élève) écarté. → ADR 0011.
- Une série par exercice (≈ 8 questions), ≈ 2 séries par fiche ; script versionné d'abord, bouton
  dans l'application plus tard si l'usage le justifie.
- Les modèles d'autres niveaux (seconde) sont **réutilisés tels quels** : on n'ajoute pas `1_SPE` à
  leurs `grades` (un niveau accède déjà aux niveaux inférieurs ; Automaths ne filtre pas par niveau).
- Rangement : thème d'exercices « Automatismes », fiches « Automatismes : <sujet> (n) ».
- Tout est créé en **brouillon** : David publie (questions comme fiches).

## Fait (pilote « évolutions », PR #508)

| Élément                                                                                                                        | Où                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `buildSerie` (instances → énoncé à pointillés / corrigé, réponses en gras) + 14 tests                                          | `src/lib/worksheets/serie-automatismes.ts`                                                                        |
| Création de modèles neufs en brouillon (`checkTemplate` obligatoire, `--mettre-a-jour`)                                        | `scripts/create-questions.ts`                                                                                     |
| 5 modèles « évolutions » de 1re (70 specs), niveaux 7-11 de Proportionnalité › Pourcentages › Variations                       | `scripts/questions/evolutions-1spe/*.json` (en base : `c4372fd8`, `1c443c35`, `bbd511cb`, `36abc642`, `8b59ca4b`) |
| Fiche « Automatismes : évolutions (1) », 2 séries de 8 (+ 4 modèles de seconde `e12e58cb`, `d98aa53a`, `2562438e`, `e05bb79b`) | `scripts/create-automatismes-evolutions-1spe.ts` ; fiche `9217dfaa`                                               |

Vérifié : `pnpm question:specs` vert pour les 5 modèles, réponses recalculées indépendamment ;
fiche régénérée depuis la base, compilée par le compilateur de prod, 0 débord, pages relues.

## Lot « Droites » — phase 0 (2026-11-03)

Relevé en prod, séries essayées par `buildSerie` (lecture seule, 3 graines par modèle) :

| Capacité (BO 1re, Automatismes)                     | Modèles                                                                                                                                | Série                                             |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Coefficient directeur par deux points               | `7d6cf480` (déjà 1re)                                                                                                                  | ✅                                                |
| Lire graphiquement l'équation réduite               | aucun ; lectures séparées `f381c646` (pente), `c64028b0` (ordonnée à l'origine), `0d0e88f5`, `b9771108` (coef. entier / fractionnaire) | ✅                                                |
| Tracer (équation réduite ; point + coef. directeur) | `8d4bd94d`, `dc5d7cb6`                                                                                                                 | ❌ « 0 case pour 1 réponse » : `tracer:` non figé |
| Entretien seconde                                   | `49df6491`, `7f308eb4`, `c23f5a94`, `336451af`, `e6552232`, `6e074f0e`                                                                 | ✅                                                |

Écartés : `09f0c9ec`, `ae0ad163` (image PNG fixe parmi 30 ; préférer les `courbe`).

**Tranché par David (2026-11-03)** : (1) apprendre à `buildSerie` à figer une droite à
tracer (énoncé : repère vide ; corrigé : droite tracée) ; (2) modèle neuf « lire l'équation
réduite sur un graphique », en brouillon.

### Fait (PR du lot « Droites », 2026-11-03)

- `droitesATracer` dans `src/lib/worksheets/serie-automatismes.ts` + 9 tests
  (`serie-automatismes-tracer.test.ts`) ; le PDF ne posait jamais `solved` hors des tests, d'où la
  réécriture du bloc dans le corrigé.
- `scripts/questions/droites-1spe/01-lire-equation-reduite.json` (11 specs, 100 tirages) → `f5585668`.
- `scripts/create-automatismes-droites-1spe.ts` : série 1 = pente par deux points, pente sur équation,
  tracer (réduite), pente lue, lire l'équation réduite, équation réduite, tracer (point + pente),
  parallèles ; série 2 = pente par deux points, lire l'équation (×2), équation par point + pente,
  tracer (point + pente), équation par deux points, tracer (réduite), parallèles (m à trouver).
  Graines changées : pente lue 1 → 5 (même droite que le tracé), pente par deux points 4 → 12
  (« a-t-elle une pente ? »).

### Fiche « Automatismes : droites (1) » écrite (2026-11-03)

Fiche `0f98be04` (brouillon, 2 séries) écrite par David. Vérifiée (`regen-depuis-base.ts`,
`compile-prod.mjs`, avec **`--polices-corrige` pour le corrigé**, sinon « current font does not support
math » ; `debord.py`) : fiche 2 p., réponses 1 p., corrigé 4 p., 0 débord ; repères vides à l'énoncé,
droite verte au corrigé.

⚠️ **Défaut trouvé, antérieur au lot** : au corrigé PDF, les réponses en gras (`\mathbf` → `bold()`
Typst) s'affichent en **carrés vides** : la police du corrigé (Chiphre Math) n'a pas les chiffres gras
mathématiques. Touche aussi la fiche « évolutions » `9217dfaa` (vérifié), donc toute série figée.
L'écran (KaTeX) n'est pas touché. Corrigé par #2337 (gras ajouté à la police, choix de David).

## Lot « Lectures graphiques » — phase 0 (2026-11-03)

Capacités (BO 1re, Automatismes, « Fonctions et représentations ») : résoudre graphiquement
$f(x) = k$, $f(x) < k$ ; déterminer graphiquement le signe d'une fonction ou son tableau de
variations. Entretien de 2de : images et antécédents. Relevé en prod (modèles à ` ```courbe ` ou
` ```variation `), séries essayées par `buildSerie` (lecture seule, graines 1-3) : **les 29 candidats
passent** (✅ ci-dessous).

| Capacité                               | Modèles (courbe quelconque d'abord)                                                                                                                                                                     | Manque                                               |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Images (2de)                           | `cc88ebd3`                                                                                                                                                                                              | —                                                    |
| $f(x) = k$ / antécédents               | `17809937` (courbe quelconque) ; `406fd9a8` ($f = g$) ; références : `9c4f6b4f` x², `98892db9` x³, `60207cfd` 1/x, `1ac09759` √x, `b807cc6c` \|x\| ; `eb04ebf7` (linéaire, 3e)                          | —                                                    |
| $f(x) < k$                             | `a55ad3b4` (affine), `77500c81` (linéaire), `7efd2e76` ($f < g$), `33dffa7a` v2 ($f \geqslant 0$) ; références : `08c059b8`, `52e58bd6`, `2d4c0b35`, `a371b402`, `cbf00ce7`                             | **$f(x) < k$ sur une courbe quelconque, $k \neq 0$** |
| Signe lu sur la courbe                 | `33dffa7a` (signe sur un intervalle en choix, $f \geqslant 0$, tableau de signes **en choix**)                                                                                                          | tableau de signes **à compléter** (outil existant)   |
| Tableau de variations lu sur la courbe | `3810a06c` v0 (courbe → quel tableau ?, **parabole** seulement ; v1 : tableau → quelle courbe ?), `93bc8b5e` (croissante sur un intervalle ?), `39154ac5` (extremums), `275cb665` (comparer des images) | **courbe → tableau de variations** : aucun modèle    |

**Tranché par David (2026-11-03)** : 3 modèles neufs, en brouillon — (1) $f(x) < k$ (et $\leqslant$,
$>$, $\geqslant$) sur une courbe quelconque, $k \neq 0$ ; (2) « courbe → quel tableau de variations ? »
en choix multiple (l'inverse de `3810a06c`), le geste « tableau de variations à compléter » passé à
`outils-manquants.md` ; (3) tableau de signes à compléter, lu sur la courbe.

Aucun modèle ne fait compléter un tableau à partir d'une courbe (seuls `f0163416`, `9c7ab1c7`, de 2de,
sans courbe, ont des cellules cachées). Le parseur **refuse `?` dans une ligne `variation:`**
(`docs/systeme/ubumark.md`, « Cellules cachées ») : un tableau de variations à compléter est un geste
neuf ; un tableau de signes à compléter se fait déjà (`buildSerie` le fige, lot `tableau-signes`).

### Fait (PR #2344 du lot « Lectures graphiques », 2026-11-03)

- ⚠️ Correction du relevé : `3810a06c` (2de) a déjà une variante « courbe → quel tableau ? », mais
  sur une parabole (une bosse, 2 flèches) ; le modèle neuf (3) prend une cubique à deux extremums
  (3 flèches).
- `scripts/questions/lectures-graphiques-1spe/` → brouillons en prod :
  `95ee57c8` « Résoudre graphiquement une inéquation f(x) < k sur une courbe » (cubique
  $k + a(x-r)(x-s)(x-t)/4$, v0 sans la droite $y = k$, v1 avec ; 8 specs, 100 tirages) ;
  `5397c20f` « Dresser le tableau de signes d'une fonction lu sur sa courbe » (cubique 3 zéros /
  parabole 2 zéros ; 9 specs) ; `7f82d15a` « Dresser le tableau de variations d'une fonction lu sur
  sa courbe » (cubique $(u^3 - 12u)/4$, 4 tableaux : juste, flèches inversées, une flèche, dernier
  changement oublié ; 5 specs). Les 3 passent `buildSerie` (12 graines chacun).
- `scripts/create-automatismes-lectures-graphiques-1spe.ts` : série 1 = image, antécédents,
  f < k (droite tracée), f ⩾ 0 (`33dffa7a`), tableau de signes (cubique), extremums, tableau de
  variations, f = g ; série 2 = image, antécédents, sens de variation, f < k (sans droite), tableau de
  signes (parabole), f ⩽ g, tableau de variations, x² > k. Graines changées hors cas limites :
  antécédents 2 → 15 (S = ∅), x² < k 1 → 7 (S = ℝ ; ce modèle tombe sur ∅ ou ℝ 8 fois sur 15).
- ⚠️ **Défaut relevé, antérieur au lot** : au corrigé d'une série, la réponse en gras d'un ensemble
  fini s'écrit `{−3}∪{−1}∪{1}` (forme normalisée de l'attendu) au lieu de `{−3 ; −1 ; 1}` ;
  touche `17809937`, `406fd9a8`. L'étape de correction juste en dessous l'écrit bien.

### Fiche « Automatismes : lectures graphiques (1) » écrite (2026-11-03)

- Avant la fiche, choix de David : l'ensemble fini du corrigé s'écrit `{−3 ; −1 ; 1}` et non
  `{−3}∪{−1}∪{1}` (#2350, `expectedIntervalsLatex` : singletons consécutifs regroupés ; touche aussi
  le corrigé et le flash back de l'appli).
- Fiche `7ff081db` (brouillon, 2 séries de 8) écrite sur demande de David. Vérifiée
  (`regen-depuis-base.ts`, `compile-prod.mjs`, `--polices-corrige` pour le corrigé, `debord.py`) :
  fiche 5 p., réponses 1 p., corrigé 7 p., 0 débord ; tableau de signes vide à l'énoncé, rempli au
  corrigé ; `S = {−3 ; −1 ; 1}` au corrigé.

## Lot « Statistiques » — phase 0 (2026-11-04)

Capacités (BO 1re, Automatismes, « Statistiques ») : (A) lire un graphique, un histogramme, un
diagramme en barres ou circulaire, une boîte à moustaches (repérer l'origine du repère, les unités
de graduation, les échelles) ; (B) passer du graphique aux données **et vice-versa** ; (C) calculer
et interpréter des indicateurs. Entretien de 2de : moyenne, médiane, quartiles (données brutes,
regroupées, graphiques), comparer avec des boîtes. Le BO de 1re a aussi un bloc « Probabilités »
(P_A(B) sur tableau croisé ou arbre ; distinguer P(A ∩ B), P_A(B), P_B(A)), absent de § Suite.

Relevé en prod (⚠️ l'API plafonne à 1 000 lignes : relevé fait page par page, 2 078 modèles), séries
essayées par `buildSerie` (lecture seule, graines 1-3) : **35 candidats, 34 passent**.

| Capacité                             | Modèles                                                                                                                                                                                                                        | Manque                                                                   |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| (A) Lire un graphique                | 2de : `7ca1d2da` histogramme, `7a56029d` polygone des fréquences cumulées, `b73677c8` deux boîtes ; 3e : `1bd7378d` boîte (**brouillon**, lot 8 de `questions-3`), `96992ea8`/`acaa7317` (barres) ; 5e : `86e43598` circulaire | **origine, graduations, échelle** (axe qui ne part pas de 0)             |
| (B) Graphique → données              | les mêmes (effectifs lus, total, pourcentage → effectif)                                                                                                                                                                       | —                                                                        |
| (B) Données → graphique              | `9a9026fc` construire une boîte (**brouillon**, 3e) : ❌ « 0 case pour 5 réponses » (`placer:` non figé)                                                                                                                       | figer `placer:` ; aucun « angle d'un secteur », aucun choix de diagramme |
| (C) Moyenne                          | 2de : `ba0925ce` linéarité, `a4de4154` ajout/retrait, `03d8f171` moyennes des classes, `90e2e7d8` regroupée ; 4e-5e : `c2497d96` pondérée (barres), `c73289f0`, `087c7c9c`                                                     | —                                                                        |
| (C) Médiane, quartiles               | 2de : `3c411c3b` ajout/retrait, `b7c71958` classe médiane, `8d94fd69` médiane estimée, `82ba1365` interpréter un quartile ; 3e : `96992ea8`, `acaa7317`, `6acde723` effectifs cumulés ; 4e : `b2908d52`                        | —                                                                        |
| (C) Écart type, comparer             | 2de : `ef92701a` écart type (calcul ou choix), `893eb3cd` moyenne + écart type, `6b2b7055` médiane + écart interquartile ; 4e : `3afa8d97`, `7bb351d0`, `4604b429` étendue                                                     | —                                                                        |
| Fréquences conditionnelles (§ Suite) | 2de : `eb0dcd85`, `89e928a4`, `ba16b4f4`, `ed96107e`, `b6ab5599`, `d64946e4`, `62105594` (tableaux croisés)                                                                                                                    | —                                                                        |

**Tranché par David (2026-11-04)**, sur mes recommandations : (1) `buildSerie` fige une boîte à
placer (énoncé : axe seul ; corrigé : boîte dessinée) ; (2) modèle neuf « échelle d'un graphique »
(axe qui ne part pas de 0 : lecture juste, comparaison trompeuse) ; (3) modèle neuf « angle d'un
secteur circulaire » (données → graphique) ; (4) bloc « Probabilités » : lot à part, après celui-ci.
Fiche : 2 séries de 8 — série 1 = histogramme, circulaire, boîte à lire, moyenne regroupée, médiane,
écart type, fréquence conditionnelle, échelle ; série 2 = fréquences cumulées, deux boîtes,
construire une boîte, linéarité de la moyenne, quartile, comparer deux séries, fréquence marginale,
angle d'un secteur. Les brouillons `1bd7378d`, `9a9026fc` (lot 8 de `questions-3`) y servent tels
quels.

### Fait (PR du lot « Statistiques », 2026-11-04)

- `boitesAConstruire` dans `src/lib/worksheets/serie-automatismes.ts` + 7 tests
  (`serie-automatismes-boite.test.ts`) : `9a9026fc` passe désormais (3 graines).
- `scripts/questions/statistiques-1spe/` → brouillons : `1c86d122` « Lire un graphique dont l'axe ne
  part pas de 0 » (nuage sans `origine:`, l'axe se cale sur les données : 100 → 110 sur un axe qui part
  de 98 ; v0 choix « +10 % / × 6 / doublé / rien à dire », v1 case du pourcentage ; seules les 6
  combinaisons (v, t) dont toutes les valeurs tombent sur une graduation, 9 specs) ; `9852d62c`
  « Angle d'un secteur d'un diagramme circulaire » (v0 effectifs → angle, v1 angle → effectif, corrigé
  avec `étiquettes: angles` ; 7 specs). Le bloc `barres` refuse exprès un axe qui ne part pas de 0.
- `scripts/create-automatismes-statistiques-1spe.ts` : séries de la phase 0 ; graines changées :
  fréquence conditionnelle 1 → 5 (4/5 et non 8/67), axe tronqué 1 → 7 (variante choix), angle 1 → 12
  (données → angle).

## Lot « Probabilités » — phase 0 (2026-11-04)

Capacités (BO 1re, Automatismes, « Probabilités ») : (A) calculer des probabilités conditionnelles
quand les évènements sont présentés en **tableau croisé d'effectifs** ou en **arbre pondéré** ;
(B) distinguer $P(A \cap B)$, $P_A(B)$, $P_B(A)$. Le cours de 1re (indépendance, probabilités
totales, Bernoulli n ⩽ 4, variables aléatoires) n'est pas un automatisme : hors lot.

Relevé en prod (titres, puis `buildSerie` en lecture seule, graines 1-3) : **28 candidats, 28
passent**. Aucun modèle neuf nécessaire.

| Capacité                         | Modèles                                                                                                                                                                                                             |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| (A) Tableau croisé               | 2de : `23ceafb0` construire, `89e928a4` compléter (effectifs), `b6ab5599` compléter (fréquence cond.), `eb0dcd85` lire, `cf548ea1` intersection, `4016b05c` sachant A, `f3e68e4b` A sachant B                       |
| (A) Arbre pondéré                | 2de : `b28f4a68` construire, `9d7c4d98` compléter une branche, `1cfc575d` chemin, `d7507e78` conditionnelle ; 1re : `6dd2f133` construire depuis un énoncé, `5ba712bc` probabilités totales, `69a05f98` « inverse » |
| (B) Distinguer ∩, P_A(B), P_B(A) | 2de : `31096bae` traduire un énoncé en notations (4 variantes, choix), `77d6fedc` « Parmi les… », `ba16b4f4` reconnaître une fréquence conditionnelle                                                               |

**Validé par David (2026-11-04)** : 2 séries de 8 — série 1 (tableaux croisés) = construire, compléter
(effectifs), lire, intersection, sachant A, A sachant B, compléter avec une fréquence conditionnelle,
notations (« et ») ; série 2 (arbres) = construire, compléter une branche, chemin, conditionnelle,
probabilités totales, « inverse », « Parmi les… », notations (« sachant »).

### Fait (PR du lot « Probabilités », 2026-11-04)

- `scripts/create-automatismes-probabilites-1spe.ts` : 15 modèles, fiche « Automatismes :
  probabilités (1) ». Graines : à graine égale, les modèles d'une même famille tirent les **mêmes
  données** (lire / compléter un tableau ; chemin / totales / inverse sur l'arbre) — la graine 1
  partout donnait deux fois le même tableau (la question 3 livrait les réponses de la 2) et trois
  fois le même arbre. Retenues : lire le tableau 4, chemin 2, totales 4, « inverse » 5 ; notations
  7 (« et ») et 1 (« sachant »).
- Rendu vérifié AVANT écriture (séries de la simulation → `pnpm fiche:verifier`) : fiche 3 p.,
  corrigé 5 p., 0 débord, pages relues. Q8 de la série 2 coupée entre deux colonnes (mise en page
  du générateur, acceptable).
- **Écrit en prod par David (2026-11-05)** : fiche `84b512df` « Automatismes : probabilités (1) »,
  brouillon. Vérifiée depuis la base (`regen-depuis-base.ts`, `compile-prod.mjs`, `--polices-corrige`,
  `debord.py`) : fiche 3 p., réponses 1 p., corrigé 5 p., 0 débord, pages relues.

## Lot « Calcul numérique et algébrique » — phase 0 (2026-11-05)

Capacités (BO 1re, Automatismes, « Calcul numérique et algébrique ») : (A) solutions d'une
équation produit nul ; (B) signe d'une expression du premier degré, d'une expression factorisée du
second degré ; (C) développer, factoriser, réduire une expression algébrique simple.

Relevé en prod (titres), puis `buildSerie` en lecture seule (graines 1-3) : **40 candidats, 20
passaient**. Les 20 refusés (tout le calcul littéral : développer, factoriser, réduire) suivent la
convention `<<expr:NOM>>` (l'écran ajoute « = case » après l'expression, `answerFormat`) : 0 case
vue pour 1 réponse. **Correctif dans `buildSerie`** (`deplierExpressions`, branche
`feat/automatismes-1spe-calcul`, non commité) : énoncé « (y+1)² = …… », corrigé « = **y² + 2y + 1** »
→ **40/40 passent**.

| Capacité                       | Modèles retenus (candidats)                                                                                                                                                                                                           | Manque                                                      |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| (A) Produit nul                | 2de `bb3b8e76` (ax+b)(cx+d) = 0 ; 3e `2ab49a6f` x(ax+b) = 0 ; (2de `d80a7d42` avec un tableau)                                                                                                                                        | —                                                           |
| (B) Signe, 1er degré           | 2de `f0163416` tableau d'un produit (graine 1 : −5(x−6)) ; (`bba95c2d` choix entre images PNG : non imprimable a priori ; `4cc21ccd`/`c7cdca01` « x positif, x + 2 ? » : 1 seul tirage)                                               | **tableau de signes de ax + b** seul (pas de modèle direct) |
| (B) Signe, 2nd degré factorisé | 2de `6bb5ff09` signe d'un produit sans tableau, `71174c9c` A(x) > 0 avec un tableau ; 1re `afe51ac4` inéquation sur a(x−x₁)(x−x₂), `b48d72dd` signe de k(x−a)²                                                                        | —                                                           |
| (C) Réduire                    | 2de `33eb676e` ; 3e `77b82211` somme, `93a5f7a9` produit                                                                                                                                                                              | —                                                           |
| (C) Développer                 | 4e `54107079`, `32a81f6f` ; 3e `9fefb94c`, `1703620c` double produit, `32cf5766`, `a6a6c491` (a+b)(a−b), `18e2afca` ; 2de `288c2bf0`, `85f6e96e` (a+b)², `6909bfde`, `1338da34` (a−b)² ; 1re `45e47034` forme canonique ou factorisée | —                                                           |
| (C) Factoriser                 | 4e `d7f2568a`, `11607586`, `dac2e771`, `2120ce5f` facteur commun simple ; 3e `dcaabf69` facteur commun (expression), `ff8082bd`, `ff9bb2fb` a² − b² ; 2de `d1648508` carré parfait ; 1re `604f83b7` à l'aide des racines              | —                                                           |

**David (2026-11-05) : « je te suis »** sur mes trois recommandations — (1) correctif `<<expr:…>>`
gardé, avec tests et revue ; (2) modèle neuf « tableau de signes de ax + b » ; (3) séries
proposées.

### Fait (PR du lot « Calcul », 2026-11-05)

- `deplierExpressions` dans `src/lib/worksheets/serie-automatismes.ts` + 3 tests
  (`serie-automatismes-expression.test.ts`, rouges sans le correctif) : une expression qui porte
  déjà ses cases n'est pas augmentée (même règle que l'écran, `hasPrompts`).
- **Défaut du générateur Typst trouvé à la vérification** : `\textcolor{…}{(x+3)}(4x-2)` donnait
  `#text(…)[$(x+3)$](4x-2)`, lu par Typst comme un appel (« invalid number suffix: x ») — tout le
  corrigé échouait (correction de `dcaabf69`, et toute correction de cette forme). Correctif : `;`
  après le bloc (`<<<CONTENT_R>>>` → `];`, `\textcolor` et `\boxed`), consommé par Typst en math
  comme en texte et dans les arguments (`bold`, `frac`, `sqrt`), vérifié au compilateur de la prod ;
  test de régression rouge sans le correctif, 7 attentes mises à jour.
- Modèle neuf `scripts/questions/calcul-1spe/01-tableau-signes-affine.json` (ax + b ; b + ax avec
  |a| ⩾ 2 et la constante d'abord), 7 specs vertes, 100/100 tirages.
- `scripts/create-automatismes-calcul-1spe.ts` : lit le modèle neuf dans son fichier tant qu'il
  n'est pas en base (simulation seulement) ; `--sortie <dossier>` écrit les séries pour
  `pnpm fiche:verifier` AVANT toute écriture. Graines : tableau d'un produit 1 → 2 (la graine 1
  donnait −5(x − 6), même tableau que 30 − 5x en Q3), carré parfait 1 → 2 (x² + 6x + 9).
  Q6 de la série 2 : `dcaabf69` remplacé par `11607586` (facteur commun numérique) — la correction
  de `dcaabf69` tient sur une ligne qui déborde de la colonne au corrigé.
- Rendu vérifié en simulation : fiche 1 p., corrigé 3 p., 0 débord, pages relues.
- **À lancer par David, dans l'ordre** : `pnpm tsx scripts/create-questions.ts --dir
scripts/questions/calcul-1spe --publier` (écrit l'`id` dans le fichier, à commiter) ; puis
  `pnpm tsx scripts/create-automatismes-calcul-1spe.ts --publier`. Ensuite : rangement du modèle
  neuf (nœud + tag, migration, comme #2390).

## Questions ouvertes (à poser à David)

1. **Collision de vocabulaire « série ».** `CONTEXT.md` définit désormais **Série** = exercice de
   fiche fait d'instances figées (ADR 0011). Mais la spec en attente
   [`series-de-questions-dans-un-chapitre-spec.md`](../archive/wip/series-de-questions-dans-un-chapitre-spec.md)
   (2026-09-14) appelle « série » une évaluation interactive (`assessments`). Deux sens pour un même
   mot : faire trancher lequel garde « série » et renommer l'autre (puis corriger `CONTEXT.md`).
2. **Modèle 5 (évolution répétée)** : `(1+0{,}03)^5`, `(103/100)^5` sont jugés `bad_form` (calcul
   non effectué). `requiredForm: "power"` les accepterait mais refuserait les décimaux exacts
   (`1{,}159\,274\,074\,3`). Quelle écriture privilégier ?
3. **Bug du moteur** : `==` ne fonctionne pas dans les `conditions` d'un modèle (`!=` oui) —
   contourné dans le modèle 4 ; à corriger ?
4. Séries 1 q7 (−40 % puis +10 %) et 2 q8 (+10 % puis −40 %) ont la même réponse — gardées pour
   montrer que l'ordre ne compte pas ; changer une graine si David préfère.

## Suite

Même démarche (§ 2 bis du guide) pour les autres automatismes du programme de 1re :

1. **Droites** : coefficient directeur (deux points, lecture), ordonnée à l'origine, équation
   réduite, droites parallèles — réutiliser les modèles de seconde « Déterminer le coefficient
   directeur », « Déterminer l'ordonnée à l'origine » (à retrouver en base).
2. **Lectures graphiques** : image, antécédents, signe, variations, résolution graphique
   d'équations et d'inéquations (demande des figures : vérifier ce que le moteur de questions sait
   afficher avant de rédiger).
3. **Statistiques** : moyenne, médiane, écart type, fréquences conditionnelles.

Pour chaque lot : phase 0 (liste des modèles, validation par David), modèles JSON + specs,
`question:specs`, `create-questions.ts`, fiche par séries, vérification PDF, PR.

## Rangement des 6 brouillons « Non rangés » (2026-11-05)

Depuis la v0.73.0, les 6 brouillons n'avaient ni nœud ni point. Nœuds proposés par `automaths-arbre`,
vérifiés en prod (MCP) ; points pris parmi ceux rattachés aux automatismes de 1re
(`curriculum_point_automatismes`), sur le nœud même du modèle. **Validé par David (2026-11-05)**, y
compris la question d'accès : personne ne gagne ni ne perd d'accès.

| Modèle                              | Nœud                                                                          | Point                                                                               |
| ----------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `f5585668` équation réduite lue     | Géométrie › Géométrie repérée › équations de droites                          | 2-314 (le point 1re « Lire graphiquement l'équation réduite » n'existe pas en base) |
| `95ee57c8` inéquation f(x) < k      | Fonctions › Généralités sur les fonctions › équations et inéquations f(x) = k | 2-448                                                                               |
| `5397c20f` tableau de signes        | Fonctions › Généralités sur les fonctions › signe                             | 1SPE-432                                                                            |
| `7f82d15a` tableau de variations    | Fonctions › Généralités sur les fonctions › variations                        | 2-349                                                                               |
| `1c86d122` axe qui ne part pas de 0 | Statistiques › Représenter des données › courbes et repères                   | 5-135                                                                               |
| `9852d62c` angle d'un secteur       | Statistiques › Représenter des données › diagrammes circulaires               | 5-113                                                                               |

Migration `20261105055721_automatismes_1spe_rangement_tags.sql` (forme du lot 12 b-1 de 2de, colonne
`grade` en plus), test `tests/integration/automatismes-1spe-rangement-tags.test.ts` : 5 rouges sur 10
sans la migration (corps retiré), 10 verts avec.

Mergée (#2390, CI verte) ; `db:migrate` le 2026-11-05 depuis la branche mergée : seule cette migration
appliquée (dry-run), les 6 modèles vérifiés en prod (nœud, point, brouillon, `updated_at` préservé).

## Fiche « Automatismes : calcul algébrique (1) » et rangement du modèle neuf (2026-11-06)

- David a lancé les deux écritures le 2026-11-05 : modèle `0f673c27` (brouillon) puis fiche
  `5210e1d7` (brouillon, 2 séries). L'`id` n'avait pas été écrit dans le JSON de `main` (script
  lancé depuis une autre copie) : ajouté à la main ; `create-questions.ts` en simulation le dit
  « déjà en base », contenu identique.
- Fiche vérifiée depuis la base (`regen-depuis-base.ts`, `compile-prod.mjs`, `--polices-corrige`,
  `debord.py`) : fiche 1 p., réponses 1 p., corrigé 3 p., 6 PDF, 0 débord, pages FR relues, maths
  justes. Deux coupures disgracieuses au corrigé, non bloquantes : série 1 Q1 « … ou 5x − 4 = » / « 0 »,
  série 2 Q1 calcul aligné coupé dans « (1 + 3) × a ».
- Rangement **validé par David (2026-11-06)**, question d'accès comprise (personne ne gagne ni ne
  perd d'accès) : `0f673c27` → Fonctions › Fonctions affines › variations et signe, point **2-328**
  (rattaché aux automatismes de 1re ; aucun point de 1re sur le signe de ax + b ; même rangement
  que `bba95c2d`). Migration `20261106050038_automatismes_1spe_rangement_affine.sql` (forme de
  #2390), test `tests/integration/automatismes-1spe-rangement-affine.test.ts` : 4 rouges sur 9
  sans le corps, 9 verts avec.
- **Garde des niveaux des tags — décision de David (2026-11-06) : exceptions.** Les 6 automatismes
  de 1re tagués d'un point de 2de ou de 5e (`0f673c27`, `1c86d122`, `7f82d15a`, `95ee57c8`,
  `9852d62c`, `f5585668`) gardent leurs seuls niveaux de 1re : inscrits dans `EXCEPTIONS_NIVEAUX`
  (`scripts/lib/niveaux-des-tags.ts`), test mis à jour ; `garde-niveaux-tags.ts` en prod : 0
  niveau manquant, 5 excusés (le 6e après la migration).
- `security-auditor` : 0 bloquant ; à vérifier après `db:migrate` : `tgenabled` du trigger
  `updated_at` revenu à `O`.
