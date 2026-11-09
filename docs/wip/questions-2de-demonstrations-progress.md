# Chantier « questions-2de-demonstrations » — les démonstrations de la seconde en modèles de questions

> Suite du chantier `questions-2de` (seconde couverte, § 93 de son journal) : ses points P (Q2) restés sans modèle.
> Modèle suivi : chantier `questions-1spe-demonstrations` (D1, D2, D8 de son journal).
> Bornes : `docs/systeme/programmes/bornes/lycee/2de.json` ; BO : `src/lib/server/programmes/transcriptions/2.md`.

## Reprendre ici

_Mis à jour le 2026-11-09, migration du lot 8 poussée (PR de rangement ouverte, voir § 15)._

- **État** : lots 1-7 publiés. Lot 8 : 5 brouillons en prod (#2517), migration de rangement
  `20261109110745` écrite, test 16/16, audit 0 bloquant, PR ouverte (branche
  `feat/questions-2de-approfondissements-8-rangement`).
- **Prochaine action** : suivre la CI de la PR (`gh pr checks <n> --watch`, l'intégration nocturne tourne aussi :
  elle valide la fixture `seed-2de-points.json`) → verte : `pnpm check:migrations --pr <n>` puis merge → `db:migrate`
  par David (`!`) → vérifier en prod (nœuds, tags, points 2-307/2-310, `d4db2207` `{1_SPE,2}`, `updated_at`) →
  page à cocher du lot 8.
- **En attente de David** : `db:migrate` après le merge.
- **Pièges en cours** : écritures en prod refusées par le classifieur du mode auto → commande `!` ; « Client Tests
  (browser) » qui plante tests verts → `gh run rerun <run> --failed` ; worktree neuf → `pnpm exec svelte-kit sync`.
- **Worktree / branche** : `../ubumaths-wt-questions-2de-demonstrations`, `feat/questions-2de-approfondissements-8-rangement`.

---

## 1. Relevé : les démonstrations du BO de seconde (2026-11-06)

Rubriques « Démonstration(s) » de `2.md` (l. 280, 312, 348, 419, 451, 536) : **12 points**. Relevé prod (MCP,
2026-11-06) : tous sur une sous-notion active, aucun modèle tagué.

| Lot | Point | Démonstration                              | Nœud du point (prod)                                        |
| --- | ----- | ------------------------------------------ | ----------------------------------------------------------- |
| 1   | 239   | Somme de deux multiples de a               | Arithmétique › Divisibilité › multiples et diviseurs        |
| 1   | 240   | Le carré d'un nombre impair est impair     | Arithmétique › Divisibilité › pair ou impair                |
| 1   | 255   | 1/3 n'est pas décimal                      | Ensembles › Ensembles de nombres › nombres irrationnels     |
| 1   | 256   | √2 est irrationnel                         | Ensembles › Ensembles de nombres › nombres irrationnels     |
| 1   | 282   | √(ab) = √a √b                              | Nombres et calculs › Racines carrées : calculs › propriétés |
| 2   | 304   | Colinéarité : déterminant nul              | Géométrie › Vecteurs › colinéarité                          |
| 2   | 438   | Colinéarité : coordonnées proportionnelles | Géométrie › Vecteurs › colinéarité                          |
| 2   | 320   | Forme générale d'une équation de droite    | Géométrie › Géométrie repérée › équations de droites        |
| 3   | 357   | Variations des fonctions affines           | Fonctions › Fonctions affines › variations et signe         |
| 3   | 358   | Position de y = x et y = x² pour x ≥ 0     | Fonctions › Fonction carré › définition et courbe           |
| 3   | 359   | Variations de la fonction carré            | Fonctions › Fonction carré › variations                     |
| 3   | 360   | Variations de la fonction inverse          | Fonctions › Fonction inverse › variations                   |

**Hors chantier pour l'instant** (restent P) : approfondissements (258, 259, 284-286, 305-310, 323, 324, 363),
exemples d'algorithmes (241, 242, 257, 283, 321, 322, 361, 362, 387, 388 ; relevé corrigé le 2026-11-08, § 9), compétences (216, 217, 353, 493-495). Suites possibles,
dans l'ordre de la 1re spé : approfondissements, puis algorithmes.

## 2. Phase 0 (posée et validée le 2026-11-06)

**D1 (David, 2026-11-06, « je valide »)** :

- **Q1** : les 12 démonstrations seulement.
- **Q2** : 2-3 variations « démonstration à trous » (étape clé en case, ou justification en case choix à
  4 propositions, erreurs typiques en distracteurs) + une dernière variation « Remets les étapes de la démonstration
  dans l'ordre » (` ```ranger `, `signe: aucun`, 4 à 6 étapes), d'emblée (outil de #2341).
- **Q3** : valeurs tirées là où la preuve s'y prête (239 : a ; 357 : m, p ; 304/438 : coordonnées), lettres ailleurs.
- **Q4** : un modèle par point, tagué sur son point P (304 et 438 : deux modèles). Rangement : comme en 1re spé, la
  « catégorie Démonstrations » n'est qu'une étiquette du journal ; en base, chaque modèle va sur la **sous-notion
  existante de son point** (aucun nœud neuf), niveau après ceux déjà présents.
- **Q5** — accès : personne de plus (brouillons ; migration de nœud et de tags seulement).
- **Q6** : chantier à part `questions-2de-demonstrations` ; le journal `questions-2de` sera versé une fois les P
  traités.

## 3. Lot 1 : arithmétique, nombres réels, racines (2026-11-06)

| Point | Modèle (`scripts/questions/2de-demonstrations-1/`) | Niveau | Variations                                                                          |
| ----- | -------------------------------------------------- | ------ | ----------------------------------------------------------------------------------- |
| 239   | `01-demontrer-somme-de-deux-multiples`             | 11     | y = am (case), a(k + m) (case), k + m entier (choix), étapes ; a de 2 à 9           |
| 240   | `02-demontrer-carre-d-un-impair`                   | 3      | double produit 4k (case), 2(2k² + 2k) + 1 (case), 2K + 1 (choix), étapes            |
| 255   | `03-demontrer-un-tiers-non-decimal`                | 5      | hypothèse de l'absurde (choix), 3a = 10ⁿ (case), somme des chiffres (choix), étapes |
| 256   | `04-demontrer-racine-de-deux-irrationnel`          | 6      | p² = 2q² (case), contraposée du 240 (choix), irréductibilité (choix), étapes        |
| 282   | `05-demontrer-racine-d-un-produit`                 | 3      | (√a√b)² = ab (case), √a√b ≥ 0 (choix), « seul positif » (choix), étapes             |

Niveaux : après ceux déjà présents sur la sous-notion (relevé prod : multiples et diviseurs 9-10, pair ou impair 2,
nombres irrationnels 4, propriétés 1-2). Script : `docs/wip/questions/lot-2de-demonstrations-1.py`.

Pièges du lot : `m×3`, `a×3` sortent en `unoptimal_form` (comme `n×3` en 1re spé) → pas de spec ; `2k(k + 1)` refusé
en `bad_form` alors que juste → `requiredForm: {pattern: 'u'}` sur cette case. Worktree neuf : `svelte-kit sync`
avant `positions-ranger.ts` (sinon `$lib` introuvable). `create-questions` en simulation contre la prod : refusé par
le classifieur → c'est David qui lance la commande.

Vérifié : `question:specs` 150 tirages par variation, 5/5 importables, 0 `\textcolor` hors `$` ; aperçus relus
(distracteurs, corrigés) ; brouillons en base locale (copie hors dépôt) ; aperçu admin vu à l'écran : étapes à
ranger du 256 (fractions, places numérotées), case en fin de formule longue du 282.

Mergée (#2434, CI verte du premier coup).

## 4. Lot 1 : publication en brouillon et rangement (2026-11-06)

David a lancé `create-questions --publier` depuis le dépôt principal : 5 brouillons. Ids reportés dans les JSON
(branche `content/questions-2de-demonstrations-2-rangement`), dépôt principal rendu propre (`git restore`).

Relevé prod (MCP, 2026-11-06) : 5 brouillons au niveau {2}, niveaux 11, 3, 5, 6, 3, sans nœud ni tag ; points
2-239, 2-240, 2-255, 2-256, 2-282 sur leurs sous-notions actives, aucun modèle tagué dessus.

| Modèle   | Sous-notion                                                 | Point |
| -------- | ----------------------------------------------------------- | ----- |
| 83082954 | Arithmétique › Divisibilité › multiples et diviseurs        | 2-239 |
| ae8fc470 | Arithmétique › Divisibilité › pair ou impair                | 2-240 |
| d8f7648f | Ensembles › Ensembles de nombres › nombres irrationnels     | 2-255 |
| 8de4b8c9 | Ensembles › Ensembles de nombres › nombres irrationnels     | 2-256 |
| efd6bdb4 | Nombres et calculs › Racines carrées : calculs › propriétés | 2-282 |

Migration `20261108070133_questions_2de_demonstrations_1_rangement_tags.sql` (gabarit `20261106050929`, gardes et
rollback identiques) ; test `tests/integration/questions-2de-demonstrations-1-rangement-tags.test.ts`. Accès :
personne de plus (Q5).

Piège : le test d'intégration n'a pas pu tourner — la préparation globale (suppression des profs) bute sur un lien de
partage du journal de classe créé à 12 h 49 par `teacher@local.test` et utilisé (17 accès) ; non supprimé, en
attente du feu vert de David. `security-auditor` (2026-11-06) : aucun finding ; le lien a disparu depuis.

Test d'intégration (2026-11-08, feu vert de David) : **12/12 vert**. Preuve rouge (fichiers restaurés depuis une
copie) : partie aller de la migration vidée (rollback gardé, l. 1-112) → 6 rouges (branches d'échec) et 5 sautés
(le `beforeAll` nominal échoue au rollback, rien à défaire) ; en plus avec le rollback neutralisé dans le test → les
2 tests d'effet (nœud, tag) rouges, les 3 invariants verts comme attendu.

Rebasée sur `origin/main` (2026-11-08) : `main` portait 5 migrations postérieures à `20261106130142` (déjà en prod
pour certaines) → migration ré-horodatée `20261108070133` (`pnpm migration:horodatage`), test et journal suivis.

Mergée (#2454, CI verte du premier coup). `db:migrate` depuis le dépôt principal (seule migration en attente) ;
vérifié en prod : les 5 brouillons sur un nœud, chacun avec son seul point, `draft`. Page à cocher :
https://claude.ai/artifact/2T6PYa1jHeoQRWFsERRJor (5 alertes attendues : bloc ranger non dessiné, à jouer dans
l'aperçu admin).

Lot 1 relu par David sur la page à cocher (2026-11-08) : 5 « ok », sans commentaire. Publié par David
(`publier-lot.ts --publier`) : 5/5, statut relu en base.

## 5. Lot 2 : géométrie (2026-11-08)

| Point | Modèle (`scripts/questions/2de-demonstrations-2/`) | Niveau | Variations                                                                                   |
| ----- | -------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------- |
| 304   | `01-demontrer-colinearite-determinant`             | 6      | det nul si v = ku (case), réciproque y = bk (case), conclusion v = ku (choix), étapes        |
| 438   | `02-demontrer-colinearite-proportionnalite`        | 7      | coordonnées de ku (case), égalité de deux vecteurs (choix), produits en croix (case), étapes |
| 320   | `03-demontrer-equation-cartesienne-de-droite`      | 10     | coordonnées de AM (case), M ∈ d ⟺ det nul (choix), constante c (case), étapes                |

Valeurs tirées (Q3) : u(a ; b) avec a de 2 à 6, b de 2 à 7 (304, 438), v(x ; y) en lettres ; A(1..6 ; 1..6) et
u(2..5 ; 2..5) pour 320, c = αy_A − βx_A. Étapes à ranger en lettres (u(x ; y), v(x' ; y') ; A(x_A ; y_A), u(α ; β)).
Niveaux : après ceux déjà présents, tous niveaux scolaires (relevé prod du 2026-11-08 : colinéarité 1-5, équations
de droites 1-9). Script : `docs/wip/questions/lot-2de-demonstrations-2.py`.

Vérifié : `question:specs` 150 tirages par variation, 3/3 importables (13, 14, 15 specs vertes), 0 `\textcolor` hors
`$` ; aperçus relus (énoncés, corrigés, signes de la constante c).

Mergée (#2458, CI verte du premier coup).

## 6. Lot 2 : publication en brouillon et rangement (2026-11-08)

David a lancé `create-questions --publier` depuis le worktree : 3 brouillons, ids écrits dans les JSON (branche
`content/questions-2de-demonstrations-4-rangement`).

Relevé prod (MCP, 2026-11-08) : 3 brouillons au niveau {2}, niveaux 6, 7, 10, sans nœud ni tag ; points 2-304,
2-438 (colinéarité) et 2-320 (équations de droites) sur leurs sous-notions actives, aucun modèle tagué dessus.

| Modèle   | Sous-notion                                          | Point |
| -------- | ---------------------------------------------------- | ----- |
| 835b0d8b | Géométrie › Vecteurs › colinéarité                   | 2-304 |
| bd2b748e | Géométrie › Vecteurs › colinéarité                   | 2-438 |
| c6a96fbf | Géométrie › Géométrie repérée › équations de droites | 2-320 |

Migration `20261108150529_questions_2de_demonstrations_2_rangement_tags.sql` (gabarit : celle du lot 1, gardes et
rollback identiques) ; test `tests/integration/questions-2de-demonstrations-2-rangement-tags.test.ts`. Accès :
personne de plus (Q5).

Test d'intégration : **12/12 vert**. Preuve rouge (fichiers restaurés depuis une copie, `cmp` identique) : partie
aller vidée (rollback gardé) → 6 rouges, 5 sautés ; en plus rollback neutralisé dans le test → 8 rouges dont les 2
tests d'effet (nœud, tag), les invariants verts.

`security-auditor` (2026-11-08) : aucun finding (diff avec le lot 1 limité aux données). Mergée (#2460) après une
relance du job navigateur (plantage connu, 1946/1946 tests verts) ; `check:migrations --pr` passé. `db:migrate`
depuis le dépôt principal ; vérifié en prod : les 3 brouillons sur leur sous-notion, chacun avec son seul point,
`draft`. Page à cocher : https://claude.ai/artifact/KukhKQkpLCGxXAPP3iDEmz (3 alertes attendues : bloc ranger non
dessiné, à jouer dans l'aperçu admin).

Lot 2 relu par David sur la page à cocher (2026-11-08) : 3 « ok », sans commentaire. Publié par David
(`publier-lot.ts --publier`) : 3/3, statut relu en base.

## 7. Lot 3 : fonctions (2026-11-08)

| Point | Modèle (`scripts/questions/2de-demonstrations-3/`) | Niveau | Variations                                                                                     |
| ----- | -------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------- |
| 357   | `01-demontrer-variations-fonction-affine`          | 5      | f(b) − f(a) = m(b − a) (case), signe si m > 0 (choix), conclusion si m < 0 (choix), étapes     |
| 358   | `02-demontrer-position-droite-et-parabole`         | 3      | x² − x = x(x − 1) (case), position sur [0 ; 1] (choix), pour x ≥ 1 (choix), étapes             |
| 359   | `03-demontrer-variations-fonction-carre`           | 2      | (b − a)(b + a) (case), signe pour 0 ≤ a < b (choix), conclusion pour a < b ≤ 0 (choix), étapes |
| 360   | `04-demontrer-variations-fonction-inverse`         | 1      | (a − b)/(ab) (case), signe pour 0 < a < b (choix), ab > 0 pour a < b < 0 (choix), étapes       |

Valeurs tirées (Q3) : m de 2 à 9 et p de 1 à 9 (m > 0), m de −9 à −2 et p de −9 à −1 (m < 0) pour 357 — p jamais
nul (sinon « +0 » à l'écran) ; lettres ailleurs. Niveaux : après ceux déjà présents, tous niveaux scolaires (relevé
prod du 2026-11-08 : variations et signe 1-4, définition et courbe 1-2, carré › variations 1, inverse › variations
aucun modèle). Aucun modèle tagué sur 2-357 à 2-360. Script : `docs/wip/questions/lot-2de-demonstrations-3.py`.

Vérifié : `question:specs` 150 tirages par variation, 4/4 importables (15 specs vertes chacun), 0 `\textcolor` hors
`$` ; aperçus relus (cases dans `x(?)`, `(b − a)(?)`, `\dfrac{?}{ab}` ; étapes à ranger ; corrigés).

Mergée (#2466, CI verte du premier coup ; merge retardé par un `deploy:prod` en cours).

## 8. Lot 3 : publication en brouillon et rangement (2026-11-08)

David a lancé `create-questions --publier` depuis le worktree : 4 brouillons, ids écrits dans les JSON (branche
`content/questions-2de-demonstrations-6-rangement`).

Relevé prod (MCP, 2026-11-08) : 4 brouillons au niveau {2}, niveaux 5, 3, 2, 1, sans nœud ni tag ; points 2-357 à
2-360 sur leurs sous-notions actives, aucun modèle tagué dessus.

| Modèle   | Sous-notion                                         | Point |
| -------- | --------------------------------------------------- | ----- |
| 6fc38e87 | Fonctions › Fonctions affines › variations et signe | 2-357 |
| d28706b9 | Fonctions › Fonction carré › définition et courbe   | 2-358 |
| a3f25691 | Fonctions › Fonction carré › variations             | 2-359 |
| b0a94f05 | Fonctions › Fonction inverse › variations           | 2-360 |

Migration `20261108155933_questions_2de_demonstrations_3_rangement_tags.sql` (gabarit : celle du lot 2, gardes et
rollback identiques) ; test `tests/integration/questions-2de-demonstrations-3-rangement-tags.test.ts`. Accès :
personne de plus (Q5).

Test d'intégration : **12/12 vert**. Preuve rouge (fichiers restaurés depuis une copie, `cmp` identique) : partie
aller vidée (rollback gardé) → 6 rouges, 5 sautés ; en plus rollback neutralisé dans le test → 8 rouges dont les 2
tests d'effet (nœud, tag), les invariants verts.

`security-auditor` (2026-11-08) : aucun finding (diff avec le lot 2 limité aux données ; prod relue en lecture).

Mergée (#2469, CI verte du premier coup) ; `check:migrations --pr` passé. `db:migrate` depuis le dépôt principal
(seule migration en attente) ; vérifié en prod : les 4 brouillons sur leur sous-notion, chacun avec son seul point,
`draft`. Page à cocher : https://claude.ai/artifact/MSfbBs793RSVxLwzv9LyPK (4 alertes attendues : bloc ranger non
dessiné, à jouer dans l'aperçu admin).

Lot 3 relu par David sur la page à cocher (2026-11-08) : 4 « ok », sans commentaire. Publié par David
(`publier-lot.ts`, simulation puis `--publier`) : 4/4, statut relu en base. **Les 12 démonstrations sont couvertes.**

## 9. Suite : les exemples d'algorithmes (2026-11-08)

**D2 (David, 2026-11-08)** : « continuer avec les algorithmes » — les 4 exemples d'algorithmes de la seconde (241,
242, 257, 283), dans ce chantier. Les approfondissements (§ 1) ne sont pas tranchés. Versement après.

### Relevé des exemples d'algorithmes (2026-11-08)

Rubriques « Exemple(s) d'algorithme » de `2.md` (l. 285, 317, 352, 455, 542, 622) : **10 points**, pas 4. Le § 1
rangeait 321, 322, 361, 362, 387 et 388 parmi les approfondissements : ce sont des exemples d'algorithmes (même
erreur dans `2de.json`, dont la `remarque` dit « Approfondissement possible » pour ces 10 points). Les vrais
approfondissements restent 258, 259, 284-286, 305-310, 323, 324, 363.

Relevé prod (MCP, 2026-11-08) : aucun modèle tagué sur les 10 points.

| Domaine       | Point | Algorithme                                                       | Nœud du point (prod)                               |
| ------------- | ----- | ---------------------------------------------------------------- | -------------------------------------------------- |
| Arithmétique  | 241   | a est-il multiple de b ?                                         | Divisibilité › multiples et diviseurs (16 modèles) |
| Arithmétique  | 242   | Plus grand multiple de a inférieur ou égal à b                   | Divisibilité › multiples et diviseurs              |
| Nombres réels | 257   | Encadrement de √2 par balayage, amplitude 10⁻ⁿ                   | Algorithmique › Boucles › boucle bornée (1 modèle) |
| Algèbre       | 283   | Première puissance d'un nombre au-dessus (au-dessous) d'un seuil | Algorithmique › Boucles › boucle non bornée (2)    |
| Géométrie     | 321   | Alignement de trois points                                       | Vecteurs › colinéarité                             |
| Géométrie     | 322   | Équation de la droite passant par deux points                    | Géométrie repérée › équations de droites           |
| Fonctions     | 361   | Approximation d'un extremum (balayage, dichotomie)               | Généralités sur les fonctions › extremums          |
| Fonctions     | 362   | Longueur approchée d'une portion de courbe                       | notion Généralités sur les fonctions               |
| Statistiques  | 387   | Filtrer des individus (ET, OU, NON) dans deux listes             | notion Tableaux croisés                            |
| Statistiques  | 388   | Tableau croisé et fréquences à partir des listes                 | Tableaux croisés › tableau croisé d'effectifs      |

Outils : rien à créer (bloc ` ```python ` à valeurs tirées, case, case choix ; exemples 2de : lots
`2de-programmes-11a/11b` ; 1re spé : `1spe-algorithmes-10` à `12`). Phase 0 posée à David (ci-dessous).

### Phase 0 — questions à David (posées le 2026-11-08)

- **Q1 — Périmètre.** Les 10 exemples d'algorithmes ; compétences et approfondissements restent hors chantier.
  _Reco : oui (D2 visait « les algorithmes » ; les 4 du § 1 venaient d'un relevé faux)._
- **Q2 — Forme.** Comme D9 en 1re spé : Python seulement ; (a) faire tourner (valeur renvoyée pour une entrée
  tirée, en case), (b) compléter une ligne (case choix à 4 propositions, erreurs typiques en distracteurs),
  (c) interpréter ce que renvoie le programme ; jamais « faire tourner » un programme aléatoire ; 2-3 variations.
  Valeurs calculables à la main (362 : points choisis pour des racines exactes). _Reco : oui._
- **Q3 — Rangement.** Un modèle par point, tagué sur son point P, sur la sous-notion existante du point (241, 242 :
  multiples et diviseurs ; 257 : boucle bornée ; 283 : boucle non bornée ; 321 : colinéarité ; 322 : équations de
  droites ; 361 : extremums ; 388 : tableau croisé d'effectifs) ; 362 et 387, points sur une notion : sur une
  sous-notion existante de cette notion (extremums ; tableau croisé d'effectifs), à vérifier au lot. Aucun nœud
  neuf ; niveau après ceux déjà présents. _Reco : oui._
- **Q4 — Publication.** Comme les démonstrations (brouillons, migration nœud + tag, page à cocher). _Reco : oui._
- **Q5 — Accès** : « qui pourra lire quoi, qu'il ne pouvait pas lire avant ? » _Reco : personne de plus._
- **Q6 — Bornes.** Corriger la `remarque` des 10 points dans `2de.json` (« Exemple d'algorithme », pas
  « Approfondissement ») et le § 1, en commit de doc direct. _Reco : oui._

Lots proposés : (4) nombres (241, 242, 257, 283) ; (5) géométrie (321, 322) ; (6) fonctions et statistiques
(361, 362, 387, 388).

**D3 (David, 2026-11-08, « je suis tes recos »)** : Q1 les 10 exemples d'algorithmes ; Q2 Python, formes (a) faire
tourner, (b) compléter une ligne, (c) interpréter, jamais « faire tourner » un programme aléatoire, 2-3 variations ;
Q3 un modèle par point, tagué sur son point, sur la sous-notion existante (362 : extremums ; 387 : tableau croisé
d'effectifs), aucun nœud neuf ; Q4 publication comme les démonstrations ; Q5 accès : personne de plus ; Q6 bornes
et § 1 corrigés (fait le 2026-11-08, `2de.json` : remarque des 10 points). Lots 4, 5, 6 dans l'ordre proposé.

## 10. Lot 4 : exemples d'algorithmes, nombres (2026-11-08)

Relevé prod (MCP, 2026-11-08) : 241 et 242 sur Arithmétique › Divisibilité › multiples et diviseurs (16 modèles,
niveaux 1-11, dont « Est-ce un multiple ? » en Oui/Non sans programme) ; 257 sur Algorithmique › Boucles › boucle
bornée (1 modèle, niveau 2) ; 283 sur Algorithmique › Boucles › boucle non bornée (2 modèles, niveaux 1-2 ; le
« capital qui double » de `3cacefc5` est un cas de seuil, sans fonction ni exposant demandé). Aucun modèle tagué sur
les 4 points ; aucune sous-notion neuve.

| Point | Modèle (`scripts/questions/2de-algorithmes-4/`) | Nœud, niveau                              | Variations                                                                                                       |
| ----- | ----------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 241   | `01-tester-un-multiple`                         | Divisibilité › multiples et diviseurs, 12 | `a % b == 0` : True ou False (choix non mélangé) ; version `while`, valeur de `m` (case) ; `return` (choix)      |
| 242   | `02-plus-grand-multiple`                        | Divisibilité › multiples et diviseurs, 13 | faire tourner, a 3..9, b 20..80 (case) ; condition `m + a <= b` (choix) ; sans boucle `(b // a) * a` (choix)     |
| 257   | `03-encadrer-racine-de-2-par-balayage`          | Boucles › boucle bornée, 3                | `balayage(1)` ou `(2)` : deux cases ; condition `(x + pas) ** 2 <= 2` (choix) ; amplitude `10^{-n}` (choix)      |
| 283   | `04-premiere-puissance-seuil`                   | Boucles › boucle non bornée, 3            | premier n tel que qⁿ > M, q = 2 ou 3 (case) ; condition `q ** n <= M` (choix) ; 0,5ⁿ < s, s de 0,01 à 0,4 (case) |

Script : `docs/wip/questions/lot-2de-algorithmes-4.py`. 257 : le programme utilise `while` (le point est rangé sur
« boucle bornée » en prod, rangement gardé) ; la correction dit que Python affiche `1.4000000000000004` (valeur
vérifiée en Python). Vérifié : `question:specs` 150 tirages par variation, 4/4 importables, toutes les specs vertes,
0 `\textcolor` hors `$` ; 246 réponses « faire tourner » recoupées par une exécution Python des programmes de
l'énoncé (0 écart) ; une correction fausse pour n ⩾ 2 corrigée (« 1,1² ») ; brouillons en base locale (copie hors
dépôt), aperçu admin du 257 vu à l'écran (bloc Python, deux cases autour de √2, « 1,41 » et « 1,42 » acceptés).

Commande pour David, après le merge (depuis le dépôt principal, à jour) :
`! pnpm tsx scripts/create-questions.ts --dir scripts/questions/2de-algorithmes-4 --publier`

Mergée (#2476, CI verte du premier coup).

Créés en brouillon par David (2026-11-08) : 76ada660 (241), 2806f748 (242), 66cd841d (257), bcc687bb (283).
Migration `20261108192038_questions_2de_algorithmes_4_rangement_tags` (calquée sur le lot 3, seules les données
changent) : test d'intégration 12/12 vert, rouge sans les écritures ; `security-auditor` : 0 finding bloquant.
Mergée (#2479 ; job navigateur planté tests verts, relancé, vert) ; `check:migrations --pr` passé ; `db:migrate`
(seule migration en attente) ; vérifié en prod : les 4 brouillons sur leur sous-notion, chacun avec son seul point,
`updated_at` inchangé. Page à cocher : https://claude.ai/artifact/3Y7diWpyKuCsBgEPX4REaL (aucune alerte ; les
accents graves du code en ligne y restent bruts, l'appli les rend en code via `parseMarkdown`).

Lot 4 relu par David sur la page à cocher (2026-11-08) : 4 « ok », sans commentaire. Publié par David
(`publier-lot.ts`, simulation puis `--publier`) : 4/4, statut relu en base.

## 11. Lot 5 : exemples d'algorithmes, géométrie (2026-11-08)

Relevé prod (MCP, 2026-11-08) : 321 sur Géométrie › Vecteurs › colinéarité (8 modèles, niveaux 1-7, dont « Trois
points alignés ? » sans programme) ; 322 sur Géométrie › Géométrie repérée › équations de droites (10 modèles,
niveaux 1-10, dont « Équation d'une droite passant par deux points » sans programme). Aucun modèle tagué sur les
2 points ; aucune sous-notion neuve.

| Point | Modèle (`scripts/questions/2de-algorithmes-5/`) | Nœud, niveau              | Variations                                                                                                          |
| ----- | ----------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 321   | `01-tester-alignement-trois-points`             | Vecteurs › colinéarité, 8 | valeur de `det` (case) ; compléter la ligne du déterminant (choix) ; valeur renvoyée True/False (choix non mélangé) |
| 322   | `02-equation-droite-deux-points`                | équations de droites, 11  | `m` et `p` renvoyés (deux cases, décimaux) ; compléter `p = yA - m * xA` (choix) ; cas d'erreur `xA == xB` (choix)  |

Script : `docs/wip/questions/lot-2de-algorithmes-5.py`. 321 : C = A + k·AB, décalé de (0 ; p) une fois sur deux,
donc det = 0 ou ±p·(xB − xA), jamais nul par hasard. 322 : xB − xA ∈ {1, 2}, pente entière ou demi-entière ;
une fraction (`3/2`) y est en « mauvaise forme » (Python renvoie un décimal), spec `bad_form` avec une violation
`form` par case. Vérifié : `question:specs` 150 tirages par variation, 2/2 importables, 24 specs vertes,
0 `\textcolor` hors `$` ; 390 réponses « faire tourner » et True/False recoupées par une exécution Python des
programmes de l'énoncé (0 écart) ; brouillons en base locale, aperçu admin vu à l'écran (énoncés, bloc Python,
propositions, carte « Juste »). La face « correction » de la carte n'a pas pu être affichée par l'automate ; sa
notation (`\overrightarrow{AB}\begin{pmatrix}…\end{pmatrix}`) est celle de 115 modèles déjà en base.

Commande pour David, après le merge (depuis le dépôt principal, à jour) :
`! pnpm tsx scripts/create-questions.ts --dir scripts/questions/2de-algorithmes-5 --publier`

Mergée (#2484, CI verte du premier coup).

Créés en brouillon par David (2026-11-08) : 6564c2bf (321), 9a05a09f (322) ; ids commités sur la branche de la
migration.
Relevé prod (MCP, 2026-11-08, avant la migration) : 2 brouillons au niveau {2}, sans nœud ni tag ; 2-321 et
2-322 actifs sur leur sous-notion, aucun modèle déjà tagué dessus.
Migration `20261108222224_questions_2de_algorithmes_5_rangement_tags` (calquée sur le lot 4, seules les données
changent, diff relu) : test d'intégration 12/12 vert, rouge sans les écritures (2 échecs, 5 sautés). PR #2487.
Audit `security-auditor` : 0 finding. Mergée (#2487, CI verte) ; `check:migrations --pr` passé ; `db:migrate`
(seule migration en attente) ; vérifié en prod : les 2 brouillons sur leur sous-notion, chacun avec son seul
point, `updated_at` inchangé. Page à cocher (aucune alerte) : https://claude.ai/artifact/VHZwMcAdsf5jY37b6A2M1f

Lot 5 relu par David sur la page à cocher (2026-11-08) : 2 « ok », sans commentaire. Publié par David
(`publier-lot.ts`, simulation puis `--publier`, 2026-11-09) : 2/2, statut relu en base.

## 12. Lot 6 : exemples d'algorithmes, fonctions et statistiques (2026-11-09)

Relevé prod (MCP, 2026-11-09) : 361 sur Fonctions › Généralités sur les fonctions › extremums (2 modèles,
niveaux 1-2) ; 362 sur la notion Généralités sur les fonctions → rangé sur « extremums » (D3, Q3) ; 387 sur la
notion Tableaux croisés → rangé sur « tableau croisé d'effectifs » (D3, Q3) ; 388 sur Tableaux croisés ›
tableau croisé d'effectifs (3 modèles, niveaux 1-3). Aucun modèle tagué sur les 4 points ; aucune sous-notion
neuve.

| Point | Modèle (`scripts/questions/2de-algorithmes-6/`) | Nœud, niveau                  | Variations                                                                                                                                                                   |
| ----- | ----------------------------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 361   | `01-maximum-par-balayage`                       | extremums, 3                  | `maximum(0, 1)` pour f(x) = −x² + s·x, s à une décimale (case) ; condition du `while` (choix) ; pas 0,01 : abscisse du maximum à 0,01 près (choix)                           |
| 362   | `02-longueur-d-une-courbe`                      | extremums, 4                  | `longueur(a, b, 2)`, f parabole calée sur un triplet pythagoricien, longueur entière (case) ; ligne `L = L + sqrt(…)` (choix) ; n grandit : longueur de la courbe (choix)    |
| 387   | `03-filtrer-et-ou-non`                          | tableau croisé d'effectifs, 4 | `compter` sur 8 élèves tirés, condition `and` / `or` / `and not` tirée (case) ; condition ET NON (choix) ; `or` inclusif (choix)                                             |
| 388   | `04-frequence-conditionnelle-listes`            | tableau croisé d'effectifs, 5 | `frequence` sur 10 élèves (6 jeux fixes, fréquence décimale), tableau croisé en correction (case) ; `return bus_sport / bus` (choix) ; conditionnelle, pas l'inverse (choix) |

Script : `docs/wip/questions/lot-2de-algorithmes-6.py`. Mêmes listes `transport` (`"bus"` / `"vélo"`) et
`sport` (`"oui"` / `"non"`) pour 387 et 388, valeurs tirées élément par élément (`{{if:…}}` dans le bloc
Python). 361 : le programme s'appuie sur le sens de variation (avance tant que f croît) ; s jamais entier impair,
donc jamais d'égalité f(x + 1) = f(x). La dichotomie n'est pas traitée (le BO dit « balayage, dichotomie » ; une
seule méthode par modèle, comme les lots 4-5). 388 : « dresser le tableau croisé » est dans la correction (bloc
` ```tableau-croise `, totaux compris) ; un `\begin{array}` avec `\hline` s'affichait en LaTeX brut (`\hline`
rouge), remplacé.

Vérifié : `question:specs` 150 tirages par variation, 4/4 importables, 53 specs vertes, 0 `\textcolor` hors
`$` ; 800 réponses « faire tourner » recoupées par une exécution Python des programmes de l'énoncé (0 écart) ;
`maximum(0, 0.01)` et `longueur(0, 2, n)` exécutés pour les textes des corrections (`2.299999999999995` ;
4,47 et 4,58) ; brouillons en base locale (copie hors dépôt), aperçu admin des 4 « faire tourner » vu à l'écran,
face correction comprise (formules à virgule, code à point, tableau croisé, ✓/✗ élève par élève).

Commande pour David, après le merge (depuis le dépôt principal, à jour) :
`! pnpm tsx scripts/create-questions.ts --dir scripts/questions/2de-algorithmes-6 --publier`

Mergée (#2496, CI verte du premier coup).

Créés en brouillon par David (2026-11-09) : d01cf16b (361), f34d0f5f (362), 82101744 (387), e5da67bb (388) ;
ids commités sur la branche de la migration (`feat/questions-2de-algorithmes-6-rangement`), `main` remis propre.
Relevé prod (MCP, 2026-11-09, avant la migration) : 4 brouillons de seconde, sans nœud ni tag ; chemins
Fonctions › Généralités sur les fonctions › extremums et Statistiques › Tableaux croisés › tableau croisé
d'effectifs uniques et actifs.
Migration `20261109002041_questions_2de_algorithmes_6_rangement_tags` (calquée sur le lot 5, seules les données
changent ; 362 et 387 tagués d'un point posé sur la notion, accepté par la règle du nœud) : test d'intégration
12/12 vert, rouge sans les écritures (2 échecs, 5 sautés).
Audit `security-auditor` : 0 finding (bloquant ou non).
Mergée (#2498, CI verte) ; `check:migrations --pr` passé ; `db:migrate` lancé par David (seule migration en
attente, refusée au classifieur du mode auto) ; vérifié en prod : les 4 brouillons sur leur sous-notion, chacun
avec son seul point, `updated_at` inchangé (00:18, création). Page à cocher (aucune alerte) :
https://claude.ai/artifact/Xa6NaZXLSGiz8NxXghiSjz

Lot 6 relu par David sur la page à cocher (2026-11-09) : 4 « ok », sans commentaire. Publié par David
(`publier-lot.ts`, simulation puis `--publier`, 2026-11-09) : 4/4, statut relu en base. **Les 10 exemples
d'algorithmes sont couverts** (lots 4-6), en plus des 12 démonstrations (lots 1-3).

## 13. Suite : les approfondissements (ouverte le 2026-11-09)

**D4 (David, 2026-11-09)** : « Approfondissements » (choisis contre le versement immédiat) ; versement après.

Rubriques « Approfondissements possibles » de `2.md` (l. 321, 356, 423, 460 ; « en aucun cas obligatoires », l. 97) :
**14 points**. Relevé prod (MCP, 2026-11-09) : aucun modèle tagué sur les 14 points ; points et nœuds actifs.

| Lot | Point | Approfondissement                               | Nœud du point (prod)                                     | Forme pressentie              |
| --- | ----- | ----------------------------------------------- | -------------------------------------------------------- | ----------------------------- |
| 7   | 258   | Développement décimal illimité d'un réel        | Ensembles de nombres › ℕ, ℤ, 𝔻, ℚ, ℝ                     | application                   |
| 7   | 259   | Périodicité du développement décimal (exemples) | Ensembles de nombres › ℕ, ℤ, 𝔻, ℚ, ℝ                     | application, valeurs tirées   |
| 7   | 284   | Développement de (a + b + c)²                   | Calcul littéral › identités remarquables                 | application, valeurs tirées   |
| 7   | 285   | Développement de (a + b)³                       | Calcul littéral › identités remarquables                 | application, valeurs tirées   |
| 7   | 286   | Moyennes géométrique et arithmétique (a, b > 0) | **notion** Inégalités                                    | preuve                        |
| 8   | 305   | Barycentre de deux ou trois points              | **notion** Vecteurs                                      | application, valeurs tirées   |
| 8   | 306   | Établir la formule du milieu                    | Géométrie repérée › milieu et distance                   | preuve                        |
| 8   | 307   | Hauteurs concourantes                           | **notion** Géométrie repérée                             | preuve (vecteurs, sans p. s.) |
| 8   | 308   | Aire = ½ ab sin C (C aigu)                      | Aires › triangle quelconque                              | preuve + application          |
| 8   | 309   | Isobarycentre = intersection des médianes       | **notion** Vecteurs                                      | preuve                        |
| 8   | 310   | Médiatrices : centre du cercle circonscrit      | **notion** Géométrie repérée                             | preuve                        |
| 9   | 323   | Points équidistants d'un point et de l'axe (Ox) | **notion** Géométrie repérée                             | application, valeurs tirées   |
| 9   | 324   | Parties du plan décrites par des inégalités     | **notion** Géométrie repérée                             | application (figure)          |
| 9   | 363   | Courbes de √x et de x² sur ℝ⁺                   | Fonction racine carrée › définition et courbe (0 modèle) | application + preuve courte   |

**Déjà en base (1re spé, publiés)** : `d4db2207` « Démontrer que les médianes concourent au centre de gravité »
(1SPE-326, Vecteurs › combinaison linéaire) ne s'appuie que sur Chasles, le milieu et la colinéarité, donc
utilisable en seconde (2-309) ; `64f54fc1` « Points équidistants de l'axe des abscisses et d'un point » (1SPE-334,
Géométrie repérée › parabole) utilise distance et développement, également utilisable en seconde (2-323).
`d33f98d5` (hauteurs, 1SPE-325) passe par le produit scalaire, qui n'est pas au programme de seconde : il ne sert
pas pour 2-307.

Outils : ceux des lots 1-3 (case, case choix, ` ```ranger ` `signe: aucun`), `figure` / `courbe` ; pour 324, un
polygone rempli (`fillColor`) dans une figure, à vérifier au lot.

**D5 (David, 2026-11-09, « je suis tes recos »)** : Q1 les 14 points ; points-compétences hors chantier. Q2 preuves
(286, 306, 307, 309, 310, 308 en partie) à trous + variation « étapes à ranger », autres points en exercices
d'application à valeurs tirées (2-3 variations) ; 307 par la preuve vectorielle de seconde (ABC triangle des milieux
d'un grand triangle : hauteurs de ABC = médiatrices du grand, renvoi au 310). Q3 réemploi : `d4db2207` (médianes) et
`64f54fc1` (équidistance) reçoivent le niveau seconde et le tag 2-309 / 2-323, pas de nouveau modèle. Q4 un modèle
par point sur une sous-notion existante : celle du point (258, 259, 284, 285, 306, 308, 363) ; 286 → Inégalités ›
comparaison et encadrement ; 305, 309 → Vecteurs › combinaison linéaire ; 323 → Géométrie repérée › parabole ; 324 →
Géométrie repérée › équations de droites ; 307 → Figures planes › triangles et 310 → Figures planes › médiatrice et
bissectrice, **points 2-307 et 2-310 déplacés sous Figures planes** par la migration du lot 8. Q5 publication comme
les démonstrations. Q6 accès : personne de plus aux migrations ; à la publication, les élèves de seconde voient les
modèles (dont les 2 de 1re spé réemployés, déjà publiés). Lots 7, 8, 9 dans l'ordre du tableau.

## 14. Lot 7 : approfondissements, nombres et algèbre (2026-11-09)

Relevé prod (MCP, 2026-11-09) : 258, 259 sur Ensembles de nombres › ℕ, ℤ, 𝔻, ℚ, ℝ (niveaux 1-6) ; 284, 285 sur
Calcul littéral › identités remarquables (1-10) ; 286 sur la notion Inégalités, rangé sur « comparaison et
encadrement » (1-6, D5). Aucun modèle tagué sur les 5 points ; aucun modèle existant ne développe (a + b + c)² ou
(a + b)³.

| Point | Modèle (`scripts/questions/2de-approfondissements-7/`) | Nœud, niveau                               | Variations                                                                                              |
| ----- | ------------------------------------------------------ | ------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| 258   | `01-developpement-decimal-illimite`                    | ℕ, ℤ, 𝔻, ℚ, ℝ, 7                           | 0,ddd… = d/9 par 10x − x (case, d 1..8) ; 0,999… = 1 (choix) ; troncature de π à 10⁻ⁿ (case)            |
| 259   | `02-developpement-decimal-periodique`                  | ℕ, ℤ, 𝔻, ℚ, ℝ, 8                           | n-ième chiffre de a/7 (case, n 20..60) ; 0,uvuv… = uv/99 (case) ; restes de la division (choix)         |
| 284   | `03-developper-carre-d-une-somme-de-trois-termes`      | identités remarquables, 11                 | terme 2bc (case) ; (x + y + k)² développé (case, k 2..6) ; doubles produits oubliés (choix)             |
| 285   | `04-developper-cube-d-une-somme`                       | identités remarquables, 12                 | terme 3ab² (case) ; (x + k)³ développé (case, k −4..4 non nul) ; (a − b)³ (choix)                       |
| 286   | `05-demontrer-inegalite-des-moyennes`                  | Inégalités › comparaison et encadrement, 7 | coefficient 2 du double produit (case) ; carré positif (choix) ; exemple a = p², b = q² (case) ; étapes |

Script : `docs/wip/questions/lot-2de-approfondissements-7.py`. Pièges du lot : `pi` dans un `eval` se lit p × i →
`\pi` ; `2\sqrt{a}\sqrt{b}` refusé comme réponse à « a + b − ? » (le moteur ne sait pas a, b ⩾ 0) → la case du 286
demande le coefficient 2 devant `\sqrt{ab}`. `create-questions` ne lit que `.env` (la prod), pas `.env.local` : la
simulation a visé la prod (lecture seule) ; pour la base locale, `PUBLIC_SUPABASE_URL` et
`SUPABASE_SERVICE_ROLE_KEY` locaux passés en variables d'environnement, cible « LOCAL » vérifiée en simulation
avant `--publier`.

Vérifié : `question:specs` 150 tirages par variation, 5/5 importables, 60 specs vertes, 0 `\textcolor` hors `$` ;
aperçus relus (périodes de a/7, 0,uvuv…, exemple du 286) ; 5 brouillons créés en base locale (copie hors dépôt).
Non vu à l'écran : rien de neuf à l'affichage (étapes à ranger avec fractions déjà vues au lot 1).

Commande pour David, après le merge (depuis le dépôt principal, à jour) :
`! pnpm tsx scripts/create-questions.ts --dir scripts/questions/2de-approfondissements-7 --publier`

Mergée (#2510, CI verte du premier coup).

Créés en brouillon par David (2026-11-09) : 726d42bd (258), 85e575ea (259), f44a9209 (284), f5cc8558 (285),
ea999fe0 (286) ; ids commités sur la branche de la migration (`feat/questions-2de-approfondissements-7-rangement`),
`main` remis propre. Relevé prod (MCP, 2026-11-09, avant la migration) : 5 brouillons de seconde, niveaux 7, 8, 11,
12, 7, sans nœud ni tag ; chemins Ensembles › Ensembles de nombres › ℕ, ℤ, 𝔻, ℚ, ℝ, Algèbre › Calcul littéral ›
identités remarquables et Algèbre › Inégalités › comparaison et encadrement uniques et actifs.
Migration `20261109093006_questions_2de_approfondissements_7_rangement_tags` (calquée sur le lot 6, seules les
données changent ; 286 tagué d'un point posé sur la notion) : test d'intégration 12/12 vert, rouge sans les
écritures (6 échecs, 5 sautés).
Audit `security-auditor` : 0 finding (bloquant ou non).
PR #2513.
Mergée (#2513, CI verte) ; `check:migrations --pr` passé ; `db:migrate` lancé par David (seule migration en
attente) ; vérifié en prod : les 5 brouillons sur leur sous-notion, chacun avec son seul point, `updated_at` inchangé
(09:28, création). Page à cocher (1 alerte attendue : bloc ranger du 286 non dessiné, à jouer dans l'aperçu admin) :
https://claude.ai/artifact/U7YmhGzeFyQ1dB8u3fsft6

Lot 7 relu par David sur la page à cocher (2026-11-09) : 5 « ok », sans commentaire. Publié par David
(`publier-lot.ts`, simulation puis `--publier`, 2026-11-09) : 5/5, statut relu en base.

## 15. Lot 8 : approfondissements, géométrie (2026-11-09)

Relevé prod (MCP, 2026-11-09) : 305, 309 sur la notion Vecteurs ; 306 sur Géométrie repérée › milieu et distance ;
307, 310 sur la notion Géométrie repérée ; 308 sur Aires › triangle quelconque ; tous actifs, aucun modèle tagué.
Niveaux déjà présents : Vecteurs › combinaison linéaire 1-2, milieu et distance 1-3, Figures planes › triangles 1-2,
Aires › triangle quelconque 1-3, Figures planes › médiatrice et bissectrice 1-3. `d4db2207` (médianes) : publié,
grades `1_SPE`, niveau 2, sur Vecteurs › combinaison linéaire, tag 1SPE-326.

| Point | Modèle (`scripts/questions/2de-approfondissements-8/`) | Nœud, niveau                                  | Variations                                                                                                      |
| ----- | ------------------------------------------------------ | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 305   | `01-barycentre-de-deux-ou-trois-points`                | Vecteurs › combinaison linéaire, 3            | AG = k/(k+1) AB (case, k 2..5) ; G de GA + 2GB = 0 (deux cases) ; isobarycentre (deux cases) ; position (choix) |
| 306   | `02-demontrer-formule-du-milieu`                       | Géométrie repérée › milieu et distance, 4     | AI = IB en vecteurs (choix) ; 2x_I = x_A + x_B (case) ; coordonnées du milieu (deux cases) ; étapes             |
| 307   | `03-demontrer-hauteurs-concourantes`                   | Figures planes › triangles, 3                 | AQ = BC (choix) ; AR = −AQ (case) ; hauteur = médiatrice de [QR] (choix) ; étapes                               |
| 308   | `04-aire-d-un-triangle-par-le-sinus`                   | Aires › triangle quelconque, 4                | AH = b sin C (choix) ; pourquoi C aigu (choix) ; aire avec C = 30° (case) ; étapes (3)                          |
| 309   | réemploi `d4db2207` (migration : niveau seconde + tag) | Vecteurs › combinaison linéaire (inchangé)    | —                                                                                                               |
| 310   | `05-demontrer-mediatrices-concourantes`                | Figures planes › médiatrice et bissectrice, 4 | sécantes (choix) ; OB = OC (choix) ; cercle circonscrit (choix) ; étapes                                        |

Script : `docs/wip/questions/lot-2de-approfondissements-8.py`. Pièges du lot : couleur (`\textcolor`) sur une
phrase en `\text{…}` hors `$` refusée par `question:specs` → gras ; k = 1 affichait « 1 GB » → k de 2 à 5 ; worktree
neuf → `pnpm exec svelte-kit sync` avant `positions-ranger.ts` (alias `$lib`).

Vérifié : `question:specs` 150 tirages par variation, 5/5 importables, 65 specs vertes, 0 `\textcolor` hors `$`, 0
avertissement ; 5 brouillons créés en base locale (copie hors dépôt, cible « LOCAL » vérifiée en simulation).

Commande pour David, après le merge (depuis le dépôt principal, à jour) :
`! pnpm tsx scripts/create-questions.ts --dir scripts/questions/2de-approfondissements-8 --publier`

Mergée (#2517, CI verte du premier coup).

Créés en brouillon par David (2026-11-09) : 6bd8366f (305), 574142b3 (306), b1b7bfc1 (307), 31177044 (308),
13908afe (310) ; ids commités sur la branche de la migration (`feat/questions-2de-approfondissements-8-rangement`),
`main` remis propre. Relevé prod (MCP, 2026-11-09, avant la migration) : 5 brouillons de seconde, niveaux 3, 4, 3,
4, 4, sans nœud ni tag ; `d4db2207` publié, `{1_SPE}`, sur Vecteurs › combinaison linéaire ; 2-305 à 2-310 sans tag ;
chemins visés uniques et actifs.
Migration `20261109110745_questions_2de_approfondissements_8_rangement_tags` (lot 7 + déplacement des points
2-307 / 2-310 sous Figures planes + réemploi de `d4db2207`, `array_append` du grade `2` et tag 2-309) : test
d'intégration 16/16 vert, rouge sans les écritures (5 échecs, 8 sautés). Le déplacement des points joue aussi en
base locale : fixture `seed-2de-points.json` (2-307, 2-310) et en-tête de `seed-curriculum-points-2de.test.ts`
mis à jour.
Audit `security-auditor` : 0 finding bloquant (une note faible : la garde du rollback ne vérifie pas que les
5 modèles sont encore des brouillons, sans effet sur les accès).
