# Prompt d'implementation — Fill-in-Blanks Redesign v2

## Contexte

On redessine le systeme fill-in-blanks d'UbuMaths. Un premier plan (v1) a ete implemente (phases 1-7) puis **entierement reverte** (commit `0827fe24`) car plusieurs lacunes architecturales ont ete identifiees. Le code du v1 n'est PAS reutilisable. Tout est reecrit a partir du design corrige.

5 sessions de design (2026-02-11 / 2026-02-12) ont produit un doc d'architecture complet et valide. **Toutes les questions ouvertes sont resolues.**

## Document d'architecture

**`docs/wip/fill-in-blanks-redesign.md`** — LIRE EN ENTIER avant toute implementation.

Ce document contient :

- Sections 1-2 : Contexte (ancien systeme TinyMath, etat actuel)
- Section 3 : Decisions de design (syntaxe trous, validation, expressions, blanks, unites)
- Section 4 : Decisions sur les questions en suspens (toutes resolues)
- Section 7 : Etapes d'implementation detaillees

## Decisions cles (resume compact)

### Architecture

- **2 types de questions seulement** : `fill_in_blanks` et `multiple_choice`. Type **infere** de la structure (presence de `choices`), pas stocke. (section 4.4)
- **`solution` optionnel** : absent pour fill_in_blanks, `blanks[]` est la seule source de verite. (section 3.8)
- **Un seul chemin de rendu** : parcours AST unifie, pas de mode expression vs mode statement. (sections 3.4, 3.6, 4.7)

### Trous et blanks

- **Syntaxe** : `?` dans `$...$` = trou math, `[_]` dans le texte = trou texte. (section 3.1)
- **Indexation 0-based partout** : `blanks[]`, `BlankNode.index`, `InputState.index`, `\placeholder[N]{}`. (section 4.1)
- **`blanks[]` positionnels** : l'index dans le tableau = la position du trou. Pas de champ `position`. (section 4.1)
- **`blankDefaults`** sur shared/variation : defauts de validation (precision, requiredForm, unit). Overrides per-blank. (section 3.7)
- **Pool = autocompletion uniquement** : ne restreint pas la validation. (section 3.2)

### Expressions (convention `expression*`)

- Variable dont le nom commence par `expression` = expression math que l'eleve evalue. (section 3.4)
- **Tagging AST** : content-resolver insere `<<expr:NAME>>` avant la valeur resolue. Parser cree noeud avec `expressionName: string`. (section 3.4)
- **`answerFormats?: Record<string, string>`** sur shared/variation. Cle = nom de variable. Defaut `"?"`. (section 4.3)
- **`expressions[]`** sur QuestionInstance : `{ name, latex, answerFormat? }`. (section 3.4)
- **Pipeline answerFormat** : resolution variables → conversion LaTeX → stockage. Le composant n'a qu'a remplacer `?` par `\placeholder[N]{}`. (section 3.4)

### Pipeline `assignBlankIndices()` (section 3.10)

Step apres resolution des variables, avant parsing ubumark. Parcourt le statement de gauche a droite avec compteur global :

- `?` dans math → `\placeholder[N]{}`
- `[_]` dans texte → `{{blank:N}}`
- `<<expr:NAME>>` → reserve indices pour les `?` de l'answerFormat
- Verification : totalBlanks == blanks.length

### Validation

- **Mode infere du contexte** : ni precision ni unit → `areEquivalent()`, precision → `validateNumerical()`, unit.expected → `validateQuantityAnswer()`, trou texte → fuzzy matching. (section 3.7)
- **Per-blank** : chaque trou porte precision, requiredForm, validationRules, unit. (section 3.7)
- **Pipeline trou math** : (1) validationRules custom ou validation par mode infere, (2) checkRequiredForm, (3) applyConstraints. (section 3.7)
- **Interface composant** : `values: string[]` (ascii-math) + `valuesLatex: string[]` (LaTeX). (section 3.7)

### Unites (section 4.9, 4.10)

- **Config `unit` simplifiee** : `{ expected: boolean; required?: string }`. Pas de `requireSameSymbol` (remplace par `unit.required`).
- **`options.unitOptions` supprime** de QuestionTemplate. Remplace par `blankDefaults.unit`.
- **`validateQuantityAnswer` alignee** sur `validateNumerical` : `(userAnswer, correctAnswer, precision?, requiredUnit?)`. Supporte tous les modes de `PrecisionType`.
- **45 questions Grandeurs** : le transformer ajoute `unit: { expected: false }` (l'unite est dans l'expression).

### Flash back (section 4.7)

- `blanks[i].expectedAnswerLatex` fourni par le generateur (meme pipeline que answerFormat).
- Trous statement : remplace par `expectedAnswerLatex` en lecture seule.
- Trous expression : construit `expression = answerFormatResolu` avec reponses inserees.
- Trous texte : affiche `expectedAnswer` dans un `<span>` stylise.

### Corrections (systeme existant, pas a modifier)

- `correctionDetailss` (326/633 questions) → `correction.steps[]` (deja migre)
- `correctionFormats` (7/633 questions) → `correction.feedback.correct/incorrect` (deja migre)
- Le systeme `QuestionCorrection` est orthogonal au fill-in-blanks, il fonctionne deja.
- **Point d'attention** : `{{solution}}` dans les corrections de questions fill-in-blanks devra etre resolu depuis `blanks[].expectedAnswer`.

## Etapes d'implementation (section 7 du doc)

### Etape 2 — Types TypeScript

Modifier `src/lib/questions/types.ts` :

- Supprimer `QuestionTemplate.type` et `QuestionInstance.type`
- `QuestionType` → type utilitaire `'fill_in_blanks' | 'multiple_choice'` + fonction `getQuestionType()`
- `solution` → `solution?: string | string[]` (optionnel)
- Nouvelle structure `blanks[]` (template-side et instance-side, voir section 3.7)
- Ajouter `blankDefaults?`, `answerFormats?` sur QuestionVariation et SharedVariationDefaults
- Ajouter `expressions[]` sur QuestionInstance
- `unit` simplifie : `{ expected: boolean; required?: string }`
- Supprimer `options.unitOptions`

### Etape 3 — Parser ubumark

Modifier `src/lib/ubumark/parser/markdown-parser.ts` et `src/lib/ubumark/types/ast.ts` :

- Support `[_]` → meme `BlankNode` que `{{blank:N}}`
- Support `<<expr:NAME>>` → `expressionName` sur MathInlineNode/MathBlockNode
- `expressionName?: string` sur les types AST
- `BlankNode.index` et `InputState.index` : passage 1-based → 0-based

### Etape 4 — `assignBlankIndices()`

Nouveau module dans le pipeline de generation :

- Parcours gauche→droite, compteur global
- `?` dans math → `\placeholder[N]{}`, `[_]` → `{{blank:N}}`
- `<<expr:NAME>>` → reserve indices pour les `?` de l'answerFormat
- Verification coherence : totalBlanks == blanks.length

### Etape 5 — Composant FillBlanksInput

Reecrire `src/lib/components/question-inputs/FillBlanksInput.svelte` :

- Parcours AST unifie (un seul chemin de rendu)
- `\placeholder[N]{}` deja dans le statement
- Expressions : augmenter noeud math avec `= answerFormat` en interactif
- Flash back : `expectedAnswerLatex` en lecture seule
- Interface : `bind:values` + `bind:valuesLatex`

### Etape 6 — Pipeline de generation

Adapter `src/lib/questions/generator/instance-generator.ts` :

- Detecter variables `expression*`, extraire metadonnees dans `instance.expressions[]`
- Copier `answerFormats` → `expressions[i].answerFormat`
- Construire `blanks[]` avec type et config (fusion blankDefaults + overrides)
- Appeler `assignBlankIndices()` apres resolution du statement
- `resolveVariationWithShared` : `solution` optionnel pour fill_in_blanks

### Etape 7 — Validation

Adapter `src/lib/utils/answer-validator.ts` et `src/lib/questions/units/validator.ts` :

- Validation per-blank (pipeline complet par trou)
- Switch sur `instance.choices !== undefined` au lieu de `instance.type`
- `validateQuantityAnswer` : nouvelle signature `(userAnswer, correctAnswer, precision?, requiredUnit?)`
- Supprimer `options.unitOptions`, `UnitValidationOptions`, `requireSameSymbol`
- `validateNumericalWithUnit` : supprime ou redirige vers `validateQuantityAnswer`

### Etape 8 — Transformer de migration

Adapter `src/lib/migration/question-transformer.ts` :

- Reclasser 369 result/rewrite en fill_in_blanks (critere : `expressions[]` present, pas de `?` dans l'expression, pas de `choicess`)
- Generer `blanks[]` depuis `solutionss`
- Extraire `answerFormat` → `shared.answerFormats`
- Convertir 157 answerField (regex : `\text{...}` → texte, `$$...$$` → `$?$`)
- Generer `blanks[]` depuis `solutionss` pour answerField
- 45 questions Grandeurs : ajouter `unit: { expected: false }` sur les blanks
- `expressions2` : creer variable `expression2` (2 questions QCM)
- Retirer `type` de la sortie du transformer

### Etape 9 — Dictionnaire vocabulaire FR

`src/lib/data/math-dictionary-fr.ts` : ~200-300 termes, fonctions utilitaires.

### Etape 10 — Tests + import en DB

## Fichiers cles a lire

### A modifier

| Fichier                                                     | Modifications                                                 |
| ----------------------------------------------------------- | ------------------------------------------------------------- |
| `src/lib/questions/types.ts`                                | Refonte types (blanks, solution optionnel, expressions, unit) |
| `src/lib/questions/generator/instance-generator.ts`         | Pipeline generation (expressions, assignBlankIndices, blanks) |
| `src/lib/questions/generator/content-resolver.ts`           | Insertion marqueur `<<expr:NAME>>`                            |
| `src/lib/utils/answer-validator.ts`                         | Validation per-blank, suppression unitOptions                 |
| `src/lib/questions/units/validator.ts`                      | Nouvelle signature validateQuantityAnswer                     |
| `src/lib/ubumark/types/ast.ts`                              | `expressionName`, 0-based                                     |
| `src/lib/ubumark/parser/markdown-parser.ts`                 | Support `[_]` et `<<expr:NAME>>`                              |
| `src/lib/components/question-inputs/FillBlanksInput.svelte` | Reecriture complete                                           |
| `src/lib/migration/question-transformer.ts`                 | result/rewrite, answerField, Grandeurs, expressions2          |

### Deja fonctionnels (a integrer, pas a reecrire)

| Fichier                                                  | Role                                   |
| -------------------------------------------------------- | -------------------------------------- |
| `src/lib/components/markdown/nodes/MathPrompt.svelte`    | Gere `\placeholder[N]{}` avec MathLive |
| `src/lib/components/markdown/nodes/BlankInput.svelte`    | Input texte pour `[_]`                 |
| `src/lib/components/markdown/nodes/ParagraphNode.svelte` | Routage AST → composants               |
| `src/lib/questions/units/`                               | Systeme d'unites complet (770 tests)   |

### Donnees

| Fichier                                    | Role                                                      |
| ------------------------------------------ | --------------------------------------------------------- |
| `.claude/old-questions.json`               | 633 questions TinyMath (exemples concrets pour les tests) |
| `docs/wip/fill-in-blanks-redesign.md`      | **DOC D'ARCHITECTURE — LIRE EN ENTIER**                   |
| `docs/wip/fill-in-blanks-plan-v2-notes.md` | Lecons du v1, contexte historique                         |

## Donnees des 633 questions

| Mode d'interaction | Count     | Nouveau traitement                              |
| ------------------ | --------- | ----------------------------------------------- |
| Result/rewrite     | 369 (58%) | Convention `expression*` + answerFormats        |
| AnswerField        | 157 (25%) | Statement avec `$?$` (conversion regex)         |
| Fill-in            | 107 (17%) | Expression avec `?` dans la formule             |
| **Total**          | **633**   | Dont 47 QCM, 45 Grandeurs, 326 avec corrections |

Exemples representatifs dans `.claude/old-questions.json` :

- globalIndex 413 : answerFormat `10^?` (puissances)
- globalIndex 411 : answerFormat `?*10^?` (notation scientifique, multi-trous)
- globalIndex 10 : result/rewrite simple (sans answerFormat)
- globalIndex 51 : fill-in avec `?` dans l'expression
- globalIndex 0 : answerField mono-trou
- globalIndex 478, 587 : `expressions2` (QCM, 2 expressions simultanees)
- globalIndex 426-470 : questions Grandeurs (unites)

## Regles ABSOLUES

1. **LIRE le doc d'architecture EN ENTIER** (`docs/wip/fill-in-blanks-redesign.md`) avant de coder quoi que ce soit
2. **NE PAS recuperer de code du v1** (reverte, hypotheses fausses). Tout est reecrit from scratch
3. **Workflow TDD** : proposer les comportements en francais → attendre validation utilisateur → ecrire tests → implementer
4. **NE PAS devirer du doc** : si le doc dit "utiliser module X", utiliser module X. Ne pas reimplementer
5. **Utiliser des exemples concrets** de `.claude/old-questions.json` pour les tests
6. **Commits reguliers** apres chaque etape validee
7. **Documents de progression** dans `docs/wip/` apres chaque phase significative
8. **Svelte autofixer** sur chaque fichier .svelte modifie
9. **Code review** (agent) apres chaque phase
