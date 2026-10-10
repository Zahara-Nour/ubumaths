# Palette des figures : couleurs nommées, thème clair / sombre (lot 1)

**Branche** `feat/palette-figures` · ouvert le 2026-10-03 · suite de #695 (grapheur)

## Le problème, mesuré

Inventaire du 2026-10-03 (trois agents, lecture seule) :

- **Quatre vocabulaires** de couleurs écrits par les auteurs, stockés en base :
  `courbe`/`stat-chart` (7 noms FR fermés), `figure` (FR + EN + hex libres), DSL de géométrie
  (9 noms FR + valeur libre), cercle trigo / droite graduée (EN ou chaîne libre).
- Le DSL géométrique convertit les noms en hex **avant** le bloc `figure` (`builtins.ts`
  `COLOR_MAP`) : l'identité « rouge » est perdue, la couleur ne peut pas suivre le thème.
- `figure` : seul le noir par défaut suit le thème ; bleu `#1e40af` peu lisible en sombre,
  `blanc` invisible en clair.
- `courbe` : rouge et gris diffèrent entre l'écran (`--color-destructive`) et le PDF (`#dc2626`).
- Vert / violet dupliqués en `--courbe-*` et `--stat-*`, définis hors `app.css`.
- Mesure de l'usage réel en base : **pas faite** (MCP Supabase sans jeton dans ce processus).

## Décisions de David (2026-10-03)

| #   | Décision                                                                                  |
| --- | ----------------------------------------------------------------------------------------- |
| D1  | Un vocabulaire unique de 12 noms ; anciennes formes (EN, `grey`…) acceptées pour toujours |
| D2a | Un hex écrit par l'auteur reste tel quel, même couleur dans les deux modes                |
| D3  | Lot 2 : le fond des figures interactives suit le thème ; instruments inchangés            |
| D4  | Daltonisme : recommandation écrite dans le guide des fiches, pas de contrainte            |
| D5  | Tableau blanc : hors chantier                                                             |
| P   | Palette **Fidèle** (nuancier : https://claude.ai/artifact/D9Zng5vVrDDE2hgetfcaoo)         |

| Nom    | Clair            | Sombre           |
| ------ | ---------------- | ---------------- |
| bleu   | `#2563eb`        | `#5d93fe`        |
| rouge  | `#dc2626`        | `#ff6257`        |
| vert   | `#018639`        | `#26ac52`        |
| orange | `#b65a00`        | `#e97607`        |
| violet | `#9333ea`        | `#b478fe`        |
| jaune  | `#906f06`        | `#ddac03`        |
| cyan   | `#037e9c`        | `#2ba2c3`        |
| marron | `#863805`        | `#bd8b73`        |
| rose   | `#d92475`        | `#ff5898`        |
| gris   | `#6c727e`        | `#9096a3`        |
| noir   | texte de la page | texte de la page |
| blanc  | fond de la page  | fond de la page  |

Contraste ≥ 4,5 sur page et carte (`#ffffff`/`#fafafa`, `#262624`/`#2f2f2f`). Orange tiré de
12° vers le jaune et jaune de 18° (sinon rouge/orange se confondent en sombre).

## Spécification validée (2026-10-03)

1. `couleur: rouge` (figure) → `#dc2626` clair, `#ff6257` sombre ; rien ne change en base.
2. `red` = `rouge` (synonymes).
3. `#1e40af` écrit par l'auteur reste `#1e40af` dans les deux modes.
4. Défaut (noir) suit le texte ; `blanc` suit le fond.
5. PDF : variante claire, identique à l'écran clair (test qui compare les deux sources).
6. Contraste ≥ 4,5 lu dans `app.css` (noir/blanc exclus).
7. Camemberts : même palette.
8. Nom inconnu : erreur auteur actuelle (« couleur inconnue ») dans `figure`.

## Conception

- Module unique `src/lib/theme/named-colors.ts` : noms canoniques, synonymes, valeur écran
  (`var(--color-fig-<nom>)`), valeur impression (hex clair).
- geometry-core conserve le **nom canonique** (`rouge`) au lieu de le convertir en hex ; chaque
  destination traduit : écran du bloc `figure` → `var()` ; exports Typst/SVG/TikZ → hex clair.
- Figures interactives (`GeometryCanvas`, constructions) : en attendant le lot 2, valeur claire
  (même aspect qu'aujourd'hui sur leur carte blanche).

## Avancement

- [x] Étape 1 — module `src/lib/theme/named-colors.ts` + tokens `--color-fig-*` (`@theme static`)
- [x] Étape 2 — geometry-core conserve le nom ; exports Typst/SVG/TikZ et figures interactives via
      `resolvePrintStyle` (8 anciens tests qui assertaient le hex adaptés au nom)
- [x] Étape 3 — bloc `figure` : nom gardé dans la scène, `colorForScreen` au rendu
- [x] Étape 4 — `courbe`, `stat-chart`, camemberts (`PIE_COLOR_SEQUENCE`), générateurs PDF ;
      variables locales `--courbe-*` / `--stat-*` supprimées
- [x] Étape 5 — tests navigateur (couleur rendue, deux modes) pour figure, courbe, camembert ;
      PDF compilés avec typst.ts 0.6.1-rc5 (figure, courbe, camembert) et regardés ; contrôle
      négatif (`rgb("bleu")` échoue bien)
- [x] `code-reviewer` : 0 bloquant ; éditeur de figure (`ElementPopover`) passé sur les noms
      de la palette, tables factorisées (`namedColorTable`), `HEX_COLOR` unique
- [ ] `check:incremental` · PR

## Changements visibles à annoncer (revue du lot 1)

- **Figures interactives et exports du DSL** : les noms anglais (`yellow`, `white`, `pink`…)
  étaient des couleurs CSS natives (`yellow` = `#ffff00`) ; ce sont maintenant des synonymes
  de la palette (`yellow` → jaune moutarde `#906f06`). `rose`, `marron`, `blanc` étaient du CSS
  invalide (noir au PDF) : ils prennent leur couleur.
- **Deux bleus jusqu'au lot 2** : un objet sans couleur garde le défaut `#1e40af`, un objet
  `bleu` prend `#2563eb`. Le lot 2 rendra le défaut thémable (à trancher dans sa spécification).
- `#000000` écrit par un auteur dans un bloc ```figure est assimilé au défaut et suit le texte
(comportement antérieur, conservé) ; `#000` reste noir.

## Trouvé en route (hors lot)

- **Opacité de remplissage** : écran figé à 25 %, PDF opaque, `opacite_fond` ignorée →
  corrigé à part (#705).
- `rgb("bleu")` fait échouer la compilation : c'est le défaut de la droite graduée (lot 3).
- Les figures interactives changent légèrement de bleu : `bleu` était `#1e40af` dans le DSL,
  il devient le bleu de la palette `#2563eb` (même valeur qu'au PDF des fiches).
