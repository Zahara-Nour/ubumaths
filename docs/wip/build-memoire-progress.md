---
status: en cours
---

# Chantier « build-memoire » — réduire la mémoire du build de prod

## Reprendre ici

_Mis à jour le 2026-10-28, après la mesure (rien de commité hors ce journal)._

- **État** : mesure faite (§ 2). Cause : Rollup garde le graphe de chaque module, vivant jusqu'à la fin du build (4,8 Go de heap). Vite 8 (Rolldown), essayé dans le conteneur seulement : pic 4,82 Go au lieu de 7,67, build ~45 s au lieu de ~3 min 50.
- **Prochaine action** : selon David — PR « passer à Vite 8 » (`vite` 8 + `@sveltejs/vite-plugin-svelte` 7 ; Kit 2.70 les accepte déjà), avec vérification complète du site construit.
- **En attente de David** : go ou non pour la montée en Vite 8 (§ 3).
- **Pièges en cours** : mesurer dans Docker (`--memory=8g --cpus=2`), jamais sur le Mac (RSS sous-estimé) ; scripts de mesure hors dépôt (§ 1).
- **Worktree / branche** : `ubumaths-wt-build-memoire`, `chore/build-memoire`.

---

## 1. Contexte et méthode

Le build de v0.52.0 a été tué deux fois sur Vercel (OOM, conteneur de 8 Go). Rustine #1892 : heap 6144 sur Vercel, pic ~7 Go, marge ~1 Go.

Mesures dans `docker run --memory=10g --cpus=2 node:22-bookworm`, sur une copie du dépôt (`pnpm install --frozen-lockfile` dans le conteneur) :

- config de mesure `vite.mesure.config.ts` = config du projet + un plugin qui journalise `process.memoryUsage()` à chaque étape (`buildStart`, `buildEnd`, `generateBundle`, `writeBundle`, `closeBundle`), avec un GC forcé (`--expose-gc`) pour lire la mémoire **vivante** ;
- repères ajoutés dans `@sveltejs/adapter-vercel` autour de `nodeFileTrace` ;
- `node --heap-prof` pour savoir qui a alloué la mémoire encore vivante à la fin.

## 2. Résultats (2026-10-28)

### Vite 7.3.7 (Rollup), heap 8192

| étape                    | heap vivant             | RSS    |
| ------------------------ | ----------------------- | ------ |
| fin compilation serveur  | 1,72 Go                 | 2,3 Go |
| début compilation client | 1,86 Go (gardés)        | 3,0 Go |
| fin compilation client   | 4,59 Go                 | 6,3 Go |
| adaptateur (nft)         | 4,81 → +0,3 transitoire | 6,7 Go |
| fin du build             | 4,82 Go                 | 6,6 Go |

- Rien n'est libéré d'une compilation à l'autre : le graphe du serveur vit pendant le client, les deux jusqu'à la fin.
- Profil de heap (4,87 Go vivants échantillonnés) : Rollup 2,66 Go en direct (`NodeBase` 0,97, portées, variables, entités), plus l'essentiel des 1,57 Go « natifs » (Map, Set). Tailwind, Svelte, SvelteKit, nft : < 0,1 Go chacun.
- `build.rollupOptions.cache: false` : aucun effet.
- L'adaptateur Vercel n'est pas le coupable (+0,3 Go transitoire).

### Vite 8.3.5 (Rolldown) + `@sveltejs/vite-plugin-svelte` 7.3.1, heap 8192

| étape                   | heap vivant | RSS     |
| ----------------------- | ----------- | ------- |
| fin compilation serveur | 0,13 Go     | 2,2 Go  |
| fin compilation client  | 0,20 Go     | 3,7 Go  |
| fin du build            | 0,23 Go     | 4,05 Go |

Pic du conteneur **4,82 Go** (7,67 avec Vite 7), build ~45 s (~3 min 50 avec Vite 7). Build sorti en 0 ; site construit **pas encore vérifié**.

## 3. Pistes

- **A. Vite 8** (recommandée) : `vite` 8 + `@sveltejs/vite-plugin-svelte` 7 ; `@sveltejs/kit` 2.70 accepte déjà Vite 8 (pas besoin de Kit 3), vitest 4 aussi. À vérifier : site construit (pages, Safari TDZ, chunks), `pnpm dev`, tests client et serveur, plugins de `vite.config.ts`.
- **B. Libérer le graphe Rollup entre les compilations** (rester en Vite 7) : chercher qui retient le graphe ; gain au mieux ~1,8 Go, moins sûr.
- **C. Build dans GitHub Actions + `vercel deploy --prebuilt`** : filet indépendant de la mémoire, touche `deploy:prod` (ADR 0021).
