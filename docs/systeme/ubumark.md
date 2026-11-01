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
> Vérifié contre le code le 2026-10-11 ; espaces de groupement le 2026-10-23 ; bloc horloge le 2026-10-24 ; bloc opération le 2026-10-25 ; sa saisie (case de question) le 2026-10-25 ; saisie de la multiplication le 2026-10-25 ; saisie de la division le 2026-10-25 ; bloc collection le 2026-10-25 ; bloc figure-a-completer le 2026-10-25 (carré / rectangle le 2026-10-26) ; scène commune collection / monnaie le 2026-10-25 ; bloc monnaie le 2026-10-25 ; sa recette le 2026-10-25 ; paragraphe collé au bloc qui le suit (PDF) le 2026-10-26 ; collection à construire le 2026-10-26 ; monnaie à construire le 2026-10-26 ; bloc figure-de-travail le 2026-10-26 ; droite à placer (`placer:`) le 2026-10-26 ; graduations décimales en virgule le 2026-11-01 ; à plusieurs points le 2026-10-27 ; horloge à placer le 2026-10-27 ; diagramme en barres à construire le 2026-10-28 ; échelle à choisir (`axe: à choisir`) le 2026-10-29 ; bloc ranger le 2026-10-28 ; bloc partage (affichage) le 2026-10-29, figure à colorier (`colorier:`) le 2026-10-29, plusieurs figures (`unites:`) le 2026-10-29 ; figure à manipuler (`deplacable:`, `rendu:`) le 2026-10-29 ; bloc cubes (affichage) le 2026-10-30, gestes `dessiner:` / `retrouver:` le 2026-10-30 ; bloc solide (affichage) le 2026-10-30 ; bloc patron (affichage) le 2026-10-30, gestes `designer:` / `completer:` le 2026-10-30 ; sections du bloc solide (`section:`) le 2026-10-31 ; repère à placer (` ```courbe ` + `placer:`) et titres d'axes (`axes:`) le 2026-11-01 ; valeur masquée `?` (énoncé d'évaluation) le 2026-11-01 ; centimes et billets de 200 / 500 € du bloc monnaie le 2026-11-01 (réponse de la case et messages après revue, le même jour) ; boîte à moustaches (affichage) le 2026-11-01, à construire (`placer:`) le 2026-11-01.

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

Le QCM est une **case choix** (bloc ` ```choix `, `parser/choix-parser.ts`) : sa lecture est de
l'ubumark, sa notation (bonne réponse, mélange) vit dans `src/lib/questions/` (`choice-case.ts`).
Le type `multiple_choice` (choix hors de l'énoncé) n'existe plus ([ADR 0033](../adr/0033-le-qcm-est-une-case.md)).

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

| Écriture                                 | Nœud / effet                                   | Test                                                                              |
| ---------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------- |
| `Texte {{blank:1}} suite`                | `BlankNode` (case texte, `BlankInput.svelte`)  | `src/lib/ubumark/__tests__/parser/markdown-parser.test.ts`                        |
| `$3+5=\placeholder[0]{}$`                | case dans une formule (`MathPrompt.svelte`)    | `src/lib/components/questions/__tests__/QuestionCard-champ-stable.svelte.test.ts` |
| `$<<expr:expression1>>10^2$`             | relie la formule à une expression du modèle    | `src/lib/ubumark/__tests__/parser/blank-and-expression.test.ts`                   |
| `{{hint:myHintId}}`                      | `HintReferenceNode`                            | `src/lib/ubumark/__tests__/parser/hint-parser.test.ts`                            |
| `[[chapter:<uuid>\|Chapitre Fractions]]` | `InternalLinkNode`                             | `src/lib/ubumark/__tests__/parser/internal-link-parser.test.ts`                   |
| `Le [nombre]{.def} est pair.`            | mot cliquable forcé (lexique)                  | `src/lib/ubumark/__tests__/parser/lexicon-marks.test.ts`                          |
| `[x]{.rappel}`                           | détail en ligne typé                           | `src/lib/ubumark/__tests__/parser/detail-callouts.test.ts`                        |
| `**un [mot]{.def} pair**`                | marquage dans une mise en forme (tout en gras) | `src/lib/ubumark/__tests__/parser/lexicon-marks.test.ts`                          |

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
dans un item de liste : en retrait sous l'item, ou ouverts sur la ligne même de l'item
(`- ```cubes`, corps en retrait). Cette seconde forme vaut pour tout bloc de code : `parseList`
y joint l'ouverture à son corps (avant le correctif de 2026-11, le bloc était lu vide, « bloc non
fermé »). Test : `__tests__/blocs-speciaux-listes.test.ts`.

| Fence                                                                                                                                           | Nœud (`type`)               | Parseur (`src/lib/ubumark/parser/`)                           | Rendu écran                                                                                                       | Générateur PDF                               |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `variation`                                                                                                                                     | `variation-table`           | `variation-table-parser.ts`                                   | `VariationTable.svelte`                                                                                           | `variation-table-typst.ts`                   |
| `probtree`                                                                                                                                      | `probability-tree`          | `probability-tree-parser.ts`                                  | `ProbabilityTree.svelte`                                                                                          | `probability-tree-typst.ts`                  |
| `trig`                                                                                                                                          | `trig-circle`               | `trig-circle-parser.ts`                                       | `TrigCircle.svelte`                                                                                               | `trig-circle-typst.ts`                       |
| `line`                                                                                                                                          | `number-line`               | `number-line-parser.ts`                                       | `NumberLine.svelte`                                                                                               | `number-line-typst.ts`                       |
| `courbe`                                                                                                                                        | `courbe`                    | `courbe-parser.ts`                                            | `Courbe.svelte`                                                                                                   | `courbe-typst.ts`                            |
| `figure`, `figure-a-completer`, `figure-de-travail`                                                                                             | `figure`                    | `figure-parser.ts`                                            | `FigureBlock.svelte`                                                                                              | `figure-typst.ts` (via registre)             |
| `barres`, `circulaire`, `histogramme`, `frequences-cumulees`, `tableau-croise`, `loi`, `simulation`, `effectifs`, `nuage`, `boite-a-moustaches` | `stat-chart` (champ `kind`) | `stat-chart-parser.ts`                                        | `StatChart.svelte` (`BoxPlotChart.svelte` pour la boîte à moustaches, `BoxPlotPlacer.svelte` à construire)        | `stat-chart-typst.ts`                        |
| `qr`                                                                                                                                            | `qr`                        | `qr-parser.ts`                                                | `QrBlock.svelte`                                                                                                  | `qr-typst.ts`                                |
| `scratch`                                                                                                                                       | `scratch`                   | `scratch-parser.ts`                                           | `ScratchBlock.svelte` (dessin : `utils/scratch-render.ts`)                                                        | `scratch-typst.ts` (texte)                   |
| `horloge`                                                                                                                                       | `horloge`                   | `horloge-parser.ts`                                           | `Horloge.svelte`                                                                                                  | `horloge-typst.ts`                           |
| `operation`                                                                                                                                     | `operation`                 | `operation-parser.ts`                                         | `Operation.svelte`                                                                                                | `operation-typst.ts`                         |
| `collection`                                                                                                                                    | `collection`                | `collection-parser.ts`                                        | `Collection.svelte`                                                                                               | `collection-typst.ts`                        |
| `monnaie`                                                                                                                                       | `monnaie`                   | `monnaie-parser.ts`                                           | `Monnaie.svelte`                                                                                                  | `monnaie-typst.ts`                           |
| `partage`                                                                                                                                       | `partage`                   | `partage-parser.ts`                                           | `Partage.svelte`                                                                                                  | `partage-typst.ts`                           |
| `cubes`, `solide`, `patron` (nœud `espace`, un genre par clôture)                                                                               | `espace`                    | `espace-parser.ts` (+ `solide-parser.ts`, `patron-parser.ts`) | `Espace.svelte` + `Cubes.svelte` / `CubesGeste.svelte` / `Solide.svelte` / `Patron.svelte` / `PatronGeste.svelte` | `espace-typst.ts`                            |
| `choix` (clôture ```` si un choix contient un bloc)                                                                                             | `choice`                    | `choix-parser.ts`                                             | `ChoiceBlock.svelte`                                                                                              | `typst-generator.ts` (« A) … »)              |
| `ranger`                                                                                                                                        | `ranger`                    | `ranger-parser.ts`                                            | `RangerPlacer.svelte`                                                                                             | `typst-generator.ts` (`generateRangerTypst`) |

Bloc ```choix (case « choix » d'une question, [questions.md](questions.md)) : réglages en tête
(`plusieurs:`, `melanger:`, `case:` posée par le générateur), un choix par ligne `- …`, suite en
retrait de 2 espaces ; les choix restent du markdown (formules non extraites, `blockLineRanges`),
rendus un à un. Hors question : liste A, B, C non cliquable (`ChoiceList.svelte`). Le nœud garde
son texte (`source`) : l'éditeur riche le rend en bloc de code `choix`, et l'export pose une clôture
plus longue que toute clôture intérieure (```` si un choix contient un bloc). Réécriture d'un bloc
de modèle : `serializeTemplateChoiceBlock` ; `rewritable: false` quand une ligne ou un réglage est
illisible (la réécriture le perdrait).

Bloc ``ranger (étiquettes à ranger, [questions.md](questions.md)) — `__tests__/ranger/ranger-parser.test.ts`,
`RangerPlacer.svelte.test.ts` : `signe: <` (défaut) ou `>`, `case:` posée par le générateur, une
étiquette par ligne `- …` (ubumark sur une ligne, formules non extraites, `blockLineRanges`) ; 2 à 8,
deux à deux différentes ; erreurs en phrases (`errors: string[]`). Clôture `` obligatoire (sinon
jusqu'à la fin du texte, comme ```choix). Ordre vu par l'élève : `displayedLabels` — dans une question
le bloc est déjà mélangé ; hors question (cours, aide, PDF d'un cours) mélange fixe (graine tirée du
texte des étiquettes : un motif par bloc), même rendu au serveur, au navigateur et sur papier. Écran `RangerPlacer.svelte` : les
étiquettes en haut (une posée garde sa place, vide), les places en dessous séparées du signe ; glisser
(`touch-action: none` sur les étiquettes) ou toucher l'étiquette puis la place ; place prise :
échange, venue d'en haut l'autre remonte ; toucher une étiquette posée la renvoie en haut ; clavier
Tab, Entrée, flèches, Échap ; noms « Étiquette 2 sur 3 », « Place 1 sur 3, vide », jamais l'ordre
juste. Corrigé : places fausses marquées, rangement juste dessous (`expected`). PDF : étiquettes
encadrées puis places en pointillés (grilles centrées en hauteur, signe en mode math). Éditeur riche :
bloc de code `ranger`.

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

**Droite à placer** (chantier [reponses-a-placer](../archive/wip/reponses-a-placer-progress.md), CP-008) —
`src/lib/ubumark/__tests__/number-line/number-line-placer.test.ts`,
`NumberLinePlacer.svelte.test.ts` : `placer: 7` dans un ` ```line ` (nœud : `placer`, et `caseIndex`
lu de `case: N`, posée par le générateur). Refusé : hors de la droite, entre deux graduations, échelle
`log`, avec `points:` (seuls les points de l'élève), valeur illisible ; `case:` sans `placer:`.
`NumberLine.svelte` passe la main à `NumberLinePlacer.svelte` : l'élève touche la droite (le point se
pose sur la graduation la plus proche, il se glisse ; zone `touch-action: pan-y`), ou ◀ ▶ (un cran ;
sans point, ▶ pose sur la première graduation, ◀ sur la dernière), ou le clavier (← → ↑ ↓, Début, Fin ;
zone `role="slider"`, `aria-valuetext` « point sur 12 »). Point de l'élève **sur** la droite, bleu
(`pointsOnLine`) ; jamais la valeur attendue à l'écran ni dans un attribut lu. Calcul pur
`utils/number-line-placer.ts` : rang de graduation, réponse `placerAnswer` (entier `7`, décimal à
point `0.75`, sinon fraction LaTeX `\frac{4}{3}`), la même pour la réponse attendue et celle de
l'élève ; `placerText` pour l'élève (`0,3`, `4/3`) — pas écrit en fraction (`step: 1/5`) → graduation
en fraction du pas (`4/5`, `5/10`, entier `1`), jamais en décimal. Dans une question : faux → « Tu as placé le point
sur 9. » (ou « Tu n'as rien placé. ») et la droite juste à côté, point vert. Hors question : le même
geste, rien de jugé. PDF : la droite sans point (l'enfant fait sa croix).

**Plusieurs points** (PR 2, `number-line-placer-plusieurs.test.ts`) — `placer: A=3 ; B=7 ; C=12` :
`placer` est une liste de `NumberLineTarget` (`name`, `value`), dans l'ordre écrit ; `placer: 7`
donne un point au nom vide. Refusé : plus de 6 points, nom autre qu'une lettre majuscule, nom en
double, point sans nom dès qu'il y en a deux, point vide (`;` en trop) ; chaque point est vérifié
comme un point seul. Deux points sur la même graduation : permis (leurs noms côte à côte,
`SHARED_LABEL_GAP`). Une case par point : `caseIndex` est la première, le point k a la case N + k.
À l'écran : une étiquette par point sous la droite (entre ◀ et ▶, `aria-pressed`), A active au
départ ; toucher la droite pose le point actif, et poser un point absent active le suivant non
placé ; toucher un point posé (moins de 16 px) le reprend ; ◀ ▶ et le clavier déplacent le point
actif (`aria-valuetext` « point B sur 7 »). Correction : une phrase par point faux (« Tu as placé B
sur 9. », « Tu n'as pas placé C. ») ; cadre rouge dès qu'un point est faux, vert quand tous sont
justes ; la droite juste avec tous les points, nommés, en vert.

**Largeur réelle** (toutes les droites graduées, écran seulement) — `number-line-largeur.test.ts`,
`NumberLine-largeur.svelte.test.ts` : `NumberLine.svelte` dessine la droite en px à la largeur de son
conteneur (`bind:clientWidth`, plancher `NL_MIN_WIDTH` = 160 ; 600 avant le montage), sans viewBox
réduite : marges, chiffres, points et traits gardent leur taille, seul l'écart entre graduations se
resserre ; pas de défilement horizontal (il se battrait avec le glisser). `valueToX`, `xToValue`,
`computeGraduations`, `computeLineExtents` prennent la largeur (défaut 600 : PDF et
inchangés) ; `NumberLinePlacer` lit le doigt en px (`xToValue(…, rect.width)`).
Droite à placer : le prof (aperçu, éditeur) est averti quand, sur un téléphone (conteneur de référence
`NL_PHONE_WIDTH` = 320 px), deux graduations voisines seraient à moins de 20 px
(`phoneGapWarning`, plus petit écart, échelle log comprise) : une droite de 0 à 20 au pas de 1 en
donne 12. Une droite d'affichage (sans `placer:`) n'est pas avertie : ses graduations fines se
lisent, on ne les vise pas. L'élève ne voit jamais l'avertissement ; la correction ne le répète pas.

**Graduations décimales** (`NumberLine-etiquettes-decimales.svelte.test.ts`, `number-line-typst.test.ts`)
— une graduation écrite (`labels: 1.4, 1.5`) passe par `toLocaleDecimal` : `1{,}4` à l'écran (langue
du contenu, `readContentLocale`), `1","4` dans le PDF (option `language` de `generateNumberLineTypst`,
français par défaut) ; en anglais, le point reste. Les entiers de 5 chiffres ou plus sont groupés aux deux
(`10\,000`, `10 thin 000`). Une graduation **calculée** non entière s'écrit en
fraction (`formatAutoLabel` : 1,4 → 7/5) : une droite qui ne part pas d'un entier donne ses
graduations écrites en décimal par `labels:`.

**Courbe** — `src/lib/ubumark/__tests__/courbe/courbe-markdown.test.ts` :

````text
```courbe
x: -4 ; 6
y: -8 ; 12
f(x) = x^2 - 2
```
````

**Titres d'axes** — `axes: x = Durée (min) ; y = Température (°C)` (un axe ou les deux, 60 caractères
au plus, `spec.axisTitles`), au bout de chaque axe, à l'écran (`Courbe.svelte`) et au PDF
(`courbe-typst.ts`, chaîne Typst entre guillemets : un `#` ou un `[` ne casse pas la fiche). Refusé :
titre vide, axe nommé deux fois, autre axe que x ou y.

**Repère à placer** (chantier [points-repere](../wip/points-repere-progress.md), CM1-136, 5-128…) —
`src/lib/ubumark/__tests__/courbe/courbe-placer.test.ts`, `CourbePlacer.svelte.test.ts` :
`placer: A=(2 ; 3) ; B=(-1 ; 2)` dans un ` ```courbe ` (nœud : `spec.placer`, liste de `CourbeTarget`
`name`, `x`, `y` ; `caseIndex` lu de `case: N`, posée par le générateur ; `placer: (2 ; 3)` = un point
au nom vide). Virgule décimale permise dans `placer:` et `grille:` (pas dans `x:` / `y:`). Refusé :
plus de 6 points, nom autre qu'une lettre majuscule, nom en double, point sans nom dès qu'il y en a
deux, nom déjà pris par `points:`, cible hors de la fenêtre ou **hors d'un nœud de la grille** (pas de
`grille:`, sinon le pas automatique `courbeGridSteps`, le même que la grille dessinée) ; `case:` sans
`placer:`. Courbes, `points:` donnés et asymptotes permis à côté. `Courbe.svelte` passe la main à
`CourbePlacer.svelte`, qui dessine le nœud **sans** `placer` (la cible n'entre jamais dans le DOM) et
les points de l'élève par la prop `marks` : toucher le repère pose le point actif sur le nœud le plus
proche (`nearestNode`), il se glisse ; toucher un point posé (moins de 18 px) le reprend ; une
étiquette-bouton par point (`aria-pressed`, A active au départ, poser active le suivant non placé) ;
clavier : flèches = un cran (`moveByStep`), Début = l'origine, sinon le nœud bas-gauche (`startNode`) ;
zone `role="slider"`, `aria-valuetext` « point A en (2 ; 3) » (position de l'élève). Pas de pointillés
de lecture vers les axes (décision Q6). Calcul pur `utils/courbe-placer.ts` : réponse `pointAnswer`
(`'1.5;-0.5'`), lecture `readPointAnswer`, juge `isPlacedPointCorrect` (nombres comparés),
`pointText` (`(1,5 ; -0,5)`), phrases `placedPointMistake`. Dans une question : une phrase par point
faux (« Tu as placé A en (3 ; 1). », « Tu n'as pas placé C. », et quand x et y sont échangés « … : tu
as échangé l'abscisse et l'ordonnée. ») ; cadre rouge dès qu'un point est faux, vert si tous sont
justes ; le repère juste à côté, points nommés en vert. Hors question : le même geste, rien de jugé.
PDF : le repère sans les points (l'enfant fait ses croix) ; option `solved` de `courbe-typst.ts` qui
dessine les points attendus, qu'aucun corrigé imprimé n'appelle encore.

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
`graduations:`, et deux réglages qui font passer la figure **dans la toile** (chantier
`figure-et-choix`, lot 6, 2026-10-29) : `deplacable: oui|non` (accent admis) et
`rendu: normal|croquis|mixte`. Le nœud ne porte `interactive: { draggable, renderMode }` que si l'une
des deux clés est écrite (figure stockée : toujours, option `interactive`, fenêtre facultative) —
`src/lib/ubumark/__tests__/figure/figure-reglages-interactifs.test.ts`.

**Figure à manipuler** : `FigureBlock` charge à la demande `FigureCanvasView` quand `deplacable: oui`
ou `rendu:` ≠ `normal` (sinon le SVG statique, rien ne change). Partout à l'écran (énoncé, cours,
fiche, lexique) ; chat élève inchangé (rendu restreint, aucun bloc). Même scène que le statique
(`buildFigureScene` : liste blanche, budgets du bloc), même cadre (`figureViewFromWindow`), repère
`FigureFrameLayer` (séparateur décimal du document) ; noir par défaut → `noir` (couleur du texte).
`GeometryCanvas` en mode `inDocument` : **vue figée** (ni molette, qui fait défiler la page, ni
déplacement de la vue), aucun raccourci clavier sur la page (espace, Ctrl+Z), pas de panneau de
style ; `touch-action: none` seulement si les objets se déplacent. `deplacable: oui` : points, textes
et noms glissent, rien n'est noté ni gardé, bouton « Remettre la figure » (la scène est reconstruite).
`rendu:` seul : toile figée (`role="img"`). **PDF** : figure statique, clés ignorées
(`figure-markdown-to-typst.test.ts`). Gardes : `components/markdown/nodes/__tests__/FigureBlockToile.svelte.test.ts`.

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
mots, `isWorkFigureBlockStart` celui-ci ; `deplacable:` et `rendu:` y sont refusés, comme dans une figure
à compléter (« une figure de travail ne se déplace pas », option `construction` de `parseFigureContent`).
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
- ` ```barres ` à construire (chantier [reponses-a-placer](../archive/wip/reponses-a-placer-progress.md)
  § 17, 18 ; CP-072, CE1-088, CE2-082) — `src/lib/ubumark/__tests__/stat-chart/barres-placer.test.ts`,
  `BarresPlacer.svelte.test.ts` : `axe: 0 à 20, de 2 en 2` (nœud : `spec.axis`, `{ max, step }` ; part
  de 0, haut multiple du pas, au plus 40 graduations ; une barre plus haute refusée ; sans `de N en N` :
  de 1 en 1), `placer: Natation ; Danse` ou `placer: toutes` (`spec.toPlace`, rangs dans `data`, dans
  l'ordre des données ; nom sans tenir compte de la casse) et `caseIndex` (`case: N`, posé par le
  générateur). Refus de `placer:` : sans `axe:` (calculé, il trahirait la plus grande barre), axe
  au-delà de 100 (`STAT_CHART_LIMITS.placeAxisMax` : l'unité ne se viserait plus au doigt), avec
  `valeurs: oui`, `indicateurs:` (l'effectif total ou la moyenne donneraient la barre), des pourcentages,
  deux séries, un nom absent, nommé deux fois ou ambigu (nom exact d'abord : `Lundi` et `lundi`) ; `case:` sans
  `placer:`. `données:` permis (l'élève compte puis construit). Repérage dans un énoncé :
  `findBarsToPlace`, `hasBarsToPlace`. Scène : les barres à construire marquées `toPlace` (leur
  `value` reste l'effectif attendu, que seule la correction dessine), description accessible
  « Danse à construire » au lieu de l'effectif. Écran `BarresPlacer.svelte` (`StatChart` le prend
  quand `spec.toPlace`) : barre pas construite = pointillés au pied de sa colonne ; toucher la colonne
  d'une barre à construire la choisit et monte son haut au doigt, glisser l'ajuste (ailleurs la page
  défile) ; aimant à l'unité (`barValueAt`), étiquettes, ▲ ▼, flèches, Début, Fin ; `role="slider"`,
  nom accessible sans l'effectif attendu. Faux : une phrase par barre (`barMistake` : « Ta barre Danse
  monte à 9. », « Tu n’as pas construit la barre Danse. ») et le diagramme juste. Calcul pur
  `utils/barres-placer.ts`. PDF : barres à construire absentes, l'enfant les dessine.
  **Échelle choisie par l'élève** (§ 24, 25 ; CE2-082 « échelle adaptée ») —
  `barres-echelle.test.ts` : `axe: à choisir` (nœud : `spec.chooseScale`, `spec.axis` reste null), avec
  `placer: toutes` seulement (sans échelle, une barre dessinée n'aurait pas de hauteur), données
  jusqu'à 100 (sinon refus : aucune échelle ne rentre). Scène : `SCALE_TICKS` (10) graduations sans
  nombres (`scaleToChoose`) tant qu'aucune échelle n'est choisie. Écran : boutons « Une graduation
  vaut : 1 · 2 · 5 · 10 » (`SCALE_STEPS`) ; avant le choix, « Choisis d’abord l’échelle. » et les barres
  ne bougent pas ; choisir numérote l'axe (`scaleAxis`), changer d'échelle garde la valeur des barres
  et efface celles qui ne rentrent plus. Une case pour l'échelle **avant** celles des barres
  (`barsCaseCount`) ; juste = la plus petite échelle où tout rentre (`adaptedScale`) ; faux :
  `scaleMistake` (« Avec 2 par graduation, la barre Alphaville (42) ne rentre pas. », « … rentre, mais
  avec 5 il serait plus grand et plus lisible. ») ; diagramme juste à cette échelle (`solvedSpec`).
  PDF : axe muet et une ligne « Une graduation vaut : ____ » où l'enfant écrit l'échelle.
- ` ```boite-a-moustaches ` (chantier [boite-a-moustaches](../wip/boite-a-moustaches-progress.md),
  palier 1 : affichage, pour 3-062 et la 2de) — `src/lib/ubumark/__tests__/stat-chart/boite-a-moustaches.test.ts`,
  `StatChart-boite-a-moustaches.svelte.test.ts` : une ligne par boîte `Nautic = 28 ; 30 ; 37 ; 45 ; 58`
  (minimum ; Q1 ; médiane ; Q3 ; maximum, virgule décimale, nom avec espaces permis, `= …` seul : boîte
  sans nom), ou `données: 3 ; 5 ; 7 ; …` — UNE boîte sans nom calculée par `describeList`
  (`statistics/describe.ts`, quartiles du programme ; aucun second calcul). Options : `axe: 25 à 60, de 5
en 5` (départ quelconque, décimaux permis ; sans `de p en p` : de 1 en 1 ; sinon axe calculé « rond »
  par `scatterAxis`, qui contient min et max), `titre:` (titre de l'**axe**), `valeurs: oui` (les cinq
  valeurs sous chaque boîte, en rangées pour que deux valeurs proches ne se recouvrent pas),
  `description:`, `taille:` ; une grammaire à part (`parseBoxPlotContent`), nœud `spec.boxPlot`
  (`{ boxes, axis, axisTitle, showValues, fromData }`). Refus situés : pas exactement 5 valeurs, valeur
  qui n'est pas un nombre, désordre (la paire fautive nommée), valeur hors de l'axe écrit, deux boîtes
  du même nom (casse ignorée) ou deux sans nom, `données:` avec des lignes de boîtes, aucune boîte, plus
  de 4 boîtes (`STAT_CHART_LIMITS.boxPlots`), axe mal écrit / à l'envers / pas qui ne tombe pas juste /
  plus de 40 graduations, `données:` de plus de 500 valeurs, option inconnue ou répétée. Scène `utils/boxplot-scene.ts` (bornes,
  graduations, rangées des étiquettes `valueRows`, bandes en px `bands`, partagées par l'écran et le
  PDF) ; description accessible « Boîte Nautic : minimum 28, premier quartile 30, médiane 37, troisième
  quartile 45, maximum 58. » (sans nom : « Boîte à moustaches : … »). Écran `BoxPlotChart.svelte` :
  boîtes horizontales empilées, nom au-dessus à gauche, médiane épaisse, moustaches terminées par un
  petit trait, quadrillage léger aux graduations, une seule couleur d'accent. PDF : le même dessin
  (cetz). Liste, case choix, éditeur riche (bloc de code `boite-a-moustaches`) : génériques, comme
  les autres genres. Fiche `/aide-ecriture/blocs/boite-a-moustaches` (`boxPlotEntry`).
  **À construire** (palier 2, pour 3-030) — `boite-a-moustaches-construire.test.ts`,
  `BoxPlotPlacer.svelte.test.ts` : `placer: Notes` ou `placer: toutes` (`spec.boxPlot.toPlace`, rangs
  dans `boxes`, dans l'ordre de l'auteur ; nom sans la casse ; une boîte sans nom : `toutes` seulement)
  et `caseIndex` (`case: N`, posé par le générateur). Refus : sans `axe:` (calculé, il trahirait le
  minimum et le maximum), avec `valeurs: oui`, nom absent, nommé deux fois ou vide, valeur attendue
  entre deux graduations (l'élève ne pourrait pas la poser), `case:` sans `placer:`. `données:` permis
  avec `placer: toutes` (l'attendu est la boîte de `describeList`). Valeur masquée : `Notes = ? ; ? ; ?
; ? ; ?` (les cinq ou aucune ; boîte `masked`, seulement si elle est à construire). Scène : la boîte
  à construire marquée `toPlace`, description « Boîte Notes : à construire. ». Écran
  `BoxPlotPlacer.svelte` (`StatChart` le prend quand `spec.boxPlot.toPlace`) : nom et ligne en
  pointillés à la hauteur de la boîte ; boutons Min, Q1, Médiane, Q3, Max ; toucher la bande d'une
  boîte à construire (toute la hauteur s'il n'y en a qu'une) pose le trait choisi, glisser l'ajuste,
  aimant à la graduation (`boxValueAt`) ; un trait posé pour la première fois passe au suivant pas
  posé ; flèches (une graduation), Début, Fin ; `role="slider"`, nom accessible sans l'attendu. La
  boîte se dessine dès Q1 et Q3 posés, chaque moustache dès ses deux bouts ; ordre libre, des traits
  dans le désordre sont faux. Faux : une phrase par trait (`boxTraitMistake` : « Ta médiane est à 12. », « Tu n’as pas placé le maximum. », « (boîte Nautic) » quand il y en a plusieurs) et la boîte
  juste (`solvedBoxPlotSpec`), sauf énoncé masqué. Calcul pur `utils/boxplot-placer.ts`. PDF : l'axe
  et le nom seuls, l'enfant dessine. Repérage dans un énoncé : `findBoxPlotsToPlace` ;
  `hasStatChartToPlace` (barres ou boîte, ex-`hasBarsToPlace`).

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

**Programme Scratch** (chantier `bloc-scratch`, palier 1, 2026-11-01) — `src/lib/ubumark/__tests__/scratch/` :

```scratch
quand le drapeau vert pressé
mettre [a v] à (5)
répéter jusqu'à ce que <(a) > [20]>
mettre [a v] à ((a) * (2))
fin
dire (a)
```

Le corps du bloc **est** le programme, dans la syntaxe des `scratchblocks` (paquet `scratchblocks`,
MIT, version épinglée), **en français seulement** : une instruction par ligne, `fin` ferme une
boucle ou un `si`, une ligne vide sépare deux scripts (un `définir …` à côté du script qui
l'appelle). Le parseur est léger : il garde le texte tel quel (`source`), signale seulement le bloc
vide et le bloc non fermé ; fermé par le premier `` seul (texte libre : pas de règle Q66), une
autre clôture rencontrée avant le rend non fermé (Q63). La vérification des instructions
(`utils/scratch-check.ts` : instruction non reconnue, anglais compris, « fin » en trop, « sinon »
sans « si », messages situés par ligne) et le dessin (`utils/scratch-render.ts`, style Scratch 3,
échelle 0,675) sont chargés **à la demande, dans le navigateur seulement** : le dessin mesure le
texte avec un canvas. Avant, et au rendu serveur : le programme en texte monospace. Erreur : messages
pour le prof, « Programme indisponible » pour l'élève. Nom accessible : le programme en une ligne.
Le dessin se réduit à la largeur de sa colonne (case choix comprise). Au PDF (palier 1) : le
programme en texte brut ; le dessin en image SVG est l'objet du palier 2. `check:ubumark` vérifie
les instructions, choix d'un ```` ``choix ```` compris. Éditeur riche : bloc de code `scratch`
(aller-retour). Chat élève (rendu restreint) : jamais rendu. Aide : `/aide-ecriture/blocs/scratch`.

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
Dans un choix d'une case choix : 3 cm (`--horloge-taille` posé par `MultipleChoiceInput` et `ChoiceList` ;
série figée : `withChoiceClockSize` ajoute `taille: 3cm`, lettre seule sur sa ligne).

**Horloge à placer** (chantier [reponses-a-placer](../archive/wip/reponses-a-placer-progress.md) § 13, 14 ;
CP-047, CE1-060, CE2-058, CM1-093) — `src/lib/ubumark/__tests__/horloge/horloge-placer.test.ts`,
`HorlogePlacer.svelte.test.ts` : `placer: 9 h 25` **à la place de** `heure:` (nœud : `spec.placer`,
`spec.times` vide — un rendu qui l'ignore ne dessine aucune aiguille — et `caseIndex`, posé par le
générateur). Refus : avec `heure:`, avec `minutes: cachées`, plusieurs heures (`;`), plus d'une
légende ; `case:` sans `placer:`. Cadran de 6 cm par défaut (`HORLOGE_SIZE_CM.placer`). Écran
`HorlogePlacer.svelte` : deux aiguilles **indépendantes** (pas de remontoir), en attente sur le 12
(grisées, pointillés) tant qu'elles ne sont pas posées ; étiquettes « petite aiguille » / « grande
aiguille » (la grande active au départ), toucher le cadran tourne l'aiguille active (60 crans),
toucher une aiguille posée la reprend, ◀ ▶ et flèches d'un cran ; `role="slider"`, nom accessible
sans l'heure attendue. Calcul pur `utils/horloge-placer.ts` : réponse `handsAnswer` (`'47 25'`),
lecture `readHands` (petite pile sur l'heure si minutes = 0, strictement entre deux heures sinon),
`isPlacedTimeCorrect` (accepte aussi le cran de la vraie place de la petite aiguille, `trueHourTick` :
9 h 05 sur le 9, 9 h 55 sur le 10), phrases `handsMistakes` (rien placé, aiguille pas posée, aiguilles inversées,
« Tu as placé les aiguilles sur 5 h 45. », petite pile sur l'heure ou entre deux heures à tort).
Hors question (cours, aperçu) : le même geste, rien de jugé. PDF : le cadran sans aiguilles,
l'enfant les dessine. Secondes (CM2-083) : hors chantier (pas de trotteuse).

**Figure partagée en parts égales** (chantier [fractions-a-colorier](../archive/wip/fractions-a-colorier-progress.md),
PR 1 : affichage ; PR 2 : `colorier:` ; PR 3 : `unites:`) — `src/lib/ubumark/__tests__/partage/` :

````text
```partage
forme: bande 8
gris: 3
```
````

`forme:` (obligatoire) : `bande N` et `disque N` (2 à 12 parts), `grille L×C` (`x` ou `×`, 1 à 10 lignes et
colonnes, au moins 2 parts ; 10×10 = centièmes), `carre-diagonales` (4 triangles). `gris:` (facultatif) : un
nombre (les N premières parts, de 0 au total) ou une liste de rangs distincts `1, 4, 6` (une seule part : virgule finale, `gris: 4,`) ; absent : aucune part
coloriée. Une clé inconnue ou répétée, un rang hors figure : phrase « Ligne N : … »
dans `errors: string[]`. Numérotation : bande de gauche à droite, grille ligne par ligne depuis le coin haut
gauche, disque depuis midi dans le sens horaire, carré haut / droite / bas / gauche. Scène partagée
`utils/partage-scene.ts` (un polygone par part, arc du disque en pas de 3° ; 1 unité = 0,025 cm, écran comme
PDF) ; écran : SVG, parts coloriées en `--color-fig-orange` (contraste ≥ 3:1 sur le fond, WCAG 1.4.11), nom accessible sans la réponse
(« Bande partagée en parts égales », ni le nombre de parts ni les coloriées, comme l'horloge) ; PDF : Typst natif (`polygon`), parts coloriées **grisées**. Bloc en erreur : messages pour le prof,
cadre « Partage indisponible » pour l'élève. Éditeur riche : bloc de code `partage`. Chat élève (rendu restreint) :
jamais rendu. Fiche fixe du catalogue : `src/lib/block-catalog/partage.ts`.

_Figure à colorier_ (`colorier: 3/8`, à la place de `gris:`) : l'élève colorie, la figure est dessinée sans part
coloriée. Variables permises (`colorier: {{n}}/{{d}}`, lues sur l'énoncé résolu). `spec.colorier` =
`{ num, den, parts }` (`parts` = num × total ÷ den, nombre de parts à colorier sur CETTE figure). Erreurs
au prof : `gris:` et `colorier:` ensemble, fraction mal écrite ou de dénominateur 0, **0 part** (rien à
colorier), fraction **> 1** sans assez de figures (« 7/4 dépasse 1 : ajoute unites: 2 »), fraction qui ne tombe pas
juste sur le partage (`1/3` sur une bande de 8) ; `1/2` sur une bande de 4 est permis (2 parts). `case: N`
est posée par le générateur (`findPartagesToColorier`, `hasPartageToColorier`), jamais écrite par le prof.
Écran (`PartageColorier.svelte`, aussi hors question : cours, aperçu, geste libre) : toucher une part la
colorie, la retoucher l'efface ; **glisser** colorie ou efface plusieurs parts, la première part touchée décide
(pointer events, `touch-action: none`, part lue sur la géométrie de la scène, `partAtPoint`) ; figure
agrandie de 15 % à l'écran (grille 10×10 : cellules ≈ 28 px) ; bouton « Tout effacer ». Chaque part est un
`role="button"` à bascule, nom « Part 3 sur 8, coloriée » ; Tab, Espace, Entrée ; le nom de la figure reste la
forme seule. Réponse de la case (`utils/partage-colorier.ts`) : les rangs coloriés, triés, `1, 4, 6` (vide =
rien colorié), de sorte que la correction redessine la figure de l'élève ; attendue : `3/8` (parts à colorier /
parts de la figure). Jugement : juste si le NOMBRE de parts coloriées est celui attendu, quelles que soient
les parts (`isColoringCorrect`). Correction : « Tu as colorié 2 parts sur 8 ; il fallait en colorier 3
(3/8). » (`coloringMistakes`), la figure de l'élève et la figure juste (les premières parts). PDF : la figure
vide à colorier au crayon ; `generatePartageTypst(node, { solved: true })` dessine la figure juste (aucun
corrigé imprimé ne l'appelle encore : les séries d'automatismes ne gèrent pas les blocs à placer).

_Plusieurs figures_ (`unites: N`, de 1 à 5 ; absent = 1) : N figures identiques côte à côte, pour une fraction

> 1 (`colorier: 7/4` sur `unites: 2` de bandes de 4 ; `gris: 7`). `spec.units` ; parts **numérotées à la
> suite** (figure 2 de N + 1 à 2N), `partageSpecTotal(spec)` ; `spec.colorier.parts` compte sur l'ensemble.
> Plus de figures que nécessaire est permis (figures à laisser vides). Erreurs : `unites:` hors bornes, fraction
> ou `gris:` au-delà des figures dessinées (« écris unites: 3 », le nombre qu'il faut ; au-delà de 5 : le
> plafond). Scènes : `buildPartageScenes(spec)`, une par figure ; écran : un SVG par figure, `flex-wrap` (à la
> ligne sur téléphone), nom « Bande partagée en parts égales, figure 2 sur 3 », part « Figure 2, part 3 sur
> 4 » ; un glissé reste dans la figure où il commence. PDF : une `box` par figure, séparées de 0,6 cm, à la ligne
> quand la page est trop étroite. Attendue : parts / parts d'UNE figure (`'7/4'`) ; `isColoringCorrect` borne
> les rangs à 5 figures (la réponse attendue ne dit pas combien sont dessinées). Correction : « Tu as colorié
> 5 parts ; il fallait en colorier 7 (7/4, chaque figure a 4 parts). », figures justes unités pleines d'abord.

**Assemblage de cubes** (chantier [solides](../archive/wip/solides-progress.md), lot 1 : affichage ; lot 2 : gestes ;
[ADR 0034](../adr/0034-solides-trois-blocs-un-noeud-une-scene-cavaliere.md)) — `src/lib/ubumark/__tests__/espace/` :

````text
```cubes
hauteurs: 2 1 1 / 1 0 1
vue: face
```
````

Un seul nœud `espace` (`types/espace.ts`) pour les blocs d'espace : `EspaceSpec` est une union sur `kind`
(`CubesSpec | SolideSpec | PatronSpec` : resserrer par `kind` avant de lire `spec.task`), `genre` = le mot de clôture. `hauteurs:` (obligatoire) : rangées séparées par `/` ou une par ligne en retrait
sous la clé ; la première rangée est **au fond**, la dernière **devant** ; hauteurs entières de 0 à 6, au
plus 6 rangées × 6 colonnes, rangées de même longueur. Les rangées et colonnes entièrement vides **au bord**
sont retirées (une variable à 0 ne décale pas le dessin), un trou intérieur reste. `vue:` : `perspective`
(défaut), `dessus` (rangée du fond en haut), `face`, `droite` (le devant à gauche), `gauche` (le devant à droite).
Erreurs « Ligne N : … » dans `errors`. Scène partagée `utils/espace-scene.ts` (calcul pur, 1 unité = 1 cm :
l'arête d'un cube mesure 1 cm écran comme PDF) : perspective cavalière, fuyantes à 45° vers le haut à droite
réduites de moitié, faces vues = devant, dessus, droite ; une face collée à un cube voisin n'est pas émise ;
ordre du peintre (fond → devant, gauche → droite, bas → haut). Écran : SVG, trois teintes tirées des tokens
(`--color-background` dessus, mélanges de `--color-foreground` devant et côté), contours
`--color-foreground`, aucune couleur d'accent ; nom accessible = la vue seule, **jamais le nombre de cubes**
(« Assemblage de cubes en perspective ») ; dans un choix, `--espace-taille: 3cm` plafonne la largeur
(comme `--horloge-taille`). PDF : Typst natif (`polygon`), trois gris (dessus clair, côté foncé). Bloc en
erreur : messages pour le prof, cadre « Solide indisponible » pour l'élève. Éditeur riche : bloc de code `cubes`.
Chat élève (rendu restreint) : jamais rendu. Fiche du catalogue : `src/lib/block-catalog/cubes.ts`.

_Gestes de l'élève_ (lot 2, `spec.task`, exclusifs entre eux et avec `vue:`) : `dessiner: face` (`dessus`,
`droite`, `gauche`) → `{ kind: 'dessiner', view }` ; `retrouver: face, droite` (une ou plusieurs parmi `face`,
`droite`, `gauche` : la vue de dessus est **toujours** donnée, c'est la grille de saisie ; `dessus` listée,
liste vide, vue répétée → erreur) → `{ kind: 'retrouver', views }`. `case: N` est posée par le générateur
(`findCubesToBuild`, `hasCubesToBuild`), jamais écrite par le prof (`case:` sans geste → erreur). Écran
(`CubesGeste.svelte`, aiguillé par `Espace.svelte` aussi hors question : cours, aperçu, geste libre) :
`dessiner:` → la perspective et un quadrillage vide **agrandi d'un carreau de chaque côté** de la vue
(`drawingGridSize`), carreaux = boutons à bascule (« Carreau rangée 2, colonne 2, colorié », Espace / Entrée),
couleur `--color-fig-orange` comme ``partage, bouton « Tout effacer » ; `retrouver:` → **pas de perspective**,
la vue de dessus en grille de cases à nombre (1 à 6, « Nombre de cubes, rangée 1 (au fond), colonne 1 »,
le trou sans case, « devant » dessous) et les vues listées, titrées. Réponses et juges (`utils/cubes-gestes.ts`,
calcul pur) : `dessiner:` → le quadrillage, rangées de haut en bas séparées par `/`, `1` = colorié
(`00000/01000/01110/00000`, `''` rien colorié), attendue la vue sans marge (`100/111`), juste **à une
translation près** (`isDrawingCorrect`, carreaux recadrés) ; `retrouver:` → les hauteurs, écriture du bloc,
`-` case vide (`2 1 - / 1 0 1`), attendue `face, droite : 2 1 / 1 2`, juste si l'assemblage a la **même vue de
dessus et les mêmes vues listées** (`isRetrouverCorrect` : plusieurs réponses justes, jamais comparé aux
hauteurs du bloc). Aiguillage : `isCubesAnswerCorrect` (le `:` de l'attendue dit `retrouver:`). Correction :
« Ce n'est pas la vue de face de l'assemblage. » + la vue juste ; « Ton assemblage n'a pas la même vue de
droite. » (une par vue fausse) + l'assemblage du bloc, et « Il y a d'autres réponses justes. » quand
`retrouverHasOtherSolutions` (l'assemblage le plus haut permis par les vues en est un autre, ou une pile peut
descendre d'un cube seule) ; vide : « Tu n'as rien colorié. » / « Tu n'as pas rempli toutes les cases. ». PDF
(`generateEspaceTypst(node, { solved })`) : figures côte à côte, titrées ; quadrillage vide ou vue grisée,
vue de dessus vide ou hauteurs écrites. Le corrigé (`solved`) est prêt mais **pas encore branché** dans la fiche (`typst-generator.ts` appelle sans option), comme pour ``partage.

**Solide en perspective cavalière** (chantier [solides](../archive/wip/solides-progress.md), lot 3 : affichage, § 8 du
journal) — `src/lib/ubumark/__tests__/espace/solide-*.test.ts` :

````text
```solide
forme: pave 4 2 3
sommets: A B C D E F G H
marquer: face EFGH, arete AE, sommet G
cotes: cm
```
````

Même nœud `espace`, genre `solide`, lu par `parser/solide-parser.ts` (`SolideSpec` : `form`, `dims`, `names`,
`marks`, `cotes`, `hidden`). `forme:` (obligatoire) : `cube a`, `pave l p h`, `prisme triangle b h L`
(isocèle), `prisme triangle-rectangle a b L` (base = face de devant, vraie grandeur), `pyramide carree a h`,
`pyramide rectangle l p h`, `pyramide triangle a h` (équilatérale), `cylindre r h`, `cone r h`, `boule r` ;
nombres > 0, virgule ou point, au plus 1000 et 3 décimales, rapport ≤ 10 (`SOLIDE_MAX_RATIO`) ; cône : hauteur > 0,5 × rayon (`SOLIDE_FLAT_CONE`, sinon le sommet tombe dans l’ellipse). Les dimensions sont des **proportions** : le
dessin est ramené à `SOLIDE_SIZE` = 4 cm sur son plus grand côté. `sommets:` : un nom par sommet (majuscule,
puis `'` ou un nombre ; `-` sans nom) dans l'ordre de `solideTopology` — cube, pavé ABCD en **bas** (A devant
gauche, sens direct), EFGH au-dessus (E sur A) ; prisme ABC devant, DEF derrière ; pyramide S puis la base ;
cône S, O ; cylindre O, O' ; boule O (un centre nommé reçoit un point). `marquer:` (virgules) : `face ABCD`
(n'importe quel ordre) ou `face dessus` (places `devant | derriere | dessus | dessous | gauche | droite` de
`topology.places`), `arete AE`, `sommet G` ; solides ronds : sommets seulement. `cotes: cm | mm | m | oui |
non` ; `cachees: non` → tout en plein. Scène `utils/espace-solides.ts` (calcul pur, écran = PDF) : polyèdre →
arête cachée (tirets) quand toutes ses faces tournent le dos à l'œil (`TOWARD_EYE`, normales sortantes) ;
cylindre / cône / boule → ellipses **à plat** (`ELLIPSE_RATIO` 0,3, comme le CP), moitié arrière en tirets,
génératrices du cône **tangentes** (`asin(ry / h)`) ; nom d'un sommet posé dans le plus grand angle libre
entre ses arêtes (`freeDirection`), un centre à gauche ; cotes à la française, hauteurs (pyramide, cône,
prisme isocèle) et rayons intérieurs en tirets. Ordre de dessin : face marquée (gris translucide), tirets,
traits, arêtes marquées (épaisses), points, étiquettes. Nom accessible (`solideLabel`) : « Solide en
perspective cavalière » + marques et cotes, **jamais le nom du solide** (réponse de « nommer le solide »).
PDF : Typst natif (`curve`, `dash`, `polygon` gris). Fiche du catalogue : `src/lib/block-catalog/solide.ts`.

**Sections** (lot 6, § 11 du journal, `solide-section.test.ts`) — `section:` (une seule, `SolideSpec.section`,
type `SolideSection`) : cube, pavé `parallele ABCD 2` ou `parallele dessus 2` (plan ‖ à la face, à la distance
donnée de cette face, vers l'intérieur), puis `IJKL` facultatif (le i-ème nom sur l'arête qui part du i-ème
sommet **écrit** de la face, écrite dans l'ordre du tour) ; cylindre `perpendiculaire h` (hauteur au-dessus de la base du bas) ou
`parallele d` (plan **de face**, à `d` de l'axe, côté de l'œil : rectangle vu en vraie grandeur) ; boule `d`
(plan horizontal à `d` du centre, `0` ou `oui` : grand cercle). Sans distance : au milieu (pavé, cylindre ⊥),
par l'axe ou le centre (cylindre ‖, boule). Distance hors du solide, prisme / pyramide / cône, noms de section
hors pavé ou déjà pris → erreur au prof. Scène : `SolideScene.section` (polygone teinté en orange translucide
`--color-fig-orange`, PDF `rgb(248, 200, 150)`), contour en trait plein épais ; le **plan n'est pas dessiné** ;
boule coupée : sans équateur. `cotes:` écrit la **distance du plan** (pavé : sur l'arête choisie par
`SECTION_COTE`, dans la face avant pour dessus / dessous), jamais les dimensions de la section ; noms IJKL
posés en tournant autour du point jusqu'à ne toucher aucune étiquette (`overlaps`). Nom accessible : « coupé
par un plan », noms de la section et distance — **jamais la nature de la section** (réponse de 3e-020).

**Patron d'un solide** (chantier [solides](../archive/wip/solides-progress.md), lot 4 : affichage, § 9 du journal) —
`src/lib/ubumark/__tests__/espace/patron-*.test.ts` :

````text
```patron
solide: pave 4 2 3
forme: 7
sommets: A B C D E ? G H
faces: numeros
marquer: face 2, sommet A
cotes: cm
```
````

Même nœud `espace`, genre `patron`, lu par `parser/patron-parser.ts` (`PatronSpec` : `solid`, `dims`,
`dimsWritten`, `cells`, `layout`, `faux`, `turn`, `mirror`, `bottom`, `names`, `numbers`, `marks`, `cotes`).
`solide:` (obligatoire) : les mots et dimensions de ``solide (`readForm`), sans cône ni boule ; `cube` seul
→ dimension 1, sans cotes possibles. `forme:` : cube, pavé → `1` à `11` (`CUBE_NETS` : 1-6 « 1-4-1 », la croix
en 1 ; 7-9 « 2-3-1 » ; 10 « 2-2-2 » ; 11 « 3-3 ») ou `faux 1` à `faux 8` (`FALSE_CUBE_NETS`) ; cube → aussi une
**grille** en retrait (`X` / `.`, au plus 6 × 6 et 10 cases, reliée par les côtés) : sans `faux: oui` elle doit
se plier en cube, avec elle ne doit pas (refus situé dans les deux cas) ; prisme `1` (triangles sur le
rectangle du dessous) ou `2` (sur deux rectangles) ; pyramide (étoile), cylindre : `1`. `tourner: 0 | 90 | 180 |
270` (sens des aiguilles), `retourner: oui` (miroir) : le dessin déplacé **en bloc**, noms et numéros suivent.
`dessous: N` (cube, pavé) : la case N devient ABCD. `sommets:` : les noms des sommets **du solide** (ordre de
``solide), `-` sans nom, `?` une fois (« ? » partout où vient ce sommet) ; refusé sur un faux patron (deux sommets au même coin trahiraient le faux). `faces: numeros` ; `marquer:` `face N`,
`face <place>` (la case qui devient cette face, lue « face N » par le lecteur d'écran ; refusée sur un faux patron), `sommet X` (un point sur chaque coin X) ; `cotes:` comme
``solide. Calcul `utils/espace-patrons.ts` (pur, écran = PDF) : `patronNet` **déplie** le polyèdre de
``solide (`polyhedronVertices`, `solideTopology`) le long d'un arbre de faces — grille : le solide roule sur
les cases depuis la case du dessous (face racine vue de l'intérieur : A en bas à gauche, le patron se plie vers
le lecteur), elle se plie si 6 cases donnent 6 faces différentes (`notFolding` sinon) ; prisme, pyramide :
arbres fixes ; cylindre : rectangle 2πr × h et deux disques. Chaque coin sait sur quel sommet il vient ; deux
faces qui se chevauchent sur le dessin (`overlap`) → erreur. Faces numérotées dans l'ordre de lecture **avant**
`tourner:`. `buildPatronScene` : plus grand côté `PATRON_SIZE` = 6 cm, côté commun à deux faces → pli (trait fin
`PATRON_FOLD_STROKE`), sinon contour ; noms dans le plus grand angle libre hors des faces ; cotes : chaque
longueur différente une fois, sur le côté du contour le plus extérieur dont le texte ne touche pas une autre
étiquette, à défaut sur un pli (base de la pyramide), jamais 2πr (cylindre : rayon en tirets et h) ; prisme
isocèle : hauteur du triangle en tirets. Nom accessible (`patronLabel`) : « Assemblage de polygones à plier »

- numéros, marques, cotes — **jamais « patron » ni le nom du solide**. PDF : Typst natif. Fiche du catalogue
  (les 11 patrons et 8 faux patrons dessinés) : `src/lib/block-catalog/patron.ts`.

_Gestes de l'élève_ (lot 5, § 10 du journal, `spec.task` : `PatronTask`, exclusifs ; `case: N` posé par le
générateur) — `__tests__/espace/patron-gestes.test.ts`. `designer: opposee | voisines | sommet A | face EFGH` :
l'élève touche des faces (une ou plusieurs, rien ne dit combien) ; les faces attendues (`task.faces`, ordre de
lecture) sont calculées **au parseur** par le pliage (`targetFaces`, `utils/patron-gestes.ts`) : `opposee` = la
face du solide sans sommet commun avec la face marquée (unique, sinon « pas de face opposée » : pyramide,
rectangle du prisme), `voisines` = une arête commune, `sommet A` = les faces qui contiennent A, `face EFGH` = la
face de ces sommets ; un sommet visé **écrit** sur le patron (`sommets:`) est refusé, ses coins donneraient la
réponse. `opposee` / `voisines` exigent **une** face marquée ; les noms se lisent dans `sommets:`, à
défaut les noms par défaut (ABCDEFGH, ABCDEF, SABCD, SABC) d'un sommet laissé sans nom ; refusé sur un faux
patron et le cylindre. `completer: 4` (1 à `PATRON_COMPLETE_MAX` = 3 cases, cube seulement, vrai patron) : les
cases retirées, les faces restantes reliées ; refusé avec `sommets:`, `faces: numeros`, `marquer:`, `cotes:`
(ils diraient où va la face). Les deux clés se repèrent aussi accentuées (`Compléter:`, `désigner:`),
comme le parseur les lit. Réponses (`patron-gestes.ts`, pur) : `designer:` → numéros des faces touchées,
croissants (`'2,4'`), juste si mêmes faces (`isDesignerCorrect`) ; `completer:` → le quadrillage de travail
(`completerFrame` : la grille **telle que dessinée**, tournée / retournée, recadrée sur les faces **données**
— un vide d'un seul côté montrerait la face manquante — et agrandie d'autant de cases que de faces retirées), `1` = donnée, `2` = posée (`'00000/00100/21110/00100/00000'`), juste si les 6 faces se
**plient en cube** où qu'elles soient (`isCompleterCorrect`, `cubeCellsFold`) — le juge ne compare jamais à la
case retirée ; `completerHasOtherSolutions` cherche une autre pose qui plie. Écran : `PatronGeste.svelte`
(faces = boutons « Face N » à bascule ; emplacements en pointillés = `completerSpots`, cases vides qui touchent
une face, compteur « Faces à poser » ; focus en trait, jamais `outline` dans un SVG en cm) ; `Espace.svelte` y
aiguille un patron à geste hors question (geste libre). PDF : `designer:` → le patron, corrigé (`solved`) :
faces attendues en gris foncé (la face de départ reste gris clair) ; `completer:` → faces données, autres cases du cadre en pointillés, corrigé : faces
retirées en gris.

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
d'une case choix). `centaines:` est réservée (« pas encore disponible »). Groupes de dix en haut, objets
isolés dessous ; groupement partiel (3 dizaines et 15 unités) accepté. Le vrac est tiré d'une graine
faite du contenu du bloc et du rang de la collection : même bloc → même dessin, à l'écran comme au
PDF ; deux objets restent à 1,5 objet l'un de l'autre au moins. Chaque objet de la scène
(`utils/collection-scene.ts`) porte sa valeur (1 ou 10) ; hasard, vrac,
décalage et toucher viennent de `utils/scene-commune.ts`, partagé avec la monnaie (instantanés
`collection-scene-figee.test.ts` : un objet déplacé d'un centième les fait échouer). À l'écran,
**toucher pour marquer** : un objet touché est barré (aide de comptage, non jugée, rien
d'enregistré, effacée à la collection suivante ; « Effacer les marques ») — classe `SceneMarks`
de `nodes/scene-marks.svelte.ts`, commune aux deux blocs. Nom accessible
« Collection d'objets », **jamais le nombre**. PDF en Typst natif, noir sur blanc. Dans un choix d'une
case choix : `--collection-taille: 3cm` (comme l'horloge) ; série figée : `withChoiceCollectionSize`.

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
CP-071 en partie ; centimes : chantier [monnaie-centimes](../wip/monnaie-centimes-progress.md), CE1-054 à 057, 086) — `src/lib/ubumark/__tests__/monnaie/` :

````text
```monnaie
billets: ; 1×10
pièces: 10×1 ;
légendes: Léa ; Tom
```
````

`billets:` (5, 10, 20, 50, 100, 200, 500 €) et `pièces:` (1, 2 € ; 1, 2, 5, 10, 20, 50 c, écrites
`50c`, `50 c` ou `0,50`) : au moins l'une des deux, en liste
(`20 10 10`) ou comptée (`2×10`, `x` et `*` valent `×`, `0×10` admis), triées du plus grand au plus
petit ; ou `montant:` (0 à 1 000 €, écrit `3,45`, `3 € 45 c`, `3 € et 45 c` ou `345c`, milliers séparés ou non : `1 000`, jamais mêlé aux
deux autres) : le bloc choisit les coupures, « le moins d'objets » (`decomposeAmount`, glouton, exact
pour l'euro). Un ensemble par valeur séparée par `;` (1 à 3, vide admis, ligne absente = aucun) ;
1 000 € et 30 objets au plus par ensemble. Les valeurs du nœud sont en euros (`0.5` = 50 c) ; tout
calcul se fait en **centimes entiers** (`utils/monnaie-valeurs.ts` : `toCents`, `readAmount`,
`amountAnswer`, `amountWords`, `denominationLabel`, `denominationName`), jamais 0,449999 €. Messages
situés : coupure inconnue (avec la liste de ce qui existe, l'unité écrite sur **chaque** valeur — `5 c, 10 c, 1 €` —
car `5, 10 c` recopié en `réserve: 5 10 c` donnerait un billet de 5 € sans erreur), pièce écrite en billet ou
l'inverse (`pièces: 5` ajoute « pour 5 centimes, écris 5c »), plus de deux chiffres après la virgule, montant
resté en fraction (`{{eval:345/100}}` donne `\dfrac{69}{20}` : le message dit d'écrire `{{eval:…;d}}`).
Facultatives : `disposition: rangé | mélangé` (défaut `rangé` ; `mélangé` : billets dans un ordre
tiré, pièces en vrac), `légendes:`, `taille:` (comme la collection : 8 cm pleine largeur, même
échelle d'un ensemble à l'autre). Les ensembles se placent côte à côte s'ils tiennent, sinon l'un
sous l'autre. Pas de `prix:` : le prix va dans l'énoncé. **Rendu stylisé**
(aucun élément des vrais billets ni pièces, règles BCE : [journal § 6](../archive/wip/monnaie-progress.md)) :
plus la valeur est grande, plus la coupure est grande, centimes compris (toutes les pièces de centimes
plus petites que 1 €, contrairement aux vraies) ; valeur écrite au centre (`50 c`, `2 €`), répétée en
petit dans deux coins d'un billet (écarté du bord : `cornerInset`, pour `500`) ; la pièce de 2 € a un anneau ; pièces de centimes cuivre (1, 2, 5 c)
et dorées (10, 20, 50 c) — teinte claire de `--color-fig-marron` ; doré = `--color-fig-jaune` réchauffé
d'`--color-accent` en clair (sinon kaki), vieil or mêlé de `--color-fig-marron` en sombre (loin du jaune des
euros, `--color-primary`) ; au PDF deux
gris (`coinFamily`). Billets en haut, pièces dessous ; scène
`utils/monnaie-scene.ts` (hasard, vrac et toucher de `scene-commune.ts`, graine = ce qui se dessine),
marquage au doigt `SceneMarks`. Dessin en `overflow: visible`, comme la collection : sinon Chrome rogne au pixel le bord droit du cadre. Nom accessible « Pièces et billets » : les valeurs sont écrites
(l'enfant les lit), **jamais le total**. PDF en Typst natif, gris cernés de noir ; une légende a une colonne d'au moins 3 cm (si la rangée la tient), centrée, non justifiée. Dans un choix d'une
case choix : **10 cm**, pas 3 (à 3 cm les valeurs ne se lisent plus ; à 6 cm, un petit porte-monnaie restait illisible, décision du 2026-10-26) ; **tous les choix d'une case choix à la même échelle** : si la colonne est plus étroite que le plus large, ils sont réduits ensemble (`monnaieChoiceSize`, `utils/monnaie-choix.ts` : `--monnaie-taille: min(10cm, 100cqw / r)`, la colonne du choix en `container-type: inline-size`) ; un bloc à `taille:` donnée par l'auteur garde sa taille et n'entre pas dans ce calcul (l'auteur décide) ; au corrigé, l'étiquette d'un choix dessiné (« bonne réponse »… ; horloge et collection comprises) passe sous le dessin, pour lui laisser la même largeur ; série
figée : `withChoiceMonnaieSize` (10 cm ; au PDF, la page les tient).

**Monnaie à construire** (chantier [construire](../wip/construire-progress.md) § 6, CP-044, CP-071,
CP-045) — `src/lib/ubumark/__tests__/monnaie/monnaie-construire.test.ts`,
`MonnaieConstruire.svelte.test.ts`, `monnaie-centimes.test.ts` : `construire: 35` ou `construire: 3,45`
(1 c à 1 000 €) remplace les coupures ; `réserve: 1 2 5 10 20` (ou `2 1 50c 20c 10c`) donne les
coupures permises (défaut : 1, 2, 5, 10, 20, 50 €, plus les six pièces de centimes si la somme en a ;
existantes, une fois chacune) ; `taille:` reste ; `billets:`, `pièces:`, `montant:`, `légendes:`, `disposition:` sont
refusées (plan vide, rangé d'office) ; `réserve:` sans `construire:` aussi. Une somme qui ne se fait
pas avec la réserve en 30 objets au plus est une erreur située. L'élève touche la réserve (« Ajouter
un billet de 10 € », « Ajouter une pièce de 2 € », « Ajouter une pièce de 50 centimes ») pour poser une coupure, touche une coupure posée
pour l'enlever ; « Enlever » à côté de chaque bouton, « Tout enlever » ; bouton grisé si l'ajout passe
1 000 € ou 30 objets. La somme n'est jamais affichée ni dite (nom accessible « Ton argent »). Calcul pur
`utils/monnaie-construire.ts` (somme en centimes, réponse `35`, `3,45`, `2,2` ou `1 000` — écrite comme le juge ordinaire l'attend : ni zéro final (« zéros inutiles », faux en `zeros: 'strict'`) ni millier collé (« mal espacé » avec `spacesFromFourDigits`), test de bout en bout `generation-construire.test.ts` ; l'élève ne la lit pas, la correction dit « 2 € et 20 c » ; `''` si vide —, plafonds, construction juste « le moins
d'objets » **avec la réserve**, par programmation dynamique en centimes, par pas du plus grand diviseur commun : avec 2 et 5 €, 6 € = 3 × 2 €) ; dessin
des coupures partagé `MonnaieObjets.svelte`. Case, correction (« Tu as posé 32 €. », « Tu as posé 3 € et 45 c. », « Tu n'as rien
posé. ») et PDF (réserve en petit, cadre vide en pointillés) : ceux de la collection à construire. Copie corrigée et verso de la flash-card : `BuildAnswer.svelte` (`components/questions/`) montre le plan verrouillé **sans réserve** (`showReserve={false}`, sur les deux composants à construire) — la construction de l'élève, ou la construction juste seule ([questions.md](questions.md)).

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
12. **Valeur masquée `?` d'un bloc à geste** (chantier [fuite-enonce](../archive/wip/fuite-enonce-progress.md)) :
    l'énoncé envoyé pendant une évaluation notée remplace la valeur à trouver par `?`
    (`placer: A=? ; B=?` en ` ```line ` / ` ```courbe `, `placer: ?` en ` ```horloge `,
    `construire: ?`, `colorier: ?`, `Natation = ?` pour une barre de `placer:`, `Notes = ? ; ? ; ? ;
? ; ?` pour une boîte à moustaches de `placer:`, `données:` compris). Les parseurs la
    lisent comme une valeur de remplacement (`utils/masked-value.ts`) : mêmes noms, même nombre de
    points ou de barres, même figure, aucune vérification de la valeur ; elle ne sert qu'au dessin
    de la solution, jamais montré avant la correction du serveur. Écrite par un auteur, elle est
    refusée par le générateur (`buildAnswerOf`). Monnaie à construire sans `réserve:` : l'énoncé masqué
    écrit la réserve par défaut de la somme (`defaultReserve`, pièces de centimes comprises si elle en a),
    sinon l'élève ne pourrait plus poser `3,45` (`maskMonnaie`, `masked-statement.ts`). Lot 2, des
    lignes réécrites : ` ```cubes ` `retrouver:` → `hauteurs: ? ? / 0 ?` (l'empreinte, vue de dessus
    donnée) et `vues: face 2 1 ; droite 1 2` (une hauteur par colonne de chaque vue donnée,
    `givenViews` ; `CubesGeste` les dessine telles quelles) : tout assemblage qui a ces vues étant
    juste, les hauteurs ne pouvaient pas partir ; ` ```patron ` `completer:` → le patron amputé en
    grille, déjà tourné et retourné, et `completer: ? ?` (`task.masked` faces à poser,
    `completerStart`) ; ` ```figure-a-completer ` → `verifier: ?` (`spec.masked`, l'outil écrit en
    `outils:`). Pas masqués : `dessiner:` des cubes (la perspective est la figure), `designer:` du
    patron (la tâche, dans la consigne). Gardes : `questions/__tests__/masked-statement.test.ts` et
    `masked-statement-lot2.test.ts`, `FillBlanksInput-enonce-masque.svelte.test.ts` (même HTML
    avec l'instance complète), `tests/integration/evaluation-notee-serveur.test.ts`.

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

- ~~Titres des encadrés toujours en français à l'écran~~ : **corrigé** (L18, 2026-11-01) :
  `Blockquote.svelte` lit la langue du contenu (`readContentLocale`) et appelle `detailKindLabel`,
  comme le PDF. Test : `components/markdown/__tests__/encadre-langue.svelte.test.ts`.
- Typst : `#emph[…]`, `#strike[…]`, `#highlight[…]` d'un texte en ligne se terminent par `;`
  (L19, 2026-11-01), pour qu'un `(`, `[` ou `.lettre` collé après ne soit pas lu comme leur suite.
- **Option à geste dans un choix** (`- ```horloge` + `placer:`, ou un ` ```cubes ` / ` ```patron `
  à geste comme option d'un ` ````choix `) : le générateur masque le choix avant de chercher les
  gestes, d'où ni refus ni case (la spécification des gestes dit « refusé »). Trou relevé le
  2026-11-01 (#2065), pas encore corrigé : la décision revient à David.
- ` ```ranger ` dans une liste sort en bloc de code (absent de `SPECIAL_BLOCK_KINDS`) : ne touche que
  le cours ; dans une question, il est refusé de toute façon.
- Blocs d'espace, laissés tels quels : la cote d'un cylindre coupé parallèlement à l'axe est posée sous
  la base, loin de son court trait quand la distance est petite. Restes hors chantier : voir l'en-tête
  du [journal archivé](../archive/wip/solides-progress.md).
- `latex-generator.ts` (export `.tex`) et ses générateurs `*-latex.ts` n'ont pas d'appelant hors
  du module ni de leurs tests (grep du 2026-10-10) : export en sommeil ou mort, à trancher.
