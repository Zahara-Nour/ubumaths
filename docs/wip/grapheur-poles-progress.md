# Grapheur — tracés cassés autour des pôles (fix/grapheur-poles)

Signalé par David le 2026-09-15, captures à l'appui sur `1/(x(x+1))` :
branches reliées à travers les asymptotes, branches tronquées loin du bord du
cadre, petits crochets parasites.

## Diagnostic (mesuré, pas supposé)

Fenêtre de la capture : x ∈ [-10,3 ; 8], y ∈ [-32 ; 31], 300 points.

1. **Pont entre deux branches.** `x = -0.0177 → y = -57.4` puis
   `x = +0.0435 → y = +22.0`. Saut = 79, seuil `isAsymptote` = 2 × hauteur =
   126 → pas de rupture. Le repli « changement de signe » exige `|y| > H/2 =
31.5` **des deux côtés** : 22 < 31.5 → raté aussi. Les deux branches sont
   reliées par un segment quasi vertical.
2. **Branches tronquées.** Près de x = -1, un échantillon tombe presque sur le
   pôle (`x = -0.99699 → y = -333`). Ses **deux** voisins dépassent le seuil →
   deux ruptures consécutives isolent ce point dans son propre segment. La
   branche gauche s'arrête à y = +16.2, la cloche centrale reprend à y = -16.6.
3. **Crochets.** Catmull-Rom fabrique un point fantôme par symétrie en bout de
   segment (`reflectPoint`) ; avec un y terminal énorme, la tangente déborde.
4. **Aucun écrêtage.** Un y de ±333 (±10⁶ plus près du pôle) pollue les
   tangentes de tous ses voisins.

Trouvé en cours de route, **préexistant et vérifié tel quel sur `origin/main`** :
`findVerticalAsymptotes` traitait toute valeur absente comme une asymptote →
**40** asymptotes dessinées pour `ln(x)`, **79** pour une fonction vide, **40**
pour `√x` (dont le bord de domaine a pourtant une limite finie) — et seulement
2 des 4 pôles de `tan(x)` trouvés (seuil `hauteur × 5` trop haut).

## Correction

Périmètre tranché par David : **dans `geometry-core`, partagé** — le grapheur
(`sampleFunction`) et `courbe()` du DSL géométrie (`sampleWithDerivative`)
avaient le même bug.

- `viewport/sampler.ts` — nouveau `buildCurve()` : pour chaque intervalle
  suspect, localisation de la singularité **par dichotomie** (`marchToward`),
  prolongement des branches jusqu'à sortir du cadre, rupture au bon endroit,
  écrêtage des ordonnées à ±1 hauteur de fenêtre. Le seuil de divergence est
  **relatif aux deux extrémités** (`4 × max(|y₁|, |y₂|, H)`) : une exponentielle
  qui sort du cadre grandit, elle ne diverge pas, et ne doit pas être coupée.
  `sampleFunctionAdaptive` délègue désormais (son raffinement est intégré).
- `grapheur/analysis.ts` — `findVerticalAsymptotes` réécrite : candidats =
  passage domaine ↔ hors-domaine ou saut > hauteur ; position par
  `approachPole` ; et surtout `divergesAt`, qui exige que |f| croisse **sans
  borne** quand on se rapproche (sondes relatives à 1e-2 … 1e-15).

## Vérification

- 35 tests `sampler.test.ts` (dont 10 nouveaux sur les pôles), 6 nouveaux tests
  `vertical-asymptotes.test.ts`, 3390 tests geometry-core, 373 grapheur,
  75 tests client grapheur — tous verts. `check:incremental` : 0 erreur.
- Rendu réel relu au navigateur (playwright sur le serveur de dev) pour
  `1/(x(x+1))` normal et dézoomé, `tan`, `1/x²`, `ln`, `√x`.

## Deux tests existants ajustés (et pourquoi)

- `sampler.test.ts` « handles domain errors gracefully » : une rupture en tête
  de courbe n'a plus de sens (rien ne la précède), et l'index 0 était de toute
  façon ignoré par `splitAtDiscontinuities`.
- `function-domain-svg.test.ts` « clamps sampling to the domain interior » :
  comparait des **longueurs de chaîne** de chemin SVG. Depuis l'écrêtage, une
  courbe qui sort du cadre a des coordonnées plus COURTES : le proxy s'inversait.
  Remplacé par une mesure de l'emprise réelle en x.
