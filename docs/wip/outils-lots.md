---
title: Outils manquants — lots pour des sessions en parallèle
date: 2026-11-28
status: lots écrits le 2026-11-28 ; en cours : tableau-variation, equerre-uni, yohaku
---

# Outils manquants : lots pour des sessions en parallèle

Les outils « À faire » de [outils-manquants.md](outils-manquants.md) § 1, rangés en lots qui ne
touchent pas le même module. Demandé par David le 2026-11-28 pour finir les outils à plusieurs
sessions. **L'ordre du tableau est l'ordre de priorité** (points du programme de l'école et du
collège d'abord).

`pnpm outils` montre l'état ; `pnpm outils lancer` réserve les lots libres et ouvre une session
par lot (worktree + Claude avec Remote Control, dans tmux) ; chaque session suit la skill
`/prendre-outil`.

## Règles

1. **Au plus cinq lots en cours, dont un seul « mathAST »** (même bibliothèque de correction). Le
   typecheck et la pile de test se font un à la fois : exit 2 = attendre.
2. **Prendre un lot** : depuis le dépôt principal, `git pull --rebase`, écrire dans « Pris par »
   `outil-<lot> (AAAA-MM-JJ)`, commiter ce seul fichier et pousser **avant** tout travail
   (`pnpm outils reserver <lot>` le fait). Un lot pris ne se prend pas.
3. **Un lot = un chantier** : sujet `outil-<lot>`, worktree `ubumaths-wt-outil-<lot>`, branche
   `feat/outil-<lot>`, journal `docs/wip/outil-<lot>-progress.md` avec son bloc « Reprendre ici ».
4. **Phase 0 pour chaque outil** : comportements en français (nominal, limite, erreur), avec un
   exemple d'élève, puis attendre la réponse de David. Une PR par outil ; après chaque merge,
   `/clear` puis `/reprendre outil-<lot>`.
5. **Les modèles de questions qui se servent de l'outil ne font pas partie du lot** : ils restent
   aux sessions « questions » / « idées ».
6. **Un lot dont « Notes » dit qu'il attend quelque chose** ne se prend pas tant que ça dure.
7. **Clore un lot** : chaque outil passe dans « Livré » d'`outils-manquants.md` avec sa PR ;
   écrire ici `fait (#PR, AAAA-MM-JJ)` ; archiver le journal. Commits de doc directs sur `main`,
   toujours avec `-- <ses fichiers>`.

## Lots

| Lot                    | Outils (n° d'`outils-manquants.md`) | Module                                       | Pris par                             | Notes                                                           |
| ---------------------- | ----------------------------------- | -------------------------------------------- | ------------------------------------ | --------------------------------------------------------------- |
| `tableau-variation`    | 63, puis 59                         | `instance-generator`, ` ```variation `       | outil-tableau-variation (2026-11-28) | 63 est un défaut en prod : le premier                           |
| `equerre-uni`          | 40, puis 38, puis 45                | figure à compléter, `construction/line.ts`   | outil-equerre-uni (2026-11-28)       | 45 dépend du 40                                                 |
| `triangle-quadrillage` | 47                                  | figure à compléter, contrôle `triangle`      | fait (#3289, 2026-11-28)             | même module que `equerre-uni` : `merge origin/main` avant la PR |
| `graduer-segment`      | 61                                  | ` ```line `                                  | fait (#3293, 2026-11-28)             |                                                                 |
| `equation-lignes`      | 55                                  | mathAST (équivalence), case neuve            | fait (#3292, 2026-11-28)             |                                                                 |
| `second-tag`           | 66                                  | `migration-rangement.ts`                     | fait (#3297, 2026-11-28)             | petit                                                           |
| `yohaku`               | 56                                  | bloc neuf                                    | outil-yohaku (2026-11-28)            |                                                                 |
| `espace`               | 64, puis 65                         | case neuve, ` ```solide `                    |                                      |                                                                 |
| `escalier-suite`       | 48                                  | ` ```courbe `                                |                                      |                                                                 |
| `ecritures-exactes`    | 62                                  | mathAST (`checkForm`, `cosmetic-transforms`) |                                      | attend la fin de `fusion-moteurs` (même code)                   |
| `python`               | 49                                  | case neuve, `python-exercises`               |                                      | le plus gros                                                    |
| `engrenages`           | 52                                  | bloc neuf                                    |                                      | aucun point du programme : en dernier                           |
