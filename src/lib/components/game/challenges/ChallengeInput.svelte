<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';

	interface Props {
		onsubmit: (answer: any) => void;
		disabled?: boolean;
		placeholder?: string;
		type?: 'number' | 'text';
	}

	let { onsubmit, disabled = false, placeholder = 'Votre réponse', type = 'number' }: Props =
		$props();

	let answer = $state('');
	let errorMessage = $state('');

	function handleSubmit() {
		// Validate input
		if (!answer.trim()) {
			errorMessage = 'Veuillez entrer une réponse';
			return;
		}

		// Parse answer based on type
		let parsedAnswer: any = answer.trim();
		if (type === 'number') {
			parsedAnswer = parseFloat(answer);
			if (isNaN(parsedAnswer)) {
				errorMessage = 'Veuillez entrer un nombre valide';
				return;
			}
		}

		// Submit answer
		onsubmit(parsedAnswer);
		errorMessage = '';
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !disabled) {
			handleSubmit();
		}
	}
</script>

<div class="challenge-input space-y-4">
	<!-- Input Field -->
	<div class="space-y-2">
		<Input
			type={type}
			bind:value={answer}
			{placeholder}
			{disabled}
			onkeydown={handleKeydown}
			class="text-center text-lg"
			autofocus
		/>

		{#if errorMessage}
			<p class="text-sm text-destructive">{errorMessage}</p>
		{/if}
	</div>

	<!-- Submit Button -->
	<Button onclick={handleSubmit} {disabled} class="w-full" size="lg">
		Valider
	</Button>
</div>
