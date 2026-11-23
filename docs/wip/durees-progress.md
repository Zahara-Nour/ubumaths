# durees — statistiques régulières des durées (CI, PR, mise en prod, local)

## Reprendre ici

_Mis à jour le 2026-11-23, après #3032._

- **État** : PR 1 mergée (#3032) : référence validée par David (`scripts/durees/reference.json`), `pnpm durees` (tableau, `--releve`, `--reference`), `pnpm deploy:prod` note ses étapes, relevé de 6 h 40 dans l'installeur launchd. Worktree et branche retirés. Relevé du matin **installé** sur le Mac mini le 2026-11-23 (accord de David) et essayé sous launchd : sortie 0, « RAS ».
- **Prochaine action** : PR 2 = le local (`check:incremental`, tests, pre-push, `pnpm pr:merger` notent leur durée dans un journal du Mac mini ; `pnpm durees` les montre). Phase 0 déjà validée (ordre tranché, point 3) ; poser à David la question des tests d'intégration ci-dessous avant de coder.
- **En attente de David** : dire s'il veut aussi mesurer les tests d'intégration (`nightly-integration.yml`, hors `quality.yml`, donc absents de la PR 1).
- **Pièges en cours** : `/data` est ignoré par git, d'où la référence sous `scripts/durees/` ; un runner GitHub lent arrive tous les jours, ne jamais alerter sur une seule mesure ; aucune mesure d'avant #3025 (`depuis` de la référence) ; une exécution avec un job sauté (PR de contenu) ne compte pas ; « bascule du site » n'a pas de référence tant qu'il n'y a pas 5 mises en prod notées ; les durées locales dépendent de la charge du Mac mini.
- **Worktree / branche** : aucun (à créer pour la PR 2 : `ubumaths-wt-durees-local`).

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

## PR 1 : CI, PR, mise en prod (2026-11-23)

Référence validée par David (« oui ») sur les 6 exécutions complètes des PR #3025 à #3030 : médiane de chaque phase, alerte à 1,5 fois. Détails de conception retenus en codant :

- **Exécution complète seulement** : un job sauté (PR de contenu, #3029 : CI en 3 min 36, tests serveur en 2 s) et l'exécution entière est écartée.
- **CI entière** : première tentative verte seulement (une relance ne rejoue que les jobs rouges). **Ouverture → merge** : PR mergée avec une seule exécution de CI.
- **Mise en prod** : trop rare pour 5 mesures en 24 heures → médiane des 5 dernières, alerte seulement le lendemain d'une mise en prod. `deploy:prod` ne note la CI de la version que s'il a créé la version dans ce lancement et sans relance.
- **Phases de moins de 20 s** (« CI Summary », « Porte de la CI ») : jamais dans la référence, pas montrées.
- **Relevé du matin** : launchd sur le Mac mini (6 h 40), pas un workflow GitHub : le canal ntfy n'existe que sur la machine.

## Revue de la PR 1 (`code-reviewer`, 2026-11-23) : les 6 points corrigés avant l'ouverture

`deploy-prod.sh` : aucun risque trouvé (les notes de durée ne peuvent pas le faire échouer).

1. **Bloquant, alerte de mise en prod morte** (`index.ts`, `lireMesures` et `fenetre`) : la fenêtre de 7 jours s'applique aussi au journal `mises-en-prod.csv`, alors que la règle est « les 5 dernières ». Avec 2 mises en prod par semaine, jamais 5 mesures. Ne filtrer les phases `prod:` que sur `depuis` de la référence ; pareil pour `--reference`.
2. **Arguments** (`index.ts`, `main`) : sans `--depuis`, le premier argument n'est jamais contrôlé (`pnpm durees --releves` affiche le tableau). Exiger une valeur après `--depuis`, refuser `--reference` avec `--releve` ou `--essai`, refuser `--essai` seul.
3. **Date de la mesure `pr`** (`logique.ts`, `mesuresDeLaPr`) : dater du merge, pas de l'ouverture, sinon une PR ouverte la veille et mergée lentement sort de la fenêtre de 24 heures.
4. **Cache** (`index.ts`, `lireRun`) : écrire dans un `.tmp` puis renommer ; un JSON illisible vaut « absent » (relu chez GitHub).
5. **Forme de `reference.json`** : la contrôler à la lecture (Zod), le fichier pouvant être édité à la main.
6. **Installeur** : ajouter aussi le dossier de `node` au PATH du plist (pnpm et node peuvent ne pas être voisins).

Laissés : chemin du dépôt non échappé dans le XML (même choix que le premier plist) ; `HOME` non défini ; la CI entière inclut l'attente du runner (voulu, comme la référence).
