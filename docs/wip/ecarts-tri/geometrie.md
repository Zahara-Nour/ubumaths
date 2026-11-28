# Lot geometrie : 23 points (26 blocs après découpage)

| verdict      | nombre |
| ------------ | -----: |
| VRAI         |     16 |
| CORRIGÉ      |      2 |
| FAUX         |      0 |
| PAS UN ÉCART |      7 |
| NON VÉRIFIÉ  |      1 |

Dont 4 VRAI de nature `[D]` (état décrit exact, question à David). Aucun point n'est déjà au registre (`grep` des mots-clés constructions, courbe, chorégraphie, PPU, getAllDiscontinuities, relever, arc_milieu… dans `docs/ecarts/registre.md` : rien ; M19 Newton est voisin mais hors lot).

Sondes : scripts `tsx` jetables (scratchpad, supprimés), appel direct de `runDsl` (`src/lib/geometry-core/dsl/index.ts`) et de `analyzeFunction` (`src/lib/grapheur/analysis.ts`).

## Points

### geometrie/constructions.md:404 [D] — VRAI

- **Point** : la contrainte `@mesure` n'a que trois voies (milieu, bissectrice, médiatrice), pas `perpendiculaire`.
- **Vu** : `src/lib/constructions-v2/core/choreographies/registry.ts:46-51` : `perpendiculaire` a `euclide` et `equerre`, `mesure: undefined` ; `@mesure` existe pour `mediatrice` (:32), `bissectrice` (:38), `milieu` (:68).
- **Registre** : D · constructions · une perpendiculaire ne peut pas être animée « à la mesure » (rapporteur), seulement au compas ou à l'équerre · `à la main` (la commande `grep -q "mesure: VOIES_PERPENDICULAIRE" registry.ts` sort aujourd'hui en 1).
- **Question à David** : « Dans une animation de construction, une perpendiculaire se trace au compas (`@euclide`) ou à l'équerre (`@equerre`). Veux-tu aussi une version au rapporteur (on mesure 90° puis on trace) ? » Réponses : (a) non, l'équerre suffit au collège ; (b) oui, à ajouter ; (c) plus tard.

### geometrie/constructions.md:405 [D] — VRAI

- **Point** : sept builtins seulement ont une chorégraphie ; les autres refusent les décorateurs.
- **Vu** : `registry.ts:27-70` : `mediatrice`, `bissectrice`, `parallele`, `perpendiculaire`, `cercle_circonscrit`, `transporte`, `milieu`. `executor.ts:1295-1299` et `resolve.ts:142-145` lèvent « Le builtin `…` n'a pas de chorégraphie déclarée » pour tout autre (`cercle`, `triangle_equilateral`…).
- **Registre** : D · constructions · écrire `cercle(O, 3) @euclide` ou `triangle_equilateral(A, B) @euclide` donne une erreur au lieu d'une animation au compas · `à la main`.
- **Question à David** : « Le prof peut animer au compas une médiatrice ou une bissectrice, mais pas un triangle équilatéral ni un cercle : l'écrire avec `@euclide` donne une erreur. Lesquelles ajouter ? » Réponses : (a) triangle équilatéral d'abord (classique de 6e) ; (b) une liste à choisir ; (c) rien pour l'instant.

### geometrie/constructions.md:406 [D] — VRAI

- **Point** : polygones, vecteurs, courbes apparaissent d'un coup (pas de tracé ni d'instrument).
- **Vu** : `src/lib/constructions-v2/types.ts:84-90` : `DRAWABLE_TYPES` = segment, deux arcs, deux cercles ; `executor.ts:1578-1608` : sans élément de cette liste, pas de tracé progressif ni d'instrument (pause fixe `DEFAULT_STEP_DURATION`).
- **Registre** : D · constructions · un polygone ou un vecteur d'une animation apparaît d'un bloc, sans être tracé à la règle · `à la main`.
- **Question à David** : « Dans une animation, `polygone(A, B, C)` apparaît d'un coup, alors qu'un segment se trace à la règle. Veux-tu que les côtés d'un polygone se tracent un par un ? » Réponses : (a) oui pour polygones et vecteurs ; (b) polygones seulement ; (c) non, on écrit les segments à la main.

### geometrie/constructions.md:412 [L] — PAS UN ÉCART

- **Point** : la visibilité finale d'une instruction chorégraphiée s'applique au pas suivant.
- **Vu** : `executor.ts:302-310` (`_pendingVisibility` « drained at the start of the FOLLOWING step »), `:449-465` ; le lecteur la force en fin de lecture (`ConstructionPlayer.svelte:175-180` `drainFinalVisibility`, appelée `:226-235`). Choix écrit et assumé (« pédagogiquement on veut voir le résultat complet avant le nettoyage », `docs/archive/wip/v1-choreographies-substeps-progress.md:218`).

### geometrie/constructions.md:413 [L] — VRAI

- **Point** : chaque changement de pas rejoue tout ; `reset()` refait la pré-simulation : coût quadratique.
- **Vu** : `ConstructionPlayer.svelte:182-186` : `executor.reset()` puis `for (let i = 0; i <= stepIndex; i++) executor.step()` ; `executor.ts:718-750` `reset()` finit par `this._stepDurations = this.calculateStepDurations()` (pré-simulation entière).
- **Registre** : L · constructions · sur une longue construction, avancer ou reculer d'un pas devient de plus en plus lent vers la fin · commande `test -f src/lib/constructions-v2/components/ConstructionPlayer.svelte && ! grep -q "for (let i = 0; i <= stepIndex; i++)" src/lib/constructions-v2/components/ConstructionPlayer.svelte` (sortie relevée : 1).

### geometrie/constructions.md:414 [M] — VRAI

- **Point** : `PPU = 40` codé deux fois dans l'exécuteur, en double de `INITIAL_PPU`.
- **Vu** : `executor.ts:1453` et `:1576` `const PPU = 40;` ; `ConstructionCanvas.svelte:65` `const INITIAL_PPU = 40;` (lignes décalées depuis la doc : 1203/1322/60).
- **Registre** : M · constructions · aucun effet visible, l'échelle de 40 pixels par unité est écrite trois fois · commande `test -f src/lib/constructions-v2/core/executor.ts && ! grep -q "const PPU = 40" src/lib/constructions-v2/core/executor.ts` (sortie relevée : 1).

### geometrie/constructions.md:415 [M] — VRAI

- **Point** : le genre `compass-measure` sert aussi de « déplacement sans tracé » de l'équerre et de la règle.
- **Vu** : `perpendiculaire.ts:1135-1160` (« Kind `compass-measure` = move + pause sans tracé (sémantique générique) », `instrument: 'setSquare'`), `parallele.ts:677-700` (`instrument: 'setSquare'` puis `'ruler'`). La définition `choreographies/types.ts:52-58` ne parle que du compas.
- **Registre** : M · constructions · aucun effet visible, le pas « le compas prend une mesure » sert aussi à poser l'équerre ou la règle · commande `test -f src/lib/constructions-v2/core/choreographies/perpendiculaire.ts && ! grep -h -A1 "kind: 'compass-measure'" src/lib/constructions-v2/core/choreographies/perpendiculaire.ts src/lib/constructions-v2/core/choreographies/parallele.ts | grep -qE "instrument: '(setSquare|ruler)'"` (sortie relevée : 1).

### geometrie/constructions.md:416 [V] — VRAI (instantané du 2026-10-23 ; état actuel de la prod NON VÉRIFIÉ)

- **Point** : 3 constructions publiques contiennent des `@cacher("T_3")`… sans effet.
- **Vu** : instantané `scripts/constructions-prod/avant-2026-10-23.json` : « Axes de symetrie et construction d'un carre » 44 `@cacher("X_n")`, « Ajouter 19 » 6, « Soustraire 99 » 6 ; `scripts/constructions-prod/contenu.ts:148-170` ne change que titre et description de ces trois (pas de `dslScript`). Côté code, `executor.ts:886-900` : `@cacher` avec un nom qui n'est pas un instrument (`resolveInstrumentName` → `undefined`, `:95-97`) ne fait rien. Aucune migration ni script ultérieur ne cite leurs ids.
- **Requête de lecture à faire** : table `constructions`, `select id, title from constructions where dsl_script ~ '@cacher\("[A-Za-z]+_[0-9]+"\)'` (attendu aujourd'hui : 3 lignes).
- **Registre** : V · constructions · dans trois constructions publiques (dont « Axes de symétrie et construction d'un carré »), des traits que l'auteur voulait cacher restent affichés · `à la main` (contenu en prod, requête ci-dessus).

### geometrie/constructions.md:422 [V] — CORRIGÉ

- **Point** : l'étiquette d'un segment nommé s'affiche au milieu, sur celle du milieu I.
- **Vu** : `src/lib/geometry-core/rendering/label-avoidance.ts:1-24` (commit 77c9686f5e du 2026-11-24, « fix(constructions): noms des figures sans chevauchement (E4) ») cite ce cas précis (« le nom « s » d'un segment sur celui de son milieu I ») et choisit une place libre ; branché dans `ConstructionCanvas.svelte:79-83` et `GeometryCanvas.svelte:364`. La doc est périmée sur ce point.

### geometrie/constructions.md:423 [D] — VRAI

- **Point** : `@arc_milieu` refuse l'angle plat.
- **Vu** : `bissectrice.ts:777-789` : « Angle plat : le milieu de [A′B′] est le sommet, il ne donne pas la bissectrice. Utiliser `@arcs_egaux` (arcs croisés) ou `@mesure` (rapporteur). »
- **Registre** : D · constructions · la bissectrice d'un angle plat par la méthode « milieu de l'arc » est refusée avec un message qui renvoie vers une autre méthode · `à la main`.
- **Question à David** : « Pour un angle plat (180°), la méthode `@arc_milieu` ne marche pas : le milieu de l'arc tombe sur le sommet. Aujourd'hui l'animation s'arrête avec un message qui conseille `@arcs_egaux` ou `@mesure`. Ça te va ? » Réponses : (a) oui, le message suffit ; (b) basculer seul sur `@arcs_egaux` en le disant dans la consigne ; (c) autre.

### geometrie/constructions.md:424 [V] — PAS UN ÉCART

- **Point** : les marqueurs d'angle droit de la double perpendiculaire ne sont visibles qu'en `@complet`.
- **Vu** : `parallele.ts:1409-1413` les classe en traces `marker`, comme toutes les chorégraphies (`milieu.ts:17-18`, `bissectrice.ts:953-954`) ; `visibility.ts:40-42,89` : visibles par défaut en `@complet`, et `@squelette +marqueurs` les affiche (`resolve.ts:37`). Règle commune et réglable, pas un défaut propre à cette voie.

### geometrie/constructions.md:425a [L] — VRAI

- **Point** : `mediatrice(s)` sur un segment nommé est refusé.
- **Vu** : `src/lib/geometry-core/dsl/builtins.ts:5548` `requireNPoints(ctx, 2, …)` ; sonde : `s = segment(A, B)` puis `d = mediatrice(s)` → « `mediatrice()` attend 2 points (A, B), 1 argument(s) reçu(s) ».
- **Registre** : L · géométrie · `mediatrice(s)` sur un segment déjà nommé est refusé, il faut réécrire `mediatrice(A, B)` · `test à écrire` : `runDsl` de `A`, `B`, `s = segment(A, B)`, `d = mediatrice(s)` crée une droite (comme `parallele(P, s)` l'accepte, `builtins.ts:5572-5576`).

### geometrie/constructions.md:425b [L] — VRAI

- **Point** : un identifiant avec prime (`M'`) est refusé à la lecture.
- **Vu** : sonde `M' = point(1,1)` → « Ligne 1, colonne 2 : Caractere inattendu : ''' » (tokenizer du DSL).
- **Registre** : L · géométrie · le prof ne peut pas nommer M' l'image de M (notation des symétries au collège) · `test à écrire` : `runDsl("M' = point(1, 1)")` crée un point d'étiquette « M' ».

### geometrie/constructions.md:426 [L] — PAS UN ÉCART

- **Point** : `starPairStems` pourrait aller jusqu'à Q*/R* si toutes les lettres de C à P sont prises.
- **Vu** : `parallele.ts:982-989` : boucle de C à Y, repli `['C', 'D']` si tout est pris. Exact, mais il faut 14 noms d'une lettre occupés dans la même figure : théorique, la doc le dit, aucun cas réel.

### geometrie/constructions.md:432 [M] — VRAI

- **Point** : `applyTraceStyle` écrit dans la `Map` privée de `Figure` par un transtypage.
- **Vu** : `src/lib/constructions-v2/core/choreographies/visibility.ts:116-120` : `(figure as unknown as { elements: Map<string, typeof el> }).elements.set(id, merged)`.
- **Registre** : M · constructions · aucun effet visible, le style des traces contourne l'interface de la figure · commande `test -f src/lib/constructions-v2/core/choreographies/visibility.ts && ! grep -q "as unknown as { elements" src/lib/constructions-v2/core/choreographies/visibility.ts` (sortie relevée : 1).

### geometrie/constructions.md:436a [C] — PAS UN ÉCART

- **Point** : journal archivé : `ctx.sub` non implémenté, `cercle_circonscrit` en stub.
- **Vu** : `ctx.sub` existe (`choreographies/types.ts:237`, utilisé `cercle_circonscrit.ts:84-85`). Le journal (`docs/archive/wip/v1-choreographies-substeps-progress.md:219`) est un historique archivé, qui par règle ne décrit pas le code actuel.

### geometrie/constructions.md:436b [C] — PAS UN ÉCART

- **Point** : même journal : `transporte` en 6 sous-étapes.
- **Vu** : `transporte.ts` contient 7 `kind:` ; journal archivé `:221`, historique.

### geometrie/constructions.md:436c [C] — PAS UN ÉCART

- **Point** : `docs/archive/wip/constructions-v2/progress.md:151` : « les constructions JSON existantes fonctionnent toujours ».
- **Vu** : `src/routes/(protected)/constructions/[id]/+page.svelte:138` affiche « l'ancien format JSON qui n'est plus supporte » ; journal archivé, historique.

### geometrie/constructions.md:451 [M] — VRAI (nombre de constructions JSON en prod NON VÉRIFIÉ)

- **Point** : les constructions JSON ne se jouent plus nulle part hors de l'aperçu de conversion ; l'ancien `src/lib/constructions/` fournit encore schéma, convertisseur, instruments.
- **Vu** : imports encore vivants : `routes/api/constructions/+server.ts:16` et `[id]/+server.ts:17` (`constructionScriptSchema`), `api/constructions/convert/+server.ts:11` et `constructions/conversion/+page.svelte:21-23` (convertisseur, `ConstructionPlayer` JSON, `JsonEditor`), `QuestionTemplateForm.svelte:209`, `whiteboard/components/InstrumentLayer.svelte:13-15` ; page `[id]/+page.svelte:138` : « n'est plus supporte ». L'instantané du 2026-10-23 n'a que des `format = dsl` parmi les 9 publiques.
- **Requête de lecture à faire** : `select count(*), is_public from constructions where format <> 'dsl' group by is_public`.
- **Registre** : M · constructions · aucun effet visible si la prod n'a plus de construction JSON ; tout le format JSON (lecteur, éditeur, schéma de l'API) survit pour la seule page de conversion · commande `test -d src/routes/api/constructions && ! grep -rqE "#lib/constructions/(index|schemas|converter)\.ts" src/routes` (sortie relevée : 1). Les instruments du tableau blanc restent légitimes.

### geometrie/README.md:494 [V] — VRAI

- **Point** : `courbe("x^2 + y^2 = a^2")` avec `a = slider(…)` rend une conique dégénérée.
- **Vu** : sonde `a = slider(0, 5, 2)` puis `c = courbe("x^2 + y^2 = a^2")` → `quadraticCurve`, `coefficients [1,0,1,0,0,0]` (terme constant 0, sans `a`), `conic.type = "degenerate"`, `dependsOn: []` ; inchangé après `moveSlider`.
- **Registre** : V · géométrie · un cercle de rayon réglé par un curseur s'écrit sans erreur mais ne s'affiche pas (réduit à un point) et ne suit pas le curseur · `test à écrire` : `runDsl` de ce script donne un cercle de rayon `a`, et `moveSlider` le fait changer de rayon.

### geometrie/README.md:498 [L] — VRAI

- **Point** : `courbe("x^2 = 4")` refusée au lieu de deux droites.
- **Vu** : sonde → « courbe(): la variable y est absente de l'expression ».
- **Registre** : L · géométrie · `courbe("x^2 = 4")` est refusée alors que l'atelier dessine les deux droites x = −2 et x = 2 · `test à écrire` : `runDsl('c = courbe("x^2 = 4")')` ne lève pas et trace x = ±2.

### geometrie/README.md:500 [V] — CORRIGÉ

- **Point** : l'étiquette d'une courbe implicite n'est pas rendue par `GeometryCanvas` (`svg.label`, `<text>` sans `y`).
- **Vu** : `src/lib/components/geometry/GeometryCanvas.svelte:2085-2093` : `{#if el.label}<text x=… y=…>{el.label}</text>` ; plus de `svg.label`. La doc est périmée (voir « Vu en passant » pour la place choisie).

### grapheur.md:397 [L] — VRAI

- **Point** : tan(x) + 1/(x − 3) : `getAllDiscontinuities` ne rend que la famille de tan, le pôle 3 est perdu au dézoom.
- **Vu** : sonde : `getAllDiscontinuities` → 4 entrées, toutes `periodic` (aucune en 3) ; `analyzeFunction` sur la fenêtre large des tests (`xMin -580 … xMax 600`) → 0 asymptote verticale, x = 3 absent ; `1/(x−3)` seule → x = 3 trouvée.
- **Registre** : L · grapheur · dézoomé, la courbe de tan(x) + 1/(x − 3) n'a plus d'asymptote verticale en x = 3 · `test à écrire` : dans `src/lib/grapheur/__tests__/vertical-asymptotes.test.ts` « asymptotes verticales quand on dézoome », `poles('\\tan(x)+\\frac{1}{x-3}')` contient 3.

### grapheur.md:399 [L] — VRAI

- **Point** : une limite lente que le symbolique ne calcule pas reste invisible (le numérique exige la convergence avant 137 299).
- **Vu** : `src/lib/grapheur/analysis.ts:87` `LARGE_X_VALUES = [137, 1373, 13729, 137299]`, `:1061-1085`. Sonde : `\frac{\ln(x)^2}{\sqrt{x}}` → aucune asymptote horizontale (alors que `\frac{\ln(x)}{\sqrt{x}}` → y = 0 par le symbolique).
- **Registre** : L · grapheur · la courbe de (ln x)²/√x n'affiche pas son asymptote y = 0 · `test à écrire` : `analyzeFunction` de `\frac{\ln(x)^2}{\sqrt{x}}` rend `[['right', 0]]`.

### grapheur.md:401 [L] — PAS UN ÉCART

- **Point** : avec un curseur, chaque valeur refait l'AST et l'analyse (0,4 à 22 ms par cran).
- **Vu** : `analysis.ts:1565-1600` : `bindParameters` substitue puis `buildAnalysisAST` compile et dérive, avec cache par (expression, valeurs) voulu. Mesure de coût (0,4 à 2,5 ms courant, 22 ms sur un cas extrême ; la recollecte a fusionné les deux chiffres), pas un défaut.

### atelier.md:3232 [V] — NON VÉRIFIÉ

- **Point** : `.relever` sur une figure chargée : 19 à 23 s de balayage, ~95 ms de recalcul par pas.
- **Vu** : `src/lib/atelier/survey.ts` n'a changé depuis la mesure (2026-10-19) que par le renommage d'imports (a6c05abc55) : rien n'indique un changement de coût. Mesure à refaire dans un navigateur, sur la même figure (intersections, perpendiculaire, périmètre, angle, deux mesures composées), `.relever` sur ~100 pas, chrono du balayage. La doc dit elle-même « pas d'optimisation sûre » : probablement à classer PAS UN ÉCART si la mesure tient.

## Vu en passant

- `GeometryCanvas.svelte:2087-2088` : le nom d'une courbe implicite s'écrit au centre du cadre (`dims.width / 2`, `dims.height / 2`), pas près de la courbe.
- `etiquette="aucune"` (suite proposée par constructions.md:422) est refusé sur un segment : « `etiquette` ne s'applique qu'à un point ».
- `@cacher("…")` avec un nom inconnu ne dit rien (`executor.ts:886-900`) : une faute de frappe sur le nom d'un instrument passe en silence.
