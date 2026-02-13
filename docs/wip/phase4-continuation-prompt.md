# Prompt de continuation — Phase 4 : Validation per-blank

## Contexte

Tu travailles sur le projet UbuMaths, une application educative de mathematiques. Tu implementes un **redesign du systeme fill-in-blanks v2** selon un plan en 8 phases.

**Les phases 1-3 sont completes** (types, parser, generation pipeline). Tous les tests passent (39/39 instance-generator, 33/33 generation-fill-blanks, 25/25 assign-blank-indices, 148+ total).

## Documents a lire AVANT de commencer

1. **Architecture complete** : `docs/wip/fill-in-blanks-redesign.md` — Section 3.7 (validation per-blank) est la reference
2. **Plan** : `docs/wip/fill-in-blanks-v2-plan.md` — Phase 4 (lignes 78-134)
3. **Progression** : `docs/wip/fill-in-blanks-v2-progress.md` — etat actuel, decisions prises
4. **Code existant** : `src/lib/utils/answer-validator.ts` — validateur actuel a modifier
5. **Validateur unites** : `src/lib/questions/units/validator.ts` — signature a changer
6. **Types** : `src/lib/questions/types.ts` — `InstanceBlank`, `PrecisionType`, `BlankDefaults`

## Etat actuel du validateur

`validateAnswer()` dans `answer-validator.ts` fait actuellement :

- Switch sur `getQuestionType()` : `multiple_choice` ou `fill_in_blanks`
- Pour `fill_in_blanks` : appelle `validateBlanks()` qui fait un simple `areEquivalent()` ou string match (`isAnswerMatch()`) par blanc — **sans tenir compte de `precision`, `unit`, `requiredForm`, `validationRules` per-blank**
- `requiredForm` et contraintes sont appliquees apres, mais **globalement** (pas per-blank)
- `validateQuantityAnswer()` dans `units/validator.ts` prend `(userAnswer, expectedAnswer, ValidationOptions)` avec `requireSameSymbol` et `tolerance` — **pas le format `PrecisionType`**

## Objectif Phase 4

Refactorer la validation pour que chaque blank soit valide **individuellement** selon son contexte :

### Mode de validation infere (pas de champ `validationType`)

| Contexte blank                | Mode              | Fonction                                        |
| ----------------------------- | ----------------- | ----------------------------------------------- |
| Ni `precision` ni `unit`      | Equivalence       | `areEquivalent()`                               |
| `precision` present           | Approximate       | `validateNumerical()`                           |
| `unit.expected` present       | Unite             | `validateQuantityAnswer()` (nouvelle signature) |
| `precision` + `unit.expected` | Unite + precision | `validateQuantityAnswer()` avec `precision`     |
| Trou texte (`type: 'text'`)   | Fuzzy text        | accents/casse ignores, Levenshtein <= 1         |

### Pipeline pour chaque trou math

1. `validationRules` custom si presentes → echec = short-circuit incorrect. Succes = continue.
2. Validation selon mode infere (voir tableau ci-dessus)
3. `checkRequiredForm()` — si reponse correcte + `blank.requiredForm` defini + LaTeX disponible
4. `applyConstraints()` — si reponse correcte + LaTeX disponible

**Notes decidees** :

- `validationRules` est une pre-condition, pas un remplacement du pipeline
- `instance.validationRules` (global) supprime du validateur ; fallback ajoute dans le generateur
- Blanks prefilled valides normalement (editables)
- Fuzzy text : vrai Levenshtein (distance <= 1)
- `requiredForm` lu depuis `blank.requiredForm` (per-blank), pas `instance.requiredForm`

### Changements de signature requis

**`validateQuantityAnswer()`** dans `units/validator.ts` :

- Ancienne : `(userAnswer, expectedAnswer, ValidationOptions)` avec `requireSameSymbol`, `tolerance`
- Nouvelle : `(userAnswer, correctAnswer, precision?, requiredUnit?)` — utilise `PrecisionType`
- Supprimer `requireSameSymbol` de `ValidationOptions`

**`validateAnswer()`** dans `answer-validator.ts` :

- Le switch se fait sur `instance.choices !== undefined` (pas `getQuestionType()`) — coherent avec l'inference de type
- Branche fill_in_blanks : validation **per-blank** avec les champs de `InstanceBlank`
- Interface : `values: string[]` + `valuesLatex: string[]`

### Donnees disponibles par blank (depuis `InstanceBlank`)

```typescript
interface InstanceBlank {
	expectedAnswer: string; // "10^5", "entier"
	expectedAnswerLatex?: string; // LaTeX pour flash back
	type: 'math' | 'text'; // Infere par le generateur (Phase 3)
	prefilled?: string;

	// Math blank validation (fusionnee blankDefaults + override)
	precision?: PrecisionType;
	requiredForm?: RequiredForm;
	validationRules?: ValidationRule[];
	unit?: { expected: boolean; required?: string };

	// Text blank
	pool?: string[]; // autocompletion uniquement
}
```

## Fichiers a modifier

1. **`src/lib/utils/answer-validator.ts`** — refactorer `validateBlanks()` pour validation per-blank, supprimer `instance.validationRules` global
2. **`src/lib/questions/units/validator.ts`** — nouvelle signature `validateQuantityAnswer()`
3. **`src/lib/questions/generator/instance-generator.ts`** — fallback `validationRules` globales sur blanks (`blank.validationRules ?? resolvedVariation.validationRules`)

## Fichier a creer

1. **`src/lib/utils/__tests__/answer-validator-blanks.test.ts`** — tests per-blank validation

## Workflow TDD (OBLIGATOIRE)

**Etape 1** : Proposer les comportements en francais et attendre validation utilisateur AVANT d'ecrire du code.

Format attendu :

```
## Fonctionnalite : Validation per-blank

### Comportements proposes :
1. [Cas nominal]
2. [Cas limite]
3. [Cas erreur]

### Questions :
- [Clarification necessaire ?]
```

## Commits recents (contexte)

- `d17560c5` — docs: add preserveHoles comments and update progress doc
- `a8e64948` — refactor: add preserveHoles option to toLatex, remove placeholder revert hack
- `c91cf03e` — fix: unskip all 5 instance-generator tests by fixing syntax issues
- `6075ae66` — fix: correct 3 failing instance-generator tests
- `9dc51f4b` — feat: implement fill-in-blanks generation pipeline (Phase 3)

## Rappels importants

- **TDD** : comportements d'abord, attendre validation, tests (doivent echouer), implementation, verification
- **770 tests unitaires existants** pour les unites — ne pas casser
- **`code-reviewer` agent** a la fin de la phase
- **`docs/wip/fill-in-blanks-v2-progress.md`** a mettre a jour
- **Commit** apres validation code review
