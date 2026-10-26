---
couvre:
  - 'src/lib/ubumark/**'
  - 'src/lib/components/markdown/**'
  - 'src/lib/extensions/**'
  - 'src/lib/resources/**'
  - 'src/lib/components/rich-text/markdown-{import,export}.ts'
  - src/lib/components/exercises/LaTeXImportDialog.svelte
  - src/lib/utils/markdown-cache.ts
  - scripts/check-ubumark.ts
---

# ubumark — la notation des contenus

> Doc de référence du module `src/lib/ubumark/` et de son rendu `src/lib/components/markdown/`.
> Pratiques d'écriture (à ne pas dupliquer ici) : [notation-unites](../pratiques/notation-unites.md)
> (grandeurs), [fiches-exercices](../pratiques/fiches-exercices.md) (fiches, pièges PDF).
> Vérifié contre le code le 2026-10-11 ; espaces de groupement le 2026-10-23 ; bloc horloge le 2026-10-24 ; bloc opération le 2026-10-25 ; sa saisie (case de question) le 2026-10-25 ; saisie de la multiplication le 2026-10-25 ; saisie de la division le 2026-10-25 ; bloc collection le 2026-10-25 ; bloc figure-a-completer le 2026-10-25 (carré / rectangle le 2026-10-26) ; scène commune collection / monnaie le 2026-10-25 ; bloc monnaie le 2026-10-25 ; sa recette le 2026-10-25 ; paragraphe collé au bloc qui le suit (PDF) le 2026-10-26 ; collection à construire le 2026-10-26 ; monnaie à construire le 2026-10-26 ; bloc figure-de-travail le 2026-10-26.

## À quoi ça sert

**ubumark** ([CONTEXT.md](../../CONTEXT.md)) est la notation texte de tout le contenu rédigé :
énoncés et corrections des **modèles de question**, exercices, cours, fiches, messages du chat,
articles. C'est du Markdown augmenté de :

- formules en LaTeX (`$…$`, `$$…$$`) **ou** en notation « custom » (`~…~`, `~~…~~`), lue par le
  parseur de `mathAST` ;
- **blocs spéciaux** (fences nommées) qui dessinent : tableaux de variations / de signes, arbres de
  probabilités, cercle trigonométrique, droite graduée, courbes, figures géométriques, diagrammes
  et tableaux statistiques, simulations ;
- **paramétrage** (`{{a}}`, `{{random:1..10}}`, `{{eval:a+b}}`) et **cases** (`{{blank:N}}`)
  pour les modèles de question.

Une même source donne **deux sorties** : l'écran (composants Svelte) et le PDF (Typst, compilé dans
le navigateur — [ADR 0004](../adr/0004-pdf-typst-et-jspdf.md)).

Hors périmètre : les **QCM** (choix, mélange) ne sont pas de la notation ubumark — ils vivent dans
`src/lib/questions/` (le texte de chaque choix, lui, est rendu en ubumark).

## Carte du code

### `src/lib/ubumark/` (85 fichiers source, 146 fichiers de test)

| Dossier / fichier   | Rôle                                                                                                                                                                                                                                                                                                               |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `index.ts`          | Baril public (`parseMarkdown`, `resolveText`, `generateTypst`…). ⚠️ Importé par toutes les pages Markdown : n'y rien brancher de lourd.                                                                                                                                                                            |
| `types/`            | `ast.ts` (nœuds en ligne et de bloc, union `BlockNode`, `DocumentNode`), un fichier par bloc spécial (`variation-table.ts`, `probability-tree.ts`, `trig-circle.ts`, `number-line.ts`, `courbe.ts`, `figure.ts`, `stat-chart.ts`, `qr.ts`), `template.ts` (types marqués `TemplateMarkdown` / `ResolvedMarkdown`). |
| `parser/`           | `markdown-parser.ts` (`parseMarkdown`, 3 000 lignes), `math-extractor.ts`, sous-parseurs Markdown (listes, tableaux, citations, code) et un parseur par bloc spécial (`*-parser.ts`).                                                                                                                              |
| `parser/` (gardes)  | `indented-fences.ts`, `block-ranges.ts`, `block-closure.ts`, `unclosed-block.ts` : où commence et finit un bloc (voir Invariants).                                                                                                                                                                                 |
| `utils/`            | **Scènes** : `courbe-scene.ts`, `figure-scene.ts`, `stat-chart-scene.ts`, `simulation-scene.ts`, `comparison-scene.ts`, `number-line-render.ts`… — géométrie calculée une fois, dessinée par l'écran ET le PDF. Plus `detail-kinds.ts` (encadrés), `list-depth.ts`.                                                |
| `generators/`       | `typst-generator.ts` (`generateTypst`, aiguillage par type de nœud) + un générateur Typst par bloc (`*-typst.ts`). `latex-generator.ts` (export `.tex`, sans appelant hors du module à ce jour).                                                                                                                   |
| `parameterization/` | `parser/` (tokenizer, `{{random}}`, `{{eval}}`), `resolver/` (`resolveVariables`, `resolveText`), `validator/` (dépendances circulaires), `display-options.ts`, `expression-transforms.ts`.                                                                                                                        |
| `builders/`         | `sign-table.ts` (`signTableNode`), `variation-table.ts` (`variationTableNode`) : traduisent une grille calculée par `mathAST` en `VariationTableNode`. **Ne calculent aucun signe.** La première borne n'est marquée ouverte que si le PREMIER intervalle l'est (x² sur [0 ; +∞[ commence par `[0 ; 0]`).          |
| `importers/latex/`  | `transpileLatexToMarkdown` : import d'un exercice LaTeX (dialogue `src/lib/components/exercises/LaTeXImportDialog.svelte`).                                                                                                                                                                                        |

### Rendu écran — `src/lib/components/markdown/`

| Fichier                                                 | Rôle                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MarkdownRenderer.svelte`                               | Orchestrateur : cache d'AST (`src/lib/utils/markdown-cache.ts`), mode restreint, mots cliquables, aiguillage par type.                                                                                                                                                                                                                                                                                                                          |
| `nodes/*.svelte`                                        | Un composant par nœud : `VariationTable`, `ProbabilityTree`, `TrigCircle`, `NumberLine`, `Courbe`, `FigureBlock`, `StatChart`, `QrBlock`, `MathInline`, `MathPrompt`, `BlankInput`…                                                                                                                                                                                                                                                             |
| `nodes/ListNode.svelte`, `nodes/StaticBlockNode.svelte` | Rendent les blocs **dans un item de liste** : chaque nouveau bloc doit y être aussi.                                                                                                                                                                                                                                                                                                                                                            |
| `nodes/TrigCircle.svelte`                               | Cercle trigonométrique. En mode `interactive`, la souris est lue en unités du dessin (viewBox 320 × 320, `svgPoint`) : le point saisi reste juste quand le cercle est affiché réduit ou agrandi (diapositive réduite, deck mis à l'échelle ; testé par `TrigCircle-echelle.svelte.test.ts`).                                                                                                                                                    |
| `nodes/CodeBlock.svelte`, `utils/code-highlight.ts`     | Bloc de code ordinaire. Coloré par `highlight.js` chargé à la demande (cœur + un morceau par langage) **après** le montage (le rendu serveur reste en texte brut) : python (`py`), javascript (`js`), typescript (`ts`), bash (`sh`, `shell`), json, xml (`html`, `svg`), css, sql, latex (`tex`). Langage absent ou autre : texte brut, sans détection automatique. Chat élève : langages retirés (`stripFenceLanguages`), donc jamais coloré. |
| `utils/math-utils.ts`                                   | `expressionToLatex` / `expressionToRawLatex` : `~…~` → LaTeX via `parseCustomSafe` de `mathAST` ; erreur → LaTeX rouge.                                                                                                                                                                                                                                                                                                                         |
| `content-locale.ts`                                     | Langue du document (virgule FR / point EN des décimaux).                                                                                                                                                                                                                                                                                                                                                                                        |
| `content-capital-pairs.ts`                              | Sens de `AB` (longueur ou produit) des formules maison, posé par la carte d'une question ou d'un exercice ; `clearCapitalPairs` le coupe (chat).                                                                                                                                                                                                                                                                                                |
| `content-digit-grouping.ts`                             | Seuil des espaces de groupement (4 pour un modèle « Espaces dès 4 chiffres », sinon le BIPM, 5), posé par la carte d'une question, lu par `MathInline`, `MathBlock`, `MathPrompt`, `ParagraphNode`.                                                                                                                                                                                                                                             |
| `authoring-errors.ts`                                   | Le prof voit le message d'erreur d'un bloc, l'élève un cadre neutre.                                                                                                                                                                                                                                                                                                                                                                            |
| `render-budget.ts`                                      | `DOCUMENT_FIGURE_LIMITS` : plafond de figures/courbes par document.                                                                                                                                                                                                                                                                                                                                                                             |
| `restricted-rendering.ts`                               | Mode restreint du chat élève (`restrictDocument`, `stripFenceLanguages`).                                                                                                                                                                                                                                                                                                                                                                       |

### Ailleurs

- **PDF** : `src/lib/typst/` (carnets), `src/lib/exercises/typst/exercise-typst-generator.ts` et
  le rendu des exercices de fiche (`src/lib/worksheets/document/render-exercise.ts`, prof et élève)
  appellent `generateTypst`.
- **Éditeur riche** (TipTap) : `src/lib/components/rich-text/markdown-import.ts` /
  `markdown-export.ts` (aller-retour : un bloc spécial devient un `codeBlock` de son langage et
  revient intact), vues d'édition dans `src/lib/extensions/`.
- **Contrôle d'auteur** : `scripts/check-ubumark.ts` (`pnpm check:ubumark`).
- **Instanciation** des modèles : `src/lib/questions/generator/instance-generator.ts`
  (`generateInstance`) et `src/lib/questions/generator/content-resolver.ts` appellent le paramétrage.

### Références internes et adressage — `src/lib/resources/`

Vérifié contre le code le 2026-10-13. Une référence `[[type:uuid|libellé]]` (ou
`[[worksheet:uuid#3,5-7|libellé]]`) cite une ressource ; ce module dit **où elle vit** pour un
lecteur donné, et rien de plus (le droit de lire reste aux gardes des routes et à la RLS).

- `kinds.ts` : `RESOURCE_KINDS` (exercice, fiche, `worksheet_exercise` — l'identifiant est celui
  de la jonction `worksheet_exercises` —, question, évaluation, chapitre, exercice Python,
  notebook, construction, document) et `isResourceKind`. Sans dépendance, importable côté serveur.
- `registry.ts` : `RESOURCE_REGISTRY` (libellé, icône, une route par rôle `ViewerRole` :
  `teacher`, `student`, `admin`, `public`, ou `null`) et `resolveResource` → `url` ou `null`.
  Routes construites par `resolve()` de SvelteKit : une route disparue est une erreur de type.
  Appelants : `InternalLink.svelte` (rendu ubumark), la page `/dashboard/teacher/recherche`.
- `references.ts` : `REFERENCE_REGEX` (même grammaire que le parser, `markdown-parser.ts`),
  `extractResourceReferences` (dédoublonnées, sélection comprise), `referenceIdsOfKind`,
  `referencesToLabels` (aperçu en texte du cahier de texte). Lus par
  `src/lib/server/curriculum-coverage.ts` (couverture du programme tirée d'une séance) et
  `src/lib/server/worksheets/citations.ts`.
- `linkify.ts` : `linkifyResourceReferences` change les références en liens **dans du HTML**
  (cahier de texte saisi dans TipTap), à appliquer **après** l'assainissement ; un type sans page
  pour ce lecteur reste du texte grisé. Appelants : cahier de texte élève et cahier public.
- `prefixes.ts` (`KIND_PREFIXES`, `parseResourceQuery`, `prefixHint`) et
  `exercise-selection.ts` (`parseExerciseSelection`, `formatExerciseSelection`,
  `describeExerciseSelection`) servent le sélecteur `[[` de
  `src/lib/extensions/resource-link-extension.ts` : `[[exos:derivees#3` cherche les fiches et vise
  l'exercice 3. La sélection désigne des **numéros** dans la fiche, pas des identifiants.
- Tests : `src/lib/resources/__tests__/` ; `registry.test.ts` parcourt `src/routes` et vérifie
  que chaque route déclarée existe.

## La syntaxe

Chaque exemple ci-dessous est **tiré d'un test existant** (cité) ; aucun n'est inventé.

### Formules

| Écriture         | Sens                                             | Test                                                          |
| ---------------- | ------------------------------------------------ | ------------------------------------------------------------- |
| `$x^2$`, `$$…$$` | LaTeX en ligne / en bloc                         | `src/lib/ubumark/__tests__/parser/math-extractor.test.ts`     |
| `~2x+3~`         | notation custom en ligne (`syntax: 'custom'`)    | idem, « Calculate ~2x+3~ and ~y^2~ »                          |
| `~~x^2=4~~`      | notation custom en bloc                          | idem, « Formula:\n~~x^2=4~~\nEnd »                            |
| `~3[m.s^{-1}]~`  | grandeur : unité entre crochets collée au nombre | `src/lib/ubumark/generators/__tests__/unit-rendering.test.ts` |
| `$2~\unit{cm}$`  | grandeur en LaTeX                                | idem                                                          |

La notation custom est stockée **telle quelle** dans l'AST ; elle n'est convertie en LaTeX qu'au
rendu (`expressionToLatex` à l'écran, `expressionToRawLatex` puis `convertLatexToTypstMath` au PDF).
Les lettres-fonctions viennent de `generic_functions` de l'exercice (`genericFunctionsConfig`) :
une liste déclarée **remplace** les défauts (f, g, h, u, v, w, F, G, H). Le sens de `AB` (longueur
ou produit) passe au PDF par l'option `capitalPairs` de `generateTypst` (absente : produit, l'écriture
d'avant) ; à l'écran par le contexte `content-capital-pairs.ts`. Règles des unités et des
crochets de calcul : [notation-unites](../pratiques/notation-unites.md). Pièges connus (grec sans
antislash, prime hors `f'`, années groupées « 2 026 ») : `pnpm check:ubumark` les signale.

Option `afterQuestion(index)` de `generateTypst` (cadres de réponse des fiches, ADR 0030 lot 3) :
ce qu'elle rend se pose à la fin de chaque élément de **premier niveau** des listes numérotées de
**premier niveau**, après ses sous-éléments ; `index` court d'une liste à l'autre. Le cadre
emmène ce qui le précède : élément d'un seul bloc insécable, sinon son dernier bloc `sticky`.
Option `keepEndWithNext` : le dernier bloc du document (dernier élément d'une liste) reste collé
à ce qui suit (cadre unique). Aucun nœud d'AST
ajouté : le parseur ne peut pas produire de cadre depuis le texte d'un prof. Détail :
[fiches-et-pdf](fiches-et-pdf.md) § Cadres de réponse.

**Paragraphe collé au bloc qui le suit** (décision de David, 2026-10-26) : au PDF, un paragraphe
ne reste pas seul en bas de page quand le bloc qui le suit part sur la suivante (« 30 pièces en
vrac : » puis son ` ```monnaie `). Il est `sticky` devant tout bloc **sauf** un autre paragraphe, un
titre ou un trait (dessins, formules centrées, tableaux, listes, citations), au niveau du document
comme dans un élément de liste (`keepsWithNext`). Premier paragraphe d'un élément : porté par
`ubu-item` (`tete:`), dans le même bloc collé que le numéro, sinon le numéro resterait seul sur sa
ligne. Effet de bord voulu : le bloc qui suit ce premier paragraphe est centré, comme partout (il
restait à gauche). Tests : `generators/__tests__/paragraphe-colle-typst.test.ts` (rendu réel
compilé, texte des pages lu par pdfjs). Le texte d'auteur échappe ses crochets (`escapeTypstBrackets`) : posé dans un
contenu `[…]`, un intervalle écrit en texte (`]2 ; 3[`) le fermait trop tôt et le PDF ne compilait
plus (déjà vrai avant, selon la place du crochet).

### Marques en ligne propres à ubumark

| Écriture                                 | Nœud / effet                                  | Test                                                                              |
| ---------------------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------- |
| `Texte {{blank:1}} suite`                | `BlankNode` (case texte, `BlankInput.svelte`) | `src/lib/ubumark/__tests__/parser/markdown-parser.test.ts`                        |
| `$3+5=\placeholder[0]{}$`                | case dans une formule (`MathPrompt.svelte`)   | `src/lib/components/questions/__tests__/QuestionCard-champ-stable.svelte.test.ts` |
| `$<<expr:expression1>>10^2$`             | relie la formule à une expression du modèle   | `src/lib/ubumark/__tests__/parser/blank-and-expression.test.ts`                   |
| `{{hint:myHintId}}`                      | `HintReferenceNode`                           | `src/lib/ubumark/__tests__/parser/hint-parser.test.ts`                            |
| `[[chapter:<uuid>\|Chapitre Fractions]]` | `InternalLinkNode`                            | `src/lib/ubumark/__tests__/parser/internal-link-parser.test.ts`                   |
| `Le [nombre]{.def} est pair.`            | mot cliquable forcé (lexique)                 | `src/lib/ubumark/__tests__/parser/lexicon-marks.test.ts`                          |
| `[x]{.rappel}`                           | détail en ligne typé                          | `src/lib/ubumark/__tests__/parser/detail-callouts.test.ts`                        |

Le marqueur `<<expr:…>>` est posé par le générateur de questions, pas par l'auteur.

### Marques de bloc propres à ubumark

| Écriture                                  | Effet                                                        | Test                                                                            |
| ----------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| `> [!rappel] $(a+b)^2 = a^2 + 2ab + b^2$` | encadré typé (`callout`: rappel, méthode, attention, calcul) | `src/lib/ubumark/__tests__/parser/detail-callouts.test.ts`                      |
| `:colonnes 2` puis une liste              | liste sur 2 à 4 colonnes                                     | `src/lib/ubumark/__tests__/parser/list-columns.test.ts`                         |
| `![alt](url){…}`, `!video[…](url)`        | image dimensionnée / vidéo                                   | `src/lib/ubumark/__tests__/parser/image-parser.test.ts`, `video-parser.test.ts` |

### Blocs spéciaux

Un bloc spécial est une fence dont le langage est un mot réservé. Ouverture **exacte** (` ```line `
oui, ` ```linear ` non : bloc de code ordinaire). Ils sont reconnus au premier niveau **et**
en retrait sous un item de liste.

| Fence                                                                                                                     | Nœud (`type`)               | Parseur (`src/lib/ubumark/parser/`) | Rendu écran              | Générateur PDF                   |
| ------------------------------------------------------------------------------------------------------------------------- | --------------------------- | ----------------------------------- | ------------------------ | -------------------------------- |
| `variation`                                                                                                               | `variation-table`           | `variation-table-parser.ts`         | `VariationTable.svelte`  | `variation-table-typst.ts`       |
| `probtree`                                                                                                                | `probability-tree`          | `probability-tree-parser.ts`        | `ProbabilityTree.svelte` | `probability-tree-typst.ts`      |
| `trig`                                                                                                                    | `trig-circle`               | `trig-circle-parser.ts`             | `TrigCircle.svelte`      | `trig-circle-typst.ts`           |
| `line`                                                                                                                    | `number-line`               | `number-line-parser.ts`             | `NumberLine.svelte`      | `number-line-typst.ts`           |
| `courbe`                                                                                                                  | `courbe`                    | `courbe-parser.ts`                  | `Courbe.svelte`          | `courbe-typst.ts`                |
| `figure`, `figure-a-completer`, `figure-de-travail`                                                                       | `figure`                    | `figure-parser.ts`                  | `FigureBlock.svelte`     | `figure-typst.ts` (via registre) |
| `barres`, `circulaire`, `histogramme`, `frequences-cumulees`, `tableau-croise`, `loi`, `simulation`, `effectifs`, `nuage` | `stat-chart` (champ `kind`) | `stat-chart-parser.ts`              | `StatChart.svelte`       | `stat-chart-typst.ts`            |
| `qr`                                                                                                                      | `qr`                        | `qr-parser.ts`                      | `QrBlock.svelte`         | `qr-typst.ts`                    |
| `horloge`                                                                                                                 | `horloge`                   | `horloge-parser.ts`                 | `Horloge.svelte`         | `horloge-typst.ts`               |
| `operation`                                                                                                               | `operation`                 | `operation-parser.ts`               | `Operation.svelte`       | `operation-typst.ts`             |
| `collection`                                                                                                              | `collection`                | `collection-parser.ts`              | `Collection.svelte`      | `collection-typst.ts`            |
| `monnaie`                                                                                                                 | `monnaie`                   | `monnaie-parser.ts`                 | `Monnaie.svelte`         | `monnaie-typst.ts`               |
| `choix` (clôture ```` si un choix contient un bloc)                                                                       | `choice`                    | `choix-parser.ts`                   | `ChoiceBlock.svelte`     | `typst-generator.ts` (« A) … »)  |

Bloc ```choix (case « choix » d'une question, [questions.md](questions.md)) : réglages en tête
(`plusieurs:`, `melanger:`, `case:` posée par le générateur), un choix par ligne `- …`, suite en
retrait de 2 espaces ; les choix restent du markdown (formules non extraites, `blockLineRanges`),
rendus un à un. Hors question : liste A, B, C non cliquable (`ChoiceList.svelte`). Le nœud garde
son texte (`source`) : l'éditeur riche le rend en bloc de code `choix`, et l'export pose une clôture
plus longue que toute clôture intérieure (```` si un choix contient un bloc). Réécriture d'un bloc
de modèle : `serializeTemplateChoiceBlock` ; `rewritable: false` quand une ligne ou un réglage est
illisible (la réécriture le perdrait).

La liste des genres statistiques est `STAT_CHART_KINDS` (`src/lib/ubumark/types/stat-chart.ts`).

**Tableau de variations / de signes** — `src/lib/ubumark/__tests__/parser/variation-table-integration.test.ts` :

````text
```variation
variable: x
domain: -inf, 0, +inf

sign: f(x)
  -inf,0: +
  0: z
  0,+inf: -
```
````

Une ligne `variation: f(x)` suivie de `-1: 3, top` / `0: 0, bottom` ajoute les flèches
(`src/lib/ubumark/__tests__/parser/variation-table-parser.test.ts`). Un tableau de signes **est**
un ` ```variation ` sans ligne `variation:`. Une borne ±∞ sans entrée est complétée au rendu
par `withImplicitEndpoints`. Les virgules séparent les valeurs : écrire `11/2`, pas `5,5`.

**Arbre, cercle, droite graduée** — `src/lib/ubumark/__tests__/blocs-speciaux-listes.test.ts`
(les quatre blocs « historiques », en item de liste) :

````text
```probtree        ```trig              ```line
Rouge:1/2          preset: quarters     start: 0
Bleue:1/2          ```                  end: 5
```                                     step: 1
                                        ```
````

Branches imbriquées par indentation (`Pile:1/2` puis `  Face:1/2`), options `root:`, `outcomes:`,
`intersection:` : `src/lib/ubumark/__tests__/parser/probability-tree-parser.test.ts`.

**Courbe** — `src/lib/ubumark/__tests__/courbe/courbe-markdown.test.ts` :

````text
```courbe
x: -4 ; 6
y: -8 ; 12
f(x) = x^2 - 2
```
````

**Figure** (en-tête, `---`, puis script du DSL de `geometry-core` — doc :
[dsl-builtins](geometrie/dsl-builtins.md)) — `src/lib/ubumark/__tests__/figure/figure-markdown-to-typst.test.ts` :

````text
```figure
fenetre: 0 ; 4 ; 0 ; 3
---
A = point(1, 1)
```
````

Clés de l'en-tête : `fenetre:` (obligatoire), `taille:`, `description:`, `axes:`, `grille:`,
`graduations:`. `deplacable:` et `rendu:` sont **réservées aux figures interactives** (figures
stockées, option `interactive` de `parseFigureContent`) : dans un bloc d'exercice, refus situé
« réglage réservé aux figures interactives » — `src/lib/ubumark/__tests__/figure/figure-reglages-interactifs.test.ts`.

**Figure à compléter** (case « figure » d'une question : la figure de départ que l'élève complète) —
`src/lib/ubumark/__tests__/construction/construction-parser.test.ts` :

````text
```figure-a-completer
fenetre: 0 ; 10 ; 0 ; 6
outils: droite
verifier: droite_par A ; B
---
A = point(1, 2)
B = point(7, 2)
C = point(4, 5)
```
````

Même en-tête et même langage que ` ```figure `, plus trois lignes propres, lues par
`construction-parser.ts` (`readConstructionHeader`) puis effacées avant le parseur de figure (numéros
de ligne gardés) : `outils:` (`CONSTRUCTION_TOOLS` : `droite` ou `segment`, un seul ; absent : celui de la vérification,
`CHECK_TOOL`), `verifier:` (obligatoire, une par ligne ; `CONSTRUCTION_CHECK_KINDS` : `droite_par P ; Q`,
`carre A ; B`, `rectangle A ; B ; C` — un seul carré ou rectangle, jamais mêlé à `droite_par`) et `case: N`, posée
par le générateur de questions. Le nœud est un nœud **`figure`** qui porte `construction`
(`ConstructionSpec`, `types/construction.ts`) : partout où une figure s'affiche (écran, PDF, listes),
le bloc s'affiche comme sa figure de départ. Le repérage est celui de ` ```figure `
(`isFigureBlockStart` reconnaît les deux mots ; ` ```construction ` n'ouvre rien : le mot désigne les constructions animées, voir [CONTEXT.md](../../CONTEXT.md) « Figure à compléter ») ; l'éditeur riche rend le bloc à son mot
(`figureFence`, `markdown-import.ts`). Jugement : [questions](questions.md) (case « figure »). Fiche
de l'aide à l'écriture : `block-catalog/figure-a-completer.ts` (`/aide-ecriture/blocs/figure-a-completer`).

**Figure de travail** (` ```figure-de-travail ` : l'élève peut tracer pour vérifier, rien n'est
noté) : mêmes lignes que la figure à compléter sauf `verifier:`, refusé avec sa ligne
(`WORK_FIGURE_CHECK_MESSAGE`) ; `outils:` absent → `droite`. `readConstructionHeader(source, { work: true })`
rend `construction: { tools, checks: [], work: true }` ; `isConstructionBlockStart` reconnaît les deux
mots, `isWorkFigureBlockStart` celui-ci ; `deplacable:` y est refusé comme dans tout bloc d'exercice.
Écran, PDF (figure de départ), éditeur riche (`figureFence`) : comme la figure à compléter. Jugement
(aucun) et correction : [questions](questions.md). Fiche : `block-catalog/figure-de-travail.ts`.
Gardes : `questions/__tests__/figure-de-travail.test.ts`, `figure-a-completer-typst.test.ts`,
`construction-bloc.test.ts`.

**Statistiques** — `src/lib/ubumark/__tests__/stat-chart/markdown.test.ts` sauf mention :

````text
```barres            ```circulaire      ```histogramme       ```loi
titre: Sports        Bus = 14           [0 ; 10[ = 12        X = 1 ; 2
Football = 12        Vélo = 6           ```                  P = 1/2 ; 1/2
Danse = 7            ```                                     ```
```
````

- ` ```tableau-croise ` : `lignes: A ; B`, `colonnes: X ; Y`, `A = 1 ; 2`, `B = 3 ; 4` (même test).
- ` ```frequences-cumulees ` : `lecture: médiane` puis des classes `[0 ; 10[ = 12` (même test).
- ` ```effectifs ` : `données: 12 ; 15 ; 12 ; 8 ; 15 ; 12`
  (`src/lib/ubumark/__tests__/stat-chart/frequency-table.test.ts`).
- ` ```nuage ` : `x: 1 ; 2 ; 3 ; 4 ; 5 ; 6` / `y: 12 ; 15 ; 19 ; 22 ; 27 ; 30`, options
  `ajustement: affine`, `indicateurs: point moyen ; équation ; r`, `prévoir: x = 4,5`
  (`src/lib/ubumark/__tests__/stat-chart/scatter.test.ts`).
- ` ```simulation ` : `X = 1 ; 2 ; 3 ; 4 ; 5 ; 6`, `P = 1/6 ; …`, `tirages: 50`
  (`src/lib/ubumark/__tests__/stat-chart/simulation-block.test.ts`) ; ou une loi nommée,
  `X ~ G(0,2)`, `U(1 ; 6)`, `U([0 ; 10])`, `E(0,5)`, `N(10 ; 4)` (σ² en 2ᵉ paramètre ; histogramme
  sur μ ± 3σ) — `src/lib/ubumark/__tests__/stat-chart/simulation-laws.test.ts`.

**QR code** (lot 2 des QR codes, [qr-codes](qr-codes.md)) — `src/lib/ubumark/__tests__/qr/` :

````text
```qr
/glossaire
légende: Le glossaire en ligne
taille: 3cm
```
````

Ligne 1 : l'adresse — `/chemin` ou `chiph.re/…` deviennent `https://www.chiph.re/…`, une adresse
`https://` extérieure est gardée telle quelle, tout le reste (`http://` extérieur, `javascript:`…)
est refusé (`src/lib/qr/qr-target.ts`). Puis `légende:` (120 caractères au plus ; sans elle,
l'adresse s'imprime sous le QR) et `taille:` (2,5 à 6 cm, `cm` obligatoire, virgule acceptée ;
3 cm par défaut). Bloc en erreur : messages situés pour le prof, « QR code indisponible » pour
l'élève et au PDF. La matrice est calculée au rendu, pas au parseur (`uqr` hors du parseur). Au
PDF, le SVG du QR stylé ([QR codes](qr-codes.md#le-style-imposé)) est posé en image vectorielle
(`#image(bytes(…), format: "svg")`), sans fichier ni paquet réseau ; compilation réelle testée (`qr-typst-compilation.test.ts`). Dans l'éditeur riche :
bloc de code `qr`, bouton « Insérer un QR code ». Chat élève (rendu restreint) : jamais rendu.

**Horloge à aiguilles** (chantier [horloge](../wip/horloge-progress.md)) — `src/lib/ubumark/__tests__/horloge/` :

````text
```horloge
heure: 8 h 30 ; 8 h 45
légendes: Départ ; Arrivée
chiffres: quarts
```
````

`heure:` (obligatoire) : 1 à 4 heures `9 h`, `9 h 30`, `9h5` (heures 0 à 23, minutes 0 à 59 ;
`9:30` refusé), une horloge par heure. Facultatives : `légendes:` (une par horloge, 40 caractères, sans `;`),
`chiffres: tous | quarts | aucun`, `graduations: minutes | heures | aucune`,
`minutes: visibles | cachées` (cachées : heure entière exigée), `cadran: 12 | 24` (couronne
intérieure 13 à 24), `taille:` (2 à 8 cm ; 4 cm par défaut). La petite aiguille avance avec les
minutes ; 13 h se dessine comme 1 h. Scène partagée `utils/horloge-scene.ts` ; au PDF, Typst
natif (ni paquet ni image). Nom accessible « Horloge à aiguilles », **jamais l'heure** (la réponse).
Dans un choix de QCM : 3 cm (`--horloge-taille` posé par `MultipleChoiceInput` et les aperçus ;
série figée : `withChoiceClockSize` ajoute `taille: 3cm`, lettre seule sur sa ligne).

**Opération posée en colonnes** (chantier [operations-posees](../archive/wip/operations-posees-progress.md),
addition, soustraction, multiplication, division en potence) — `src/lib/ubumark/__tests__/operation/` :

````text
```operation
calcul: 56,75 + 234 + 0,8
cases: aucune
```
````

`calcul:` (obligatoire) : 2 ou 3 termes pour `+`, 2 pour `−` (`-` et `–` acceptés), le premier le
plus grand, 2 facteurs pour `×` (`x` et `*` acceptés) ; virgule ou point, espaces de milliers
acceptés ; 10 chiffres au plus avant la virgule, 3 après ; 2 termes pour `÷` (`:` et `/` acceptés,
voir **Division**). Facultatives : `cases: résultat | aucune` (défaut
`résultat` : cases du résultat à remplir ; `aucune` : opération résolue), `retenues: oui | non`
(cases de retenue, ou retenues écrites), `méthode: compensation | cassage` (soustraction seulement ;
compensation : petit 1 devant le chiffre du haut et contre celui du bas de la colonne suivante —
à remplir, une seule case par colonne, en haut, le 1 du bas suit ;
cassage : chiffre barré, nouvelle valeur au-dessus). Le bloc calcule lui-même résultat et retenues
(`operationResult`, chiffre par chiffre, jamais en flottant) : l'auteur ne les écrit pas. À
remplir, une addition a une colonne de plus que son plus long terme (la largeur ne trahit pas la
retenue finale). Virgules alignées ; carreaux vides à droite des décimaux plus courts, jamais de
zéro ajouté. Scène partagée `utils/operation-scene.ts` ; écran en grille HTML (carreaux de cahier),
PDF en `table` Typst native (sans les cases de retenue : l'élève écrit sur papier libre). Aucune
valeur attendue dans le DOM d'une case à remplir.

**Multiplication** : le facteur qui a le plus de chiffres (virgule ôtée) est posé en haut, égalité →
ordre écrit (6 chiffres au plus en haut, 3 en bas). Facteurs alignés à droite sur leur dernier
chiffre (pas virgule sous virgule), virgules à leur place ; une ligne de produit partiel par chiffre
non nul du bas, décalée de son rang, zéros de décalage écrits (la ligne d'un 0 est sautée), `+`
devant la dernière, second trait ; une seule ligne non nulle (`× 7`, `× 10`) → résultat directement
sous le trait. Résultat : décimales des deux facteurs réunies (`2,5 × 4` → `10,0`). À remplir : autant
de colonnes que les chiffres des deux facteurs réunis, virgule du résultat **non dessinée** (l'élève
la posera), produits partiels en cases d'aide (pointillés, une case de plus que le nombre du haut,
plus le décalage, zéros de décalage compris), une rangée de retenues au-dessus du haut et une pour
l'addition des produits partiels ; résolue : retenues de l'addition seules s'il y a des produits
partiels. Saisie dans une question (§ 11 du journal) : l'élève **pose la virgule** du résultat (« , »
ou « . » dans une case → virgule à droite de cette case, sans toucher à son chiffre ; une seule,
retapée → enlevée ; clavier `inputmode="decimal"`, même pour un produit d'entiers) ; les cases se
lisent avec sa virgule (`readOperationAnswer(…, comma)` ; virgule sans chiffre à sa gauche → 0
implicite ; case vide à droite du dernier chiffre ignorée si la virgule est à sa gauche, sinon
réponse vide) ; la valeur est jugée (`2,5 × 4` saisi `10` sans virgule : juste). Produits partiels
et retenues de leur addition saisissables, chiffres seuls, jamais jugés ni gardés. Noms accessibles
neutres (« Résultat, case 3 sur 5 en partant de la droite », « Produit partiel 1, case 2… ») : « chiffre
des unités » dirait où est la virgule. Correction : virgule mal placée surlignée, virgule oubliée →
sa place entourée (`wrongComma`) ; retour sur la question : réponse remise alignée à droite, virgule
comprise (`commaFromAnswer`), zéros de fin possiblement perdus (`10,0` → `10`).

**Division** (lot 3, § 12 du journal) : potence à la française — dividende en haut à gauche, diviseur
à droite, trait vertical sur toute la hauteur, trait sous le diviseur, quotient dessous. Diviseur
entier de 1 ou 2 chiffres, non nul ; dividende de 6 chiffres au plus, décimales comprises.
`quotient: entier | décimal` (défaut : `entier` si le dividende est entier — division euclidienne,
quotient et reste —, `décimal` s'il est décimal ; `entier` avec un dividende décimal refusé) ; un
quotient décimal doit s'arrêter au plus tard au millième (`10 ÷ 3` refusé). `étapes: soustractions
| restes` (défaut `soustractions` : sous chaque dividende partiel, le produit soustrait avec `−` et
trait, puis le reste avec le chiffre abaissé ; `restes` : les restes seuls). `méthode:` et
`retenues:` refusés sur une division, `étapes:` et `quotient:` sur les autres opérations. Un 0 au
quotient ne fait pas de ligne (le chiffre suivant s'abaisse sur la même ligne) ; une ligne de reste
n'écrit pas ses zéros de tête (`06` → `6`). Quotient décimal résolu : zéros ajoutés au dividende,
plus clairs (`785,00`). À remplir : quotient en cases (autant que de colonnes du dividende), reste en
cases sous la zone (autant que de chiffres du diviseur ; euclidienne seulement), et à la place des
étapes une zone quadrillée libre dont la hauteur ne dépend que du dividende et du diviseur (des
lignes prêtes trahiraient la longueur du quotient) ; quotient décimal : carreaux libres à droite du
dividende jusqu'au millième. Scène `utils/operation-division-scene.ts` (`buildDivisionScene`,
`divisionResult`) ; nom accessible « Division posée en potence ». Dessinée par
`OperationDivision.svelte` (appelé par `Operation.svelte`). Saisie dans une question (§ 12-13 du
journal) : une division **euclidienne porte deux cases** (quotient puis reste : `case: N` posé, le
reste est la case N + 1 ; `operationCaseCount`), une division décimale une seule (le quotient). Le
quotient se saisit **de gauche à droite** (le curseur passe à droite ; Retour arrière sur une case
vide efface celle de gauche) ; l'élève pose sa virgule comme au lot 2 ; lecture
(`utils/operation-division-answer.ts`, `readQuotientAnswer`) : cases vides à droite ignorées, zéros
de tête retirés, case vide au milieu → réponse vide, décimales de fin vides = 0 (`2,1` juste pour
`4,20 ÷ 2`). Le reste se saisit de droite à gauche (`readRemainderAnswer`) ; vide → réponse vide,
pas de 0 implicite. Zone des étapes et carreaux libres à droite du dividende : chaque carreau prend
un chiffre ou `−`, jamais jugé ni gardé ; flèches dans les quatre sens. Correction : chiffres faux du
quotient comparés case par case depuis la gauche (un zéro de tête écrit décale, jamais faux ;
`wrongQuotientDigits`), virgule absente ou mal placée surlignée (`wrongQuotientComma`), reste
(`wrongRemainderDigits`) ; potence résolue à côté. Noms accessibles neutres (« Quotient, case 1 sur 4
en partant de la gauche », « Reste, case 1 sur 2 en partant de la droite »).

Dans une question, un bloc à remplir porte **une** case (division euclidienne : deux) (clé `case: N`, posée par
`assignBlankIndices`, jamais écrite par l'auteur ; refusée avec `cases: aucune`). `Operation.svelte`
reçoit alors `answer` : cases du résultat saisies de droite à gauche (le curseur passe à gauche,
Retour arrière sur une case vide efface celle de droite, flèches ↑/↓ d'une rangée de cases à
l'autre, tout autre caractère ignoré), carreaux de
40 px, grille qui défile dans son cadre sur téléphone. Les cases se lisent comme un nombre
(`utils/operation-answer.ts`, `readOperationAnswer`) : cases de tête vides ignorées, décimales de fin
vides comptées 0 (`0,5 + 0,5`, élève « 1 » : juste), case vide au milieu, ou entre la virgule et le premier chiffre (`0,05 × 0,3` saisi
`_ _ , _ 1 5`), → réponse vide, la case surlignée ; zéros de tête et zéros décimaux de fin retirés (`1,0` → `1`), espaces de
milliers posés — jamais de remarque de forme que la grille impose. Petites cases de retenue (≈ 28 px) :
aide, jamais jugée ni gardée. Réponse fausse : chiffres faux surlignés (`wrongResultDigits`),
opération résolue à côté ; bonne réponse affichée (`showCorrectAnswers`) : opération résolue.

**Collection d'objets** (chantier [collection](../archive/wip/collection-progress.md), CP-001, CP-070,
CP-004 en partie) — `src/lib/ubumark/__tests__/collection/` :

````text
```collection
dizaines: 2 ; 3
unités: 8 ; 1
dessin: paquets
```
````

`dizaines:` (0 à 10) et `unités:` (0 à 100), au moins l'une des deux ; une valeur par collection,
séparées par `;` (1 à 3 collections ; ligne absente = 0) ; 100 objets au plus par collection.
Facultatives : `dessin: barres | paquets` (barres de dix cubes et cubes, ou 10 jetons entourés et
jetons ; défaut `barres`), `unités en: vrac | rangées` (rangées de 5 + 5 ; défaut `vrac`),
`légendes:` (une par collection, 40 caractères ; A, B, C d'office s'il y en a plusieurs), `taille:`
(2 à 12 cm, largeur d'une collection **pleine largeur** : une plus étroite garde la même échelle,
objets de même taille d'une collection à l'autre ; 8 cm à l'écran comme au PDF, 3 cm dans un choix
de QCM). `centaines:` est réservée (« pas encore disponible »). Groupes de dix en haut, objets
isolés dessous ; groupement partiel (3 dizaines et 15 unités) accepté. Le vrac est tiré d'une graine
faite du contenu du bloc et du rang de la collection : même bloc → même dessin, à l'écran comme au
PDF ; deux objets restent à 1,5 objet l'un de l'autre au moins. Chaque objet de la scène
(`utils/collection-scene.ts`) porte sa valeur (1 ou 10) ; hasard, vrac,
décalage et toucher viennent de `utils/scene-commune.ts`, partagé avec la monnaie (instantanés
`collection-scene-figee.test.ts` : un objet déplacé d'un centième les fait échouer). À l'écran,
**toucher pour marquer** : un objet touché est barré (aide de comptage, non jugée, rien
d'enregistré, effacée à la collection suivante ; « Effacer les marques ») — classe `SceneMarks`
de `nodes/scene-marks.svelte.ts`, commune aux deux blocs. Nom accessible
« Collection d'objets », **jamais le nombre**. PDF en Typst natif, noir sur blanc. Dans un choix de
QCM : `--collection-taille: 3cm` (comme l'horloge) ; série figée : `withChoiceCollectionSize`.

**Collection à construire** (chantier [construire](../wip/construire-progress.md), CP-002) —
`src/lib/ubumark/__tests__/collection/collection-construire.test.ts`,
`CollectionConstruire.svelte.test.ts` : `construire: 34` (1 à 100) remplace les quantités ; `dessin:`
choisit le matériel, `taille:` reste ; `dizaines:`, `unités:`, `unités en:`, `légendes:` sont refusées
(plan vide, objets rangés d'office). L'élève touche la réserve (« Ajouter une barre de dix », « Ajouter
un cube », ou paquet / jeton) pour poser un objet, touche un objet posé pour l'enlever ; « Enlever »
à côté de chaque bouton pour le clavier, « Tout enlever » ; 10 groupes et 100 objets isolés au plus.
Le total n'est jamais affiché ni dit (nom accessible « Ta collection »). Calcul pur
`utils/collection-construire.ts` (valeur, réponse `''` si vide, scène en `rangées`, réserve,
construction juste) ; dessin des objets partagé `CollectionObjets.svelte`. Dans une question, le bloc
porte une case (`case: N`, posée par le générateur) dont la réponse est la valeur posée, jugée comme
une case ordinaire ; la composition (2 barres + 14 cubes) vit dans le composant, redessinée en dizaines
et unités s'il est remonté avec une seule valeur. Faux : « Ta collection vaut 32. » (ou « est vide ») et
une construction juste à côté ; bonne réponse affichée : la construction juste seule. Hors question
(aperçu, cours) : le même geste, rien de jugé. PDF : la réserve en petit et un cadre vide en
pointillés, où l'enfant dessine.

**Pièces et billets** (chantier [monnaie](../archive/wip/monnaie-progress.md), CP-043, CP-042 ; CP-044 et
CP-071 en partie) — `src/lib/ubumark/__tests__/monnaie/` :

````text
```monnaie
billets: ; 1×10
pièces: 10×1 ;
légendes: Léa ; Tom
```
````

`billets:` (5, 10, 20, 50, 100) et `pièces:` (1, 2), en euros : au moins l'une des deux, en liste
(`20 10 10`) ou comptée (`2×10`, `x` et `*` valent `×`, `0×10` admis), triées du plus grand au plus
petit ; ou `montant:` (0 à 100, jamais mêlé aux deux autres) : le bloc choisit les coupures, « le
moins d'objets » (`decomposeAmount`, glouton, exact pour l'euro). Un ensemble par valeur séparée par
`;` (1 à 3, vide admis, ligne absente = aucun) ; 100 € et 30 objets au plus par ensemble. Messages
situés : coupure inconnue (avec la liste de ce qui existe), pièce écrite en billet ou l'inverse.
Réservés (« pas encore disponible ») : centimes (`50c`, `0,50`), billets de 200 et 500 €.
Facultatives : `disposition: rangé | mélangé` (défaut `rangé` ; `mélangé` : billets dans un ordre
tiré, pièces en vrac), `légendes:`, `taille:` (comme la collection : 8 cm pleine largeur, même
échelle d'un ensemble à l'autre). Les ensembles se placent côte à côte s'ils tiennent, sinon l'un
sous l'autre. Pas de `prix:` : le prix va dans l'énoncé. **Rendu stylisé**
(aucun élément des vrais billets ni pièces, règles BCE : [journal § 6](../archive/wip/monnaie-progress.md)) :
plus la valeur est grande, plus la coupure est grande ; valeur écrite au centre, répétée en petit
dans deux coins d'un billet ; la pièce de 2 € a un anneau. Billets en haut, pièces dessous ; scène
`utils/monnaie-scene.ts` (hasard, vrac et toucher de `scene-commune.ts`, graine = ce qui se dessine),
marquage au doigt `SceneMarks`. Dessin en `overflow: visible`, comme la collection : sinon Chrome rogne au pixel le bord droit du cadre. Nom accessible « Pièces et billets » : les valeurs sont écrites
(l'enfant les lit), **jamais le total**. PDF en Typst natif, gris cernés de noir ; une légende a une colonne d'au moins 3 cm (si la rangée la tient), centrée, non justifiée. Dans un choix de
QCM : **10 cm**, pas 3 (à 3 cm les valeurs ne se lisent plus ; à 6 cm, un petit porte-monnaie restait illisible, décision du 2026-10-26) ; **tous les choix d'un QCM à la même échelle** : si la colonne est plus étroite que le plus large, ils sont réduits ensemble (`monnaieChoiceSize`, `utils/monnaie-choix.ts` : `--monnaie-taille: min(10cm, 100cqw / r)`, la colonne du choix en `container-type: inline-size`) ; un bloc à `taille:` donnée par l'auteur garde sa taille et n'entre pas dans ce calcul (l'auteur décide) ; au corrigé, l'étiquette d'un choix dessiné (« bonne réponse »… ; horloge et collection comprises) passe sous le dessin, pour lui laisser la même largeur ; série
figée : `withChoiceMonnaieSize` (10 cm ; au PDF, la page les tient).

**Monnaie à construire** (chantier [construire](../wip/construire-progress.md) § 6, CP-044, CP-071,
CP-045) — `src/lib/ubumark/__tests__/monnaie/monnaie-construire.test.ts`,
`MonnaieConstruire.svelte.test.ts` : `construire: 35` (1 à 100 €) remplace les coupures ;
`réserve: 1 2 5 10 20` donne les coupures permises (défaut : 1, 2, 5, 10, 20, 50 € ; existantes, une
fois chacune) ; `taille:` reste ; `billets:`, `pièces:`, `montant:`, `légendes:`, `disposition:` sont
refusées (plan vide, rangé d'office) ; `réserve:` sans `construire:` aussi. Une somme qui ne se fait
pas avec la réserve en 30 objets au plus est une erreur située. L'élève touche la réserve (« Ajouter
un billet de 10 € », « Ajouter une pièce de 2 € ») pour poser une coupure, touche une coupure posée
pour l'enlever ; « Enlever » à côté de chaque bouton, « Tout enlever » ; bouton grisé si l'ajout passe
100 € ou 30 objets. La somme n'est jamais affichée ni dite (nom accessible « Ton argent »). Calcul pur
`utils/monnaie-construire.ts` (somme, réponse `''` si vide, plafonds, construction juste « le moins
d'objets » **avec la réserve**, par programmation dynamique : avec 2 et 5 €, 6 € = 3 × 2 €) ; dessin
des coupures partagé `MonnaieObjets.svelte`. Case, correction (« Tu as posé 32 €. », « Tu n'as rien
posé. ») et PDF (réserve en petit, cadre vide en pointillés) : ceux de la collection à construire.

### Cases à compléter

| Où                     | Écriture                                   | Test                                                                              |
| ---------------------- | ------------------------------------------ | --------------------------------------------------------------------------------- |
| Texte                  | `{{blank:N}}`                              | `src/lib/ubumark/__tests__/parser/markdown-parser.test.ts`                        |
| Formule                | `\placeholder[N]{}`                        | `src/lib/components/questions/__tests__/QuestionCard-champ-stable.svelte.test.ts` |
| ` ```loi `             | `P = 1/2 ; ?`                              | `src/lib/ubumark/__tests__/stat-chart/markdown.test.ts`                           |
| ` ```effectifs `       | `masquer: fréquences`                      | `src/lib/ubumark/__tests__/stat-chart/frequency-table-masks.test.ts`              |
| Cellule de tableau PDF | `$\text{……}$` s'écrit en texte, comme `……` | `src/lib/ubumark/generators/__tests__/trou-tableau-typst.test.ts`                 |

### Paramétrage (modèles de question)

`{{a}}` (variable), `{{random:1..10}}` ou `{{1..10}}` ou `{{a|b|c}}` (tirage), `{{eval:a+b}}`
(calcul), `{{blank:N}}` (case). Exemple : `'{{a}} + {{b}} = {{sum}}'` résolu en `'5 + 10 = 15'`
(`src/lib/ubumark/__tests__/parameterization/resolver/text-resolver.test.ts`). Une accolade LaTeX
collée à un marqueur (`\dfrac{{{a}}…}`) est lue comme groupe LaTeX
(`src/lib/ubumark/__tests__/parameterization/parser/triple-brace.test.ts`). Les variables se
résolvent dans l'ordre de déclaration (`resolveVariables`) ; `detectCircularDependencies` et
`validateVariables` refusent les cycles et références inconnues.

**Écriture d'un nombre calculé** (`{{eval:…}}`, `evaluateAstWithModifiers` dans
`src/lib/mathAST/eval/evaluate-with-modifiers.ts` ; décisions de David du 2026-10-11). Jamais la
notation JS (`3e-7`, `1e+22`) : le parseur LaTeX lit `e` comme la constante d'Euler. Le séparateur
décimal reste le point (la virgule est posée au rendu, `toFrenchDecimal`).

Règle : **jamais un chiffre faux ; notation scientifique seulement si demandée par `;sci` ou si le
résultat est approché et ≥ 10¹⁵** (`MAX_EXPANDED_MAGNITUDE`).

| Modificateur | `0.0000001*3`      | `10^22`                   | `10^22/3`                         |
| ------------ | ------------------ | ------------------------- | --------------------------------- |
| aucun        | `0.0000003`        | `10000000000000000000000` | `3.33333333333333 \times 10^{21}` |
| `;d`         | `0.0000003`        | `10000000000000000000000` | `3.33333333333333 \times 10^{21}` |
| `;sci`       | `3 \times 10^{-7}` | `10^{22}`                 | `3.33333333333333 \times 10^{21}` |

Un entier EXACT (calculé en rationnels : `10^22`, `2^80`, `factorial(18)` → `6402373705728000`)
s'écrit toujours en entier, quelle que soit sa taille, avec ou sans `;d`. Un résultat approché
≥ 10¹⁵ passe en notation scientifique (mantisse à 15 chiffres significatifs) : au-delà, les
chiffres d'un flottant seraient inventés. Un petit nombre est toujours développé (`0.0000003`).
Une fraction exacte reste une fraction ; `1 000 000` reste `1000000` (pas de détection de
puissance simple) ; mantisse 1 : `10^{-7}`. Aucune dépendance au niveau du modèle. `;sci` sur une grandeur écrit le nombre en syntaxe
maison (`0.0000003[m];sci` → `3*10^{-7}[m]`, `10^{-7}[m]`) ; avec `;hms` ou un calcul littéral,
c'est une faute d'auteur (« ;sci : … »). Un résultat non fini (`10^400`) lève « Résultat non
fini ». Un nombre JS réinjecté dans une expression relue (tirage `{{random:…}}`, règle de
validation `custom`) passe par `numberToLatexSafe` (`mathAST/common/numeric.ts`), jamais
`String(n)` (`String(3e-7)` = `3e-7`, relu 3e − 7). Tests :
`src/lib/mathAST/eval/__tests__/evaluate-with-modifiers-sans-notation-js.test.ts`.

## Le pipeline

```
source (TemplateMarkdown)
  │  resolveVariables + resolveText        (modèles de question seulement)
  ▼
ResolvedMarkdown
  │  parseMarkdown
  │    1. dedentIndentedFences            fences indentées de 1-3 espaces ramenées à la marge
  │    2. extractMathOutside              $…$ / ~…~ → placeholders §M:n§, HORS des blocs (blockLineRanges)
  │    3. parseBlocks                     blocs spéciaux d'abord, puis code, citations, listes, tableaux, paragraphes
  ▼
DocumentNode (AST)
  ├── écran : MarkdownRenderer.svelte
  │     cache (getCachedAST) → restrictDocument si mode restreint → mots cliquables (linkDocument)
  │     → nodes/*.svelte ; blocs dessinés : parser → spec → utils/*-scene.ts → SVG
  └── PDF : generateTypst (typst-generator.ts → generateBlock)
        → *-typst.ts (cetz, tabvar) ; courbe/figure/stats depuis la MÊME scène → typst.ts WASM
```

Points à retenir :

- **Deux tableaux de lignes.** `parseBlocks` reçoit `lines` (formules remplacées) et `originalLines`
  (texte intact) ; les blocs ` ```courbe `, ` ```figure `, statistiques et de code sont
  repérés dans les deux et **appariés par rang** — une formule `$$` sur plusieurs lignes placée
  avant décalerait sinon les indices.
- **Détails d'une correction au PDF** (ADR 0017, D8 ; 2026-10-11) : un encadré `> [!méthode|rappel|attention]`
  devient un `#block` à bord gauche coloré, fond pâle et titre dans la langue du document
  (`detailKindLabel` : Méthode / Rappel / Attention, Method / Reminder / Warning) ; le rappel est
  imprimé un peu plus petit, **à sa place** (pas en marge, contrairement au grand écran). Détails en
  ligne `[…]{.type}` : calcul en gris, les autres sur fond teinté (`wrapInlineDetail`). Le bord et le
  titre portent l'information : une photocopie en noir et blanc reste lisible. Une citation `>`
  ordinaire reste un `#quote`. Test : `src/lib/ubumark/generators/__tests__/encadres-typst.test.ts`.
- **Cellule de tableau** : une chaîne (`TableCellNode.content`), relue à l'affichage. `$…$` et
  `~…~` y sont des formules, lues de gauche à droite (`$…$` d'abord : le `~` d'espace insécable
  d'un `$…$` n'ouvre rien ; `~~…~~` non plus). Un `\~` d'auteur, dés-échappé par l'extraction,
  est ré-échappé par le parseur (`restoreCellContent`) et affiché `~` — écran : `parseCellContent` de
  `TableNode.svelte` ; PDF : `processTableCellContent` (`typst-generator.ts`), qui convertit
  `~…~` comme un paragraphe (`customInlineMathToTypst`). Tests :
  `src/lib/ubumark/generators/__tests__/tilde-tableau-typst.test.ts`,
  `src/lib/components/markdown/__tests__/tilde-tableau.svelte.test.ts`.
- **Dans une liste**, un autre chemin : `parseContentWithCodeBlocks` et `textWithUnclosedBlocks`
  (`markdown-parser.ts`), avec `SPECIAL_BLOCK_KINDS` pour variation / probtree / trig / line.
  Les formules du bloc y sont restaurées (`restoreMathPlaceholders`) avant le parseur du bloc.
- **Les nœuds dessinés portent `spec` (ou `null`) et `errors`** : `parseCourbeContent`,
  `parseFigureContent`, `parseStatChartContent(kind, source)` rendent **toujours** un nœud.
- **Scène partagée.** `buildCourbeScene`, `buildFigureScene`, `buildStatChartScene` sont appelées
  par le composant Svelte ET par le générateur Typst : l'écran et le PDF ne peuvent pas diverger
  sur les graduations, les points, les étiquettes.
- **Le rendu n'instancie rien** : `MarkdownRenderer` reçoit un contenu déjà résolu.

## Invariants

1. **Les formules ne sont pas extraites des blocs** (`extractMathOutside` + `blockLineRanges`) :
   un `$` dans un bloc de code ou un bloc spécial reste du texte du bloc. Un bloc de code affiche
   ses formules **exactement écrites** (`restoreRawMath`).
2. **Un bloc n'avale jamais la suite du document.** Un bloc spécial non fermé s'arrête à sa
   première ligne vide (`unclosedBlockEnd`) ; un ` ``` ` lointain ne le ferme que si le texte
   intermédiaire ne ressemble pas à un paragraphe (`bodyOpensParagraph`, `specialBlockEnd`). Règle
   volontairement **étroite** : une faute de frappe dans un bloc fermé ne doit pas le rendre non
   fermé (sinon son ` ``` ` de fin ouvre un bloc de code qui avale toute la fiche).
3. **Un bloc mal écrit ne disparaît pas.** variation / probtree invalides → bloc de code avec
   leur source ; courbe / figure / statistiques → nœud en erreur avec messages situés (`Ligne 2 : …`).
   Le prof voit le message (`showAuthoringErrors`, `authoring-errors.ts`), l'élève un cadre neutre.
4. **Une seule erreur Typst fait échouer tout le PDF** ([ADR 0004](../adr/0004-pdf-typst-et-jspdf.md)) :
   un générateur ne doit jamais émettre de Typst invalide ; en cas de doute, cadre neutre
   (`FIGURE_TYPST_UNAVAILABLE`).
5. **Rien de lourd dans le chunk des pages Markdown.** `figure-parser.ts` n'importe pas
   `geometry-core` ; `FigureBlock.svelte` charge `FigureBlockView.svelte` à la demande ;
   `typst-generator.ts` passe par `renderFigureTypst` (registre). Tout module qui appelle
   `generateTypst` pour un PDF importe `src/lib/ubumark/generators/figure-typst-setup.ts` — sinon
   chaque figure devient « Figure indisponible » sans erreur. Garde :
   `src/lib/ubumark/__tests__/figure/figure-typst-setup.test.ts`.
6. **Passe tardive sur l'AST d'un énoncé : ne pas changer sa forme.** Les rendus itèrent les nœuds
   avec l'indice comme clé ; une transformation arrivée après le premier affichage (mots cliquables)
   qui ajoute ou découpe des nœuds fait recréer les champs de réponse — l'élève perd sa saisie. On
   **annote** les nœuds existants (`TextNode.terms`), on ne les découpe pas. Garde :
   `src/lib/components/questions/__tests__/QuestionCard-champ-stable.svelte.test.ts`.
7. **L'AST en cache n'est jamais modifié** : `restrictDocument` et `linkDocument` rendent des copies.
8. **Mode restreint = liste blanche** (`ALLOWED_NODE_TYPES` dans `restricted-rendering.ts`) : le chat
   élève n'affiche aucun bloc spécial, ni vidéo, ni image hors stockage du projet. Un nouveau type de
   bloc y est donc exclu **par défaut** — ne pas l'ajouter à la liste sans décision de David.
9. **Budget de rendu par document** (`DOCUMENT_FIGURE_LIMITS`, `render-budget.ts`) en plus des
   limites par bloc (`FIGURE_LIMITS`, `COURBE_LIMITS`) : au-delà, cadre neutre.
10. **Langue du document** : décimaux « 0,3 » en français, « 0.3 » en anglais, à l'écran
    (`content-locale.ts`) comme au PDF (option `language` de `generateTypst`, `toLocaleDecimal`).
    Espaces fines de groupement dès 5 chiffres, chaque côté de la virgule à part (`1024`,
    `30\,000`, `0{,}123\,45` ; règle du BIPM, `mathAST/digit-grouping.ts`) ; dès 4 pour une
    question réglée « Espaces dès 4 chiffres » (`content-digit-grouping.ts`). Même règle pour les nombres
    des légendes et résumés de simulation (`simulation-scene.ts`, `stat-chart-scene.ts`) et pour
    `\np` à l'import LaTeX (`importers/latex/converters/`).
11. **`builders/` ne calcule rien** : le tableau affiché vient de la grille de `mathAST` qui écrit
    aussi la conclusion ; recalculer les ferait diverger.

## Comment étendre — nouveau bloc spécial

Modèle le plus récent et le plus complet : ` ```effectifs ` / ` ```nuage ` (genres de
`stat-chart`). Pour un genre statistique de plus, ajouter le mot à `STAT_CHART_KINDS` suffit au
repérage ; pour un **nouveau type** de bloc :

1. **Spécification TDD** (CLAUDE.md) : comportements en français, validés par David, avant tout code.
2. **Type** : `src/lib/ubumark/types/<bloc>.ts` (nœud avec `spec | null` et `errors`), ajout à
   l'union `BlockNode` de `src/lib/ubumark/types/ast.ts`.
3. **Parseur** `src/lib/ubumark/parser/<bloc>-parser.ts`, sur le patron de `figure-parser.ts` :
   `is<Bloc>BlockStart`, `find<Bloc>Blocks`, `parse<Bloc>Content(source)` (toujours un nœud),
   `parse<Bloc>(lines, start, end)`. Léger : aucun import lourd.
4. **Branchement** dans `markdown-parser.ts` : premier niveau (`parseBlocks`, avec appariement
   `lines` / `originalLines`), listes (`parseContentWithCodeBlocks`, `textWithUnclosedBlocks`),
   lignes protégées des formules (`block-ranges.ts`), règles de fermeture (`block-closure.ts`).
5. **Scène** `src/lib/ubumark/utils/<bloc>-scene.ts` : calcul pur, partagé écran / PDF.
6. **Rendu écran** `src/lib/components/markdown/nodes/<Bloc>.svelte` + aiguillage dans
   `MarkdownRenderer.svelte`, `nodes/ListNode.svelte` et `nodes/StaticBlockNode.svelte` ;
   `pnpm svelte:autofix` sur chaque `.svelte`.
7. **PDF** `src/lib/ubumark/generators/<bloc>-typst.ts` + `case` dans `generateBlock`
   (`typst-generator.ts`). Si le code est lourd : registre, comme la figure.
8. **Éditeur riche** : `markdown-import.ts` (aller-retour en `codeBlock` de son langage).
9. **Tests** (voir ci-dessous) puis `pnpm check:ubumark` sur un dossier témoin.

## Tests

Tous dans `src/lib/ubumark/**/__tests__/` (projet vitest `server`), composants dans
`src/lib/components/markdown/**/__tests__/` (projet `client`). Ciblés uniquement :

```bash
pnpm test:server src/lib/ubumark/__tests__/stat-chart/markdown.test.ts
pnpm test:client src/lib/components/markdown
```

Pour un bloc, la batterie attendue (patron : `src/lib/ubumark/__tests__/courbe/`,
`src/lib/ubumark/__tests__/stat-chart/`) :

| Fichier type                                                                                                                                                                         | Ce qu'il verrouille                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| `*-parser.test.ts`                                                                                                                                                                   | grammaire, erreurs situées                                                              |
| `markdown.test.ts` / `*-markdown.test.ts`                                                                                                                                            | reconnu par `parseMarkdown`, au premier niveau ET en liste ; aller-retour éditeur riche |
| `scene.test.ts`                                                                                                                                                                      | géométrie de la scène                                                                   |
| `typst.test.ts`, `src/lib/ubumark/generators/__tests__/`                                                                                                                             | Typst produit (pas de compilation réelle en test)                                       |
| `src/lib/ubumark/__tests__/blocs-non-fermes.test.ts`, `blocs-speciaux-fermeture.test.ts`, `blocs-speciaux-listes.test.ts`, `fences-indentees.test.ts`, `formules-hors-blocs.test.ts` | invariants 1 à 3 pour tous les blocs                                                    |

⚠️ Un test Typst vérifie le **texte** produit, pas la compilation. Avant de publier du contenu,
compiler la fiche complète (démarche : [fiches-exercices](../pratiques/fiches-exercices.md)).

## Contrôle d'auteur : `pnpm check:ubumark`

```bash
pnpm check:ubumark <dossier> [lettres de fonctions, ex. C,P]
```

Passe chaque `.md` du dossier : formules `~…~` et `$…$` en erreur rouge, lettres découpées (nom
de fonction non déclaré, `CM` lu `C·M`), grec sans antislash (`findBareGreekNames`), `\unit`
résiduel, blocs ` ```courbe ` / ` ```figure ` en erreur ou hors fenêtre. Sortie 1 si un
problème. À lancer **avant** d'écrire des énoncés ou corrigés en base.

## Décisions

- [ADR 0004](../adr/0004-pdf-typst-et-jspdf.md) — PDF par Typst compilé en WASM dans le navigateur
  (jsPDF pour le tableau blanc seul) : une erreur Typst fait échouer toute la fiche.
- Décisions de détail (sans ADR) consignées dans les journaux archivés :
  [blocs non fermés](../archive/wip/blocs-non-fermes-progress.md),
  [fermeture](../archive/wip/ubumark-blocs-speciaux-fermeture-progress.md),
  [listes](../archive/wip/ubumark-blocs-speciaux-listes-progress.md),
  [fences indentées](../archive/wip/ubumark-fences-indentees-progress.md),
  [formules hors blocs](../archive/wip/ubumark-formules-hors-blocs-progress.md),
  [courbe](../archive/wip/bloc-courbe-progress.md), [figure](../archive/wip/bloc-figure-progress.md),
  [effectifs](../archive/wip/bloc-effectifs-progress.md), [nuage](../archive/wip/bloc-nuage-progress.md),
  [simulation](../archive/wip/bloc-simulation-progress.md),
  [tableau de signes](../archive/wip/tableau-signes-affichable-progress.md),
  [rendu des ensembles](../archive/wip/rendu-ensembles-progress.md). Historique : ils ne décrivent
  pas forcément le code actuel.

## Doutes et écarts connus

- **Titres des encadrés toujours en français à l'écran** (`Blockquote.svelte` lit
  `DETAIL_KIND_LABELS`) : une correction en anglais affiche « Méthode », là où le PDF écrit
  « Method » (`detailKindLabel`, 2026-10-11).
- `latex-generator.ts` (export `.tex`) et ses générateurs `*-latex.ts` n'ont pas d'appelant hors
  du module ni de leurs tests (grep du 2026-10-10) : export en sommeil ou mort, à trancher.
- `src/lib/components/markdown/nodes/MathInlineOld.svelte` et `MathBlockOld.svelte` ne sont
  importés nulle part (grep du 2026-10-10) : candidats au ménage, à confirmer par David.
