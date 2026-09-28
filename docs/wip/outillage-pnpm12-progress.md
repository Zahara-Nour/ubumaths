# Outillage — pnpm 12, `[local_smtp]` et CLI Supabase fixée, progression

> Chantier ouvert le 2026-09-29, pendant la migration du poste de dev vers le
> Mac mini. **Rien n'est commencé.** À faire après la migration, sur une branche
> avec une PR (`package.json`, `pnpm-lock.yaml` et `supabase/config.toml` sont
> du code, pas de la doc).

## Pourquoi ce chantier

Sur le Mac mini, un `corepack use pnpm@12.6.0` lancé dans le projet a réécrit
`"packageManager"` et réinstallé avec pnpm 12. Trois constats :

1. **pnpm 12 ne lit plus la section `"pnpm"` de `package.json`.** Avertissement
   rendu : `The following keys were ignored: "pnpm.onlyBuiltDependencies",
"pnpm.overrides"`. Conséquences observées :

   - les `overrides` (correctifs de sécurité) sont ignorés : l'installation a
     ramené `esbuild@0.25.12` et `esbuild@0.27.7`, alors que `main` n'a que
     `esbuild@0.28.2` (override `>=0.28.1`) ;
   - l'autorisation `onlyBuiltDependencies: ["esbuild"]` est ignorée, et pnpm 12
     transforme les scripts bloqués en **erreur** (`ERR_PNPM_IGNORED_BUILDS` :
     core-js, trois esbuild), plus en simple avertissement.

   Le Mac mini a été remis sur pnpm 10.23.0 le 2026-09-29 (vérifié :
   `esbuild@0.28.2` seul dans `node_modules`, `check:incremental` à 0 erreur).
   La machine garde pnpm 12.6.0 par défaut hors des projets
   (`corepack install -g`).

2. **La CLI Supabase récente déprécie `[inbucket]`** dans `supabase/config.toml`
   (`WARN: config section [inbucket] is deprecated. Please use [local_smtp]
instead`). Simple avertissement : la section fonctionne encore.

3. **`pnpm db:types` dépend de la CLI Supabase installée sur la machine.**
   Le projet n'a pas `supabase` en dépendance : `pnpm supabase` appelle la CLI
   globale (Homebrew). Mesuré le 2026-09-29, même base de prod :

   - laptop, CLI **2.105.0** → fichier **identique** au `database.ts` commité
     (la prod n'avait donc pas changé) ;
   - Mac mini, CLI **2.118.0** → **+28 lignes** : le schéma `graphql_public`
     apparaît (types + `Constants`), `public` inchangé.

   Même cause que le constat 2 : la version de la CLI varie selon le poste.

## Tâche A — passer le projet à pnpm 12

- [ ] Lire la page « settings » de pnpm (https://pnpm.io/settings) : nouvel
      emplacement de `overrides` et `onlyBuiltDependencies` (a priori
      `pnpm-workspace.yaml`, **à vérifier**, pas à supposer).
- [ ] Déplacer les **12 overrides** et l'autorisation `esbuild` ; retirer la
      section `"pnpm"` de `package.json`.
- [ ] Décider du sort de `core-js` (arrive par `jspdf` ; son script ne fait
      qu'afficher un appel au financement) : à ignorer explicitement, sinon
      pnpm 12 bloque l'installation.
- [ ] `corepack use pnpm@12.x` → `"packageManager"` + `pnpm-lock.yaml`.
- [ ] Vérifier les **versions VISÉES par les overrides** dans le nouveau
      lockfile, pas seulement « install OK » : `esbuild` ne doit exister qu'en
      ≥ 0.28.1, idem `tar` ≥ 7.5.21, `postcss` ≥ 8.5.18, etc. Comparer avec
      le lockfile de `main` avant le changement.
- [ ] La CI (`pnpm/action-setup@v6`) lit `"packageManager"` : vérifier que tous
      les jobs passent.
- [ ] Vérifier que **Vercel** sait construire avec pnpm 12 (deploy de preview
      de la PR).
- [ ] Rappel machine : sur chaque poste, `corepack enable` après chaque mise à
      jour de Node (mise installe chaque version dans son propre dossier).

## Tâche B — renommer `[inbucket]` en `[local_smtp]`

- [ ] Vérifier que la CLI de la CI comprend `[local_smtp]` : le workflow
      `nightly-integration.yml` est figé sur `supabase/setup-cli@v3` version
      **2.105.0** (même version que l'ancien laptop). Si 2.105.0 ne connaît pas
      `[local_smtp]`, monter cette version dans la même PR.
- [ ] Renommer la section (port 54324, interface web des e-mails locaux) et
      vérifier que les clés internes n'ont pas changé de nom elles aussi.
- [ ] Vérifier en local : `pnpm db:start` sans l'avertissement, e-mails de
      connexion visibles sur `http://localhost:54324`.
- [ ] Déclencher `nightly-integration.yml` à la main sur la branche
      (`gh workflow run nightly-integration.yml --ref <branche>`) : c'est le
      seul workflow qui démarre Supabase en CI, et il ne tourne PLUS seul
      (cron désactivé, `workflow_dispatch` uniquement) — une PR ne le lance
      donc jamais.

## Tâche C — fixer la version de la CLI Supabase dans le projet

Objectif : `pnpm supabase` = la même version partout (postes et CI), pour que
`db:types` rende le même fichier et que `config.toml` soit lu pareil.

- [ ] Ajouter `supabase` en `devDependencies`, version **exacte** (pas de `^`).
- [ ] Le paquet npm `supabase` télécharge son binaire par un script
      d'installation (**à vérifier**) : il faudra l'autoriser, comme `esbuild`
      — même mécanisme que la tâche A, qui bloque sous pnpm 12.
- [ ] Une seule source de vérité pour la version : faire utiliser
      `pnpm supabase` à `nightly-integration.yml`, ou à défaut aligner
      `supabase/setup-cli` (aujourd'hui 2.105.0) sur la devDependency.
- [ ] **À trancher avec David**, le sort de `graphql_public` si la version
      retenue est ≥ 2.118.0 : accepter le bloc une fois dans la PR, ou passer
      `--schema public` à `db:types` pour que le fichier ne dépende plus du
      choix par défaut de la CLI.
- [ ] Vérifier : `pnpm db:types` sur les deux postes → même fichier ;
      `check:incremental` à 0 erreur (les helpers génériques de `database.ts`
      parcourent tous les schémas).

## Définition de terminé

- `pnpm install` sans avertissement sur les overrides, sans erreur de build.
- Lockfile : versions imposées par les 12 overrides respectées — planchers,
  et épinglages `parse5` 7.2.1 / `jsdom` 26.1.0 (preuve collée dans la PR).
- `pnpm db:start` sans avertissement `[inbucket]`.
- `pnpm supabase --version` identique sur chaque poste et en CI ; `db:types`
  ne change rien à `database.ts` hors vrai changement de schéma.
- CI verte, y compris le workflow nocturne lancé sur la branche ; preview
  Vercel OK.
