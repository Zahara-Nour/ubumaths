# Tutor Component Usage Examples

Quick reference for integrating tutor components into UbuMaths.

## 1. In Exercise Pages (Most Common)

Add a help button to any exercise:

```svelte
<script lang="ts">
	import { TutorHelpButton } from '$lib/components/tutor';
	import type { PageData } from './$types';

	let { data } = $props<{ data: PageData }>();
	const { exercise, profile } = data;
</script>

<div class="exercise-container">
	<!-- Exercise statement -->
	<h2>{exercise.statement}</h2>

	<!-- Student answer input -->
	<input type="text" bind:value={studentAnswer} />

	<!-- Tutor help button -->
	<div class="mt-4">
		<TutorHelpButton
			exerciseContext={{
				exerciseId: exercise.id,
				statement: exercise.statement,
				topic: exercise.metadata?.topic,
				domain: exercise.metadata?.domain,
				level: exercise.difficulty,
				studentGrade: profile.grade,
				attempts: exercise.attempts
			}}
			variant="outline"
		/>
	</div>
</div>
```

## 2. Standalone Tuteur Page (Already Implemented)

The `/tuteur` page is already set up for free-form tutoring:

```svelte
<!-- src/routes/(protected)/tuteur/+page.svelte -->
<script lang="ts">
	import TutorChat from '$lib/components/tutor/TutorChat.svelte';
	import type { PageData } from './$types';

	let { data } = $props<{ data: PageData }>();
	const { studentGrade } = data;
</script>

<TutorChat exerciseContext={{ statement: '', studentGrade }} />
```

## 3. Floating Widget (Global Access)

Add to main layout for site-wide tutor access:

```svelte
<!-- src/routes/(protected)/+layout.svelte -->
<script lang="ts">
	import { TutorWidget } from '$lib/components/tutor';
</script>

<!-- Page content -->
<slot />

<!-- Floating tutor widget -->
<TutorWidget />
```

## 4. Custom Chat Interface

For specialized use cases:

```svelte
<script lang="ts">
	import { TutorChat } from '$lib/components/tutor';

	const exerciseContext = {
		exerciseId: 'custom-123',
		statement: 'Résoudre: 2x + 5 = 15',
		topic: 'equations',
		domain: 'algebra',
		level: 2,
		studentGrade: '5',
		attempts: [
			{ isCorrect: false, answer: 'x = 10' },
			{ isCorrect: false, answer: 'x = 4' }
		]
	};
</script>

<div class="h-[600px]">
	<TutorChat {exerciseContext} initialHelpLevel={2} />
</div>
```

## 5. Usage Indicator Only

Display quotas without chat:

```svelte
<script lang="ts">
	import { TutorUsageIndicator } from '$lib/components/tutor';

	let remaining = $state({
		exercise: 12,
		hour: 28,
		day: 95
	});
</script>

<TutorUsageIndicator {remaining} />
```

## 6. Programmatic Dialog Control

For advanced scenarios:

```svelte
<script lang="ts">
	import { TutorHelpButton } from '$lib/components/tutor';
	import { Button } from '$lib/components/ui/button';

	let showTutor = $state(false);
</script>

<!-- Custom trigger -->
<Button onclick={() => (showTutor = true)}>Besoin d'aide ?</Button>

<!-- Tutor dialog -->
{#if showTutor}
	<TutorHelpButton exerciseContext={currentExercise} bind:open={showTutor} />
{/if}
```

## 7. In Quiz/Test Components

Provide help during assessments:

```svelte
<script lang="ts">
	import { TutorHelpButton } from '$lib/components/tutor';

	let { question, questionIndex, studentGrade } = $props();
</script>

<div class="quiz-question">
	<h3>Question {questionIndex + 1}</h3>
	<p>{question.text}</p>

	<!-- Answer options -->
	<div class="options">
		{#each question.options as option}
			<button>{option}</button>
		{/each}
	</div>

	<!-- Tutor help (may be limited in test mode) -->
	<TutorHelpButton
		exerciseContext={{
			statement: question.text,
			topic: question.topic,
			studentGrade
		}}
		variant="ghost"
	/>
</div>
```

## 8. In Homework Assignments

Help students with assigned work:

```svelte
<script lang="ts">
	import { TutorHelpButton } from '$lib/components/tutor';

	let { homework, studentGrade } = $props();
</script>

<div class="homework-card">
	<h2>{homework.title}</h2>
	<p>{homework.description}</p>

	<div class="exercises">
		{#each homework.exercises as exercise}
			<div class="exercise-item">
				<p>{exercise.statement}</p>

				<!-- Student work area -->
				<textarea placeholder="Ta réponse..."></textarea>

				<!-- Tutor help -->
				<TutorHelpButton
					exerciseContext={{
						exerciseId: exercise.id,
						statement: exercise.statement,
						topic: exercise.topic,
						studentGrade
					}}
				/>
			</div>
		{/each}
	</div>
</div>
```

## 9. Conditional Tutor Access

Based on student progress or settings:

```svelte
<script lang="ts">
	import { TutorHelpButton } from '$lib/components/tutor';

	let { exercise, studentProgress, settings } = $props();

	const canUseTutor = $derived(settings.tutorEnabled && studentProgress.attempts < 3);
</script>

{#if canUseTutor}
	<TutorHelpButton exerciseContext={exercise} variant="outline" />
{:else}
	<p class="text-sm text-muted-foreground">Le tuteur sera disponible après 3 tentatives</p>
{/if}
```

## 10. Mini Widget (Compact Mode)

Custom styled tutor access:

```svelte
<script lang="ts">
	import { TutorWidget } from '$lib/components/tutor';
	import { HelpCircle } from 'lucide-svelte';

	let { exerciseContext } = $props();
</script>

<!-- Compact widget for mobile -->
<div class="fixed bottom-4 left-4 z-50 md:hidden">
	<TutorWidget {exerciseContext} />
</div>

<!-- Desktop: inline button -->
<div class="hidden md:block">
	<button class="flex items-center gap-2 text-primary">
		<HelpCircle class="h-4 w-4" />
		<span>Père Ubu peut t'aider</span>
	</button>
</div>
```

## API Response Handling

Handle tutor metadata in your components:

```typescript
// After sending a message
const response = await fetch('/api/chat', {
	method: 'POST',
	headers: { 'Content-Type': 'application/json' },
	body: JSON.stringify({
		tutorMode: true,
		messages,
		exerciseContext,
		helpLevel
	})
});

const data = await response.json();

// Check for cheat detection
if (data.tutorMetadata.cheatDetected) {
	toaster.warning('Le Père Ubu a détecté une tentative de triche !');
}

// Update quotas
remaining = data.tutorMetadata.remaining;

// Track help level
helpLevel = data.tutorMetadata.helpLevel;

// Monitor effort
if (data.tutorMetadata.effortScore < 30) {
	// Student needs more encouragement
}
```

## Styling Customization

Override component styles:

```svelte
<TutorChat exerciseContext={context} class="custom-tutor-chat" />

<style>
	:global(.custom-tutor-chat) {
		/* Override border radius */
		border-radius: 1rem;

		/* Custom shadow */
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
	}

	:global(.custom-tutor-chat .message-bubble) {
		/* Custom message styling */
		font-size: 1.1rem;
	}
</style>
```

## TypeScript Type Imports

For type safety:

```typescript
import type { ExerciseContext, TutorMetadata, TutorResponse } from '$lib/types/tutor';

const context: ExerciseContext = {
	exerciseId: '123',
	statement: 'Calculer 2 + 3',
	topic: 'addition',
	domain: 'arithmetic',
	level: 1,
	studentGrade: '6',
	attempts: []
};
```

## Error Handling

Graceful degradation:

```svelte
<script lang="ts">
	import { TutorHelpButton } from '$lib/components/tutor';
	import { toaster } from '$lib/stores/toaster.svelte';

	let tutorAvailable = $state(true);

	async function checkTutorAvailability() {
		try {
			const res = await fetch('/api/chat/status');
			tutorAvailable = res.ok;
		} catch {
			tutorAvailable = false;
			toaster.error('Le tuteur est temporairement indisponible');
		}
	}
</script>

{#if tutorAvailable}
	<TutorHelpButton exerciseContext={context} />
{:else}
	<p class="text-sm text-muted-foreground">Le tuteur est actuellement indisponible</p>
{/if}
```

---

These examples cover the most common integration patterns. Refer to the component README for detailed API documentation.
