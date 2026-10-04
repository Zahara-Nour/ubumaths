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

## C. Page `/almanach` — FAIT

`src/routes/(public)/almanach/` : `+page.server.ts` (`prerender = false`, testé),
`+page.svelte` (date du jour dans l'ambiance du mois, « Un Almanach, pas un
Calendrier », sept mois avec le mois en cours en `aria-current="date"`, deux jours
hors-mois, table des fêtes, convertisseur), `AlmanachConverter.svelte`.

- Voix : explications en voix de Tristan Bernard (vous, flegme) ; seules les
  citations en `figure` signées « — Père Ubu » sont dans la voix d'Ubu.
- Saisie de date : composant `Input` de shadcn (`type="date"`). La règle n°2 ne vise
  que select et case à cocher ; d'autres pages du dépôt saisissent déjà les dates
  ainsi.
- Pas d'élément `<header>` ni de `<p>` pour la grande date : `app.css` force la
  taille de police de `header *` et de `main p` en `!important`.
- Sitemap : `/almanach` ajouté (`changefreq: 'daily'`).
- Tests navigateur verts du premier coup → neutralisation (aria-current retiré,
  bandeau en rouge, convertisseur figé) : 7 rouges sur les cas visés, puis
  restauration depuis une copie.

## Reste

- Revue visuelle sur le serveur de dev (non faite).
- Décors propres aux jours de fête (planche : « plus tard »).
- Conversion inverse (date pataphysique → grégorienne), évoquée par le Compendium.
