# Préparation de la Migration des Questions

> Documentation complète des travaux effectués pour préparer la migration du système de questions TinyMath vers UbuMaths v2.

**Date:** 27 novembre 2025
**Statut:** Préparation terminée, prêt pour migration complète

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Architecture du nouveau système](#2-architecture-du-nouveau-système)
3. [Système de types](#3-système-de-types)
4. [Conversion de syntaxe](#4-conversion-de-syntaxe)
5. [Système de validation](#5-système-de-validation)
6. [Migration des images](#6-migration-des-images)
7. [Le transformateur de questions](#7-le-transformateur-de-questions)
8. [Tests et couverture](#8-tests-et-couverture)
9. [Shared Fields](#9-shared-fields)
10. [Utilisation](#10-utilisation)
11. [Prochaines étapes](#11-prochaines-étapes)

---

## 1. Vue d'ensemble

### Objectif

Migrer 633 questions du système TinyMath (basé sur TinyCAS) vers le nouveau système UbuMaths v2 utilisant:

- **Markdown** pour le contenu
- **MathLive Compute Engine** pour l'évaluation mathématique
- **Supabase** pour le stockage
- **Validation typée** pour les réponses dynamiques

### Statistiques du corpus

| Métrique                   | Valeur                    |
| -------------------------- | ------------------------- |
| Questions totales          | 633                       |
| Avec variables             | 412 (65.1%)               |
| Avec options de validation | 138 (21.8%)               |
| Avec détails de correction | 326 (51.5%)               |
| Avec images                | 12 questions (214 images) |
| Avec testAnswerss          | 8 (1.3%)                  |
| Avec conditions            | 29 (4.6%)                 |
| Avec unités                | 7                         |

### Fichiers clés

```
src/lib/
├── questions/
│   ├── types.ts                      # Types du nouveau système
│   ├── validation-rule-evaluator.ts  # Évaluateur de règles
│   └── constraint-validators.ts      # Validateurs de contraintes
├── migration/
│   ├── question-transformer.ts       # Transformateur principal
│   ├── syntax-converter.ts           # Conversion TinyCAS → nouveau
│   ├── placeholder-converter.ts      # Conversion &sol, &answer, etc.
│   ├── conditional-converter.ts      # Conversion @@cond ?? text@@
│   └── old-question-types.ts         # Types de l'ancien système
├── utils/
│   └── answer-validator.ts           # Validation des réponses
└── shared/
    └── units/                         # Système d'unités complet
```

---

## 2. Architecture du nouveau système

### Types de questions supportés

```typescript
type QuestionType =
	| 'numerical_exact' // Réponse numérique exacte
	| 'numerical_decimal' // Réponse décimale avec précision
	| 'algebraic_transform' // Transformation algébrique (factoriser, développer)
	| 'multiple_choice' // QCM simple ou multiple
	| 'fill_in_blanks'; // Texte à trous
```

### Structure d'un template de question

```typescript
interface QuestionTemplate {
	id: string;
	type: QuestionType;
	title: string;
	description?: string;

	// Contenu
	variations: QuestionVariation[];
	exerciseInstruction?: string;

	// Catégorisation
	theme: string; // "Nombres", "Algèbre", etc.
	domain: string; // "Fractions", "Équations", etc.
	subdomain?: string;
	level: number; // 1-6
	grades: GradeCode[]; // ["CM1", "6", etc.]

	// Options de validation
	options?: {
		precision?: { type: 'decimal' | 'tolerance'; digits?: number; value?: number };
		canonicalForm?: 'fraction' | 'decimal' | 'scientific';
		allowEquivalent?: boolean;
		allowDifferentForms?: boolean;
	};

	status: 'draft' | 'active' | 'archived';
}
```

### Structure d'une variation

```typescript
interface QuestionVariation {
	statement: TemplateMarkdown; // Énoncé avec {{variables}}
	variables?: QuestionVariable[]; // Définitions de variables
	answer: string | string[]; // Réponse(s) attendue(s)
	correction?: TemplateMarkdown; // Explication
	validationRules?: ValidationRule[]; // Règles de validation dynamique

	// Pour QCM
	choices?: { content: TemplateMarkdown; isCorrect: boolean }[];

	// Pour texte à trous
	blanks?: { position: number; expectedAnswer: string }[];
}
```

---

## 3. Système de types

### ValidationRule - Validation dynamique

Le système `ValidationRule` remplace l'ancien `testAnswerss` avec des règles typées:

```typescript
type ValidationRule =
	| DivisorRule // La réponse doit être un diviseur
	| MultipleRule // La réponse doit être un multiple
	| RangeRule // La réponse doit être dans une plage
	| EquationRootRule // La réponse doit être racine d'une équation
	| EquivalenceRule // La réponse doit être équivalente
	| PredicateRule // La réponse doit satisfaire un prédicat
	| CustomExpressionRule; // Expression personnalisée (fallback)
```

#### Exemples de règles

```typescript
// Diviseur: "Trouve un diviseur de n autre que 1"
{ type: 'divisor', dividend: '{{n}}' }

// Plage: "Trouve un nombre entre a et b"
{ type: 'range', min: '{{a}}', max: '{{b}}', inclusive: true }

// Prédicat: "Trouve un nombre positif"
{ type: 'predicate', predicate: 'isPositive' }

// Équation: "Trouve une solution de x² - 5x + 6 = 0"
{ type: 'equation_root', equation: 'x^2 - 5*x + 6 = 0' }
```

### Prédicats disponibles

```typescript
type Predicate =
	| 'isPrime' // Nombre premier
	| 'isComposite' // Nombre composé
	| 'isEven' // Nombre pair
	| 'isOdd' // Nombre impair
	| 'isPositive' // Nombre positif
	| 'isNegative' // Nombre négatif
	| 'isInteger'; // Nombre entier
```

---

## 4. Conversion de syntaxe

### TinyCAS → Nouveau système

Le convertisseur `syntax-converter.ts` gère toutes les conversions:

| Ancien (TinyCAS)  | Nouveau (Markdown)                 |
| ----------------- | ---------------------------------- |
| `[_0;9_]`         | `{{random(0,9)}}`                  |
| `[_2;10;2_]`      | `{{random(2,10,2)}}`               |
| `[_1;10\\2;5_]`   | `{{random(1,10,{exclude:[2,5]})}}` |
| `{a;b;c}`         | `{{choice(['a','b','c'])}}`        |
| `$e[&a+&b]`       | `{{eval:{{a}}+{{b}}}}`             |
| `$e{&a*&b;&a+&b}` | `{{eval:{{choice([...])}}}}`       |
| `&variable`       | `{{variable}}`                     |
| `$n{2;&a}`        | `{{digits(2,{{a}})}}`              |

### Placeholders de correction

Le convertisseur `placeholder-converter.ts` gère:

| Ancien           | Nouveau                              |
| ---------------- | ------------------------------------ |
| `&sol`           | `{{solution}}`                       |
| `&answer`        | `{{userAnswer}}`                     |
| `&expression`    | `{{expression}}`                     |
| `&exp`           | `{{expression}}`                     |
| `&exp1`, `&exp2` | `{{expression1}}`, `{{expression2}}` |

### Conditionnels

Le convertisseur `conditional-converter.ts` gère:

```
Ancien: @@condition ?? texte si vrai@@
Nouveau: {{#if condition}}texte si vrai{{/if}}

Ancien: @@cond1 ?? texte1 @@ texte2 @@
Nouveau: {{#if cond1}}texte1{{else}}texte2{{/if}}
```

---

## 5. Système de validation

### Validateurs de contraintes

Le fichier `constraint-validators.ts` implémente 5 validateurs:

#### 1. `validateSpaces` - Espaces dans le LaTeX

```typescript
// Vérifie que les espaces sont corrects
validateSpaces('2x + 3', { mode: 'require' });
// ✓ Valide: espaces autour des opérateurs

validateSpaces('2x+3', { mode: 'forbid' });
// ✓ Valide: pas d'espaces
```

#### 2. `validateProducts` - Produits implicites/explicites

```typescript
// Vérifie la notation des produits
validateProducts('2 × x', { mode: 'require_explicit' });
// ✓ Valide: produit explicite

validateProducts('2x', { mode: 'require_implicit' });
// ✓ Valide: produit implicite
```

#### 3. `validateBrackets` - Parenthèses superflues

```typescript
// Détecte les parenthèses inutiles
validateBrackets('(2+3)', { mode: 'forbid' });
// ✗ Invalide: parenthèses superflues

validateBrackets('2+3', { mode: 'forbid' });
// ✓ Valide
```

#### 4. `validateZeros` - Zéros superflus

```typescript
// Détecte les zéros inutiles
validateZeros('x + 0', { mode: 'forbid' });
// ✗ Invalide: +0 superflu

validateZeros('x', { mode: 'forbid' });
// ✓ Valide
```

#### 5. `validateForm` - Forme canonique

```typescript
// Vérifie la forme (factorisée, développée, etc.)
validateForm('(x+2)(x+3)', { expectedForm: 'factored' });
// ✓ Valide: forme factorisée

validateForm('x^2+5x+6', { expectedForm: 'expanded' });
// ✓ Valide: forme développée
```

### Évaluateur de règles

Le fichier `validation-rule-evaluator.ts` évalue les `ValidationRule`:

```typescript
import { evaluateRule, type EvaluationContext } from '$lib/questions/validation-rule-evaluator';

const ctx: EvaluationContext = {
	variables: { n: 12, a: 3 },
	answer: '4',
	numericAnswer: 4
};

// Vérifie si 4 est un diviseur de 12
const result = evaluateRule({ type: 'divisor', dividend: '{{n}}' }, ctx);
// { valid: true }

// Vérifie si 5 est un diviseur de 12
const result2 = evaluateRule({ type: 'divisor', dividend: '{{n}}' }, { ...ctx, numericAnswer: 5 });
// { valid: false, reason: '5 n\'est pas un diviseur de 12' }
```

### Intégration dans answer-validator

Le fichier `answer-validator.ts` intègre les règles de validation:

```typescript
// Flux de validation dans validateAnswer():

1. Si validationRules présent:
   → Évalue chaque règle avec evaluateRule()
   → Retourne erreur si une règle échoue
   → Retourne succès si toutes passent

2. Sinon, validation standard:
   → Comparaison avec la réponse attendue
   → Vérification d'équivalence mathématique
   → Application des contraintes (espaces, produits, etc.)
```

---

## 6. Migration des images

### Résumé

| Métrique         | Valeur           |
| ---------------- | ---------------- |
| Images migrées   | 214/214 (100%)   |
| Format source    | PNG              |
| Format cible     | WebP             |
| Réduction taille | 34.6%            |
| Taille totale    | 10.2 MB → 6.7 MB |

### Mapping des URLs

Le fichier `scripts/image-url-mapping.json` contient 856 entrées (4 formats par image):

```json
{
	"entiers/reperage/droite_graduee-10_en_10-0-600.png": "https://xxx.supabase.co/storage/v1/object/public/question-images/entiers/reperage/droite_graduee-10_en_10-0-600.webp",

	"/images/entiers/reperage/droite_graduee-10_en_10-0-600.png": "https://xxx.supabase.co/storage/v1/object/public/question-images/entiers/reperage/droite_graduee-10_en_10-0-600.webp"

	// ... 4 formats par image pour compatibilité
}
```

### Intégration dans le transformateur

```typescript
import imageMapping from 'scripts/image-url-mapping.json';

const result = transformQuestion(oldQuestion, 0, {
	imageUrlMapping: imageMapping as ImageUrlMapping
});

// Les images dans l'énoncé sont converties:
// Ancien: <img src="/images/droite.png">
// Nouveau: ![Question image 1](https://xxx.supabase.co/.../droite.webp)
```

---

## 7. Le transformateur de questions

### Fonctionnalités

Le fichier `question-transformer.ts` effectue:

1. **Détection du type de question**
   - QCM, numérique, texte à trous, transformation algébrique

2. **Conversion des variables**
   - `&variable` → `{{variable}}`
   - Syntaxe TinyCAS → nouveau format

3. **Conversion de l'énoncé**
   - Texte + expression + images → Markdown

4. **Conversion des réponses**
   - Indices pour QCM
   - Expressions pour numérique
   - Solutions multiples

5. **Conversion des choix (QCM)**
   - Texte ou images
   - Marquage correct/incorrect

6. **Conversion des corrections**
   - Feedback correct/incorrect
   - Étapes détaillées

7. **Conversion des options**
   - `require-reduced-fractions` → `canonicalForm: 'fraction'`
   - `no-penalty-for-extraneous-brackets` → `allowDifferentForms: true`

8. **Conversion des testAnswerss**
   - `&answer>0` → `PredicateRule { predicate: 'isPositive' }`
   - `mod(&1;&answer)=0` → `DivisorRule { dividend: '{{var1}}' }`

9. **Intégration des images**
   - Lookup dans le mapping
   - Injection du Markdown image

### Utilisation

```typescript
import { transformQuestion, transformQuestionBatch } from '$lib/migration/question-transformer';
import imageMapping from 'scripts/image-url-mapping.json';

// Question unique
const result = transformQuestion(oldQuestion, index, {
	imageUrlMapping: imageMapping as ImageUrlMapping
});

if (result.success) {
	console.log('Template:', result.template);
	console.log('Warnings:', result.warnings);
	console.log('Stats:', result.stats);
}

// Batch
const { results, summary } = transformQuestionBatch(oldQuestions, {
	imageUrlMapping: imageMapping as ImageUrlMapping,
	onProgress: (current, total) => console.log(`${current}/${total}`)
});

console.log(`Succès: ${summary.successful}/${summary.total}`);
console.log(`Images converties: ${summary.imagesConverted}`);
console.log(`Images manquantes: ${summary.imagesMissing}`);
```

### Statistiques retournées

```typescript
interface TransformStats {
	variations: number; // Nombre de variations créées
	variables: number; // Nombre de variables converties
	syntaxConversions: number; // Nombre de conversions syntaxiques
	optionsMapped: number; // Nombre d'options mappées
	correctionConversions: number; // Conversions dans les corrections
	detectedType: string; // Type détecté
	hasImages: boolean; // Contient des images
	hasCustomValidation: boolean; // Contient testAnswerss
	imagesConverted: number; // Images converties avec succès
	imagesMissing: number; // Images non trouvées dans le mapping
}
```

---

## 8. Tests et couverture

### Résumé des tests

| Composant                           | Tests | Statut     |
| ----------------------------------- | ----- | ---------- |
| `validation-rule-evaluator.test.ts` | 71    | ✅ Passent |
| `constraint-validators.test.ts`     | 101   | ✅ Passent |
| `syntax-converter.test.ts`          | 35    | ✅ Passent |
| `answer-validator.test.ts`          | 32+   | ✅ Passent |
| `correction-integration.test.ts`    | 15+   | ✅ Passent |
| Build TypeScript                    | -     | ✅ Passe   |

### Exécution des tests

```bash
# Tests de validation des règles
pnpm test:unit -- validation-rule-evaluator

# Tests des contraintes
pnpm test:unit -- constraint-validators

# Tests du convertisseur de syntaxe
pnpm test:unit -- syntax-converter

# Tous les tests de migration
pnpm test:unit -- src/lib/migration

# Vérification TypeScript
pnpm check
```

---

## 9. Shared Fields

### Objectif

Éviter la duplication de champs identiques entre variations. Quand plusieurs variations partagent un même énoncé, les mêmes variables, ou la même correction, ces champs sont factorisés dans un objet `shared`.

### Statistiques

| Métrique                | Valeur      |
| ----------------------- | ----------- |
| Questions avec `shared` | 325 (51.3%) |
| Questions sans `shared` | 308 (48.7%) |

### Types

```typescript
interface SharedVariationDefaults {
	statement?: TemplateMarkdown;
	variables?: QuestionVariable[];
	answer?: string | string[];
	correction?: QuestionCorrection;
	choices?: { content: TemplateMarkdown; isCorrect: boolean }[];
	validationRules?: ValidationRule[];
}

interface QuestionTemplate {
	// ... autres champs
	variations: QuestionVariation[];
	shared?: SharedVariationDefaults; // Nouveau champ
}
```

### Logique de détection

Le transformateur détecte automatiquement le partage:

| Condition                                          | Champ partagé            |
| -------------------------------------------------- | ------------------------ |
| `enounces.length === 1 && variations > 1`          | `shared.statement`       |
| `variabless.length === 1 && variations > 1`        | `shared.variables`       |
| `solutionss.length === 1 && variations > 1`        | `shared.answer`          |
| `correctionDetailss.length <= 1 && variations > 1` | `shared.correction`      |
| `choicess.length === 1 && variations > 1`          | `shared.choices`         |
| `testAnswerss.length === 1 && variations > 1`      | `shared.validationRules` |

### Résolution au runtime

Le générateur d'instances fusionne `shared` avec chaque variation:

```typescript
function resolveVariationWithShared(
	shared: SharedVariationDefaults | undefined,
	variation: QuestionVariation
): QuestionVariation {
	if (!shared) return variation;
	return {
		statement: variation.statement || shared.statement || '',
		answer: variation.answer ?? shared.answer ?? '',
		correction: variation.correction ?? shared.correction,
		choices: variation.choices ?? shared.choices,
		validationRules: variation.validationRules ?? shared.validationRules,
		variables: mergeVariables(shared.variables, variation.variables),
		blanks: variation.blanks
	};
}
```

### Exemple de sortie

```json
{
	"type": "numerical_exact",
	"title": "Connaître la position décimale",
	"shared": {
		"variables": [
			{ "name": "1", "expression": "{{1-9}}" },
			{ "name": "2", "expression": "{{0-9!{{1}}}}" }
		]
	},
	"variations": [
		{ "statement": "Quel chiffre est à la position des unités ?", "answer": "{{1}}" },
		{ "statement": "Quel chiffre est à la position des dizaines ?", "answer": "{{2}}" }
	]
}
```

### Tests

- 12 tests transformer (détection du partage)
- 12 tests generator (fusion et héritage)
- Documentation: `docs/wip/shared-fields-phase*.md`

---

## 10. Utilisation

### Migration complète (à venir)

```typescript
import { transformQuestionBatch } from '$lib/migration/question-transformer';
import imageMapping from 'scripts/image-url-mapping.json';
import { oldQuestions } from './data/old-questions'; // À charger depuis la DB

// 1. Transformer toutes les questions
const { results, summary } = transformQuestionBatch(oldQuestions, {
	imageUrlMapping: imageMapping as ImageUrlMapping,
	onProgress: (current, total) => {
		console.log(`Transformation: ${current}/${total}`);
	}
});

// 2. Afficher le résumé
console.log(`
Migration Summary:
- Total: ${summary.total}
- Succès: ${summary.successful}
- Échecs: ${summary.failed}
- Avec warnings: ${summary.warnings}
- Images converties: ${summary.imagesConverted}
- Images manquantes: ${summary.imagesMissing}
`);

// 3. Traiter les résultats
const templates = results.filter((r) => r.success).map((r) => r.template);

// 4. Insérer dans Supabase
// await supabase.from('question_templates').insert(templates);
```

### Validation d'une réponse

```typescript
import { validateAnswer } from '$lib/utils/answer-validator';

// Instance de question générée
const instance: QuestionInstance = {
	templateId: 'abc123',
	type: 'numerical_exact',
	statement: 'Trouve un diviseur de 12 autre que 1',
	expectedAnswer: '', // Pas utilisé avec validationRules
	validationRules: [{ type: 'divisor', dividend: '12' }],
	resolvedVariables: [{ name: 'n', value: '12' }]
};

// Validation
const result = validateAnswer('4', instance);
// { isCorrect: true }

const result2 = validateAnswer('5', instance);
// { isCorrect: false, feedback: "5 n'est pas un diviseur de 12" }
```

---

## 11. Prochaines étapes

### Immédiat

1. **Exécuter la migration complète**
   - Charger les 633 questions depuis l'ancienne DB
   - Appliquer `transformQuestionBatch`
   - Collecter les résultats et warnings

2. **Importer dans Supabase**
   - Créer la table `question_templates`
   - Insérer les templates transformés
   - Vérifier l'intégrité

3. **Révision manuelle**
   - Questions avec warnings
   - Questions avec `CustomExpressionRule`
   - Questions complexes

### Court terme

4. **Intégration UI**
   - Affichage des nouvelles images WebP
   - Rendu du Markdown avec variables
   - Formulaires de réponse

5. **Tests end-to-end**
   - Génération d'instances
   - Validation de réponses
   - Affichage des corrections

### Moyen terme

6. **Éditeur de questions**
   - Interface pour créer/modifier
   - Prévisualisation en temps réel
   - Validation des templates

7. **Analytics**
   - Tracking des réponses
   - Statistiques par question
   - Identification des difficultés

---

## Annexes

### A. Mapping des grades

| Ancien  | Nouveau  |
| ------- | -------- |
| `CP`    | `CP`     |
| `CE1`   | `CE1`    |
| `CE2`   | `CE2`    |
| `CM1`   | `CM1`    |
| `CM2`   | `CM2`    |
| `6`     | `6`      |
| `5`     | `5`      |
| `4`     | `4`      |
| `3`     | `3`      |
| `2`     | `2`      |
| `SPE_1` | `1_SPE`  |
| `SPE_T` | `T_SPE`  |
| `STMG`  | `T_STMG` |

### B. Mapping des options

| Ancienne option                        | Nouvelle structure                                      |
| -------------------------------------- | ------------------------------------------------------- |
| `require-reduced-fractions`            | `canonicalForm: 'fraction', allowDifferentForms: false` |
| `no-penalty-for-non-reduced-fractions` | `allowDifferentForms: true`                             |
| `no-penalty-for-extraneous-brackets`   | `allowDifferentForms: true`                             |
| `require-no-extraneous-zeros`          | `allowEquivalent: false`                                |
| `solutions-order-not-important`        | `allowDifferentForms: true`                             |
| `require-implicit-products`            | `validator: 'checkAlgebraic', validatorParams: {...}`   |

### C. Fichiers de documentation liés

- `/docs/wip/question-migration-analysis.md` - Analyse détaillée (2000+ lignes)
- `/docs/wip/old-question-system-summary.md` - Résumé de l'ancien système
- `/docs/wip/old-question-system-analysis.md` - Référence complète ancien système

---

_Document généré le 27 novembre 2025, mis à jour le 28 novembre 2025 (shared fields)_
