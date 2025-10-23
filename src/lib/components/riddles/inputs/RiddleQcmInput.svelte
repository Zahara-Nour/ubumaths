<!--
	QCM Input for Riddles
	=====================
-->

<script lang="ts">
	import { Label } from '$lib/components/ui/label';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { cn } from '$lib/utils';

	interface Props {
		choices: string[];
		selectedIndices: number[];
		multipleAnswers?: boolean;
		disabled?: boolean;
	}

	let {
		choices,
		selectedIndices = $bindable([]),
		multipleAnswers = false,
		disabled = false
	}: Props = $props();

	function handleToggle(index: number) {
		if (disabled) return;

		if (multipleAnswers) {
			if (selectedIndices.includes(index)) {
				selectedIndices = selectedIndices.filter((i) => i !== index);
			} else {
				selectedIndices = [...selectedIndices, index];
			}
		} else {
			selectedIndices = [index];
		}
	}
</script>

<div class="space-y-3">
	<Label>
		{multipleAnswers ? 'Sélectionnez une ou plusieurs réponses' : 'Sélectionnez une réponse'}
	</Label>

	<div class="space-y-2">
		{#each choices as choice, index}
			<button
				type="button"
				onclick={() => handleToggle(index)}
				{disabled}
				class={cn(
					'w-full rounded-lg border-2 p-4 text-left transition-all',
					'hover:border-primary/50 hover:bg-primary/5',
					'focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:outline-none',
					selectedIndices.includes(index)
						? 'border-primary bg-primary/10 font-medium'
						: 'border-border bg-background',
					disabled && 'cursor-not-allowed opacity-50'
				)}
			>
				<div class="flex items-center gap-3">
					<div
						class={cn(
							'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold',
							selectedIndices.includes(index)
								? 'border-primary bg-primary text-primary-foreground'
								: 'border-muted-foreground/30'
						)}
					>
						{String.fromCharCode(65 + index)}
					</div>
					<div class="flex-1">{choice}</div>
					{#if multipleAnswers}
						<Checkbox checked={selectedIndices.includes(index)} {disabled} />
					{/if}
				</div>
			</button>
		{/each}
	</div>
</div>
