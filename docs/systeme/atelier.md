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
- voisin hors atelier : `/calc` (`src/routes/(public)/calc/+page.svelte`, grapheur singleton).
  Sa saisie (`UnifiedInput.svelte`) a un **mode commande** : un « . » dans le champ vide ouvre une
  zone de commande, qui garde son point (`.eval`) ; le store (`calculator.svelte.ts`) retire un
  point initial avant de rebâtir `.commande expression` pour `WebReplEngine` (V54 : il le doublait,
  et toutes les commandes répondaient « Commande inconnue »).
  `/cas` (ancien REPL web) est **retirée** depuis le 2026-10-13 : l'adresse mène à `/atelier` en
  308 (`redirectHandle`, `src/lib/server/redirectHandle.ts`).

---

## Carte du code

### Modèle — `src/lib/atelier/` (53 fichiers hors tests)

| Fichier                             | Rôle                                                                                                      |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `src/lib/atelier/types.ts`          | Les quatre types d'objets, `ObjectStatus`, `CurveDisplay`, `SequenceDisplay`, plafonds D8, gardes de type |
| `src/lib/atelier/atelier.svelte.ts` | **La classe `Atelier`** : création, renommage, mise à jour, suppression, états, `serialize`/`restore`     |
| `src/lib/atelier/names.ts`          | Validation des noms, nommage automatique (`nextName`), noms de dérivées et de réciproques (`f^-1`)        |
| `src/lib/atelier/parse.ts`          | Lecture d'une définition (`parseDefinition`), dépendances (`referencesOf`), provenance (`Provenance`)     |
| `src/lib/atelier/letter.ts`         | `f(t) = t^2` : la lettre de l'élève à l'affichage, la définition rangée en x                              |
| `src/lib/atelier/interval.ts`       | `f(x) = x^2 sur [0;+∞[` : coupe au mot « sur », lit l'ensemble, juge I3 (domaine) et I4 (`f(5)`)          |
| `src/lib/atelier/reciprocal.ts`     | La carte `f⁻¹` et `.réciproque` : f passée au moteur, paramètres gardés en lettres, refus en français     |
| `src/lib/atelier/limit.ts`          | `.limite EXPR en POINT` : point lu (côté, infini, `en x=1`), `evaluateLimit`, réponse en formule          |
| `src/lib/atelier/limit-steps.ts`    | `.limite` : « Comment ? » (`limitSteps`), garde de concordance dans `limit-steps-check.ts`                |
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
| `src/lib/atelier/derive-steps.ts`       | `.dériver` et « Dériver » expliqués (`deriveSteps`)                                                        |
| `src/lib/atelier/solve-steps.ts`        | `.résoudre` par étapes (`solveSteps`)                                                                      |
| `src/lib/atelier/solve-steps-check.ts`  | Garde-fou : une conclusion d'étapes que les nombres démentent n'est pas montrée                            |
| `src/lib/atelier/variations-steps.ts`   | `.variations` et « Variations » : tableau et détail (`variationsRendering`)                                |
| `src/lib/atelier/steps-summary.ts`      | Interrupteur « Résumé / Détaillé » : `summaryOf`, choix retenu dans le navigateur                          |
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
| `ObjectCard.svelte`       | Une carte : nom, définition, état, actions                                                                              |
| `DefinitionField.svelte`  | `f(x) =` + champ MathLive ; la frappe met l'objet à jour 0,3 s après la dernière touche                                 |
| `ValueSlider.svelte`      | Curseur d'une valeur (bornes et pas réglables)                                                                          |
| `CurveSettings.svelte`    | « Sur le graphique » : couleur, trait, tangente, aire, cercle osculateur, longueur                                      |
| `SequenceSettings.svelte` | Mode, rang initial, premier terme ; nuage ou escalier                                                                   |
| `CalculView.svelte`       | Vue Calcul : champ, historique, « Garder », export / import                                                             |
| `FormulaText.svelte`      | Un message de l'atelier dont les formules `$…$` sont composées (refus de `.réciproque`, valeur interdite de `.évaluer`) |
| `DataView.svelte`         | Vue Données : une liste par ligne, valeurs séparées par `;`, diagrammes                                                 |
| `ShareBar.svelte`         | Partager (lien `?a=`), recevoir, « Garder dans mon atelier »                                                            |

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
cite est laissé de côté ; les formules sont gardées tant que l'atelier ne change pas (`formulas`, sinon cinq réciproques citées coûtaient 11 s). L'argument de `f⁻¹(…)` est vérifié sur l'arbre (`f⁻¹(g(2))`, `\left(…\right)`). Un nom à indice (`f_1⁻¹`) est refusé (les parseurs y lisent une puissance) ; `f⁻¹(x) = 5x` aussi : elle se calcule, elle ne se définit pas. `g(x) = f⁻¹(x)` hérite de l'ensemble de DÉPART de f⁻¹ (`citedIntervals` reçoit `citedReciprocalInterval`), et l'empreinte du moteur (`atelierMark`) contient les ensembles : f qui change d'ensemble change g. En erreur, `g(4)` rend le message de g. L'inverse s'écrit `1/f(x)` ou `f(x)^-1` ; `x^-1`, `2^-1`, `a^-1` restent
des puissances. `.réciproque f⁻¹` répond « La réciproque de f⁻¹, c'est f. ». La carte **suit f** (`#reciprocals`, en
dernier dans `recomputeAll`) : formule rangée en texte (provenance `text`), `interval` = son
ensemble de départ f(I) (Q5 : le tracé et les calculs suivent, `ℝ` n'est pas rangé) ; f devenue
non bijective, constante… → la carte passe en erreur avec le refus, définition vide (rien de
tracé). Elle dépend de f seule (`#refsOf`) : supprimer f l'emporte, renommer f la renomme, sa
lettre est celle de f. Pas de « Dériver » ni de « Réciproque » sur `f⁻¹`, ni de « Réciproque » sur
`f′` (raison affichée : taper la formule). L'image `f⁻¹(5)` de la carte passe par sa formule (le
moteur lirait `f^-1` comme une puissance). **Droite y = x** (décision (3)) : grise
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

### Ce que fait la classe `Atelier`

- **créer** : `create` (+ `createDerivative` pour `f′`, `createReciprocal` pour `f⁻¹`,
  `createFromOffer` pour un curseur) ;
- **modifier** : `update`, `rename` (réécrit les définitions qui citent l'ancien nom),
  `setSlider`, `slideTo`, `setSequence`, `setDisplay`, `setSequenceDisplay`, `setPlotted` ;
- **supprimer** : `remove`, `removalOf`, `removeWithDependents`, `undoRemoval` ;
- **dépendances** : `dependents` ; toute mutation finit par `recomputeAll` (relit tout) ;
- **sauvegarde** : `serialize`, `restore` ; `revision` est le **seul** signal « quelque chose a
  changé » (la session l'écoute pour enregistrer).

### Commandes

La vue Calcul a **un seul champ**, comme l'ancienne `/cas` : ce que l'élève tape est une **définition** (crée
ou met à jour un objet), un **calcul** (une ligne d'historique) ou une **commande** (commence par
un point). `runInput` (`src/lib/atelier/calcul.ts`) rend un `CalcResult` de kind `vide`,
`definition`, `calcul`, `commande` ou `refus`.

**La ligne d'une définition dit ce que dit la carte** (`definitionText`, `desk.svelte.ts`,
décision de David du 2026-10-13) : « « f » est dans tes objets. » seulement si la carte n'a pas
de message ; en erreur, « « h » est dans tes objets, mais elle est en erreur : » + le message de la
carte, et la ligne est en échec (`failed`) ; en attente, « « p » est dans tes objets, en attente
de « q », qui n'est pas encore défini. », sans échec. Au rejeu, une définition en échec n'arrête
pas (un export d'avant la disait réussie).

**Syntaxe** : voir [atelier-syntaxe.md](atelier-syntaxe.md) — mots-clés français (`de … à`,
`pour`, `en`, `ordre`, `dans`, `et`), noms et mots-clés sans accent acceptés, ancienne écriture
acceptée quand elle est sans ambiguïté. La lecture vit dans `mathAST` :
`readCommandArguments`, `isKeywordCommand`, `guessedVariable` dans
`src/lib/mathAST/cli/core/variable-argument.ts`.

**Trois sources de commandes**, réunies par `commandCatalog` (`src/lib/atelier/commands.ts`) :

| Source                     | Où                            | Exemples                                                              |
| -------------------------- | ----------------------------- | --------------------------------------------------------------------- |
| registre du moteur         | `WebReplEngine.getCommands()` | `.dériver`, `.résoudre`, `.intégrer`, `.variations`, `.taylor`        |
| branchées hors registre    | table `OFF_REGISTRY`          | `.convertir`, `.stats`, `.ajustement`, `.exact`, `.décimal`           |
| servies par l'atelier seul | `ATELIER_ONLY_COMMANDS`       | `.factoriser`, `.réciproque`, `.limite`, `.simuler`, `.croiser`, lois |

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
| Données | `DataView.svelte`                     | listes en lignes, diagrammes en bâtons / barres / circulaire                                                                        |

Deux ponts à **sens unique**, tous deux idempotents (une empreinte évite de refaire le travail) :

- `syncEngine` (`engine.ts`) : l'atelier détient les noms, `WebReplEngine` n'est qu'un
  calculateur remis en accord avant chaque usage (Q1, option B). Une fonction liée s'y lit
  comme une fonction quel que soit son nom (`k(x) = x+1` puis `k(0)` → 1 ; avant le 2026-10-13,
  seuls f, g, h, u, v, w l'étaient) : le moteur passe son état à chaque lecture ;
- `syncPlots` (`plot-sync.ts`) : l'atelier détient l'état, le grapheur le reflète. Rien de ce qui
  se passe dans le grapheur ne remonte. ⚠️ L'effet qui l'appelle lit et écrit le store : s'il
  cessait d'être idempotent, il bouclerait.

### Session, persistance, URL

- **Stockage local** (`persistence.ts`) : clé `ATELIER_STORAGE_KEY` (`chiphre-atelier`),
  version `ATELIER_STATE_VERSION`. On range de quoi **reconstruire** (nom, type, définition,
  tracé, lettre, intervalle, réglages), jamais l'état ni le message — ils se recalculent. La carte
  `f⁻¹` est rangée sans sa formule ni son ensemble (recalculés depuis f, comme `f′`), avec
  l'intervalle tapé (`reciprocalOn`) ; un lien ou une fusion la recrée, et une f renommée à
  l'arrivée (`g`) emmène sa réciproque (`g⁻¹`, `mergeInto`). Un objet abîmé est
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
  `MAX_LINK_CURVES` (8) courbes validées par Zod ; « sur » s'y lit comme ailleurs
  (`?f=x^2 sur [0;+∞[`, décision g du 2026-10-13).
- **Mode éphémère** : `?a=` comme `?f=` ouvrent un atelier qui **ne lit ni n'écrit** l'atelier
  personnel ; un lien abîmé le dit et ouvre l'atelier personnel. « Garder dans mon atelier »
  (`keepReceived`) verse dans l'atelier personnel ; en cas de collision, **l'arrivant est
  renommé** et on le dit (Q2, `mergeInto`).
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
  `$…$` d'un refus) n'est gardée que si **chacune de ses commandes** est sur la liste blanche de
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
| `.réciproque`, « Réciproque », `f⁻¹`    | `computeReciprocal` (`src/lib/mathAST/reciprocal/`, [mathast/reciproque.md](mathast/reciproque.md)) ; lettres des paramètres : `solve` puis `textbookWriting`                                                                                                                                                                                        |
| `.résoudre`, « Résoudre »               | `src/lib/mathAST/pedagogical-solve/`, vérifié par `solve-steps-check.ts`                                                                                                                                                                                                                                                                             |
| `.intégrer`                             | réponse : `integration` (`integrate.command.ts`) ; « Comment ? » : `src/lib/mathAST/pedagogical-integration/` niveau lycée, vérifié par `integrate-steps-check.ts`                                                                                                                                                                                   |
| `.domaine`                              | réponse : `computeDomain` (`domain.command.ts` refuse ce qu'il ne résout pas), écrite par `domainToLatex` ; « Comment ? » : `src/lib/mathAST/pedagogical-domain/` niveau lycée, vérifié par `domain-steps-check.ts`                                                                                                                                  |
| `.évaluer`                              | réponse : `eval.command.ts` — `substitute`, refus d'une valeur interdite (`forbiddenValue`, `mathAST/eval/forbidden-value.ts`, exact), puis `evaluate` ; la ligne est une formule (`evaluatedLine`, voir ci-dessous) ; « Comment ? » : `src/lib/mathAST/pedagogical-arithmetic/` niveau collège, vérifié par `evaluate-steps-check.ts`               |
| `.limite`                               | réponse : `evaluateLimit` (`mathAST/limits`) ; « Comment ? » : `generatePedagogicalLimitSteps` (`src/lib/mathAST/pedagogical-limits/`) niveau lycée, vérifié par `limit-steps-check.ts`                                                                                                                                                              |
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
(`parametersOf` : `missing` tout en `as: 'value'`, `f(x) = a x`) se comporte comme son
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
lue l·n·x par le parseur) est refusée comme dans les autres commandes (`bareFunctionName` :
« Écris ln(x) avec des parenthèses. ») ; `e^x` se lit bien. Le texte de la ligne (copie, export)
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
(`x^2 sin(1/x)` en 0) tant que le moteur n'écrit pas l'inégalité. **Garde de concordance** (`concludesLimitAnswer`) : la valeur
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
    À la **lecture d'une définition** (`parseByProvenance`, `parse.ts`), la virgule décimale et
    le « ; » qui sépare les arguments de `max`, `min`, `gcd`, `mod` sont traduits comme pour un
    calcul (`decimalCommaInput` en texte, `argumentSemicolonsLatex` en LaTeX) : `f(x) =
max(2,5 ; x)` puis `f(1)` répond `5/2` (avant le 2026-10-13 : « Écriture non reconnue »).
    ⚠️ La saisie de l'élève seulement (`'text'`, `'paste'`, `'command'`) : `'url'` relit aussi le
    texte du moteur (`toCustom` écrit `max(2,3)`), dont la virgule sépare. Comme sur une ligne de
    calcul, `f(x) = max(1,2)+x` est refusée (« Sépare les valeurs avec « ; » »). Le
    champ de la carte montre `\max\left(2{,}5;x\right)` (`argumentSeparatorsShown`).
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

- `/calc` existe encore (`/cas`, elle, est retirée depuis le 2026-10-13) ;
- **v2** géométrie à la souris, **v3** Python : non commencées, sans phase 0 ;
- données en grille (tableur intégré, options A/B) : question ouverte ;
- dettes connues : action « Renommer » encore désactivée (« prochain lot »), `recomputeAll`
  réassigne tout le tableau (jamais mesuré), saisie des unités sans palette.

⚠️ La section « Ce qui reste pour clore la v1 » de `atelier-progress.md` (2026-10-04) dit encore
les garanties `/grapheur` non faites : elles le sont (lots 2 à 6, #779 → #809,
[atelier-grapheur-progress.md](../archive/wip/atelier-grapheur-progress.md)).

---

Vérifié contre le code le 2026-10-10.
