# Automatismes de 1re — point de reprise

> Mis à jour le 2026-09-28. Pour reprendre dans une nouvelle session : lire ce fichier, puis
> [ADR 0011](../adr/0011-fiche-d-automatismes-figee-par-graine.md) et
> [`docs/pratiques/fiches-exercices.md`](../pratiques/fiches-exercices.md) § 2 bis.

## Reprendre ici

_Mis à jour le 2026-11-08, PR de rangement du modèle neuf `23751c95` ouverte._

- **État** : modèle `23751c95` et fiche `f9608ee5` écrits en brouillon par David, fiche vérifiée depuis la
  base ; PR de rangement #2457 (6-106, exception de niveaux, migration `20261108085338`) ouverte ·
  **Prochaine action** : CI verte → merge → `db:migrate` depuis `main` (dry-run d'abord), puis vérifier en
  prod nœud, tag 6-106, brouillon, `updated_at` préservé, `tgenabled = 'O'` ; `garde-niveaux-tags.ts` ·
  **En attente de David** : publication en admin de `f9608ee5`, `9bd4bcc6`, `894f766e` et des 6 fiches de
  1re ; publication des modèles `23751c95` et `c1c9cfc3` (brouillons) · **Pièges en cours** : écritures ET
  simulations contre la prod lancées par David (commande donnée avec `!`) ; `debord.py` ne voit pas une
  équation centrée trop large : relire les pages ; une proportion ne dépasse pas 1 · **Worktree / branche** :
  `../ubumaths-wt-automatismes-1spe`, `content/automatismes-proportions-rangement`.
- Fiches à publier : `f9608ee5`, `9bd4bcc6`, `894f766e`, `5210e1d7`, `9217dfaa`, `0f98be04`, `7ff081db`, `d37413a3`,
  `84b512df`. Hors chantier : 18 fiches de 1re spé en brouillon depuis septembre.

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

## Questions ouvertes — toutes tranchées

1. ~~Collision de vocabulaire « série »~~ — **tranchée le 2026-11-04** ([ADR 0035](../adr/0035-une-serie-enregistre-des-modeles.md),
   `CONTEXT.md`) : **Série** = composition de modèles (répétitions, durée), tirée à neuf à chaque
   usage ; l'exercice d'une fiche d'automatismes est une **série figée** (graine, ADR 0011). Dans
   ce journal, « 2 séries » d'une fiche = 2 séries figées.
2. ~~Écriture de l'évolution répétée (`8b59ca4b`)~~ — **tranchée le 2026-11-06 : on garde.**
   `1{,}03^5` et le décimal exact sont justes ; `(1+0{,}03)^5`, `(103/100)^5` restent `bad_form`
   (« calcul non effectué » : pas faux, l'élève finit 1 + 0,03, l'automatisme visé).
   `requiredForm: "power"` écarté : il refuserait le décimal exact.
3. ~~`==` dans les `conditions`~~ — **déjà corrigé** le 2026-10-02 (`89f6e8df2`, `==` vaut `=`,
   condition illisible = erreur). Le `!=` du modèle 4 reste juste : rien à faire.
4. ~~Séries 1 q7 / 2 q8 de `9217dfaa`, même réponse~~ — **tranchée le 2026-11-06 : on garde**
   (l'ordre des évolutions ne compte pas ; pas de graine changée).

## Suite

Les cinq blocs « Automatismes » du BO de 1re ont leur lot et leur fiche (1) en brouillon :
évolutions (#508), droites et lectures graphiques (« Fonctions et représentations »),
statistiques, probabilités, calcul numérique et algébrique (#2416). **Plus aucun lot du programme
de 1re.** Après la publication par David, choix à lui poser :

- clore le chantier (versement du durable dans `docs/systeme/`, journal archivé) ;
- fiches (2) par bloc (autres graines, autres modèles : entraînement régulier sur l'année) ;
- lots tirés de la liste des automatismes de 2de, à entretenir en 1re (BO).

Démarche d'un lot : phase 0 (liste des modèles, validation par David), modèles JSON + specs,
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
- Mergée (#2416, CI verte) ; `db:push --include-all` le 2026-11-06 depuis `main` (dry-run : seule
  cette migration) ; vérifié en prod : nœud, point 2-328, brouillon, `updated_at` préservé,
  `tgenabled = 'O'`.

## Lots « 2de » : automatismes de seconde entretenus en 1re (2026-11-06)

**Tranché par David (2026-11-06)** : suite du chantier = lots tirés de la liste des automatismes de 2de
(BO 1re : « à entretenir ») ; fiches « Automatismes : <sujet> (n) » attachées aux niveaux **1re et 2de** ;
premier lot « Nombres ». Lots proposés, dans l'ordre : (1) Nombres, (2) Calcul littéral et équations,
(3) Proportions et pourcentages, (4) Géométrie et repérage, (5) Fonctions et probabilités de base.
Évolutions, images et antécédents, statistiques, développer et factoriser : déjà entretenus par les
fiches (1) de 1re.

**Relevé MCP (prod, 2026-11-06)** : `curriculum_point_automatismes` grade `2` = **97 points** (21 de 2de,
le reste du collège et du cycle 3), tous aussi dans la liste de `1_SPE`. **90 ont un modèle publié.** Sans
modèle publié : 5-016, 5-121 (droite graduée), 5-047, 5-128 (repère), 5-096, 5-143 (graphique cartésien) —
lot 4 ; 3-062 (`1bd7378d`, brouillon à publier).

**Essai des séries** : la simulation de `publier-lot.ts` / des scripts de fiche contre la prod est refusée
au mode auto (« Production Deploy »). Démarche suivie : modèles lus par le MCP (`select * from
question_templates`), copie JSON dans le scratchpad, `buildSerie` lancé en local (graines 1-3). Lot
« Nombres » : **45 candidats, 45 passent**. Aucun modèle neuf.

### Lot « Nombres » — phase 0 (validée par David le 2026-11-06)

Capacités du BO 2de (Calcul numérique) : comparer (différence, quotient), fractions, puissances, écritures
décimale / fractionnaire / pourcentage, ordre de grandeur et vraisemblance, conversions d'unités.

- **Série 1** (comparer, fractions, puissances, écritures) : `5ffcde13` différence (2de) · `514dab07`
  comparer deux fractions (5e) · `a270c7aa` enchaîner des fractions (4e) · `8ac99be4` puissances de 10,
  × et ÷ (3e) · `18761148` a^m / a^n (3e) · `81a64b0a` décimal → fraction (6e) · `5d7726eb`
  pourcentage → fraction (6e) · `7deff4e0` ordre de grandeur (6e).
- **Série 2** (rapport, conversions) : `313ae1a2` rapport (2de) · `52516a54` interpréter une différence
  (2de) · `228b1620` fractions de dénominateurs multiples (6e) · `5b627bb7` produit de puissances de 10
  (3e) · `82748db8` aires (6e) · `355bd41a` contenance ↔ volume (5e) · `65c32979` durée décimale → min
  (6e) · `1dd4d0ea` vitesses (4e).
- Écartés (fiche (2) possible) : relatifs `e0b6d00a`, `12e27dba` (trop faciles en lycée) ; masses
  `f4d95001`, longueurs `e22cff99`, `da2e705f` (CE2-CM1) ; 10 autres modèles de durées (voisins) ;
  `1d25a492` (évolution, déjà dans « évolutions (1) ») ; `bb9cff7b`, `1db08bdc`, `743c0809`, `8b213d74`,
  `c1a83c8f`, `000368e1`, `6818662d`, `259a0b26`, `afebbb91`, `7abb09ef`, `b79d4cb7`, `186f05a4`.
- Graines : la graine 1 donne souvent un cas trivial (« 1 dm² = … cm² », « 60 min = … h ») ; graines
  choisies après validation, valeurs non triviales, pas deux questions sur les mêmes données.

### Fait (PR du lot « Nombres », 2026-11-06)

- `scripts/create-automatismes-nombres.ts` (forme de `create-automatismes-probabilites-1spe.ts`) : fiche
  « Automatismes : nombres (1) », séries « Nombres — série 1 / 2 », niveaux `['2', '1_SPE']` (fiche ET
  séries) — **premières fiche et séries à deux niveaux en prod** ; base : contrainte
  `is_valid_grade_array` seule, filtres de l'appli par `overlaps` / `contains`.
- Graines : série 1 = différence 7 (tarifs), fractions 7 (17/18, 8/9), enchaîner 4 (somme négative),
  puissances de 10 7, a^m/a^n 5 (7⁻⁴/7²), décimal 11 (0,6), pourcentage 10 (75 %), ordre de grandeur 8 ;
  série 2 = rapport 7 (immeubles), interpréter une différence 7 (salaires), dénominateurs multiples 7
  (5/4, 16/12), produit de puissances de 10 4, aires 8 (6 dm² → m²), contenances 4 (3 L → cm³), durée 8
  (2,3 h), vitesses 10 (2 m/s → m/h).
- Vérifié en local sur la copie MCP des modèles : 2 séries construites, Zod des séries et de la fiche ✓,
  16 réponses recalculées à la main. **Simulation contre la prod non lancée** (refusée au mode auto) :
  à lancer par David.
- **À lancer par David** après le merge : `pnpm tsx scripts/create-automatismes-nombres.ts` (simulation),
  puis `… --publier` ; ensuite vérification PDF depuis la base (`regen-depuis-base.ts`, `compile-prod.mjs`
  `--polices-corrige`, `debord.py`).

### Fiche écrite, vérifiée, défauts de mise en page corrigés (2026-11-06)

- David a publié les 9 modèles de 1re (`publier-lot.ts`, relevé MCP : tous `published`) et écrit la fiche
  depuis le worktree (avant le merge) : **`9bd4bcc6`**, brouillon, `{2,1_SPE}`, 2 séries. Les 6 fiches de
  1re restent en brouillon (publication par l'admin).
- PDF depuis la base (`regen-depuis-base.ts`, `compile-prod.mjs --polices-corrige`, `debord.py` du venv
  du dépôt principal : `../ubumaths/scripts/fiches/.venv/bin/python`) : fiche 2 p., réponses 1 p., corrigé
  3 p., 0 débord, maths justes. **4 défauts de mise en page**, corrigés à la demande de David :
  (1) série 1 Q2, `514dab07` écrit ses deux fractions en blocs `$$` → `259a0b26` graine 7 (5/6 ⋯ 3/4) ;
  (2) page 2 pour 2 questions → différence graine 10 (piste, plus courte) : fiche sur **1 page** ;
  (3) « x − y = −360 » coupé (salaires) → interpréter une différence graine 1 (Léa et Tom) ;
  (4) corrigé des vitesses coupé : TOUTES les graines de `1dd4d0ea` écrivent une chaîne d'égalités en
  ligne → `6b44d220` « Calculer une vitesse moyenne » (même point 4-052), graine 5 (240 km en 3 h).
- Cause commune des coupures : le générateur Typst ne met pas les formules en ligne dans `#box`
  (`typst-generator.ts`, bug Typst #4796, choix documenté) : à corriger par le choix des modèles/graines.
- **Rendu local sans écrire en prod** : séries construites sur la copie MCP des modèles, Typst par
  `WorksheetGenerator` + modèle « fiche élève » (comme `regen-depuis-base.ts`), compilé par
  `compile-prod.mjs` ; script jetable dans le scratchpad (non versionné).
- **À lancer par David** : `pnpm tsx scripts/create-automatismes-nombres.ts --publier --mettre-a-jour`
  (réécrit les 2 séries de la fiche en brouillon), puis je revérifie le PDF depuis la base.

### Fiche mise à jour, revérifiée, #2432 mergée (2026-11-06)

- David a lancé `--publier --mettre-a-jour`. PDF depuis la base (`regen-depuis-base.ts`,
  `compile-prod.mjs --polices-corrige`, `debord.py`) : fiche 1 p., réponses 1 p., corrigé 3 p., 6 PDF,
  0 débord ; les 4 défauts sont corrigés sur les pages ; 16 réponses recalculées, justes.
- #2432 mergée (CI verte). Relevé MCP : les 7 fiches (`9bd4bcc6` + 6 de 1re) sont encore `draft`.

### Lot « Calcul littéral et équations » — phase 0 (validée par David le 2026-11-06)

Capacités du BO 2de (Calcul numérique et algébrique) : calcul littéral élémentaire (additif, multiplicatif),
équations x² = a, ax + b = cx + d, a/x = b, inéquation du premier degré, isoler une variable, application
numérique d'une formule. Développer / factoriser / réduire : déjà dans « calcul algébrique (1) ».

**Essai** : 18 candidats. 13 ont leur fichier dans `scripts/questions/` : `md5(variations::jsonb::text)`
de la prod (MCP) = celui du fichier (calculé par le Postgres local, `docker exec … psql`), `shared` et
`options` relus. 5 copiés du MCP (`34e569e7`, `c32ebff9`, `843c3186`, `554496dd`, `6f196b0c` ; les copies de
`data/corrections/` sont périmées). `buildSerie` en local, graines 1-12 : **tout passe**.

- **Série 1** : `34e569e7` opposé · `c32ebff9` parenthèses · `36a37542` multiplicatif ×2 · `554496dd`
  substituer · `ec690625` isoler une grandeur · `d7aa3f33` ax + by = c · **neuf** application numérique.
- **Série 2** : `834c734f` ax + b = cx + d · `4563f7c5` ax = b · `ac9579d6` x² = a · `9ed8c72e` ×2 (a/x = b,
  puis équation quotient) · `cf796fab` ax ⩾ b · `75439740` ax + b > 0 · `bb5fa6ef` ax + b ⩾ cx + d.
- Écartés (fiche (2)) : `843c3186`, `aeb86af9`, `6f196b0c`, `3806ee3d`, `24aff7b0`, `e8ce1278`.
- **Modèle neuf B « a/x = b » abandonné (David, 2026-11-06)** : proposé en phase 0 à tort, `9ed8c72e` a
  déjà une variante « Résous dans ℝ∖{0} a/x = b » (graines 7, 8, 9, 12). Leçon : lire les variantes des
  modèles voisins, pas seulement les titres.

### Fait (PR du lot « Calcul littéral et équations », 2026-11-06)

- Modèle neuf `scripts/questions/automatismes-2de-calcul-litteral/01-application-numerique-formule.json`
  (2de, brouillon) : U = RI, d = vt, P = UI, ρ = m/V, Ec = ½mv² ; unité dite dans la question, réponse
  nombre seul, décimaux par `{{eval:…;d}}`. 12 specs vertes, 500/500 tirages. ρ = 3/2 écrit en fraction
  → `bad_form` (calcul non achevé), pas `correct`. Variable `i` renommée `n` (`i` = unité imaginaire).
- `scripts/create-automatismes-calcul-litteral.ts` (forme de `create-automatismes-nombres.ts`, modèle neuf
  lu dans son fichier tant qu'il n'a pas d'`id`, comme `create-automatismes-calcul-1spe.ts` ; `--sortie`).
  Niveaux `['2', '1_SPE']`.
- Graines : série 1 = opposé 2 (−4 − x), parenthèses 1, multiplicatif 3 (2x/5) et 4 (4x/(−1)), substituer
  2, isoler 1 (cylindre), ax + by = c 1, formule 8 (R = 70, I = 0,3) ; série 2 = ax + b = cx + d 7, ax = b
  4 (2/3 x = −8), x² = 27 (4), a/x 12 (−8/x = 3), quotient 11 ((x + 1)/(x + 2) = 2), ax ⩾ b 6, ax + b 11,
  deux membres 6. 16 réponses recalculées à la main.
- Rendu local (séries construites sur les copies, `pnpm fiche:verifier`) : fiche 1 p., corrigé 3 p.,
  0 débord. Corrigé avant/après : multiplicatif 12 (fraction de fractions minuscule en ligne) → 4 ;
  quotient 1 (chaîne d'équivalences hors colonne, −7/2 coupé, NON vu par `debord.py`) → 11. Restent,
  non bloquants : la chaîne du quotient touche les bords de la colonne (même forme pour toutes les
  graines) ; en-tête « série 2 » seul en bas de la page 1 du corrigé.
- **À lancer par David, dans l'ordre**, après le merge : `pnpm tsx scripts/create-questions.ts --dir
scripts/questions/automatismes-2de-calcul-litteral --publier` (écrit l'`id` dans le fichier, à
  commiter) ; puis `pnpm tsx scripts/create-automatismes-calcul-litteral.ts` (simulation) et `… --publier`.
  Ensuite : rangement du modèle neuf (nœud + tag, migration, comme #2416) ; vérification PDF depuis la base.
- #2438 mergée le 2026-11-06 (CI verte ; `code-reviewer` Sonnet : aucun finding, formules refaites à la main).

### Écrit en prod, vérifié, rangement (2026-11-06)

- David a lancé `create-questions --publier` : modèle **`c1c9cfc3`** (« Application numérique d'une
  formule », 2de, brouillon), `id` écrit dans son fichier (commité sur la branche du rangement). Puis
  `create-automatismes-calcul-litteral.ts --publier` : fiche **`894f766e`** (brouillon, 2 séries de 8).
- PDF depuis la base (`regen-depuis-base.ts`, `compile-prod.mjs --polices-corrige`, `debord.py`) : fiche
  1 p., réponses 1 p., corrigé 3 p., 0 débord ; pages relues ; 16 réponses justes. Restent les deux défauts
  non bloquants déjà notés (chaîne du quotient au ras de la colonne, en-tête « série 2 » seul en bas de la
  page 1 du corrigé).
- **Rangement, décision de David (2026-11-06)** : aucun point ne portait la puce du BO de 2de « Effectuer
  une application numérique d'une formule » → **point neuf 2-496** (Automatismes › Calcul numérique et
  algébrique, savoir-faire, attendu, fluence, rang 50 comme 2-489), sur Algèbre › Calcul littéral ›
  substitution, rattaché aux automatismes de 2, 1_SPE, 1_GEN, 1_TECHNO, T_SPE, T_COMP, T_TECHNO (comme
  2-273) ; `c1c9cfc3` sur ce nœud, tag 2-496. Écarté : tag 2-273 (exprimer une variable ≠ application
  numérique). Question d'accès : personne ne gagne ni ne perd d'accès (David).
- Migration `20261106162749_automatismes_1spe_point_application_numerique.sql`, test
  `tests/integration/automatismes-1spe-point-application-numerique.test.ts` ; fixtures des seeds de points
  (2de : 295 points ; références de 2-496 dans les 7 fixtures) et compteurs des tests de seed mis à jour.
  Pas d'exception de niveaux (modèle en {2}, point de 2de).
- Rang d'affichage : `passe-points-lycee.test.ts` exige 1..N sans doublon par niveau → 2-496 au rang 51, les
  points de 2de de rang ⩾ 51 descendent d'un rang (rollback : remontent) ; migration ajoutée à `LATER` de
  `tests/helpers/database/later-migrations.ts` (le test de la passe la défait avant de rejouer).
- Lien `VideoEssaiLocal0123` disparu (l'autre session l'a retiré) : 13 fichiers d'intégration verts (120
  tests : le neuf, les 7 seeds de points, passe lycée, scission, facettes, rangements, tspe lot 7). Preuve
  rouge : corps de la migration retiré → 7 rouges sur 10.
- Base locale : migration appliquée (`migration up --local --include-all`, qui a rattrapé 9 migrations de
  `main` absentes en local). Le global-setup des tests d'intégration échoue sur un lien de partage
  `VideoEssaiLocal0123` (classe de démo, créé à 13 h 49 par une autre session) : David a dit d'attendre.
- Revue (#2446) : `code-reviewer` → décalage des rangs et son rollback assertés, garde du rang de 2-489
  stricte (`is distinct from`), garde « 2-489 déplacé » et « aucun modèle touché en local » testées ;
  `security-auditor` : rien de bloquant (faibles déjà acceptés aux lots précédents). CI verte, #2446 mergée
  (après la fin d'un `deploy:prod`), `db:migrate` appliqué ; relevé MCP : 2-496 au rang 51 sur substitution,
  7 références, `c1c9cfc3` rangé et tagué, ordre de 2de 1..295 sans doublon, trigger `updated_at` actif.

### Lot « Proportions et pourcentages » — phase 0 (validée par David le 2026-11-08)

Capacités du BO 2de (Proportions et pourcentages) : calculer, appliquer, exprimer une proportion sous
différentes formes (décimale, fractionnaire, pourcentage) ; utiliser une proportion pour calculer une partie
connaissant le tout, ou le tout connaissant une partie. Seul point de 2de du bloc : 2-490 (le tout), modèle
`39b4823d` ; le reste porté par des points du collège (4-056, 5-086, 5-140, 6-106, 6-140, 6-141).

**Essai** : 13 candidats, 12 avec leur fichier dans `scripts/questions/` (`md5` des variantes = prod,
calculé par le Postgres local avec `$J$…$J$::jsonb::text`), `0be55013` copié du MCP. `buildSerie` en local,
graines 1-12 : **tout passe**.

- **Série 1** : `ade95ae4` proportion → % · `5c8a6da6` tout multiple de 100 · `5b3bef9f` écriture décimale ·
  **neuf** autre forme · `11f91d46` pourcentage d'un pourcentage · `afbfa8c6` trois proportions emboîtées ·
  `a635df43` fraction d'une fraction · `f4f0d076` probabilité en décimal.
- **Série 2** : `4f599434` t % de c · `950cfa36` par 1 % · `5b3bef9f` effectif de la partie · `0be55013`
  fraction d'une quantité · `afbfa8c6` effectif par deux pourcentages · `39b4823d` ×2 (fraction, %) ·
  `4f599434` le tout connaissant t %.
- Écartés (fiche (2)) : 6-141 ×6 (« 25 % de 48 », trop faciles), `35754c24`, `62590cd3`, `8fd459da`,
  `f9e9637c` (définition), `9293eb9a`, `8ffdbdb1` (calcul nu), `0c5f6039` (ratio, hors capacité), évolutions
  (`ef08a256`, `2562438e`, `e05bb79b`, `c4372fd8`), `5d7726eb`, `81a64b0a` (déjà dans « nombres (1) »).
- **Modèle neuf validé** : aucun modèle ne passe décimal ↔ % ni fraction non décimale → % (variantes lues,
  recherche dans les énoncés de prod). **Rangement décidé (David, 2026-11-08)** : point **6-106** avec
  exception de niveaux (`EXCEPTIONS_NIVEAUX`), pas de point neuf (6-106 couvre la puce ; un point 2de la
  recopierait).

### Fait (PR du lot « Proportions et pourcentages », 2026-11-08)

- Modèle neuf `scripts/questions/automatismes-2de-proportions/01-proportion-autre-forme.json` (2de,
  brouillon) : décimal → %, % → décimal, fraction → %, fraction → décimal ; valeurs ≤ 1 seulement (une
  proportion ne dépasse pas 1 : 1,2 et 1,5 retirés après le premier essai) ; 20 specs vertes, 2000/2000 tirages.
  Fraction donnée pour une écriture décimale → `bad_form` (`form`, plus `reducedFractions` si réductible).
- `scripts/create-automatismes-proportions.ts` (forme de `create-automatismes-calcul-litteral.ts`, modèle neuf
  lu dans son fichier tant qu'il n'a pas d'`id`). Niveaux `['2', '1_SPE']`.
- Graines : série 1 = proportion 10 (56/80), sur 100 8 (207/300), décimale 17 (22/40), neuf 12 (0,5 % →
  0,005), % de % 8 (25 % × 40 %), emboîtés 10 (60 × 50 × 80 %), fraction de fraction 2 (3/5 × 3/4),
  probabilité 8 (8/25) ; série 2 = t % de c 10 (60 % de 220), par 1 % 5 (8 % de 300), partie 14 (35 % de 120),
  fraction d'une quantité 10 (7/8 de 72), successifs 14 (5000, 60 %, 25 %), tout 18 (28 = 7/8) et 5 (49 =
  87,5 %), le tout 2 (20 % → 13). 16 réponses recalculées à la main.
- Rendu local (séries construites sur les copies, `pnpm fiche:verifier`) : fiche 1 p., corrigé 3 p., 0 débord,
  pages relues. Non bloquant : deux corrigés passent d'une colonne à l'autre (série 1 Q4, série 2 Q4).
- **À lancer par David, dans l'ordre**, après le merge : `pnpm tsx scripts/create-questions.ts --dir
scripts/questions/automatismes-2de-proportions --publier` (écrit l'`id` dans le fichier, à commiter) ; puis
  `pnpm tsx scripts/create-automatismes-proportions.ts` (simulation) et `… --publier`. Ensuite : rangement du
  modèle neuf (nœud de 6-106 + tag 6-106 + exception de niveaux, migration) ; vérification PDF depuis la base.
- #2455 mergée le 2026-11-08 (CI verte ; `code-reviewer` Sonnet : maths des 4 variantes vérifiées sur
  toutes les valeurs, UUID justes ; formulation de la correction décimal → % reprise).

### Écritures, vérification et rangement (2026-11-08)

- David a lancé `create-questions.ts --publier` : modèle **`23751c95`** créé en brouillon, `id` écrit dans
  le JSON (commité sur la branche du rangement). Puis la simulation (séries identiques à la validation)
  et `create-automatismes-proportions.ts --publier` : fiche **`f9608ee5`**, brouillon, 2 séries.
- PDF depuis la base (`regen-depuis-base.ts --langues fr`, `compile-prod.mjs --polices-corrige`,
  `debord.py`) : fiche 1 p., réponses 1 p., corrigé 3 p., 0 débord, pages relues ; trois corrigés
  coupés d'une colonne ou d'une page à l'autre (série 1 Q4, série 2 Q4 et Q8), non bloquants.
- Rangement : nœud « Nombres et calculs › Décimaux : numération › forme fractionnaire » (celui des 4
  modèles de 6e tagués 6-106 ; le point est sur la notion parente), tag 6-106. Question d'accès posée
  avant le SQL, tranchée par David le 2026-11-08 : personne ne gagne ni ne perd d'accès. Migration
  `20261108085338_automatismes_1spe_rangement_proportion.sql` (forme de #2416), test
  `tests/integration/automatismes-1spe-rangement-proportion.test.ts` : 4 rouges sur 9 sans le corps,
  9 verts avec. Exception `23751c95` → niveaux `['6']` (raison `AUTOMATISMES_2DE`) dans
  `scripts/lib/niveaux-des-tags.ts`, test mis à jour (12 exceptions).
- `security-auditor` : 0 bloquant (diff avec #2416 limité aux données ; gardes, rollback, trigger vérifiés).
  À vérifier en prod après `db:migrate` : nœud, un seul tag ('6', '6-106'), brouillon, `updated_at`
  inchangé, `tgenabled = 'O'`.
- PR #2457 : premier run rouge sur la seule garde « doc à jour » (`docs/systeme/base-de-donnees.md` couvre
  les migrations) : `Doc-inchangée:` ajouté dans un commit, le schéma ne change pas.
