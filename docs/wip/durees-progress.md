# durees — statistiques régulières des durées (CI, PR, mise en prod, local)

## Reprendre ici

_Mis à jour le 2026-11-23, à l'ouverture (aucune PR)._

- **État** : chantier ouvert le 2026-11-23 à la demande de David, à la suite d'`environnement-workflow` (clos). **Phase 0 validée par David (« je valide »)**, trois questions tranchées (ci-dessous). Rien n'est codé.
- **Prochaine action** : PR 1 = CI, PR et mise en prod (aucune commande existante à modifier, sauf `pnpm deploy:prod` qui note ses étapes) : fichier de référence, relevé nocturne, alerte, `pnpm durees`. Commencer par relever les durées réelles sur les PR ouvertes depuis #3025 pour écrire la référence, et la faire valider par David.
- **En attente de David** : la validation des chiffres de la référence, une fois mesurés.
- **Pièges en cours** : un runner GitHub lent arrive tous les jours, ne jamais alerter sur une seule mesure ; #3024, ouverte neuf minutes après la pose du cache Prettier, était encore lente (cache de `main` pas refait) : écarter de la référence les PR d'avant #3025 ; les durées locales dépendent de la charge du Mac mini (une vingtaine de worktrees, un gros process à la fois).
- **Worktree / branche** : aucun.

## La demande (David, 2026-11-23)

Des statistiques régulières sur le temps pris par les différentes phases (CI, build, lint, typecheck, svelte-check, tests unitaires, tests d'intégration, PR, merge), en local et en prod, pour détecter un temps visiblement beaucoup plus long que la normale, avec pour référence les temps obtenus depuis les modifications d'`environnement-workflow`.

## Phase 0 (validée)

- **Référence écrite** dans un fichier du dépôt : la durée normale de chaque phase, mesurée après les modifications.
- **Relevé chaque nuit** : médiane de chaque phase sur les PR des dernières 24 heures, comparée à la référence.
- **Alerte seulement en cas d'écart net**, par le canal de la surveillance du Mac mini (notification ntfy, `scripts/surveillance-machine.sh`). Exemple : « Lint : 6 min 40 de médiane sur 12 PR, référence 1 min 30 ».
- **`pnpm durees`** : le tableau à la demande, avec la tendance sur 7 jours.
- **Sources** : GitHub garde la durée de chaque job et de chaque étape (`gh api repos/{owner}/{repo}/actions/jobs/<id>`, `gh run list`, `gh pr list --json createdAt,mergedAt`) ; `pnpm deploy:prod` connaît ses étapes (CI de la version, construction Vercel, bascule) ; en local rien n'est enregistré aujourd'hui.

### Tranché par David

1. **Seuil** : médiane du jour au moins 1,5 fois la référence, sur au moins 5 mesures. Une seule PR lente ne déclenche rien.
2. **Mise à jour de la référence** : David seul, par une commande (`pnpm durees --reference`), quand un changement voulu modifie une durée. Jamais d'ajustement automatique (une lenteur installée deviendrait la normale).
3. **Ordre** : d'abord la CI, les PR et la mise en prod ; le local dans une seconde PR (les commandes `check:incremental`, tests, pre-push, `pnpm pr:merger` notent leur durée dans un journal du Mac mini).

## Premiers chiffres, pour amorcer la référence (à remesurer)

Relevés le 2026-11-23 pendant `environnement-workflow` ; détail dans [son journal archivé](../archive/environnement-workflow-progress.md).

| Phase                                          | Avant                        | Après                                             |
| ---------------------------------------------- | ---------------------------- | ------------------------------------------------- |
| Étape « Run Prettier check »                   | 270 s (#3022)                | 24 à 35 s (#3025, #3026, #3027)                   |
| Job Lint entier                                | 7 min 25 (#3022)             | 1 min 15 à 1 min 57                               |
| Étape « Guard doc coverage »                   | 72 s                         | 5 s (#3025)                                       |
| Ouverture → merge, un seul push                | 13 min (#3022, trois pushes) | 7 min 29 à 7 min 34 (#3023, #3025)                |
| `pnpm docs:check-a-jour --couverture` en local | 25 s                         | 3 à 4 s                                           |
| Mise en prod v0.102.0                          | —                            | CI de la version 7 min, construction Vercel 3 min |

Mesures du 2026-11-22, avant les modifications (238 runs) : CI médiane 7 min, p90 9 ; Type Check 395 s (dont svelte-check 371 s) ; tests client 343 et 369 s ; tests serveur 210 à 308 s ; Build 106 s ; intégration, morceaux récents 200 à 245 s.
