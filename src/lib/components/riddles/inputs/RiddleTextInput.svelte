<!--
	Text Input for Riddles
	======================
-->

<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';

	interface Props {
		value: string;
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
	<Label for="text-answer">Votre réponse</Label>
	<Input
		id="text-answer"
		type="text"
		bind:value
		{disabled}
		placeholder="Entrez votre réponse..."
		onkeydown={handleKeydown}
		class="text-lg"
	/>
</div>
