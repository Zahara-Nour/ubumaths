# Outillage — pnpm 12, `[local_smtp]` et CLI Supabase fixée, progression

> Chantier ouvert le 2026-09-29, pendant la migration du poste de dev vers le
> Mac mini. **En cours depuis le 2026-09-29** (worktree `../ubumaths-wt-pnpm12`,
> branche `chore/outillage-pnpm12`). Sur une branche avec une PR (#512) (`package.json`, `pnpm-lock.yaml` et `supabase/config.toml` sont
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

- [x] Lire la page « settings » de pnpm (https://pnpm.io/settings) : nouvel
      emplacement de `overrides` et `onlyBuiltDependencies` (a priori
      `pnpm-workspace.yaml`, **à vérifier**, pas à supposer).
- [x] Déplacer les **12 overrides** et l'autorisation `esbuild` ; retirer la
      section `"pnpm"` de `package.json`.
- [x] Décider du sort de `core-js` (arrive par `jspdf` ; son script ne fait
      qu'afficher un appel au financement) : à ignorer explicitement, sinon
      pnpm 12 bloque l'installation.
- [x] `corepack use pnpm@12.x` → `"packageManager"` + `pnpm-lock.yaml`.
- [x] Vérifier les **versions VISÉES par les overrides** dans le nouveau
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
- [x] Renommer la section (port 54324, interface web des e-mails locaux) et
      vérifier que les clés internes n'ont pas changé de nom elles aussi.
- [x] Vérifier en local : `pnpm db:start` sans l'avertissement, e-mails de
      connexion visibles sur `http://localhost:54324`.
- [ ] Déclencher `nightly-integration.yml` à la main sur la branche
      (`gh workflow run nightly-integration.yml --ref <branche>`) : c'est le
      seul workflow qui démarre Supabase en CI, et il ne tourne PLUS seul
      (cron désactivé, `workflow_dispatch` uniquement) — une PR ne le lance
      donc jamais.

## Tâche C — fixer la version de la CLI Supabase dans le projet

Objectif : `pnpm supabase` = la même version partout (postes et CI), pour que
`db:types` rende le même fichier et que `config.toml` soit lu pareil.

- [x] Ajouter `supabase` en `devDependencies`, version **exacte** (pas de `^`).
- [x] ~~Le paquet npm `supabase` télécharge son binaire par un script
      d'installation (**à vérifier**) : il faudra l'autoriser, comme `esbuild`
      — même mécanisme que la tâche A, qui bloque sous pnpm 12.~~ **Réfuté** :
      aucun script d'installation (cf. journal), pas d'`allowBuilds`.
- [x] Une seule source de vérité pour la version : faire utiliser
      `pnpm supabase` à `nightly-integration.yml`, ou à défaut aligner
      `supabase/setup-cli` (aujourd'hui 2.105.0) sur la devDependency.
- [x] **À trancher avec David**, le sort de `graphql_public` si la version
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

## Journal

- 2026-09-29 — **Vérifié dans la doc** (plus « à vérifier ») : depuis pnpm 11,
  pnpm ne lit plus le champ `"pnpm"` de `package.json` ; les réglages vont dans
  `pnpm-workspace.yaml`, et v12 garde ce comportement
  (https://pnpm.io/migration). `onlyBuiltDependencies` est **supprimé** en v11,
  remplacé par `allowBuilds` (dictionnaire `nom: true | false`) ;
  `strictDepBuilds` est actif par défaut → `ERR_PNPM_IGNORED_BUILDS`
  (https://pnpm.io/settings/build).
- 2026-09-29 — **Vérifié dans le registre** : le paquet npm `supabase`
  (2.105.0 comme 2.118.0) n'a **aucun** script `install`/`postinstall`. Le
  binaire arrive par des `optionalDependencies` par plateforme
  (`@supabase/cli-darwin-arm64`…, sans script non plus). Confirmé à
  l'installation sous pnpm 12 : aucune autorisation de build demandée. L'hypothèse
  du document était fausse : pas d'`allowBuilds` pour `supabase`.
- 2026-09-29 — **Tâche A faite** : `pnpm-workspace.yaml` (12 overrides +
  `allowBuilds: { esbuild: true, core-js: false }`), section `"pnpm"` retirée,
  `packageManager` = `pnpm@12.6.0+sha512…`. Le lockfile de pnpm 12 a **deux
  documents YAML** : le 1er épingle pnpm lui-même, le 2ᵉ est celui du projet.
  Résolution des dépendances **identique à `main`** (aucun paquet retiré).
  Preuve des 12 overrides : script de comparaison au lockfile de `main`, validé
  par un **contrôle négatif** (pnpm 12 sans overrides → 13 échecs détectés :
  esbuild 0.25.12 / 0.27.7, parse5 8.0.1, jsdom 28.1.0, fast-uri 3.1.8,
  cookie 0.6.0, brace-expansion 1.1.21…). Branche : **0 échec**.
- 2026-09-29 — **Tâche B faite** : `[inbucket]` → `[local_smtp]`, clés
  identiques (vérifié sur un `supabase init` neuf de la CLI 2.118.0). Local :
  `db:start` via la CLI du projet, 0 avertissement, Mailpit sur 54324 (HTTP 200).
- 2026-09-29 — **Tâche C, en partie** : `supabase` **2.118.0** exact en
  devDependency (dernière stable). Les scripts `db:*` l'utilisent sans
  changement (`node_modules/.bin` dans le PATH de `pnpm run`).
  `nightly-integration.yml` : `setup-cli@v3` (2.105.0) retiré, `pnpm exec
supabase` partout → une seule source de vérité.
- 2026-09-29 — **Vercel** : `vercel.json` → `ignoreCommand` sort en `exit 0`
  hors production → **aucune preview de PR n'est construite** (le check
  « Vercel » des PR passe en 0 s). La preuve du build Vercel sous pnpm 12 doit
  passer par un autre chemin.
- 2026-09-29 — Piège noté : le dépôt principal est **lié** à la prod
  (`supabase/.temp/postgres-version` = 17.6.1.127) ; un worktree ne l'est pas →
  image Postgres par défaut de la CLI (17.6.1.171). Relancer la pile depuis le
  dépôt principal pour retrouver la parité prod.
- 2026-09-29 — **Décision de David (graphql_public)** : CLI retenue 2.118.0 ;
  `db:types` gagne `--schema public`. Vérifié : la sortie est **identique
  octet pour octet** au `database.ts` de `main` (sans l'option : +28 lignes
  `graphql_public`). Aucun code de `src/` ne mentionne `graphql_public`.
  `nightly-integration.yml` affiche `pnpm exec supabase --version` (preuve de
  la version en CI). `check:incremental` : 0 erreur.
- 2026-09-29 — **Vercel, risque production** : la doc Vercel ne liste que
  pnpm 6-10 ; le build lit `packageManager` (log de prod : « Detected
  `pnpm-lock.yaml` version 9 generated by pnpm@10.x from
  package.json#packageManager pnpm@10.23.0 »). Comportement avec
  `pnpm@12.6.0` inconnu → un **vrai** build Vercel est requis avant le merge.
  Voie retenue : « Redeploy » de la preview de la PR dans le tableau de bord,
  case « Use project's Ignore Build Step » décochée. Écartée :
  `projectSettings.commandForIgnoringBuildStep` de l'API, qui est enregistré
  pour les déploiements suivants (production comprise).
