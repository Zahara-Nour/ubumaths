<!--
	Numerical Input for Riddles
	===========================
-->

<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';

	interface Props {
		value: string | number;
		disabled?: boolean;
		onSubmit?: () => void;
	}

	let { value = $bindable(''), disabled = false, onSubmit }: Props = $props();

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !disabled) {
			onSubmit?.();
		}
	}
</script>

<div class="space-y-2">
	<Label for="numerical-answer">Votre réponse (nombre)</Label>
	<Input
		id="numerical-answer"
		type="number"
		step="any"
		bind:value
		{disabled}
		placeholder="Entrez un nombre..."
		onkeydown={handleKeydown}
		class="text-lg"
	/>
</div>
