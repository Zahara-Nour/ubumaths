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

- [ ] Inventaire précis des sites de `GeometryCanvas` / `ConstructionCanvas` / instruments
- [ ] Tests navigateur (couleur rendue, deux modes) d'abord
- [ ] Implémentation
- [ ] Captures 4 combinaisons + instruments en sombre · `code-reviewer` · PR
