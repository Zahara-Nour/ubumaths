<script lang="ts">
	/**
	 * QuestionSelector - UI for selecting and submitting a question
	 *
	 * Uses MySelect for question selection and shows parameter selector
	 * when the selected question requires a parameter.
	 * Filters available questions based on the game pack.
	 */

	import { Button } from '$lib/components/ui/button';
	import MySelect from '$lib/components/MySelect.svelte';
	import { QUESTION_INFO, type QuestionType } from '$lib/types/guess-who';

	interface Props {
		onSubmit: (type: QuestionType, param?: number) => void;
		disabled?: boolean;
		/** Available question types for this pack (if undefined, show all) */
		availableQuestions?: QuestionType[];
		class?: string;
	}

	let { onSubmit, disabled = false, availableQuestions, class: className = '' }: Props = $props();

	let selectedQuestionType = $state<string | undefined>(undefined);
	let selectedParam = $state<string | undefined>(undefined);

	// Filter questions based on pack's available questions
	const filteredQuestionInfo = $derived(
		availableQuestions
			? QUESTION_INFO.filter((q) => availableQuestions.includes(q.type))
			: QUESTION_INFO
	);

	// Find info for currently selected question
	const selectedQuestionInfo = $derived(
		filteredQuestionInfo.find((q) => q.type === selectedQuestionType)
	);

	// Check if we can submit (have question, and param if required)
	const canSubmit = $derived(
		selectedQuestionType && (!selectedQuestionInfo?.requiresParam || selectedParam !== undefined)
	);

	// Prepare items for MySelect (filtered by pack)
	const questionItems = $derived(
		filteredQuestionInfo.map((q) => ({
			value: q.type,
			label: q.labelFr
		}))
	);

	const paramItems = $derived(
		selectedQuestionInfo?.paramOptions?.map((p) => ({
			value: String(p),
			label: String(p)
		})) ?? []
	);

	function handleSubmit() {
		if (!selectedQuestionType || !canSubmit) return;

		const param = selectedParam ? Number(selectedParam) : undefined;
		onSubmit(selectedQuestionType as QuestionType, param);

		// Reset selection after submit
		selectedQuestionType = undefined;
		selectedParam = undefined;
	}

	// Reset param when question type changes
	$effect(() => {
		if (selectedQuestionType) {
			selectedParam = undefined;
		}
	});
</script>

<div class="question-selector flex flex-col gap-4 {className}">
	<div class="flex flex-col gap-2">
		<label for="question-select" class="text-sm font-medium">Choisir une question :</label>
		<MySelect
			id="question-select"
			bind:value={selectedQuestionType}
			items={questionItems}
			placeholder="Sélectionner une question..."
			{disabled}
			triggerClass="w-full"
		/>
	</div>

	{#if selectedQuestionInfo?.requiresParam}
		<div class="flex flex-col gap-2">
			<label for="param-select" class="text-sm font-medium">Choisir un paramètre :</label>
			<MySelect
				id="param-select"
				bind:value={selectedParam}
				items={paramItems}
				placeholder="Sélectionner..."
				{disabled}
				triggerClass="w-full"
			/>
		</div>
	{/if}

	<Button onclick={handleSubmit} disabled={!canSubmit || disabled} class="w-full">
		Poser la question
	</Button>
</div>

<style>
	.question-selector {
		width: 100%;
		max-width: 400px;
	}
</style>
