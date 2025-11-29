# Analyse du champ `expression` - Document de reprise

**Date**: 2025-11-29
**Objectif**: Déterminer si un champ `expression` séparé est nécessaire dans le nouveau système de questions, ou si le `statement` markdown suffit.

---

## Contexte

Le système de questions d'UbuMaths est en cours de migration depuis l'ancien système TinyMath vers un nouveau système basé sur du markdown custom avec templates paramétrés.

### Documents de référence

- `docs/ref/questions.md` - Documentation technique du nouveau système
- `docs/wip/question-migration-analysis.md` - Analyse complète de la migration
- `docs/wip/old-question-system-analysis.md` - Analyse de l'ancien système TinyMath

---

## L'ancien système TinyMath

### Structure avec `expression` séparé

```typescript
// extern/new-tinymath/apps/ubumaths/src/types/type.ts
interface QuestionBase {
	enounces: string[]; // Instruction textuelle
	expressions?: string[]; // Expression mathématique séparée
	expressions2?: string[]; // Deuxième expression optionnelle
	variabless?: Variables[]; // Variables paramétrées
	solutionss?: (string | number)[][];
	// ...
}
```

### Rôles du champ `expression`

1. **Fill-in-the-blanks** : Si contient `?`, chaque `?` devient un champ de saisie

   ```typescript
   // type.ts:224-226
   function isQuestionFillIn(q): boolean {
   	return !!q.expression?.includes('?');
   }
   ```

   Exemple: `expression: '?+&1=10'` → L'élève remplit le `?`

2. **Auto-génération de la solution** : Si pas de `solutions` explicites

   ```typescript
   // generateQuestion.ts:589-615
   else if (expression) {
     solutions = [math(expression).eval(params).string]
   }
   ```

3. **Transformations mathématiques** avant affichage :

   ```typescript
   // generateQuestion.ts:451-471
   if (options.includes('shuffle-terms')) {
   	expression = math(expression).shuffleTerms().string;
   }
   if (options.includes('remove-null-terms')) {
   	expression = math(expression).removeNullTerms().string;
   }
   ```

4. **Options de formatage LaTeX** :

   ```typescript
   // generateQuestion.ts:661-666
   expression_latex = math(expression).toLatex({
   	addSpaces: !options.includes('exp-no-spaces'),
   	keepUnecessaryZeros: options.includes('exp-allow-unecessary-zeros')
   });
   ```

5. **Affichage distinct** de l'énoncé textuel (centré, mis en valeur)

### Exemples concrets de l'ancien système

```typescript
// Fill-in-the-blanks
{
  enounces: ['Complète.'],
  expressions: ['?+&1=10', '&1+?=10'],
  solutionss: [['[_10-&1_]']],
  variabless: [{ '&1': '$e[1;9]' }],
}

// Calcul simple (auto-solution)
{
  enounces: ['Calcule.'],
  expressions: ['&1+&2'],
  variabless: [{ '&1': '$e[1;9]', '&2': '$e[1;9]' }],
  // solution auto-calculée par évaluation de l'expression
}

// Avec shuffle
{
  enounces: ['Calcule.'],
  expressions: ['&1+&2+&3'],
  variabless: [...],
  options: ['shuffle-terms']
}
```

---

## Le nouveau système

### Structure actuelle (sans champ expression)

```typescript
// src/lib/questions/types.ts
interface QuestionVariation {
	statement: TemplateMarkdown; // Markdown avec {{variables}}
	variables?: QuestionVariable[];
	answer: string | string[];
	blanks?: { position: number; expectedAnswer: string }[];
	choices?: { content: TemplateMarkdown; isCorrect: boolean }[];
	// ...
}
```

### Syntaxe de templates supportée

- `{{varName}}` - Référence variable
- `{{1..10}}` - Entier aléatoire
- `{{1..10!5}}` - Avec exclusion
- `{{eval:a+b}}` - Évaluation mathématique
- `{{eval:expr;decimal}}` - Avec modifiers (decimal, positive, bracket)

---

## Proposition analysée : Variable `expression` ad-hoc

Au lieu d'un champ séparé, utiliser une **variable conventionnelle** nommée `expression` :

```typescript
{
  statement: "Calcule : $${{expression}}$$",
  variables: [
    { name: 'a', expression: '{{1..9}}' },
    { name: 'b', expression: '{{1..9}}' },
    { name: 'expression', expression: '{{a}} + {{b}}' }
  ],
  answer: '{{eval:expression}}'
}
```

### Avantages identifiés

1. **Zéro nouveau concept** - Réutilise le système de variables existant
2. **Flexibilité de placement** - L'auteur contrôle où apparaît l'expression dans le markdown
3. **Auto-answer supporté** - `{{eval:expression}}` fonctionne déjà
4. **Pas de migration DB** - Pas de nouveau champ à ajouter
5. **Expressions multiples naturelles** - Variables `expression`, `expression2`, etc.

### Défis identifiés

1. **Transformations d'affichage** (shuffle-terms, no-spaces, etc.)
2. **Fill-in-the-blanks**
3. **Options de formatage LaTeX**

---

## Point clé : Modifiers ≠ {{eval:}}

**IMPORTANT** : Les modifiers de transformation (`shuffle-terms`, `no-spaces`) ne doivent PAS s'appliquer à `{{eval:}}`.

| Syntaxe                 | But                                 | Résultat           |
| ----------------------- | ----------------------------------- | ------------------ |
| `{{eval:a+b}}`          | **Calculer**                        | `8` (le résultat)  |
| `{{eval:expr;decimal}}` | Format du **résultat**              | `0.333...`         |
| Modifiers d'affichage   | Transformer l'**expression source** | `c+a+b` (shuffled) |

Les modifiers `shuffle-terms`, `remove-unnecessary-zeros` transforment l'expression AVANT affichage, ils ne concernent pas l'évaluation.

---

## Point clé : Fill-in-blanks MathLive natif

Le système markdown custom a été modifié pour gérer le mode fill-in-the-blanks natif de MathLive (prompts/placeholders).

Cela signifie :

- Plus besoin de détecter des `?` et de les transformer
- MathLive gère nativement les champs de saisie intégrés dans les formules
- Le renderer passe directement à MathLive

---

## Options pour les modifiers d'affichage

### Option A : Dans `displayOptions` de la variable (RECOMMANDÉE)

```typescript
variables: [
	{
		name: 'expr',
		expression: '{{a}} + {{b}} + {{c}}',
		displayOptions: {
			shuffleTerms: true,
			addSpaces: true,
			removeUnnecessaryZeros: true
		}
	}
];
```

**Avantages** :

- Pas de nouvelle syntaxe dans le markdown
- Options définies avec l'expression
- Le générateur applique les transformations lors de la résolution

### Option B : Syntaxe dans le statement

```markdown
$${{expr;shuffle-terms,no-spaces}}$$
```

**Inconvénients** :

- Nouvelle syntaxe à parser
- Confusion avec les modifiers de `{{eval:}}`

### Option C : Options au niveau de la variation

```typescript
{
  statement: "...",
  displayOptions: { shuffleTerms: true }
}
```

**Inconvénients** :

- S'applique à TOUTES les expressions

---

## Structure TypeScript proposée

```typescript
interface QuestionVariable {
	name: string;
	expression: string;

	// Options d'affichage (NOUVEAU)
	displayOptions?: {
		// Transformations de l'expression
		shuffleTerms?: boolean;
		shuffleFactors?: boolean;
		shuffleTermsAndFactors?: boolean;
		shallowShuffleTerms?: boolean;
		shallowShuffleFactors?: boolean;
		removeNullTerms?: boolean;
		removeUnnecessaryBrackets?: boolean;

		// Formatage LaTeX
		addSpaces?: boolean; // Défaut: true
		keepUnnecessaryZeros?: boolean; // Défaut: false
	};
}
```

---

## Exemple complet migré

### Ancien (tinymath)

```typescript
{
  enounces: ['Complète.'],
  expressions: ['?+&1=10'],
  solutionss: [['[_10-&1_]']],
  variabless: [{ '&1': '$e[1;9]' }],
}
```

### Nouveau (avec prompts MathLive)

```typescript
{
  statement: "Complète : $${{prompt:answer}} + {{a}} = 10$$",
  variables: [
    { name: 'a', expression: '{{1..9}}' }
  ],
  blanks: [
    { id: 'answer', expectedAnswer: '{{eval:10-a}}' }
  ]
}
```

---

## Questions ouvertes pour la prochaine session

1. **Quelle syntaxe exacte pour les prompts MathLive dans le markdown ?**
   - `\placeholder[id]{}` ?
   - `{{prompt:id}}` ?
   - `{{blank:id}}` ?

2. **Comment le renderer fait-il le lien prompt ↔ expectedAnswer ?**
   - Via l'id ?
   - Via la position ?

3. **Faut-il supporter les deux formes (? legacy et prompts) ?**

4. **Les displayOptions sont-elles la bonne approche pour les transformations ?**

---

## Travail estimé

| Tâche                                     | Effort          | Fichiers                |
| ----------------------------------------- | --------------- | ----------------------- |
| Ajouter `displayOptions` au type          | 5 lignes        | `types.ts`              |
| Implémenter transformations dans resolver | ~100 lignes     | `variable-resolver.ts`  |
| Fonctions de transformation               | ~150 lignes     | Nouveau ou existant     |
| Intégration générateur                    | ~30 lignes      | `instance-generator.ts` |
| **Total**                                 | **~285 lignes** | 3-4 fichiers            |

---

## Conclusion provisoire

La proposition d'utiliser une **variable `expression` ad-hoc** avec **`displayOptions`** est supérieure à un champ séparé :

1. Réutilise l'existant
2. Flexible (placement libre dans markdown)
3. Pas de migration DB
4. Extensible via displayOptions

Le seul développement nécessaire est l'ajout de `displayOptions` et l'implémentation des transformations dans le resolver.

---

## PROGRESSION DE L'IMPLÉMENTATION

### État actuel

- **Phase complétée**: 5/5 (TERMINÉ)
- **Dernière action**: Phase 5 - Documentation
- **Statut**: Implémentation complète, prête pour utilisation

### Fichiers créés/modifiés

#### Phase 1 (terminée) - Types et infrastructure

- `src/lib/shared/parameterization/display-options.ts` (NOUVEAU - 212 lignes)
  - Interface `DisplayOptions` avec 9 options
  - Constante `GLOBAL_DISPLAY_DEFAULTS`
  - Fonction `resolveDisplayOptions()` avec expansion de `shuffleTermsAndFactors`
- `src/lib/shared/parameterization/types.ts`
  - Ajout de `displayOptions?: DisplayOptions` à l'interface `Variable`
  - Ajout de `displayValue?: string` à l'interface `ResolvedVariable`
- `src/lib/shared/parameterization/index.ts`
  - Export du module display-options
- `src/lib/questions/types.ts`
  - Ajout de `defaultDisplayOptions?: DisplayOptions` à `QuestionTemplate`

#### Phase 2 (terminée) - Transformations d'expressions

- `src/lib/shared/parameterization/expression-transforms.ts` (NOUVEAU - 413 lignes)
  - Fonction `applyDisplayTransforms()` - transformation principale
  - Fonction `canTransform()` - vérification de validité
  - Fonction `getExpressionStructure()` - analyse de structure
  - Utilise Compute Engine pour manipulation MathJSON
  - Algorithme Fisher-Yates pour shuffles équitables

#### Phase 3 (terminée) - Tests unitaires

- `src/lib/shared/parameterization/display-options.test.ts` (NOUVEAU - 25 tests)
- `src/lib/shared/parameterization/expression-transforms.test.ts` (NOUVEAU - 32 tests)

#### Phase 4 (terminée) - Intégration dans le resolver

- `src/lib/shared/parameterization/resolver/variable-resolver.ts`
  - `resolveVariables()` accepte maintenant `templateDisplayDefaults`
  - Applique les transformations pendant la résolution
  - Ajoute `displayValue` quand transformé
- `src/lib/shared/parameterization/resolver/text-resolver.ts`
  - Interface `ResolveTextOptions` avec `useDisplayValue`
  - `resolveText()` peut utiliser `displayValue` optionnellement

### Commits effectués

1. `b8fbec72` - feat(parameterization): add DisplayOptions types and cascade resolution
2. `8d7439a5` - feat(parameterization): add expression transformation functions
3. `3f086ff2` - test(parameterization): add display-options cascade resolution tests
4. `5e6bfe27` - feat(parameterization): integrate displayOptions in variable resolver
5. `886c392a` - docs: update expression-field-analysis with completed implementation

### Tests

- **449 tests** au total dans le module parameterization
- Tous passent (100%)

### Décisions prises

1. Cascade simple sans 'inherit' explicite (spread d'objets)
2. Granularité par variable (chaque variable peut avoir ses propres displayOptions)
3. Expansion de `shuffleTermsAndFactors` AVANT la cascade
4. Compute Engine pour les transformations (TinyCas retiré)
5. `displayValue` optionnel sur `ResolvedVariable` (seulement si différent de `value`)
6. `useDisplayValue` opt-in dans `resolveText()` pour backward compatibility

### Utilisation

```typescript
import { resolveVariables, resolveText, type DisplayOptions } from '$lib/shared/parameterization';

// Variables avec displayOptions
const variables = [
	{ name: 'a', expression: '5' },
	{ name: 'b', expression: '0' },
	{
		name: 'expr',
		expression: '{{a}}+{{b}}',
		displayOptions: { removeNullTerms: true, shuffleTerms: true }
	}
];

// Template-level defaults (optionnel)
const templateDefaults: DisplayOptions = { addSpaces: true };

// Résolution
const resolved = resolveVariables(variables, seed, templateDefaults);
// resolved[2].value = '5+0'
// resolved[2].displayValue = '5' (null term removed)

// Utilisation dans le texte (pour l'affichage)
const statement = 'Calcule: $${{expr}}$$';
const display = resolveText(statement, resolved, { useDisplayValue: true });
// → 'Calcule: $$5$$'
```
