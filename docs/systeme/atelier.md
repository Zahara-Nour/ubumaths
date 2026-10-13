---
couvre:
  - 'src/lib/atelier/**'
  - 'src/lib/components/atelier/**'
  - src/lib/mathAST/cli/web/web-repl-engine.ts
  - 'src/routes/(public)/atelier/**'
  - 'src/routes/(public)/calc/**'
  - 'src/routes/(public)/cas/**'
  - 'src/routes/(public)/grapheur/**'
---

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

### Modèle — `src/lib/atelier/` (46 fichiers hors tests)

| Fichier                             | Rôle                                                                                                      |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `src/lib/atelier/types.ts`          | Les quatre types d'objets, `ObjectStatus`, `CurveDisplay`, `SequenceDisplay`, plafonds D8, gardes de type |
| `src/lib/atelier/atelier.svelte.ts` | **La classe `Atelier`** : création, renommage, mise à jour, suppression, états, `serialize`/`restore`     |
| `src/lib/atelier/names.ts`          | Validation des noms, nommage automatique (`nextName`), noms de dérivées (`derivativeName`)                |
| `src/lib/atelier/parse.ts`          | Lecture d'une définition (`parseDefinition`), dépendances (`referencesOf`), provenance (`Provenance`)     |
| `src/lib/atelier/letter.ts`         | `f(t) = t^2` : la lettre de l'élève à l'affichage, la définition rangée en x                              |
| `src/lib/atelier/interval.ts`       | `f(x) = x^2 sur [0;+∞[` : coupe au mot « sur », lit l'ensemble, juge I3 (domaine) et I4 (`f(5)`)          |
| `src/lib/atelier/constant.ts`       | La valeur d'une constante (curseurs, premier terme d'une suite)                                           |
| `src/lib/atelier/list-cited.ts`     | Refus d'une liste citée comme un nombre (`listCitedMessage`)                                              |
| `src/lib/atelier/actions.ts`        | Les actions d'une carte selon le type et l'état (`actionsFor`), listes partenaires                        |
| `src/lib/atelier/context.ts`        | L'instance d'atelier passée par contexte (`provideAtelier`, `useAtelier`)                                 |
| `src/lib/atelier/engine.ts`         | Remet `WebReplEngine` en accord avec les objets (`syncEngine`), expansion des noms dans une saisie        |
| `src/lib/atelier/plot-sync.ts`      | Reporte les objets tracés vers le `GrapheurStore` (`syncPlots`), à sens unique                            |
| `src/lib/atelier/display.ts`        | Schémas Zod des réglages de courbe et de suite (carte, sauvegarde, lien : une seule règle)                |
| `src/lib/atelier/mathfield.ts`      | Passage texte ↔ LaTeX pour le champ MathLive d'une carte                                                  |
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
| `src/lib/atelier/steps-summary.ts`     | Interrupteur « Résumé / Détaillé » : `summaryOf`, choix retenu dans le navigateur                          |
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
| `src/lib/atelier/url.ts`            | Atelier ↔ charge d'URL compressée (`encodeAtelier`, `decodeAtelier`)                             |
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

| Type       | Exemple                    | Particularités                                                                                                                          |
| ---------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `value`    | `a = 2`, `d = 12[km]`      | curseur (bornes `[-10 ; 10]` par défaut, D3) ; une grandeur à unité n'en a pas (D4)                                                     |
| `function` | `f(x) = x^2`, `f(t) = t^2` | rangée **en x** ; `letter` garde la lettre de l'élève pour l'affichage ; `interval` l'ensemble écrit après « sur » ; `display` du tracé |
| `sequence` | `u(n) = 2n+1`, `u = 2u+1`  | `mode` explicite / récurrence, `firstIndex`, `firstTerm` (nombre ou nom d'une valeur)                                                   |
| `list`     | `L = 12 ; 15 ; 9`          | `values` numériques, ou `categories` (liste qualitative) ; `plottedWith` pour le nuage                                                  |

**Quatre états** (D9) : `error` > `pending` > `incomplete` > `ok`. Un nom cité mais absent met
l'objet **en attente** (`pending`, avec `missing`), pas en erreur ; l'attente se répare seule quand
le nom apparaît, et pour une lettre seule elle porte une **offre de curseur**
(`createFromOffer`). Un objet vide est `incomplete` ; ceux qui le citent l'attendent.

**Noms** (`src/lib/atelier/names.ts`) : une lettre latine, éventuellement indicée ; **un seul
espace de noms** tous types confondus (D1). Les dérivées s'appellent `f′` (`derivativeName`,
`isDerivativeName`). Le nommage automatique évite les noms cités par la définition (#329).

**Fonction définie sur un intervalle** (lot 1 de
[atelier-intervalle-phase0.md](../wip/atelier-intervalle-phase0.md), I1-I6 validées le 2026-10-13) :
l'élève écrit l'ensemble dans le même champ que la définition, après le mot « sur »
(`f(x) = x^2 sur [0;+∞[`). `splitInterval` (`src/lib/atelier/interval.ts`) coupe AVANT le parseur
de l'expression : en texte (Calcul), un mot entier ; en LaTeX (carte), « sur » arrive en trois
lettres collées à ce qui précède (`x^2sur[0;1]`, mesuré dans Chromium) et se reconnaît à ce qui le
suit (`intervalWord`) : il ne coupe QUE devant le début d'un ensemble (crochet, `\left`, `\{`, ℝ,
`\R`, `\mathbb`, `R` seul) ; sinon la saisie reste entière comme avant (`a = 3 sur 4`, `x^{sur}`,
`surface`, `\text{surélevé}`) ; jamais `\surd` ; la carte l'écrit `\text{ sur }`. L'ensemble
est lu par `parseStudentDomain` (intervalles, réunions, `ℝ \ {0}`, `ℝ₊` ; pas `+oo`) et
rangé TEL QU'ÉCRIT dans `FunctionObject.interval` ; `sur ℝ` ne range rien. `Atelier.create` et
`update` le jugent (`checkInterval`) : illisible, vide, réduit à un point, posé sur une valeur, une
liste ou une suite (« Seule une fonction se définit sur un intervalle. »), ou hors du domaine de la
fonction (I3, `computeDomain` puis `difference` : « ln(x) n'est pas défini sur tout [−1 ; 2] (pas
en −1). » ; pas jugé quand la définition cite d'autres objets) → refusé, rien ne change. Une
définition retapée sans « sur » (Calcul ou carte) retire l'intervalle (I6). `f(5)` hors de
l'ensemble est refusé dans Calcul (`outsideIntervalRefusal`, argument sans variable ou fait de valeurs de l'atelier — `f(b)` avec b = 5 —, et aussi dans une définition, `a = f(5)`) et par l'image
de la carte (I4). Dans la carte, `smartFence` est coupé dès que le champ contient le « sur » d'un
intervalle — même règle `intervalWord`, « sur » en fin de saisie compris (jugé au `keydown`,
`beforeinput` et `input` en capture : l'`input` arrive trop tard) — sinon `[0;1[` s'écrit
`\left\lbrack0;1\left\lbrack\right\rbrack\right\rbrack`, illisible.

**Les calculs sur l'intervalle** (lot 2, I4) : `.résoudre` et `.variations` travaillent sur
l'ensemble des fonctions qu'ils citent SEULES ou appelées sur une lettre (`f`, `f(x)`, `f'(t)` —
`citedIntervalDomain`, intersection s'il y en a plusieurs) ; dans `f(2x)`, c'est 2x qui devrait être
dans l'ensemble : rien n'est restreint. Un `dans` tapé se croise avec cet ensemble (vide → refus).
L'atelier passe l'ensemble au moteur par le mot `dans` (`formatInterval`, relu par
`studyDomain` / `readSolvingDomain`) : la ligne de texte, le tableau et les étapes disent la même
chose. `.variations f` (x² sur [0 ; +∞[) : tableau de 0 (compris) à +∞, croissante ; `.résoudre
f(x)=4` : `x = 2` — les étapes résolvent sur ℝ puis une dernière « On ne garde que les solutions
qui sont dans [0 ; +∞[ » (`solveSteps(…, within)`, équations à solutions isolées seulement ; une
inéquation garde la réponse du moteur, déjà restreinte). Mêmes règles pour les actions « Résoudre
f(x) = 0 » et « Variations » de la carte. **`f′` hérite** : `#inheritIntervals` recopie l'ensemble
de f sur ses dérivées à chaque recalcul (il suit f, disparaît avec lui, jamais sauvegardé) ; la
carte affiche `sur [0 ; +∞[`, `f'(5)` et l'image de la carte f′ hors de l'ensemble sont refusés.
Pas d'action « Tabuler » (encore désactivée), ni de commande de signe : rien à brancher. Laissés
sur tout le domaine : `.domaine`, `.intégrer … de a à b`, `.évaluer … en x=…`, `.taylor … en a`,
`.équivalent` (questions à David, journal de la phase 0). Pas encore (lot 3) : le tracé restreint
— une fonction sur un intervalle se trace sur tout son domaine.

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
moteur **n'existent pas dans l'atelier** (`ENGINE_COMMANDS_LEFT_OUT` : `let`, `def`, `clear`,
`unset`, `undef`, `inv`, `def'` — décision de David, 2026-10-13) : elles écriraient des noms dans le
moteur, alors que les noms se créent dans le panneau. Hors du catalogue, tapées en entier, elles
répondent comme toute commande inconnue. `.auto` (bascule du mode de saisie de `/cas`) n'est pas au
catalogue non plus.

Chemin d'une commande dans `runCommand` (`calcul.ts`), dans cet ordre :

1. `resolveCommand` + recherche dans le catalogue ; inconnue → refus avec au plus deux
   suggestions (`suggestFor`) ;
2. on exécute le **nom canonique**, jamais le raccourci tapé (`.s` = simplifier, pas solve) ;
3. `.aide`, `.mode`, `.exact`, `.décimal` : traités par l'atelier, en français ; `.latex` et
   `.texte` sans expression : refus (le moteur y basculerait son mode de saisie, et lirait mal tous
   les calculs suivants) ;
4. commandes de données (table `SIMULATIONS`) : lisent des **noms de listes**, avant toute
   substitution ;
5. sinon : virgule décimale, `π`, `f'(x)` puis noms d'objets remplacés par leurs expressions ;
   `ATELIER_ONLY_COMMANDS` sortent ici (`runAtelierCommand`) ; le reste passe par les mots-clés,
   la variable devinée, puis `engine.execute` ;
6. la réponse du moteur est rendue (`renderResult`), et les **étapes** pédagogiques s'y ajoutent
   quand elles savent faire — elles remplacent le formateur de terminal, jamais la réponse.

**Au clavier** (`CalculView.svelte`, phase 0 [atelier-cas-phase0.md](../wip/atelier-cas-phase0.md),
décisions de David du 2026-10-11) :

- après un point, la liste des commandes (8 au plus) est un **combobox** : ↑ / ↓ surlignent (la liste
  boucle), **Entrée ou Tab choisit** (`.dériver `) — sauf une
  commande marquée `runsAlone` (`.aide`, `.exact`…) tapée en entier, qu'Entrée lance —, Échap ferme
  jusqu'à la frappe suivante. Sans commande proposée (`.pose`), Entrée calcule ;
- liste fermée, **↑ / ↓ rappellent les saisies tapées** (`CalcDesk.recallPrevious` /
  `recallNext`) : jamais une ligne écrite par un bouton, même « Comparer avec M » qui passe par
  `submit` ; deux saisies identiques de suite rappelées une fois ; le brouillon d'avant le premier
  ↑ revient au bout ; une ligne rappelée puis modifiée n'est pas perdue ; « Repartir de zéro » vide
  le rappel, et rien n'est rappelable après un rechargement ou un rejeu ;
- une fois la commande choisie ou tapée avec son espace, son **modèle** (l'exemple du catalogue,
  `commandBeingWritten`) reste sous le champ pendant qu'on tape la suite. Garde : toute commande
  d'élève disponible a un exemple (`commands.test.ts`).

**Valeur approchée ⇄ valeur exacte** (PR 2 de la même phase 0) : une ligne dont la réponse a une
autre écriture porte un bouton qui bascule, ligne par ligne, sans rien sauvegarder ni exporter
(`Alternative` dans `calcul.ts`, `Entry.alternative`). Règle unique, `mathAST/cli/approximation.ts`
(décisions de David du 2026-10-11) : **4 décimales, zéros compris** (`≈ 5,0990`) ; **=** sans zéros
inutiles quand l'écriture décimale tient dans l'arrondi (1/4 → `= 0,25`) — décidé sur le RATIONNEL
(`evaluateNodeToRational`), jamais à une tolérance près ; 4 chiffres significatifs sous 10⁻⁴ ; hors
de [10⁻⁶ ; 10⁹[, la **notation scientifique** du collège, 4 décimales sur la mantisse, calculée sur la
fraction exacte (`≈ 8,7700 × 10⁹` pour π²⁰, `= 1,25 × 10⁻⁷` exact, `≈ 1,3221 × 10⁻⁵²³` pour 0,3¹⁰⁰⁰ —
décisions a, b, c du 2026-10-12) ; un entier exact s'écrit en entier jusqu'à 15 chiffres (2⁴⁰), en
notation scientifique au-delà (2⁶⁴ ≈ 1,8447 × 10¹⁹) ; rien pour un nombre déjà écrit (`3`, `2,5`), une
expression littérale, une grandeur (le moteur la calcule par une autre branche). Le moteur fournit `approximateLatex` (mode exact) ou
`exactLatex` (mode décimal) pour un calcul, et `approximateLatex` pour `.solve`, intervalle compris
(`S ≈ {−1,4142 ; 1,4142}` ; rien pour une famille périodique, une inéquation, un seuil en ln qui dit
déjà sa valeur approchée). Quand les ÉTAPES donnent la réponse, le bouton approche leurs solutions
(`SolvedSteps.approximate`), dans leur ordre et leur forme — pas celles du moteur, triées. Mêmes
boutons sur l'image d'un nombre et « Résoudre f(x) = 0 » des cartes.
`.mode décimal` suit la même règle (2026-10-11) : 4 décimales, `≈` à l'écran comme dans le texte
seulement si la valeur est arrondie (`≈ 0,7071`, `0,25`) ; « Garder » range la valeur pleine
précision (`quantityAst`). Depuis le 2026-10-12, plus aucun repli sur l'écriture du flottant du
moteur (`e+30`, 15 chiffres, 2⁶⁴ écrit `18446744073709552000` faux et sans `≈`) : l'écriture se lit
toujours sur le résultat exact, le calcul décimal du moteur ne sert qu'à une valeur non réelle et à
« Garder ». Le texte d'une notation scientifique se retape dans la console (`8.7700*10^9`,
`1.4286*10^-7`) ; à l'écran, `isScientificNotation` la protège de `tidy` (qui recalculerait
`3 × 10²⁰`). Mêmes règles pour une grandeur (`9,4607 × 10¹⁵ m`). Le texte d'un résultat exact est mis au propre comme l'écran (`\pi/3`,
plus `{1/3}\pi`) — `/cas` compris.

**Résultat exact trop long** (lot « lenteur des grandes fractions », option A de David du 2026-10-12,
`mathAST/cli/exact-size.ts`) : au-delà de **1 000 caractères**, le mode exact **garde l'écriture
tapée** (`(1+1/1000)^{1000}`, `1.01^{365}`, `2^{100000}`) — comme `1000!` le faisait déjà — avec une
note (« Valeur exacte trop longue (environ 6 000 chiffres) : elle reste écrite telle quelle. ») ; la
valeur approchée reste au bouton ≈ et en mode décimal. Deux temps (lot « défauts des grandes
fractions », 2026-10-12) :

- la taille **prévue avant le calcul** (puissance de base a/b : environ k × (chiffres de a +
  chiffres de b) ; factorielle, coefficient binomial par Stirling ; ailleurs, les tailles
  s'ajoutent, sans compensation : le moteur calcule chaque puissance avant de simplifier ; base
  irrationnelle — racines et nombres — par sa « hauteur », à un facteur 2
  près) ne sert qu'à ne pas figer la page : au-delà de **20 000 caractères prévus**, rien n'est
  calculé (`\sqrt{2}^{40000000}` et `2^{2^{100}}` répondent « Valeur hors d'échelle » au lieu de
  bloquer 2,5 s). Exception : un **produit ou quotient de puissances** de bases rationnelles
  courtes se calcule sur ses facteurs premiers compensés (`productValue`), sans les puissances
  intermédiaires — `10^{60000}/10^{59990}` répond 10¹⁰, et
  `(1+1/100000)^{100000}×(1+1/100000)^{-100000}` répond 1 au lieu de bloquer 305 s ; Avant, `(1+1/10000)^10000` prenait 13 s pour afficher 80 003 caractères, et
  `(1+1/100000)^100000` bloquait la page plus de 200 s (maintenant ~1 ms) ;
- en deçà, le résultat est calculé (moins de 130 ms au pire mesuré), et la règle des 1 000
  caractères se lit sur sa **longueur réelle** (`exactCharacters`) : une base irrationnelle
  échappait à la prévision (`\sqrt{2}^{100000}` affichait 15 052 caractères), et la prévision
  ignore les simplifications (`10^{600}×10^{-598}` gardait son écriture pour 100). Une factorielle
  que le moteur garde (`1000!`) compte par sa valeur (2 568 chiffres) ; `1000!/999!` n'est plus
  annoncé « environ 5 000 chiffres ». L'arrondi se lit alors sur le résultat calculé (√2 tapé
  n'entre en fraction que par son flottant, dont la puissance déborde).

**Chaînes et « différent de »** (2026-10-12) : `1 < x < 3` est vraie si chaque maillon l'est
(`evaluateToBoolean`, `eval/evaluate.ts` ; elle répondait « Cannot evaluate boolean expression ») ;
Les opérateurs logiques et d'égalité se tapent comme en programmation ou en toutes lettres
(`cli/core/pipeline.ts`, `withLogicOperators`) : `&&`/`and`/`et`, `||`/`or`/`ou`,
`!`/`not`/`non`, `==`/`===` (=), `!=`/`!==` (≠) — réécrits en `\land`, `\lor`, `\lnot`, `\ne`
pour le LaTeX (qui lisait `2 != 3` comme `factorial(2) = 3`). Une factorielle reste collée à son
nombre (`3! = 6`). Un « non » sans parenthèses porte sur toute la comparaison qui le suit
(`not 2 > 1` = non(2 > 1), jusqu'au prochain « et »/« ou » ; le `\lnot` du LaTeX lie plus fort).
⚠️ Au plus près (revues) : les mots et le « non » seulement s'il y a une comparaison ou un
opérateur logique (`non + 1`, `x et y` parlent de variables ; `b && !c` de booléens) ; `||` et les mots entourés d'espaces,
`||` hors d'une valeur absolue (`||-2||`, `| 2 || 3 |`) ; un « non » seulement en tête, après `(`,
`,` ou un « et »/« ou » (`5 !`, `|-3|!` sont des factorielles), un mot `non` seulement suivi de ce
qu'il nie (`non > 1` est une variable) ; aucun mot dans `\text{…}`. `.def f(x) = x == 2` ne tente
plus de dérivée. Le message
d'une comparaison non évaluable nomme la vraie cause (relation non tranchée, « non » sans
parenthèses, variable sans valeur). Une entrée à plusieurs `=` ou dont un membre est une comparaison (`1 < 2 = 2`) est lue
en entier comme une chaîne : `executeEquality` la coupait au `=` et comparait un booléen à un
nombre. Une chaîne de grandeurs (`5[m] < 600[cm] < 7[m]`) passe maillon par maillon par le chemin
des grandeurs. Une comparaison entre parenthèses (`\lnot (2 > 1)`) s'évalue ; une relation que le
calcul ne tranche pas répond en français (« Relation « ≈ » non évaluable : seules = ≠ < > ≤ ≥ se
tranchent »), et les erreurs de la console commencent par « Erreur de calcul : » (« Evaluation
error: » avant). **Tous les messages d'erreur de la console sont traduits à sa sortie**
(`mathAST/cli/web/french-errors.ts`, `withFrenchErrors` dans `execute`) : une table pour les
fréquents (« Unexpected token: EOF » → « Expression incomplète », « Unknown command: \foo » →
« Commande inconnue : \foo », « Division by zero » → « Division par zéro »…), « Écriture non
reconnue » pour une ligne qui COMMENCE par un mot anglais (un message déjà français reste
entier ; une consigne « Use: »/« Usage: » reste, sous « Forme attendue : »). ⚠️ On traduit le
message seul, puis on le remplace dans la sortie et, échappé, dans le HTML de /cas : traduit sur
le HTML final, il avalait des balises et réécrivait la saisie recopiée (revue). Les parseurs gardent leurs messages (une cinquantaine
de tests les vérifient). Une sortie d'erreur VIDE reste vide : l'atelier y répond « Je n'ai pas
su lire… ».

Une comparaison ne garde jamais son écriture (elle rend vrai ou faux), mais passe par le même
plafond **membre par membre** (`mathAST/cli/bounded-comparison.ts`, aussi pour `a = b`, qui suit
son propre chemin `executeEquality`) : un membre au-delà du plafond prend sa valeur exacte s'il
est un produit de puissances, sinon la relation se tranche sur des **encadrements rigoureux**
(`mathAST/cli/interval.ts` : 256 bits, arrondis vers l'extérieur à chaque opération, la valeur
exacte toujours dedans) : disjoints, le sens est sûr ; sinon refus (« Membres trop proches pour
être départagés »). Ce qui ne s'encadre pas (π, racine, fonction) est refusé ; avec une variable
libre, le refus le dit. ⚠️ Deux essais donnaient des sens FAUX (revue) : comparer les arrondis du
bouton ≈ (entre 10⁹ et 10¹⁵, entier exact et valeur approchée ne sont pas sur la même grille), puis
des intervalles à marge relative (un membre lu par le flottant, presque annulé par une
soustraction : `(1+1/20000)^{20000}×10^{16} − 27182138745278831 < 0` → `false`). Avant, `1.0001^{30000} > 20` prenait 16,7 s,
`(1+1/100000)^{100000}×(1+1/100000)^{-100000} < 1` plus de 300 s. `2^{100000} > 3^{60000}` répond toujours `true`. Le résultat porte `exactTooLong` ; le rendu ne passe pas l'écriture
gardée à `tidy`, qui la développerait. La console ne calcule plus le résultat exact deux fois (le
test du booléen le réutilise), ni l'arrondi deux fois (ligne et bouton ≈).

**Complétion des fonctions et des lettres grecques** (PR 3, `src/lib/atelier/completion.ts`) :
règle unique — la liste s'ouvre quand le mot qui finit au CURSEUR (lettres seulement, curseur relu
au moment de décider) a au moins 2 lettres et est le début d'une proposition (`si` → `sin(`,
`sinh(`, `sign(`, `σ` ; `al` → `α` ; `pi` → `π`). Propositions tirées des listes uniques du moteur :
`SHOWN_FUNCTIONS` (tokenizer) et `GREEK_LETTERS` (variantes exceptées), insérées en symbole — pas le
module de complétion de `/cas`, qui insère `\alpha`. Rien dans le nom d'une commande (liste des
commandes), ni dans une saisie en LaTeX (`\frac{co`). Pas de nom du panneau : un nom d'objet fait une lettre. Clavier : ↑ / ↓
surlignent, **Tab ou un clic insère**, **Entrée calcule** même liste ouverte (`3ta` = 3·t·a, décision
de David), Échap ferme jusqu'à la frappe suivante. Garde : chaque proposition, tapée dans un calcul,
est acceptée par Calcul (`completion.test.ts`).

**Actions de carte** : `actionsFor` (`src/lib/atelier/actions.ts`) donne par type les actions
(fonction : Tracer, Dériver, Tabuler, Résoudre f(x) = 0, Variations ; suite : Premiers termes ;
liste : Statistiques, diagrammes, nuage, ajustement, loi — par liste partenaire). Une action qui a
un sens pour le type mais pas pour cet objet reste **visible, désactivée, avec sa raison**
(`disabledReason`). Le clic passe par `CalcDesk.runFromPanel` : il **écrit une ligne dans
Calcul sans changer de vue** et crée **une carte par objet créé** (G7).

### Vues

| Vue     | Composant                             | Ce qu'elle projette                                                                                                                 |
| ------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Calcul  | `CalculView.svelte` + `CalcDesk`      | l'historique ; « Garder » promeut une ligne en objet nommé (`promote`, D5) ; « Comment ? » déplie les étapes, « Résumé / Détaillé » |
| Graphe  | `GrapheurContainer` (`panel={false}`) | fonctions, suites (nuage / escalier), nuages de deux listes, tracés via `syncPlots`                                                 |
| Données | `DataView.svelte`                     | listes en lignes, diagrammes en bâtons / barres / circulaire                                                                        |

Deux ponts à **sens unique**, tous deux idempotents (une empreinte évite de refaire le travail) :

- `syncEngine` (`engine.ts`) : l'atelier détient les noms, `WebReplEngine` n'est qu'un
  calculateur remis en accord avant chaque usage (Q1, option B) ;
- `syncPlots` (`plot-sync.ts`) : l'atelier détient l'état, le grapheur le reflète. Rien de ce qui
  se passe dans le grapheur ne remonte. ⚠️ L'effet qui l'appelle lit et écrit le store : s'il
  cessait d'être idempotent, il bouclerait.

### Session, persistance, URL

- **Stockage local** (`persistence.ts`) : clé `ATELIER_STORAGE_KEY` (`chiphre-atelier`),
  version `ATELIER_STATE_VERSION`. On range de quoi **reconstruire** (nom, type, définition,
  tracé, lettre, intervalle, réglages), jamais l'état ni le message — ils se recalculent. Un objet abîmé est
  écarté seul (`salvageObjects`), un réglage abîmé est oublié, l'objet gardé ; un intervalle refusé à la relecture (lien, fusion) aussi, la fonction gardée sur son domaine. Un état d'une version
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
- **ubumark** (`historyToUbumark`) pour recopier dans une fiche, formules en `$…$` LaTeX. Le
  titre d'une étape garde ses formules `$…$` (V25 : les pipelines pédagogiques y écrivent leurs
  maths) ; le texte autour est neutralisé (`*` → `×`, `\$`, `\~`).

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

| Geste de l'élève                        | Module appelé                                                                                                                                                                                                                                                                                                                                        |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| calculs, commandes du registre          | `WebReplEngine` (`src/lib/mathAST/cli/web/web-repl-engine.ts`)                                                                                                                                                                                                                                                                                       |
| écrire une grandeur (`5 km`)            | `readNaturalQuantities` (`src/lib/atelier/natural-quantities.ts`) : « un nombre, une espace, une unité », calculs et valeurs seulement                                                                                                                                                                                                               |
| grandeur dans le champ d'une carte      | `definitionFromField` / `fieldLatexOf` (`src/lib/atelier/mathfield.ts`) : la même lecture sur le LaTeX de MathLive (`2\,h\,30\,\min`) ; une durée composée revient `2 h 30 min` (dans un calcul : `(1 h + 30 min) × 2`, relu aussi) ; virgule de l'élève (`2{,}5`, valeurs et fonctions) ; une unité montrée par le champ reste une unité (`10^3 m`) |
| calcul avec des grandeurs, `.convertir` | `computeQuantity` / `convertQuantity` (`src/lib/mathAST/cli/quantities.ts`) : `tidy`, unité écrite d'abord — comme `{{eval}}` ; contrat : [grandeurs.md](grandeurs.md)                                                                                                                                                                               |
| `.simplifier`                           | `generatePedagogicalSimplifySteps`, intention `auto` (ADR 0007)                                                                                                                                                                                                                                                                                      |
| `.factoriser`                           | même pipeline, intention `factoriser`, niveau lycée (stratégies de l'ADR 0024 : identités à coefficients, Δ, racine évidente) ; aucun repli moteur : « je n'ai pas su » se dit                                                                                                                                                                       |
| `.dériver`, « Dériver », `f′`           | `src/lib/mathAST/pedagogical-differentiation/` (règle nommée, sous-étapes)                                                                                                                                                                                                                                                                           |
| `.résoudre`, « Résoudre »               | `src/lib/mathAST/pedagogical-solve/`, vérifié par `solve-steps-check.ts`                                                                                                                                                                                                                                                                             |
| `.variations`, « Variations »           | `computeVariations` (`src/lib/mathAST/variations/`) — le même calcul que le tableau                                                                                                                                                                                                                                                                  |
| syntaxe des commandes                   | `src/lib/mathAST/cli/core/variable-argument.ts`                                                                                                                                                                                                                                                                                                      |

**`.résoudre` en détail** (`solve-steps.ts`). `generateEquationSteps` (niveau `college`) choisit
le pipeline — premier degré, second degré, ou **valeur absolue** (`|2x+1|=5`, `3\left|x-1\right|=6`,
`|x-1|=|x+3|` : pipeline `absolute-value`, dont chaque branche du premier degré se rédige comme
l'équation seule). Le renderer se lit dans la première étape (`identify-equation.equationType`)
par `rendererFor`, un `switch` **exhaustif** gardé par `never` : `linear` → premier degré au
collège, `quadratic` et `rational` → second degré au lycée, `absolute-value` → renderer de la valeur
absolue au collège. L'ancien `linear ? Linear : Quadratic` envoyait tout type nouveau au renderer
du second degré (`|2x+1|=5` s'annonçait « Équation du second degré ») ; un type ajouté sans sa
ligne ne compile plus. Conclusions acceptées pour la ligne : `read-solution`, `read-solutions`,
`no-real-solution`, les conclusions d'inéquation, et `read-all-reals` (`S = ℝ`,
`|x-1|=|1-x|`).

Une inéquation dont l'écriture a une valeur interdite que la forme canonique efface
(`\frac{3x^2}{2x}\geq 0`, `\frac{2x^3}{x}<2`) n'a pas d'étapes : les pipelines du premier et du
second degré la refusent (`rejectForbiddenValues`, V47 puis V48), `solveSteps` rend `null` et
l'atelier affiche la réponse du moteur sans « Comment ? ».

**« Résumé / Détaillé »** (`steps-summary.ts`, 2026-10-13). Les quatre commandes qui rédigent
(simplifier, factoriser, dériver, résoudre — tapées, ou Résoudre / Dériver sur une carte) rendent le même
calcul DEUX fois : `steps` en `verbosity: 'detailed'`, `summary` en `'summarized'`. Le moteur
tourne une fois ; seul `renderAll` est rappelé, et la réponse de la ligne vient du calcul, jamais
de la rédaction. `summaryOf` compare les deux rendus et rend `undefined` s'ils sont identiques :
la ligne n'a alors pas d'interrupteur. Mesuré : dans les cinq renderers branchés, la verbosité ne
gouverne que l'`explanation` de chaque étape — le résumé garde toutes les étapes (valeur interdite
comprise), titres et calculs, sans le « pourquoi ». `summary` suit `steps` partout (virgule
décimale, `Entry`) ; l'export de l'historique ne garde que `steps`. `.variations` a sa propre
rédaction, sans verbosité : pas de `summary`. Dans `CalculView`, l'interrupteur est DANS le
« Comment ? » déplié (choix segmenté de `SequenceSettings`, `aria-pressed` et coche ✓), une seule
valeur pour toute la vue, « Détaillé » à l'ouverture, le dernier choix retenu sous
`chiphre-atelier-etapes` dans `localStorage` (lecture et écriture dans un `try` : la vue marche
sans). Une préférence d'affichage, pas un objet : elle ne voyage ni dans un lien ni dans une
fusion.

**Le garde-fou** (`solve-steps-check.ts`) vérifie la conclusion contre les nombres et le moteur
avant de la montrer ; un désaccord rend `null` (repli sur la réponse du moteur). `S = ℝ` est
accepté seulement si l'équation tient sur toute une grille ET si `solve` répond `infinite`. Un
**échec du moteur** porte le statut `no-solution` : `engineSolutions` le détecte par
`isSolverFailure` et rend `null`, sinon « type non supporté » confirmait une conclusion `S = ∅`
(`x\left|x\right|=4`, qui a la solution 2).

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
10. **On ne reparse jamais la sortie texte du moteur** (`render.ts`). Un **calcul** s'écrit depuis
    son arbre, mis au propre par `tidy` (π/3, √2/2 ; un résultat qui porte un décimal ou une variable
    libre est laissé tel quel — `x/x` ne devient pas 1), unités traduites par `displayUnitsInLatex` ; seule une **commande** peut encore montrer
    son texte s'il ne contient que du LaTeX sûr (lot B des grandeurs, 2026-10-11).
    La constante d'Euler y arrive écrite `e` : `toCustom` l'écrit ainsi et tous les
    parseurs la relisent comme Euler (depuis le 2026-10-10 ; `withPlainEuler` et le
    remplacement de `\euler` dans `render.ts` sont retirés). `e` n'est jamais une variable :
    `.dériver 3e^2 ; e` est refusé (« e est la constante d'Euler, pas une variable »).
11. **Seul l'affichage passe à la virgule décimale** : le moteur, l'arbre gardé et le rejeu
    restent en `0.5` (`decimal-comma.ts`). Dans le titre ou l'explication d'une étape,
    `decimalCommaProse` écrit `0,5` dans la phrase et `0{,}5` dans une formule `$…$` (V25).
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

- **Modèle et commandes** : `src/lib/atelier/__tests__/` (128 fichiers, dont 24 en
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
