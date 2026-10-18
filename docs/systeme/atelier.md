---
couvre:
  - 'src/lib/atelier/**'
  - 'src/lib/components/atelier/**'
  - 'src/lib/components/calculator/**'
  - src/lib/stores/calculator.svelte.ts
  - src/lib/mathAST/cli/web/web-repl-engine.ts
  - 'src/routes/(public)/atelier/**'
  - 'src/routes/(public)/calc/**'
  - 'src/routes/(public)/grapheur/**'
---

# L'atelier (et `/grapheur`)

> Synthèse des journaux archivés `docs/archive/wip/atelier-*`. Syntaxe des commandes de Calcul :
> [atelier-syntaxe.md](atelier-syntaxe.md) (cité par le code). Vérifié contre le code le 2026-10-18.

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
- voisin hors atelier : `/calc` (`src/routes/(public)/calc/+page.svelte`, grapheur singleton).
  Sa saisie (`UnifiedInput.svelte`) a un **mode commande** : un « . » dans le champ vide ouvre une
  zone de commande, qui garde son point (`.eval`) ; le store (`calculator.svelte.ts`) retire un
  point initial avant de rebâtir `.commande expression` pour `WebReplEngine` (V54 : il le doublait,
  et toutes les commandes répondaient « Commande inconnue »).
  `/cas` (ancien REPL web) est **retirée** depuis le 2026-10-13 : l'adresse mène à `/atelier` en
  308 (`redirectHandle`, `src/lib/server/redirectHandle.ts`).

---

## Carte du code

### Modèle — `src/lib/atelier/` (65 fichiers hors tests)

| Fichier                             | Rôle                                                                                                     |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `src/lib/atelier/types.ts`          | Les six types d'objets, `ObjectStatus`, `CurveDisplay`, `SequenceDisplay`, plafonds D8, gardes de type   |
| `src/lib/atelier/geometry.ts`       | Points et courbes (v2) : couple découpé, forme d'une équation, messages, refus d'un point cité (P9)      |
| `src/lib/atelier/atelier.svelte.ts` | **La classe `Atelier`** : création, renommage, mise à jour, suppression, états, `serialize`/`restore`    |
| `src/lib/atelier/formula.ts`        | Les formules de la grille : lecture des références (`ω_k`), ordre de calcul, cycles, repli ≈, refus      |
| `src/lib/atelier/grid.ts`           | La grille de la vue Données : adresses (`B3`), entrées d'une colonne nommée, répartition P2, plafonds    |
| `src/lib/atelier/grid-functions.ts` | Les fonctions du tableur (SOMME, ARRONDI…) : appels, plages, calcul en arbre équilibré, aide de la barre |
| `src/lib/atelier/cell-format.ts`    | La mise en forme des cases (reprise de V4) : zones, styles résolus, formats de nombre, rangement         |
| `src/lib/atelier/cell-colors.ts`    | Les couleurs de la mise en forme : CSS du texte et du fond, réglages de contraste mesurés                |
| `src/lib/atelier/tabulate.ts`       | Tabuler une fonction dans la grille : le tableau en formules, ses refus, `.tabuler`, valeurs par défaut  |
| `src/lib/atelier/names.ts`          | Validation des noms, nommage automatique (`nextName`), noms de dérivées et de réciproques (`f^-1`)       |
| `src/lib/atelier/parse.ts`          | Lecture d'une définition (`parseDefinition`), dépendances (`referencesOf`), provenance (`Provenance`)    |
| `src/lib/atelier/letter.ts`         | `f(t) = t^2` : la lettre de l'élève à l'affichage, la définition rangée en x                             |
| `src/lib/atelier/interval.ts`       | `f(x) = x^2 sur [0;+∞[` : coupe au mot « sur », lit l'ensemble, juge I3 (domaine) et I4 (`f(5)`)         |
| `src/lib/atelier/reciprocal.ts`     | La carte `f⁻¹` et `.réciproque` : f passée au moteur, paramètres gardés en lettres, refus en français    |
| `src/lib/atelier/limit.ts`          | `.limite EXPR en POINT` : point lu (côté, infini, `en x=1`), `evaluateLimit`, réponse en formule         |
| `src/lib/atelier/limit-steps.ts`    | `.limite` : « Comment ? » (`limitSteps`), garde de concordance dans `limit-steps-check.ts`               |
| `src/lib/atelier/constant.ts`       | La valeur d'une constante (curseurs, premier terme d'une suite)                                          |
| `src/lib/atelier/list-cited.ts`     | Refus d'une liste citée comme un nombre (`listCitedMessage`)                                             |
| `src/lib/atelier/actions.ts`        | Les actions d'une carte selon le type et l'état (`actionsFor`), listes partenaires                       |
| `src/lib/atelier/context.ts`        | L'instance d'atelier passée par contexte (`provideAtelier`, `useAtelier`)                                |
| `src/lib/atelier/engine.ts`         | Remet `WebReplEngine` en accord avec les objets (`syncEngine`), expansion des noms dans une saisie       |
| `src/lib/atelier/plot-sync.ts`      | Reporte les objets tracés vers le `GrapheurStore` (`syncPlots`), à sens unique                           |
| `src/lib/atelier/display.ts`        | Schémas Zod des réglages de courbe et de suite (carte, sauvegarde, lien : une seule règle)               |
| `src/lib/atelier/mathfield.ts`      | Passage texte ↔ LaTeX pour le champ MathLive d'une carte                                                 |
| `src/lib/atelier/paste.ts`          | Collage réécrit en LaTeX, annulable (`insertPasted`)                                                     |

**Vue Calcul** (saisie, commandes, historique) :

| Fichier                                 | Rôle                                                                                                       |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `src/lib/atelier/calcul.ts`             | **Aiguillage de la saisie** (`runInput`) : définition, calcul ou commande ; actions de carte (`runAction`) |
| `src/lib/atelier/desk.svelte.ts`        | `CalcDesk`, le pupitre : historique, actions venues du panneau, garder une ligne, rejeu                    |
| `src/lib/atelier/commands.ts`           | Catalogue français des commandes (`commandCatalog`, `resolveCommand`, `suggestFor`)                        |
| `src/lib/atelier/help.ts`               | `.aide` pour l'élève (`studentHelpText`) ; l'aide du moteur derrière `.aide dev`                           |
| `src/lib/atelier/listing.ts`            | `.valeurs` et `.fonctions` : les cartes du panneau, en français (`valuesListing`, `functionsListing`)      |
| `src/lib/atelier/render.ts`             | Rendu d'un résultat du moteur en LaTeX, sans jamais reparser la sortie texte                               |
| `src/lib/atelier/decimal-comma.ts`      | Virgule décimale à l'affichage, refus des virgules ambiguës à la saisie                                    |
| `src/lib/atelier/simplify-steps.ts`     | `.simplifier` par étapes (`simplifySteps`)                                                                 |
| `src/lib/atelier/factor-steps.ts`       | `.factoriser` par étapes (`factorSteps`)                                                                   |
| `src/lib/atelier/expand.ts`             | `.développer` : refus et messages (`expandExpression`) ; réponse et « Comment ? » par `explainExpansion`   |
| `src/lib/atelier/derive-steps.ts`       | `.dériver` et « Dériver » expliqués (`deriveSteps`)                                                        |
| `src/lib/atelier/solve-steps.ts`        | `.résoudre` par étapes (`solveSteps`)                                                                      |
| `src/lib/atelier/solve-steps-check.ts`  | Garde-fou : une conclusion d'étapes que les nombres démentent n'est pas montrée                            |
| `src/lib/atelier/variations-steps.ts`   | `.variations` et « Variations » : tableau et détail (`variationsRendering`)                                |
| `src/lib/atelier/steps-summary.ts`      | Interrupteur « Résumé / Détaillé » : `summaryOf`, choix retenu dans le navigateur                          |
| `src/lib/atelier/copy-text.ts`          | « Copier » d'une ligne : la réponse en texte lisible depuis son LaTeX (`readableText`, `answerToCopy`)     |
| `src/lib/atelier/input-mode.ts`         | Réglage « Saisie dans Calcul » (texte / écriture mathématique), retenu dans le navigateur                  |
| `src/lib/atelier/natural-input.ts`      | Écriture mathématique : règles des mots, complétion, LaTeX du champ ↔ texte de Calcul (`calcTextOf`)       |
| `src/lib/atelier/virtual-keyboard.ts`   | Clavier virtuel de l'écriture mathématique : onglets « Calcul » et « Commandes »                           |
| `src/lib/atelier/domain-steps.ts`       | `.domaine` : réponse `D = …` et « Comment ? » (`domainLine`)                                               |
| `src/lib/atelier/domain-steps-check.ts` | Garde-fou : l'ensemble conclu par les étapes est, par valeur, le domaine du moteur (`sameDomainByValue`)   |
| `src/lib/atelier/tidy-terms.ts`         | Ré-export de `tidyTerms` (vit dans `src/lib/mathAST/tidy/terms.ts`)                                        |

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
| `src/lib/atelier/pairs.ts`        | Deux listes appariées par LIGNE (P1) : `commonRows`, `valuesOn`, `lawMismatchMessage`    |

**Session, partage, export** :

| Fichier                              | Rôle                                                                                               |
| ------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `src/lib/atelier/persistence.ts`     | Ranger / relire le `localStorage` (`loadAtelier`, `saveAtelier`, `readForeignWrite`), schéma Zod   |
| `src/lib/atelier/session.ts`         | Cycle de vie (`openSession`) : chargement, sauvegarde différée, autres onglets ; `keepCalcHistory` |
| `src/lib/atelier/history-storage.ts` | Les lignes de Calcul gardées au rechargement (`loadCalcHistory`, `saveCalcHistory`), Zod, plafonds |
| `src/lib/atelier/safe-latex.ts`      | Liste blanche des commandes LaTeX d'une formule relue du stockage (`isSafeLatex`)                  |
| `src/lib/atelier/url.ts`             | Atelier ↔ charge d'URL compressée (`encodeAtelier`, `decodeAtelier`)                               |
| `src/lib/atelier/grapheur-link.ts`   | Porte unique des liens `?a=` et `?f=` (`openLink`), pour `/atelier` et `/grapheur`                 |
| `src/lib/atelier/merge.ts`           | « Garder dans mon atelier » ce qu'on a reçu (`keepReceived`, `mergeInto`)                          |
| `src/lib/atelier/history-export.ts`  | Export de l'historique de Calcul : JSON rejouable, ubumark lisible, `downloadHistory`              |
| `src/lib/atelier/history-import.ts`  | Relecture d'un JSON exporté, validée par Zod et bornée (`readHistory`)                             |
| `src/lib/atelier/removal.ts`         | Les phrases de la suppression en cascade (`cascadeMessage`, `removedMessage`)                      |

### Composants — `src/lib/components/atelier/`

| Composant                 | Rôle                                                                                                                    |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `AtelierContainer.svelte` | Le conteneur : panneau + vues, session, `CalcDesk`, `GrapheurStore` propre, confirmations                               |
| `ObjectPanel.svelte`      | « Mes objets » : création, liste des cartes                                                                             |
| `ObjectCard.svelte`       | Une carte : nom, définition, état, actions ; champs de l'image et de « Tabuler » (de / à / pas)                         |
| `DefinitionField.svelte`  | `f(x) =` + champ MathLive ; la frappe met l'objet à jour 0,3 s après la dernière touche                                 |
| `ValueSlider.svelte`      | Curseur d'une valeur (bornes et pas réglables)                                                                          |
| `CurveSettings.svelte`    | « Sur le graphique » : couleur, trait, tangente, aire, cercle osculateur, longueur                                      |
| `SequenceSettings.svelte` | Mode, rang initial, premier terme ; nuage ou escalier                                                                   |
| `CalculView.svelte`       | Vue Calcul : champ (texte ou écriture mathématique), historique, « Garder », export / import                            |
| `NaturalField.svelte`     | Le champ MathLive de l'écriture mathématique (en essai) : mots finis en texte, complétion, ↑ / ↓, clavier virtuel       |
| `AtelierSettings.svelte`  | Le bouton « Réglages » et sa fenêtre : la saisie dans Calcul                                                            |
| `FormulaText.svelte`      | Un message de l'atelier dont les formules `$…$` sont composées (refus de `.réciproque`, valeur interdite de `.évaluer`) |
| `DataView.svelte`         | Vue Données : la grille (barre de cellule, mise en forme, clavier, nommer une colonne), aperçus, diagrammes             |
| `ShareBar.svelte`         | Partager (lien `?a=`), recevoir, « Garder dans mon atelier »                                                            |

La vue **Graphe** n'a pas de composant à elle : `AtelierContainer.svelte` monte
`src/lib/components/grapheur/GrapheurContainer.svelte` avec `panel={false}` sur un
`GrapheurStore` propre, fourni par contexte (`provideGrapheurStore`). Tout réglage passe par les
cartes (décision G3).

---

## Le modèle

### Objets

`AtelierObject` = `ValueObject` | `FunctionObject` | `SequenceObject` | `ListObject` |
`PointObject` | `CurveObject` (`src/lib/atelier/types.ts`). Les deux derniers sont ceux de la
géométrie (v2, lot 1, PR 1 : le modèle, sans la vue Figure — phase 0
[atelier-geometrie-phase0.md](../wip/atelier-geometrie-phase0.md)).

| Type       | Exemple                               | Particularités                                                                                                                                |
| ---------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `value`    | `a = 2`, `d = 12[km]`                 | curseur (bornes `[-10 ; 10]` par défaut, D3) ; une grandeur à unité n'en a pas (D4)                                                           |
| `function` | `f(x) = x^2`, `f(t) = t^2`            | rangée **en x** ; `letter` garde la lettre de l'élève pour l'affichage ; `interval` l'ensemble écrit après « sur » ; `display` du tracé       |
| `sequence` | `u(n) = 2n+1`, `u = 2u+1`             | `mode` explicite / récurrence, `firstIndex`, `firstTerm` (nombre ou nom d'une valeur)                                                         |
| `list`     | `L = 12 ; 15 ; 9`                     | `values` numériques, ou `categories` (liste qualitative) ; `plottedWith` pour le nuage ; `column`, sa colonne dans la grille                  |
| `point`    | `A = (1 ; 2)`, `M = (a ; 2a)`         | `definition` = le couple tel qu'écrit, parenthèses comprises ; coordonnées calculées comme des valeurs, exactes d'abord ; ni curseur ni tracé |
| `curve`    | `d : y = 3x - 2`, `C : x^2 + y^2 = 1` | `definition` = l'équation telle qu'écrite, sans le nom ni « : » (jamais réduite, C7) ; jamais dans Graphe (G0)                                |

**Point et courbe** (géométrie v2, décisions G0-G7 et Q1-Q5 du 2026-10-18) : **la forme écrite
donne le type** (G0) — `f(x) = 3x − 2` est une **fonction** (Graphe, dériver…), `d : y = 3x − 2`
une **courbe** (la vue Figure, PR 2). Dans Calcul, `defineCurve` (`calcul.ts`) ne prend `<nom> :
<reste>` pour une courbe que si le reste porte une relation (`hasRelation`) : `6 : 3` et `a : b`
restent la division (C15) ; sur une valeur existante, `a : b = 2` reste une comparaison, `d : y =
3x` est refusé (« « d » est déjà une valeur. », V62). La lecture (`parseCurve`, `parse.ts`) refuse
une inégalité (C9), deux « = » (C10), une unité (C11, D4), une équation sans x ni y (C8) — dans
Calcul ces refus ne créent rien. Un point se tape `A = (1 ; 2)` (G3) : `looksLikePoint` le trie
(un « ; » de premier niveau, ou une virgule qui sépare : `(1, 2)` est refusé par P6, `(1,2)` reste
le décimal 1,2 de #983) ; `parsePoint` lit chaque coordonnée comme une valeur (virgule décimale,
fractions, P3), sans unité (P8), sans x ni y. `A(1 ; 2)` répond « Pour définir un point, écris
A = (1 ; 2). » (P5). Taper `A` répond `A(1 ; 2)`, chaque coordonnée calculée comme une ligne de
Calcul (`pointLine`) ; taper `d` répond son équation. Un point ou une courbe cité dans un calcul
(`A + 1`, `2A`) ou une définition (`a = A + 1`) est refusé (« On ne calcule pas encore avec des
points. », `figureCitedMessage`, P9), y compris en argument d'une commande de calcul (`.dériver A` répondait `d/dA(A) = 1` ; lu dans le texte par `citesName`, les commandes de données lisant des modalités ne sont pas touchées). `(1 ; 2)` tapé seul répond « Pour définir un point, nomme-le : A = (1 ; 2). » (nom libre) ; un triplet ou un couple dans un calcul (`(1;2)+(3;4)`) garde le refus des couples, et la carte d'une valeur aussi. Ils citent des valeurs et des fonctions comme tout objet :
`M = (a ; 2a)` attend a avec l'offre de curseur (D9), `T : y = f'(2)(x − 2) + f(2)` suit f, et la
suppression en cascade les emporte (M3). Ni le moteur (`syncEngine`) ni le grapheur ne les
reçoivent ; `setPlotted` les ignore. Actions de carte : modifier (le champ, préfixe `d :`) et
supprimer, rien d'autre au lot 1. Plafond `MAX_FIGURE_OBJECTS` (50, points et courbes, Q3). La
**nature** d'une courbe (droite, cercle) et la courbe vide (C6) attendent la PR 2 :
`geometry-core` ne l'expose pas encore hors de `courbe()`.

**Quatre états** (D9) : `error` > `pending` > `incomplete` > `ok`. Un nom cité mais absent met
l'objet **en attente** (`pending`, avec `missing`), pas en erreur ; l'attente se répare seule quand
le nom apparaît, et pour une lettre seule elle porte une **offre de curseur**
(`createFromOffer`). Un objet vide est `incomplete` ; ceux qui le citent l'attendent. Une
**fonction ou une suite citée comme un nombre** (`f(x) = ax`, `2ax`, `a^2` avec `a(x) = x^2`,
dans n'importe quel ordre de saisie ; `h(x) = a(2) + a` ; `f(x) = u x` avec u une suite) met la
définition en erreur (V58, `functionAsNumberMessage` dans `recomputeAll`). Les noms sont lus
dans l'arbre (`bareNamesOf`, `parse.ts`) : une variable seule, hors base d'un indice (`a_1` est
un autre nom, `u_n` la notation d'une suite) et hors base d'une puissance −1 (la réciproque ;
`f'(x)`, `f^{-1}(x)` sont des appels). Message de la carte, pour f : _« a » est une fonction :
« f » ne peut pas s'en servir comme d'un nombre. Écris a(x), ou donne un autre nom à la
lettre._ La suggestion suit la variable de l'objet qui cite (`a(t)`, `a(n)` pour une suite) ;
pour une valeur, _Écris une de ses valeurs, comme a(2)…_ ; une suite citée dans une fonction ou
une valeur, _Écris un de ses termes, comme u(2)…_ Les cartes `f′` et `f⁻¹` n'y passent pas
(elles suivent f). ⚠️ Redéfinir un nom garde son type (V62).
⚠️ `referencesOf` lit tout nom indicé comme sa base (`a_1 x` attend `a`), défaut antérieur (V63).

**Noms** (`src/lib/atelier/names.ts`) : une lettre latine, éventuellement indicée ; **un seul
espace de noms** tous types confondus (D1). Réservés : `x`, `y`, `n`, `e`, `pi`, `i` — **`y` depuis
la géométrie** (G5, 2026-10-18) : c'est la variable des équations de courbe. `y = 3x − 2` sans nom
répond « Pour une fonction, écris f(x) = 3x − 2 ; pour une droite, nomme-la : d : y = 3x − 2. »
(Q1 (a), noms libres proposés) ; `y` dans une fonction, une valeur ou une suite met la carte en
erreur (« « y » est réservé aux équations de courbe… ») ; `f(y) = y^2` reste permis (une lettre de
fonction, rangée en x). Lettres proposées aux points : A, B, C… ; aux courbes : d, C, D, T. Les dérivées s'appellent `f′` (`derivativeName`,
`isDerivativeName`) ; la réciproque se range `f^-1` et s'affiche `f⁻¹` (`reciprocalName`,
`reciprocalOf`) — une forme qu'aucun élève ne peut taper comme nom (`validateName` la refuse), donc
sans collision possible ; elle n'est pas citable (absente de `functionNames`). Le nommage automatique évite les noms cités par la définition (#329).

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
`citedIntervalDomain`, intersection s'il y en a plusieurs) ; appelée sur un nombre ou une autre lettre (`f(a)`), elle vaut un nombre ; sur une expression de l'inconnue (`f(2x)`), refus en français (c'est 2x qui devrait être dans l'ensemble). Un `dans` tapé se croise avec cet ensemble (vide → refus).
L'atelier passe l'ensemble au moteur par le mot `dans` (`formatInterval`, relu par
`studyDomain` / `readSolvingDomain`) : la ligne de texte, le tableau et les étapes disent la même
chose. `.variations f` (x² sur [0 ; +∞[) : tableau de 0 (compris) à +∞, croissante ; `.résoudre
f(x)=4` : `x = 2` — les étapes résolvent sur ℝ puis une dernière « On ne garde que les solutions
qui sont dans [0 ; +∞[ » (`solveSteps(…, within)`, équations à solutions isolées seulement ; une
inéquation garde la réponse du moteur, déjà restreinte). Une famille périodique sur un ensemble non borné (`sin(x) = 0` sur [0 ; +∞[) est refusée : « Une infinité de solutions sur cet ensemble ». Mêmes règles pour les actions « Résoudre
f(x) = 0 » et « Variations » de la carte. **`f′` hérite** : `#inheritIntervals` recopie l'ensemble
de f sur ses dérivées à chaque recalcul (il suit f, disparaît avec lui, jamais sauvegardé) ; la
carte affiche `sur [0 ; +∞[`, `f'(5)` et l'image de la carte f′ hors de l'ensemble sont refusés.
Pas d'action « Tabuler » (encore désactivée), ni de commande de signe : rien à brancher. Laissés
sur tout le domaine : `.taylor … en a`, `.équivalent`.

**Les suites décidées par David le 2026-10-13** (journal de la phase 0, a-g ; c = futur chantier,
`f(2x)` reste refusé) : **a)** `.domaine f` d'une fonction à ensemble répond « f est définie sur
[0 ; +∞[ (ensemble choisi) ; sans ce choix, elle le serait sur ℝ. », sans la seconde moitié quand
l'ensemble EST le domaine, et « (ensemble hérité) … sans cet héritage » pour une fonction qui le
tient des fonctions qu'elle cite (`chosenDomainAnswer`) ; sans ensemble, rien ne change. **b)**
`.évaluer f en x=5` et `.intégrer f de a à b` hors de l'ensemble sont refusés comme `f(5)`
(`valueOutsideRefusal`, `segmentOutsideRefusal` : la borne qui sort, sinon la partie de [a ; b]
qui sort — un trou d'une réunion ; seule une partie de longueur non nulle compte : une borne
ouverte ou un point exclu ne refusent rien, une divergence est dite par `.intégrer`). `ℝ\{1}` tapé
collé se lit `ℝ \ {1}`. **d)** Une fonction qui CITE une fonction à ensemble en
**hérite** (`g(x) = f(x) + 1` → [0 ; +∞[ ; plusieurs → intersection ; en chaîne ; jusqu'à `g′`) :
`citedIntervals` (points fixes, dans `recomputeAll`) range l'héritage dans
`FunctionObject.inheritedInterval`, jamais sauvegardé, et `intervalDomainOf` le croise avec le
`sur` propre de g — calculs, refus de `g(−2)`, étiquette de la carte et tracé suivent ; le champ
de la carte garde ce que l'élève a écrit. `.résoudre g(x)=5` et `.résoudre f(x)+1=5` donnent
tous deux 2. `g(x) = f(2x)` (décision c) ou un héritage vide passent g en **erreur**, en français.
**e)** `.variations … dans [a;b]` inchangé. **f)** Dans « Sur le graphique » (`CurveSettings`),
une tangente hors de l'ensemble (une borne fermée est dedans) et une aire dont [a ; b] sort
sont refusées, le refus écrit sous le réglage (`tangentRefusal`, `areaRefusal`) ; `plot-sync`
ne les dessine pas (`allowedDisplay`). **g)** Le lien `?f=x^2 sur [0;+∞[` lit « sur »
(`atelierFromCurves`, `splitInterval`).

**Le tracé sur l'intervalle** (lot 3, I5) : `plotRestrictionOf` (`interval.ts`) convertit
l'ensemble en morceaux numériques (`π` → `3,14…`, `ℝ \ {0}` → deux morceaux ; borne non numérique
ou ensemble par conditions → courbe entière) ; `syncPlots` le pose sur la courbe
(`ExplicitFunction.restriction`, comparé par contenu pour rester idempotent). Le grapheur ne trace
que sur l'ensemble : point plein à une borne fermée, creux à une borne ouverte, rien à l'infini ni
là où f n'est pas définie (détail : [grapheur.md](grapheur.md)). `f′`, qui hérite, se trace
restreinte aussi.

**La réciproque** (lot 3 de [atelier-reciproque-phase0.md](../wip/atelier-reciproque-phase0.md),
R1-R4) : le bouton « Réciproque » de la carte d'une fonction et `.réciproque f [sur I]` donnent la
MÊME ligne (`reciprocalResult`, `src/lib/atelier/reciprocal.ts`) — réponse `f⁻¹(x) = …, f⁻¹ : départ
→ arrivée` (R4), étapes de `computeReciprocal` (R3, [mathast/reciproque.md](mathast/reciproque.md))
— et créent la carte `f⁻¹` (`createReciprocal`), sans changer de vue ; déjà là, elle est mise à
jour, pas doublée. L'intervalle : celui tapé après « sur » (rangé dans `reciprocalOn`) CROISÉ avec
l'ensemble de f, recroisé à chaque recalcul (f redéfinie n'est jamais écrasée) — vide : « f n'est
définie que sur [0 ; +∞[. » ; sinon l'ensemble de f, sinon son domaine. **`f⁻¹` tapé dans
Calcul** (décision (1) de David, 2026-10-13) : `f^-1`, `f^{-1}`, `f^(-1)`, `f⁻¹` écrits après une
FONCTION de l'atelier sont réécrits `f^{-1}` (`withReciprocalNotation`, en tête de `computeInput`),
que les deux parseurs lisent comme la réciproque (`isInverse`), puis **calculés à la volée comme
`f'`** : `expandDerivatives` (`engine.ts`) remplace le nœud par la formule de
`atelier.reciprocalOutcome(f)` — `f⁻¹(5)` sa valeur, `f⁻¹` seule la fonction (`.variations f⁻¹`,
`.dériver f⁻¹`, `.résoudre f⁻¹(x)=2`), `g(x) = f⁻¹(x)` une g qui suit f. Aucune carte requise ;
si la carte existe, son intervalle tapé (`reciprocalOn`) sert aussi, pour dire la même chose.
Refus (`reciprocalRefusalIn`) : f sans réciproque → celui de `.réciproque f` ; `f⁻¹(5)` hors de
l'ensemble de départ → celui de `f(5)` hors intervalle. `.variations` et `.résoudre` étudient sur
l'ensemble de départ de f⁻¹ (`citedReciprocalInterval`). Une g qui cite `f⁻¹` passe en erreur avec
le refus quand f cesse d'être bijective (`#underivable`). ⚠️ Calculer `f⁻¹` relit les autres objets,
dont g : une réciproque redemandée en cours de calcul est indisponible (`resolving`), l'objet qui la
cite est laissé de côté ; les formules sont gardées tant que l'atelier ne change pas (`formulas`, sinon cinq réciproques citées coûtaient 11 s). L'argument de `f⁻¹(…)` est vérifié sur l'arbre (`f⁻¹(g(2))`, `\left(…\right)`). Un nom à indice (`f_1⁻¹`) est refusé (garde de l'atelier, posée quand les parseurs y lisaient une puissance ; ils lisent `f_1(…)` depuis le 2026-10-15, la réciproque d'une fonction à indice reste à ouvrir) ; `f⁻¹(x) = 5x` aussi : elle se calcule, elle ne se définit pas. `g(x) = f⁻¹(x)` hérite de l'ensemble de DÉPART de f⁻¹ (`citedIntervals` reçoit `citedReciprocalInterval`), et l'empreinte du moteur (`atelierMark`) contient les ensembles : f qui change d'ensemble change g. En erreur, `g(4)` rend le message de g. L'inverse s'écrit `1/f(x)` ou `f(x)^-1` ; `x^-1`, `2^-1`, `a^-1` restent
des puissances. `.réciproque f⁻¹` répond « La réciproque de f⁻¹, c'est f. ». La carte **suit f** (`#reciprocals`, en
dernier dans `recomputeAll`) : formule rangée en texte (provenance `text`), `interval` = son
ensemble de départ f(I) (Q5 : le tracé et les calculs suivent, `ℝ` n'est pas rangé) ; f devenue
non bijective, constante… → la carte passe en erreur avec le refus, définition vide (rien de
tracé). Elle dépend de f seule (`#refsOf`) : supprimer f l'emporte, renommer f la renomme, sa
lettre est celle de f. Pas de « Dériver » ni de « Réciproque » sur `f⁻¹`, ni de « Réciproque » sur
`f′` (raison affichée : taper la formule). L'image `f⁻¹(5)` de la carte passe par sa formule (le
moteur lirait `f^-1` comme une puissance) ; de même l'image depuis la carte `f′` (le moteur lit
`f'(1)` comme la dérivée d'une fonction qu'il n'a pas : « Impossible de calculer f′(1) » jusqu'au
2026-10-14). `.réciproque a x + b` sans carte pour a, b : le refus de toute commande à paramètres
(« Le résultat dépend de a et b… ») ; sans x et à plusieurs lettres (`a t + b`) : « je ne sais pas
quelle lettre est la variable ». `dependsOnMessage` écrit les lettres grecques en symboles (α), et
ne propose pas `α = 2`, qui ne définit rien (lu comme un test d'égalité). **Droite y = x** (décision (3)) : grise
(`--color-muted-foreground`), en pointillés, tracée d'office par `syncPlots` quand f ET sa carte
`f⁻¹` sont tracées et sans erreur ; retirée dès que l'une est masquée, supprimée ou en erreur. Pas
une carte : elle n'existe que dans le grapheur, rien n'est sauvegardé. Une **expression** (`.réciproque 2x+3`) donne la ligne
seule, sans carte. **Paramètres** (cas 1 de David) : f cite des valeurs (`a x + b`, curseurs) →
la réciproque est jugée avec leurs valeurs actuelles, puis écrite avec leurs lettres quand le
solveur résout `y = a x + b` et que sa solution coïncide, valeurs remplacées, sur des points du
départ (`(x − b)/a`) ; sinon la formule garde les nombres (`a eˣ` → `ln(x/2)`, recalculée à chaque
cran). Un refus le dit avec les valeurs (« Pour a = 0 et b = 3, f est constante : pas de
réciproque. ») ; la ligne de Calcul dit avec quelles valeurs les étapes sont faites. Les refus
`not-bijective` citent leurs formules en `$…$` : Calcul et la carte les composent
(`FormulaText.svelte`, drapeau `formulas` de la ligne). Calculs mis en cache (64 entrées) :
`recomputeAll` refait la carte à chaque mutation.

**Provenance** (D10, `Provenance` dans `src/lib/atelier/parse.ts`) : c'est _d'où vient_ la
définition (champ MathLive, clavier, URL, collage, Calcul…) qui choisit le parseur, jamais son
contenu. Elle est rangée sur l'objet, parce que `recomputeAll` relit toujours la définition.

**État d'affichage hors sauvegarde** : les diagrammes de la vue Données (`chartOf`,
`toggleChart`), la liste partenaire choisie (`choosePartner`) et les lois retenues
(`rememberLaw`, `lawOf`) vivent dans l'`Atelier` mais pas dans `serialize()`.

### La grille (vue Données)

Tableur intégré, lot 1 (phase 0 : [atelier-tableur-phase0.md](../wip/atelier-tableur-phase0.md),
décisions de David du 2026-10-15 ; journal : [atelier-tableur-progress.md](../wip/atelier-tableur-progress.md)).
Une cellule est du texte brut ; une cellule qui commence par `=` est une **formule** (lot 2, phase
0 : [atelier-tableur-lot2-phase0.md](../wip/atelier-tableur-lot2-phase0.md), validée le
2026-10-15).

- **Formules** (`formula.ts`) : écrites comme une ligne de Calcul en texte (virgule décimale, `;`
  entre les arguments, jamais réparties vers le bas). `a2` est relu `A2` (`normalizeFormula`), mais
  `1e5` reste la notation scientifique (un `e` minuscule collé à un chiffre). Chaque référence
  (`A2`, `$A$2`) devient une marque `(ω_k)` avant la lecture — les parenthèses la gardent entière
  sous un exposant (`2^A1`, `2^-A1`) —, puis la valeur de la cellule la remplace dans l'arbre (le
  texte d'une valeur ne repasse jamais par le parseur). Les objets de
  l'atelier passent par `gridContext` (`engine.ts`), préparé une fois par recalcul : `f'`, `f⁻¹`,
  suites (`u(4)` ; une récurrence lit ses termes calculés, en décimal), valeurs et fonctions ; `f`
  hors de son ensemble donne le refus de Calcul (`outsideIntervalMessage`), contrôlé APRÈS le
  remplacement des valeurs de l'atelier (`=f(b)`), `f′` nommée avec ses primes ; rang d'une suite
  (« Le rang de u doit être un entier positif. ») ; une grandeur à unité citée est refusée (pas
  d'unités dans les cellules).
- **Calcul** (`computeGrid`) : parcours en profondeur (ordre, cycles), valeur EXACTE ; une cellule
  dont le calcul exact a pris plus de 20 ms rend ses dépendantes décimales (repli après coup : un
  calcul exact ne s'interrompt pas, mesuré) ; une valeur exacte plus longue que 24 caractères
  entre en décimal dans les formules qui la citent (`MAX_EXACT_CITED` : une colonne d'intérêts
  composés faisait grossir les fractions, et une racine de la dernière gelait l'onglet). `cellValue` rend `empty` (avec « A1 est vide. » pour
  une formule qui cite une case vide, T5), `number` (`shown` : l'écriture exacte si elle tient en
  12 caractères et n'a pas de lettres, sinon `≈` et 4 décimales — Q2 ; `latex` : l'écriture
  mathématique de la case quand elle est exacte et courte, `\frac` et non `\dfrac` ; `exactLatex` :
  l'écriture exacte complète, bornée), `word`, ou `error` (`label` « erreur » ou
  « cycle », la phrase dans `message` — Q-L2-1). Refus en français : formule illisible, mot cité,
  nombre non réel (`sqrt(-1)`, `i`), logarithme d'un nombre négatif ou nul, nom inconnu (« k n’est pas défini dans l’atelier : crée-le dans Mes objets (k = 2). », Q-L2-3),
  liste ou fonction citée comme un nombre, cellule hors de A1-Z200, division par zéro, cycle
  (« Cycle : A1 dépend d’elle-même (par B1). »), dépendance en erreur.
- **Recalcul ciblé** : à la fin de `recomputeAll` et après une saisie dans une colonne sans nom
  (`#recomputeGrid`). L'état précédent (`GridState` : valeurs, textes, empreinte de chaque objet)
  est gardé : seules les formules dont le texte, une cellule citée ou un objet cité (ou un objet
  qui en dépend) a changé sont refaites, puis celles qui les citent (`lastGridComputed` le compte).
  Un curseur glissé ne refait que les cellules qui le citent. Une colonne nommée à formules est une liste dont les valeurs
  sont celles des formules (`#formulaList` ; erreurs comptées dans `formulaErrors`, leurs lignes
  sans valeur). T2 : `update` refuse de modifier une telle liste (« L est calculée dans la grille… »),
  sauf quand c'est la grille qui écrit.
- **Vue** : la case compose `latex` en écriture mathématique (MathLive, `{@html}` après
  `isSafeLatex` — une formule peut venir d'un lien reçu ; rendu mis en cache par texte LaTeX),
  sinon `shown` (ou le mot court d'une erreur, en rouge) ; son étiquette pour lecteur d'écran est
  `shown`, en français (la lecture de MathLive est en anglais). La barre montre la formule ; sous
  la barre, la phrase de l'erreur ou de la case vide, et « Valeur exacte : … » quand la case montre
  `≈` d'une valeur exacte, ou une écriture exacte dont le texte lu est `≈` (`√2`, `π`) (Q2). La carte d'une liste à formules montre ses valeurs et « calculée
  dans la grille » (`studentDefinitionOf`). Supprimer une liste dont des cellules d'autres colonnes
  se videront (`citingCells` : en chaîne, sans celles déjà vides) demande confirmation : « 3 cellules de la grille la citent : elles
  deviendront vides. » (`citingCellsNote`). La copie vers un autre logiciel et le CSV
  emportent les VALEURS des formules ; la copie interne garde la formule.
- **Recopier** (§5) : `fillDown(zone)` recopie la première ligne de la zone sur les suivantes,
  un seul geste (T6) ; `shiftFormula` décale les références relatives, `$` les fige, une valeur se
  recopie telle quelle (pas de série devinée) ; une référence poussée hors de la grille devient
  `#HORS` (« Référence hors de la grille (après une recopie). »). Trois gestes (Q-L2-2) : Ctrl/⌘+D
  (une case seule reçoit celle du dessus), la poignée au coin de la zone (cases visées teintées),
  le bouton « Recopier vers le bas… » (« jusqu'à la ligne », pour la tablette). Le copier-coller
  DANS la grille décale aussi (Q-L2-4) : le presse-papiers propre à la grille porte la case
  d'origine (`{ origin, cells }`), et `pasteTable(…, origin)` décale sans deviner de titres ni
  refuser le « ; » d'une formule.
- **Lien** (§7) : `encodeAtelier` écrit les formules en relatif (`toRelative` :
  `=0,8*{0:-1}+$A$1`, `grid.relative`) ; `decodeAtelier` les réécrit AVANT le tri
  (`fromRelativeText`, sur les seules formules : un texte `{0:1}` tapé par l'élève reste tel
  quel), le plafond d'une cellule valant pour l'écriture rangée.
- **Atelier reçu** (T7) : `remapColumns` fait suivre à chaque référence, relative ou absolue, la
  colonne où la sienne a été placée ; une colonne non arrivée devient `#HORS`. Un objet renommé à
  l'arrivée (`f` → `g`) l'est aussi dans les formules reçues (`=f(3)` → `=g(3)`), jamais dans une
  référence de même lettre (`L2`) — sinon la formule calculait avec la `f` locale, sans rien dire.
- **Le « ; » d'une formule dans une colonne nommée** est rangé `⁏` (`FORMULA_SEMICOLON`) dans la
  définition de la liste, dont « ; » sépare les entrées — sinon `=max(1 ; A1)` était coupée en deux.
  Une cellule sans nom le range de même (`storedCellText` / `cellTextFromStored`) : une cellule
  rangée n'a jamais de « ; » (P2), et la formule était écartée au stockage et dans le lien.
- **Affichage** : une valeur exacte faite de chiffres (`3`, `2,5`, `1/3`) s'écrit en texte,
  comme un nombre tapé ; l'écriture mathématique est réservée à ce qui a des lettres (`√2`, `3π`).
  **Un décimal fini s'écrit en décimal** (lot 3, Q-L3-2) : `=-2+0,5` → `-1,5`, `=27/4` → `6,75`,
  calculé en entiers longs (`finiteDecimal`), jamais arrondi ; `1/3` et un décimal de plus de 12
  caractères (`1/1048576`) gardent leur fraction. La fraction se voit alors sous la barre (« Valeur
  exacte »), comme pour un `≈` — **seulement si le calcul contient une division** (décision de
  David du 2026-10-15, option 3). L'origine VOYAGE avec la valeur (`divided` de `CellValue`) : une
  formule exacte citée entre sous la forme de sa fraction (`=0,25` → 1/4), qu'on ne distinguerait
  plus d'une division écrite (revue). Une formule divise si son arbre AVANT injection en contient une
  (`ownDivision` ; développé seulement quand elle cite un objet, `f(x) = x/2`), si une case citée ou
  un appel divise (MOYENNE, écart type, médiane d'un nombre pair ; ARRONDI jamais ; les autres
  suivent leurs arguments). Une notation scientifique tapée (`1e-3`) s'écrit en clair
  (`plainDecimal`), pas en puissance négative :
  `=1/4`, `=6:8`, une MOYENNE, une case citée qui vient d'une division la montrent ; un décimal tapé
  (`=0,25`), une somme de décimaux, un ARRONDI (`=ARRONDI(PI();4)` ne montre plus 3927/1250), un
  `f(-1,5)` sans division la masquent. `shownExact` dit si la case montre déjà ce qui compte. Une
  valeur TAPÉE (sans `=`) s'écrit telle quelle (`1/4` reste `1/4`).
- **Tabuler** (lot 3, phase 0 : [atelier-tableur-lot3-phase0.md](../wip/atelier-tableur-lot3-phase0.md),
  validée le 2026-10-15) : `Atelier.tabulate({ name, from, to, step })` écrit, dans les deux
  premières colonnes libres, les abscisses (`-2`, `=A1+0,5`, `=A2+0,5`…) et les images (`=f(A1)`…),
  titrées `x` et `f(x)` (la lettre de l'élève : `t`, `f(t)`) — un tableau **vivant**, en un seul
  geste (T6). `planTabulation` (`tabulate.ts`) prépare et refuse, tout ou rien : pas ⩽ 0, fin avant
  le début, borne illisible ou vide, plus de 200 lignes, moins de deux colonnes libres, objet qui
  n'est pas une fonction ; une fonction en attente (`f(x) = k*x` sans k : la phrase de Calcul) et une
  réciproque `f⁻¹` (la grille ne sait pas encore l'appeler) ; une fonction à indice `f_1` se tabule
  depuis que le parseur lit `f_1(…)` comme un appel (2026-10-15). Un pas
  qui ne tombe pas juste s'arrête à la dernière abscisse ⩽ fin, et une note la dit telle que la case
  la montre (`12/7`). Tabuler deux fois écrit deux nouvelles colonnes (Q-L3-4). Valeurs par défaut
  (`tabulationDefaults`, Q-L3-3) : de −5 à 5 pas 1, ou les bornes d'un intervalle fermé `[a ; b]`
  (pas 1, ou (b − a)/10 arrondi à l'entier supérieur au-delà de 20 — jamais un pas flottant). `.tabuler f de -2 à 3 pas 0,5` (ou `.tabuler f`) passe par
  `tabulateCommand`, branchée avec les commandes qui lisent des NOMS (`SIMULATIONS` de
  `calcul.ts`) ; une expression sans nom est refusée avec la façon de faire (Q-L2-3). Le décor de
  son exemple (`exampleSetup: { 'f(x)': … }`) est posé par `stageExampleSetup` (`commands.ts`).
  **Depuis la carte** (PR 2) : « Tabuler » (retiré de `NOT_YET` ; grisé avec sa raison pour `f⁻¹`,
  `tabulationNotYet`) ouvre DANS la carte un formulaire « de / à / pas » pré-rempli par
  `tabulationDefaults`, comme le champ de l'image. Valider appelle `onTabulate` →
  `handleTabulate` (`AtelierContainer`) : `atelier.tabulate`, puis la vue passe sur Données
  (Q-L3-1), recréée (`{#key}`) avec la zone du tableau sélectionnée (`initialZone` de `DataView`,
  lue à la création ; deux colonnes non voisines → la première case seule, pour ne pas englober
  une colonne de l'élève). La zone ne vaut qu'à l'arrivée : `showView` la remet à `null`, un
  retour par l'onglet ne la resélectionne pas ; à l'arrivée, le focus passe à la grille
  (`onMount`), pour que Ctrl+Z et Entrée y agissent. Réussi, le formulaire se referme (une seconde
  Entrée n'écrit pas un second tableau) ; la phrase de `tabulationReport` (ou le refus) s'écrit
  dans une région `role="status"` de la carte, toujours présente, seule annonce, et s'efface dès
  que la grille change (`atelier.revision`, comme l'image). Refermer la carte referme le
  formulaire. Aucune ligne dans Calcul.
- **Fonctions du tableur** (lot 4, phase 0 :
  [atelier-tableur-lot4-phase0.md](../wip/atelier-tableur-lot4-phase0.md), validée le 2026-10-15) :
  une couche AVANT mathAST (Q-L4-1). `findCalls` (`grid-functions.ts`) repère les appels SOMME,
  MOYENNE, MEDIANE, MIN, MAX, NB, ECARTYPE (n − 1), ECARTYPEP (n) ; chacun devient une marque
  `(ψ_k)`, comme une case devient `(ω_k)`, et chaque argument est lu par la même lecture
  (`readBody`, récursive : `SOMME(MAX(A1:A4);1)`). Un argument est une plage (`A2:A21`, `A:A` = A1
  à A200, `readRange`), le nom d'une liste (sa colonne, Q-L4-3) ou une expression. Les cases vides
  et les mots d'une plage sont ignorés (Q-L4-2, exception à T5) — une case citée SEULE en argument
  (`=MIN(A1;A9)`) se lit comme une plage d'une case, comme LibreOffice ; une case en erreur la transmet
  (« A5 est en erreur. »). `computeFunction` rend l'ARBRE exact du résultat, en somme équilibrée
  (profondeur log₂ n : une somme de 200 cases écrite à la suite dépassait la garde de profondeur
  100 de mathAST et levait une exception) ; l'écart type calcule la moyenne UNE fois (recopiée dans
  chaque carré, l'arbre était en n² : 750 ms pour 200 cases). Dépendances : les cases des plages et la colonne d'une
  liste nommée (`deps`, `dependenciesOf`) entrent dans l'ordre de calcul, les cycles et le
  recalcul ciblé. Une plage hors d'une fonction est refusée (`=C1:C2` valait 0,6 en silence, `:`
  étant une division) ; mêlée à un calcul dans un argument aussi. Un nom inconnu en capitales
  (`MOYENE(`) dit les fonctions de la grille. `normalizeFormula` réécrit les noms en capitales sans
  accent (Q-L4-7) — `=max(1;2)` devient `=MAX(1;2)`. **`A:A` n'est une colonne qu'en argument
  direct d'une fonction** (`mapCallArguments`, `columnRangeOf`) : ailleurs, `=a:b` reste la
  division du collège, ni réécrite ni refusée (revue : elle devenait `=A:B`, refusée). En argument,
  `a:a` s'écrit `A:A` et suit les colonnes à la recopie et pour un atelier reçu
  (`mapColumnRanges`) ; `A2:A21` se décale comme deux
  références. `referencesIn` ne compte pas les plages (une plage qui se vide ne vide pas la
  formule). Une exception du moteur pendant le calcul d'une case devient l'erreur de cette case
  (`safely`), jamais celle de la grille. Mesuré : 600 formules à plages, 285 ms ; changer la case
  dont elles dépendent toutes, 250 ms.
- **Fonctions de calcul** (lot 4, PR 2) : ARRONDI, ENT, RACINE, ABS, LN, EXP, PI (`CALCULATION_ARITY`,
  nombre d'arguments fixe, refus nommé). RACINE, ABS, LN, EXP et ENT deviennent l'appel de mathAST
  (`sqrt`, `abs`, `ln`, `exp`, `floor`) : mêmes refus que Calcul. ARRONDI arrondit la moitié LOIN
  DE ZÉRO (−2,5 → −3, comme LibreOffice), en entiers longs quand x est une fraction (2,675 → 2,68,
  là où les flottants donnent 2,67), et accepte n < 0 (`ARRONDI(1234;-2)` = 1200). n est borné à
  ±15 (`MAX_ROUNDING_DIGITS` : `ARRONDI(1/3;1000000)` gelait l'onglet) ; sur un flottant (π, √2),
  un résultat de plus de 15 chiffres significatifs est approché, jamais présenté comme exact. Leurs arguments
  sont des nombres : une plage est refusée, et une case vide citée laisse la formule vide (T5), à
  l'inverse des statistiques. `=racine(4)`, `=exp(1)` s'écrivent `=RACINE(4)`, `=EXP(1)` ; `sqrt`
  reste lu. **L'aide sous la barre** (`functionHint`) : pendant la frappe, la forme de la fonction
  dont on écrit les arguments (la plus intérieure), ou celles dont on écrit le nom (`=ECART`, trois
  lettres au moins, ou un nom entier de deux : LN, NB, PI — `=A1*ab` n'ouvre pas ABS) ;
  liée à la barre par `aria-describedby`, jamais annoncée à chaque frappe.
- **Conditions et texte** (lot 4, PR 3, Q-L4-5) : SI et NB.SI. Un texte entre guillemets droits
  (`"fille"`) ne s'écrit qu'en branche de SI, en critère de NB.SI ou dans une condition ; ailleurs
  il est refusé (`TEXT_ALONE_MESSAGE`), et un guillemet non fermé aussi. Les comparaisons (`<`, `>`,
  `<=`, `>=`, `=`, `<>`) ne s'écrivent que dans la condition de SI (`splitComparison`) ; hors de SI,
  refus (`COMPARISON_ALONE_MESSAGE`, au lieu de « pas un nombre réel »). Un côté de la condition est
  un texte, une case (son mot se compare : `B2="fille"`) ou une expression ; un mot ne se compare
  qu'avec `=` ou `<>`, sans tenir compte des majuscules (`compare`). Une case vide dans la condition
  laisse la formule vide (T5 : recopiée sous les données, elle n'écrit rien). Seule la branche
  choisie est calculée ; un mot rendu par SI fait de la case une case de mots si la formule n'est
  que l'appel (`alone`), sinon refus. NB.SI compte les cases non vides d'une plage (ou d'une liste
  nommée) qui vérifient le critère : un mot, un nombre, ou une comparaison écrite en texte
  (`">=10"`, `"<>0"`, virgule décimale comprise, `criterionOf`). Les guillemets protègent leur texte
  partout (`outsideQuotes`) : ni recopie, ni capitales (`"a1"` reste `"a1"`), et un `;` ou une
  parenthèse dedans ne coupe rien. **Calcul** renvoie vers la grille (Q-L4-6,
  `gridFunctionInCalcul`) : `somme(L)` → « SOMME est une fonction de la grille… tape .stats L »,
  `racine(2)` → « …dans Calcul, écris sqrt(…) ». Le renvoi repère aussi un APPEL de fonction de la
  grille que le moteur ne signalait pas (`gridFunctionCalledIn`) : `mediane(L)` était recopié sans
  être calculé, `médiane(L)` lu « Fonction inconnue : diane » (2026-10-15) ; `max`, `min`, `abs`,
  `ln`, `exp`, que Calcul connaît, restent des calculs, comme un nom de deux lettres sans point
  (`nb(…)`, `si(…)` : des produits, la règle de `readFunctionCall`). `pi` en lettres est refusé dans la grille
  comme dans Calcul (`PI_IN_LETTERS`, `names.ts`, décision de David du 2026-10-06), et dans la
  grille en toutes casses (`=PI`, `=Pi`) hors des guillemets ; `PI()` et `π` restent lus. `plainSyntax` ramène au tableur les guillemets
  courbes ou français (`“fille”`, `«fille»` : la ponctuation intelligente de l'iPad) et `≤ ≥ ≠` ;
  la barre et les cases ont `autocorrect="off"`. Le critère de NB.SI peut être une case seule, dont
  le mot compte (`=NB.SI(B$2:B$30;B2)`).
- **Le hasard** (lot 5, phase 0 : [atelier-tableur-lot5-phase0.md](../wip/atelier-tableur-lot5-phase0.md),
  validée le 2026-10-15) : `ALEA()` (dans [0 ; 1[, approché) et `ALEA.ENTRE.BORNES(a ; b)` (entier
  exact ; a ⩽ b entiers sûrs, au plus un million d’issues, sinon refus). Un tirage ne dépend que de la **graine**
  de l'atelier (`gridSeed`), de l'adresse de la case et du rang de l'appel dans sa formule
  (`drawOf`, `occurrence` fixé à la lecture) : ni de l'ordre de calcul, ni des autres cases ; écrire
  ailleurs, recharger, réécrire la case à l'identique ne le changent pas (T8, Q-L5-5).
  `Atelier.relaunch()` change la graine : les formules à hasard (`random`, même emboîté) et ce qui
  les cite se recalculent (`GridState.seed`, `spreadDirty`). La graine est rangée (`grid.seed`,
  bornée par Zod) seulement si une case tire au hasard, et voyage dans le lien (Q-L5-4). Dans Calcul,
  `alea()` renvoie vers la grille. **Le bouton « Relancer »** (PR 2, Q-L5-2) est à côté de la barre,
  seulement s'il y a des cases à hasard (`randomCells`) ; F9 fait de même tant que la vue Données
  est là (`svelte:window`), et une région `role="status"` annonce « Nouveaux tirages : N cases. ».
  « Relancer » est un geste de la grille (`GridGesture.seed`) : Ctrl+Z retrouve les tirages d'avant,
  Ctrl+Y ceux d'après (Q-L5-3) ; après un clic, le focus revient à la grille pour que Ctrl+Z y
  agisse. F9 maintenu (répétition) ou avec Ctrl/⌘/Alt ne relance pas : l'historique (100 gestes) ne
  se vide pas de tirages. Garder un atelier reçu qui tirait au hasard refait ses tirages (la graine
  reste la nôtre) : le rapport le dit si des cases à hasard ont vraiment été écrites
  (`MergeReport.redrawn`, d'après `randomCells` avant et après).
- **Mise en forme** (reprise de V4, phase 0 :
  [atelier-tableur-mise-en-forme-phase0.md](../wip/atelier-tableur-mise-en-forme-phase0.md), validée le
  2026-10-18) : gras, italique, alignement, couleur du texte et du fond (6 couleurs du thème), format
  de nombre (décimales 0 à 6, pourcentage, monnaie). Rangée PAR ZONE (`FormatZone`, `#formats` de
  l'`Atelier`) sous forme CANONIQUE après chaque geste (`normalizeFormats`) : des rectangles qui ne
  se chevauchent pas, chacun d'un style résolu non vide — effacer toute la grille laisse `[]`, un bloc
  collé redevient un rectangle, un geste sans effet n'est pas noté (`sameFormats`). Revue de la PR 1 :
  les zones s'empilaient (400 par collage, « Effacer » refusé au plafond, lien trop long). `false`/
  `null` d'un patch ramène au défaut (`CLEAR_PATCH`). Elle ne change que l'AFFICHAGE (`formatShown`,
  `Intl.NumberFormat` fr-FR, moitié loin de zéro, jamais `-0,00`) : une formule cite la valeur. Une
  case vide se met en forme d'avance ; la vider garde sa mise en forme. Un geste de la grille
  (`GridGesture.formats`, Ctrl+Z) ; la recopie et le copier-coller interne l'emportent (`patchOf`,
  Q-MF-4), et sont refusés ENTIERS si elle dépasserait le plafond (jugé avant d'écrire). Rangée dans
  `grid.formats` (Zod, une forgée écartée seule, au plus 500 relues ; au-delà de 500 zones
  canoniques, la plus longue partie qui tient, signalée dans le rapport) et dans le lien (Q-MF-5).
  Un style s'écrit dans un ordre fixe (`canonicalStyle`) ; « Effacer » passe même au plafond
  (`isRemoval`). Un
  atelier reçu : ses zones suivent leurs colonnes (T7) ; une colonne qui n'a QUE de la mise en forme
  arrive s'il reste des colonnes libres (rangée avec les autres, de gauche à droite), sans jamais
  faire refuser la fusion ; la fusion est un seul
  geste (`asOneGesture`). Plafond : 500 zones canoniques. Mesuré : un style sur toute la grille, 2 ms.
  **À l'écran** (`DataView.svelte`, PR 2) : une barre « Mise en forme » sous la barre de formule
  (`role="group"`, passe à la ligne sur téléphone) pose sur la ZONE sélectionnée gras, italique
  (aussi Ctrl/⌘+B, +I), alignements (un bouton enfoncé ramène au défaut), couleurs du texte et du
  fond, format de nombre et décimales (`MySelect`, nom annonçant la valeur choisie), « Effacer la
  mise en forme ». Les boutons suivent la case active (`aria-pressed`) ; le focus revient à la
  grille après chaque geste, pour que Ctrl+Z y agisse ; les choix sont liés par fonctions
  (`bind:value={get, set}`) : un choix refusé au plafond n'est pas affiché comme posé. Rien n'est
  posé pendant une frappe refusée (le refus reste). Ctrl+Maj+B et la touche maintenue sont ignorés. La case montre `formatShown` à la place de
  l'écriture LaTeX ; sous la barre, « Valeur exacte » reste visible quand un format arrondit
  vraiment (`formatRounds` : `0,33` → 1/3 ; pas pour `2,00`). Le style passe en variables CSS (`--texte`, `--fond`) : la teinte de la
  sélection se pose PAR-DESSUS le fond. Couleurs (`cell-colors.ts`) : les `--color-fig-<nom>` du
  thème, adoucies (texte tiré vers `--color-foreground`, fond en teinte de 14 %, en sombre sur
  `#1f1f1f`) — telles quelles, rouge sur fond jaune tombait à 3,3 en sombre ; `cell-colors.test.ts`
  mesure toutes les paires des couleurs de mise en forme (≥ 4,5, sélection comprise, clair et sombre ; le texte d'une erreur garde `--color-destructive`, hors de cette mesure). Le presse-papiers interne
  (`application/x-chiphre-grille`) porte `styles` (le style résolu de chaque case, `{}` = défaut),
  validé par `stylePatchSchema` et ignoré s'il n'a pas la forme du tableau ou pas d'origine valable
  (une ligne de titres devinée les décalerait).
- **Fonction à indice** (`=f_1(3)`) : depuis le 2026-10-15, les parseurs lisent `f_1(3)` comme
  un appel de f_1 quand `f_1` est déclarée (avant : `f₁ × 3`, et la grille calculait avec f, sans
  rien dire — revue du lot 3). La grille rend donc la valeur de f_1, et Calcul l'évalue aussi ;
  `.tabuler f_1` marche. `f_1` cité sans valeur (`=2f_1`) reste l'indice `f₁` : la grille le refuse
  en donnant la bonne écriture (`indexedFunctionMessage` : « écris-la avec une valeur, par exemple
  f_1(3) »).
- **Oracle** : `formules.test.ts` compare, sur un corpus, la valeur d'une cellule `=expr` à celle de
  Calcul pour `expr`.

- **Une liste est une colonne nommée** (T1). Ses cellules sont les entrées de sa définition, une
  par ligne : `12 ;  ; 15` = la ligne 2 est vide (`entriesOf`, `definitionFrom`, `grid.ts`). Les
  colonnes **sans nom** gardent leurs cellules dans l'`Atelier` (`cells`, rangées). **Chaque
  cellule a un seul propriétaire** : la liste de sa colonne, ou la grille.
- **26 colonnes (A-Z) × 200 lignes** (`GRID_COLUMNS`, `GRID_ROWS` = `MAX_LIST_VALUES`), une
  cellule de 200 caractères au plus (`MAX_CELL_LENGTH`).
- **Une cellule se lit comme une entrée de liste** (`readListValue` : `1,5`, `1.5`, `1/6`, sinon un
  mot) ; une entrée vide n'est pas une valeur ignorée. Un texte avec « ; » se **répartit vers le
  bas** (P2, `spreadText`).
- `editCells` écrit un geste entier, tout ou rien : hors de A1-Z200, trop long, au-delà de la
  ligne 200, ou une colonne nommée dont la définition dépasserait `MAX_DEFINITION_LENGTH` (elle
  serait écartée au rechargement, cellules comprises ; `nameColumn` refuse de même) → refus, rien
  n'est écrit. Un geste sans effet ne compte pas (sinon « Annuler » une suppression deviendrait
  impossible). Une colonne nommée est réécrite par `update` (la liste garde sa colonne) ; une
  colonne sans nom fait seulement monter `revision`. Un « ; » final n'écrit rien en dessous.
- **Créer une liste** (« + Liste », `L = …` dans Calcul, `.simuler`, `.filtrer`, « Garder ») prend
  la **première colonne libre** (ni liste, ni cellule, ni titre) ; aucune → « La grille est pleine : vide une
  colonne pour créer une liste. ». `nameColumn` fait d'une colonne remplie une liste (refus de nom
  d'aujourd'hui, `MAX_LISTS`) ; `unnameColumn` supprime la liste (cascade) et **garde les
  cellules** et le titre, annulable par `undoRemoval`. Supprimer la liste depuis sa carte **vide sa
  colonne**, titre compris (T3).
- **Titres de colonnes** (T4) : texte libre de 40 caractères au plus (`MAX_TITLE_LENGTH`),
  `titleOf` / `setTitle`, de toute colonne, nommée ou non ; rangés (`grid.titles`, par lettre),
  suivent la fusion. Une colonne DEMANDÉE (relecture, fusion, nommage) peut porter un titre ; la
  recherche d'une colonne libre les évite.
- **Coller** (`pasteTable`, `readTable`) : lignes puis tabulations (LibreOffice, Excel, Google
  Sheets, page web) ; sans tabulation, des « ; » sur chaque ligne d'un texte de plusieurs lignes
  séparent des colonnes ; cases entre guillemets d'Excel comprises (un guillemet jamais fermé n'en
  est pas un) ; lignes vides en tête et en fin ignorées. Une première ligne de mots
  au-dessus de nombres devient les titres (`hasTitleRow`). Posé à partir du coin de la zone
  sélectionnée, tout ou rien ; un tableau qui déborde de A1-Z200 est refusé **entier**, avec sa
  taille (« 250 lignes à partir de la ligne 1 : la grille en garde 200. Rien n’a été collé. »).
  Une case **seule** collée avec « ; » se répartit vers le bas (P2, comme tapée) ; dans un tableau,
  une case avec « ; » refuse le collage en la citant (la relire `3,4` en ferait un faux nombre) ;
  un titre de plus de 40 caractères aussi (jamais tronqué). Les retours à la ligne d'une case
  deviennent des espaces.
- **Copier** (`tableText`) : la zone en tabulations et lignes pour les autres logiciels, et ses
  textes **exacts** sous le type `application/x-chiphre-grille`, que le collage dans la grille
  préfère (`1/3` reste `1/3`) ; **télécharger**
  (`csvText`, bouton « Télécharger en CSV », désactivé avec sa raison sur une grille vide) : « ; »
  entre les cases, titres en tête, CRLF, marque UTF-8. Les deux passent par `exportText` : un
  nombre sort en décimal à virgule (`1/4` → `0,25` ; un tableur lirait `1/4` comme une date) ; un
  mot qui commence par `=`, `+`, `-`, `@` est précédé d'une apostrophe (injection de formule : une
  grille peut venir d'un lien reçu).
- **Annuler dans la grille** (T6, exception à D6 limitée à la grille) : `undoGrid` / `redoGrid`,
  Ctrl/⌘+Z et Ctrl/⌘+Maj+Z (ou Ctrl+Y) sur une cellule, boutons « Annuler » / « Rétablir »
  (désactivés avec leur raison). Un geste = une saisie, un collage (cases et titres ensemble), un
  effacement de zone ou un titre ; `MAX_GRID_UNDO` (100) gestes, pas rangés. Une case changée
  ailleurs depuis (carte, `L = …`) refuse l'annulation et oublie l'historique — jamais par-dessus ;
  relire un atelier l'oublie aussi. Nommer ou supprimer une liste reste un geste d'objet, avec son
  propre « Annuler ». **Le geste le plus récent s'annule d'abord** : une suppression de carte (ou
  un retrait de nom) ferme l'historique de la grille — annuler un geste plus ancien changerait la
  révision, et la suppression ne pourrait plus s'annuler. Ctrl+Z ne s'arrête à la cellule que si
  la grille a de quoi annuler ; sinon il remonte à l'atelier (dernière suppression de carte). Une
  case écrite deux fois dans un geste compte une fois (la dernière écriture).
- **Deux colonnes ensemble : par LIGNE** (P1, `pairs.ts`). Une liste sait la ligne de chacune de
  ses valeurs (`rows`, lu par `parseDefinition`). Nuage (carte et tracé, `plot-sync`), ajustement
  (carte et `.ajustement L : M` / `.stats` à plusieurs listes dans Calcul), effectifs (« Statistiques
  avec effectifs », diagramme) et tableau croisé (`.croiser` et son bouton) prennent les lignes où
  chaque liste a une valeur (`commonRows`) et disent « N lignes incomplètes écartées » ; refus
  seulement s'il n'en reste aucune (« L et M n’ont aucune ligne remplie en commun. », la même
  phrase au bouton désactivé et au clic, `noCommonRowsMessage`). Par rang, une case vide décalait
  toutes les paires suivantes. Dans Calcul, seule la forme `A : B` (une liste de chaque côté)
  s'apparie : `.stats L ; M` RÉUNIT deux séries, rien n'y est écarté ; l'écho reste ce qui a été
  tapé. `.croiser` qui écarte une ligne ne propose pas la piste `.filtrer` (qui la refuserait).
  Une **loi** (`.simuler`, `.fréquence`, `.échantillons`, « Loi avec probabilités ») n'écarte pas :
  une valeur sans probabilité sur sa ligne refuse, en citant la ligne (`lawMismatchMessage`).
  `.filtrer` garde son refus d'une liste trouée (« L'entrée n° 2 de L est vide… »).
- `cell`, `titleOf`, `listAt`, `columnOf`, `usedExtent` (zone utilisée), `freeColumns` : ce que
  lit la vue.
- La vue (`DataView.svelte`) : barre de cellule (adresse, contenu brut, modifiable), clavier de
  tableur (Entrée, Tab, Échap, flèches, F2, Suppr ; taper remplace), **zone** sélectionnée par Maj
  - flèche, Maj + clic ou glisser (Suppr la vide, Ctrl/⌘+C la copie, Ctrl/⌘+V colle à son coin),
    zone utilisée + 10 lignes et 3 colonnes (au moins 10 × 5), en-tête « nommer » / nom de liste
    « × » et titre, aperçu de chaque liste sous son en-tête, diagrammes sous la grille. La validation
    (pas la frappe) recalcule ; changer de cellule pendant une frappe la valide (une frappe refusée
    est abandonnée, son refus reste affiché). Coller dans la barre ou pendant une frappe un texte
    d'une seule case l'insère au curseur, comme un champ. ⚠️ Safari n'envoie `paste` (et `copy` sans texte sélectionné) qu'à un
    champ : Ctrl/⌘+V ou C sur une cellule donne le focus, le temps du geste, à un champ hors de
    l'écran (`relay`) ; une touche relâchée y rend le focus à la cellule (Ctrl sur Mac n'envoie ni
    `copy` ni `paste`).
- **Calcul ne lit pas une cellule** (Q1) : un calcul qui échoue et cite `B2` répond « B2 est une
  cellule de la grille : nomme sa colonne pour t’en servir. » (`cellCitedIn`, `calcul.ts`).

### Ce que fait la classe `Atelier`

- **créer** : `create` (+ `createDerivative` pour `f′`, `createReciprocal` pour `f⁻¹`,
  `createFromOffer` pour un curseur) ;
- **modifier** : `update`, `rename` (réécrit les définitions qui citent l'ancien nom),
  `setSlider`, `slideTo`, `setSequence`, `setDisplay`, `setSequenceDisplay`, `setPlotted` ;
- **supprimer** : `remove`, `removalOf`, `removeWithDependents`, `undoRemoval` ;
- **dépendances** : `dependents` ; toute mutation finit par `recomputeAll` (relit tout) ;
- **grille** : `cell`, `editCells`, `pasteTable`, `titleOf`, `setTitle`, `nameColumn`,
  `unnameColumn`, `undoGrid`, `redoGrid`, `gridHistory`, `listAt`, `columnOf`, `usedExtent`,
  `freeColumns` ;
- **sauvegarde** : `serialize`, `restore` ; `revision` est le **seul** signal « quelque chose a
  changé » (la session l'écoute pour enregistrer).

### Commandes

La vue Calcul a **un seul champ**, comme l'ancienne `/cas` : ce que l'élève tape est une **définition** (crée
ou met à jour un objet), un **calcul** (une ligne d'historique) ou une **commande** (commence par
un point ; sans point en écriture mathématique, voir « Réglages et écriture mathématique »).
`runInput` (`src/lib/atelier/calcul.ts`) rend un `CalcResult` de kind `vide`,
`definition`, `calcul`, `commande` ou `refus`.

**La ligne d'une définition dit ce que dit la carte** (`definitionText`, `desk.svelte.ts`,
décision de David du 2026-10-13) : « « f » est dans tes objets. » seulement si la carte n'a pas
de message ; en erreur, « « h » est dans tes objets, mais elle est en erreur : » + le message de la
carte, et la ligne est en échec (`failed`) ; en attente, « « p » est dans tes objets, en attente
de « q », qui n'est pas encore défini. », sans échec. Au rejeu, une définition en échec n'arrête
pas (un export d'avant la disait réussie).

**Un objet en erreur ne sert à rien** (V58, décision de David du 2026-10-14). Le moteur ne lie
pas un objet en erreur (`syncEngine`) : il prenait son nom pour une lettre, et sur
`f(x) = f(x)+1` (statut `error`) `.dériver f` répondait `d/dx(f) = 0`, `.intégrer f` ½f².
Une seule garde, `brokenObjectRefusal` (`calcul.ts`), pour **toute commande** (sauf les
simulations, qui lisent des noms de listes) et **toute ligne de calcul** (`f(2)`, `f'(2)`,
`a+1`). Deux refus :

- la **ligne de l'objet** est fautive (illisible, circulaire, fonction citée comme un nombre :
  `Atelier.isMiswritten`) → _« f » est mal définie (sa ligne est en erreur) : corrige sa
  définition d'abord._ (_mal défini_ pour une valeur) ;
- l'objet est en erreur **à cause d'un autre** (`g(x) = f(x)+1`, propagation de `recomputeAll`),
  d'une `f⁻¹` impossible, ou de ce que l'atelier ne sait pas encore faire → le nom, deux-points,
  puis le message de sa carte : _g : Dépend de « f », qui est en erreur._

Les **définitions** ne passent pas par la garde : c'est en redéfinissant f qu'on la corrige.
Exceptions : les cartes `f′`, `f⁻¹` (leurs refus disent pourquoi la dérivée ou la réciproque
manque). Les **boutons de la carte** sont désactivés avec le message de la carte (`blockedBy`,
`actions.ts`), et `runAction` le rend aussi (`expressionOf` refuse un objet qui n'est pas « ok »).

**Syntaxe** : voir [atelier-syntaxe.md](atelier-syntaxe.md) — mots-clés français (`de … à`,
`pour`, `en`, `ordre`, `dans`, `et`), noms et mots-clés sans accent acceptés, ancienne écriture
acceptée quand elle est sans ambiguïté. La lecture vit dans `mathAST` :
`readCommandArguments`, `isKeywordCommand`, `guessedVariable` dans
`src/lib/mathAST/cli/core/variable-argument.ts`.

**Fonction usuelle sans parenthèses : refusée partout** (V59, 2026-10-14). `ln x`, `sin x`,
`cos x`, `tan x`, `exp x`, `sqrt x`, `log x` (et `sin^2 x`, `log_2 x`) se lisaient l·n·x, s·i·n·x :
une ligne de calcul rendait `l n x`, `.évaluer ln x en x=1` réclamait « les valeurs de l et n ».
`bareFunctionRefusal` (`variable-argument.ts`, même motif `BARE_FUNCTION` que
`bareFunctionName`) rend un refus qui CITE le fragment tapé et propose la forme parenthésée :
« « ln 2x » : écris ln(2x) avec des parenthèses. » ; l'argument est cité tel quel (`sin π` → `sin(π)`, `ln |x|` → `ln(|x|)`, `ln -x` → `ln(-x)`) et, sans argument lisible (`ln + 1`), la forme est `ln(…)`.
Trois appels : `computeInput` (ligne de calcul ET définition `f(x) = ln x`, refusée avant
qu'aucun objet ne soit créé), `runCommand` sur l'argument de toute commande sauf les simulations
(qui lisent des noms de listes) — il devance donc les refus `bareFunctionName` des commandes du CLI
et de `.limite` —, et `parseDefinition` (la carte : un `ln x` sans antislash venu de MathLive).
Une liste `L = sin; cos; ln` n'est pas concernée, ni sur la ligne ni sur la carte (`isSemicolonList`). `ln\left(x\right)`, ce qu'écrit MathLive pour `ln` tapé lettre à lettre puis une parenthèse, se lit ln(x) : `withLatexFunctionNames` (`parse.ts`) ajoute l'antislash devant `sin`, `cos`, `tan`, `ln`, `log`, `exp`, `sqrt` suivis de `\left(`, sur la ligne et sur la carte. Refusé même si les lettres sont posées (`l = 2` puis `ln x`) : c'est presque toujours une erreur.
**Fonction usuelle COLLÉE à son argument : refusée aussi** (décision de David, 2026-10-14).
`lnx`, `sinx` (s·i·n·x, i pris pour l'imaginaire), `cosx`, `expx`, `sqrtx`, `logx`, `ln2`,
`ln2x`, `sin2x`, `ln2,5`, `sinθ` se lisaient en produits de lettres. `GLUED_FUNCTION`
(`variable-argument.ts`, appelé par `bareFunctionRefusal`, donc aux trois mêmes endroits) : le
nom suivi d'une lettre ASCII seule, ou d'un nombre et d'au plus une lettre (ASCII, grecque ou π :
`sin2π`, `cos2θ`), puis d'une fin, d'une espace, d'un opérateur (`^`, `²`, `³` compris : `sinx^2`,
`sinx²`), d'un délimiteur fermant ou d'un antislash (`\cdot`, `\right`). Le refus cite le
fragment : « « sinx » : écris sin(x) avec des parenthèses. », « « ln2x » : écris ln(2x)… ». Un
nombre suivi d'une parenthèse ou d'une autre commande LaTeX (`ln2(x)`, `cos2\pi`, `ln2\sqrt{x}`)
reçoit la forme neutre « « cos2 » : écris cos(…) » : cos(2) aurait un autre sens. Une lettre
grecque collée au nom seul (`sinθ`) passe par le refus de `ln x` (`BARE_FUNCTION`), qui la cite.
`cost` est refusé (cos(t)) : voulu, même si c, o, s, t sont posées, comme `cos x`. Non visés :
`sinus`, `lnxy`, `costume` (plus d'une lettre), `sinh`, `cosh`, `tanh` (hyperboliques : `sinh(x)`
se lit bien), un nom précédé d'un MOT (`explnx`, `arcsinx` : toujours des produits) ou d'un
`\operatorname{…}` ; précédé d'une lettre seule, d'un nombre ou d'une puissance, il est refusé (`xlnx`, `2xlnx`, `x^2lnx` → « lnx ») : une lettre seule devant est lue comme un coefficient, donc `asinx`, `acosx`, `atanx` sont refusés en « sinx » (a·sin(x)), pas lus arcsin. `log` suivi de chiffres ne propose pas d'argument : « « log2 » : écris log(…) avec des parenthèses ; log est le logarithme décimal. En base 2 : log_2(…). » (sans la dernière phrase pour `log10`), aussi devant une parenthèse (`log10(100)`, `log2(8)`). Le `{` seul ne l'arrête pas : `e^{lnx}`, `\frac{lnx}{x}` sont refusés. Le
CLI (`bareFunctionName`) ne change pas : `cost + lnx` y reste lu en produit, l'atelier le devance.
Restent lus : `ln(x)`, `2 ln(x)`, `\ln x` (LaTeX du clavier MathLive), `l n` (produit écrit avec
une espace), `st` avec s et t posées, `s(3)` d'une fonction `s` de l'élève. Effet de bord :
`.taylor sin ordre 5` (le raccourci par le nom seul, que l'atelier ne lisait déjà pas — « Plusieurs
lettres ») est refusé aussi. Test : `src/lib/atelier/__tests__/fonction-sans-parentheses.test.ts`.

**Trois sources de commandes**, réunies par `commandCatalog` (`src/lib/atelier/commands.ts`) :

| Source                     | Où                            | Exemples                                                                             |
| -------------------------- | ----------------------------- | ------------------------------------------------------------------------------------ |
| registre du moteur         | `WebReplEngine.getCommands()` | `.dériver`, `.résoudre`, `.intégrer`, `.variations`, `.taylor`                       |
| branchées hors registre    | table `OFF_REGISTRY`          | `.convertir`, `.stats`, `.ajustement`, `.exact`, `.décimal`                          |
| servies par l'atelier seul | `ATELIER_ONLY_COMMANDS`       | `.factoriser`, `.développer`, `.réciproque`, `.limite`, `.simuler`, `.croiser`, lois |

La table `TRANSLATIONS` donne pour chaque commande son nom français, sa description, son exemple
et sa rubrique de `.aide` (`HelpSection`) ; **son ordre est l'ordre du catalogue**. Les commandes
anglaises continuent de marcher (le registre est partagé avec le REPL de mathAST, `pnpm math`). Sept commandes du
moteur **n'existent pas dans l'atelier** (`ENGINE_COMMANDS_LEFT_OUT` : `let`, `def`, `clear`,
`unset`, `undef`, `inv`, `def'` — décision de David, 2026-10-13) : elles écriraient des noms dans le
moteur, alors que les noms se créent dans le panneau. Hors du catalogue, tapées en entier, elles
répondent comme toute commande inconnue. `.auto` (bascule du mode de saisie de l'ancienne `/cas`,
retirée du moteur le 2026-10-13) n'est pas au catalogue non plus.

Chemin d'une commande dans `runCommand` (`calcul.ts`), dans cet ordre :

1. `resolveCommand` + recherche dans le catalogue ; inconnue → refus avec au plus deux
   suggestions (`suggestFor`) ;
2. on exécute le **nom canonique**, jamais le raccourci tapé (`.s` = simplifier, pas solve) ;
3. `.aide`, `.mode`, `.exact`, `.décimal`, `.valeurs`, `.fonctions` : traités par l'atelier, en
   français (`.valeurs` et `.fonctions` listent les CARTES du panneau, `src/lib/atelier/listing.ts`,
   pas l'état du moteur) ; `.exporter` suivi d'autre chose : refus ; `.latex` et
   `.texte` sans expression : refus (garde née de la bascule du mode de saisie de `/cas`, qui
   faisait lire de travers tous les calculs suivants ; la bascule est retirée du moteur depuis le
   2026-10-13, et sans expression la commande du registre reprendrait la dernière expression du
   moteur) ;
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
  le rappel ; il revient au rechargement avec les lignes (les 100 dernières saisies tapées), et rien
  n'est rappelable après un rejeu ;
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
plus `{1/3}\pi`) — y compris dans le texte brut du moteur.

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
message seul, puis on le remplace dans la sortie et, échappé, dans le HTML du moteur : traduit sur
le HTML final, il avalait des balises et réécrivait la saisie recopiée (revue). Les parseurs gardent leurs messages (une cinquantaine
de tests les vérifient). Une sortie d'erreur VIDE reste vide : l'atelier y répond « Je n'ai pas
su lire… ». Les refus de `.intégrer`, eux, sont écrits en français **à la source** (intégrateurs,
`integrate.command.ts`), comme le reste du moteur d'intégration (V61) : `1/(x^2+a^2+1) de 0 à 1`
→ « Je ne sais pas factoriser le dénominateur : je ne peux pas calculer cette intégrale » (avant :
« Unable to factor denominator »), « Technique tentée : décomposition en éléments simples ».

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
`SHOWN_FUNCTIONS` (tokenizer) et `GREEK_LETTERS` (variantes exceptées), insérées en symbole — pas l'ancien
module de complétion de `/cas` (retiré avec elle), qui insérait `\alpha`. Rien dans le nom d'une commande (liste des
commandes), ni dans une saisie en LaTeX (`\frac{co`). Pas de nom du panneau : un nom d'objet fait une lettre. Clavier : ↑ / ↓
surlignent, **Tab ou un clic insère**, **Entrée calcule** même liste ouverte (`3ta` = 3·t·a, décision
de David), Échap ferme jusqu'à la frappe suivante. Garde : chaque proposition, tapée dans un calcul,
est acceptée par Calcul (`completion.test.ts`).

**Actions de carte** : `actionsFor` (`src/lib/atelier/actions.ts`) donne par type les actions
(fonction : Tracer, Dériver, Réciproque, Tabuler, Résoudre f(x) = 0, Variations ; suite : Premiers termes ;
liste : Statistiques, diagrammes, nuage, ajustement, loi — par liste partenaire). Une action qui a
un sens pour le type mais pas pour cet objet reste **visible, désactivée, avec sa raison**
(`disabledReason`). Le clic passe par `CalcDesk.runFromPanel` : il **écrit une ligne dans
Calcul sans changer de vue** et crée **une carte par objet créé** (G7).

### Vues

| Vue     | Composant                             | Ce qu'elle projette                                                                                                                 |
| ------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Calcul  | `CalculView.svelte` + `CalcDesk`      | l'historique ; « Garder » promeut une ligne en objet nommé (`promote`, D5) ; « Comment ? » déplie les étapes, « Résumé / Détaillé » |
| Graphe  | `GrapheurContainer` (`panel={false}`) | fonctions, suites (nuage / escalier), nuages de deux listes, tracés via `syncPlots`                                                 |
| Données | `DataView.svelte`                     | la grille (une liste = une colonne nommée), diagrammes en bâtons / barres / circulaire                                              |

Deux ponts à **sens unique**, tous deux idempotents (une empreinte évite de refaire le travail) :

- `syncEngine` (`engine.ts`) : l'atelier détient les noms, `WebReplEngine` n'est qu'un
  calculateur remis en accord avant chaque usage (Q1, option B). Une fonction liée s'y lit
  comme une fonction quel que soit son nom (`k(x) = x+1` puis `k(0)` → 1 ; avant le 2026-10-13,
  seuls f, g, h, u, v, w l'étaient) : le moteur passe son état à chaque lecture ;
- `syncPlots` (`plot-sync.ts`) : l'atelier détient l'état, le grapheur le reflète. Rien de ce qui
  se passe dans le grapheur ne remonte. ⚠️ L'effet qui l'appelle lit et écrit le store : s'il
  cessait d'être idempotent, il bouclerait.

### Copier une réponse

Chaque ligne qui a une réponse porte **« Copier »** (phase 0
[atelier-copier-phase0.md](../wip/atelier-copier-phase0.md), décisions de David du 2026-10-15) : la
**réponse seule**, en **texte lisible** (`2√2`, `2x² + 5x − 3`, `S = ]−∞ ; −2[ ∪ ]2 ; +∞[`,
`12,3 km`, `lim x→+∞ (1 + 1/x)ˣ = e`) ; la flèche ▾ propose **« Copier en LaTeX »**. La valeur
approchée quand le bouton ≈ l'affiche (le « = » de tête tombe). Pas de bouton sur un refus ni sur
une définition ; une ligne sans formule (`.stats`) copie son texte.

- Le texte vient du **LaTeX** de la ligne (`readableText`, `copy-text.ts`), jamais de `Entry.text`,
  souvent la sortie du terminal (`.résoudre` y met toute sa trace) ; la conversion de MathLive
  (`convertLatexToAsciiMath`) écrit `(1)/(2)`, `k m`. Elle ne connaît que les commandes que
  l'atelier écrit : une autre (tableau, environnement) → le LaTeX est copié, et le retour le dit.
  Garde : l'exemple de chaque commande du catalogue s'écrit en texte (`copie-texte.test.ts`).
- Le retour (« Copié. », « Copié en LaTeX. », « Ton navigateur a refusé la copie. ») va dans la
  ligne de retour de Calcul, annoncée.

### Réglages et écriture mathématique

Le bouton **« Réglages »** de la barre du haut (`AtelierSettings.svelte`, 2026-10-14) ouvre une
fenêtre au réglage unique, **« Saisie dans Calcul »** : **Texte** (le champ de toujours, un point
devant les commandes ; le défaut) ou **Écriture mathématique** (MathLive, sans point, marquée « en
essai »). Le choix prend effet tout de suite et reste dans le navigateur (`chiphre-atelier-saisie`,
à part de l'atelier) : ni dans un lien, ni dans un export ; présent aussi sur un atelier reçu.
Phase 0 : [atelier-reglages-phase0.md](../wip/atelier-reglages-phase0.md) ; règles de frappe :
[atelier-saisie-naturelle.md](../wip/atelier-saisie-naturelle.md) (décisions 2 à 9).

- **Les mêmes réponses** : le champ mathématique envoie au moteur le texte que lit `runInput`
  (`calcTextOf`) ; une case vide d'un modèle est refusée avant (la ligne reste, la raison s'affiche).
- **`desk.draft` reste la ligne en cours, en texte, quel que soit le champ** : le champ
  mathématique l'écrit à chaque frappe (`draftTextOf`, cases vides retirées) et la reprend quand
  elle change du dehors — bascule depuis le mode texte, commande préparée par une carte, ligne
  vidée après un calcul (`fieldLatexFromText`). Son LaTeX est tenu par le **conteneur** : la vue
  Calcul est démontée au passage par le Graphe, et la reconstruire depuis le texte perdait les
  cases d'un modèle.
- **`fieldLatexFromText`** fait tomber le point d'une commande ; dans une commande, il coupe aux
  espaces hors parenthèses et joint les morceaux par `\,` — une espace simple ne se voit pas en
  mathématiques (`.simuler L M 100` s'affichait « simuler LM100 ») ; les mots de commande, petits
  mots et mots de plusieurs lettres restent des mots (`.mode décimal`, `G = fille`). Le test
  `natural-input-champ.svelte.test.ts` passe chaque exemple du catalogue par le VRAI champ.
- **↑ / ↓** rappellent les saisies tapées dans l'un ou l'autre mode, réécrites pour le champ ;
  le rappel compare à ce que MathLive a rangé (`{2 x}` devient `{2x}`), pas à l'historique.
- **Le clavier virtuel est un seul pour la page** : les onglets « Calcul » et « Commandes » sont
  posés quand le champ prend le focus et retirés quand il le perd (les cartes ont leurs champs
  MathLive), comme `FillBlanksInput.svelte`.
- En écriture mathématique, la liste des commandes et le « Modèle : » du mode texte ne s'ouvrent
  pas : le champ a sa propre liste. Le focus réel est dans le shadow DOM de MathLive, où
  `aria-controls` de l'hôte ne porte pas : une région `status` annonce la proposition surlignée
  (« résoudre, 1 sur 2 »). La liste s'ouvre au-dessus du mot quand le champ est dans la moitié
  basse de l'écran, et défile.
- **L'historique montre la saisie écrite** (`Entry.inputLatex`, composée par MathLive) au lieu du
  texte envoyé (`.dériver x^3`, avec un point jamais tapé) ; un lecteur d'écran lit ce texte sans
  le point (la lecture de MathLive est en anglais). `label` reste le texte envoyé : l'export et le
  rejeu l'utilisent, et une ligne rejouée revient en texte. Gardée au rechargement, relue par la
  liste blanche comme une réponse — et la vue la refiltre AVANT de la composer, quelle que soit sa
  provenance : ↑ rappelle des saisies relues du stockage, filtrées en longueur seulement (audit du
  2026-10-14 : `\htmlStyle{…}` rappelé puis validé posait un calque dans la page). Le champ vide a sa consigne (`placeholder` de MathLive, en
  LaTeX).

### Session, persistance, URL

- **Stockage local** (`persistence.ts`) : clé `ATELIER_STORAGE_KEY` (`chiphre-atelier`),
  version `ATELIER_STATE_VERSION`. On range de quoi **reconstruire** (nom, type, définition,
  tracé, lettre, intervalle, réglages), jamais l'état ni le message — ils se recalculent. La carte
  `f⁻¹` est rangée sans sa formule ni son ensemble (recalculés depuis f, comme `f′`), avec
  l'intervalle tapé (`reciprocalOn`) ; un lien ou une fusion la recrée, et une f renommée à
  l'arrivée (`g`) emmène sa réciproque (`g⁻¹`, `mergeInto`). Un objet abîmé est
  écarté seul (`salvageObjects`), un réglage abîmé est oublié, l'objet gardé ; un intervalle refusé à la relecture (lien, fusion) aussi, la fonction gardée sur son domaine. Un état d'une version
  **plus récente** n'est ni relu ni écrasé. **Version 2** (2026-10-15) : la colonne de chaque liste
  (`column`, `A`-`Z`), les titres des colonnes (`grid.titles`) et les cellules des colonnes sans nom
  (`grid.cells`, sans « ; », triés un par un par
  `salvageGrid`, réunies par `salvageState`) ; une version 1 se relit, ses listes placées en A, B…
  dans l'ordre des cartes. Sans la version 2, un onglet resté sur l'ancien code relirait l'état en
  jetant la grille, puis l'enregistrerait. **Version 3** (2026-10-18, géométrie) : les types
  `point` et `curve`, et `y` réservé — `migrateReservedNames` renomme un objet `y` à la première
  lettre libre de son type (ses cartes `y′`, `y⁻¹` avec lui), réécrit ce qui le cite (définitions
  sauf celles des courbes, premier terme d'une suite, formules de la grille, `renameInFormula`) et
  rend le renommage : `restore` le met dans son rapport (`renamed`), la session et `openLink` le
  disent (« « y » est désormais réservé aux équations : ton objet s'appelle maintenant k. »), la
  fusion le compte parmi les arrivants renommés en évitant aussi les noms de l'atelier qui reçoit.
  Appliquée à toute relecture, quelle que soit la version. Chaque issue est nommée (`LoadOutcome`,
  `SaveOutcome` : stockage indisponible, quota, trop volumineux…).
- **Session** (`session.ts`) : sauvegarde différée de 500 ms sur `revision`, écrite aussi au
  `pagehide` ; l'événement `storage` signale une écriture d'un autre onglet. Tout ce qui doit être
  dit passe par `onNotice`. Une visite de `/grapheur` sans geste n'enregistre rien.
- **URL** (`url.ts`) : `?a=<charge>`, l'état sérialisé compressé en `deflate-raw` puis base64url ;
  un préfixe d'un caractère dit compressé / brut (repli sans `CompressionStream`). Limite
  `MAX_URL_PAYLOAD` (1 800 caractères), dite **avant** de copier.
- **Liens de projection** (`grapheur-link.ts`) : `/grapheur?f=x^2-3x+1&f=…`, 1 à
  `MAX_LINK_CURVES` (8) courbes validées par Zod ; « sur » s'y lit comme ailleurs
  (`?f=x^2 sur [0;+∞[`, décision g du 2026-10-13).
- **Mode éphémère** : `?a=` comme `?f=` ouvrent un atelier qui **ne lit ni n'écrit** l'atelier
  personnel ; un lien abîmé le dit et ouvre l'atelier personnel. « Garder dans mon atelier »
  (`keepReceived`) verse dans l'atelier personnel ; en cas de collision, **l'arrivant est
  renommé** et on le dit (Q2, `mergeInto`). Ses colonnes (listes et cellules sans nom) vont dans
  les **premières colonnes libres**, dans leur ordre ; pas assez de colonnes libres → refus,
  rien n'est versé (T7, `mergeRefusal`).
- **Lignes de Calcul** (`history-storage.ts`, décision de David du 2026-10-13, « option 1 ») :
  clé **à part**, `CALC_HISTORY_STORAGE_KEY` (`chiphre-atelier-historique`), version
  `CALC_HISTORY_VERSION`. Rangées 500 ms après la dernière ligne (et au `pagehide`, au démontage)
  par `keepCalcHistory` (`session.ts`), relues au montage : les `MAX_KEPT_LINES` (100) dernières
  et les saisies tapées pour ↑ / ↓. On range ce que l'écran **montre** — saisie, réponse, échec,
  note, bouton ≈ (`alternative`), formules d'un refus (`formulas`) — et le geste (`replay`, un
  « Garder » recalé sur les lignes gardées) ; **jamais l'arbre du résultat** : une ligne restaurée
  n'a ni « Garder », ni « Comment ? », ni tableau, ni graphique (retaper la saisie par ↑ les
  redonne). **Rien n'est refait** : une définition restaurée ne crée ni ne change aucune carte.
  Plafonds : `MAX_KEPT_HISTORY_LENGTH` (200 000 caractères, à côté des 500 000 des cartes), dont
  40 000 pour les saisies ; saisie et libellé 4 000 (`MAX_DEFINITION_LENGTH`), texte 10 000
  (raccourci « … »), formule 5 000 (au-delà, oubliée : la ligne reste en texte), note 1 000. Trop gros ou stockage plein : les
  lignes les plus récentes, en silence, jamais d'échec — la clé à part ne coûte jamais les cartes.
  Une version plus récente n'est ni relue ni écrasée ; un état illisible ou une chaîne plus longue
  que le plafond : Calcul repart vide. Le lien `?a=` n'encode que `Atelier.serialize()`, sans
  l'historique ; le mode éphémère ne lit ni n'écrit cette clé. **Deux onglets** : aucune écoute
  `storage` pour cette clé, le dernier qui range écrase les lignes de l'autre (et un « Repartir
  de zéro » fait dans l'un revient si l'autre ajoute une ligne) — des lignes d'affichage, jamais
  les cartes.
- ⚠️ **Sécurité de la relecture** : ce qui revient du `localStorage` est une entrée **non
  fiable**, et la vue compose les formules en `{@html}` (`convertLatexToMarkup`). Mesuré le
  2026-10-14 (MathLive 0.111.1) : `\htmlStyle{…}{x}` rend un `style`, `\class`, `\cssId`,
  `\htmlData` des attributs, `\href` un lien. Une formule (`latex`, `alternative.latex`, chaque
  `$…$` d'un refus, `inputLatex`) n'est gardée que si **chacune de ses commandes** est sur la liste blanche de
  `safe-latex.ts` (commandes lues comme le `Tokenizer` de MathLive : lettres et `*` ; notation
  `^^5c` refusée ; environnements `\begin{…}` nommés ; **caractères ASCII et Latin-1 seulement** :
  au-delà de U+00FF, MathLive regroupe les caractères avant de lire les commandes, avec des bornes
  fausses — un ZWJ devant `\\htmlStyle` lui faisait lire `\htmlStyle`, audit du 2026-10-14 ;
  40 niveaux d'accolades au plus : MathLive épuise sa pile vers 400) — sinon elle est oubliée et
  la ligne se montre en texte, échappé par Svelte. Relire par `parseLatex` puis `toLatex` a été
  écarté : 15 réponses ordinaires sur 43 ne se relisent pas (`\approx`, `\left\{`, intervalles,
  `\mathrm`, `\mathbb{R}`). Gardes : `historique-garde.test.ts` (états forgés),
  `historique-garde-sonde.test.ts` (chaque commande permise composée par MathLive avec des
  arguments piégés : aucun ne finit dans un attribut), `historique-garde.svelte.test.ts` (le DOM
  rendu).
- **Repartir de zéro** : confirmation, vide aussi l'historique **et ce qui en est rangé** ;
  actif dès qu'il y a un objet OU une ligne de Calcul (les lignes survivent au rechargement) ;
  absent d'un atelier reçu.

### Export et rejeu de l'historique

Bouton « Exporter » de la vue Calcul (`history-export.ts`) :

- **JSON** (`historyToJson`, format `HISTORY_FORMAT` = `chiphre-calcul`) pour rejouer : chaque
  entrée garde son **geste** (`ReplayStep` : `saisie`, `action`, `supprimer`, `annuler`, `garder`)
  et sa réponse ;
- **ubumark** (`historyToUbumark`) pour recopier dans une fiche, formules en `$…$` LaTeX. Le
  titre d'une étape garde ses formules `$…$` (V25 : les pipelines pédagogiques y écrivent leurs
  maths) ; le texte autour est neutralisé (`*` → `×`, `\$`, `\~`).

**`.exporter` tapé dans Calcul** (retrait de `/cas`, 2026-10-13) : le pupitre l'intercepte
(`isExportCommand`, avant `runInput` — le moteur n'a jamais eu l'historique) et lance le **même**
téléchargement que le bouton JSON (`downloadHistory`, appelé par `CalcDesk.download`). Aucune ligne
n'est ajoutée ; la réponse va dans la zone de retour (« Historique exporté : calcul-….json. »).
Historique vide : rien ne part, et la réponse est la raison des boutons désactivés
(`NOTHING_TO_EXPORT`, « Rien à exporter pour l'instant. »). Un argument (`.exporter ubumark`) est
refusé. Un rejeu saute une saisie `.exporter` et ne télécharge rien.

Rejeu (`CalcDesk.replay`) : le fichier vient de dehors, donc `readHistory` le valide (Zod) et le
borne (`MAX_HISTORY_BYTES`, `MAX_HISTORY_ENTRIES`) avant tout. Chaque geste est refait **par le
même chemin** que l'élève (`submit`, `runFromPanel`, `keep`…) ; rien n'est injecté. Le rejeu
s'arrête à la première ligne qui échoue et dit laquelle (`ReplayReport`). Désactivé en mode
éphémère. Une ligne restaurée au rechargement garde son geste : un export fait après
un rechargement se rejoue comme avant.

### Suppression en cascade

Supprimer un objet supprime **aussi ses dépendants**, directs ou en chaîne (décision du
2026-10-05, lot B de [atelier-suppression-export-phase0.md](../archive/wip/atelier-suppression-export-phase0.md)) :

- `removalOf` les nomme (dans l'ordre des cartes, sans compter deux fois un cycle) ; la
  confirmation en cite trois puis « et N autres » (`cascadeMessage`) ;
- `removeWithDependents` rend un reçu ; `undoRemoval` restaure **à l'identique** (définitions,
  réglages, tracés, diagrammes) — une seule fois, et **refusé si l'atelier a changé depuis**
  (`revision`) : jamais de restauration par-dessus un nom repris. Elle remet aussi les cellules
  sans nom d'avant : retirer le nom d'une colonne puis annuler rend la colonne à sa liste, sans
  copie dans la grille.

L'état « en attente » reste pour un nom cité _avant_ d'être défini ; seule la suppression a changé.

---

## Liens avec `mathAST` et `statistics`

L'atelier ne calcule presque rien lui-même : il choisit le bon module et met la réponse en forme.
Doc du moteur : [mathast/README.md](mathast/README.md).

| Geste de l'élève                        | Module appelé                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| calculs, commandes du registre          | `WebReplEngine` (`src/lib/mathAST/cli/web/web-repl-engine.ts`)                                                                                                                                                                                                                                                                                                                                                                                                                            |
| écrire une grandeur (`5 km`)            | `readNaturalQuantities` (`src/lib/atelier/natural-quantities.ts`) : « un nombre, une espace, une unité », calculs et valeurs seulement                                                                                                                                                                                                                                                                                                                                                    |
| grandeur dans le champ d'une carte      | `definitionFromField` / `fieldLatexOf` (`src/lib/atelier/mathfield.ts`) : la même lecture sur le LaTeX de MathLive (`2\,h\,30\,\min`) ; une durée composée revient `2 h 30 min` (dans un calcul : `(1 h + 30 min) × 2`, relu aussi) ; virgule de l'élève (`2{,}5`, valeurs et fonctions) ; une unité montrée par le champ reste une unité (`10^3 m`)                                                                                                                                      |
| conversion d'un trait (`2,5 h en min`)  | `naturalConversion` / `convertNaturally` (`calcul.ts`) : un calcul sans `=`, « en », une unité du module → la grandeur calculée puis `.convertir`, même réponse ; la gauche est d'abord ESSAYÉE sur un moteur à part (`probeEngine`) : une ligne refusée ne change pas la dernière grandeur de l'élève ; gauche en erreur → son erreur, pas une grandeur → refus qui la cite. Avant le 2026-10-14 : un produit de lettres (« 2,5 h e n m i n »). Pas dans une définition (`d = … en min`) |
| calcul avec des grandeurs, `.convertir` | `computeQuantity` / `convertQuantity` (`src/lib/mathAST/cli/quantities.ts`) : `tidy`, unité écrite d'abord — comme `{{eval}}` ; contrat : [grandeurs.md](grandeurs.md)                                                                                                                                                                                                                                                                                                                    |
| `.simplifier`                           | `generatePedagogicalSimplifySteps`, intention `auto` (ADR 0007)                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `.factoriser`                           | même pipeline, intention `factoriser`, niveau lycée (stratégies de l'ADR 0024 : identités à coefficients, Δ, racine évidente) ; aucun repli moteur : « je n'ai pas su » se dit                                                                                                                                                                                                                                                                                                            |
| `.développer`                           | même pipeline, intention `developper`, niveau lycée, pour la réponse ; le « Comment ? » rédigé à part (`pedagogical-simplify/expand-steps.ts`, voir « `.développer` en détail ») ; aucun repli moteur : « rien à développer » se dit                                                                                                                                                                                                                                                      |
| `.dériver`, « Dériver », `f′`           | `src/lib/mathAST/pedagogical-differentiation/` (règle nommée, sous-étapes)                                                                                                                                                                                                                                                                                                                                                                                                                |
| `.réciproque`, « Réciproque », `f⁻¹`    | `computeReciprocal` (`src/lib/mathAST/reciprocal/`, [mathast/reciproque.md](mathast/reciproque.md)) ; lettres des paramètres : `solve` puis `textbookWriting`                                                                                                                                                                                                                                                                                                                             |
| `.résoudre`, « Résoudre »               | `src/lib/mathAST/pedagogical-solve/`, vérifié par `solve-steps-check.ts`                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `.intégrer`                             | réponse : `integration` (`integrate.command.ts`) ; « Comment ? » : `src/lib/mathAST/pedagogical-integration/` niveau lycée, vérifié par `integrate-steps-check.ts`                                                                                                                                                                                                                                                                                                                        |
| `.domaine`                              | réponse : `computeDomain` (`domain.command.ts` refuse ce qu'il ne résout pas), écrite par `domainToLatex` ; « Comment ? » : `src/lib/mathAST/pedagogical-domain/` niveau lycée, vérifié par `domain-steps-check.ts`                                                                                                                                                                                                                                                                       |
| `.évaluer`                              | réponse : `eval.command.ts` — `substitute`, refus d'une valeur interdite (`forbiddenValue`, `mathAST/eval/forbidden-value.ts`, exact), puis `evaluate` ; la ligne est une formule (`evaluatedLine`, voir ci-dessous) ; « Comment ? » : `src/lib/mathAST/pedagogical-arithmetic/` niveau collège, vérifié par `evaluate-steps-check.ts`                                                                                                                                                    |
| `.limite`                               | réponse : `evaluateLimit` (`mathAST/limits`) ; « Comment ? » : `generatePedagogicalLimitSteps` (`src/lib/mathAST/pedagogical-limits/`) niveau lycée, vérifié par `limit-steps-check.ts`                                                                                                                                                                                                                                                                                                   |
| `.variations`, « Variations »           | `computeVariations` (`src/lib/mathAST/variations/`) — le même calcul que le tableau                                                                                                                                                                                                                                                                                                                                                                                                       |
| syntaxe des commandes                   | `src/lib/mathAST/cli/core/variable-argument.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                           |

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

**« Résumé / Détaillé »** (`steps-summary.ts`, 2026-10-13). Les commandes qui rédigent
(simplifier, factoriser, dériver, résoudre, intégrer, domaine — tapées, ou Résoudre / Dériver sur une carte ; `.évaluer` construit le sien, voir plus bas) rendent le même
calcul DEUX fois : `steps` en `verbosity: 'detailed'`, `summary` en `'summarized'`. Le moteur
tourne une fois ; seul `renderAll` est rappelé, et la réponse de la ligne vient du calcul, jamais
de la rédaction. `summaryOf` compare les deux rendus et rend `undefined` s'ils sont identiques :
la ligne n'a alors pas d'interrupteur. Mesuré : dans les cinq renderers branchés, la verbosité ne
gouverne que l'`explanation` de chaque étape — le résumé garde toutes les étapes (valeur interdite
comprise), titres et calculs, sans le « pourquoi ». `summary` suit `steps` partout (virgule
décimale, `Entry`) ; l'export de l'historique ne garde que `steps`. `.variations` a sa propre
rédaction, sans verbosité : pas de `summary`. Dans `CalculView`, l'interrupteur est DANS le
« Comment ? » déplié (choix segmenté de `SequenceSettings`, `aria-pressed` et coche ✓), réglé
**ligne par ligne** (décision de David, 2026-10-13) : basculer une ligne ne change pas les autres
lignes dépliées. Le dernier choix fait, sur n'importe quelle ligne, est retenu sous
`chiphre-atelier-etapes` dans `localStorage` (lecture et écriture dans un `try` : la vue marche
sans) ; il sert de niveau d'OUVERTURE aux lignes dépliées ensuite, « Détaillé » si rien n'est
retenu. Le niveau d'une ligne est figé quand on la déplie (`toggleSteps`) : un choix fait ensuite
ailleurs ne la change pas sous les yeux. Une ligne réglée à la main garde son niveau si on la
replie puis la redéplie ; une ligne seulement ouverte reprend le dernier choix. Ces niveaux par
ligne vivent dans une `SvelteMap` du composant, par `entry.id`, et ne survivent pas à un
rechargement (une ligne restaurée n'a d'ailleurs plus d'étapes). Chaque groupe s'annonce « Rédaction des étapes de la ligne
N », `aria-describedby` vers la saisie de la ligne. Une préférence d'affichage, pas un objet :
elle ne voyage ni dans un lien ni dans une fusion.

**Le garde-fou** (`solve-steps-check.ts`) vérifie la conclusion contre les nombres et le moteur
avant de la montrer ; un désaccord rend `null` (repli sur la réponse du moteur). `S = ℝ` est
accepté seulement si l'équation tient sur toute une grille ET si `solve` répond `infinite`. Un
**échec du moteur** porte le statut `no-solution` : `engineSolutions` le détecte par
`isSolverFailure` et rend `null`, sinon « type non supporté » confirmait une conclusion `S = ∅`
(`x\left|x\right|=4`, qui a la solution 2).

**`.évaluer` en détail** (`calcul.ts`, `eval.command.ts`, décisions de David du 2026-10-14). La
ligne est une **formule**, plus le texte du terminal (« Result: 9 (exact) Mode: exact », en
anglais) : `f(3) = 9` quand l'expression tapée est une fonction de l'atelier (`f` ou `f(x)`, dans
sa lettre : `f(t) = t^2`, `en t=2` → `f(2) = 4` ; une valeur non entière entre `\left(…\right)`,
une division tapée écrite en fraction ; l'appel est écrit par `evaluatedCallLatex`), sinon la
valeur seule — l'écho montre déjà l'expression, le remplacement est la première étape. Une comparaison répond « vrai » / « faux ».
**E5** : une saisie décimale (dans la valeur, l'expression, la formule de f ou une variable posée,
`hasDecimalLiteral` sur l'expression remplacée) donne une réponse décimale, comme le mode décimal,
écrite par la règle du bouton ≈ (`approximation.ts` : 4 décimales, `\approx` seulement si
arrondi) : `en x=1,5` → 2,25, `f(0{,}5) \approx 1{,}4142` ; une saisie exacte, une réponse exacte
(`\sqrt{2}`, `\dfrac{1}{9}`), avec sa valeur approchée au bouton ≈. **Valeur interdite** : avant
le calcul, `forbiddenValue` lit l'expression remplacée, **exactement** (rationnel nul, jamais une
tolérance : `getDomainViolations` compare des flottants à 10⁻¹⁰ près et refuserait `1/x` en
`x = 10⁻¹¹`) ; la cause la plus intérieure l'emporte. Refus `VALUE_FORBIDDEN`, formules
composées : « $x = 1$ est une valeur interdite : le dénominateur s'annule. », « … le nombre sous
la racine carrée est négatif. », « … le logarithme ne s'applique qu'à un nombre strictement
positif. », « … 0 n'a pas de puissance négative. », racine d'indice pair (`\sqrt[4]{x}`), tangente
où le cosinus s'annule (`\tan` en π/2, lu exactement), arc sinus / arc cosinus hors de [−1 ; 1],
puissance d'exposant non entier d'un négatif (`x^{1/2}`, `x^{0.5}`, `x^{1/3}` en −8 : convention du
lycée, $x^a$ défini pour $x > 0$ ; `\sqrt[3]{x}` en −8 = −2 reste accepté) ; sans lettre, « Ce
calcul n'a pas de valeur : … ». La valeur citée s'écrit comme dans la ligne (`typedValueLatex` :
`\dfrac{\pi}{2}`, `-\dfrac{1}{2}`). Avant : un dénominateur nul finissait en « Je n'ai pas su
lire », `\sqrt{-1}`, `\ln 0`, `\tan(\pi/2)`, `\arcsin(2)` passaient pour des résultats. La console
(`repl.ts`) garde son texte. **Plusieurs lettres** (E6, décision de David du 2026-10-14) :
séparées par « ; », `.évaluer 2a+3b en a=1,5 ; b=2` → `9` (la valeur seule, même pour une
fonction de l'atelier) ; `CommandArguments.assignments`, dans l'ordre tapé
(`variable-argument.ts`). La virgule entre deux valeurs (`en a=1,5, b=2`, `en a=1, b=2`, ou
`en … pour …`) est refusée, même sans ambiguïté : « Sépare les valeurs avec « ; » : .évaluer
2a+3b en a=1,5 ; b=2, par exemple. » Refus (`eval.command.ts`) : lettre donnée deux fois (« La
valeur de a est donnée deux fois. »), lettre absente de l'expression (« « c » n'apparaît pas dans
… »), valeur déjà posée dans l'atelier, redonnée, à une ou plusieurs lettres (`calcul.ts`, avant
le moteur : « a vaut déjà 5 dans l'atelier : retire « a=1 », ou efface a avant. »), lettre sans valeur (« Il manque la valeur de b : .évaluer 2a+3b en a=1 ; b=3, par
exemple. », aussi à une seule valeur donnée), valeur interdite (« Pour $a = 1$ et $b = 0$, ce
calcul n'a pas de valeur : … »). Un « ; » final sans valeur (`en a=1 ; b`) : « Il manque la
valeur de b : … » (« x a déjà sa valeur : retire « ; x ». » si la lettre en a une). Une
**fonction en attente d'un paramètre** (`f(x) = a x`, `a` non posé) est remplacée
(`substituteNames(…, pendingFunctions)` : pour `.évaluer`, toute fonction en attente ; appels par
`pendingCall`) : `.évaluer f en x=1 ; a=2` → `2` avec ses étapes, `.évaluer f en x=1` → « Il
manque la valeur de a : .évaluer f en x=1 ; a=3, par exemple. » (la commande citée telle que
tapée). Les autres commandes : voir « Fonction à paramètre » plus bas.

**Fonction à paramètre** (V56, 2026-10-14). Une fonction en attente de **valeurs** seulement
(`parametersOf`, `types.ts` : `missing` tout en `as: 'value'`, `f(x) = a x`) se comporte comme son
expression, le paramètre restant une lettre. Avant, `substituteNames` la sautait : le moteur
recevait le symbole f, une constante, et `.dériver f` répondait 0, `.intégrer f` ½f² + C.

- **Commandes qui concluent** : `.dériver f` → `a`, `.intégrer f` → ½ax² + C, `.intégrer f de 0
à 1` → a/2 (une intégrale bornée est réduite par `simplify` quand une fonction à paramètre est
  citée : `(e^a − 1)/a`, et non `e^{a * 0}`), `.simplifier`, `.factoriser`, `.taylor`,
  `.équivalent`.
- **Commandes refusées** (`PARAMETER_BLOCKED` : `.résoudre`, `.variations`, `.limite`,
  `.domaine`, `.réciproque`, y compris par `f'`) : « Le résultat dépend de a : donne-lui une
  valeur (a = 2) pour l'étudier. » (« de a et b : donne-leur … » à plusieurs). Mesuré avant :
  `.résoudre a x = 0` → x = 0, `.limite e^{a x} en +∞` → +∞, faux pour a ≤ 0. Le refus est large
  (`.résoudre g(x)=0` de `g(x) = x^2 + k` y passe aussi). `.évaluer` n'y passe pas (E6).
- **Ligne de calcul** (`parameterizedLine`, avant `expandInput`) : `f(2)` → `2a`, `f` seul →
  `a x`, `f'(2)` de `a x^2` → `4a`, `g(f(2))` → `4a²` avec g prête ; appels réduits par
  `simplify` dans l'arbre (le moteur rend tel quel un calcul qui garde des lettres ; avant :
  « Fonction inconnue : f — définis-la d'abord »). Une égalité ou une comparaison (`f(2)=4`,
  qui répondait `false`) est refusée (« Le résultat dépend de a… ») ; un dénominateur nul après
  substitution (`a/x` en 0) rend « Erreur de calcul : Division par zéro », comme sans paramètre.
- **Substitution** (`expandedCalls`) : de l'intérieur vers l'extérieur (`f(f(x))` → a²x), puis
  une seule passe (`maxIterations: 1`) : `f(2x)` itéré donnait `a·2¹⁰x`.
- **Fonction qui en cite une à paramètre** (`g(x) = f(x)+1`) : `substitutedAstOf(…,
{ forDerivation })` remplace aussi les fonctions en attente (`engine.ts`) → `.dériver g` = a.
- Une fonction en attente d'une **fonction** (`as: 'function'`) : la commande est refusée avec
  le message de la carte (`pendingFunctionRefusal`). ⚠️ `p(x) = q(x)+1`, q inconnu, est lu
  q·x par l'atelier (`as: 'value'`) : `.dériver p` répond q.
- **Boutons de la carte** (Q4, David, 2026-10-14) : ils disent ce que dit la commande.
  « Dériver » répond f′(x) = a et crée la carte f′, à paramètre comme f (`createDerivative`
  accepte une base à paramètre ; `.dériver f` aussi, sans la note « En attente de a ») ;
  « Résoudre f(x) = 0 », « Variations », « Réciproque » sont désactivés avec « Le résultat dépend
  de a… » (`parameterReason`, `actions.ts`) ; « Tracer » garde le message de la carte. Le champ
  « image » rend `2a` pour f(2), comme la ligne tapée (`runAction` → `parameterizedLine`).
- **Condition d'une primitive** (Q3) : `.intégrer` affiche « (a ≠ 0) » quand la réponse a un
  dénominateur fait d'un paramètre que l'expression de départ n'avait pas
  (`introducedConditions`) : `e^{ax}` → $\dfrac{e^{ax}}{a} + C \quad (a \neq 0)$, `x^a` →
  « (a ≠ −1) », `e^{(a-1)x}` → « (a ≠ 1) » (forme lisible : `conditionOf`). Rien pour
  `1/(a x)` (la division est dans le départ, comme `.dériver`), ni pour `e^{2x}`. Le texte de
  la ligne porte la même condition. Une intégrale **bornée** dit aussi les conditions de
  l'intégrande (V61) : `1/(a x) de 1 à 2` → $\dfrac{\ln(2)}{a} \quad (a \neq 0)$. Une
  intégrale bornée est aussi réduite quand l'intégrande tapée contient un paramètre
  (`.intégrer e^{a x} de 0 à 1` → $\dfrac{e^a - 1}{a}$), et `1^{a+1}` vaut 1 (`x^a de 1 à 2` →
  $\dfrac{2^{a+1} - 1}{a+1} \quad (a \neq -1)$, réduit par `integrateDefinite`).
- **`.résoudre` tapé avec une lettre non posée** (V57, Q5 — `parameterSolveRefusal`, après le
  moteur, ses refus d'abord) : refus « Le résultat dépend de a… » quand la résolution DIVISE par
  le paramètre — polynôme dont le coefficient dominant en contient un (`a x = 0`, `a x + b = 0`,
  `x/a = 1`, `a x^2 = 1`, `a x > 1`) ; sinon l'inconnue multipliée par un paramètre
  (`e^{a x} = 1`) ou un paramètre au dénominateur de la réponse (`1/x = a`), sauf si le moteur
  a écrit la condition (`u_0 \cdot 0{,}5^n = 1` : « si u₀ > 0 »). Restent résolus : `x + a = 0`,
  `2x = a`, `(x-a)(x-1) = 0` ({a ; 1}, juste même si a = 1), `\ln x = a`, et `x^2 = a`, que le
  moteur conditionne déjà (« si a ⩾ 0 »). `x + a > 0` garde le refus du moteur (« Je ne sais pas
  encore résoudre cette inéquation »). Un refus n'a pas de « Comment ? ».
- **Équations rationnelles** (`forbiddenSolutions`) : refus quand une solution peut tomber sur
  une valeur interdite — chaque solution du solveur est remplacée dans les dénominateurs en x de
  l'entrée, et un paramètre qui y reste refuse : `x/(x-a)=0` (x = 0, interdite si a = 0),
  `a/x = 1`, `\dfrac{a}{x} = 2`, `(x-a)/(x-1)=0` (x = a, interdite si a = 1). Gardée :
  `1/(x-a)=1` → x = a + 1. Le refus du moteur « La solution dépend de q, u_0 : je ne sais pas
  encore résoudre avec un paramètre » est reformulé en « Le résultat dépend de q et u_0 : … ».
- **Primitive non trouvée** (`.intégrer e^(x^2)`, `1/(x^2-2)`) : le refus du moteur en français,
  « Je ne sais pas calculer cette intégrale » — la ligne montrait sa sortie de terminal (« ∫ … : Non
  résolu / Technique tentée … ») jusqu'au 2026-10-14.
- **Bornes à paramètre** (`parameterBoundsRefusal`) : `.intégrer` refuse (« dépend de a ») quand
  une borne contient un paramètre et que l'intégrande n'est pas définie partout (`1/x de 1 à a`
  → ln|a|, `1/x^2 de 1 à a`), ou qu'une puissance de x a un exposant à paramètre sur un segment
  qui touche 0 ou a une borne à paramètre (`x^a de 0 à 1` diverge pour a ⩽ −1). Aussi, bornes en nombres, quand un dénominateur en x contient un paramètre et peut s'annuler sur le segment (`1/(x-a) de 0 à 1`, `1/(x^2-a) de 0 à 1`, `1/(x^2+a^2) de -1 à 1`). Gardés (V61, `nonZeroOnSegment`) : un dénominateur toujours positif (`1/(x^2+a^2+1)`), et, facteurs faits de paramètres seuls mis à part (leur condition « a ≠ 0 » est affichée), chaque facteur en x sans paramètre non nul sur le segment (`1/(a x) de 1 à 2`) ou somme P(x) + Q, P sans paramètre > 0 sur le segment et Q ⩾ 0 (`1/(x^2+a^2) de 1 à 2` → arctan, « (a ≠ 0) »). Même logique hors des divisions (`domainParameters`, revue de V61) : une puissance d'une base en x à paramètre — exposant entier négatif, base non nulle sur le segment (`(x-a)^(-1) de 0 à 1`, qui rendait ln|1 − a| − ln|a|, refusé) ; exposant non entier ou à paramètre, base positive (`(x-a)^{1/2}`, `(x-1)^a de 0 à 2` refusés) — et une fonction d'un argument en x à paramètre : ln, log, √ exigent un argument positif sur le segment (`\ln(x+a^2) de 1 à 2` gardé, `\ln(x-a)`, `\ln(a x)`, `\sqrt{x-a}` refusés) ; sin, cos, exp, arctan, sinh, cosh, tanh, |·| n'exigent rien ; toute autre (tan, arcsin…) refuse. Gardé aussi :
  `x^2 de 0 à a` → a³/3. Une condition toujours vraie ne s'affiche pas (`a^2 + 1 ≠ 0`,
  `isPositive`) ; l'exposant d'une puissance de x est réduit (`x^{a-1+1}` → `x^a`).

**« Comment ? » de `.évaluer`** (`evaluate-steps.ts`, PR 3, décisions de David du 2026-10-14).
**E2** : `generatePedagogicalArithmeticSteps` niveau `college`, une opération par étape (pièges du
négatif compris : `(-3)^2 = (-3) \times (-3) = 9`, « Soustraire $-3$, c'est ajouter $3$ »).
**E3** : la première étape est rédigée par l'atelier, « On remplace $x$ par $-3$ » (règle
`atelier-substitute`) : l'expression où `typedValueNode(valeur)` (la valeur tapée, divisions en
fractions, partagée avec `typedValueLatex`) a pris la place de la lettre, négatifs entre
parenthèses (`substitute` + `toLatex`), produit d'un nombre écrit `\times` (`crossProducts` :
`3x` en −2 sortait `3 * (-2)`), négatif en tête de produit entre parenthèses dès le remplacement
(`parenthesizeLeadingNegatives` : `(-2)(-2-1)`, pas `-2(-2-1)`), parenthèses que l'atelier ajoute
autour d'une fonction citée retirées quand elles ne servent à rien (`dropUselessParentheses` :
`g(x)+1` → `2^2 + 1`, développé en `2 \times 2`) ; pour une fonction de l'atelier, `f(2) = 2^2 + 1` (parenthèses
extérieures de la définition retirées). Le pipeline part de cette même expression. **Résumé** :
le pipeline ne distingue pas ses étapes par verbosité (seules les explications changent) ; le
résumé est donc CONSTRUIT : le remplacement, puis « On effectue les calculs »
(`atelier-evaluate-result`, `expression = valeur` ou `f(2) = 5` d'un trait) ; offert seulement
si le détaillé compte au moins deux opérations. **Gardes** (`evaluate-steps-check.ts`, toute
exception → pas d'étapes) : valeur conclue = réponse du moteur **en calcul exact**
(`evaluate(a − b)` nul) ; réponse arrondie (`\approx`) → rien ; **E4** pas de « Comment ? » si
l'expression contient une fonction autre que racine et valeur absolue, ou une puissance de e
(`e^0`, `\ln 1`, `\sin 0`), ni si le pipeline ne rend aucune étape ou « On calcule » seul
(`(1/2)^2`, `x` en 3) ; aucun `*` dans le LaTeX ; **E5** une réponse décimale garde ses
décimaux (virgule par `resultWithDecimalComma`, `2 \times 1{,}5 = 3`), mais des étapes qui
passent par une fraction sous une réponse décimale (le pipeline récrit `1{,}5^2` en 9/4 et
`1 + 0{,}5` en 3/2) → pas d'étapes. **Plusieurs lettres** (E6) : toutes remplacées d'un coup,
« On remplace $a$ par $1$ et $b$ par $2$ » (trois : « $a$ par $1$, $b$ par $2$ et $c$ par $3$ »,
ordre tapé, `substitutionTitle`), mêmes gardes ; une division tapée `x/4` s'écrit en fraction
dès le remplacement (`slashesAsFractions`, `\dfrac{2}{4}`, à une lettre aussi) ; les lettres de l'expression doivent être
exactement celles qui ont une valeur. Une saisie qui cite une autre lettre
qu'une fonction de l'atelier (`a x` avec `a` posé, que l'atelier remplace avant le moteur) n'a
pas d'étapes (`citesOtherLetters`) ; de même une valeur posée tapée après `en`
(`en x=a`), dont la ligne s'écrit `f(3) = 10` (`typedValueOf` ôte les parenthèses de
remplacement). Les refus (`VALUE_FORBIDDEN`) sortent avant,
sans étapes.

**`.intégrer` en détail** (`integrate-steps.ts`, 2026-10-13). La réponse de la ligne est celle
du moteur `integration`, inchangée (`+ C` compris). Le « Comment ? » vient de
`generatePedagogicalIntegrationSteps` (niveau `lycee`, détaillé + résumé), et ne s'affiche que si
deux gardes passent (`integrate-steps-check.ts`) :

- **concordance avec le moteur** : en définie, la valeur des étapes est numériquement celle du
  moteur ; en primitive, F_étapes − F_moteur est constante sur une grille (là où les deux
  existent, au moins 2 points). Un refus rédigé (`undefinedAt`) alors que le moteur a une valeur
  est un désaccord : `\ln x` de 0 à 1 (impropre, −1) n'a pas d'étapes ;
- **aucun coefficient caché** : une forme composée (`apply-composite-exp`, `-ln`, `-sin`, `-cos`,
  `-power`) doit écrire exactement G(u) (e^u, ln|u|, −cos u, sin u, u^(n+1)/(n+1)), comparé
  numériquement sur la grille — ou k·G(u) quand elle déclare un coefficient `k`. Depuis la PR 2
  (décisions de David du 2026-10-13), le pipeline n'écrit plus de coefficient sans le dire :
  l'étape `reveal-derivative` (« On fait apparaître $u'$ ») réécrit `e^{2x} = \dfrac12 \times 2e^{2x}`
  et sort ½, puis la forme composée intègre `2e^{2x}` ; quand u′ = 1 (`\frac3x`), la même règle
  s'intitule « On sort la constante $3$ » et la garde la reconnaît pareil ; le signe − devant
  l'intégrande (`-e^x`, étape `extract-constant`) s'intitule « On sort le signe $-$ », comme
  `\frac{-1}{x}`, sans coefficient à contrôler. La garde (`revealExplains`) n'accepte un `k`
  que si l'étape **immédiatement précédente** est cette réécriture, au même k, juste en valeurs
  (f = k × u′g(u), et la forme composée intègre bien u′g(u)). Un ½ glissé dans la primitive sans
  cette étape reste refusé. Le contrôle porte aussi sur les sous-étapes (IPP : v = ½e^{2x} est
  rédigé sous « Choix de u et dv », puis ∫ ½e^{2x} dx sous la formule).
  Les **éléments simples** (`apply-partial-fractions`) doivent écrire A·ln|x − r₁| + B·ln|x − r₂|
  à une constante près, comme le promet leur titre : un facteur non unitaire intègre A/(2x − 1)
  en (A/2)·ln|2x − 1| sans le dire (`\frac{1}{(2x-1)(x+1)}`, `\frac{1}{4x^2-1}`), refusé.
  Détection par les règles et leurs `bindings`, pas par une liste d'exemples.

Refusés aussi : bornes non numériques (`de 0 à a`), toute exception (`\frac{1}{x^2}` :
`PedagogicalIntegrationNotImplemented`). Montrés : polynômes, eˣ, 1/x, cos/sin, composées
exactes (`2e^{2x}`, `\frac{2x}{x^2+1}`) et, depuis la PR 2, à coefficient expliqué (`e^{2x}`,
`\sin(2x)`, `e^{-x}`, `\frac3x`, `\frac{x}{x^2+1}`, `(2x+1)^3`, `xe^{2x}`), IPP, et hors terminale l'IPP cyclique et les éléments
simples à facteurs x − r (`\frac{1}{x^2-1}`, `\frac{1}{x(x-1)}` de 2 à 3) ; à facteur non unitaire,
coefficient caché, refusés.

Un **pôle dans [a ; b]** (`\frac1x` de −1 à 1, `\frac{1}{x-2}` de 1 à 3, et aussi une borne,
`\frac1x` de 0 à 1) sort en **refus du moteur** (`INTEGRAL_UNDEFINED`), message inchangé. Ce
refus porte en plus `steps` et `summary` (champs optionnels du `CalcResult` `refus`, posés par
`integrateRefusalSteps` seulement pour `.intégrer`) : « Comment ? » et l'interrupteur Résumé /
Détaillé apparaissent sur la ligne de refus comme sur une réponse, et déplient « La fonction n'est
pas définie en x = 0, qui appartient à [−1 ; 1] ». Garde (`citesForbiddenPoint`) : les étapes
concluent `undefinedAt` par l'étape `integrand-undefined-on-interval`, qui cite la même valeur ;
cette valeur est un nombre, dans [min(a, b) ; max(a, b)] bornes comprises, et f n'y a pas de
valeur finie (f sans autre lettre que la variable). Sinon pas d'étapes. Les refus des autres
commandes n'en portent jamais. Les étapes sont au niveau lycée : l'IPP s'y rédige en notation de
terminale (« On pose $u(x) = x$ et $v'(x) = e^x$, donc $u'(x) = 1$ et $v(x) = e^x$ », PR 3 du
2026-10-13), sans changer ce que la garde reconnaît.

**`.domaine` en détail** (`domain-steps.ts`, PR 2 de `.domaine`, décisions de David du
2026-10-13). La réponse de la ligne est une **formule**, `D = …`, écrite par `domainToLatex`
(`pedagogical-domain/renderer.ts`) — le même écrivain que la conclusion « Domaine : … » des
étapes ; le texte du terminal (« Expression », « Contraintes », « Condition ») n'est plus montré.
`output` porte la même réponse en texte (`D = ]0 ; +∞[ \ {2}`, `formatDomainInterval`) : repli
de la vue, export JSON. Le domaine est recalculé par `computeDomain` sur `result.ast` (la fonction
même de `domain.command.ts`), dans la variable de la ligne (`; t`, `pour t`, devinée). Les refus
du moteur (`DOMAIN_UNRESOLVED` : `\sqrt{\sin x}`) sortent plus haut, inchangés, sans étapes ;
`.domaine f` d'une fonction à ensemble garde sa phrase (décision a).

- **Valeur connue seulement en décimal** (plus de 6 décimales, même critère que le pipeline :
  `\frac{1}{x^3-2}`) : pas d'étapes, et la valeur est NOMMÉE dans l'ensemble puis arrondie —
  `D = ℝ \ {α} avec α ≈ 1,26` (écriture validée par David ; lettres α, β, γ, δ par valeurs
  croissantes ; au-delà de quatre, ou hors réunion d'intervalles, la ligne garde le texte du
  moteur). Deux décimales, deux chiffres significatifs sous 1 (`α ≈ 0,046`, jamais « α ≈ 0 ») ;
  deux arrondis égaux reçoivent des décimales jusqu'à se distinguer (`1,260` et `1,261`).
  `]0 ; α[ ∪ ]α ; +∞[` est réécrit `]0 ; +∞[ \ {α}` avant les deux écrivains : texte et LaTeX
  disent le même ensemble.
- **« Comment ? »** : `generatePedagogicalDomainSteps` (niveau `lycee`, détaillé + résumé),
  montré seulement si l'ensemble que conclut la dernière étape est, **par valeur**, le domaine du
  moteur (`sameDomainByValue` : appartenance testée en chaque borne, chaque point exclu, leurs
  voisins à 10⁻⁶ près et une grille, valeurs lues par les évaluateurs mêmes de `containsValue`
  — avec `compile`, [√2 et ]√2 passaient pour égaux ; une exclusion périodique est sondée sur
  ±4 périodes ; une valeur non évaluable, un domaine par conditions → désaccord). Toute exception (`PedagogicalDomainNotImplemented`) → pas d'étapes, la formule
  reste. Quand les étapes sont montrées, la réponse s'écrit avec l'ensemble qu'elles concluent :
  les deux écritures sont identiques. Branché aussi sans la résolution rédigée d'une contrainte
  (`\sqrt{x^2-5x+6}`, Q4) et pour le domaine universel (Q6). Tests :
  `domaine-etapes.test.ts`, `domaine-etapes-affichage.svelte.test.ts`.

**`.développer` en détail** (`expand.ts`, phase 0 [atelier-developper-phase0.md](../wip/atelier-developper-phase0.md),
décisions de David du 2026-10-14). Servie par l'atelier (`ATELIER_ONLY_COMMANDS` : le registre
n'a pas d'`expand`), après la substitution des noms (`.développer f`, `.développer f(x)`).
Développer, c'est aussi réduire. La réponse est le résultat de l'intention `developper`, remis
dans l'ordre du manuel : puissances décroissantes de x, les autres lettres traitées comme des
coefficients, sinon l'ordre alphabétique, les lettres indicées comptant comme des lettres
(`a(x+b)` → `ax + ab`, `(a−b)²` → `a² − 2ab + b²`, `(x_1+x_2)²` → `x_1² + 2x_1x_2 + x_2²` ; un
coefficient négatif déplacé s'écrit `− 2ab`, jamais `+ (−2ab)`). **Une somme de monômes
seulement** (revue de la PR 2, 2026-10-14) : dès qu'un terme n'a pas de degré (eˣ, √x, sin x), on
garde l'ordre du module (`(2√x+1)²` → `4x + 4√x + 1`, `(eˣ+e⁻ˣ)²` → `e²ˣ + e⁻²ˣ + 2`,
`(x+1)²+√(1+x)` → `x² + 2x + √(x+1) + 1` — la PR 1 rangeait ce terme après les monômes). `-(x+1)` part au module écrit `-1(x+1)` : seul, il
n'était pas développé (0 étape). La réponse s'écrit comme l'élève a écrit, comme `.limite`
(décision de David du 2026-10-06, étendue le 2026-10-14) : un décimal tapé, ou le mode décimal,
donne des décimaux (`(0,5x+1)²` → `0,25x² + x + 1`, même en mode exact) ; sinon des fractions
(`(x/2+1)²` → `¼x² + x + 1`) ; une fraction sans écriture décimale finie reste une fraction
(`⅑x²`). Rien n'a bougé (aucune étape, ou un résultat égal à l'entrée aux parenthèses près) : trois
phrases, sans ligne rouge, qui citent l'expression TAPÉE — « « x^2+1 » est déjà développée et
réduite. » (une somme de monômes : fractions et racines de nombres, lettres indicées comprises),
« Je ne sais pas développer « (x+1)^n » : l'exposant n'est pas un nombre. », sinon « Il n'y a rien
à développer dans « 1/(x+1) ». ». Deux autres « je ne sais pas », sans ligne rouge : un
développement de plus de 500 termes (`MAX_TERMS`, estimé AVANT le calcul, qui est synchrone :
`(x+1)^2000` figeait la page 5 s) ; une réponse que le module n'a pas su finir (deux nombres dans un
produit, une puissance de nombres : `e^{(x+1)^2}` rendait `e^{x^2 + 2 x 1 + 1^2}`) — jamais une
réponse mal écrite. Refus : sans expression (avec l'exemple), une équation ou une inéquation
(« On développe une expression, pas une équation. Pour la résoudre : .résoudre (x+1)^2=4 »,
expression TAPÉE citée), tout ce qui n'est pas une expression (liste, saisie illisible).

**Le « Comment ? » de `.développer`** (PR 2, section E de la phase 0) : rédigé par
`writeExpandSteps` (`mathAST/pedagogical-simplify/expand-steps.ts`), qui part de l'expression
tapée et finit sur la réponse de la ligne. Réponse et étapes viennent d'`explainExpansion`
(`pedagogical-simplify/expand-explained.ts`), que les corrections d'exercices générées
(`intent: 'developper'`) appellent aussi : une intention, une seule rédaction (option B de David,
2026-10-14) ; restent dans `expand.ts` les refus, les messages, le plafond de termes et le mode
décimal (`decimal: true`). La trace de l'intention `developper` n'est pas montrée
(produits collés « 2x1 », la même ligne jusqu'à 13 fois, distribution cachée). Une ligne par geste,
appliqué à tous les termes où il vaut : un cube s'écrit carré × parenthèse (« On écrit (x + 1)³ =
(x + 1)²(x + 1) ») ; une identité remarquable nomme a et b (« On reconnaît (a + b)² = a² + 2ab +
b², avec a = x et b = 1 ») — seule, elle a sa ligne à × (`x² + 2 × x × 1 + 1²`) puis « On calcule
chaque terme » ; plusieurs s'écrivent calculées (« On développe chaque carré avec son identité
remarquable ») ; une parenthèse d'un produit qu'on peut réduire l'est (« On réduit dans la
parenthèse ») ; la double distribution a sa ligne à × puis « On calcule chaque produit » ; un
facteur se distribue calculé (« On distribue 3, et le signe − devant la parenthèse change le signe
de chaque terme », « On enlève la parenthèse précédée d'un − », « deux signes − se compensent ») ;
un facteur simple devant les parenthèses fait dire « chaque terme de la première parenthèse » au
lieu de « du premier facteur ». La dernière ligne dit ce qu'elle fait : « On réduit » si des termes
semblables se regroupent ; « On ordonne les termes » si seul l'ordre change dans une somme de
monômes (« pourquoi » : puissances décroissantes de x, sinon l'ordre alphabétique) — l'ordre du
module, lui, se fond dans la ligne précédente ; « On écrit chaque terme avec son coefficient »
(`y/2` → `½y`) ou « On calcule chaque terme » (`(2x)²` → `4x²`) si un terme change d'écriture. Le
titre d'identité ne nomme a et b que si l'expression n'écrit ni `a` ni `b` (`(a−2b)²` : la formule
seule) ; a et b y sont mis en forme comme les images (`b = 0,5` en mode décimal). `0(x+1)` : la
réponse 0, sans étapes. Exposant 4 ou plus : une seule ligne, « On développe la
puissance ». Jamais deux images identiques de suite ; un × dès qu'un nombre suit une lettre ou un
nombre ; chaque image est vérifiée égale à l'entrée (`areEquivalent`) ; la dernière image est la
réponse, décimaux compris (l'atelier passe sa mise en forme à chaque image). Version résumée : la
ligne à × fondue dans le calcul qui la suit, sans les « pourquoi ». Pas de « Comment ? » — la
réponse reste — pour une somme sous une fonction, une racine, dans un exposant ou une fraction
(`(x+1)(x-1)/(x+2)` se lit `(x+1)·((x-1)/(x+2))`), ni au-delà de 16 produits sur une ligne.
L'ordre du manuel vit dans `pedagogical-simplify/expand-order.ts` (`orderExpanded`), partagé par
la réponse et les étapes. Tests : `developper-commande.test.ts`,
`pedagogical-simplify/__tests__/expand-steps.test.ts`, `expand-explained.test.ts`.

**`.limite` en détail** (`limit.ts`, PR 2 de `.limite`, syntaxe tranchée par David le
2026-10-14, L1-L6). Servie par l'atelier (`ATELIER_ONLY_COMMANDS`), lue **avant** la substitution
des noms : `en 0 à droite` n'est pas une expression, et `a` y serait le mot `à`. Le point
(`readPoint`) : un nombre ou une valeur de l'atelier (`en 0,5`, `en a`, `en 1/2` écrit
`\frac{1}{2}`), `en x=1` toléré ; le côté `0+`, `0^+`, `0^{+}`, `0 à droite` (et `-`,
`à gauche`) ; l'infini `+∞`, `+inf`, `-∞`, `-inf`, `\infty`, et `∞` / `inf` seuls = +∞ (pas de
côté à l'infini : refus). Un côté sur un point qui n'est pas un nombre seul s'écrit
`x\to {\tfrac{3}{4}}^-`. La lettre est celle de l'expression, comme `.évaluer` ; une lettre tapée absente d'une expression qui en a d'autres est refusée (`.limite t^2 en x=1` → « L'expression s'écrit avec t : .limite t^2 en t=1. »), une constante reste acceptée (plusieurs sans
x : refus, « écris la variable après « en » »). Le calcul est `evaluateLimit` (`mathAST/limits`).
La réponse est une **formule**, `\lim\limits_{x\to 1}\dfrac{x^2-1}{x-1} = 2` (expression TAPÉE,
parenthèses de la barre de fraction retirées, une somme entre `\left(…\right)`).
**Citée seule** (`citedObject`) : une fonction de l'atelier `f`, `f'` ou `f(<sa lettre>)` garde
son nom et sa lettre — son expression RANGÉE (en x) est calculée en x, montrée
`\lim\limits_{t\to 0^+} f(t)` pour f(t) = 1/t, `f'(x)` pour une dérivée. Tout autre argument
(`f(t)` quand f s'écrit en x, `f(2x)`, `f(2x)+1`) est une expression : calculée substituée, dans
la lettre de l'expression substituée, affichée telle que tapée (`\lim\limits_{x\to 1}
f\left(2x\right) = 5`) ; la composée d'une fonction À ENSEMBLE choisi reste refusée
(`composedMessage`, faute de domaine de f(u(x))). Une suite `u`, `u_n` ou `u(n)` se calcule en n et
s'écrit `\lim\limits_{n\to+\infty} u_n` ; dans une expression, `u_n`, `u_k` se lisent `u(n)`, `u(k)` (`withSequenceCalls` : `.limite u_n + 1 en +∞` → 1) ; seul +∞ est accepté, que la suite soit citée seule ou dans une expression (`citedSequence`), et une suite récurrente est refusée.
**Gardes de l'atelier** (le branchement saute celles du chemin commun) : une liste citée →
`listCitedMessage` ; l'ensemble choisi d'une fonction (`f(x) = x^2 sur [0;+∞[`, I4) — un point
loin de l'ensemble est refusé comme `.évaluer` (« -1 n'est pas dans l'ensemble de définition de
f, [0 ; +∞[. »), un bord est pris du côté intérieur (`en 0` → `0^+`), un côté extérieur ou un
infini hors de l'ensemble est refusé ; une composée d'une fonction à ensemble → `composedMessage`.
`exp(1)` s'écrit `e`. **Jamais de valeur approchée** : statut `indeterminate`, `unsupported`,
`approximate`, ou un nombre à plus de 6 décimales → « Je ne sais pas calculer cette limite. »
(une réponse, pas un refus, comme `.factoriser`). Sans côté tapé, une fonction définie d'un seul
côté du point (`definedSide` du moteur) l'écrit : `.limite ln(x) en 0` →
`\lim\limits_{x\to 0^+} \ln(x) = -\infty` (aussi `sqrt(x)` en 0, `sqrt(-x)` en `0^-`, `ln(x-1)`
en 1 ; `f(x)` garde son nom). `does-not-exist` sans côté TAPÉ par l'élève (un côté imposé par l'ensemble choisi, I4, garde la
raison : f(x) = sin(1/x) sur ]0 ; +∞[, `.limite f en 0` → « Pas de limite en 0+ : f oscille… »),
selon `noLimitReason` ; le nom de la fonction s'écrit hors de `\text` (`f_1` en indice) :
`outside-domain` → « Pas de limite en -1 : l'expression n'est pas définie au voisinage de -1. »
(« f n'est pas définie… » pour une fonction citée seule ; `ln(x)` en −∞) ; `oscillation` → « Pas
de limite en +∞ : l'expression oscille sans se rapprocher d'aucune valeur. » (« f oscille… » ;
`3sin(2x)+1` en −∞, `sin(1/x)` en 0) ; sinon (L4, `sides-differ` compris) les deux limites
latérales quand le moteur les connaît, « Pas de limite en 0 : à gauche −∞, à droite +∞. », sinon
« Pas de limite en … ». **Avec un côté tapé** (Q1, David, 2026-10-14), la raison s'écrit aussi
(le moteur rend `noLimitReason` pour un côté demandé) : `.limite sqrt(-x) en 0+` → « Pas de
limite en 0+ : l'expression n'est pas définie à droite de 0. » (« à gauche de » pour `0-`, « f »
en maths pour une fonction citée) ; `sin(1/x)` en `0+` → « … oscille sans se rapprocher d'aucune
valeur. ». Une fonction usuelle sans parenthèses (`ln x`, `sin x`, `cos x`, `sqrt x`, `exp x`,
lue l·n·x par le parseur) est refusée comme dans les autres commandes (`bareFunctionRefusal`, en amont dans
`runCommand` : « « ln x » : écris ln(x) avec des parenthèses. ») ; `e^x` se lit bien. Le texte de la ligne (copie, export)
est lisible (`readableText`) : divisions en `/`, exposant long entre parenthèses (`e^(1/x)`,
jamais le `e^{1:/x}` de `toCustom`), sans accolades : `1/(x-1)^2`, `e^x/x^2`, `(x+2)/x^2`, des
parenthèses seulement où le sens l'exige (`1/(2x)`). Test :
`limite-commande.test.ts`.

**« Comment ? » de `.limite`** (`limit-steps.ts`, PR 3, décisions de David du 2026-10-14).
Les étapes sont celles de `generatePedagogicalLimitSteps` (niveau `lycee` : forme indéterminée,
factorisation, conjugué, terme prépondérant, limites de référence et croissances comparées,
composée `e^u`, côtés d'un pôle, côté implicite) — jamais `dispatchPedagogicalLimit`,
qui lit une syntaxe maison. Elles portent sur l'expression calculée, dans la lettre de l'élève
(f(t) = 1/t : t, pas le x de rangement ; une lettre déjà prise par un paramètre → pas d'étapes),
divisions écrites en fractions sans les parenthèses tapées pour la barre (`\dfrac{\sqrt{x+4}-2}{x}`),
un point non entier avec un côté écrit comme sur la ligne (`{\tfrac{1}{2}}^+`). **Gendarmes
exclus** : le moteur juge l'encadrement sur des sondes numériques (`SQUEEZE_PROBES`) sans en
rendre les bornes ; des étapes `identify-bounds` / `apply-squeeze` → pas de « Comment ? »
(`x^2 sin(1/x)` en 0) tant que le moteur n'écrit pas l'inégalité. **Fonctions en escalier
exclues** (`floor`, `ceil`, `round`, `sign`, V60) : le moteur pédagogique substitue sans voir
le saut — pas de « Comment ? » (`containsPiecewiseFunction`). **Garde de concordance** (`concludesLimitAnswer`) : la valeur
conclue est celle de la ligne par valeur exacte (`concludesEngineValue`), un infini du même signe,
le même côté implicite (l'étape qui porte `domainBoundary` ↔ `definedSide`) ; « pas de limite »
n'est expliqué que dans le cas L4 (les deux limites latérales écrites par la ligne), avec les
mêmes valeurs à gauche et à droite (`bindings` de `conclude-does-not-exist`) — `outside-domain`,
`oscillation` et « Pas de limite en … » seul n'ont pas de « Comment ? ». **Rien à montrer**
(`showsNothing`, comme E4 de `.évaluer`) : une substitution directe seule (`x^2+1` en 2,
`sqrt(x)` en 0) → pas d'étapes. Le moteur pédagogique qui lève
(`PedagogicalLimitNotImplemented` : `sqrt(x+1)-sqrt(x)` en +∞, `sin x` en +∞), un `*` dans le
LaTeX → pas d'étapes. **Résumé construit** : les étapes sans l'annonce, la forme indéterminée
(masquée comme dans le résumé du renderer, décision de David du 2026-10-12), les limites des
termes, la limite d'une somme / d'un produit / d'un quotient ni la substitution qui suit une
simplification, sans explications — la technique, la conclusion. Une fonction ou une
suite citée seule garde son nom : l'annonce écrit `\lim g(x) = \lim \dfrac{x^2-1}{x-1}` (« la
limite de $g(x)$ »), la conclusion `\lim g(x) = 2`, `u_n` pour une suite. Tests :
`limite-etapes.test.ts`, `limite-etapes-garde.test.ts`, `limite-etapes-affichage.svelte.test.ts`.

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
   Points et courbes n'entrent dans aucun des deux (la vue Figure aura le sien, PR 2).
3. **Un seul espace de noms** (D1) ; jamais d'écrasement silencieux d'un nom (création, renommage,
   fusion d'un atelier reçu).
4. **Tout contrôle sur une définition vit dans sa lecture** (`parseDefinition`), jamais dans
   `build()` : `recomputeAll` repart toujours de la lecture et écraserait le reste.
5. **Une fonction est rangée en x** ; la lettre de l'élève n'est que de l'affichage. Une
   définition en t qui contient déjà x est refusée (`letterRejection`).
6. **Rien ne quitte le navigateur.** Ni requête, ni compte : stockage local et URL seulement.
7. **Toute entrée venue de dehors passe par Zod** : sauvegarde (`atelierShellSchema`), lien
   (`decodeAtelier`, `curvesFromLink`), historique importé (`readHistory`), lignes de Calcul
   rangées (`loadCalcHistory`, formules par la liste blanche `isSafeLatex`), réglages
   (`curveDisplaySchema`).
8. **Plafonds D8** : `MAX_LIST_VALUES` (200) par liste, `MAX_LISTS` (8) listes,
   `MAX_FIGURE_OBJECTS` (50 points et courbes, M2), `MAX_DEFINITION_LENGTH` à la saisie — pour
   qu'un atelier tienne dans une URL. La grille :
   26 × 200, 200 caractères par cellule.
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
    À la **lecture d'une définition** (`parseByProvenance`, `parse.ts`), la virgule décimale et
    le « ; » qui sépare les arguments de `max`, `min`, `gcd`, `mod` sont traduits comme pour un
    calcul (`decimalCommaInput` en texte, `argumentSemicolonsLatex` en LaTeX) : `f(x) =
max(2,5 ; x)` puis `f(1)` répond `5/2` (avant le 2026-10-13 : « Écriture non reconnue »).
    ⚠️ La saisie de l'élève seulement (`'text'`, `'paste'`, `'command'`) : `'url'` relit aussi le
    texte du moteur (`toCustom` écrit `max(2,3)`), dont la virgule sépare. Comme sur une ligne de
    calcul, `f(x) = max(1,2)+x` est refusée (« Sépare les valeurs avec « ; » »). Le
    champ de la carte montre `\max\left(2{,}5;x\right)` (`argumentSeparatorsShown`).
12. **On ne valide pas** les réponses de l'élève (décision figée n° 2).
13. **Une cellule de la grille a un seul propriétaire** : la liste de sa colonne (dans sa
    définition) ou la grille (`cells`), jamais les deux.

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
carte, fusion — et la migration si un nom devient réservé (`migrateReservedNames`). Fait pour la
v2 (`point`, `curve`, 2026-10-18) : `types.ts`, `names.ts` (`PREFERRED_NAMES`), `parse.ts`
(`parseDefinition`), `atelier.svelte.ts` (`build`, `#cited`, plafond), `actions.ts` (`BY_KIND`),
`calcul.ts`, `persistence.ts`, `ObjectCard.svelte`, `ObjectPanel.svelte` ; les `Record` indexés
par le type (`KIND_WORDS`, `KIND_NAMES`) sont signalés par le typecheck. Prévu pour la v3 (Python).

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
| D6  | Pas d'annulation globale                                     | ✅ — exceptions : la dernière suppression en cascade ; la grille (T6)          |
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

- `/calc` existe encore (`/cas`, elle, est retirée depuis le 2026-10-13) ;
- **v2** géométrie : phase 0 du lot 1 validée le 2026-10-18 ; PR 1 (le modèle : points, courbes,
  `y` réservé, version 3) faite, sans vue Figure — suivi :
  [atelier-geometrie-progress.md](../wip/atelier-geometrie-progress.md). **v3** Python : non
  commencée, sans phase 0 ;
- tableur intégré (option C, 2026-10-15) : lot 1 en cours — grille de valeurs (PR 1), collage /
  copie / CSV / titres (PR 2), annulation (PR 3a), appariement par ligne (PR 3b) — lot 1 complet ;
  à venir : les formules (lot 2) ;
- dettes connues : action « Renommer » encore désactivée (« prochain lot »), `recomputeAll`
  réassigne tout le tableau (jamais mesuré), saisie des unités sans palette.

⚠️ La section « Ce qui reste pour clore la v1 » de `atelier-progress.md` (2026-10-04) dit encore
les garanties `/grapheur` non faites : elles le sont (lots 2 à 6, #779 → #809,
[atelier-grapheur-progress.md](../archive/wip/atelier-grapheur-progress.md)).

---

Vérifié contre le code le 2026-10-18.
