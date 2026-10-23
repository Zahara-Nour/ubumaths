---
couvre:
  - 'src/lib/constructions-v2/**'
  - 'src/routes/(protected)/constructions/**'
  - 'src/routes/(public)/construction-demo/**'
  - 'src/routes/api/constructions/**'
  - 'src/routes/api/construction-demo-scripts/**'
  - src/lib/server/constructions-access.ts
---

# Constructions animées (`constructions-v2`)

Un script du DSL de géométrie, enrichi de **directives** `@…` et de **décorateurs** de chorégraphie,
joué pas à pas avec des instruments virtuels (règle, compas, équerre, rapporteur, crayon) : le
lecteur montre _comment_ on construit une figure, pas seulement la figure.

Vue d'ensemble du moteur : [README.md](README.md). Langage : [dsl-builtins.md](dsl-builtins.md).

> Vérifié contre le code le 2026-10-23. Les numéros de ligne sont ceux de ce jour : relire le code
> avant de s'y fier. Les journaux `docs/archive/wip/constructions-v2/` et
> `docs/archive/wip/v1-choreographies*-progress.md` sont **périmés** sur plusieurs points (§ 9).

---

## 1. Le parcours d'un script

```
texte DSL ─parseDsl─▶ programme ─createStepper─▶ stepper (figure réelle)
                                      │
ConstructionExecutor.load ─▶ pré-simulation sur un stepper temporaire
   = plan (1 entrée par instruction, ou N sous-étapes par instruction chorégraphiée)
   + durées + phases (déplacement / tracé / pause)
                                      │
Timeline (requestAnimationFrame) ─onStepChange(i)─▶ ConstructionPlayer
   rejoue executor.step() de 0 à i ─▶ ConstructionCanvas (GeometryCanvas + calques animés + instruments)
```

| Étape                 | Où                                                                                                                                                                                               | Ce qui s'y passe                                                                                                                                                                                                                                                                                |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lecture               | `geometry-core/dsl/tokenizer.ts:181` (jeton `AT_DIRECTIVE`), `parser.ts:655` (`parseDirective`), `parser.ts:389` (`parseTrailingDecorators`)                                                     | Une ligne `@nom(args)` est une **directive** (`DslDirective`) ; des `@nom` / `+nom` / `-nom` après une affectation sont ses **décorateurs** (`DslAssignment.decorators`). Un décorateur avec parenthèses est une erreur de lecture (`parser.ts:395`).                                           |
| Exécution d'une ligne | `geometry-core/dsl/interpreter.ts:1194` (`createStepper`), `:465` (directive → `onDirective`)                                                                                                    | Le stepper exécute une instruction de premier niveau par `step()`. Les directives n'ont d'effet que par le rappel fourni (ici `handleDirective`).                                                                                                                                               |
| Chargement            | `core/executor.ts:194` `load()`                                                                                                                                                                  | Crée le stepper réel, puis `calculateStepDurations()` (`:1011`).                                                                                                                                                                                                                                |
| Pré-simulation        | `core/executor.ts:1011-1178`                                                                                                                                                                     | Joue tout le script sur un stepper temporaire. Directive → 1 entrée. Affectation décorée → `resolveDecorators` + `lookupVoie`, puis la chorégraphie (`invokeChoreographyOn`, `:434`) → N entrées (`computeSubStepTiming`, `:1188`). Sinon → 1 entrée (`computeLegacyStatementTiming`, `:1312`). |
| Erreur à l'exécution  | `core/executor.ts:1158-1174`                                                                                                                                                                     | Les entrées de l'instruction fautive sont retirées, `loadError` = `{message, line, stepIndex, details}`, la boucle s'arrête : le lecteur garde la figure partielle.                                                                                                                             |
| Plan                  | `core/executor.ts:56` (`PlanEntry`)                                                                                                                                                              | `plan`, `stepDurations` et les phases sont trois tableaux parallèles ; **une entrée = une position du curseur**. `totalSteps = plan.length`.                                                                                                                                                    |
| Pas                   | `core/executor.ts:230` `step()`                                                                                                                                                                  | Applique la visibilité en attente, cache les instruments du pas précédent, avance. En tête d'instruction : `stepper.step()` puis, si chorégraphiée, rejoue la chorégraphie sur la figure réelle (mêmes identifiants qu'à la pré-simulation : les compteurs de `Figure` sont déterministes).     |
| Pas « hérité »        | `core/executor.ts:766` `autoShowInstruments()`                                                                                                                                                   | Sans chorégraphie, l'animation est déduite des éléments créés (§ 4).                                                                                                                                                                                                                            |
| Sous-étape            | `core/executor.ts:340` `applySubStepToAnimationState()`                                                                                                                                          | Révèle les éléments à animer, place l'instrument principal (`instrumentTarget`) et le secondaire.                                                                                                                                                                                               |
| Visibilité finale     | `core/executor.ts:309-318`, `:323` ; `core/choreographies/visibility.ts:51`                                                                                                                      | La dernière sous-étape programme `applyFinalVisibility`, appliquée **au début du pas suivant** (ou par un `step()` de plus en fin de lecture).                                                                                                                                                  |
| Horloge               | `core/timeline.svelte.ts:50` `Timeline`                                                                                                                                                          | JS simple, **sans `$state`** (`:4`) : `load(durées)`, `play`, `pause`, `stepForward`, `playOneStep`, `stepBackward`, `seekToStep`, `scrubByProgress`, vitesse 0,25 à 4 (× ou ÷ 1,5).                                                                                                            |
| Lecteur               | `components/ConstructionPlayer.svelte` : exécuteur `:112`, `handleStepChange` `:160`, `handleTimelineUpdate` `:202`, `handleScrub` `:242`, `loadScript` `:267`, `$effect` de rechargement `:306` | À chaque changement de pas : `executor.reset()` puis `step()` × (i + 1), copie de l'état d'animation dans des `$state`. Arrivée en fin de lecture → un `step()` de plus pour vider la visibilité en attente. Props `seekToEnd`, `autoPlay`, `interactive`.                                      |
| Toile                 | `components/ConstructionCanvas.svelte` : `hiddenElementIds` `:79`, `GeometryCanvas` `:313`, tracés partiels `:324`, points `:379`, droites `:505`, instruments `:569`                            | Les éléments en cours d'animation sont masqués dans `GeometryCanvas` et redessinés partiellement au-dessus (`core/render-helpers.ts`).                                                                                                                                                          |
| Éditeur               | `components/ScriptEditor.svelte`                                                                                                                                                                 | CodeMirror 6 chargé à la demande (repli `textarea`), validation `parseDsl` après 300 ms (`:97`), aperçu `ConstructionPlayer` placé à la fin.                                                                                                                                                    |

### Phases et durées d'une entrée

Une entrée se découpe en **déplacement → levée du compas → tracé → pose du compas → pause** ; les
bornes sont des fractions de la durée (`movePhaseEnd`, `drawPhaseStart`, `drawPhaseEnd`,
`pausePhaseStart`). Constantes : `constants.ts`.

| Quantité                        | Règle (code : `executor.ts:1188-1305` et `:1312-1495`)                                                                                                                                                                                                     |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Échelle des durées              | `PPU = 40` px par unité, codé en dur (`executor.ts:1203`, `:1322`), indépendant du zoom                                                                                                                                                                    |
| Tracé                           | longueur (unités) × 40 × `MS_PER_PIXEL` (8) ÷ vitesse, borné à [`MIN_STEP_DURATION` 1000, `MAX_STEP_DURATION` 5000] ms ; 0 pour `compass-measure`                                                                                                          |
| Déplacement d'instrument        | max(600, croisière (+ `INSTRUMENT_RAMP_MS` 300 si > 300)) ; croisière = max(distance, rotation × `MS_PER_DEGREE` 20) ÷ (vitesse × `INSTRUMENT_MOVE_SPEED_FACTOR` 3)                                                                                        |
| Compas                          | + `COMPASS_RAISE_MS` 400 avant le tracé, + `COMPASS_LOWER_MS` 400 après                                                                                                                                                                                    |
| Pause automatique               | + `AUTO_PAUSE_BETWEEN_STEPS` 500 ms après tout tracé ou fondu ; sous-étape chorégraphiée : **pause de lecture** `readingPauseMs` = consigne × `READING_MS_PER_CHAR` 60 ms, bornée à [500, `MAX_READING_PAUSE` 4000], non divisée par la vitesse `@vitesse` |
| Fondu (points, droites)         | `DEFAULT_STEP_DURATION` 500 ÷ vitesse, borné à [100, 5000], + la pause ci-dessus ; en sous-étape, le fondu finit à `drawPhaseEnd` et l'élément reste immobile pendant la pause (`fadeInProgress`, `render-helpers.ts`)                                     |
| Directive                       | 0 ms, sauf `@pause(ms)` (défaut `DEFAULT_PAUSE_DURATION` 300)                                                                                                                                                                                              |
| Position de départ d'instrument | coin (−8, 6) en unités math (`executor.ts:757-760`, `:1030-1033`)                                                                                                                                                                                          |

## 2. Directives `@…` (une ligne à elles seules)

Traitées par `handleDirective` (`core/executor.ts:673-735`).
Chaque directive occupe **une entrée du curseur** (0 ms sauf `@pause`).

| Directive                                    | Effet                                                                                                                                                     |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@instrument("regle", x=…, y=…, rotation=…)` | Montre l'instrument et le place (unités math, rotation en degrés). Noms : `regle`, `compas`, `rapporteur`, `equerre`, `crayon` (`executor.ts:80-86`).     |
| `@instruction("texte")`                      | Consigne affichée sous la toile (`ConstructionPlayer.svelte:381-402`) jusqu'à la suivante. La consigne de la sous-étape en cours s'affiche dessous (§ 4). |
| `@vitesse(f)`                                | Multiplie les vitesses par `f > 0` à partir de cette ligne (lue à la pré-simulation seulement, `executor.ts:1015-1019`).                                  |
| `@pause(ms)`                                 | Entrée vide de `ms` millisecondes (300 par défaut).                                                                                                       |
| `@cacher` / `@cacher("compas")`              | Cache tous les instruments / un instrument.                                                                                                               |
| `@montrer("compas")`                         | Montre un instrument.                                                                                                                                     |

Un nom de directive ou d'instrument inconnu est **ignoré sans message** (pas de `default` dans le
`switch`). Masquer un point se fait avec les builtins `masque(…)` / `montre(…)`, pas avec ces
directives.

## 3. Décorateurs de chorégraphie (suffixe d'affectation)

`d = mediatrice(A, B) @euclide @complet -arcs` — résolus par `resolveDecorators`
(`core/choreographies/resolve.ts:65`), voie choisie par `lookupVoie` (`resolve.ts:207`).

| Catégorie    | Valeurs                                                                                                           | Défaut                 | Règle                                                                                               |
| ------------ | ----------------------------------------------------------------------------------------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------- |
| Contrainte   | `@direct`, `@euclide`, `@equerre`, `@mesure` (`choreographies/types.ts:18-24`)                                    | `@direct`              | Une seule. Contrainte sans voie déclarée pour ce builtin → erreur. `@direct` = pas de chorégraphie. |
| Visibilité   | `@squelette`, `@epure`, `@complet`                                                                                | `@squelette`           | Une seule.                                                                                          |
| Méthode      | tout autre `@nom` : un `id` de voie (`@arcs_egaux`, `@rayon_libre`…)                                              | la voie `defaut: true` | Une seule ; doit exister pour (builtin, contrainte), sinon erreur avec la liste des méthodes.       |
| Modificateur | `+arcs`/`-arcs`, `+traces`/`-traces`, `+marqueurs`/`-marqueurs`, `+points_aux`/`-points_aux` (`resolve.ts:33-38`) | aucun                  | Étiquettes `arc`, `segment-trace`, `marker`, `auxiliary-point` ; le dernier l'emporte.              |

Erreurs (remontées en `DslRuntimeError` avec la ligne, `executor.ts:1046-1078`) : décorateur sur
une affectation qui n'est pas un appel ; builtin hors `CHOREOGRAPHED_BUILTINS`
(`registry.ts:66`) ; deux contraintes, deux visibilités ou deux méthodes ; modificateur inconnu.
Une visibilité **sans** contrainte (`d = mediatrice(A, B) @complet`) est acceptée mais reste sans
effet : contrainte `direct`, donc pas de voie, donc pas de passe de visibilité.

### Visibilité finale (`visibility.ts:51-100`)

Chaque chorégraphie classe ce qu'elle crée (`ChoreographyProduced`, `types.ts:131`) :
`principal`, `charnieres`, `traces` (+ `traceTags`), `hiddenSupport`.

| Élément produit       | `@epure`                               | `@squelette` | `@complet`                       |
| --------------------- | -------------------------------------- | ------------ | -------------------------------- |
| principal             | visible                                | visible      | visible                          |
| charnières            | masquées                               | visibles     | visibles                         |
| traces étiquetées     | masquées                               | masquées     | visibles, pointillé, opacité 0,4 |
| traces sans étiquette | masquées                               | masquées     | visibles, pointillé, opacité 0,4 |
| `hiddenSupport`       | toujours masqué, quel que soit le mode |

Les modificateurs ajoutent ou retirent une étiquette à l'ensemble visible du mode de base
(`@squelette +marqueurs` montre les marqueurs d'angle droit).

## 4. Chorégraphies

Registre : `core/choreographies/registry.ts:25-63` (builtin → contrainte → liste de voies).
Sous-étapes (`SubStep`, `types.ts:73`), abrégées : **CM** `compass-measure` (déplacement sans
tracé), **CD** `compass-draw`, **RT** `ruler-trace`, **PF** `point-fade-in`, **LF** `line-fade-in`.
Chaque sous-étape peut porter une consigne (`SubStep.instruction`) : le lecteur l'affiche sous la
consigne `@instruction` de l'auteur, précédée de « ↳ », le temps de la sous-étape
(`ConstructionPlayer.svelte:157`, `:387-390`). Si l'exécution s'est arrêtée (`loadError`), le
**dernier pas** de la frise ajoute dessous la ligne « ⚠ Arrêt à la ligne N : <message> »
(`executionStop`, `:118-133`) : l'instruction fautive n'a aucune sous-étape, la consigne du dernier
pas joué reste ; curseur reculé → la ligne disparaît.
Les trois visibilités et les modificateurs valent pour **toutes** les voies (passe commune).
**Formes `parallele(P, d)` / `perpendiculaire(P, d)`** (d droite, segment ou demi-droite) :
l'exécuteur les ramène à `(P, A, B)` avec les deux points qui portent d (`expandLineArgument`,
`executor.ts`), dans l'ordre du langage ; toutes les voies jouent alors à l'identique. Un point de d
**caché** sur lequel la voie pose un instrument (compas en A et B de `parallelogramme`, |PA| de
`perpendiculaire @arcs_egaux`, coin de l'équerre de `perpendiculaire @pose_equerre`, donc aussi
`parallele @equerre @double_perpendiculaire`) apparaît d'abord en fondu (« On choisit un point de la
droite », `choreographies/reveal-points.ts`), classé `auxiliary-point` (visible en `@complet`
seulement). Les voies qui n'utilisent que la direction de d n'ajoutent rien. Le critère est la
visibilité : un point masqué par `masque(A)` dans la forme `(P, A, B)` est révélé de la même façon.
**Consignes de sous-étape : vrais noms** (`choreographies/names.ts`). Toute lettre qui désigne un
argument du script est remplacée par le nom affiché sur la figure : `parallele(M, C, D)` → « Compas
en C, on prend la mesure |CD| » ; forme `(P, d)` → « parallèle à d » (nom de d transmis par
`args.lineName`, rempli par `expandLineArgument`, qui suit `ctx.sub`). Argument caché, sans
étiquette ou au nom masqué → tournure neutre (« le point choisi », « le point de passage », « le
sommet », « la droite ») ; un angle n'est nommé que si son nom s'affiche (`showLabel`), sinon
« l'angle ». Les champs `description` des voies (doc) gardent A, B, P. Étiquettes écrites brutes
(`A_1` tel quel).
**Points auxiliaires nommés** (`ctx.auxLabel`, `createAuxLabeler` de `names.ts`). Chaque point
auxiliaire que cite une consigne (Q, R, C\*, D\*, A\*, B\*, A′, B′, A″, B″, M, O, le P de
`bissectrice @arcs_egaux`) et la droite `e` reçoivent cette lettre comme **étiquette provisoire**
(`Figure.setProvisionalLabel`) : elle s'affiche tant que l'élément est visible (charnières en
`@squelette`/`@complet`, autres points en `@complet`, rien en `@epure`). Ordre de choix du nom :
(1) le nom que le script donne lui-même à ce point plus loin — `O = centre(c)` (le O de
`cercle_circonscrit` est le centre du builtin), `D = cote(be, 2)` (A″, B″ de `transporte` sont les
points de β) : l'interpréteur remplace l'étiquette provisoire (`labelElement`), l'exécuteur le
détecte en fin de pré-passe (`_auxRenamed`) et refait la pré-passe avec ce nom (`_auxScriptNamed`) ;
(2) la lettre si elle est libre ; (3) sinon un prime de plus (Q → Q′ → Q″), la consigne écrivant la
même. Sont pris les étiquettes de la figure, les noms affectés par le script même plus loin
(`declaredNames` de `executor.ts`, boucles et `si` compris ; pas `Q[i]`, qui ne pose pas
d'étiquette) et les noms déjà rendus pendant l'instruction (sous-chorégraphies comprises). Primes
typographiques (′ ″ ‴), sur la figure comme dans les consignes. Auxiliaires qu'aucune consigne ne
nomme (pied F de l'équerre, croisements des médiatrices) : sans étiquette.
Nombres vérifiés par `core/__tests__/choreographies-integration.test.ts` (« int. ») et
`transporte-choreography.test.ts`.

| Builtin              | Contrainte | Voie (\* = défaut)          | Sous-étapes | Séquence                                                                                                            | Étiquettes de traces                         | État                                                             |
| -------------------- | ---------- | --------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------- |
| `mediatrice`         | `@euclide` | `arcs_egaux`\* (r = 0,7·AB) | 6           | CD ×4 (petits arcs), PF (I₁, I₂), RT                                                                                | `arc`                                        | livrée (int. :136)                                               |
| `mediatrice`         | `@euclide` | `cercles_rayon_ab` (r = AB) | 6           | idem                                                                                                                | `arc`                                        | livrée (int. :220)                                               |
| `bissectrice`        | `@euclide` | `arcs_egaux`\*              | 7           | CD ×2 en V, PF (A′, B′), CD ×2, PF (P), RT                                                                          | `arc`, `auxiliary-point`                     | livrée ; accepte `bissectrice(α)` (int. :1155)                   |
| `bissectrice`        | `@euclide` | `arc_milieu`                | 5           | CD ×2, PF (A′, B′), PF (M), RT                                                                                      | `arc`, `auxiliary-point`                     | livrée (int. :334)                                               |
| `parallele`          | `@euclide` | `parallelogramme`\* (I.31)  | 6           | CM \|AB\|, CD en P, CM \|PA\|, CD en B, PF (Q), RT                                                                  | `arc`                                        | livrée (int. :377)                                               |
| `parallele`          | `@euclide` | `double_perpendiculaire`    | 16          | perpendiculaire `rayon_libre` (7), LF (e), CD ×2 en P, PF (C\*, D\*), CM (ouverture plus grande), CD ×2, PF (R), RT | `arc`, `auxiliary-point`, `segment-trace`    | **livrée, par `ctx.sub`** (int. :911) ; `P ∈ (AB)` → erreur      |
| `parallele`          | `@equerre` | `pose_equerre`\*            | 6           | pose équerre, pose règle-glissière, glissement, RT, échange équerre → règle, RT                                     | `segment-trace`, `marker`, `arc`             | livrée (int. :708)                                               |
| `parallele`          | `@equerre` | `double_perpendiculaire`    | 10          | perpendiculaire `pose_equerre` (5), LF (e), pose équerre sur e (angle droit en P), RT, échange → règle, RT          | `segment-trace`, `marker`, `auxiliary-point` | **livrée, par `ctx.sub`** (int. :1004) ; `P ∈ (AB)` → erreur     |
| `perpendiculaire`    | `@euclide` | `rayon_libre`\*             | 7           | CD ×2 en P, PF (A\*, B\*), CD ×2, PF (Q), RT                                                                        | `arc`, `auxiliary-point`, `segment-trace`    | livrée (int. :578)                                               |
| `perpendiculaire`    | `@euclide` | `arcs_egaux`                | 7           | CM \|PA\|, CD, PF (B′), CD ×2, PF (Q), RT                                                                           | idem                                         | livrée (int. :622)                                               |
| `perpendiculaire`    | `@equerre` | `pose_equerre`\*            | 5           | pose équerre, glissement jusqu'au pied F, RT, échange → règle, RT                                                   | idem                                         | livrée (int. :667)                                               |
| `cercle_circonscrit` | `@euclide` | `mediatrices`\*             | 17          | médiatrice(A,B) (6), LF, médiatrice(B,C) (6), LF, PF (O), CM \|OA\|, CD (cercle)                                    | reprises des médiatrices                     | **livrée, par `ctx.sub`** (int. :448)                            |
| `transporte`         | `@euclide` | `compas_report`\* (I.23)    | 7           | CD ×2, PF (A′, B′, A″), CM \|A′B′\|, CD, PF (B″), RT                                                                | `arc`                                        | livrée, 4 modes de direction (`transporte-choreography.test.ts`) |
| `bissectrice`        | `@mesure`  | `rapporteur`\*              | 4           | CM rapporteur (centre en V, 0 sur [VA)), CM crayon en face de la moitié (rapporteur en second), PF (P), RT          | `marker` (deux angles égaux)                 | livrée (`bissectrice-mesure.test.ts`) ; côtés confondus → erreur |
| `milieu`             | `@mesure`  | `regle_graduee`\*           | 3           | CM règle (0 sur l'extrémité de gauche), CM crayon à la graduation (règle en second), PF (I)                         | `marker` (codage AI = IB)                    | livrée (`milieu-mesure.test.ts`) ; > 15 cm ou confondus → erreur |

**`ctx.sub` est implémenté** (`executor.ts:484-503`, `buildSubChoreographyFn`) : la chorégraphie
parente crée elle-même l'élément principal du sous-appel puis demande la voie ; une voie inconnue
rend un résultat vide. `cercle_circonscrit` (`cercle_circonscrit.ts:69-70`) et les deux voies
`parallele @double_perpendiculaire` (`parallele.ts:981`, `:1200`) s'en servent ; ces dernières
reclassent la charnière de la sous-perpendiculaire en point auxiliaire et font de `e` leur charnière.
Une chorégraphie refuse un cas dégénéré en levant `ChoreographyError` (`choreographies/types.ts:170`) :
l'exécuteur la convertit en `DslRuntimeError` à la ligne de l'instruction (`executor.ts:454-463`),
donc en `loadError`, sans animation (seul usage : `P ∈ (AB)` pour la double perpendiculaire,
`parallele.ts:908`).

**`milieu @mesure`** (`choreographies/milieu.ts`) : `milieu(A, B)` ou `milieu(s)` (le segment est
ramené à ses extrémités par `expandSegmentArgument`, `executor.ts`). Consignes avec la valeur lue et
le calcul : « On place le 0 de la règle sur A et on lit AB = 6,4 cm », « 6,4 ÷ 2 = 3,2 : on repère
la graduation 3,2 », « On marque I à 3,2 cm de A ». Lecture arrondie au millimètre, moitié calculée
sur la valeur lue (6,3 ÷ 2 = 3,15), virgule décimale, pas de « ,0 » ; I est le milieu exact. Le 0 se
pose sur l'extrémité la plus à gauche (la plus basse si vertical). Lecture nulle → « A et B sont
confondus » ; lecture > 15 cm (longueur de la règle) → erreur. Codage AI = IB : deux `segmentMark`
étiquetés `marker`. Le codage n'est posé que si un segment visible joint A et B (`segment(A, B)` ou `segment(B, A)` tracé, ou `milieu(s)`) : sans segment, on ne code rien.

**`bissectrice @mesure`** (`choreographies/bissectrice.ts`, `buildRapporteur`) : `bissectrice(A, V, B)`
ou `bissectrice(α)`. Consignes : « On place le centre du rapporteur sur V, le 0 sur [VA), et on lit
l’angle AVB = 74° », « 74 ÷ 2 = 37 : on repère la graduation 37° », « On marque le repère P en face
de 37° », « Règle de V à P : on trace la bissectrice ». Lecture arrondie au degré, moitié sur la
valeur lue (75 ÷ 2 = 37,5) ; le repère P (point auxiliaire nommé, `labelAux`, charnière) est sur la
bissectrice exacte, à `REPERE_DISTANCE` de V (rayon du rapporteur + 0,3). Le corps du rapporteur
(`Protractor.svelte`) est du côté trigonométrique de sa base : si B est dans le sens horaire de A, la
base est retournée de 180° et le 0 de l’échelle intérieure tombe sur [VA). Même droite tracée qu’en
`@euclide` (`buildRulerTraceSubStep`). Codage : deux `angle` `arcs2` (AVP, PVB) étiquetés `marker`.
Lecture 0° → « Les deux côtés sont confondus » ; A ou B confondu avec V et angle plat sont refusés
par le builtin avant la chorégraphie.

Aucune voie `@mesure` pour un autre builtin que `milieu` et `bissectrice`, ni de voie pour un builtin hors des sept ci-dessus.
Le repli « hérité » s'applique aussi quand une chorégraphie rend 0 sous-étape
(`executor.ts:1140-1157`).

### Animation héritée (instruction sans chorégraphie)

| Élément créé                                                    | Animation                                                       | Instrument                                         |
| --------------------------------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------- |
| `segment`                                                       | tracé progressif depuis le 1ᵉʳ point                            | règle (au 1ᵉʳ point, orientée vers le 2ᵉ) + crayon |
| `circleByRadius`, `circleByPoint`, `arcByAngles`, `arcByPoints` | tracé progressif                                                | compas (ouverture, levée, rotation)                |
| `line`, `ray`                                                   | fondu (droite infinie)                                          | aucun                                              |
| point                                                           | fondu + rebond (+ projections sur les axes pour un point libre) | aucun                                              |
| tout le reste (polygone, vecteur, courbe…)                      | apparaît d'un coup                                              | aucun                                              |

Liste des types tracés : `DRAWABLE_TYPES` (`types.ts:71`).

## 5. Instruments

Composants `instruments/components/*.svelte`, dessinés dans la toile (`ConstructionCanvas.svelte:569-693`).
L'état (`InstrumentState`, `types.ts:9`) est en **unités math** ; la toile convertit.

| Composant                                | Type         | Nom DSL      | Taille                                                                                                                                                                       |
| ---------------------------------------- | ------------ | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Ruler.svelte`                           | `ruler`      | `regle`      | suit `pixelsPerUnit` : largeur `57/40` ≈ 1,425 u, longueur `length` = 15 u (1 graduation majeure = 1 u, 10 subdivisions)                                                     |
| `SetSquare.svelte`                       | `setSquare`  | `equerre`    | suit `pixelsPerUnit` : côtés `131/40` ≈ 3,275 u et `223/40` ≈ 5,575 u                                                                                                        |
| `Protractor.svelte`                      | `protractor` | `rapporteur` | suit `pixelsPerUnit` : rayon `156/40` = 3,9 u ; police des graduations fixe (10 et 9 px)                                                                                     |
| `Compass.svelte`, `CompassRaised.svelte` | `compass`    | `compas`     | taille fixe en px (`LON = 185`) ; ouverture = `compassRadius × pixelsPerUnit` (`ConstructionCanvas.svelte:284`) ; `CompassRaised` pendant levée/pose (inclinaison `rotateX`) |
| `Pencil.svelte`                          | `pencil`     | `crayon`     | taille fixe en px (`LON = 97`)                                                                                                                                               |

`pixelsPerUnit` de la toile part de `INITIAL_PPU = 40` (`ConstructionCanvas.svelte:60`) et suit le
zoom de `GeometryCanvas`. Placement automatique : `instruments/positioning.ts`
(`rulerPosition`, `compassPosition`, `applyPosition`). Dans les voies `@equerre`, l'équerre et la
règle se déplacent par des sous-étapes `compass-measure` ; `secondaryInstrument` garde un second
instrument visible (crayon placé au début du segment, `executor.ts:404-421`). Le crayon reste caché
pendant le déplacement d'un autre instrument et n'apparaît qu'au début du tracé, sauf quand il est
lui-même l'instrument qui se déplace (`milieu @mesure`) : règle commune dans `visibleInstruments`
(`core/render-helpers.ts`), lue par `ConstructionCanvas.svelte`. Le rapporteur n'est jamais animé
automatiquement : seulement `@instrument("rapporteur", …)`.

Les instruments de l'ancien module (`src/lib/constructions/components/instruments/`) en sont une
copie distincte, utilisée par le tableau blanc (§ 9).

## 6. Pages, API, stockage

### Tables

| Table                       | Colonnes utiles                                                                                                                                                                                                                                                                                                                                                           | RLS (migrations)                                                                                                                                                                                         |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `constructions`             | `title`, `description`, `format` (`'json'` hérité \| `'dsl'`, défaut `'json'`), `dsl_script`, `script` jsonb NOT NULL (`{}` en DSL), `is_public` (défaut `false`), `author_id` (FK `profiles`, `ON DELETE SET NULL`). Contrainte `constructions_dsl_check` : `dsl` ⇒ `dsl_script` non nul. Colonne `tags` supprimée (`20260908180000`) : étiquettes dans `resource_tags`. | lecture : les siennes (baseline) + `is_public` pour tout compte **connecté** (`20261015090600`) ; création, modification : les siennes, **prof ou admin** (`20261022200000`) ; suppression : les siennes |
| `construction_demo_scripts` | `author_id` (FK, `ON DELETE CASCADE`), `name`, `dsl_script` ; unique (`author_id`, `name`)                                                                                                                                                                                                                                                                                | tout : les siens, **prof ou admin** (`20261023150000`)                                                                                                                                                   |

### Pages

| Route                       | Accès (garde)                                        | Contenu                                                                                                                                                                   |
| --------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/constructions`            | tout compte connecté (layout `(protected)`)          | les siennes + les publiques ; liens « nouvelle », « conversion », « modifier » : prof ou admin seuls                                                                      |
| `/constructions/new`        | prof ou admin (`requireRoles`)                       | `ScriptEditor` ; `POST /api/constructions` en `format: 'dsl'`                                                                                                             |
| `/constructions/[id]`       | auteur, ou construction publique (`+page.server.ts`) | `ConstructionPlayer` si `dsl_script` ; sinon message « ancien format JSON qui n'est plus supporté »                                                                       |
| `/constructions/[id]/edit`  | prof ou admin, auteur                                | édition DSL ; pas d'édition pour le format JSON                                                                                                                           |
| `/constructions/conversion` | `teacher`, `admin` (`requireRoles`)                  | XML InstrumenPoche → JSON (ancien module) **et** → DSL (`convertXmlToDsl`) ; enregistre le DSL s'il existe, sinon le JSON                                                 |
| `/construction-demo`        | publique                                             | `ScriptEditor` interactif ; exemples XML lus dans `extern/instrumenpoche-main/devServer/fixtures` (absent → aucun) ; scripts sauvegardés via l'API (anonyme : 401 ignoré) |

Aucun lien `href="/constructions"` dans `src/` hors de ces routes : on y arrive par l'adresse.

### API

| Point d'entrée                                       | Garde                                  | Validation (Zod)                                                                                                                                     |
| ---------------------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/constructions`                             | `requireAuth` (tout rôle)              | `page`, `limit` ≤ 100, `onlyMine` ; filtre `author_id = moi OU is_public`                                                                            |
| `POST /api/constructions`                            | `requireRoles` prof ou admin           | `title` ≤ 200, `description` ≤ 2000, `format`, `script` (schéma JSON de l'**ancien** module) ou `dsl_script` ≤ 50 000, `is_public`, `tags` ≤ 10 × 50 |
| `GET /api/constructions/[id]`                        | `requireAuth` ; auteur ou publique     | UUID                                                                                                                                                 |
| `PUT /api/constructions/[id]`                        | prof ou admin ; auteur (vérifié avant) | `title`, `description`, `script`, `dsl_script`, `is_public` — **pas `format`**                                                                       |
| `DELETE /api/constructions/[id]`                     | `requireAuth` ; auteur (vérifié avant) | UUID ; `.select()` : zéro ligne → 404                                                                                                                |
| `POST /api/constructions/convert`                    | `teacher`, `admin`                     | `xml` ≤ 5 Mo ; ancien convertisseur → JSON ; 1000 étapes au plus                                                                                     |
| `GET`/`POST`/`DELETE /api/construction-demo-scripts` | `requireRoles` prof ou admin           | `name` ≤ 100, `dsl_script` ≤ 100 000 ; `upsert` sur (`author_id`, `name`) ; `DELETE ?id=` UUID, `.select()` : zéro ligne → 404                       |

Qui écrit : `CONSTRUCTION_AUTHOR_ROLES` et `canAuthorConstructions` (`src/lib/server/constructions-access.ts`),
prof et admin (décision de David du 2026-10-22), et aussi pour les scripts de démo (2026-10-23). La base tient la même règle (migrations
`20261022200000`, `20261023150000`) : les gardes de l'API et des pages ne font que répondre 403 et masquer les boutons.

## 7. Convertisseur XML InstrumenPoche → DSL

`converter.ts:105` `convertXmlToDsl(xml)` (DOMParser au navigateur, `xml2js` côté Node). Gère
points (création, nom, translation ; « masquer » / « montrer » → builtins `masque(A)` / `montre(A)`, ignoré avec un avertissement pour un point
jamais créé), crayon (segments), compas (écart, tracé d'arcs), règle,
équerre, texte → `@instruction`, tempo → `@pause` (≥ 200 ms, pas deux de suite), angle droit.
Avertissements pour : tracé à main levée (`:324`), compas `lever/coucher/retourner/rotation`
(`:403`), marque de longueur (`:452`), marque de segment (`:479`), objet inconnu (`:492`).

## 8. Tests

`pnpm test:server src/lib/constructions-v2/` le 2026-10-23 : **15 fichiers, 427 réussis,
21 ignorés (448)**, 1,4 s. Les 21 ignorés : les trois `describe.skipIf(!hasFixtures)` de
`converter.test.ts` (`:274`, `:330`, `:369`), faute du dossier `extern/instrumenpoche-main`.

| Fichier (sous `constructions-v2`)                   | Cas (≈) | Couvre                                                                                                                                                                                                                                                            |
| --------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `core/__tests__/choreographies-integration.test.ts` | 130     | décorateurs dans l'exécuteur, nombre et suite des sous-étapes de chaque voie, étiquettes, `double_perpendiculaire` (géométrie, 3 visibilités, `P ∈ (AB)`), `bissectrice(α)`, `transporte`, formes `(P, d)`                                                        |
| `core/__tests__/choreographies-auxiliaires.test.ts` | 33      | points auxiliaires : lettre de la consigne = étiquette de la figure (9 voies), visibilité selon le mode, primes en cas de collision (script avant / après, deux et trois constructions, sous-chorégraphies), nom donné par le script (`centre(c)`, `cote(be, 2)`) |
| `core/__tests__/transporte-choreography.test.ts`    | 7       | 4 modes de direction, angle plat, angle aigu, mesure conservée                                                                                                                                                                                                    |
| `core/__tests__/choreographies-resolve.test.ts`     | 23      | `resolveDecorators` (nominal, erreurs, mode direct), `lookupVoie`                                                                                                                                                                                                 |
| `core/__tests__/visibility.test.ts`                 | 10      | `applyFinalVisibility` pure, branchement dans l'exécuteur, modificateurs                                                                                                                                                                                          |
| `core/__tests__/executor.test.ts`                   | 16      | chargement, directives, durées, déplacement depuis la dernière position, `reset`                                                                                                                                                                                  |
| `core/__tests__/timeline.test.ts`                   | 18      | navigation, défilement, vitesse, rappels, formatage                                                                                                                                                                                                               |
| `core/__tests__/animator.test.ts`                   | 23      | `partialSegment`, `partialCircle`, `partialArc`, assouplissements                                                                                                                                                                                                 |
| `core/__tests__/render-helpers.test.ts`             | 15      | tracés SVG partiels, pointe du crayon                                                                                                                                                                                                                             |
| `core/__tests__/converter.test.ts`                  | 35      | conversion XML → DSL, point masqué / montré (dont 21 sur fixtures, ignorés)                                                                                                                                                                                       |
| `instruments/__tests__/positioning.test.ts`         | 8       | `rulerPosition`, `compassPosition`, `applyPosition`                                                                                                                                                                                                               |

Ailleurs : `geometry-core/dsl/__tests__/directives.test.ts` (21), `parser-decorators.test.ts` (22),
`stepper.test.ts` (19) ; `components/geometry/__tests__/GeometryCanvas.theme.svelte.test.ts`
(instruments en traits noirs, 2) ; `routes/(public)/construction-demo/__tests__/page.server.test.ts`
(1) ; `tests/integration/lectures-ouvertes-fermees.test.ts` (lecture des constructions publiques).
Composant : `components/__tests__/ConstructionPlayer-consignes.svelte.test.ts` (consignes de
l'auteur et des sous-étapes, 5, `pnpm test:client`) et
`ConstructionPlayer-double-perpendiculaire.svelte.test.ts` (les deux voies jouées jusqu'au bout,
`P ∈ (AB)` interrompu, 3) et `ConstructionPlayer-arret-execution.svelte.test.ts` (ligne
d'arrêt au dernier pas seulement, frise vide, script corrigé, 6) et
`ConstructionPlayer-points-auxiliaires.svelte.test.ts` (lettres Q, Q′, e et R écrites sur la figure, 3).
**Aucun** test de composant pour
`ConstructionCanvas` ni `ScriptEditor`.

## 9. Écarts et reste à faire

Faits relevés dans le code le 2026-10-22.

### Fonctions manquantes

| Point                                                                                              | Où                                          |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Contrainte `@mesure` : deux voies (`milieu`, `bissectrice`) ; `mediatrice @mesure` prévue          | `choreographies/types.ts:18`, `registry.ts` |
| Sept builtins chorégraphiés seulement (`cercle`, `triangle_equilateral`… refusent les décorateurs) | `registry.ts`                               |
| Polygones, vecteurs, courbes apparaissent d'un coup (pas de tracé ni d'instrument)                 | `types.ts:83`                               |

### Comportements connus

| Point                                                                                                                                                                                                                                                                                                                   | Où                                                                  |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| La visibilité finale d'une instruction chorégraphiée s'applique au pas suivant ; le lecteur ne la force qu'en fin de lecture                                                                                                                                                                                            | `executor.ts:235`, `:309-318` ; `ConstructionPlayer.svelte:202-215` |
| Chaque changement de pas rejoue tout depuis le début, et `reset()` refait la pré-simulation entière : coût quadratique sur un long script                                                                                                                                                                               | `ConstructionPlayer.svelte:160-165` ; `executor.ts:576`             |
| `PPU = 40` codé deux fois dans l'exécuteur, en double de `INITIAL_PPU`                                                                                                                                                                                                                                                  | `executor.ts:1203`, `:1322` ; `ConstructionCanvas.svelte:60`        |
| Le genre `compass-measure` sert aussi de « déplacement sans tracé » de l'équerre et de la règle                                                                                                                                                                                                                         | `perpendiculaire.ts:973-1245`, `parallele.ts:437-811`, `:1200`      |
| 3 constructions en prod (« Ajouter 19 », « Soustraire 99 », « Axes de symétrie… carré ») contiennent des `@cacher("T_3")`, `@cacher("arc_9")`… sans effet, écrits par l'ancien convertisseur : ce sont des identifiants IEP sans nom dans le script, aucune réécriture automatique possible (ré-import depuis leur XML) | table `constructions` (mesure du 2026-10-23)                        |

### Dette de code

| Point                                                                       | Où                      |
| --------------------------------------------------------------------------- | ----------------------- |
| `applyTraceStyle` écrit dans la `Map` privée de `Figure` par un transtypage | `visibility.ts:107-121` |

### Commentaires et docs périmés

| Affirmation                                                                                                       | Réalité                                               |
| ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `archive/wip/v1-choreographies-substeps-progress.md:219` : `ctx.sub` non implémenté, `cercle_circonscrit` en stub | implémentés (§ 4)                                     |
| même journal `:221` : `transporte` en 6 sous-étapes                                                               | 7                                                     |
| `archive/wip/constructions-v2/progress.md:151` : « les constructions JSON existantes fonctionnent toujours »      | `/constructions/[id]` affiche « n'est plus supporté » |

### Ce que l'ancien `src/lib/constructions/` fournit encore

| Fourniture                                     | Utilisée par                                                                          |
| ---------------------------------------------- | ------------------------------------------------------------------------------------- |
| `constructionScriptSchema` (format JSON)       | `api/constructions/+server.ts:11`, `api/constructions/[id]/+server.ts:12`             |
| `convertInstrumenPoche` (XML → JSON)           | `api/constructions/convert/+server.ts:10`, `constructions/conversion/+page.svelte:23` |
| `ConstructionPlayer` JSON, `JsonEditor`        | `constructions/conversion/+page.svelte:21` ; `QuestionTemplateForm.svelte:212`        |
| Instruments `Ruler`, `Protractor`, `SetSquare` | `whiteboard/components/InstrumentLayer.svelte:13-15`                                  |

Les constructions au format JSON ne se jouent plus nulle part hors de l'aperçu de conversion, et
l'API ne permet pas de changer `format` (`api/constructions/[id]/+server.ts:29-40`) ; la migration
passe par `scripts/migrate-constructions-to-dsl.ts` (clé de service).
