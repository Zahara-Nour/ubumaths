# Almanach des Chiphres — progression

Branche `feat/almanach-accueil`, worktree `ubumaths-wt-almanach`. Source de vérité :
`docs/Chiphres/lore-pataphysique.md`, section VIII (corrigée le 2026-10-04).

## A. Module `src/lib/almanach/` — FAIT

- `calendar.ts` : `toPataphysicalDate(date, timeZone = 'Europe/Paris')`,
  `civilToPataphysical(y, m, d)`, `formatShort` / `formatMedium` / `formatLong`,
  `monthGregorianRange`, `horsMoisGregorian`, `FEASTS`, `MONTH_NAMES`.
- `palettes.ts` : `MONTH_PALETTES` (valeurs validées, planche du 2026-10-04),
  `ambianceMonthIndex`, `paletteCssVars` (`light-dark()`).
- Tests : `src/lib/almanach/__tests__/` (rouges d'abord : module absent, puis traits
  encore figés dans l'accueil).

### Choix

- **Jour hors-mois → ambiance du mois qui le PRÉCÈDE** : la Cloche garde Auguste
  (elle clôt l'An qui s'achève), le Surnuméraire garde Déglaçose (« ni de l'hiver ni
  du printemps » : l'aurore n'arrive qu'au 1 Auroral). Une seule règle.
- Les fêtes datées : Nativité de Jarry, six fêtes provinciales, et la Phynanche
  (événement transversal à date fixe). La Mobilisation et le Décervelage durent un
  mois : ce ne sont pas des jours de fête.
- Ambraire : valeurs de la planche validée, reprises EXACTEMENT. Elles diffèrent des
  anciennes keyframes de l'accueil (qui passaient par deux verts) ; les traits,
  eux, restent `#ffcf33`.

## B. Accueil — FAIT

`src/routes/(public)/+page.server.ts` (`prerender = false`, testé) calcule la date ;
`+page.svelte` : halo + traits en variables `--halo-1..3` / `--ubu-stroke`, date
moyenne en lien vers `/almanach`, halo fixe sous `prefers-reduced-motion`.

## C. Page `/almanach` — en cours
