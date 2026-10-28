---
status: en cours
---

# Chantier « build-memoire » — réduire la mémoire du build de prod

## Reprendre ici

_Mis à jour le 2026-10-28, après #1899._

- **État** : Vite 8 mergé (#1899), pas encore en prod. Avec lui : correctif du worker Pyodide (barrel → imports module par module, garde `workers-sans-runes.test.ts`) et `svelte-kit sync` avant la garde SECURITY DEFINER (oxc lit `tsconfig.json`).
- **Prochaine action** : au prochain `deploy:prod` (demandé par David), lire la durée et le succès du build Vercel ; puis PR qui retire la rustine #1892 (`scripts/vite-build.sh`, heap 6144 sur Vercel), à mesurer d'abord dans Docker 8 Go avec Vite 8.
- **En attente de David** : `deploy:prod` quand il le voudra.
- **Pièges en cours** : `test:client` complet plante sur le Mac sous Vite 7 comme sous Vite 8 (la CI fait foi) ; mesurer dans Docker (`--memory=8g --cpus=2`), jamais sur le Mac.
- **Worktree / branche** : aucun (à recréer pour la PR de la rustine).

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

## 4. Montée en Vite 8 — vérifications (2026-10-28)

- `check:incremental` 0 erreur ; `test:server` 2 173 fichiers, 63 150 tests verts ; `pnpm build` OK (client 9 s, serveur 21 s), nœud racine 49,7 Ko (garde Safari < 100 Ko). Avertissements du build identiques à Vite 7 (`xml2js`/`sax` externalisés, `sharp` de nft).
- **Comparaison du site construit** : previews Vite 7 (`main`) et Vite 8 sur la base locale, 245 pages sans paramètre, Chromium et WebKit, anonyme et `admin@local.test` ; statut, adresse finale, erreurs JS et console comparés page à page. Seul écart : `/python`.
- **`/python` cassé sous Vite 8** : le worker Pyodide importait des valeurs par le barrel `$lib/shared/python`, qui tire `pythonDebug.svelte.ts` (store instancié au niveau du module, runes non compilées dans un worker). Rollup l'élaguait, Rolldown le garde → « $state is not defined ». Correctif : imports module par module ; garde `src/lib/workers/__tests__/workers-sans-runes.test.ts` (rouge avant, avec le chemin d'imports ; verte après). Après correctif : 0 écart sur les 245 pages, code Python exécuté (sortie + graphique) dans les deux navigateurs.
- **`test:client`** : plante sur le Mac sous Vite 7 comme sous Vite 8 (navigateur fermé, ~260/402 fichiers ; erreurs `wrapDynamicImport` du serveur de dev SvelteKit dans les deux). La CI (par tranches) fait foi.

## 5. CI de #1899

- Garde SECURITY DEFINER rouge : sous Vite 8, oxc lit `tsconfig.json` (qui étend `.svelte-kit/tsconfig.json`, absent du job) ; `esbuild.tsconfigRaw` ne sert plus. Correctif : `svelte-kit sync` dans `test:definer-guard`.
- Revue `code-reviewer` (Sonnet) : aucun bloquant ; garde durcie (`import()` littéraux, `.js` → `.ts`).
- CI verte (16 checks, intégration comprise), mergée le 2026-10-28.
