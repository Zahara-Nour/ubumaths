# CLAUDE.md — le pourquoi des règles

> [CLAUDE.md](../../CLAUDE.md) ne garde que les règles : il est rechargé à chaque session et par chaque agent (~12 k tokens avant l'allègement du 2026-10-19). Ici : les mesures, les incidents et les raisons qui les justifient, repris tels quels de l'ancienne version. Ils ne s'appliquent pas moins ; ils se lisent quand on doute d'une règle ou qu'on veut la changer.

## Contexte

- Commentaires en français, identifiants en anglais : tranché le 2026-09-12 — le dépôt compte ~4700 lignes de commentaires français dans 713 fichiers.

## Gros process : un seul à la fois

Machine : **Mac mini Apple M6, 24 Go**. Mesuré le 2026-09-29, **swap +0 partout** (détail : [étape 5](mesures-mac-mini.md)) : `pnpm check` 82 s (plus gros process 5,3 Go) · `pnpm build` 64 s (5,7 Go) · `pnpm lint` 530 s (4,1 Go) · `check:incremental` 44 s à chaud, 82 s à cache froid · `test:integration` 180 s.

- Le verrou commun (`scripts/gros-process.sh`) couvre `pnpm check`, `pnpm build` et `pnpm lint` depuis le 2026-10-10. Pas de verrou en CI ni sur Vercel.
- `pnpm lint` en arrière-plan : 530 s à froid, trop près de la coupure à 10 min du premier plan ; avec son cache ESLint, les passages suivants ne relisent que les fichiers changés.
- **Déconseillés — limite de Node, pas de la RAM** : `npx tsc --noEmit` (et l'ancien script `check:fast`, retiré le 2026-10-10) et `svelte-check` sans `--tsgo` ni `--incremental` meurent sur le **tas par défaut de Node (~4 Go)** : `JavaScript heap out of memory`, exit 134, en 44-47 s, swap +0 (mesuré le 2026-09-29). Plus de RAM n'y change rien. `tsc --noEmit` donne en plus des faux positifs `$lib`.
- `check:incremental` : moteur **tsgo** (TypeScript 7) depuis le 2026-10-10, ~18 s, ~20 s à froid (`FRESH=1`), plus gros process 6 Go. La CI garde le moteur classique (`pnpm check`), qui **fait foi** en cas de désaccord : tsgo a un angle mort mesuré (type des fonctions exposées d'un composant Svelte). Si rien n'a changé, le résultat précédent est rejoué (`FORCE=1` pour passer outre).
- `pnpm lint:fast` (~2,5 s, contre 530 s pour eslint complet — le motif est la **durée**) rejoue toutes les règles de niveau **erreur** de la config complète, sans `projectService` (`eslint.fast.config.js` en dérive : la liste ne peut plus diverger de la CI ; seule `svelte/no-unused-props`, qui exige les types, reste vue par la CI seule). Élargi le 2026-10-07, après un échec CI sur `no-fallthrough` invisible à l'ancien `lint:fast`.
- Hook pre-commit léger (`oxlint` + `prettier` sur les fichiers staged, ~2 s — motif : la **durée**) → `--no-verify` n'est plus nécessaire. oxlint ne bloque que sur les _erreurs_.

## Commandes

- `pnpm dev -- --port 5175` ne marche pas — le `--` en trop devient un argument que vite ignore, port compris : le serveur démarre sur **5173**, celui de David (mesuré le 2026-09-10). Sans `--strictPort`, un 5175 déjà pris fait dériver vite en silence.

## Git

- **Commit direct sur `main` pour un changement 100 % documentaire** : sur `pull_request` la CI n'a pas de `paths-ignore`, donc une PR pour du markdown relance les 12 jobs pour rien ; sur `push`, le filtre `paths` de `quality.yml` exclut `**/*.md` et `docs/**` (mais réinclut `src/**`, `static/**` et `data/**`). Plafond de 2 fichiers levé le 2026-09-14 : le raisonnement est le même à 2 qu'à 20.
- **Jamais republier ses commits par un autre chemin** en laissant les originaux en local : le 2026-10-13, divergence, `deploy:prod` bloqué.
- **Aucun test ne lit `docs/`** : le 2026-10-08, un commit de doc a passé le JSON de l'arbre (`docs/archive/wip/arbre-notions/arbre-notions.json`, alors sous `docs/wip/`) en .15 sans CI, et le test du seed a cassé sur toutes les PR suivantes.
- **Migrations, preuves pas approbation**, dans les mots de David : « Je ne sais **pas lire une migration RLS**. Me demander “approuves-tu ?” me transfère une responsabilité que je ne peux pas assumer : ce n'est pas un contrôle, c'est une formalité. » La question d'accès, elle, est une question de produit, à laquelle il sait répondre. Condition 2 : un test qui passe sans prouver ce qu'il prétend est pire que pas de test.
- **Inventaire des usages avant un `DROP`** : les jointures PostgREST (`.select('*, ma_table(...)')`) sont du texte, et un schéma de réponse nomme la colonne comme une clé ordinaire (`worksheets.tags` supprimée mais toujours exigée par `worksheetResponseSchema` → 500 sur trois routes, et la page annonçait « Aucune feuille trouvée »). Invisibles au typecheck, au lint et aux tests unitaires, dont les mocks ne touchent jamais la base. Le 2026-09-08, la réconciliation des données faite sans l'inventaire des usages → six requêtes cassées en production.
- **Horodatage de migration par `pnpm migration:horodatage`, `check:migrations --pr` avant le merge** : le 2026-11-01, `20261101215000` a été pris par deux lots en parallèle. La protection de `main` n'exige pas une branche à jour : la CI du second a tourné sur un `main` sans la migration du premier, la PR a été mergée verte, et `main` a cassé pour toutes les PR (file de runners saturée, correctif #2154). Un nombre rond « max + 1 » choisi à la main rend la collision probable ; l'heure réelle la rend quasi impossible, et la garde relit `origin/main` à l'instant du merge. Le pre-push lance la même garde ; la CI en fait sa porte (job « Commit de version ? »).

## Worktrees

- **Worktree d'agent nettoyé par la session qui l'a lancé** : le 2026-10-19, 27 worktrees `.claude/worktrees/agent-*` dont la PR était mergée traînaient encore ; personne ne s'en chargeait, puisque l'agent avait fini.

## RLS

Les quatre conséquences du silence de la RLS ont toutes été payées le 2026-09-15 (détail : [rls-echecs-silencieux.md](rls-echecs-silencieux.md)) : un écran a annoncé avoir supprimé une amitié signalée entre deux mineurs sans rien supprimer ; une jointure `!inner` a faussé rangs et totaux sans log ; trois endroits refaisaient à la main la requête d'une garde centralisée.

## Agents

- Revue proportionnée au risque (2026-10-19) : un `code-reviewer` à chaque phase, pour toute PR, coûtait cher sans rien trouver sur la doc, le contenu ou les petits correctifs d’UI.
- Modèle selon la tâche (2026-10-19) : chaque agent recharge ~12 k tokens de contexte, et presque tout tournait en Opus, `CLAUDE.md` disant alors « Opus sans hésiter ».
- `pnpm check`, `pnpm build`, `pnpm lint` réservés à la session principale : verrouillés depuis le 2026-10-10, mais longs et lourds — un agent ne doit pas tenir le verrou à la place de la session.

## BackLink

- Règle tranchée le 2026-10-11 → [composants-ui.md](composants-ui.md#backlink--bouton-retour-obligatoire).
