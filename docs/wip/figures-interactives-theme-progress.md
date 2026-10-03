# Figures interactives et constructions : thème clair / sombre (lot 2)

**Branche** `feat/figures-interactives-theme` · ouvert le 2026-10-03 · suite de #708 (palette
nommée, lot 1) — décisions communes : `docs/wip/palette-figures-progress.md` (fusionné).

## Le problème, mesuré

- `GeometryCanvas.svelte` (figures interactives, démos, constructions via `ConstructionCanvas`) :
  fond `#ffffff`, grille, axes, panneau des curseurs, info-bulles (`color:black;
background:rgba(255,255,255,.92)`) et ~17 halos `stroke="white"` **en dur**. En sombre, la
  figure reste une carte blanche dans la page sombre (capture du 2026-10-03, `/geometry-demo/rendering`).
- Couleurs d'auteur : depuis le lot 1, valeur claire figée (`resolvePrintStyle`).
- Défaut des objets sans couleur : `#1e40af` figé ; `bleu` vaut `#2563eb` → deux bleus voisins.
- Instruments (règle, rapporteur, équerre, compas, crayon) : dessins réalistes en dur ; le compas
  a des traits **noirs**.

## Décisions de David (2026-10-03)

| #    | Décision                                                                                |
| ---- | --------------------------------------------------------------------------------------- |
| D3   | Le fond des figures interactives suit le thème ; exports toujours clairs                |
| L2-a | Défaut des objets sans couleur = **`bleu` de la palette** (un seul bleu, suit le thème) |
| L2-b | Instruments gardés tels quels ; **seuls leurs traits noirs** s'éclaircissent en sombre  |

## Spécification validée

1. En sombre, le fond de la figure suit celui des cartes ; grille et axes lisibles.
2. `couleur: rouge` → `#dc2626` clair, `#ff6257` sombre (couleur RENDUE).
3. Un hex d'auteur reste fixe (D2a).
4. Halos des points / étiquettes = couleur du fond (plus de blanc en dur).
5. Mode « main levée » (rough.js) : suit aussi le thème.
6. Exports Typst / SVG / TikZ : toujours clairs.

## Conception

- **Couleurs d'auteur** : `resolveScreenStyle` → `var(--color-fig-<nom>)`, hex tel quel, ou nom
  CSS validé ; peintes en **`style:`** (une `var()` dans un attribut SVG est honorée par
  Chromium et WebKit — vérifié 2026-10-03 —, Firefox non vérifiable ici : sandbox refusé).
- **rough.js** : produit des attributs `stroke=` / `fill=` ; on les déplace dans le style des
  nœuds avant insertion.
- **Habillage** (fond, grille, axes, halos, info-bulles) : classes CSS sur tokens, PAS de style
  inline — une couleur inline écraserait les règles de survol (`.point.hovered`).

## Hors chantier, signalé

- `/construction-demo` : 500 (dossier `extern/instrumenpoche-main/` absent du dépôt).
- `/geometry-demo/circles` plante : script de démo en ancienne syntaxe `corde()`.
- Suivi des erreurs : `btoa` hors Latin-1 + faux doublons → corrigé à part (#715).

## Avancement

- [x] Inventaire des sites (2026-10-03, voir ci-dessous)
- [x] Tests navigateur d'abord, vus rouges (9/10 en échec avant le code ; le 10ᵉ, hex fixe,
      est un garde-fou) : `src/lib/components/geometry/__tests__/GeometryCanvas.theme.svelte.test.ts`
      (11 tests) + `geometry-core/rendering/__tests__/resolve-screen-style.test.ts` (10 tests,
      dont exports SVG / Typst / TikZ toujours clairs)
- [x] Implémentation (non commitée par l'agent : commit refusé par le système de permissions)
- [ ] Captures 4 combinaisons + instruments en sombre · `code-reviewer` · PR

### Sites traités

- `svg-primitives.ts` : `resolveScreenStyle` (nom palette → `var()`, hex, nom CSS validé par
  `isValidColor`, sinon défaut) ; repli de `resolveStyle` = `'bleu'`.
- `figure.ts` : `DEFAULT_COLOR = 'bleu'` (L2-a). `FIGURE_DEFAULTS` du bloc ```figure
(`#000000`) intact. Exports : `#2563eb`.
- `GeometryCanvas.svelte` : 31 `stroke=` + 31 `fill=` d'auteur → `style:` ; 15 halos
  `stroke="white"` → `.label, .angle-label { stroke: var(--color-card) }` ; extrémité ouverte
  et fond des textes → `--color-card` ; info-bulles mathText/richText → `.geo-html-label`
  (popover) ; info-bulle paramétrique → popover ; fond `--color-card`, bordure, grille
  `--color-border`, axes et graduations `--color-muted-foreground`, panneau `--color-muted`,
  survol `--color-warning`.
- rough.js : `paintInStyle` (rough-geometry.ts) déplace `stroke`/`fill` dans `style` avant
  sérialisation (tous les `*HTML`, y compris `roughVectorHTML` utilisé par l'export SVG :
  sortie équivalente, en `style=`).
- `SliderControl.svelte`, `ElementPopover.svelte` (pastilles `colorForScreen`, panneau sur
  tokens).
- `ConstructionCanvas.svelte` + `render-helpers.ts` : `resolveScreenStyle`, `style:` ;
  projections `#3b82f6`/`#1e40af` → `--color-fig-bleu` ; halos → `--color-card`.
- Instruments v2 (L2-b) : `stroke="black"` et `stroke="#333333"` → `stroke:
var(--color-foreground)` (Compass 15, CompassRaised 13, Pencil 3, Protractor 3, Ruler 1,
  SetSquare 1). Remplissages inchangés (mines noires, chiffres de la règle et du rapporteur
  en `fill: black`). Instruments v1 (`src/lib/constructions/`) non touchés.
- Aucun nouveau token : tous existaient.

### Règles CSS d'état (stroke / fill)

- `.point.draggable:hover`, `.point.hovered`, `.point.dragging` posent `stroke` : la couleur
  d'un point « cercle » est un contour inline → ces trois règles passent en `!important`
  (test : point `forme="cercle"` survolé ; contrôle négatif sans `!important` → rouge).
- Survol des lignes / courbes / marques : `filter` et `stroke-width` seulement (l'épaisseur
  reste un attribut de présentation, la règle CSS gagne toujours) → inchangé.

### Reste / incertain

- Chiffres noirs de la règle et du rapporteur, mine du crayon : restés noirs (ce sont des
  remplissages, pas des traits) — à regarder en capture sombre.
- Firefox non vérifié (sandbox) ; les couleurs d'auteur sont en `style`, donc sûres.

## Revue (`code-reviewer`, 2026-10-03) : 0 bloquant, 0 important

- Corrigé : `remplissage="none"` remplissait secteurs et anneaux (repli sur la couleur du trait) →
  `screenFill` garde `none` (test).
- Corrigé : commentaire `!important` (le point en croix n'est pas surligné, comme avant).
- Laissé : `exportToSVG` en mode rough écrit les vecteurs en `style="stroke: rgb(…)"` et le reste
  en attribut — cohérence seulement, `exportToSVG` n'a aucun appelant en production.
- Laissé (décision L2-b) : graduations claires, chiffres de la règle et du rapporteur noirs en
  sombre — lisibles en capture, contraste réduit.
