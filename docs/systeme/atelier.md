# L'atelier (et `/grapheur`)

> Synthèse des journaux archivés `docs/archive/wip/atelier-*`. Syntaxe des commandes de Calcul :
> [atelier-syntaxe.md](atelier-syntaxe.md) (cité par le code). Vérifié contre le code le 2026-10-10.

## À quoi ça sert

L'outil de **recherche de l'élève** : l'endroit où il calcule, trace, saisit des données,
conjecture et garde ce qu'il trouve — du 6ᵉ à la terminale. Cadrage :
[atelier-recherche-eleve.md](../archive/wip/atelier-recherche-eleve.md) (intention, trois
décisions, décisions figées §9, versions v1/v2/v3).

Trois décisions de cadrage (David, 2026-09-15) :

1. **Public : l'élève**, pas le prof en préparation.
2. **Sans compte** : page publique, **rien ne quitte le navigateur** — pas de base, pas de RLS,
   pas de RGPD à gérer. La mémoire est le `localStorage` ; le partage passe par l'URL.
3. **Du collège au lycée, sans sélecteur de niveau** : la progressivité vient des actions
   attachées au _type_ de l'objet (un atelier qui ne contient que des nombres n'affiche jamais
   « Dériver »).

Et une règle de fond (décision figée n° 2) : **l'atelier ne valide pas.** Il calcule, il ne dit
jamais à l'élève si sa conjecture est juste.

Deux adresses, un seul outil :

| Route       | Fichier                                     | Ouvre                                                                               |
| ----------- | ------------------------------------------- | ----------------------------------------------------------------------------------- |
| `/atelier`  | `src/routes/(public)/atelier/+page.svelte`  | l'atelier personnel, vue Calcul                                                     |
| `/grapheur` | `src/routes/(public)/grapheur/+page.svelte` | le même atelier, vue Graphe, « Mes objets » ouvert ; atelier vide → carte `f` prête |

L'atelier est l'**entrée unique** : la barre latérale (`src/lib/components/Sidebar.svelte`) n'a
plus d'entrée « Grapheur », `/grapheur` survit pour les favoris et les liens de projection
(décisions G1/G2 de [atelier-grapheur-phase0.md](../archive/wip/atelier-grapheur-phase0.md)).

**Vocabulaire.** [CONTEXT.md](../../CONTEXT.md) ne définit pas encore les termes de l'atelier.
Ceux du code et de l'interface :

- **objet** : un nom + une définition, de quatre types (valeur, fonction, suite, liste) ;
- **carte** : la présentation d'un objet dans « Mes objets » (`ObjectCard.svelte`). ⚠️ Rien à
  voir avec la **Carte de cours** de CONTEXT.md ni avec les cartes du SRS ;
- **vue** : Calcul, Graphe ou Données — une _projection_ des objets, sans état propre ;
- **historique** : les lignes de la vue Calcul (saisies et réponses) ;
- **mode éphémère** : un atelier reçu par lien, qui ne lit ni n'écrit l'atelier personnel.
- voisins hors atelier : `/cas` (`src/routes/(public)/cas/+page.svelte`, ancien REPL web, à
  retirer) et `/calc` (`src/routes/(public)/calc/+page.svelte`, grapheur singleton).

---

## Carte du code

### Modèle — `src/lib/atelier/` (42 fichiers hors tests)

| Fichier                             | Rôle                                                                                                      |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `src/lib/atelier/types.ts`          | Les quatre types d'objets, `ObjectStatus`, `CurveDisplay`, `SequenceDisplay`, plafonds D8, gardes de type |
| `src/lib/atelier/atelier.svelte.ts` | **La classe `Atelier`** : création, renommage, mise à jour, suppression, états, `serialize`/`restore`     |
| `src/lib/atelier/names.ts`          | Validation des noms, nommage automatique (`nextName`), noms de dérivées (`derivativeName`)                |
| `src/lib/atelier/parse.ts`          | Lecture d'une définition (`parseDefinition`), dépendances (`referencesOf`), provenance (`Provenance`)     |
| `src/lib/atelier/letter.ts`         | `f(t) = t^2` : la lettre de l'élève à l'affichage, la définition rangée en x                              |
| `src/lib/atelier/constant.ts`       | La valeur d'une constante (curseurs, premier terme d'une suite)                                           |
| `src/lib/atelier/list-cited.ts`     | Refus d'une liste citée comme un nombre (`listCitedMessage`)                                              |
| `src/lib/atelier/actions.ts`        | Les actions d'une carte selon le type et l'état (`actionsFor`), listes partenaires                        |
| `src/lib/atelier/context.ts`        | L'instance d'atelier passée par contexte (`provideAtelier`, `useAtelier`)                                 |
| `src/lib/atelier/engine.ts`         | Remet `WebReplEngine` en accord avec les objets (`syncEngine`), expansion des noms dans une saisie        |
| `src/lib/atelier/plot-sync.ts`      | Reporte les objets tracés vers le `GrapheurStore` (`syncPlots`), à sens unique                            |
| `src/lib/atelier/display.ts`        | Schémas Zod des réglages de courbe et de suite (carte, sauvegarde, lien : une seule règle)                |
| `src/lib/atelier/mathfield.ts`      | Passage texte ↔ LaTeX pour le champ MathLive d'une carte                                                 |
| `src/lib/atelier/paste.ts`          | Collage réécrit en LaTeX, annulable (`insertPasted`)                                                      |

**Vue Calcul** (saisie, commandes, historique) :

| Fichier                                | Rôle                                                                                                       |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `src/lib/atelier/calcul.ts`            | **Aiguillage de la saisie** (`runInput`) : définition, calcul ou commande ; actions de carte (`runAction`) |
| `src/lib/atelier/desk.svelte.ts`       | `CalcDesk`, le pupitre : historique, actions venues du panneau, garder une ligne, rejeu                    |
| `src/lib/atelier/commands.ts`          | Catalogue français des commandes (`commandCatalog`, `resolveCommand`, `suggestFor`)                        |
| `src/lib/atelier/help.ts`              | `.aide` pour l'élève (`studentHelpText`) ; l'aide du moteur derrière `.aide dev`                           |
| `src/lib/atelier/render.ts`            | Rendu d'un résultat du moteur en LaTeX, sans jamais reparser la sortie texte                               |
| `src/lib/atelier/decimal-comma.ts`     | Virgule décimale à l'affichage, refus des virgules ambiguës à la saisie                                    |
| `src/lib/atelier/simplify-steps.ts`    | `.simplifier` par étapes (`simplifySteps`)                                                                 |
| `src/lib/atelier/factor-steps.ts`      | `.factoriser` par étapes (`factorSteps`)                                                                   |
| `src/lib/atelier/derive-steps.ts`      | `.dériver` et « Dériver » expliqués (`deriveSteps`)                                                        |
| `src/lib/atelier/solve-steps.ts`       | `.résoudre` par étapes (`solveSteps`)                                                                      |
| `src/lib/atelier/solve-steps-check.ts` | Garde-fou : une conclusion d'étapes que les nombres démentent n'est pas montrée                            |
| `src/lib/atelier/variations-steps.ts`  | `.variations` et « Variations » : tableau et détail (`variationsRendering`)                                |
| `src/lib/atelier/tidy-terms.ts`        | Ré-export de `tidyTerms` (vit dans `src/lib/mathAST/tidy/terms.ts`)                                        |

**Statistiques et probabilités** (commandes servies par l'atelier, pas par le moteur) :

| Fichier                           | Commandes / rôle                                                                         |
| --------------------------------- | ---------------------------------------------------------------------------------------- |
| `src/lib/atelier/simulate.ts`     | `.simuler`, `.fréquence`, `.échantillons` ; `lawFractions` (loi à partir de deux listes) |
| `src/lib/atelier/cross.ts`        | `.croiser` (tableau croisé de deux listes qualitatives)                                  |
| `src/lib/atelier/filter.ts`       | `.filtrer` (critère `=`, `≠`, `<`… avec `et`, `ou`, `non`)                               |
| `src/lib/atelier/compare.ts`      | `.comparer` (indicateurs de deux séries, sans phrase de conclusion)                      |
| `src/lib/atelier/binomial.ts`     | `.binomiale`                                                                             |
| `src/lib/atelier/law-commands.ts` | `.géométrique`, `.uniforme`, `.exponentielle`, `.normale` ; `P(X ⩽ 3)` seul (`lawEvent`) |
| `src/lib/atelier/chart.ts`        | Diagramme en bâtons / barres d'une liste (vue Données)                                   |

**Session, partage, export** :

| Fichier                             | Rôle                                                                                             |
| ----------------------------------- | ------------------------------------------------------------------------------------------------ |
| `src/lib/atelier/persistence.ts`    | Ranger / relire le `localStorage` (`loadAtelier`, `saveAtelier`, `readForeignWrite`), schéma Zod |
| `src/lib/atelier/session.ts`        | Cycle de vie (`openSession`) : chargement, sauvegarde différée, autres onglets                   |
| `src/lib/atelier/url.ts`            | Atelier ↔ charge d'URL compressée (`encodeAtelier`, `decodeAtelier`)                            |
| `src/lib/atelier/grapheur-link.ts`  | Porte unique des liens `?a=` et `?f=` (`openLink`), pour `/atelier` et `/grapheur`               |
| `src/lib/atelier/merge.ts`          | « Garder dans mon atelier » ce qu'on a reçu (`keepReceived`, `mergeInto`)                        |
| `src/lib/atelier/history-export.ts` | Export de l'historique de Calcul : JSON rejouable, ubumark lisible                               |
| `src/lib/atelier/history-import.ts` | Relecture d'un JSON exporté, validée par Zod et bornée (`readHistory`)                           |
| `src/lib/atelier/removal.ts`        | Les phrases de la suppression en cascade (`cascadeMessage`, `removedMessage`)                    |

### Composants — `src/lib/components/atelier/`

| Composant                 | Rôle                                                                                      |
| ------------------------- | ----------------------------------------------------------------------------------------- |
| `AtelierContainer.svelte` | Le conteneur : panneau + vues, session, `CalcDesk`, `GrapheurStore` propre, confirmations |
| `ObjectPanel.svelte`      | « Mes objets » : création, liste des cartes                                               |
| `ObjectCard.svelte`       | Une carte : nom, définition, état, actions                                                |
| `DefinitionField.svelte`  | `f(x) =` + champ MathLive ; la frappe met l'objet à jour 0,3 s après la dernière touche   |
| `ValueSlider.svelte`      | Curseur d'une valeur (bornes et pas réglables)                                            |
| `CurveSettings.svelte`    | « Sur le graphique » : couleur, trait, tangente, aire, cercle osculateur, longueur        |
| `SequenceSettings.svelte` | Mode, rang initial, premier terme ; nuage ou escalier                                     |
| `CalculView.svelte`       | Vue Calcul : champ, historique, « Garder », export / import                               |
| `DataView.svelte`         | Vue Données : une liste par ligne, valeurs séparées par `;`, diagrammes                   |
| `ShareBar.svelte`         | Partager (lien `?a=`), recevoir, « Garder dans mon atelier »                              |

La vue **Graphe** n'a pas de composant à elle : `AtelierContainer.svelte` monte
`src/lib/components/grapheur/GrapheurContainer.svelte` avec `panel={false}` sur un
`GrapheurStore` propre, fourni par contexte (`provideGrapheurStore`). Tout réglage passe par les
cartes (décision G3).

---

## Le modèle

### Objets

`AtelierObject` = `ValueObject` | `FunctionObject` | `SequenceObject` | `ListObject`
(`src/lib/atelier/types.ts`).

| Type       | Exemple                    | Particularités                                                                              |
| ---------- | -------------------------- | ------------------------------------------------------------------------------------------- |
| `value`    | `a = 2`, `d = 12[km]`      | curseur (bornes `[-10 ; 10]` par défaut, D3) ; une grandeur à unité n'en a pas (D4)         |
| `function` | `f(x) = x^2`, `f(t) = t^2` | rangée **en x** ; `letter` garde la lettre de l'élève pour l'affichage ; `display` du tracé |
| `sequence` | `u(n) = 2n+1`, `u = 2u+1`  | `mode` explicite / récurrence, `firstIndex`, `firstTerm` (nombre ou nom d'une valeur)       |
| `list`     | `L = 12 ; 15 ; 9`          | `values` numériques, ou `categories` (liste qualitative) ; `plottedWith` pour le nuage      |

**Quatre états** (D9) : `error` > `pending` > `incomplete` > `ok`. Un nom cité mais absent met
l'objet **en attente** (`pending`, avec `missing`), pas en erreur ; l'attente se répare seule quand
le nom apparaît, et pour une lettre seule elle porte une **offre de curseur**
(`createFromOffer`). Un objet vide est `incomplete` ; ceux qui le citent l'attendent.

**Noms** (`src/lib/atelier/names.ts`) : une lettre latine, éventuellement indicée ; **un seul
espace de noms** tous types confondus (D1). Les dérivées s'appellent `f′` (`derivativeName`,
`isDerivativeName`). Le nommage automatique évite les noms cités par la définition (#329).

**Provenance** (D10, `Provenance` dans `src/lib/atelier/parse.ts`) : c'est _d'où vient_ la
définition (champ MathLive, clavier, URL, collage, Calcul…) qui choisit le parseur, jamais son
contenu. Elle est rangée sur l'objet, parce que `recomputeAll` relit toujours la définition.

**État d'affichage hors sauvegarde** : les diagrammes de la vue Données (`chartOf`,
`toggleChart`), la liste partenaire choisie (`choosePartner`) et les lois retenues
(`rememberLaw`, `lawOf`) vivent dans l'`Atelier` mais pas dans `serialize()`.

### Ce que fait la classe `Atelier`

- **créer** : `create` (+ `createDerivative` pour `f′`, `createFromOffer` pour un curseur) ;
- **modifier** : `update`, `rename` (réécrit les définitions qui citent l'ancien nom),
  `setSlider`, `slideTo`, `setSequence`, `setDisplay`, `setSequenceDisplay`, `setPlotted` ;
- **supprimer** : `remove`, `removalOf`, `removeWithDependents`, `undoRemoval` ;
- **dépendances** : `dependents` ; toute mutation finit par `recomputeAll` (relit tout) ;
- **sauvegarde** : `serialize`, `restore` ; `revision` est le **seul** signal « quelque chose a
  changé » (la session l'écoute pour enregistrer).

### Commandes

La vue Calcul a **un seul champ**, comme `/cas` : ce que l'élève tape est une **définition** (crée
ou met à jour un objet), un **calcul** (une ligne d'historique) ou une **commande** (commence par
un point). `runInput` (`src/lib/atelier/calcul.ts`) rend un `CalcResult` de kind `vide`,
`definition`, `calcul`, `commande` ou `refus`.

**Syntaxe** : voir [atelier-syntaxe.md](atelier-syntaxe.md) — mots-clés français (`de … à`,
`pour`, `en`, `ordre`, `dans`, `et`), noms et mots-clés sans accent acceptés, ancienne écriture
acceptée quand elle est sans ambiguïté. La lecture vit dans `mathAST` :
`readCommandArguments`, `isKeywordCommand`, `guessedVariable` dans
`src/lib/mathAST/cli/core/variable-argument.ts`.

**Trois sources de commandes**, réunies par `commandCatalog` (`src/lib/atelier/commands.ts`) :

| Source                     | Où                            | Exemples                                                             |
| -------------------------- | ----------------------------- | -------------------------------------------------------------------- |
| registre du moteur         | `WebReplEngine.getCommands()` | `.dériver`, `.résoudre`, `.intégrer`, `.variations`, `.taylor`       |
| branchées hors registre    | table `OFF_REGISTRY`          | `.convertir`, `.stats`, `.ajustement`, `.exact`, `.décimal`          |
| servies par l'atelier seul | `ATELIER_ONLY_COMMANDS`       | `.factoriser`, `.simuler`, `.croiser`, `.filtrer`, `.comparer`, lois |

La table `TRANSLATIONS` donne pour chaque commande son nom français, sa description, son exemple
et sa rubrique de `.aide` (`HelpSection`) ; **son ordre est l'ordre du catalogue**. Les commandes
anglaises continuent de marcher (le registre est partagé avec le REPL de mathAST, `pnpm math`). Sept commandes du
moteur sont **visibles et désactivées avec leur raison** (`unavailable` : poser, définir,
effacer… — les noms se créent dans le panneau).

Chemin d'une commande dans `runCommand` (`calcul.ts`), dans cet ordre :

1. `resolveCommand` + recherche dans le catalogue ; inconnue → refus avec au plus deux
   suggestions (`suggestFor`) ;
2. on exécute le **nom canonique**, jamais le raccourci tapé (`.s` = simplifier, pas solve) ;
3. `.aide`, `.mode`, `.exact`, `.décimal` : traités par l'atelier, en français ;
4. commandes de données (table `SIMULATIONS`) : lisent des **noms de listes**, avant toute
   substitution ;
5. sinon : virgule décimale, `π`, `f'(x)` puis noms d'objets remplacés par leurs expressions ;
   `ATELIER_ONLY_COMMANDS` sortent ici (`runAtelierCommand`) ; le reste passe par les mots-clés,
   la variable devinée, puis `engine.execute` ;
6. la réponse du moteur est rendue (`renderResult`), et les **étapes** pédagogiques s'y ajoutent
   quand elles savent faire — elles remplacent le formateur de terminal, jamais la réponse.

**Actions de carte** : `actionsFor` (`src/lib/atelier/actions.ts`) donne par type les actions
(fonction : Tracer, Dériver, Tabuler, Résoudre f(x) = 0, Variations ; suite : Premiers termes ;
liste : Statistiques, diagrammes, nuage, ajustement, loi — par liste partenaire). Une action qui a
un sens pour le type mais pas pour cet objet reste **visible, désactivée, avec sa raison**
(`disabledReason`). Le clic passe par `CalcDesk.runFromPanel` : il **écrit une ligne dans
Calcul sans changer de vue** et crée **une carte par objet créé** (G7).

### Vues

| Vue     | Composant                             | Ce qu'elle projette                                                                 |
| ------- | ------------------------------------- | ----------------------------------------------------------------------------------- |
| Calcul  | `CalculView.svelte` + `CalcDesk`      | l'historique ; « Garder » promeut une ligne en objet nommé (`promote`, D5)          |
| Graphe  | `GrapheurContainer` (`panel={false}`) | fonctions, suites (nuage / escalier), nuages de deux listes, tracés via `syncPlots` |
| Données | `DataView.svelte`                     | listes en lignes, diagrammes en bâtons / barres / circulaire                        |

Deux ponts à **sens unique**, tous deux idempotents (une empreinte évite de refaire le travail) :

- `syncEngine` (`engine.ts`) : l'atelier détient les noms, `WebReplEngine` n'est qu'un
  calculateur remis en accord avant chaque usage (Q1, option B) ;
- `syncPlots` (`plot-sync.ts`) : l'atelier détient l'état, le grapheur le reflète. Rien de ce qui
  se passe dans le grapheur ne remonte. ⚠️ L'effet qui l'appelle lit et écrit le store : s'il
  cessait d'être idempotent, il bouclerait.

### Session, persistance, URL

- **Stockage local** (`persistence.ts`) : clé `ATELIER_STORAGE_KEY` (`chiphre-atelier`),
  version `ATELIER_STATE_VERSION`. On range de quoi **reconstruire** (nom, type, définition,
  tracé, lettre, réglages), jamais l'état ni le message — ils se recalculent. Un objet abîmé est
  écarté seul (`salvageObjects`), un réglage abîmé est oublié, l'objet gardé. Un état d'une version
  **plus récente** n'est ni relu ni écrasé. Chaque issue est nommée (`LoadOutcome`,
  `SaveOutcome` : stockage indisponible, quota, trop volumineux…).
- **Session** (`session.ts`) : sauvegarde différée de 500 ms sur `revision`, écrite aussi au
  `pagehide` ; l'événement `storage` signale une écriture d'un autre onglet. Tout ce qui doit être
  dit passe par `onNotice`. Une visite de `/grapheur` sans geste n'enregistre rien.
- **URL** (`url.ts`) : `?a=<charge>`, l'état sérialisé compressé en `deflate-raw` puis base64url ;
  un préfixe d'un caractère dit compressé / brut (repli sans `CompressionStream`). Limite
  `MAX_URL_PAYLOAD` (1 800 caractères), dite **avant** de copier.
- **Liens de projection** (`grapheur-link.ts`) : `/grapheur?f=x^2-3x+1&f=…`, 1 à
  `MAX_LINK_CURVES` (8) courbes validées par Zod.
- **Mode éphémère** : `?a=` comme `?f=` ouvrent un atelier qui **ne lit ni n'écrit** l'atelier
  personnel ; un lien abîmé le dit et ouvre l'atelier personnel. « Garder dans mon atelier »
  (`keepReceived`) verse dans l'atelier personnel ; en cas de collision, **l'arrivant est
  renommé** et on le dit (Q2, `mergeInto`).
- **Repartir de zéro** : confirmation, vide aussi l'historique ; absent d'un atelier reçu.

### Export et rejeu de l'historique

Bouton « Exporter » de la vue Calcul (`history-export.ts`) :

- **JSON** (`historyToJson`, format `HISTORY_FORMAT` = `chiphre-calcul`) pour rejouer : chaque
  entrée garde son **geste** (`ReplayStep` : `saisie`, `action`, `supprimer`, `annuler`, `garder`)
  et sa réponse ;
- **ubumark** (`historyToUbumark`) pour recopier dans une fiche, formules en `$…$` LaTeX.

Rejeu (`CalcDesk.replay`) : le fichier vient de dehors, donc `readHistory` le valide (Zod) et le
borne (`MAX_HISTORY_BYTES`, `MAX_HISTORY_ENTRIES`) avant tout. Chaque geste est refait **par le
même chemin** que l'élève (`submit`, `runFromPanel`, `keep`…) ; rien n'est injecté. Le rejeu
s'arrête à la première ligne qui échoue et dit laquelle (`ReplayReport`). Désactivé en mode
éphémère.

### Suppression en cascade

Supprimer un objet supprime **aussi ses dépendants**, directs ou en chaîne (décision du
2026-10-05, lot B de [atelier-suppression-export-phase0.md](../archive/wip/atelier-suppression-export-phase0.md)) :

- `removalOf` les nomme (dans l'ordre des cartes, sans compter deux fois un cycle) ; la
  confirmation en cite trois puis « et N autres » (`cascadeMessage`) ;
- `removeWithDependents` rend un reçu ; `undoRemoval` restaure **à l'identique** (définitions,
  réglages, tracés, diagrammes) — une seule fois, et **refusé si l'atelier a changé depuis**
  (`revision`) : jamais de restauration par-dessus un nom repris.

L'état « en attente » reste pour un nom cité _avant_ d'être défini ; seule la suppression a changé.

---

## Liens avec `mathAST` et `statistics`

L'atelier ne calcule presque rien lui-même : il choisit le bon module et met la réponse en forme.
Doc du moteur : [mathast/README.md](mathast/README.md).

| Geste de l'élève               | Module appelé                                                                          |
| ------------------------------ | -------------------------------------------------------------------------------------- |
| calculs, commandes du registre | `WebReplEngine` (`src/lib/mathAST/cli/web/web-repl-engine.ts`)                         |
| `.simplifier`                  | `generatePedagogicalSimplifySteps`, intention `auto` (ADR 0007)                        |
| `.factoriser`                  | même pipeline, intention `factoriser` ; aucun repli moteur : « je n'ai pas su » se dit |
| `.dériver`, « Dériver », `f′`  | `src/lib/mathAST/pedagogical-differentiation/` (règle nommée, sous-étapes)             |
| `.résoudre`, « Résoudre »      | `src/lib/mathAST/pedagogical-solve/`, vérifié par `solve-steps-check.ts`               |
| `.variations`, « Variations »  | `computeVariations` (`src/lib/mathAST/variations/`) — le même calcul que le tableau    |
| syntaxe des commandes          | `src/lib/mathAST/cli/core/variable-argument.ts`                                        |

Statistiques : `summarizeList` / `summarizeTable` (`src/lib/statistics/describe.ts`), et
`src/lib/statistics/` pour l'ajustement (`fit.ts`), le bivarié, la simulation, les fractions et
les variables aléatoires. Les **scènes** (diagrammes, lois, comparaisons) passent par les mêmes
constructeurs que les blocs ubumark d'une fiche (`src/lib/ubumark/utils/stat-chart-scene.ts`,
`src/lib/ubumark/parser/stat-chart-parser.ts`…) : mêmes textes, mêmes valeurs exactes, aucun code
de calcul en double. `.binomiale` et les autres lois **ne créent aucune liste** (les listes
stockent des décimaux, une loi B(20 ; 0,3) n'y serait plus exacte — Q142).

---

## Invariants

1. **L'atelier possède l'état ; les vues sont des projections** (décision figée n° 1). Un réglage
   écrit ailleurs que dans l'`Atelier` (dans le grapheur, dans une carte) serait écrasé à la
   synchronisation suivante.
2. **Ponts à sens unique** : atelier → moteur (`syncEngine`), atelier → grapheur (`syncPlots`).
3. **Un seul espace de noms** (D1) ; jamais d'écrasement silencieux d'un nom (création, renommage,
   fusion d'un atelier reçu).
4. **Tout contrôle sur une définition vit dans sa lecture** (`parseDefinition`), jamais dans
   `build()` : `recomputeAll` repart toujours de la lecture et écraserait le reste.
5. **Une fonction est rangée en x** ; la lettre de l'élève n'est que de l'affichage. Une
   définition en t qui contient déjà x est refusée (`letterRejection`).
6. **Rien ne quitte le navigateur.** Ni requête, ni compte : stockage local et URL seulement.
7. **Toute entrée venue de dehors passe par Zod** : sauvegarde (`atelierShellSchema`), lien
   (`decodeAtelier`, `curvesFromLink`), historique importé (`readHistory`), réglages
   (`curveDisplaySchema`).
8. **Plafonds D8** : `MAX_LIST_VALUES` (200) par liste, `MAX_LISTS` (8) listes,
   `MAX_DEFINITION_LENGTH` à la saisie — pour qu'un atelier tienne dans une URL.
9. **Visible et désactivé avec sa raison**, jamais caché : actions de carte et commandes.
10. **On ne reparse jamais la sortie texte du moteur** (`render.ts`).
11. **Seul l'affichage passe à la virgule décimale** : le moteur, l'arbre gardé et le rejeu
    restent en `0.5` (`decimal-comma.ts`).
12. **On ne valide pas** les réponses de l'élève (décision figée n° 2).

---

## Comment étendre

### Une commande `.xxx`

1. **Le moteur la connaît déjà** (registre `WebReplEngine`) : ajouter son entrée dans
   `TRANSLATIONS` (`commands.ts`) — nom français, description pour un élève, **exemple qui
   marche**, `section` de l'aide. Sans `section`, elle n'apparaît que dans `.aide dev`.
2. **L'atelier la sert seul** : l'ajouter aussi à `ATELIER_ONLY_COMMANDS`, puis la brancher dans
   `calcul.ts` — dans `SIMULATIONS` si elle lit des **noms de listes**, sinon dans
   `runAtelierCommand`. Le module de la commande rend `{ ok, text, chart? }` ou un message de refus
   en français.
3. **Arguments à mots-clés** : déclarer la commande dans `COMMAND_KEYWORDS` et `COMMAND_LABELS`
   (`src/lib/mathAST/cli/core/variable-argument.ts`) et tenir
   [atelier-syntaxe.md](atelier-syntaxe.md) à jour.
4. Les tests du catalogue rejouent **chaque exemple** (`commands.test.ts`, `aide-calcul.test.ts`) :
   un exemple qui refuse ou rend une ligne vide fait échouer la suite. Un exemple qui cite des
   listes déclare son décor dans `exampleSetup`.

**Une action de carte** — ajouter l'action au type dans `BY_KIND` (`actions.ts`), puis son traitement dans
`CalcDesk.runFromPanel` (`desk.svelte.ts`) — elle doit écrire une ligne dans Calcul, et une carte
par objet créé. Le geste devient alors rejouable (`ReplayStep` `action`).

**Une vue** — (1) un composant sous `src/lib/components/atelier/` qui lit l'atelier par `useAtelier()` et n'a
**aucun état de modèle** à lui ; un état d'affichage qui doit survivre au changement de vue
vit dans l'`Atelier`, hors `serialize()` (comme `charts`) ; (2) l'ajouter au type `ViewId` et au rendu de `AtelierContainer.svelte` ; (3) s'il faut un nouveau moteur (géométrie v2), un pont à sens unique sur le modèle de
`syncPlots`, idempotent.

**Un type d'objet** — le plus coûteux : `ObjectKind` et l'union dans `types.ts`, lecture dans `parse.ts`, schéma de
`persistence.ts` (et **incrémenter `ATELIER_STATE_VERSION`** si la forme rangée change), actions,
carte, fusion. Prévu pour la v2 (géométrie) et la v3 (Python) ; aucune phase 0 n'existe.

---

## Tests

- **Modèle et commandes** : `src/lib/atelier/__tests__/` (117 fichiers, dont 23 en
  `*.svelte.test.ts` qui tournent dans un vrai navigateur). Les autres tournent en node malgré les
  runes : c'est le **nom du fichier** qui choisit le projet, pas les runes.
- **Composants** : `src/lib/components/atelier/__tests__/`, harnais
  `src/lib/components/atelier/__tests__/harness/WithAtelier.svelte`.
- Fichiers repères : `atelier.test.ts` et `names.test.ts` (modèle), `calcul.test.ts`,
  `commands.test.ts`, `syntaxe-mots-cles.test.ts`, `persistence.test.ts`, `url.svelte.test.ts`,
  `suppression-cascade.test.ts`, `rejeu-calcul.svelte.test.ts`, `solve-steps-oracle.test.ts`
  (oracle du garde-fou), `paste.svelte.test.ts` (la pile d'annulation dans Chromium).

Lancer : `pnpm test:server <fichier>.test.ts`, `pnpm test:client <fichier>.svelte.test.ts`. Aucun
test d'intégration : l'atelier ne touche pas la base.

---

## Décisions

Aucun ADR propre à l'atelier ; [ADR 0007](../adr/0007-un-moteur-quatre-intentions.md) régit
`.simplifier` / `.factoriser`. Les décisions vivent dans les phases 0 archivées :

**Cadrage** ([atelier-recherche-eleve.md](../archive/wip/atelier-recherche-eleve.md) §9,
décisions figées) : 1 l'atelier possède l'état · 2 on ne valide pas · 3 pas de fusion grapheur /
`geometry-core` · 4 pas de sélecteur de niveau · 5 remplacée par G1/G2 (atelier = entrée unique,
`/grapheur` ouvre l'atelier).

**Phase 0 v1** ([atelier-recherche-eleve-phase0.md](../archive/wip/atelier-recherche-eleve-phase0.md) §9), état au 2026-10-10 :

| #   | Décision                                                     | Toujours vraie ?                                                               |
| --- | ------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| D1  | Un seul espace de noms                                       | ✅                                                                             |
| D2  | `x` seulement pour les fonctions, `n` pour les suites        | ⚠️ **Assouplie** (2026-10-06) : `f(t) = t^2` accepté, rangé en x (`letter.ts`) |
| D3  | Toute valeur numérique a un curseur, `[-10 ; 10]` par défaut | ✅ (bornes réglables dans la carte)                                            |
| D4  | Grandeur à unité : sans curseur, non traçable                | ✅                                                                             |
| D5  | L'historique reste, une ligne se promeut en objet            | ✅ (« Garder », `promote`)                                                     |
| D6  | Pas d'annulation globale                                     | ✅ — seule exception : annuler la dernière suppression en cascade              |
| D7  | « Afficher la dérivée » et « garder `f′` », deux gestes      | ⚠️ **Remplacée par G6** : « Dériver » crée la carte `f′`, qui suit `f`         |
| D8  | 200 valeurs par liste, 8 listes                              | ✅ (`MAX_LIST_VALUES`, `MAX_LISTS`)                                            |
| D9  | Nom inconnu → en attente, pas en erreur                      | ✅                                                                             |
| D10 | Le parseur suit la provenance                                | ✅ (en partie : le panneau et les données appellent `create` sans provenance)  |

**Autres** : option B (moteur et grapheur reflètent l'atelier, Q1 du 2026-09-16) · commandes
traduites côté atelier, pas dans `mathAST` (Q3) · arrivant renommé à la fusion (Q2) · G1 à G8
(`/grapheur`) · suppression en cascade et export JSON / ubumark (2026-10-05) · syntaxe par
mots-clés (2026-10-08) · virgule décimale, `.aide` élève, lois retenues (2026-10-09).

---

## État

**Livré** (v1, en production) : `/atelier` et `/grapheur` (l'atelier ouvert sur le Graphe, liens
`?f=`), cartes modifiables en MathLive, `f′` vivante, curseurs, suites (nuage, escalier),
partage par URL et mode éphémère, persistance locale, suppression en cascade, export et rejeu,
résolution / dérivation / simplification / factorisation / variations par étapes, statistiques
(`.stats`, `.ajustement`, listes qualitatives, `.croiser`, `.filtrer`, `.comparer`, `.simuler`),
lois (`.binomiale`, `.géométrique`, `.uniforme`, `.exponentielle`, `.normale`).

**À venir** (suivi : [docs/wip/atelier-progress.md](../wip/atelier-progress.md)) :

- **remplacer `/cas`** : inventaire de ce que `/cas` offre et que l'atelier n'offre pas, puis
  retrait ; `/calc` existe aussi encore ;
- **v2** géométrie à la souris, **v3** Python : non commencées, sans phase 0 ;
- données en grille (tableur intégré, options A/B) : question ouverte ;
- dettes connues : action « Renommer » encore désactivée (« prochain lot »), `recomputeAll`
  réassigne tout le tableau (jamais mesuré), saisie des unités sans palette.

⚠️ La section « Ce qui reste pour clore la v1 » de `atelier-progress.md` (2026-10-04) dit encore
les garanties `/grapheur` non faites : elles le sont (lots 2 à 6, #779 → #809,
[atelier-grapheur-progress.md](../archive/wip/atelier-grapheur-progress.md)).

---

Vérifié contre le code le 2026-10-10.
