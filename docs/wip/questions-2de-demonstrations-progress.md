# Chantier « questions-2de-demonstrations » — les démonstrations de la seconde en modèles de questions

> Suite du chantier `questions-2de` (seconde couverte, § 93 de son journal) : ses points P (Q2) restés sans modèle.
> Modèle suivi : chantier `questions-1spe-demonstrations` (D1, D2, D8 de son journal).
> Bornes : `docs/systeme/programmes/bornes/lycee/2de.json` ; BO : `src/lib/server/programmes/transcriptions/2.md`.

## Reprendre ici

_Mis à jour le 2026-11-08, après #2434 ; rangement du lot 1 poussé, sans PR (§ 4)._

- **État** : lot 1 mergé (#2434) et créé en brouillon en prod ; ids dans les JSON, migration nœud + tag
  `20261106130142` et son test écrits et poussés (`check:incremental` 0 erreur) ; `security-auditor` : RAS ;
  test d'intégration pas encore lancé ; pas de PR.
- **Prochaine action** : quand la base locale est libre (feu vert de David), lancer
  `pnpm test:integration tests/integration/questions-2de-demonstrations-1-rangement-tags.test.ts`, le vérifier
  rouge sans la migration, puis PR → CI → merge → `db:migrate` depuis la branche mergée → page à cocher.
  Ensuite lot 2 (géométrie : 304, 438, 320).
- **En attente de David** : son « vas-y » pour lancer la suite d'intégration (elle supprime les profs de la base
  locale ; le lien de partage de `teacher@local.test` qui la bloquait le 2026-11-06 a disparu depuis).
- **Pièges en cours** : écritures en prod → commande `!` donnée à David ; `create-questions` écrit l'`id` dans les
  JSON du dépôt d'où il tourne → les reporter sur la branche puis `git restore` dans le dépôt principal ; positions
  « ranger » par `docs/wip/questions/positions-ranger.ts` ; couleur jamais sur du texte hors `$`.
- **Worktree / branche** : `../ubumaths-wt-questions-2de-demonstrations` · `content/questions-2de-demonstrations-2-rangement`.

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

**Hors chantier pour l'instant** (restent P) : approfondissements (258, 259, 284-286, 305-310, 321-324, 361-363,
387, 388), exemples d'algorithmes (241, 242, 257, 283), compétences (216, 217, 353, 493-495). Suites possibles,
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

Migration `20261106130142_questions_2de_demonstrations_1_rangement_tags.sql` (gabarit `20261106050929`, gardes et
rollback identiques) ; test `tests/integration/questions-2de-demonstrations-1-rangement-tags.test.ts`. Accès :
personne de plus (Q5).

Piège : le test d'intégration n'a pas pu tourner — la préparation globale (suppression des profs) bute sur un lien de
partage du journal de classe créé à 12 h 49 par `teacher@local.test` et utilisé (17 accès) ; non supprimé, en
attente du feu vert de David. `security-auditor` (2026-11-06) : aucun finding ; le lien a disparu depuis.
