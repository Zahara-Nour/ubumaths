<!--
	Manual Validation Input for Riddles
	====================================
	Free-form text input for manual validation by teacher
-->

<script lang="ts">
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { Info } from 'lucide-svelte';

	interface Props {
		value: string;
		disabled?: boolean;
	}

	let { value = $bindable(''), disabled = false }: Props = $props();
</script>

<div class="space-y-2">
	<Label for="manual-answer">Votre réponse</Label>
	<Textarea
		id="manual-answer"
		bind:value
		{disabled}
		placeholder="Décrivez votre raisonnement et votre réponse..."
		rows={5}
		class="resize-none"
	/>
	<div class="flex items-start gap-2 rounded-lg bg-blue-50 p-3 text-xs text-blue-700 dark:bg-blue-950 dark:text-blue-300">
		<Info class="mt-0.5 h-4 w-4 shrink-0" />
		<p>
			Votre réponse sera envoyée à votre professeur pour validation. Soyez précis et détaillez
			votre raisonnement.
		</p>
	</div>
</div>
