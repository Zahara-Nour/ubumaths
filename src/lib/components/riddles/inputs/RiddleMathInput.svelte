<!--
	Math Expression Input for Riddles
	==================================
-->

<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Info } from 'lucide-svelte';

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
	<Label for="math-answer">Votre réponse (expression mathématique)</Label>
	<Input
		id="math-answer"
		type="text"
		bind:value
		{disabled}
		placeholder="Ex: 2x + 3"
		onkeydown={handleKeydown}
		class="font-mono text-lg"
	/>
	<div class="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
		<Info class="mt-0.5 h-4 w-4 shrink-0" />
		<p>
			Entrez votre expression mathématique. Exemples: <code>2x+3</code>, <code>x²-5x+6</code>,
			<code>(a+b)²</code>
		</p>
	</div>
</div>
