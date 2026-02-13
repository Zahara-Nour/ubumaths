# Prompt de continuation — Phase 8 : Tests end-to-end pipeline fill-in-blanks

## Contexte

On redessine le systeme fill-in-blanks d'UbuMaths. Les phases 1-6 sont terminees :

- **Phase 1** (COMPLETE) : Types TypeScript — `getQuestionType()`, `InstanceBlank`, `blankDefaults`, `answerFormats`, `expressions`, `orderIndependent`
- **Phase 2** (COMPLETE) : Parser ubumark — `<<expr:NAME>>` detection, `assignBlankIndices()`
- **Phase 3** (COMPLETE) : Pipeline de generation — `instance-generator.ts` construit `blanks[]`, `expressions[]`, appelle `assignBlankIndices()`
- **Phase 4** (COMPLETE) : Validation per-blank — pipeline validationRules → mode infere → requiredForm → constraints
- **Phase 5** (COMPLETE) : Transformer de migration — reclassification result/rewrite → fill_in_blanks, conversion answerField, unit detection
- **Phase 6** (COMPLETE) : Composant FillBlanksInput — rewrite AST-based, augmentation expressions, disabled MathPrompt
- **Phase 7** (A FAIRE) : Dictionnaire vocabulaire FR — ~200-300 termes math, `MathTerm` interface, fonctions utilitaires

**Phase 8 concerne la verification end-to-end** : s'assurer que le pipeline complet (transformer → generateur → composant) fonctionne sur les 633 questions migrees.

## Documents de reference

- **`docs/wip/fill-in-blanks-redesign.md`** — Doc d'architecture complete
- **`docs/wip/fill-in-blanks-v2-progress.md`** — Etat de progression des phases 1-6
- **`docs/wip/fill-in-blanks-v2-plan.md`** — Plan d'implementation (Phase 8 = quality checks)
- **`.claude/old-questions.json`** — 633 questions au format ancien (source de verite pour la migration)

## Objectif Phase 8

Verifier que la chaine complete fonctionne pour les 3 modes d'interaction :

### 8.1 — Test transformer → generateur (integration)

Pour un echantillon representatif de questions anciennes :

1. Transformer la question ancienne via `transformQuestion()`
2. Generer une instance via `generateQuestionInstance()`
3. Verifier que le statement contient les bons `\placeholder[N]{}` et/ou `{{blank:N}}`
4. Verifier que `blanks[]` est coherent (nombre, types, expectedAnswer)
5. Verifier que `expressions[]` est correct pour les questions expression
6. Valider la reponse correcte via `validateAnswer()` → `isCorrect: true`

### 8.2 — Echantillon representatif (au minimum)

| Mode ancien      | globalIndex | Description                            | Specifite                         |
| ---------------- | ----------- | -------------------------------------- | --------------------------------- |
| Result simple    | 10          | Expression simple, answerFormat defaut | 1 blank, `?` → `\placeholder`     |
| Result answerFmt | 413         | `10^?`                                 | answerFormat avec structure       |
| Result multi     | 411         | `?*10^?`                               | 2 blanks dans answerFormat        |
| AnswerField mono | 0 (var 0)   | `\text{...}$$...$$\text{...}`          | Conversion texte + math           |
| Fill-in          | 51          | `?` dans l'expression directement      | Pas de convention expression      |
| Grandeurs        | 426-469     | `&1 km = ? m`                          | Unite visible, pas de `unit` flag |
| QCM expressions2 | 478         | 2 expressions simultanees              | Reste multiple_choice             |
| Texte blank      | —           | Question avec `[_]` (si existant)      | `{{blank:N}}`, type text          |
| OrderIndependent | —           | Question avec `orderIndependent: true` | Pool matching                     |

### 8.3 — Test validation round-trip

Pour chaque question de l'echantillon :

1. Generer une instance
2. Extraire les `expectedAnswer` de chaque blank
3. Appeler `validateAnswer(expectedAnswers, instance)` → doit retourner `isCorrect: true`
4. Appeler `validateAnswer(wrongAnswers, instance)` → doit retourner `isCorrect: false`

### 8.4 — Test composant (AST rendering)

Pour les questions de l'echantillon :

1. Parser le statement resolu avec `parseMarkdown()`
2. Verifier que l'AST contient les bons noeuds (MathInlineNode avec `expressionName`, BlankNode, etc.)
3. Appeler `augmentASTForExpressions()` et verifier le resultat
4. Verifier que `buildInputStates()` produit le bon nombre d'InputState avec les bons types

## Pipeline a tester

```
old-questions.json
       │
       ▼
transformQuestion()          ← Phase 5 : ancien format → QuestionTemplate
       │
       ▼
generateQuestionInstance()   ← Phase 3 : template → instance avec blanks[], expressions[]
       │                        (inclut assignBlankIndices, content-resolver, etc.)
       ▼
QuestionInstance
  ├── statement: "$$<<expr:expression1>>10^{2} \times 10^{3}$$ ..." (resolu)
  ├── blanks: [{ expectedAnswer: "5", type: "math", ... }]
  └── expressions: [{ name: "expression1", latex: "...", answerFormat: "10^{\placeholder[0]{}}" }]
       │
       ▼
parseMarkdown(statement)     ← Phase 2 : statement → AST
       │
       ▼
augmentASTForExpressions()   ← Phase 6 : ajoute " = answerFormat" aux noeuds expression
       │
       ▼
buildInputStates(blanks)     ← Phase 6 : blanks → InputState[]
       │
       ▼
validateAnswer(values, inst) ← Phase 4 : validation per-blank
```

## Fichiers cles a lire

| Fichier                                                   | Role                                 |
| --------------------------------------------------------- | ------------------------------------ |
| `.claude/old-questions.json`                              | 633 questions au format ancien       |
| `src/lib/migration/question-transformer.ts`               | Transforme ancien → nouveau format   |
| `src/lib/migration/test-transformer-examples.ts`          | Exemples existants de transformation |
| `src/lib/questions/generator/instance-generator.ts`       | Genere instances depuis templates    |
| `src/lib/questions/generator/assign-blank-indices.ts`     | Assigne indices aux blanks           |
| `src/lib/utils/answer-validator.ts`                       | Validation des reponses              |
| `src/lib/components/question-inputs/fill-blanks-utils.ts` | Utilitaires AST du composant         |

## Fichier de test a creer

**`src/lib/questions/generator/__tests__/e2e-fill-blanks-pipeline.test.ts`**

Ce fichier teste le pipeline complet transformer → generateur → validation pour l'echantillon representatif.

## Workflow TDD (OBLIGATOIRE)

1. **Phase 8.0** : Proposer les comportements en francais, attendre validation
2. **Phase 8.1** : Ecrire les tests
3. **Phase 8.2** : Corriger les bugs trouves (si les tests echouent)
4. **Phase 8.3** : Code review + commit + doc progression

## Issues connues (des phases precedentes)

Ces issues ne bloquent pas la Phase 8 mais peuvent causer des echecs sur certaines questions :

- **Limitation heuristique texte** : `expectedAnswer.includes('{{')` pour decider si la valeur doit etre resolue. Fragile pour des cas theoriques mais fonctionne pour les 633 questions.
- **Validation position marqueur expression** : `insertExpressionMarkers()` ne verifie pas que `{{expression*}}` est au debut d'une zone math.

## Regles ABSOLUES

1. **LIRE** `docs/wip/fill-in-blanks-v2-progress.md` et `docs/wip/fill-in-blanks-redesign.md` avant de coder
2. **Workflow TDD** : proposer les comportements → attendre validation → ecrire tests → corriger
3. **Ne PAS modifier** le code des phases 1-6 sauf pour corriger des bugs trouves par les tests
4. **Documents de progression** dans `docs/wip/fill-in-blanks-v2-progress.md`
5. **Commits reguliers** apres chaque etape validee
