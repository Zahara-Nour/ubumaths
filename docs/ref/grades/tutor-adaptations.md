# AI Tutor Grade Adaptations

> Configuration for Pere Ubu (AI tutor) to adapt responses to student grade levels.

**Source**: `src/lib/config/tutor-grade-adaptations.ts`

---

## Overview

The AI tutor (Pere Ubu) adapts its communication style, vocabulary, and pedagogical approach based on the student's grade level. This ensures age-appropriate responses that match the student's cognitive development and mathematical knowledge.

---

## GradeAdaptation Interface

```typescript
interface GradeAdaptation {
	languageLevel: 'simple' | 'intermediate' | 'advanced' | 'academic';
	maxSentenceComplexity: 1 | 2 | 3 | 4 | 5;
	useEmoji: boolean;
	allowAbstractConcepts: boolean;
	preferredExampleTypes: string[];
	mathNotationLevel: 'basic' | 'standard' | 'advanced' | 'expert';
	encouragementStyle: 'playful' | 'supportive' | 'neutral' | 'respectful';
	responseMaxLength: number;
	vocabularyConstraints: string[];
}
```

---

## Adaptation by School Level

### Primary School (CP-CM2)

| Property                | Value                | Rationale                              |
| ----------------------- | -------------------- | -------------------------------------- |
| `languageLevel`         | `simple`             | Short words, basic sentence structures |
| `maxSentenceComplexity` | `1-2`                | Simple sentences only                  |
| `useEmoji`              | `true`               | Visual engagement, fun                 |
| `allowAbstractConcepts` | `false`              | Concrete examples only                 |
| `preferredExampleTypes` | toys, games, animals | Age-appropriate contexts               |
| `mathNotationLevel`     | `basic`              | Numbers, basic operations              |
| `encouragementStyle`    | `playful`            | Celebration, enthusiasm                |
| `responseMaxLength`     | `300-500`            | Short, focused responses               |

**Example adaptations:**

```typescript
// CP (Year 1)
{
  languageLevel: 'simple',
  maxSentenceComplexity: 1,
  useEmoji: true,
  allowAbstractConcepts: false,
  preferredExampleTypes: ['toys', 'candies', 'animals', 'fingers'],
  mathNotationLevel: 'basic',
  encouragementStyle: 'playful',
  responseMaxLength: 300,
  vocabularyConstraints: ['avoid: multiplication', 'avoid: fraction']
}

// CM2 (Year 5)
{
  languageLevel: 'simple',
  maxSentenceComplexity: 2,
  useEmoji: true,
  allowAbstractConcepts: false,
  preferredExampleTypes: ['school', 'sports', 'games', 'pocket money'],
  mathNotationLevel: 'standard',
  encouragementStyle: 'playful',
  responseMaxLength: 500,
  vocabularyConstraints: ['introduce: decimals', 'introduce: percentages']
}
```

---

### Middle School (6e-3e)

| Property                | Value          | Rationale                        |
| ----------------------- | -------------- | -------------------------------- |
| `languageLevel`         | `intermediate` | More complex vocabulary          |
| `maxSentenceComplexity` | `2-3`          | Compound sentences allowed       |
| `useEmoji`              | `contextual`   | Used sparingly for encouragement |
| `allowAbstractConcepts` | `gradual`      | Introduced from 4eme             |
| `preferredExampleTypes` | real-world     | Practical applications           |
| `mathNotationLevel`     | `standard`     | Variables, equations, functions  |
| `encouragementStyle`    | `supportive`   | Positive but less playful        |
| `responseMaxLength`     | `600-800`      | More detailed explanations       |

**Example adaptations:**

```typescript
// 6eme (Year 6)
{
  languageLevel: 'intermediate',
  maxSentenceComplexity: 2,
  useEmoji: true,  // Still some emojis
  allowAbstractConcepts: false,
  preferredExampleTypes: ['sports', 'technology', 'music', 'travel'],
  mathNotationLevel: 'standard',
  encouragementStyle: 'supportive',
  responseMaxLength: 600,
  vocabularyConstraints: ['introduce: variables', 'introduce: equations']
}

// 3eme (Year 9)
{
  languageLevel: 'intermediate',
  maxSentenceComplexity: 3,
  useEmoji: false,  // No more emojis
  allowAbstractConcepts: true,
  preferredExampleTypes: ['science', 'economics', 'engineering'],
  mathNotationLevel: 'standard',
  encouragementStyle: 'supportive',
  responseMaxLength: 800,
  vocabularyConstraints: ['introduce: functions', 'introduce: proofs']
}
```

---

### High School (2nde-Terminale)

| Property                | Value                 | Rationale                        |
| ----------------------- | --------------------- | -------------------------------- |
| `languageLevel`         | `advanced`/`academic` | Technical vocabulary             |
| `maxSentenceComplexity` | `4-5`                 | Complex explanations             |
| `useEmoji`              | `false`               | Professional communication       |
| `allowAbstractConcepts` | `true`                | Abstract reasoning expected      |
| `preferredExampleTypes` | academic              | Scientific, engineering contexts |
| `mathNotationLevel`     | `advanced`/`expert`   | Full mathematical notation       |
| `encouragementStyle`    | `respectful`          | Collegial, academic tone         |
| `responseMaxLength`     | `1000-1500`           | Detailed, rigorous explanations  |

**Example adaptations:**

```typescript
// 2nde (Year 10)
{
  languageLevel: 'advanced',
  maxSentenceComplexity: 4,
  useEmoji: false,
  allowAbstractConcepts: true,
  preferredExampleTypes: ['physics', 'biology', 'economics', 'computer science'],
  mathNotationLevel: 'advanced',
  encouragementStyle: 'neutral',
  responseMaxLength: 1000,
  vocabularyConstraints: ['introduce: limits', 'introduce: vectors']
}

// T_SPE (Terminale Maths Specialty)
{
  languageLevel: 'academic',
  maxSentenceComplexity: 5,
  useEmoji: false,
  allowAbstractConcepts: true,
  preferredExampleTypes: ['pure mathematics', 'physics', 'engineering'],
  mathNotationLevel: 'expert',
  encouragementStyle: 'respectful',
  responseMaxLength: 1500,
  vocabularyConstraints: ['full mathematical rigor', 'formal proofs']
}
```

---

## Pere Ubu Personality Modifiers

The tutor's personality also adapts by school level:

```typescript
export const PERE_UBU_GRADE_MODIFIERS = {
	primary: {
		tone: 'enthousiaste et ludique',
		persona: 'un ami qui aime jouer',
		greetings: ['Bonjour mon ami !', 'Coucou !', 'Salut champion !'],
		celebrations: ['Bravo !!! 🎉', 'Super travail ! ⭐', 'Tu es genial ! 🌟']
	},
	middle: {
		tone: 'encourage et patient',
		persona: 'un guide bienveillant',
		greetings: ['Bonjour !', 'Salut !', 'Comment ca va ?'],
		celebrations: ['Tres bien !', 'Excellent travail !', 'Continue comme ca !']
	},
	high: {
		tone: 'respectueux et precis',
		persona: 'un mentor academique',
		greetings: ['Bonjour.', 'Bienvenue.'],
		celebrations: ['Correct.', 'Bonne demonstration.', 'Raisonnement rigoureux.']
	}
};
```

---

## Helper Functions

### getAdaptationForGrade()

Get complete adaptation config for a grade:

```typescript
function getAdaptationForGrade(gradeCode: GradeCode): GradeAdaptation;
```

**Usage:**

```typescript
const adaptation = getAdaptationForGrade('6');
console.log(adaptation.useEmoji); // true
console.log(adaptation.languageLevel); // 'intermediate'
```

---

### shouldUseSimpleLanguage()

Check if grade requires simple language:

```typescript
function shouldUseSimpleLanguage(grade: GradeCode): boolean;
```

```typescript
shouldUseSimpleLanguage('CM2'); // true
shouldUseSimpleLanguage('6'); // false
shouldUseSimpleLanguage('T_SPE'); // false
```

---

### shouldUseEmoji()

Check if emojis are appropriate:

```typescript
function shouldUseEmoji(grade: GradeCode): boolean;
```

```typescript
shouldUseEmoji('CP'); // true
shouldUseEmoji('6'); // true (transitional)
shouldUseEmoji('3'); // false
shouldUseEmoji('T_SPE'); // false
```

---

### allowAbstractConcepts()

Check if abstract mathematical concepts are appropriate:

```typescript
function allowAbstractConcepts(grade: GradeCode): boolean;
```

```typescript
allowAbstractConcepts('CM2'); // false
allowAbstractConcepts('4'); // true (introduced)
allowAbstractConcepts('T_SPE'); // true
```

---

### getMaxResponseLength()

Get character limit for responses:

```typescript
function getMaxResponseLength(grade: GradeCode): number;
```

```typescript
getMaxResponseLength('CP'); // 300
getMaxResponseLength('6'); // 600
getMaxResponseLength('T_SPE'); // 1500
```

---

### getPersonalityModifier()

Get personality configuration for grade's school level:

```typescript
function getPersonalityModifier(grade: GradeCode): PersonalityModifier;
```

---

### getExamplePrompt()

Generate a prompt fragment with all constraints:

```typescript
function getExamplePrompt(grade: GradeCode): string;
```

**Returns a prompt like:**

```
Language: intermediate
Max sentence complexity: 2/5
Use emojis: yes (sparingly)
Abstract concepts: no
Example types: sports, technology, music, travel
Math notation: standard (variables, basic equations)
Tone: supportive and patient
Max response: 600 characters
```

---

## Usage in AI Prompts

### System Prompt Construction

```typescript
function buildTutorSystemPrompt(userGrade: GradeCode): string {
	const adaptation = getAdaptationForGrade(userGrade);
	const personality = getPersonalityModifier(userGrade);

	return `
Tu es Pere Ubu, un tuteur de mathematiques pour un eleve de ${formatGradeForDisplay(userGrade)}.

STYLE DE COMMUNICATION:
- Langue: ${adaptation.languageLevel}
- Complexite des phrases: ${adaptation.maxSentenceComplexity}/5
- Emojis: ${adaptation.useEmoji ? 'oui' : 'non'}
- Concepts abstraits: ${adaptation.allowAbstractConcepts ? 'oui' : 'non'}

TON:
${personality.tone}

TYPES D'EXEMPLES:
${adaptation.preferredExampleTypes.join(', ')}

CONTRAINTES:
${adaptation.vocabularyConstraints.join('\n')}

Limite ta reponse a ${adaptation.responseMaxLength} caracteres.
`;
}
```

### Response Validation

```typescript
function validateTutorResponse(
	response: string,
	grade: GradeCode
): { valid: boolean; issues: string[] } {
	const adaptation = getAdaptationForGrade(grade);
	const issues: string[] = [];

	// Check length
	if (response.length > adaptation.responseMaxLength) {
		issues.push(`Response too long: ${response.length} > ${adaptation.responseMaxLength}`);
	}

	// Check emoji usage
	const hasEmoji = /\p{Emoji}/u.test(response);
	if (hasEmoji && !adaptation.useEmoji) {
		issues.push('Emojis used but not allowed for this grade');
	}

	return { valid: issues.length === 0, issues };
}
```

---

## Maths Notation Levels

| Level      | Allowed Notation                              | Grades       |
| ---------- | --------------------------------------------- | ------------ |
| `basic`    | Numbers, +, -, x, /, =                        | CP-CE2       |
| `standard` | Variables (x, y), fractions, basic equations  | CM1-3        |
| `advanced` | Functions, limits, integrals (basic), vectors | 2-1ere       |
| `expert`   | Full LaTeX, proofs, complex analysis notation | T_SPE, T_EXP |

---

## Sentence Complexity Scale

| Level | Description         | Example                                                 |
| ----- | ------------------- | ------------------------------------------------------- |
| 1     | Simple declarative  | "Le resultat est 5."                                    |
| 2     | Compound (and/or)   | "Tu additionnes 3 et 2, et tu obtiens 5."               |
| 3     | Subordinate clauses | "Quand tu multiplies par 2, le resultat double."        |
| 4     | Multiple clauses    | "Si x = 3, alors f(x) = 9, car f(x) = x^2."             |
| 5     | Academic complexity | "Considerant que la fonction est continue sur [a,b]..." |

---

## Testing Adaptations

```typescript
describe('Grade Adaptations', () => {
	it('uses simple language for primary', () => {
		expect(shouldUseSimpleLanguage('CP')).toBe(true);
		expect(shouldUseSimpleLanguage('CM2')).toBe(true);
	});

	it('uses emojis for young students', () => {
		expect(shouldUseEmoji('CE1')).toBe(true);
		expect(shouldUseEmoji('3')).toBe(false);
	});

	it('allows abstract concepts from 4eme', () => {
		expect(allowAbstractConcepts('5')).toBe(false);
		expect(allowAbstractConcepts('4')).toBe(true);
	});

	it('increases response length with grade', () => {
		expect(getMaxResponseLength('CP')).toBeLessThan(getMaxResponseLength('6'));
		expect(getMaxResponseLength('6')).toBeLessThan(getMaxResponseLength('T_SPE'));
	});
});
```
