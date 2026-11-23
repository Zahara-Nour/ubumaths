# Chantier `verrou-deploy`

## Reprendre ici

_Mis à jour le 2026-11-02, après #2232. Chantier clos, journal archivé._

- **État** : livré par #2232 (mergée, `59668435a`) : relance sous le verrou (A), gardes git pre-commit / pre-push (C), merge par `gh api` refusé (D). Docs : `docs/pratiques/environnement-de-dev.md`, `docs/pratiques/git-workflow.md`.
- **Prochaine action** : aucune. Au prochain `deploy:prod` tombé sur `wrapDynamicImport`, vérifier que la relance réelle (`gh run rerun --failed`) se passe comme dans les tests (bouchon seulement jusqu'ici).
- **En attente de David** : rien. Le code n'est pas en prod tant que `deploy:prod` n'a pas tourné, mais les hooks (Claude et git) agissent dès le `git pull` du dépôt.
- **Pièges** : `deploy-prod.sh` et `lock.py` indentés en tabulations.

## Problème

`pnpm deploy:prod` tient le verrou « deploy » (`scripts/lib/lock.py`, flock + execvp) seulement pendant que `scripts/deploy-prod.sh` tourne. Dès qu'il s'arrête (`arreter`), le verrou est relâché, les sessions fusionnent, et leurs pushes annulent la CI de la version en attente (groupe de concurrence de `quality.yml` : un seul run en attente par ref).

### Incident du 2026-11-02 (vérifié par `gh api …/activity` et `gh run view`)

- 09:20:44 UTC : push de v0.63.0 (`9f8558521`).
- Run 41419872530, tentative 1 : shard navigateur 1/2 rouge, `TypeError: Cannot read properties of undefined (reading 'wrapDynamicImport')` ; « CI Summary » rouge à 09:29:30 ; script arrêté, verrou relâché.
- 09:29:43, 09:29:49, 09:29:50 : trois merges (#2228, puis #2227, #2226) ; 09:30:41 push ; 09:34:56 #2230.
- Relance du job, lancée hors verrou : run conclu `cancelled` à 09:35:01. Prod restée en v0.62.0.

### Diagnostic du 2026-11-01 (mémoire `project_chantier-verrou-deploy`)

1. Course TOCTOU dans `.claude/hooks/garde-commandes.py` (jugé au lancement de la commande seulement).
2. Trou entre deux lancements (cause de l'incident ci-dessus).
3. Formes non vues par le hook : `gh api …/merge`, `bash -c "git push"`, scripts qui poussent.

## Phase 0 — validée par David le 2026-11-02 (« je suis tes reco »)

Piste : **A + C + D, sans B**.

- **A. Relance sous le même verrou** (`scripts/deploy-prod.sh`) : version ou dernier commit de code de main rouge, et **tous** les jobs rouges (hors « CI Summary ») portent `reading 'wrapDynamicImport'` → `gh run rerun --failed` sous le verrou, au plus 2 fois par commit (`DEPLOY_PROD_RELANCES_MAX`), attente remise à zéro à chaque relance. `--relancer-ci` : relance une fois un échec non reconnu. `etat_ci` lit d'abord l'état du run (en cours → `pending`), car pendant une relance « CI Summary » garde la conclusion rouge précédente.
- **C. Gardes git** (`scripts/garde-deploy-en-cours.sh`, en tête de `.husky/pre-commit` et `.husky/pre-push`) : commit sur main et push vers main refusés tant que le verrou est tenu ; `deploy-prod.sh` passe par `DEPLOY_PROD_SOUS_VERROU` (héritée). Bloque aussi David (contournement humain : `--no-verify`). Test du verrou : `lock.py --tenu <nom>`.
- **D. Hook Claude** : merge par `gh api` toujours refusé (`…/pulls/<n>/merge` en écriture, `…/merges`, mutations GraphQL `mergePullRequest` / `mergeBranch` / `enablePullRequestAutoMerge`).
- **Pas B** (drapeau persistant) : verrou périmé à gérer, et bloquerait la PR correctrice d'une vraie CI rouge.

Écarts constatés au passage : un commit de doc fait dans le dépôt principal entre l'étape 0 et `pnpm release` serait entré **dans** le commit de version (fermé par C). Reste ouvert : un `gh pr merge` lancé juste avant le verrou (merge côté serveur, aucun hook git) ; détecté par l'étape 0 ou le push de la version, qui arrêtent le script.

Tests : `deploy-prod.test.ts` (+11), `garde-deploy-en-cours.test.ts` (nouveau, 8), `garde-commandes.test.ts` (+2).

## Revue (code-reviewer, Sonnet) — 2026-11-02

Corrigés dans la PR : (1) `gh api … -fmerge_method=merge` (champ collé) passait le hook ; (2) `plantage_connu` ne voyait que les jobs présents dans `--log-failed` : un job rouge sans log d'étape (timeout, setup) était ignoré → relance indue ; jobs rouges désormais lus dans `gh run view --json jobs` ; (3) après `gh run rerun`, attente que le run repasse « en cours » (au plus 10 pauses) avant de relire son état. `-X get` en minuscules n'est plus pris pour une écriture.

Laissés, jugés rares : `etat_ci` / `run_de` ne regardent que le run le plus récent du commit (deux runs pour un même SHA : push + `workflow_dispatch`) ; `--relancer-ci` est consommé à la première relance, étape 1 comprise (y compris un commit `cancelled`) ; un processus d'arrière-plan lancé sous le verrou qui survivrait garderait le verrou, donc les gardes git (déjà vrai avant pour le verrou).
