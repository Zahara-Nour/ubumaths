---
title: Écarts restants — lots pour des sessions en parallèle
date: 2026-11-28
status: lots écrits le 2026-11-28 ; en cours : constructions, interface-eleve, carnet-notifications, moderation-surveillance
---

# Écarts restants : lots pour des sessions en parallèle

Les 195 écarts « à faire » du [registre](../ecarts/registre.md), relevés le 2026-11-28, rangés en lots
qui ne touchent pas les mêmes fichiers. Demandé par David le 2026-11-27 pour avancer à plusieurs
sessions. Chantier parent : [ecarts-a-trier](ecarts-a-trier-progress.md).

Le rangement vient du domaine et du constat de chaque ligne, **pas d'une lecture du code** : une
session qui découvre que son écart touche les fichiers d'un autre lot le dit ici (colonne « Notes »)
avant d'y toucher.

## Règles

1. **Au plus quatre sessions à la fois, dont une seule sur mathAST** (même bibliothèque, même
   fichier de preuves `tests/ecarts/mathast.test.ts`, même doc). Le typecheck et la pile de test
   se font un à la fois : exit 2 = attendre.
2. **Prendre un lot** : depuis le dépôt principal, `git pull --rebase`, écrire dans la colonne
   « Pris par » le nom de la session et la date, commiter ce seul fichier
   (`git commit -m … -- docs/wip/ecarts-lots.md`) et pousser **avant** tout travail. Un lot déjà
   pris ne se prend pas.
3. **Un lot = un chantier** : sujet `ecarts-<lot>`, worktree `ubumaths-wt-ecarts-<lot>`, journal
   `docs/wip/ecarts-<lot>-progress.md` avec son bloc « Reprendre ici ». **Ne pas réécrire le bloc
   d'`ecarts-a-trier`** : il est commun, les sessions s'y marcheraient dessus.
4. **Une PR = une session.** Un lot de petits écarts sans décision peut tenir en une PR ; un bug
   visible qui demande un choix de forme a sa PR. Après chaque merge : `/clear`, puis
   `/reprendre ecarts-<lot>`.
5. **Les écarts d'abord vérifiés** : une ligne du registre peut être périmée ou fausse. Écart
   déjà corrigé ou faux → le clore au registre en le disant, sans code.
6. **Décisions** : un lot marqué « sans décision » se fait sans question à David. Dans les
   autres, chaque bug visible commence par sa phase 0 (comportements en français, attendre la
   réponse). Pas de chasse aux cas voisins : on corrige l'écart inscrit, et un cas voisin n'entre
   au registre que s'il vient d'un cas réel d'élève ou de prof.
7. **Clore un lot** : barrer ses lignes au registre, écrire ici « fait (#PR) », archiver le
   journal. Commits de doc directs sur `main`, toujours avec `-- <ses fichiers>`.
8. **Écart nouveau** : `pnpm ecarts ajouter` depuis le dépôt principal, comme d'habitude. Il
   n'entre dans aucun lot : il va dans « Hors lots » en bas de ce fichier.

Pour lancer une session, David tape dans une session neuve **`/prendre-lot`** (la skill choisit
le premier lot libre) ou `/prendre-lot <nom>`. La skill
[`prendre-lot`](../../.claude/skills/prendre-lot/SKILL.md) réserve le lot et ouvre son chantier.

Colonne « Pris par » : vide = libre ; `ecarts-<lot> (date)` = en cours ; `fait (#PR, date)` = fini.

## Lots sans décision (mécaniques)

| Lot                 | Écarts                                                                                                                                              | Pris par                        | Notes                                                                                                                                                                                                                                                    |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `commentaires`      | C21, C22, C23, C24, C25, C27, C28, C30, C31, C33, C34, C37, C38, C40, C42, C43 (commentaires du code, une PR) ; C26, C29, C41 (docs, commit direct) | fait (#3258, 2026-11-28)        | À passer en premier et vite : ses fichiers sont ceux des autres lots, mais il n'y change que des commentaires.                                                                                                                                           |
| `morts-utilitaires` | M27, M31, M50, M51, M53, M54, M56, M57, L115                                                                                                        | fait (#3259, 2026-11-28)        | Fait. `exerciseFont.svelte.ts` n'a plus d'importeur depuis la suppression de `FontSelector` : c'est M58 (`morts-interface`).                                                                                                                             |
| `morts-routes`      | M23, M24, M25, M26, M42, M43, M45                                                                                                                   | fait (#3261, 2026-11-28)        | Routes d'API sans appelant : grep des adresses dans `src`, `e2e` et `tests` avant de supprimer. M24 : preuve réécrite (verte seulement avec un appelant). Laissé : le RPC SQL `add_warning`, sans appelant depuis M43 (une migration, à décider à part). |
| `morts-interface`   | M32, M33, M34, M47, M49, M52, M58                                                                                                                   | fait (#3260, #3268, 2026-11-28) | M48 passé au lot `interface-prof` : `isTrivialHtmlWrapper` est l'outil du correctif de V118, à brancher, pas à retirer.                                                                                                                                  |
| `formatdate`        | M55                                                                                                                                                 |                                 | `formatDate` recopiée 82 fois : touche des fichiers de tous les lots. **Seul, en dernier**, quand aucun autre lot n'est en cours.                                                                                                                        |

## Lots de bugs, par zone

| Lot                       | Écarts                                                           | Pris par                                    | Notes                                                                                                                                                               |
| ------------------------- | ---------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fiches`                  | V108, V109, V111, L9, L85, L86, L111, T23, M44                   | fait (#3267, #3275, 2026-11-28)             | PDF et Typst.                                                                                                                                                       |
| `blocs`                   | V110, L88, L89, L90, L91, L92, L93                               | fait (#3266, #3270, 2026-11-28)             | Agent `pedagogy-expert`.                                                                                                                                            |
| `geometrie`               | V77, V119, L57, L58, L59, L60, L61, M19                          | fait (#3271, 2026-11-28)                    | Fait. L60 corrigé dans mathAST (`analyzeContinuity`) : le domaine de tan(x) + 1/(x − 3) reste incomplet (`intersect`), écrit dans `docs/systeme/mathast/README.md`. |
| `constructions`           | V76, L56, M35, M36, M37, M38                                     | ecarts-constructions (2026-11-28)           | M38 : vérifier d'abord en prod (lecture seule) qu'il ne reste aucune construction au format JSON.                                                                   |
| `cache`                   | L43, L44, L45, L47, L48, L54, M28, M29, M30                      | fait (#3277, #3280, 2026-11-28)             |                                                                                                                                                                     |
| `interface-prof`          | V74, V106, V116, V118, V120, V121, V122, V123, L41, L116, M48    | fait (#3276, 2026-11-28)                    | Fait. V106 et M48 : preuves réécrites (nom fictif d'un autre test ; fonction branchée par V118).                                                                    |
| `interface-eleve`         | V73, V75, V117, L42, L46, L50, L52, L53, L55, L108, L114         | ecarts-interface-eleve (2026-11-28)         | Petits bugs de l'élève et des pages publiques.                                                                                                                      |
| `cours-evaluations`       | V72, L37, L38, L39, L40, L112, L113                              | fait (#3291, #3300, 2026-11-28)             | L112, L113 : base de données, tests d'intégration.                                                                                                                  |
| `carnet-notifications`    | V107, L78, L79, L80, L81, L82, L83                               | ecarts-carnet-notifications (2026-11-28)    | Données d'élèves et de parents : `code-reviewer` + `security-auditor`.                                                                                              |
| `moderation-surveillance` | L109, L110, L122, L123, L124, L125, T26, T34, T36, C39, M59, D45 | ecarts-moderation-surveillance (2026-11-28) | D45 est une décision de produit : la poser à David. T26, T34 : `security-auditor` ; T26 touche le rendu des contenus d'élèves, ne jamais l'élargir.                 |
| `messagerie`              | V135, L84, L127, L131, L132, L133, L134, L135, T37, M41, C44     |                                             | Fonctions SQL et droits : migrations, question d'accès à David avant tout SQL, `security-auditor`.                                                                  |

## Lots mathAST (un seul à la fois, dans cet ordre)

Chaque bug visible y demande un choix de forme : c'est la session qui pose des questions à David.
Sondes par le chemin de l'Atelier (`runInput`), jamais `pnpm math`. Agent `mathast-expert`, revue
`code-reviewer` en Opus.

| Lot                    | Écarts                                                                     | Pris par | Notes                                     |
| ---------------------- | -------------------------------------------------------------------------- | -------- | ----------------------------------------- |
| `mathast-limites`      | V125, L28 bis, L74, L75, L76, L77, L117, L118, L119, L121                  |          | Limites et domaines. V125 d'abord.        |
| `mathast-second-degre` | V40, V93, V94, V95, V96, L70, L71, L120                                    |          | Second degré à paramètre et racines.      |
| `mathast-ln`           | V80, V81, V82, V84, L62, L63, L65                                          |          | Simplification des logarithmes.           |
| `mathast-trigo`        | V88, V89, V90, V91, L64, L69                                               |          |                                           |
| `mathast-integrales`   | V17, V64, V98, V99, V100, V101                                             |          | Intégrales et primitives.                 |
| `mathast-divers`       | V34, V78, V79, V83, V86, V87, V97, V102, L15, L25, L66, L67, L68, L72, M39 |          | À recouper en deux si la session s'étire. |

## Hors lots

- **T13, T19** (conformité, RGPD) : papier et essai de restauration, avec David, pas une session de code.
- Les 68 lignes ouvertes qui ne sont pas « à faire » (suspendues avec le tuteur, en attente de
  David, reportées, à trier) ne sont dans aucun lot.
- Écarts ajoutés après le 2026-11-28 : à lister ici.
- **V138** (domaine de tan(x) + 1/(x − 3) qui oublie x = 3) : refus honnête attendu, à prendre avec `mathast-limites` (décision de David, 2026-11-28).
- **T38, L140** (fiches, PDF) : relevés par `security-auditor` sur la PR du lot `fiches` (2026-11-28), antérieurs à la branche ; zone du lot `fiches`.
- **V139** (points `_p…` du carré avec étiquette) : relevé par la session `ecarts-constructions` (2026-11-28) en voyant le carré à l'écran ; moteur de géométrie (convention « nom en `_` = sans étiquette »), phase 0 à faire.
- **L141** (cache : Palotin de l'élève et tableau de bord prof qui ne suivent pas leur échéance, même défaut que L43) : inscrit à la demande de David le 2026-11-28, à la fin du lot `cache`.
