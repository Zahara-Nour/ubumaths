<!--
	BlankInput Component
	====================

	Renders an inline input field for fill-in-the-blank questions.
	Integrates naturally within text flow (display: inline-block).

	Features:
	- Inline rendering within text flow
	- Validation state styling (correct/unoptimal/incorrect/neutral)
	- Keyboard handling (Enter to submit)
	- Accessibility support (aria-label, aria-invalid)

	@see BlankInputProps in types.ts for prop definitions
	@see ParagraphNode.svelte for rendering context
	@module components/markdown/nodes/BlankInput
-->
<script lang="ts">
	import { cn } from '$lib/utils';

	interface Props {
		/** 1-based index of the blank */
		index: number;
		/** Current value */
		value?: string;
		/** Disabled (read-only) */
		disabled?: boolean;
		/** Validation state: true=correct, false=incorrect, null=not validated */
		isCorrect?: boolean | null;
		/** Juste mais forme non optimale (ambre) ; seulement avec `isCorrect: true` */
		unoptimal?: boolean;
		/** Callback when value changes */
		onValueChange?: (value: string) => void;
		/** Callback when user submits (Enter key) */
		onSubmit?: () => void;
		/** Additional CSS classes */
		class?: string;
	}

	let {
		index,
		value = $bindable(''),
		disabled = false,
		isCorrect = null,
		unoptimal = false,
		onValueChange,
		onSubmit,
		class: className = ''
	}: Props = $props();

	// Identifiant du libellé d'état (lu par aria-describedby)
	const uid = $props.id();
	const stateId = `${uid}-etat`;

	// L'état ne doit pas passer par la seule couleur : libellé pour lecteur d'écran
	const STATE_LABELS = {
		correct: 'réponse juste',
		unoptimal: 'réponse juste, forme à améliorer',
		incorrect: 'réponse fausse'
	} as const;

	/**
	 * Handle input events - update value and notify parent
	 */
	function handleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		value = target.value;
		onValueChange?.(value);
	}

	/**
	 * Handle keydown - submit on Enter
	 */
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			onSubmit?.();
		}
	}

	// État d'affichage : la forme non optimale (ambre) n'existe que sur une réponse juste
	let validationState: 'correct' | 'unoptimal' | 'incorrect' | undefined = $derived(
		isCorrect === true
			? unoptimal
				? 'unoptimal'
				: 'correct'
			: isCorrect === false
				? 'incorrect'
				: undefined
	);

	/**
	 * Compute CSS classes based on validation state
	 */
	let inputClasses = $derived(
		cn(
			// Base styles
			'inline-block min-w-16 w-auto',
			'px-2 py-0.5',
			'border-2 rounded-md',
			'font-inherit text-inherit leading-normal',
			'align-baseline',
			'bg-background',
			// Focus state
			'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
			// Disabled state
			'disabled:opacity-50 disabled:cursor-not-allowed',
			// Validation states
			validationState === 'correct' && 'border-green-500/80 bg-green-500/10',
			validationState === 'unoptimal' && 'border-warning/80 bg-warning/10',
			isCorrect === false && 'border-destructive/80 bg-destructive/10',
			isCorrect === null && 'border-border',
			// Custom classes
			className
		)
	);
</script>

<input
	type="text"
	{value}
	{disabled}
	oninput={handleInput}
	onkeydown={handleKeydown}
	class={inputClasses}
	aria-label="Reponse {index}"
	aria-invalid={isCorrect === false ? 'true' : undefined}
	aria-describedby={validationState ? stateId : undefined}
	data-state={validationState}
	autocomplete="off"
	spellcheck="false"
/>{#if validationState}<span id={stateId} class="sr-only">{STATE_LABELS[validationState]}</span
	>{/if}
