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
| 7 🟡 | Coût non plafonné.                                                                                                                                                                                        | Tri + `MAX_DOMAIN_MARCHES` + `MAX_ASYMPTOTE_CANDIDATES`. Chiffres définitifs en fin de document.                                          |
| 8 🟡 | Sentinelle `first === 0` ambiguë dans `divergesAt`.                                                                                                                                                       | `first: number \| null`.                                                                                                                  |
| 9 🟡 | `isAsymptote` supposée morte.                                                                                                                                                                             | **Non suivi** : elle sert toujours à `sampleAtPoints` (`sampler.ts`). Rien supprimé.                                                      |

6 tests de non-régression ajoutés, un par finding reproductible.

## Seconde passe de revue

L'auditeur a revérifié les huit corrections sur le commit suivant : **cinq sur six
tiennent sur son scénario exact** (F4 tombe à une erreur de 0,00e+0 sur
`1/(x − e)`, ln(x) retrouve son asymptote à tous les zooms, le signe n'est plus
inversé). Il confirme aussi que **F9 était un faux positif de sa part** : son
grep excluait `sampler.ts`, donc l'appelant intra-fichier `sampleAtPoints`.

Trois suites données :

- **Ma mesure de F7 était fausse.** J'annonçais « `sin(200x)` : 300 points au
  lieu de 2988 » ; ce chiffre valait pour une fenêtre de hauteur 20, pas pour
  son cas (`sin(200x)·2` dans y ∈ [-2 ; 2]), qui faisait toujours 2988 points.
  Corrigé pour de bon depuis : `analyzeGap` ne rend plus ses points quand elle
  ne conclut ni à un pôle ni à un saut — c'était du remplissage pur, une
  quarantaine de points par intervalle. Le budget compte désormais les
  **tentatives**, pas les ruptures trouvées, sinon le coût n'était plus borné.
- **`MAX_DOMAIN_MARCHES` reproduisait le défaut de F1**, consommé de gauche à
  droite : des trous denses avant x = 5 laissaient revenir le décrochage sur un
  bord franc en x = 8 (tracé arrêté à 7,993 au lieu de 8,000). Les bords sont
  maintenant choisis **par longueur de la branche qu'ils terminent** : on
  prolonge une branche de cent points, pas un échantillon isolé d'une zone
  hachée.
- **`MAX_ASYMPTOTE_CANDIDATES` : signalé comme structurellement identique, mais
  l'auditeur n'a pas réussi à le reproduire, et moi non plus** (le test écrit
  pour ça passe sans modification du code). Laissé tel quel, avec ce test comme
  garde-fou.

### Coût, chiffres définitifs (300 points demandés)

| fonction                    | avant                    | après                            |
| --------------------------- | ------------------------ | -------------------------------- |
| `sin(200x)·2`, y ∈ [-2 ; 2] | 2988 points              | **300 points**, 2620 évaluations |
| `sqrt(sin(50x))`            | 3572 points / 7143 évals | **944 points / 1836 évals**      |
| `1/(x(x+1))`                | —                        | 311 points / 376 évals           |

Note de l'auditeur, conservée telle quelle : sur une fenêtre loin de l'origine
(y ∈ [1000 ; 1063]), interdire aux bornes d'écrêtage d'enjamber zéro élargit la
bande à ~17 hauteurs de fenêtre. L'effet anti-crochets y est dilué — c'est le
compromis accepté : mieux vaut une tangente un peu tirée qu'un signe faux.
