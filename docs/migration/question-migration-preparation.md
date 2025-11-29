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
	correction?: QuestionCorrection; // Explication
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

### Syntaxe des templates

Le projet utilise la syntaxe **Markdown** (double braces) pour tous les templates:

| Préfixe                | Usage                        | Exemple                            |
| ---------------------- | ---------------------------- | ---------------------------------- |
| `{{name}}`             | Référence variable           | `{{a}}`, `{{max}}`                 |
| `{{1..10}}`            | Entier aléatoire (raccourci) | `{{0..99}}`                        |
| `{{random:...}}`       | Entier aléatoire (explicite) | `{{random:1..10}}`                 |
| `{{eval:...}}`         | Évaluation mathématique      | `{{eval:{{a}}+{{b}}}}`             |
| `{{a\|b\|c}}`          | Sélection dans liste         | `{{rouge\|bleu\|vert}}`            |
| `{{color:...}}`        | Référence couleur            | `{{color:primary.0}}`              |
| `{{if:...\|...\|...}}` | Conditionnel                 | `{{if:{{a}}>0\|positif\|négatif}}` |

Le convertisseur `syntax-converter.ts` transforme TinyCAS vers cette syntaxe.

### TinyCAS → Nouveau système

Le convertisseur `syntax-converter.ts` gère toutes les conversions:

#### Entiers aléatoires

| Ancien (TinyCAS) | Nouveau     | Description             |
| ---------------- | ----------- | ----------------------- |
| `$e[1;10]`       | `{{1..10}}` | Entier aléatoire 1 à 10 |
| `$e[0;99]`       | `{{0..99}}` | Entier aléatoire 0 à 99 |
| `$e[-5;5]`       | `{{-5..5}}` | Avec bornes négatives   |

#### Exclusions

| Ancien (TinyCAS)  | Nouveau                | Description                 |
| ----------------- | ---------------------- | --------------------------- |
| `$e[1;10]\{5}`    | `{{1..10!5}}`          | Exclure valeur unique       |
| `$e[1;10]\{5;7}`  | `{{1..10!5,7}}`        | Exclure plusieurs valeurs   |
| `$e[0;9]\{&1}`    | `{{0..9!{{1}}}}`       | Exclure valeur de variable  |
| `$e[0;9]\{&1;&2}` | `{{0..9!{{1}},{{2}}}}` | Exclure plusieurs variables |

#### Entiers relatifs (±)

| Ancien (TinyCAS) | Nouveau      | Description        |
| ---------------- | ------------ | ------------------ |
| `$er[2;9]`       | `{{2..9;±}}` | ±2 à ±9 (exclut 0) |
| `$er{1}`         | `{{1..1;±}}` | ±1 uniquement      |

#### Décimaux

| Ancien (TinyCAS) | Nouveau   | Description               |
| ---------------- | --------- | ------------------------- |
| `$d{1;1}`        | `{{1.1}}` | 1 chiffre avant, 1 après  |
| `$d{2;3}`        | `{{2.3}}` | 2 chiffres avant, 3 après |

#### Nombres à N chiffres

| Ancien (TinyCAS) | Nouveau                   | Description               |
| ---------------- | ------------------------- | ------------------------- |
| `$e{2;2}`        | `{{10..99}}`              | Nombre à 2 chiffres       |
| `$e{3;3}`        | `{{100..999}}`            | Nombre à 3 chiffres       |
| `$e{2;4}`        | `{{digits:2..4}}`         | 2 à 4 chiffres (variable) |
| `$e{&1;&1}`      | `{{digits:{{1}}..{{1}}}}` | Chiffres selon variable   |

#### Sélection dans liste (listes discrètes)

| Ancien (TinyCAS)      | Nouveau                 | Description         |
| --------------------- | ----------------------- | ------------------- |
| `$l{1;2;5;10}`        | `{{1\|2\|5\|10}}`       | Choix parmi valeurs |
| `$l{rouge;bleu;vert}` | `{{rouge\|bleu\|vert}}` | Choix parmi textes  |

**Résolution des noms nus** : Dans une liste discrète, chaque élément est traité comme un "nom nu" :

- Si le nom correspond à une variable définie, sa valeur est utilisée
- Sinon, le nom est utilisé comme valeur littérale

```
Variables: a = 5, b = 10
{{a|b|15}}    → Sélectionne parmi {5, 10, 15}
{{x|y|z}}     → Sélectionne parmi {"x", "y", "z"}
```

**Exclusions** : `{{a|b|c|d!a}}` exclut la valeur de 'a' du résultat.

#### Variables

| Ancien (TinyCAS) | Nouveau       | Description        |
| ---------------- | ------------- | ------------------ |
| `&1`             | `{{1}}`       | Variable numérotée |
| `&varname`       | `{{varname}}` | Variable nommée    |

#### Évaluations

| Ancien (TinyCAS) | Nouveau                   | Description                   |
| ---------------- | ------------------------- | ----------------------------- |
| `[_&1+&2_]`      | `{{eval:{{1}}+{{2}}}}`    | Évaluation arithmétique       |
| `[_&1*10+&2_]`   | `{{eval:{{1}}*10+{{2}}}}` | Expression complexe           |
| `[._expr_.]`     | `{{eval:expr}}`           | Évaluation décimale (warning) |
| `[+_expr_]`      | `{{eval:+expr}}`          | Avec signe + (warning)        |

#### Fonctions min/max

| Ancien (TinyCAS) | Nouveau            | Description |
| ---------------- | ------------------ | ----------- |
| `mini(&1;&2)`    | `min({{1}},{{2}})` | Minimum     |
| `maxi(&1;&2)`    | `max({{1}},{{2}})` | Maximum     |

#### Opérateur ternaire

| Ancien (TinyCAS)        | Nouveau                       | Description              |
| ----------------------- | ----------------------------- | ------------------------ |
| `&5<&6 ?? 0 :: 1`       | `{{if:{{5}}<{{6}}\|0\|1}}`    | Si condition alors sinon |
| `mod(&1;2)=0 ?? a :: b` | `{{if:mod({{1}},2)=0\|a\|b}}` | Parité                   |

#### Couleurs (Svelte stores)

| Ancien (TinyCAS) | Nouveau               | Description               |
| ---------------- | --------------------- | ------------------------- |
| `${get(color1)}` | `{{color:primary.0}}` | Référence couleur palette |
| `${get(color2)}` | `{{color:primary.1}}` | Deuxième couleur          |

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

Le fichier `constraint-validators.ts` implémente 10 validateurs pour vérifier la **forme** des réponses (pas l'équivalence mathématique). Chaque validateur retourne un tableau d'indices où des violations ont été trouvées.

**Catégories de validateurs:**

- **Validateurs textuels** (5): `checkSpaces`, `checkProducts`, `checkBrackets`, `checkZeros`, `checkForm`
- **Validateurs Compute Engine** (5): `checkNullTerms`, `checkFactorOne`, `checkFactorZero`, `checkSigns`, `checkReducedFractions`

#### 1. `checkSpaces` - Espacement des chiffres (format français)

```typescript
// Vérifie l'espacement des grands nombres (format français: 1 234 567)
checkSpaces(['1234']); // [] - 4 chiffres OK sans espace
checkSpaces(['12345']); // [0] - 5+ chiffres nécessite espacement
checkSpaces(['1 234']); // [] - espacement correct
checkSpaces(['1\\,234']); // [] - espace fine LaTeX valide
checkSpaces(['0,12345']); // [0] - partie décimale 5+ chiffres nécessite espacement
```

#### 2. `checkProducts` - Produits explicites/implicites

```typescript
// Détecte les symboles de multiplication qui devraient être implicites
checkProducts(['2\\times x']); // [0] - devrait être 2x
checkProducts(['2x']); // [] - implicite correct
checkProducts(['2\\times 3']); // [] - nombre × nombre OK
checkProducts(['2\\cdot x']); // [0] - devrait être implicite
checkProducts(['a\\times b']); // [0] - variable × variable devrait être implicite
```

#### 3. `checkBrackets` - Parenthèses inutiles

```typescript
// Détecte les parenthèses superflues dans l'input brut de l'élève
checkBrackets(['(5)']); // [0] - nombre seul
checkBrackets(['(x)']); // [0] - variable seule
checkBrackets(['((x+1))']); // [0] - doubles parenthèses
checkBrackets(['(x+1)']); // [] - nécessaires
checkBrackets(['(-5)+3'], { allowFirstNegative: true }); // [] - autorisé en début
checkBrackets(['(-5)+3'], { allowFirstNegative: false }); // [0] - violation
```

#### 4. `checkZeros` - Zéros superflus

```typescript
// Détecte les zéros inutiles (leading/trailing)
checkZeros(['01']); // [0] - zéro en tête
checkZeros(['007']); // [0] - zéros en tête
checkZeros(['0']); // [] - valide
checkZeros(['0.5']); // [] - valide
checkZeros(['1.0']); // [0] - zéro final
checkZeros(['1.20']); // [0] - zéro final
checkZeros(['1.02']); // [] - zéro significatif au milieu
```

#### 5. `checkForm` - Correspondance exacte de forme

```typescript
// Compare la forme exacte après normalisation des espaces
checkForm(['x+1'], ['1+x'], { strictForm: true }); // [0] - ordre différent
checkForm(['x+1'], ['x+1'], { strictForm: true }); // [] - correspondance exacte
checkForm(['x + 1'], ['x+1'], { strictForm: true }); // [] - espaces normalisés
checkForm(['x+1'], ['1+x']); // [] - strictForm=false par défaut
```

#### 6. `checkNullTerms` - Termes nuls (Compute Engine)

```typescript
// Détecte les additions/soustractions avec zéro (x+0, x-0, 0+y, 0-y)
checkNullTerms(['x+0']); // [0] - terme nul détecté
checkNullTerms(['0+x']); // [0] - terme nul au début
checkNullTerms(['a+0+b']); // [0] - terme nul au milieu
checkNullTerms(['x-0']); // [0] - soustraction de zéro (TinyMath improvement)
checkNullTerms(['0-x']); // [0] - zéro au début d'une soustraction
checkNullTerms(['x+1']); // [] - pas de terme nul
checkNullTerms(['0']); // [] - zéro seul n'est pas un terme nul
checkNullTerms(['(x+0)+y']); // [0] - détection récursive
```

#### 7. `checkFactorOne` - Facteurs 1 (Compute Engine)

```typescript
// Détecte les multiplications par 1 (1×x, x×1, 1x)
checkFactorOne(['1\\times x']); // [0] - facteur 1 détecté
checkFactorOne(['x\\times 1']); // [0] - facteur 1 à la fin
checkFactorOne(['1\\cdot x']); // [0] - avec \cdot aussi
checkFactorOne(['1x']); // [0] - multiplication implicite (TinyMath improvement)
checkFactorOne(['1a']); // [0] - multiplication implicite avec lettre
checkFactorOne(['10x']); // [] - coefficient 10, pas 1
checkFactorOne(['2x']); // [] - coefficient différent de 1
checkFactorOne(['1']); // [] - 1 seul n'est pas un facteur
```

#### 8. `checkFactorZero` - Facteurs 0 (Compute Engine)

```typescript
// Détecte les multiplications par 0 (0×x, x×0)
checkFactorZero(['0\\times x']); // [0] - facteur 0 détecté
checkFactorZero(['x\\times 0']); // [0] - facteur 0 à la fin
checkFactorZero(['0\\cdot x']); // [0] - avec \cdot aussi
checkFactorZero(['2x']); // [] - pas de facteur 0
checkFactorZero(['0']); // [] - 0 seul n'est pas un facteur
```

#### 9. `checkSigns` - Signes superflus (regex + CE)

```typescript
// Détecte les signes redondants ou mal placés (regex)
checkSigns(['++x']); // [0] - double +
checkSigns(['--x']); // [0] - double -
checkSigns(['+-x']); // [0] - +- consécutifs
checkSigns(['-+x']); // [0] - -+ consécutifs
checkSigns(['+x']); // [0] - + superflu devant variable
checkSigns(['-x']); // [] - négatif valide
checkSigns(['x+3']); // [] - addition normale

// Détecte la parité des signes dans les multiplications (CE - TinyMath improvement)
checkSigns(['(-2)\\times(-3)']); // [0] - deux négatifs peuvent être simplifiés
checkSigns(['(-a)\\times(-b)']); // [0] - parité avec variables
checkSigns(['5\\times(-2)\\times(-3)']); // [0] - deux négatifs dans une chaîne
checkSigns(['(-x)(-y)']); // [0] - multiplication implicite avec parité
checkSigns(['(-2)\\times 3']); // [] - un seul négatif est valide
```

#### 10. `checkReducedFractions` - Fractions non réduites (Compute Engine)

```typescript
// Détecte les fractions qui ne sont pas sous forme irréductible
// Utilise la forme canonique CE pour comparer raw vs canonical
checkReducedFractions(['\\frac{2}{4}']); // [0] - peut être simplifié en 1/2
checkReducedFractions(['\\frac{6}{9}']); // [0] - peut être simplifié en 2/3
checkReducedFractions(['\\frac{10}{5}']); // [0] - peut être simplifié en 2
checkReducedFractions(['\\frac{-4}{6}']); // [0] - peut être simplifié en -2/3
checkReducedFractions(['\\frac{2x}{4}']); // [0] - coefficient non réduit → x/2

checkReducedFractions(['\\frac{1}{2}']); // [] - déjà réduite
checkReducedFractions(['\\frac{3}{7}']); // [] - déjà réduite
checkReducedFractions(['\\frac{x}{2}']); // [] - irréductible
checkReducedFractions(['2']); // [] - pas une fraction
checkReducedFractions(['x + \\frac{2}{4}']); // [0] - fraction non réduite dans l'expression
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
| `constraint-validators.test.ts`     | 136   | ✅ Passent |
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
			{ "name": "1", "expression": "{{1..9}}" },
			{ "name": "2", "expression": "{{0..9!{{1}}}}" }
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

### B. Analyse complète des options TinyMath

Cette section documente toutes les 29 options uniques trouvées dans le corpus de 633 questions, leur fonction dans TinyMath, et leur statut de migration.

#### B.1. Options implémentées - Contraintes de validation

Ces options sont entièrement mappées vers l'objet `constraints` avec les modes `'strict'`, `'warn'`, ou `'off'`:

| Option TinyMath                          | Occurrences | Nouvelle structure                                   | Validateur               |
| ---------------------------------------- | ----------- | ---------------------------------------------------- | ------------------------ |
| `require-no-extraneous-brackets`         | 7           | `constraints.brackets: 'strict'`                     | `checkBrackets`          |
| `no-penalty-for-extraneous-brackets`     | 22          | `constraints.brackets: 'off'`                        | `checkBrackets`          |
| `require-no-extraneous-zeros`            | 6           | `constraints.zeros: 'strict'`                        | `checkZeros`             |
| `no-penalty-for-extraneous-zeros`        | 4           | `constraints.zeros: 'off'`                           | `checkZeros`             |
| `require-specific-products`              | 1           | `constraints.products: 'strict'`                     | `checkProducts`          |
| `no-penalty-for-non-specific-products`   | 6           | `constraints.products: 'off'`                        | `checkProducts`          |
| `require-correct-spaces`                 | 5           | `constraints.spaces: 'strict'`                       | `checkSpaces`            |
| `no-penalty-for-spaces`                  | 4           | `constraints.spaces: 'off'`                          | `checkSpaces`            |
| `require-no-null-terms`                  | 1           | `constraints.nullTerms: 'strict'`                    | `checkNullTerms`         |
| `no-penalty-for-null-terms`              | 4           | `constraints.nullTerms: 'off'`                       | `checkNullTerms`         |
| `require-no-factor-one`                  | 3           | `constraints.factorOne: 'strict'`                    | `checkFactorOne`         |
| `no-penalty-for-factor-one`              | 2           | `constraints.factorOne: 'off'`                       | `checkFactorOne`         |
| `require-no-factor-zero`                 | 1           | `constraints.factorZero: 'strict'`                   | `checkFactorZero`        |
| `no-penalty-for-factor-zero`             | -           | `constraints.factorZero: 'off'`                      | `checkFactorZero`        |
| `require-no-useless-signs`               | 1           | `constraints.signs: 'strict'`                        | `checkSigns`             |
| `no-penalty-for-useless-signs`           | -           | `constraints.signs: 'off'`                           | `checkSigns`             |
| `require-reduced-fractions`              | 7           | `constraints.reducedFractions: 'strict'`             | `checkReducedFractions`  |
| `no-penalty-for-non-reduced-fractions`   | 3           | `constraints.reducedFractions: 'off'`                | `checkReducedFractions`  |
| `allow-brackets-for-first-negative-term` | 9           | `constraints.allowBracketsInFirstNegativeTerm: true` | `checkBrackets` (option) |

#### B.2. Options implémentées - Autres fonctionnalités

| Option TinyMath                     | Occurrences | Nouvelle structure                    | Description                    |
| ----------------------------------- | ----------- | ------------------------------------- | ------------------------------ |
| `no-shuffle-choices`                | 32          | `shuffleChoices: false`               | Désactive le mélange des choix |
| `require-specific-unit`             | -           | `unitOptions.requireExactUnit`        | Exige l'unité exacte           |
| `no-penalty-for-not-respected-unit` | 6           | `unitOptions.requireExactUnit: false` | N'exige pas l'unité exacte     |

#### B.3. Options NON implémentées - Génèrent un warning TODO

Ces options sont reconnues mais génèrent un avertissement car leur fonctionnalité n'est pas encore implémentée:

**Validation de l'ordre des réponses** (5 occurrences):
| Option TinyMath | Description TinyMath | Statut |
| --- | --- | --- |
| `solutions-order-not-important` | Pour questions à réponses multiples: accepte les réponses dans n'importe quel ordre | ⚠️ TODO |

**Validation des permutations** (26 occurrences):
| Option TinyMath | Description TinyMath | Statut |
| --- | --- | --- |
| `disallow-terms-permutation` | Refuse `b+a` si réponse attendue est `a+b` | ⚠️ TODO |
| `disallow-factors-permutation` | Refuse `ba` si réponse attendue est `ab` | ⚠️ TODO |
| `disallow-terms-and-factors-permutation` | Combine les deux précédentes | ⚠️ TODO |
| `penalty-for-terms-permutation` | Pénalité (non bloquant) pour ordre des termes | ⚠️ TODO |
| `penalty-for-factors-permutation` | Pénalité (non bloquant) pour ordre des facteurs | ⚠️ TODO |
| `penalty-for-terms-and-factors-permutation` | Combine les deux précédentes | ⚠️ TODO |

**Validation de forme stricte**:
| Option TinyMath | Description TinyMath | Statut |
| --- | --- | --- |
| `one-single-form-solution` | Exige correspondance exacte (pas d'équivalence) | ⚠️ TODO |

**Génération - Mélange d'expressions** (9 occurrences):
| Option TinyMath | Description TinyMath | Statut |
| --- | --- | --- |
| `shuffle-terms` | Mélange l'ordre des termes dans l'expression affichée | ⚠️ TODO |
| `shuffle-factors` | Mélange l'ordre des facteurs | ⚠️ TODO |
| `shuffle-terms-and-factors` | Combine les deux | ⚠️ TODO |
| `shallow-shuffle-terms` | Mélange superficiel (1 niveau) des termes | ⚠️ TODO |
| `shallow-shuffle-factors` | Mélange superficiel des facteurs | ⚠️ TODO |

**Génération - Autres**:
| Option TinyMath | Description TinyMath | Statut |
| --- | --- | --- |
| `exhaust` | Génère toutes les variations possibles sans répétition | ⚠️ TODO |
| `remove-null-terms` | Supprime les termes +0 de l'expression générée | ⚠️ TODO |

#### B.4. Options ignorées silencieusement

**Options d'affichage** (cosmétiques, n'affectent pas la validation):
| Option TinyMath | Description | Raison d'ignorer |
| --- | --- | --- |
| `enounce-no-spaces` | Supprime espaces dans l'énoncé | Cosmétique uniquement |
| `exp-no-spaces` | Supprime espaces dans l'expression | Cosmétique uniquement |
| `exp-allow-unecessary-zeros` | Autorise zéros inutiles à l'affichage | Cosmétique uniquement |
| `exp-remove-unecessary-brackets` | Supprime parenthèses inutiles à l'affichage | Cosmétique uniquement |

**Options legacy** (non nécessaires dans le nouveau système):
| Option TinyMath | Description | Raison d'ignorer |
| --- | --- | --- |
| `allow-same-expression` | Autorise expressions identiques entre variations | Géré différemment |
| `allow-same-enounce` | Autorise énoncés identiques entre variations | Géré différemment |
| `multiples` | Mode de génération multiple | Non nécessaire |

#### B.5. Résumé de la couverture

| Catégorie                 | Options | Occurrences | Statut                    |
| ------------------------- | ------- | ----------- | ------------------------- |
| Contraintes de validation | 19      | 86          | ✅ Implémenté             |
| Autres fonctionnalités    | 3       | 38          | ✅ Implémenté             |
| Validation (TODO)         | 8       | 31          | ⚠️ Warning généré         |
| Génération (TODO)         | 7       | 17          | ⚠️ Warning généré         |
| Affichage (ignoré)        | 4       | ~5          | ➖ Ignoré silencieusement |
| Legacy (ignoré)           | 3       | ~5          | ➖ Ignoré silencieusement |

**Note**: Les options marquées "TODO" génèrent un warning lors de la transformation mais n'empêchent pas la migration. Ces fonctionnalités devront être implémentées ultérieurement si nécessaire.

### C. Fichiers de documentation liés

- `/docs/wip/question-migration-analysis.md` - Analyse détaillée (2000+ lignes)
- `/docs/wip/old-question-system-summary.md` - Résumé de l'ancien système
- `/docs/wip/old-question-system-analysis.md` - Référence complète ancien système

### D. Référence rapide de la syntaxe Markdown

| Concept              | Syntaxe                   | Exemple                      |
| -------------------- | ------------------------- | ---------------------------- |
| Variable             | `{{name}}`                | `{{a}}`, `{{max}}`           |
| Entier aléatoire     | `{{min..max}}`            | `{{1..10}}`, `{{0..99}}`     |
| Entier négatif       | `{{min..max}}`            | `{{-5..5}}`, `{{-10..-1}}`   |
| Bornes variables     | `{{{{min}}..{{max}}}}`    | Min à max                    |
| Exclusion valeur     | `{{min..max!val}}`        | `{{1..10!5}}`                |
| Exclusion plage      | `{{min..max!a..b}}`       | `{{1..20!5..7}}`             |
| Exclusion variable   | `{{min..max!{{var}}}}`    | `{{1..10!{{a}}}}`            |
| Décimal par chiffres | `{{n.m}}`                 | `{{2.3}}` (2 avant, 3 après) |
| Décimal avec pas     | `{{min..max:step}}`       | `{{0.5..9.99:0.01}}`         |
| Entier relatif       | `{{min..max;±}}`          | `{{2..9;±}}` (exclut 0)      |
| Évaluation           | `{{eval:expr}}`           | `{{eval:{{a}}+{{b}}}}`       |
| Liste discrète       | `{{a\|b\|c}}`             | `{{rouge\|bleu\|vert}}`      |
| Liste avec exclusion | `{{a\|b\|c!x}}`           | `{{1\|2\|3\|4!2}}`           |
| Couleur              | `{{color:name}}`          | `{{color:primary.0}}`        |
| Conditionnel         | `{{if:cond\|vrai\|faux}}` | `{{if:{{a}}>0\|+\|-}}`       |

**Note:** Le séparateur de plage est toujours `..` (double-point). La syntaxe `-` n'est plus supportée.

---

_Document généré le 27 novembre 2025, mis à jour le 29 novembre 2025 (analyse complète des options TinyMath, mapping corrigé)_
