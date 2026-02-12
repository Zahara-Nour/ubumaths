# Fill-in-Blanks Redesign v2 — Notes de travail

**Date** : 2026-02-11
**Contexte** : Le plan v1 (phases 1-7) a ete implemente puis reverte (commit `0827fe24`) car plusieurs lacunes architecturales ont ete identifiees. Ce document rassemble les lecons apprises pour guider la reecriture du plan.

---

## 1. Lacunes identifiees dans le plan v1

### 1.1 Convention `expression` (variable dont le nom commence par `expression`) jamais implementee dans le generateur

Le plan prevoyait (Phase 3, spec 1) : "Quand une variable `expression*` n'a pas de `?`, le pipeline ajoute `= answerFormat`".

**Ce qui a ete code** : `buildAnswerFormatExpression()` dans `blank-resolver.ts` sait concatener `expr = format`, mais **rien ne l'appelle**. L'etape 7b de `instance-generator.ts` ne detecte pas les variables `expression*` et ne fait pas la concatenation.

**Consequence** : les 369 questions result/rewrite n'auraient jamais affiche `expression = answerFormat`.

### 1.2 `answerFormat` scalaire vs per-expression

Le plan prevoyait `answerFormat?: string` (un seul format sur `shared` ou `variation`).

**Probleme** : si un statement contient `expression1` et `expression2`, chacune peut necessiter un format different. Le type scalaire ne le supporte pas. Les 2 questions avec `expressions2` ont 2 expressions simultanees dans la meme variation.

**RESOLU** : `answerFormats?: Record<string, string>` per-expression. Voir redesign sections 3.5 et 4.3.

### 1.3 `validateBlanks()` court-circuite le pipeline complet

Le plan Phase 5 disait : "Les trous math sont valides par equivalence algebrique (`areEquivalent()`)".

**Ce qui manque pour les trous math** :

- `checkRequiredForm()` — verifie la forme structurelle (produit, somme, fraction...)
- `applyConstraints()` — espaces, produits, parentheses, zeros, termes nuls, facteur 1/0, signes, fractions irreductibles, unites
- `validateNumerical()` avec precision (decimal, significant, tolerance)
- Le LaTeX de chaque reponse (necessaire pour les constraint checks) n'etait pas collecte ni passe

**RESOLU** : validation per-blank specifiee dans redesign section 3.7. Chaque trou porte sa propre config de validation (`validationType`, `precision`, `requiredForm`, `validationRules`). Pipeline per-trou math : (1) validationRules ou validation par type, (2) checkRequiredForm, (3) applyConstraints. Trous texte : fuzzy matching.

### 1.4 Faux binaire "mode expression" vs "mode statement"

Le plan Phase 4 prevoyait deux modes de rendu distincts :

- "Mode expression\*" : un seul MathField
- "Mode statement" : rendu hybride AST

**Realite** : il n'y a qu'**un seul statement unifie** qui peut contenir du texte, des `[_]`, du math inline avec `?`, ET des variables expression — le tout melange. Les expressions sont juste des elements du statement, pas un mode separe.

**RESOLU** : le doc de redesign (sections 3.4, 3.6, 4.7) a ete corrige. Le composant a un seul chemin de rendu (parcours AST). La convention `expression*` est geree via un champ `expressions` sur `QuestionInstance` : le generateur y extrait les metadonnees, le composant les utilise pour augmenter le noeud math en mode interactif (append `= answerFormat[\placeholder]`). En flash, le statement est rendu tel quel.

---

## 2. Ce qui fonctionnait bien dans v1 (a conserver comme base)

### 2.1 Architecture generale

- 3 types de questions (`fill_in_blanks`, `multiple_choice`, `open_answer`) — bon choix
- Syntaxe `?` dans `$...$` = trou math, `[_]` dans le texte = trou text — bon choix
- Numerotation globale positionnelle 0-based — bon choix

### 2.2 Code reutilisable (reverte mais recuperable via git)

- **`fuzzy-text-validator.ts`** : `normalizeText()`, `levenshteinDistance()`, `fuzzyTextMatch()` — 35 tests, tout passait
- **`legacy-type-mapper.ts`** : `mapLegacyType()`, `isLegacyType()` — 31 tests
- **`blank-resolver.ts`** : `resolveBlanks()`, `buildAnswerFormatExpression()`, `findMathZones()` — 16 tests
- **`math-dictionary-fr.ts`** : 230+ termes, fonctions de recherche — 27 tests
- **Parser `[_]`** dans `markdown-parser.ts` : `parseTextForTextBlanks()` — 10 tests

### 2.3 Decisions d'architecture validees (doc redesign sections 3-4)

- Convention `expression` (variable dont le nom commence par `expression`) (variable dont le nom commence par `expression`)
- Distinction `answerFormat` (visuel) vs `requiredForm` (validation)
- Fuzzy matching pour les trous texte (accent/case insensitive, Levenshtein <= 1)
- Autocompletion via dictionnaire math FR + pool par question

---

## 3. Donnees reelles (ancien systeme TinyMath)

| Fait                                                       | Valeur                           |
| ---------------------------------------------------------- | -------------------------------- |
| Questions totales                                          | 633                              |
| Result/Rewrite (expression affichee, eleve donne resultat) | 369 (58%)                        |
| AnswerField (phrase avec trous math)                       | 157 (25%)                        |
| Fill-in (expression avec `?` a completer)                  | 107 (17%)                        |
| Questions avec `answerFormats` non-trivial (pas `?`)       | 15                               |
| Questions avec formats differents entre variations         | 0                                |
| Questions avec `expressions2` (2 expressions simultanees)  | 2                                |
| `expressions[i]`                                           | = expression pour la variation i |
| Formats typiques                                           | `10^?`, `?*10^?`, `&1^?`         |

### Exemples concrets d'answerFormats

```
Description: "Multiplier 2 puissances de 10"
  expressions: ['10^&2*10^&3']
  answerFormats: ['10^?']
  → Affichage: 10^2 × 10^3 = 10^{[___]}

Description: "Notation scientifique"
  expressions: ['[._&1,&3*10^{&4}_]']
  answerFormats: ['?*10^?']
  → Affichage: 3,5 × 10^4 = [___] × 10^{[___]}
```

---

## 4. Infrastructure existante (non modifiee par v1)

### Composants de rendu deja fonctionnels

- **`MathPrompt.svelte`** : gere `\placeholder[N]{}` avec API MathLive (`getPromptValue`, `setPromptState`)
- **`BlankInput.svelte`** : input texte inline pour `[_]` et `{{blank:N}}`
- **`ParagraphNode.svelte`** : route deja TextNode → `<span>`, BlankNode → `BlankInput`, MathInlineNode avec prompts → `MathPrompt`, MathInlineNode sans prompts → `MathInline`

### Type `InputState` (unifie texte et math)

```typescript
interface InputState {
	index: number; // 1-based
	value: string;
	type: 'text' | 'math';
	isCorrect: boolean | null;
}
```

### Pipeline de validation complet (`answer-validator.ts`)

```
1. evaluateValidationRules()     — rules custom (testAnswers)
2. switch(type) → validation     — equivalence, numerique, choix...
3. checkRequiredForm()           — forme structurelle (produit, somme...)
4. applyConstraints()            — espaces, parentheses, fractions irreductibles...
```

Constraint checks disponibles : `spaces`, `products`, `brackets`, `zeros`, `form`, `nullTerms`, `factorOne`, `factorZero`, `signs`, `reducedFractions`, `unit`.

---

## 5. Questions ouvertes pour le plan v2

### 5.1 ~~Ou la concatenation `expression = answerFormat` se fait-elle ?~~ RESOLU

**Decision** : la concatenation se fait dans le **composant** au moment du rendu. Le generateur resout la variable normalement et extrait les metadonnees dans `instance.expressions`. Le composant identifie le noeud math par comparaison LaTeX et l'augmente avec `= answerFormat[\placeholder]` en mode interactif. En flash, le statement est rendu tel quel. Voir redesign sections 3.4 et 4.7.

### 5.2 ~~`answerFormat` scalaire ou per-expression ?~~ RESOLU

**Decision** : per-expression. `answerFormats?: Record<string, string>` sur `shared`/variation, cle = nom de variable expression. Defaut `"?"` si absent. Le generateur copie dans `instance.expressions[i].answerFormat`. Voir redesign sections 3.5 et 4.3.

### 5.3 ~~Comment chaque trou math passe-t-il par le pipeline complet ?~~ RESOLU

**Decision** : validation per-blank. Chaque blank porte `validationType`, `precision`, `requiredForm`, `validationRules`. Le composant collecte ascii-math + LaTeX per-trou via `getPromptValue()`. `constraints` reste per-question. Voir redesign section 3.7.

### 5.4 ~~Expressions multiples dans un statement~~ RESOLU

Le champ `instance.expressions[]` supporte naturellement plusieurs expressions. Chaque entree a son propre `answerFormat`. Le composant augmente chaque noeud math correspondant independamment. Les 2 questions avec `expressions2` ont 2 expressions simultanees dans la meme variation (pas une par variation).

---

## 6. Fichiers cles a connaitre

| Fichier                                                     | Role                                                   |
| ----------------------------------------------------------- | ------------------------------------------------------ |
| `src/lib/questions/types.ts`                                | Types QuestionTemplate, QuestionInstance, QuestionType |
| `src/lib/questions/generator/instance-generator.ts`         | Pipeline de generation d'instances                     |
| `src/lib/utils/answer-validator.ts`                         | Pipeline de validation complet                         |
| `src/lib/questions/constraint-validators.ts`                | Constraint checks individuels                          |
| `src/lib/questions/required-form-validator.ts`              | Verification de forme requise                          |
| `src/lib/migration/question-transformer.ts`                 | Migration ancien → nouveau format                      |
| `src/lib/migration/old-question-types.ts`                   | Types de l'ancien systeme                              |
| `src/lib/components/question-inputs/FillBlanksInput.svelte` | Composant actuel (a reecrire)                          |
| `src/lib/components/markdown/nodes/MathPrompt.svelte`       | Gere \placeholder avec MathLive                        |
| `src/lib/components/markdown/nodes/BlankInput.svelte`       | Input texte pour [_]                                   |
| `src/lib/components/markdown/nodes/ParagraphNode.svelte`    | Routage AST → composants                               |
| `src/lib/components/questions/FlashCard.svelte`             | Integration principale                                 |
| `src/lib/ubumark/types/ast.ts`                              | InputState et types AST                                |
| `docs/wip/fill-in-blanks-redesign.md`                       | Doc d'architecture (decisions)                         |
| `.claude/old-questions.json`                                | Donnees des 633 questions TinyMath                     |
