# Composants UI

> Composants Svelte pour l'affichage et la saisie des questions.

---

## Vue d'ensemble

Le systeme utilise des composants specialises pour chaque type d'interaction :

```
+------------------+     +---------------------+
|   FlashCard      | --> | NumericalInput      |  numerical_*, algebraic
|   (Container)    | --> | MultipleChoiceInput |  multiple_choice
|                  | --> | FillBlanksInput     |  fill_in_blanks
+------------------+     +---------------------+
```

---

## FlashCard

**Fichier** : `src/lib/components/questions/FlashCard.svelte`

Container principal pour l'affichage interactif des questions.

### Props

```typescript
interface FlashCardProps {
	instance: QuestionInstance; // Instance generee
	onAnswer?: (result: AnswerResult) => void; // Callback reponse
	showCorrection?: boolean; // Afficher correction
	mode?: 'practice' | 'review'; // Mode d'utilisation
	disabled?: boolean; // Desactiver saisie
}
```

### Structure

```svelte
<div class="flashcard">
	<!-- Timer (si delay defini) -->
	{#if instance.delay}
		<Timer duration={instance.delay} />
	{/if}

	<!-- Instruction d'exercice -->
	{#if instance.exerciseInstruction}
		<div class="instruction">{instance.exerciseInstruction}</div>
	{/if}

	<!-- Enonce -->
	<div class="statement">
		<MarkdownRenderer content={instance.statement} />
	</div>

	<!-- Input selon type -->
	{#if instance.type.startsWith('numerical') || instance.type === 'algebraic_transform'}
		<NumericalInput bind:value onValidate={handleValidation} />
	{:else if instance.type === 'multiple_choice'}
		<MultipleChoiceInput
			choices={instance.shuffledChoices}
			multiple={instance.multipleAnswers}
			bind:selected
		/>
	{:else if instance.type === 'fill_in_blanks'}
		<FillBlanksInput statement={instance.statement} blanks={instance.blanks} bind:answers />
	{/if}

	<!-- Bouton validation -->
	<Button onclick={validate}>Valider</Button>

	<!-- Correction (si activee) -->
	{#if showCorrection && instance.correction}
		<CorrectionDisplay correction={instance.correction} />
	{/if}
</div>
```

### Etats

```typescript
type FlashCardState =
	| 'input' // Saisie en cours
	| 'validating' // Validation en cours
	| 'correct' // Reponse correcte
	| 'incorrect' // Reponse incorrecte
	| 'timeout'; // Temps ecoule
```

---

## NumericalInput

**Fichier** : `src/lib/components/question-inputs/NumericalInput.svelte`

Champ de saisie mathematique utilisant MathLive.

### Props

```typescript
interface NumericalInputProps {
	value?: string; // Valeur LaTeX
	placeholder?: string; // Placeholder
	disabled?: boolean; // Desactiver
	readonly?: boolean; // Lecture seule
	showVirtualKeyboard?: boolean; // Clavier virtuel (defaut: true)
	onValidate?: (value: string) => void; // Callback Enter
	class?: string; // Classes CSS
}
```

### Utilisation

```svelte
<script>
	import NumericalInput from '$lib/components/question-inputs/NumericalInput.svelte';

	let answer = $state('');

	function handleValidate(value: string) {
		console.log('Reponse:', value); // LaTeX
	}
</script>

<NumericalInput bind:value={answer} placeholder="Entrer la reponse" onValidate={handleValidate} />
```

### Fonctionnalites

- **MathLive integration** : Rendu LaTeX temps reel
- **Clavier virtuel** : Optionnel, mobile-friendly
- **Validation Enter** : Callback sur touche Entree
- **Output LaTeX** : Valeur toujours en format LaTeX

### Styling

```css
/* Etats visuels */
.math-input.correct {
	border-color: var(--color-success);
}
.math-input.incorrect {
	border-color: var(--color-error);
}
.math-input.warning {
	border-color: var(--color-warning);
}
```

---

## MultipleChoiceInput

**Fichier** : `src/lib/components/question-inputs/MultipleChoiceInput.svelte`

Boutons de selection pour QCM.

### Props

```typescript
interface MultipleChoiceInputProps {
	choices: ShuffledChoice[]; // Choix melanges
	multiple?: boolean; // Multi-selection
	selected?: number | number[]; // Index selectionne(s)
	disabled?: boolean; // Desactiver
	showResult?: boolean; // Afficher correct/incorrect
	class?: string;
}

interface ShuffledChoice {
	content: ResolvedMarkdown; // Contenu resolu
	originalIndex: number; // Index original (pour validation)
	isCorrect?: boolean; // Correct (pour affichage resultat)
}
```

### Utilisation

```svelte
<script>
	import MultipleChoiceInput from '$lib/components/question-inputs/MultipleChoiceInput.svelte';

	let selected = $state<number | null>(null);

	const choices = [
		{ content: '$$x + 1$$', originalIndex: 0 },
		{ content: '$$x - 1$$', originalIndex: 1 },
		{ content: '$$2x$$', originalIndex: 2 }
	];
</script>

<MultipleChoiceInput {choices} bind:selected multiple={false} />
```

### Layout

```css
/* Grille responsive */
.choices-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
	gap: 0.5rem;
}

/* Bouton choix */
.choice-button {
	padding: 1rem;
	border: 2px solid var(--border);
	border-radius: 0.5rem;
	cursor: pointer;
	transition: all 0.2s;
}

.choice-button.selected {
	border-color: var(--primary);
	background: var(--primary-light);
}

.choice-button.correct {
	border-color: var(--success);
	background: var(--success-light);
}

.choice-button.incorrect {
	border-color: var(--error);
	background: var(--error-light);
}
```

### Multi-selection

```svelte
<MultipleChoiceInput
  {choices}
  multiple={true}
  bind:selected={selectedIndices}  // number[]
/>
```

---

## FillBlanksInput

**Fichier** : `src/lib/components/question-inputs/FillBlanksInput.svelte`

Enonce avec zones de saisie inline.

### Props

```typescript
interface FillBlanksInputProps {
	statement: string; // Enonce avec ____
	blanks: ResolvedBlank[]; // Definitions blancs
	answers?: string[]; // Reponses saisies
	disabled?: boolean; // Desactiver
	showResults?: boolean; // Afficher correct/incorrect
	class?: string;
}

interface ResolvedBlank {
	position: number; // Index du blanc (0-based)
	expectedAnswer: string; // Reponse attendue
}
```

### Utilisation

```svelte
<script>
	import FillBlanksInput from '$lib/components/question-inputs/FillBlanksInput.svelte';

	let answers = $state<string[]>([]);

	const statement = '$$5 + ____ = 12$$';
	const blanks = [{ position: 0, expectedAnswer: '7' }];
</script>

<FillBlanksInput {statement} {blanks} bind:answers />
```

### Rendu

Le composant :

1. Detecte les `____` dans l'enonce
2. Remplace par des champs MathField inline
3. Gere la tabulation entre champs
4. Valide chaque blanc independamment

```html
<!-- Rendu pour "5 + ____ = ____" -->
<span class="fill-blanks">
	<span>5 + </span>
	<MathField index="{0}" bind:value="{answers[0]}" />
	<span> = </span>
	<MathField index="{1}" bind:value="{answers[1]}" />
</span>
```

### Validation par blank

```typescript
const results = blanks.map((blank, i) => ({
	position: blank.position,
	expected: blank.expectedAnswer,
	given: answers[i],
	correct: areEquivalent(blank.expectedAnswer, answers[i])
}));
```

---

## MarkdownRenderer

**Fichier** : `src/lib/components/MarkdownRenderer.svelte`

Rendu markdown avec support LaTeX.

### Props

```typescript
interface MarkdownRendererProps {
	content: string; // Contenu markdown
	inline?: boolean; // Mode inline (pas de <p>)
	class?: string;
}
```

### Fonctionnalites

- **Markdown** : Titres, listes, gras, italique, code
- **LaTeX inline** : `$x^2$` → rendu math
- **LaTeX block** : `$$x^2$$` → rendu centre
- **Sanitization** : XSS protection via DOMPurify

### Utilisation

```svelte
<MarkdownRenderer content="Calculer $\sqrt{2}$ puis arrondir a **2 decimales**." />
```

---

## CorrectionDisplay

**Fichier** : `src/lib/components/questions/CorrectionDisplay.svelte`

Affichage de la correction avec etapes.

### Props

```typescript
interface CorrectionDisplayProps {
	correction: ResolvedCorrection; // Correction resolue
	result: 'correct' | 'incorrect' | 'partial';
	class?: string;
}
```

### Structure

```svelte
<div class="correction">
	<!-- Feedback principal -->
	<div class="feedback {result}">
		<MarkdownRenderer content={feedback} />
	</div>

	<!-- Etapes de resolution -->
	{#if correction.steps}
		<div class="steps">
			<h4>Solution detaillee</h4>
			{#each correction.steps as step, i}
				<div class="step">
					<span class="step-number">{i + 1}</span>
					<MarkdownRenderer content={step} />
				</div>
			{/each}
		</div>
	{/if}
</div>
```

---

## Timer

**Fichier** : `src/lib/components/questions/Timer.svelte`

Compte a rebours pour questions chronometrees.

### Props

```typescript
interface TimerProps {
	duration: number; // Duree en secondes
	onTimeout?: () => void; // Callback timeout
	paused?: boolean; // Mettre en pause
	class?: string;
}
```

### Affichage

```svelte
<div class="timer" class:warning={remaining < 10}>
	<span class="time">{formatTime(remaining)}</span>
	<div class="progress-bar" style:width="{(remaining / duration) * 100}%" />
</div>
```

### Couleurs

| Temps restant | Couleur |
| ------------- | ------- |
| > 50%         | Vert    |
| 20-50%        | Orange  |
| < 20%         | Rouge   |

---

## Hierarchie des composants

```
FlashCard
├── Timer (optionnel)
├── MarkdownRenderer (instruction)
├── MarkdownRenderer (statement)
├── [Input Component]
│   ├── NumericalInput
│   ├── MultipleChoiceInput
│   └── FillBlanksInput
├── Button (valider)
└── CorrectionDisplay (optionnel)
```

---

## Accessibilite

### Clavier

| Composant           | Touches                                        |
| ------------------- | ---------------------------------------------- |
| NumericalInput      | Enter = valider, Tab = suivant                 |
| MultipleChoiceInput | Fleches = naviguer, Space/Enter = selectionner |
| FillBlanksInput     | Tab = blank suivant, Enter = valider           |

### ARIA

```svelte
<!-- NumericalInput -->
<math-field role="textbox" aria-label="Champ de reponse mathematique" />

<!-- MultipleChoiceInput -->
<div role="radiogroup" aria-label="Choix de reponse">
	<button role="radio" aria-checked={selected === i}> ... </button>
</div>

<!-- FillBlanksInput -->
<math-field role="textbox" aria-label="Blank {i + 1} sur {blanks.length}" />
```

---

## Theming

Les composants utilisent les variables CSS du design system :

```css
:root {
	--question-bg: var(--card);
	--question-border: var(--border);
	--question-radius: 0.75rem;
	--question-padding: 1.5rem;

	--input-focus: var(--primary);
	--input-correct: var(--success);
	--input-incorrect: var(--error);
	--input-warning: var(--warning);
}
```

---

## Voir aussi

- [types.md](types.md) - Types de questions
- [validation.md](validation.md) - Validation reponses
- [../../claude/ui-components.md](../../claude/ui-components.md) - Composants Shadcn
