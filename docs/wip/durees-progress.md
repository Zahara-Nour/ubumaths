# durees — statistiques régulières des durées (CI, PR, mise en prod, local)

## Reprendre ici

_Mis à jour le 2026-11-23, après #3038._

- **État** : PR 1 (#3032), PR 2 (#3034) et PR 3 (#3038 : `pr:merger` et `test:integration` local en « simple information », sans référence ni alerte) mergées. `pnpm durees` montre la CI, les PR, la mise en prod, la suite d'intégration entière (la nuit, sur une PR) et les commandes du Mac mini (`check:incremental`, `test:server`, `test:client`, `test:integration`, pre-push, `pnpm pr:merger`, notées dans `~/.local/state/durees/local.csv`). Relevé de 6 h 40 installé sous launchd. Worktree et branche retirés.
- **Prochaine action** : laisser les mesures s'accumuler (5 par phase ; 5 nuits pour la suite de la nuit, soit vers le 2026-11-28), puis montrer le tableau à David et lui proposer la référence des phases nouvelles. Ensuite : versement dans `docs/systeme/` ou `docs/pratiques/` et archivage du journal.
- **En attente de David** : valider la référence des phases nouvelles, par `pnpm durees --reference` puis une PR (lui seul), et dire alors si le pre-push (7 s, juste au-dessus du plancher) reste lui aussi en simple information. Le reste est tranché (« Tranché par David », points 4 et 5).
- **Pièges en cours** : `pr:merger` et `test:integration` local n'ont jamais de référence (#3038, `estSimpleInformation` dans `scripts/durees/logique.ts`), `pnpm durees --reference` peut donc être lancée sans les y faire entrer ; `/data` est ignoré par git, d'où la référence sous `scripts/durees/` ; un runner GitHub lent arrive tous les jours, ne jamais alerter sur une seule mesure ; aucune mesure d'avant #3025 (`depuis` de la référence) ; `pnpm durees --reference` refait TOUTES les phases, pas seulement les nouvelles ; la suite entière des tests est rare en local, ses lignes resteront souvent « trop peu » ; les durées locales dépendent de la charge du Mac mini ; les autres worktrees ne notent rien tant qu'ils n'ont pas repris `main`.
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
4. **`pr:merger` et `test:integration` local : simple information, sans référence, jamais d'alerte** (2026-11-23). `pr:merger` compte l'attente de la CI, déjà surveillée par « CI entière » et « ouverture → merge » ; `test:integration` local compte le démarrage de la pile, et la suite est déjà surveillée en CI.
5. **Choix de la PR 2 confirmés** (2026-11-23) : un test lancé avec un chemin ou une option ne compte pas (les lignes `test:server` et `test:client` du Mac mini resteront souvent « trop peu de mesures », on ne lance pas la suite entière exprès) ; plancher de 5 s en local.

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

## PR 2 : le Mac mini et les tests d'intégration (2026-11-23)

Ce qui est mesuré, et les choix faits en codant (à confirmer par David avec la référence) :

- **Journal du Mac mini** : `~/.local/state/durees/local.csv`, une ligne `date;commande;secondes` écrite par `scripts/durees/noter.sh`. Commandes : `check:incremental`, `test:server`, `test:client`, `test:integration` (par `scripts/durees/chrono.mjs`), le pre-push, `pnpm pr:merger`.
- **Verte et entière seulement**, même règle que la CI : un rejeu de `check:incremental` ne compte pas ; un test lancé avec un chemin ou une option non plus (c'est le cas ordinaire en local : la suite entière y est rare, ces lignes resteront souvent « trop peu de mesures ») ; un `pr:merger` qui ne fait que ranger non plus.
- **`pr:merger`** : durée entière, attente de la CI comprise (c'est ce que dit la phase 0). Elle double donc en partie « ouverture → merge ».
- **Plancher à 5 s sur le Mac mini** (20 s pour la CI) : `check:incremental` dure 18 s, il n'entrerait jamais dans la référence sinon.
- **Rien n'est noté** en CI, sur Vercel, ni depuis un test (variable `VITEST`) : les tests des scripts lancent les vrais `check-incremental.sh` et `pr-merger`, ils auraient rempli le journal de fausses durées.
- **Tests d'intégration** : seule une suite entière compte = 4 morceaux qui ont tous joué l'étape des tests, première tentative verte. Deux phases, parce que le contenu diffère : la nuit (tous les tests) et sur une PR (sans les tests de migration de données). Une PR qui joue plus de 40 tests touchés tourne aussi en 4 morceaux : on la reconnaît à l'étape « Tests de migration de données laissés de côté » du job de portée, jouée seulement en suite complète (vérifié sur trois exécutions réelles).
- **Suite de la nuit** : une par jour, donc la règle de la mise en prod (les 5 dernières, alerte seulement s'il y en a eu une dans la journée). Le cron de 2 h 17 UTC part en fait vers 9 h 45 à 10 h 45 UTC : la mesure a une vingtaine d'heures au relevé de 6 h 40.
- **Premières mesures** (2026-11-23) : suite entière sur une PR 6 min 46 (2 mesures) ; suite de la nuit du 22 : 6 min 58 (avant la date de la référence, donc pas lue) ; `check:incremental` 31 s à froid dans un worktree neuf.
- **Référence** : aucune pour ces phases tant que David ne l'a pas validée ; il faut 5 mesures par phase (5 nuits pour la suite de la nuit).

### Revue de la PR 2 (`code-reviewer`, 2026-11-23) : aucun bloquant, 3 points corrigés avant l'ouverture

1. **Signal** : l'enveloppe des tests restait parente de vitest ; tuée seule (SIGTERM), elle le laissait orphelin. Réécrite en Node (`chrono.mjs`), qui transmet SIGTERM et SIGHUP ; bash ne sait pas le faire sans casser Ctrl-C.
2. **Suite entière sur une PR** : exiger l'étape du job de portée (ci-dessus), pour ne pas compter une PR à plus de 40 tests touchés.
3. **Pre-push** : pas noté quand le commit courant ne part pas (la garde « code modifié ⇒ doc modifiée » est sautée, il n'a pas tout joué).

Laissé à David, au moment de la référence : `pr:merger` (attente de la CI comprise, très variable, double « ouverture → merge ») et `test:integration` (démarrage de la pile compris) pourraient alerter pour rien ; ne pas leur donner de référence les laisse en simple information.

## Revue de la PR 1 (`code-reviewer`, 2026-11-23) : les 6 points corrigés avant l'ouverture

`deploy-prod.sh` : aucun risque trouvé (les notes de durée ne peuvent pas le faire échouer).

1. **Bloquant, alerte de mise en prod morte** (`index.ts`, `lireMesures` et `fenetre`) : la fenêtre de 7 jours s'applique aussi au journal `mises-en-prod.csv`, alors que la règle est « les 5 dernières ». Avec 2 mises en prod par semaine, jamais 5 mesures. Ne filtrer les phases `prod:` que sur `depuis` de la référence ; pareil pour `--reference`.
2. **Arguments** (`index.ts`, `main`) : sans `--depuis`, le premier argument n'est jamais contrôlé (`pnpm durees --releves` affiche le tableau). Exiger une valeur après `--depuis`, refuser `--reference` avec `--releve` ou `--essai`, refuser `--essai` seul.
3. **Date de la mesure `pr`** (`logique.ts`, `mesuresDeLaPr`) : dater du merge, pas de l'ouverture, sinon une PR ouverte la veille et mergée lentement sort de la fenêtre de 24 heures.
4. **Cache** (`index.ts`, `lireRun`) : écrire dans un `.tmp` puis renommer ; un JSON illisible vaut « absent » (relu chez GitHub).
5. **Forme de `reference.json`** : la contrôler à la lecture (Zod), le fichier pouvant être édité à la main.
6. **Installeur** : ajouter aussi le dossier de `node` au PATH du plist (pnpm et node peuvent ne pas être voisins).

Laissés : chemin du dépôt non échappé dans le XML (même choix que le premier plist) ; `HOME` non défini ; la CI entière inclut l'attente du runner (voulu, comme la référence).
