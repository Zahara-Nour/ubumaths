# Chantier « questions-2de-demonstrations » — les démonstrations de la seconde en modèles de questions

> Suite du chantier `questions-2de` (seconde couverte, § 93 de son journal) : ses points P (Q2) restés sans modèle.
> Modèle suivi : chantier `questions-1spe-demonstrations` (D1, D2, D8 de son journal).
> Bornes : `docs/systeme/programmes/bornes/lycee/2de.json` ; BO : `src/lib/server/programmes/transcriptions/2.md`.

## Reprendre ici

_Mis à jour le 2026-11-08, après #2476 (lot 4 mergé)._

- **État** : 12 démonstrations publiées (lots 1-3). Algorithmes (D3, 10 points) : lot 4 (241, 242, 257, 283) mergé (#2476), pas encore en base.
- **Prochaine action** : David lance `create-questions --publier` (§ 10) → migration nœud + tag
  → page à cocher ; puis lot 5 (321, 322) et lot 6 (361, 362, 387, 388).
- **En attente de David** : `! pnpm tsx scripts/create-questions.ts --dir scripts/questions/2de-algorithmes-4 --publier`
  (depuis le dépôt principal).
- **Pièges en cours** : écritures en prod → commande `!` donnée à David (même la simulation de `publier-lot`) ;
  merge refusé pendant un `deploy:prod` (verrou « deploy ») → attendre ; worktree neuf → `svelte-kit sync` avant
  `question:specs` ; `create-questions` lit `.env` (prod) : en local, passer l'URL et la clé de `.env.local`.
- **Worktree / branche** : `ubumaths-wt-questions-2de-demonstrations` (branche du lot 4 mergée ; la migration
  nœud + tag prendra une branche neuve).

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
