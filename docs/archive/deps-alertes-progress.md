# Chantier `deps-alertes` (clos) — alertes Dependabot après la v0.82.0

## Bilan

_Clos le 2026-11-11, après #2571._

- #2571 mergée : glob 14, overrides `glob@13`, `minimatch@10`, `postcss-selector-parser@6` (alertes 98, 102, 104, 106).
- Restent ouvertes, non exploitables : SvelteKit < 3 (96, 97, 100, 101 ; correctif en majeure 3.0.0, chantier à part si David le veut), deepmerge (103, aucun correctif).
- CI : le job « CI Summary » du premier run est resté en file (runner jamais attribué), run non relançable ; un `workflow_dispatch` vert ne débloque pas la protection de branche, `gh pr update-branch` (nouveau commit, nouvelle CI de PR) l'a fait.

---

## Les 9 alertes ouvertes (2026-11-11)

| Alerte           | Paquet                         | Venu par                                                 | Traitement                                                                                     |
| ---------------- | ------------------------------ | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 98, 104          | glob 13.0.6 (moyenne)          | direct (2 scripts) + `@vercel/nft` (`^13`)               | `glob` ^14.0.4 ; override `glob@13: ^14.0.4`                                                   |
| 106              | minimatch 10.2.6 (moyenne)     | glob 13, typescript-eslint 8.71.0 (épinglé, `^10.2.2`)   | override `minimatch@10: ^11.0.5`                                                               |
| 102              | postcss-selector-parser 6.0.10 | `@tailwindcss/typography` 0.5.20 (épingle exacte, dev)   | override `postcss-selector-parser@6: ^6.1.5`                                                   |
| 96, 97, 100, 101 | @sveltejs/kit < 3 (basse)      | direct                                                   | correctif seulement en 3.0.0 (majeure) : pas ici. Non exploitables chez nous, voir ci-dessous. |
| 103              | deepmerge 4.3.1 (basse)        | `@sveltejs/vite-plugin-svelte` (fusion de config, build) | aucun correctif publié ; non exploitable (nos propres données de config)                       |

**Compatibilité des majeures forcées** : glob 14 et minimatch 11 retirent `makeRe`, `AST`, `debug`, et
`walk()` rend des tableaux. Nos usages (2 scripts, `@vercel/nft` `analyze.js`, typescript-estree
`useProgramFromProjectService.js`) n'appellent que `glob(motif, options)` et `minimatch(chemin, motif,
{ dot })`, qui ne changent pas. Vérifié dans le worktree : chaque paquet voit la nouvelle version, et les
correspondances sont justes.

**SvelteKit, exposition** : redirection ouverte = `use:enhance` sur une route qui accepte `//` (seule
route attrape-tout : `admin/docs/[...path]`, admin, sans formulaire) ; XSS = page prérendue avec
`setHeaders` cache-control venu de l'extérieur (seule page prérendue : `/demo`, aucun `setHeaders`).

## Historique

- 2026-11-11 : tri des 9 alertes, overrides, worktree.
