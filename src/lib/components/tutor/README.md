# Tutor Components

AI-powered pedagogical tutor system for UbuMaths.

## Components

### TutorChat

Main chat interface with the tutor AI.

```svelte
<script>
	import { TutorChat } from '$lib/components/tutor';
</script>

<!-- Free-form chat -->
<TutorChat />

<!-- With exercise context -->
<TutorChat
	exerciseContext={{
		exerciseId: '123',
		statement: 'Calculer 2 + 3',
		topic: 'addition',
		studentGrade: '6',
		attempts: [{ isCorrect: false, answer: '4' }]
	}}
	initialHelpLevel={0}
/>
```

**Props:**

- `exerciseContext?`: Exercise details for context-aware help
- `initialHelpLevel?`: Starting help level (0-7, default: 0)

### TutorHelpButton

Button that opens tutor chat in a dialog modal.

```svelte
<script>
	import { TutorHelpButton } from '$lib/components/tutor';
</script>

<TutorHelpButton
	exerciseContext={{
		exerciseId: '123',
		statement: 'Résoudre: x + 5 = 12',
		topic: 'equations',
		domain: 'algebra',
		level: 2,
		studentGrade: '5'
	}}
	variant="outline"
/>
```

**Props:**

- `exerciseContext`: Exercise details (required)
- `variant?`: Button style ('default' | 'outline' | 'ghost' | 'secondary' | 'destructive' | 'link')

### TutorWidget

Floating widget for global tutor access.

```svelte
<script>
	import { TutorWidget } from '$lib/components/tutor';
</script>

<!-- Floating widget (shows on all pages) -->
<TutorWidget />

<!-- With exercise context -->
<TutorWidget exerciseContext={{ statement: '...', topic: 'geometry' }} />
```

**Props:**

- `exerciseContext?`: Optional exercise context

### TutorUsageIndicator

Shows remaining quotas for tutor usage.

```svelte
<script>
	import { TutorUsageIndicator } from '$lib/components/tutor';
</script>

<TutorUsageIndicator
	remaining={{
		exercise: 10, // null if not in exercise context
		hour: 25,
		day: 85
	}}
/>
```

**Props:**

- `remaining`: Quota counts { exercise: number | null, hour: number, day: number }

## Features

### Progressive Help Levels (0-7)

The tutor adapts its responses based on the conversation depth:

- **Level 0-1**: Clarifying questions, general guidance
- **Level 2-3**: Hints about methods to use
- **Level 4-5**: Step-by-step breakdown
- **Level 6-7**: More direct hints (still no direct answers)

### Rate Limiting

Three-tier quota system:

- **Per exercise**: 15 messages max
- **Per hour**: 30 messages max
- **Per day**: 100 messages max

### Cheat Detection

AI analyzes messages for cheat attempts:

- Detects requests for direct answers
- Refuses to solve problems entirely
- Provides pedagogical redirection

### Grade-Level Adaptation

Responses adapt to student's grade level:

- Vocabulary complexity
- Sentence structure
- Mathematical notation
- Conceptual depth

## Usage in Exercises

```svelte
<script lang="ts">
	import { TutorHelpButton } from '$lib/components/tutor';
	import type { Exercise } from '$lib/types';

	let { exercise, studentGrade } = $props<{
		exercise: Exercise;
		studentGrade: string;
	}>();
</script>

<div class="exercise-container">
	<div class="exercise-statement">
		{exercise.statement}
	</div>

	<!-- Add tutor button -->
	<div class="mt-4">
		<TutorHelpButton
			exerciseContext={{
				exerciseId: exercise.id,
				statement: exercise.statement,
				topic: exercise.topic,
				domain: exercise.domain,
				level: exercise.difficulty,
				studentGrade,
				attempts: exercise.attempts
			}}
		/>
	</div>
</div>
```

## API Integration

All components communicate with `/api/chat` endpoint with `tutorMode: true`.

**Request:**

```typescript
{
  tutorMode: true,
  messages: Message[],
  exerciseContext?: ExerciseContext,
  helpLevel: number
}
```

**Response:**

```typescript
{
  message: string,
  tutorMetadata: {
    cheatDetected: boolean,
    helpMethodUsed: HelpMethodId | null,
    helpLevel: number,
    effortScore?: number,
    remaining: {
      exercise: number | null,
      hour: number,
      day: number
    }
  }
}
```

## Styling

Components use:

- Tailwind CSS utility classes
- Semantic color tokens (`bg-primary`, `text-foreground`, etc.)
- Font scaling via `--font-scale` CSS variable
- Dark mode support (automatic via semantic tokens)

## Accessibility

- Keyboard navigation (Enter to send, Shift+Enter for newline)
- ARIA labels on interactive elements
- Focus management for dialogs
- Screen reader friendly status messages
- High contrast support

## Performance

- Typing animation (15ms/char) with skip option
- Auto-scroll to latest message
- Message history capped at 10 for API context
- LaTeX/Markdown rendering via MarkdownRenderer
- Debounced textarea auto-resize

## Security

- All inputs validated server-side via Zod
- Rate limiting enforced server-side
- Cheat detection via AI analysis
- No client-side quota bypass
- Authenticated users only
