---
couvre:
  - 'src/lib/ubumark/**'
  - 'src/lib/components/markdown/**'
  - 'src/lib/extensions/**'
  - 'src/lib/components/rich-text/markdown-{import,export}.ts'
  - src/lib/components/exercises/LaTeXImportDialog.svelte
  - src/lib/utils/markdown-cache.ts
  - scripts/check-ubumark.ts
---

# ubumark — la notation des contenus

> Doc de référence du module `src/lib/ubumark/` et de son rendu `src/lib/components/markdown/`.
> Pratiques d'écriture (à ne pas dupliquer ici) : [notation-unites](../pratiques/notation-unites.md)
> (grandeurs), [fiches-exercices](../pratiques/fiches-exercices.md) (fiches, pièges PDF).
> Vérifié contre le code le 2026-10-10.

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

| Dossier / fichier   | Rôle                                                                                                                                                                                                                                                                                                      |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.ts`          | Baril public (`parseMarkdown`, `resolveText`, `generateTypst`…). ⚠️ Importé par toutes les pages Markdown : n'y rien brancher de lourd.                                                                                                                                                                   |
| `types/`            | `ast.ts` (nœuds en ligne et de bloc, union `BlockNode`, `DocumentNode`), un fichier par bloc spécial (`variation-table.ts`, `probability-tree.ts`, `trig-circle.ts`, `number-line.ts`, `courbe.ts`, `figure.ts`, `stat-chart.ts`), `template.ts` (types marqués `TemplateMarkdown` / `ResolvedMarkdown`). |
| `parser/`           | `markdown-parser.ts` (`parseMarkdown`, 3 000 lignes), `math-extractor.ts`, sous-parseurs Markdown (listes, tableaux, citations, code) et un parseur par bloc spécial (`*-parser.ts`).                                                                                                                     |
| `parser/` (gardes)  | `indented-fences.ts`, `block-ranges.ts`, `block-closure.ts`, `unclosed-block.ts` : où commence et finit un bloc (voir Invariants).                                                                                                                                                                        |
| `utils/`            | **Scènes** : `courbe-scene.ts`, `figure-scene.ts`, `stat-chart-scene.ts`, `simulation-scene.ts`, `comparison-scene.ts`, `number-line-render.ts`… — géométrie calculée une fois, dessinée par l'écran ET le PDF. Plus `detail-kinds.ts` (encadrés), `list-depth.ts`.                                       |
| `generators/`       | `typst-generator.ts` (`generateTypst`, aiguillage par type de nœud) + un générateur Typst par bloc (`*-typst.ts`). `latex-generator.ts` (export `.tex`, sans appelant hors du module à ce jour).                                                                                                          |
| `parameterization/` | `parser/` (tokenizer, `{{random}}`, `{{eval}}`), `resolver/` (`resolveVariables`, `resolveText`), `validator/` (dépendances circulaires), `display-options.ts`, `expression-transforms.ts`.                                                                                                               |
| `builders/`         | `sign-table.ts` (`signTableNode`), `variation-table.ts` (`variationTableNode`) : traduisent une grille calculée par `mathAST` en `VariationTableNode`. **Ne calculent aucun signe.**                                                                                                                      |
| `importers/latex/`  | `transpileLatexToMarkdown` : import d'un exercice LaTeX (dialogue `src/lib/components/exercises/LaTeXImportDialog.svelte`).                                                                                                                                                                               |

### Rendu écran — `src/lib/components/markdown/`

| Fichier                                                 | Rôle                                                                                                                                                                     |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `MarkdownRenderer.svelte`                               | Orchestrateur : cache d'AST (`src/lib/utils/markdown-cache.ts`), mode restreint, mots cliquables, aiguillage par type.                                                   |
| `nodes/*.svelte`                                        | Un composant par nœud : `VariationTable`, `ProbabilityTree`, `TrigCircle`, `NumberLine`, `Courbe`, `FigureBlock`, `StatChart`, `MathInline`, `MathPrompt`, `BlankInput`… |
| `nodes/ListNode.svelte`, `nodes/StaticBlockNode.svelte` | Rendent les blocs **dans un item de liste** : chaque nouveau bloc doit y être aussi.                                                                                     |
| `utils/math-utils.ts`                                   | `expressionToLatex` / `expressionToRawLatex` : `~…~` → LaTeX via `parseCustomSafe` de `mathAST` ; erreur → LaTeX rouge.                                                  |
| `content-locale.ts`                                     | Langue du document (virgule FR / point EN des décimaux).                                                                                                                 |
| `authoring-errors.ts`                                   | Le prof voit le message d'erreur d'un bloc, l'élève un cadre neutre.                                                                                                     |
| `render-budget.ts`                                      | `DOCUMENT_FIGURE_LIMITS` : plafond de figures/courbes par document.                                                                                                      |
| `restricted-rendering.ts`                               | Mode restreint du chat élève (`restrictDocument`, `stripFenceLanguages`).                                                                                                |

### Ailleurs

- **PDF** : `src/lib/typst/` (fiches, carnets), `src/lib/exercises/typst/exercise-typst-generator.ts`,
  `src/lib/worksheets/student-worksheet-typst.ts` appellent `generateTypst`.
- **Éditeur riche** (TipTap) : `src/lib/components/rich-text/markdown-import.ts` /
  `markdown-export.ts` (aller-retour : un bloc spécial devient un `codeBlock` de son langage et
  revient intact), vues d'édition dans `src/lib/extensions/`.
- **Contrôle d'auteur** : `scripts/check-ubumark.ts` (`pnpm check:ubumark`).
- **Instanciation** des modèles : `src/lib/questions/generator/instance-generator.ts`
  (`generateInstance`) et `src/lib/questions/generator/content-resolver.ts` appellent le paramétrage.

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
une liste déclarée **remplace** les défauts (f, g, h, u, v, w, F, G, H). Règles des unités et des
crochets de calcul : [notation-unites](../pratiques/notation-unites.md). Pièges connus (grec sans
antislash, prime hors `f'`, années groupées « 2 026 ») : `pnpm check:ubumark` les signale.

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
| `figure`                                                                                                                  | `figure`                    | `figure-parser.ts`                  | `FigureBlock.svelte`     | `figure-typst.ts` (via registre) |
| `barres`, `circulaire`, `histogramme`, `frequences-cumulees`, `tableau-croise`, `loi`, `simulation`, `effectifs`, `nuage` | `stat-chart` (champ `kind`) | `stat-chart-parser.ts`              | `StatChart.svelte`       | `stat-chart-typst.ts`            |

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
  (`src/lib/ubumark/__tests__/stat-chart/simulation-block.test.ts`).

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

- `latex-generator.ts` (export `.tex`) et ses générateurs `*-latex.ts` n'ont pas d'appelant hors
  du module ni de leurs tests (grep du 2026-10-10) : export en sommeil ou mort, à trancher.
- `src/lib/components/markdown/nodes/MathInlineOld.svelte` et `MathBlockOld.svelte` ne sont
  importés nulle part (grep du 2026-10-10) : candidats au ménage, à confirmer par David.
