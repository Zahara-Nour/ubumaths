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
| Chargement            | `core/executor.ts:193` `load()`                                                                                                                                                                  | Crée le stepper réel, puis `calculateStepDurations()` (`:1001`).                                                                                                                                                                                                                                |
| Pré-simulation        | `core/executor.ts:1001-1168`                                                                                                                                                                     | Joue tout le script sur un stepper temporaire. Directive → 1 entrée. Affectation décorée → `resolveDecorators` + `lookupVoie`, puis la chorégraphie (`invokeChoreographyOn`, `:433`) → N entrées (`computeSubStepTiming`, `:1178`). Sinon → 1 entrée (`computeLegacyStatementTiming`, `:1302`). |
| Erreur à l'exécution  | `core/executor.ts:1148-1164`                                                                                                                                                                     | Les entrées de l'instruction fautive sont retirées, `loadError` = `{message, line, stepIndex, details}`, la boucle s'arrête : le lecteur garde la figure partielle.                                                                                                                             |
| Plan                  | `core/executor.ts:55` (`PlanEntry`)                                                                                                                                                              | `plan`, `stepDurations` et les phases sont trois tableaux parallèles ; **une entrée = une position du curseur**. `totalSteps = plan.length`.                                                                                                                                                    |
| Pas                   | `core/executor.ts:229` `step()`                                                                                                                                                                  | Applique la visibilité en attente, cache les instruments du pas précédent, avance. En tête d'instruction : `stepper.step()` puis, si chorégraphiée, rejoue la chorégraphie sur la figure réelle (mêmes identifiants qu'à la pré-simulation : les compteurs de `Figure` sont déterministes).     |
| Pas « hérité »        | `core/executor.ts:756` `autoShowInstruments()`                                                                                                                                                   | Sans chorégraphie, l'animation est déduite des éléments créés (§ 4).                                                                                                                                                                                                                            |
| Sous-étape            | `core/executor.ts:339` `applySubStepToAnimationState()`                                                                                                                                          | Révèle les éléments à animer, place l'instrument principal (`instrumentTarget`) et le secondaire.                                                                                                                                                                                               |
| Visibilité finale     | `core/executor.ts:308-317`, `:322` ; `core/choreographies/visibility.ts:51`                                                                                                                      | La dernière sous-étape programme `applyFinalVisibility`, appliquée **au début du pas suivant** (ou par un `step()` de plus en fin de lecture).                                                                                                                                                  |
| Horloge               | `core/timeline.svelte.ts:50` `Timeline`                                                                                                                                                          | JS simple, **sans `$state`** (`:4`) : `load(durées)`, `play`, `pause`, `stepForward`, `playOneStep`, `stepBackward`, `seekToStep`, `scrubByProgress`, vitesse 0,25 à 4 (× ou ÷ 1,5).                                                                                                            |
| Lecteur               | `components/ConstructionPlayer.svelte` : exécuteur `:112`, `handleStepChange` `:148`, `handleTimelineUpdate` `:190`, `handleScrub` `:231`, `loadScript` `:257`, `$effect` de rechargement `:296` | À chaque changement de pas : `executor.reset()` puis `step()` × (i + 1), copie de l'état d'animation dans des `$state`. Arrivée en fin de lecture → un `step()` de plus pour vider la visibilité en attente. Props `seekToEnd`, `autoPlay`, `interactive`.                                      |
| Toile                 | `components/ConstructionCanvas.svelte` : `hiddenElementIds` `:79`, `GeometryCanvas` `:313`, tracés partiels `:324`, points `:379`, droites `:505`, instruments `:569`                            | Les éléments en cours d'animation sont masqués dans `GeometryCanvas` et redessinés partiellement au-dessus (`core/render-helpers.ts`).                                                                                                                                                          |
| Éditeur               | `components/ScriptEditor.svelte`                                                                                                                                                                 | CodeMirror 6 chargé à la demande (repli `textarea`), validation `parseDsl` après 300 ms (`:97`), aperçu `ConstructionPlayer` placé à la fin.                                                                                                                                                    |

### Phases et durées d'une entrée

Une entrée se découpe en **déplacement → levée du compas → tracé → pose du compas → pause** ; les
bornes sont des fractions de la durée (`movePhaseEnd`, `drawPhaseStart`, `drawPhaseEnd`,
`pausePhaseStart`). Constantes : `constants.ts`.

| Quantité                        | Règle (code : `executor.ts:1178-1295` et `:1302-1485`)                                                                                                              |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Échelle des durées              | `PPU = 40` px par unité, codé en dur (`executor.ts:1193`, `:1312`), indépendant du zoom                                                                             |
| Tracé                           | longueur (unités) × 40 × `MS_PER_PIXEL` (8) ÷ vitesse, borné à [`MIN_STEP_DURATION` 1000, `MAX_STEP_DURATION` 5000] ms ; 0 pour `compass-measure`                   |
| Déplacement d'instrument        | max(600, croisière (+ `INSTRUMENT_RAMP_MS` 300 si > 300)) ; croisière = max(distance, rotation × `MS_PER_DEGREE` 20) ÷ (vitesse × `INSTRUMENT_MOVE_SPEED_FACTOR` 3) |
| Compas                          | + `COMPASS_RAISE_MS` 400 avant le tracé, + `COMPASS_LOWER_MS` 400 après                                                                                             |
| Pause automatique               | + `AUTO_PAUSE_BETWEEN_STEPS` 500 ms après tout tracé ou fondu                                                                                                       |
| Fondu (points, droites)         | `DEFAULT_STEP_DURATION` 500 ÷ vitesse, borné à [100, 5000], + 500                                                                                                   |
| Directive                       | 0 ms, sauf `@pause(ms)` (défaut `DEFAULT_PAUSE_DURATION` 300)                                                                                                       |
| Position de départ d'instrument | coin (−8, 6) en unités math (`executor.ts:747-750`, `:1020-1023`)                                                                                                   |

## 2. Directives `@…` (une ligne à elles seules)

Traitées par `handleDirective` (`core/executor.ts:663-725`).
Chaque directive occupe **une entrée du curseur** (0 ms sauf `@pause`).

| Directive                                    | Effet                                                                                                                                                     |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@instrument("regle", x=…, y=…, rotation=…)` | Montre l'instrument et le place (unités math, rotation en degrés). Noms : `regle`, `compas`, `rapporteur`, `equerre`, `crayon` (`executor.ts:79-85`).     |
| `@instruction("texte")`                      | Consigne affichée sous la toile (`ConstructionPlayer.svelte:359-371`) jusqu'à la suivante. La consigne de la sous-étape en cours s'affiche dessous (§ 4). |
| `@vitesse(f)`                                | Multiplie les vitesses par `f > 0` à partir de cette ligne (lue à la pré-simulation seulement, `executor.ts:1005-1009`).                                  |
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

Erreurs (remontées en `DslRuntimeError` avec la ligne, `executor.ts:1036-1068`) : décorateur sur
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
(`ConstructionPlayer.svelte:144`, `:365-368`).
Les trois visibilités et les modificateurs valent pour **toutes** les voies (passe commune).
Nombres vérifiés par `core/__tests__/choreographies-integration.test.ts` (« int. ») et
`transporte-choreography.test.ts`.

| Builtin              | Contrainte | Voie (\* = défaut)          | Sous-étapes | Séquence                                                                         | Étiquettes de traces                      | État                                                                                     |
| -------------------- | ---------- | --------------------------- | ----------- | -------------------------------------------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------- |
| `mediatrice`         | `@euclide` | `arcs_egaux`\* (r = 0,7·AB) | 6           | CD ×4 (petits arcs), PF (I₁, I₂), RT                                             | `arc`                                     | livrée (int. :134)                                                                       |
| `mediatrice`         | `@euclide` | `cercles_rayon_ab` (r = AB) | 6           | idem                                                                             | `arc`                                     | livrée (int. :218)                                                                       |
| `bissectrice`        | `@euclide` | `arcs_egaux`\*              | 7           | CD ×2 en V, PF (A′, B′), CD ×2, PF (P), RT                                       | `arc`, `auxiliary-point`                  | livrée ; accepte `bissectrice(α)` (int. :854)                                            |
| `bissectrice`        | `@euclide` | `arc_milieu`                | 5           | CD ×2, PF (A′, B′), PF (M), RT                                                   | `arc`, `auxiliary-point`                  | livrée (int. :332)                                                                       |
| `parallele`          | `@euclide` | `parallelogramme`\* (I.31)  | 6           | CM \|AB\|, CD en P, CM \|PA\|, CD en B, PF (Q), RT                               | `arc`                                     | livrée (int. :375)                                                                       |
| `parallele`          | `@euclide` | `double_perpendiculaire`    | 0           | —                                                                                | —                                         | **stub `NOT_YET_IMPLEMENTED`** (`parallele.ts:781`) → repli hérité, 1 entrée (int. :827) |
| `parallele`          | `@equerre` | `pose_equerre`\*            | 6           | pose équerre, pose règle-glissière, glissement, RT, échange équerre → règle, RT  | `segment-trace`, `marker`, `arc`          | livrée (int. :706)                                                                       |
| `perpendiculaire`    | `@euclide` | `rayon_libre`\*             | 7           | CD ×2 en P, PF (A\*, B\*), CD ×2, PF (Q), RT                                     | `arc`, `auxiliary-point`, `segment-trace` | livrée (int. :576)                                                                       |
| `perpendiculaire`    | `@euclide` | `arcs_egaux`                | 7           | CM \|PA\|, CD, PF (B′), CD ×2, PF (Q), RT                                        | idem                                      | livrée (int. :620)                                                                       |
| `perpendiculaire`    | `@equerre` | `pose_equerre`\*            | 5           | pose équerre, glissement jusqu'au pied F, RT, échange → règle, RT                | idem                                      | livrée (int. :665)                                                                       |
| `cercle_circonscrit` | `@euclide` | `mediatrices`\*             | 17          | médiatrice(A,B) (6), LF, médiatrice(B,C) (6), LF, PF (O), CM \|OA\|, CD (cercle) | reprises des médiatrices                  | **livrée, par `ctx.sub`** (int. :446)                                                    |
| `transporte`         | `@euclide` | `compas_report`\* (I.23)    | 7           | CD ×2, PF (A′, B′, A″), CM \|A′B′\|, CD, PF (B″), RT                             | `arc`                                     | livrée, 4 modes de direction (`transporte-choreography.test.ts`)                         |

**`ctx.sub` est implémenté** (`executor.ts:474-493`, `buildSubChoreographyFn`) : la chorégraphie
parente crée elle-même l'élément principal du sous-appel puis demande la voie ; une voie inconnue
rend un résultat vide. Seul `cercle_circonscrit` s'en sert (`cercle_circonscrit.ts:69-70`).

Aucune voie n'existe pour la contrainte `@mesure`, ni pour un autre builtin que les six ci-dessus.
Le repli « hérité » s'applique aussi quand une chorégraphie rend 0 sous-étape
(`executor.ts:1130-1147`).

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
instrument visible (crayon placé au début du segment, `executor.ts:403-420`). Le rapporteur n'est
jamais animé automatiquement : seulement `@instrument("rapporteur", …)`.

Les instruments de l'ancien module (`src/lib/constructions/components/instruments/`) en sont une
copie distincte, utilisée par le tableau blanc (§ 9).

## 6. Pages, API, stockage

### Tables

| Table                       | Colonnes utiles                                                                                                                                                                                                                                                                                                                                                           | RLS (migrations)                                                                                                                                                                                         |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `constructions`             | `title`, `description`, `format` (`'json'` hérité \| `'dsl'`, défaut `'json'`), `dsl_script`, `script` jsonb NOT NULL (`{}` en DSL), `is_public` (défaut `false`), `author_id` (FK `profiles`, `ON DELETE SET NULL`). Contrainte `constructions_dsl_check` : `dsl` ⇒ `dsl_script` non nul. Colonne `tags` supprimée (`20260908180000`) : étiquettes dans `resource_tags`. | lecture : les siennes (baseline) + `is_public` pour tout compte **connecté** (`20261015090600`) ; création, modification : les siennes, **prof ou admin** (`20261022200000`) ; suppression : les siennes |
| `construction_demo_scripts` | `author_id` (FK, `ON DELETE CASCADE`), `name`, `dsl_script` ; unique (`author_id`, `name`)                                                                                                                                                                                                                                                                                | tout : les siens (baseline)                                                                                                                                                                              |

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
| `GET`/`POST`/`DELETE /api/construction-demo-scripts` | `requireAuth`                          | `name` ≤ 100, `dsl_script` ≤ 100 000 ; `upsert` sur (`author_id`, `name`) ; `DELETE ?id=` UUID                                                       |

Qui écrit : `CONSTRUCTION_AUTHOR_ROLES` et `canAuthorConstructions` (`src/lib/server/constructions-access.ts`),
prof et admin (décision de David du 2026-10-22). La base tient la même règle (migration
`20261022200000`) : les gardes de l'API et des pages ne font que répondre 403 et masquer les boutons.

## 7. Convertisseur XML InstrumenPoche → DSL

`converter.ts:105` `convertXmlToDsl(xml)` (DOMParser au navigateur, `xml2js` côté Node). Gère
points (création, nom, translation ; « masquer » / « montrer » → builtins `masque(A)` / `montre(A)`), crayon (segments), compas (écart, tracé d'arcs), règle,
équerre, texte → `@instruction`, tempo → `@pause` (≥ 200 ms, pas deux de suite), angle droit.
Avertissements pour : tracé à main levée (`:324`), compas `lever/coucher/retourner/rotation`
(`:403`), marque de longueur (`:452`), marque de segment (`:479`), objet inconnu (`:492`).

## 8. Tests

`pnpm test:server src/lib/constructions-v2/` le 2026-10-23 : **10 fichiers, 189 réussis,
21 ignorés (210)**, 1,4 s. Les 21 ignorés : les trois `describe.skipIf(!hasFixtures)` de
`converter.test.ts` (`:274`, `:330`, `:369`), faute du dossier `extern/instrumenpoche-main`.

| Fichier (sous `constructions-v2`)                   | Cas (≈) | Couvre                                                                                                                                                  |
| --------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `core/__tests__/choreographies-integration.test.ts` | 48      | décorateurs dans l'exécuteur, nombre et suite des sous-étapes de chaque voie, étiquettes, stub `double_perpendiculaire`, `bissectrice(α)`, `transporte` |
| `core/__tests__/transporte-choreography.test.ts`    | 7       | 4 modes de direction, angle plat, angle aigu, mesure conservée                                                                                          |
| `core/__tests__/choreographies-resolve.test.ts`     | 23      | `resolveDecorators` (nominal, erreurs, mode direct), `lookupVoie`                                                                                       |
| `core/__tests__/visibility.test.ts`                 | 10      | `applyFinalVisibility` pure, branchement dans l'exécuteur, modificateurs                                                                                |
| `core/__tests__/executor.test.ts`                   | 16      | chargement, directives, durées, déplacement depuis la dernière position, `reset`                                                                        |
| `core/__tests__/timeline.test.ts`                   | 18      | navigation, défilement, vitesse, rappels, formatage                                                                                                     |
| `core/__tests__/animator.test.ts`                   | 23      | `partialSegment`, `partialCircle`, `partialArc`, assouplissements                                                                                       |
| `core/__tests__/render-helpers.test.ts`             | 15      | tracés SVG partiels, pointe du crayon                                                                                                                   |
| `core/__tests__/converter.test.ts`                  | 34      | conversion XML → DSL, point masqué / montré (dont 21 sur fixtures, ignorés)                                                                             |
| `instruments/__tests__/positioning.test.ts`         | 8       | `rulerPosition`, `compassPosition`, `applyPosition`                                                                                                     |

Ailleurs : `geometry-core/dsl/__tests__/directives.test.ts` (21), `parser-decorators.test.ts` (22),
`stepper.test.ts` (19) ; `components/geometry/__tests__/GeometryCanvas.theme.svelte.test.ts`
(instruments en traits noirs, 2) ; `routes/(public)/construction-demo/__tests__/page.server.test.ts`
(1) ; `tests/integration/lectures-ouvertes-fermees.test.ts` (lecture des constructions publiques).
Composant : `components/__tests__/ConstructionPlayer-consignes.svelte.test.ts` (consignes de
l'auteur et des sous-étapes, 4, `pnpm test:client`). **Aucun** test de composant pour
`ConstructionCanvas` ni `ScriptEditor`.

## 9. Écarts et reste à faire

Faits relevés dans le code le 2026-10-22.

### Fonctions manquantes

| Point                                                                                                                                                                                                                      | Où                                                |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `parallele @euclide @double_perpendiculaire` est un stub (`ctx.sub`, qui permettrait de composer les deux perpendiculaires, existe)                                                                                        | `parallele.ts:781-784`, `:813-815`                |
| Contrainte `@mesure` déclarée, aucune voie : toute utilisation est une erreur ; le rapporteur n'est jamais animé                                                                                                           | `choreographies/types.ts:18`, `registry.ts:25-63` |
| Six builtins chorégraphiés seulement (`milieu`, `cercle`, `triangle_equilateral`… refusent les décorateurs)                                                                                                                | `registry.ts:66`                                  |
| Polygones, vecteurs, courbes apparaissent d'un coup (pas de tracé ni d'instrument)                                                                                                                                         | `types.ts:83`                                     |
| Formes `parallele(P, d)` / `perpendiculaire(P, d)` décorées : `resolveCallArgsOn` exige une position par argument ; une droite n'en a pas → pas de chorégraphie, repli hérité **sans erreur** (déduit du code, aucun test) | `executor.ts:501-519`                             |

### Comportements connus

| Point                                                                                                                                                                                                                                                                                                                   | Où                                                                  |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| La visibilité finale d'une instruction chorégraphiée s'applique au pas suivant ; le lecteur ne la force qu'en fin de lecture                                                                                                                                                                                            | `executor.ts:234`, `:308-317` ; `ConstructionPlayer.svelte:190-204` |
| Chaque changement de pas rejoue tout depuis le début, et `reset()` refait la pré-simulation entière : coût quadratique sur un long script                                                                                                                                                                               | `ConstructionPlayer.svelte:148-153` ; `executor.ts:566`             |
| `PPU = 40` codé deux fois dans l'exécuteur, en double de `INITIAL_PPU`                                                                                                                                                                                                                                                  | `executor.ts:1193`, `:1312` ; `ConstructionCanvas.svelte:60`        |
| Le genre `compass-measure` sert aussi de « déplacement sans tracé » de l'équerre et de la règle                                                                                                                                                                                                                         | `perpendiculaire.ts:973-1245`, `parallele.ts:402-776`               |
| 3 constructions en prod (« Ajouter 19 », « Soustraire 99 », « Axes de symétrie… carré ») contiennent des `@cacher("T_3")`, `@cacher("arc_9")`… sans effet, écrits par l'ancien convertisseur : ce sont des identifiants IEP sans nom dans le script, aucune réécriture automatique possible (ré-import depuis leur XML) | table `constructions` (mesure du 2026-10-23)                        |

### Dette de code

| Point                                                                       | Où                                                          |
| --------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `applyTraceStyle` écrit dans la `Map` privée de `Figure` par un transtypage | `visibility.ts:107-121`                                     |
| API : supprimer un identifiant étranger de script de démo répond `ok: true` | `api/construction-demo-scripts/+server.ts:74`               |
| API démo : le message brut de la base est renvoyé en 500                    | `api/construction-demo-scripts/+server.ts:32`, `:58`, `:78` |

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
