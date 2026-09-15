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

## Revue (`code-reviewer`) — 9 findings, 8 traités

Tous reproduits indépendamment avant correction, avec les mêmes chiffres.

| #    | Problème                                                                                                                                                                                                  | Correction                                                                                                                                |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 1 🔴 | Budget de raffinement consommé **de gauche à droite** : une zone oscillante en amont l'épuisait et les pôles suivants retombaient dans le bug d'origine (`sin(200x)` avant un pôle en x = 8 → 0 rupture). | `buildCurve` en **trois passes** : évaluation, raffinement **trié par suspicion décroissante**, assemblage.                               |
| 2 🔴 | L'écrêtage pouvait **inverser le signe** de y (fenêtre y ∈ [30 ; 40] → `-x²` rendu positif), et `splitOnZeros` lit ce signe pour colorier `aire()` / `aire_entre()`.                                      | Les bornes d'écrêtage n'enjambent plus zéro (`Math.max(yMax, 0)` / `Math.min(yMin, 0)`).                                                  |
| 3 🟠 | Fenêtre de hauteur nulle ou inversée → toute la courbe aplatie sur une seule ordonnée.                                                                                                                    | `makeClamp` rend l'identité quand la hauteur est dégénérée.                                                                               |
| 4 🟠 | `approachPole` était une montée de colline : une fois le pôle franchi, elle ne le retrouvait plus. L'asymptote de `1/(x − e)` sortait à 2,71875, **affichée « x = 2,719 » à l'élève**.                    | `locatePole` : dichotomie sur l'existence (bord de domaine), sur le signe de 1/f (pôle impair), section ternaire sur \|1/f\| (pôle pair). |
| 5 🟠 | `divergesAt` exigeait \|f\| > hauteur/2, or la sonde la plus fine ne donne que \|ln\| ≈ 34 → **plus d'asymptote pour ln(x) dès 69 unités de hauteur**.                                                    | Seuil absolu supprimé ; seul le facteur de croissance décide.                                                                             |
| 6 🟠 | `approachPole` marchait **dans** la zone hors-domaine (`Infinity >= Infinity`) : candidat à 0,25 pour un bord à 0,3.                                                                                      | Couvert par `locatePole`.                                                                                                                 |
| 7 🟡 | Coût non plafonné. Mesuré après correction : `sin(200x)` 2988 → **300** points, `sqrt(sin(50x))` 7143 → **1836** évaluations.                                                                             | Tri + `MAX_DOMAIN_MARCHES` + `MAX_ASYMPTOTE_CANDIDATES`.                                                                                  |
| 8 🟡 | Sentinelle `first === 0` ambiguë dans `divergesAt`.                                                                                                                                                       | `first: number \| null`.                                                                                                                  |
| 9 🟡 | `isAsymptote` supposée morte.                                                                                                                                                                             | **Non suivi** : elle sert toujours à `sampleAtPoints` (`sampler.ts`). Rien supprimé.                                                      |

6 tests de non-régression ajoutés, un par finding reproductible.
