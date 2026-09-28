# Outillage — pnpm 12 et `[local_smtp]`, progression

> Chantier ouvert le 2026-09-29, pendant la migration du poste de dev vers le
> Mac mini. **Rien n'est commencé.** À faire après la migration, sur une branche
> avec une PR (`package.json`, `pnpm-lock.yaml` et `supabase/config.toml` sont
> du code, pas de la doc).

## Pourquoi ce chantier

Sur le Mac mini, un `corepack use pnpm@12.6.0` lancé dans le projet a réécrit
`"packageManager"` et réinstallé avec pnpm 12. Deux constats :

1. **pnpm 12 ne lit plus la section `"pnpm"` de `package.json`.** Avertissement
   rendu : `The following keys were ignored: "pnpm.onlyBuiltDependencies",
"pnpm.overrides"`. Conséquences observées :

   - les `overrides` (correctifs de sécurité) sont ignorés : l'installation a
     ramené `esbuild@0.25.12` et `esbuild@0.27.7`, alors que `main` n'a que
     `esbuild@0.28.2` (override `>=0.28.1`) ;
   - l'autorisation `onlyBuiltDependencies: ["esbuild"]` est ignorée, et pnpm 12
     transforme les scripts bloqués en **erreur** (`ERR_PNPM_IGNORED_BUILDS` :
     core-js, trois esbuild), plus en simple avertissement.

   Le Mac mini doit être remis sur pnpm 10.23.0 pour la migration (prompt
   donné le 2026-09-29 ; retour à confirmer).

2. **La CLI Supabase récente déprécie `[inbucket]`** dans `supabase/config.toml`
   (`WARN: config section [inbucket] is deprecated. Please use [local_smtp]
instead`). Simple avertissement : la section fonctionne encore.

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

## Définition de terminé

- `pnpm install` sans avertissement sur les overrides, sans erreur de build.
- Lockfile : versions imposées par les 12 overrides respectées — planchers,
  et épinglages `parse5` 7.2.1 / `jsdom` 26.1.0 (preuve collée dans la PR).
- `pnpm db:start` sans avertissement `[inbucket]`.
- CI verte, y compris le workflow nocturne lancé sur la branche ; preview
  Vercel OK.
