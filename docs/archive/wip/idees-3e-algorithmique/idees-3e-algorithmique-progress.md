# Chantier `idees-3e-algorithmique` — idées de la rubrique « Algorithmique et programmation » de 3e

## Reprendre ici

_Mis à jour le 2026-11-28, chantier clos._

- **État** : 13 variations de 6 modèles publiés en prod (#3294) ; modèle neuf de 5e E (`d01396e6`,
  5-011) rangé (#3301) et publié par David (`published` relu en prod) ; série de relecture `1ec193bd`
  (#3305) ; relecture validée par David. Rubrique 3I1 « publiée », réservations levées. **Chantier
  clos et archivé.** · **Prochaine action** : aucune · **En attente de David** : rien · **Pièges en
  cours** : aucun · **Worktree / branche** : aucun.

## Rubrique

« Algorithmique et programmation » de 3e (code 3I1, 11 exercices), réservée le 2026-11-28 dans
[idees-ailleurs-repartition.md](../../../wip/idees-ailleurs-repartition.md).

## Phase 0 (2026-11-28)

Page à cocher : https://claude.ai/artifact/Mv3B7G3XB2r8X3jjjYoE4u (collection `verdicts`, une entrée par
fiche A à H, R, Q1). Une case par question, coup de pouce et trois erreurs prévues par case, `testSpecs`
sur chaque variation, programmes en ` ```scratch ` (blocs `aller à x: y:`, `ajouter … à x`, `abscisse x`
et `modulo` vérifiés dans le dictionnaire français de scratchblocks).

| Fiche | Idée                                                                                                                                         | Recommandation                                                                    | Point         |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------- |
| A     | Position finale du lutin (3I1, 3I10-1)                                                                                                       | 9f9bddbd v5, v6 ; 4ce8eb3c v5                                                     | 3-048 ; 3-049 |
| B     | Syracuse : compteur, plus grande valeur (3I1-1, 3I12-6)                                                                                      | 4ce8eb3c v6, v7                                                                   | 3-049         |
| C     | Écrire le programme de Syracuse (` ```calcul `)                                                                                              | 6e99d291 v4                                                                       | 3-051         |
| D     | Quelle valeur saisir (Thalès, équation, produit nul, Pythagore) (3I12-6)                                                                     | 962da675 v4 à v7                                                                  | 3-047         |
| E     | Diviseurs et multiples avec un programme (3I12-1 à 4)                                                                                        | **modèle neuf de 5e**, 5 variations, sous-notion « instructions conditionnelles » | 5-011         |
| F     | Écrire le programme qui compte les diviseurs                                                                                                 | 6e99d291 v5                                                                       | 3-051         |
| G     | Tableur : moyenne d'une semaine de températures (3I13-1)                                                                                     | 5c092e43 v5 (``choix, décision Q22 du 2026-11-18)                                 | 3-032         |
| H     | Paramètres d'un bloc personnalisé (3I1DNB-0)                                                                                                 | 0a470416 v4                                                                       | 3-050         |
| R     | 3I12-5 (copie de 6I1B-6) → session 6I1 ; dichotomie (2de), tableur hors statistique, questions descriptives, figure à choisir, bloc à écrire | rien                                                                              | —             |

Questions :

- **Q1** : E (5-011, 5e) dans ce chantier, ou en « Idées en attente » ? Recommandation : dans ce chantier.
- **Accès de la migration** : personne ne gagne d'accès, on range un modèle et on complète des modèles.

Aucun outil manquant : le plateau de couleurs de 3I10-1 devient une position (x ; y), et la formule de
tableur reste à choisir (Q22).

## Décisions de David (2026-11-28)

« Je valide tes recos » : toutes les recommandations de la page à cocher (A à H, R), Q1 : E dans ce
chantier. Personne ne gagne d'accès. Les six modèles publiés sont réservés dans le tableau de
répartition ; 3I12-5 est noté en « Idées en attente » pour la session 6I1.

## Lot (2026-11-28)

Scripts `docs/wip/questions/idees-3e-algorithmique-publies.py` (export de prod du 2026-11-28,
variations ajoutées à la fin) et `docs/wip/questions/idees-3e-algorithmique-neufs.py`.

| Modèle                                                | Ajout                                                                                                                    | Point                                                  |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| 9f9bddbd Conditions composées                         | v5 : lutin, condition « ou » après deux déplacements ; v6 : « et » dans 5 tours                                          | 3-048                                                  |
| 4ce8eb3c Répéter jusqu'à                              | v5 : lutin jusqu'à abscisse > k ; v6 : Syracuse, compteur ; v7 : Syracuse, maximum                                       | 3-049                                                  |
| 6e99d291 Écrire un programme                          | v4 : nombre d'étapes de Syracuse ; v5 : nombre de diviseurs (``calcul 3e)                                                | 3-051                                                  |
| 962da675 Plusieurs variables                          | v4 : Thalès (AE) ; v5 : équation ; v6 : produit nul (valeur positive) ; v7 : Pythagore                                   | 3-047                                                  |
| 5c092e43 Formules du tableur                          | v5 : moyenne de températures négatives comprises, en colonne B2:B6                                                       | 3-032                                                  |
| 0a470416 Bloc personnalisé                            | v4 : a et b d'un bloc « losange » (b = 180 − tour)                                                                       | 3-050                                                  |
| **Neuf** Diviseurs et multiples avec un programme (E) | 5 variations : condition à choisir, couple « multiple », nombre de diviseurs dits, 3e diviseur, ce que fait le programme | 5-011 (5e, « instructions conditionnelles », niveau 1) |

- Chaque variation : coup de pouce, erreurs prévues (deux ou trois par case, choix exclus), specs.
  `question:specs` vert sur les sept fichiers ; sonde Scratch (`checkScratchProgram` sur chaque bloc
  tiré, 200 tirages par modèle) : 1 734 blocs, 0 problème ; `create-questions` en simulation vert (E).
- Écarts avec les fiches : A1 n'a que deux erreurs prévues par case (« ou lu comme et » et « branche
  échangée » donnent la même position) ; G en colonne et sur cinq jours (en ligne, le tableau
  débordait à 390 px, vu à l'écran) ; H sans erreur prévue sur a (aucune erreur réelle) ; messages
  en « degrés » (le juge réécrit `60°` en `60 °`).
- **Vu à l'écran** (`/dev/modeles` en local, WebKit, iPhone 13, copies locales, `.captures/algo/`) :
  blocs Scratch dessinés (lutin, Syracuse, Thalès, équation, produit nul, losange, condition vide
  de E v1, conditions dans un choix) ; positions et valeurs attendues recalculées à la main sur les
  tirages vus. Réponses justes et fausses non jouées à la main : les specs passent par le même juge.
- Migration `20261128132651_questions_idees_3e_algorithmique_publies_contenu.sql` et sa fixture,
  générées par `migration-contenu.ts` (relevé de la prod du 2026-11-28).
- Test `migrations-contenu-publie` vert (2026-11-28, 351 tests). `security-auditor` : aucun finding
  bloquant ; personne ne gagne ni ne perd d'accès (6 UPDATE gardés, rollback cohérent, contenu sans
  donnée réelle ni lien).
- #3294 mergé le 2026-11-28 (CI verte, `pr:merger`).
- Migration `20261128132651` en prod le 2026-11-28 (David, `db push --include-all`, avec `20261128072151`) ; variations relues en prod par le MCP.

## Rangement de E (2026-11-28)

- `create-questions --publier` par David : E = `d01396e6-9123-481c-9143-d8452c7ff1fe`, brouillon.
- Migration `20261128140707_questions_idees_3e_algorithmique_neufs_rangement_tags.sql` générée par
  `migration-rangement.ts` (relevé de la prod), fixture comprise.
- Série de relecture des 6 modèles publiés : `scripts/series/3-relecture-algorithmique-publies.json`
  (6 questions, 6 min ; simulation verte).
- #3301 mergé le 2026-11-28 (CI verte, `pr:merger`) ; test `migrations-rangement-tags` vert, `security-auditor` sans finding bloquant (non bloquant : la rubrique du point 5-011, « Nombres et calculs > Opérations », ne colle pas à sa branche « Algorithmique », donnée antérieure au chantier).
- 2026-11-28 : `db:migrate` (rangement de E) et série `1ec193bd` par David ; nœud et tag 5-011 relus en prod ; relecture validée par David dans la conversation (« je valide la relecture »), aucun verdict à lire en base.
- 2026-11-28 : E publié par David (`publier-lot.ts --publier`), `published` relu en prod ; tableau de répartition à jour ; journal versé dans `docs/archive/wip/idees-3e-algorithmique/`.
