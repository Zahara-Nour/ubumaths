---
title: Bloc ```figure — position des noms de points, ancrage des textes
date: 2026-10-02
status: en cours
branche: feat/figure-etiquettes (worktree ../ubumaths-wt-figure)
---

# Position des noms de points et ancrage des textes

Point de reprise en cas de crash. Contexte : 13 modèles « produit scalaire » (1re SPE) dont les
figures contournaient l'absence de réglage du nom des points par `masque(A)` + `texte(…)`.

## Syntaxe

- `A = point(0, 0, etiquette="bas-gauche")` — 8 directions `haut`, `bas`, `gauche`, `droite`,
  `haut-gauche`, `haut-droite` (défaut), `bas-gauche`, `bas-droite` ; `etiquette="aucune"` masque
  le nom seul (le point reste dessiné). Valable sur tout appel qui crée un point nommé (`milieu`,
  `intersection`, `projection`…), ainsi que `style(A, etiquette=…)` et `montre(A, etiquette=…)`.
- `texte(x, y, "…", ancre="bas-gauche")` — `ancre` = point du TEXTE posé sur `(x, y)` (comme
  l'`anchor` de cetz / TikZ) : `bas-gauche` → le texte s'étend vers le haut et la droite. Défaut :
  `centre`.
- `point(…, visible=faux)` : point masqué (comme `masque(A)`), utilisable dans les constructions.
- `style="pointille"` / `"pointilles"` / `"tirets"` / `"continu"` : alias de `trait=`.

## Choix

- Champs sémantiques (`labelPosition`, `labelHidden`, `textAnchor`) plutôt que `labelOffset` en
  pixels : un décalage en px ne sait pas placer un nom À GAUCHE sans connaître sa largeur ; une
  direction se traduit exactement en `text-anchor` (écran) et en `anchor:` de cetz (PDF).
- Textes centrés par défaut : convention du PDF (cetz `content` et TikZ `\node` centrent) et des
  textes automatiques de `mesure()` (milieu décalé, bissectrice, centre de gravité, conçus comme
  des centres). L'écran du bloc figure s'aligne dessus. L'éditeur `GeometryCanvas` garde son
  ancrage historique (début du texte, ligne de base) — hors périmètre.

## Lots

- [x] Lot 1 — geometry-core (types, DSL, export Typst) + écran du bloc figure, tests rouges d'abord
- [ ] Lot 2 — vérification PDF (compile-prod) et écran (PNG)
- [ ] Lot 3 — doc (`dsl-builtins.md`, `fiches-exercices.md`)
- [ ] Lot 4 — réécriture des figures des modèles produit scalaire

## Journal

- 2026-10-02 lot 1 : **60 tests rouges avant** (`dsl/__tests__/etiquette-ancre.test.ts` 31/35,
  `ubumark/__tests__/figure/figure-etiquettes.test.ts` 29/31) → verts. Table unique
  `geometry-core/rendering/label-placement.ts` (direction → `text-anchor` + ligne de base à
  l'écran, → `anchor:` de cetz au PDF ; boîte = ligne de base → hauteur des capitales, la boîte
  Typst par défaut). Écarts : 6 px / 5 px en diagonale à l'écran (= l'ancien défaut, inchangé),
  0,15 / 0,125 cm au PDF (× `markScale`). **Cause de `visible=faux` ignoré** : `visible` était
  lu par `applyInlineStyle` mais absent de `STYLE_ARGS`, qui déclenche son appel → ajouté (avec
  `etiquette` et `style`). `style=` inconnu → erreur qui cite `trait=` ; `trait=` inconnu reste
  ignoré (compatibilité des constructions enregistrées). Test navigateur (`FigureBlock`) : boîtes
  MESURÉES (`getBBox`) : police réelle 13 px = `FIGURE_LABEL_FONT_PX`, nom à gauche / en bas du
  bon côté, texte centré. Suites geometry-core + ubumark + constructions-v2 : 7201 verts ;
  `check:incremental` 0 erreur.
